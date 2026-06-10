# Global Embeddings Implementation Plan

## Overview

This document outlines the implementation plan for ensuring all annotations have a "global" embedding that enables cross-corpus semantic search, while maintaining corpus-specific embeddings for corpus-scoped operations.

---

## Problem Statement

### Current Behavior
- Embeddings are created using a single embedder per annotation
- Embedder selection priority: explicit path → corpus.preferred_embedder → DEFAULT_EMBEDDER
- If a corpus uses a custom embedder, only that embedding is created
- **Result**: No common vector space for global/cross-corpus search

### Desired Behavior
- Every annotation ALWAYS gets an embedding from the platform DEFAULT_EMBEDDER
- If corpus uses a different embedder, annotation ALSO gets corpus-specific embedding
- **Result**: Global search uses default embeddings; corpus search uses corpus embeddings

---

## Architecture Decision

### Why Two Embeddings?

**Multi-Embedder Support**: Different corpuses may use different embedding models optimized for their content:
- Legal corpus → fine-tuned legal embedder
- Medical corpus → biomedical embedder
- General corpus → default embedder

**Global Search Requirement**: Users need to search across all their documents regardless of corpus. This requires a common vector space.

**Solution**: Dual embedding strategy
- `DEFAULT_EMBEDDER` embedding: Always created, enables global search
- `corpus.preferred_embedder` embedding: Created when different from default, enables optimized corpus search

### Storage Model

The existing `Embedding` model already supports multiple embeddings per annotation:

```
Annotation
    └── Embedding (1:N)
            ├── embedder_path: "default/sentence-transformers"  # Global
            ├── vector_768: [...]
            └── ...
    └── Embedding
            ├── embedder_path: "custom/legal-bert"  # Corpus-specific
            ├── vector_768: [...]
            └── ...
```

No schema changes required - just behavioral changes in embedding creation.

---

## Document Lifecycle & Corpus Scoping

### Document Types

| Type | Has Corpus? | Global Embedding? | Corpus Embedding? | Global Search? | Corpus Search? |
|------|-------------|-------------------|-------------------|----------------|----------------|
| Standalone | No | Yes (default) | N/A | Yes | N/A |
| Corpus-bound | Yes | Yes (default) | Yes (if different) | Yes | Yes |

### Upload Scenarios

#### Scenario 1: Upload to Standalone (No Corpus)
```
User uploads PDF without corpus context
    ↓
Document created (no corpus link)
    ↓
Structural annotations created
    ↓
Embeddings created with DEFAULT_EMBEDDER only
    ↓
Document searchable via global search
```

#### Scenario 2: Upload Directly to Corpus
```
User uploads PDF to Corpus X
    ↓
Document created with corpus link
    ↓
Structural annotations created (corpus-isolated)
    ↓
Embeddings created:
    - DEFAULT_EMBEDDER (always, for global search)
    - corpus.preferred_embedder (if different from default)
    ↓
Document searchable via global AND corpus search
```

#### Scenario 3: Add Standalone to Corpus
```
User adds existing standalone doc to Corpus X
    ↓
Document COPIED to corpus (corpus isolation)
    ↓
Structural annotations DUPLICATED for corpus
    ↓
Embeddings created for copy:
    - DEFAULT_EMBEDDER (always)
    - corpus.preferred_embedder (if different)
    ↓
Original standalone unchanged
Copy searchable in corpus context
```

### Key Invariants

1. **Every annotation has a DEFAULT_EMBEDDER embedding** - no exceptions
2. **Corpus-specific embeddings are additive** - they don't replace default
3. **Standalone documents remain standalone** - adding to corpus creates a copy
4. **Corpus documents are never standalone** - they exist only in corpus context

---

## Implementation Steps

### Phase 1: Core Embedding Task Changes

#### Step 1.1: Modify `calculate_embedding_for_annotation_text`

**File**: `opencontractserver/tasks/embeddings_task.py`

**Current behavior**: Creates ONE embedding based on embedder selection logic

**New behavior**:
1. ALWAYS create DEFAULT_EMBEDDER embedding first
2. If corpus has different preferred_embedder, ALSO create that embedding

```python
@celery_app.task()
def calculate_embedding_for_annotation_text(
    annotation_id: int,
    corpus_id: int | None = None,
    embedder_path: str | None = None,
) -> None:
    """
    Create embeddings for an annotation.

    ALWAYS creates a DEFAULT_EMBEDDER embedding for global search.
    ADDITIONALLY creates corpus-specific embedding if corpus uses different embedder.
    """
    annotation = Annotation.objects.get(id=annotation_id)
    text = annotation.raw_text

    if not text:
        return

    # 1. ALWAYS create default embedding (for global search)
    default_embedder_path = settings.DEFAULT_EMBEDDER
    _create_embedding_for_annotation(annotation, text, default_embedder_path)

    # 2. If corpus has different embedder, also create corpus-specific embedding
    if corpus_id:
        corpus = Corpus.objects.get(id=corpus_id)
        corpus_embedder_path = corpus.preferred_embedder

        if corpus_embedder_path and corpus_embedder_path != default_embedder_path:
            _create_embedding_for_annotation(annotation, text, corpus_embedder_path)


def _create_embedding_for_annotation(
    annotation: Annotation,
    text: str,
    embedder_path: str,
) -> None:
    """Helper to create a single embedding for an annotation."""
    # Check if embedding already exists for this embedder
    existing = annotation.embeddings.filter(embedder_path=embedder_path).exists()
    if existing:
        return

    embedder = get_component_by_name(embedder_path)

    # Handle multimodal if supported
    if hasattr(embedder, 'is_multimodal') and embedder.is_multimodal:
        vector = generate_multimodal_embedding(annotation, embedder)
    else:
        vector = embedder.embed_text(text)

    annotation.add_embedding(embedder_path, vector)
```

#### Step 1.2: Modify `calculate_embedding_for_doc_text`

**File**: `opencontractserver/tasks/embeddings_task.py`

Same pattern - always create default, optionally create corpus-specific.

#### Step 1.3: Modify `calculate_embedding_for_note_text`

**File**: `opencontractserver/tasks/embeddings_task.py`

Same pattern for notes.

---

### Phase 2: Signal Handler Updates

#### Step 2.1: Update annotation creation signal

**File**: `opencontractserver/annotations/signals.py`

Ensure corpus_id is passed to embedding task when annotation has corpus context.

```python
def process_annot_on_create_atomic(sender, instance, created, **kwargs):
    if created and not instance.embeddings.exists():
        corpus_id = instance.corpus_id if instance.corpus else None
        calculate_embedding_for_annotation_text.si(
            annotation_id=instance.id,
            corpus_id=corpus_id,
        ).apply_async()
```

#### Step 2.2: Update document-to-corpus signal

**File**: `opencontractserver/documents/signals.py`

When documents are added to corpus, ensure structural annotation embeddings include both default and corpus embedders.

---

### Phase 3: Search Layer Updates

#### Step 3.1: Add global search method to CoreAnnotationVectorStore

**File**: `opencontractserver/llms/vector_stores/core_vector_stores.py`

```python
class CoreAnnotationVectorStore:

    @classmethod
    def global_search(
        cls,
        user_id: int,
        query_text: str,
        top_k: int = 100,
    ) -> list[VectorSearchResult]:
        """
        Search across ALL documents user has access to using DEFAULT_EMBEDDER.
        """
        # Generate query embedding with default embedder
        default_embedder = get_component_by_name(settings.DEFAULT_EMBEDDER)
        query_vector = default_embedder.embed_text(query_text)

        # Get all accessible annotations
        user = User.objects.get(id=user_id)
        accessible_docs = Document.objects.visible_to_user(user)

        # Search using default embedder embeddings only
        results = Embedding.objects.filter(
            embedder_path=settings.DEFAULT_EMBEDDER,
            annotation__document__in=accessible_docs,
        ).annotate(
            distance=CosineDistance(f'vector_{settings.DEFAULT_EMBEDDING_DIMENSION}', query_vector)
        ).order_by('distance')[:top_k]

        return [
            VectorSearchResult(
                annotation=e.annotation,
                similarity_score=1 - e.distance,
            )
            for e in results.select_related('annotation')
        ]
```

#### Step 3.2: Update corpus search to use corpus embedder

Ensure corpus-scoped search uses `corpus.preferred_embedder` when available.

---

### Phase 4: Documentation

#### Step 4.1: Create embeddings architecture doc

**File**: `docs/architecture/embeddings_dual_strategy.md`

Document:
- Why dual embeddings exist
- When each embedding type is created
- How global vs corpus search works
- Storage implications

#### Step 4.2: Update document lifecycle doc

**File**: `docs/architecture/document_lifecycle.md`

Document:
- Standalone vs corpus-bound documents
- What happens on upload to each context
- What happens when adding standalone to corpus
- Embedding creation in each scenario

#### Step 4.3: Update existing embeddings doc

**File**: `docs/architecture/embeddings_creation_and_retrieval.md`

Add section on dual embedding strategy and global search.

---

### Phase 5: Tests

#### Step 5.1: Unit tests for embedding task

**File**: `opencontractserver/tests/test_dual_embeddings.py`

```python
class TestDualEmbeddingCreation(TestCase):
    """Test that annotations always get default + corpus embeddings."""

    def test_standalone_annotation_gets_default_embedding(self):
        """Annotation without corpus gets DEFAULT_EMBEDDER embedding."""
        annotation = AnnotationFactory(corpus=None)
        calculate_embedding_for_annotation_text(annotation.id)

        embeddings = annotation.embeddings.all()
        self.assertEqual(embeddings.count(), 1)
        self.assertEqual(embeddings[0].embedder_path, settings.DEFAULT_EMBEDDER)

    def test_corpus_annotation_same_embedder_gets_one_embedding(self):
        """Corpus with default embedder creates only one embedding."""
        corpus = CorpusFactory(preferred_embedder=settings.DEFAULT_EMBEDDER)
        annotation = AnnotationFactory(corpus=corpus)
        calculate_embedding_for_annotation_text(annotation.id, corpus_id=corpus.id)

        embeddings = annotation.embeddings.all()
        self.assertEqual(embeddings.count(), 1)
        self.assertEqual(embeddings[0].embedder_path, settings.DEFAULT_EMBEDDER)

    def test_corpus_annotation_different_embedder_gets_both(self):
        """Corpus with custom embedder creates both embeddings."""
        custom_embedder = "custom.embedder.path"
        corpus = CorpusFactory(preferred_embedder=custom_embedder)
        annotation = AnnotationFactory(corpus=corpus)
        calculate_embedding_for_annotation_text(annotation.id, corpus_id=corpus.id)

        embeddings = annotation.embeddings.all()
        self.assertEqual(embeddings.count(), 2)

        embedder_paths = set(e.embedder_path for e in embeddings)
        self.assertIn(settings.DEFAULT_EMBEDDER, embedder_paths)
        self.assertIn(custom_embedder, embedder_paths)

    def test_idempotent_embedding_creation(self):
        """Running embedding task twice doesn't duplicate embeddings."""
        annotation = AnnotationFactory(corpus=None)
        calculate_embedding_for_annotation_text(annotation.id)
        calculate_embedding_for_annotation_text(annotation.id)

        self.assertEqual(annotation.embeddings.count(), 1)
```

#### Step 5.2: Integration tests for global search

**File**: `opencontractserver/tests/test_global_search.py`

```python
class TestGlobalSearch(TestCase):
    """Test global search across corpuses."""

    def test_global_search_finds_standalone_document(self):
        """Standalone docs are findable via global search."""
        doc = DocumentFactory(corpus=None)
        annotation = AnnotationFactory(document=doc, raw_text="unique legal term")
        calculate_embedding_for_annotation_text(annotation.id)

        results = CoreAnnotationVectorStore.global_search(
            user_id=doc.creator.id,
            query_text="legal term",
        )

        self.assertIn(annotation, [r.annotation for r in results])

    def test_global_search_finds_corpus_document(self):
        """Corpus docs are findable via global search using default embedding."""
        corpus = CorpusFactory(preferred_embedder="custom.embedder")
        doc = DocumentFactory()
        # Use corpus.add_document() which creates DocumentPath records
        # See opencontractserver/corpuses/models.py for implementation
        corpus.add_document(doc, user=doc.creator)
        annotation = AnnotationFactory(document=doc, corpus=corpus, raw_text="contract clause")
        calculate_embedding_for_annotation_text(annotation.id, corpus_id=corpus.id)

        results = CoreAnnotationVectorStore.global_search(
            user_id=doc.creator.id,
            query_text="contract",
        )

        self.assertIn(annotation, [r.annotation for r in results])

    def test_global_search_respects_permissions(self):
        """Global search only returns docs user can access."""
        other_user = UserFactory()
        private_doc = DocumentFactory(is_public=False)
        annotation = AnnotationFactory(document=private_doc, raw_text="secret info")
        calculate_embedding_for_annotation_text(annotation.id)

        results = CoreAnnotationVectorStore.global_search(
            user_id=other_user.id,
            query_text="secret",
        )

        self.assertNotIn(annotation, [r.annotation for r in results])
```

#### Step 5.3: Tests for document lifecycle

**File**: `opencontractserver/tests/test_document_embedding_lifecycle.py`

```python
class TestDocumentEmbeddingLifecycle(TestCase):
    """Test embeddings through document lifecycle events."""

    def test_upload_to_corpus_creates_both_embeddings(self):
        """Direct corpus upload creates default + corpus embeddings."""
        pass  # Implementation

    def test_standalone_added_to_corpus_copy_gets_embeddings(self):
        """When standalone added to corpus, copy gets proper embeddings."""
        pass  # Implementation

    def test_original_standalone_unchanged_after_corpus_add(self):
        """Original standalone doc embeddings unchanged when added to corpus."""
        pass  # Implementation
```

---

## Migration Strategy

### For Existing Data

Create a management command to backfill default embeddings:

**File**: `opencontractserver/annotations/management/commands/backfill_default_embeddings.py`

```python
class Command(BaseCommand):
    help = "Backfill DEFAULT_EMBEDDER embeddings for annotations missing them"

    def handle(self, *args, **options):
        # Find annotations without default embedding
        annotations_missing_default = Annotation.objects.exclude(
            embeddings__embedder_path=settings.DEFAULT_EMBEDDER
        )

        for annotation in annotations_missing_default.iterator():
            calculate_embedding_for_annotation_text.delay(
                annotation_id=annotation.id,
                corpus_id=annotation.corpus_id,
            )
```

---

## Rollout Plan

1. **Phase 1**: Implement core embedding task changes (no breaking changes)
2. **Phase 2**: Update signal handlers to pass corpus_id
3. **Phase 3**: Add global search API
4. **Phase 4**: Create documentation
5. **Phase 5**: Write and run tests
6. **Phase 6**: Run backfill migration for existing data
7. **Phase 7**: Update frontend to use global search (future)

---

## Success Criteria

- [ ] All new annotations have DEFAULT_EMBEDDER embedding
- [ ] Corpus annotations with custom embedder have both embeddings
- [ ] Global search returns results across all accessible documents
- [ ] Corpus search uses corpus-specific embeddings when available
- [ ] Existing annotations backfilled with default embeddings
- [ ] Documentation complete and accurate
- [ ] All tests passing

---

## Open Questions

1. **Embedding dimension consistency**: Should DEFAULT_EMBEDDER always use same dimension? (Recommendation: Yes, use `DEFAULT_EMBEDDING_DIMENSION`)

2. **Backfill priority**: Should we prioritize certain documents for backfill? (Recommendation: Process by corpus, most active first)

3. **Storage monitoring**: Do we need alerts for embedding storage growth? (Recommendation: Yes, add metrics)

---

## Related Documentation

- [Embeddings Creation and Retrieval](./embeddings_creation_and_retrieval.md)
- [Structural vs Non-Structural Annotations](./structural_vs_non_structural_annotations.md)
- [Document Versioning](./document_versioning.md)
- [Permissioning Guide](../permissioning/consolidated_permissioning_guide.md)

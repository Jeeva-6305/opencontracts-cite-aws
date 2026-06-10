# Dual-Tree Document Versioning Architecture

## Overview

OpenContracts implements a **dual-tree versioning architecture** for document management that provides:

- Complete audit trails with immutable history
- Time-travel capabilities (reconstruct any past filesystem state)
- Soft delete/restore operations
- Corpus-isolated documents with independent version trees
- No content-based deduplication (each upload is independent)

**Implementation Status**: COMPLETE (Phases 1, 2, and 2.5)

---

## First Principles

### Foundational Laws

1. **Separation of Concerns**: Content is not Location
   - **Content Tree** (Document): "What is this file's content?"
   - **Path Tree** (DocumentPath): "Where has this file lived?"

2. **Immutability**: Trees only grow, never shrink
   - Changes create new nodes linked to old ones
   - Old nodes never modified or deleted
   - Foundation for complete audit trails

3. **Corpus Isolation**: Documents isolated within each corpus
   - Each corpus has independent version trees
   - No cross-corpus version conflicts
   - No provenance tracking (`source_document` not set when adding documents to corpus)

4. **No Content-Based Deduplication**
   - Every file upload creates a new document regardless of content hash
   - Uploading same content at different paths creates separate documents
   - Uploading same content at same path creates a new version
   - Hash stored for integrity checks but never used for deduplication

---

## Architecture Rules

### Content Tree Rules (Document Model)

| Rule | Description |
|------|-------------|
| **C1** | Every upload creates a new Document (no content-based deduplication) |
| **C2** | Updates at same path create child nodes of previous version |
| **C3** | Only one current Document per version tree |

### Path Tree Rules (DocumentPath Model)

| Rule | Description |
|------|-------------|
| **P1** | Every lifecycle event creates new node |
| **P2** | New nodes are children of previous state |
| **P3** | Only current filesystem state is `is_current=True` |
| **P4** | One active path per `(corpus, path)` tuple |
| **P5** | Version number increments only on content changes |
| **P6** | Folder deletion sets `folder=NULL` |

### Interaction Rules

| Rule | Description |
|------|-------------|
| **I1** | Corpuses have completely isolated Documents with independent version trees |
| **I2** | Provenance tracked via `source_document` field (set when dragging existing docs) |
| **I3** | Each upload creates independent Document records (no dedup at document level) |
| **Q1** | Content "truly deleted" when no active paths point to it |

---

## Why Corpus Isolation Matters

Each upload creates a completely independent document. There is no content-based deduplication:

```
User A uploads PDF to Corpus X → Document #1 (tree TX1)
User B uploads same PDF to Corpus Y → Document #2 (tree TY2) ← INDEPENDENT!

User A updates → Document #3 (parent=#1, tree TX1) ✓
User B updates → Document #4 (parent=#2, tree TY2) ✓ NO CONFLICT!

User A uploads same PDF again to Corpus X → Document #5 (tree TX5) ← ALSO INDEPENDENT!
```

This eliminates version conflicts and deduplication complexity entirely.

### Multi-Embedder Support

A key reason for corpus isolation is **multi-embedder support**. Each corpus can use different embedding models for vector search. This requires consistent per-corpus vector spaces where all annotations use the same embedder. Sharing structural annotations across corpuses would require:
- Managing multiple embedding vectors per annotation (one per embedder type)
- Complex queries to select the right embedding for each corpus's embedder
- Re-embedding shared annotations whenever a corpus changes its embedder

By duplicating structural annotations per corpus, each corpus maintains a clean, independent vector space with consistent embeddings.

---

## Data Models

### Document Model (`opencontractserver/documents/models.py`)

```python
class Document(TreeNode, BaseOCModel, HasEmbeddingMixin):
    # Standard fields
    title = CharField(max_length=1024)
    description = TextField()
    pdf_file = FileField()
    pdf_file_hash = CharField(max_length=64, db_index=True)  # SHA-256

    # Versioning fields (dual-tree architecture)
    version_tree_id = UUIDField(default=uuid4, db_index=True)  # Groups all versions
    is_current = BooleanField(default=True, db_index=True)     # Latest in tree
    parent = ForeignKey('self')  # TreeNode: previous version

    # Provenance tracking (Phase 2)
    source_document = ForeignKey('self', null=True, related_name='corpus_copies')

    # Corpus-isolated structural annotations (Phase 2.5)
    structural_annotation_set = ForeignKey('StructuralAnnotationSet', null=True)

    class Meta:
        constraints = [
            # Rule C3: Only one current Document per version tree
            UniqueConstraint(
                fields=['version_tree_id'],
                condition=Q(is_current=True),
                name='one_current_per_version_tree'
            ),
        ]
```

### DocumentPath Model (`opencontractserver/documents/models.py`)

```python
class DocumentPath(TreeNode, BaseOCModel):
    """
    Path Tree - tracks document lifecycle within a corpus.
    Each node represents: import, move, update, delete, restore
    """
    document = ForeignKey(Document, on_delete=PROTECT)
    corpus = ForeignKey(Corpus, on_delete=CASCADE)
    folder = ForeignKey(CorpusFolder, null=True, on_delete=SET_NULL)  # Rule P6
    path = CharField(max_length=1024, db_index=True)
    version_number = IntegerField()  # Rule P5: increments on content changes
    is_deleted = BooleanField(default=False)  # Soft delete flag
    is_current = BooleanField(default=True)   # Rule P3
    parent = ForeignKey('self')  # TreeNode: previous state

    class Meta:
        constraints = [
            # Rule P4: One active path per (corpus, path) tuple
            UniqueConstraint(
                fields=['corpus', 'path'],
                condition=Q(is_current=True, is_deleted=False),
                name='unique_active_path_per_corpus'
            ),
        ]
```

### StructuralAnnotationSet Model (`opencontractserver/annotations/models.py`)

```python
class StructuralAnnotationSet(BaseOCModel):
    """
    Set of structural annotations for a document.
    Each corpus copy gets its own StructuralAnnotationSet (duplicated) to allow
    corpus-specific embeddings (different corpuses may use different embedders).
    """
    content_hash = CharField(max_length=64, unique=True, db_index=True)
    parser_name = CharField(max_length=255, null=True)
    parser_version = CharField(max_length=50, null=True)
    page_count = IntegerField(null=True)
    token_count = IntegerField(null=True)
    pawls_parse_file = FileField(null=True)
    txt_extract_file = FileField(null=True)
```

**Annotation/Relationship XOR Constraint**: Annotations and Relationships can belong to EITHER a `document` OR a `structural_set`, never both (enforced at database level).

---

## Operations

All operations in `opencontractserver/documents/versioning.py`:

### `import_document(corpus, path, content, user, folder=None, **kwargs)`

Handles new imports and updates within corpus scope.

**Returns**: `(document, status, path_record)` where status is:
- `'created'`: New document at new path
- `'updated'`: New document version at existing path

**Implements**: Rules C1, C2, C3, P1, P2, P4, P5, I1, I3

### `move_document(corpus, old_path, new_path, user, new_folder='UNSET')`

Moves document to new path/folder. Document unchanged.

**Implements**: Rules P1, P2, P3, P5 (no version increment on move)

### `delete_document(corpus, path, user)`

Soft delete (creates DocumentPath with `is_deleted=True`).

**Implements**: Rules P1, P2, P3, P5

### `restore_document(corpus, path, user)`

Restores soft-deleted document.

**Implements**: Rules P1, P2, P3

---

## Query Functions

### `get_current_filesystem(corpus)`
Returns active DocumentPath records (current, not deleted).
**Implements**: Rule P3

### `get_content_history(document)`
Traverses content tree upward. Returns all versions oldest to newest.
**Implements**: Rule C2 traversal

### `get_path_history(document_path)`
Traverses path tree upward. Returns lifecycle events with action types:
`CREATED`, `MOVED`, `UPDATED`, `DELETED`, `RESTORED`
**Implements**: Rule P2 traversal

### `get_filesystem_at_time(corpus, timestamp)`
Time-travel query - reconstructs filesystem at specific point in past.
**Implements**: Temporal tree traversal using P1

### `is_content_truly_deleted(document, corpus)`
Checks if content has no active paths in corpus.
**Implements**: Rule Q1

---

## Operations Create Trees

```
Import v1.pdf:
  Document(1, parent=None) + DocumentPath(1, parent=None)
    ↓
Move to /new/:
  Document(1) unchanged + DocumentPath(2, parent=1)
    ↓
Update content:
  Document(2, parent=1) + DocumentPath(3, parent=2)
    ↓
Delete:
  Document(2) unchanged + DocumentPath(4, parent=3, deleted=True)
    ↓
Restore:
  Document(2) unchanged + DocumentPath(5, parent=4, deleted=False)
```

---

## Usage Examples

### Import a document
```python
from opencontractserver.documents.versioning import import_document

doc, status, path = import_document(
    corpus=my_corpus,
    path="/contracts/agreement.pdf",
    content=pdf_bytes,
    user=request.user,
    title="Service Agreement"
)
# status: 'created' (new path) or 'updated' (existing path, new version)
```

### Move a document
```python
from opencontractserver.documents.versioning import move_document

new_path = move_document(
    corpus=my_corpus,
    old_path="/contracts/agreement.pdf",
    new_path="/archive/agreement.pdf",
    user=request.user,
    new_folder=archive_folder
)
```

### Get document history
```python
from opencontractserver.documents.versioning import get_content_history, get_path_history

# Content versions
versions = get_content_history(document)
for version in versions:
    print(f"Version {version.id}: {version.pdf_file_hash}")

# Lifecycle events
events = get_path_history(document_path)
for event in events:
    print(f"{event['timestamp']}: {event['action']} at {event['path']}")
```

### Time travel
```python
from opencontractserver.documents.versioning import get_filesystem_at_time
from datetime import datetime, timedelta

# What did the filesystem look like 30 days ago?
past = datetime.now() - timedelta(days=30)
past_filesystem = get_filesystem_at_time(my_corpus, past)

for path_record in past_filesystem:
    print(f"{path_record.path} - v{path_record.version_number}")
```

---

## Performance Characteristics

| Operation | Target |
|-----------|--------|
| Current filesystem query | < 1s for 100 documents |
| Time-travel query | < 2s for 50 documents with full history |
| Version history traversal | < 0.5s for 20 versions |
| Tree operations | O(log n) with CTE-based queries |
| Storage overhead | ~10% for path tree metadata |

---

## Key Benefits

- **Complete Audit Trail** - Every action preserved forever
- **Time Travel** - Reconstruct any historical state
- **Undelete** - Soft deletes enable recovery
- **Corpus Independence** - No cross-corpus version conflicts
- **Simplicity** - No deduplication complexity, each upload is independent
- **Clean Separation** - Content independent from location
- **Immutability** - Historical data never lost

---

## Test Coverage

**Location**: `opencontractserver/tests/test_document_versioning.py`

Tests covering:
- Content Tree Rules (C1, C2, C3)
- Path Tree Rules (P1, P2, P3, P4, P5, P6)
- Import/Move/Delete/Restore Operations
- Query Functions (filesystem, history, time-travel)
- Interaction Rules (I1, Q1)
- Complex Workflows (multi-corpus, branching)
- No-deduplication behavior (each upload creates independent document)
- Performance Benchmarks

**Structural Annotation Tests**:
- `test_structural_annotation_sets.py` - Model behavior and constraints
- `test_structural_annotation_portability.py` - Corpus isolation and duplication
- `test_query_optimizer_structural_sets.py` - Query optimizer integration

---

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| `documents/0023_*` | Schema changes (DocumentPath, TreeNode fields) |
| `documents/0024_*` | Data migration (initialize version_tree_id, create paths) |
| `documents/0026_*` | Add structural_annotation_set FK |
| `annotations/0048_*` | StructuralAnnotationSet model and XOR constraints |

---

## Related Files

- **Models**: `opencontractserver/documents/models.py`
- **Operations**: `opencontractserver/documents/versioning.py`
- **Corpus Integration**: `opencontractserver/corpuses/models.py` (add_document, import_content)
- **Annotations**: `opencontractserver/annotations/models.py` (StructuralAnnotationSet)
- **Tests**: `opencontractserver/tests/test_document_versioning.py`

---

*Implementation completed: November 2025*
*Branch: `feature/issue-654`*
*Related Issue: #654*

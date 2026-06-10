# Document & Corpus Lifecycle

## Overview

This document explains how documents relate to corpuses in OpenContracts, including the different document states, what happens during various operations, and how embeddings are managed throughout the lifecycle.

---

## Document States

### Standalone Documents

A **standalone document** exists without any corpus association:

```
Document
├── corpus: None
├── structural_annotation_set: StructuralAnnotationSet
│   └── content_hash: "{sha256}" (no corpus suffix)
└── Embeddings: DEFAULT_EMBEDDER only
```

**Characteristics:**
- No corpus foreign key
- Has structural annotations in a StructuralAnnotationSet
- Only has DEFAULT_EMBEDDER embeddings (for global search)
- Searchable via global search only
- Cannot be used with corpus-specific features (analyses, extracts)

**Use Cases:**
- Personal reference documents
- Documents awaiting corpus assignment
- Imported documents before organization

### Corpus-Bound Documents

A **corpus-bound document** is associated with exactly one corpus:

```
Document
├── corpus: Corpus (via DocumentPath)
├── structural_annotation_set: StructuralAnnotationSet
│   └── content_hash: "{sha256}_{corpus_id}" (corpus-specific)
└── Embeddings:
    ├── DEFAULT_EMBEDDER (always, for global search)
    └── corpus.preferred_embedder (if different from default)
```

**Characteristics:**
- Linked to corpus via DocumentPath
- Has corpus-isolated StructuralAnnotationSet
- Has both default AND corpus-specific embeddings (if different)
- Searchable via global search AND corpus search
- Can be used with all corpus features

**Use Cases:**
- Active project documents
- Collaborative workspaces
- Analysis and extraction targets

---

## Document Operations

### Operation 1: Upload to Standalone

**Trigger:** User uploads document without selecting a corpus

**What Happens:**
```
1. Document record created
   └── No corpus association

2. PDF parsed → structural annotations created
   └── StructuralAnnotationSet created with content_hash="{sha256}"

3. Embedding task triggered
   └── Creates DEFAULT_EMBEDDER embedding only

4. Document available in "My Library" / standalone view
```

**Result:**
- 1 Document
- 1 StructuralAnnotationSet
- N Annotations (structural)
- N Embeddings (default embedder only)

### Operation 2: Upload Directly to Corpus

**Trigger:** User uploads document with corpus selected

**What Happens:**
```
1. Document record created
   └── Associated with corpus via DocumentPath

2. PDF parsed → structural annotations created
   └── StructuralAnnotationSet created with content_hash="{sha256}_{corpus_id}"

3. Embedding task triggered with corpus_id
   └── Creates DEFAULT_EMBEDDER embedding (always)
   └── Creates corpus.preferred_embedder embedding (if different)

4. Document available in corpus view
```

**Result:**
- 1 Document (corpus-bound)
- 1 StructuralAnnotationSet (corpus-specific)
- N Annotations (structural)
- N or 2N Embeddings (default + corpus if different)

### Operation 3: Add Standalone to Corpus

**Trigger:** User drags/adds existing standalone document to a corpus

**What Happens:**
```
1. Original standalone document UNCHANGED

2. Document COPY created for corpus
   └── New Document record
   └── Associated with corpus via DocumentPath

3. StructuralAnnotationSet DUPLICATED for corpus
   └── New set with content_hash="{sha256}_{corpus_id}"
   └── All structural annotations copied

4. Embedding task triggered for COPY only
   └── Copy gets DEFAULT_EMBEDDER embedding
   └── Copy gets corpus.preferred_embedder embedding (if different)

5. Both documents exist independently
   └── Original: standalone, unchanged
   └── Copy: corpus-bound, fully embedded
```

**Result:**
- 2 Documents (original standalone + corpus copy)
- 2 StructuralAnnotationSets (original + corpus-specific)
- 2N Annotations (original + copied)
- Original embeddings unchanged
- Copy has new embeddings

### Operation 4: Add Corpus Document to Another Corpus

**Trigger:** User adds document from Corpus A to Corpus B

**What Happens:**
```
1. Original in Corpus A UNCHANGED

2. Document COPY created for Corpus B
   └── New Document record
   └── Associated with Corpus B via DocumentPath

3. StructuralAnnotationSet DUPLICATED for Corpus B
   └── New set with content_hash="{sha256}_{corpus_b_id}"

4. Embedding task triggered for copy
   └── Copy gets DEFAULT_EMBEDDER embedding
   └── Copy gets corpus_b.preferred_embedder embedding (if different)
```

**Result:**
- 2 Documents (one per corpus)
- 2 StructuralAnnotationSets (corpus-specific each)
- Each has independent embeddings

---

## Embedding Strategy

### Why Dual Embeddings?

Different corpuses may use different embedding models optimized for their domain:

| Corpus Type | Preferred Embedder | Rationale |
|-------------|-------------------|-----------|
| Legal | legal-bert | Legal terminology understanding |
| Medical | biobert | Medical concept recognition |
| General | sentence-transformers | Balanced general purpose |
| Multilingual | multilingual-e5 | Cross-language support |

**Problem:** If each corpus uses different embedders, there's no common vector space for cross-corpus search.

**Solution:** Every annotation gets TWO types of embeddings:
1. **Default embedding** - Always created, enables global search
2. **Corpus embedding** - Created if different from default, enables optimized corpus search

### Embedding Creation Rules

```
IF annotation has no corpus:
    Create DEFAULT_EMBEDDER embedding only

ELSE IF corpus.preferred_embedder == DEFAULT_EMBEDDER:
    Create DEFAULT_EMBEDDER embedding only (serves both purposes)

ELSE:
    Create DEFAULT_EMBEDDER embedding (for global search)
    Create corpus.preferred_embedder embedding (for corpus search)
```

### Search Behavior

| Search Type | Embedder Used | Scope |
|-------------|---------------|-------|
| Global Search | DEFAULT_EMBEDDER | All accessible documents |
| Corpus Search | corpus.preferred_embedder | Documents in corpus |
| Document Search | corpus.preferred_embedder (or default) | Single document |

---

## Lifecycle Diagrams

### Standalone Document Lifecycle

```
┌─────────────┐
│   Upload    │
│ (no corpus) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Standalone Doc     │
│  - No corpus        │
│  - Default embed    │
│  - Global search ✓  │
│  - Corpus search ✗  │
└──────────┬──────────┘
           │
           │ User adds to Corpus X
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Original Standalone │     │  Corpus X Copy      │
│  (UNCHANGED)         │     │  - Has corpus       │
│  - No corpus         │     │  - Default embed    │
│  - Default embed     │     │  - Corpus embed     │
│  - Global search ✓   │     │  - Global search ✓  │
└─────────────────────┘     │  - Corpus search ✓  │
                            └─────────────────────┘
```

### Corpus Document Lifecycle

```
┌─────────────────┐
│     Upload      │
│  (to Corpus X)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Corpus X Doc       │
│  - Corpus: X        │
│  - Default embed    │
│  - Corpus X embed   │
│  - Global search ✓  │
│  - Corpus search ✓  │
└──────────┬──────────┘
           │
           │ User adds to Corpus Y
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Corpus X Doc       │     │  Corpus Y Copy      │
│  (UNCHANGED)        │     │  - Corpus: Y        │
│  - Corpus: X        │     │  - Default embed    │
│  - Default embed    │     │  - Corpus Y embed   │
│  - Corpus X embed   │     │  - Global search ✓  │
│  - Global search ✓  │     │  - Corpus search ✓  │
│  - Corpus search ✓  │     └─────────────────────┘
└─────────────────────┘
```

---

## Storage Implications

### Per-Document Storage

| Component | Standalone | Corpus (same embedder) | Corpus (diff embedder) |
|-----------|------------|------------------------|------------------------|
| Document record | 1 | 1 | 1 |
| StructuralAnnotationSet | 1 | 1 | 1 |
| Annotations | N | N | N |
| Embeddings | N | N | 2N |

### Multi-Corpus Scenario

Document in 3 corpuses (all different embedders):
- 3 Document records
- 3 StructuralAnnotationSets
- 3N Annotations
- 3N default embeddings + 3N corpus embeddings = 6N embeddings

**Trade-off:** Storage cost for embedding flexibility and search capability.

---

## Permissions

### Standalone Documents
- Use standard Document permission model
- Creator has full access
- Can be made public via `is_public` flag
- Global search respects these permissions

### Corpus-Bound Documents
- Permissions inherited from Document AND Corpus
- Formula: `Effective Permission = MIN(doc_permission, corpus_permission)`
- See [Permissioning Guide](../permissioning/consolidated_permissioning_guide.md)

### Cross-Corpus Copies
- Each copy has INDEPENDENT permissions
- Deleting from Corpus A doesn't affect Corpus B copy
- No provenance tracking between copies (`source_document` not set)

---

## FAQ

### Q: If I delete a standalone document after adding to corpus, what happens?
**A:** The corpus copy is unaffected. They are independent documents.

### Q: Can I "move" a document from standalone to corpus without copying?
**A:** No. Corpus isolation requires copying. The standalone remains.

### Q: Why not share structural annotations across corpuses?
**A:** Multi-embedder support. Each corpus may embed with different models, requiring corpus-specific embedding storage. See [Structural vs Non-Structural Annotations](./structural_vs_non_structural_annotations.md).

### Q: What if I want the same document in 10 corpuses?
**A:** You'll have 10 copies. Storage trade-off for isolation benefits.

### Q: Can I search across all corpuses at once?
**A:** Yes, via global search using DEFAULT_EMBEDDER embeddings.

### Q: What if corpus doesn't set preferred_embedder?
**A:** Falls back to DEFAULT_EMBEDDER for both global and corpus search.

---

## Related Documentation

- [Global Embeddings Implementation Plan](./global_embeddings_implementation_plan.md)
- [Structural vs Non-Structural Annotations](./structural_vs_non_structural_annotations.md)
- [Document Versioning](./document_versioning.md)
- [Embeddings Creation and Retrieval](./embeddings_creation_and_retrieval.md)
- [Permissioning Guide](../permissioning/consolidated_permissioning_guide.md)

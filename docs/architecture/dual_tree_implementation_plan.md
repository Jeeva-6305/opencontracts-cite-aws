# Dual-Tree Architecture Implementation Plan

> **Status: IMPLEMENTED**
>
> This document was originally a planning/design specification created during development.
> The dual-tree architecture is now **fully implemented** and in production.
>
> **Current reference documentation**: [docs/architecture/document_versioning.md](document_versioning.md)
>
> **Implementation files**:
> - Models: [opencontractserver/documents/models.py](../../opencontractserver/documents/models.py) (Document, DocumentPath)
> - Operations: [opencontractserver/documents/versioning.py](../../opencontractserver/documents/versioning.py)
> - Tests: [opencontractserver/tests/test_document_versioning.py](../../opencontractserver/tests/test_document_versioning.py)
>
> This planning document is preserved for historical context and architectural rationale.
>
> *Last Updated: 2026-01-09*

---

## First Principles (Laws of Physics)

### Foundational Principles

1. **Separation of Concerns**: Content is not Location. A document's content and its place in a filesystem are two independent concerns.
   - The Content Tree (`Document`) answers: "What is this file's content, and how has it changed?"
   - The Path Tree (`DocumentPath`) answers: "Where has this file lived, and what has happened to it?"

2. **Immutability as Goal**: Trees only grow. To "change" something, create a new node representing the new state and link it to the old state. Old nodes are never updated or deleted. This provides our audit trail and time-travel capabilities.

3. **Global Content Deduplication**: A piece of content (defined by its hash) exists only once as a Document record. All uses of that content, across all corpuses and paths, point to this single record.

4. **The Meaning of "Current"**:
   - A Document is `is_current` if it's the latest known version of that content
   - A DocumentPath is `is_current` if it represents the latest state of a file's lifecycle

### Rules for Content Tree (Document)

- **Rule C1 (Creation)**: A new Document node is created only when a content hash is seen for the first time anywhere in the system
- **Rule C2 (Versioning)**: If new content updates an existing file, the new Document node is created as a child of the Document representing the previous content
- **Rule C3 (State)**: Only one Document in a version tree (sharing a `version_tree_id`) can have `is_current=True`

### Rules for Path Tree (DocumentPath)

- **Rule P1 (Creation)**: A new DocumentPath node is created for every lifecycle event:
  - File first imported
  - File content updated to new version
  - File moved or renamed
  - File deleted (soft delete)
  - File restored
- **Rule P2 (History)**: New DocumentPath nodes are children of the previous state node
- **Rule P3 (State)**: Only nodes representing current filesystem state have `is_current=True`
- **Rule P4 (Uniqueness)**: Only one active (`is_current=True, is_deleted=False`) DocumentPath can exist per `(corpus, path)` tuple
- **Rule P5 (Versioning)**: `version_number` increments only when pointing to new Document version
- **Rule P6 (Folder Handling)**: Folder deletion creates new DocumentPath with `folder=NULL`

### Interaction Rules

- **Rule I1 (Cross-Corpus)**: Multiple corpuses sharing same Document have independent DocumentPath trees
- **Rule Q1 (True Deletion)**: Content is "truly deleted" when no active DocumentPath in corpus points to it

## Implementation Plan

### Phase 1: Data Models (Week 1, Days 1-2)

> **IMPLEMENTED**: See [opencontractserver/documents/models.py](../../opencontractserver/documents/models.py)

#### 1.1 Document Model Enhancement

The `Document` model was enhanced with versioning fields:
- `version_tree_id` (UUID): Groups all content versions of the same logical document
- `is_current` (Boolean): Marks the newest content in a version tree
- TreeNode inheritance provides: `parent`, `tree_depth`, `tree_path`, `tree_ordering`
- Database constraint `one_current_per_version_tree` enforces Rule C3

#### 1.2 DocumentPath Model Creation

The `DocumentPath` model was created to track document lifecycles:
- Links to `Document` (with PROTECT to prevent accidental deletion)
- Links to `Corpus` (CASCADE on corpus deletion)
- Links to `CorpusFolder` (SET_NULL on folder deletion per Rule P6)
- Tracks `path`, `version_number`, `is_deleted`, `is_current`
- Database constraint `unique_active_path_per_corpus` enforces Rule P4

### Phase 2: Core Operations (Week 1, Days 3-5)

> **IMPLEMENTED**: See [opencontractserver/documents/versioning.py](../../opencontractserver/documents/versioning.py)

#### 2.1 Import Operation

The `import_document()` function handles new imports and updates:
- Returns `(document, status, path_record)` where status is: `'created'`, `'updated'`, `'unchanged'`, or `'linked'`
- Implements corpus isolation (Rule I1) - documents are isolated within each corpus
- Tracks provenance via `source_document` field (Rule I2)
- Shares file blobs for storage efficiency (Rule I3)

#### 2.2 Move Operation

The `move_document()` function relocates documents:
- Creates new DocumentPath with same document reference
- Version number does not increment (Rule P5)
- Old path marked as `is_current=False`

#### 2.3 Delete Operation

The `delete_document()` function performs soft delete:
- Creates new DocumentPath with `is_deleted=True`
- Document and previous path records preserved for audit trail

#### 2.4 Restore Operation

The `restore_document()` function restores soft-deleted documents:
- Creates new DocumentPath with `is_deleted=False`
- Links to previous deleted path record for complete history

### Phase 3: Query Infrastructure (Week 2, Days 1-3)

> **IMPLEMENTED**: See [opencontractserver/documents/versioning.py](../../opencontractserver/documents/versioning.py)

#### 3.1 Current Filesystem View

The `get_current_filesystem(corpus)` function returns all active DocumentPath records for a corpus (where `is_current=True` and `is_deleted=False`).

#### 3.2 Content History

The `get_content_history(document)` function traverses the content tree upward, returning all versions from oldest to newest.

#### 3.3 Path History

The `get_path_history(document_path)` function traverses the path tree upward, returning lifecycle events with action types: `CREATED`, `MOVED`, `UPDATED`, `DELETED`, `RESTORED`.

#### 3.4 Time Travel

The `get_filesystem_at_time(corpus, timestamp)` function reconstructs the filesystem state at any point in history using subqueries to find the most recent DocumentPath before the given timestamp.

### Phase 4: Migrations (Week 2, Days 4-5)

> **IMPLEMENTED**: See migrations in `opencontractserver/documents/migrations/`

#### 4.1 Migration Strategy

> **Status (2026-02-01)**: This migration has been completed. The `corpus.documents` M2M relationship has been removed (issue #835). `DocumentPath` is now the **sole source of truth** for corpus-document associations.
>
> See the actual migration implementation in:
> - [`opencontractserver/documents/migrations/`](../../opencontractserver/documents/migrations/) - DocumentPath model creation
> - [`opencontractserver/corpuses/models.py`](../../opencontractserver/corpuses/models.py) - `Corpus.add_document()` and `Corpus.get_documents()` methods

**Current Architecture**:
- `DocumentPath` records are created via `Corpus.add_document(document, user)`
- Document queries use `Corpus.get_documents()` which queries via `DocumentPath`
- No M2M relationship exists; `DocumentPath` is the single source of truth

**Benefits of Current Architecture**:
- Single source of truth (no dual-system synchronization)
- Full audit trail via `DocumentPath` history
- Support for soft-delete and restore
- Time-travel queries via `DocumentPath` timestamps

### Phase 5: Testing (Week 3)

> **IMPLEMENTED**: See [opencontractserver/tests/test_document_versioning.py](../../opencontractserver/tests/test_document_versioning.py)

#### 5.1 Test Matrix

39 tests covering all architecture rules:

- **Content Tree Tests**: Global deduplication (C1), Version creation (C2), Current flag management (C3)
- **Path Tree Tests**: Lifecycle events (P1), Parent-child relationships (P2), Current state (P3), Unique active paths (P4), Version numbering (P5)
- **Interaction Tests**: Cross-corpus independence (I1), True deletion detection (Q1), Time travel queries
- **Complex Workflows**: import -> move -> update -> delete -> restore

#### 5.2 Performance Testing

Performance targets established and validated:
- Time-travel queries < 500ms for realistic datasets
- Strategic indexes added to DocumentPath model for query optimization
- Benchmarks included for 1K, 10K, 100K path records

### Phase 6: GraphQL Integration (Week 3-4)

> **IMPLEMENTED**: See [config/graphql/graphene_types.py](../../config/graphql/graphene_types.py)

#### 6.1 Schema Updates

GraphQL types implemented:
- `DocumentType`: Extended with version info (`versionNumber`, `versionHistory`, `isCurrentVersion`)
- `DocumentPathType`: Full lifecycle tracking (`path`, `versionNumber`, `isDeleted`, `isCurrent`, `action`)
- `PathAction` enum: `CREATED`, `UPDATED`, `MOVED`, `DELETED`, `RESTORED`

### Phase 7: Frontend Integration (Week 4)

> **IMPLEMENTED**: Core functionality complete

#### 7.1 UI Components

Implemented UI features:
- **Version tracking**: Documents display version information
- **Soft delete/restore**: Users can delete and restore documents from trash
- **Audit trail**: Path history preserved for compliance

## Success Metrics

All metrics achieved:

1. **Correctness**: All rules enforced via database constraints and application logic
2. **Performance**: Time-travel queries optimized with strategic indexes
3. **Storage**: Path tree overhead within acceptable bounds
4. **Usability**: Soft delete/restore and version tracking in production

## Risk Mitigation

All risks addressed:

1. **Race Conditions**: `SELECT FOR UPDATE` used on path queries (see versioning.py)
2. **Migration**: Successfully completed without data loss
3. **Performance**: Strategic indexes added to DocumentPath model
4. **Complexity**: Comprehensive documentation in [document_versioning.md](document_versioning.md)

---

## Implementation Complete

This planning document successfully guided the implementation of the dual-tree versioning architecture. The design principles and rules documented here are now enforced in production code.

**For current reference documentation, see**: [docs/architecture/document_versioning.md](document_versioning.md)

*Original planning document preserved for historical context and architectural rationale.*

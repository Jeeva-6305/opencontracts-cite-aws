# Refactor Plan: Remove corpus.documents M2M Relationship (Issue #835)

> ## Status: COMPLETED
>
> **Completed**: 2026-02-01
>
> This refactor has been fully implemented. The `corpus.documents` ManyToMany relationship has been removed. `DocumentPath` is now the sole source of truth for corpus-document associations.
>
> **Key changes implemented**:
> - Removed `Corpus.documents` M2M field from model
> - Updated all production code to use `Corpus.add_document()` and `Corpus.get_documents()`
> - Updated 34 test files (~124 M2M usages)
> - Updated 6 frontend components to use `documentCount` field
> - Removed M2M signal handler from `documents/signals.py`
> - Updated `validate_v3_migration` management command (now 6 checks instead of 7)
>
> **Reference implementations**:
> - [`opencontractserver/corpuses/models.py`](../../opencontractserver/corpuses/models.py) - `Corpus.add_document()`, `Corpus.get_documents()`, `Corpus.document_count()`
> - [`opencontractserver/documents/models.py`](../../opencontractserver/documents/models.py) - `DocumentPath` model

---

> **Last Reviewed**: 2026-02-01
>
> **Review Notes**: Plan validated against codebase. Key corrections made:
> - Test file count: 26 → 34 files (~124 usages)
> - Frontend file count: 5 → 6 components + 1 query fix
> - Added pre-flight validation step
> - Fixed line number for UpdateDocumentRelationship (3410-3415)
> - Added backward-compat tests to Phase 7 removal list
> - Identified GET_CORPUS_WITH_HISTORY query gap (pre-existing bug)
> - Removed migration 0038 from scope (never edit existing migrations)

---

## Executive Summary

This document outlines a safe, phased approach to remove the legacy `Corpus.documents` ManyToMany relationship in favor of `DocumentPath` as the single source of truth for corpus-document associations.

**Current State**: Both `corpus.documents` M2M and `DocumentPath` records track corpus-document associations, requiring signal handlers to keep them synchronized.

**Target State**: `DocumentPath` is the sole source of truth; M2M field is completely removed.

---

## Table of Contents

1. [Impact Analysis](#1-impact-analysis)
2. [Refactor Phases](#2-refactor-phases)
3. [Test Plan](#3-test-plan)
4. [Rollback Strategy](#4-rollback-strategy)
5. [Migration Checklist](#5-migration-checklist)

---

## 1. Impact Analysis

### 1.1 Affected Files Summary

| Category | File Count | M2M Usages |
|----------|------------|------------|
| Production Code | 7 files | ~15 usages |
| Test Files | 34 files | ~124 usages |
| GraphQL Schema | 3 files | ~8 usages |
| Frontend | 6 files | 7 usages |
| Migrations | 1 file (new) | N/A |
| Documentation | 2 files | 2 usages |

### 1.2 Production Code Files Requiring Changes

#### Critical Path (Must Change)

1. **`opencontractserver/corpuses/models.py`**
   - Line 130: M2M field definition `documents = ManyToManyField(...)`
   - Line 724: `self.documents.add(doc)` in `import_content()`
   - Line 612: `self.documents.add(corpus_copy)` in `add_document()`

2. **`opencontractserver/documents/signals.py`**
   - Lines 81-155: `process_doc_on_corpus_add()` - M2M signal handler
   - Lines 234-238: Signal connection for `Corpus.documents.through`

3. **`config/graphql/graphene_types.py`**
   - Lines 1904-1926: Custom `documents` field resolver (already uses `get_documents()`)

4. **`config/graphql/mutations.py`**
   - Line 1259: `corpus.documents.clear()` in `StartCorpusFork`
   - Lines 3410-3415: `corpus.documents.filter()` validation in `UpdateDocumentRelationship`
   - Line 4692: `extract.documents.remove()` (Extract model - OUT OF SCOPE)

5. **`opencontractserver/utils/corpus_forking.py`**
   - Line 94: `corpus_copy.documents.clear()`

6. **`config/graphql/queries.py`**
   - Line 4116: `corpus.documents.get()` in public document slug resolution

7. **`opencontractserver/tasks/extract_orchestrator_tasks.py`**
   - Line 56: `extract.documents.count()` (Extract model - OUT OF SCOPE)
   - Line 88: `extract.documents.all()` (Extract model - OUT OF SCOPE)

#### Existing Migrations (DO NOT EDIT)

**`opencontractserver/corpuses/migrations/0038_create_personal_corpuses.py`**
- Line 157: `personal_corpus.documents.add(doc)` in data migration
- **Note**: This migration will continue to work because it runs before the M2M removal migration. Never edit existing migrations.

#### Already Using DocumentPath (No Changes Needed)

- `Corpus.get_documents()` - Already queries via DocumentPath
- `Corpus.document_count()` - Already queries via DocumentPath
- `Corpus.remove_document()` - Already uses DocumentPath
- `resolve_documents()` in GraphQL - Already uses `get_documents()`

### 1.3 Signal Handlers to Modify/Remove

| Signal | Location | Action |
|--------|----------|--------|
| `process_doc_on_corpus_add` | `documents/signals.py:81` | REMOVE |
| M2M connection | `documents/signals.py:234-238` | REMOVE |
| `process_doc_on_document_path_create` | `documents/signals.py:161` | KEEP (primary) |

### 1.4 Frontend Components Using `corpus.documents?.totalCount`

| File | Line | Current Usage |
|------|------|---------------|
| `AddToCorpusModal.tsx` | 302 | `corpus.documents?.totalCount` |
| `CorpusDetailsView.tsx` | 150 | `corpus.documents?.totalCount` |
| `CorpusLandingView.tsx` | 130 | `corpus.documents?.totalCount` |
| `CorpusStatus.tsx` | 91 | `corpus.documents?.totalCount` |
| `CorpusSelectorCard.tsx` | 129 | `corpus.documents?.totalCount` |
| `CorpusSelector.tsx` | 107 | `corpus?.documents?.totalCount` |
| `CorpusListView.tsx` | 457 | `c.documents?.totalCount` (fallback pattern) |

**Note**: Most frontend code already uses `documentCount` field. 6 components use the older `documents.totalCount` pattern directly, plus 1 fallback pattern.

### 1.5 GraphQL Query Gaps (Pre-existing Issue)

**`GET_CORPUS_WITH_HISTORY`** (`frontend/src/graphql/queries.ts:396-435`):
- Used by `CorpusDetailsView.tsx` and `CorpusLandingView.tsx`
- **Missing**: Does not include `documentCount` OR `documents { totalCount }`
- Current code accessing `corpus.documents?.totalCount` returns `undefined`
- **Action**: Add `documentCount` field to this query in Phase 4

### 1.6 Management Commands to Update/Remove

1. **`sync_m2m_to_documentpath.py`** - KEEP for migration verification, then REMOVE
2. **`validate_v3_migration.py`** - REMOVE M2M comparison logic

---

## 2. Refactor Phases

### Phase 1: Prepare Tests (Low Risk)

**Goal**: Update test files to use the new API patterns before changing production code.

**Files to Update** (34 test files with ~124 M2M usages):

| File | Pattern | Replacement |
|------|---------|-------------|
| `test_image_tools.py` | `.documents.add()` | `corpus.add_document()` |
| `test_multimodal_embeddings_utils.py` | `.documents.add()` | `corpus.add_document()` |
| `test_extract_mutations.py` | `.documents.add()` | `corpus.add_document()` |
| `test_document_path_migration.py` | `.documents.add()` | `corpus.add_document()` |
| `test_annotation_permission_inheritance.py` | `.documents.add()` | `corpus.add_document()` |
| `test_analysis_extract_hybrid_permissions.py` | `.documents.add()` | `corpus.add_document()` |
| `test_agent_action_result_admin.py` | `.documents.add()` | `corpus.add_document()` |
| `test_document_actions_permissions.py` | `.documents.add()` | `corpus.add_document()` |
| `test_query_optimizer_methods.py` | `.documents.add()` | `corpus.add_document()` |
| `test_annotation_privacy_scoping.py` | `.documents.add()` | `corpus.add_document()` |
| `test_og_metadata_queries.py` | `.documents.add()` | `corpus.add_document()` |
| `test_backfill_default_embeddings.py` | `.documents.add()` | `corpus.add_document()` |
| `test_annotation_privacy.py` | `.documents.add()` | `corpus.add_document()` |
| `test_annotation_utils.py` | `.documents.add()` | `corpus.add_document()` |
| `test_corpus_action_execution_admin.py` | `.documents.add()` | `corpus.add_document()` |
| `test_structural_annotations_graphql_backwards_compat.py` | `.documents.add()` | `corpus.add_document()` |
| `test_extract_tasks.py` | `.documents.add()` | `corpus.add_document()` |
| `test_v3_migration.py` | `.documents.add()` | `corpus.add_document()` |
| `test_embedding_manager.py` | `.documents.add()` | `corpus.add_document()` |
| `test_annotation_permission_mutations.py` | `.documents.add()` | `corpus.add_document()` |
| `test_individual_extract_tasks.py` | `.documents.add()` | `corpus.add_document()` |
| `test_mentions.py` | `.documents.add()` | `corpus.add_document()` |
| `test_corpus_fork_round_trip.py` | `.documents.add()` (16 occurrences) | `corpus.add_document()` |
| `test_document_folder_service.py` | M2M reference + backward compat test | Update verification logic, remove M2M test |
| `test_document_uploads.py` | `.documents.clear()` | Remove or use `remove_document()` |
| `test_document_versioning.py` | `.documents.all()` + backward compat assertion | `corpus.get_documents()`, remove M2M assertion |

**Additional test files discovered** (not exhaustive - run grep to find all):

| File | Pattern | Notes |
|------|---------|-------|
| Additional permissioning tests | `.documents.add()` | Multiple files in `tests/permissioning/` |
| Additional pipeline tests | `.documents.add()` | Embedder and parser tests |

**Pattern Replacements**:

```python
# OLD: corpus.documents.add(document)
# NEW: corpus.add_document(document, user)

# OLD: corpus.documents.remove(document)
# NEW: corpus.remove_document(document=document, user=user)

# OLD: corpus.documents.clear()
# NEW: for doc in corpus.get_documents(): corpus.remove_document(document=doc, user=user)

# OLD: corpus.documents.all()
# NEW: corpus.get_documents()

# OLD: corpus.documents.filter(...)
# NEW: corpus.get_documents().filter(...)

# OLD: corpus.documents.count()
# NEW: corpus.document_count()
```

**Verification**: All existing tests must pass after updates.

---

### Phase 2: Update Production Code (Medium Risk)

**Goal**: Remove all production uses of M2M operations.

#### 2.1 Remove M2M Writes in Corpus Model

**File**: `opencontractserver/corpuses/models.py`

```python
# Line 724: Remove from import_content()
# BEFORE:
self.documents.add(doc)

# AFTER:
# (Remove entirely - DocumentPath is created by import_document())


# Line 612: Remove from add_document()
# BEFORE:
self.documents.add(corpus_copy)

# AFTER:
# (Remove entirely - DocumentPath is created above)
```

#### 2.2 Update Corpus Forking

**File**: `opencontractserver/utils/corpus_forking.py`

```python
# Line 94:
# BEFORE:
corpus_copy.documents.clear()

# AFTER:
# (Remove entirely - new corpus has no DocumentPath records)
```

**File**: `config/graphql/mutations.py`

```python
# Line 1259:
# BEFORE:
corpus.documents.clear()

# AFTER:
# (Remove entirely - new corpus has no DocumentPath records)
```

#### 2.3 Update Document Relationship Validation

**File**: `config/graphql/mutations.py`

```python
# Lines 3410-3415:
# BEFORE:
docs_in_corpus = corpus.documents.filter(
    id__in=[doc_relationship.source_document_id, doc_relationship.target_document_id]
).count()

# AFTER:
docs_in_corpus = corpus.get_documents().filter(
    id__in=[doc_relationship.source_document_id, doc_relationship.target_document_id]
).count()
```

#### 2.4 Update Public Document Resolution

**File**: `config/graphql/queries.py`

```python
# Line 4116:
# BEFORE:
document = corpus.documents.get(slug=document_slug, is_public=True)

# AFTER:
document = corpus.get_documents().filter(slug=document_slug, is_public=True).first()
if not document:
    raise Document.DoesNotExist()
```

---

### Phase 3: Update GraphQL Schema (Medium Risk)

**Goal**: Ensure GraphQL continues to work without M2M.

The `CorpusType.documents` field already has a custom resolver that uses `get_documents()`:

```python
# config/graphql/graphene_types.py lines 1911-1926
def resolve_documents(self, info):
    user = getattr(info.context, "user", None)
    documents = self.get_documents()  # Already uses DocumentPath
    # ...
```

**No changes needed** - the resolver is already DocumentPath-based.

---

### Phase 4: Update Frontend (Low Risk)

**Goal**: Replace `corpus.documents?.totalCount` with `corpus.documentCount`.

#### 4.1 Fix GraphQL Query Gap (Required First)

**File**: `frontend/src/graphql/queries.ts`

```typescript
// GET_CORPUS_WITH_HISTORY (lines 396-435)
// ADD the documentCount field to the query:
query GetCorpusWithHistory($corpusId: ID!) {
  corpus(id: $corpusId) {
    id
    title
    documentCount  // <-- ADD THIS
    # ... rest of fields
  }
}
```

#### 4.2 Update Component Files

**Files to Update** (6 components + 1 fallback pattern):

1. `frontend/src/components/modals/AddToCorpusModal.tsx:302`
2. `frontend/src/components/corpuses/CorpusHome/CorpusDetailsView.tsx:150`
3. `frontend/src/components/corpuses/CorpusHome/CorpusLandingView.tsx:130`
4. `frontend/src/components/widgets/data-display/CorpusStatus.tsx:91`
5. `frontend/src/components/widgets/modals/UploadModal/components/CorpusSelectorCard.tsx:129`
6. `frontend/src/components/corpuses/CorpusSelector.tsx:107`
7. `frontend/src/components/corpuses/CorpusListView.tsx:457` (fallback pattern cleanup)

**Pattern**:
```typescript
// BEFORE:
corpus.documents?.totalCount

// AFTER:
corpus.documentCount
```

**Note**: The query fix in 4.1 is required for CorpusDetailsView and CorpusLandingView to work correctly - they currently return `undefined` for document counts.

---

### Phase 5: Remove Signal Handler (Medium Risk)

**Goal**: Remove the legacy M2M signal handler.

**File**: `opencontractserver/documents/signals.py`

**Changes**:
1. Remove `process_doc_on_corpus_add()` function (lines 81-155)
2. Remove M2M signal connection in `connect_corpus_document_signals()` (lines 234-238)

```python
# BEFORE (lines 234-238):
m2m_changed.connect(
    process_doc_on_corpus_add,
    sender=Corpus.documents.through,
    dispatch_uid="process_doc_on_corpus_add",
)

# AFTER:
# (Remove entirely)
```

---

### Phase 6: Remove M2M Field (High Risk - Final Step)

**Goal**: Remove the ManyToMany field from the model.

**File**: `opencontractserver/corpuses/models.py`

```python
# BEFORE (line 130):
documents = django.db.models.ManyToManyField("documents.Document", blank=True)

# AFTER:
# (Remove entirely)
```

**Migration Required**:
```bash
python manage.py makemigrations corpuses --name remove_documents_m2m
python manage.py migrate
```

**Migration File Content**:
```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('corpuses', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='corpus',
            name='documents',
        ),
    ]
```

---

### Phase 7: Cleanup (Low Risk)

**Goal**: Remove deprecated management commands, tests, and documentation.

#### 7.1 Remove Backward Compatibility Tests

These tests explicitly verify M2M is maintained and will fail after Phase 6:

1. `opencontractserver/tests/test_document_folder_service.py:1678-1695`
   - Test: `test_add_document_updates_m2m_relationship()`
   - Action: DELETE entirely

2. `opencontractserver/tests/test_document_versioning.py:1876`
   - Assertion: `self.assertIn(doc, self.corpus.documents.all())`
   - Action: Remove this assertion (keep rest of test)

#### 7.2 Remove Management Commands

1. Remove `sync_m2m_to_documentpath.py` management command
2. Update `validate_v3_migration.py` to remove M2M comparison (Check 3)

#### 7.3 Update Documentation

1. Update `docs/architecture/document_folder_service_migration_inventory.md`
2. Update any inline comments referencing M2M
3. Remove TODO comments referencing issue #835

---

## 3. Test Plan

### 3.0 Pre-Flight Validation (Required)

Before starting any refactoring, verify M2M/DocumentPath parity:

```bash
# Verify no orphaned M2M entries exist
docker compose -f local.yml run django python manage.py validate_v3_migration --verbose

# Check specifically for M2M without DocumentPath (Check 3 output)
# Expected: "All M2M relationships have corresponding DocumentPath records"
```

If orphaned entries are found, run sync command first:
```bash
docker compose -f local.yml run django python manage.py sync_m2m_to_documentpath --dry-run
docker compose -f local.yml run django python manage.py sync_m2m_to_documentpath
```

### 3.1 Pre-Refactor Baseline

Before starting any refactoring, establish a baseline:

```bash
# Run full backend test suite
docker compose -f test.yml run django pytest -n 4 --dist loadscope

# Run frontend tests
cd frontend && yarn test:unit && yarn test:ct --reporter=list
```

**Expected**: All tests pass. Document any pre-existing failures.

### 3.2 Phase 1 Tests (Test File Updates)

After updating test files to use new API:

```bash
# Run specific test files that were updated
docker compose -f test.yml run django pytest \
  opencontractserver/tests/test_image_tools.py \
  opencontractserver/tests/test_document_path_migration.py \
  opencontractserver/tests/permissioning/ \
  -n 4 --dist loadscope
```

**Verification**:
- All updated tests pass
- No new test failures introduced
- M2M relationship still works (not yet removed)

### 3.3 Phase 2 Tests (Production Code Updates)

After removing M2M writes:

```bash
# Run full test suite
docker compose -f test.yml run django pytest -n 4 --dist loadscope

# Critical path tests
docker compose -f test.yml run django pytest \
  opencontractserver/tests/test_corpus_fork_round_trip.py \
  opencontractserver/tests/test_document_versioning.py \
  opencontractserver/tests/test_document_folder_service.py \
  -n 4 --dist loadscope
```

**Verification**:
- All tests pass
- Fork operations work correctly
- Document counts are accurate

### 3.4 Phase 4 Tests (Frontend Updates)

After updating frontend components:

```bash
cd frontend

# Type check
yarn build

# Unit tests
yarn test:unit

# Component tests for affected components
yarn test:ct --reporter=list -g "Corpus"
yarn test:ct --reporter=list -g "AddToCorpus"
```

**Verification**:
- TypeScript compiles without errors
- All frontend tests pass
- Document counts display correctly

### 3.5 Phase 5-6 Tests (Signal and Field Removal)

After removing signal handler and M2M field:

```bash
# Fresh database (migration applied)
docker compose -f test.yml run django pytest -n 4 --dist loadscope --create-db

# Integration tests
docker compose -f test.yml run django pytest \
  opencontractserver/tests/test_document_uploads.py \
  opencontractserver/tests/test_extract_tasks.py \
  -n 4 --dist loadscope
```

**Verification**:
- All tests pass with new migration
- Document uploads still trigger embeddings
- Extract creation works correctly

### 3.6 Manual Integration Tests

#### Test 1: Document Upload Flow

```bash
# Start local environment
docker compose -f local.yml up

# Via Django shell
docker compose -f local.yml run django python manage.py shell
```

```python
from opencontractserver.corpuses.models import Corpus
from opencontractserver.documents.models import Document, DocumentPath
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()
corpus = Corpus.objects.filter(creator=user).first()

# Test: Upload a document
with open('/path/to/test.pdf', 'rb') as f:
    doc, status, doc_path = corpus.import_content(
        content=f.read(),
        user=user,
        filename='test.pdf'
    )

# Verify DocumentPath created
assert DocumentPath.objects.filter(corpus=corpus, document=doc, is_current=True).exists()

# Verify document appears in get_documents()
assert doc in corpus.get_documents()

# Verify count is accurate
assert corpus.document_count() == corpus.get_documents().count()
```

#### Test 2: Document Removal Flow

```python
# Remove document
deleted_paths = corpus.remove_document(document=doc, user=user)

# Verify soft-delete
assert len(deleted_paths) > 0
assert doc not in corpus.get_documents()
assert corpus.document_count() == corpus.get_documents().count()
```

#### Test 3: Corpus Fork Flow

```python
from opencontractserver.utils.corpus_forking import create_fork_corpus_task

# Fork corpus
task = create_fork_corpus_task(
    corpus_pk_to_fork=corpus.pk,
    user=user,
    doc_ids=list(corpus.get_documents().values_list('id', flat=True)),
    label_set_id=None,
    annotation_ids=[],
    folder_ids=[],
    relationship_ids=[],
    metadata_column_ids=[],
    metadata_datacell_ids=[],
)

# Execute task (in real scenario, this runs async)
# Verify forked corpus has documents via DocumentPath only
```

#### Test 4: GraphQL Document Count

```graphql
query {
  corpuses {
    edges {
      node {
        id
        title
        documentCount
        documents {
          totalCount
        }
      }
    }
  }
}
```

**Verify**: `documentCount` equals `documents.totalCount` for all corpuses.

### 3.7 Regression Test Matrix

| Scenario | Test Method | Pass Criteria |
|----------|-------------|---------------|
| Upload document to corpus | Manual + automated | DocumentPath created, appears in get_documents() |
| Remove document from corpus | Manual + automated | Soft-deleted, not in get_documents() |
| Fork corpus | Automated | Documents copied to new corpus via DocumentPath |
| GraphQL corpus.documents | GraphQL query | Returns correct documents |
| GraphQL documentCount | GraphQL query | Returns accurate count |
| Frontend document count | Visual | Shows correct count in UI |
| Document embeddings | Celery logs | Embeddings calculated on DocumentPath creation |
| Extract creation | Automated | Documents added to extract correctly |

---

## 4. Rollback Strategy

### Phase 1-2 Rollback

If issues arise during test/production code updates:

1. Revert commits
2. Run test suite to verify rollback

### Phase 5-6 Rollback (Signal/Field Removal)

If issues arise after M2M removal:

1. **Immediate**: Add back the M2M field with empty migration
2. **Short-term**: Restore signal handler
3. **Data Recovery**: Run sync command to populate M2M from DocumentPath

```python
# Emergency migration to restore field
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('corpuses', 'XXXX_remove_documents_m2m'),
    ]

    operations = [
        migrations.AddField(
            model_name='corpus',
            name='documents',
            field=models.ManyToManyField(blank=True, to='documents.Document'),
        ),
    ]
```

```bash
# Restore M2M data from DocumentPath
python manage.py sync_documentpath_to_m2m  # (would need to create this)
```

---

## 5. Migration Checklist

### Pre-Migration

- [ ] All tests pass on current main branch
- [ ] Database backup created
- [ ] Run `validate_v3_migration --verbose` (Check 3 must pass)
- [ ] Run `sync_m2m_to_documentpath` if needed (no orphaned M2M entries)

### Phase 1: Test Updates

- [ ] Update 34 test files to use new API (~124 M2M usages)
- [ ] High-impact: `test_corpus_fork_round_trip.py` (16 occurrences)
- [ ] All tests pass
- [ ] PR reviewed and merged

### Phase 2: Production Code

- [ ] Remove M2M writes in Corpus.import_content()
- [ ] Remove M2M writes in Corpus.add_document()
- [ ] Update corpus forking to not use M2M
- [ ] Update document relationship validation
- [ ] All tests pass
- [ ] PR reviewed and merged

### Phase 3: GraphQL (No changes needed)

- [ ] Verify resolve_documents() uses get_documents()

### Phase 4: Frontend

- [ ] Add `documentCount` to GET_CORPUS_WITH_HISTORY query
- [ ] Update 6 components to use documentCount
- [ ] Clean up CorpusListView.tsx fallback pattern
- [ ] TypeScript compiles
- [ ] Frontend tests pass
- [ ] PR reviewed and merged

### Phase 5: Signal Removal

- [ ] Remove process_doc_on_corpus_add()
- [ ] Remove M2M signal connection
- [ ] All tests pass
- [ ] PR reviewed and merged

### Phase 6: Field Removal

- [ ] Create migration to remove M2M field
- [ ] Run migration in staging
- [ ] Verify all functionality in staging
- [ ] Deploy to production
- [ ] Monitor for errors

### Phase 7: Cleanup

- [ ] Remove backward-compat test in test_document_folder_service.py
- [ ] Remove M2M assertion in test_document_versioning.py
- [ ] Remove sync_m2m_to_documentpath command
- [ ] Update validate_v3_migration.py (remove Check 3)
- [ ] Update documentation
- [ ] Close issue #835

---

## Appendix A: Files to Modify (Complete List)

### Production Code

1. `opencontractserver/corpuses/models.py` - Remove M2M field and writes
2. `opencontractserver/documents/signals.py` - Remove M2M signal handler
3. `opencontractserver/utils/corpus_forking.py` - Remove documents.clear()
4. `config/graphql/mutations.py` - Update validation queries
5. `config/graphql/queries.py` - Update public document resolution

### Test Files (34 files, ~124 usages)

See Phase 1 section for primary list. Run grep to find all:
```bash
grep -r "\.documents\.add\|\.documents\.remove\|\.documents\.clear\|\.documents\.all\|\.documents\.filter" opencontractserver/tests/ --include="*.py" -l | wc -l
```

### Frontend (6 components + 1 query)

1. `frontend/src/graphql/queries.ts` - Add documentCount to GET_CORPUS_WITH_HISTORY
2. `frontend/src/components/modals/AddToCorpusModal.tsx`
3. `frontend/src/components/corpuses/CorpusHome/CorpusDetailsView.tsx`
4. `frontend/src/components/corpuses/CorpusHome/CorpusLandingView.tsx`
5. `frontend/src/components/widgets/data-display/CorpusStatus.tsx`
6. `frontend/src/components/widgets/modals/UploadModal/components/CorpusSelectorCard.tsx`
7. `frontend/src/components/corpuses/CorpusSelector.tsx`
8. `frontend/src/components/corpuses/CorpusListView.tsx` (fallback pattern cleanup)

### Management Commands

1. `opencontractserver/documents/management/commands/sync_m2m_to_documentpath.py` - REMOVE
2. `opencontractserver/documents/management/commands/validate_v3_migration.py` - UPDATE (remove Check 3)

### Migrations

1. New migration: `corpuses/migrations/XXXX_remove_documents_m2m.py`

**Note**: Existing migration `0038_create_personal_corpuses.py` uses M2M but will NOT be edited. It runs before the removal migration, so it continues to work correctly.

### Tests to Remove/Update in Phase 7

1. `opencontractserver/tests/test_document_folder_service.py:1678-1695` - DELETE test
2. `opencontractserver/tests/test_document_versioning.py:1876` - Remove assertion

---

## Appendix B: Out of Scope

The following are explicitly **NOT** part of this refactor:

1. **Extract.documents M2M** - The Extract model's documents M2M serves a different purpose (tracking which documents are part of an extract) and doesn't have the dual-source-of-truth problem.

2. **Analysis.documents** - Similar to Extract, this is a direct relationship.

3. **DocumentPath model changes** - The DocumentPath model is already the target architecture; no changes needed.

4. **Corpus.get_documents() / document_count()** - These methods already use DocumentPath; no changes needed.

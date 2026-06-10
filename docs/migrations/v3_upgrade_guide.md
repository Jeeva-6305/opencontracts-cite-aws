# Upgrading to OpenContracts v3.0.0.b3

This guide covers the migration path from v3.0.0.b2 to v3.0.0.b3, including the new
dual-tree document versioning architecture and optional structural annotation sets.

## What's New in v3.0.0.b3

### Document Versioning (Dual-Tree Architecture)

v3.0.0.b3 introduces a sophisticated document versioning system:

- **version_tree_id**: Each document now has a UUID grouping all versions of the same logical document
- **DocumentPath model**: Tracks document lifecycle within corpuses (moves, updates, deletes, restores)
- **Corpus isolation**: Documents are copied when added to a corpus, preventing cross-corpus version conflicts
- **Time travel**: Query the filesystem state at any point in history
- **Soft delete/restore**: Documents can be deleted and restored without data loss

### Structural Annotation Sets

Corpus-isolated containers for structural annotations:

- **StructuralAnnotationSet**: Corpus-specific container for structural annotations (headers, sections, paragraphs)
- **Corpus isolation**: Each corpus gets its own copy of structural annotations when documents are added
- **Complete separation**: No data sharing across corpus boundaries
- **Automatic duplication**: When adding documents to a corpus, structural annotation sets are duplicated

## Pre-Upgrade Checklist

Before upgrading, ensure you have:

- [ ] **Database backup**: Create a full database backup before migration
- [ ] **No active processing**: Stop any document parsing or analysis jobs
- [ ] **Note baseline counts**: Record current document, annotation, and corpus counts
- [ ] **Sufficient disk space**: Data migration may temporarily increase storage usage
- [ ] **Maintenance window**: Plan for 5-30 minutes downtime depending on database size

## Migration Steps

### Step 1: Apply Database Migrations (REQUIRED)

The core migrations are applied automatically when you start the new version:

```bash
# Production deployment
docker compose -f production.yml --profile migrate up migrate

# Development environment
docker compose -f local.yml run django python manage.py migrate
```

This applies the following migrations:

| Migration | Purpose |
|-----------|---------|
| `documents/0023` | Creates DocumentPath model and version tree fields |
| `documents/0024` | Initializes version_tree_id and creates DocumentPath records |
| `documents/0025` | Adds source_document field for provenance tracking |
| `documents/0026` | Adds structural_annotation_set FK to Document |
| `annotations/0048` | Creates StructuralAnnotationSet model with XOR constraints |
| `annotations/0049` | Refinement of file field upload paths |

### Step 2: Verify Migration Success

Run the validation command to ensure all migrations completed correctly:

```bash
# Docker
docker compose -f production.yml run django python manage.py validate_v3_migration

# Local
python manage.py validate_v3_migration
```

**Expected output for a successful migration:**

```
======================================================================
OpenContracts v3.0.0.b3 Migration Validation
======================================================================

[1/6] Checking Document.version_tree_id...
  PASSED: All documents have version_tree_id

[2/6] Checking Document.is_current...
  PASSED: X current, 0 non-current (versioned)

[3/6] Checking Annotation XOR constraint...
  PASSED: All X annotations satisfy XOR constraint

[4/6] Checking Relationship XOR constraint...
  PASSED: All X relationships satisfy XOR constraint

[5/6] Checking StructuralAnnotationSet uniqueness...
  PASSED: All 0 structural sets have unique content_hash

[6/6] Checking structural migration candidates...
  INFO: X documents eligible for structural migration

======================================================================
VALIDATION PASSED
======================================================================
```

> **Note**: As of v3.0.0.b3+, the `corpus.documents` M2M relationship has been removed (issue #835). DocumentPath is now the sole source of truth for corpus-document associations, so there is no longer an M2M validation check.

### Step 3: Migrate Structural Annotations (OPTIONAL)

If you have documents that appear in multiple corpuses, you can migrate structural
annotations to shared sets for storage efficiency:

```bash
# Preview what will be migrated (dry-run)
docker compose -f production.yml run django \
    python manage.py migrate_structural_annotations --dry-run --verbose

# Execute the migration
docker compose -f production.yml run django \
    python manage.py migrate_structural_annotations --verbose

# Verify the migration
docker compose -f production.yml run django \
    python manage.py validate_v3_migration
```

**Command options:**

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without modifying database |
| `--document-id ID` | Migrate only a specific document |
| `--corpus-id ID` | Migrate only documents in a specific corpus |
| `--batch-size N` | Process N documents per batch (default: 100) |
| `--verbose` | Show detailed progress information |
| `--force` | Process documents without pdf_file_hash |

**When to use structural migration:**

- You have documents that appear in multiple corpuses
- Storage optimization is a priority
- You want to benefit from shared parsing artifacts

**When to skip structural migration:**

- Single-corpus deployments (no benefit)
- Storage is not a concern
- You prefer simpler data model (annotations stay on documents)

## Understanding the Changes

### Corpus Isolation

Before v3, adding a document to multiple corpuses shared the same Document object,
which could cause version tree conflicts:

```
# Before (problematic):
User A uploads PDF → Document #1 (tree T1)
User B uploads same PDF → REUSES Document #1 (tree T1)
User A updates → Document #2 (parent=#1, tree T1)
User B updates → Document #3 (parent=#1, tree T1) ← VERSION CONFLICT!
```

After v3, each corpus gets its own isolated Document copy:

```
# After (corpus-isolated):
User A uploads to Corpus X → Document #1 (tree TX1)
User B uploads to Corpus Y → Document #2 (tree TY2) ← ISOLATED!
User A updates → Document #3 (parent=#1, tree TX1) ✓
User B updates → Document #4 (parent=#2, tree TY2) ✓ NO CONFLICT!
```

### XOR Constraint on Annotations

Annotations now have a mutual exclusivity constraint:

- **Document-attached** (traditional): `document IS NOT NULL` and `structural_set IS NULL`
- **Structural set-attached** (new): `document IS NULL` and `structural_set IS NOT NULL`

Existing annotations satisfy this constraint automatically (they have document set).

### Source Document Provenance

When a document is copied to a new corpus, the copy tracks its origin:

```python
# Original document
original = Document.objects.create(title="Contract", ...)

# Add to Corpus A - creates a copy
corpus_a.add_document(document=original, user=user)
# copy.source_document == original

# Add to Corpus B - creates another copy from original
corpus_b.add_document(document=original, user=user)
# copy2.source_document == original
```

## Rollback Procedure

If you need to rollback to v3.0.0.b2:

1. **Stop all services**
   ```bash
   docker compose -f production.yml down
   ```

2. **Restore database backup**
   ```bash
   # Example for PostgreSQL
   pg_restore -h localhost -U opencontracts -d opencontracts backup.dump
   ```

3. **Revert to previous images**
   Update your docker-compose file to use v3.0.0.b2 images and restart.

**Note**: Rollback after running `migrate_structural_annotations` will leave
annotations in an inconsistent state. Always backup before migration.

## Frequently Asked Questions

### Q: Will existing annotations break?

**A**: No. The XOR constraint allows existing annotations because they have
`document IS NOT NULL` and `structural_set IS NULL`. This satisfies the first
branch of the constraint.

### Q: Is structural migration required?

**A**: No. It's completely optional and only provides storage benefits for
multi-corpus deployments. Your existing setup will continue to work without it.

### Q: Can I migrate specific corpuses incrementally?

**A**: Yes. Use the `--corpus-id` flag to migrate one corpus at a time:
```bash
python manage.py migrate_structural_annotations --corpus-id=123
```

### Q: How much storage will structural migration save?

**A**: Savings depend on document overlap between corpuses. If you have a document
with 5,000 structural annotations in 3 corpuses:
- **Before**: 15,000 annotation records
- **After**: 5,000 annotation records (1 shared set)

### Q: What happens if migration fails mid-way?

**A**: Each document is processed in its own transaction. If a failure occurs,
only that document remains unmigrated. Run the command again to retry.

### Q: Can I undo the structural migration?

**A**: Yes, but it requires a custom script to move annotations back from
structural_set to document. Contact support if you need assistance.

## Troubleshooting

### Validation fails with "documents missing version_tree_id"

Run validation with `--fix` flag:
```bash
python manage.py validate_v3_migration --fix
```

### Migration times out on large datasets

Reduce batch size and run incrementally:
```bash
python manage.py migrate_structural_annotations --batch-size=50 --corpus-id=123
```

### "XOR constraint violated" errors

Check for annotations with invalid state:
```sql
SELECT id, document_id, structural_set_id
FROM annotations_annotation
WHERE (document_id IS NULL AND structural_set_id IS NULL)
   OR (document_id IS NOT NULL AND structural_set_id IS NOT NULL);
```

## Getting Help

- **Documentation**: https://docs.opencontracts.io
- **GitHub Issues**: https://github.com/JSv4/OpenContracts/issues
- **Community Forum**: https://community.opencontracts.io

---

*Last updated: 2025-11-27*
*Applies to: v3.0.0.b3*

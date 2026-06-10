# Generated migration to remove corpus.documents M2M field
# Part of issue #835: Remove corpus.documents M2M relationship in favor of DocumentPath

from django.db import migrations


def validate_no_orphaned_m2m(apps, schema_editor):
    """
    Validate that all M2M corpus-document relationships have corresponding
    DocumentPath records before removing the M2M field.

    This prevents silent data loss by ensuring DocumentPath is the complete
    source of truth before we remove the legacy M2M relationship.
    """
    Corpus = apps.get_model("corpuses", "Corpus")
    DocumentPath = apps.get_model("documents", "DocumentPath")

    orphaned_count = 0
    orphaned_corpuses = []

    for corpus in Corpus.objects.prefetch_related("documents").iterator(chunk_size=1000):
        m2m_doc_ids = set(corpus.documents.values_list("id", flat=True))
        if not m2m_doc_ids:
            continue

        # Get documents that have current, non-deleted DocumentPath in this corpus
        path_doc_ids = set(
            DocumentPath.objects.filter(
                corpus_id=corpus.id, is_current=True, is_deleted=False
            ).values_list("document_id", flat=True)
        )

        # Find M2M entries without corresponding DocumentPath
        missing = m2m_doc_ids - path_doc_ids
        if missing:
            orphaned_count += len(missing)
            orphaned_corpuses.append((corpus.id, corpus.title, len(missing)))

    if orphaned_count > 0:
        details = "\n".join(
            f"  - Corpus {cid} '{title}': {count} documents"
            for cid, title, count in orphaned_corpuses[:10]
        )
        if len(orphaned_corpuses) > 10:
            details += f"\n  ... and {len(orphaned_corpuses) - 10} more corpuses"

        raise Exception(
            f"Cannot remove M2M field: {orphaned_count} document(s) in M2M "
            f"relationship(s) do not have corresponding DocumentPath records.\n\n"
            f"Affected corpuses:\n{details}\n\n"
            f"Run 'python manage.py shell' and manually create DocumentPath records "
            f"for these documents before retrying the migration."
        )


class Migration(migrations.Migration):
    dependencies = [
        ("corpuses", "0038_create_personal_corpuses"),
        # DocumentPath (with is_deleted) exists since 0023; 0038 already depends on 0030
        ("documents", "0030_document_processing_error_and_more"),
    ]

    operations = [
        # Validate no orphaned M2M entries before removing the field
        migrations.RunPython(
            validate_no_orphaned_m2m,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="corpus",
            name="documents",
        ),
    ]

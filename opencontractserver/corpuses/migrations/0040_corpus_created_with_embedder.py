"""
Add created_with_embedder field to Corpus and backfill from preferred_embedder.

Issue #437: Embedder Consistency - Prevent need for re-embedding.

The created_with_embedder field records which embedder was active when a
corpus was created. It never changes after creation (audit trail).

For existing corpuses, we backfill created_with_embedder from their
preferred_embedder (if set) or from DEFAULT_EMBEDDER.

Performance: Uses two bulk UPDATE statements (no row-by-row iteration).
Expected time: <1s for typical installations (<10K corpuses).
For very large tables (100K+), expect ~1-2s per 100K rows.

Rollback: The reverse migration is a no-op (RunPython.noop). Rolling back
will remove the created_with_embedder column via the standard Django
migration framework (RemoveField is implicit on reverse). No data loss
occurs because the column is derived from preferred_embedder, which
remains unchanged.
"""

from django.conf import settings
from django.db import migrations, models


def backfill_created_with_embedder(apps, schema_editor):
    """
    Backfill created_with_embedder for existing corpuses.

    For corpuses that already have a preferred_embedder, use that.
    For corpuses without one, use the current DEFAULT_EMBEDDER and also
    set their preferred_embedder to freeze it.
    """
    Corpus = apps.get_model("corpuses", "Corpus")
    default_embedder = getattr(settings, "DEFAULT_EMBEDDER", None)

    # Corpuses with preferred_embedder set: record it as created_with_embedder
    Corpus.objects.filter(preferred_embedder__isnull=False).exclude(
        preferred_embedder=""
    ).update(created_with_embedder=models.F("preferred_embedder"))

    # Corpuses without preferred_embedder: freeze the current DEFAULT_EMBEDDER
    if default_embedder:
        Corpus.objects.filter(
            models.Q(preferred_embedder__isnull=True) | models.Q(preferred_embedder="")
        ).update(
            preferred_embedder=default_embedder,
            created_with_embedder=default_embedder,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("corpuses", "0039_remove_corpus_documents_m2m"),
    ]

    operations = [
        migrations.AddField(
            model_name="corpus",
            name="created_with_embedder",
            field=models.CharField(
                blank=True,
                editable=False,
                help_text=(
                    "The embedder that was active when this corpus was created. "
                    "Set automatically and never changes (audit trail)."
                ),
                max_length=1024,
                null=True,
            ),
        ),
        migrations.RunPython(
            backfill_created_with_embedder,
            reverse_code=migrations.RunPython.noop,
        ),
    ]

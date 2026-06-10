"""
Add GIN index on content_modalities field for efficient array containment queries.

GIN indexes are optimal for PostgreSQL array fields when using operators like
@> (contains) which will be used for filtering annotations by modality.
"""

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations


class Migration(migrations.Migration):
    """Add GIN index on content_modalities for efficient modality filtering."""

    # atomic = False is required for CONCURRENTLY index creation
    atomic = False

    dependencies = [
        ("annotations", "0053_backfill_content_modalities"),
    ]

    operations = [
        AddIndexConcurrently(
            model_name="annotation",
            index=GinIndex(
                fields=["content_modalities"],
                name="idx_ann_content_modalities_gin",
            ),
        ),
    ]

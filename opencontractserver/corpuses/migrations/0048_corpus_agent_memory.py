"""Add memory_enabled and memory_document fields to Corpus model."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("corpuses", "0047_corpus_license_fields"),
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="corpus",
            name="memory_enabled",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Enable agent memory system for this corpus. When enabled, "
                    "agents accumulate reusable insights from conversations "
                    "into a memory document."
                ),
            ),
        ),
        migrations.AddField(
            model_name="corpus",
            name="memory_document",
            field=models.OneToOneField(
                blank=True,
                help_text=(
                    "The Document storing accumulated agent memory for this corpus."
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="memory_for_corpus",
                to="documents.document",
            ),
        ),
    ]

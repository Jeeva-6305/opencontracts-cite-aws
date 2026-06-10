"""
Add IngestionSource model and lineage fields on DocumentPath.

This migration introduces document lineage tracking:
- IngestionSource: registry of named integrations/crawlers/pipelines
- DocumentPath gains ingestion_source FK, external_id, and ingestion_metadata
  so each path-tree event records which source produced it and with what context.
"""

import django.db.models
from django.conf import settings
from django.db import migrations, models

import opencontractserver.shared.defaults
import opencontractserver.shared.fields


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0035_add_enabled_components_to_pipeline_settings"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ---- IngestionSource model ----
        migrations.CreateModel(
            name="IngestionSource",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "user_lock",
                    models.ForeignKey(
                        blank=True,
                        db_index=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="locked_%(class)s_objects",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("backend_lock", models.BooleanField(default=False, db_index=True)),
                ("is_public", models.BooleanField(default=False)),
                (
                    "creator",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "modified",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "name",
                    models.CharField(
                        db_index=True,
                        help_text="Human-readable name for this source (e.g. 'alpha_site_crawler')",
                        max_length=255,
                    ),
                ),
                (
                    "source_type",
                    models.CharField(
                        choices=[
                            ("manual", "Manual Upload"),
                            ("crawler", "Web Crawler"),
                            ("api", "API Import"),
                            ("pipeline", "Processing Pipeline"),
                            ("sync", "External Sync"),
                        ],
                        default="manual",
                        help_text="Category of ingestion source",
                        max_length=50,
                    ),
                ),
                (
                    "config",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=opencontractserver.shared.defaults.jsonfield_default_value,
                        help_text="Connection details, schedule, credentials reference, etc.",
                        null=True,
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        default=True,
                        db_index=True,
                        help_text="Whether this source is actively ingesting documents",
                    ),
                ),
            ],
            options={
                "permissions": (
                    ("create_ingestionsource", "create IngestionSource"),
                    ("read_ingestionsource", "read IngestionSource"),
                    ("update_ingestionsource", "update IngestionSource"),
                    ("remove_ingestionsource", "delete IngestionSource"),
                ),
            },
        ),
        migrations.AddConstraint(
            model_name="ingestionsource",
            constraint=models.UniqueConstraint(
                fields=("creator", "name"),
                name="unique_ingestion_source_per_creator",
            ),
        ),
        migrations.AddIndex(
            model_name="ingestionsource",
            index=models.Index(
                fields=["source_type"],
                name="documents_i_source__5c7a8e_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="ingestionsource",
            index=models.Index(
                fields=["active"],
                name="documents_i_active_3f1b2a_idx",
            ),
        ),
        # ---- Guardian permission models for IngestionSource ----
        migrations.CreateModel(
            name="IngestionSourceUserObjectPermission",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "permission",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="auth.permission",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "content_object",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="documents.ingestionsource",
                    ),
                ),
            ],
            options={
                "abstract": False,
                "unique_together": {("user", "permission", "content_object")},
            },
        ),
        migrations.CreateModel(
            name="IngestionSourceGroupObjectPermission",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "permission",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="auth.permission",
                    ),
                ),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="auth.group",
                    ),
                ),
                (
                    "content_object",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="documents.ingestionsource",
                    ),
                ),
            ],
            options={
                "abstract": False,
                "unique_together": {("group", "permission", "content_object")},
            },
        ),
        # ---- Lineage fields on DocumentPath ----
        migrations.AddField(
            model_name="documentpath",
            name="ingestion_source",
            field=models.ForeignKey(
                blank=True,
                help_text="Source integration that produced this version (null = manual upload)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="document_paths",
                to="documents.ingestionsource",
            ),
        ),
        migrations.AddField(
            model_name="documentpath",
            name="external_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Identifier in the external system (e.g. 'alpha:contract-123')",
                max_length=512,
            ),
        ),
        migrations.AddField(
            model_name="documentpath",
            name="ingestion_metadata",
            field=opencontractserver.shared.fields.NullableJSONField(
                blank=True,
                default=opencontractserver.shared.defaults.jsonfield_default_value,
                help_text="Arbitrary source-specific data (URL, crawl job ID, HTTP headers, ETags, etc.)",
                null=True,
            ),
        ),
        # Composite index for "all docs from source X with external ID Y"
        migrations.AddIndex(
            model_name="documentpath",
            index=models.Index(
                fields=["ingestion_source", "external_id"],
                name="documents_d_ingesti_a1b2c3_idx",
            ),
        ),
    ]

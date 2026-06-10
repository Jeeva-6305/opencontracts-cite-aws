# Generated migration for PipelineSettings singleton model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import opencontractserver.shared.fields


def create_pipeline_settings_singleton(apps, schema_editor):
    """
    Create the singleton PipelineSettings instance with defaults from Django settings.

    This ensures the singleton exists after migration, populated with the current
    Django settings values so existing deployments continue to work unchanged.
    """
    from django.conf import settings as django_settings

    PipelineSettings = apps.get_model("documents", "PipelineSettings")

    # Only create if doesn't exist (idempotent)
    if not PipelineSettings.objects.exists():
        PipelineSettings.objects.create(
            id=1,
            preferred_parsers=getattr(django_settings, "PREFERRED_PARSERS", {}),
            preferred_embedders=getattr(django_settings, "PREFERRED_EMBEDDERS", {}),
            preferred_thumbnailers={},  # No default in Django settings
            parser_kwargs=getattr(django_settings, "PARSER_KWARGS", {}),
            component_settings=getattr(django_settings, "PIPELINE_SETTINGS", {}),
            default_embedder=getattr(django_settings, "DEFAULT_EMBEDDER", ""),
        )


def reverse_create_singleton(apps, schema_editor):
    """
    Reverse the singleton creation.

    Note: This removes all pipeline settings data.
    """
    PipelineSettings = apps.get_model("documents", "PipelineSettings")
    PipelineSettings.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("documents", "0030_document_processing_error_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="PipelineSettings",
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
                    "preferred_parsers",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=dict,
                        help_text="Mapping of MIME types to preferred parser class paths",
                    ),
                ),
                (
                    "preferred_embedders",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=dict,
                        help_text="Mapping of MIME types to preferred embedder class paths",
                    ),
                ),
                (
                    "preferred_thumbnailers",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=dict,
                        help_text="Mapping of MIME types to preferred thumbnailer class paths",
                    ),
                ),
                (
                    "parser_kwargs",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=dict,
                        help_text="Mapping of parser class paths to configuration kwargs",
                    ),
                ),
                (
                    "component_settings",
                    opencontractserver.shared.fields.NullableJSONField(
                        blank=True,
                        default=dict,
                        help_text="Mapping of component class paths to settings overrides",
                    ),
                ),
                (
                    "default_embedder",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Default embedder class path",
                        max_length=512,
                    ),
                ),
                (
                    "encrypted_secrets",
                    models.BinaryField(
                        blank=True,
                        null=True,
                        help_text="Encrypted storage for sensitive configuration (API keys, credentials)",
                    ),
                ),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "modified_by",
                    models.ForeignKey(
                        blank=True,
                        help_text="User who last modified these settings",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pipeline_settings_modifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Pipeline Settings",
                "verbose_name_plural": "Pipeline Settings",
            },
        ),
        # Create the singleton instance with defaults from Django settings
        migrations.RunPython(
            create_pipeline_settings_singleton,
            reverse_create_singleton,
        ),
    ]

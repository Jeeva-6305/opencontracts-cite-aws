import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models

import opencontractserver.worker_uploads.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("corpuses", "0001_initial"),
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkerAccount",
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
                    "name",
                    models.CharField(
                        help_text="Human-readable name for this worker account.",
                        max_length=255,
                        unique=True,
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Description of what this worker does.",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        help_text="Inactive accounts cannot authenticate.",
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(
                        db_index=True, default=django.utils.timezone.now
                    ),
                ),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "creator",
                    models.ForeignKey(
                        help_text="Admin who created this worker account.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_worker_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        help_text="Auto-created Django User for permission compatibility.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="worker_account",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
            },
        ),
        migrations.AddIndex(
            model_name="workeraccount",
            index=models.Index(fields=["name"], name="worker_uplo_name_8c3b2d_idx"),
        ),
        migrations.AddIndex(
            model_name="workeraccount",
            index=models.Index(
                fields=["is_active"], name="worker_uplo_is_acti_a1b2c3_idx"
            ),
        ),
        migrations.CreateModel(
            name="CorpusAccessToken",
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
                    "key",
                    models.CharField(
                        db_index=True,
                        default=opencontractserver.worker_uploads.models._generate_token_key,
                        help_text="Cryptographically random access token.",
                        max_length=64,
                        unique=True,
                    ),
                ),
                (
                    "expires_at",
                    models.DateTimeField(
                        blank=True,
                        db_index=True,
                        help_text="Token expiry. Null means no expiry.",
                        null=True,
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        help_text="Revoked tokens have is_active=False.",
                    ),
                ),
                (
                    "rate_limit_per_minute",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Max uploads per minute. 0 means unlimited.",
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(
                        db_index=True, default=django.utils.timezone.now
                    ),
                ),
                ("modified", models.DateTimeField(auto_now=True)),
                (
                    "corpus",
                    models.ForeignKey(
                        help_text="Corpus this token grants upload access to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="worker_access_tokens",
                        to="corpuses.corpus",
                    ),
                ),
                (
                    "worker_account",
                    models.ForeignKey(
                        help_text="Worker account this token belongs to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_tokens",
                        to="worker_uploads.workeraccount",
                    ),
                ),
            ],
            options={
                "ordering": ["-created"],
            },
        ),
        migrations.AddIndex(
            model_name="corpusaccesstoken",
            index=models.Index(
                fields=["worker_account", "corpus"],
                name="worker_uplo_worker__d4e5f6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="corpusaccesstoken",
            index=models.Index(
                fields=["is_active", "expires_at"],
                name="worker_uplo_is_acti_g7h8i9_idx",
            ),
        ),
        migrations.CreateModel(
            name="WorkerDocumentUpload",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("COMPLETED", "Completed"),
                            ("FAILED", "Failed"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                (
                    "file",
                    models.FileField(
                        help_text="The uploaded document file.",
                        upload_to=opencontractserver.worker_uploads.models._upload_staging_path,
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        default=dict,
                        help_text="JSON payload with annotations, embeddings, labels, and target path.",
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Error details if processing failed.",
                    ),
                ),
                (
                    "created",
                    models.DateTimeField(
                        db_index=True, default=django.utils.timezone.now
                    ),
                ),
                (
                    "processing_started",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "processing_finished",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "corpus",
                    models.ForeignKey(
                        help_text="Target corpus for this upload.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="worker_uploads",
                        to="corpuses.corpus",
                    ),
                ),
                (
                    "corpus_access_token",
                    models.ForeignKey(
                        help_text="Token used for this upload.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="uploads",
                        to="worker_uploads.corpusaccesstoken",
                    ),
                ),
                (
                    "result_document",
                    models.ForeignKey(
                        blank=True,
                        help_text="The Document created after successful processing.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="worker_upload_records",
                        to="documents.document",
                    ),
                ),
            ],
            options={
                "ordering": ["created"],
            },
        ),
        migrations.AddIndex(
            model_name="workerdocumentupload",
            index=models.Index(
                fields=["status", "created"],
                name="worker_uplo_status_j1k2l3_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="workerdocumentupload",
            index=models.Index(
                fields=["corpus", "status"],
                name="worker_uplo_corpus__m4n5o6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="workerdocumentupload",
            index=models.Index(
                fields=["corpus_access_token"],
                name="worker_uplo_corpus__p7q8r9_idx",
            ),
        ),
    ]

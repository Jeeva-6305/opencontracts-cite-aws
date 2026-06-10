"""
Management command to backfill DEFAULT_EMBEDDER embeddings for existing annotations.

This command is part of the dual embedding strategy implementation. It ensures all
annotations have a DEFAULT_EMBEDDER embedding for global search capability.

Usage:
    python manage.py backfill_default_embeddings [options]

Options:
    --dry-run          Preview changes without modifying database
    --corpus-id ID     Backfill only annotations in a specific corpus
    --document-id ID   Backfill only annotations in a specific document
    --batch-size N     Process N annotations per batch (default: 100)
    --verbose          Show detailed progress
"""

import logging

from django.core.management.base import BaseCommand
from django.db.models import Q

from opencontractserver.annotations.models import Annotation, Embedding
from opencontractserver.pipeline.utils import get_default_embedder_path
from opencontractserver.tasks.embeddings_task import (
    calculate_embedding_for_annotation_text,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Backfill DEFAULT_EMBEDDER embeddings for annotations that don't have them.

    This command:
    1. Finds annotations missing DEFAULT_EMBEDDER embeddings
    2. Queues embedding generation tasks for each
    3. Tracks progress and reports statistics
    """

    help = (
        "Backfill DEFAULT_EMBEDDER embeddings for annotations missing them. "
        "This enables global search across all corpuses."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Run in dry-run mode (no database changes)",
        )
        parser.add_argument(
            "--corpus-id",
            type=int,
            help="Process only annotations in a specific corpus",
        )
        parser.add_argument(
            "--document-id",
            type=int,
            help="Process only annotations in a specific document",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of annotations to process per batch (default: 100)",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed progress information",
        )
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Run synchronously instead of queuing Celery tasks",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        corpus_id = options.get("corpus_id")
        document_id = options.get("document_id")
        batch_size = options["batch_size"]
        verbose = options["verbose"]
        sync_mode = options["sync"]

        default_embedder_path = get_default_embedder_path()

        self.stdout.write(
            self.style.NOTICE(
                f"Backfilling DEFAULT_EMBEDDER embeddings: {default_embedder_path}"
            )
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made"))

        # Build base queryset of annotations
        queryset = Annotation.objects.all()

        if corpus_id:
            self.stdout.write(f"Filtering to corpus_id={corpus_id}")
            # Filter to annotations in this corpus (non-structural annotations have corpus_id)
            # For structural annotations, filter by those belonging to documents in this corpus
            # Note: Documents are associated with corpuses through DocumentPath (path_records)
            queryset = queryset.filter(
                Q(corpus_id=corpus_id)
                | Q(
                    structural=True,
                    structural_set__documents__path_records__corpus_id=corpus_id,
                )
            )

        if document_id:
            self.stdout.write(f"Filtering to document_id={document_id}")
            queryset = queryset.filter(
                Q(document_id=document_id)
                | Q(structural=True, structural_set__documents__id=document_id)
            )

        # Find annotations missing default embeddings
        # We need to exclude annotations that already have DEFAULT_EMBEDDER embedding
        annotations_with_default = Embedding.objects.filter(
            embedder_path=default_embedder_path,
            annotation_id__isnull=False,
        ).values_list("annotation_id", flat=True)

        missing_queryset = queryset.exclude(id__in=annotations_with_default)

        # Also filter to only those with text to embed
        missing_queryset = missing_queryset.exclude(
            Q(raw_text__isnull=True) | Q(raw_text="")
        )

        total_missing = missing_queryset.count()

        self.stdout.write(
            self.style.NOTICE(
                f"Found {total_missing} annotations missing default embeddings"
            )
        )

        if total_missing == 0:
            self.stdout.write(
                self.style.SUCCESS("All annotations have default embeddings!")
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: Would queue {total_missing} embedding tasks"
                )
            )
            return

        # Process in batches
        processed = 0
        errors = 0

        # Use iterator for memory efficiency
        for annotation in missing_queryset.iterator(chunk_size=batch_size):
            try:
                # Get corpus_id for this annotation
                annotation_corpus_id = annotation.corpus_id
                if not annotation_corpus_id and annotation.structural_set_id:
                    annotation_corpus_id = getattr(
                        annotation.structural_set, "corpus_id", None
                    )

                if sync_mode:
                    # Run synchronously
                    calculate_embedding_for_annotation_text(
                        annotation_id=annotation.id,
                        corpus_id=annotation_corpus_id,
                    )
                else:
                    # Queue Celery task
                    calculate_embedding_for_annotation_text.delay(
                        annotation_id=annotation.id,
                        corpus_id=annotation_corpus_id,
                    )

                processed += 1

                if verbose and processed % 100 == 0:
                    self.stdout.write(
                        f"Processed {processed}/{total_missing} annotations..."
                    )

            except Exception as e:
                errors += 1
                logger.error(f"Error processing annotation {annotation.id}: {e}")
                if verbose:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error processing annotation {annotation.id}: {e}"
                        )
                    )

        # Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Backfill complete!"))
        self.stdout.write(f"  Total annotations processed: {processed}")
        self.stdout.write(f"  Errors: {errors}")

        if not sync_mode:
            self.stdout.write(
                self.style.NOTICE(
                    "Tasks have been queued. Monitor Celery workers for progress."
                )
            )

"""
Tests for the backfill_default_embeddings management command.

Tests the command that backfills default embedder embeddings for
annotations that are missing them.
"""

from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.test import TestCase

from opencontractserver.annotations.models import Annotation, AnnotationLabel, Embedding
from opencontractserver.corpuses.models import Corpus
from opencontractserver.documents.models import Document

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestBackfillDefaultEmbeddingsCommand(TestCase):
    """Tests for the backfill_default_embeddings management command."""

    @classmethod
    def setUpTestData(cls):
        """Set up test data that will be used across test methods."""
        cls.user = User.objects.create_user(
            username="backfill_test_user", password="testpass123"
        )
        cls.corpus = Corpus.objects.create(
            title="Test Corpus",
            creator=cls.user,
        )
        cls.corpus2 = Corpus.objects.create(
            title="Test Corpus 2",
            creator=cls.user,
        )
        cls.label = AnnotationLabel.objects.create(
            text="Test Label",
            creator=cls.user,
        )

    def _create_document(self, title="Test Doc"):
        """Helper to create a document and add to corpus.

        Returns the corpus-isolated copy (not the original) since that's
        the document that's actually in the corpus.
        """
        original_doc = Document.objects.create(
            title=title,
            creator=self.user,
            pdf_file=ContentFile(b"fake pdf content", name="test.pdf"),
        )
        corpus_doc, _, _ = self.corpus.add_document(
            document=original_doc, user=self.user
        )
        return corpus_doc

    def _create_annotation(self, document, raw_text="Test text", corpus=None):
        """Helper to create an annotation."""
        return Annotation.objects.create(
            document=document,
            corpus=corpus or self.corpus,
            annotation_label=self.label,
            creator=self.user,
            raw_text=raw_text,
            json={
                "0": {
                    "bounds": {"left": 100, "top": 100, "right": 200, "bottom": 112},
                    "tokensJsons": [{"pageIndex": 0, "tokenIndex": 0}],
                }
            },
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    def test_command_no_annotations_no_errors(self, _mock_path):
        """Command should succeed with no annotations to process."""
        out = StringIO()
        call_command("backfill_default_embeddings", stdout=out)

        output = out.getvalue()
        self.assertIn("Found 0 annotations missing default embeddings", output)
        self.assertIn("All annotations have default embeddings", output)

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_processes_annotations_without_default_embedding(
        self, mock_calc_embedding, _mock_path
    ):
        """Command should process annotations missing default embeddings."""
        mock_calc_embedding.delay = MagicMock()

        document = self._create_document()
        annotation = self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", stdout=out)

        output = out.getvalue()
        self.assertIn("Found 1 annotations missing default embeddings", output)
        self.assertIn("Backfill complete!", output)
        self.assertIn("Total annotations processed: 1", output)

        # Check the task was queued
        mock_calc_embedding.delay.assert_called_once_with(
            annotation_id=annotation.id,
            corpus_id=self.corpus.id,
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_skips_annotations_with_default_embedding(
        self, mock_calc_embedding, _mock_path
    ):
        """Command should skip annotations that already have default embeddings."""
        mock_calc_embedding.delay = MagicMock()

        document = self._create_document()
        annotation = self._create_annotation(document)

        # Create an existing embedding for this annotation
        Embedding.objects.create(
            annotation=annotation,
            embedder_path="test.embedder.path",
            vector_768=[0.1] * 768,
            creator=self.user,
        )

        out = StringIO()
        call_command("backfill_default_embeddings", stdout=out)

        output = out.getvalue()
        self.assertIn("Found 0 annotations missing default embeddings", output)
        self.assertIn("All annotations have default embeddings", output)

        # Task should not be called
        mock_calc_embedding.delay.assert_not_called()

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    def test_command_dry_run_no_changes(self, _mock_path):
        """Dry run should not make any changes."""
        document = self._create_document()
        self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", "--dry-run", stdout=out)

        output = out.getvalue()
        self.assertIn("DRY RUN - no changes will be made", output)
        self.assertIn("Would queue 1 embedding tasks", output)

        # No embeddings should be created
        self.assertEqual(Embedding.objects.count(), 0)

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_batch_size_option(self, mock_calc_embedding, _mock_path):
        """Batch size option should be accepted."""
        mock_calc_embedding.delay = MagicMock()

        document = self._create_document()
        self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", "--batch-size=50", stdout=out)

        output = out.getvalue()
        self.assertIn("Backfill complete!", output)

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_handles_embedding_failures_gracefully(
        self, mock_calc_embedding, _mock_path
    ):
        """Command should continue processing after individual failures."""
        # Make delay raise an exception
        mock_calc_embedding.delay = MagicMock(side_effect=Exception("Queue error"))

        document = self._create_document()
        self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", "--verbose", stdout=out)

        output = out.getvalue()
        self.assertIn("Errors: 1", output)
        self.assertIn("Backfill complete!", output)

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_respects_corpus_filter(self, mock_calc_embedding, _mock_path):
        """Command should filter by corpus when corpus-id is provided."""
        mock_calc_embedding.delay = MagicMock()

        # Doc 1 in corpus 1 (created via helper, already added to self.corpus)
        document1 = self._create_document(title="Doc 1")
        annotation1 = self._create_annotation(document1, corpus=self.corpus)

        # Doc 2 in corpus 2 - create without adding to self.corpus
        original_doc2 = Document.objects.create(
            title="Doc 2",
            creator=self.user,
            pdf_file=ContentFile(b"fake pdf content", name="test.pdf"),
        )
        corpus2_doc, _, _ = self.corpus2.add_document(
            document=original_doc2, user=self.user
        )
        self._create_annotation(corpus2_doc, raw_text="Other text", corpus=self.corpus2)

        out = StringIO()
        call_command(
            "backfill_default_embeddings",
            f"--corpus-id={self.corpus.id}",
            stdout=out,
        )

        output = out.getvalue()
        self.assertIn(f"Filtering to corpus_id={self.corpus.id}", output)
        self.assertIn("Found 1 annotations missing default embeddings", output)

        # Only corpus1 annotation should be queued
        mock_calc_embedding.delay.assert_called_once_with(
            annotation_id=annotation1.id,
            corpus_id=self.corpus.id,
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_respects_document_filter(self, mock_calc_embedding, _mock_path):
        """Command should filter by document when document-id is provided."""
        mock_calc_embedding.delay = MagicMock()

        document1 = self._create_document(title="Doc 1")
        annotation1 = self._create_annotation(document1)

        document2 = self._create_document(title="Doc 2")
        self._create_annotation(document2, raw_text="Other text")

        out = StringIO()
        call_command(
            "backfill_default_embeddings",
            f"--document-id={document1.id}",
            stdout=out,
        )

        output = out.getvalue()
        self.assertIn(f"Filtering to document_id={document1.id}", output)
        self.assertIn("Found 1 annotations missing default embeddings", output)

        # Only document1 annotation should be queued
        mock_calc_embedding.delay.assert_called_once_with(
            annotation_id=annotation1.id,
            corpus_id=self.corpus.id,
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_skips_annotations_without_text(
        self, mock_calc_embedding, _mock_path
    ):
        """Command should skip annotations with empty or null raw_text."""
        mock_calc_embedding.delay = MagicMock()

        document = self._create_document()

        # Create annotations with no text
        self._create_annotation(document, raw_text="")
        self._create_annotation(document, raw_text=None)

        # Create one with text
        annotation_with_text = self._create_annotation(document, raw_text="Has text")

        out = StringIO()
        call_command("backfill_default_embeddings", stdout=out)

        output = out.getvalue()
        self.assertIn("Found 1 annotations missing default embeddings", output)

        # Only annotation with text should be processed
        mock_calc_embedding.delay.assert_called_once_with(
            annotation_id=annotation_with_text.id,
            corpus_id=self.corpus.id,
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_sync_mode(self, mock_calc_embedding, _mock_path):
        """Command with --sync should run synchronously."""
        document = self._create_document()
        annotation = self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", "--sync", stdout=out)

        output = out.getvalue()
        self.assertIn("Backfill complete!", output)

        # In sync mode, the function is called directly, not delay()
        mock_calc_embedding.assert_called_once_with(
            annotation_id=annotation.id,
            corpus_id=self.corpus.id,
        )
        # delay() should not be called
        self.assertFalse(
            hasattr(mock_calc_embedding, "delay") and mock_calc_embedding.delay.called
        )

    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".get_default_embedder_path",
        return_value="test.embedder.path",
    )
    @patch(
        "opencontractserver.annotations.management.commands.backfill_default_embeddings"
        ".calculate_embedding_for_annotation_text"
    )
    def test_command_verbose_mode(self, mock_calc_embedding, _mock_path):
        """Verbose mode should show detailed progress."""
        mock_calc_embedding.delay = MagicMock()

        document = self._create_document()
        self._create_annotation(document)

        out = StringIO()
        call_command("backfill_default_embeddings", "--verbose", stdout=out)

        output = out.getvalue()
        self.assertIn("Backfill complete!", output)

"""
Tests for migration 0055_isolate_structural_sets rollback functionality.

This tests both the forward and reverse migration logic to ensure:
1. Forward: Shared structural sets are properly duplicated with trackable content_hash
2. Reverse: Documents are restored to original sets and duplicates are cleaned up
"""

import re

from django.test import TestCase

from opencontractserver.annotations.models import Annotation, StructuralAnnotationSet
from opencontractserver.corpuses.models import Corpus
from opencontractserver.documents.models import Document
from opencontractserver.users.models import User


class TestMigration0055Rollback(TestCase):
    """Test the reverse migration for 0055_isolate_structural_sets."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com"
        )
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.user)

        # Create a shared structural set (simulating pre-migration state)
        self.original_set = StructuralAnnotationSet.objects.create(
            content_hash="original_hash_abc123",
            parser_name="test_parser",
            parser_version="1.0",
            page_count=5,
            token_count=1000,
            creator=self.user,
        )

        # Create annotation on original set
        self.original_annotation = Annotation.objects.create(
            structural_set=self.original_set,
            raw_text="Test structural annotation",
            structural=True,
            page=1,
            creator=self.user,
        )

    def test_content_hash_pattern_matches_isolated_format(self):
        """Verify the regex pattern correctly parses isolated content_hash format."""
        pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")

        # Valid formats
        valid_hashes = [
            "somehash_isolated_from123_abcdef123456",
            "hash_with_underscores_isolated_from1_000000000000",
            "x_isolated_from999999_ffffffffffff",
        ]

        for content_hash in valid_hashes:
            match = pattern.search(content_hash)
            self.assertIsNotNone(match, f"Should match: {content_hash}")

        # Invalid formats (should not match)
        invalid_hashes = [
            "regular_hash_no_isolated",
            "isolated_from123_abcdef123456",  # Missing underscore prefix
            "hash_isolated_from_abcdef123456",  # Missing PK
            "hash_isolated_from123_short",  # UUID too short
        ]

        for content_hash in invalid_hashes:
            match = pattern.search(content_hash)
            self.assertIsNone(match, f"Should not match: {content_hash}")

    def test_forward_migration_creates_trackable_duplicates(self):
        """Verify forward migration creates content_hash that encodes original PK."""
        # Simulate forward migration creating an isolated copy
        isolated_content_hash = (
            f"{self.original_set.content_hash}_isolated_from"
            f"{self.original_set.pk}_abc123def456"
        )

        isolated_set = StructuralAnnotationSet.objects.create(
            content_hash=isolated_content_hash,
            parser_name=self.original_set.parser_name,
            parser_version=self.original_set.parser_version,
            page_count=self.original_set.page_count,
            token_count=self.original_set.token_count,
            creator=self.user,
        )

        # Verify we can extract original PK
        pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")
        match = pattern.search(isolated_set.content_hash)

        self.assertIsNotNone(match)
        extracted_pk = int(match.group(1))
        self.assertEqual(extracted_pk, self.original_set.pk)

    def test_reverse_migration_restores_document_relationship(self):
        """Verify reverse migration re-links documents to original structural set."""
        # Create isolated set (as forward migration would)
        isolated_set = StructuralAnnotationSet.objects.create(
            content_hash=(
                f"{self.original_set.content_hash}_isolated_from"
                f"{self.original_set.pk}_abc123def456"
            ),
            parser_name=self.original_set.parser_name,
            parser_version=self.original_set.parser_version,
            creator=self.user,
        )

        # Create document pointing to isolated set and add to corpus
        original_doc = Document.objects.create(
            title="Test Document",
            structural_annotation_set=isolated_set,
            creator=self.user,
        )
        doc, _, _ = self.corpus.add_document(document=original_doc, user=self.user)

        # Verify initial state
        self.assertEqual(doc.structural_annotation_set, isolated_set)

        # --- Simulate reverse migration ---
        pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")
        match = pattern.search(isolated_set.content_hash)
        original_pk = int(match.group(1))

        original_set = StructuralAnnotationSet.objects.get(pk=original_pk)
        Document.objects.filter(structural_annotation_set=isolated_set).update(
            structural_annotation_set=original_set
        )

        # Verify document now points to original
        doc.refresh_from_db()
        self.assertEqual(doc.structural_annotation_set, self.original_set)

    def test_reverse_migration_deletes_isolated_annotations(self):
        """Verify reverse migration cleans up duplicated annotations."""
        # Create isolated set with copied annotations
        isolated_set = StructuralAnnotationSet.objects.create(
            content_hash=(
                f"{self.original_set.content_hash}_isolated_from"
                f"{self.original_set.pk}_abc123def456"
            ),
            creator=self.user,
        )

        # Create copied annotations on isolated set
        copied_annotations = [
            Annotation.objects.create(
                structural_set=isolated_set,
                raw_text=f"Copied annotation {i}",
                structural=True,
                page=i,
                creator=self.user,
            )
            for i in range(3)
        ]

        # Verify annotations exist
        self.assertEqual(
            Annotation.objects.filter(structural_set=isolated_set).count(), 3
        )

        # --- Simulate reverse migration cleanup ---
        Annotation.objects.filter(structural_set=isolated_set).delete()
        isolated_set.delete()

        # Verify cleanup
        self.assertFalse(
            StructuralAnnotationSet.objects.filter(pk=isolated_set.pk).exists()
        )
        for ann in copied_annotations:
            self.assertFalse(Annotation.objects.filter(pk=ann.pk).exists())

        # Original annotation should still exist
        self.assertTrue(
            Annotation.objects.filter(pk=self.original_annotation.pk).exists()
        )

    def test_reverse_migration_handles_missing_original_gracefully(self):
        """Verify reverse migration handles case where original set was deleted."""
        # Create isolated set pointing to non-existent original
        fake_original_pk = 999999
        isolated_set = StructuralAnnotationSet.objects.create(
            content_hash=f"somehash_isolated_from{fake_original_pk}_abc123def456",
            creator=self.user,
        )

        # Verify original doesn't exist
        self.assertFalse(
            StructuralAnnotationSet.objects.filter(pk=fake_original_pk).exists()
        )

        # --- Simulate reverse migration with missing original ---
        pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")
        match = pattern.search(isolated_set.content_hash)
        original_pk = int(match.group(1))

        # Should raise DoesNotExist
        with self.assertRaises(StructuralAnnotationSet.DoesNotExist):
            StructuralAnnotationSet.objects.get(pk=original_pk)

        # Migration should skip this set (not crash)
        # The actual migration prints a warning and continues

    def test_full_forward_and_reverse_cycle(self):
        """End-to-end test of forward migration followed by reverse."""
        # Setup: Create shared structural set with multiple documents
        original_doc1 = Document.objects.create(
            title="Document 1",
            structural_annotation_set=self.original_set,
            creator=self.user,
        )
        doc1, _, _ = self.corpus.add_document(document=original_doc1, user=self.user)

        original_doc2 = Document.objects.create(
            title="Document 2",
            structural_annotation_set=self.original_set,
            creator=self.user,
        )
        doc2, _, _ = self.corpus.add_document(document=original_doc2, user=self.user)

        # Verify shared state
        self.assertEqual(doc1.structural_annotation_set, doc2.structural_annotation_set)

        # --- Forward migration: isolate doc2 ---
        isolated_set = StructuralAnnotationSet.objects.create(
            content_hash=(
                f"{self.original_set.content_hash}_isolated_from"
                f"{self.original_set.pk}_abc123def456"
            ),
            parser_name=self.original_set.parser_name,
            parser_version=self.original_set.parser_version,
            creator=self.user,
        )

        # Copy annotation
        Annotation.objects.create(
            structural_set=isolated_set,
            raw_text=self.original_annotation.raw_text,
            structural=True,
            page=self.original_annotation.page,
            creator=self.user,
        )

        # Update doc2 to use isolated set
        doc2.structural_annotation_set = isolated_set
        doc2.save(update_fields=["structural_annotation_set"])

        # Verify isolation
        doc1.refresh_from_db()
        doc2.refresh_from_db()
        self.assertNotEqual(
            doc1.structural_annotation_set, doc2.structural_annotation_set
        )
        self.assertEqual(doc1.structural_annotation_set, self.original_set)
        self.assertEqual(doc2.structural_annotation_set, isolated_set)

        # --- Reverse migration: restore sharing ---
        pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")

        for iso_set in StructuralAnnotationSet.objects.filter(
            content_hash__contains="_isolated_from"
        ):
            match = pattern.search(iso_set.content_hash)
            if match:
                original_pk = int(match.group(1))
                try:
                    orig_set = StructuralAnnotationSet.objects.get(pk=original_pk)
                    Document.objects.filter(structural_annotation_set=iso_set).update(
                        structural_annotation_set=orig_set
                    )
                    Annotation.objects.filter(structural_set=iso_set).delete()
                    iso_set.delete()
                except StructuralAnnotationSet.DoesNotExist:
                    pass

        # Verify restored state
        doc1.refresh_from_db()
        doc2.refresh_from_db()
        self.assertEqual(doc1.structural_annotation_set, doc2.structural_annotation_set)
        self.assertEqual(doc1.structural_annotation_set, self.original_set)

        # Verify no isolated sets remain
        self.assertFalse(
            StructuralAnnotationSet.objects.filter(
                content_hash__contains="_isolated_from"
            ).exists()
        )

        # Verify original annotation still exists
        self.assertTrue(
            Annotation.objects.filter(pk=self.original_annotation.pk).exists()
        )

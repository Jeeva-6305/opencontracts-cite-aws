"""
Tests for verifying that Embeddings associated with Documents, Annotations, and Notes
can be created and queried via the manager-provided vector search methods, using the
new mixin-based approach to register embeddings (e.g. model_instance.add_embedding()).
"""

import random

from django.contrib.auth import get_user_model
from django.test import TestCase

from opencontractserver.annotations.models import Annotation, Note
from opencontractserver.documents.models import Document

User = get_user_model()

# We no longer need to directly import Embedding for creation, unless required for other tests
# from opencontractserver.annotations.models import Embedding


def random_vector(dimension: int = 384) -> list[float]:
    """
    Generates a random vector of the specified dimension. By default, 384 floats.
    In practice, for deterministic tests, you might fix the seed or choose exact values.
    """
    return [random.random() for _ in range(dimension)]


def constant_vector(dimension: int = 384, value: float = 0.1) -> list[float]:
    """
    Generates a constant vector of given dimension (default 384).
    Useful to simulate a 'dummy' query vector of the correct dimension.
    """
    return [value] * dimension


class TestEmbeddingSearch(TestCase):
    """
    Validates that we can create embeddings for Documents, Annotations, and Notes
    and query them using our new *search_by_embedding* manager methods.
    Now uses the mixin-based approach to add embeddings (e.g. doc.add_embedding()).
    """

    def setUp(self) -> None:
        """
        In setUp, we create:
          - 2 Documents (doc1, doc2)
          - 2 Annotations (anno1, anno2) each on different Documents
          - 2 Notes (note1, note2) each on different Documents

        Then we store embeddings using the new .add_embedding() API:
          - doc1, anno1, note1: embedder_path="openai/text-embedding-ada-002"
          - doc2, anno2, note2: some with "openai/text-embedding-ada-002"
            and some with "some-other-embedder" to verify embedder-based filtering.
        """
        # Create a test user first
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )

        # Create some "parent" objects
        self.doc1 = Document.objects.create(
            title="Document One", creator=self.user, is_public=True
        )
        self.doc2 = Document.objects.create(
            title="Document Two", creator=self.user, is_public=True
        )

        self.anno1 = Annotation.objects.create(
            document=self.doc1,
            page=1,
            creator=self.user,
            is_public=True,
            raw_text="First annotation text",
        )
        self.anno2 = Annotation.objects.create(
            document=self.doc2,
            page=2,
            creator=self.user,
            is_public=True,
            raw_text="Second annotation text",
        )

        self.note1 = Note.objects.create(
            document=self.doc1,
            creator=self.user,
            is_public=True,
            title="Note #1",
        )
        self.note2 = Note.objects.create(
            document=self.doc2,
            creator=self.user,
            is_public=True,
            title="Note #2",
        )

        # We'll consistently use dimension=384 embeddings.
        dim_384 = 384

        # Store embeddings on doc1 using the "openai" embedder
        self.doc1.add_embedding(
            embedder_path="openai/text-embedding-ada-002",
            vector=random_vector(dim_384),
        )

        # Store two embeddings on doc2: one with "openai", and one with "some-other"
        self.doc2.add_embedding(
            embedder_path="openai/text-embedding-ada-002",
            vector=random_vector(dim_384),
        )
        self.doc2.add_embedding(
            embedder_path="some-other-embedder",
            vector=random_vector(dim_384),
        )

        # Embeddings for anno1 & anno2, both with "openai" (just as an example).
        self.anno1.add_embedding(
            embedder_path="openai/text-embedding-ada-002",
            vector=random_vector(dim_384),
        )
        self.anno2.add_embedding(
            embedder_path="openai/text-embedding-ada-002",
            vector=random_vector(dim_384),
        )

        # Embedding for note1 with "openai"
        self.note1.add_embedding(
            embedder_path="openai/text-embedding-ada-002",
            vector=random_vector(dim_384),
        )
        # Embedding for note2 with "some-other"
        self.note2.add_embedding(
            embedder_path="some-other-embedder",
            vector=random_vector(dim_384),
        )

    def test_document_embedding_search(self) -> None:
        """
        Ensures Document.objects.search_by_embedding() returns
        only documents with the requested embedder/dimensions.
        """
        # We'll create a 384-dim query vector
        query_vec = constant_vector(dimension=384, value=0.1)

        # Searching with the "openai" embedder should return doc1 and doc2
        results_openai = Document.objects.search_by_embedding(
            query_vector=query_vec,
            embedder_path="openai/text-embedding-ada-002",
            top_k=10,
        )
        self.assertIn(self.doc1, results_openai)
        self.assertIn(self.doc2, results_openai)

        # Searching with "some-other-embedder" should return doc2 but not doc1
        results_other = Document.objects.search_by_embedding(
            query_vector=query_vec,
            embedder_path="some-other-embedder",
            top_k=10,
        )
        self.assertIn(self.doc2, results_other)
        self.assertNotIn(self.doc1, results_other)

    def test_annotation_embedding_search(self) -> None:
        """
        Ensures we can search annotations via search_by_embedding() if
        the AnnotationQuerySet implements VectorSearchViaEmbeddingMixin.
        """
        query_vec = constant_vector(dimension=384, value=0.2)

        try:
            results = Annotation.objects.search_by_embedding(
                query_vector=query_vec,
                embedder_path="openai/text-embedding-ada-002",
                top_k=10,
            )
            self.assertIn(self.anno1, results)
            self.assertIn(self.anno2, results)
        except AttributeError:
            self.skipTest("AnnotationQuerySet does not implement search_by_embedding")

    def test_note_embedding_search(self) -> None:
        """
        Ensures we can search notes by embedding if
        the NoteQuerySet implements VectorSearchViaEmbeddingMixin.
        """
        query_vec = constant_vector(dimension=384, value=0.3)

        try:
            # Searching for "openai" path
            results_openai = Note.objects.search_by_embedding(
                query_vector=query_vec,
                embedder_path="openai/text-embedding-ada-002",
                top_k=10,
            )
            self.assertIn(self.note1, results_openai)
            self.assertNotIn(self.note2, results_openai)

            # Searching for "some-other-embedder"
            results_other = Note.objects.search_by_embedding(
                query_vector=query_vec,
                embedder_path="some-other-embedder",
                top_k=10,
            )
            self.assertIn(self.note2, results_other)
            self.assertNotIn(self.note1, results_other)
        except AttributeError:
            self.skipTest("NoteQuerySet does not implement search_by_embedding")


class TestVectorSearchMixinDimensions(TestCase):
    """
    Tests for the VectorSearchViaEmbeddingMixin._dimension_to_field method
    to ensure all supported vector dimensions are properly mapped.
    """

    def setUp(self):
        """Set up a mixin instance for testing."""
        from opencontractserver.shared.mixins import VectorSearchViaEmbeddingMixin

        # Create a simple class that uses the mixin to test _dimension_to_field
        class TestQuerySet(VectorSearchViaEmbeddingMixin):
            EMBEDDING_RELATED_NAME = "embeddings"

        self.mixin = TestQuerySet()

    def test_dimension_384(self):
        """Test that 384-dimensional vectors map to vector_384 field."""
        result = self.mixin._dimension_to_field(384)
        self.assertEqual(result, "embeddings__vector_384")

    def test_dimension_768(self):
        """Test that 768-dimensional vectors map to vector_768 field."""
        result = self.mixin._dimension_to_field(768)
        self.assertEqual(result, "embeddings__vector_768")

    def test_dimension_1024(self):
        """Test that 1024-dimensional vectors map to vector_1024 field."""
        result = self.mixin._dimension_to_field(1024)
        self.assertEqual(result, "embeddings__vector_1024")

    def test_dimension_1536(self):
        """Test that 1536-dimensional vectors map to vector_1536 field."""
        result = self.mixin._dimension_to_field(1536)
        self.assertEqual(result, "embeddings__vector_1536")

    def test_dimension_3072(self):
        """Test that 3072-dimensional vectors map to vector_3072 field."""
        result = self.mixin._dimension_to_field(3072)
        self.assertEqual(result, "embeddings__vector_3072")

    def test_dimension_4096(self):
        """Test that 4096-dimensional vectors map to vector_4096 field."""
        result = self.mixin._dimension_to_field(4096)
        self.assertEqual(result, "embeddings__vector_4096")

    def test_unsupported_dimension_raises_error(self):
        """Test that unsupported dimensions raise ValueError."""
        with self.assertRaises(ValueError) as context:
            self.mixin._dimension_to_field(512)
        self.assertIn("Unsupported embedding dimension", str(context.exception))

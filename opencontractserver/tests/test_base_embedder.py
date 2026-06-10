"""
Unit tests for BaseEmbedder multimodal methods.

Tests the base class functionality for multimodal embeddings.
"""

from typing import Optional
from unittest.mock import patch

from django.test import TestCase

from opencontractserver.pipeline.base.embedder import BaseEmbedder
from opencontractserver.types.enums import ContentModality


class TextOnlyEmbedder(BaseEmbedder):
    """A concrete text-only embedder for testing."""

    title = "Text Only Embedder"
    description = "Test embedder that only supports text"
    vector_size = 768
    supported_modalities = {ContentModality.TEXT}

    def _embed_text_impl(self, text: str, **all_kwargs) -> Optional[list[float]]:
        return [0.1] * self.vector_size


class MultimodalEmbedder(BaseEmbedder):
    """A concrete multimodal embedder for testing."""

    title = "Multimodal Embedder"
    description = "Test embedder that supports text and images"
    vector_size = 768
    supported_modalities = {ContentModality.TEXT, ContentModality.IMAGE}

    def _embed_text_impl(self, text: str, **all_kwargs) -> Optional[list[float]]:
        return [0.1] * self.vector_size

    def _embed_image_impl(
        self, image_base64: str, image_format: str = "jpeg", **all_kwargs
    ) -> Optional[list[float]]:
        return [0.2] * self.vector_size


class PartialMultimodalEmbedder(BaseEmbedder):
    """Embedder that claims image support but doesn't implement _embed_image_impl."""

    title = "Partial Multimodal Embedder"
    description = "Test embedder with IMAGE modality but no implementation"
    vector_size = 768
    supported_modalities = {ContentModality.TEXT, ContentModality.IMAGE}

    def _embed_text_impl(self, text: str, **all_kwargs) -> Optional[list[float]]:
        return [0.1] * self.vector_size

    # Note: _embed_image_impl is NOT implemented


class TestBaseEmbedderModalities(TestCase):
    """Tests for BaseEmbedder modality support."""

    def test_text_only_embedder_properties(self):
        """Test text-only embedder has correct properties."""
        embedder = TextOnlyEmbedder()

        self.assertFalse(embedder.is_multimodal)
        self.assertTrue(embedder.supports_text)
        self.assertFalse(embedder.supports_images)

    def test_multimodal_embedder_properties(self):
        """Test multimodal embedder has correct properties."""
        embedder = MultimodalEmbedder()

        self.assertTrue(embedder.is_multimodal)
        self.assertTrue(embedder.supports_text)
        self.assertTrue(embedder.supports_images)

    def test_get_supported_modalities_as_strings_text_only(self):
        """Test get_supported_modalities_as_strings for text-only embedder."""
        embedder = TextOnlyEmbedder()

        modalities = embedder.get_supported_modalities_as_strings()

        self.assertIn("TEXT", modalities)
        self.assertNotIn("IMAGE", modalities)

    def test_get_supported_modalities_as_strings_multimodal(self):
        """Test get_supported_modalities_as_strings for multimodal embedder."""
        embedder = MultimodalEmbedder()

        modalities = embedder.get_supported_modalities_as_strings()

        self.assertIn("TEXT", modalities)
        self.assertIn("IMAGE", modalities)

    def test_supports_modalities_text_only(self):
        """Test supports_modalities for text-only embedder."""
        embedder = TextOnlyEmbedder()

        # Should support text
        self.assertTrue(embedder.supports_modalities(["TEXT"]))

        # Should not support image
        self.assertFalse(embedder.supports_modalities(["IMAGE"]))

        # Should not support text+image
        self.assertFalse(embedder.supports_modalities(["TEXT", "IMAGE"]))

    def test_supports_modalities_multimodal(self):
        """Test supports_modalities for multimodal embedder."""
        embedder = MultimodalEmbedder()

        # Should support text
        self.assertTrue(embedder.supports_modalities(["TEXT"]))

        # Should support image
        self.assertTrue(embedder.supports_modalities(["IMAGE"]))

        # Should support text+image
        self.assertTrue(embedder.supports_modalities(["TEXT", "IMAGE"]))

    def test_supports_modalities_empty_list(self):
        """Test supports_modalities with empty list returns True."""
        embedder = TextOnlyEmbedder()

        self.assertTrue(embedder.supports_modalities([]))

    def test_supports_modalities_unknown_modality(self):
        """Test supports_modalities with unknown modality returns False."""
        embedder = MultimodalEmbedder()

        # Unknown modality should return False
        self.assertFalse(embedder.supports_modalities(["AUDIO"]))
        self.assertFalse(embedder.supports_modalities(["VIDEO"]))


class TestBaseEmbedderImageMethods(TestCase):
    """Tests for BaseEmbedder image embedding methods."""

    def test_embed_image_text_only_returns_none(self):
        """Test that text-only embedder returns None for image embedding."""
        embedder = TextOnlyEmbedder()

        result = embedder.embed_image("base64data", "jpeg")

        self.assertIsNone(result)

    def test_embed_image_multimodal_works(self):
        """Test that multimodal embedder returns embeddings for images."""
        embedder = MultimodalEmbedder()

        result = embedder.embed_image("base64data", "jpeg")

        self.assertIsNotNone(result)
        self.assertEqual(len(result), 768)
        self.assertEqual(result[0], 0.2)

    def test_embed_image_impl_default_not_supported(self):
        """Test _embed_image_impl default returns None when images not supported."""
        embedder = TextOnlyEmbedder()

        result = embedder._embed_image_impl("base64data", "jpeg")

        self.assertIsNone(result)

    def test_embed_image_impl_raises_when_not_implemented(self):
        """Test _embed_image_impl raises NotImplementedError when not implemented."""
        embedder = PartialMultimodalEmbedder()

        with self.assertRaises(NotImplementedError):
            embedder._embed_image_impl("base64data", "jpeg")


class TestBaseEmbedderJointEmbedding(TestCase):
    """Tests for BaseEmbedder embed_text_and_image method."""

    def test_embed_text_and_image_text_only_returns_none(self):
        """Test that text-only embedder returns None for joint embedding."""
        embedder = TextOnlyEmbedder()

        result = embedder.embed_text_and_image("text", "base64data", "jpeg")

        self.assertIsNone(result)

    def test_embed_text_and_image_multimodal_default_returns_none(self):
        """Test that multimodal embedder default implementation returns None."""
        embedder = MultimodalEmbedder()

        # Default implementation returns None (not implemented)
        result = embedder.embed_text_and_image("text", "base64data", "jpeg")

        self.assertIsNone(result)


class JointMultimodalEmbedder(BaseEmbedder):
    """Embedder that implements joint text-image embedding."""

    title = "Joint Multimodal Embedder"
    vector_size = 768
    supported_modalities = {ContentModality.TEXT, ContentModality.IMAGE}

    def _embed_text_impl(self, text: str, **all_kwargs) -> Optional[list[float]]:
        return [0.1] * self.vector_size

    def _embed_image_impl(
        self, image_base64: str, image_format: str = "jpeg", **all_kwargs
    ) -> Optional[list[float]]:
        return [0.2] * self.vector_size

    def embed_text_and_image(
        self,
        text: str,
        image_base64: str,
        image_format: str = "jpeg",
        **direct_kwargs,
    ) -> Optional[list[float]]:
        """Joint embedding that combines text and image."""
        return [0.15] * self.vector_size  # Simulated joint embedding


class TestJointMultimodalEmbedder(TestCase):
    """Tests for embedder with joint text-image support."""

    def test_embed_text_and_image_implemented(self):
        """Test that joint embedding works when implemented."""
        embedder = JointMultimodalEmbedder()

        result = embedder.embed_text_and_image("text", "base64data", "jpeg")

        self.assertIsNotNone(result)
        self.assertEqual(len(result), 768)
        self.assertEqual(result[0], 0.15)


class TestBaseEmbedderSettingsMerge(TestCase):
    """Tests for settings merge in embed methods."""

    @patch.object(TextOnlyEmbedder, "get_component_settings")
    def test_embed_text_merges_settings(self, mock_get_settings):
        """Test that embed_text merges component settings with direct kwargs."""
        mock_get_settings.return_value = {"setting1": "value1"}

        embedder = TextOnlyEmbedder()
        embedder.embed_text("test text", direct_arg="direct_value")

        mock_get_settings.assert_called_once()

    @patch.object(MultimodalEmbedder, "get_component_settings")
    def test_embed_image_merges_settings(self, mock_get_settings):
        """Test that embed_image merges component settings with direct kwargs."""
        mock_get_settings.return_value = {"setting1": "value1"}

        embedder = MultimodalEmbedder()
        embedder.embed_image("base64data", "jpeg", direct_arg="direct_value")

        mock_get_settings.assert_called_once()

"""Tests for async embedder resolution (aget_embedder / agenerate_embeddings_from_text)."""

import pytest
from django.test import TransactionTestCase

from opencontractserver.utils.embeddings import (
    agenerate_embeddings_from_text,
    aget_embedder,
)


class TestAgetEmbedder(TransactionTestCase):
    """Verify aget_embedder does NOT raise SynchronousOnlyOperation."""

    @pytest.mark.asyncio
    @pytest.mark.django_db(transaction=True)
    async def test_aget_embedder_does_not_raise_sync_error(self):
        """
        aget_embedder should safely perform ORM calls (including the
        PipelineSettings.get_instance() fallback) from an async context
        without raising SynchronousOnlyOperation.
        """
        embedder_class, embedder_path = await aget_embedder(corpus_id=None)
        assert embedder_path is None or isinstance(embedder_path, str)

    @pytest.mark.asyncio
    @pytest.mark.django_db(transaction=True)
    async def test_agenerate_embeddings_does_not_raise_sync_error(self):
        """
        agenerate_embeddings_from_text should safely perform ORM calls
        from an async context.
        """
        result_path, result_vector = await agenerate_embeddings_from_text(
            text="test embedding text",
            corpus_id=None,
        )
        assert result_path is None or isinstance(result_path, str)

"""
Utility functions for hybrid search combining vector similarity and full-text search.

Provides Reciprocal Rank Fusion (RRF) for merging multiple ranked result lists.
See: https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf
"""

import logging
from collections.abc import Hashable
from typing import Any, Callable

from opencontractserver.constants.search import RRF_K

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    *ranked_lists: list,
    k: int = RRF_K,
    top_n: int | None = None,
    id_fn: Callable[[Any], Hashable] = lambda x: x.id,
) -> list[tuple[Any, float]]:
    """
    Merge multiple ranked result lists using Reciprocal Rank Fusion (RRF).

    RRF score for an item = sum(1 / (k + rank_in_list_i)) for each list
    where rank is 1-indexed.

    Args:
        *ranked_lists: Variable number of lists, each pre-sorted by relevance
            (most relevant first).
        k: Smoothing constant. Higher k gives more uniform weighting across
            ranks. Standard value is 60.
        top_n: Maximum number of results to return. None returns all.
        id_fn: Function to extract a unique identifier from each item.
            Defaults to item.id (for Django model instances).

    Returns:
        List of (item, rrf_score) tuples sorted by RRF score descending.
        When the same item appears in multiple lists, the instance from
        the first list that contained it is used.
    """
    scores: dict[Hashable, float] = {}
    items: dict[Hashable, Any] = {}

    for result_list in ranked_lists:
        for rank, item in enumerate(result_list, start=1):
            item_key = id_fn(item)
            if item_key not in items:
                items[item_key] = item
            scores[item_key] = scores.get(item_key, 0.0) + 1.0 / (k + rank)

    sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    if top_n is not None:
        sorted_keys = sorted_keys[:top_n]

    return [(items[key], scores[key]) for key in sorted_keys]

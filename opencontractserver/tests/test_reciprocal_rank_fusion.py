"""Tests for reciprocal_rank_fusion utility function."""

from unittest import TestCase

from opencontractserver.constants.search import RRF_K
from opencontractserver.utils.search import reciprocal_rank_fusion


class _Item:
    """Simple stand-in for a Django model with an .id attribute."""

    def __init__(self, id: int):
        self.id = id

    def __repr__(self) -> str:
        return f"Item({self.id})"


class TestReciprocalRankFusion(TestCase):
    """Pure-Python tests for reciprocal_rank_fusion (no DB needed)."""

    def test_single_list_preserves_order(self):
        items = [_Item(1), _Item(2), _Item(3)]
        result = reciprocal_rank_fusion(items)

        ids = [item.id for item, _ in result]
        self.assertEqual(ids, [1, 2, 3])

    def test_single_list_scores(self):
        items = [_Item(1), _Item(2)]
        result = reciprocal_rank_fusion(items)

        # rank-1 score = 1/(k+1), rank-2 score = 1/(k+2)
        self.assertAlmostEqual(result[0][1], 1.0 / (RRF_K + 1))
        self.assertAlmostEqual(result[1][1], 1.0 / (RRF_K + 2))

    def test_two_lists_fusion(self):
        """Item appearing in both lists should score higher than one in only one."""
        a = _Item(1)
        b = _Item(2)
        c = _Item(3)

        list1 = [a, b]  # a=rank1, b=rank2
        list2 = [b, c]  # b=rank1, c=rank2

        result = reciprocal_rank_fusion(list1, list2)
        scores = {item.id: score for item, score in result}

        # b appears in both lists at ranks 2 and 1
        # b_score = 1/(k+2) + 1/(k+1)
        # a_score = 1/(k+1) only
        self.assertGreater(scores[2], scores[1])
        self.assertGreater(scores[2], scores[3])

    def test_top_n_limits_results(self):
        items = [_Item(i) for i in range(10)]
        result = reciprocal_rank_fusion(items, top_n=3)
        self.assertEqual(len(result), 3)

    def test_top_n_none_returns_all(self):
        items = [_Item(i) for i in range(5)]
        result = reciprocal_rank_fusion(items, top_n=None)
        self.assertEqual(len(result), 5)

    def test_empty_lists(self):
        result = reciprocal_rank_fusion([], [])
        self.assertEqual(result, [])

    def test_no_lists(self):
        result = reciprocal_rank_fusion()
        self.assertEqual(result, [])

    def test_custom_id_fn(self):
        """Test with a custom id extraction function (e.g., dict items)."""
        items1 = [{"name": "alpha"}, {"name": "beta"}]
        items2 = [{"name": "beta"}, {"name": "gamma"}]

        result = reciprocal_rank_fusion(items1, items2, id_fn=lambda x: x["name"])
        names = [item["name"] for item, _ in result]

        # beta appears in both → highest score → first
        self.assertEqual(names[0], "beta")
        self.assertEqual(len(result), 3)

    def test_custom_k(self):
        items = [_Item(1)]
        result = reciprocal_rank_fusion(items, k=0)
        # k=0, rank=1 → score = 1/(0+1) = 1.0
        self.assertAlmostEqual(result[0][1], 1.0)

    def test_top_n_exceeds_total_unique_items(self):
        """When top_n is larger than the number of unique items, all items are returned."""
        items = [_Item(i) for i in range(4)]
        result = reciprocal_rank_fusion(items, top_n=100)
        self.assertEqual(len(result), 4)
        ids = [item.id for item, _ in result]
        self.assertEqual(ids, [0, 1, 2, 3])

    def test_first_occurrence_item_used(self):
        """When same id appears in multiple lists, first instance is kept."""
        a1 = _Item(1)
        a2 = _Item(1)  # Same id, different object

        result = reciprocal_rank_fusion([a1], [a2])
        self.assertIs(result[0][0], a1)

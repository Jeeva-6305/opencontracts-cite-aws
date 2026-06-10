"""Unit tests for opencontractserver.utils.text.truncate."""

from django.test import TestCase

from opencontractserver.constants.truncation import (
    MAX_DESCRIPTION_RESPONSE_PREVIEW_LENGTH,
    MAX_DOC_TITLE_FALLBACK_LENGTH,
    MAX_LINK_TITLE_LENGTH,
    MAX_NOTE_CONTENT_PREVIEW_LENGTH,
    MAX_NOTIFICATION_ERROR_LENGTH,
)
from opencontractserver.utils.text import truncate


class TruncateTests(TestCase):
    """Tests for the centralised ``truncate()`` helper."""

    # ------------------------------------------------------------------
    # Basic behaviour
    # ------------------------------------------------------------------

    def test_none_returns_empty_string(self):
        self.assertEqual(truncate(None, 100), "")

    def test_empty_string_returns_empty_string(self):
        self.assertEqual(truncate("", 100), "")

    def test_short_text_unchanged(self):
        self.assertEqual(truncate("hello", 100), "hello")

    def test_exact_length_unchanged(self):
        text = "a" * 50
        self.assertEqual(truncate(text, 50), text)

    def test_over_limit_truncated(self):
        text = "a" * 60
        result = truncate(text, 50)
        self.assertEqual(len(result), 50)
        self.assertEqual(result, "a" * 50)

    # ------------------------------------------------------------------
    # Suffix behaviour
    # ------------------------------------------------------------------

    def test_suffix_appended_on_truncation(self):
        text = "a" * 200
        result = truncate(text, 100, suffix="...")
        self.assertEqual(len(result), 100)
        self.assertTrue(result.endswith("..."))
        self.assertEqual(result, "a" * 97 + "...")

    def test_suffix_not_appended_when_within_limit(self):
        text = "short"
        result = truncate(text, 100, suffix="...")
        self.assertEqual(result, "short")

    def test_suffix_at_exact_limit(self):
        text = "a" * 100
        result = truncate(text, 100, suffix="...")
        self.assertEqual(result, text)

    # ------------------------------------------------------------------
    # Suffix edge cases
    # ------------------------------------------------------------------

    def test_suffix_longer_than_max_length(self):
        result = truncate("hello world", 2, suffix="...")
        self.assertLessEqual(len(result), 2)

    def test_suffix_equal_to_max_length(self):
        result = truncate("hello world", 3, suffix="...")
        self.assertEqual(result, "...")
        self.assertEqual(len(result), 3)

    def test_max_length_zero(self):
        self.assertEqual(truncate("hello", 0), "")

    # ------------------------------------------------------------------
    # Constants are sane
    # ------------------------------------------------------------------

    def test_constants_are_positive(self):
        for const in (
            MAX_NOTE_CONTENT_PREVIEW_LENGTH,
            MAX_DESCRIPTION_RESPONSE_PREVIEW_LENGTH,
            MAX_LINK_TITLE_LENGTH,
            MAX_DOC_TITLE_FALLBACK_LENGTH,
            MAX_NOTIFICATION_ERROR_LENGTH,
        ):
            self.assertGreater(const, 0)

    def test_link_title_length_exceeds_ellipsis(self):
        self.assertGreater(MAX_LINK_TITLE_LENGTH, len("..."))

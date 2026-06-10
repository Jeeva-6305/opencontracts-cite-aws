"""Tests for the unified rate limiting system (config.ratelimit).

Covers the core engine, identity resolution, rate definitions,
and protocol-specific adapters (WebSocket, MCP, Django views).
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import TestCase, override_settings

from config.ratelimit.decorators import (
    MCP_TOOL_RATE_MAP,
    RateLimitExceeded,
    _graphql_rate_limit_check,
    check_mcp_rate_limit,
    check_ws_rate_limit,
    graphql_ratelimit,
    graphql_ratelimit_dynamic,
    view_ratelimit,
)
from config.ratelimit.engine import UNKNOWN_IP, is_rate_limited, parse_rate
from config.ratelimit.keys import (
    _mask_ipv6,
    _pick_xff_ip,
    get_client_ip_from_http,
    get_client_ip_from_scope,
    get_rate_limit_key,
)
from config.ratelimit.rates import (
    RateLimits,
    _RateLimits,
    get_tier_adjusted_rate,
    get_user_tier_rate,
)

User = get_user_model()


# =============================================================================
#  Engine tests
# =============================================================================


class ParseRateTestCase(TestCase):
    """Test rate string parsing."""

    def test_parse_seconds(self):
        self.assertEqual(parse_rate("5/s"), (5, 1))

    def test_parse_minutes(self):
        self.assertEqual(parse_rate("100/m"), (100, 60))

    def test_parse_hours(self):
        self.assertEqual(parse_rate("10/h"), (10, 3600))

    def test_parse_days(self):
        self.assertEqual(parse_rate("1/d"), (1, 86400))

    def test_invalid_rate_raises(self):
        with self.assertRaises(ValueError):
            parse_rate("invalid")

    def test_invalid_period_raises(self):
        with self.assertRaises(ValueError):
            parse_rate("10/x")

    def test_zero_count_raises(self):
        with self.assertRaises(ValueError):
            parse_rate("0/m")

    def test_negative_count_raises(self):
        with self.assertRaises(ValueError):
            parse_rate("-1/m")


@override_settings(RATELIMIT_DISABLE=False)
class IsRateLimitedTestCase(TestCase):
    """Test the core rate limiting engine."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_allows_requests_under_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            self.assertFalse(is_rate_limited("test", "key1", "5/m"))

    @patch("config.ratelimit.engine.time")
    def test_blocks_requests_over_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            is_rate_limited("test", "key1", "5/m")
        self.assertTrue(is_rate_limited("test", "key1", "5/m"))

    @patch("config.ratelimit.engine.time")
    def test_different_keys_independent(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            is_rate_limited("test", "key_a", "5/m")
        # key_a is exhausted
        self.assertTrue(is_rate_limited("test", "key_a", "5/m"))
        # key_b is fresh
        self.assertFalse(is_rate_limited("test", "key_b", "5/m"))

    @patch("config.ratelimit.engine.time")
    def test_different_groups_independent(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            is_rate_limited("group_a", "key", "5/m")
        self.assertTrue(is_rate_limited("group_a", "key", "5/m"))
        self.assertFalse(is_rate_limited("group_b", "key", "5/m"))

    @patch("config.ratelimit.engine.time")
    def test_window_rollover_resets_counter(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            is_rate_limited("test", "key", "5/m")
        self.assertTrue(is_rate_limited("test", "key", "5/m"))

        # Advance to next window (60s later)
        mock_time.time.return_value = 1000060.0
        self.assertFalse(is_rate_limited("test", "key", "5/m"))

    @patch("config.ratelimit.engine.time")
    def test_no_increment_flag(self, mock_time):
        mock_time.time.return_value = 1000000.0
        for _ in range(5):
            is_rate_limited("test", "key", "5/m")
        # Check without incrementing — should report limited
        self.assertTrue(is_rate_limited("test", "key", "5/m", increment=False))

    @override_settings(RATELIMIT_DISABLE=True)
    def test_disabled_always_allows(self):
        for _ in range(100):
            self.assertFalse(is_rate_limited("test", "key", "1/m"))


# =============================================================================
#  Key resolution tests
# =============================================================================


class MaskIpv6TestCase(TestCase):
    """Test IPv6 subnet masking for rate limiting."""

    @override_settings(RATELIMIT_IPV6_MASK=64)
    def test_ipv6_masked_to_64(self):
        """Two addresses in the same /64 should map to the same key."""
        addr_a = "2001:db8:abcd:0012:1:2:3:4"
        addr_b = "2001:db8:abcd:0012:ffff:ffff:ffff:ffff"
        self.assertEqual(_mask_ipv6(addr_a), _mask_ipv6(addr_b))

    @override_settings(RATELIMIT_IPV6_MASK=64)
    def test_ipv6_different_subnets(self):
        """Addresses in different /64 subnets should produce different keys."""
        addr_a = "2001:db8:abcd:0012::1"
        addr_b = "2001:db8:abcd:0013::1"
        self.assertNotEqual(_mask_ipv6(addr_a), _mask_ipv6(addr_b))

    def test_ipv4_unchanged(self):
        """IPv4 addresses should pass through unmodified."""
        self.assertEqual(_mask_ipv6("192.168.1.1"), "192.168.1.1")

    def test_invalid_address_unchanged(self):
        """Non-IP strings should pass through unmodified."""
        self.assertEqual(_mask_ipv6("not-an-ip"), "not-an-ip")


class GetClientIpFromHttpTestCase(TestCase):
    """Test IP extraction from Django HttpRequest."""

    def test_forwarded_for(self):
        # Default RATELIMIT_PROXIES_COUNT=1 uses the rightmost (proxy-appended) entry
        request = MagicMock()
        request.META = {"HTTP_X_FORWARDED_FOR": "1.2.3.4, 5.6.7.8"}
        self.assertEqual(get_client_ip_from_http(request), "5.6.7.8")

    def test_remote_addr(self):
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "9.8.7.6"}
        self.assertEqual(get_client_ip_from_http(request), "9.8.7.6")

    def test_unknown_fallback(self):
        request = MagicMock()
        request.META = {}
        self.assertEqual(get_client_ip_from_http(request), "unknown")


class GetClientIpFromScopeTestCase(TestCase):
    """Test IP extraction from ASGI scope."""

    def test_forwarded_for(self):
        # Default RATELIMIT_PROXIES_COUNT=1 uses the rightmost (proxy-appended) entry
        scope = {"headers": [(b"x-forwarded-for", b"1.2.3.4, 5.6.7.8")]}
        self.assertEqual(get_client_ip_from_scope(scope), "5.6.7.8")

    def test_real_ip(self):
        scope = {"headers": [(b"x-real-ip", b"10.0.0.1")]}
        self.assertEqual(get_client_ip_from_scope(scope), "10.0.0.1")

    def test_client_tuple(self):
        scope = {"headers": [], "client": ("192.168.1.1", 12345)}
        self.assertEqual(get_client_ip_from_scope(scope), "192.168.1.1")

    def test_unknown_fallback(self):
        scope = {}
        self.assertEqual(get_client_ip_from_scope(scope), "unknown")


class GetRateLimitKeyTestCase(TestCase):
    """Test rate limit key building."""

    def test_authenticated_user_or_ip(self):
        user = MagicMock()
        user.is_authenticated = True
        user.id = 42
        self.assertEqual(
            get_rate_limit_key(user=user, ip="1.2.3.4"),
            "user:42",
        )

    def test_anonymous_user_or_ip(self):
        user = AnonymousUser()
        self.assertEqual(
            get_rate_limit_key(user=user, ip="1.2.3.4"),
            "ip:1.2.3.4",
        )

    def test_ip_strategy(self):
        user = MagicMock()
        user.is_authenticated = True
        user.id = 42
        self.assertEqual(
            get_rate_limit_key(user=user, ip="1.2.3.4", strategy="ip"),
            "ip:1.2.3.4",
        )

    def test_user_strategy_with_user(self):
        user = MagicMock()
        user.is_authenticated = True
        user.id = 99
        self.assertEqual(
            get_rate_limit_key(user=user, strategy="user"),
            "user:99",
        )

    def test_user_strategy_no_user_raises(self):
        with self.assertRaises(ValueError):
            get_rate_limit_key(user=AnonymousUser(), strategy="user")

    def test_none_user_falls_to_ip(self):
        self.assertEqual(
            get_rate_limit_key(user=None, ip="5.5.5.5"),
            "ip:5.5.5.5",
        )


# =============================================================================
#  Rate category and tier tests
# =============================================================================


class RateLimitsTestCase(TestCase):
    """Test the RateLimits singleton."""

    def test_default_values(self):
        """Verify all default rate limit values are correctly set."""
        self.assertEqual(RateLimits.AUTH_LOGIN, "5/m")
        self.assertEqual(RateLimits.AUTH_REGISTER, "3/m")
        self.assertEqual(RateLimits.AUTH_PASSWORD_RESET, "3/h")
        self.assertEqual(RateLimits.READ_LIGHT, "100/m")
        self.assertEqual(RateLimits.READ_MEDIUM, "30/m")
        self.assertEqual(RateLimits.READ_HEAVY, "10/m")
        self.assertEqual(RateLimits.WRITE_LIGHT, "30/m")
        self.assertEqual(RateLimits.WRITE_MEDIUM, "10/m")
        self.assertEqual(RateLimits.WRITE_HEAVY, "5/m")
        self.assertEqual(RateLimits.AI_ANALYSIS, "5/m")
        self.assertEqual(RateLimits.AI_EXTRACT, "10/m")
        self.assertEqual(RateLimits.AI_QUERY, "20/m")
        self.assertEqual(RateLimits.EXPORT, "5/h")
        self.assertEqual(RateLimits.IMPORT, "10/h")
        self.assertEqual(RateLimits.ADMIN_OPERATION, "100/m")
        self.assertEqual(RateLimits.ADMIN_LOGIN_PAGE, "20/m")
        self.assertEqual(RateLimits.MCP_GLOBAL, "100/m")

    def test_ws_connect_category(self):
        self.assertEqual(RateLimits.WS_CONNECT, "10/m")

    def test_ws_heartbeat_category(self):
        self.assertEqual(RateLimits.WS_HEARTBEAT, "120/m")

    def test_mcp_global_category(self):
        self.assertEqual(RateLimits.MCP_GLOBAL, "100/m")

    def test_unknown_attribute_raises(self):
        with self.assertRaises(AttributeError):
            _ = RateLimits.NONEXISTENT_CATEGORY


class GetTierAdjustedRateTestCase(TestCase):
    """Test tier-based rate adjustment."""

    def test_superuser_10x(self):
        user = MagicMock()
        user.is_superuser = True
        user.is_authenticated = True
        user.is_usage_capped = False
        self.assertEqual(get_tier_adjusted_rate(user, "10/m"), "100/m")

    def test_authenticated_2x(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_authenticated = True
        user.is_usage_capped = False
        self.assertEqual(get_tier_adjusted_rate(user, "10/m"), "20/m")

    def test_anonymous_1x(self):
        user = AnonymousUser()
        self.assertEqual(get_tier_adjusted_rate(user, "10/m"), "10/m")

    def test_usage_capped_half(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_authenticated = True
        user.is_usage_capped = True
        self.assertEqual(get_tier_adjusted_rate(user, "10/m"), "10/m")  # 20 * 0.5

    def test_none_user_1x(self):
        self.assertEqual(get_tier_adjusted_rate(None, "10/m"), "10/m")

    def test_capped_superuser_5x(self):
        """A usage-capped superuser gets 10x * 0.5x = 5x base rate."""
        user = MagicMock()
        user.is_superuser = True
        user.is_authenticated = True
        user.is_usage_capped = True
        # 10/m * 10x = 100, * 0.5x = 50
        self.assertEqual(get_tier_adjusted_rate(user, "10/m"), "50/m")


# =============================================================================
#  GraphQL decorator tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class GraphQLRateLimitDecoratorTestCase(TestCase):
    """Test the graphql_ratelimit decorator."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_blocks_after_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0

        @graphql_ratelimit(rate="3/m")
        def my_resolver(root, info, **kwargs):
            return "ok"

        user = MagicMock()
        user.is_authenticated = True
        user.id = 1
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        request.user = user
        info = MagicMock()
        info.context = request

        for _ in range(3):
            self.assertEqual(my_resolver(None, info), "ok")

        with self.assertRaises(RateLimitExceeded):
            my_resolver(None, info)

    def test_skips_when_no_context(self):
        @graphql_ratelimit(rate="1/m")
        def my_resolver(root, info, **kwargs):
            return "ok"

        self.assertEqual(my_resolver(None, None), "ok")


# =============================================================================
#  WebSocket adapter tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class CheckWsRateLimitTestCase(TestCase):
    """Test the WebSocket rate limiting adapter."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def _make_consumer(self, user=None, ip="127.0.0.1"):
        consumer = MagicMock()
        consumer.scope = {
            "headers": [],
            "client": (ip, 12345),
            "user": user or AnonymousUser(),
        }
        consumer.send = AsyncMock()
        return consumer

    @patch("config.ratelimit.engine.time")
    def test_allows_under_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0
        consumer = self._make_consumer()
        result = asyncio.run(check_ws_rate_limit(consumer, "WS_CONNECT"))
        self.assertFalse(result)
        consumer.send.assert_not_called()

    @patch("config.ratelimit.engine.time")
    def test_blocks_over_limit_and_sends_message(self, mock_time):
        mock_time.time.return_value = 1000000.0
        consumer = self._make_consumer()

        # Exhaust the limit (WS_CONNECT = 10/m, anonymous = 1x)
        for _ in range(10):
            asyncio.run(check_ws_rate_limit(consumer, "WS_CONNECT"))

        # Next request should be limited
        result = asyncio.run(check_ws_rate_limit(consumer, "WS_CONNECT"))
        self.assertTrue(result)

        # Should have sent a RATE_LIMITED message
        consumer.send.assert_called()
        sent_data = json.loads(consumer.send.call_args[1]["text_data"])
        self.assertEqual(sent_data["type"], "RATE_LIMITED")
        self.assertIn("retry_after", sent_data)

    @patch("config.ratelimit.engine.time")
    def test_per_user_scoping(self, mock_time):
        mock_time.time.return_value = 1000000.0

        user1 = MagicMock()
        user1.is_authenticated = True
        user1.id = 1
        user1.is_superuser = False
        user1.is_usage_capped = False

        user2 = MagicMock()
        user2.is_authenticated = True
        user2.id = 2
        user2.is_superuser = False
        user2.is_usage_capped = False

        consumer1 = self._make_consumer(user=user1)
        consumer2 = self._make_consumer(user=user2)

        # Exhaust user1's limit (WS_CONNECT = 10/m, auth = 2x = 20/m)
        for _ in range(20):
            asyncio.run(check_ws_rate_limit(consumer1, "WS_CONNECT"))
        # user1 is now limited
        result1 = asyncio.run(check_ws_rate_limit(consumer1, "WS_CONNECT"))
        self.assertTrue(result1)

        # user2 should still be fine
        result2 = asyncio.run(check_ws_rate_limit(consumer2, "WS_CONNECT"))
        self.assertFalse(result2)


# =============================================================================
#  MCP adapter tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class CheckMcpRateLimitTestCase(TestCase):
    """Test the MCP rate limiting adapter."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def _make_scope(self, ip="10.0.0.1"):
        return {"headers": [], "client": (ip, 8080)}

    @patch("config.ratelimit.engine.time")
    def test_global_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0
        scope = self._make_scope()

        # Exhaust global limit (MCP_GLOBAL = 100/m)
        for _ in range(100):
            result = asyncio.run(check_mcp_rate_limit(scope))
            self.assertFalse(result[0])

        # Next should be limited
        is_limited, error_msg, retry_after = asyncio.run(check_mcp_rate_limit(scope))
        self.assertTrue(is_limited)
        self.assertIn("Rate limit exceeded", error_msg)
        self.assertGreater(retry_after, 0)

    @patch("config.ratelimit.engine.time")
    def test_per_tool_limit(self, mock_time):
        """Model production two-layer design: ASGI app increments global,
        tool handlers increment per-tool with skip_global=True.

        This avoids double-counting the global counter.
        """
        mock_time.time.return_value = 1000000.0
        scope = self._make_scope()

        # search_corpus maps to READ_HEAVY (10/m).
        # In production, tool handlers use skip_global=True because the
        # ASGI app already performed the global check.
        for _ in range(10):
            asyncio.run(
                check_mcp_rate_limit(scope, tool_name="search_corpus", skip_global=True)
            )

        # Next search_corpus should be per-tool limited
        is_limited, error_msg, retry_after = asyncio.run(
            check_mcp_rate_limit(scope, tool_name="search_corpus", skip_global=True)
        )
        self.assertTrue(is_limited)
        self.assertIn("search_corpus", error_msg)
        self.assertGreater(retry_after, 0)

    @patch("config.ratelimit.engine.time")
    def test_different_ips_independent(self, mock_time):
        mock_time.time.return_value = 1000000.0
        scope1 = self._make_scope(ip="10.0.0.1")
        scope2 = self._make_scope(ip="10.0.0.2")

        # Exhaust ip1
        for _ in range(100):
            asyncio.run(check_mcp_rate_limit(scope1))
        is_limited1, _, _ = asyncio.run(check_mcp_rate_limit(scope1))
        self.assertTrue(is_limited1)

        # ip2 should be fine
        is_limited2, _, _ = asyncio.run(check_mcp_rate_limit(scope2))
        self.assertFalse(is_limited2)

    def test_tool_rate_map_covers_all_tools(self):
        """Verify all standard MCP tools are in the rate map."""
        expected_tools = {
            "list_public_corpuses",
            "list_documents",
            "get_document_text",
            "list_annotations",
            "search_corpus",
            "list_threads",
            "get_thread_messages",
            "get_corpus_info",
        }
        self.assertEqual(set(MCP_TOOL_RATE_MAP.keys()), expected_tools)

    def test_mcp_tool_rate_map_keys_subset_of_handlers(self):
        """Every key in MCP_TOOL_RATE_MAP must exist in either the global
        TOOL_HANDLERS or the scoped tool handlers returned by
        get_scoped_tool_handlers.  This prevents silent drift where a rate
        map entry references a tool that no longer exists."""
        from opencontractserver.mcp.server import TOOL_HANDLERS
        from opencontractserver.mcp.tools import get_scoped_tool_handlers

        # Scoped handlers require a corpus_slug, but the returned *keys*
        # are the same regardless of the slug value.
        scoped_keys = set(get_scoped_tool_handlers("dummy-slug").keys())
        all_handler_keys = set(TOOL_HANDLERS.keys()) | scoped_keys

        for tool_name in MCP_TOOL_RATE_MAP:
            self.assertIn(
                tool_name,
                all_handler_keys,
                f"MCP_TOOL_RATE_MAP key {tool_name!r} not found in "
                f"TOOL_HANDLERS or scoped tool handlers",
            )


# =============================================================================
#  Django view decorator tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class ViewRateLimitTestCase(TestCase):
    """Test the view_ratelimit decorator."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_sets_limited_attribute(self, mock_time):
        mock_time.time.return_value = 1000000.0

        @view_ratelimit(rate="2/m", block=False)
        def my_view(request):
            return request.limited

        request = MagicMock()
        request.META = {"REMOTE_ADDR": "1.1.1.1"}

        # First two should be fine
        self.assertFalse(my_view(request))
        self.assertFalse(my_view(request))

        # Third should be limited
        self.assertTrue(my_view(request))

    @patch("config.ratelimit.engine.time")
    def test_block_mode_returns_429(self, mock_time):
        mock_time.time.return_value = 1000000.0

        @view_ratelimit(rate="1/m", block=True)
        def my_view(request):
            return "ok"

        request = MagicMock()
        request.META = {"REMOTE_ADDR": "2.2.2.2"}

        self.assertEqual(my_view(request), "ok")
        response = my_view(request)
        self.assertEqual(response.status_code, 429)

    @patch("config.ratelimit.engine.time")
    def test_custom_key_function(self, mock_time):
        mock_time.time.return_value = 1000000.0

        def ip_key(group, request):
            return request.META.get("REMOTE_ADDR", "unknown")

        @view_ratelimit(key=ip_key, rate="2/m", block=False)
        def my_view(request):
            return request.limited

        request = MagicMock()
        request.META = {"REMOTE_ADDR": "3.3.3.3"}

        self.assertFalse(my_view(request))
        self.assertFalse(my_view(request))
        self.assertTrue(my_view(request))


# =============================================================================
#  RATE_LIMIT_OVERRIDES tests
# =============================================================================


class RateLimitOverridesTestCase(TestCase):
    """Test that RATE_LIMIT_OVERRIDES actually override default values."""

    def test_overrides_applied_at_init(self):
        overridden = _RateLimits.__new__(_RateLimits)
        with override_settings(RATE_LIMIT_OVERRIDES={"AUTH_LOGIN": "99/h"}):
            overridden.__init__()
        self.assertEqual(overridden.AUTH_LOGIN, "99/h")

    def test_defaults_when_no_overrides(self):
        default_instance = _RateLimits.__new__(_RateLimits)
        with override_settings(RATE_LIMIT_OVERRIDES={}):
            default_instance.__init__()
        self.assertEqual(default_instance.AUTH_LOGIN, "5/m")


# =============================================================================
#  RATELIMIT_FAIL_OPEN tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class FailOpenTestCase(TestCase):
    """Test RATELIMIT_FAIL_OPEN behaviour when cache is unavailable."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @override_settings(RATELIMIT_FAIL_OPEN=True)
    @patch("config.ratelimit.engine.time")
    @patch("config.ratelimit.engine._get_cache")
    def test_fail_open_allows_on_cache_error(self, mock_get_cache, mock_time):
        mock_time.time.return_value = 1000000.0
        mock_cache = MagicMock()
        mock_cache.add.side_effect = Exception("Redis down")
        mock_cache.incr.side_effect = Exception("Redis down")
        mock_get_cache.return_value = mock_cache
        # fail_open=True → should NOT be rate limited
        self.assertFalse(is_rate_limited("test", "key", "1/m"))

    @override_settings(RATELIMIT_FAIL_OPEN=False)
    @patch("config.ratelimit.engine.time")
    @patch("config.ratelimit.engine._get_cache")
    def test_fail_closed_blocks_on_cache_error(self, mock_get_cache, mock_time):
        mock_time.time.return_value = 1000000.0
        mock_cache = MagicMock()
        mock_cache.add.side_effect = Exception("Redis down")
        mock_cache.incr.side_effect = Exception("Redis down")
        mock_get_cache.return_value = mock_cache
        # fail_open=False → should be rate limited
        self.assertTrue(is_rate_limited("test", "key", "1/m"))


# =============================================================================
#  graphql_ratelimit_dynamic tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class GraphQLRateLimitDynamicTestCase(TestCase):
    """Test graphql_ratelimit_dynamic decorator."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_dynamic_blocks_after_limit(self, mock_time):
        mock_time.time.return_value = 1000000.0

        def fixed_rate(root, info):
            return "2/m"

        @graphql_ratelimit_dynamic(get_rate=fixed_rate)
        def my_resolver(root, info, **kwargs):
            return "ok"

        user = MagicMock()
        user.is_authenticated = True
        user.id = 10
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        request.user = user
        info = MagicMock()
        info.context = request

        # Two calls within limit
        self.assertEqual(my_resolver(None, info), "ok")
        self.assertEqual(my_resolver(None, info), "ok")

        # Third should raise
        with self.assertRaises(RateLimitExceeded):
            my_resolver(None, info)

    @patch("config.ratelimit.engine.time")
    def test_dynamic_uses_tier_rate(self, mock_time):
        mock_time.time.return_value = 1000000.0

        rate_fn = get_user_tier_rate("READ_LIGHT")

        @graphql_ratelimit_dynamic(get_rate=rate_fn)
        def my_resolver(root, info, **kwargs):
            return "ok"

        # Superuser gets 10x of READ_LIGHT (100/m) = 1000/m
        superuser = MagicMock()
        superuser.is_authenticated = True
        superuser.is_superuser = True
        superuser.is_usage_capped = False
        superuser.id = 50
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        request.user = superuser
        info = MagicMock()
        info.context = request

        # Should handle many requests without hitting limit
        for _ in range(500):
            self.assertEqual(my_resolver(None, info), "ok")


# =============================================================================
#  RATELIMIT_DISABLE at adapter level tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=True)
class DisableSkipsAdaptersTestCase(TestCase):
    """Test that RATELIMIT_DISABLE=True skips rate limiting in adapters."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_graphql_decorator_skips(self):
        @graphql_ratelimit(rate="1/m")
        def my_resolver(root, info, **kwargs):
            return "ok"

        user = MagicMock()
        user.is_authenticated = True
        user.id = 1
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        request.user = user
        info = MagicMock()
        info.context = request

        # Should never block even after many calls
        for _ in range(100):
            self.assertEqual(my_resolver(None, info), "ok")

    def test_view_decorator_skips(self):
        @view_ratelimit(rate="1/m", block=True)
        def my_view(request):
            return request.limited

        request = MagicMock()
        request.META = {"REMOTE_ADDR": "1.1.1.1"}

        for _ in range(100):
            self.assertFalse(my_view(request))


# =============================================================================
#  XFF proxy count tests
# =============================================================================


class PickXffIpTestCase(TestCase):
    """Test _pick_xff_ip with RATELIMIT_PROXIES_COUNT."""

    @override_settings(RATELIMIT_PROXIES_COUNT=0)
    def test_zero_proxies_raises_valueerror(self):
        """proxies_count=0 means no proxy — XFF should not be consulted."""
        with self.assertRaises(ValueError):
            _pick_xff_ip("1.1.1.1, 2.2.2.2, 3.3.3.3")

    @override_settings(RATELIMIT_PROXIES_COUNT=1)
    def test_single_proxy_uses_rightmost(self):
        self.assertEqual(_pick_xff_ip("1.1.1.1, 2.2.2.2, 3.3.3.3"), "3.3.3.3")

    @override_settings(RATELIMIT_PROXIES_COUNT=2)
    def test_two_proxies_uses_second_from_right(self):
        self.assertEqual(_pick_xff_ip("1.1.1.1, 2.2.2.2, 3.3.3.3"), "2.2.2.2")

    @override_settings(RATELIMIT_PROXIES_COUNT=10)
    def test_proxies_count_exceeds_entries_uses_leftmost(self):
        self.assertEqual(_pick_xff_ip("1.1.1.1, 2.2.2.2"), "1.1.1.1")

    @override_settings(RATELIMIT_PROXIES_COUNT=0)
    def test_zero_proxies_empty_xff_raises_valueerror(self):
        """Even with empty XFF, proxies_count=0 should raise."""
        with self.assertRaises(ValueError):
            _pick_xff_ip("")

    @override_settings(RATELIMIT_PROXIES_COUNT=1)
    def test_empty_xff_returns_unknown(self):
        self.assertEqual(_pick_xff_ip(""), UNKNOWN_IP)

    @override_settings(RATELIMIT_PROXIES_COUNT=1)
    def test_xff_with_http_request(self):
        request = MagicMock()
        request.META = {"HTTP_X_FORWARDED_FOR": "client, proxy1, proxy2"}
        # With PROXIES_COUNT=1, should get rightmost (proxy2 = nearest proxy)
        self.assertEqual(get_client_ip_from_http(request), "proxy2")

    @override_settings(RATELIMIT_PROXIES_COUNT=1)
    def test_xff_with_asgi_scope(self):
        scope = {"headers": [(b"x-forwarded-for", b"client, proxy")]}
        # With PROXIES_COUNT=1, should get rightmost (proxy)
        self.assertEqual(get_client_ip_from_scope(scope), "proxy")

    @override_settings(RATELIMIT_PROXIES_COUNT=0)
    def test_zero_proxies_ignores_x_real_ip_in_scope(self):
        """When proxies_count=0 (direct connections), X-Real-IP must be
        ignored because it is entirely client-controlled."""
        scope = {
            "headers": [(b"x-real-ip", b"spoofed.ip")],
            "client": ("192.168.1.1", 12345),
        }
        # Should use the direct client IP, NOT the spoofed X-Real-IP
        self.assertEqual(get_client_ip_from_scope(scope), "192.168.1.1")

    @override_settings(RATELIMIT_PROXIES_COUNT=0)
    def test_zero_proxies_ignores_xff_in_scope(self):
        """When proxies_count=0, X-Forwarded-For must also be ignored."""
        scope = {
            "headers": [(b"x-forwarded-for", b"spoofed.ip")],
            "client": ("192.168.1.1", 12345),
        }
        self.assertEqual(get_client_ip_from_scope(scope), "192.168.1.1")

    @override_settings(RATELIMIT_PROXIES_COUNT=0)
    def test_zero_proxies_ignores_xff_in_http(self):
        """When proxies_count=0, HTTP X-Forwarded-For must be ignored."""
        request = MagicMock()
        request.META = {
            "HTTP_X_FORWARDED_FOR": "spoofed.ip",
            "REMOTE_ADDR": "192.168.1.1",
        }
        self.assertEqual(get_client_ip_from_http(request), "192.168.1.1")


# =============================================================================
#  GraphQL callable key test
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class GraphQLCallableKeyTestCase(TestCase):
    """Test custom callable key in GraphQL decorator."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_callable_key(self, mock_time):
        mock_time.time.return_value = 1000000.0

        def custom_key(root, info, **kwargs):
            return f"custom:{kwargs.get('id', 'none')}"

        @graphql_ratelimit(key=custom_key, rate="2/m")
        def my_resolver(root, info, **kwargs):
            return "ok"

        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        request.user = MagicMock(is_authenticated=True, id=1)
        info = MagicMock()
        info.context = request

        # Same custom key "custom:42" — should block after 2
        self.assertEqual(my_resolver(None, info, id=42), "ok")
        self.assertEqual(my_resolver(None, info, id=42), "ok")
        with self.assertRaises(RateLimitExceeded):
            my_resolver(None, info, id=42)

        # Different key "custom:99" — should still be fresh
        self.assertEqual(my_resolver(None, info, id=99), "ok")


# =============================================================================
#  _graphql_rate_limit_check unit tests
# =============================================================================


class GraphQLRateLimitCheckUnitTestCase(TestCase):
    """Directly test _graphql_rate_limit_check for edge cases."""

    def test_returns_none_when_info_is_none(self):
        result = _graphql_rate_limit_check(
            "test_func", None, None, "10/m", None, True, None
        )
        self.assertIsNone(result)

    def test_returns_none_when_context_has_no_meta(self):
        info = MagicMock()
        info.context = "not_a_request"
        result = _graphql_rate_limit_check(
            "test_func", None, info, "10/m", None, True, None
        )
        self.assertIsNone(result)


# =============================================================================
#  MCP server rate limiting integration tests
# =============================================================================


@override_settings(RATELIMIT_DISABLE=False)
class McpServerRateLimitIntegrationTestCase(TestCase):
    """Test rate limiting integration in MCP server tool handlers."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("config.ratelimit.engine.time")
    def test_call_tool_handler_rate_limited(self, mock_time):
        """Test that call_tool_handler raises MCPRateLimitError when per-tool limit exceeded.

        Note: call_tool_handler uses skip_global=True because the ASGI app
        already performs the global check before dispatching.  So we exhaust
        the per-tool limit (search_corpus → READ_HEAVY = 10/m) instead.
        """
        from config.ratelimit.decorators import MCPRateLimitError
        from opencontractserver.mcp.server import _mcp_asgi_scope, call_tool_handler

        mock_time.time.return_value = 1000000.0
        scope = {"headers": [], "client": ("10.0.0.99", 8080)}

        # Set the ASGI scope ContextVar
        token = _mcp_asgi_scope.set(scope)
        try:
            # Exhaust per-tool limit for search_corpus (READ_HEAVY = 10/m)
            for _ in range(10):
                asyncio.run(check_mcp_rate_limit(scope, tool_name="search_corpus"))

            # Next tool call should be rate limited (per-tool)
            with self.assertRaises(MCPRateLimitError) as ctx:
                asyncio.run(
                    call_tool_handler(
                        "search_corpus", {"corpus_slug": "x", "query": "test"}
                    )
                )
            self.assertIn("Rate limit", str(ctx.exception))
        finally:
            _mcp_asgi_scope.reset(token)

    def test_call_tool_handler_no_scope_skips_rate_limiting(self):
        """Test that call_tool_handler skips rate limiting when no ASGI scope."""
        from config.ratelimit.decorators import MCPRateLimitError
        from opencontractserver.mcp.server import _mcp_asgi_scope, call_tool_handler

        # Ensure ContextVar is None (no ASGI scope available)
        token = _mcp_asgi_scope.set(None)
        try:
            # Should not raise rate limit errors — but may raise
            # other errors from the tool itself (e.g. DB access).
            # We just verify it doesn't raise MCPRateLimitError.
            try:
                asyncio.run(call_tool_handler("list_public_corpuses", {}))
            except MCPRateLimitError:
                self.fail("MCPRateLimitError raised when no ASGI scope is set")
            except Exception:
                # Other exceptions (DB, etc.) are fine — we only care
                # that rate limiting was skipped.
                pass
        finally:
            _mcp_asgi_scope.reset(token)


# =============================================================================
#  ADMIN_LOGIN_PAGE default test
# =============================================================================


class AdminLoginPageDefaultTestCase(TestCase):
    """Test that ADMIN_LOGIN_PAGE is in _RateLimits._defaults."""

    def test_admin_login_page_in_defaults(self):
        self.assertIn("ADMIN_LOGIN_PAGE", _RateLimits._defaults)
        self.assertEqual(_RateLimits._defaults["ADMIN_LOGIN_PAGE"], "20/m")

    def test_admin_login_page_accessible_on_singleton(self):
        self.assertEqual(RateLimits.ADMIN_LOGIN_PAGE, "20/m")

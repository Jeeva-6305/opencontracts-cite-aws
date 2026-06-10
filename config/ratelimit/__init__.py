"""
Unified rate limiting package for OpenContracts.

Provides a single rate limiting engine used by GraphQL, WebSocket, MCP,
and Django view endpoints. All protocols share the same rate categories,
tier multipliers, identity resolution, and cache-based engine.

Usage:
    from config.ratelimit import is_rate_limited, RateLimits
    from config.ratelimit.decorators import graphql_ratelimit, check_ws_rate_limit
"""

from config.ratelimit.engine import (
    UNKNOWN_IP,
    ais_rate_limited,
    is_rate_limited,
    parse_rate,
)
from config.ratelimit.keys import (
    get_client_ip_from_http,
    get_client_ip_from_scope,
    get_rate_limit_key,
)
from config.ratelimit.rates import (
    RateLimits,
    get_tier_adjusted_rate,
    get_user_tier_rate,
)

__all__ = [
    "UNKNOWN_IP",
    "ais_rate_limited",
    "get_client_ip_from_http",
    "get_client_ip_from_scope",
    "get_rate_limit_key",
    "get_tier_adjusted_rate",
    "get_user_tier_rate",
    "is_rate_limited",
    "parse_rate",
    "RateLimits",
]

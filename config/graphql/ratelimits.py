"""
GraphQL rate limiting — backward-compatible re-export layer.

All core logic lives in :mod:`config.ratelimit`.  This module re-exports
the public API so that existing imports across 21+ mutation/query files
continue to work without modification.
"""

from config.ratelimit.decorators import (  # noqa: F401
    RateLimitExceeded,
    graphql_ratelimit,
    graphql_ratelimit_dynamic,
)
from config.ratelimit.keys import get_client_ip_from_http as get_client_ip  # noqa: F401
from config.ratelimit.rates import RateLimits, get_user_tier_rate  # noqa: F401

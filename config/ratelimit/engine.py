"""
Protocol-agnostic rate limiting engine.

Uses a fixed-window counter stored in Django's cache backend (Redis in
production). Replaces both django-ratelimit's ``is_ratelimited()`` and the
MCP-specific ``RateLimiter`` class with a single implementation that works
in sync and async contexts without requiring a Django ``HttpRequest``.

Cache key format: ``{prefix}:{group}:{key}:{window}``
where ``window = int(time.time()) // period``.

.. note:: **Behavior change from django-ratelimit**

   The previous ``RateLimiter.check_rate_limit()`` reset the cache TTL on
   every call (``cache.set(key, current + 1, window_seconds)``), which
   approximated a sliding expiry.  This engine uses true fixed windows
   (``int(time.time()) // period``), so the counter resets at predictable
   boundaries.

   **Known limitation:** The fixed-window algorithm allows up to 2x the
   configured rate at window boundaries (N requests at the end of window T,
   N more at the start of window T+1).  For the rate limits used in this
   project the burst is acceptable.  If strict enforcement is needed in the
   future, consider a sliding-window or token-bucket algorithm.
"""

import logging
import time

from django.conf import settings
from django.core.cache import caches

logger = logging.getLogger(__name__)

PERIOD_MAP = {"s": 1, "m": 60, "h": 3600, "d": 86400}

PERIOD_NAMES = {"s": "second", "m": "minute", "h": "hour", "d": "day"}

UNKNOWN_IP = "unknown"


def _get_cache():
    """Return the cache backend configured for rate limiting."""
    backend = getattr(settings, "RATELIMIT_USE_CACHE", "default")
    return caches[backend]


def parse_rate(rate: str) -> tuple[int, int]:
    """Parse a rate string like ``'10/m'`` into ``(count, seconds)``.

    Args:
        rate: Rate string in the format ``<count>/<period>`` where period is
              one of ``s`` (second), ``m`` (minute), ``h`` (hour), ``d`` (day).

    Returns:
        Tuple of (max_requests, window_seconds).

    Raises:
        ValueError: If the rate string is malformed.
    """
    parts = rate.split("/")
    if len(parts) != 2 or parts[1] not in PERIOD_MAP:
        raise ValueError(
            f"Invalid rate string: {rate!r}. "
            f"Expected format: '<count>/<period>' where period is one of s, m, h, d."
        )
    count = int(parts[0])
    if count <= 0:
        raise ValueError(
            f"Invalid rate count in {rate!r}: count must be a positive integer, "
            f"got {count}."
        )
    return count, PERIOD_MAP[parts[1]]


def _make_cache_key(group: str, key: str, window: int) -> str:
    """Build the cache key for a rate limit counter."""
    prefix = getattr(settings, "RATELIMIT_KEY_PREFIX", "rl")
    return f"{prefix}:{group}:{key}:{window}"


def is_rate_limited(group: str, key: str, rate: str, increment: bool = True) -> bool:
    """Check whether a rate limit has been exceeded.

    Uses a fixed-window counter in Django's cache backend.  Each unique
    ``(group, key, window)`` combination gets its own counter that expires
    at the end of the time window.

    Args:
        group: Logical grouping for the rate limit (e.g. function name,
               ``"ws:AI_QUERY"``, ``"mcp:global"``).
        key: Identity key (e.g. ``"user:42"`` or ``"ip:1.2.3.4"``).
        rate: Rate string (e.g. ``"10/m"``).
        increment: Whether to increment the counter. Set to ``False`` for
                   read-only checks.

    Returns:
        ``True`` if the rate limit is exceeded, ``False`` otherwise.
    """
    if getattr(settings, "RATELIMIT_DISABLE", False):
        return False

    try:
        count, period = parse_rate(rate)
    except ValueError:
        fail_open = getattr(settings, "RATELIMIT_FAIL_OPEN", False)
        behaviour = "open (allowing)" if fail_open else "closed (denying)"
        logger.error("Invalid rate string: %r. Failing %s.", rate, behaviour)
        return not fail_open

    window = int(time.time()) // period
    cache_key = _make_cache_key(group, key, window)
    cache = _get_cache()

    if not increment:
        current = cache.get(cache_key, 0)
        return current >= count

    # Atomic add-then-incr pattern: cache.add() is atomic and only succeeds
    # for one caller when the key doesn't exist.  Subsequent callers see
    # add() return False and use incr() which is also atomic.  This avoids
    # the TOCTOU race where concurrent requests could both initialise the
    # key and lose increments.
    try:
        added = cache.add(cache_key, 1, period + 1)
        if added:
            current = 1
        else:
            try:
                current = cache.incr(cache_key)
            except ValueError:
                # The key expired between add() returning False and incr().
                # This happens at window boundaries.  Re-initialise the counter
                # instead of treating it as a cache failure.
                cache.set(cache_key, 1, period + 1)
                current = 1
    except Exception:
        # Cache unavailable — honour fail-open/fail-closed setting.
        fail_open = getattr(settings, "RATELIMIT_FAIL_OPEN", False)
        logger.warning(
            "Rate limit cache operation failed for %s. RATELIMIT_FAIL_OPEN=%s",
            cache_key,
            fail_open,
        )
        return not fail_open

    return current > count


async def ais_rate_limited(
    group: str, key: str, rate: str, increment: bool = True
) -> bool:
    """Async version of :func:`is_rate_limited`.

    Wraps the synchronous cache operations with ``sync_to_async`` so it is
    safe to call from ASGI handlers and Django Channels consumers.

    .. note::
        Each call incurs the overhead of ``sync_to_async`` (thread-pool
        dispatch).  This is acceptable for current load levels since rate
        limit checks are fast (single cache round-trip).  If profiling
        shows this becoming a bottleneck under high concurrency, consider
        replacing with a native async cache backend (e.g. ``aioredis``).
    """
    from asgiref.sync import sync_to_async

    return await sync_to_async(is_rate_limited)(group, key, rate, increment)

"""
Shared rate limit categories and user tier multipliers.

Provides the ``RateLimits`` singleton with all rate categories used across
GraphQL, WebSocket, MCP, and Django view endpoints.  Categories can be
overridden via environment variables through ``RATE_LIMIT_OVERRIDES`` in
Django settings.
"""

from __future__ import annotations

from typing import Any, Callable

from django.conf import settings

from config.ratelimit.engine import parse_rate
from config.ratelimit.keys import is_authenticated


class _RateLimits:
    """Common rate limit configurations for different operation types.

    All protocols share these categories.  WebSocket and MCP operations
    map to existing categories wherever possible (e.g. agent queries use
    ``AI_QUERY``, MCP search uses ``READ_HEAVY``).

    .. note::
        The singleton instance (``RateLimits``) is created at **import time**,
        so ``RATE_LIMIT_OVERRIDES`` from Django settings are baked in once.
        If you need to change rates at runtime (e.g. via admin UI), call
        ``RateLimits.reload()`` after updating settings.  In tests, use
        ``override_settings`` *and* reconstruct the instance or call
        ``reload()`` to pick up changes.
    """

    _defaults: dict[str, str] = {
        # Authentication operations
        "AUTH_LOGIN": "5/m",
        "AUTH_REGISTER": "3/m",
        "AUTH_PASSWORD_RESET": "3/h",
        # Read operations
        "READ_LIGHT": "100/m",
        "READ_MEDIUM": "30/m",
        "READ_HEAVY": "10/m",
        # Write operations
        "WRITE_LIGHT": "30/m",
        "WRITE_MEDIUM": "10/m",
        "WRITE_HEAVY": "5/m",
        # AI / analysis operations
        "AI_ANALYSIS": "5/m",
        "AI_EXTRACT": "10/m",
        "AI_QUERY": "20/m",
        # Export / import operations
        "EXPORT": "5/h",
        "IMPORT": "10/h",
        # Admin operations
        "ADMIN_OPERATION": "100/m",
        "ADMIN_LOGIN_PAGE": "20/m",
        # WebSocket-specific
        "WS_CONNECT": "10/m",
        "WS_HEARTBEAT": "120/m",
        # MCP global cap
        "MCP_GLOBAL": "100/m",
    }

    def __init__(self) -> None:
        self.reload()

    def reload(self) -> None:
        """Re-read ``RATE_LIMIT_OVERRIDES`` from Django settings.

        Useful after ``override_settings`` in tests or after updating
        settings at runtime via an admin UI.

        .. note::
            Module-level constants that capture rate values at import time
            (e.g. ``ADMIN_LOGIN_RATE`` in ``config/admin_auth/views.py``)
            are **not** affected by ``reload()``.  Those values are read
            once when the module is first imported and will retain the old
            rate until the process is restarted.
        """
        overrides = getattr(settings, "RATE_LIMIT_OVERRIDES", {})
        for key, default_value in self._defaults.items():
            setattr(self, key, overrides.get(key, default_value))

    def __getattr__(self, name: str) -> str:
        # After __init__ -> reload(), all _defaults keys exist as instance
        # attributes, so __getattr__ is only reached for truly unknown names.
        raise AttributeError(
            f"'{self.__class__.__name__}' object has no attribute '{name}'"
        )


# Singleton instance
RateLimits = _RateLimits()


def get_tier_adjusted_rate(user: Any, base_rate: str) -> str:
    """Adjust a base rate string according to the user's tier.

    Multipliers:
        - Superuser: 10x
        - Authenticated: 2x
        - Anonymous: 1x
        - Usage-capped: 0.5x (applied on top of authenticated multiplier)

    Args:
        user: Django user instance (or ``None`` / ``AnonymousUser``).
        base_rate: Rate string like ``"10/m"``.

    Returns:
        Adjusted rate string (e.g. ``"100/m"`` for a superuser with base ``"10/m"``).
    """
    try:
        base_count, _ = parse_rate(base_rate)
    except ValueError:
        return base_rate

    period = base_rate.split("/")[1]

    if user and hasattr(user, "is_superuser") and user.is_superuser:
        count = base_count * 10
    elif user and is_authenticated(user):
        count = base_count * 2
    else:
        count = base_count

    # Usage-capped users get half the limit
    if user and getattr(user, "is_usage_capped", False):
        count = max(1, count // 2)

    return f"{count}/{period}"


def get_user_tier_rate(operation_type: str) -> Callable:
    """Return a callable that determines rate limits based on user tier.

    Designed for use with ``graphql_ratelimit_dynamic``.  The returned
    function takes ``(root, info)`` and returns the appropriate rate string
    by reading the user from ``info.context``.

    Args:
        operation_type: Attribute name on ``RateLimits`` (e.g. ``"READ_MEDIUM"``).

    Returns:
        A function ``(root, info) -> str`` returning a rate string.

    Raises:
        AttributeError: If ``operation_type`` is not a valid rate category.
    """
    # Validate at decoration time so typos are caught immediately rather
    # than silently falling back to READ_MEDIUM at runtime.
    if operation_type not in _RateLimits._defaults:
        raise AttributeError(
            f"Unknown rate limit category: {operation_type!r}. "
            f"Valid categories: {', '.join(sorted(_RateLimits._defaults))}"
        )

    def get_rate(root: Any, info: Any) -> str:
        user = info.context.user
        base_rate = getattr(RateLimits, operation_type)
        return get_tier_adjusted_rate(user, base_rate)

    return get_rate

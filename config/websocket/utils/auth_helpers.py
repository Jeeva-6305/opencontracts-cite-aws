"""
Shared authentication utilities for WebSocket consumers.

This module provides common auth error handling patterns used across
multiple consumer implementations to avoid code duplication.
"""

import logging
from typing import Any

from config.websocket.middleware import WS_CLOSE_UNAUTHENTICATED

logger = logging.getLogger(__name__)


async def check_auth_and_close_if_failed(
    consumer: Any,
    session_id: str,
    *,
    allow_anonymous: bool = False,
) -> bool:
    """
    Check authentication and close WebSocket with appropriate code if failed.

    This is a shared utility for WebSocket consumers that need to verify
    authentication before accepting connections. It handles:
    - Token expiration (4001) - client should refresh
    - Invalid tokens (4002) - client should re-authenticate
    - No token provided (4000) - depends on allow_anonymous flag

    Args:
        consumer: The WebSocket consumer instance (must have scope and close() method)
        session_id: Session identifier for logging
        allow_anonymous: If True, allow connections without tokens (for public documents).
                        If False, reject unauthenticated users with 4000.

    Returns:
        True if authentication failed and connection was closed
        False if authentication succeeded (or anonymous access is allowed)

    Usage:
        async def connect(self):
            if await check_auth_and_close_if_failed(self, self.session_id):
                return
            # ... continue with authenticated connection
    """
    user = consumer.scope.get("user")
    is_authenticated = user and user.is_authenticated

    if is_authenticated:
        return False  # Auth succeeded

    # Not authenticated - check why
    auth_error = consumer.scope.get("auth_error")

    if auth_error:
        # User tried to authenticate but failed (expired/invalid token)
        logger.warning(f"[Session {session_id}] Auth failed: {auth_error['message']}")
        await consumer.close(code=auth_error["code"])
        return True  # Auth failed

    # No auth_error means no token was provided
    if allow_anonymous:
        return False  # Anonymous access allowed

    # Reject unauthenticated user
    logger.warning(f"[Session {session_id}] Unauthenticated user rejected")
    await consumer.close(code=WS_CLOSE_UNAUTHENTICATED)
    return True  # Auth failed

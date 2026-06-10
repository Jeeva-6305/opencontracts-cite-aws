"""
DEPRECATED: Auth0-specific WebSocket middleware.

This module is kept for backwards compatibility. The unified JWTAuthMiddleware
in config.websocket.middleware now handles both Auth0 and non-Auth0 tokens
automatically based on the USE_AUTH0 setting.

Use config.websocket.middleware.JWTAuthMiddleware instead.
"""

from config.websocket.middleware import JWTAuthMiddleware

# Backwards compatibility alias - the unified middleware handles both modes
WebsocketAuth0TokenMiddleware = JWTAuthMiddleware

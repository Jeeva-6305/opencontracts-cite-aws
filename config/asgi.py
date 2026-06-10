"""
ASGI config for OpenContracts project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/dev/howto/deployment/asgi/

"""

import os  # noqa: E402

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django  # noqa: E402

django.setup()

import logging  # noqa: E402
import sys  # noqa: E402
import uuid  # noqa: E402
from pathlib import Path  # noqa: E402

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.conf import settings  # noqa: E402
from django.core.asgi import get_asgi_application  # noqa: E402
from django.urls import re_path  # noqa: E402

from config.websocket.consumers.notification_updates import (  # noqa: E402
    NotificationUpdatesConsumer,
)
from config.websocket.consumers.thread_updates import (  # noqa: E402
    ThreadUpdatesConsumer,
)
from config.websocket.consumers.unified_agent_conversation import (  # noqa: E402
    UnifiedAgentConsumer,
)
from opencontractserver.mcp.server import mcp_asgi_app  # noqa: E402

logger = logging.getLogger(__name__)

# This allows easy placement of apps within the interior
# delphic directory.
BASE_DIR = Path(__file__).resolve(strict=True).parent.parent
sys.path.append(str(BASE_DIR / "delphic"))

# This application object is used by any ASGI server configured to use this file.
django_application = get_asgi_application()


def create_http_router(django_app, mcp_app):
    """
    Create an HTTP router that dispatches to MCP or Django based on path.

    Routes MCP endpoints to the MCP ASGI app, everything else to Django.
    The MCP server supports multiple transports:
    - Streamable HTTP at /mcp (recommended, stateless mode)
    - Corpus-scoped HTTP at /mcp/corpus/{slug}/ (scoped to single corpus)
    - SSE at /sse (deprecated, for backward compatibility)
    """

    async def router(scope, receive, send):
        path = scope.get("path", "")
        # Match MCP endpoints:
        # - /mcp or /mcp/* (global and corpus-scoped)
        # - /sse or /sse/* (deprecated SSE transport)
        if (
            path == "/mcp"
            or path.startswith("/mcp/")
            or path == "/sse"
            or path.startswith("/sse/")
        ):
            await mcp_app(scope, receive, send)
        else:
            await django_app(scope, receive, send)

    return router


http_application = create_http_router(django_application, mcp_asgi_app)

# Unified agent consumer - handles all agent conversation contexts
# Replaces legacy DocumentQueryConsumer, CorpusQueryConsumer, StandaloneDocumentQueryConsumer
# Supports: ?corpus_id=X, ?document_id=X, ?agent_id=X, ?conversation_id=X
unified_agent_query_pattern = re_path(
    r"ws/agent-chat/$",
    UnifiedAgentConsumer.as_asgi(),
)

# Thread updates consumer for agent mention responses
# Supports: ?conversation_id=X (required)
thread_updates_pattern = re_path(
    r"ws/thread-updates/$",
    ThreadUpdatesConsumer.as_asgi(),
)

# Notification updates consumer for real-time notifications
# No query parameters required (uses authenticated user)
# Issue #637: Migrate badge notifications from polling to WebSocket
notification_updates_pattern = re_path(
    r"ws/notification-updates/$",
    NotificationUpdatesConsumer.as_asgi(),
)

websocket_urlpatterns = [
    # Unified agent consumer for all corpus/document chat interactions
    unified_agent_query_pattern,
    # Thread updates consumer for agent mention streaming
    thread_updates_pattern,
    # Notification updates consumer for real-time notifications (Issue #637)
    notification_updates_pattern,
]

# Log all registered websocket patterns
for pattern in websocket_urlpatterns:
    logger.info(f"Registered WebSocket URL pattern: {pattern.pattern}")

# Unified JWT auth middleware - handles both Auth0 and non-Auth0 automatically
# based on USE_AUTH0 setting via the shared jwt_utils module
from config.websocket.middleware import JWTAuthMiddleware  # noqa: E402

logger.info(f"Using JWTAuthMiddleware (USE_AUTH0={settings.USE_AUTH0})")

# Create the ASGI application with proper middleware order
# 1. Protocol routing
# 2. Auth middleware (determined above)
# 3. Logging middleware
# 4. URL routing
application = ProtocolTypeRouter(
    {
        # Routes /mcp/* and /sse/* to MCP, rest to Django
        "http": http_application,
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)

logger.info("ASGI application configured with WebSocket support")

unique_id = uuid.uuid4()
logger.info(f"ASGI.py loaded (unique_id={unique_id})")

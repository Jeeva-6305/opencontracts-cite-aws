# Backend WebSocket Implementation

**Last Updated:** 2026-02-09

## Overview

The backend WebSocket implementation consists of Django Channels consumers that handle real-time chat functionality, thread updates, and notifications. Three consumers serve distinct purposes:

| Consumer | Purpose | URL Pattern | Source |
|----------|---------|-------------|--------|
| **UnifiedAgentConsumer** | All agent chat contexts (corpus, document, standalone) | `ws/agent-chat/?corpus_id=X&document_id=X` | [`unified_agent_conversation.py`](../../../config/websocket/consumers/unified_agent_conversation.py) |
| **ThreadUpdatesConsumer** | Real-time thread/conversation updates (read-only) | `ws/thread-updates/?conversation_id=X` | [`thread_updates.py`](../../../config/websocket/consumers/thread_updates.py) |
| **NotificationUpdatesConsumer** | Real-time user notifications (read-only) | `ws/notification-updates/` | [`notification_updates.py`](../../../config/websocket/consumers/notification_updates.py) |

> **Migration Note:** The legacy `DocumentQueryConsumer`, `CorpusQueryConsumer`, and `StandaloneDocumentQueryConsumer` have been removed. All agent chat functionality is now handled by `UnifiedAgentConsumer`. See [`config/asgi.py:83`](../../../config/asgi.py) for details.

## Architecture

### Consumer Base Pattern

All consumers inherit from `AsyncWebsocketConsumer` and implement:

1. **Connection lifecycle management**
2. **Authentication and authorization**
3. **Message processing and streaming**
4. **Error handling and logging**

### Agent Integration

`UnifiedAgentConsumer` uses the unified LLM agent API (`opencontractserver.llms.agents`) which provides:

- Framework-agnostic agent creation via `agents.for_document()` / `agents.for_corpus()`
- Conversation persistence
- Streaming response handling via async generators
- Tool approval workflows

## UnifiedAgentConsumer

**Source:** [`config/websocket/consumers/unified_agent_conversation.py`](../../../config/websocket/consumers/unified_agent_conversation.py)

A single WebSocket consumer that handles all agent conversation contexts. This DRY refactoring consolidated ~1500 lines of duplicated code from three legacy consumers into a single, maintainable consumer with dynamic agent selection.

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `corpus_id` | One of corpus_id or document_id | GraphQL ID for corpus context |
| `document_id` | One of corpus_id or document_id | GraphQL ID for document context |
| `conversation_id` | No | GraphQL ID for existing conversation (resumes session) |
| `agent_id` | No | GraphQL ID for specific agent (uses default if omitted) |

### Agent Selection Logic

1. If `agent_id` provided: Use that specific `AgentConfiguration` (must be `is_active=True`)
2. If `document_id` provided: Use `default-document-agent` (GLOBAL)
3. If `corpus_id` provided: Use `default-corpus-agent` (GLOBAL)
4. Otherwise: Reject connection (no context)

### Connection Flow

See [`connect()`](../../../config/websocket/consumers/unified_agent_conversation.py) in the source. The flow is:

1. Generate unique session ID
2. Parse query parameters (`corpus_id`, `document_id`, `agent_id`, `conversation_id`)
3. Validate at least one context provided (else close with `WS_CLOSE_UNAUTHENTICATED`)
4. Check authentication (allows anonymous for public resources)
5. Load and validate corpus/document — authenticated users need read permission, anonymous users require `is_public`
6. Resolve agent configuration (priority: explicit `agent_id` > document default > corpus default)
7. Accept connection

### Agent Initialization

See [`_initialize_agent()`](../../../config/websocket/consumers/unified_agent_conversation.py) — agents are created **lazily** on first query. The method builds `agent_kwargs` from the connection context and calls either `agents.for_document()` or `agents.for_corpus()` depending on what was provided. For standalone documents (no corpus), it auto-discovers an embedder from existing structural annotations.

### Message Processing

See [`receive()`](../../../config/websocket/consumers/unified_agent_conversation.py) — handles two message types: approval decisions (`approval_decision` key) and user queries (`query` key). On first query, the agent is lazily initialized and a background task generates a conversation title.

### Event Processing

The consumer maps agent events to WebSocket messages:

| Agent Event | WebSocket Message Type | Description |
|-------------|----------------------|-------------|
| `ContentEvent` | `ASYNC_CONTENT` | Streaming content chunk |
| `ThoughtEvent` | `ASYNC_THOUGHT` | Agent reasoning/thought |
| `SourceEvent` | `ASYNC_SOURCES` | Source citations |
| `ApprovalNeededEvent` | `ASYNC_APPROVAL_NEEDED` | Tool requires user approval |
| `ApprovalResultEvent` | `ASYNC_APPROVAL_RESULT` | Approval decision echoed back |
| `ResumeEvent` | `ASYNC_RESUME` | Agent resuming after approval |
| `ErrorEvent` | `ASYNC_ERROR` | Error during generation |
| `FinalEvent` | `ASYNC_FINISH` | Complete response with sources and timeline |

All events include `message_id` for frontend correlation. An `ASYNC_START` message is sent once message IDs are available.

### Approval Workflow

See [`_handle_approval_decision()`](../../../config/websocket/consumers/unified_agent_conversation.py) — extracts `approval_decision` (bool) and `llm_message_id` from the payload, then calls `agent.resume_with_approval()` which streams the continued response through the same event processing pipeline.

### Standalone Document Support

When no corpus is provided, the consumer:
1. Supports both authenticated and anonymous users (for public documents)
2. Automatically discovers an existing embedder from the document's structural annotations
3. Falls back to `settings.DEFAULT_EMBEDDER` if no embedder found

---

## ThreadUpdatesConsumer

**Source:** [`config/websocket/consumers/thread_updates.py`](../../../config/websocket/consumers/thread_updates.py)

WebSocket consumer for real-time thread/conversation updates. Clients subscribe to receive:

- Agent response streaming tokens
- Tool call notifications
- Response completion events
- Error notifications

**This consumer is read-only** - it only broadcasts updates from Celery tasks. The actual agent responses are generated by the `generate_agent_response` task.

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `conversation_id` | Yes | GraphQL ID for the conversation to watch |

### Channel Layer Events

The consumer handles these channel layer messages from Celery tasks:

| Event | Handler Method | Description |
|-------|----------------|-------------|
| `agent_stream_start` | `agent_stream_start()` | Agent starting to generate response |
| `agent_stream_token` | `agent_stream_token()` | Streaming token from agent |
| `agent_tool_call` | `agent_tool_call()` | Agent calling a tool |
| `agent_stream_complete` | `agent_stream_complete()` | Agent finished response |
| `agent_stream_error` | `agent_stream_error()` | Error during generation |

### Message Types (Server to Client)

- `CONNECTED` - Connection established with conversation_id and session_id
- `AGENT_STREAM_START` - Agent started generating (includes agent metadata)
- `AGENT_STREAM_TOKEN` - Individual token from streaming response
- `AGENT_TOOL_CALL` - Agent invoked a tool
- `AGENT_STREAM_COMPLETE` - Full response with content, sources, timeline
- `AGENT_STREAM_ERROR` - Error occurred during generation

### Client Messages

- `ping` - Returns `pong` for connection health check
- `heartbeat` - Returns `heartbeat_ack` with session_id

### Permission Model

For conversations with BOTH `chat_with_corpus` AND `chat_with_document` set (doc-in-corpus threads), user must have access to BOTH the corpus AND the document (AND logic).

---

## NotificationUpdatesConsumer

**Source:** [`config/websocket/consumers/notification_updates.py`](../../../config/websocket/consumers/notification_updates.py)

WebSocket consumer for real-time notification updates. Clients subscribe to receive instant notifications about:

- Badge awards (BADGE)
- Message replies (REPLY, THREAD_REPLY)
- Mentions (MENTION)
- Accepted answers (ACCEPTED)
- Moderation actions (THREAD_LOCKED, MESSAGE_DELETED, etc.)

**This consumer is read-only** - it only broadcasts updates when notifications are created or updated via signals.

Related to **Issue #637**: Migrate badge notifications from polling to WebSocket/SSE.

### Connection

No query parameters required - uses authenticated user from WebSocket auth middleware.

**URL:** `ws://localhost:8000/ws/notification-updates/`

### Security

- **User-specific channel groups**: `notification_user_{user_id}`
- **IDOR prevention**: Only shows notifications for authenticated user
- **Token validation**: Via WebSocket auth middleware
- Rejects unauthenticated connections (code 4001)

### Channel Layer Events

| Event | Handler Method | Description |
|-------|----------------|-------------|
| `notification_created` | `notification_created()` | New notification created |
| `notification_updated` | `notification_updated()` | Notification read status changed |
| `notification_deleted` | `notification_deleted()` | Notification deleted |

### Message Types (Server to Client)

- `CONNECTED` - Connection established with user_id and session_id
- `NOTIFICATION_CREATED` - New notification with full details
- `NOTIFICATION_UPDATED` - Read status change
- `NOTIFICATION_DELETED` - Notification removed

### Client Messages

- `ping` - Returns `pong` for connection health check
- `heartbeat` - Returns `heartbeat_ack` with session_id

---

## Common Patterns

### Standard Message Format

All consumers use `send_standard_message()` (see [source](../../../config/websocket/consumers/unified_agent_conversation.py)) which sends a JSON object with `type`, `content`, and `data` keys.

### Error Handling

- **Connection errors** (invalid IDs, missing resources): Accept, send error via `SYNC_CONTENT`, then close with appropriate code
- **Processing errors**: Log with `exc_info=True`, send error message, keep connection open

### Logging Strategy

All log messages include session IDs (`[Session {self.session_id}]`) for traceability. Log levels: DEBUG (connection events, message flow), INFO (successful operations), WARNING (handled conditions), ERROR (failures requiring investigation).

## Performance Considerations

### Resource Management

1. **Agent Reuse**: Agents persist for the WebSocket session duration
2. **Lazy Loading**: Agents created only when first query arrives
3. **Memory Cleanup**: Agents nullified on disconnect for garbage collection
4. **Database Efficiency**: Uses async ORM methods for non-blocking I/O

### Streaming Efficiency

1. **Event-Driven**: Uses async generators for memory-efficient streaming
2. **Backpressure**: Natural flow control via WebSocket buffering
3. **Early Sources**: Citations sent as soon as available
4. **Progressive Display**: Content streams immediately without buffering

## Configuration

### Django Settings

```python
# Agent framework selection
LLMS_DEFAULT_AGENT_FRAMEWORK = "pydantic_ai"

# Channels configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        # Redis config...
    },
}
```

### URL Routing

WebSocket consumers are registered in `config/asgi.py`:

```python
from config.websocket.consumers.unified_agent_conversation import UnifiedAgentConsumer
from config.websocket.consumers.thread_updates import ThreadUpdatesConsumer
from config.websocket.consumers.notification_updates import NotificationUpdatesConsumer

websocket_urlpatterns = [
    re_path(r"ws/agent-chat/$", UnifiedAgentConsumer.as_asgi()),
    re_path(r"ws/thread-updates/$", ThreadUpdatesConsumer.as_asgi()),
    re_path(r"ws/notification-updates/$", NotificationUpdatesConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": http_application,
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
```

## Testing Considerations

### Unit Testing

Consumers can be tested using Django Channels testing utilities:

```python
from channels.testing import WebsocketCommunicator
from config.websocket.consumers.unified_agent_conversation import UnifiedAgentConsumer

async def test_unified_consumer():
    communicator = WebsocketCommunicator(
        UnifiedAgentConsumer.as_asgi(),
        "/ws/agent-chat/?corpus_id=Q29ycHVzVHlwZTox"
    )
    connected, subprotocol = await communicator.connect()
    assert connected

    # Send test message
    await communicator.send_json_to({"query": "test question"})

    # Receive response
    response = await communicator.receive_json_from()
    assert response["type"] == "ASYNC_START"

    await communicator.disconnect()
```

### Integration Testing

End-to-end tests should verify:

1. Authentication and authorization
2. Message flow completeness
3. Error handling behavior
4. Agent state persistence
5. Database record creation

---

## Related Files

- [`config/asgi.py`](../../../config/asgi.py): WebSocket URL routing configuration
- [`opencontractserver/llms/agents/`](../../../opencontractserver/llms/agents/): Agent implementations
- [`opencontractserver/conversations/models.py`](../../../opencontractserver/conversations/models.py): Database models
- [`config/websocket/utils/`](../../../config/websocket/utils/): Utility functions (auth helpers, ID extraction)
- [`config/websocket/middleware.py`](../../../config/websocket/middleware.py): WebSocket authentication middleware

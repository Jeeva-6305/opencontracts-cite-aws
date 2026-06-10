# Real-Time Notification System

This document describes the WebSocket-based real-time notification architecture introduced in Issue #637.

## Overview

The notification system delivers instant updates to users via WebSocket, replacing the previous polling-based approach. This provides:

- **Zero latency**: Notifications appear instantly instead of 0-30 second polling delays
- **Reduced server load**: No continuous polling requests from connected clients
- **Better UX**: Real-time feedback for social interactions (replies, mentions, badges)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐                      │
│  │ useNotificationWeb- │      │ useBadgeNotifications│                      │
│  │ Socket              │◄─────│ (and other consumers)│                      │
│  │                     │      └─────────────────────┘                      │
│  │ - Connection mgmt   │                                                    │
│  │ - Auto-reconnect    │      ┌─────────────────────┐                      │
│  │ - Heartbeat         │◄─────│ UI Components       │                      │
│  │ - Message parsing   │      │ (badges, toasts)    │                      │
│  └──────────┬──────────┘      └─────────────────────┘                      │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │ WebSocket (wss://host/ws/notification-updates/)
              │
┌─────────────┼───────────────────────────────────────────────────────────────┐
│             ▼                        Backend (Django)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐                      │
│  │ NotificationUpdates │◄─────│ Django Channels     │                      │
│  │ Consumer            │      │ Layer (Redis)       │                      │
│  │                     │      └──────────┬──────────┘                      │
│  │ - Auth validation   │                 │                                  │
│  │ - User channels     │                 │                                  │
│  │ - Message routing   │      ┌──────────┴──────────┐                      │
│  └─────────────────────┘      │                     │                      │
│                               ▼                     ▼                      │
│                    ┌─────────────────┐   ┌─────────────────┐               │
│                    │ Signal Handlers │   │ Celery Tasks    │               │
│                    │ (post_save)     │   │ (async jobs)    │               │
│                    └────────┬────────┘   └────────┬────────┘               │
│                             │                     │                        │
│                             ▼                     ▼                        │
│                    ┌─────────────────────────────────────┐                 │
│                    │ broadcast_notification_via_websocket │                 │
│                    └─────────────────────────────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Notification Types

### Message & Thread Notifications

| Type | Trigger | Description |
|------|---------|-------------|
| `BADGE` | `UserBadge` created | User awarded a badge |
| `REPLY` | `ChatMessage` created with parent | Direct reply to user's message |
| `THREAD_REPLY` | `ChatMessage` in thread | Reply in a thread user participated in |
| `MENTION` | `ChatMessage` with @username | User mentioned in a message |
| `THREAD_LOCKED` | `ModerationAction` | Thread was locked by moderator |
| `THREAD_UNLOCKED` | `ModerationAction` | Thread was unlocked |
| `THREAD_PINNED` | `ModerationAction` | Thread was pinned |
| `THREAD_UNPINNED` | `ModerationAction` | Thread was unpinned |
| `MESSAGE_DELETED` | `ModerationAction` | User's message was deleted |
| `THREAD_DELETED` | `ModerationAction` | User's thread was deleted |
| `MESSAGE_RESTORED` | `ModerationAction` | User's message was restored |
| `THREAD_RESTORED` | `ModerationAction` | User's thread was restored |

### Job/Processing Notifications (Issue #624)

| Type | Trigger | Recipients | Description |
|------|---------|------------|-------------|
| `DOCUMENT_PROCESSED` | `set_doc_lock_state()` task | Document creator + corpus owners | Document ingestion completed |
| `EXTRACT_COMPLETE` | `mark_extract_complete()` task | Extract creator | Data extraction job finished |
| `ANALYSIS_COMPLETE` | Analysis callback (success) | Analysis creator | Analysis completed successfully |
| `ANALYSIS_FAILED` | Analysis callback (failure) | Analysis creator | Analysis failed |
| `EXPORT_COMPLETE` | Export tasks complete | Export creator | Corpus export ready for download |

## Backend Components

### WebSocket Consumer

**Location**: `config/websocket/consumers/notification_updates.py`

The `NotificationUpdatesConsumer` handles WebSocket connections:

```python
class NotificationUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Authenticate user from scope (set by middleware)
        # Subscribe to user-specific channel group
        # Send CONNECTED confirmation

    async def notification_created(self, event):
        # Handle broadcasts from signal handlers
        # Send NOTIFICATION_CREATED to client
```

**Security**:
- Rejects unauthenticated connections (close code 4001)
- User-specific channel groups (`notification_user_{user_id}`) prevent IDOR
- Token validation via WebSocket auth middleware

### Signal Handlers

**Location**: `opencontractserver/notifications/signals.py`

Django signals trigger notifications on model changes:

```python
@receiver(post_save, sender=UserBadge)
def create_badge_notification(sender, instance, created, **kwargs):
    # Create Notification record
    # Broadcast via WebSocket
    broadcast_notification_via_websocket(notification)
```

### Broadcasting Function

```python
def broadcast_notification_via_websocket(notification: Notification) -> None:
    channel_layer = get_channel_layer()
    group_name = get_notification_channel_group(notification.recipient_id)

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "notification_created",
            "notification_id": str(notification.id),
            "notification_type": notification.notification_type,
            # ... additional fields
        }
    )
```

### ASGI Routing

**Location**: `config/asgi.py`

```python
websocket_urlpatterns = [
    # ... other WebSocket routes
    re_path(
        r"ws/notification-updates/$",
        NotificationUpdatesConsumer.as_asgi(),
    ),
]
```

## Frontend Components

### useNotificationWebSocket Hook

**Location**: `frontend/src/hooks/useNotificationWebSocket.ts`

Core hook for WebSocket connection management:

```typescript
const {
  connectionState,  // 'disconnected' | 'connecting' | 'connected' | 'error'
  sessionId,        // Server-assigned session ID
  recentNotifications,  // Last 50 notifications received
  connect,          // Manual connect function
  disconnect,       // Manual disconnect function
  sendPing,         // Health check
  clearRecent,      // Clear notification buffer
} = useNotificationWebSocket({
  onNotificationCreated: (notification) => { /* handle */ },
  onNotificationUpdated: (id, isRead) => { /* handle */ },
  onNotificationDeleted: (id) => { /* handle */ },
  autoReconnect: true,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
  enabled: true,
});
```

**Features**:
- Automatic connection on mount
- Auto-reconnection with exponential backoff (3s → 6s → 12s → 24s, max 8x)
- Heartbeat every 30 seconds
- Reconnection on page visibility change (mobile resume)
- Reconnection on network recovery

### useBadgeNotifications Hook

**Location**: `frontend/src/hooks/useBadgeNotifications.ts`

Specialized hook for badge notifications:

```typescript
const { newBadges, clearNewBadges, connectionState } = useBadgeNotifications();
```

Filters `NOTIFICATION_CREATED` messages for `BADGE` type and maintains a list of new badge awards.

### WebSocket URL Helper

**Location**: `frontend/src/components/chat/get_websockets.ts`

```typescript
export function getNotificationUpdatesWebSocket(token?: string): string {
  // Constructs: wss://host/ws/notification-updates/?token=...
}
```

## Message Protocol

### Server → Client

**CONNECTED** (on successful connection):
```json
{
  "type": "CONNECTED",
  "user_id": "123",
  "session_id": "uuid-..."
}
```

**NOTIFICATION_CREATED** (new notification):
```json
{
  "type": "NOTIFICATION_CREATED",
  "notificationId": "456",
  "notificationType": "BADGE",
  "createdAt": "2025-12-30T12:00:00Z",
  "isRead": false,
  "data": {
    "badge_id": "789",
    "badge_name": "First Post",
    "badge_description": "Made your first post",
    "badge_icon": "MessageSquare",
    "badge_color": "#4A90E2",
    "is_auto_awarded": true
  },
  "actor": {
    "id": "101",
    "username": "system"
  }
}
```

**NOTIFICATION_UPDATED** (read status changed):
```json
{
  "type": "NOTIFICATION_UPDATED",
  "notificationId": "456",
  "isRead": true,
  "modified": "2025-12-30T12:05:00Z"
}
```

**NOTIFICATION_DELETED**:
```json
{
  "type": "NOTIFICATION_DELETED",
  "notificationId": "456"
}
```

**pong** (response to ping):
```json
{
  "type": "pong"
}
```

**heartbeat_ack** (response to heartbeat):
```json
{
  "type": "heartbeat_ack",
  "session_id": "uuid-..."
}
```

### Client → Server

**ping** (health check):
```json
{
  "type": "ping"
}
```

**heartbeat** (keep-alive):
```json
{
  "type": "heartbeat"
}
```

## Close Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal closure (client disconnect) |
| 4001 | Unauthenticated (no valid token) |
| 4002 | Invalid token |

## Testing

### Backend Tests

**Location**: `opencontractserver/tests/test_notification_websocket.py`

Covers:
- Authentication (reject unauthenticated)
- IDOR prevention (user isolation)
- Concurrent connections
- Signal integration
- Message format validation

Run tests:
```bash
docker compose -f test.yml run django pytest opencontractserver/tests/test_notification_websocket.py -v
```

### Manual Testing

1. Open browser DevTools → Network → WS filter
2. Log in to the application
3. Verify WebSocket connection to `/ws/notification-updates/`
4. Check for `CONNECTED` message
5. Trigger a notification (e.g., award badge via admin)
6. Verify `NOTIFICATION_CREATED` message appears instantly

## Debugging

### Enable Debug Logging

Backend (`config/settings/local.py`):
```python
LOGGING['loggers']['config.websocket.consumers.notification_updates'] = {
    'level': 'DEBUG',
    'handlers': ['console'],
}
```

Frontend (browser console):
```javascript
// Messages are logged with [useNotificationWebSocket] prefix
```

### Common Issues

**WebSocket won't connect**:
- Check Redis is running (channel layer backend)
- Verify token is valid
- Check ASGI routing includes notification-updates endpoint

**Notifications not broadcasting**:
- Verify signal handlers are imported in `apps.py` `ready()` method
- Check channel layer is configured
- Look for errors in Django logs

**Connection drops frequently**:
- Network instability triggers auto-reconnect
- Check heartbeat interval isn't too aggressive
- Verify Redis connection is stable

## Performance Considerations

- **User-specific channels**: Each user has their own channel group, avoiding broadcast storms
- **Minimal payload**: Only essential notification data sent over WebSocket
- **Bulk operations**: Thread reply notifications use `bulk_create()` to avoid N+1
- **Async broadcasting**: `async_to_sync` ensures signal handlers don't block
- **Exponential backoff**: Prevents reconnection storms during outages

## Migration from Polling

The previous implementation used Apollo Client polling every 30 seconds:

```typescript
// OLD (polling)
const { data } = useQuery(GET_NOTIFICATIONS, {
  pollInterval: 30000,
});

// NEW (WebSocket)
const { newBadges } = useBadgeNotifications();
```

Benefits:
- Instant delivery vs 0-30s latency
- ~60 fewer requests per user per hour
- More responsive UI
- Lower server load

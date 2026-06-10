# Backend Telemetry

OpenContracts backend uses PostHog to collect anonymous usage telemetry. This data helps guide development priorities by understanding how the platform is used.

## What We Collect

Backend telemetry records the following events:

### Periodic Events

| Event | Description | Frequency | Properties |
|-------|-------------|-----------|------------|
| `usage_heartbeat` | Aggregate usage statistics | Daily | See below |

The `usage_heartbeat` event includes:
- `user_count` — Active users
- `document_count` — Non-deleted documents
- `corpus_count` — Total corpuses
- `annotation_count` — User annotations (excludes structural)
- `conversation_count` — Active conversations/threads
- `message_count` — Active messages
- `version` — OpenContracts version
- `installation_age_days` — Days since installation

### Real-time Events

| Event | Description | Properties |
|-------|-------------|------------|
| `user_created` | A new user account is created | `user_count` (total users) |
| `document_uploaded` | A document is uploaded | `user_id`, `env` |

All events include:
- `installation_id` — Unique anonymous identifier for your installation
- `timestamp` — When the event occurred
- `package` — Always `opencontracts`

## What We Do NOT Collect

- Document contents or filenames
- User identities, emails, or personal information
- Extracted data or annotations
- Query contents or search terms
- IP addresses or location data

## Configuration

Backend telemetry is controlled by environment variables in your Django settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEMETRY_ENABLED` | `True` | Master switch for backend telemetry |
| `POSTHOG_API_KEY` | (set) | PostHog project API key |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog API endpoint |

## Disabling Telemetry

To disable backend telemetry, set the environment variable:

```bash
TELEMETRY_ENABLED=False
```

Or in your `.env` file:

```env
TELEMETRY_ENABLED=False
```

When disabled, no events are sent to PostHog and no data leaves your server.

## Technical Details

- **Location**: `config/telemetry.py`
- **Singleton client**: PostHog client is lazily initialized and reused
- **Async sending**: Events are queued and sent asynchronously by a background thread
- **Graceful shutdown**: An `atexit` handler ensures pending events are flushed on process exit
- **Test mode**: Telemetry is automatically disabled when `MODE=TEST`

### Periodic Task Setup

The daily `usage_heartbeat` task is automatically configured when you run migrations:

```bash
python manage.py migrate
```

This creates a `PeriodicTask` entry in django-celery-beat's database scheduler. The task:
- Runs daily at midnight UTC
- Is only created if `TELEMETRY_ENABLED=True` at migration time
- Can be managed via Django admin under "Periodic Tasks"

**Requirements**: Celery Beat must be running for periodic tasks to execute:

```bash
celery -A config.celery_app beat --loglevel=info
```

## Implementation

Events are recorded via the `record_event()` function:

```python
from config.telemetry import record_event

# Record an event with properties
record_event("my_event", {"property": "value"})
```

The function returns `True` if the event was queued successfully, `False` otherwise. It never raises exceptions to avoid disrupting normal operations.

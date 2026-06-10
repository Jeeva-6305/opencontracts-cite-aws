# Rate Limiting Documentation

## Overview

OpenContracts implements multi-layer rate limiting to protect the application from abuse and ensure fair resource usage:

1. **Edge Rate Limiting** - Via Traefik reverse proxy (or your own reverse proxy's rate limiting)
2. **Application Rate Limiting** - Via the unified `config.ratelimit` package, covering **all** protocols: GraphQL, WebSocket, MCP, and Django views

All protocols share the same engine, rate categories, tier multipliers, and identity resolution. This ensures consistent behavior and a single place to configure limits.

## Architecture

### Edge Rate Limiting (Traefik)

Traefik provides the first line of defense with IP-based rate limiting:

- **Frontend**: 10 req/s average, 20 burst
- **API/GraphQL**: 5 req/s average, 10 burst
- **Flower**: 10 req/s average, 20 burst

Configuration: `compose/production/traefik/traefik.yml`

### Application Rate Limiting (`config.ratelimit`)

The `config/ratelimit/` package provides a protocol-agnostic rate limiting engine with thin adapters for each protocol. It uses Django's cache framework (Redis in production) as its counter store.

#### Package Structure

```
config/ratelimit/
├── __init__.py       # Public API re-exports
├── engine.py         # Fixed-window counter engine (sync + async)
├── keys.py           # Identity resolution: IP extraction + key building
├── rates.py          # Rate categories, tier multipliers, RateLimits singleton
└── decorators.py     # Protocol-specific adapters
```

**Layer responsibilities:**

| Layer | File | Role |
|-------|------|------|
| Engine | `engine.py` | `is_rate_limited()` / `ais_rate_limited()` — fixed-window counters via Django cache |
| Keys | `keys.py` | `get_client_ip_from_http()`, `get_client_ip_from_scope()`, `get_rate_limit_key()` |
| Rates | `rates.py` | `RateLimits` singleton, `get_tier_adjusted_rate()`, `get_user_tier_rate()` |
| Decorators | `decorators.py` | `graphql_ratelimit`, `check_ws_rate_limit`, `check_mcp_rate_limit`, `view_ratelimit` |

### Rate Limit Categories

All protocols share the same rate categories:

| Category | Operation Type | Default Limit | Used By |
|----------|---------------|---------------|---------|
| **Authentication** | AUTH_LOGIN | 5/m | Admin login view |
| | AUTH_REGISTER | 3/m | Registration |
| | AUTH_PASSWORD_RESET | 3/h | Password reset |
| **Read Operations** | READ_LIGHT | 100/m | GraphQL single-object queries, MCP `list_public_corpuses` |
| | READ_MEDIUM | 30/m | GraphQL filtered lists, MCP `list_documents`/`list_annotations`/etc. |
| | READ_HEAVY | 10/m | Complex aggregations, MCP `search_corpus` |
| **Write Operations** | WRITE_LIGHT | 30/m | GraphQL updates/deletes, WS tool approvals |
| | WRITE_MEDIUM | 10/m | GraphQL creates with validation |
| | WRITE_HEAVY | 5/m | Bulk operations, file uploads |
| **AI Operations** | AI_ANALYSIS | 5/m | AI analysis requests |
| | AI_EXTRACT | 10/m | AI extraction requests |
| | AI_QUERY | 20/m | AI query requests, WS agent chat |
| **Import/Export** | EXPORT | 5/h | Export operations |
| | IMPORT | 10/h | Import operations |
| **Admin** | ADMIN_OPERATION | 100/m | Admin operations |
| **WebSocket** | WS_CONNECT | 10/m | Connection rate per user |
| | WS_HEARTBEAT | 120/m | Heartbeat/ping messages |
| **MCP** | MCP_GLOBAL | 100/m | Global cap across all MCP tools |

### User Tier Multipliers

Rate limits are adjusted based on user type:

- **Superusers**: 10x base limit
- **Authenticated Users**: 2x base limit
- **Anonymous Users**: 1x base limit
- **Usage-Capped Users**: 0.5x multiplier on top of their tier

## Protocol-Specific Behavior

### GraphQL

GraphQL resolvers use decorators that raise `RateLimitExceeded` (a `GraphQLError` subclass) when limits are hit:

```python
from config.graphql.ratelimits import graphql_ratelimit, RateLimits

class MyMutation(graphene.Mutation):
    @login_required
    @graphql_ratelimit(rate=RateLimits.WRITE_MEDIUM)
    def mutate(root, info, **kwargs):
        pass
```

Error response:
```json
{
  "errors": [{
    "message": "Limit exceeded: Max 10 requests per minute. Please try again later."
  }]
}
```

### WebSocket

WebSocket consumers call `check_ws_rate_limit()` which sends a JSON error message but **keeps the connection open** (per design decision):

```python
from config.ratelimit.decorators import check_ws_rate_limit

class MyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # send_message=False because the connection hasn't been accepted yet
        # and sending a message would fail
        if await check_ws_rate_limit(self, "WS_CONNECT", send_message=False):
            await self.close(code=WS_CLOSE_RATE_LIMITED)
            return
        await self.accept()

    async def receive(self, text_data=None):
        if await check_ws_rate_limit(self, "AI_QUERY"):
            return  # Error message already sent to client
        # Process message...
```

Client receives:
```json
{
  "type": "RATE_LIMITED",
  "error": "Rate limit exceeded. Max 20 requests per minute.",
  "retry_after": 60
}
```

Rate-limited WebSocket consumers:
- `UnifiedAgentConversationConsumer` — `WS_CONNECT` on connect, `AI_QUERY` on queries, `WRITE_LIGHT` on tool approvals
- `NotificationConsumer` — `WS_CONNECT` on connect, `WS_HEARTBEAT` on messages
- `ThreadUpdatesConsumer` — `WS_CONNECT` on connect, `WS_HEARTBEAT` on messages

### MCP (Model Context Protocol)

MCP uses a two-layer check: a **global cap** (`MCP_GLOBAL`) plus **per-tool limits** mapped to existing rate categories:

```python
# In MCP ASGI app (automatic — no manual wiring needed)
# Global check runs on every request
# Per-tool check maps tool names to categories:
MCP_TOOL_RATE_MAP = {
    "list_public_corpuses": "READ_LIGHT",
    "list_documents": "READ_MEDIUM",
    "get_document_text": "READ_MEDIUM",
    "search_corpus": "READ_HEAVY",
    ...
}
```

MCP is always anonymous (no authentication), so no tier adjustment is applied. IP-based rate limiting is used exclusively.

The ASGI scope is threaded into tool handlers via a `ContextVar` so that per-tool rate limits can access the client IP.

### Django Views

The `view_ratelimit` decorator is a drop-in replacement for `django_ratelimit.decorators.ratelimit`:

```python
from config.ratelimit.decorators import view_ratelimit
from config.ratelimit.rates import RateLimits

@view_ratelimit(rate=RateLimits.AUTH_LOGIN, block=False)
def admin_login(request):
    if request.limited:
        # Show CAPTCHA or warning
        pass
```

## Configuration

### Environment Variables

Override any rate limit category via environment variables:

```bash
# Override specific rate limits
RATELIMIT_AUTH_LOGIN=10/m
RATELIMIT_READ_HEAVY=20/m
RATELIMIT_AI_QUERY=50/m
RATELIMIT_WS_CONNECT=20/m
RATELIMIT_MCP_GLOBAL=200/m

# Disable rate limiting entirely
RATELIMIT_DISABLE=true
```

### Django Settings

Core settings in `config/settings/ratelimit.py`:

```python
RATELIMIT_DISABLE = False         # Disable all rate limiting (env override)
RATELIMIT_USE_CACHE = "default"   # Cache backend for counters
RATELIMIT_FAIL_OPEN = True        # Allow requests if cache is down
RATELIMIT_KEY_PREFIX = "rl"       # Cache key prefix
RATELIMIT_IPV6_MASK = 64          # Group by /64 subnet
```

## Engine Details

### Fixed-Window Counter Algorithm

The engine uses a fixed-window counter algorithm:

1. Each rate limit is identified by `{prefix}:{group}:{key}:{window}`
2. `window = int(time.time()) // period` — integer division of current epoch by the period duration
3. `cache.add()` atomically creates the key if absent (set to 1)
4. `cache.incr()` atomically increments the counter
5. If `counter > count`, the request is rate limited

> **Burst note:** Fixed-window counters can allow up to 2x the configured rate at window boundaries (e.g. N requests at the end of one window + N at the start of the next). This is an accepted trade-off for the simplicity and atomicity of the algorithm. If stricter burst control is needed, consider migrating to a sliding-window or token-bucket algorithm.

### Cache Key Format

```
rl:graphql:resolve_documents:user:42:28571428
   ^   ^         ^             ^        ^
   |   |         |             |        window (time // period)
   |   |         |             rate limit key
   |   |         group name
   |   protocol prefix
   RATELIMIT_KEY_PREFIX
```

### Fail Behavior

When the cache is unavailable:
- `RATELIMIT_FAIL_OPEN = True` → Allow all requests (fail open, default)
- `RATELIMIT_FAIL_OPEN = False` → Deny all requests (fail closed)

## Monitoring

### Logging

Rate limit violations are logged at WARNING level:

```
WARNING Rate limit exceeded for resolve_documents — Key: user:42, Rate: 30/m
WARNING WS rate limit exceeded: AI_QUERY for key=user:42, rate=40/m
```

### Redis Monitoring

Monitor rate limit counters directly:

```bash
redis-cli KEYS "rl:*"
redis-cli GET "rl:graphql:resolve_documents:user:42:28571428"
```

## Testing

### Disabling in Tests

Rate limiting is controlled by `RATELIMIT_DISABLE`. Set it in test settings or per-test:

```python
@override_settings(RATELIMIT_DISABLE=True)
def test_my_feature(self):
    # Rate limiting disabled for this test
    pass
```

### Testing Rate Limits Directly

```python
from config.ratelimit.engine import is_rate_limited

class RateLimitEngineTest(TestCase):
    def test_basic_limiting(self):
        for i in range(3):
            self.assertFalse(is_rate_limited("test", "key", "3/m"))
        self.assertTrue(is_rate_limited("test", "key", "3/m"))
```

### Test Files

- `opencontractserver/tests/test_rate_limiting.py` — Integration tests for GraphQL rate limiting
- `opencontractserver/tests/test_unified_rate_limiting.py` — Comprehensive tests for all engine, key, rate, and adapter components

### Differences from Previous Implementation (`django-ratelimit`)

The previous rate limiting used `django-ratelimit` which set `X-RateLimit-*` response headers on GraphQL responses. The new unified engine does **not** emit these headers. This is a deliberate simplification: the rate limit state is server-side only, and clients should rely on the `RateLimitExceeded` error (GraphQL), `RATE_LIMITED` WebSocket frame, or HTTP 429 status (views) rather than inspecting response headers. If `X-RateLimit-Remaining` / `X-RateLimit-Limit` headers are needed, they can be added in middleware or per-adapter in `config/ratelimit/decorators.py`.

## Deployment Checklist

Before deploying rate limiting to production, verify the following:

1. **`RATELIMIT_PROXIES_COUNT`** - This is the most critical setting. It controls which entry in the `X-Forwarded-For` header is used to identify the client IP for rate limiting. Getting this wrong means either:
   - **Too low** (e.g. `0` behind a proxy): `X-Forwarded-For` is ignored and all requests appear to come from the proxy's IP, causing all users to share a single rate limit bucket.
   - **Too high** (e.g. `2` with only one proxy): An attacker can inject a fake IP in `X-Forwarded-For` to bypass rate limits entirely.

   | Deployment | Value | Reason |
   |------------|-------|--------|
   | No reverse proxy (direct) | `0` | `REMOTE_ADDR` is the real client IP |
   | Single proxy (Traefik/nginx) | `1` | Rightmost `X-Forwarded-For` entry is real |
   | CDN + load balancer | `2` | Second from right is real |

   Set via environment variable: `RATELIMIT_PROXIES_COUNT=1`

2. **Redis connectivity** - Rate limit counters are stored in the Django cache backend (Redis in production). Verify Redis is reachable and the `default` cache is configured correctly. If Redis goes down, behavior is controlled by `RATELIMIT_FAIL_OPEN`.

3. **`RATELIMIT_FAIL_OPEN`** - Defaults to `True` (allow requests when cache is unavailable). Set to `False` if you prefer to deny requests when Redis is unreachable (stricter security, but risks downtime).

4. **`RATELIMIT_DISABLE`** - Must be `False` in production (the default). Double-check this is not set to `True` in your environment.

5. **Edge rate limiting** - Ensure Traefik (or your reverse proxy) rate limits are configured as a first line of defense. Application-level rate limiting is a second layer.

6. **IPv6 subnet masking** - `RATELIMIT_IPV6_MASK=64` groups IPv6 addresses by /64 subnet to prevent bypassing limits with different addresses in the same allocation.

## Best Practices

1. **Use existing categories** — Map new operations to existing categories (READ_LIGHT, WRITE_MEDIUM, etc.) rather than creating new ones
2. **Use dynamic rates** — Apply `get_user_tier_rate()` for user-tier-aware limits on expensive operations
3. **Cache expensive operations** — Reduce the need for repeated queries
4. **Monitor and adjust** — Review logs and adjust limits based on production usage patterns
5. **Document limits** — Inform API consumers of applicable rate limits

## Troubleshooting

### Rate Limits Not Working

1. Check cache/Redis connection:
```python
from django.core.cache import cache
cache.set('test', 'value')
print(cache.get('test'))
```

2. Check settings:
```python
from django.conf import settings
print(settings.RATELIMIT_DISABLE)
```

3. Verify decorator order (login_required should come first):
```python
@login_required  # First
@graphql_ratelimit(...)  # Second
def mutate(...):
```

### Too Restrictive

- Increase limits via environment variables
- Use tier-adjusted rates for authenticated users
- Add caching to reduce request volume

### Bypassing Rate Limits

- Ensure IPv6 subnet masking is configured (`RATELIMIT_IPV6_MASK = 64`)
- Monitor for distributed attacks at the Traefik edge layer
- Consider additional security measures (CAPTCHA, etc.)

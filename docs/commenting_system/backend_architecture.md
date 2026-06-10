# Backend Architecture

## Overview

The backend implementation provides a complete foundation for the collaboration system with database models, business logic, permission checking, and automatic updates via Django signals.

## Database Models

All models are defined in [`opencontractserver/conversations/models.py`](../../opencontractserver/conversations/models.py).

### Core Models

#### Conversation

**Source**: [`models.py:602-976`](../../opencontractserver/conversations/models.py) — Thread or agent-based chat. Links to exactly one of `chat_with_corpus` or `chat_with_document` (enforced by DB constraint). Supports moderation (lock, pin) and soft-delete via `deleted_at`.

**Conversation Types**: `CHAT` (agent-based), `THREAD` (discussion)

**Key Methods**: `lock()`, `unlock()`, `pin()`, `unpin()`, `soft_delete_thread()`, `restore_thread()`, `can_moderate()`

**Managers**: `objects` (excludes soft-deleted), `all_objects` (includes soft-deleted)

#### ChatMessage

**Source**: [`models.py:978-1170`](../../opencontractserver/conversations/models.py) — Individual message within a conversation. Supports threading via `parent_message` self-FK, agent mentions via M2M to `AgentConfiguration`, and denormalized vote counts for read performance.

**Message Types**: `SYSTEM`, `HUMAN`, `LLM`

**Agent Types** (for LLM messages): `DOCUMENT_AGENT`, `CORPUS_AGENT`

**Message States**: `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ERROR`, `AWAITING_APPROVAL`

**Key Methods**: `soft_delete_message()`, `restore_message()`

### Voting Models

#### MessageVote

**Source**: [`models.py:1204-1255`](../../opencontractserver/conversations/models.py) — Tracks individual votes (`UPVOTE`/`DOWNVOTE`) on messages. Unique constraint on `(message, creator)` ensures one vote per user per message.

#### UserReputation

**Source**: [`models.py:1344-1403`](../../opencontractserver/conversations/models.py) — Cached reputation scores per user, globally (`corpus=NULL`) and per-corpus. Denormalized for read performance; updated automatically via signals. Formula: `reputation_score = total_upvotes_received - total_downvotes_received`.

### Moderation Models

#### CorpusModerator

**Source**: [`models.py:1435-1496`](../../opencontractserver/conversations/models.py) — Designates users as moderators with granular permissions stored in a JSON array. Unique constraint on `(corpus, user)`.

**Valid Permissions**: `lock_threads`, `pin_threads`, `delete_messages`, `delete_threads`

#### ModerationAction

**Source**: [`models.py:1526-1592`](../../opencontractserver/conversations/models.py) — Immutable audit log of all moderation actions. Records who did what, when, and why. Indexed for fast reporting.

**Action Types**: `LOCK_THREAD`, `UNLOCK_THREAD`, `PIN_THREAD`, `UNPIN_THREAD`, `DELETE_MESSAGE`, `DELETE_THREAD`, `RESTORE_MESSAGE`, `RESTORE_THREAD`

## Soft Delete Pattern

### Implementation

The soft delete pattern allows "deleting" records without removing them from the database, enabling data preservation, reversible moderation, and referential integrity.

**SoftDeleteQuerySet**: [`models.py:63-106`](../../opencontractserver/conversations/models.py) — Provides `delete()` (sets `deleted_at`), `hard_delete()` (actual removal), `alive()` (non-deleted), and `dead()` (only deleted) methods.

**SoftDeleteManager**: [`models.py:505-532`](../../opencontractserver/conversations/models.py) — Extends `BaseVisibilityManager`. When `alive_only=True` (default), automatically filters to non-deleted records.

### Querying Examples

```python
# Only active conversations
conversations = Conversation.objects.all()

# Include deleted conversations
all_conversations = Conversation.all_objects.all()

# Only deleted conversations
deleted = Conversation.all_objects.dead()

# Restore a deleted conversation
conversation.deleted_at = None
conversation.save()
```

## Django Signals

Signals provide automatic updates when data changes, ensuring consistency without requiring manual coordination.

**Source**: [`opencontractserver/conversations/signals.py`](../../opencontractserver/conversations/signals.py)

### Vote Count Updates

**Triggers**: `post_save` and `post_delete` on `MessageVote`

Recalculates `upvote_count` and `downvote_count` on the parent `ChatMessage` from scratch using aggregation. See [`signals.py:27-50`](../../opencontractserver/conversations/signals.py) for `recalculate_message_vote_counts()`.

### Reputation Calculation

**Triggers**: `post_save` and `post_delete` on `MessageVote`

Updates both global (`corpus=None`) and corpus-specific reputation for the message author. Aggregates all votes on the user's messages and stores in `UserReputation` via `update_or_create`. See [`signals.py:86-132`](../../opencontractserver/conversations/signals.py) for `update_user_reputation()`.

## Permission System

### Permission Hierarchy

1. **Superusers**: Full access to everything
2. **Corpus Owners**: All moderation permissions for their corpus
3. **Designated Moderators**: Specific permissions from `CorpusModerator.permissions`
4. **Object Creators**: Can manage their own content (delete own messages, etc.)

### Moderation Permission Check

**Source**: [`models.py:757-778`](../../opencontractserver/conversations/models.py) — `Conversation.can_moderate(user)` checks: corpus owner → designated moderator with any permissions → conversation creator (for non-corpus conversations).

GraphQL mutations enforce specific permissions on top of `can_moderate()`. For example, the lock thread mutation additionally checks that the moderator has `lock_threads` in their permissions list.

### Integration with Django Guardian

OpenContracts uses Django Guardian for object-level permissions. When threads are created, `view_conversation`, `change_conversation`, and `delete_conversation` permissions are assigned to the creator.

## Performance Optimizations

### 1. Denormalized Vote Counts

`upvote_count` and `downvote_count` on `ChatMessage` are updated via signals on every vote change (recalculated from scratch to avoid drift). Fast reads without JOIN or COUNT queries.

### 2. Denormalized Reputation Scores

`UserReputation` stores pre-calculated scores updated via signals. Separate global and per-corpus scores. Can be recalculated from source of truth if needed.

### 3. Database Indexes

Strategic indexes for common query patterns defined in each model's `Meta.indexes`. See the model source files for index definitions.

### 4. Prefetching in Queries

GraphQL resolvers use `select_related` and `prefetch_related` to avoid N+1 queries:

```python
Conversation.objects
    .filter(chat_with_corpus=corpus_id)
    .select_related("creator", "chat_with_corpus")
    .prefetch_related("chat_messages")
    .visible_to_user(user)
```

## Database Migrations

The collaboration system was built incrementally through migrations:

1. **0001_initial.py**: Base Conversation and ChatMessage models
2. **0006_messagevote_userreputation_and_more.py**: Added voting system
3. **0007_corpusmoderator_conversation_is_locked_and_more.py**: Added moderation system

All migrations are reversible and maintain data integrity.

## Design Patterns

1. **Soft Delete**: Reversible deletion with audit trail preservation
2. **Signal-Based Updates**: Automatic consistency without tight coupling
3. **Denormalization for Performance**: Trade storage for read performance on frequently accessed data
4. **Granular Permissions**: Flexible permission system supporting different moderator roles
5. **Audit Trail**: Immutable ModerationAction records for compliance and transparency

## Future Considerations

### Async Task Processing

Current signal handlers are synchronous. For scale, reputation calculation could be moved to Celery tasks (call `update_reputation_async.delay(user_id, corpus_id)` from the signal handler).

### Caching

High-traffic discussions could benefit from Django cache for conversation lookups with a short TTL.

### Real-time Updates

WebSocket consumers exist for agent chats and notifications. See [`docs/architecture/websocket/backend.md`](../architecture/websocket/backend.md) for the current WebSocket architecture.

## Engagement Metrics System (Epic #565)

### Overview

The engagement metrics system provides aggregated statistics about corpus participation, enabling dashboards, leaderboards, and analytics. Metrics are calculated asynchronously via Celery tasks.

### Database Model

#### CorpusEngagementMetrics

**Source**: [`opencontractserver/corpuses/models.py`](../../opencontractserver/corpuses/models.py) — OneToOne with `Corpus`. Stores denormalized counts: thread counts (total, active), message counts (total, 7-day, 30-day), contributor counts (unique, 30-day active), total upvotes, and average messages per thread. Auto-updated timestamp via `last_updated`.

### Celery Tasks

#### update_corpus_engagement_metrics

**Source**: [`opencontractserver/tasks/corpus_tasks.py`](../../opencontractserver/tasks/corpus_tasks.py) — Calculates and updates metrics for a single corpus. Counts threads, messages, contributors, and upvotes using Django ORM aggregations. Idempotent and safe to run multiple times.

#### update_all_corpus_engagement_metrics

**Source**: [`opencontractserver/tasks/corpus_tasks.py`](../../opencontractserver/tasks/corpus_tasks.py) — Batch update that queues individual `update_corpus_engagement_metrics` tasks for all corpuses. Suitable for periodic scheduling via celerybeat.

### GraphQL Integration

**Type**: `CorpusEngagementMetricsType` — see [`config/graphql/graphene_types.py`](../../config/graphql/graphene_types.py) for the full type definition. Exposes all metric fields. Returns `None` if metrics haven't been calculated yet.

**Corpus Field**: `engagementMetrics` on `CorpusType` — resolves the OneToOne relation.

**User Reputation Fields**: `reputationGlobal` and `reputationForCorpus(corpusId)` on `UserType`. Both return 0 if no reputation record exists.

**Leaderboard Queries**: [`config/graphql/queries.py`](../../config/graphql/queries.py) — `corpusLeaderboard(corpusId, limit)` and `globalLeaderboard(limit)` return top contributors by reputation score.

```graphql
# Example: Get corpus engagement metrics
query GetCorpusMetrics($corpusId: ID!) {
    corpus(id: $corpusId) {
        title
        engagementMetrics {
            totalThreads
            totalMessages
            uniqueContributors
            avgMessagesPerThread
            lastUpdated
        }
    }
}

# Example: Get corpus leaderboard
query GetLeaderboard($corpusId: ID!) {
    corpusLeaderboard(corpusId: $corpusId, limit: 5) {
        username
        reputationForCorpus(corpusId: $corpusId)
    }
}
```

### Testing

- **Model tests**: `opencontractserver/tests/test_corpus_engagement_metrics.py` (9 tests)
- **Task tests**: `opencontractserver/tests/test_engagement_metrics_tasks.py` (13 tests)
- **GraphQL tests**: `opencontractserver/tests/test_engagement_metrics_graphql.py` (9 tests)

**Total**: 31 tests covering model creation, metrics calculation, task execution, GraphQL queries, and permission checks.

---

*Last Updated: 2026-02-09*

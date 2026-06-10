# GraphQL API Reference

## Overview

The collaboration system exposes a comprehensive GraphQL API for creating and managing discussion threads, voting on messages, and moderating content. All mutations include rate limiting and permission checks.

## GraphQL Type Definitions

All type definitions are in [`config/graphql/graphene_types.py`](../../config/graphql/graphene_types.py). Key types:

### Enums

- **ConversationTypeEnum**: `CHAT` (agent-based), `THREAD` (discussion)
- **AgentTypeEnum**: `DOCUMENT_AGENT`, `CORPUS_AGENT`
- **MessageStateChoices**: `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ERROR`, `AWAITING_APPROVAL`
- **VoteType**: `UPVOTE`, `DOWNVOTE`
- **ModerationActionType**: `LOCK_THREAD`, `UNLOCK_THREAD`, `PIN_THREAD`, `UNPIN_THREAD`, `DELETE_MESSAGE`, `DELETE_THREAD`, `RESTORE_MESSAGE`, `RESTORE_THREAD`

### Object Types

- **ConversationType** — Thread or chat with context FK (`chatWithCorpus` or `chatWithDocument`), moderation fields (`isLocked`, `isPinned` + who/when), messages, and soft-delete timestamp
- **MessageType** — Message with `msgType`, `state`, threading (`parentMessage`/`replies`), denormalized vote counts, and `mentionedAgents`
- **MessageVoteType** — Vote linking user to message with `voteType`
- **UserReputationType** — Per-user reputation (global or per-corpus) with `reputationScore` and vote totals
- **CorpusModeratorType** — Moderator assignment with `permissions` array
- **ModerationActionType** — Audit record with `actionType`, `moderator`, and `reason`

## Queries

**Location**: `config/graphql/queries.py`

### conversations

**Query conversations by corpus or document**

```graphql
query GetConversations(
  $corpusId: ID
  $documentId: ID
  $conversationType: ConversationTypeEnum
) {
  conversations(
    corpusId: $corpusId
    documentId: $documentId
    conversationType: $conversationType
  ) {
    id
    title
    description
    conversationType
    isLocked
    isPinned
    creator {
      id
      username
    }
    allMessages {
      id
      content
      upvoteCount
      downvoteCount
    }
  }
}
```

**Implementation** (`queries.py:1217-1243`):
- Filters by document_id or corpus_id
- Uses ConversationFilter for flexible filtering
- Prefetches chat_messages for performance
- Respects user permissions via `visible_to_user()`

### userReputation

**Query user reputation (global or per-corpus)**

```graphql
query GetUserReputation($userId: ID!, $corpusId: ID) {
  userReputation(userId: $userId, corpusId: $corpusId) {
    reputationScore
    totalUpvotesReceived
    totalDownvotesReceived
    lastCalculatedAt
  }
}
```

### corpusModerators

**Query moderators for a corpus**

```graphql
query GetCorpusModerators($corpusId: ID!) {
  corpusModerators(corpusId: $corpusId) {
    id
    user {
      id
      username
    }
    permissions
    assignedBy {
      id
      username
    }
  }
}
```

### moderationActions

**Query moderation action audit log**

```graphql
query GetModerationActions(
  $conversationId: ID
  $moderatorId: ID
  $actionType: ModerationActionType
) {
  moderationActions(
    conversationId: $conversationId
    moderatorId: $moderatorId
    actionType: $actionType
  ) {
    id
    actionType
    moderator {
      username
    }
    reason
    createdAt
  }
}
```

## Mutations

### Thread Management Mutations

**Location**: `config/graphql/conversation_mutations.py`

#### createThread

**Create a new discussion thread**

**Rate Limit**: 10 per hour

```graphql
mutation CreateThread(
  $corpusId: ID!
  $title: String!
  $description: String
  $initialMessage: String!
) {
  createThread(
    corpusId: $corpusId
    title: $title
    description: $description
    initialMessage: $initialMessage
  ) {
    ok
    message
    obj {
      id
      title
      description
      allMessages {
        id
        content
      }
    }
  }
}
```

**Implementation** (`conversation_mutations.py:32-101`):
1. Validates corpus exists and user has access
2. Creates Conversation with type="thread"
3. Creates initial ChatMessage
4. Assigns permissions to creator
5. Returns created thread

**Example**:

```python
# GraphQL variables
{
  "corpusId": "Q29ycHVzVHlwZTox",
  "title": "Best practices for contract review",
  "description": "Let's discuss best practices for reviewing employment contracts",
  "initialMessage": "What are the key clauses to look for in employment contracts?"
}
```

#### createThreadMessage

**Post a new message to a thread**

**Rate Limit**: 30 per minute

```graphql
mutation CreateThreadMessage(
  $conversationId: ID!
  $content: String!
) {
  createThreadMessage(
    conversationId: $conversationId
    content: $content
  ) {
    ok
    message
    obj {
      id
      content
      creator {
        username
      }
      created
    }
  }
}
```

**Implementation** (`conversation_mutations.py:104-168`):
1. Validates conversation exists
2. Checks if thread is locked
3. Creates ChatMessage
4. Returns created message

**Errors**:
- Thread is locked
- User doesn't have access to corpus
- Conversation not found

#### replyToMessage

**Create a nested reply to a message**

**Rate Limit**: 30 per minute

```graphql
mutation ReplyToMessage(
  $parentMessageId: ID!
  $content: String!
) {
  replyToMessage(
    parentMessageId: $parentMessageId
    content: $content
  ) {
    ok
    message
    obj {
      id
      content
      parentMessage {
        id
        content
      }
    }
  }
}
```

**Implementation** (`conversation_mutations.py:171-237`):
1. Validates parent message exists
2. Checks if thread is locked
3. Creates ChatMessage with parent_message reference
4. Returns created reply

#### deleteConversation

**Soft delete a conversation**

**Rate Limit**: 20 per minute (via moderation rate limit)

```graphql
mutation DeleteConversation($conversationId: ID!) {
  deleteConversation(conversationId: $conversationId) {
    ok
    message
  }
}
```

**Implementation** (`conversation_mutations.py:240-287`):
1. Validates conversation exists
2. Checks user is creator OR has moderation permission
3. Calls `conversation.soft_delete_thread(user)`
4. Creates ModerationAction record

**Permissions**:
- Conversation creator can always delete
- Moderators with "delete_threads" permission can delete
- Corpus owners can delete

#### deleteMessage

**Soft delete a message**

**Rate Limit**: 20 per minute (via moderation rate limit)

```graphql
mutation DeleteMessage($messageId: ID!) {
  deleteMessage(messageId: $messageId) {
    ok
    message
  }
}
```

**Implementation** (`conversation_mutations.py:290-338`):
1. Validates message exists
2. Checks user is creator OR has moderation permission
3. Calls `message.soft_delete_message(user)`
4. Creates ModerationAction record

### Voting Mutations

**Location**: `config/graphql/voting_mutations.py`

#### voteMessage

**Upvote or downvote a message**

**Rate Limit**: 60 per minute

```graphql
mutation VoteMessage(
  $messageId: ID!
  $voteType: String!  # "upvote" or "downvote"
) {
  voteMessage(
    messageId: $messageId
    voteType: $voteType
  ) {
    ok
    message
    obj {
      id
      upvoteCount
      downvoteCount
    }
  }
}
```

**Implementation** (`voting_mutations.py:27-122`):
1. Validates message exists
2. Prevents self-voting
3. Creates or updates MessageVote
4. Signal automatically updates vote counts
5. Signal automatically updates reputation
6. Returns updated message

**Business Logic**:
- User can change their vote (upvote → downvote or vice versa)
- Voting on same type is idempotent (no error)
- Cannot vote on own messages

**Example**:

```python
# Upvote a message
{
  "messageId": "Q2hhdE1lc3NhZ2VUeXBlOjEwMA==",
  "voteType": "upvote"
}

# Change to downvote
{
  "messageId": "Q2hhdE1lc3NhZ2VUeXBlOjEwMA==",
  "voteType": "downvote"
}
```

#### removeVote

**Remove your vote from a message**

**Rate Limit**: 60 per minute

```graphql
mutation RemoveVote($messageId: ID!) {
  removeVote(messageId: $messageId) {
    ok
    message
    obj {
      id
      upvoteCount
      downvoteCount
    }
  }
}
```

**Implementation** (`voting_mutations.py:125-187`):
1. Validates message exists
2. Finds user's vote
3. Deletes MessageVote
4. Signal automatically updates vote counts
5. Signal automatically updates reputation
6. Returns updated message

### Moderation Mutations

**Location**: `config/graphql/moderation_mutations.py`

All moderation mutations check permissions and create ModerationAction audit records.

#### lockThread

**Lock a thread to prevent new messages**

**Rate Limit**: 20 per minute

```graphql
mutation LockThread(
  $conversationId: ID!
  $reason: String
) {
  lockThread(
    conversationId: $conversationId
    reason: $reason
  ) {
    ok
    message
    obj {
      id
      isLocked
      lockedBy {
        username
      }
      lockedAt
    }
  }
}
```

**Implementation** (`moderation_mutations.py:28-86`):
1. Validates conversation exists
2. Checks user can moderate
3. Checks specific "lock_threads" permission for moderators
4. Calls `conversation.lock(user, reason)`
5. Creates ModerationAction record
6. Returns updated conversation

**Permissions**:
- Corpus owners can always lock
- Moderators must have "lock_threads" permission

#### unlockThread

**Unlock a locked thread**

**Rate Limit**: 20 per minute

```graphql
mutation UnlockThread(
  $conversationId: ID!
  $reason: String
) {
  unlockThread(
    conversationId: $conversationId
    reason: $reason
  ) {
    ok
    message
    obj {
      id
      isLocked
    }
  }
}
```

**Implementation**: Similar to lockThread, calls `conversation.unlock(user, reason)`

#### pinThread

**Pin a thread to top of list**

**Rate Limit**: 20 per minute

```graphql
mutation PinThread(
  $conversationId: ID!
  $reason: String
) {
  pinThread(
    conversationId: $conversationId
    reason: $reason
  ) {
    ok
    message
    obj {
      id
      isPinned
      pinnedBy {
        username
      }
      pinnedAt
    }
  }
}
```

**Implementation** (`moderation_mutations.py:150-208`):
1. Validates conversation exists
2. Checks user can moderate
3. Checks specific "pin_threads" permission for moderators
4. Calls `conversation.pin(user, reason)`
5. Creates ModerationAction record
6. Returns updated conversation

**Permissions**:
- Corpus owners can always pin
- Moderators must have "pin_threads" permission

#### unpinThread

**Unpin a thread**

**Rate Limit**: 20 per minute

```graphql
mutation UnpinThread(
  $conversationId: ID!
  $reason: String
) {
  unpinThread(
    conversationId: $conversationId
    reason: $reason
  ) {
    ok
    message
    obj {
      id
      isPinned
    }
  }
}
```

**Implementation**: Similar to pinThread, calls `conversation.unpin(user, reason)`

#### addModerator

**Designate a user as a moderator with specific permissions**

**Rate Limit**: 20 per minute

```graphql
mutation AddModerator(
  $corpusId: ID!
  $userId: ID!
  $permissions: [String!]!
) {
  addModerator(
    corpusId: $corpusId
    userId: $userId
    permissions: $permissions
  ) {
    ok
    message
    obj {
      id
      user {
        username
      }
      permissions
    }
  }
}
```

**Implementation** (`moderation_mutations.py:272-357`):
1. Validates corpus exists
2. Checks user is corpus owner (only owners can add moderators)
3. Validates permissions against allowed list
4. Creates CorpusModerator record
5. Returns created moderator

**Valid Permissions**:
- `lock_threads`
- `pin_threads`
- `delete_messages`
- `delete_threads`

**Example**:

```python
{
  "corpusId": "Q29ycHVzVHlwZTox",
  "userId": "VXNlclR5cGU6NQ==",
  "permissions": ["lock_threads", "pin_threads"]
}
```

**Permissions**:
- Only corpus owners can add moderators

#### removeModerator

**Remove moderator designation**

**Rate Limit**: 20 per minute

```graphql
mutation RemoveModerator(
  $corpusId: ID!
  $userId: ID!
) {
  removeModerator(
    corpusId: $corpusId
    userId: $userId
  ) {
    ok
    message
  }
}
```

**Implementation** (`moderation_mutations.py:360-422`):
1. Validates corpus exists
2. Checks user is corpus owner
3. Deletes CorpusModerator record
4. Returns success

**Permissions**:
- Only corpus owners can remove moderators

#### updateModeratorPermissions

**Update an existing moderator's permissions**

**Rate Limit**: 20 per minute

```graphql
mutation UpdateModeratorPermissions(
  $corpusId: ID!
  $userId: ID!
  $permissions: [String!]!
) {
  updateModeratorPermissions(
    corpusId: $corpusId
    userId: $userId
    permissions: $permissions
  ) {
    ok
    message
    obj {
      id
      user {
        username
      }
      permissions
    }
  }
}
```

**Implementation** (`moderation_mutations.py:425-511`):
1. Validates corpus exists
2. Checks user is corpus owner
3. Validates new permissions
4. Updates CorpusModerator.permissions
5. Returns updated moderator

**Permissions**:
- Only corpus owners can update moderator permissions

## Rate Limiting

**Location**: `config/graphql/ratelimits.py`

### Rate Limit Configuration

See [`config/graphql/ratelimits.py`](../../config/graphql/ratelimits.py) for the `RateLimits` class and `@graphql_ratelimit` decorator. Key limits: `THREAD_CREATE` (10/h), `MESSAGE_CREATE` (30/m), `VOTE` (60/m), `MODERATE_ACTION` (20/m).

### Applied Rate Limits

| Mutation | Rate Limit | Reason |
|----------|------------|--------|
| createThread | 10/hour | Prevent thread spam |
| createThreadMessage | 30/minute | Prevent message spam |
| replyToMessage | 30/minute | Prevent reply spam |
| voteMessage | 60/minute | Prevent vote manipulation |
| removeVote | 60/minute | Prevent vote manipulation |
| lockThread | 20/minute | Prevent moderation abuse |
| unlockThread | 20/minute | Prevent moderation abuse |
| pinThread | 20/minute | Prevent moderation abuse |
| unpinThread | 20/minute | Prevent moderation abuse |
| deleteConversation | 20/minute | Prevent moderation abuse |
| deleteMessage | 20/minute | Prevent moderation abuse |
| addModerator | 20/minute | Prevent permission abuse |
| removeModerator | 20/minute | Prevent permission abuse |
| updateModeratorPermissions | 20/minute | Prevent permission abuse |

### Rate Limit Errors

When rate limit is exceeded, the mutation returns an error with code `RATE_LIMIT_EXCEEDED`.

## Error Handling

### Common Error Responses

```python
# Success response
{
  "ok": true,
  "message": "Thread created successfully",
  "obj": { /* created object */ }
}

# Error response
{
  "ok": false,
  "message": "You don't have permission to moderate this thread",
  "obj": null
}
```

### Error Types

1. **Permission Errors**:
   - "You don't have permission to moderate this thread"
   - "You don't have lock permission"
   - "Only corpus owners can add moderators"

2. **Validation Errors**:
   - "Thread is locked"
   - "Cannot vote on your own message"
   - "Invalid permissions specified"

3. **Not Found Errors**:
   - "Conversation not found"
   - "Message not found"
   - "User not found"

4. **Rate Limit Errors**:
   - "Rate limit exceeded. Please try again later."

## Schema Integration

All collaboration mutations are registered in [`config/graphql/mutations.py`](../../config/graphql/mutations.py). Thread mutations (`createThread`, `createThreadMessage`, `replyToMessage`, `deleteConversation`, `deleteMessage`), voting mutations (`voteMessage`, `removeVote`), and moderation mutations (`lockThread`, `unlockThread`, `pinThread`, `unpinThread`, `addModerator`, `removeModerator`, `updateModeratorPermissions`).

## Complete Example Workflow

### 1. Create a Thread

```graphql
mutation {
  createThread(
    corpusId: "Q29ycHVzVHlwZTox"
    title: "Contract Review Best Practices"
    description: "Discussion about reviewing employment contracts"
    initialMessage: "What clauses should we prioritize?"
  ) {
    ok
    message
    obj {
      id
      title
      allMessages {
        id
        content
      }
    }
  }
}
```

### 2. Reply to Initial Message

```graphql
mutation {
  replyToMessage(
    parentMessageId: "Q2hhdE1lc3NhZ2VUeXBlOjEwMA=="
    content: "I always check the non-compete clause first"
  ) {
    ok
    obj {
      id
      content
      parentMessage {
        content
      }
    }
  }
}
```

### 3. Vote on Reply

```graphql
mutation {
  voteMessage(
    messageId: "Q2hhdE1lc3NhZ2VUeXBlOjEwMQ=="
    voteType: "upvote"
  ) {
    ok
    obj {
      id
      upvoteCount
      downvoteCount
    }
  }
}
```

### 4. Pin Important Thread

```graphql
mutation {
  pinThread(
    conversationId: "Q29udmVyc2F0aW9uVHlwZTo1MA=="
    reason: "Important discussion for new users"
  ) {
    ok
    obj {
      id
      isPinned
      pinnedBy {
        username
      }
    }
  }
}
```

### 5. Check User Reputation

```graphql
query {
  userReputation(
    userId: "VXNlclR5cGU6NQ=="
    corpusId: "Q29ycHVzVHlwZTox"
  ) {
    reputationScore
    totalUpvotesReceived
    totalDownvotesReceived
  }
}
```

## Frontend Integration (Planned)

The frontend would typically use Apollo Client or similar:

```typescript
// Example React component (not yet implemented)
import { gql, useMutation } from '@apollo/client';

const CREATE_THREAD = gql`
  mutation CreateThread($corpusId: ID!, $title: String!, $initialMessage: String!) {
    createThread(corpusId: $corpusId, title: $title, initialMessage: $initialMessage) {
      ok
      message
      obj {
        id
        title
      }
    }
  }
`;

function CreateThreadForm({ corpusId }) {
  const [createThread, { loading, error }] = useMutation(CREATE_THREAD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createThread({
      variables: {
        corpusId,
        title: e.target.title.value,
        initialMessage: e.target.message.value,
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Agent Mentions

**Location**: `config/graphql/queries.py`, `opencontractserver/utils/mention_parser.py`

The agent mentions feature allows users to reference AI agents in chat messages using `@agent:slug` syntax. When a message containing agent mentions is created, the system automatically parses the content and links the mentioned agents to the message.

### Query: search_agents_for_mention

**Search for agents to autocomplete in mention UI**

**Location**: `config/graphql/queries.py:3031-3074`

**Rate Limit**: 100/minute (READ_LIGHT)

```graphql
query SearchAgentsForMention(
  $textSearch: String
  $corpusId: ID
) {
  searchAgentsForMention(
    textSearch: $textSearch
    corpusId: $corpusId
  ) {
    edges {
      node {
        id
        name
        slug
        description
        scope
        badgeConfig
      }
    }
  }
}
```

**Implementation**: See `config/graphql/queries.py:3067-3114`

1. Filters agents using `visible_to_user()` for permission enforcement
2. Searches by name, slug, or description using case-insensitive `icontains`
3. Returns global agents (GLOBAL scope) always
4. Returns corpus-scoped agents (CORPUS scope) only if `corpusId` is provided
5. Prioritizes exact matches, then partial matches
6. Uses Django relay connection for pagination

**Parameters**:
- `textSearch` (optional): Text to search for in agent name, slug, or description
- `corpusId` (optional): If provided, also returns corpus-scoped agents for this corpus

**Example**:

```graphql
# Search for agents matching "document"
query {
  searchAgentsForMention(
    searchText: "document"
    corpusId: "Q29ycHVzVHlwZTox"
    limit: 5
  ) {
    edges {
      node {
        id
        name
        slug
        description
      }
    }
  }
}
```

**Response**:

```json
{
  "data": {
    "searchAgentsForMention": {
      "edges": [
        {
          "node": {
            "id": "QWdlbnRDb25maWd1cmF0aW9uVHlwZTox",
            "name": "Document Assistant",
            "slug": "default-document-agent",
            "description": "AI assistant for analyzing individual documents"
          }
        }
      ]
    }
  }
}
```

### Mention Parsing

**Location**: `opencontractserver/utils/mention_parser.py`

When messages are created via mutations, the system parses Markdown content for mentions:

#### Supported Mention URL Patterns

| Pattern | Resource Type | Example |
|---------|--------------|---------|
| `/users/{userSlug}` | User | `[@john](/users/john-doe)` |
| `/c/{userIdent}/{corpusIdent}` | Corpus | `[@corpus](/c/john/my-corpus)` |
| `/d/{userIdent}/{docIdent}` | Document | `[@doc](/d/john/contract-1)` |
| `/d/{userIdent}/{corpusIdent}/{docIdent}` | Document (in corpus) | `[@doc](/d/john/corpus/doc)` |
| `/d/...?ann={annotationId}` | Annotation | `[@ann](/d/john/doc?ann=123)` |
| `/agents/{agentSlug}` | Agent (global) | `[@agent](/agents/default-document-agent)` |
| `/c/{userIdent}/{corpusIdent}/agents/{agentSlug}` | Agent (corpus-scoped) | `[@agent](/c/john/corpus/agents/my-agent)` |

#### parse_mentions_from_content()

Parses Markdown content and extracts mentioned resource IDs:

```python
from opencontractserver.utils.mention_parser import parse_mentions_from_content

markdown = '''
Check [@Document Assistant](/agents/default-document-agent) for analysis.
See [@contract](/d/john/contract-1) for details.
'''

mentioned = parse_mentions_from_content(markdown)
# Returns:
# {
#     'users': set(),
#     'documents': {'contract-1'},
#     'annotations': set(),
#     'corpuses': set(),
#     'agents': {'default-document-agent'}
# }
```

#### link_message_to_resources()

Links parsed mentions to a ChatMessage instance:

```python
from opencontractserver.utils.mention_parser import (
    parse_mentions_from_content,
    link_message_to_resources
)

# Parse mentions from message content
mentioned_ids = parse_mentions_from_content(message.content)

# Link resources to message (with permission checks)
result = link_message_to_resources(chat_message, mentioned_ids)
# Returns:
# {
#     'documents_linked': 1,
#     'annotations_linked': 0,
#     'users_mentioned': 0,
#     'corpuses_mentioned': 0,
#     'agents_linked': 1
# }
```

**Security**: The `link_message_to_resources()` function enforces server-side permission checks using `visible_to_user()` to ensure users can only mention agents they have access to.

### MessageType Updates

The `MessageType` now includes:

```graphql
type MessageType {
  # ... existing fields ...

  # Mentioned agents linked to this message
  mentionedAgents: [AgentConfigurationType!]!
}
```

### AgentConfigurationType

**Location**: `config/graphql/graphene_types.py`

```graphql
type AgentConfigurationType {
  id: ID!
  name: String!
  slug: String                    # URL-friendly identifier for mentions
  description: String
  scope: AgentScopeEnum!          # GLOBAL or CORPUS
  badgeConfig: JSONScalar         # Icon, color, label for UI display
  isActive: Boolean!
  isPublic: Boolean!
  corpus: CorpusType              # Only for CORPUS-scoped agents
  creator: UserType!
  created: DateTime!
  modified: DateTime!
}
```

### Database Schema

- **ChatMessage.mentioned_agents** — M2M to `AgentConfiguration` (see [`conversations/models.py`](../../opencontractserver/conversations/models.py))
- **AgentConfiguration.slug** — Unique `SlugField` for URL-friendly mentions (see [`agents/models.py`](../../opencontractserver/agents/models.py))

### Default Agents

The system creates default global agents during migration:

| Name | Slug | Description |
|------|------|-------------|
| Document Assistant | `default-document-agent` | AI assistant for analyzing individual documents |
| Corpus Assistant | `default-corpus-agent` | AI assistant for analyzing collections of documents |

### Frontend Integration

The frontend uses a TipTap editor extension for agent mentions:

```typescript
// Example: MentionAgentExtension configuration
const MentionAgent = Mention.extend({
  name: 'mentionAgent',
}).configure({
  suggestion: {
    char: '@',
    items: async ({ query }) => {
      const { data } = await client.query({
        query: SEARCH_AGENTS_FOR_MENTION,
        variables: { searchText: query, corpusId, limit: 10 }
      });
      return data.searchAgentsForMention.edges.map(e => e.node);
    },
    render: () => {
      // Returns popup component for autocomplete
    }
  }
});
```

The extension renders mentions as Markdown links:
- Input: User types `@doc` and selects "Document Assistant"
- Output: `[@Document Assistant](/agents/default-document-agent)`

### Test Coverage

Agent mention tests are in:
- `opencontractserver/tests/test_agents.py` - Backend tests for search query and mention parsing

## Leaderboard Queries

**Location**: `config/graphql/queries.py:3208-3278` (basic), `config/graphql/queries.py:3280-3515` (advanced)

### corpus_leaderboard

**Get top contributors for a corpus by reputation**

```graphql
query GetCorpusLeaderboard($corpusId: ID!, $limit: Int) {
  corpusLeaderboard(corpusId: $corpusId, limit: $limit) {
    id
    username
    reputationForCorpus(corpusId: $corpusId)
  }
}
```

### global_leaderboard

**Get top contributors globally by reputation**

```graphql
query GetGlobalLeaderboard($limit: Int) {
  globalLeaderboard(limit: $limit) {
    id
    username
    reputationGlobal
  }
}
```

### leaderboard (Advanced)

**Get leaderboard with multiple metrics and time scopes**

**Location**: `config/graphql/queries.py:3281-3510`

```graphql
query GetLeaderboard(
  $metric: LeaderboardMetricEnum!
  $scope: LeaderboardScopeEnum
  $corpusId: ID
  $limit: Int
) {
  leaderboard(
    metric: $metric
    scope: $scope
    corpusId: $corpusId
    limit: $limit
  ) {
    metric
    scope
    corpusId
    entries {
      user {
        id
        username
      }
      rank
      score
      breakdown {
        key
        value
      }
    }
    generatedAt
  }
}
```

**Supported Metrics** (LeaderboardMetricEnum):
- `BADGES` - Rank by badge count
- `MESSAGES` - Rank by message count
- `THREADS` - Rank by thread creation count
- `ANNOTATIONS` - Rank by annotation count
- `REPUTATION` - Rank by reputation score

**Supported Scopes** (LeaderboardScopeEnum):
- `ALL_TIME` - All-time statistics (default)
- `MONTHLY` - Last 30 days
- `WEEKLY` - Last 7 days

### community_stats

**Get overall community engagement statistics**

```graphql
query GetCommunityStats($corpusId: ID) {
  communityStats(corpusId: $corpusId) {
    totalUsers
    activeUsersLast30Days
    totalMessages
    totalThreads
    totalAnnotations
    totalBadgesAwarded
    topContributors {
      user {
        id
        username
      }
      score
    }
  }
}
```

---

*Last Updated: 2026-01-09*

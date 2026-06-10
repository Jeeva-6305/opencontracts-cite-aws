# API Reference

> **Last Updated:** 2026-01-09

## Django Models

**Source:** [`opencontractserver/extracts/models.py`](../../opencontractserver/extracts/models.py)

### Extraction Models

#### Fieldset

Defines a collection of fields to extract from documents.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `CharField(256)` | Fieldset name |
| `description` | `TextField` | Description of purpose |
| `corpus` | `OneToOneField(Corpus)` | Optional link for metadata schemas (nullable) |

**Permissions:**
- `permission_fieldset` - Base permission
- `create_fieldset` - Create new fieldsets
- `read_fieldset` - View fieldsets
- `update_fieldset` - Modify fieldsets
- `remove_fieldset` - Delete fieldsets
- `comment_fieldset` - Comment on fieldsets
- `publish_fieldset` - Publish fieldsets

---

#### Column

Defines individual data fields within a fieldset. Supports both automated extraction and manual entry modes.

| Field | Type | Description |
|-------|------|-------------|
| **Basic Fields** | | |
| `name` | `CharField(256)` | Column name |
| `fieldset` | `ForeignKey(Fieldset)` | Parent fieldset |
| **Extraction Configuration** | | |
| `query` | `TextField` | Extraction prompt (nullable) |
| `match_text` | `TextField` | Alternative to query for text matching (nullable) |
| `must_contain_text` | `TextField` | Required text constraint (nullable) |
| `limit_to_label` | `CharField(512)` | Annotation label filter (nullable) |
| `instructions` | `TextField` | Additional extraction instructions (nullable) |
| **Output Configuration** | | |
| `output_type` | `TextField` | Python type as string (e.g., `str`, `int`, `list[str]`) |
| `extract_is_list` | `BooleanField` | Wrap output in `List[]` (default: `False`) |
| **Task Configuration** | | |
| `task_name` | `CharField(1024)` | Celery task path (default: `doc_extract_query_task`) |
| **Manual Entry Fields** | | |
| `is_manual_entry` | `BooleanField` | `True` for manual metadata, `False` for extraction (default: `False`) |
| `data_type` | `CharField(32)` | Structured data type for manual entry (see Data Types below) |
| `default_value` | `JSONField` | Default value for manual entry fields (nullable) |
| `help_text` | `TextField` | Help text to display for manual entry fields (nullable) |
| `display_order` | `IntegerField` | Order in which to display manual entry fields (default: `0`) |
| `validation_config` | `JSONField` | Validation rules for manual entry (nullable) |

**Data Types (for manual entry):**
- `STRING` - Single line text
- `TEXT` - Multi-line text
- `BOOLEAN` - True/False
- `INTEGER` - Whole numbers
- `FLOAT` - Decimal numbers
- `DATE` - Date only (YYYY-MM-DD format)
- `DATETIME` - Date and time (ISO format)
- `URL` - Web addresses
- `EMAIL` - Email addresses
- `CHOICE` - Single selection (requires `choices` in `validation_config`)
- `MULTI_CHOICE` - Multiple selections (requires `choices` in `validation_config`)
- `JSON` - JSON objects or arrays

**Validation Config Structure:**
```json
{
  "required": true,
  "choices": ["option1", "option2"],
  "min_value": 0,
  "max_value": 100,
  "min_length": 1,
  "max_length": 500,
  "regex_pattern": "^[A-Z]+"
}
```

**Permissions:**
- `permission_column` - Base permission
- `create_column` - Create new columns
- `read_column` - View columns
- `update_column` - Modify columns
- `remove_column` - Delete columns
- `comment_column` - Comment on columns
- `publish_column` - Publish columns

---

#### Extract

Represents an extraction job.

| Field | Type | Description |
|-------|------|-------------|
| `corpus` | `ForeignKey(Corpus)` | Target corpus (nullable) |
| `documents` | `ManyToManyField(Document)` | Documents to process |
| `name` | `CharField(512)` | Extract name |
| `fieldset` | `ForeignKey(Fieldset)` | Fields to extract |
| `corpus_action` | `ForeignKey(CorpusAction)` | Associated CorpusAction if triggered by automation (nullable) |
| **Status Fields** | | |
| `created` | `DateTimeField` | Creation time (auto-set) |
| `started` | `DateTimeField` | Processing start time (nullable) |
| `finished` | `DateTimeField` | Completion time (nullable) |
| `error` | `TextField` | Error message if failed (nullable) |

**Permissions:**
- `permission_extract` - Base permission
- `create_extract` - Create new extracts
- `read_extract` - View extracts
- `update_extract` - Modify extracts
- `remove_extract` - Delete extracts
- `comment_extract` - Comment on extracts
- `publish_extract` - Publish extracts

---

#### Datacell

Stores extracted data for a document/column pair. Supports both automated extraction results and manual metadata entry.

| Field | Type | Description |
|-------|------|-------------|
| **Relations** | | |
| `extract` | `ForeignKey(Extract)` | Parent extract (nullable for manual metadata) |
| `column` | `ForeignKey(Column)` | Column definition |
| `document` | `ForeignKey(Document)` | Source document |
| `sources` | `ManyToManyField(Annotation)` | Source annotations used for extraction |
| **Data Fields** | | |
| `data` | `JSONField` | Extracted or entered data (nullable) |
| `data_definition` | `TextField` | Data type description |
| `corrected_data` | `JSONField` | Human-corrected data (nullable) |
| **Status Fields** | | |
| `started` | `DateTimeField` | Processing start time (nullable) |
| `completed` | `DateTimeField` | Processing completion time (nullable) |
| `failed` | `DateTimeField` | Failure time (nullable) |
| `stacktrace` | `TextField` | Error details if failed (nullable) |
| **Approval Workflow** | | |
| `approved_by` | `ForeignKey(User)` | User who approved the cell (nullable) |
| `rejected_by` | `ForeignKey(User)` | User who rejected the cell (nullable) |
| **Debugging** | | |
| `llm_call_log` | `TextField` | Captured LLM message history for debugging extraction issues (nullable) |

**Unique Constraint:** For manual metadata (where `extract` is null), only one datacell per document/column combination is allowed.

**Permissions:**
- `permission_datacell` - Base permission
- `create_datacell` - Create new datacells
- `read_datacell` - View datacells
- `update_datacell` - Modify datacells
- `remove_datacell` - Delete datacells
- `comment_datacell` - Comment on datacells
- `publish_datacell` - Publish datacells

## Celery Tasks

### Orchestration Tasks

#### `run_extract`

Main extraction orchestrator that creates datacells and queues processing.

```python
@shared_task
def run_extract(
    extract_id: str | int,
    user_id: str | int
) -> None:
    """
    Creates Datacells for each document × column combination
    and queues extraction tasks.

    Args:
        extract_id: ID of Extract to process
        user_id: ID of user running extraction
    """
```

#### `mark_extract_complete`

Marks an extract as finished after all datacells complete.

```python
@shared_task
def mark_extract_complete(
    extract_id: str | int
) -> None:
    """
    Updates Extract.finished timestamp and aggregates
    any errors from failed datacells.

    Args:
        extract_id: ID of Extract to mark complete
    """
```

### Extraction Tasks

#### `doc_extract_query_task`

Performs structured data extraction using agent framework.

```python
@celery_task_with_async_to_sync()
async def doc_extract_query_task(
    cell_id: int,
    similarity_top_k: int = 10,
    max_token_length: int = 64000
) -> None:
    """
    Extracts data for a single datacell using PydanticAI agents.

    Args:
        cell_id: Datacell ID to process
        similarity_top_k: Number of similar chunks to retrieve
        max_token_length: Maximum context tokens
    """
```

## Agent System

### Factories

#### `UnifiedAgentFactory`

Creates framework-agnostic agents for document and corpus interactions.

```python
class UnifiedAgentFactory:
    @classmethod
    def for_corpus(
        cls,
        corpus_id: int,
        user_id: int,
        framework: str = None
    ) -> CoreAgent:
        """Create agent for corpus-level queries."""

    @classmethod
    def for_document(
        cls,
        document_id: int,
        user_id: int,
        framework: str = None
    ) -> CoreAgent:
        """Create agent for document-level queries."""
```

#### `UnifiedVectorStoreFactory`

Creates appropriate vector store based on framework.

```python
class UnifiedVectorStoreFactory:
    @classmethod
    def create(
        cls,
        framework: str,
        corpus_id: int = None,
        user_id: int = None,
        **kwargs
    ) -> VectorStore:
        """
        Create vector store for specified framework.

        Args:
            framework: "pydantic_ai"
            corpus_id: Filter by corpus
            user_id: Filter by user
            **kwargs: Additional configuration
        """
```

### Core Classes

#### `CoreAgent`

Base agent class providing unified interface.

```python
class CoreAgent:
    async def query(
        self,
        query: str,
        tools: list[str] = None
    ) -> AsyncIterator[Event]:
        """
        Process a query and stream events.

        Yields:
            StartEvent: Initial event with IDs
            ContentEvent: Incremental content
            SourcesEvent: Source annotations
            FinishEvent: Final results
        """

    async def approve_tool(
        self,
        tool_call_id: str
    ) -> None:
        """Approve a pending tool call."""
```

#### `CoreAnnotationVectorStore`

Framework-agnostic vector store implementation.

```python
class CoreAnnotationVectorStore:
    def __init__(
        self,
        corpus_id: int = None,
        user_id: int = None,
        embedder_path: str = None,
        embed_dim: int = 384
    ):
        """Initialize vector store with filters."""

    def search(
        self,
        query: VectorSearchQuery
    ) -> list[VectorSearchResult]:
        """Execute vector similarity search."""
```

## WebSocket Consumers

### `UnifiedAgentConsumer`

Handles all agent conversation contexts (corpus, document, standalone) over WebSocket.

```python
class UnifiedAgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Authenticate, parse query params, and initialize context."""

    async def receive(self, text_data):
        """Process incoming queries and approval decisions."""

    async def disconnect(self, close_code):
        """Clean up on disconnection."""
```

**WebSocket URL:** `/ws/agent-chat/?corpus_id=X&document_id=X`

**Query Parameters:** `corpus_id`, `document_id`, `conversation_id`, `agent_id`

**Message Types:**

Client → Server:
```json
{
    "query": "string",                    // User question
    "approval_decision": true,            // Tool approval
    "llm_message_id": "string"            // For approval context
}
```

Server → Client:
```json
{
    "type": "ASYNC_START|ASYNC_CONTENT|ASYNC_SOURCES|ASYNC_FINISH|...",
    "data": {}  // Type-specific payload
}
```

See [WebSocket Backend Documentation](../architecture/websocket/backend.md) for full details on all consumers (`UnifiedAgentConsumer`, `ThreadUpdatesConsumer`, `NotificationUpdatesConsumer`).

## GraphQL API

### Queries

#### Extract Queries

```graphql
query GetExtracts {
    extracts {
        edges {
            node {
                id
                name
                started
                finished
                datacells {
                    edges {
                        node {
                            id
                            data
                            completed
                        }
                    }
                }
            }
        }
    }
}
```

#### Fieldset Queries

```graphql
query GetFieldsets {
    fieldsets {
        edges {
            node {
                id
                name
                description
                columns {
                    edges {
                        node {
                            id
                            name
                            outputType
                        }
                    }
                }
            }
        }
    }
}
```

### Mutations

#### Start Extract

```graphql
mutation StartExtract($extractId: ID!) {
    startExtract(extractId: $extractId) {
        ok
        message
        objId
    }
}
```

#### Create Fieldset

```graphql
mutation CreateFieldset($name: String!, $description: String!) {
    createFieldset(
        name: $name
        description: $description
    ) {
        ok
        objId
        message
    }
}
```

## Configuration Settings

### Agent Framework

```python
# settings.py

# Framework selection: "pydantic_ai"
LLMS_DEFAULT_AGENT_FRAMEWORK = "pydantic_ai"

# Model configuration
LLMS_DEFAULT_MODEL = "gpt-4-turbo"
LLMS_MAX_TOKENS = 4096
LLMS_TEMPERATURE = 0.7

# Embedder settings
PREFERRED_EMBEDDER = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIMENSIONS = 384
```

### Celery Configuration

```python
# Celery settings
CELERY_BROKER_URL = 'redis://localhost:6379'
CELERY_RESULT_BACKEND = 'redis://localhost:6379'

# Task routing
CELERY_TASK_ROUTES = {
    'opencontractserver.tasks.extract_orchestrator_tasks.*': {
        'queue': 'extract'
    },
    'opencontractserver.tasks.data_extract_tasks.*': {
        'queue': 'ml'
    }
}
```

### WebSocket Configuration

```python
# Channel layers
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}

# WebSocket settings
WEBSOCKET_TIMEOUT = 300  # seconds
WEBSOCKET_MAX_MESSAGE_SIZE = 1048576  # 1MB
```

## Error Codes

### WebSocket Close Codes

| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 4001 | Authentication failed |
| 4004 | Resource not found |
| 4008 | Rate limit exceeded |
| 5000 | Internal server error |

### Extraction Error Types

| Error | Description |
|-------|-------------|
| `ExtractionTimeout` | Task exceeded time limit |
| `InvalidOutputType` | Unsupported type specified |
| `DocumentNotFound` | Document doesn't exist |
| `InsufficientPermissions` | User lacks access |
| `AgentError` | LLM processing failed |

## Utilities

### Type Parsing

```python
from opencontractserver.utils.etl import parse_model_or_primitive

# Parse string type to Python type
python_type = parse_model_or_primitive("list[str]")
```

### Embedding Generation

```python
from opencontractserver.annotations.models import generate_embeddings_from_text

# Generate embeddings for text
embeddings = generate_embeddings_from_text(
    text="Sample text",
    embedder_path="sentence-transformers/all-MiniLM-L6-v2"
)
```

### Async Decorators

```python
from opencontractserver.shared.decorators import celery_task_with_async_to_sync

@celery_task_with_async_to_sync()
async def my_async_task():
    # Async task implementation
    pass
```

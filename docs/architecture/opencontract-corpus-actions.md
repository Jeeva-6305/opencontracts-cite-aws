# CorpusAction System in OpenContracts

Last Updated: 2026-01-09

The CorpusAction system in OpenContracts automates document processing when documents are added to or edited in a corpus. This system is designed to be flexible, allowing for different types of actions to be triggered based on configuration.

> **Note on Document-Corpus Relationships**: The `DocumentPath` model (defined in [`opencontractserver/documents/models.py`](../../opencontractserver/documents/models.py)) is the **source of truth** for tracking where documents live within corpuses. It implements the Path Tree from the dual-tree versioning architecture and tracks lifecycle events (import, update, move, delete, restore). See [`docs/architecture/document_versioning.md`](./document_versioning.md) for the full architecture.

## Action Types

Users have three options for registering actions to run automatically on documents:

1. **Fieldset-based Extractions** - Run data extraction using configured fieldsets and columns
2. **Analyzer-based Analyses** - Execute analyses using task-based or Gremlin-hosted analyzers
3. **Agent-based Actions** - Invoke AI agents with pre-authorized tools for intelligent document processing

## Deferred Action Architecture

**Important**: Corpus actions only run after documents are fully processed (parsed, thumbnailed, embedded). This is achieved through an event-driven architecture:

1. When a document is **added to a corpus** (via `Corpus.add_document()` or `import_document()`):
   - If document is **ready** (`backend_lock=False`): trigger actions immediately
   - If document is **processing** (`backend_lock=True`): skip it (handled later)

2. When document **processing completes** (`set_doc_lock_state(locked=False)`):
   - Query `DocumentPath` for all corpuses the document belongs to
   - Trigger ADD_DOCUMENT actions for each corpus

This ensures agent tools like `load_document_text` have access to fully parsed content.

## Action Execution Overview

The following flowchart illustrates the complete CorpusAction system:

```mermaid
graph TD
    A[Document Added to Corpus] -->|Via add_document / import_document| B{Check backend_lock}
    B -->|locked=True| D[Skip - Document Processing]
    B -->|locked=False| E[Process Corpus Action]

    D --> F[Parsing Pipeline]
    F --> G[set_doc_lock_state]
    G -->|locked=False| H[Query DocumentPath for Corpuses]
    H --> E

    E --> J{Check CorpusAction Type}
    J -->|Fieldset| K[Run Extract]
    J -->|Analyzer| L[Run Analysis]
    J -->|Agent Config| M[Run Agent Action]

    K --> N[Create Datacells]
    L --> O[Create Analysis Record]
    M --> P[Create AgentActionResult]
```

## Key Components

1. **CorpusAction Model**: Defines the action to be taken, including:
   - Reference to the associated corpus
   - Trigger type (ADD_DOCUMENT, EDIT_DOCUMENT)
   - Reference to ONE of: Fieldset, Analyzer, or AgentConfiguration
   - Optional: `task_instructions` and `pre_authorized_tools` for agent actions

2. **CorpusActionTrigger Enum**: Defines trigger events
   - `ADD_DOCUMENT` - Fires when documents are added
   - `EDIT_DOCUMENT` - Fires when documents are edited

3. **Direct Trigger Points** (no M2M signals — invoked directly in code):
   - `Corpus.add_document()` — triggers actions if document is ready (`backend_lock=False`)
   - `import_document()` — same pattern as `add_document()`
   - `set_doc_lock_state()` — triggers deferred actions when document processing completes, queries `DocumentPath` for corpus membership

5. **Celery Tasks**: Perform the actual processing asynchronously

## Process Flow

### 1. Document Addition with Direct Triggering

When a document is added to a corpus via `Corpus.add_document()`, actions are triggered directly if the document is ready:

```python
# In Corpus.add_document() (opencontractserver/corpuses/models.py)
# After creating the DocumentPath record:
if not document.backend_lock:
    # Document is ready — trigger actions immediately
    process_corpus_action.si(
        corpus_id=self.id,
        document_ids=[document.id],
        user_id=user.id,
        trigger=CorpusActionTrigger.ADD_DOCUMENT,
    ).apply_async()
# If document is locked, actions are deferred to set_doc_lock_state()
```

### 2. Processing Complete (Deferred Actions)

When document parsing finishes, `set_doc_lock_state()` triggers deferred actions using `DocumentPath` as the source of truth:

```python
# In set_doc_lock_state() (opencontractserver/tasks/doc_tasks.py)
# After unlocking the document:
corpus_ids = list(
    DocumentPath.objects.filter(
        document=document,
        is_deleted=False,
        is_current=True,
    ).values_list("corpus_id", flat=True).distinct()
)

for corpus_id in corpus_ids:
    process_corpus_action.si(
        corpus_id=corpus_id,
        document_ids=[document.id],
        user_id=document.creator_id,
        trigger=CorpusActionTrigger.ADD_DOCUMENT,
    ).apply_async()
```

### 3. Action Processing

The `process_corpus_action` task determines the appropriate action based on configuration:

```python
@shared_task
def process_corpus_action(
    corpus_id: str | int,
    document_ids: list[str | int],
    user_id: str | int,
    trigger: str | None = None,
):
    # Build query for matching actions
    base_query = Q(corpus_id=corpus_id, disabled=False) | Q(
        run_on_all_corpuses=True, disabled=False
    )
    if trigger:
        base_query &= Q(trigger=trigger)

    actions = CorpusAction.objects.filter(base_query)

    for action in actions:
        if action.fieldset:
            # Path A: Run Extract with Fieldset
            extract, created = Extract.objects.get_or_create(
                corpus=action.corpus,
                fieldset=action.fieldset,
                creator_id=user_id,
                corpus_action=action,
            )
            # Create datacells and queue extraction tasks...

        elif action.analyzer:
            # Path B: Run Analysis
            if action.analyzer.task_name:
                # Task-based analyzer (decorated with @doc_analyzer_task)
                run_task_name_analyzer.si(analysis_id=analysis.id, ...).apply_async()
            else:
                # Gremlin-hosted analyzer
                start_analysis.s(analysis_id=analysis.id, ...).apply_async()

        elif action.agent_config:
            # Path C: Run Agent Action
            for document_id in document_ids:
                run_agent_corpus_action.delay(
                    corpus_action_id=action.id,
                    document_id=document_id,
                    user_id=user_id,
                )
```

## Behavior Matrix

| Scenario | add_document/import_document | set_doc_lock_state |
|----------|------------------------------|-------------------|
| New doc uploaded to corpus | Skipped (locked) | Triggers actions via DocumentPath |
| Existing processed doc added | Triggers immediately | N/A (already unlocked) |
| Doc in multiple corpuses | N/A | Triggers for ALL corpuses via DocumentPath |
| Doc not in any corpus | N/A | No action |

## Creating Corpus Actions

### Via GraphQL

```graphql
# Fieldset-based action
mutation {
  create_corpus_action(
    corpusId: "Q29ycHVzVHlwZTox"
    trigger: "add_document"
    name: "Extract Contract Data"
    fieldsetId: "RmllbGRzZXRUeXBlOjE="
  ) {
    ok
    obj { id name }
  }
}

# Analyzer-based action
mutation {
  create_corpus_action(
    corpusId: "Q29ycHVzVHlwZTox"
    trigger: "add_document"
    name: "Classify Documents"
    analyzerId: "QW5hbHl6ZXJUeXBlOjE="
  ) {
    ok
    obj { id name }
  }
}

# Agent-based action
mutation {
  create_corpus_action(
    corpusId: "Q29ycHVzVHlwZTox"
    trigger: "add_document"
    name: "Auto-Generate Summary"
    agentConfigId: "QWdlbnRDb25maWd1cmF0aW9uVHlwZTox"
    taskInstructions: "Analyze this document and create a summary using update_document_summary tool."
    preAuthorizedTools: ["load_document_text", "update_document_summary"]
  ) {
    ok
    obj { id name taskInstructions }
  }
}
```

## Related Documentation

- [Using Corpus Actions (User Guide)](../corpus_actions/intro_to_corpus_actions.md)
- [Agent-Based Corpus Actions Design](./agent_corpus_actions_design.md)
- [Pipeline Overview](../pipelines/pipeline_overview.md)
- [LLM Framework](./llms/README.md)

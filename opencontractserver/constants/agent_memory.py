"""
Constants for the agent memory system.

The memory system allows agents to accumulate per-corpus insights from
conversations, stored as first-class markdown Documents visible to users.
"""

# ---------------------------------------------------------------------------
# Memory document identification
# ---------------------------------------------------------------------------
MEMORY_DOCUMENT_TITLE = "Corpus Memory"
# Stable internal filename for the memory document.  Decoupled from
# MEMORY_DOCUMENT_TITLE so that title changes (e.g., localisation) do not
# break storage-layer lookups.
MEMORY_DOCUMENT_FILENAME = "corpus_memory.md"

# ---------------------------------------------------------------------------
# Token thresholds for hybrid retrieval
# ---------------------------------------------------------------------------
# When the memory document is smaller than this (in estimated tokens), inject
# the full content into the agent system prompt.  Above this threshold, fall
# back to semantic search over individual memory sections.
MEMORY_FULL_INJECTION_MAX_TOKENS: int = 2000

# Number of memory sections to retrieve via keyword-overlap scoring when the
# document exceeds MEMORY_FULL_INJECTION_MAX_TOKENS.
MEMORY_KEYWORD_SEARCH_TOP_K: int = 5

# ---------------------------------------------------------------------------
# Curation settings
# ---------------------------------------------------------------------------
# Minutes of idle time after the last message before a conversation is
# considered "ended" and eligible for memory curation.
MEMORY_CURATION_IDLE_MINUTES: int = 30

# Minimum number of human+LLM messages required before a conversation is
# worth curating.  Very short exchanges rarely yield useful patterns.
MEMORY_CURATION_MIN_MESSAGES: int = 4

# Maximum estimated tokens of conversation history sent to the curation LLM.
# Longer conversations are truncated (most recent messages preserved).
MEMORY_CURATION_MAX_CONVERSATION_TOKENS: int = 8000

# Maximum number of new insights the curation LLM may propose per run.
MEMORY_MAX_INSIGHTS_PER_CURATION: int = 5

# ---------------------------------------------------------------------------
# Section headers in the memory document
# ---------------------------------------------------------------------------
MEMORY_SECTION_COLLECTION_PATTERNS = "Collection Patterns"
MEMORY_SECTION_QUERY_PATTERNS = "Query Patterns"

# Placeholder text shown in empty memory sections.  Used both in the
# template and in the "is memory still empty?" check.
MEMORY_EMPTY_COLLECTION_PLACEHOLDER = "_No collection patterns recorded yet._"
MEMORY_EMPTY_QUERY_PLACEHOLDER = "_No query patterns recorded yet._"

# ---------------------------------------------------------------------------
# Celery beat schedule interval (seconds)
# ---------------------------------------------------------------------------
MEMORY_CURATION_CHECK_INTERVAL_SECONDS: float = 600.0  # 10 minutes

# ---------------------------------------------------------------------------
# Dispatch limit for periodic curation checker
# ---------------------------------------------------------------------------
# Maximum number of conversations to dispatch for curation in a single
# periodic-task run.  Prevents a thundering herd on large installations.
MEMORY_CURATION_BATCH_LIMIT: int = 500

# ---------------------------------------------------------------------------
# Content validation limits
# ---------------------------------------------------------------------------
# Maximum character length for a single insight submitted via the
# asuggest_memory_update tool.  Prevents LLM-generated content from
# inflating the memory document with excessively long entries.
MEMORY_INSIGHT_MAX_LENGTH: int = 500

# ---------------------------------------------------------------------------
# System prompt injection prefix
# ---------------------------------------------------------------------------
MEMORY_INJECTION_PREFIX = (
    "\n\n## Corpus Memory\n"
    "The following insights were accumulated from previous interactions "
    "with this corpus. Use them to provide better, more informed responses:\n\n"
)

# ---------------------------------------------------------------------------
# Curation prompts
# ---------------------------------------------------------------------------

# Stage 1: privacy-preserving conversation summarisation
MEMORY_SUMMARISE_SYSTEM_PROMPT = """\
You are summarising a conversation for memory curation purposes.
Focus ONLY on:
- Types of questions asked (not the specific questions)
- Search strategies and tool usage patterns that were effective or ineffective
- Document structure patterns discovered during the conversation
- Common topics and what approaches worked well

Do NOT include:
- Specific user questions or answers
- Personal information about users
- Specific data values, quotes, or excerpts from documents
- Anything that could identify the user or their specific inquiry

Output a concise summary (under 500 words) of the patterns and strategies \
observed in the conversation."""

MEMORY_SUMMARISE_USER_PROMPT = """\
Summarise the following conversation for memory curation:

{conversation_text}"""

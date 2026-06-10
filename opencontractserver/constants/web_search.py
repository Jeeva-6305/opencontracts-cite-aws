"""
Constants for the web search agent tool.

Defines provider identifiers, rate limits, result formatting limits,
and the web search settings key used in PipelineSettings.
"""

from opencontractserver.constants.tools import TOOL_SETTINGS_PREFIX

# ---------------------------------------------------------------------------
# Provider identifiers
# ---------------------------------------------------------------------------
BRAVE_PROVIDER = "brave"
TAVILY_PROVIDER = "tavily"
DEFAULT_WEB_SEARCH_PROVIDER = BRAVE_PROVIDER
SUPPORTED_PROVIDERS = frozenset({BRAVE_PROVIDER, TAVILY_PROVIDER})

# ---------------------------------------------------------------------------
# PipelineSettings key for web search tool secrets/settings
# ---------------------------------------------------------------------------
WEB_SEARCH_SETTINGS_KEY = f"{TOOL_SETTINGS_PREFIX}web_search"

# ---------------------------------------------------------------------------
# Search defaults
# ---------------------------------------------------------------------------
WEB_SEARCH_DEFAULT_NUM_RESULTS = 5
WEB_SEARCH_MAX_NUM_RESULTS = 20
WEB_SEARCH_DEFAULT_SEARCH_TYPE = "general"

# ---------------------------------------------------------------------------
# Rate limiting (per-provider, per-minute)
# ---------------------------------------------------------------------------
WEB_SEARCH_RATE_LIMIT_PER_MINUTE = 30

# ---------------------------------------------------------------------------
# Result formatting
# ---------------------------------------------------------------------------
# Maximum characters per individual search result snippet
WEB_SEARCH_MAX_SNIPPET_CHARS = 500
# Maximum total characters for all results combined (before tool truncation)
WEB_SEARCH_MAX_TOTAL_CHARS = 15_000

# ---------------------------------------------------------------------------
# HTTP client settings
# ---------------------------------------------------------------------------
WEB_SEARCH_REQUEST_TIMEOUT_SECONDS = 15
WEB_SEARCH_CONNECT_TIMEOUT_SECONDS = 5

# ---------------------------------------------------------------------------
# Brave Search API
# ---------------------------------------------------------------------------
BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

# ---------------------------------------------------------------------------
# Tavily Search API
# ---------------------------------------------------------------------------
TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"

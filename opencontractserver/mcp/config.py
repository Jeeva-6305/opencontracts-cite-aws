"""
Configuration settings for the OpenContracts MCP (Model Context Protocol) server.

This module provides default configuration values and utility functions for accessing
MCP-specific Django settings.
"""

import re
from typing import Any, Optional

# MCP Server Configuration Defaults
MAX_RESULTS_PER_PAGE = 100
DEFAULT_PAGE_SIZE = 20
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60  # seconds
CACHE_TTL = 300  # seconds

# URI Pattern Constants
SLUG_PATTERN = re.compile(r"^[A-Za-z0-9-]+$")


def get_mcp_setting(key: str, default: Optional[Any] = None) -> Any:
    """
    Get MCP setting from Django settings or return default.

    Settings should be defined in Django settings.py as:
    MCP_SERVER = {
        'MAX_RESULTS_PER_PAGE': 100,
        'DEFAULT_PAGE_SIZE': 20,
        ...
    }

    Args:
        key: The setting key to retrieve
        default: Default value if setting not found

    Returns:
        The setting value or default
    """
    from django.conf import settings

    mcp_settings = getattr(settings, "MCP_SERVER", {})
    return mcp_settings.get(key, default)


def validate_slug(slug: str) -> bool:
    """
    Validate that a slug matches the expected pattern.

    Args:
        slug: The slug string to validate

    Returns:
        True if slug is valid, False otherwise
    """
    return bool(SLUG_PATTERN.match(slug))

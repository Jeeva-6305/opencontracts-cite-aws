"""Permission utilities for the MCP server.

This module provides input validation and user handling for MCP server
operations.  Rate limiting has been moved to the shared
:mod:`config.ratelimit` package.
"""

import re

from django.contrib.auth.models import AnonymousUser

# Slug validation pattern - matches OpenContracts format (A-Z, a-z, 0-9, hyphen)
SLUG_PATTERN = re.compile(r"^[A-Za-z0-9\-]+$")


def validate_slug(slug: str) -> bool:
    """Validate slug format matches OpenContracts pattern (A-Z, a-z, 0-9, hyphen).

    Args:
        slug: The slug string to validate

    Returns:
        True if slug is valid, False otherwise
    """
    return bool(SLUG_PATTERN.match(slug))


def sanitize_and_validate_slugs(
    corpus_slug: str, document_slug: str | None = None
) -> tuple[str, str | None]:
    """Validate and return slugs, raising ValueError if invalid.

    Args:
        corpus_slug: The corpus slug to validate (required)
        document_slug: The document slug to validate (optional)

    Returns:
        Tuple of (corpus_slug, document_slug) if valid

    Raises:
        ValueError: If either slug is invalid
    """
    if not validate_slug(corpus_slug):
        raise ValueError(f"Invalid corpus slug: {corpus_slug}")
    if document_slug and not validate_slug(document_slug):
        raise ValueError(f"Invalid document slug: {document_slug}")
    return corpus_slug, document_slug


def get_anonymous_user() -> AnonymousUser:
    """Get Django's AnonymousUser for permission checks.

    Returns:
        AnonymousUser instance for use in permission checks
    """
    return AnonymousUser()

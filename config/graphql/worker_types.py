"""
GraphQL types for the worker upload system.

Includes both mutation-return types (WorkerAccountType, CorpusAccessTokenCreatedType)
and read-only query projection types (WorkerAccountQueryType, etc.).
"""

import graphene

# ============================================================================
# Mutation return types
# ============================================================================


class WorkerAccountType(graphene.ObjectType):
    id = graphene.Int()
    name = graphene.String()
    description = graphene.String()
    is_active = graphene.Boolean()
    created = graphene.DateTime()


class CorpusAccessTokenType(graphene.ObjectType):
    id = graphene.Int()
    # Only show the full key on creation; afterwards show a masked version
    key = graphene.String()
    worker_account_name = graphene.String()
    corpus_id = graphene.Int()
    expires_at = graphene.DateTime()
    is_active = graphene.Boolean()
    rate_limit_per_minute = graphene.Int()
    created = graphene.DateTime()


class CorpusAccessTokenCreatedType(graphene.ObjectType):
    """Returned only on token creation — includes the full key."""

    id = graphene.Int()
    key = graphene.String(
        description="Full token key. Store securely — shown only once."
    )
    worker_account_name = graphene.String()
    corpus_id = graphene.Int()
    expires_at = graphene.DateTime()
    rate_limit_per_minute = graphene.Int()
    created = graphene.DateTime()


# ============================================================================
# Query projection types (read-only, used by resolvers in queries.py)
# ============================================================================


class WorkerAccountQueryType(graphene.ObjectType):
    """Worker account with computed fields for listing."""

    id = graphene.Int()
    name = graphene.String()
    description = graphene.String()
    is_active = graphene.Boolean()
    creator_name = graphene.String()
    created = graphene.DateTime()
    modified = graphene.DateTime()
    token_count = graphene.Int(description="Number of access tokens for this account")


class CorpusAccessTokenQueryType(graphene.ObjectType):
    """Corpus access token for listing. Never exposes the hashed key."""

    id = graphene.Int()
    key_prefix = graphene.String(description="First 8 characters of the original token")
    worker_account_id = graphene.Int()
    worker_account_name = graphene.String()
    corpus_id = graphene.Int()
    is_active = graphene.Boolean()
    expires_at = graphene.DateTime()
    rate_limit_per_minute = graphene.Int()
    created = graphene.DateTime()
    upload_count_pending = graphene.Int()
    upload_count_completed = graphene.Int()
    upload_count_failed = graphene.Int()


class WorkerDocumentUploadQueryType(graphene.ObjectType):
    """Worker document upload for listing."""

    id = graphene.String(description="UUID of the upload")
    corpus_id = graphene.Int()
    status = graphene.String()
    error_message = graphene.String()
    result_document_id = graphene.Int()
    created = graphene.DateTime()
    processing_started = graphene.DateTime()
    processing_finished = graphene.DateTime()


class WorkerDocumentUploadPageType(graphene.ObjectType):
    """Paginated wrapper for worker document uploads."""

    items = graphene.List(graphene.NonNull(WorkerDocumentUploadQueryType))
    total_count = graphene.Int(description="Total matching uploads before pagination")
    limit = graphene.Int(description="Max items returned")
    offset = graphene.Int(description="Items skipped")

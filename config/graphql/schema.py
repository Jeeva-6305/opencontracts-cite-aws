import graphene
from django.conf import settings

from config.graphql.mutations import Mutation
from config.graphql.queries import Query
from config.graphql.security import DepthLimitValidationRule, DisableIntrospection

# Build validation rules: always enforce depth limits, disable introspection
# in production.
# NOTE: This list is built at import time. Tests that override settings.DEBUG
# after import must use graphql-core's validate() directly with the rule classes.
validation_rules: list = [DepthLimitValidationRule]
if not settings.DEBUG:
    validation_rules.append(DisableIntrospection)

# Create schema with auto_camelcase for consistency
schema = graphene.Schema(
    mutation=Mutation,
    query=Query,
    auto_camelcase=True,
)

# Generated manually for agent mentions feature
# Ensures default global agents exist with proper slugs

from django.conf import settings
from django.db import migrations


def ensure_default_agents(apps, schema_editor):  # pragma: no cover
    """
    Create or update default global agents with slugs.

    This migration ensures the default agents exist even if 0002 skipped
    creation due to missing superuser at migration time.
    """
    AgentConfiguration = apps.get_model("agents", "AgentConfiguration")
    User = apps.get_model("users", "User")

    # Get first superuser
    system_user = User.objects.filter(is_superuser=True).first()
    if not system_user:
        # If no superuser exists, we can't create agents with creator
        # This should be rare in production
        return

    # Document Agent - create or update
    doc_agent, created = AgentConfiguration.objects.get_or_create(
        slug="default-document-agent",
        defaults={
            "name": "Document Assistant",
            "description": "AI assistant for analyzing individual documents",
            "system_instructions": getattr(
                settings,
                "DEFAULT_DOCUMENT_AGENT_INSTRUCTIONS",
                "You are a helpful document assistant.",
            ),
            "available_tools": [
                "load_document_summary",
                "get_document_text_length",
                "similarity_search",
                "load_document_text",
                "search_exact_text",
                "get_document_notes",
            ],
            "permission_required_tools": [],
            "badge_config": {
                "icon": "file-text",
                "color": "#4A90E2",
                "label": "Doc AI",
            },
            "scope": "GLOBAL",
            "is_active": True,
            "is_public": True,
            "creator": system_user,
        },
    )
    if created:
        print(f"  Created Document Assistant agent (slug={doc_agent.slug})")

    # Also check if an agent exists by name but without slug
    AgentConfiguration.objects.filter(
        name="Document Assistant", scope="GLOBAL", slug__isnull=True
    ).update(slug="default-document-agent")

    # Corpus Agent - create or update
    corpus_agent, created = AgentConfiguration.objects.get_or_create(
        slug="default-corpus-agent",
        defaults={
            "name": "Corpus Assistant",
            "description": "AI assistant for analyzing collections of documents",
            "system_instructions": getattr(
                settings,
                "DEFAULT_CORPUS_AGENT_INSTRUCTIONS",
                "You are a helpful corpus assistant.",
            ),
            "available_tools": [
                "list_documents",
                "ask_document",
                "similarity_search",
            ],
            "permission_required_tools": [],
            "badge_config": {
                "icon": "database",
                "color": "#8B5CF6",
                "label": "Corpus AI",
            },
            "scope": "GLOBAL",
            "is_active": True,
            "is_public": True,
            "creator": system_user,
        },
    )
    if created:
        print(f"  Created Corpus Assistant agent (slug={corpus_agent.slug})")

    # Also check if an agent exists by name but without slug
    AgentConfiguration.objects.filter(
        name="Corpus Assistant", scope="GLOBAL", slug__isnull=True
    ).update(slug="default-corpus-agent")


def reverse_migration(apps, schema_editor):  # pragma: no cover
    """Remove default agents created by this migration."""
    AgentConfiguration = apps.get_model("agents", "AgentConfiguration")
    # Only delete if they were created by this migration (have our slugs)
    AgentConfiguration.objects.filter(
        slug__in=["default-document-agent", "default-corpus-agent"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0003_add_slug_field"),
        ("users", "0001_initial"),  # Ensure User model is available
    ]

    operations = [
        migrations.RunPython(ensure_default_agents, reverse_migration),
    ]

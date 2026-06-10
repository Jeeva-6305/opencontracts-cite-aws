# Generated manually for agent mentions feature
# Ensures ALL agents have slugs

from django.db import migrations
from django.utils.text import slugify


def generate_slugs_for_all_agents(apps, schema_editor):  # pragma: no cover
    """
    Generate slugs for any agents that don't have one.
    Uses the agent name to create a URL-friendly slug.
    """
    AgentConfiguration = apps.get_model("agents", "AgentConfiguration")

    # Find all agents without slugs
    agents_without_slugs = AgentConfiguration.objects.filter(slug__isnull=True)

    for agent in agents_without_slugs:
        base_slug = slugify(agent.name) if agent.name else "agent"

        # Ensure uniqueness by appending a number if needed
        slug = base_slug
        counter = 1
        while AgentConfiguration.objects.filter(slug=slug).exclude(pk=agent.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        agent.slug = slug
        agent.save(update_fields=["slug"])
        print(f"  Generated slug '{slug}' for agent '{agent.name}' (id={agent.pk})")


def reverse_migration(apps, schema_editor):  # pragma: no cover
    """
    Reverse is a no-op - we don't want to remove slugs.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0004_ensure_default_agents"),
    ]

    operations = [
        migrations.RunPython(generate_slugs_for_all_agents, reverse_migration),
    ]

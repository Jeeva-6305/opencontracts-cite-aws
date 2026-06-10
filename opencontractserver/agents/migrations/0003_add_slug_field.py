# Generated manually for agent mentions feature

from django.db import migrations, models


def populate_default_agent_slugs(apps, schema_editor):  # pragma: no cover
    """Add slugs to the default global agents."""
    AgentConfiguration = apps.get_model("agents", "AgentConfiguration")

    # Update Document Assistant
    AgentConfiguration.objects.filter(
        name="Document Assistant", scope="GLOBAL"
    ).update(slug="default-document-agent")

    # Update Corpus Assistant
    AgentConfiguration.objects.filter(
        name="Corpus Assistant", scope="GLOBAL"
    ).update(slug="default-corpus-agent")


def reverse_slugs(apps, schema_editor):  # pragma: no cover
    """Remove slugs from default agents."""
    AgentConfiguration = apps.get_model("agents", "AgentConfiguration")
    AgentConfiguration.objects.filter(
        slug__in=["default-document-agent", "default-corpus-agent"]
    ).update(slug=None)


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0002_create_default_agents"),
    ]

    operations = [
        # Add the slug field
        migrations.AddField(
            model_name="agentconfiguration",
            name="slug",
            field=models.SlugField(
                blank=True,
                db_index=True,
                help_text="URL-friendly identifier for mentions (e.g., 'research-assistant')",
                max_length=128,
                null=True,
                unique=True,
            ),
        ),
        # Populate slugs for existing default agents
        migrations.RunPython(populate_default_agent_slugs, reverse_slugs),
    ]

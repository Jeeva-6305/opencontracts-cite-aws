# Data migration to create the Installation singleton record for telemetry

from django.db import migrations


def create_installation(apps, schema_editor):
    """Create the Installation singleton if it doesn't exist."""
    Installation = apps.get_model("users", "Installation")
    if not Installation.objects.exists():
        Installation.objects.create()


def reverse_installation(apps, schema_editor):
    """Remove the Installation record (reversible migration)."""
    Installation = apps.get_model("users", "Installation")
    Installation.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0021_alter_userimport_backend_lock"),
    ]

    operations = [
        migrations.RunPython(create_installation, reverse_code=reverse_installation),
    ]

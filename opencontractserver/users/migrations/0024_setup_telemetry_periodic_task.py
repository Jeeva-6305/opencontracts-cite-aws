# Data migration to set up the telemetry heartbeat periodic task

from django.conf import settings
from django.db import migrations


def setup_telemetry_task(apps, schema_editor):
    """Create the periodic task for telemetry heartbeat if telemetry is enabled."""
    # Check if telemetry is enabled
    if not getattr(settings, "TELEMETRY_ENABLED", True):
        return

    CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    # Create or get the crontab schedule for daily at midnight UTC
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="0",
        hour="0",
        day_of_week="*",
        day_of_month="*",
        month_of_year="*",
        defaults={"timezone": "UTC"},
    )

    # Create the periodic task if it doesn't exist
    task_name = "usage-heartbeat-daily"
    if not PeriodicTask.objects.filter(name=task_name).exists():
        PeriodicTask.objects.create(
            name=task_name,
            task="opencontractserver.tasks.telemetry_tasks.send_usage_heartbeat",
            crontab=schedule,
            enabled=True,
            description="Daily telemetry heartbeat - sends anonymous usage statistics",
        )


def reverse_telemetry_task(apps, schema_editor):
    """Remove the telemetry periodic task."""
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name="usage-heartbeat-daily").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0023_add_dismissed_getting_started"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(setup_telemetry_task, reverse_code=reverse_telemetry_task),
    ]

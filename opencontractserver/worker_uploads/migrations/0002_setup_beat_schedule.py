"""
Data migration to clean up the DB-based Beat schedule for worker uploads.

The periodic task is now defined in settings via CELERY_BEAT_SCHEDULE, which
the DatabaseScheduler syncs automatically on startup. This migration removes
any leftover DB row from the previous approach so the schedule is not doubled.
"""

from django.db import migrations

TASK_NAME = "worker-uploads-drain-pending"


def remove_db_schedule(apps, schema_editor):
    """Remove the old DB-based periodic task (now managed via settings)."""
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name=TASK_NAME).delete()


def noop_reverse(apps, schema_editor):
    """No-op reverse — the settings-based schedule handles this now."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("worker_uploads", "0001_initial"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(remove_db_schedule, reverse_code=noop_reverse),
    ]

# Data migration: seeds the CAML Article Writer CorpusActionTemplate.
#
# Uses the shared seeding logic in template_seeds.py which is idempotent
# (skips templates that already exist by name).

from django.db import migrations

from opencontractserver.corpuses.template_seeds import (
    create_default_action_templates,
    reverse_migration,
)


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0010_create_default_action_templates"),
        ("corpuses", "0046_corpusactiontemplate_nonempty_task_instructions"),
    ]

    operations = [
        migrations.RunPython(
            create_default_action_templates,
            reverse_migration,
        ),
    ]

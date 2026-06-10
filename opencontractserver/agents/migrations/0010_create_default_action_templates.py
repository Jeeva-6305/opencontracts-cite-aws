# Data migration: seeds default CorpusActionTemplate records.
#
# Lives in the *agents* app (not corpuses) because it must depend on both
# agents/0009 and corpuses/0045.  Django only allows a migration to declare
# dependencies on other apps, not to live in an app it doesn't belong to.
# The actual seeding logic is in opencontractserver.corpuses.template_seeds.

from django.db import migrations

from opencontractserver.corpuses.template_seeds import (
    create_default_action_templates,
    reverse_migration,
)


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0009_update_checkconstraint_check_to_condition"),
        ("corpuses", "0045_corpusactiontemplate"),
    ]

    operations = [
        migrations.RunPython(
            create_default_action_templates,
            reverse_migration,
        ),
    ]

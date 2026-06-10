from django.db import migrations

import opencontractserver.shared.fields


def populate_enabled_components(apps, schema_editor):
    """No-op: empty list means all components are enabled.

    Existing deployments should not have their available components
    restricted based on current assignments — that is a deliberate
    post-migration admin action.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0034_update_checkconstraint_check_to_condition"),
    ]

    operations = [
        migrations.AddField(
            model_name="pipelinesettings",
            name="enabled_components",
            field=opencontractserver.shared.fields.NullableJSONField(
                blank=True,
                default=list,
                help_text="List of enabled component class paths. Empty list means all components are enabled.",
            ),
        ),
        migrations.RunPython(
            populate_enabled_components,
            migrations.RunPython.noop,
        ),
    ]

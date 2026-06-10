from django.db import migrations, models

import opencontractserver.types.enums


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0024_setup_telemetry_periodic_task"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userexport",
            name="format",
            field=models.CharField(
                choices=[
                    ("LANGCHAIN", "LANGCHAIN"),
                    ("OPEN_CONTRACTS", "OPEN_CONTRACTS"),
                    ("OPEN_CONTRACTS_V2", "OPEN_CONTRACTS_V2"),
                    ("FUNSD", "FUNSD"),
                ],
                default=opencontractserver.types.enums.ExportType["OPEN_CONTRACTS"],
                max_length=128,
            ),
        ),
    ]

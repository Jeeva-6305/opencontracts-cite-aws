"""Add license and license_link fields to Corpus model."""

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("corpuses", "0046_corpusactiontemplate_nonempty_task_instructions"),
    ]

    operations = [
        migrations.AddField(
            model_name="corpus",
            name="license",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "No license selected"),
                    ("CC-BY-4.0", "CC BY 4.0 — Attribution"),
                    ("CC-BY-SA-4.0", "CC BY-SA 4.0 — Attribution-ShareAlike"),
                    ("CC-BY-NC-4.0", "CC BY-NC 4.0 — Attribution-NonCommercial"),
                    (
                        "CC-BY-NC-SA-4.0",
                        "CC BY-NC-SA 4.0 — Attribution-NonCommercial-ShareAlike",
                    ),
                    ("CC-BY-ND-4.0", "CC BY-ND 4.0 — Attribution-NoDerivatives"),
                    (
                        "CC-BY-NC-ND-4.0",
                        "CC BY-NC-ND 4.0 — Attribution-NonCommercial-NoDerivatives",
                    ),
                    ("CC0-1.0", "CC0 1.0 — Public Domain Dedication"),
                    ("CUSTOM", "Custom License"),
                ],
                default="",
                help_text="SPDX identifier of the license applied to this corpus.",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="corpus",
            name="license_link",
            field=models.URLField(
                blank=True,
                default="",
                help_text=(
                    "URL to the full license text. Required when license is "
                    "'CUSTOM', optional for standard CC licenses."
                ),
                max_length=512,
                validators=[
                    django.core.validators.URLValidator(schemes=["http", "https"])
                ],
            ),
        ),
    ]

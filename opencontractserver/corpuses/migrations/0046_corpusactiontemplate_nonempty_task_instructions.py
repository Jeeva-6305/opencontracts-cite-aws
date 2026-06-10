from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("corpuses", "0045_corpusactiontemplate"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="corpusactiontemplate",
            constraint=models.CheckConstraint(
                condition=~models.Q(task_instructions=""),
                name="nonempty_task_instructions",
            ),
        ),
    ]

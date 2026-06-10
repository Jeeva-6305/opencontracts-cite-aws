from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("analyzer", "0018_alter_analysis_backend_lock_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="analyzer",
            name="is_public",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="gremlinengine",
            name="is_public",
            field=models.BooleanField(default=False),
        ),
    ]

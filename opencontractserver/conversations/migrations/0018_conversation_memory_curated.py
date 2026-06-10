"""Add memory_curated field to Conversation model."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("conversations", "0017_alter_conversation_compacted_before_message_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="memory_curated",
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text="Whether this conversation has been curated for corpus memory.",
            ),
        ),
    ]

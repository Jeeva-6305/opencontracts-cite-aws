from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("conversations", "0014_add_conversation_voting"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="compaction_summary",
            field=models.TextField(
                blank=True,
                default="",
                help_text=(
                    "Summary of compacted (older) messages.  Empty when no "
                    "compaction has occurred."
                ),
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="compacted_before_message_id",
            field=models.BigIntegerField(
                blank=True,
                null=True,
                help_text=(
                    "ID of the last message that was folded into "
                    "compaction_summary.  Messages with id <= this value "
                    "are excluded from LLM context (but kept in the DB)."
                ),
            ),
        ),
    ]

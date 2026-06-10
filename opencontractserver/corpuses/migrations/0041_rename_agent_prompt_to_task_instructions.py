"""
Rename agent_prompt to task_instructions and update action type constraint.

This migration supports the streamlined agent corpus action configuration:
- Renames agent_prompt -> task_instructions (single required prompt field)
- Updates the DB constraint to allow lightweight agent actions
  (task_instructions without agent_config)

Safety note: The new constraint allows task_instructions-only rows (all FKs null,
task_instructions non-empty). The previous constraint
(``exactly_one_of_fieldset_analyzer_or_agent``) required at least one FK to be set,
so no existing rows can have all FKs null with an empty agent_prompt. Therefore,
the constraint swap is safe for existing data.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("corpuses", "0040_corpus_created_with_embedder"),
    ]

    operations = [
        # 1. Rename the field
        migrations.RenameField(
            model_name="corpusaction",
            old_name="agent_prompt",
            new_name="task_instructions",
        ),
        # 2. Update help_text on the renamed field
        migrations.AlterField(
            model_name="corpusaction",
            name="task_instructions",
            field=models.TextField(
                blank=True,
                default="",
                help_text=(
                    "What the agent should do (e.g., 'Read this document and update "
                    "its description with a one-paragraph summary'). This is the single "
                    "required field for agent-based actions."
                ),
            ),
        ),
        # 3. Drop old constraint
        migrations.RemoveConstraint(
            model_name="corpusaction",
            name="exactly_one_of_fieldset_analyzer_or_agent",
        ),
        # 4. Add new constraint that also allows lightweight agent actions
        migrations.AddConstraint(
            model_name="corpusaction",
            constraint=models.CheckConstraint(
                check=(
                    # Fieldset only
                    models.Q(
                        fieldset__isnull=False,
                        analyzer__isnull=True,
                        agent_config__isnull=True,
                    )
                    # Analyzer only
                    | models.Q(
                        fieldset__isnull=True,
                        analyzer__isnull=False,
                        agent_config__isnull=True,
                    )
                    # Agent with config (requires non-empty task_instructions)
                    | (
                        models.Q(
                            fieldset__isnull=True,
                            analyzer__isnull=True,
                            agent_config__isnull=False,
                        )
                        & ~models.Q(task_instructions="")
                    )
                    # Lightweight agent: task_instructions only
                    | (
                        models.Q(
                            fieldset__isnull=True,
                            analyzer__isnull=True,
                            agent_config__isnull=True,
                        )
                        & ~models.Q(task_instructions="")
                    )
                ),
                name="valid_action_type_configuration",
            ),
        ),
    ]

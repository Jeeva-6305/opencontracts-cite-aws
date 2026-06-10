from django.apps import apps
from django.core.management.base import BaseCommand

from opencontractserver.corpuses.template_seeds import (
    create_default_action_templates,
)


class Command(BaseCommand):
    help = (
        "Seed default CorpusActionTemplates and their AgentConfigurations. "
        "Safe to run multiple times — existing templates are skipped."
    )

    def handle(self, *args, **options):
        create_default_action_templates(apps, None)
        self.stdout.write(self.style.SUCCESS("Default action templates seeded."))

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CorpusesConfig(AppConfig):

    default_auto_field = "django.db.models.BigAutoField"
    name = "opencontractserver.corpuses"
    verbose_name = _("Corpuses")

    def ready(self):
        try:
            # Import signals to register signal handlers for corpus actions.
            # This enables:
            # - NEW_THREAD: Trigger corpus actions when a discussion thread is created
            # - NEW_MESSAGE: Trigger corpus actions when a human message is posted
            # Note: Document-based triggers (ADD_DOCUMENT, EDIT_DOCUMENT) are
            # handled via direct invocation in add_document(), import_document(),
            # and set_doc_lock_state().
            from opencontractserver.corpuses import signals  # noqa: F401

        except ImportError:
            pass

        # Register system checks for embedder consistency (Issue #437).
        import opencontractserver.corpuses.checks  # noqa: F401

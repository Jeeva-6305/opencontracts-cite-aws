from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from opencontractserver.agents.models import AgentConfiguration
from opencontractserver.analyzer.models import Analyzer
from opencontractserver.corpuses.models import Corpus, CorpusAction, CorpusActionTrigger
from opencontractserver.extracts.models import Fieldset

User = get_user_model()


class CorpusActionModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.user)
        self.analyzer = Analyzer.objects.create(
            description="Test Analyzer", creator=self.user, task_name="not.a.real.task"
        )
        self.fieldset = Fieldset.objects.create(name="Test Fieldset", creator=self.user)
        self.agent_config = AgentConfiguration.objects.create(
            name="Test Agent Config",
            description="Test agent configuration",
            system_instructions="You are a helpful assistant",
            is_active=True,
            creator=self.user,
        )

    def test_create_corpus_action_with_analyzer(self):
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertIsNotNone(corpus_action.id)
        self.assertEqual(corpus_action.corpus, self.corpus)
        self.assertEqual(corpus_action.analyzer, self.analyzer)
        self.assertIsNone(corpus_action.fieldset)
        self.assertEqual(corpus_action.trigger, CorpusActionTrigger.ADD_DOCUMENT)

    def test_create_corpus_action_with_fieldset(self):
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            fieldset=self.fieldset,
            trigger=CorpusActionTrigger.EDIT_DOCUMENT,
            creator=self.user,
        )
        self.assertIsNotNone(corpus_action.id)
        self.assertEqual(corpus_action.corpus, self.corpus)
        self.assertEqual(corpus_action.fieldset, self.fieldset)
        self.assertIsNone(corpus_action.analyzer)
        self.assertEqual(corpus_action.trigger, CorpusActionTrigger.EDIT_DOCUMENT)

    def test_create_corpus_action_with_both_analyzer_and_fieldset(self):
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                analyzer=self.analyzer,
                fieldset=self.fieldset,
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    def test_create_corpus_action_without_analyzer_or_fieldset(self):
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    def test_corpus_action_str_representation(self):
        corpus_action_analyzer = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        expected_str_analyzer = (
            f"CorpusAction for {self.corpus} - Analyzer - Add Document"
        )
        self.assertEqual(str(corpus_action_analyzer), expected_str_analyzer)

        corpus_action_fieldset = CorpusAction.objects.create(
            corpus=self.corpus,
            fieldset=self.fieldset,
            trigger=CorpusActionTrigger.EDIT_DOCUMENT,
            creator=self.user,
        )
        expected_str_fieldset = (
            f"CorpusAction for {self.corpus} - Fieldset - Edit Document"
        )
        self.assertEqual(str(corpus_action_fieldset), expected_str_fieldset)

    def test_corpus_action_trigger_choices(self):
        self.assertEqual(CorpusActionTrigger.ADD_DOCUMENT, "add_document")
        self.assertEqual(CorpusActionTrigger.EDIT_DOCUMENT, "edit_document")

    def test_corpus_action_related_name(self):
        CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        CorpusAction.objects.create(
            corpus=self.corpus,
            fieldset=self.fieldset,
            trigger=CorpusActionTrigger.EDIT_DOCUMENT,
            creator=self.user,
        )
        self.assertEqual(self.corpus.actions.count(), 2)

    def test_corpus_action_creator(self):
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertEqual(corpus_action.creator, self.user)

    def test_corpus_action_creation_time(self):
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertIsNotNone(corpus_action.created)
        self.assertIsNotNone(corpus_action.modified)

    def test_corpus_action_modification_time(self):
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        original_modified = corpus_action.modified
        corpus_action.trigger = CorpusActionTrigger.EDIT_DOCUMENT
        corpus_action.save()
        self.assertNotEqual(corpus_action.modified, original_modified)

    def test_create_corpus_action_with_agent_config(self):
        """Test creating a corpus action with an agent configuration."""
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            agent_config=self.agent_config,
            task_instructions="Summarize this document",
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertIsNotNone(corpus_action.id)
        self.assertEqual(corpus_action.corpus, self.corpus)
        self.assertEqual(corpus_action.agent_config, self.agent_config)
        self.assertEqual(corpus_action.task_instructions, "Summarize this document")
        self.assertIsNone(corpus_action.fieldset)
        self.assertIsNone(corpus_action.analyzer)
        self.assertEqual(corpus_action.trigger, CorpusActionTrigger.ADD_DOCUMENT)

    def test_create_corpus_action_with_agent_config_and_tools(self):
        """Test creating a corpus action with agent config and pre-authorized tools."""
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            agent_config=self.agent_config,
            task_instructions="Analyze the document and update its description",
            pre_authorized_tools=["update_document_description", "search_annotations"],
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertIsNotNone(corpus_action.id)
        self.assertEqual(
            corpus_action.pre_authorized_tools,
            ["update_document_description", "search_annotations"],
        )

    def test_create_corpus_action_with_agent_config_no_prompt_fails(self):
        """Test that creating an agent corpus action without a prompt fails validation."""
        with self.assertRaises(ValidationError) as context:
            CorpusAction.objects.create(
                corpus=self.corpus,
                agent_config=self.agent_config,
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )
        self.assertIn("task_instructions", str(context.exception))

    def test_create_corpus_action_with_agent_and_analyzer_fails(self):
        """Test that providing both agent_config and analyzer fails validation."""
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                agent_config=self.agent_config,
                task_instructions="Test prompt",
                analyzer=self.analyzer,
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    def test_create_corpus_action_with_agent_and_fieldset_fails(self):
        """Test that providing both agent_config and fieldset fails validation."""
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                agent_config=self.agent_config,
                task_instructions="Test prompt",
                fieldset=self.fieldset,
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    def test_corpus_action_str_representation_for_agent(self):
        """Test the string representation for agent-based corpus actions."""
        corpus_action = CorpusAction.objects.create(
            corpus=self.corpus,
            agent_config=self.agent_config,
            task_instructions="Summarize this document",
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        expected_str = f"CorpusAction for {self.corpus} - Agent - Add Document"
        self.assertEqual(str(corpus_action), expected_str)

    # ---- is_agent_action property edge cases ----

    def test_is_agent_action_with_agent_config(self):
        """is_agent_action returns True when agent_config is set."""
        action = CorpusAction.objects.create(
            corpus=self.corpus,
            agent_config=self.agent_config,
            task_instructions="Summarize this document",
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertTrue(action.is_agent_action)

    def test_is_agent_action_with_task_instructions_only(self):
        """is_agent_action returns True for lightweight agent (task_instructions only)."""
        action = CorpusAction.objects.create(
            corpus=self.corpus,
            task_instructions="Summarize this document",
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertTrue(action.is_agent_action)

    def test_is_agent_action_false_for_fieldset(self):
        """is_agent_action returns False for fieldset-only actions."""
        action = CorpusAction.objects.create(
            corpus=self.corpus,
            fieldset=self.fieldset,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertFalse(action.is_agent_action)

    def test_is_agent_action_false_for_analyzer(self):
        """is_agent_action returns False for analyzer-only actions."""
        action = CorpusAction.objects.create(
            corpus=self.corpus,
            analyzer=self.analyzer,
            trigger=CorpusActionTrigger.ADD_DOCUMENT,
            creator=self.user,
        )
        self.assertFalse(action.is_agent_action)

    def test_task_instructions_on_fieldset_action_rejected(self):
        """Setting task_instructions on a fieldset action should fail validation."""
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                fieldset=self.fieldset,
                task_instructions="Should not be allowed",
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    def test_task_instructions_on_analyzer_action_rejected(self):
        """Setting task_instructions on an analyzer action should fail validation."""
        with self.assertRaises(ValidationError):
            CorpusAction.objects.create(
                corpus=self.corpus,
                analyzer=self.analyzer,
                task_instructions="Should not be allowed",
                trigger=CorpusActionTrigger.ADD_DOCUMENT,
                creator=self.user,
            )

    # ---- Constants alignment with CorpusActionTrigger ----

    def test_constants_keys_match_trigger_enum(self):
        """Verify DEFAULT_TOOLS_BY_TRIGGER and TRIGGER_DESCRIPTIONS keys
        match CorpusActionTrigger enum values (guards against typos)."""
        from opencontractserver.constants.corpus_actions import (
            DEFAULT_TOOLS_BY_TRIGGER,
            TRIGGER_DESCRIPTIONS,
        )

        trigger_values = {choice.value for choice in CorpusActionTrigger}
        self.assertEqual(set(DEFAULT_TOOLS_BY_TRIGGER.keys()), trigger_values)
        self.assertEqual(set(TRIGGER_DESCRIPTIONS.keys()), trigger_values)

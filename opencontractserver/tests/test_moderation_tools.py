"""
Tests for moderation_tools.py - sync functions for thread and message moderation.

These tests cover:
- get_thread_context: Retrieving thread metadata
- get_thread_messages: Fetching messages from a thread
- get_message_content: Getting single message details
- delete_message: Soft-deleting messages
- lock_thread/unlock_thread: Thread locking
- pin_thread/unpin_thread: Thread pinning
- add_thread_message: Posting agent messages

Note: The async versions (aget_*, adelete_*, etc.) are simple wrappers
around sync functions using sync_to_async, so testing the sync functions
provides coverage for the core logic.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from opencontractserver.agents.models import AgentConfiguration
from opencontractserver.conversations.models import (
    ChatMessage,
    Conversation,
    ConversationTypeChoices,
    CorpusModerator,
    MessageTypeChoices,
    ModeratorPermissionChoices,
)
from opencontractserver.corpuses.models import Corpus
from opencontractserver.llms.tools.moderation_tools import (
    add_thread_message,
    delete_message,
    get_message_content,
    get_thread_context,
    get_thread_messages,
    lock_thread,
    pin_thread,
    unlock_thread,
    unpin_thread,
)

User = get_user_model()


class TestGetThreadContext(TestCase):
    """Tests for get_thread_context function."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.user)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            description="A test thread description",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.user,
        )

    def test_returns_thread_metadata(self):
        """Test that thread metadata is returned correctly."""
        result = get_thread_context(self.thread.id)

        self.assertEqual(result["id"], self.thread.id)
        self.assertEqual(result["title"], "Test Thread")
        self.assertEqual(result["description"], "A test thread description")
        self.assertEqual(result["creator_id"], self.user.id)
        self.assertEqual(result["creator_username"], self.user.username)
        self.assertFalse(result["is_locked"])
        self.assertFalse(result["is_pinned"])
        self.assertIsNone(result["locked_at"])
        self.assertIsNone(result["pinned_at"])
        self.assertEqual(result["corpus_id"], self.corpus.id)
        self.assertEqual(result["corpus_title"], self.corpus.title)
        self.assertFalse(result["is_deleted"])

    def test_returns_lock_info_when_locked(self):
        """Test that lock info is included when thread is locked."""
        self.thread.lock(self.user, reason="Test lock")
        result = get_thread_context(self.thread.id)

        self.assertTrue(result["is_locked"])
        self.assertIsNotNone(result["locked_at"])
        self.assertEqual(result["locked_by_username"], self.user.username)

    def test_returns_pin_info_when_pinned(self):
        """Test that pin info is included when thread is pinned."""
        self.thread.pin(self.user, reason="Test pin")
        result = get_thread_context(self.thread.id)

        self.assertTrue(result["is_pinned"])
        self.assertIsNotNone(result["pinned_at"])
        self.assertEqual(result["pinned_by_username"], self.user.username)

    def test_includes_message_count(self):
        """Test that message count is accurate."""
        # Create some messages
        ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Message 1",
            creator=self.user,
        )
        ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Message 2",
            creator=self.user,
        )

        result = get_thread_context(self.thread.id)
        self.assertEqual(result["message_count"], 2)

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            get_thread_context(999999)
        self.assertIn("does not exist", str(context.exception))

    def test_handles_empty_description(self):
        """Test that empty description returns empty string."""
        thread_no_desc = Conversation.objects.create(
            title="No Description Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.user,
        )
        result = get_thread_context(thread_no_desc.id)
        self.assertEqual(result["description"], "")


class TestGetThreadMessages(TestCase):
    """Tests for get_thread_messages function."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.user)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.user,
        )

        # Create messages
        self.msg1 = ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="First message",
            creator=self.user,
        )
        self.msg2 = ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Second message",
            creator=self.user,
        )

    def test_returns_messages_with_metadata(self):
        """Test that messages are returned with correct metadata."""
        result = get_thread_messages(self.thread.id)

        self.assertEqual(len(result), 2)
        # Messages are ordered by created_at descending (newest first)
        msg = result[0]  # Should be msg2 (newest)
        self.assertEqual(msg["content"], "Second message")
        self.assertEqual(msg["msg_type"], MessageTypeChoices.HUMAN)
        self.assertEqual(msg["creator_id"], self.user.id)
        self.assertEqual(msg["creator_username"], self.user.username)
        self.assertFalse(msg["is_deleted"])

    def test_respects_limit_parameter(self):
        """Test that limit parameter restricts results."""
        result = get_thread_messages(self.thread.id, limit=1)
        self.assertEqual(len(result), 1)

    def test_excludes_deleted_by_default(self):
        """Test that soft-deleted messages are excluded by default."""
        self.msg1.soft_delete_message(self.user, reason="Test delete")

        result = get_thread_messages(self.thread.id)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], self.msg2.id)

    def test_includes_deleted_when_requested(self):
        """Test that include_deleted=True includes soft-deleted messages."""
        self.msg1.soft_delete_message(self.user, reason="Test delete")

        result = get_thread_messages(self.thread.id, include_deleted=True)
        self.assertEqual(len(result), 2)

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            get_thread_messages(999999)
        self.assertIn("does not exist", str(context.exception))


class TestGetMessageContent(TestCase):
    """Tests for get_message_content function."""

    def setUp(self):
        """Create test data."""
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.user)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.user,
        )
        self.message = ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Test message content",
            creator=self.user,
        )

    def test_returns_message_details(self):
        """Test that message details are returned correctly."""
        result = get_message_content(self.message.id)

        self.assertEqual(result["id"], self.message.id)
        self.assertEqual(result["content"], "Test message content")
        self.assertEqual(result["msg_type"], MessageTypeChoices.HUMAN)
        self.assertEqual(result["creator_id"], self.user.id)
        self.assertEqual(result["creator_username"], self.user.username)
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["thread_title"], self.thread.title)
        self.assertFalse(result["is_deleted"])
        self.assertIsNone(result["deleted_at"])

    def test_includes_vote_counts(self):
        """Test that vote counts are included."""
        result = get_message_content(self.message.id)
        self.assertEqual(result["upvote_count"], 0)
        self.assertEqual(result["downvote_count"], 0)

    def test_includes_reply_count(self):
        """Test that reply count is included."""
        # Create a reply
        ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Reply message",
            creator=self.user,
            parent_message=self.message,
        )

        result = get_message_content(self.message.id)
        self.assertEqual(result["reply_count"], 1)

    def test_raises_for_nonexistent_message(self):
        """Test that ValueError is raised for non-existent message."""
        with self.assertRaises(ValueError) as context:
            get_message_content(999999)
        self.assertIn("does not exist", str(context.exception))


class TestDeleteMessage(TestCase):
    """Tests for delete_message function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.moderator = User.objects.create_user(
            username="moderator", password="testpass"
        )
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )
        self.message = ChatMessage.objects.create(
            conversation=self.thread,
            msg_type=MessageTypeChoices.HUMAN,
            content="Test message",
            creator=self.owner,
        )
        # Add moderator permissions
        CorpusModerator.objects.create(
            corpus=self.corpus,
            user=self.moderator,
            permissions=[ModeratorPermissionChoices.DELETE_MESSAGES],
            creator=self.owner,
        )

    def test_deletes_message_successfully(self):
        """Test that message is soft-deleted."""
        result = delete_message(
            message_id=self.message.id,
            reason="Violates guidelines",
            moderator_id=self.moderator.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["message_id"], self.message.id)
        self.assertEqual(result["action"], "deleted")
        self.assertEqual(result["reason"], "Violates guidelines")

        # Verify message is soft-deleted
        self.message.refresh_from_db()
        self.assertIsNotNone(self.message.deleted_at)

    def test_raises_for_nonexistent_message(self):
        """Test that ValueError is raised for non-existent message."""
        with self.assertRaises(ValueError) as context:
            delete_message(999999, "reason", self.moderator.id)
        self.assertIn("Message with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_moderator(self):
        """Test that ValueError is raised for non-existent user."""
        with self.assertRaises(ValueError) as context:
            delete_message(self.message.id, "reason", 999999)
        self.assertIn("User with id=999999 does not exist", str(context.exception))


class TestLockThread(TestCase):
    """Tests for lock_thread function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )

    def test_locks_thread_successfully(self):
        """Test that thread is locked successfully."""
        result = lock_thread(
            thread_id=self.thread.id,
            reason="Spam content",
            moderator_id=self.owner.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["action"], "locked")
        self.assertEqual(result["reason"], "Spam content")

        # Verify thread is locked
        self.thread.refresh_from_db()
        self.assertTrue(self.thread.is_locked)

    def test_returns_failure_if_already_locked(self):
        """Test that locking already locked thread returns failure."""
        # First lock
        self.thread.lock(self.owner, reason="First lock")

        # Second lock attempt
        result = lock_thread(
            thread_id=self.thread.id,
            reason="Second lock",
            moderator_id=self.owner.id,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Thread is already locked")

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            lock_thread(999999, "reason", self.owner.id)
        self.assertIn("Thread with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_moderator(self):
        """Test that ValueError is raised for non-existent user."""
        with self.assertRaises(ValueError) as context:
            lock_thread(self.thread.id, "reason", 999999)
        self.assertIn("User with id=999999 does not exist", str(context.exception))


class TestUnlockThread(TestCase):
    """Tests for unlock_thread function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )
        # Lock the thread first
        self.thread.lock(self.owner, reason="Initial lock")

    def test_unlocks_thread_successfully(self):
        """Test that thread is unlocked successfully."""
        result = unlock_thread(
            thread_id=self.thread.id,
            reason="Issue resolved",
            moderator_id=self.owner.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["action"], "unlocked")
        self.assertEqual(result["reason"], "Issue resolved")

        # Verify thread is unlocked
        self.thread.refresh_from_db()
        self.assertFalse(self.thread.is_locked)

    def test_returns_failure_if_not_locked(self):
        """Test that unlocking not-locked thread returns failure."""
        # Unlock first
        self.thread.unlock(self.owner, reason="Unlock")

        # Try to unlock again
        result = unlock_thread(
            thread_id=self.thread.id,
            reason="Second unlock",
            moderator_id=self.owner.id,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Thread is not locked")

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            unlock_thread(999999, "reason", self.owner.id)
        self.assertIn("Thread with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_moderator(self):
        """Test that ValueError is raised for non-existent user."""
        with self.assertRaises(ValueError) as context:
            unlock_thread(self.thread.id, "reason", 999999)
        self.assertIn("User with id=999999 does not exist", str(context.exception))


class TestPinThread(TestCase):
    """Tests for pin_thread function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )

    def test_pins_thread_successfully(self):
        """Test that thread is pinned successfully."""
        result = pin_thread(
            thread_id=self.thread.id,
            reason="Important announcement",
            moderator_id=self.owner.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["action"], "pinned")
        self.assertEqual(result["reason"], "Important announcement")

        # Verify thread is pinned
        self.thread.refresh_from_db()
        self.assertTrue(self.thread.is_pinned)

    def test_returns_failure_if_already_pinned(self):
        """Test that pinning already pinned thread returns failure."""
        # First pin
        self.thread.pin(self.owner, reason="First pin")

        # Second pin attempt
        result = pin_thread(
            thread_id=self.thread.id,
            reason="Second pin",
            moderator_id=self.owner.id,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Thread is already pinned")

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            pin_thread(999999, "reason", self.owner.id)
        self.assertIn("Thread with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_moderator(self):
        """Test that ValueError is raised for non-existent user."""
        with self.assertRaises(ValueError) as context:
            pin_thread(self.thread.id, "reason", 999999)
        self.assertIn("User with id=999999 does not exist", str(context.exception))


class TestUnpinThread(TestCase):
    """Tests for unpin_thread function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )
        # Pin the thread first
        self.thread.pin(self.owner, reason="Initial pin")

    def test_unpins_thread_successfully(self):
        """Test that thread is unpinned successfully."""
        result = unpin_thread(
            thread_id=self.thread.id,
            reason="No longer relevant",
            moderator_id=self.owner.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["action"], "unpinned")
        self.assertEqual(result["reason"], "No longer relevant")

        # Verify thread is unpinned
        self.thread.refresh_from_db()
        self.assertFalse(self.thread.is_pinned)

    def test_returns_failure_if_not_pinned(self):
        """Test that unpinning not-pinned thread returns failure."""
        # Unpin first
        self.thread.unpin(self.owner, reason="Unpin")

        # Try to unpin again
        result = unpin_thread(
            thread_id=self.thread.id,
            reason="Second unpin",
            moderator_id=self.owner.id,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "Thread is not pinned")

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            unpin_thread(999999, "reason", self.owner.id)
        self.assertIn("Thread with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_moderator(self):
        """Test that ValueError is raised for non-existent user."""
        with self.assertRaises(ValueError) as context:
            unpin_thread(self.thread.id, "reason", 999999)
        self.assertIn("User with id=999999 does not exist", str(context.exception))


class TestAddThreadMessage(TestCase):
    """Tests for add_thread_message function."""

    def setUp(self):
        """Create test data."""
        self.owner = User.objects.create_user(username="owner", password="testpass")
        self.corpus = Corpus.objects.create(title="Test Corpus", creator=self.owner)
        self.thread = Conversation.objects.create(
            title="Test Thread",
            conversation_type=ConversationTypeChoices.THREAD,
            chat_with_corpus=self.corpus,
            creator=self.owner,
        )
        self.agent_config = AgentConfiguration.objects.create(
            name="Test Agent",
            slug="test-agent",
            description="A test agent",
            system_instructions="You are a test agent.",
            creator=self.owner,
            is_active=True,
        )

    def test_posts_message_successfully(self):
        """Test that agent message is posted successfully."""
        result = add_thread_message(
            thread_id=self.thread.id,
            content="Hello from agent!",
            agent_config_id=self.agent_config.id,
            creator_id=self.owner.id,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.thread.id)
        self.assertEqual(result["content_preview"], "Hello from agent!")

        # Verify message was created
        msg = ChatMessage.objects.get(id=result["message_id"])
        self.assertEqual(msg.content, "Hello from agent!")
        self.assertEqual(msg.msg_type, MessageTypeChoices.LLM)
        self.assertEqual(msg.agent_configuration, self.agent_config)

    def test_truncates_long_content_preview(self):
        """Test that long content is truncated in preview."""
        long_content = "x" * 300
        result = add_thread_message(
            thread_id=self.thread.id,
            content=long_content,
            agent_config_id=self.agent_config.id,
            creator_id=self.owner.id,
        )

        self.assertEqual(len(result["content_preview"]), 200)

    def test_raises_for_locked_thread(self):
        """Test that ValueError is raised when posting to locked thread."""
        self.thread.lock(self.owner, reason="Locked")

        with self.assertRaises(ValueError) as context:
            add_thread_message(
                thread_id=self.thread.id,
                content="Cannot post",
                agent_config_id=self.agent_config.id,
                creator_id=self.owner.id,
            )
        self.assertIn("is locked", str(context.exception))

    def test_raises_for_nonexistent_thread(self):
        """Test that ValueError is raised for non-existent thread."""
        with self.assertRaises(ValueError) as context:
            add_thread_message(999999, "content", self.agent_config.id, self.owner.id)
        self.assertIn("Thread with id=999999 does not exist", str(context.exception))

    def test_raises_for_nonexistent_agent_config(self):
        """Test that ValueError is raised for non-existent agent config."""
        with self.assertRaises(ValueError) as context:
            add_thread_message(self.thread.id, "content", 999999, self.owner.id)
        self.assertIn(
            "AgentConfiguration with id=999999 does not exist", str(context.exception)
        )

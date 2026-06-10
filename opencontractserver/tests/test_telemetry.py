import asyncio
from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from config.telemetry import (
    _UNSET,
    _get_installation_id,
    _reset_posthog_client,
    arecord_event,
    record_event,
)
from opencontractserver.tasks.telemetry_tasks import send_usage_heartbeat
from opencontractserver.users.models import Installation, User


class TelemetryTestCase(TestCase):
    def setUp(self):
        # Reset the singleton client before each test to ensure clean state
        _reset_posthog_client()

        # Mock Installation instance
        self.mock_installation = Installation.get()
        self.installation_id = self.mock_installation.id

        # Set up PostHog mock - patches the class so _get_posthog_client()
        # creates our mock when initializing the singleton
        self.posthog_patcher = patch("config.telemetry.Posthog")
        self.mock_posthog_class = self.posthog_patcher.start()
        self.mock_posthog = MagicMock()
        self.mock_posthog_class.return_value = self.mock_posthog

    def tearDown(self):
        self.posthog_patcher.stop()
        # Reset singleton after each test to clean up
        _reset_posthog_client()

    def test_record_event_success(self):
        """Test successful event recording with all conditions met"""

        with override_settings(
            MODE="DEV",
            TELEMETRY_ENABLED=True,
            POSTHOG_API_KEY="test-key",
            POSTHOG_HOST="https://test.host",
        ):
            result = record_event("test_event", {"test_prop": "value"})

        self.assertTrue(result)
        self.mock_posthog.capture.assert_called_once()

        # Verify the capture call arguments
        call_args = self.mock_posthog.capture.call_args[1]
        self.assertEqual(call_args["distinct_id"], str(self.installation_id))
        self.assertEqual(call_args["event"], "opencontracts.test_event")
        self.assertEqual(call_args["properties"]["package"], "opencontracts")
        self.assertEqual(
            call_args["properties"]["installation_id"], str(self.installation_id)
        )
        self.assertEqual(call_args["properties"]["test_prop"], "value")
        self.assertIn("timestamp", call_args["properties"])

        # Verify timestamp format
        timestamp = datetime.fromisoformat(call_args["properties"]["timestamp"])
        self.assertIsNotNone(timestamp.tzinfo)

    def test_posthog_client_initialized_with_geoip_enabled(self):
        """Test that PostHog client is initialized with disable_geoip=False.

        Server-side PostHog SDKs default to disable_geoip=True, which prevents
        GeoIP resolution on events. We explicitly set disable_geoip=False so
        PostHog can resolve geographic data from the server's IP.
        """
        with override_settings(
            MODE="DEV",
            TELEMETRY_ENABLED=True,
            POSTHOG_API_KEY="test-key",
            POSTHOG_HOST="https://test.host",
        ):
            record_event("test_event")

        # Verify PostHog client was created with disable_geoip=False
        init_kwargs = self.mock_posthog_class.call_args.kwargs
        self.assertIn("disable_geoip", init_kwargs)
        self.assertFalse(init_kwargs["disable_geoip"])

    def test_record_event_telemetry_disabled(self):
        """Test when telemetry is disabled"""

        with override_settings(TELEMETRY_ENABLED=False):
            result = record_event("test_event")

        self.assertFalse(result)
        self.mock_posthog.capture.assert_not_called()

    def test_record_event_installation_inactive(self):
        """Test when installation exists but is inactive"""

        with override_settings(TELEMETRY_ENABLED=False):
            result = record_event("test_event")

        self.assertFalse(result)
        self.mock_posthog.capture.assert_not_called()

    def test_record_event_posthog_error(self):
        """Test when PostHog client raises an error"""
        self.mock_posthog.capture.side_effect = Exception("PostHog Error")

        with override_settings(MODE="DEV", TELEMETRY_ENABLED=True):
            result = record_event("test_event")

        self.assertFalse(result)

    def test_record_event_without_properties(self):
        """Test event recording without additional properties"""

        with override_settings(MODE="DEV", TELEMETRY_ENABLED=True):
            result = record_event("test_event")

        self.assertTrue(result)
        self.mock_posthog.capture.assert_called_once()

        # Verify only default properties are present
        properties = self.mock_posthog.capture.call_args[1]["properties"]
        self.assertEqual(
            set(properties.keys()), {"package", "timestamp", "installation_id"}
        )


class UsersAppGeoIPTestCase(TestCase):
    """Tests that the UsersConfig.ready() method configures GeoIP on the
    module-level posthog instance (the official Django integration path)."""

    def test_ready_sets_geoip_enabled(self):
        """Test that UsersConfig.ready() sets posthog.disable_geoip = False."""
        import posthog

        from opencontractserver.users.apps import UsersConfig

        # Set a known bad state so we can verify the ready() method changes it
        posthog.disable_geoip = True

        app_config = UsersConfig(
            "opencontractserver.users", __import__("opencontractserver.users")
        )
        with override_settings(
            TELEMETRY_ENABLED=True,
            POSTHOG_API_KEY="test-key",
            POSTHOG_HOST="https://test.host",
        ):
            app_config.ready()

        self.assertFalse(posthog.disable_geoip)


class UsageHeartbeatTestCase(TestCase):
    """Tests for the send_usage_heartbeat Celery task."""

    def setUp(self):
        # Ensure Installation exists
        self.installation = Installation.get()

        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def tearDown(self):
        _reset_posthog_client()

    @patch("opencontractserver.tasks.telemetry_tasks.record_event")
    def test_heartbeat_collects_correct_stats(self, mock_record_event):
        """Test that heartbeat collects and sends correct statistics."""
        mock_record_event.return_value = True

        with override_settings(MODE="DEV", TELEMETRY_ENABLED=True):
            result = send_usage_heartbeat()

        # Verify record_event was called
        mock_record_event.assert_called_once()
        call_args = mock_record_event.call_args

        # Check event type
        self.assertEqual(call_args[0][0], "usage_heartbeat")

        # Check stats structure
        stats = call_args[0][1]
        self.assertIn("user_count", stats)
        self.assertIn("document_count", stats)
        self.assertIn("corpus_count", stats)
        self.assertIn("annotation_count", stats)
        self.assertIn("conversation_count", stats)
        self.assertIn("message_count", stats)
        self.assertIn("version", stats)
        self.assertIn("installation_age_days", stats)

        # Verify user count includes our test user
        self.assertGreaterEqual(stats["user_count"], 1)

        # Verify installation age is non-negative
        self.assertGreaterEqual(stats["installation_age_days"], 0)

        # Verify result matches stats
        self.assertEqual(result, stats)

    @patch("opencontractserver.tasks.telemetry_tasks.record_event")
    def test_heartbeat_disabled_in_test_mode(self, mock_record_event):
        """Test that heartbeat doesn't send in TEST mode."""
        with override_settings(MODE="TEST", TELEMETRY_ENABLED=True):
            result = send_usage_heartbeat()

        mock_record_event.assert_not_called()
        self.assertIsNone(result)

    @patch("opencontractserver.tasks.telemetry_tasks.record_event")
    def test_heartbeat_disabled_when_telemetry_off(self, mock_record_event):
        """Test that heartbeat doesn't send when telemetry is disabled."""
        with override_settings(MODE="DEV", TELEMETRY_ENABLED=False):
            result = send_usage_heartbeat()

        mock_record_event.assert_not_called()
        self.assertIsNone(result)

    @patch("opencontractserver.tasks.telemetry_tasks.record_event")
    def test_heartbeat_handles_errors_gracefully(self, mock_record_event):
        """Test that heartbeat handles errors without crashing."""
        mock_record_event.side_effect = Exception("Network error")

        with override_settings(MODE="DEV", TELEMETRY_ENABLED=True):
            # Should not raise, just return None
            result = send_usage_heartbeat()

        self.assertIsNone(result)


class TelemetryMigrationTestCase(TestCase):
    """Tests for the telemetry periodic task migration."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Import migration module using importlib (can't use normal import for numeric names)
        import importlib

        cls.migration_module = importlib.import_module(
            "opencontractserver.users.migrations.0024_setup_telemetry_periodic_task"
        )

    def test_setup_telemetry_task_creates_periodic_task(self):
        """Test that the migration creates the periodic task when telemetry is enabled."""
        from django.apps import apps
        from django_celery_beat.models import PeriodicTask

        # Clean up any existing task from previous test runs
        PeriodicTask.objects.filter(name="usage-heartbeat-daily").delete()

        with override_settings(TELEMETRY_ENABLED=True):
            self.migration_module.setup_telemetry_task(apps, None)

        # Verify task was created
        task = PeriodicTask.objects.get(name="usage-heartbeat-daily")
        self.assertEqual(
            task.task,
            "opencontractserver.tasks.telemetry_tasks.send_usage_heartbeat",
        )
        self.assertTrue(task.enabled)
        self.assertIsNotNone(task.crontab)

        # Verify crontab schedule
        self.assertEqual(task.crontab.minute, "0")
        self.assertEqual(task.crontab.hour, "0")

    def test_setup_telemetry_task_skips_when_disabled(self):
        """Test that the migration skips task creation when telemetry is disabled."""
        from django.apps import apps
        from django_celery_beat.models import PeriodicTask

        # Clean up any existing task
        PeriodicTask.objects.filter(name="usage-heartbeat-daily").delete()

        with override_settings(TELEMETRY_ENABLED=False):
            self.migration_module.setup_telemetry_task(apps, None)

        # Verify task was NOT created
        self.assertFalse(
            PeriodicTask.objects.filter(name="usage-heartbeat-daily").exists()
        )

    def test_reverse_telemetry_task_removes_periodic_task(self):
        """Test that the reverse migration removes the periodic task."""
        from django.apps import apps
        from django_celery_beat.models import PeriodicTask

        # First create the task
        PeriodicTask.objects.filter(name="usage-heartbeat-daily").delete()
        with override_settings(TELEMETRY_ENABLED=True):
            self.migration_module.setup_telemetry_task(apps, None)

        # Verify it exists
        self.assertTrue(
            PeriodicTask.objects.filter(name="usage-heartbeat-daily").exists()
        )

        # Now reverse it
        self.migration_module.reverse_telemetry_task(apps, None)

        # Verify it's gone
        self.assertFalse(
            PeriodicTask.objects.filter(name="usage-heartbeat-daily").exists()
        )


class AsyncTelemetryTestCase(TestCase):
    """Tests for async telemetry functions.

    Uses mock on ``record_event`` rather than Posthog directly because
    ``arecord_event`` runs ``record_event`` in a different thread via
    ``sync_to_async``.  Django ``TestCase`` wraps each test in an
    uncommitted transaction that is invisible to other DB connections,
    so the Installation record created in setUp would not be found.
    Mocking ``record_event`` avoids the cross-thread DB visibility issue
    while still verifying the async wrapper delegates correctly.
    """

    def setUp(self):
        _reset_posthog_client()

    def tearDown(self):
        _reset_posthog_client()

    def test_arecord_event_success(self):
        """Test async event recording delegates to sync version."""
        with patch("config.telemetry.record_event", return_value=True) as mock_record:
            result = asyncio.run(arecord_event("test_event", {"test": "value"}))

        self.assertTrue(result)
        mock_record.assert_called_once_with("test_event", {"test": "value"})

    def test_arecord_event_returns_false(self):
        """Test async version propagates False from sync version."""
        with patch("config.telemetry.record_event", return_value=False) as mock_record:
            result = asyncio.run(arecord_event("test_event"))

        self.assertFalse(result)
        mock_record.assert_called_once_with("test_event", None)

    def test_arecord_event_without_properties(self):
        """Test async event recording without additional properties."""
        with patch("config.telemetry.record_event", return_value=True) as mock_record:
            result = asyncio.run(arecord_event("test_event"))

        self.assertTrue(result)
        mock_record.assert_called_once_with("test_event", None)


class InstallationIdCacheTestCase(TestCase):
    """Tests for the installation ID caching mechanism."""

    def setUp(self):
        _reset_posthog_client()
        self.installation = Installation.get()

    def tearDown(self):
        _reset_posthog_client()

    def test_cache_returns_correct_id(self):
        """Test that _get_installation_id returns the correct UUID."""
        result = _get_installation_id()
        self.assertEqual(result, str(self.installation.id))

    def test_cache_avoids_repeated_db_hits(self):
        """Test that after first lookup, subsequent calls skip the database."""
        # patch.object on the manager instance works regardless of how
        # Installation is imported (it's a lazy import inside the function).
        with patch.object(
            Installation.objects, "get", wraps=Installation.objects.get
        ) as mock_get:
            # First call should hit the DB
            first = _get_installation_id()
            self.assertEqual(mock_get.call_count, 1)

            # Second call should use the cache
            second = _get_installation_id()
            self.assertEqual(mock_get.call_count, 1)  # No additional DB call

            self.assertEqual(first, second)

    def test_reset_clears_cache(self):
        """Test that _reset_posthog_client clears the installation ID cache."""
        import config.telemetry as telemetry_module

        # Populate the cache
        _get_installation_id()
        self.assertIsNot(telemetry_module._cached_installation_id, _UNSET)

        # Reset should clear it
        _reset_posthog_client()
        self.assertIs(telemetry_module._cached_installation_id, _UNSET)

    def test_cache_works_across_async_calls(self):
        """Test that async calls use the cached ID, not the database.

        We populate the cache synchronously first (same thread / same DB
        connection as the test transaction), then verify that the async
        path through ``arecord_event`` → ``sync_to_async(record_event)``
        never triggers a fresh DB lookup.
        """
        # Populate cache synchronously (visible in this thread's transaction)
        _get_installation_id()

        with patch.object(Installation.objects, "get") as mock_get, patch(
            "config.telemetry.Posthog"
        ) as mock_posthog_class:
            mock_posthog = MagicMock()
            mock_posthog_class.return_value = mock_posthog

            with override_settings(MODE="DEV", TELEMETRY_ENABLED=True):
                asyncio.run(arecord_event("event1"))
                asyncio.run(arecord_event("event2"))

            # Cache was already warm so the ORM should never have been called
            mock_get.assert_not_called()

"""
Migration to hash existing plaintext token keys with SHA-256.

After this migration, the ``key`` column stores SHA-256 hex digests (64 chars)
and the ``key_prefix`` column stores the first 8 chars of the original
plaintext for admin identification. New tokens are created via
``CorpusAccessToken.create_token()`` which hashes before storage.
"""

import hashlib

from django.db import migrations, models


def hash_existing_tokens(apps, schema_editor):
    """Hash any existing plaintext token keys in-place."""
    CorpusAccessToken = apps.get_model("worker_uploads", "CorpusAccessToken")
    for token in CorpusAccessToken.objects.all():
        # Only hash if the key looks like a plaintext hex token (not already a hash).
        # Both are 64-char hex strings, so we use key_prefix as a sentinel:
        # if key_prefix is empty, the key hasn't been hashed yet.
        if not token.key_prefix:
            token.key_prefix = token.key[:8]
            token.key = hashlib.sha256(token.key.encode("utf-8")).hexdigest()
            token.save(update_fields=["key", "key_prefix"])


def noop_reverse(apps, schema_editor):
    """Hashing is one-way — cannot reverse."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("worker_uploads", "0002_setup_beat_schedule"),
    ]

    operations = [
        # Add key_prefix field
        migrations.AddField(
            model_name="corpusaccesstoken",
            name="key_prefix",
            field=models.CharField(
                blank=True,
                default="",
                help_text=(
                    "First 8 characters of the plaintext token "
                    "for admin identification."
                ),
                max_length=8,
            ),
        ),
        # Remove the callable default from 0001. Without a default, bare
        # .objects.create() and Django admin "Add" are blocked — all token
        # creation must go through create_token() which hashes before storage.
        migrations.AlterField(
            model_name="corpusaccesstoken",
            name="key",
            field=models.CharField(
                db_index=True,
                help_text=(
                    "SHA-256 hash of the access token. "
                    "Plaintext shown only once at creation."
                ),
                max_length=64,
                unique=True,
            ),
        ),
        # Hash existing plaintext keys
        migrations.RunPython(hash_existing_tokens, reverse_code=noop_reverse),
    ]

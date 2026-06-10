"""
Data migration to seed default corpus categories.

These categories match the standard legal document types shown in the
Discover page design: Legislation, Contracts, Case Law, Knowledge.
"""

from django.db import migrations

# Constants for system user - used for admin-provisioned data
SYSTEM_USERNAME = "system"
SYSTEM_EMAIL = "system@opencontracts.local"
# Django's unusable password prefix - prevents login even if is_active=True
UNUSABLE_PASSWORD_PREFIX = "!"


def seed_default_categories(apps, schema_editor):
    """Create default corpus categories for the Discover page."""
    CorpusCategory = apps.get_model("corpuses", "CorpusCategory")
    User = apps.get_model("users", "User")

    # Get or create a system user for ownership of default categories
    # Defense-in-depth: is_active=False AND unusable password
    system_user, created = User.objects.get_or_create(
        username=SYSTEM_USERNAME,
        defaults={
            "email": SYSTEM_EMAIL,
            "is_active": False,  # System user cannot log in
            "password": UNUSABLE_PASSWORD_PREFIX,  # Unusable password for defense-in-depth
        },
    )
    # If user already existed, ensure password is unusable
    if not created and not system_user.password.startswith(UNUSABLE_PASSWORD_PREFIX):
        system_user.password = UNUSABLE_PASSWORD_PREFIX
        system_user.save(update_fields=["password"])

    default_categories = [
        {
            "name": "Legislation",
            "description": "Laws, statutes, regulations, and legislative documents",
            "icon": "scroll",
            "color": "#3B82F6",  # Blue
            "sort_order": 1,
        },
        {
            "name": "Contracts",
            "description": "Commercial agreements, legal contracts, and transactional documents",
            "icon": "file-text",
            "color": "#10B981",  # Green
            "sort_order": 2,
        },
        {
            "name": "Case Law",
            "description": "Court decisions, judicial opinions, and legal precedents",
            "icon": "gavel",
            "color": "#8B5CF6",  # Purple
            "sort_order": 3,
        },
        {
            "name": "Knowledge",
            "description": "Legal research, articles, and educational materials",
            "icon": "book-open",
            "color": "#F59E0B",  # Amber
            "sort_order": 4,
        },
    ]

    for category_data in default_categories:
        CorpusCategory.objects.get_or_create(
            name=category_data["name"],
            defaults={
                "description": category_data["description"],
                "icon": category_data["icon"],
                "color": category_data["color"],
                "sort_order": category_data["sort_order"],
                "creator": system_user,
            },
        )


def remove_default_categories(apps, schema_editor):
    """Remove default corpus categories (reverse migration)."""
    CorpusCategory = apps.get_model("corpuses", "CorpusCategory")
    default_names = ["Legislation", "Contracts", "Case Law", "Knowledge"]
    CorpusCategory.objects.filter(name__in=default_names).delete()


class Migration(migrations.Migration):
    # NOTE: No explicit users app dependency needed - Django automatically
    # resolves it via CorpusCategory.creator ForeignKey to User model.

    dependencies = [
        ("corpuses", "0034_add_corpus_category"),
    ]

    operations = [
        migrations.RunPython(seed_default_categories, remove_default_categories),
    ]

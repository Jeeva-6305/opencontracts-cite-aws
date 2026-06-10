"""
Data migration to isolate shared StructuralAnnotationSets.

Before this migration, StructuralAnnotationSets could be shared across multiple
documents (including documents in different corpuses). This caused issues with
per-corpus embeddings since different corpuses may use different embedders with
incompatible vector dimensions.

This migration finds all StructuralAnnotationSets that are shared by multiple
documents and duplicates them so each document has its own isolated copy.
The first document keeps the original set; subsequent documents get copies.

ROLLBACK SUPPORT
================
This migration supports rollback via reverse_migration(). The content_hash format
`{original_hash}_isolated_from{original_pk}_{uuid}` encodes the original set ID,
allowing the reverse migration to restore document relationships and clean up
duplicated sets.

Note: Rollback will delete any embeddings generated on the duplicated sets.
"""

import re
import uuid

from django.db import migrations
from django.db.models import Count


def isolate_structural_annotation_sets(apps, schema_editor):
    """
    Find all StructuralAnnotationSets shared by multiple documents and
    duplicate them so each document has its own isolated copy.
    """
    Document = apps.get_model("documents", "Document")
    StructuralAnnotationSet = apps.get_model("annotations", "StructuralAnnotationSet")
    Annotation = apps.get_model("annotations", "Annotation")

    # Find structural sets used by more than one document
    # Note: related_name from Document.structural_annotation_set is "documents"
    # Process in batches to handle large databases safely
    BATCH_SIZE = 100

    # First, get count for progress indication
    shared_sets_count = (
        StructuralAnnotationSet.objects.annotate(doc_count=Count("documents"))
        .filter(doc_count__gt=1)
        .count()
    )

    if shared_sets_count == 0:
        print("No shared structural annotation sets found to isolate")
        return

    print(f"Found {shared_sets_count} shared structural annotation sets to process...")

    total_duplicated = 0
    processed_sets = 0

    # Process in batches using iterator to avoid loading all into memory
    shared_sets = (
        StructuralAnnotationSet.objects.annotate(doc_count=Count("documents"))
        .filter(doc_count__gt=1)
        .iterator(chunk_size=BATCH_SIZE)
    )

    for struct_set in shared_sets:
        docs = list(Document.objects.filter(structural_annotation_set=struct_set))
        if len(docs) <= 1:
            continue

        # First document keeps original, rest get copies
        for doc in docs[1:]:
            # Create collision-resistant content_hash encoding original set ID
            # Format: {original_hash}_isolated_from{original_pk}_{uuid4}
            # This allows reverse migration to restore original relationships
            new_content_hash = (
                f"{struct_set.content_hash}_isolated_from{struct_set.pk}_"
                f"{uuid.uuid4().hex[:12]}"
            )

            # Verify uniqueness (defensive check)
            while StructuralAnnotationSet.objects.filter(
                content_hash=new_content_hash
            ).exists():
                new_content_hash = (
                    f"{struct_set.content_hash}_isolated_from{struct_set.pk}_"
                    f"{uuid.uuid4().hex[:12]}"
                )

            new_set = StructuralAnnotationSet.objects.create(
                content_hash=new_content_hash,
                parser_name=struct_set.parser_name,
                parser_version=struct_set.parser_version,
                page_count=struct_set.page_count,
                token_count=struct_set.token_count,
                pawls_parse_file=struct_set.pawls_parse_file,
                txt_extract_file=struct_set.txt_extract_file,
                is_public=struct_set.is_public,
                creator_id=struct_set.creator_id,
            )

            # Copy all structural annotations (without embeddings)
            original_annotations = Annotation.objects.filter(structural_set=struct_set)
            new_annotations = [
                Annotation(
                    structural_set=new_set,
                    page=a.page,
                    raw_text=a.raw_text,
                    tokens_jsons=a.tokens_jsons,
                    bounding_box=a.bounding_box,
                    json=a.json,
                    annotation_type=a.annotation_type,
                    annotation_label_id=a.annotation_label_id,
                    structural=True,
                    content_modalities=a.content_modalities,
                    is_public=a.is_public,
                    creator_id=a.creator_id,
                )
                for a in original_annotations
            ]
            Annotation.objects.bulk_create(new_annotations)

            # Update document to point to new set
            doc.structural_annotation_set = new_set
            doc.save(update_fields=["structural_annotation_set"])

            total_duplicated += 1

        processed_sets += 1
        if processed_sets % 10 == 0:
            print(f"  Progress: {processed_sets}/{shared_sets_count} sets processed...")

    print(
        f"Completed: Isolated {total_duplicated} documents from {processed_sets} shared sets"
    )


def reverse_migration(apps, schema_editor):
    """
    Reverse the isolation by restoring documents to their original shared sets.

    This parses the content_hash to find the original set ID, restores the
    document's foreign key, and deletes the duplicated set with its annotations.

    Note: Any embeddings generated on duplicated sets will be lost.
    """
    Document = apps.get_model("documents", "Document")
    StructuralAnnotationSet = apps.get_model("annotations", "StructuralAnnotationSet")
    Annotation = apps.get_model("annotations", "Annotation")

    # Pattern to extract original set ID from content_hash
    # Format: {original_hash}_isolated_from{original_pk}_{uuid}
    pattern = re.compile(r"_isolated_from(\d+)_[a-f0-9]{12}$")

    # Find all isolated sets
    isolated_sets = StructuralAnnotationSet.objects.filter(
        content_hash__contains="_isolated_from"
    )

    count = isolated_sets.count()
    if count == 0:
        print("No isolated structural annotation sets found to restore")
        return

    print(f"Found {count} isolated sets to restore...")

    restored = 0
    errors = 0

    for isolated_set in isolated_sets.iterator(chunk_size=100):
        match = pattern.search(isolated_set.content_hash)
        if not match:
            print(f"  Warning: Could not parse content_hash: {isolated_set.content_hash}")
            errors += 1
            continue

        original_pk = int(match.group(1))

        # Find the original set
        try:
            original_set = StructuralAnnotationSet.objects.get(pk=original_pk)
        except StructuralAnnotationSet.DoesNotExist:
            print(f"  Warning: Original set {original_pk} not found, skipping")
            errors += 1
            continue

        # Update documents pointing to isolated set to point back to original
        docs_updated = Document.objects.filter(
            structural_annotation_set=isolated_set
        ).update(structural_annotation_set=original_set)

        # Delete annotations belonging to isolated set
        Annotation.objects.filter(structural_set=isolated_set).delete()

        # Delete the isolated set
        isolated_set.delete()

        restored += 1
        if restored % 10 == 0:
            print(f"  Progress: {restored}/{count} sets restored...")

    print(f"Completed: Restored {restored} sets ({errors} errors)")


class Migration(migrations.Migration):
    dependencies = [
        ("annotations", "0054_add_content_modalities_gin_index"),
        ("documents", "0026_add_structural_annotation_set"),
    ]

    operations = [
        migrations.RunPython(
            isolate_structural_annotation_sets,
            reverse_migration,
        ),
    ]

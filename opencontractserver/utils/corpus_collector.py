"""
Shared corpus object collection for fork and clone operations.

Forking and cloning a corpus require gathering the same categories
of objects (documents, annotations, labels, folders, relationships, metadata).
This module provides a single source of truth for that collection logic,
eliminating duplication between StartCorpusFork and build_fork_corpus_task.

The export path only needs document IDs and queries DocumentPath directly
to avoid running the full set of queries.

See issue #816 for design rationale.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from opencontractserver.annotations.models import Annotation, Relationship
from opencontractserver.corpuses.models import Corpus, CorpusFolder
from opencontractserver.documents.models import DocumentPath
from opencontractserver.extracts.models import Datacell

logger = logging.getLogger(__name__)


@dataclass
class CorpusObjectCollection:
    """Result of collecting object IDs from a corpus."""

    document_ids: list[int] = field(default_factory=list)
    annotation_ids: list[int] = field(default_factory=list)
    label_set_id: int | None = None
    folder_ids: list[int] = field(default_factory=list)
    relationship_ids: list[int] = field(default_factory=list)
    metadata_column_ids: list[int] = field(default_factory=list)
    metadata_datacell_ids: list[int] = field(default_factory=list)


def collect_corpus_objects(
    corpus: Corpus,
    include_metadata: bool = False,
) -> CorpusObjectCollection:
    """
    Collect object IDs from a corpus for fork or export operations.

    Gathers document IDs (via DocumentPath), user-created annotation IDs,
    label set ID, folder IDs (in tree order), user-created relationship IDs,
    and optionally metadata column/datacell IDs.

    Args:
        corpus: Source corpus to collect from.
        include_metadata: If True, also collect manual metadata column
            and datacell IDs (used by fork, not currently by export).

    Returns:
        CorpusObjectCollection with all collected IDs.
    """
    corpus_pk = corpus.pk

    # Documents: active docs via DocumentPath (distinct guards against
    # multiple active paths pointing to the same document)
    document_ids = list(
        DocumentPath.objects.filter(
            corpus_id=corpus_pk, is_current=True, is_deleted=False
        )
        .values_list("document_id", flat=True)
        .distinct()
    )

    # Annotations: user-created only (not analysis-generated)
    annotation_ids = list(
        Annotation.objects.filter(
            corpus_id=corpus_pk,
            analysis__isnull=True,
        ).values_list("id", flat=True)
    )

    # Label set
    label_set_id = corpus.label_set_id

    # Folders: in tree order (parents before children)
    folder_ids = list(
        CorpusFolder.objects.filter(corpus_id=corpus_pk)
        .with_tree_fields()
        .values_list("id", flat=True)
    )

    # Relationships: user-created only (not analysis-generated)
    relationship_ids = list(
        Relationship.objects.filter(
            corpus_id=corpus_pk,
            analysis__isnull=True,
        ).values_list("id", flat=True)
    )

    # Metadata (optional — used by fork, not currently by export)
    metadata_column_ids = []
    metadata_datacell_ids = []
    if include_metadata:
        metadata_schema = getattr(corpus, "metadata_schema", None)
        if metadata_schema:
            metadata_column_ids = list(
                metadata_schema.columns.filter(is_manual_entry=True).values_list(
                    "id", flat=True
                )
            )

        if metadata_column_ids and document_ids:
            metadata_datacell_ids = list(
                Datacell.objects.filter(
                    document_id__in=document_ids,
                    column_id__in=metadata_column_ids,
                    extract__isnull=True,
                ).values_list("id", flat=True)
            )

    return CorpusObjectCollection(
        document_ids=document_ids,
        annotation_ids=annotation_ids,
        label_set_id=label_set_id,
        folder_ids=folder_ids,
        relationship_ids=relationship_ids,
        metadata_column_ids=metadata_column_ids,
        metadata_datacell_ids=metadata_datacell_ids,
    )

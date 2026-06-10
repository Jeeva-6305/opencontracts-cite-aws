"""
Add HNSW indexes on Embedding vector columns and SearchVectorField on Annotation.

This migration:
0. Enables hnsw.iterative_scan for filtered ANN queries on existing databases
1. Creates HNSW indexes on Embedding vector columns (dims <= 2000) for O(log n) ANN search
2. Adds a search_vector (tsvector) column to Annotation for full-text search
3. Creates a GIN index on search_vector for fast full-text lookups
4. Creates a database trigger to auto-populate search_vector on INSERT/UPDATE
5. Backfills search_vector for existing annotations (may take minutes on large tables)

pgvector HNSW has a hard 2000-dimension limit, so only 384/768/1024/1536 get
HNSW indexes. Higher dims (2048, 3072, 4096) fall back to sequential scan.
A future optimization could use halfvec casting (limit 4000) with query changes.

Uses SeparateDatabaseAndState so Django's migration state tracks the HnswIndex
objects (matching model Meta) while the actual database operations use raw SQL
with CREATE INDEX CONCURRENTLY ... USING hnsw. This is necessary because Django's
AddIndexConcurrently generates B-tree indexes rather than HNSW indexes.

Requires atomic = False for CONCURRENTLY operations.
"""

import django.contrib.postgres.indexes
import django.contrib.postgres.search
from django.db import migrations
from pgvector.django import HnswIndex

# Frozen constants -- do NOT import from application code in migrations.
# Values at time of migration creation (2026-02-28).
HNSW_M = 16
HNSW_EF_CONSTRUCTION = 64

# HNSW index definitions: (index_name, column_name)
# Only dimensions <= 2000 -- pgvector HNSW hard limit.
HNSW_INDEXES = [
    ("emb_hnsw_384", "vector_384"),
    ("emb_hnsw_768", "vector_768"),
    ("emb_hnsw_1024", "vector_1024"),
    ("emb_hnsw_1536", "vector_1536"),
]


def _hnsw_operations():
    """Generate SeparateDatabaseAndState ops for each HNSW index.

    - state_operations: AddIndex with HnswIndex so Django tracks the index
    - database_operations: RunSQL with CREATE INDEX CONCURRENTLY ... USING hnsw
    """
    ops = []
    for index_name, column in HNSW_INDEXES:
        ops.append(
            migrations.SeparateDatabaseAndState(
                state_operations=[
                    migrations.AddIndex(
                        model_name="embedding",
                        index=HnswIndex(
                            name=index_name,
                            fields=[column],
                            m=HNSW_M,
                            ef_construction=HNSW_EF_CONSTRUCTION,
                            opclasses=["vector_cosine_ops"],
                        ),
                    ),
                ],
                database_operations=[
                    migrations.RunSQL(
                        sql=(
                            f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} "
                            f"ON annotations_embedding USING hnsw "
                            f"({column} vector_cosine_ops) "
                            f"WITH (m = {HNSW_M}, "
                            f"ef_construction = {HNSW_EF_CONSTRUCTION});"
                        ),
                        reverse_sql=(
                            f"DROP INDEX CONCURRENTLY IF EXISTS {index_name};"
                        ),
                    ),
                ],
            )
        )
    return ops


class Migration(migrations.Migration):
    atomic = False  # Required for CREATE INDEX CONCURRENTLY

    dependencies = [
        ("annotations", "0062_update_checkconstraint_check_to_condition"),
    ]

    operations = [
        # =================================================================
        # Phase 0: Enable iterative scan and ef_search for filtered ANN queries
        # =================================================================
        # init.sql only runs on fresh databases. This ensures existing
        # deployments also get hnsw.iterative_scan='relaxed_order' and
        # hnsw.ef_search=64, which prevent result loss when combining
        # HNSW search with WHERE clauses (e.g., embedder_path filtering).
        # ef_search >= ef_construction (64) is recommended for good recall.
        # Requires pgvector >= 0.8.
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    EXECUTE 'ALTER DATABASE '
                        || current_database()
                        || $q$ SET hnsw.iterative_scan = 'relaxed_order'$q$;
                    EXECUTE 'ALTER DATABASE '
                        || current_database()
                        || ' SET hnsw.ef_search = 64';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'hnsw settings not available (pgvector < 0.8): %',
                        SQLERRM;
                END $$;
            """,
            reverse_sql="""
                DO $$
                BEGIN
                    EXECUTE 'ALTER DATABASE '
                        || current_database()
                        || ' RESET hnsw.iterative_scan';
                    EXECUTE 'ALTER DATABASE '
                        || current_database()
                        || ' RESET hnsw.ef_search';
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END $$;
            """,
        ),
        # =================================================================
        # Phase 1: HNSW indexes on Embedding vector columns
        # =================================================================
        *_hnsw_operations(),
        # =================================================================
        # Phase 2: SearchVectorField on Annotation
        # =================================================================
        migrations.AddField(
            model_name="annotation",
            name="search_vector",
            field=django.contrib.postgres.search.SearchVectorField(null=True),
        ),
        # GIN index for fast full-text search
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddIndex(
                    model_name="annotation",
                    index=django.contrib.postgres.indexes.GinIndex(
                        fields=["search_vector"],
                        name="annotation_search_vector_gin",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
                        "annotation_search_vector_gin "
                        "ON annotations_annotation USING gin (search_vector);"
                    ),
                    reverse_sql=(
                        "DROP INDEX CONCURRENTLY IF EXISTS "
                        "annotation_search_vector_gin;"
                    ),
                ),
            ],
        ),
        # =================================================================
        # Phase 3: Database trigger to auto-populate search_vector
        # =================================================================
        # NOTE(deferred): FTS config hardcodes 'english'. Multilingual corpora
        # will need per-corpus or per-document text search configuration.
        migrations.RunSQL(
            sql="""
                CREATE OR REPLACE FUNCTION annotation_search_vector_update()
                RETURNS trigger AS $$
                BEGIN
                    NEW.search_vector :=
                        to_tsvector('english', COALESCE(NEW.raw_text, ''));
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER annotation_search_vector_trigger
                    BEFORE INSERT OR UPDATE OF raw_text
                    ON annotations_annotation
                    FOR EACH ROW
                    EXECUTE FUNCTION annotation_search_vector_update();
            """,
            reverse_sql="""
                DROP TRIGGER IF EXISTS annotation_search_vector_trigger
                    ON annotations_annotation;
                DROP FUNCTION IF EXISTS annotation_search_vector_update();
            """,
        ),
        # =================================================================
        # Phase 4: Backfill search_vector for existing annotations
        # =================================================================
        # !! LARGE-TABLE WARNING !!
        # This runs an UNBOUNDED single UPDATE across all rows where
        # search_vector IS NULL. For deployments with >1M annotations,
        # this can hold row-level locks for minutes, blocking concurrent
        # writes to annotations_annotation.
        #
        # Mitigation options for large tables:
        #   1. Run this migration during a maintenance window.
        #   2. Skip this phase and run the backfill manually in chunks:
        #        UPDATE annotations_annotation
        #        SET search_vector = to_tsvector('english', COALESCE(raw_text, ''))
        #        WHERE search_vector IS NULL AND id BETWEEN <start> AND <end>;
        migrations.RunSQL(
            sql="""
                DO $$
                DECLARE
                    row_count BIGINT;
                BEGIN
                    SELECT count(*) INTO row_count
                    FROM annotations_annotation
                    WHERE search_vector IS NULL;

                    RAISE NOTICE '[Phase 4] Backfilling search_vector for % annotations',
                        row_count;

                    UPDATE annotations_annotation
                    SET search_vector = to_tsvector('english',
                                                   COALESCE(raw_text, ''))
                    WHERE search_vector IS NULL;

                    GET DIAGNOSTICS row_count = ROW_COUNT;
                    RAISE NOTICE '[Phase 4] Backfill complete: % rows updated', row_count;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

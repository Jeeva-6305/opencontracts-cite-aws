"""
Unit tests for the relationship file parser.

Tests the CSV parsing functionality for relationship definition files
that can be included in ZIP imports.
"""

import io
import zipfile

from opencontractserver.utils.relationship_file_parser import (
    ParsedRelationship,
    detect_relationship_file,
    normalize_path,
    parse_csv_relationships,
    parse_relationship_file,
)


class TestNormalizePath:
    """Tests for the normalize_path function."""

    def test_normalize_path_adds_leading_slash(self):
        """Path without leading slash gets one added."""
        assert normalize_path("contracts/master.pdf") == "/contracts/master.pdf"

    def test_normalize_path_preserves_leading_slash(self):
        """Path with leading slash is preserved."""
        assert normalize_path("/contracts/master.pdf") == "/contracts/master.pdf"

    def test_normalize_path_removes_duplicate_slashes(self):
        """Duplicate slashes are normalized."""
        assert normalize_path("//contracts//master.pdf") == "/contracts/master.pdf"

    def test_normalize_path_converts_backslashes(self):
        """Windows-style backslashes are converted to forward slashes."""
        assert normalize_path("contracts\\master.pdf") == "/contracts/master.pdf"

    def test_normalize_path_strips_whitespace(self):
        """Leading and trailing whitespace is stripped."""
        assert normalize_path("  /contracts/master.pdf  ") == "/contracts/master.pdf"

    def test_normalize_path_empty_string(self):
        """Empty string returns empty string."""
        assert normalize_path("") == ""

    def test_normalize_path_mixed_separators(self):
        """Mixed path separators are normalized."""
        assert (
            normalize_path("contracts\\amendments/file.pdf")
            == "/contracts/amendments/file.pdf"
        )


class TestDetectRelationshipFile:
    """Tests for the detect_relationship_file function."""

    def test_detect_lowercase_csv(self):
        """Detects relationships.csv."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr(
                "relationships.csv", "source_path,relationship_label,target_path\n"
            )
            zf.writestr("document.pdf", b"PDF content")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            assert detect_relationship_file(zf) == "relationships.csv"

    def test_detect_uppercase_csv(self):
        """Detects RELATIONSHIPS.csv."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr(
                "RELATIONSHIPS.csv", "source_path,relationship_label,target_path\n"
            )

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            assert detect_relationship_file(zf) == "RELATIONSHIPS.csv"

    def test_detect_priority_lowercase_first(self):
        """When both exist, lowercase takes priority."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("relationships.csv", "lowercase content")
            zf.writestr("RELATIONSHIPS.csv", "uppercase content")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            assert detect_relationship_file(zf) == "relationships.csv"

    def test_detect_returns_none_when_not_found(self):
        """Returns None when no relationships file exists."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("document.pdf", b"PDF content")
            zf.writestr("other.csv", "some,data")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            assert detect_relationship_file(zf) is None

    def test_detect_ignores_nested_relationships_file(self):
        """Relationships file in subdirectory is not detected."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("subdir/relationships.csv", "nested content")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            assert detect_relationship_file(zf) is None


class TestParseCsvRelationships:
    """Tests for the parse_csv_relationships function."""

    def test_parse_valid_csv(self):
        """Parse a valid CSV with relationships."""
        content = """source_path,relationship_label,target_path,notes
/contracts/master.pdf,Parent,/contracts/amendments/a1.pdf,
/contracts/master.pdf,References,/exhibits/exhibit_a.pdf,See section 3
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 2
        assert len(result.errors) == 0

        # Check first relationship
        rel1 = result.relationships[0]
        assert rel1.source_path == "/contracts/master.pdf"
        assert rel1.target_path == "/contracts/amendments/a1.pdf"
        assert rel1.label == "Parent"
        assert rel1.notes is None
        assert rel1.relationship_type == "RELATIONSHIP"

        # Check second relationship (with notes)
        rel2 = result.relationships[1]
        assert rel2.source_path == "/contracts/master.pdf"
        assert rel2.target_path == "/exhibits/exhibit_a.pdf"
        assert rel2.label == "References"
        assert rel2.notes == "See section 3"
        assert rel2.relationship_type == "NOTES"

    def test_parse_csv_without_leading_slashes(self):
        """Paths without leading slashes are normalized."""
        content = """source_path,relationship_label,target_path,notes
contracts/master.pdf,Parent,contracts/child.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert result.relationships[0].source_path == "/contracts/master.pdf"
        assert result.relationships[0].target_path == "/contracts/child.pdf"

    def test_parse_csv_case_insensitive_columns(self):
        """Column names are case-insensitive."""
        content = """SOURCE_PATH,RELATIONSHIP_LABEL,TARGET_PATH,NOTES
/doc1.pdf,Parent,/doc2.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1

    def test_parse_csv_missing_required_column(self):
        """Missing required column returns invalid result."""
        content = """source_path,target_path
/doc1.pdf,/doc2.pdf
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is False
        assert any("relationship_label" in err.lower() for err in result.errors)

    def test_parse_csv_missing_source_path_value(self):
        """Row with empty source_path is skipped with error."""
        content = """source_path,relationship_label,target_path,notes
,Parent,/doc2.pdf,
/doc1.pdf,Child,/doc3.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert len(result.errors) == 1
        assert "source_path" in result.errors[0].lower()

    def test_parse_csv_missing_label_value(self):
        """Row with empty label is skipped with error."""
        content = """source_path,relationship_label,target_path,notes
/doc1.pdf,,/doc2.pdf,
/doc3.pdf,Valid,/doc4.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert len(result.errors) == 1

    def test_parse_csv_missing_target_path_value(self):
        """Row with empty target_path is skipped with error."""
        content = """source_path,relationship_label,target_path,notes
/doc1.pdf,Parent,,
/doc1.pdf,Parent,/doc2.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert len(result.errors) == 1
        assert "target_path" in result.errors[0].lower()

    def test_parse_csv_empty_rows_skipped(self):
        """Empty rows are silently skipped."""
        content = """source_path,relationship_label,target_path,notes
/doc1.pdf,Parent,/doc2.pdf,

/doc3.pdf,Child,/doc4.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 2
        assert len(result.errors) == 0

    def test_parse_csv_path_traversal_rejected(self):
        """Path traversal attempts are rejected."""
        content = """source_path,relationship_label,target_path,notes
../../../etc/passwd,Parent,/doc2.pdf,
/doc1.pdf,Parent,/doc2.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert len(result.errors) == 1
        assert "traversal" in result.errors[0].lower()

    def test_parse_csv_path_traversal_in_target(self):
        """Path traversal in target path is rejected."""
        content = """source_path,relationship_label,target_path,notes
/doc1.pdf,Parent,../../secret.pdf,
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 0
        assert len(result.errors) == 1
        assert "traversal" in result.errors[0].lower()

    def test_parse_csv_empty_file(self):
        """Empty file returns valid result with warning."""
        content = ""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 0
        assert len(result.warnings) == 1
        assert "empty" in result.warnings[0].lower()

    def test_parse_csv_whitespace_only(self):
        """Whitespace-only file returns valid result with warning."""
        content = "   \n   \n   "
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 0
        assert len(result.warnings) == 1

    def test_parse_csv_header_only(self):
        """File with only header row returns valid empty result."""
        content = "source_path,relationship_label,target_path,notes\n"
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 0
        assert len(result.errors) == 0

    def test_parse_csv_notes_column_optional(self):
        """CSV without notes column works fine."""
        content = """source_path,relationship_label,target_path
/doc1.pdf,Parent,/doc2.pdf
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert result.relationships[0].notes is None
        assert result.relationships[0].relationship_type == "RELATIONSHIP"

    def test_parse_csv_extra_columns_ignored(self):
        """Extra columns are silently ignored."""
        content = """source_path,relationship_label,target_path,notes,extra_col,another
/doc1.pdf,Parent,/doc2.pdf,some notes,ignored,also ignored
"""
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert result.relationships[0].notes == "some notes"

    def test_parse_csv_windows_line_endings(self):
        """Windows-style CRLF line endings work correctly."""
        content = (
            "source_path,relationship_label,target_path,notes\r\n"
            "/doc1.pdf,Parent,/doc2.pdf,\r\n"
            "/doc3.pdf,Child,/doc4.pdf,\r\n"
        )
        result = parse_csv_relationships(content)

        assert result.is_valid is True
        assert len(result.relationships) == 2


class TestParseRelationshipFile:
    """Tests for the parse_relationship_file function (reads from zip)."""

    def test_parse_from_zip(self):
        """Parse relationships file from an actual zip."""
        csv_content = """source_path,relationship_label,target_path,notes
/contracts/master.pdf,Parent,/contracts/child.pdf,
"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("relationships.csv", csv_content)
            zf.writestr("contracts/master.pdf", b"PDF1")
            zf.writestr("contracts/child.pdf", b"PDF2")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            result = parse_relationship_file(zf, "relationships.csv")

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert result.relationships[0].label == "Parent"

    def test_parse_from_zip_file_not_found(self):
        """Non-existent file returns error."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("other.txt", "content")

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            result = parse_relationship_file(zf, "relationships.csv")

        assert result.is_valid is False
        assert len(result.errors) == 1

    def test_parse_from_zip_utf8_encoding(self):
        """UTF-8 encoded content is parsed correctly."""
        csv_content = """source_path,relationship_label,target_path,notes
/docs/contrat.pdf,Référence,/docs/annexe.pdf,Voir section 3
"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("relationships.csv", csv_content.encode("utf-8"))

        zip_buffer.seek(0)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            result = parse_relationship_file(zf, "relationships.csv")

        assert result.is_valid is True
        assert len(result.relationships) == 1
        assert result.relationships[0].label == "Référence"


class TestParsedRelationship:
    """Tests for the ParsedRelationship dataclass."""

    def test_relationship_type_default(self):
        """Default relationship_type is RELATIONSHIP."""
        rel = ParsedRelationship(
            source_path="/doc1.pdf",
            target_path="/doc2.pdf",
            label="Parent",
        )
        assert rel.relationship_type == "RELATIONSHIP"
        assert rel.notes is None

    def test_notes_type_when_notes_provided(self):
        """relationship_type is set to NOTES when notes are provided."""
        rel = ParsedRelationship(
            source_path="/doc1.pdf",
            target_path="/doc2.pdf",
            label="Reference",
            notes="Some notes here",
            relationship_type="NOTES",
        )
        assert rel.relationship_type == "NOTES"
        assert rel.notes == "Some notes here"

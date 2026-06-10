"""
Tests for the agent tool registry.
"""

from opencontractserver.llms.tools.tool_registry import (
    AVAILABLE_TOOLS,
    ToolCategory,
    ToolDefinition,
    get_all_tools,
    get_tool_by_name,
    get_tool_names,
    get_tools_by_category,
    validate_tool_names,
)


class TestToolRegistry:
    """Tests for the tool registry module."""

    def test_tool_definition_to_dict(self):
        """Test ToolDefinition.to_dict() returns correct structure."""
        tool = ToolDefinition(
            name="test_tool",
            description="A test tool",
            category=ToolCategory.SEARCH,
            requires_corpus=True,
            requires_approval=True,
            parameters=(
                ("query", "Search query", True),
                ("limit", "Max results", False),
            ),
        )

        result = tool.to_dict()

        assert result["name"] == "test_tool"
        assert result["description"] == "A test tool"
        assert result["category"] == "search"
        assert result["requiresCorpus"] is True
        assert result["requiresApproval"] is True
        assert len(result["parameters"]) == 2
        assert result["parameters"][0] == {
            "name": "query",
            "description": "Search query",
            "required": True,
        }
        assert result["parameters"][1] == {
            "name": "limit",
            "description": "Max results",
            "required": False,
        }

    def test_available_tools_not_empty(self):
        """Test that AVAILABLE_TOOLS contains tools."""
        assert len(AVAILABLE_TOOLS) > 0

    def test_all_tools_have_required_fields(self):
        """Test that all tools have required fields."""
        for tool in AVAILABLE_TOOLS:
            assert tool.name, f"Tool missing name: {tool}"
            assert tool.description, f"Tool missing description: {tool.name}"
            assert tool.category, f"Tool missing category: {tool.name}"
            # requires_corpus and requires_approval have defaults

    def test_get_all_tools(self):
        """Test get_all_tools returns all tools as dicts."""
        tools = get_all_tools()

        assert len(tools) == len(AVAILABLE_TOOLS)
        assert all(isinstance(t, dict) for t in tools)
        assert all("name" in t for t in tools)
        assert all("description" in t for t in tools)
        assert all("category" in t for t in tools)

    def test_get_tool_names(self):
        """Test get_tool_names returns list of names."""
        names = get_tool_names()

        assert len(names) == len(AVAILABLE_TOOLS)
        assert all(isinstance(n, str) for n in names)
        # Check some known tools exist
        assert "similarity_search" in names
        assert "load_document_text" in names

    def test_get_tool_by_name_found(self):
        """Test get_tool_by_name returns tool when found."""
        tool = get_tool_by_name("similarity_search")

        assert tool is not None
        assert tool["name"] == "similarity_search"
        assert "description" in tool

    def test_get_tool_by_name_not_found(self):
        """Test get_tool_by_name returns None when not found."""
        tool = get_tool_by_name("nonexistent_tool")

        assert tool is None

    def test_get_tools_by_category_search(self):
        """Test filtering tools by search category."""
        tools = get_tools_by_category("search")

        assert len(tools) > 0
        assert all(t["category"] == "search" for t in tools)
        # similarity_search should be in search category
        tool_names = [t["name"] for t in tools]
        assert "similarity_search" in tool_names

    def test_get_tools_by_category_document(self):
        """Test filtering tools by document category."""
        tools = get_tools_by_category("document")

        assert len(tools) > 0
        assert all(t["category"] == "document" for t in tools)
        tool_names = [t["name"] for t in tools]
        assert "load_document_text" in tool_names

    def test_get_tools_by_category_invalid(self):
        """Test filtering by invalid category returns empty list."""
        tools = get_tools_by_category("invalid_category")

        assert tools == []

    def test_validate_tool_names_all_valid(self):
        """Test validating all valid tool names."""
        names = ["similarity_search", "load_document_text"]
        valid, invalid = validate_tool_names(names)

        assert valid == names
        assert invalid == []

    def test_validate_tool_names_some_invalid(self):
        """Test validating mix of valid and invalid names."""
        names = ["similarity_search", "fake_tool", "load_document_text", "not_real"]
        valid, invalid = validate_tool_names(names)

        assert set(valid) == {"similarity_search", "load_document_text"}
        assert set(invalid) == {"fake_tool", "not_real"}

    def test_validate_tool_names_all_invalid(self):
        """Test validating all invalid tool names."""
        names = ["fake1", "fake2"]
        valid, invalid = validate_tool_names(names)

        assert valid == []
        assert invalid == names

    def test_validate_tool_names_empty(self):
        """Test validating empty list."""
        valid, invalid = validate_tool_names([])

        assert valid == []
        assert invalid == []

    def test_tool_categories_enum(self):
        """Test ToolCategory enum values."""
        assert ToolCategory.SEARCH.value == "search"
        assert ToolCategory.DOCUMENT.value == "document"
        assert ToolCategory.CORPUS.value == "corpus"
        assert ToolCategory.NOTES.value == "notes"
        assert ToolCategory.ANNOTATIONS.value == "annotations"
        assert ToolCategory.COORDINATION.value == "coordination"

    def test_known_tools_exist(self):
        """Test that expected tools exist in registry."""
        expected_tools = [
            "similarity_search",
            "search_exact_text",
            "load_document_summary",
            "load_document_text",
            "get_document_text_length",
            "get_corpus_description",
            "list_documents",
            "ask_document",
        ]

        existing_names = get_tool_names()
        for tool_name in expected_tools:
            assert tool_name in existing_names, f"Expected tool {tool_name} not found"

    def test_approval_required_tools_marked(self):
        """Test that tools requiring approval are marked correctly."""
        # update_corpus_description should require approval
        tool = get_tool_by_name("update_corpus_description")
        assert tool is not None
        assert tool["requiresApproval"] is True

        # similarity_search should not require approval
        tool = get_tool_by_name("similarity_search")
        assert tool is not None
        assert tool["requiresApproval"] is False

    def test_corpus_required_tools_marked(self):
        """Test that tools requiring corpus are marked correctly."""
        # get_corpus_description requires corpus
        tool = get_tool_by_name("get_corpus_description")
        assert tool is not None
        assert tool["requiresCorpus"] is True

        # similarity_search doesn't require corpus
        tool = get_tool_by_name("similarity_search")
        assert tool is not None
        assert tool["requiresCorpus"] is False

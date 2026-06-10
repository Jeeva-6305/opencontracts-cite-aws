"""
MCP (Model Context Protocol) Interface for OpenContracts.

This module provides a read-only Model Context Protocol server interface for OpenContracts,
enabling external AI assistants and tools to access public resources, documents, and corpus
information through the standardized MCP protocol.

The MCP interface focuses on providing read-only access to:
- Public documents and their content
- Public corpus metadata
- Annotation data for accessible documents
- Document structure and relationships

All access is subject to OpenContracts' standard permission checks, ensuring that only
publicly accessible or user-authorized resources are exposed through the MCP interface.

For more information on the Model Context Protocol, see: https://modelcontextprotocol.io
"""

__all__ = []

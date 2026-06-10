"""
Shared test helpers for OpenContracts backend tests.
"""

import io

from pypdf import PdfWriter


def make_test_pdf(num_pages: int) -> bytes:
    """Create a minimal valid PDF with the given number of blank pages."""
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

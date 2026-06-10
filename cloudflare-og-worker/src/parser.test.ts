/**
 * Tests for URL route parser utilities
 */

import { describe, it, expect } from "vitest";
import {
  parseRoute,
  isDeepLinkUrl,
  buildCanonicalUrl,
  getEntityTypeLabel,
} from "./parser";

describe("parseRoute", () => {
  describe("corpus routes", () => {
    it("parses /c/{userSlug}/{corpusSlug}", () => {
      const result = parseRoute("/c/john/legal-contracts");
      expect(result).toEqual({
        type: "corpus",
        userSlug: "john",
        corpusSlug: "legal-contracts",
      });
    });

    it("parses corpus routes with encoded characters", () => {
      const result = parseRoute("/c/john%20doe/my%20corpus");
      expect(result).toEqual({
        type: "corpus",
        userSlug: "john doe",
        corpusSlug: "my corpus",
      });
    });

    it("removes trailing slash from corpus routes", () => {
      const result = parseRoute("/c/john/legal-contracts/");
      expect(result).toEqual({
        type: "corpus",
        userSlug: "john",
        corpusSlug: "legal-contracts",
      });
    });
  });

  describe("document routes", () => {
    it("parses /d/{userSlug}/{documentSlug} (standalone)", () => {
      const result = parseRoute("/d/john/my-document");
      expect(result).toEqual({
        type: "document",
        userSlug: "john",
        documentSlug: "my-document",
      });
    });

    it("parses /d/{userSlug}/{corpusSlug}/{documentSlug} (in corpus)", () => {
      const result = parseRoute("/d/john/legal-contracts/contract-1");
      expect(result).toEqual({
        type: "document_in_corpus",
        userSlug: "john",
        corpusSlug: "legal-contracts",
        documentSlug: "contract-1",
      });
    });
  });

  describe("thread routes", () => {
    it("parses /c/{userSlug}/{corpusSlug}/discussions/{threadId}", () => {
      const result = parseRoute("/c/john/legal-contracts/discussions/123");
      expect(result).toEqual({
        type: "thread",
        userSlug: "john",
        corpusSlug: "legal-contracts",
        threadId: "123",
      });
    });

    it("parses thread routes with base64 thread ID", () => {
      const result = parseRoute("/c/john/legal-contracts/discussions/Q29udmVyc2F0aW9uVHlwZToxMjM=");
      expect(result).toEqual({
        type: "thread",
        userSlug: "john",
        corpusSlug: "legal-contracts",
        threadId: "Q29udmVyc2F0aW9uVHlwZToxMjM=",
      });
    });
  });

  describe("extract routes", () => {
    it("parses /e/{userSlug}/{extractId}", () => {
      const result = parseRoute("/e/john/456");
      expect(result).toEqual({
        type: "extract",
        userSlug: "john",
        extractId: "456",
      });
    });
  });

  describe("non-matching routes", () => {
    it("returns null for root path", () => {
      expect(parseRoute("/")).toBe(null);
    });

    it("returns null for /about", () => {
      expect(parseRoute("/about")).toBe(null);
    });

    it("returns null for /login", () => {
      expect(parseRoute("/login")).toBe(null);
    });

    it("returns null for incomplete corpus path", () => {
      expect(parseRoute("/c/john")).toBe(null);
    });

    it("returns null for incomplete document path", () => {
      expect(parseRoute("/d")).toBe(null);
    });

    it("returns null for unknown paths", () => {
      expect(parseRoute("/unknown/path/here")).toBe(null);
    });
  });

  describe("malformed URL handling", () => {
    it("returns null for invalid percent encoding", () => {
      // Invalid percent encoding that would cause decodeURIComponent to throw
      const result = parseRoute("/c/john/test%E0%A4%A");
      expect(result).toBe(null);
    });

    it("returns null for truncated percent encoding", () => {
      const result = parseRoute("/c/john/%");
      expect(result).toBe(null);
    });
  });
});

describe("isDeepLinkUrl", () => {
  it("returns true for corpus routes", () => {
    expect(isDeepLinkUrl("/c/john/legal-contracts")).toBe(true);
  });

  it("returns true for document routes", () => {
    expect(isDeepLinkUrl("/d/john/my-document")).toBe(true);
  });

  it("returns true for thread routes", () => {
    expect(isDeepLinkUrl("/c/john/legal/discussions/123")).toBe(true);
  });

  it("returns true for extract routes", () => {
    expect(isDeepLinkUrl("/e/john/456")).toBe(true);
  });

  it("returns false for non-deep-link routes", () => {
    expect(isDeepLinkUrl("/")).toBe(false);
    expect(isDeepLinkUrl("/about")).toBe(false);
    expect(isDeepLinkUrl("/login")).toBe(false);
  });
});

describe("buildCanonicalUrl", () => {
  const baseUrl = "https://contracts.example.com";

  it("builds corpus URL", () => {
    const route = { type: "corpus" as const, userSlug: "john", corpusSlug: "legal" };
    expect(buildCanonicalUrl(route, baseUrl)).toBe(
      "https://contracts.example.com/c/john/legal"
    );
  });

  it("builds standalone document URL", () => {
    const route = { type: "document" as const, userSlug: "john", documentSlug: "doc1" };
    expect(buildCanonicalUrl(route, baseUrl)).toBe(
      "https://contracts.example.com/d/john/doc1"
    );
  });

  it("builds document in corpus URL", () => {
    const route = {
      type: "document_in_corpus" as const,
      userSlug: "john",
      corpusSlug: "legal",
      documentSlug: "doc1",
    };
    expect(buildCanonicalUrl(route, baseUrl)).toBe(
      "https://contracts.example.com/d/john/legal/doc1"
    );
  });

  it("builds thread URL", () => {
    const route = {
      type: "thread" as const,
      userSlug: "john",
      corpusSlug: "legal",
      threadId: "123",
    };
    expect(buildCanonicalUrl(route, baseUrl)).toBe(
      "https://contracts.example.com/c/john/legal/discussions/123"
    );
  });

  it("builds extract URL", () => {
    const route = { type: "extract" as const, userSlug: "john", extractId: "456" };
    expect(buildCanonicalUrl(route, baseUrl)).toBe(
      "https://contracts.example.com/e/john/456"
    );
  });

  it("handles base URL with trailing slash", () => {
    const route = { type: "corpus" as const, userSlug: "john", corpusSlug: "legal" };
    expect(buildCanonicalUrl(route, "https://example.com/")).toBe(
      "https://example.com/c/john/legal"
    );
  });
});

describe("getEntityTypeLabel", () => {
  it("returns 'Corpus' for corpus type", () => {
    expect(getEntityTypeLabel("corpus")).toBe("Corpus");
  });

  it("returns 'Document' for document type", () => {
    expect(getEntityTypeLabel("document")).toBe("Document");
  });

  it("returns 'Document' for document_in_corpus type", () => {
    expect(getEntityTypeLabel("document_in_corpus")).toBe("Document");
  });

  it("returns 'Discussion' for thread type", () => {
    expect(getEntityTypeLabel("thread")).toBe("Discussion");
  });

  it("returns 'Data Extract' for extract type", () => {
    expect(getEntityTypeLabel("extract")).toBe("Data Extract");
  });
});

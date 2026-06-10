import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { MetaTags } from "../MetaTags";
import {
  CorpusType,
  DocumentType,
  ExtractType,
} from "../../../types/graphql-api";

// Mock window.location.origin
const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, origin: "https://example.com" },
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
  });
  // Clean up helmet tags between tests
  const helmetTags = window.document.querySelectorAll(
    "[data-react-helmet], link[rel='canonical'], meta[property^='og:'], meta[property^='twitter:']"
  );
  helmetTags.forEach((tag) => tag.remove());
});

// Helper to render MetaTags with required providers
const renderMetaTags = (props: Parameters<typeof MetaTags>[0]) => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/test"]}>
        <MetaTags {...props} />
      </MemoryRouter>
    </HelmetProvider>
  );
};

// Helper to wait for and find meta content
const getMetaContent = async (
  selector: string
): Promise<string | null | undefined> => {
  await waitFor(
    () => {
      const el = window.document.querySelector(selector);
      if (!el) throw new Error(`Element not found: ${selector}`);
      return el;
    },
    { timeout: 1000 }
  );
  return window.document.querySelector(selector)?.getAttribute("content");
};

const getCanonicalHref = async (): Promise<string | null | undefined> => {
  await waitFor(
    () => {
      const el = window.document.querySelector('link[rel="canonical"]');
      if (!el) throw new Error("Canonical link not found");
      return el;
    },
    { timeout: 1000 }
  );
  return window.document
    .querySelector('link[rel="canonical"]')
    ?.getAttribute("href");
};

describe("MetaTags", () => {
  describe("canonical URL generation", () => {
    it("should use canonicalPath prop when provided", async () => {
      renderMetaTags({ canonicalPath: "/custom/path" });

      const href = await getCanonicalHref();
      expect(href).toBe("https://example.com/custom/path");
    });

    it("should generate canonical URL for corpus with /c/ prefix", async () => {
      const corpus = {
        id: "corpus-1",
        title: "Test Corpus",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      renderMetaTags({ entity: corpus, entityType: "corpus" });

      const href = await getCanonicalHref();
      expect(href).toBe("https://example.com/c/john/test-corpus");
    });

    it("should generate canonical URL for standalone document with /d/ prefix", async () => {
      const doc = {
        id: "doc-1",
        title: "Test Document",
        slug: "test-doc",
        creator: { id: "user-1", slug: "jane", username: "jane" },
      } as DocumentType;

      renderMetaTags({ entity: doc, entityType: "document" });

      const href = await getCanonicalHref();
      expect(href).toBe("https://example.com/d/jane/test-doc");
    });

    it("should generate canonical URL for extract with /e/ prefix", async () => {
      const extract = {
        id: "extract-123",
        name: "Test Extract",
        creator: { id: "user-1", slug: "bob", username: "bob" },
      } as ExtractType;

      renderMetaTags({ entity: extract, entityType: "extract" });

      const href = await getCanonicalHref();
      expect(href).toBe("https://example.com/e/bob/extract-123");
    });

    it("should fall back to location.pathname when entity has no creator slug", async () => {
      const corpus = {
        id: "corpus-1",
        title: "Test Corpus",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "", username: "john" },
      } as CorpusType;

      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/c/john/test-corpus"]}>
            <MetaTags entity={corpus} entityType="corpus" />
          </MemoryRouter>
        </HelmetProvider>
      );

      const href = await getCanonicalHref();
      // Falls back to location.pathname since creator.slug is empty
      expect(href).toBe("https://example.com/c/john/test-corpus");
    });

    it("should fall back to location.pathname when entityType is missing", async () => {
      const corpus = {
        id: "corpus-1",
        title: "Test Corpus",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/c/john/test-corpus"]}>
            <MetaTags entity={corpus} />
          </MemoryRouter>
        </HelmetProvider>
      );

      const href = await getCanonicalHref();
      // Falls back to location.pathname since entityType is missing
      expect(href).toBe("https://example.com/c/john/test-corpus");
    });
  });

  describe("OG meta tags", () => {
    it("should set og:url to canonical URL", async () => {
      const corpus = {
        id: "corpus-1",
        title: "Test Corpus",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      renderMetaTags({ entity: corpus, entityType: "corpus" });

      const content = await getMetaContent('meta[property="og:url"]');
      expect(content).toBe("https://example.com/c/john/test-corpus");
    });

    it("should set og:title from entity title", async () => {
      const corpus = {
        id: "corpus-1",
        title: "My Legal Corpus",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      renderMetaTags({ entity: corpus, entityType: "corpus" });

      const content = await getMetaContent('meta[property="og:title"]');
      expect(content).toBe("My Legal Corpus");
    });

    it("should use title prop over entity title", async () => {
      const corpus = {
        id: "corpus-1",
        title: "Entity Title",
        slug: "test-corpus",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      renderMetaTags({
        entity: corpus,
        entityType: "corpus",
        title: "Custom Title",
      });

      const content = await getMetaContent('meta[property="og:title"]');
      expect(content).toBe("Custom Title");
    });
  });

  describe("development warnings", () => {
    it("should warn on unexpected entityType in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const corpus = {
        id: "corpus-1",
        title: "Test",
        slug: "test",
        creator: { id: "user-1", slug: "john", username: "john" },
      } as CorpusType;

      renderMetaTags({
        entity: corpus,
        entityType: "invalid" as "corpus",
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected entityType "invalid"')
      );

      warnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});

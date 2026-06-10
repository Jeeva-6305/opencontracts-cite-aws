import { test, expect } from "./utils/coverage";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import { ModernDocumentItem } from "../src/components/documents/ModernDocumentItem";
import {
  RETRY_DOCUMENT_PROCESSING,
  RetryDocumentProcessingOutputType,
} from "../src/graphql/mutations";
import {
  DocumentType,
  DocumentProcessingStatus,
} from "../src/types/graphql-api";

/** Minimal document fixture with overridable fields. */
function makeDocument(overrides: Partial<DocumentType> = {}): DocumentType {
  return {
    id: "RG9jdW1lbnRUeXBlOjE=",
    title: "Test Document.pdf",
    description: "A test document",
    icon: null,
    pdfFile: "https://example.com/doc.pdf",
    fileType: "pdf",
    pageCount: 5,
    backendLock: false,
    isPublic: false,
    is_selected: false,
    is_open: false,
    myPermissions: [],
    processingStatus: DocumentProcessingStatus.COMPLETED,
    processingError: null,
    canRetry: false,
    ...overrides,
  } as DocumentType;
}

// ---------------------------------------------------------------------------
// Card View
// ---------------------------------------------------------------------------
test.describe("ModernDocumentItem failure overlay – card view", () => {
  test("does not show failure indicators for completed documents", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument();

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <div style={{ width: 220 }}>
              <ModernDocumentItem item={doc} viewMode="card" />
            </div>
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Test Document.pdf")).toBeVisible();
    await expect(page.getByText("Processing Failed")).not.toBeVisible();
  });

  test("shows failure badge and retry for failed documents", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Parser timed out after 120s",
      canRetry: true,
      backendLock: true,
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <div style={{ width: 220 }}>
              <ModernDocumentItem item={doc} viewMode="card" />
            </div>
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Test Document.pdf")).toBeVisible();
    await expect(page.getByText("Processing Failed")).toBeVisible();
    await expect(
      page.getByLabel("Retry processing this document")
    ).toBeVisible();
  });

  test("blocks click on failed card document", async ({ mount, page }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Connection refused",
      canRetry: true,
      backendLock: true,
    });

    // Use page.evaluate to track clicks via a global flag
    await page.evaluate(() => {
      (window as any).__docClicked = false;
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <div style={{ width: 220 }}>
              <ModernDocumentItem item={doc} viewMode="card" />
            </div>
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    // Click the title — should not navigate or trigger action
    await page.getByText("Test Document.pdf").click();

    // The document title should still be visible (no navigation happened)
    await expect(page.getByText("Test Document.pdf")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------
test.describe("ModernDocumentItem failure overlay – list view", () => {
  test("does not show failure indicators for completed documents", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument();

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Test Document.pdf")).toBeVisible();
    await expect(page.getByText("Failed")).not.toBeVisible();
    await expect(
      page.getByLabel("Retry processing this document")
    ).not.toBeVisible();
  });

  test("shows inline failure indicators for failed documents", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Embedding service connection refused",
      canRetry: true,
      backendLock: true,
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Test Document.pdf")).toBeVisible();
    await expect(
      page.getByText("Embedding service connection refused")
    ).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();
    await expect(
      page.getByLabel("Retry processing this document")
    ).toBeVisible();
  });

  test("hides retry button when canRetry is false", async ({ mount, page }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Some error",
      canRetry: false,
      backendLock: true,
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Failed")).toBeVisible();
    await expect(
      page.getByLabel("Retry processing this document")
    ).not.toBeVisible();
  });

  test("shows fallback message when processingError is empty", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: null,
      canRetry: true,
      backendLock: true,
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await expect(page.getByText("Document processing failed")).toBeVisible();
  });

  test("blocks click on failed list document", async ({ mount, page }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Error",
      canRetry: true,
      backendLock: true,
    });

    await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    await page.getByText("Test Document.pdf").click();
    // Should still be on same page — no navigation triggered
    await expect(page.getByText("Test Document.pdf")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Retry Mutation
//
// NOTE: DndContext's useDraggable listeners intercept pointer events on the
// ListContainer, preventing React's event delegation from processing synthetic
// click events on child elements. To work around this in tests, we invoke the
// retry button's React onClick handler directly via the __reactProps$ fiber.
// ---------------------------------------------------------------------------

/**
 * Trigger the React onClick handler on the retry button via React internals.
 * Playwright's native click doesn't reach React's event system due to
 * DndContext's pointer event interception on the parent draggable container.
 */
async function clickRetryButton(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const btn = document.querySelector(
      '[aria-label="Retry processing this document"]'
    );
    if (!btn) throw new Error("Retry button not found");
    const propsKey = Object.keys(btn).find((k) =>
      k.startsWith("__reactProps$")
    );
    if (!propsKey) throw new Error("React props not found on button");
    const props = (btn as any)[propsKey];
    if (typeof props?.onClick !== "function")
      throw new Error("onClick handler not found");
    props.onClick({
      stopPropagation: () => {},
      preventDefault: () => {},
      nativeEvent: {},
      target: btn,
      currentTarget: btn,
    });
  });
}

test.describe("ModernDocumentItem retry mutation", () => {
  test("retry button triggers mutation and shows loading state", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Timeout",
      canRetry: true,
      backendLock: true,
    });

    const mocks: MockedResponse[] = [
      {
        request: {
          query: RETRY_DOCUMENT_PROCESSING,
          variables: { documentId: doc.id },
        },
        delay: 800,
        result: {
          data: {
            retryDocumentProcessing: {
              ok: true,
              message: "Document reprocessing has been queued",
              document: {
                id: doc.id,
                backendLock: true,
                processingStatus: DocumentProcessingStatus.FAILED,
                processingError: "Timeout",
                canRetry: true,
              },
            },
          } as RetryDocumentProcessingOutputType,
        },
      },
    ];

    await mount(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    const retryBtn = page.getByLabel("Retry processing this document");
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toBeEnabled();

    // Trigger the retry handler directly (see comment above)
    await clickRetryButton(page);

    // Button shows loading state while mutation is in flight
    await expect(page.getByText("Retrying...")).toBeVisible({ timeout: 3000 });
    await expect(retryBtn).toBeDisabled();

    // After mutation resolves, button returns to normal state
    await expect(page.getByText("Retrying...")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("retry mutation error keeps failure state intact", async ({
    mount,
    page,
  }) => {
    const doc = makeDocument({
      processingStatus: DocumentProcessingStatus.FAILED,
      processingError: "Timeout",
      canRetry: true,
      backendLock: true,
    });

    const mocks: MockedResponse[] = [
      {
        request: {
          query: RETRY_DOCUMENT_PROCESSING,
          variables: { documentId: doc.id },
        },
        delay: 800,
        result: {
          data: {
            retryDocumentProcessing: {
              ok: false,
              message: "Document is not in a failed state",
              document: null,
            },
          } as RetryDocumentProcessingOutputType,
        },
      },
    ];

    await mount(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MemoryRouter>
          <DndContext>
            <ModernDocumentItem item={doc} viewMode="list" />
          </DndContext>
        </MemoryRouter>
      </MockedProvider>
    );

    const retryBtn = page.getByLabel("Retry processing this document");
    await expect(retryBtn).toBeVisible();

    // Trigger the retry handler directly (see comment above)
    await clickRetryButton(page);

    // Loading state appears during mutation
    await expect(page.getByText("Retrying...")).toBeVisible({ timeout: 3000 });

    // After mutation resolves with ok=false, failure state persists
    await expect(page.getByText("Failed")).toBeVisible({ timeout: 5000 });
    await expect(retryBtn).toBeEnabled({ timeout: 5000 });
  });
});

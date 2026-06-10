// Playwright Component Test for NewNoteModal
// Tests the note creation modal with title/content fields and markdown support info.
import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedProvider } from "@apollo/client/testing";
import { NewNoteModal } from "../src/components/knowledge_base/document/NewNoteModal";
import { CREATE_NOTE } from "../src/graphql/mutations/noteMutations";
import { docScreenshot } from "./utils/docScreenshot";

const DOCUMENT_ID = "RG9jdW1lbnRUeXBlOjE=";
const CORPUS_ID = "Q29ycHVzVHlwZTox";

// Successful creation mock
const createNoteMock = {
  request: {
    query: CREATE_NOTE,
    variables: {
      documentId: DOCUMENT_ID,
      corpusId: CORPUS_ID,
      title: "Test Note",
      content: "Some **markdown** content",
    },
  },
  result: {
    data: {
      createNote: {
        ok: true,
        message: "Note created successfully",
        obj: {
          id: "Tm90ZVR5cGU6MQ==",
          title: "Test Note",
          content: "Some **markdown** content",
          created: "2024-01-01T00:00:00Z",
          modified: "2024-01-01T00:00:00Z",
          creator: {
            id: "VXNlclR5cGU6MQ==",
            email: "admin@example.com",
          },
        },
      },
    },
  },
};

test.describe("NewNoteModal - Rendering", () => {
  test("should render modal with title, content fields, and markdown info", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <NewNoteModal
          isOpen={true}
          onClose={() => {}}
          documentId={DOCUMENT_ID}
          corpusId={CORPUS_ID}
        />
      </MockedProvider>
    );

    // Modal header should be visible
    await expect(page.locator("text=Create New Note")).toBeVisible();

    // Title field should be present
    await expect(
      page.locator('input[placeholder="Enter note title..."]')
    ).toBeVisible();

    // Content textarea should be present
    await expect(
      page.locator('textarea[placeholder="Write your note here..."]')
    ).toBeVisible();

    // Markdown support info should be visible
    await expect(page.getByText("Markdown supported:")).toBeVisible();

    // Action buttons should be present
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Note")')).toBeVisible();

    await docScreenshot(page, "knowledge-base--new-note-modal--initial");

    await component.unmount();
  });

  test("should not render when isOpen is false", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <NewNoteModal
          isOpen={false}
          onClose={() => {}}
          documentId={DOCUMENT_ID}
        />
      </MockedProvider>
    );

    await expect(page.locator("text=Create New Note")).not.toBeVisible();

    await component.unmount();
  });
});

test.describe("NewNoteModal - Behavior", () => {
  test("should disable Create Note button when fields are empty", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <NewNoteModal
          isOpen={true}
          onClose={() => {}}
          documentId={DOCUMENT_ID}
          corpusId={CORPUS_ID}
        />
      </MockedProvider>
    );

    // Create Note button should be disabled when fields are empty
    const createButton = page.locator('button:has-text("Create Note")');
    await expect(createButton).toBeDisabled();

    // Fill only the title
    await page
      .locator('input[placeholder="Enter note title..."]')
      .fill("Test Note");
    await expect(createButton).toBeDisabled();

    // Clear title and fill only content
    await page.locator('input[placeholder="Enter note title..."]').fill("");
    await page
      .locator('textarea[placeholder="Write your note here..."]')
      .fill("Some content");
    await expect(createButton).toBeDisabled();

    // Fill both fields - button should become enabled
    await page
      .locator('input[placeholder="Enter note title..."]')
      .fill("Test Note");
    await expect(createButton).toBeEnabled();

    await component.unmount();
  });

  test("should call onClose when Cancel is clicked", async ({
    mount,
    page,
  }) => {
    let closeCalled = false;

    const component = await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <NewNoteModal
          isOpen={true}
          onClose={() => {
            closeCalled = true;
          }}
          documentId={DOCUMENT_ID}
        />
      </MockedProvider>
    );

    await page.locator('button:has-text("Cancel")').click();
    expect(closeCalled).toBe(true);

    await component.unmount();
  });
});

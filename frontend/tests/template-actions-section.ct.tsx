import React from "react";
import { test, expect } from "./utils/coverage";
import { CorpusActionsSectionTestWrapper } from "./CorpusActionsSectionTestWrapper";
import { GET_CORPUS_ACTION_TEMPLATES } from "../src/graphql/queries";
import { docScreenshot } from "./utils/docScreenshot";

const mockTemplates = [
  {
    id: "tmpl-1",
    name: "Document Description Updater",
    description: "Writes concise document descriptions",
    trigger: "add_document",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "tmpl-2",
    name: "Corpus Description Updater",
    description: "Maintains corpus-level summaries",
    trigger: "add_document",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "tmpl-3",
    name: "Key Terms Annotator",
    description: "Identifies and annotates key terms",
    trigger: "add_document",
    sortOrder: 3,
    isActive: true,
  },
];

const mockActions = [
  {
    id: "action-1",
    name: "Document Description Updater",
    trigger: "add_document",
    disabled: false,
    sourceTemplate: { id: "tmpl-1", name: "Document Description Updater" },
    taskInstructions: "Read the document text and write a description.",
    agentConfig: {
      id: "agent-1",
      name: "Doc Desc Agent",
      description: "Writes descriptions",
    },
    creator: { username: "testuser" },
    created: "2026-01-15T10:00:00Z",
  },
  {
    id: "action-2",
    name: "Custom Extract Action",
    trigger: "add_document",
    disabled: true,
    taskInstructions: null,
    fieldset: { id: "fs-1", name: "Contract Fields" },
    creator: { username: "testuser" },
    created: "2026-02-01T10:00:00Z",
  },
];

const templatesMock = {
  request: {
    query: GET_CORPUS_ACTION_TEMPLATES,
    variables: { isActive: true },
  },
  result: {
    data: {
      corpusActionTemplates: {
        edges: mockTemplates.map((t) => ({ node: t })),
      },
    },
  },
};

test.describe("CorpusActionsSection with Template Library", () => {
  test("shows template badge on template-sourced actions", async ({
    mount,
    page,
  }) => {
    await mount(
      <CorpusActionsSectionTestWrapper
        mocks={[templatesMock]}
        corpusId="corpus-1"
        actions={mockActions as any}
      />
    );

    // The template-sourced action should show a "Template" badge
    await expect(
      page.getByText("Template", { exact: true }).first()
    ).toBeVisible();

    // Both actions should be rendered
    await expect(page.getByText("Document Description Updater")).toBeVisible();
    await expect(page.getByText("Custom Extract Action")).toBeVisible();

    await docScreenshot(page, "corpus-settings--actions-with-template-badge", {
      fullPage: true,
    });
  });

  test("opens template picker dropdown", async ({ mount, page }) => {
    await mount(
      <CorpusActionsSectionTestWrapper
        mocks={[templatesMock]}
        corpusId="corpus-1"
        actions={mockActions as any}
      />
    );

    // Click the "Add from Library" button
    await page.getByText("Add from Library").click();

    // Wait for the dropdown to appear with available templates
    // tmpl-1 is already added, so tmpl-2 and tmpl-3 should be available
    await expect(
      page.getByText("Corpus Description Updater").first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Key Terms Annotator").first()).toBeVisible();

    await docScreenshot(page, "corpus-settings--template-picker-open", {
      fullPage: true,
    });
  });
});

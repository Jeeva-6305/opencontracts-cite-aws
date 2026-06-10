// Playwright Component Test for RunCorpusActionModal
// Tests the modal that lets users select a document and run a corpus action against it.
import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedProvider } from "@apollo/client/testing";
import { RunCorpusActionModal } from "../src/components/corpuses/RunCorpusActionModal";
import { GET_CORPUS_DOCUMENTS_FOR_TOC } from "../src/graphql/queries";
import { RUN_CORPUS_ACTION } from "../src/graphql/mutations";
import { CORPUS_DOCUMENTS_TOC_LIMIT } from "../src/assets/configurations/constants";
import { docScreenshot } from "./utils/docScreenshot";

const CORPUS_ID = "Q29ycHVzVHlwZTox";
const ACTION_ID = "Q29ycHVzQWN0aW9uVHlwZTox";
const ACTION_NAME = "Extract Contract Terms";

const mockDocuments = [
  {
    id: "RG9jdW1lbnRUeXBlOjE=",
    title: "Sample Contract.pdf",
    description: "A sample contract document",
    slug: "sample-contract",
    icon: null,
    fileType: "application/pdf",
    creator: { slug: "admin" },
  },
  {
    id: "RG9jdW1lbnRUeXBlOjI=",
    title: "NDA Agreement.pdf",
    description: "Non-disclosure agreement",
    slug: "nda-agreement",
    icon: null,
    fileType: "application/pdf",
    creator: { slug: "admin" },
  },
];

// Standard documents query mock
const getDocumentsMock = {
  request: {
    query: GET_CORPUS_DOCUMENTS_FOR_TOC,
    variables: { corpusId: CORPUS_ID, first: CORPUS_DOCUMENTS_TOC_LIMIT },
  },
  result: {
    data: {
      documents: {
        edges: mockDocuments.map((doc) => ({ node: doc })),
        totalCount: mockDocuments.length,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    },
  },
};

// Duplicate mock for refetches
const getDocumentsMockDuplicate = { ...getDocumentsMock };

test.describe("RunCorpusActionModal - Rendering", () => {
  test("should render modal with action name and document dropdown", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[getDocumentsMock, getDocumentsMockDuplicate]}
        addTypename={false}
      >
        <RunCorpusActionModal
          open={true}
          corpusId={CORPUS_ID}
          actionId={ACTION_ID}
          actionName={ACTION_NAME}
          onClose={() => {}}
        />
      </MockedProvider>
    );

    // Header should show the action name
    await expect(page.locator(`text=Run: ${ACTION_NAME}`)).toBeVisible();

    // Instruction text should be visible
    await expect(
      page.locator("text=Select a document to run this action against")
    ).toBeVisible();

    // Document dropdown should be present
    await expect(page.locator("text=Select document...")).toBeVisible();

    // Action buttons should be present
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Run")')).toBeVisible();

    // Run button should be disabled without a document selected
    await expect(page.locator('button:has-text("Run")')).toBeDisabled();

    await docScreenshot(page, "corpus-actions--run-action-modal--initial");

    await component.unmount();
  });

  test("should not render when open is false", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider mocks={[]} addTypename={false}>
        <RunCorpusActionModal
          open={false}
          corpusId={CORPUS_ID}
          actionId={ACTION_ID}
          actionName={ACTION_NAME}
          onClose={() => {}}
        />
      </MockedProvider>
    );

    await expect(page.locator(`text=Run: ${ACTION_NAME}`)).not.toBeVisible();

    await component.unmount();
  });
});

test.describe("RunCorpusActionModal - Behavior", () => {
  test("should show documents in the dropdown when clicked", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[getDocumentsMock, getDocumentsMockDuplicate]}
        addTypename={false}
      >
        <RunCorpusActionModal
          open={true}
          corpusId={CORPUS_ID}
          actionId={ACTION_ID}
          actionName={ACTION_NAME}
          onClose={() => {}}
        />
      </MockedProvider>
    );

    // Wait for documents to load
    await page.waitForTimeout(500);

    // Click the dropdown to show options
    await page.locator(".oc-dropdown").click();
    await page.waitForTimeout(300);

    // Documents should appear in the dropdown
    await expect(
      page.locator('[role="option"]:has-text("Sample Contract.pdf")')
    ).toBeVisible();
    await expect(
      page.locator('[role="option"]:has-text("NDA Agreement.pdf")')
    ).toBeVisible();

    await component.unmount();
  });

  test("should call onClose when Cancel is clicked", async ({
    mount,
    page,
  }) => {
    let closeCalled = false;

    const component = await mount(
      <MockedProvider
        mocks={[getDocumentsMock, getDocumentsMockDuplicate]}
        addTypename={false}
      >
        <RunCorpusActionModal
          open={true}
          corpusId={CORPUS_ID}
          actionId={ACTION_ID}
          actionName={ACTION_NAME}
          onClose={() => {
            closeCalled = true;
          }}
        />
      </MockedProvider>
    );

    await page.locator('button:has-text("Cancel")').click();
    expect(closeCalled).toBe(true);

    await component.unmount();
  });
});

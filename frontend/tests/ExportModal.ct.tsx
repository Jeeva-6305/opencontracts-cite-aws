// Playwright Component Test for ExportModal
// Tests the export listing modal with search and lazy-loaded export items.
import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedProvider } from "@apollo/client/testing";
import { ExportModal } from "../src/components/widgets/modals/ExportModal";
import { GET_EXPORTS } from "../src/graphql/queries";
import { docScreenshot } from "./utils/docScreenshot";

// Mock export items
const mockExports = [
  {
    id: "RXhwb3J0VHlwZTox",
    name: "Contract Corpus Export",
    finished: "2024-01-15T12:00:00Z",
    started: "2024-01-15T11:55:00Z",
    created: "2024-01-15T11:55:00Z",
    errors: "",
    backendLock: false,
    file: "https://example.com/exports/export1.zip",
  },
  {
    id: "RXhwb3J0VHlwZToy",
    name: "NDA Collection Export",
    finished: null,
    started: "2024-01-16T10:00:00Z",
    created: "2024-01-16T10:00:00Z",
    errors: "",
    backendLock: true,
    file: "",
  },
];

// The ExportModal uses useLazyQuery and calls fetchExports() on mount.
// The lazy query is called with empty variables initially.
const getExportsMock = {
  request: {
    query: GET_EXPORTS,
    variables: {},
  },
  result: {
    data: {
      userexports: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          endCursor: null,
          startCursor: null,
        },
        edges: mockExports.map((exp) => ({ node: exp })),
      },
    },
  },
};

// Duplicate mocks since the component fires fetchExports() from multiple effects
const getExportsMockDuplicate = { ...getExportsMock };
const getExportsMockTriplicate = { ...getExportsMock };

// Empty results mock
const getExportsEmptyMock = {
  request: {
    query: GET_EXPORTS,
    variables: {},
  },
  result: {
    data: {
      userexports: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          endCursor: null,
          startCursor: null,
        },
        edges: [],
      },
    },
  },
};

test.describe("ExportModal - Rendering", () => {
  test("should render modal with header, search bar, and export list", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[
          getExportsMock,
          getExportsMockDuplicate,
          getExportsMockTriplicate,
        ]}
        addTypename={false}
      >
        <ExportModal visible={true} toggleModal={() => {}} />
      </MockedProvider>
    );

    // Header should display the title
    await expect(page.locator("text=Corpus Exports")).toBeVisible();

    // Warning message should be visible
    await expect(
      page.locator("text=WARNING - If you have a free account")
    ).toBeVisible();

    // Search bar placeholder should be visible
    await expect(
      page.locator('input[placeholder="Search for export by name..."]')
    ).toBeVisible();

    // Close button should be present
    await expect(page.locator('button:has-text("Close")')).toBeVisible();

    // Wait for exports to load
    await page.waitForTimeout(500);

    await docScreenshot(page, "widgets--export-modal--initial");

    await component.unmount();
  });

  test("should not render when visible is false", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider mocks={[getExportsMock]} addTypename={false}>
        <ExportModal visible={false} toggleModal={() => {}} />
      </MockedProvider>
    );

    await expect(page.locator("text=Corpus Exports")).not.toBeVisible();

    await component.unmount();
  });
});

test.describe("ExportModal - Behavior", () => {
  test("should call toggleModal when Close is clicked", async ({
    mount,
    page,
  }) => {
    let toggleCalled = false;

    const component = await mount(
      <MockedProvider
        mocks={[
          getExportsMock,
          getExportsMockDuplicate,
          getExportsMockTriplicate,
        ]}
        addTypename={false}
      >
        <ExportModal
          visible={true}
          toggleModal={() => {
            toggleCalled = true;
          }}
        />
      </MockedProvider>
    );

    await page.locator('button:has-text("Close")').click();
    expect(toggleCalled).toBe(true);

    await component.unmount();
  });

  test("should render with empty export list", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider
        mocks={[
          getExportsEmptyMock,
          { ...getExportsEmptyMock },
          { ...getExportsEmptyMock },
        ]}
        addTypename={false}
      >
        <ExportModal visible={true} toggleModal={() => {}} />
      </MockedProvider>
    );

    // Modal should still render
    await expect(page.locator("text=Corpus Exports")).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(500);

    await component.unmount();
  });
});

import React from "react";
import { test, expect } from "./utils/coverage";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ActionExecutionTrail } from "../src/components/corpuses/ActionExecutionTrail";
import { docScreenshot } from "./utils/docScreenshot";
import {
  GET_CORPUS_ACTION_EXECUTIONS,
  GET_CORPUS_ACTION_TRAIL_STATS,
  GET_CORPUS_ACTIONS,
  CorpusActionExecutionNode,
  CorpusActionTrailStats,
} from "../src/graphql/queries";

// ============================================================
// MOCK DATA
// ============================================================

const mockExecution: CorpusActionExecutionNode = {
  id: "exec-1",
  status: "completed",
  actionType: "fieldset",
  trigger: "add_document",
  queuedAt: "2025-01-15T10:00:00Z",
  startedAt: "2025-01-15T10:00:05Z",
  completedAt: "2025-01-15T10:00:35Z",
  durationSeconds: 30,
  waitTimeSeconds: 5,
  errorMessage: "",
  affectedObjects: [
    { type: "extract", id: 1 },
    { type: "datacell", id: 2, column_name: "parties" },
    { type: "datacell", id: 3, column_name: "effective_date" },
  ],
  executionMetadata: { model: "gpt-4", tokens_used: 1500 },
  corpusAction: {
    id: "action-1",
    name: "Extract Contract Fields",
    fieldset: { id: "fs-1", name: "Contract Fieldset" },
  },
  document: {
    id: "doc-1",
    title: "Sample Contract.pdf",
    slug: "sample-contract",
    creator: { id: "user-1", slug: "john" },
  },
  corpus: {
    id: "corpus-1",
    slug: "legal-corpus",
    creator: { id: "user-1", slug: "john" },
  },
  extract: { id: "extract-1", name: "Contract Extract" },
  creator: { id: "user-1", username: "john" },
};

const mockFailedExecution: CorpusActionExecutionNode = {
  ...mockExecution,
  id: "exec-2",
  status: "failed",
  errorMessage: "Connection timeout while processing document",
  completedAt: "2025-01-15T10:01:00Z",
  durationSeconds: 55,
  affectedObjects: [],
};

const mockRunningExecution: CorpusActionExecutionNode = {
  ...mockExecution,
  id: "exec-3",
  status: "running",
  completedAt: null,
  durationSeconds: null,
  affectedObjects: [],
};

const mockStats: CorpusActionTrailStats = {
  totalExecutions: 150,
  completed: 120,
  failed: 10,
  running: 5,
  queued: 10,
  skipped: 5,
  avgDurationSeconds: 25.5,
  fieldsetCount: 80,
  analyzerCount: 40,
  agentCount: 30,
};

const mockActions = [
  {
    id: "action-1",
    name: "Extract Contract Fields",
    trigger: "add_document",
    disabled: false,
    runOnAllCorpuses: false,
    creator: { id: "user-1", username: "john" },
    fieldset: { id: "fs-1", name: "Contract Fieldset" },
    analyzer: null,
    agentConfig: null,
    taskInstructions: null,
    preAuthorizedTools: [],
    created: "2025-01-01T00:00:00Z",
    modified: "2025-01-01T00:00:00Z",
  },
];

// ============================================================
// GRAPHQL MOCKS
// ============================================================

const createMocks = (
  options: {
    executions?: CorpusActionExecutionNode[];
    stats?: CorpusActionTrailStats;
  } = {}
): MockedResponse[] => [
  {
    request: {
      query: GET_CORPUS_ACTION_EXECUTIONS,
      variables: {
        corpusId: "corpus-1",
        first: 25,
      },
    },
    result: {
      data: {
        corpusActionExecutions: {
          edges: (options.executions || [mockExecution]).map((node) => ({
            node,
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: (options.executions || [mockExecution]).length,
        },
      },
    },
  },
  {
    request: {
      query: GET_CORPUS_ACTION_TRAIL_STATS,
      variables: { corpusId: "corpus-1" },
    },
    result: {
      data: {
        corpusActionTrailStats: options.stats || mockStats,
      },
    },
  },
  {
    request: {
      query: GET_CORPUS_ACTIONS,
      variables: { corpusId: "corpus-1" },
    },
    result: {
      data: {
        corpusActions: {
          edges: mockActions.map((node) => ({ node })),
        },
      },
    },
  },
];

// ============================================================
// TRAIL COMPONENT TESTS
// ============================================================

test.describe("ActionExecutionTrail Component", () => {
  test("should load and display executions", async ({ mount, page }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data to load - component uses role="list"
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Execution row should be visible with action name (use role="button" from row header)
    await expect(
      page.getByRole("button", { name: /Extract Contract Fields/ })
    ).toBeVisible();
    await expect(page.getByText("Sample Contract.pdf")).toBeVisible();

    await docScreenshot(page, "corpus-actions--execution-trail--with-data");
  });

  test("should display filter dropdowns", async ({ mount, page }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for initial load
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Check filter dropdowns are visible (use aria-label selectors)
    await expect(page.locator('[aria-label="Filter by status"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by type"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by action"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by time"]')).toBeVisible();

    await docScreenshot(page, "corpus-actions--execution-trail--filters");
  });

  test("should show empty state when no executions", async ({
    mount,
    page,
  }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider
          mocks={createMocks({ executions: [] })}
          addTypename={false}
        >
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for empty state
    await expect(page.getByText("No Executions Found")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/Executions will appear when documents are processed/)
    ).toBeVisible();
  });

  test("should show results count when executions exist", async ({
    mount,
    page,
  }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Check for results count - component shows "X of Y" format
    await expect(page.getByText(/1 of 1/)).toBeVisible();
  });

  test("filters should have accessible search region", async ({
    mount,
    page,
  }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Check search region
    const searchRegion = page.getByRole("search", {
      name: "Filter action executions",
    });
    await expect(searchRegion).toBeVisible();
  });
});

// ============================================================
// MOBILE RESPONSIVE TESTS
// ============================================================

test.describe("ActionExecutionTrail Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("should display compact layout on mobile", async ({ mount, page }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Filters should still be visible
    const searchRegion = page.getByRole("search", {
      name: "Filter action executions",
    });
    await expect(searchRegion).toBeVisible();

    // Execution row should be visible and readable (use role="button" from row header)
    await expect(
      page.getByRole("button", { name: /Extract Contract Fields/ })
    ).toBeVisible();
  });
});

// ============================================================
// DESKTOP LAYOUT TESTS
// ============================================================

test.describe("ActionExecutionTrail Desktop Layout", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("should display full layout on desktop", async ({ mount, page }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // All filter dropdowns visible (use aria-label locators)
    await expect(page.locator('[aria-label="Filter by status"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by type"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by action"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by time"]')).toBeVisible();

    // Execution row should be visible (use role="button" from row header)
    await expect(
      page.getByRole("button", { name: /Extract Contract Fields/ })
    ).toBeVisible();
    await expect(page.getByText("Sample Contract.pdf")).toBeVisible();
  });
});

// ============================================================
// ACCESSIBILITY TESTS
// ============================================================

test.describe("ActionExecutionTrail Accessibility", () => {
  test("should have proper ARIA roles and labels", async ({ mount, page }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Check main regions - component has search region and list
    await expect(
      page.getByRole("search", { name: "Filter action executions" })
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Action executions" })
    ).toBeVisible();
  });

  test("should have accessible status announcements", async ({
    mount,
    page,
  }) => {
    await mount(
      <MemoryRouter>
        <MockedProvider mocks={createMocks()} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for data
    await page.waitForSelector('[role="list"]', { timeout: 10000 });

    // Check for live region with results count
    const statusElement = page.getByRole("status");
    await expect(statusElement.first()).toBeVisible();
  });
});

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

test.describe("ActionExecutionTrail Error Handling", () => {
  test("should display error message when query fails", async ({
    mount,
    page,
  }) => {
    const errorMocks: MockedResponse[] = [
      {
        request: {
          query: GET_CORPUS_ACTION_EXECUTIONS,
          variables: {
            corpusId: "corpus-1",
            first: 25,
          },
        },
        error: new Error("Network error: Failed to fetch"),
      },
      {
        request: {
          query: GET_CORPUS_ACTION_TRAIL_STATS,
          variables: { corpusId: "corpus-1" },
        },
        result: {
          data: {
            corpusActionTrailStats: mockStats,
          },
        },
      },
      {
        request: {
          query: GET_CORPUS_ACTIONS,
          variables: { corpusId: "corpus-1" },
        },
        result: {
          data: {
            corpusActions: {
              edges: [],
            },
          },
        },
      },
    ];

    await mount(
      <MemoryRouter>
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <ActionExecutionTrail corpusId="corpus-1" />
        </MockedProvider>
      </MemoryRouter>
    );

    // Wait for error message
    await expect(page.getByText("Error Loading Executions")).toBeVisible({
      timeout: 10000,
    });
  });
});

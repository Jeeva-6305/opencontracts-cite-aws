import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedProvider } from "@apollo/client/testing";
import { CorpusEngagementDashboard } from "../src/components/analytics/CorpusEngagementDashboard";
import { GET_CORPUS_ENGAGEMENT_METRICS } from "../src/graphql/queries";
import { docScreenshot } from "./utils/docScreenshot";

const corpusId = "Q29ycHVzVHlwZTox";

const engagementMetricsMock = {
  request: {
    query: GET_CORPUS_ENGAGEMENT_METRICS,
    variables: { corpusId },
  },
  result: {
    data: {
      corpus: {
        id: corpusId,
        title: "Test Corpus",
        engagementMetrics: {
          totalThreads: 24,
          activeThreads: 8,
          totalMessages: 312,
          messagesLast7Days: 45,
          messagesLast30Days: 128,
          uniqueContributors: 15,
          activeContributors30Days: 9,
          totalUpvotes: 87,
          avgMessagesPerThread: 13.0,
          lastUpdated: "2026-03-20T10:00:00Z",
        },
      },
    },
  },
};

const loadingMock = {
  request: {
    query: GET_CORPUS_ENGAGEMENT_METRICS,
    variables: { corpusId },
  },
  delay: 500,
  result: engagementMetricsMock.result,
};

const errorMock = {
  request: {
    query: GET_CORPUS_ENGAGEMENT_METRICS,
    variables: { corpusId },
  },
  error: new Error("Network error: Failed to fetch"),
};

const emptyMock = {
  request: {
    query: GET_CORPUS_ENGAGEMENT_METRICS,
    variables: { corpusId },
  },
  result: {
    data: {
      corpus: {
        id: corpusId,
        title: "Empty Corpus",
        engagementMetrics: null,
      },
    },
  },
};

test.describe("CorpusEngagementDashboard", () => {
  test("renders engagement metrics with stats and chart", async ({
    mount,
    page,
  }) => {
    await mount(
      <MockedProvider mocks={[engagementMetricsMock]} addTypename={false}>
        <CorpusEngagementDashboard corpusId={corpusId} />
      </MockedProvider>
    );

    // Wait for heading and section titles
    await expect(page.getByText("Engagement Analytics")).toBeVisible();
    await expect(page.getByText("Thread Metrics")).toBeVisible();
    await expect(
      page.getByText("Message Activity", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Community Engagement")).toBeVisible();

    // Verify stat labels are present
    await expect(page.getByText("Total Threads")).toBeVisible();
    await expect(page.getByText("Active Threads")).toBeVisible();
    await expect(page.getByText("Total Messages")).toBeVisible();
    await expect(page.getByText("All Contributors")).toBeVisible();
    await expect(page.getByText("Total Upvotes")).toBeVisible();

    await docScreenshot(page, "analytics--engagement-dashboard--with-data");
  });

  test("shows loading state", async ({ mount, page }) => {
    await mount(
      <MockedProvider mocks={[loadingMock]} addTypename={false}>
        <CorpusEngagementDashboard corpusId={corpusId} />
      </MockedProvider>
    );

    await expect(page.getByText("Loading engagement metrics...")).toBeVisible();

    await docScreenshot(page, "analytics--engagement-dashboard--loading");
  });

  test("shows error state", async ({ mount, page }) => {
    await mount(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <CorpusEngagementDashboard corpusId={corpusId} />
      </MockedProvider>
    );

    await expect(page.getByText("Error Loading Metrics")).toBeVisible();

    await docScreenshot(page, "analytics--engagement-dashboard--error");
  });

  test("shows empty state when no metrics", async ({ mount, page }) => {
    await mount(
      <MockedProvider mocks={[emptyMock]} addTypename={false}>
        <CorpusEngagementDashboard corpusId={corpusId} />
      </MockedProvider>
    );

    await expect(page.getByText("No Engagement Data Available")).toBeVisible();

    await docScreenshot(page, "analytics--engagement-dashboard--empty");
  });
});

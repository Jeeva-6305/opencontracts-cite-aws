import { test, expect } from "./utils/coverage";
import { GlobalDiscussions } from "../src/views/GlobalDiscussions";
import { GET_CONVERSATIONS } from "../src/graphql/queries";
import { GlobalDiscussionsTestWrapper } from "./GlobalDiscussionsTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

// Helper to build a mock conversation edge
const mockThread = (
  id: string,
  title: string,
  description: string,
  overrides?: Record<string, unknown>
) => ({
  __typename: "ConversationTypeEdge" as const,
  node: {
    __typename: "ConversationType" as const,
    id,
    conversationType: "THREAD",
    title,
    description,
    createdAt: "2025-06-10T10:00:00Z",
    updatedAt: "2025-06-11T15:30:00Z",
    creator: {
      __typename: "UserType" as const,
      id: "user-1",
      username: "jsmith",
      email: "jsmith@example.com",
    },
    chatWithCorpus: null,
    chatWithDocument: null,
    chatMessages: {
      __typename: "ChatMessageTypeConnection" as const,
      totalCount: 3,
    },
    isPublic: true,
    myPermissions: ["read"],
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    isPinned: false,
    pinnedBy: null,
    pinnedAt: null,
    deletedAt: null,
    upvoteCount: 0,
    downvoteCount: 0,
    userVote: null,
    ...overrides,
  },
});

const emptyResult = {
  conversations: {
    __typename: "ConversationTypeConnection",
    edges: [],
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    },
    totalCount: 0,
  },
};

// Corpus threads
const corpusThreads = {
  conversations: {
    __typename: "ConversationTypeConnection",
    edges: [
      mockThread(
        "corpus-thread-1",
        "NDA template clause review",
        "Reviewing standard NDA clauses across the portfolio.",
        {
          chatWithCorpus: {
            __typename: "CorpusType",
            id: "corpus-1",
            title: "NDA Templates",
            slug: "nda-templates",
            creator: {
              __typename: "UserType",
              id: "user-1",
              slug: "jsmith",
              username: "jsmith",
            },
          },
          isPinned: true,
          pinnedBy: {
            __typename: "UserType",
            id: "user-1",
            username: "jsmith",
          },
          pinnedAt: "2025-06-11T12:00:00Z",
          upvoteCount: 4,
          chatMessages: {
            __typename: "ChatMessageTypeConnection",
            totalCount: 9,
          },
          creator: {
            __typename: "UserType",
            id: "user-2",
            username: "agarcia",
            email: "agarcia@example.com",
          },
        }
      ),
      mockThread(
        "corpus-thread-2",
        "Indemnification comparison across vendors",
        "How do indemnification provisions compare across the vendor corpus?",
        {
          chatWithCorpus: {
            __typename: "CorpusType",
            id: "corpus-2",
            title: "Vendor Agreements",
            slug: "vendor-agreements",
            creator: {
              __typename: "UserType",
              id: "user-1",
              slug: "jsmith",
              username: "jsmith",
            },
          },
          upvoteCount: 2,
          chatMessages: {
            __typename: "ChatMessageTypeConnection",
            totalCount: 5,
          },
        }
      ),
    ],
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    },
    totalCount: 2,
  },
};

// Document threads
const documentThreads = {
  conversations: {
    __typename: "ConversationTypeConnection",
    edges: [
      mockThread(
        "doc-thread-1",
        "Force majeure scope needs narrowing",
        "The pandemic language added in 2021 conflicts with the original limitation.",
        {
          chatWithCorpus: {
            __typename: "CorpusType",
            id: "corpus-1",
            title: "NDA Templates",
            slug: "nda-templates",
            creator: {
              __typename: "UserType",
              id: "user-1",
              slug: "jsmith",
              username: "jsmith",
            },
          },
          chatWithDocument: {
            __typename: "DocumentType",
            id: "doc-1",
            title: "Master Services Agreement v3",
          },
          upvoteCount: 6,
          downvoteCount: 1,
          chatMessages: {
            __typename: "ChatMessageTypeConnection",
            totalCount: 14,
          },
          creator: {
            __typename: "UserType",
            id: "user-3",
            username: "mrodriguez",
            email: "mrod@example.com",
          },
        }
      ),
    ],
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    },
    totalCount: 1,
  },
};

// General threads
const generalThreads = {
  conversations: {
    __typename: "ConversationTypeConnection",
    edges: [
      mockThread(
        "general-thread-1",
        "Best practices for tagging legal provisions",
        "Let's align on taxonomy for provision-level annotations.",
        {
          upvoteCount: 8,
          chatMessages: {
            __typename: "ChatMessageTypeConnection",
            totalCount: 22,
          },
          creator: {
            __typename: "UserType",
            id: "user-4",
            username: "kchan",
            email: "kchan@example.com",
          },
        }
      ),
      mockThread(
        "general-thread-2",
        "Platform onboarding feedback",
        "Sharing initial impressions and improvement ideas.",
        {
          chatMessages: {
            __typename: "ChatMessageTypeConnection",
            totalCount: 7,
          },
        }
      ),
    ],
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: "",
      endCursor: "",
    },
    totalCount: 2,
  },
};

// Build mocks for all three section queries (corpus, document, general)
function buildAllSectionMocks() {
  return [
    // Corpus section: hasCorpus=true, hasDocument=false
    {
      request: {
        query: GET_CONVERSATIONS,
        variables: {
          conversationType: "THREAD",
          limit: 20,
          hasCorpus: true,
          hasDocument: false,
        },
      },
      result: { data: corpusThreads },
    },
    // Document section: hasDocument=true
    {
      request: {
        query: GET_CONVERSATIONS,
        variables: {
          conversationType: "THREAD",
          limit: 20,
          hasDocument: true,
        },
      },
      result: { data: documentThreads },
    },
    // General section: hasCorpus=false, hasDocument=false
    {
      request: {
        query: GET_CONVERSATIONS,
        variables: {
          conversationType: "THREAD",
          limit: 20,
          hasCorpus: false,
          hasDocument: false,
        },
      },
      result: { data: generalThreads },
    },
  ];
}

test.describe("GlobalDiscussions", () => {
  test("renders all sections with filter tabs and search", async ({
    mount,
    page,
  }) => {
    const mocks = buildAllSectionMocks();

    await mount(
      <GlobalDiscussionsTestWrapper mocks={mocks}>
        <GlobalDiscussions />
      </GlobalDiscussionsTestWrapper>
    );

    // Title should be visible
    await expect(
      page.getByRole("heading", { name: "Discussions", exact: true })
    ).toBeVisible();

    // Filter tabs should render with correct labels (role="tab" from @os-legal/ui FilterTabs)
    await expect(page.getByRole("tab", { name: /All/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Corpus/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Document/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /General/i })).toBeVisible();

    // Search box should be visible
    await expect(page.getByPlaceholder("Search discussions...")).toBeVisible();

    // Wait for thread data to load
    await expect(page.getByText("NDA template clause review")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Force majeure scope needs narrowing")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Best practices for tagging legal provisions")
    ).toBeVisible({ timeout: 10000 });

    // Section headers
    await expect(page.getByText("Corpus Discussions")).toBeVisible();
    await expect(page.getByText("Document Discussions")).toBeVisible();
    await expect(page.getByText("General Discussions")).toBeVisible();

    // FAB button
    await expect(
      page.getByRole("button", { name: /create new discussion/i })
    ).toBeVisible();

    await docScreenshot(page, "discussions--global--all-tabs");
  });

  test("filters to corpus tab only", async ({ mount, page }) => {
    const mocks = buildAllSectionMocks();

    await mount(
      <GlobalDiscussionsTestWrapper mocks={mocks}>
        <GlobalDiscussions />
      </GlobalDiscussionsTestWrapper>
    );

    // Wait for initial render
    await expect(page.getByText("NDA template clause review")).toBeVisible({
      timeout: 10000,
    });

    // Click "Corpus" tab
    await page.getByRole("tab", { name: /Corpus/i }).click();

    // Corpus section should be visible
    await expect(page.getByText("Corpus Discussions")).toBeVisible();
    await expect(page.getByText("NDA template clause review")).toBeVisible();

    // Document and General sections should NOT be visible
    await expect(page.getByText("Document Discussions")).not.toBeVisible();
    await expect(page.getByText("General Discussions")).not.toBeVisible();

    await docScreenshot(page, "discussions--global--corpus-tab");
  });

  test("filters to document tab only", async ({ mount, page }) => {
    const mocks = buildAllSectionMocks();

    await mount(
      <GlobalDiscussionsTestWrapper mocks={mocks}>
        <GlobalDiscussions />
      </GlobalDiscussionsTestWrapper>
    );

    await expect(
      page.getByText("Force majeure scope needs narrowing")
    ).toBeVisible({ timeout: 10000 });

    // Click "Document" tab
    await page.getByRole("tab", { name: /Document/i }).click();

    // Document section should be visible
    await expect(page.getByText("Document Discussions")).toBeVisible();
    await expect(
      page.getByText("Force majeure scope needs narrowing")
    ).toBeVisible();

    // Others should NOT be visible
    await expect(page.getByText("Corpus Discussions")).not.toBeVisible();
    await expect(page.getByText("General Discussions")).not.toBeVisible();

    await docScreenshot(page, "discussions--global--document-tab");
  });

  test("search box filters discussions", async ({ mount, page }) => {
    // Initial mocks (no search filter)
    const initialMocks = buildAllSectionMocks();

    // Search-filtered mocks: only corpus section returns results for "NDA"
    const searchMocks = [
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasCorpus: true,
            hasDocument: false,
            title_Contains: "NDA",
          },
        },
        result: { data: corpusThreads },
      },
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasDocument: true,
            title_Contains: "NDA",
          },
        },
        result: { data: emptyResult },
      },
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasCorpus: false,
            hasDocument: false,
            title_Contains: "NDA",
          },
        },
        result: { data: emptyResult },
      },
    ];

    await mount(
      <GlobalDiscussionsTestWrapper mocks={[...initialMocks, ...searchMocks]}>
        <GlobalDiscussions />
      </GlobalDiscussionsTestWrapper>
    );

    // Wait for initial data to load
    await expect(page.getByText("NDA template clause review")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Best practices for tagging legal provisions")
    ).toBeVisible();

    // Type into search box
    const searchInput = page.getByPlaceholder("Search discussions...");
    await searchInput.fill("NDA");
    await expect(searchInput).toHaveValue("NDA");

    // Wait for debounced search to take effect — filtered results should show
    // Corpus section should still show NDA thread
    await expect(page.getByText("NDA template clause review")).toBeVisible({
      timeout: 10000,
    });

    // Document and General sections should show empty state after search
    await expect(
      page.getByText("No discussions match your search").first()
    ).toBeVisible({ timeout: 10000 });

    await docScreenshot(page, "discussions--global--search-active");
  });

  test("renders empty state when no threads", async ({ mount, page }) => {
    const emptyMocks = [
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasCorpus: true,
            hasDocument: false,
          },
        },
        result: { data: emptyResult },
      },
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasDocument: true,
          },
        },
        result: { data: emptyResult },
      },
      {
        request: {
          query: GET_CONVERSATIONS,
          variables: {
            conversationType: "THREAD",
            limit: 20,
            hasCorpus: false,
            hasDocument: false,
          },
        },
        result: { data: emptyResult },
      },
    ];

    await mount(
      <GlobalDiscussionsTestWrapper mocks={emptyMocks}>
        <GlobalDiscussions />
      </GlobalDiscussionsTestWrapper>
    );

    // Wait for empty states to appear
    const emptyStates = page.getByText("No discussions yet");
    await expect(emptyStates.first()).toBeVisible({ timeout: 10000 });

    await docScreenshot(page, "discussions--global--empty-state");
  });
});

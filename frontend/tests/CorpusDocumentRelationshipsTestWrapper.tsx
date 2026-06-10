import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { relayStylePagination } from "@apollo/client/utilities";
import { CorpusDocumentRelationships } from "../src/components/corpuses/CorpusDocumentRelationships";
import { GET_DOCUMENT_RELATIONSHIPS } from "../src/graphql/queries";
import { DELETE_DOCUMENT_RELATIONSHIP } from "../src/graphql/mutations";
import { openedCorpus } from "../src/graphql/cache";
import { DOCUMENT_RELATIONSHIP_PAGINATION_LIMIT } from "../src/assets/configurations/constants";

// Test corpus ID
const TEST_CORPUS_ID = "corpus-1";

// Mock corpus for navigation
const mockCorpus = {
  id: TEST_CORPUS_ID,
  slug: "test-corpus",
  creator: { id: "user-1", slug: "test-user" },
};

// Mock relationships
const mockRelationships = [
  {
    node: {
      id: "rel-1",
      relationshipType: "RELATIONSHIP",
      data: null,
      sourceDocument: {
        id: "doc-1",
        title: "Source Document 1",
        icon: null,
        slug: "source-document-1",
        creator: { slug: "test-user" },
      },
      targetDocument: {
        id: "doc-2",
        title: "Target Document 1",
        icon: null,
        slug: "target-document-1",
        creator: { slug: "test-user" },
      },
      annotationLabel: {
        id: "label-1",
        text: "references",
        color: "#3b82f6",
        icon: null,
      },
      corpus: { id: TEST_CORPUS_ID },
      creator: { id: "user-1", username: "testuser" },
      created: "2025-01-01T00:00:00Z",
      modified: "2025-01-01T00:00:00Z",
      myPermissions: ["read", "remove"],
      __typename: "DocumentRelationshipType",
    },
    __typename: "DocumentRelationshipTypeEdge",
  },
  {
    node: {
      id: "rel-2",
      relationshipType: "NOTES",
      data: { note: "Test note" },
      sourceDocument: {
        id: "doc-3",
        title: "Source Document 2",
        icon: null,
        slug: "source-document-2",
        creator: { slug: "test-user" },
      },
      targetDocument: {
        id: "doc-4",
        title: "Target Document 2",
        icon: null,
        slug: "target-document-2",
        creator: { slug: "test-user" },
      },
      annotationLabel: null,
      corpus: { id: TEST_CORPUS_ID },
      creator: { id: "user-1", username: "testuser" },
      created: "2025-01-02T00:00:00Z",
      modified: "2025-01-02T00:00:00Z",
      myPermissions: ["read"],
      __typename: "DocumentRelationshipType",
    },
    __typename: "DocumentRelationshipTypeEdge",
  },
];

// Cache configuration
const createTestCache = () =>
  new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          documentRelationships: relayStylePagination([
            "corpusId",
            "documentId",
          ]),
        },
      },
      DocumentRelationshipType: {
        keyFields: ["id"],
      },
    },
  });

interface Props {
  mockType?: "default" | "empty" | "error";
}

export const CorpusDocumentRelationshipsTestWrapper: React.FC<Props> = ({
  mockType = "default",
}) => {
  // Set up the opened corpus for navigation
  React.useEffect(() => {
    openedCorpus(mockCorpus as any);
    return () => {
      openedCorpus(null);
    };
  }, []);

  // Build mocks based on mockType
  const getMocks = (): MockedResponse[] => {
    const baseVariables = {
      corpusId: TEST_CORPUS_ID,
      first: DOCUMENT_RELATIONSHIP_PAGINATION_LIMIT,
    };

    if (mockType === "error") {
      const errorMock = {
        request: {
          query: GET_DOCUMENT_RELATIONSHIPS,
          variables: baseVariables,
        },
        error: new Error("Failed to load relationships"),
      };
      // Duplicate for cache-and-network
      return [errorMock, { ...errorMock }];
    }

    if (mockType === "empty") {
      const emptyMock = {
        request: {
          query: GET_DOCUMENT_RELATIONSHIPS,
          variables: baseVariables,
        },
        result: {
          data: {
            documentRelationships: {
              edges: [],
              totalCount: 0,
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
              __typename: "DocumentRelationshipTypeConnection",
            },
          },
        },
      };
      // Duplicate for cache-and-network
      return [emptyMock, { ...emptyMock }];
    }

    // Create relationship query result
    const relationshipQueryResult = {
      request: {
        query: GET_DOCUMENT_RELATIONSHIPS,
        variables: baseVariables,
      },
      result: {
        data: {
          documentRelationships: {
            edges: mockRelationships,
            totalCount: mockRelationships.length,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            __typename: "DocumentRelationshipTypeConnection",
          },
        },
      },
    };

    return [
      // Initial query + cache-and-network refetches (provide multiple)
      relationshipQueryResult,
      { ...relationshipQueryResult },
      { ...relationshipQueryResult },
      // Delete mutation mock
      {
        request: {
          query: DELETE_DOCUMENT_RELATIONSHIP,
          variables: { documentRelationshipId: "rel-1" },
        },
        result: {
          data: {
            deleteDocumentRelationship: {
              ok: true,
              message: "Deleted",
              __typename: "DeleteDocumentRelationshipOutput",
            },
          },
        },
      },
    ];
  };

  return (
    <Provider>
      <MemoryRouter>
        <MockedProvider
          mocks={getMocks()}
          cache={createTestCache()}
          addTypename
        >
          <CorpusDocumentRelationships corpusId={TEST_CORPUS_ID} />
        </MockedProvider>
      </MemoryRouter>
    </Provider>
  );
};

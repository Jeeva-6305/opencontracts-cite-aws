import React from "react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { Provider as JotaiProvider, createStore } from "jotai";
import { showBulkImportModal } from "../../src/graphql/cache";
import { folderCorpusIdAtom } from "../../src/atoms/folderAtoms";

/**
 * Create a minimal InMemoryCache for BulkImportModal tests.
 * Kept inside the factory function so each test gets a fresh instance,
 * avoiding cross-test cache pollution.
 *
 * addTypename must match the MockedProvider prop so the query keys
 * used by MockLink (for mock matching) align with what the cache adds
 * to outgoing operations.
 */
const createTestCache = () =>
  new InMemoryCache({
    addTypename: false,
    typePolicies: {
      Query: {
        fields: {
          documents: { keyArgs: false },
          corpusFolders: { keyArgs: false },
        },
      },
    },
  });

/**
 * Test wrapper for BulkImportModal that provides:
 * - JotaiProvider with folderCorpusIdAtom set
 * - MockedProvider with InMemoryCache for GraphQL
 * - Sets showBulkImportModal reactive var to true on mount
 */
export const BulkImportTestWrapper: React.FC<{
  children: React.ReactNode;
  mocks?: MockedResponse[];
}> = ({ children, mocks = [] }) => {
  React.useEffect(() => {
    showBulkImportModal(true);
    return () => {
      showBulkImportModal(false);
    };
  }, []);

  const store = React.useMemo(() => {
    const s = createStore();
    s.set(folderCorpusIdAtom, "test-corpus-id");
    return s;
  }, []);

  return (
    <JotaiProvider store={store}>
      <MockedProvider
        mocks={mocks}
        addTypename={false}
        cache={createTestCache()}
      >
        {children}
      </MockedProvider>
    </JotaiProvider>
  );
};

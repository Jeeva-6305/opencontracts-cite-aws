import React from "react";
import { InMemoryCache } from "@apollo/client";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { Provider as JotaiProvider } from "jotai";
import { MemoryRouter } from "react-router-dom";

interface GlobalDiscussionsTestWrapperProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
  initialRoute?: string;
}

/**
 * Test wrapper for GlobalDiscussions that provides:
 * - MockedProvider for GraphQL queries
 * - JotaiProvider for state management
 * - MemoryRouter for routing (search params)
 */
export function GlobalDiscussionsTestWrapper({
  children,
  mocks = [],
  initialRoute = "/discussions",
}: GlobalDiscussionsTestWrapperProps) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <MockedProvider
        mocks={mocks}
        addTypename={true}
        cache={new InMemoryCache()}
      >
        <JotaiProvider>{children}</JotaiProvider>
      </MockedProvider>
    </MemoryRouter>
  );
}

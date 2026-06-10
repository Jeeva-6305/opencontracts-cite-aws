import React, { useEffect } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { authToken } from "../src/graphql/cache";

interface CreateThreadButtonTestWrapperProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
  authenticated?: boolean;
}

/**
 * Test wrapper for CreateThreadButton that handles:
 * - MockedProvider for GraphQL
 * - MemoryRouter for routing
 * - Authentication state via authToken reactive variable
 *
 * CreateThreadButton returns null for unauthenticated users,
 * so this wrapper ensures the auth state is set correctly for tests.
 */
export function CreateThreadButtonTestWrapper({
  children,
  mocks = [],
  authenticated = true,
}: CreateThreadButtonTestWrapperProps) {
  // Set auth token on mount to simulate authenticated user
  useEffect(() => {
    if (authenticated) {
      authToken("test-auth-token");
    } else {
      authToken("");
    }
    return () => {
      authToken("");
    };
  }, [authenticated]);

  return (
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    </MemoryRouter>
  );
}

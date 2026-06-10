import React, { useEffect } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { Provider as JotaiProvider } from "jotai";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { authToken } from "../src/graphql/cache";

interface DocumentDiscussionsContentTestWrapperProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
  initialRoute?: string;
  useRoutes?: boolean;
}

/**
 * Test wrapper for DocumentDiscussionsContent that handles:
 * - MockedProvider for GraphQL
 * - JotaiProvider for state
 * - MemoryRouter for routing
 * - Authentication state via authToken reactive variable
 *
 * CreateThreadButton (rendered inside DocumentDiscussionsContent) returns null
 * for unauthenticated users, so this wrapper ensures auth state is set correctly.
 */
export function DocumentDiscussionsContentTestWrapper({
  children,
  mocks = [],
  initialRoute = "/",
  useRoutes = false,
}: DocumentDiscussionsContentTestWrapperProps) {
  // Set auth token on mount to simulate authenticated user
  useEffect(() => {
    authToken("test-auth-token");
    return () => {
      authToken("");
    };
  }, []);

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <MockedProvider mocks={mocks} addTypename={true}>
        <JotaiProvider>
          {useRoutes ? (
            <Routes>
              <Route path="*" element={children} />
            </Routes>
          ) : (
            children
          )}
        </JotaiProvider>
      </MockedProvider>
    </MemoryRouter>
  );
}

import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

export function DocumentVersionSelectorTestWrapper({
  children,
  mocks = [],
  initialRoute = "/d/testuser/test-corpus/test-doc",
}: {
  children: React.ReactNode;
  mocks?: any[];
  initialRoute?: string;
}) {
  const cache = new InMemoryCache({ addTypename: false });
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <MockedProvider mocks={mocks} cache={cache} addTypename={false}>
        {children}
      </MockedProvider>
    </MemoryRouter>
  );
}

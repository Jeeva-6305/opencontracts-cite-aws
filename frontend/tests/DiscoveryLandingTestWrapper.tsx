import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { DiscoveryLanding } from "../src/views/DiscoveryLanding";
import { userObj, authToken, backendUserObj } from "../src/graphql/cache";
import { relayStylePagination } from "@apollo/client/utilities";

const createTestCache = () =>
  new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          corpuses: relayStylePagination(),
          conversations: relayStylePagination(),
        },
      },
    },
  });

interface Props {
  mocks: ReadonlyArray<MockedResponse>;
  authenticated?: boolean;
}

export const DiscoveryLandingTestWrapper: React.FC<Props> = ({
  mocks,
  authenticated = false,
}) => {
  if (authenticated) {
    authToken("test-auth-token");
    userObj({
      id: "test-user-1",
      email: "test@example.com",
      username: "testuser",
      slug: "testuser",
    } as any);
    backendUserObj({
      id: "test-user-1",
      email: "test@example.com",
      username: "testuser",
      isUsageCapped: false,
    } as any);
  } else {
    authToken("");
    userObj(null);
    backendUserObj(null);
  }

  React.useEffect(() => {
    return () => {
      authToken("");
      userObj(null);
      backendUserObj(null);
    };
  }, []);

  return (
    <Provider>
      <MemoryRouter initialEntries={["/"]}>
        <MockedProvider mocks={mocks} cache={createTestCache()} addTypename>
          <DiscoveryLanding isAuthenticatedOverride={authenticated} />
        </MockedProvider>
      </MemoryRouter>
    </Provider>
  );
};

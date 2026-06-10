import React from "react";
import { BrowserRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { Provider } from "jotai";
import { Auth0Provider } from "@auth0/auth0-react";

interface LandingTestWrapperProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
}

/**
 * Test wrapper for landing page components.
 * Provides necessary context providers for routing, Apollo, Jotai, and Auth0.
 */
export const LandingTestWrapper: React.FC<LandingTestWrapperProps> = ({
  children,
  mocks = [],
}) => {
  return (
    <Auth0Provider
      domain="test.auth0.com"
      clientId="test-client-id"
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
      <BrowserRouter>
        <MockedProvider mocks={mocks} addTypename={false}>
          <Provider>{children}</Provider>
        </MockedProvider>
      </BrowserRouter>
    </Auth0Provider>
  );
};

export default LandingTestWrapper;

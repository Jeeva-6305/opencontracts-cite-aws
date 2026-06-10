import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { BadgeManagement } from "../src/components/badges/BadgeManagement";

export const BadgeManagementTestWrapper: React.FC<{
  corpusId?: string;
  mocks: MockedResponse[];
}> = ({ corpusId, mocks }) => {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BadgeManagement corpusId={corpusId} />
    </MockedProvider>
  );
};

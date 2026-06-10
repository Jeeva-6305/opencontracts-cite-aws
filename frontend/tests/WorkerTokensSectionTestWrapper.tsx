import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ToastContainer } from "react-toastify";
import { WorkerTokensSection } from "../src/components/corpuses/settings/WorkerTokensSection";

interface WrapperProps {
  corpusId?: string;
  isSuperuser?: boolean;
  isCreator?: boolean;
  mocks?: MockedResponse[];
}

export const WorkerTokensSectionTestWrapper: React.FC<WrapperProps> = ({
  corpusId = btoa("CorpusType:46"),
  isSuperuser = true,
  isCreator = false,
  mocks = [],
}) => (
  <MockedProvider mocks={mocks} addTypename={false}>
    <>
      <WorkerTokensSection
        corpusId={corpusId}
        isSuperuser={isSuperuser}
        isCreator={isCreator}
      />
      <ToastContainer />
    </>
  </MockedProvider>
);

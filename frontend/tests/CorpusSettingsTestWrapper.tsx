import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { CorpusSettings } from "../src/components/corpuses/CorpusSettings";

interface CorpusData {
  id: string;
  title: string;
  description: string;
  allowComments: boolean;
  isPublic: boolean;
  slug: string;
  creator: {
    email: string;
    username: string;
    slug: string;
  };
  myPermissions: string[];
}

interface Props {
  mocks: ReadonlyArray<MockedResponse>;
  corpus: CorpusData;
}

export const CorpusSettingsTestWrapper: React.FC<Props> = ({
  mocks,
  corpus,
}) => {
  return (
    <Provider>
      <MemoryRouter>
        <MockedProvider mocks={mocks} addTypename={false}>
          <CorpusSettings corpus={corpus as any} />
        </MockedProvider>
      </MemoryRouter>
    </Provider>
  );
};

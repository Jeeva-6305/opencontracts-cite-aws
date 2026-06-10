import React, { useState } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { CreateColumnModal } from "../src/components/widgets/modals/CreateColumnModal";
import { ColumnType } from "../src/types/graphql-api";
import { GET_REGISTERED_EXTRACT_TASKS } from "../src/graphql/queries";

const extractTasksMock: MockedResponse = {
  request: { query: GET_REGISTERED_EXTRACT_TASKS },
  result: {
    data: {
      registeredExtractTasks: {
        "opencontractserver.tasks.data_extract_tasks.doc_extract_query_task":
          "Extract structured data using LLM queries",
        "opencontractserver.tasks.data_extract_tasks.doc_extract_ner_task":
          "Extract named entities from documents",
      },
    },
  },
};

// Duplicate mocks for refetches (ExtractTaskDropdown uses network-only + refetch)
const extractTasksMockRefetch1 = { ...extractTasksMock };
const extractTasksMockRefetch2 = { ...extractTasksMock };
const extractTasksMockRefetch3 = { ...extractTasksMock };
const extractTasksMockRefetch4 = { ...extractTasksMock };

const defaultMocks: MockedResponse[] = [
  extractTasksMock,
  extractTasksMockRefetch1,
  extractTasksMockRefetch2,
  extractTasksMockRefetch3,
  extractTasksMockRefetch4,
];

interface WrapperProps {
  existing_column?: ColumnType | null;
  startOpen?: boolean;
  mocks?: MockedResponse[];
}

export const CreateColumnModalTestWrapper: React.FC<WrapperProps> = ({
  existing_column,
  startOpen = true,
  mocks = defaultMocks,
}) => {
  const [open, setOpen] = useState(startOpen);
  const [submitted, setSubmitted] = useState<string>("");

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <div style={{ padding: 24 }}>
        <button onClick={() => setOpen(true)} data-testid="open-modal">
          Open Modal
        </button>
        <CreateColumnModal
          open={open}
          existing_column={existing_column}
          onClose={() => setOpen(false)}
          onSubmit={(data) => {
            setSubmitted(JSON.stringify(data));
            setOpen(false);
          }}
        />
        <span
          data-testid="submitted-data"
          style={{ position: "absolute", left: -9999 }}
        >
          {submitted}
        </span>
      </div>
    </MockedProvider>
  );
};

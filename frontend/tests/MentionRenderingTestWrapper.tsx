/**
 * Test wrapper for MarkdownMessageRenderer mention tests
 */
import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import { Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { MarkdownMessageRenderer } from "../src/components/threads/MarkdownMessageRenderer";

interface MentionTestWrapperProps {
  content: string;
}

export const MentionTestWrapper: React.FC<MentionTestWrapperProps> = ({
  content,
}) => {
  return (
    <MockedProvider mocks={[]} addTypename={false}>
      <Provider>
        <MemoryRouter initialEntries={["/test"]}>
          <div style={{ padding: "20px" }}>
            <MarkdownMessageRenderer content={content} />
          </div>
        </MemoryRouter>
      </Provider>
    </MockedProvider>
  );
};

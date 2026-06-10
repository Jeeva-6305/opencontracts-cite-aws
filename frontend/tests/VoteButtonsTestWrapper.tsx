/**
 * Test wrapper for VoteButtons tests
 */
import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { VoteButtons } from "../src/components/threads/VoteButtons";

export interface VoteButtonsTestWrapperProps {
  mocks?: MockedResponse[];
  messageId?: string;
  upvoteCount?: number;
  downvoteCount?: number;
  userVote?: "UPVOTE" | "DOWNVOTE" | null;
  senderId?: string;
  currentUserId?: string;
  compact?: boolean;
  disabled?: boolean;
}

export const VoteButtonsTestWrapper: React.FC<VoteButtonsTestWrapperProps> = ({
  mocks = [],
  messageId = "msg-1",
  upvoteCount = 5,
  downvoteCount = 2,
  userVote = null,
  senderId = "user-1",
  currentUserId = "user-2",
  compact = true,
  disabled = false,
}) => {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <VoteButtons
        messageId={messageId}
        upvoteCount={upvoteCount}
        downvoteCount={downvoteCount}
        userVote={userVote}
        senderId={senderId}
        currentUserId={currentUserId}
        compact={compact}
        disabled={disabled}
      />
    </MockedProvider>
  );
};

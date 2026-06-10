import React, { useState, useCallback } from "react";
import { useMutation, ApolloCache } from "@apollo/client";
import styled from "styled-components";
import { ChevronUp, ChevronDown } from "lucide-react";
import { color } from "../../theme/colors";
import {
  UPVOTE_CONVERSATION,
  DOWNVOTE_CONVERSATION,
  REMOVE_CONVERSATION_VOTE,
  UpvoteConversationInput,
  UpvoteConversationOutput,
  DownvoteConversationInput,
  DownvoteConversationOutput,
  RemoveConversationVoteInput,
  RemoveConversationVoteOutput,
  VoteConversationResponse,
} from "../../graphql/mutations";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const VoteButton = styled.button<{
  $isActive?: boolean;
  $variant?: "up" | "down";
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid
    ${({ $isActive, $variant }) => {
      if ($isActive && $variant === "up") return color.G5;
      if ($isActive && $variant === "down") return color.R5;
      return color.N4;
    }};
  border-radius: 6px;
  background: ${({ $isActive, $variant }) => {
    if ($isActive && $variant === "up") return color.G2;
    if ($isActive && $variant === "down") return color.R2;
    return color.N1;
  }};
  color: ${({ $isActive, $variant }) => {
    if ($isActive && $variant === "up") return color.G7;
    if ($isActive && $variant === "down") return color.R7;
    return color.N6;
  }};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $variant }) => {
      if ($variant === "up") return color.G5;
      if ($variant === "down") return color.R5;
      return color.N5;
    }};
    background: ${({ $variant }) => {
      if ($variant === "up") return color.G2;
      if ($variant === "down") return color.R2;
      return color.N2;
    }};
    color: ${({ $variant }) => {
      if ($variant === "up") return color.G7;
      if ($variant === "down") return color.R7;
      return color.N10;
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 640px) {
    width: 28px;
    height: 28px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const VoteCount = styled.div<{ $score: number }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $score }) => {
    if ($score > 0) return color.G7;
    if ($score < 0) return color.R7;
    return color.N7;
  }};
  padding: 2px 0;
  min-width: 24px;
  text-align: center;

  @media (max-width: 640px) {
    font-size: 12px;
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  padding: 6px 10px;
  background: ${color.R7};
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-bottom-color: ${color.R7};
  }
`;

const Wrapper = styled.div`
  position: relative;
`;

export interface ConversationVoteButtonsProps {
  /** ID of the conversation/thread to vote on */
  conversationId: string;
  /** Current upvote count */
  upvoteCount: number;
  /** Current downvote count */
  downvoteCount: number;
  /** Current user's vote state ("UPVOTE", "DOWNVOTE", or null) */
  userVote?: string | null;
  /** ID of the conversation creator */
  creatorId?: string;
  /** ID of the current user */
  currentUserId?: string;
  /** Disable voting (e.g., thread deleted) */
  disabled?: boolean;
  /** Show only upvote button (compact mode) */
  upvoteOnly?: boolean;
  /** Optional callback when vote changes */
  onVoteChange?: (newScore: number) => void;
}

/**
 * Helper function to update Apollo cache after a vote mutation.
 * Updates the conversation's upvoteCount, downvoteCount, and userVote fields.
 */
function updateCacheAfterVote(
  cache: ApolloCache<unknown>,
  conversationId: string,
  response: VoteConversationResponse | null
) {
  if (!response?.obj) return;

  const { upvoteCount, downvoteCount, userVote } = response.obj;

  // Update the cache for the ConversationType node
  cache.modify({
    id: cache.identify({ __typename: "ConversationType", id: conversationId }),
    fields: {
      upvoteCount: () => upvoteCount,
      downvoteCount: () => downvoteCount,
      userVote: () => userVote,
    },
  });
}

/**
 * Vote buttons component for conversations/threads.
 * Allows users to upvote or downvote threads with optimistic updates.
 * Users cannot vote on their own threads.
 *
 * Permission: Uses visibility-based permissions - if you can see it, you can vote on it.
 */
export const ConversationVoteButtons = React.memo(
  function ConversationVoteButtons({
    conversationId,
    upvoteCount,
    downvoteCount,
    userVote,
    creatorId,
    currentUserId,
    disabled = false,
    upvoteOnly = false,
    onVoteChange,
  }: ConversationVoteButtonsProps) {
    const [error, setError] = useState<string | null>(null);
    const [optimisticVote, setOptimisticVote] = useState<string | null>(null);

    // Calculate net score
    const score = upvoteCount - downvoteCount;

    // Determine if user owns this thread
    const isOwnThread = currentUserId && currentUserId === creatorId;

    // Current vote state (optimistic or actual)
    const currentVote = optimisticVote !== null ? optimisticVote : userVote;

    const [upvoteMutation, { loading: upvoting }] = useMutation<
      UpvoteConversationOutput,
      UpvoteConversationInput
    >(UPVOTE_CONVERSATION, {
      update: (cache, { data }) => {
        if (data?.voteConversation) {
          updateCacheAfterVote(cache, conversationId, data.voteConversation);
        }
      },
      onCompleted: (data) => {
        if (data.voteConversation.ok) {
          setOptimisticVote(null);
          if (data.voteConversation.obj) {
            const newScore =
              data.voteConversation.obj.upvoteCount -
              data.voteConversation.obj.downvoteCount;
            onVoteChange?.(newScore);
          }
        } else {
          setOptimisticVote(null);
          setError(data.voteConversation.message || "Failed to upvote");
          setTimeout(() => setError(null), 3000);
        }
      },
      onError: (err) => {
        console.error("Upvote error:", err);
        setOptimisticVote(null);
        setError("An error occurred. Please try again.");
        setTimeout(() => setError(null), 3000);
      },
    });

    const [downvoteMutation, { loading: downvoting }] = useMutation<
      DownvoteConversationOutput,
      DownvoteConversationInput
    >(DOWNVOTE_CONVERSATION, {
      update: (cache, { data }) => {
        if (data?.voteConversation) {
          updateCacheAfterVote(cache, conversationId, data.voteConversation);
        }
      },
      onCompleted: (data) => {
        if (data.voteConversation.ok) {
          setOptimisticVote(null);
          if (data.voteConversation.obj) {
            const newScore =
              data.voteConversation.obj.upvoteCount -
              data.voteConversation.obj.downvoteCount;
            onVoteChange?.(newScore);
          }
        } else {
          setOptimisticVote(null);
          setError(data.voteConversation.message || "Failed to downvote");
          setTimeout(() => setError(null), 3000);
        }
      },
      onError: (err) => {
        console.error("Downvote error:", err);
        setOptimisticVote(null);
        setError("An error occurred. Please try again.");
        setTimeout(() => setError(null), 3000);
      },
    });

    const [removeVoteMutation, { loading: removing }] = useMutation<
      RemoveConversationVoteOutput,
      RemoveConversationVoteInput
    >(REMOVE_CONVERSATION_VOTE, {
      update: (cache, { data }) => {
        if (data?.removeConversationVote) {
          updateCacheAfterVote(
            cache,
            conversationId,
            data.removeConversationVote
          );
        }
      },
      onCompleted: (data) => {
        if (data.removeConversationVote.ok) {
          setOptimisticVote(null);
          if (data.removeConversationVote.obj) {
            const newScore =
              data.removeConversationVote.obj.upvoteCount -
              data.removeConversationVote.obj.downvoteCount;
            onVoteChange?.(newScore);
          }
        } else {
          setOptimisticVote(null);
          setError(
            data.removeConversationVote.message || "Failed to remove vote"
          );
          setTimeout(() => setError(null), 3000);
        }
      },
      onError: (err) => {
        console.error("Remove vote error:", err);
        setOptimisticVote(null);
        setError("An error occurred. Please try again.");
        setTimeout(() => setError(null), 3000);
      },
    });

    const loading = upvoting || downvoting || removing;

    const handleUpvote = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click

        if (isOwnThread) {
          setError("You cannot vote on your own threads");
          setTimeout(() => setError(null), 3000);
          return;
        }

        setError(null);

        // If already upvoted, remove vote
        if (currentVote === "UPVOTE") {
          setOptimisticVote(null);
          await removeVoteMutation({ variables: { conversationId } });
        } else {
          setOptimisticVote("UPVOTE");
          await upvoteMutation({ variables: { conversationId } });
        }
      },
      [
        isOwnThread,
        currentVote,
        conversationId,
        removeVoteMutation,
        upvoteMutation,
      ]
    );

    const handleDownvote = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click

        if (isOwnThread) {
          setError("You cannot vote on your own threads");
          setTimeout(() => setError(null), 3000);
          return;
        }

        setError(null);

        // If already downvoted, remove vote
        if (currentVote === "DOWNVOTE") {
          setOptimisticVote(null);
          await removeVoteMutation({ variables: { conversationId } });
        } else {
          setOptimisticVote("DOWNVOTE");
          await downvoteMutation({ variables: { conversationId } });
        }
      },
      [
        isOwnThread,
        currentVote,
        conversationId,
        removeVoteMutation,
        downvoteMutation,
      ]
    );

    // Calculate optimistic score
    let displayScore = score;
    if (optimisticVote === "UPVOTE" && userVote !== "UPVOTE") {
      displayScore += userVote === "DOWNVOTE" ? 2 : 1;
    } else if (optimisticVote === "DOWNVOTE" && userVote !== "DOWNVOTE") {
      displayScore -= userVote === "UPVOTE" ? 2 : 1;
    } else if (optimisticVote === null && userVote === "UPVOTE") {
      displayScore -= 1;
    } else if (optimisticVote === null && userVote === "DOWNVOTE") {
      displayScore += 1;
    }

    return (
      <Wrapper>
        <Container>
          <VoteButton
            $variant="up"
            $isActive={currentVote === "UPVOTE"}
            onClick={handleUpvote}
            disabled={disabled || loading}
            title={isOwnThread ? "Cannot vote on own thread" : "Upvote"}
            aria-label="Upvote"
            data-vote-button
          >
            <ChevronUp />
          </VoteButton>

          <VoteCount $score={displayScore}>{displayScore}</VoteCount>

          {!upvoteOnly && (
            <VoteButton
              $variant="down"
              $isActive={currentVote === "DOWNVOTE"}
              onClick={handleDownvote}
              disabled={disabled || loading}
              title={isOwnThread ? "Cannot vote on own thread" : "Downvote"}
              aria-label="Downvote"
              data-vote-button
            >
              <ChevronDown />
            </VoteButton>
          )}
        </Container>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Wrapper>
    );
  }
);

import React, { useState, useCallback } from "react";
import { useMutation, ApolloCache } from "@apollo/client";
import styled, { css } from "styled-components";
import { ThumbsUp, ThumbsDown, ChevronUp, ChevronDown } from "lucide-react";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";
import {
  UPVOTE_MESSAGE,
  DOWNVOTE_MESSAGE,
  REMOVE_VOTE,
  UpvoteMessageInput,
  UpvoteMessageOutput,
  DownvoteMessageInput,
  DownvoteMessageOutput,
  RemoveVoteInput,
  RemoveVoteOutput,
  VoteMessageResponse,
} from "../../graphql/mutations";

const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: ${({ $compact }) => ($compact ? "row" : "column")};
  align-items: center;
  gap: ${({ $compact }) => ($compact ? "0.125rem" : "0")};
`;

const VoteButton = styled.button<{
  $isActive?: boolean;
  $variant?: "up" | "down";
  $compact?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $compact }) => ($compact ? "1.5rem" : "1.75rem")};
  height: ${({ $compact }) => ($compact ? "1.5rem" : "1.75rem")};
  border: none;
  border-radius: ${CORPUS_RADII.sm};
  background: ${({ $isActive, $variant }) => {
    if ($isActive && $variant === "up") return CORPUS_COLORS.teal[50];
    if ($isActive && $variant === "down")
      return OS_LEGAL_COLORS.dangerSurfaceHover;
    return "transparent";
  }};
  color: ${({ $isActive, $variant }) => {
    if ($isActive && $variant === "up") return CORPUS_COLORS.teal[700];
    if ($isActive && $variant === "down") return OS_LEGAL_COLORS.danger;
    return CORPUS_COLORS.slate[400];
  }};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === "up"
        ? CORPUS_COLORS.teal[50]
        : OS_LEGAL_COLORS.dangerSurfaceHover};
    color: ${({ $variant }) =>
      $variant === "up" ? CORPUS_COLORS.teal[700] : OS_LEGAL_COLORS.danger};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: ${({ $compact }) => ($compact ? "0.875rem" : "1.125rem")};
    height: ${({ $compact }) => ($compact ? "0.875rem" : "1.125rem")};
  }
`;

const VoteCount = styled.div<{ $score: number; $compact?: boolean }>`
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${({ $compact }) => ($compact ? "0.75rem" : "0.8125rem")};
  font-weight: 600;
  color: ${({ $score }) => {
    if ($score > 0) return CORPUS_COLORS.teal[700];
    if ($score < 0) return OS_LEGAL_COLORS.danger;
    return CORPUS_COLORS.slate[500];
  }};
  padding: ${({ $compact }) => ($compact ? "0 0.25rem" : "0.125rem 0")};
  min-width: ${({ $compact }) => ($compact ? "auto" : "1.5rem")};
  text-align: center;
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: ${OS_LEGAL_COLORS.danger};
  color: white;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.75rem;
  border-radius: ${CORPUS_RADII.sm};
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
    border-bottom-color: ${OS_LEGAL_COLORS.danger};
  }
`;

const Wrapper = styled.div`
  position: relative;
`;

export interface VoteButtonsProps {
  /** ID of the message to vote on */
  messageId: string;
  /** Current upvote count */
  upvoteCount: number;
  /** Current downvote count */
  downvoteCount: number;
  /** Current user's vote state ("UPVOTE", "DOWNVOTE", or null) */
  userVote?: string | null;
  /** ID of the message sender */
  senderId: string;
  /** ID of the current user */
  currentUserId?: string;
  /** Disable voting (e.g., message deleted) */
  disabled?: boolean;
  /** Optional callback when vote changes */
  onVoteChange?: (newScore: number) => void;
  /** Compact horizontal layout with thumbs icons */
  compact?: boolean;
}

/**
 * Helper function to update Apollo cache after a vote mutation.
 * Updates the message's upvoteCount, downvoteCount, and userVote fields
 * so all components displaying this message reflect the new vote state.
 */
function updateCacheAfterVote(
  cache: ApolloCache<unknown>,
  messageId: string,
  response: VoteMessageResponse | null
) {
  if (!response?.obj) return;

  const { upvoteCount, downvoteCount, userVote } = response.obj;

  // Update the cache for the MessageType node
  cache.modify({
    id: cache.identify({ __typename: "MessageType", id: messageId }),
    fields: {
      upvoteCount: () => upvoteCount,
      downvoteCount: () => downvoteCount,
      userVote: () => userVote,
    },
  });
}

export const VoteButtons = React.memo(function VoteButtons({
  messageId,
  upvoteCount,
  downvoteCount,
  userVote,
  senderId,
  currentUserId,
  disabled = false,
  onVoteChange,
  compact = false,
}: VoteButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);

  // Calculate net score
  const score = upvoteCount - downvoteCount;

  // Determine if user owns this message
  const isOwnMessage = currentUserId && currentUserId === senderId;

  // Current vote state (optimistic or actual)
  const currentVote = optimisticVote !== null ? optimisticVote : userVote;

  const [upvoteMutation, { loading: upvoting }] = useMutation<
    UpvoteMessageOutput,
    UpvoteMessageInput
  >(UPVOTE_MESSAGE, {
    update: (cache, { data }) => {
      if (data?.voteMessage) {
        updateCacheAfterVote(cache, messageId, data.voteMessage);
      }
    },
    onCompleted: (data) => {
      if (data.voteMessage.ok) {
        setOptimisticVote(null);
        if (data.voteMessage.obj) {
          const newScore =
            data.voteMessage.obj.upvoteCount -
            data.voteMessage.obj.downvoteCount;
          onVoteChange?.(newScore);
        }
      } else {
        setOptimisticVote(null);
        setError(data.voteMessage.message || "Failed to upvote");
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
    DownvoteMessageOutput,
    DownvoteMessageInput
  >(DOWNVOTE_MESSAGE, {
    update: (cache, { data }) => {
      if (data?.voteMessage) {
        updateCacheAfterVote(cache, messageId, data.voteMessage);
      }
    },
    onCompleted: (data) => {
      if (data.voteMessage.ok) {
        setOptimisticVote(null);
        if (data.voteMessage.obj) {
          const newScore =
            data.voteMessage.obj.upvoteCount -
            data.voteMessage.obj.downvoteCount;
          onVoteChange?.(newScore);
        }
      } else {
        setOptimisticVote(null);
        setError(data.voteMessage.message || "Failed to downvote");
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
    RemoveVoteOutput,
    RemoveVoteInput
  >(REMOVE_VOTE, {
    update: (cache, { data }) => {
      if (data?.removeVote) {
        updateCacheAfterVote(cache, messageId, data.removeVote);
      }
    },
    onCompleted: (data) => {
      if (data.removeVote.ok) {
        setOptimisticVote(null);
        if (data.removeVote.obj) {
          const newScore =
            data.removeVote.obj.upvoteCount - data.removeVote.obj.downvoteCount;
          onVoteChange?.(newScore);
        }
      } else {
        setOptimisticVote(null);
        setError(data.removeVote.message || "Failed to remove vote");
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

  const handleUpvote = useCallback(async () => {
    if (isOwnMessage) {
      setError("You cannot vote on your own messages");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);

    // If already upvoted, remove vote
    if (currentVote === "UPVOTE") {
      setOptimisticVote(null);
      await removeVoteMutation({ variables: { messageId } });
    } else {
      setOptimisticVote("UPVOTE");
      await upvoteMutation({ variables: { messageId } });
    }
  }, [
    isOwnMessage,
    currentVote,
    messageId,
    removeVoteMutation,
    upvoteMutation,
  ]);

  const handleDownvote = useCallback(async () => {
    if (isOwnMessage) {
      setError("You cannot vote on your own messages");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);

    // If already downvoted, remove vote
    if (currentVote === "DOWNVOTE") {
      setOptimisticVote(null);
      await removeVoteMutation({ variables: { messageId } });
    } else {
      setOptimisticVote("DOWNVOTE");
      await downvoteMutation({ variables: { messageId } });
    }
  }, [
    isOwnMessage,
    currentVote,
    messageId,
    removeVoteMutation,
    downvoteMutation,
  ]);

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

  const UpIcon = compact ? ThumbsUp : ChevronUp;
  const DownIcon = compact ? ThumbsDown : ChevronDown;

  return (
    <Wrapper>
      <Container $compact={compact}>
        <VoteButton
          $variant="up"
          $isActive={currentVote === "UPVOTE"}
          $compact={compact}
          onClick={handleUpvote}
          disabled={disabled || loading}
          title={isOwnMessage ? "Cannot vote on own message" : "Upvote"}
          aria-label="Upvote"
        >
          <UpIcon />
        </VoteButton>

        <VoteCount $score={displayScore} $compact={compact}>
          {displayScore}
        </VoteCount>

        <VoteButton
          $variant="down"
          $isActive={currentVote === "DOWNVOTE"}
          $compact={compact}
          onClick={handleDownvote}
          disabled={disabled || loading}
          title={isOwnMessage ? "Cannot vote on own message" : "Downvote"}
          aria-label="Downvote"
        >
          <DownIcon />
        </VoteButton>
      </Container>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Wrapper>
  );
});

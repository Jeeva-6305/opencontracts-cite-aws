import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import styled from "styled-components";
import { X, CornerDownRight } from "lucide-react";
import {
  CREATE_THREAD_MESSAGE,
  REPLY_TO_MESSAGE,
  CreateThreadMessageInput,
  CreateThreadMessageOutput,
  ReplyToMessageInput,
  ReplyToMessageOutput,
} from "../../graphql/mutations";
import { GET_THREAD_DETAIL } from "../../graphql/queries";
import { MessageComposer } from "./MessageComposer";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

const Container = styled.div`
  border-radius: ${CORPUS_RADII.lg};
  background: transparent;
  padding: 0;
`;

const ReplyContext = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  margin-bottom: 0.375rem;
  background: ${CORPUS_COLORS.slate[50]};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.75rem;
  color: ${CORPUS_COLORS.slate[500]};
  line-height: 1.4;

  svg:first-child {
    width: 0.875rem;
    height: 0.875rem;
    color: ${CORPUS_COLORS.teal[500]};
    flex-shrink: 0;
  }
`;

const ReplyUsername = styled.span`
  color: ${CORPUS_COLORS.teal[700]};
  font-weight: 600;
  flex-shrink: 0;
`;

const ReplyPreview = styled.span`
  color: ${CORPUS_COLORS.slate[500]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const CancelReplyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: ${CORPUS_RADII.sm};
  background: transparent;
  color: ${CORPUS_COLORS.slate[400]};
  cursor: pointer;
  flex-shrink: 0;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    background: ${CORPUS_COLORS.slate[200]};
    color: ${CORPUS_COLORS.slate[700]};
  }

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.375rem;
  background: ${OS_LEGAL_COLORS.dangerSurfaceHover};
  border: 1px solid #fca5a5;
  border-radius: ${CORPUS_RADII.md};
  font-family: ${CORPUS_FONTS.sans};
  color: ${OS_LEGAL_COLORS.danger};
  font-size: 0.8125rem;
`;

export interface ReplyFormProps {
  /** ID of the conversation (required for top-level messages) */
  conversationId?: string;
  /** ID of the parent message (for nested replies) */
  parentMessageId?: string;
  /** Username of the person being replied to */
  replyingToUsername?: string;
  /** Parent message content to quote */
  parentMessageContent?: string;
  /** Called when reply is submitted successfully */
  onSuccess?: () => void;
  /** Called when reply is cancelled */
  onCancel: () => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Initial content (for testing) */
  initialContent?: string;
  /** Corpus ID for context-aware mention search (Issue #741) */
  corpusId?: string;
}

export function ReplyForm({
  conversationId,
  parentMessageId,
  replyingToUsername,
  parentMessageContent,
  onSuccess,
  onCancel,
  autoFocus = true,
  initialContent,
  corpusId,
}: ReplyFormProps) {
  const [error, setError] = useState("");

  // Submission guard to prevent double submissions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which mutation to use
  const isTopLevel = !parentMessageId && conversationId;
  const isNestedReply = !!parentMessageId;

  // Top-level message mutation
  const [createMessage, { loading: createLoading }] = useMutation<
    CreateThreadMessageOutput,
    CreateThreadMessageInput
  >(CREATE_THREAD_MESSAGE, {
    refetchQueries: conversationId
      ? [
          {
            query: GET_THREAD_DETAIL,
            variables: { conversationId },
          },
        ]
      : [],
    onCompleted: (data) => {
      if (data.createThreadMessage.ok) {
        onSuccess?.();
      } else {
        setError(
          data.createThreadMessage.message ||
            "Failed to post message. Please try again."
        );
      }
    },
    onError: (err) => {
      console.error("Failed to create message:", err);
      setError("An unexpected error occurred. Please try again.");
    },
  });

  // Nested reply mutation
  const [replyToMessage, { loading: replyLoading }] = useMutation<
    ReplyToMessageOutput,
    ReplyToMessageInput
  >(REPLY_TO_MESSAGE, {
    refetchQueries:
      conversationId && parentMessageId
        ? [
            {
              query: GET_THREAD_DETAIL,
              variables: { conversationId },
            },
          ]
        : [],
    onCompleted: (data) => {
      if (data.replyToMessage.ok) {
        onSuccess?.();
      } else {
        setError(
          data.replyToMessage.message ||
            "Failed to post reply. Please try again."
        );
      }
    },
    onError: (err) => {
      console.error("Failed to create reply:", err);
      setError("An unexpected error occurred. Please try again.");
    },
  });

  const loading = createLoading || replyLoading;

  const handleSubmit = async (content: string) => {
    // Guard against double submissions
    if (isSubmitting) {
      console.warn("[ReplyForm] Blocked duplicate submission");
      return;
    }

    setError("");

    if (!content.trim()) {
      setError("Please write a message.");
      return;
    }

    // Set submission guard
    setIsSubmitting(true);

    try {
      if (isTopLevel && conversationId) {
        await createMessage({
          variables: {
            conversationId,
            content,
          },
        });
      } else if (isNestedReply && parentMessageId) {
        await replyToMessage({
          variables: {
            parentMessageId,
            content,
          },
        });
      } else {
        setError("Invalid reply configuration.");
      }
    } catch (err) {
      // Error already handled in mutation callbacks
    } finally {
      // Reset submission guard after a short delay to prevent rapid re-submissions
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  // Extract plain text from HTML/markdown content for preview
  const getPlainText = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    return doc.body.textContent || "";
  };

  const previewText = parentMessageContent
    ? getPlainText(parentMessageContent)
    : "";

  return (
    <Container>
      {replyingToUsername && (
        <ReplyContext>
          <CornerDownRight />
          <ReplyUsername>@{replyingToUsername}</ReplyUsername>
          {previewText && (
            <ReplyPreview>
              {previewText.length > 120
                ? previewText.substring(0, 120) + "..."
                : previewText}
            </ReplyPreview>
          )}
          <CancelReplyButton onClick={onCancel} title="Cancel reply">
            <X />
          </CancelReplyButton>
        </ReplyContext>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <MessageComposer
        placeholder={
          replyingToUsername
            ? `Reply to @${replyingToUsername}...`
            : "Write your message..."
        }
        onSubmit={handleSubmit}
        disabled={loading || isSubmitting}
        error={error}
        autoFocus={autoFocus}
        maxLength={10000}
        initialContent={initialContent}
        corpusId={corpusId}
      />
    </Container>
  );
}

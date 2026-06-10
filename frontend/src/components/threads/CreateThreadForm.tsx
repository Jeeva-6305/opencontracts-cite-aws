import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import styled from "styled-components";
import { X } from "lucide-react";
import {
  CREATE_THREAD,
  CreateThreadInput,
  CreateThreadOutput,
} from "../../graphql/mutations";
import { GET_CONVERSATIONS } from "../../graphql/queries";
import { MessageComposer } from "./MessageComposer";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  mediaQuery,
} from "./styles/discussionStyles";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: ${CORPUS_COLORS.white};
  border-radius: ${CORPUS_RADII.xl};
  width: 100%;
  max-width: 37.5rem;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: ${CORPUS_SHADOWS.xl};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  background: ${CORPUS_COLORS.slate[50]};
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${CORPUS_FONTS.serif};
  font-size: 1.25rem;
  font-weight: 600;
  color: ${CORPUS_COLORS.slate[800]};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: ${CORPUS_RADII.md};
  background: transparent;
  color: ${CORPUS_COLORS.slate[500]};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    background: ${CORPUS_COLORS.slate[100]};
    color: ${CORPUS_COLORS.slate[700]};
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const Field = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.875rem;
  font-weight: 600;
  color: ${CORPUS_COLORS.slate[700]};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  color: ${CORPUS_COLORS.slate[800]};
  font-size: 0.9375rem;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:focus {
    outline: none;
    border-color: ${CORPUS_COLORS.teal[500]};
    box-shadow: 0 0 0 3px ${CORPUS_COLORS.teal[50]};
  }

  &::placeholder {
    color: ${CORPUS_COLORS.slate[400]};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 5rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  color: ${CORPUS_COLORS.slate[800]};
  font-size: 0.9375rem;
  resize: vertical;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:focus {
    outline: none;
    border-color: ${CORPUS_COLORS.teal[500]};
    box-shadow: 0 0 0 3px ${CORPUS_COLORS.teal[50]};
  }

  &::placeholder {
    color: ${CORPUS_COLORS.slate[400]};
  }
`;

const HelpText = styled.p`
  margin: 0.375rem 0 0 0;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.75rem;
  color: ${CORPUS_COLORS.slate[500]};
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: ${OS_LEGAL_COLORS.dangerSurfaceHover};
  border: 1px solid #fca5a5;
  border-radius: ${CORPUS_RADII.md};
  font-family: ${CORPUS_FONTS.sans};
  color: ${OS_LEGAL_COLORS.danger};
  font-size: 0.8125rem;
`;

export interface CreateThreadFormProps {
  /** ID of the corpus to create thread in (optional if documentId provided) */
  corpusId?: string;
  /** ID of the document to create thread for (optional if corpusId provided) */
  documentId?: string;
  /** Called when thread is created successfully */
  onSuccess: (conversationId: string) => void;
  /** Called when form is closed/cancelled */
  onClose: () => void;
  /** Initial message content (for testing) */
  initialMessage?: string;
}

export function CreateThreadForm({
  corpusId,
  documentId,
  onSuccess,
  onClose,
  initialMessage,
}: CreateThreadFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [createThread, { loading }] = useMutation<
    CreateThreadOutput,
    CreateThreadInput
  >(CREATE_THREAD, {
    refetchQueries: [
      // Refetch document-filtered query if documentId provided
      ...(documentId
        ? [
            {
              query: GET_CONVERSATIONS,
              variables: { documentId, conversationType: "THREAD" },
            },
          ]
        : []),
      // Refetch corpus-filtered query if corpusId provided
      ...(corpusId
        ? [
            {
              query: GET_CONVERSATIONS,
              variables: { corpusId, conversationType: "THREAD" },
            },
          ]
        : []),
    ],
    onCompleted: (data) => {
      if (data.createThread.ok && data.createThread.obj) {
        onSuccess(data.createThread.obj.id);
      } else {
        setError(
          data.createThread.message ||
            "Failed to create thread. Please try again."
        );
      }
    },
    onError: (err) => {
      console.error("Failed to create thread:", err);
      setError("An unexpected error occurred. Please try again.");
    },
  });

  const handleSubmit = async (content: string) => {
    setError("");

    // Validate
    if (!title.trim()) {
      setError("Please enter a title for your thread.");
      return;
    }

    if (!content.trim()) {
      setError("Please write a message to start the discussion.");
      return;
    }

    await createThread({
      variables: {
        corpusId: corpusId || undefined,
        documentId: documentId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        initialMessage: content,
      },
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Close if clicking outside the modal
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close on Escape
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <Modal>
        <Header>
          <Title>Start New Discussion</Title>
          <CloseButton onClick={onClose} title="Close">
            <X />
          </CloseButton>
        </Header>

        <Content>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Field>
            <Label htmlFor="thread-title">Title *</Label>
            <Input
              id="thread-title"
              type="text"
              placeholder="What would you like to discuss?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={200}
              autoFocus
            />
            <HelpText>{title.length} / 200 characters</HelpText>
          </Field>

          <Field>
            <Label htmlFor="thread-description">Description (optional)</Label>
            <TextArea
              id="thread-description"
              placeholder="Add more context about this discussion..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={1000}
            />
            <HelpText>{description.length} / 1000 characters</HelpText>
          </Field>

          <Field>
            <Label>Initial Message *</Label>
            <MessageComposer
              placeholder="Start the conversation..."
              onSubmit={handleSubmit}
              onChange={setMessage}
              disabled={loading}
              maxLength={10000}
              initialContent={initialMessage}
              corpusId={corpusId}
            />
            <HelpText>
              Tip: Use <strong>Cmd+Enter</strong> to send your message
            </HelpText>
          </Field>
        </Content>
      </Modal>
    </Overlay>
  );
}

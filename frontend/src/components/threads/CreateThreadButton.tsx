import React, { useState } from "react";
import styled from "styled-components";
import { Plus, MessageSquarePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReactiveVar } from "@apollo/client";
import { CreateThreadForm } from "./CreateThreadForm";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  mediaQuery,
} from "./styles/discussionStyles";
import { accentAlpha } from "../../assets/configurations/osLegalStyles";
import { authToken, openedCorpus } from "../../graphql/cache";
import { getCorpusThreadUrl } from "../../utils/navigationUtils";

const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: ${(props) =>
    props.$variant === "primary"
      ? "none"
      : `1px solid ${CORPUS_COLORS.teal[500]}`};
  border-radius: ${CORPUS_RADII.md};
  background: ${(props) =>
    props.$variant === "primary"
      ? `linear-gradient(135deg, ${CORPUS_COLORS.teal[600]} 0%, ${CORPUS_COLORS.teal[700]} 100%)`
      : "transparent"};
  color: ${(props) =>
    props.$variant === "primary"
      ? CORPUS_COLORS.white
      : CORPUS_COLORS.teal[700]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.normal};
  box-shadow: ${(props) =>
    props.$variant === "primary" ? `0 4px 12px ${accentAlpha(0.35)}` : "none"};

  &:hover {
    background: ${(props) =>
      props.$variant === "primary"
        ? `linear-gradient(135deg, ${CORPUS_COLORS.teal[500]} 0%, ${CORPUS_COLORS.teal[600]} 100%)`
        : CORPUS_COLORS.teal[50]};
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$variant === "primary"
        ? `0 6px 20px ${accentAlpha(0.45)}`
        : "none"};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${CORPUS_RADII.xl};
  background: linear-gradient(
    135deg,
    ${CORPUS_COLORS.teal[600]} 0%,
    ${CORPUS_COLORS.teal[700]} 100%
  );
  color: ${CORPUS_COLORS.white};
  box-shadow: 0 8px 24px ${accentAlpha(0.4)};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.normal};
  z-index: 50;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px ${accentAlpha(0.5)};
  }

  &:active {
    transform: scale(1.05);
  }

  svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  ${mediaQuery.mobile} {
    bottom: 1rem;
    right: 1rem;
    width: 3rem;
    height: 3rem;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
`;

export interface CreateThreadButtonProps {
  /** ID of the corpus to create thread in (optional if documentId provided) */
  corpusId?: string;
  /** ID of the document to create thread for (optional if corpusId provided) */
  documentId?: string;
  /** Button variant: primary (filled) or secondary (outlined) */
  variant?: "primary" | "secondary";
  /** Display as floating action button (mobile-friendly) */
  floating?: boolean;
  /** Optional className for styling */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /**
   * Custom success handler. If provided, overrides default navigation behavior.
   * Used by sidebar to stay inline instead of navigating to full-page view.
   */
  onSuccess?: (conversationId: string) => void;
}

/**
 * Button to create a new discussion thread
 * Opens CreateThreadForm modal when clicked
 *
 * Supports:
 * - corpusId only: corpus-level discussions
 * - documentId only: document-specific discussions
 * - both: doc-in-corpus discussions
 */
export function CreateThreadButton({
  corpusId,
  documentId,
  variant = "primary",
  floating = false,
  className,
  disabled = false,
  onSuccess: customOnSuccess,
}: CreateThreadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const corpus = useReactiveVar(openedCorpus);
  const token = useReactiveVar(authToken);

  // Anonymous users cannot create threads (requires authentication)
  const isAuthenticated = Boolean(token);
  if (!isAuthenticated) {
    return null;
  }

  const handleSuccess = (conversationId: string) => {
    setShowModal(false);

    // If custom handler provided (e.g., sidebar), use that instead of navigation
    if (customOnSuccess) {
      customOnSuccess(conversationId);
      return;
    }

    // Default: Navigate to the newly created thread using proper slug-based URL
    if (corpus) {
      const url = getCorpusThreadUrl(corpus, conversationId);
      if (url !== "#") {
        navigate(url);
      } else {
        console.warn(
          "[CreateThreadButton] Cannot navigate - corpus missing slug data"
        );
      }
    } else {
      console.warn("[CreateThreadButton] Cannot navigate - no corpus in state");
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (floating) {
    return (
      <>
        <FloatingActionButton
          onClick={() => setShowModal(true)}
          disabled={disabled}
          aria-label="Start new discussion"
          className={className}
        >
          <Plus />
        </FloatingActionButton>

        {showModal && (
          <CreateThreadForm
            corpusId={corpusId}
            documentId={documentId}
            onSuccess={handleSuccess}
            onClose={handleClose}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button
        $variant={variant}
        onClick={() => setShowModal(true)}
        disabled={disabled}
        aria-label="Start new discussion"
        className={className}
      >
        <MessageSquarePlus />
        <span>New Discussion</span>
      </Button>

      {showModal && (
        <CreateThreadForm
          corpusId={corpusId}
          documentId={documentId}
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      )}
    </>
  );
}

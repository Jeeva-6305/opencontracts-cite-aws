import React from "react";
import styled from "styled-components";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

import { CorpusType } from "../../../types/graphql-api";
import { CorpusDiscussionsView } from "../../discussions/CorpusDiscussionsView";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
  mediaQuery,
} from "../../corpuses/styles/corpusDesignTokens";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${CORPUS_COLORS.white};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  background: ${CORPUS_COLORS.white};
  flex-shrink: 0;

  ${mediaQuery.tablet} {
    padding: 0.75rem 1rem;
  }
`;

const BackButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  background: transparent;
  border: none;
  color: ${CORPUS_COLORS.slate[400]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color ${CORPUS_TRANSITIONS.fast};

  svg {
    width: 14px;
    height: 14px;
    transition: transform ${CORPUS_TRANSITIONS.fast};
  }

  &:hover {
    color: ${CORPUS_COLORS.teal[700]};

    svg {
      transform: translateX(-3px);
    }
  }

  &:focus-visible {
    outline: 2px solid ${CORPUS_COLORS.teal[500]};
    outline-offset: 4px;
    border-radius: ${CORPUS_RADII.sm};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

// ============================================================================
// COMPONENT
// ============================================================================

export interface CorpusDiscussionsInlineViewProps {
  /** The corpus object */
  corpus: CorpusType;
  /** Callback to go back to the landing page */
  onBack: () => void;
  /** Test ID prefix */
  testId?: string;
}

/**
 * CorpusDiscussionsInlineView - Inline discussions wrapper for the corpus landing page.
 *
 * Delegates thread listing and thread-detail navigation entirely to
 * CorpusDiscussionsView, which manages selection via the URL-driven
 * ?thread= param (synced by CentralRouteManager). This wrapper adds
 * only a minimal "Overview" back-button header.
 */
export const CorpusDiscussionsInlineView: React.FC<
  CorpusDiscussionsInlineViewProps
> = ({ corpus, onBack, testId = "discussions-inline" }) => {
  return (
    <Container data-testid={testId}>
      <Header>
        <BackButton
          onClick={onBack}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          data-testid={`${testId}-back-btn`}
        >
          <ArrowLeft />
          Overview
        </BackButton>
      </Header>

      <Content>
        <CorpusDiscussionsView corpusId={corpus.id} hideHeader />
      </Content>
    </Container>
  );
};

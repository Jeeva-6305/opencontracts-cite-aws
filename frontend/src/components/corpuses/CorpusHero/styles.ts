import styled from "styled-components";
import { motion } from "framer-motion";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  mediaQuery,
} from "../styles/corpusDesignTokens";

export const HeroContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem 2.5rem;
  background: ${CORPUS_COLORS.white};
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  flex-shrink: 0;

  ${mediaQuery.tablet} {
    padding: 1.25rem 1rem;
    gap: 1rem;
  }
`;

export const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${CORPUS_COLORS.slate[500]};

  a {
    color: ${CORPUS_COLORS.slate[500]};
    text-decoration: none;
    transition: color ${CORPUS_TRANSITIONS.fast};

    &:hover {
      color: ${CORPUS_COLORS.teal[700]};
    }
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${CORPUS_COLORS.slate[300]};
  }

  .current {
    color: ${CORPUS_COLORS.slate[700]};
    font-weight: 500;
  }
`;

export const HeroTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;

  ${mediaQuery.tablet} {
    flex-direction: column;
    gap: 1rem;
  }
`;

export const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
`;

export const HeroTitle = styled.h1`
  margin: 0;
  font-family: ${CORPUS_FONTS.serif};
  font-size: 2.625rem;
  font-weight: 400;
  color: ${CORPUS_COLORS.slate[800]};
  letter-spacing: -0.02em;
  line-height: 1.15;

  .accent {
    color: ${CORPUS_COLORS.teal[700]};
  }

  ${mediaQuery.tablet} {
    font-size: 1.75rem;
  }
`;

export const Subtitle = styled.p`
  margin: 0;
  font-size: 1rem;
  color: ${CORPUS_COLORS.slate[500]};
  line-height: 1.5;
  max-width: 600px;

  ${mediaQuery.tablet} {
    font-size: 0.875rem;
  }
`;

export const MetadataRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;

  ${mediaQuery.tablet} {
    gap: 0.75rem;
  }
`;

export const MetadataItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: ${CORPUS_COLORS.slate[500]};

  svg {
    width: 14px;
    height: 14px;
    color: ${CORPUS_COLORS.slate[400]};
  }

  ${mediaQuery.tablet} {
    font-size: 0.75rem;

    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

export const MetadataSeparator = styled.div`
  width: 1px;
  height: 16px;
  background: ${CORPUS_COLORS.slate[200]};

  ${mediaQuery.tablet} {
    height: 12px;
  }
`;

export const AccessBadge = styled.div<{ $isPublic?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${CORPUS_RADII.sm};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${(props) =>
    props.$isPublic ? CORPUS_COLORS.teal[50] : "#fef3c7"};
  color: ${(props) => (props.$isPublic ? CORPUS_COLORS.teal[700] : "#92400e")};

  svg {
    width: 12px;
    height: 12px;
  }
`;

// InlineChatBar styles
export const ChatBarContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const ChatBarWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${CORPUS_COLORS.slate[50]};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.lg};
  padding: 0.75rem 1rem;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:focus-within {
    background: ${CORPUS_COLORS.white};
    border-color: ${CORPUS_COLORS.teal[500]};
    box-shadow: 0 0 0 3px ${CORPUS_COLORS.teal[50]};
  }

  ${mediaQuery.tablet} {
    padding: 0.625rem 0.875rem;
  }
`;

export const ChatInput = styled.textarea`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  color: ${CORPUS_COLORS.slate[700]};
  resize: none;
  outline: none;
  font-family: ${CORPUS_FONTS.sans};
  line-height: 1.5;
  min-height: 24px;
  max-height: 120px;

  &::placeholder {
    color: ${CORPUS_COLORS.slate[400]};
  }

  ${mediaQuery.tablet} {
    font-size: 0.875rem;
  }
`;

export const ChatActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

export const ChatButton = styled(motion.button)<{
  $primary?: boolean;
  disabled?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${CORPUS_RADII.md};
  border: none;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all ${CORPUS_TRANSITIONS.fast};

  ${(props) =>
    props.$primary
      ? `
    background: ${
      props.disabled ? CORPUS_COLORS.slate[200] : CORPUS_COLORS.teal[700]
    };
    color: ${props.disabled ? CORPUS_COLORS.slate[400] : CORPUS_COLORS.white};

    &:hover:not(:disabled) {
      background: ${CORPUS_COLORS.teal[600]};
    }
  `
      : `
    background: transparent;
    color: ${CORPUS_COLORS.slate[500]};

    &:hover:not(:disabled) {
      background: ${CORPUS_COLORS.slate[100]};
      color: ${CORPUS_COLORS.teal[700]};
    }
  `}

  svg {
    width: 18px;
    height: 18px;
  }

  ${mediaQuery.tablet} {
    width: 32px;
    height: 32px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const QuickActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const QuickActionChip = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: ${CORPUS_RADII.full};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  background: ${CORPUS_COLORS.white};
  color: ${CORPUS_COLORS.slate[600]};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${CORPUS_COLORS.teal[50]};
    border-color: ${CORPUS_COLORS.teal[200]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  &:focus-visible {
    outline: 2px solid ${CORPUS_COLORS.teal[500]};
    outline-offset: 2px;
    background: ${CORPUS_COLORS.teal[50]};
    border-color: ${CORPUS_COLORS.teal[200]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  ${mediaQuery.tablet} {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
  }
`;

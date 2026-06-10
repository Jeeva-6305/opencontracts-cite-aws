/**
 * Styled components for the CorpusContextSidebar
 * Used when viewing thread details inline within the Discussions tab
 */

import styled from "styled-components";
import { motion } from "framer-motion";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  CORPUS_BREAKPOINTS,
} from "../../corpuses/styles/corpusDesignTokens";

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const SIDEBAR_WIDTH = 320;
export const SIDEBAR_COLLAPSED_WIDTH = 48;
export const SIDEBAR_BREAKPOINT_HIDE = 1024;
export const SIDEBAR_BREAKPOINT_COLLAPSE = 1200;

// ============================================================================
// MAIN CONTAINERS
// ============================================================================

/** Main flex container for thread detail + sidebar layout */
export const ThreadWithContextContainer = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: ${CORPUS_COLORS.slate[50]};

  /* Focus styles for accessibility - programmatic focus shouldn't show outline */
  &:focus {
    outline: none;
  }
`;

/** Thread detail pane - takes remaining space */
export const ThreadDetailPane = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/** Vertical divider between thread and sidebar */
export const VerticalDivider = styled.div`
  width: 1px;
  background: ${CORPUS_COLORS.slate[200]};
  flex-shrink: 0;

  @media (max-width: ${SIDEBAR_BREAKPOINT_HIDE}px) {
    display: none;
  }
`;

// ============================================================================
// SIDEBAR CONTAINER
// ============================================================================

/** Context sidebar container - fixed/collapsible width */
export const ContextSidebarContainer = styled(motion.aside)<{
  $isExpanded: boolean;
  $isCollapsible: boolean;
}>`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: ${({ $isExpanded, $isCollapsible }) =>
    $isCollapsible
      ? $isExpanded
        ? `${SIDEBAR_WIDTH}px`
        : `${SIDEBAR_COLLAPSED_WIDTH}px`
      : `${SIDEBAR_WIDTH}px`};
  min-width: ${({ $isExpanded, $isCollapsible }) =>
    $isCollapsible
      ? $isExpanded
        ? `${SIDEBAR_WIDTH}px`
        : `${SIDEBAR_COLLAPSED_WIDTH}px`
      : `${SIDEBAR_WIDTH}px`};
  max-width: ${SIDEBAR_WIDTH}px;
  background: ${CORPUS_COLORS.white};
  border-left: 1px solid ${CORPUS_COLORS.slate[200]};
  overflow: hidden;
  transition: all ${CORPUS_TRANSITIONS.normal};

  /* Hide on small screens */
  @media (max-width: ${SIDEBAR_BREAKPOINT_HIDE}px) {
    display: none;
  }
`;

/** Sidebar header */
export const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  background: ${CORPUS_COLORS.white};
  flex-shrink: 0;
`;

/** Sidebar title */
export const SidebarTitle = styled.h3`
  margin: 0;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.875rem;
  font-weight: 600;
  color: ${CORPUS_COLORS.slate[700]};
`;

/** Close/toggle button */
export const ContextSidebarToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: ${CORPUS_RADII.sm};
  background: transparent;
  color: ${CORPUS_COLORS.slate[400]};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    background: ${CORPUS_COLORS.slate[100]};
    color: ${CORPUS_COLORS.slate[600]};
  }

  &:focus-visible {
    outline: 2px solid ${CORPUS_COLORS.teal[500]};
    outline-offset: 2px;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

/** Collapsed sidebar with toggle button */
export const CollapsedSidebar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  gap: 0.5rem;
`;

/** Collapsed sidebar expand button */
export const ExpandSidebarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  color: ${CORPUS_COLORS.slate[500]};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[300]};
    background: ${CORPUS_COLORS.teal[50]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  &:focus-visible {
    outline: 2px solid ${CORPUS_COLORS.teal[500]};
    outline-offset: 2px;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

// ============================================================================
// SIDEBAR CONTENT
// ============================================================================

/** Scrollable sidebar content */
export const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${CORPUS_COLORS.slate[200]};
    border-radius: 3px;

    &:hover {
      background: ${CORPUS_COLORS.slate[300]};
    }
  }
`;

/** Sidebar section */
export const SidebarSection = styled.section`
  border-bottom: 1px solid ${CORPUS_COLORS.slate[100]};

  &:last-child {
    border-bottom: none;
  }
`;

/** Section header with toggle */
export const SectionHeader = styled.button<{ $isExpanded?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1.25rem;
  border: none;
  background: ${({ $isExpanded }) =>
    $isExpanded ? CORPUS_COLORS.slate[50] : CORPUS_COLORS.white};
  cursor: pointer;
  transition: background ${CORPUS_TRANSITIONS.fast};

  &:hover {
    background: ${CORPUS_COLORS.slate[50]};
  }

  &:focus-visible {
    outline: 2px solid ${CORPUS_COLORS.teal[500]};
    outline-offset: -2px;
  }
`;

/** Section title */
export const SectionTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${CORPUS_COLORS.slate[700]};

  svg {
    width: 1rem;
    height: 1rem;
    color: ${CORPUS_COLORS.teal[600]};
  }
`;

/** Section chevron */
export const SectionChevron = styled.span<{ $isExpanded?: boolean }>`
  display: flex;
  align-items: center;
  color: ${CORPUS_COLORS.slate[400]};
  transition: transform ${CORPUS_TRANSITIONS.fast};
  transform: rotate(${({ $isExpanded }) => ($isExpanded ? "180deg" : "0deg")});

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

/** Section content (collapsible) */
export const SectionContent = styled(motion.div)`
  overflow: hidden;
`;

/** Section inner content with padding */
export const SectionInner = styled.div`
  padding: 0.5rem 1.25rem 1rem;
`;

// ============================================================================
// QUICK STATS
// ============================================================================

/** Stats grid */
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

/** Stat item */
export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: ${CORPUS_COLORS.slate[50]};
  border-radius: ${CORPUS_RADII.md};
  border: 1px solid ${CORPUS_COLORS.slate[100]};
`;

/** Stat value */
export const StatValue = styled.span`
  font-family: ${CORPUS_FONTS.sans};
  font-size: 1.25rem;
  font-weight: 600;
  color: ${CORPUS_COLORS.slate[800]};
`;

/** Stat label */
export const StatLabel = styled.span`
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${CORPUS_COLORS.slate[500]};
`;

// ============================================================================
// ABOUT SECTION OVERRIDES
// ============================================================================

/** Compact about content wrapper */
export const CompactAboutWrapper = styled.div`
  /* Override AboutContent styles for compact sidebar display */
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${CORPUS_COLORS.slate[600]};

  p {
    margin-bottom: 0.75rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Constrain markdown content */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: 0.9375rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: ${CORPUS_COLORS.teal[700]};
  }

  ul,
  ol {
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  code {
    font-size: 0.8125rem;
    padding: 0.125rem 0.375rem;
    background: ${CORPUS_COLORS.slate[100]};
    border-radius: ${CORPUS_RADII.sm};
  }

  pre {
    font-size: 0.75rem;
    padding: 0.75rem;
    background: ${CORPUS_COLORS.slate[100]};
    border-radius: ${CORPUS_RADII.md};
    overflow-x: auto;
  }
`;

// ============================================================================
// DOCUMENTS TOC SECTION OVERRIDES
// ============================================================================

/** Compact TOC wrapper */
export const CompactTocWrapper = styled.div`
  /* Override DocumentTableOfContents styles for compact sidebar display */
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${CORPUS_COLORS.slate[200]};
    border-radius: 2px;
  }
`;

// ============================================================================
// EMPTY STATE
// ============================================================================

/** Empty section state */
export const EmptySectionState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem;
  text-align: center;
  color: ${CORPUS_COLORS.slate[400]};

  svg {
    width: 2rem;
    height: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }

  p {
    font-size: 0.8125rem;
    margin: 0;
  }
`;

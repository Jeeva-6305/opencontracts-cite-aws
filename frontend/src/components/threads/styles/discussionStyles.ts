/**
 * Shared styles for discussion thread components
 * Following the OS-Legal-Style design system established in corpusDesignTokens.ts
 *
 * Design principles:
 * - Typography-first: Serif headings (Georgia), sans-serif body (Inter)
 * - Teal accent: teal-700 (#0f766e) for interactive elements
 * - Generous whitespace: 2rem+ padding, 1-1.5rem gaps
 * - Subtle shadows: Light card shadows, no heavy drops
 * - Smooth transitions: 0.15s-0.3s ease for interactions
 */

import styled from "styled-components";

// Import design tokens from corpusDesignTokens for consistency
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_FONT_SIZES,
  CORPUS_SPACING,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  CORPUS_BREAKPOINTS,
  mediaQuery,
} from "../../corpuses/styles/corpusDesignTokens";
import {
  OS_LEGAL_COLORS,
  accentAlpha,
} from "../../../assets/configurations/osLegalStyles";

// Re-export for external use
export {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_FONT_SIZES,
  CORPUS_SPACING,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
  CORPUS_BREAKPOINTS,
  mediaQuery,
};

// ============================================================================
// Typography Components
// ============================================================================

/**
 * Serif title for discussion headings
 * Use for thread titles and major section headers
 */
export const DiscussionTitle = styled.h1<{ $size?: "sm" | "md" | "lg" }>`
  font-family: ${CORPUS_FONTS.serif};
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${CORPUS_COLORS.slate[900]};
  margin: 0;

  ${({ $size = "md" }) => {
    switch ($size) {
      case "sm":
        return `font-size: ${CORPUS_FONT_SIZES.xl};`; // 18px
      case "lg":
        return `font-size: ${CORPUS_FONT_SIZES["4xl"]};`; // 32px
      default:
        return `font-size: ${CORPUS_FONT_SIZES["3xl"]};`; // 24px
    }
  }}

  ${mediaQuery.mobile} {
    ${({ $size = "md" }) => {
      switch ($size) {
        case "sm":
          return `font-size: ${CORPUS_FONT_SIZES.lg};`; // 16px
        case "lg":
          return `font-size: ${CORPUS_FONT_SIZES["3xl"]};`; // 24px
        default:
          return `font-size: ${CORPUS_FONT_SIZES["2xl"]};`; // 20px
      }
    }}
  }
`;

/**
 * Subtitle for discussion descriptions
 */
export const DiscussionSubtitle = styled.p`
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.md};
  font-weight: 400;
  line-height: 1.65;
  color: ${CORPUS_COLORS.slate[600]};
  margin: 0;

  ${mediaQuery.mobile} {
    font-size: ${CORPUS_FONT_SIZES.base};
  }
`;

/**
 * Section header for grouping content
 */
export const DiscussionSectionHeader = styled.h2`
  font-family: ${CORPUS_FONTS.serif};
  font-size: ${CORPUS_FONT_SIZES["2xl"]};
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${CORPUS_COLORS.slate[800]};
  margin: 0;

  ${mediaQuery.mobile} {
    font-size: ${CORPUS_FONT_SIZES.xl};
  }
`;

// ============================================================================
// Badge Components
// ============================================================================

/**
 * Pill-shaped badge with teal accent
 * Used for discussion types, status indicators
 */
export const DiscussionBadge = styled.span<{
  $variant?: "teal" | "green" | "amber" | "red" | "slate";
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: ${CORPUS_RADII.full};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all ${CORPUS_TRANSITIONS.fast};

  ${({ $variant = "teal" }) => {
    switch ($variant) {
      case "green":
        return `
          background: ${OS_LEGAL_COLORS.successSurface};
          color: ${OS_LEGAL_COLORS.successText};
          border: 1px solid #86efac;
        `;
      case "amber":
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        `;
      case "red":
        return `
          background: ${OS_LEGAL_COLORS.dangerSurfaceHover};
          color: ${OS_LEGAL_COLORS.dangerText};
          border: 1px solid ${OS_LEGAL_COLORS.dangerBorder};
        `;
      case "slate":
        return `
          background: ${CORPUS_COLORS.slate[100]};
          color: ${CORPUS_COLORS.slate[600]};
          border: 1px solid ${CORPUS_COLORS.slate[300]};
        `;
      default: // teal
        return `
          background: ${CORPUS_COLORS.teal[50]};
          color: ${CORPUS_COLORS.teal[700]};
          border: 1px solid ${CORPUS_COLORS.teal[200]};
        `;
    }
  }}

  svg {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
  }
`;

/**
 * Compact status indicator badge
 */
export const StatusIndicator = styled.span<{
  $status?: "pinned" | "locked" | "deleted";
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${CORPUS_RADII.sm};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  ${({ $status = "pinned" }) => {
    switch ($status) {
      case "locked":
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case "deleted":
        return `
          background: ${CORPUS_COLORS.slate[100]};
          color: ${CORPUS_COLORS.slate[500]};
        `;
      default: // pinned
        return `
          background: ${CORPUS_COLORS.teal[50]};
          color: ${CORPUS_COLORS.teal[700]};
        `;
    }
  }}

  svg {
    width: 0.6875rem;
    height: 0.6875rem;
    flex-shrink: 0;
  }
`;

// ============================================================================
// Card Components
// ============================================================================

/**
 * Base card component for discussion items
 * White background, subtle border, hover shadow
 */
export const DiscussionCard = styled.div<{
  $isSelected?: boolean;
  $isHighlighted?: boolean;
  $isDeleted?: boolean;
}>`
  background: ${CORPUS_COLORS.white};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.lg};
  padding: 1.25rem;
  transition: all ${CORPUS_TRANSITIONS.normal};

  ${({ $isSelected }) =>
    $isSelected &&
    `
    border-left: 3px solid ${CORPUS_COLORS.teal[600]};
    background: ${CORPUS_COLORS.teal[50]};
  `}

  ${({ $isHighlighted }) =>
    $isHighlighted &&
    `
    border-color: ${CORPUS_COLORS.teal[300]};
    background: ${CORPUS_COLORS.teal[50]};
  `}

  ${({ $isDeleted }) =>
    $isDeleted &&
    `
    opacity: 0.6;
    background: ${CORPUS_COLORS.slate[50]};
  `}

  &:hover {
    border-color: ${CORPUS_COLORS.slate[300]};
    box-shadow: ${CORPUS_SHADOWS.cardHover};
    transform: translateY(-1px);
  }

  ${mediaQuery.mobile} {
    padding: 1rem;
    border-radius: ${CORPUS_RADII.md};
  }
`;

/**
 * Thread/message container card with left accent
 */
export const ThreadCard = styled(DiscussionCard)<{
  $isPinned?: boolean;
  $depth?: number;
}>`
  cursor: pointer;
  display: flex;
  gap: 1rem;

  ${({ $isPinned }) =>
    $isPinned &&
    `
    border-left: 3px solid ${CORPUS_COLORS.teal[500]};
    background: linear-gradient(135deg, ${CORPUS_COLORS.teal[50]} 0%, ${CORPUS_COLORS.white} 100%);
  `}

  ${({ $depth = 0 }) =>
    $depth > 0 &&
    `
    margin-left: ${Math.min($depth * 1.5, 6)}rem;
    border-left: 2px solid ${CORPUS_COLORS.teal[200]};
  `}

  ${mediaQuery.mobile} {
    gap: 0.75rem;
    ${({ $depth = 0 }) =>
      $depth > 0 &&
      `
      margin-left: ${Math.min($depth * 1, 3)}rem;
    `}
  }
`;

/**
 * Message item card with agent styling support
 */
export const MessageCard = styled(DiscussionCard)<{
  $isAgent?: boolean;
  $agentColor?: string;
}>`
  display: flex;
  gap: 0.75rem;

  ${({ $isAgent, $agentColor }) =>
    $isAgent &&
    `
    background: linear-gradient(135deg, ${
      $agentColor || CORPUS_COLORS.teal[700]
    }08 0%, ${$agentColor || CORPUS_COLORS.teal[700]}03 100%);
    border-color: ${$agentColor || CORPUS_COLORS.teal[700]}40;
    border-left: 3px solid ${$agentColor || CORPUS_COLORS.teal[700]};
  `}
`;

// ============================================================================
// Metadata Components
// ============================================================================

/**
 * Metadata row for author info, timestamps, stats
 */
export const DiscussionMetadata = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  color: ${CORPUS_COLORS.slate[500]};
  flex-wrap: wrap;

  svg {
    width: 0.875rem;
    height: 0.875rem;
    color: ${CORPUS_COLORS.slate[400]};
  }

  ${mediaQuery.mobile} {
    font-size: ${CORPUS_FONT_SIZES.xs};
    gap: 0.5rem;
  }
`;

/**
 * Metadata item with icon
 */
export const MetadataItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;

  strong {
    color: ${CORPUS_COLORS.slate[700]};
    font-weight: 600;
  }
`;

/**
 * Dot separator for metadata
 */
export const MetadataDot = styled.span`
  color: ${CORPUS_COLORS.slate[300]};
  font-size: 0.5rem;
`;

// ============================================================================
// Avatar Components
// ============================================================================

/**
 * User avatar with teal gradient for humans
 */
export const UserAvatar = styled.div<{
  $size?: "sm" | "md" | "lg";
  $isAgent?: boolean;
  $agentColor?: string;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  color: ${CORPUS_COLORS.white};
  font-weight: 600;

  ${({ $size = "md" }) => {
    switch ($size) {
      case "sm":
        return `
          width: 1.5rem;
          height: 1.5rem;
          font-size: 0.625rem;
        `;
      case "lg":
        return `
          width: 2.5rem;
          height: 2.5rem;
          font-size: 0.875rem;
        `;
      default:
        return `
          width: 1.75rem;
          height: 1.75rem;
          font-size: 0.75rem;
        `;
    }
  }}

  ${({ $isAgent, $agentColor }) =>
    $isAgent
      ? `background: linear-gradient(135deg, ${
          $agentColor || OS_LEGAL_COLORS.primaryBlue
        } 0%, ${$agentColor || OS_LEGAL_COLORS.primaryBlue}dd 100%);`
      : `background: linear-gradient(135deg, ${CORPUS_COLORS.teal[600]} 0%, ${CORPUS_COLORS.teal[700]} 100%);`}

  svg {
    ${({ $size = "md" }) => {
      switch ($size) {
        case "sm":
          return `width: 0.75rem; height: 0.75rem;`;
        case "lg":
          return `width: 1.25rem; height: 1.25rem;`;
        default:
          return `width: 0.875rem; height: 0.875rem;`;
      }
    }}
  }
`;

// ============================================================================
// Button Components
// ============================================================================

/**
 * Primary teal button with gradient
 */
export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: ${CORPUS_RADII.md};
  background: linear-gradient(
    135deg,
    ${CORPUS_COLORS.teal[600]} 0%,
    ${CORPUS_COLORS.teal[700]} 100%
  );
  color: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.base};
  font-weight: 600;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.normal};
  box-shadow: 0 4px 12px ${accentAlpha(0.35)};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${accentAlpha(0.45)};
    background: linear-gradient(
      135deg,
      ${CORPUS_COLORS.teal[500]} 0%,
      ${CORPUS_COLORS.teal[600]} 100%
    );
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px ${accentAlpha(0.3)};
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

/**
 * Secondary ghost button
 */
export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  color: ${CORPUS_COLORS.slate[700]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover:not(:disabled) {
    border-color: ${CORPUS_COLORS.teal[300]};
    background: ${CORPUS_COLORS.teal[50]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

/**
 * Text-only button for inline actions
 */
export const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: ${CORPUS_RADII.sm};
  background: transparent;
  color: ${CORPUS_COLORS.slate[600]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover:not(:disabled) {
    background: ${CORPUS_COLORS.teal[50]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

// ============================================================================
// Vote Components
// ============================================================================

/**
 * Vote button with teal upvote accent
 */
export const VoteButton = styled.button<{
  $isActive?: boolean;
  $variant?: "up" | "down";
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
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
    return CORPUS_COLORS.slate[500];
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
    width: 1.125rem;
    height: 1.125rem;
  }
`;

/**
 * Vote count display
 */
export const VoteCount = styled.span<{ $score: number }>`
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  color: ${({ $score }) => {
    if ($score > 0) return CORPUS_COLORS.teal[700];
    if ($score < 0) return OS_LEGAL_COLORS.danger;
    return CORPUS_COLORS.slate[500];
  }};
`;

// ============================================================================
// Input Components
// ============================================================================

/**
 * Text input with teal focus ring
 */
export const TextInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.base};
  color: ${CORPUS_COLORS.slate[800]};
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:focus {
    outline: none;
    border-color: ${CORPUS_COLORS.teal[500]};
    box-shadow: 0 0 0 3px ${CORPUS_COLORS.teal[50]};
  }

  &::placeholder {
    color: ${CORPUS_COLORS.slate[400]};
  }

  &:disabled {
    background: ${CORPUS_COLORS.slate[50]};
    cursor: not-allowed;
  }
`;

/**
 * Textarea with teal focus ring
 */
export const TextArea = styled.textarea`
  width: 100%;
  min-height: 6rem;
  padding: 0.75rem 1rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.base};
  color: ${CORPUS_COLORS.slate[800]};
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

// ============================================================================
// Container Components
// ============================================================================

/**
 * Page container with max-width and padding
 */
export const DiscussionContainer = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem;

  ${mediaQuery.tablet} {
    padding: 1.5rem;
  }

  ${mediaQuery.mobile} {
    padding: 1rem;
  }
`;

/**
 * Section wrapper with bottom border
 */
export const DiscussionSection = styled.section`
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

/**
 * Flex container for header rows
 */
export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

/**
 * Grid container for thread lists
 */
export const ThreadGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  ${mediaQuery.mobile} {
    gap: 0.5rem;
  }
`;

// ============================================================================
// Filter/Tab Components
// ============================================================================

/**
 * Tab container for filter tabs
 */
export const TabContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  background: ${CORPUS_COLORS.slate[100]};
  padding: 0.25rem;
  border-radius: ${CORPUS_RADII.lg};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
`;

/**
 * Individual tab button
 */
export const TabButton = styled.button<{ $isActive: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${CORPUS_RADII.md};
  border: none;
  background: ${({ $isActive }) =>
    $isActive ? CORPUS_COLORS.white : "transparent"};
  color: ${({ $isActive }) =>
    $isActive ? CORPUS_COLORS.slate[800] : CORPUS_COLORS.slate[600]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  font-weight: ${({ $isActive }) => ($isActive ? 600 : 500)};
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};
  box-shadow: ${({ $isActive }) => ($isActive ? CORPUS_SHADOWS.sm : "none")};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${({ $isActive }) =>
      $isActive ? CORPUS_COLORS.white : "rgba(255,255,255,0.6)"};
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

/**
 * Filter pill button
 */
export const FilterPill = styled.button<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid
    ${({ $isActive }) =>
      $isActive ? CORPUS_COLORS.teal[500] : CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.full};
  background: ${({ $isActive }) =>
    $isActive ? CORPUS_COLORS.teal[600] : CORPUS_COLORS.white};
  color: ${({ $isActive }) =>
    $isActive ? CORPUS_COLORS.white : CORPUS_COLORS.slate[600]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.xs};
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[400]};
    background: ${({ $isActive }) =>
      $isActive ? CORPUS_COLORS.teal[700] : CORPUS_COLORS.teal[50]};
    color: ${({ $isActive }) =>
      $isActive ? CORPUS_COLORS.white : CORPUS_COLORS.teal[700]};
  }

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

// ============================================================================
// Search Components
// ============================================================================

/**
 * Search input container
 */
export const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 12rem;
  max-width: 25rem;
`;

/**
 * Search icon positioned inside input
 */
export const SearchIcon = styled.span`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${CORPUS_COLORS.slate[400]};
  pointer-events: none;
  display: flex;

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

/**
 * Search input field
 */
export const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.875rem 0.5rem 2.25rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.sm};
  color: ${CORPUS_COLORS.slate[800]};
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

// ============================================================================
// Timestamp Component
// ============================================================================

/**
 * Relative time display
 */
export const Timestamp = styled.span`
  font-family: ${CORPUS_FONTS.sans};
  font-size: ${CORPUS_FONT_SIZES.xs};
  color: ${CORPUS_COLORS.slate[400]};
  white-space: nowrap;
`;

// ============================================================================
// Empty State Component
// ============================================================================

/**
 * Empty state container
 */
export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${CORPUS_COLORS.slate[500]};

  h3 {
    font-family: ${CORPUS_FONTS.serif};
    font-size: ${CORPUS_FONT_SIZES.xl};
    font-weight: 600;
    color: ${CORPUS_COLORS.slate[700]};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-family: ${CORPUS_FONTS.sans};
    font-size: ${CORPUS_FONT_SIZES.base};
    margin: 0;
    line-height: 1.5;
  }
`;

// ============================================================================
// Loading State Component
// ============================================================================

/**
 * Loading container
 */
export const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

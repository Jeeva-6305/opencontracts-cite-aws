/**
 * CamlCitationChip — Renders a single resolved citation as an inline chip.
 *
 * Shows a compact pill with the annotation label. On hover, expands to show
 * annotation text snippet, document title, similarity score, and a deep link
 * to view the annotation in the document viewer.
 */
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import styled from "styled-components";

import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedCitation {
  annotationId: string;
  rawText: string;
  labelText: string;
  labelColor: string;
  documentTitle: string;
  documentSlug: string;
  corpusSlug: string;
  similarityScore: number;
  page?: number;
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const ChipWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Chip = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  margin: 0 0.125rem;
  border: 1px solid ${({ $color }) => $color}33;
  border-radius: 9999px;
  background: ${({ $color }) => $color}0d;
  color: ${({ $color }) => $color};
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;
  vertical-align: baseline;
  white-space: nowrap;

  &:hover {
    background: ${({ $color }) => $color}1a;
    border-color: ${({ $color }) => $color}66;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${({ $color }) => $color}1a;
  }
`;

const Popover = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  padding: 0.875rem;
  background: white;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 1100;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition: opacity 0.15s ease;
`;

const PopoverLabel = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: ${({ $color }) => $color}1a;
  color: ${({ $color }) => $color};
  font-size: 0.6875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const PopoverSnippet = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${OS_LEGAL_COLORS.textPrimary};
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PopoverMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const PopoverDocTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`;

const PopoverScore = styled.span`
  font-size: 0.625rem;
  color: ${OS_LEGAL_COLORS.textMuted};
  white-space: nowrap;
`;

const PopoverLink = styled(Link)`
  display: block;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${OS_LEGAL_COLORS.border};
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.accent};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a deep link URL to view an annotation in the document viewer.
 * Centralised here so the URL scheme is in one place; if the routing
 * system later provides path helpers this is the only call site to update.
 *
 * TODO: Pass annotationId as a query param (e.g. `?annotation=<id>`) so the
 * viewer can scroll to the specific annotation. Requires CentralRouteManager
 * path helpers or a viewer URL param convention to be established first.
 */
function buildAnnotationDeepLink(
  citation: Pick<ResolvedCitation, "corpusSlug" | "documentSlug" | "page">
): string {
  const base = `/corpuses/${citation.corpusSlug}/documents/${citation.documentSlug}`;
  return citation.page != null ? `${base}?page=${citation.page}` : base;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CamlCitationChipProps {
  citation: ResolvedCitation;
}

export const CamlCitationChip: React.FC<CamlCitationChipProps> = ({
  citation,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(hideTimeout.current), []);

  const showPopoverNow = () => {
    clearTimeout(hideTimeout.current);
    setShowPopover(true);
  };

  const hidePopoverDelayed = () => {
    hideTimeout.current = setTimeout(() => setShowPopover(false), 200);
  };

  const deepLink = buildAnnotationDeepLink(citation);

  const scorePercent = Math.round(citation.similarityScore * 100);

  return (
    <ChipWrapper
      onMouseEnter={showPopoverNow}
      onMouseLeave={hidePopoverDelayed}
      onFocus={showPopoverNow}
      onBlur={hidePopoverDelayed}
    >
      <Chip
        $color={citation.labelColor || OS_LEGAL_COLORS.accent}
        aria-label={`Citation: ${citation.labelText || "Citation"}`}
        aria-haspopup="true"
        aria-expanded={showPopover}
      >
        {citation.labelText || "Citation"}
      </Chip>

      <Popover $visible={showPopover} role="tooltip">
        <PopoverLabel $color={citation.labelColor || OS_LEGAL_COLORS.accent}>
          {citation.labelText || "Annotation"}
        </PopoverLabel>
        <PopoverSnippet>{citation.rawText}</PopoverSnippet>
        <PopoverMeta>
          <PopoverDocTitle>
            <BookOpen size={11} />
            {citation.documentTitle}
            {citation.page != null && ` · p.${citation.page}`}
          </PopoverDocTitle>
          <PopoverScore>{scorePercent}% match</PopoverScore>
        </PopoverMeta>
        <PopoverLink to={deepLink}>View in document →</PopoverLink>
      </Popover>
    </ChipWrapper>
  );
};

// ---------------------------------------------------------------------------
// Loading placeholder
// ---------------------------------------------------------------------------

const PulsingChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  margin: 0 0.125rem;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 9999px;
  background: ${OS_LEGAL_COLORS.surfaceLight};
  color: ${OS_LEGAL_COLORS.textMuted};
  font-size: 0.6875rem;
  font-weight: 500;
  vertical-align: baseline;
  animation: citePulse 1.5s ease-in-out infinite;

  @keyframes citePulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }
`;

export const CamlCitationLoading: React.FC = () => (
  <PulsingChip>finding citation…</PulsingChip>
);

// ---------------------------------------------------------------------------
// Error placeholder
// ---------------------------------------------------------------------------

const ErrorChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  margin: 0 0.125rem;
  border: 1px solid ${OS_LEGAL_COLORS.danger}33;
  border-radius: 9999px;
  background: ${OS_LEGAL_COLORS.danger}0d;
  color: ${OS_LEGAL_COLORS.danger};
  font-size: 0.6875rem;
  font-weight: 500;
  vertical-align: baseline;
`;

interface CamlCitationErrorProps {
  message?: string;
}

export const CamlCitationError: React.FC<CamlCitationErrorProps> = ({
  message,
}) => (
  <ErrorChip title={message ?? "Citation search failed"}>
    citation failed
  </ErrorChip>
);

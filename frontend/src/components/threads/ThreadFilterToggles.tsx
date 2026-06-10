import React from "react";
import styled from "styled-components";
import { useAtom } from "jotai";
import { Lock, Trash2 } from "lucide-react";
import { threadFiltersAtom } from "../../atoms/threadAtoms";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Label = styled.span`
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  color: ${CORPUS_COLORS.slate[500]};
  font-weight: 500;
`;

const ToggleButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid
    ${(props) =>
      props.$isActive ? CORPUS_COLORS.teal[500] : CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.full};
  background: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[50] : CORPUS_COLORS.white};
  color: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[700] : CORPUS_COLORS.slate[600]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[400]};
    background: ${CORPUS_COLORS.teal[50]};
    color: ${CORPUS_COLORS.teal[700]};
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

export interface ThreadFilterTogglesProps {
  /** Show moderator-only filters (e.g., deleted threads) */
  showModeratorFilters?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * Toggle buttons for filtering thread list
 * Updates threadFiltersAtom when toggles change
 */
export function ThreadFilterToggles({
  showModeratorFilters = false,
  className,
}: ThreadFilterTogglesProps) {
  const [filters, setFilters] = useAtom(threadFiltersAtom);

  const toggleShowLocked = () => {
    setFilters({ ...filters, showLocked: !filters.showLocked });
  };

  const toggleShowDeleted = () => {
    setFilters({ ...filters, showDeleted: !filters.showDeleted });
  };

  return (
    <Container className={className}>
      <Label>Show:</Label>

      <ToggleButton
        $isActive={filters.showLocked}
        onClick={toggleShowLocked}
        aria-label={
          filters.showLocked ? "Hide locked threads" : "Show locked threads"
        }
        aria-pressed={filters.showLocked}
      >
        <Lock />
        <span>Locked</span>
      </ToggleButton>

      {showModeratorFilters && (
        <ToggleButton
          $isActive={filters.showDeleted}
          onClick={toggleShowDeleted}
          aria-label={
            filters.showDeleted
              ? "Hide deleted threads"
              : "Show deleted threads"
          }
          aria-pressed={filters.showDeleted}
        >
          <Trash2 />
          <span>Deleted</span>
        </ToggleButton>
      )}
    </Container>
  );
}

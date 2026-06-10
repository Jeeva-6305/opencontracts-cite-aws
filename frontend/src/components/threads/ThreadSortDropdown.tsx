import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { useAtom } from "jotai";
import { ChevronDown, Check } from "lucide-react";
import { threadSortAtom, ThreadSortOption } from "../../atoms/threadAtoms";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_SHADOWS,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";

const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  color: ${CORPUS_COLORS.slate[700]};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[400]};
    background: ${CORPUS_COLORS.teal[50]};
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: ${CORPUS_COLORS.slate[500]};
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  min-width: 12rem;
  background: ${CORPUS_COLORS.white};
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  box-shadow: ${CORPUS_SHADOWS.lg};
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  visibility: ${(props) => (props.$isOpen ? "visible" : "hidden")};
  transform: ${(props) =>
    props.$isOpen ? "translateY(0)" : "translateY(-8px)"};
  transition: all ${CORPUS_TRANSITIONS.fast};
  z-index: 100;
`;

const MenuItem = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: none;
  background: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[50] : "transparent"};
  color: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[700] : CORPUS_COLORS.slate[700]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background ${CORPUS_TRANSITIONS.fast};

  &:hover {
    background: ${(props) =>
      props.$isActive ? CORPUS_COLORS.teal[50] : CORPUS_COLORS.slate[50]};
  }

  &:first-child {
    border-radius: ${CORPUS_RADII.md} ${CORPUS_RADII.md} 0 0;
  }

  &:last-child {
    border-radius: 0 0 ${CORPUS_RADII.md} ${CORPUS_RADII.md};
  }

  svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: ${CORPUS_COLORS.teal[600]};
  }
`;

const MenuItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const MenuItemLabel = styled.span`
  font-weight: 600;
`;

const MenuItemDescription = styled.span`
  font-size: 0.75rem;
  color: ${CORPUS_COLORS.slate[500]};
`;

interface SortOption {
  value: ThreadSortOption;
  label: string;
  description: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "pinned",
    label: "Pinned First",
    description: "Show pinned threads at the top",
  },
  {
    value: "newest",
    label: "Newest",
    description: "Most recently created threads",
  },
  {
    value: "active",
    label: "Most Active",
    description: "Recently updated threads",
  },
  {
    value: "upvoted",
    label: "Most Upvoted",
    description: "Threads with most engagement",
  },
];

export interface ThreadSortDropdownProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * Dropdown for sorting thread list
 * Updates threadSortAtom when selection changes
 */
export function ThreadSortDropdown({ className }: ThreadSortDropdownProps) {
  const [sortBy, setSortBy] = useAtom(threadSortAtom);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleSelect = (value: ThreadSortOption) => {
    setSortBy(value);
    setIsOpen(false);
  };

  return (
    <DropdownContainer ref={dropdownRef} className={className}>
      <DropdownButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Sort threads"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>Sort: {currentOption?.label}</span>
        <ChevronDown />
      </DropdownButton>

      <DropdownMenu $isOpen={isOpen} role="menu">
        {SORT_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            $isActive={sortBy === option.value}
            onClick={() => handleSelect(option.value)}
            role="menuitem"
            aria-label={`Sort by ${option.label}`}
          >
            <MenuItemContent>
              <MenuItemLabel>{option.label}</MenuItemLabel>
              <MenuItemDescription>{option.description}</MenuItemDescription>
            </MenuItemContent>
            {sortBy === option.value && <Check />}
          </MenuItem>
        ))}
      </DropdownMenu>
    </DropdownContainer>
  );
}

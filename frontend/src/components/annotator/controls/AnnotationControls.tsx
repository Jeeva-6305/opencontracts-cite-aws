import React, { memo, useCallback } from "react";
import styled, { css } from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { Dropdown } from "@os-legal/ui";
import { User, Square, Layers, Eye, Tags } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAnnotationDisplay } from "../context/UISettingsAtom";
import { updateAnnotationDisplayParams } from "../../../utils/navigationUtils";
import { ViewLabelSelector } from "../labels/view_labels_selector/ViewLabelSelector";
import { LabelDisplayBehavior } from "../../../types/graphql-api";
import { ToggleSwitch } from "../../widgets/ToggleSwitch";

interface AnnotationControlsProps {
  /** Display variant - affects styling and layout */
  variant?: "floating" | "sidebar";
  /** Compact mode for space-constrained views */
  compact?: boolean;
  /** Whether to show label filters */
  showLabelFilters?: boolean;
}

/* Styled Components with variant support */
const ControlsContainer = styled.div<{ $variant: "floating" | "sidebar" }>`
  ${(props) =>
    props.$variant === "floating"
      ? css`
          padding: 0;
        `
      : css`
          padding: 1rem;
          background: ${OS_LEGAL_COLORS.surfaceHover};
          border-radius: 8px;
          border: 1px solid ${OS_LEGAL_COLORS.border};
        `}
`;

const ControlItem = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${(props) => (props.$compact ? "0.5rem" : "0.75rem")};
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$compact
        ? OS_LEGAL_COLORS.surfaceHover
        : OS_LEGAL_COLORS.surfaceLight};
  }

  &:not(:last-child) {
    margin-bottom: ${(props) => (props.$compact ? "0.25rem" : "0.5rem")};
  }
`;

const ControlLabel = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(props) => (props.$compact ? "0.5rem" : "0.75rem")};
  font-size: ${(props) => (props.$compact ? "0.8125rem" : "0.875rem")};
  font-weight: 500;
  color: ${OS_LEGAL_COLORS.textPrimary};

  svg {
    width: ${(props) => (props.$compact ? "16px" : "18px")};
    height: ${(props) => (props.$compact ? "16px" : "18px")};
    color: ${OS_LEGAL_COLORS.textSecondary};
  }
`;

const SectionHeader = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: ${(props) => (props.$compact ? "0.5rem" : "0.75rem")};
  padding: ${(props) => (props.$compact ? "0.5rem" : "0.75rem")};
  font-size: ${(props) => (props.$compact ? "0.875rem" : "0.9375rem")};
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
  border-bottom: ${(props) =>
    props.$compact ? "none" : `1px solid ${OS_LEGAL_COLORS.surfaceLight}`};

  svg {
    width: ${(props) => (props.$compact ? "18px" : "20px")};
    height: ${(props) => (props.$compact ? "18px" : "20px")};
    color: ${OS_LEGAL_COLORS.primaryBlue};
  }
`;

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textSecondary};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const LabelSelectorWrapper = styled.div`
  margin-top: 0.75rem;
`;

/**
 * Shared annotation controls component that can be used in both
 * floating controls and sidebar. Memoized to prevent unnecessary rerenders.
 *
 * Key optimizations:
 * - Component is memoized to prevent rerenders when parent updates
 * - All callbacks are memoized with useCallback
 * - State is managed through atoms that only trigger updates when values change
 */
export const AnnotationControls: React.FC<AnnotationControlsProps> = memo(
  ({ variant = "sidebar", compact = false, showLabelFilters = false }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Read current display settings from reactive vars (set by CentralRouteManager)
    const { showStructural, showSelectedOnly, showBoundingBoxes, showLabels } =
      useAnnotationDisplay();

    // Memoize callbacks to prevent child rerenders
    // Use navigation utility to update URL - CentralRouteManager Phase 2 will set reactive vars
    const handleShowSelectedChange = useCallback(
      (checked: boolean) => {
        updateAnnotationDisplayParams(location, navigate, {
          showSelectedOnly: checked,
        });
      },
      [location, navigate]
    );

    const handleShowStructuralChange = useCallback(
      (checked: boolean) => {
        updateAnnotationDisplayParams(location, navigate, {
          showStructural: checked,
        });
      },
      [location, navigate]
    );

    const handleShowBoundingBoxesChange = useCallback(
      (checked: boolean) => {
        updateAnnotationDisplayParams(location, navigate, {
          showBoundingBoxes: checked,
        });
      },
      [location, navigate]
    );

    const handleLabelBehaviorChange = useCallback(
      (value: LabelDisplayBehavior) => {
        updateAnnotationDisplayParams(location, navigate, {
          labelDisplay: value,
        });
      },
      [location, navigate]
    );

    const labelDisplayOptions = [
      {
        value: LabelDisplayBehavior.ALWAYS,
        label: "Always Show",
      },
      {
        value: LabelDisplayBehavior.ON_HOVER,
        label: "On Hover",
      },
      {
        value: LabelDisplayBehavior.HIDE,
        label: "Hide",
      },
    ];

    return (
      <ControlsContainer $variant={variant}>
        {variant === "sidebar" && !compact && (
          <SectionHeader $compact={compact}>
            <Eye />
            Visualization Settings
          </SectionHeader>
        )}

        <ControlItem $compact={compact}>
          <ControlLabel $compact={compact}>
            <User />
            Show Only Selected
          </ControlLabel>
          <ToggleSwitch>
            <input
              type="checkbox"
              aria-label="Show Only Selected"
              checked={showSelectedOnly}
              onChange={(e) => handleShowSelectedChange(e.target.checked)}
            />
            <span />
          </ToggleSwitch>
        </ControlItem>

        <ControlItem $compact={compact}>
          <ControlLabel $compact={compact}>
            <Square />
            Show Bounding Boxes
          </ControlLabel>
          <ToggleSwitch>
            <input
              type="checkbox"
              aria-label="Show Bounding Boxes"
              checked={showBoundingBoxes}
              onChange={(e) => handleShowBoundingBoxesChange(e.target.checked)}
            />
            <span />
          </ToggleSwitch>
        </ControlItem>

        <ControlItem $compact={compact}>
          <ControlLabel $compact={compact}>
            <Layers />
            Show Structural
          </ControlLabel>
          <ToggleSwitch>
            <input
              type="checkbox"
              aria-label="Show Structural"
              checked={showStructural}
              onChange={(e) => handleShowStructuralChange(e.target.checked)}
            />
            <span />
          </ToggleSwitch>
        </ControlItem>

        {/* Label Display Behavior */}
        <ControlItem $compact={compact}>
          <ControlLabel $compact={compact}>
            <Eye />
            Label Display
          </ControlLabel>
          <Dropdown
            mode="select"
            clearable={false}
            options={labelDisplayOptions}
            value={showLabels}
            onChange={(value) =>
              handleLabelBehaviorChange(value as LabelDisplayBehavior)
            }
          />
        </ControlItem>

        {/* Label Filter - only show when requested */}
        {showLabelFilters && (
          <LabelSelectorWrapper>
            <FilterHeader>
              <Tags />
              Filter by Labels
            </FilterHeader>
            <ViewLabelSelector />
          </LabelSelectorWrapper>
        )}
      </ControlsContainer>
    );
  }
);

AnnotationControls.displayName = "AnnotationControls";

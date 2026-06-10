import React, { useState } from "react";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

// Badge container with conditional styling based on version state
const BadgeWrapper = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
`;

const BadgeContainer = styled.div<{
  $hasHistory: boolean;
  $isOutdated: boolean;
}>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: ${(props) => (props.$hasHistory ? "pointer" : "default")};
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(4px);

  /* Base state - no history */
  background: ${(props) => {
    if (props.$isOutdated) {
      return "rgba(249, 115, 22, 0.15)";
    } else if (props.$hasHistory) {
      return "rgba(59, 130, 246, 0.15)";
    } else {
      return "rgba(100, 116, 139, 0.1)";
    }
  }};

  color: ${(props) => {
    if (props.$isOutdated) {
      return "#c2410c";
    } else if (props.$hasHistory) {
      return OS_LEGAL_COLORS.primaryBlueHover;
    } else {
      return OS_LEGAL_COLORS.textSecondary;
    }
  }};

  border: 1px solid
    ${(props) => {
      if (props.$isOutdated) {
        return "rgba(249, 115, 22, 0.3)";
      } else if (props.$hasHistory) {
        return "rgba(59, 130, 246, 0.3)";
      } else {
        return "rgba(100, 116, 139, 0.2)";
      }
    }};

  &:hover {
    ${(props) =>
      props.$hasHistory &&
      `
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      background: ${
        props.$isOutdated
          ? "rgba(249, 115, 22, 0.25)"
          : "rgba(59, 130, 246, 0.25)"
      };
    `}
  }

  &:active {
    ${(props) =>
      props.$hasHistory &&
      `
      transform: scale(0.98);
    `}
  }
`;

const VersionText = styled.span`
  letter-spacing: 0.3px;
`;

const HistoryIndicator = styled.span`
  margin-left: 4px;
  font-size: 9px;
  opacity: 0.8;
`;

const Tooltip = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  padding: 10px 12px;
  background: ${OS_LEGAL_COLORS.textPrimary};
  color: ${OS_LEGAL_COLORS.surfaceLight};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  pointer-events: none;
  white-space: normal;
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const TooltipLine = styled.div`
  color: ${OS_LEGAL_COLORS.borderHover};
`;

export interface VersionBadgeProps {
  versionNumber: number;
  hasHistory: boolean;
  isLatest: boolean;
  versionCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Version Badge Component
 *
 * Displays version information on document cards with visual states:
 * - Gray: No version history (v1 only)
 * - Blue: Has history and is latest version
 * - Orange: Has history but is NOT the latest version
 *
 * Clicking the badge (when hasHistory=true) opens the version history panel.
 */
export const VersionBadge: React.FC<VersionBadgeProps> = ({
  versionNumber,
  hasHistory,
  isLatest,
  versionCount = 1,
  onClick,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOutdated = hasHistory && !isLatest;

  const handleClick = (e: React.MouseEvent) => {
    if (hasHistory && onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (hasHistory && onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const showTooltip = isHovered && hasHistory;

  return (
    <BadgeWrapper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BadgeContainer
        $hasHistory={hasHistory}
        $isOutdated={isOutdated}
        onClick={handleClick}
        className={className}
        role={hasHistory ? "button" : undefined}
        aria-label={`Version ${versionNumber}${
          hasHistory ? `, click to view history` : ""
        }`}
        tabIndex={hasHistory ? 0 : undefined}
        onKeyDown={hasHistory ? handleKeyDown : undefined}
      >
        <VersionText>v{versionNumber}</VersionText>
        {hasHistory && (
          <HistoryIndicator>&#8226; {versionCount}</HistoryIndicator>
        )}
      </BadgeContainer>
      {showTooltip && (
        <Tooltip>
          {isOutdated ? (
            <>
              <TooltipTitle>Outdated Version</TooltipTitle>
              <TooltipLine>
                A newer version is available (you are viewing v{versionNumber}{" "}
                of {versionCount})
              </TooltipLine>
            </>
          ) : (
            <>
              <TooltipTitle>Version Information</TooltipTitle>
              <TooltipLine>Current: v{versionNumber}</TooltipLine>
              <TooltipLine>Total versions: {versionCount}</TooltipLine>
              <TooltipLine>Click to view version history</TooltipLine>
            </>
          )}
        </Tooltip>
      )}
    </BadgeWrapper>
  );
};

export default VersionBadge;

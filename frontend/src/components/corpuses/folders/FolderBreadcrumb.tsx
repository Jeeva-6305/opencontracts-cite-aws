import React, { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";
import { ChevronRight, Home } from "lucide-react";
import {
  folderBreadcrumbAtom,
  selectAndExpandFolderAtom,
  selectedFolderIdAtom,
} from "../../../atoms/folderAtoms";
import {
  OS_LEGAL_COLORS,
  OS_LEGAL_SPACING,
} from "../../../assets/configurations/osLegalStyles";

/**
 * FolderBreadcrumb - Navigation breadcrumb showing path from root to current folder
 *
 * Features:
 * - Shows Home icon > "Documents" > Folder1 > Folder2 > ...
 * - Clickable segments to navigate up hierarchy
 * - Compact display with ellipsis for deep nesting
 * - Highlights current folder
 *
 * Props:
 * - maxDepth: Maximum folders to show before ellipsis (default: 5)
 * - onFolderSelect: Optional callback when breadcrumb item clicked
 */

interface FolderBreadcrumbProps {
  maxDepth?: number;
  onFolderSelect?: (folderId: string | null) => void;
}

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  min-width: 0;

  /* Custom scrollbar for horizontal overflow */
  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${OS_LEGAL_COLORS.borderHover};
    border-radius: 3px;

    &:hover {
      background: ${OS_LEGAL_COLORS.textMuted};
    }
  }
`;

const BreadcrumbItem = styled.button<{ $isLast: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
  font-size: 14px;
  font-weight: ${(props) => (props.$isLast ? "500" : "400")};
  color: ${(props) =>
    props.$isLast
      ? OS_LEGAL_COLORS.textPrimary
      : OS_LEGAL_COLORS.textSecondary};
  cursor: ${(props) => (props.$isLast ? "default" : "pointer")};
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$isLast ? "transparent" : OS_LEGAL_COLORS.surfaceHover};
    color: ${(props) =>
      props.$isLast
        ? OS_LEGAL_COLORS.textPrimary
        : OS_LEGAL_COLORS.textPrimary};
  }
`;

const BreadcrumbSeparator = styled.div`
  display: flex;
  align-items: center;
  color: ${OS_LEGAL_COLORS.borderHover};
  font-size: 12px;
`;

const Ellipsis = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 6px;
  color: ${OS_LEGAL_COLORS.textMuted};
  font-size: 14px;
  user-select: none;
`;

const HomeIcon = styled(Home)`
  flex-shrink: 0;
  color: ${OS_LEGAL_COLORS.textSecondary};
`;

const EmptyState = styled.div`
  color: ${OS_LEGAL_COLORS.textMuted};
  font-size: 14px;
  font-style: italic;
`;

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  maxDepth = 5,
  onFolderSelect,
}) => {
  const breadcrumbPath = useAtomValue(folderBreadcrumbAtom);
  const selectedFolderId = useAtomValue(selectedFolderIdAtom);
  const selectAndExpand = useSetAtom(selectAndExpandFolderAtom);

  const handleBreadcrumbClick = useCallback(
    (folderId: string | null) => {
      if (onFolderSelect) {
        onFolderSelect(folderId);
      } else {
        if (folderId) {
          selectAndExpand(folderId);
        } else {
          selectAndExpand(null);
        }
      }
    },
    [onFolderSelect, selectAndExpand]
  );

  // If no folder selected, show just root
  if (!selectedFolderId) {
    return (
      <BreadcrumbContainer>
        <BreadcrumbItem
          $isLast={true}
          onClick={() => handleBreadcrumbClick(null)}
        >
          <HomeIcon size={16} />
          Documents
        </BreadcrumbItem>
      </BreadcrumbContainer>
    );
  }

  // If breadcrumb is empty but folder is selected, show loading state
  if (breadcrumbPath.length === 0) {
    return (
      <BreadcrumbContainer>
        <EmptyState>Loading path...</EmptyState>
      </BreadcrumbContainer>
    );
  }

  // Determine if we need to show ellipsis
  const needsEllipsis = breadcrumbPath.length > maxDepth;
  const visiblePath = needsEllipsis
    ? [
        breadcrumbPath[0], // Always show first folder
        ...breadcrumbPath.slice(-(maxDepth - 1)), // Show last N-1 folders
      ]
    : breadcrumbPath;

  return (
    <BreadcrumbContainer>
      {/* Documents Root */}
      <BreadcrumbItem
        $isLast={false}
        onClick={() => handleBreadcrumbClick(null)}
      >
        <HomeIcon size={16} />
        Documents
      </BreadcrumbItem>

      <BreadcrumbSeparator>
        <ChevronRight size={14} />
      </BreadcrumbSeparator>

      {/* Show first folder */}
      {needsEllipsis && (
        <>
          <BreadcrumbItem
            $isLast={false}
            onClick={() => handleBreadcrumbClick(visiblePath[0].id)}
            title={visiblePath[0].path}
          >
            {visiblePath[0].name}
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight size={14} />
          </BreadcrumbSeparator>

          {/* Ellipsis */}
          <Ellipsis
            title={`${breadcrumbPath.length - maxDepth + 1} folders hidden`}
          >
            ...
          </Ellipsis>

          <BreadcrumbSeparator>
            <ChevronRight size={14} />
          </BreadcrumbSeparator>
        </>
      )}

      {/* Show visible folders */}
      {(needsEllipsis ? visiblePath.slice(1) : visiblePath).map(
        (folder, index, arr) => {
          const isLast = index === arr.length - 1;

          return (
            <React.Fragment key={folder.id}>
              <BreadcrumbItem
                $isLast={isLast}
                onClick={() => !isLast && handleBreadcrumbClick(folder.id)}
                title={folder.path}
              >
                {folder.name}
              </BreadcrumbItem>

              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight size={14} />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        }
      )}
    </BreadcrumbContainer>
  );
};

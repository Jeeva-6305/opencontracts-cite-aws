import React, { useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Folder, FileText, MoreVertical } from "lucide-react";
import { useSetAtom } from "jotai";
import { useDroppable } from "@dnd-kit/core";
import {
  openEditFolderModalAtom,
  openDeleteFolderModalAtom,
  openCreateFolderModalAtom,
} from "../../../atoms/folderAtoms";
import { FolderTreeNode } from "../../../graphql/queries/folders";
import {
  OS_LEGAL_COLORS,
  OS_LEGAL_SPACING,
  OS_LEGAL_SHADOWS,
} from "../../../assets/configurations/osLegalStyles";

/**
 * FolderCard - Card view component for folders in document grid
 *
 * Features:
 * - Displays folder info (name, document count, icon)
 * - Click to navigate into folder
 * - Context menu (right-click) for folder actions
 * - Droppable - accepts documents and folders
 * - Responsive card design matching ModernDocumentItem
 */

interface FolderCardProps {
  folder: FolderTreeNode;
  viewMode?: "modern-card" | "modern-list";
  onFolderSelect?: (folderId: string) => void;
}

// ===============================================
// CARD VIEW (Desktop)
// ===============================================
const CardContainer = styled.div<{ $isDropTarget: boolean }>`
  position: relative;
  background: ${OS_LEGAL_COLORS.surface};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 200px;
  display: flex;
  flex-direction: column;
  box-shadow: ${OS_LEGAL_SHADOWS.card};
  background-color: ${(props) =>
    props.$isDropTarget
      ? OS_LEGAL_COLORS.dropTargetBg
      : OS_LEGAL_COLORS.surface};
  border-color: ${(props) =>
    props.$isDropTarget
      ? OS_LEGAL_COLORS.dropTargetBorder
      : OS_LEGAL_COLORS.border};

  &:hover {
    border-color: ${(props) =>
      props.$isDropTarget
        ? "rgba(34, 197, 94, 0.5)"
        : OS_LEGAL_COLORS.borderHover};
    box-shadow: ${OS_LEGAL_SHADOWS.cardHover};
    transform: translateY(-2px);

    .action-button {
      opacity: 1;
    }
  }
`;

const CardPreview = styled.div`
  position: relative;
  height: 90px;
  background: ${OS_LEGAL_COLORS.folderIconBg};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const FolderIconWrapper = styled.div`
  color: ${OS_LEGAL_COLORS.folderIcon};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardContent = styled.div`
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
`;

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
`;

const CardStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  font-size: 12px;
  color: ${OS_LEGAL_COLORS.textSecondary};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: ${OS_LEGAL_COLORS.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;

  &:hover {
    background: ${OS_LEGAL_COLORS.surface};
    color: ${OS_LEGAL_COLORS.textPrimary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }
`;

// ===============================================
// LIST VIEW (Mobile & Dense)
// ===============================================
const ListContainer = styled.div<{ $isDropTarget: boolean }>`
  position: relative;
  background: ${OS_LEGAL_COLORS.surface};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  background-color: ${(props) =>
    props.$isDropTarget
      ? OS_LEGAL_COLORS.dropTargetBg
      : OS_LEGAL_COLORS.surface};
  border-color: ${(props) =>
    props.$isDropTarget
      ? OS_LEGAL_COLORS.dropTargetBorder
      : OS_LEGAL_COLORS.border};

  &:hover {
    border-color: ${(props) =>
      props.$isDropTarget
        ? "rgba(34, 197, 94, 0.5)"
        : OS_LEGAL_COLORS.borderHover};
    background-color: ${(props) =>
      props.$isDropTarget
        ? "rgba(34, 197, 94, 0.08)"
        : OS_LEGAL_COLORS.surfaceHover};

    .action-button {
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    padding: 10px 12px;
    gap: 10px;
  }
`;

const ListIconWrapper = styled.div`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
  background: ${OS_LEGAL_COLORS.folderIconBg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${OS_LEGAL_COLORS.folderIcon};

  @media (max-width: 640px) {
    width: 40px;
    height: 40px;
  }
`;

const ListContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ListTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    font-size: 13px;
  }
`;

const ListStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: ${OS_LEGAL_COLORS.textSecondary};

  @media (max-width: 640px) {
    font-size: 11px;
    gap: 8px;
  }
`;

const ListActionButton = styled(ActionButton)`
  position: relative;
  top: auto;
  right: auto;
  opacity: 0.7;

  @media (max-width: 640px) {
    width: 32px;
    height: 32px;
  }
`;

// ===============================================
// CONTEXT MENU
// ===============================================
const ContextMenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
`;

const ContextMenu = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${(props) => props.$y}px;
  left: ${(props) => props.$x}px;
  background: ${OS_LEGAL_COLORS.surface};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
  box-shadow: ${OS_LEGAL_SHADOWS.cardHover};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  padding: 4px;
  min-width: 180px;
  max-width: calc(100vw - 16px);
  z-index: 1000;
`;

const ContextMenuItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: ${OS_LEGAL_COLORS.textPrimary};
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background-color: ${OS_LEGAL_COLORS.surfaceHover};
    color: ${OS_LEGAL_COLORS.textPrimary};
  }

  &:active {
    background-color: ${OS_LEGAL_COLORS.border};
  }

  &.danger {
    color: ${OS_LEGAL_COLORS.danger};

    &:hover {
      background-color: ${OS_LEGAL_COLORS.dangerLight};
      color: ${OS_LEGAL_COLORS.dangerHover};
    }
  }
`;

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  viewMode = "modern-card",
  onFolderSelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openEditModal = useSetAtom(openEditFolderModalAtom);
  const openDeleteModal = useSetAtom(openDeleteFolderModalAtom);
  const openCreateModal = useSetAtom(openCreateFolderModalAtom);

  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Adjust context menu position if it would go off screen
  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const rect = contextMenuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 8;

      let adjustedX = contextMenu.x;
      let adjustedY = contextMenu.y;

      // Adjust horizontal position - check both left and right edges
      if (rect.right > viewportWidth - margin) {
        adjustedX = viewportWidth - rect.width - margin;
      }
      if (adjustedX < margin) {
        adjustedX = margin;
      }

      // Adjust vertical position - check both top and bottom edges
      if (rect.bottom > viewportHeight - margin) {
        adjustedY = viewportHeight - rect.height - margin;
      }
      if (adjustedY < margin) {
        adjustedY = margin;
      }

      if (adjustedX !== contextMenu.x || adjustedY !== contextMenu.y) {
        contextMenuRef.current.style.left = `${adjustedX}px`;
        contextMenuRef.current.style.top = `${adjustedY}px`;
      }
    }
  }, [contextMenu]);

  // Droppable setup (folder can accept documents and folders)
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-card-${folder.id}`,
    data: {
      type: "folder",
      folderId: folder.id,
    },
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger if clicking action button
      if ((e.target as HTMLElement).closest(".action-button")) {
        return;
      }

      if (onFolderSelect) {
        onFolderSelect(folder.id);
      } else {
        // Update URL to navigate into folder
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("folder", folder.id);
        navigate({ search: `?${searchParams.toString()}` }, { replace: true });
      }
    },
    [folder.id, onFolderSelect, navigate, location.search]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openEditModal(folder.id);
      closeContextMenu();
    },
    [folder.id, openEditModal, closeContextMenu]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openDeleteModal(folder.id);
      closeContextMenu();
    },
    [folder.id, openDeleteModal, closeContextMenu]
  );

  const handleCreateSubfolder = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openCreateModal(folder.id);
      closeContextMenu();
    },
    [folder.id, openCreateModal, closeContextMenu]
  );

  const handleActionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // descendantDocumentCount already includes documents in this folder (include_self=True)
  const totalDocs = folder.descendantDocumentCount;
  const subfolderCount = folder.children?.length || 0;

  if (viewMode === "modern-list") {
    return (
      <>
        <ListContainer
          ref={setNodeRef}
          $isDropTarget={isOver}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <ListIconWrapper>
            <Folder size={24} />
          </ListIconWrapper>

          <ListContent>
            <ListTitle>{folder.name}</ListTitle>
            <ListStats>
              <Stat>
                <FileText size={12} />
                {totalDocs} {totalDocs === 1 ? "doc" : "docs"}
              </Stat>
              {subfolderCount > 0 && (
                <Stat>
                  <Folder size={12} />
                  {subfolderCount} {subfolderCount === 1 ? "folder" : "folders"}
                </Stat>
              )}
            </ListStats>
          </ListContent>

          <ListActionButton
            className="action-button"
            onClick={handleActionClick}
          >
            <MoreVertical size={16} />
          </ListActionButton>
        </ListContainer>

        {/* Context menu */}
        {contextMenu && (
          <>
            <ContextMenuOverlay onClick={closeContextMenu} />
            <ContextMenu
              ref={contextMenuRef}
              $x={contextMenu.x}
              $y={contextMenu.y}
            >
              <ContextMenuItem onClick={handleClick}>
                Open Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCreateSubfolder}>
                Create Subfolder
              </ContextMenuItem>
              <ContextMenuItem onClick={handleEdit}>
                Edit Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDelete} className="danger">
                Delete Folder
              </ContextMenuItem>
            </ContextMenu>
          </>
        )}
      </>
    );
  }

  // Card view (default)
  return (
    <>
      <CardContainer
        ref={setNodeRef}
        $isDropTarget={isOver}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <CardPreview>
          <FolderIconWrapper>
            <Folder size={48} />
          </FolderIconWrapper>
        </CardPreview>

        <CardContent>
          <CardTitle>{folder.name}</CardTitle>

          <CardStats>
            <Stat>
              <FileText size={12} />
              {totalDocs}
            </Stat>
            {subfolderCount > 0 && (
              <Stat>
                <Folder size={12} />
                {subfolderCount}
              </Stat>
            )}
          </CardStats>
        </CardContent>

        <ActionButton className="action-button" onClick={handleActionClick}>
          <MoreVertical size={16} />
        </ActionButton>
      </CardContainer>

      {/* Context menu */}
      {contextMenu && (
        <>
          <ContextMenuOverlay onClick={closeContextMenu} />
          <ContextMenu
            ref={contextMenuRef}
            $x={contextMenu.x}
            $y={contextMenu.y}
          >
            <ContextMenuItem onClick={handleClick}>Open Folder</ContextMenuItem>
            <ContextMenuItem onClick={handleCreateSubfolder}>
              Create Subfolder
            </ContextMenuItem>
            <ContextMenuItem onClick={handleEdit}>Edit Folder</ContextMenuItem>
            <ContextMenuItem onClick={handleDelete} className="danger">
              Delete Folder
            </ContextMenuItem>
          </ContextMenu>
        </>
      )}
    </>
  );
};

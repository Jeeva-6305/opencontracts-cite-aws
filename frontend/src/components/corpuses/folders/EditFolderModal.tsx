import React, { useCallback, useState, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useMutation } from "@apollo/client";
import styled from "styled-components";
import { X } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalHeader as OcModalHeader,
  ModalBody,
  ModalFooter,
} from "@os-legal/ui";
import {
  showEditFolderModalAtom,
  activeFolderModalIdAtom,
  folderListAtom,
  folderMapAtom,
  closeAllFolderModalsAtom,
  folderCorpusIdAtom,
} from "../../../atoms/folderAtoms";
import {
  UPDATE_CORPUS_FOLDER,
  UpdateCorpusFolderInputs,
  UpdateCorpusFolderOutputs,
  GET_CORPUS_FOLDERS,
  parseCorpusFolderTags,
} from "../../../graphql/queries/folders";
import { ErrorMessage } from "../../widgets/feedback";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

/**
 * EditFolderModal - Modal for editing existing folders
 *
 * Features:
 * - Pre-populate form with current folder data
 * - Update name, description, color, icon, tags
 * - Form validation (no duplicate names at same level)
 * - Optimistic update + refetch
 */

const StyledModalWrapper = styled.div`
  .oc-modal {
    max-width: 500px;
    width: 100%;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: ${OS_LEGAL_COLORS.textSecondary};
  transition: all 0.15s ease;

  &:hover {
    background: ${OS_LEGAL_COLORS.border};
    color: ${OS_LEGAL_COLORS.textPrimary};
  }
`;

const ColorPickerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`;

const ColorPreview = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: ${(props) => props.$color};
  border: 2px solid ${OS_LEGAL_COLORS.border};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.05);
    border-color: ${OS_LEGAL_COLORS.borderHover};
  }
`;

const ColorInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${OS_LEGAL_COLORS.borderHover};
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;

  &:focus {
    outline: none;
    border-color: ${OS_LEGAL_COLORS.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const EditFolderModal: React.FC = () => {
  const showModal = useAtomValue(showEditFolderModalAtom);
  const folderId = useAtomValue(activeFolderModalIdAtom);
  const folderMap = useAtomValue(folderMapAtom);
  const folderList = useAtomValue(folderListAtom);
  const corpusId = useAtomValue(folderCorpusIdAtom);
  const setFolderList = useSetAtom(folderListAtom);
  const closeAllModals = useSetAtom(closeAllFolderModalsAtom);

  const folder = folderId ? folderMap.get(folderId) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#05313d");
  const [icon, setIcon] = useState("folder");
  const [tags, setTags] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-populate form when folder ID changes (not on every render)
  useEffect(() => {
    if (folder) {
      const parsedFolder = parseCorpusFolderTags(folder);
      setName(parsedFolder.name);
      setDescription(parsedFolder.description || "");
      setColor(parsedFolder.color || "#05313d");
      setIcon(parsedFolder.icon || "folder");
      setTags(parsedFolder.tags.join(", "));
      setValidationError(null);
    }
  }, [folderId, folder]);

  const [updateFolder, { loading, error }] = useMutation<
    UpdateCorpusFolderOutputs,
    UpdateCorpusFolderInputs
  >(UPDATE_CORPUS_FOLDER, {
    onCompleted: (data) => {
      // Update local cache
      const updatedFolder = data.updateCorpusFolder.folder;
      if (updatedFolder) {
        setFolderList(
          folderList.map((f) => (f.id === updatedFolder.id ? updatedFolder : f))
        );
      }

      // Close modal
      handleClose();
    },
    refetchQueries: corpusId
      ? [
          {
            query: GET_CORPUS_FOLDERS,
            variables: { corpusId },
          },
        ]
      : [],
  });

  const handleClose = useCallback(() => {
    closeAllModals();
  }, [closeAllModals]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!folder) return;

      // Validation
      if (!name.trim()) {
        setValidationError("Folder name is required");
        return;
      }

      if (name.length > 255) {
        setValidationError("Folder name must be 255 characters or less");
        return;
      }

      // Check for duplicate name at same level (excluding current folder)
      const siblings = folder.parent
        ? folderList.filter(
            (f) => f.parent?.id === folder.parent?.id && f.id !== folder.id
          )
        : folderList.filter((f) => !f.parent && f.id !== folder.id);

      if (siblings.some((f) => f.name === name.trim())) {
        setValidationError(
          `A folder named "${name.trim()}" already exists at this level`
        );
        return;
      }

      setValidationError(null);

      // Parse tags
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      updateFolder({
        variables: {
          folderId: folder.id,
          name: name.trim(),
          description: description.trim(),
          color,
          icon,
          tags: parsedTags,
        },
      });
    },
    [name, description, color, icon, tags, folder, folderList, updateFolder]
  );

  if (!showModal || !folder) return null;

  return (
    <StyledModalWrapper>
      <Modal open={showModal} onClose={handleClose} size="sm">
        <OcModalHeader title="Edit Folder" onClose={handleClose} />

        <ModalBody>
          <div style={{ marginBottom: "1rem" }}>
            <label>Folder Name</label>
            <Input
              fullWidth
              placeholder="Enter folder name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              autoFocus
              maxLength={255}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Description</label>
            <Textarea
              fullWidth
              placeholder="Optional description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={3}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Color</label>
            <ColorPickerWrapper>
              <ColorPreview
                $color={color}
                onClick={() =>
                  document.getElementById("edit-color-picker")?.click()
                }
                title="Click to open color picker"
              />
              <input
                id="edit-color-picker"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ display: "none" }}
              />
              <ColorInput
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#05313d"
                maxLength={7}
              />
            </ColorPickerWrapper>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Icon</label>
            <Input
              fullWidth
              placeholder="folder"
              value={icon}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setIcon(e.target.value)
              }
              maxLength={50}
            />
            <div
              style={{
                fontSize: "12px",
                color: OS_LEGAL_COLORS.textSecondary,
                marginTop: "4px",
              }}
            >
              Use Lucide React icon names (e.g., folder, file-text, star)
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Tags</label>
            <Input
              fullWidth
              placeholder="tag1, tag2, tag3"
              value={tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTags(e.target.value)
              }
            />
            <div
              style={{
                fontSize: "12px",
                color: OS_LEGAL_COLORS.textSecondary,
                marginTop: "4px",
              }}
            >
              Comma-separated tags for organization
            </div>
          </div>

          {validationError && (
            <ErrorMessage title="Validation Error">
              {validationError}
            </ErrorMessage>
          )}

          {error && (
            <ErrorMessage title="Error Updating Folder">
              {error.message}
            </ErrorMessage>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={loading || !name.trim()}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </StyledModalWrapper>
  );
};

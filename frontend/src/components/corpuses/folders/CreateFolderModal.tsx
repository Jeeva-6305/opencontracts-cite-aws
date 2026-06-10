import React, { useCallback, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
  showCreateFolderModalAtom,
  createFolderParentIdAtom,
  folderCorpusIdAtom,
  folderListAtom,
  closeAllFolderModalsAtom,
  selectAndExpandFolderAtom,
} from "../../../atoms/folderAtoms";
import {
  CREATE_CORPUS_FOLDER,
  CreateCorpusFolderInputs,
  CreateCorpusFolderOutputs,
  GET_CORPUS_FOLDERS,
} from "../../../graphql/queries/folders";
import { ErrorMessage, InfoMessage } from "../../widgets/feedback";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

/**
 * CreateFolderModal - Modal for creating new folders
 *
 * Features:
 * - Create at root level (parentId = null) or under selected folder
 * - Form validation
 * - Color picker for folder color
 * - Icon selector
 * - Tag management
 * - Optimistic update + refetch
 * - Auto-select and expand newly created folder
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

export const CreateFolderModal: React.FC = () => {
  const [showModal, setShowModal] = useAtom(showCreateFolderModalAtom);
  const parentId = useAtomValue(createFolderParentIdAtom);
  const corpusId = useAtomValue(folderCorpusIdAtom);
  const folderList = useAtomValue(folderListAtom);
  const setFolderList = useSetAtom(folderListAtom);
  const closeAllModals = useSetAtom(closeAllFolderModalsAtom);
  const selectAndExpand = useSetAtom(selectAndExpandFolderAtom);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#05313d");
  const [icon, setIcon] = useState("folder");
  const [tags, setTags] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [createFolder, { loading, error }] = useMutation<
    CreateCorpusFolderOutputs,
    CreateCorpusFolderInputs
  >(CREATE_CORPUS_FOLDER, {
    onCompleted: (data) => {
      // Update local cache
      const newFolder = data.createCorpusFolder.folder;
      if (newFolder) {
        setFolderList([...folderList, newFolder]);

        // Select and expand the new folder
        selectAndExpand(newFolder.id);
      }

      // Close modal and reset form
      handleClose();
    },
    refetchQueries: [
      {
        query: GET_CORPUS_FOLDERS,
        variables: { corpusId },
      },
    ],
  });

  const handleClose = useCallback(() => {
    setName("");
    setDescription("");
    setColor("#05313d");
    setIcon("folder");
    setTags("");
    setValidationError(null);
    closeAllModals();
  }, [closeAllModals]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!name.trim()) {
        setValidationError("Folder name is required");
        return;
      }

      if (name.length > 255) {
        setValidationError("Folder name must be 255 characters or less");
        return;
      }

      // Check for duplicate name at same level
      const siblings = parentId
        ? folderList.filter((f) => f.parent?.id === parentId)
        : folderList.filter((f) => !f.parent);

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

      createFolder({
        variables: {
          corpusId: corpusId!,
          name: name.trim(),
          parentId: parentId || undefined,
          description: description.trim(),
          color,
          icon,
          tags: parsedTags,
        },
      });
    },
    [
      name,
      description,
      color,
      icon,
      tags,
      corpusId,
      parentId,
      folderList,
      createFolder,
    ]
  );

  if (!showModal || !corpusId) return null;

  const parentFolder = parentId
    ? folderList.find((f) => f.id === parentId)
    : null;

  return (
    <StyledModalWrapper>
      <Modal open={showModal} onClose={handleClose} size="sm">
        <OcModalHeader title="Create New Folder" onClose={handleClose} />

        <ModalBody>
          {parentFolder && (
            <InfoMessage style={{ marginBottom: "1rem" }}>
              Creating folder inside: <strong>{parentFolder.name}</strong>
            </InfoMessage>
          )}

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
                onClick={() => document.getElementById("color-picker")?.click()}
                title="Click to open color picker"
              />
              <input
                id="color-picker"
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
            <ErrorMessage title="Error Creating Folder">
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
            Create Folder
          </Button>
        </ModalFooter>
      </Modal>
    </StyledModalWrapper>
  );
};

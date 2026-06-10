import React from "react";
import { FileListContainer } from "../UploadModalStyles";
import { FileListItem } from "./FileListItem";
import { FileUploadPackage } from "../hooks/useUploadState";

interface FileListProps {
  files: FileUploadPackage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

/**
 * List of files selected for upload.
 * Displays file items with selection, status, and remove functionality.
 */
export const FileList: React.FC<FileListProps> = ({
  files,
  selectedIndex,
  onSelect,
  onRemove,
  disabled = false,
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <FileListContainer>
      {files.map((pkg, index) => (
        <FileListItem
          key={`${pkg.file.name}-${index}`}
          fileName={pkg.file.name}
          fileSize={pkg.file.size}
          title={pkg.formData.title}
          status={pkg.status}
          selected={selectedIndex === index}
          onClick={() => onSelect(index)}
          onRemove={() => onRemove(index)}
          disabled={disabled}
        />
      ))}
    </FileListContainer>
  );
};

export default FileList;

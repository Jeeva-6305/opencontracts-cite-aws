import React from "react";
import { FileText, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { IconButton } from "@os-legal/ui";
import {
  FileItem,
  FileItemContent,
  FileItemIcon,
  FileItemDetails,
  FileItemActions,
} from "../UploadModalStyles";
import { UploadStatus } from "../hooks/useUploadState";
import { formatFileSize } from "../../../../../utils/files";

interface FileListItemProps {
  fileName: string;
  fileSize: number;
  title?: string;
  status: UploadStatus;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}

/**
 * Individual file item in the upload list.
 * Shows file name, size, status icon, and remove button.
 */
export const FileListItem: React.FC<FileListItemProps> = ({
  fileName,
  fileSize,
  title,
  status,
  selected = false,
  onClick,
  onRemove,
  disabled = false,
}) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle />;
      case "failed":
        return <XCircle />;
      case "uploading":
        return <Loader2 className="oc-spin" />;
      default:
        return <FileText />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "success":
        return "Uploaded successfully";
      case "failed":
        return "Upload failed";
      case "uploading":
        return "Uploading...";
      default:
        return formatFileSize(fileSize);
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      default:
        return "";
    }
  };

  return (
    <FileItem
      $selected={selected}
      $status={status}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <FileItemContent>
        <FileItemIcon $status={status}>{getStatusIcon()}</FileItemIcon>
        <FileItemDetails>
          <div className="file-name">{title || fileName}</div>
          <div className={`file-meta ${getStatusClass()}`}>
            {getStatusText()}
          </div>
        </FileItemDetails>
      </FileItemContent>
      <FileItemActions>
        {status === "pending" && onRemove && (
          <IconButton
            size="sm"
            variant="ghost"
            onClick={handleRemoveClick}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X />
          </IconButton>
        )}
      </FileItemActions>
    </FileItem>
  );
};

export default FileListItem;

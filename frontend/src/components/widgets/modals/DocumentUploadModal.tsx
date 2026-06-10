import React, { useEffect, useState } from "react";
import { useReactiveVar } from "@apollo/client";
import { uploadModalPreloadedFiles } from "../../../graphql/cache";
import { UploadModal } from "./UploadModal";

// Re-export types for backward compatibility
export {
  NOT_STARTED,
  SUCCESS,
  FAILED,
  UPLOADING,
} from "./UploadModal/hooks/useUploadState";

export interface FileDetailsProps {
  title?: string;
  slug?: string;
  description?: string;
}

export interface FileUploadPackageProps {
  file: File;
  formData: FileDetailsProps;
}

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  refetch?: (args?: any) => any | void;
  corpusId?: string | null;
  folderId?: string | null;
}

/**
 * DocumentUploadModal - Thin wrapper around UploadModal for single PDF uploads.
 *
 * This component maintains backward compatibility with existing code that uses
 * the DocumentUploadModal interface and uploadModalPreloadedFiles reactive variable.
 */
export function DocumentUploadModal(props: DocumentUploadModalProps) {
  const { open, onClose, refetch, corpusId, folderId } = props;
  const preloadedFiles = useReactiveVar(uploadModalPreloadedFiles);

  // Convert preloaded files to File[] for the new modal
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open && preloadedFiles.length > 0) {
      // Extract just the File objects from the preloaded packages
      setFiles(preloadedFiles.map((pkg) => pkg.file));
      // Clear the reactive variable
      uploadModalPreloadedFiles([]);
    }
  }, [open, preloadedFiles]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
    }
  }, [open]);

  return (
    <UploadModal
      open={open}
      onClose={onClose}
      corpusId={corpusId}
      folderId={folderId}
      forceMode="single"
      preloadedFiles={files.length > 0 ? files : undefined}
      refetch={refetch}
    />
  );
}

export default DocumentUploadModal;

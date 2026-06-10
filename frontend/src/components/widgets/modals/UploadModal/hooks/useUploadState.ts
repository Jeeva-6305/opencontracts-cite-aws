import { useState, useCallback } from "react";

export type UploadStatus = "pending" | "uploading" | "success" | "failed";

// Status constants for backward compatibility
export const NOT_STARTED = "NOT_STARTED";
export const SUCCESS = "SUCCESS";
export const FAILED = "FAILED";
export const UPLOADING = "UPLOADING";

export interface FileDetails {
  title: string;
  slug: string;
  description: string;
}

export interface FileUploadPackage {
  file: File;
  formData: FileDetails;
  status: UploadStatus;
}

interface UseUploadStateReturn {
  files: FileUploadPackage[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  updateFileDetails: (index: number, formData: Partial<FileDetails>) => void;
  setFileStatus: (index: number, status: UploadStatus) => void;
  setAllFileStatuses: (status: UploadStatus) => void;
  toggleSelectedFile: (index: number) => void;
  reset: () => void;
  hasFiles: boolean;
  allFilesComplete: boolean;
  uploadProgress: number;
}

/**
 * Hook to manage file upload state for the UploadModal.
 * Handles file list, selection, metadata editing, and upload status tracking.
 */
export function useUploadState(): UseUploadStateReturn {
  const [files, setFiles] = useState<FileUploadPackage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const addFiles = useCallback((newFiles: File[]) => {
    const packages: FileUploadPackage[] = newFiles.map((file) => ({
      file,
      formData: {
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        slug: "",
        description: `Content summary for ${file.name}`,
      },
      status: "pending" as UploadStatus,
    }));

    setFiles((prev) => [...prev, ...packages]);
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      // Adjust selected index if needed
      if (selectedIndex >= index) {
        setSelectedIndex((prev) => Math.max(-1, prev - 1));
      }
    },
    [selectedIndex]
  );

  const updateFileDetails = useCallback(
    (index: number, formData: Partial<FileDetails>) => {
      setFiles((prev) =>
        prev.map((pkg, i) =>
          i === index
            ? { ...pkg, formData: { ...pkg.formData, ...formData } }
            : pkg
        )
      );
    },
    []
  );

  const setFileStatus = useCallback((index: number, status: UploadStatus) => {
    setFiles((prev) =>
      prev.map((pkg, i) => (i === index ? { ...pkg, status } : pkg))
    );
  }, []);

  const setAllFileStatuses = useCallback((status: UploadStatus) => {
    setFiles((prev) => prev.map((pkg) => ({ ...pkg, status })));
  }, []);

  const toggleSelectedFile = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? -1 : index));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setSelectedIndex(-1);
  }, []);

  // Computed values
  const hasFiles = files.length > 0;

  const allFilesComplete = files.every(
    (f) => f.status === "success" || f.status === "failed"
  );

  const uploadProgress =
    files.length > 0
      ? (files.filter((f) => f.status === "success" || f.status === "failed")
          .length /
          files.length) *
        100
      : 0;

  return {
    files,
    selectedIndex,
    setSelectedIndex,
    addFiles,
    removeFile,
    updateFileDetails,
    setFileStatus,
    setAllFileStatuses,
    toggleSelectedFile,
    reset,
    hasFiles,
    allFilesComplete,
    uploadProgress,
  };
}

export default useUploadState;

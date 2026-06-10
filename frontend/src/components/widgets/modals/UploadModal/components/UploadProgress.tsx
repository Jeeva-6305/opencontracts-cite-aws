import React from "react";
import { Progress } from "@os-legal/ui";
import styled from "styled-components";
import { FileUploadPackage } from "../hooks/useUploadState";

const ProgressContainer = styled.div`
  margin: var(--oc-spacing-md) 0;

  .progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--oc-spacing-xs);
    font-size: var(--oc-font-size-sm);
  }

  .progress-text {
    color: var(--oc-fg-secondary);
  }

  .progress-count {
    color: var(--oc-fg-tertiary);
    font-weight: 500;
  }
`;

interface UploadProgressProps {
  files: FileUploadPackage[];
}

/**
 * Upload progress bar showing overall progress across all files.
 * Displays number of completed files and percentage.
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({ files }) => {
  const completedCount = files.filter(
    (f) => f.status === "success" || f.status === "failed"
  ).length;
  const successCount = files.filter((f) => f.status === "success").length;
  const totalCount = files.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const allComplete = completedCount === totalCount;
  const hasFailures = files.some((f) => f.status === "failed");

  return (
    <ProgressContainer>
      <div className="progress-label">
        <span className="progress-text">
          {allComplete
            ? hasFailures
              ? "Upload completed with errors"
              : "All files uploaded successfully"
            : "Uploading files..."}
        </span>
        <span className="progress-count">
          {successCount} / {totalCount} completed ({Math.round(percentage)}%)
        </span>
      </div>
      <Progress
        value={percentage}
        variant={allComplete ? "determinate" : "indeterminate"}
        size="md"
      />
    </ProgressContainer>
  );
};

export default UploadProgress;

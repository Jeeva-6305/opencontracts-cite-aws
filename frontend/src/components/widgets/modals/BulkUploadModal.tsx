import React from "react";
import { useReactiveVar } from "@apollo/client";
import { showBulkUploadModal } from "../../../graphql/cache";
import { UploadModal } from "./UploadModal";

/**
 * BulkUploadModal - Thin wrapper around UploadModal for bulk (ZIP) uploads.
 *
 * This component maintains backward compatibility with existing code that uses
 * the showBulkUploadModal reactive variable.
 */
export const BulkUploadModal: React.FC = () => {
  const visible = useReactiveVar(showBulkUploadModal);

  const handleClose = () => {
    showBulkUploadModal(false);
  };

  return <UploadModal open={visible} onClose={handleClose} forceMode="bulk" />;
};

export default BulkUploadModal;

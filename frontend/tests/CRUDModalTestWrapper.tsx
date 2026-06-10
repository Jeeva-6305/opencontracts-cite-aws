import React from "react";
import { CRUDModal } from "../src/components/widgets/CRUD/CRUDModal";
import { DocumentFormFields } from "../src/components/forms/DocumentFormFields";
import { LabelSetFormFields } from "../src/components/forms/LabelSetFormFields";
import { EditMode } from "../src/components/types";

export interface CRUDModalTestWrapperProps {
  open?: boolean;
  mode?: EditMode;
  modelName?: string;
  oldInstance?: Record<string, any>;
  onSubmit?: (data: any) => void;
  onClose?: () => void;
  loading?: boolean;
  /** Which form to render: "document" or "labelset" */
  formType?: "document" | "labelset";
  /** Optional validation function returning error messages */
  validateTitle?: boolean;
}

const noop = () => {};

export const CRUDModalTestWrapper: React.FC<CRUDModalTestWrapperProps> = ({
  open = true,
  mode = "CREATE",
  modelName = "document",
  oldInstance = {},
  onSubmit = noop,
  onClose = noop,
  loading = false,
  formType = "document",
  validateTitle = false,
}) => {
  const renderForm = (
    formData: Record<string, any>,
    onChange: (updates: Record<string, any>) => void,
    disabled: boolean
  ) => {
    if (formType === "labelset") {
      return (
        <LabelSetFormFields
          formData={formData}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }
    return (
      <DocumentFormFields
        formData={formData}
        onChange={onChange}
        disabled={disabled}
      />
    );
  };

  const validate = validateTitle
    ? (formData: Record<string, any>) => {
        const errors: string[] = [];
        if (!formData.title) {
          errors.push("Title is required");
        }
        return errors;
      }
    : undefined;

  return (
    <CRUDModal
      open={open}
      mode={mode}
      modelName={modelName}
      oldInstance={oldInstance}
      onSubmit={onSubmit}
      onClose={onClose}
      loading={loading}
      hasFile={false}
      fileField=""
      fileLabel=""
      fileIsImage={false}
      acceptedFileTypes=""
      renderForm={renderForm}
      validate={validate}
    />
  );
};

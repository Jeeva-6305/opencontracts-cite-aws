import React, { useMemo } from "react";
import { Box } from "lucide-react";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import {
  HorizontallyCenteredDiv,
  VerticallyCenteredDiv,
} from "../../layout/Wrappers";
import { FilePreviewAndUpload } from "../file-controls/FilePreviewAndUpload";
import { CRUDProps } from "../../types";

/**
 * Props for the CRUDWidget component.
 *
 * @template T - The type of the instance being managed.
 */
interface CRUDWidgetProps<T extends Record<string, any>> extends CRUDProps {
  instance: T | Partial<T>;
  showHeader: boolean;
  handleInstanceChange: (updatedInstance: T) => void;
  /** Render prop for form fields. Receives current data, onChange, and disabled flag. */
  renderForm: (
    formData: T,
    onChange: (updates: Partial<T>) => void,
    disabled: boolean
  ) => React.ReactNode;
}

/**
 * CRUDWidget component provides a form interface for creating, viewing, and editing instances.
 * It includes optional file upload functionality and responsive layout adjustments.
 *
 * @template T - The type of the instance being managed.
 * @param {CRUDWidgetProps<T>} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered CRUD widget component.
 */
export const CRUDWidget = <T extends Record<string, any>>({
  mode,
  instance,
  modelName,
  hasFile,
  fileField,
  fileLabel,
  fileIsImage,
  acceptedFileTypes,
  showHeader,
  handleInstanceChange,
  renderForm,
}: CRUDWidgetProps<T>): JSX.Element => {
  const canWrite = mode === "CREATE" || mode === "EDIT";

  const descriptiveName = useMemo(
    () => modelName.charAt(0).toUpperCase() + modelName.slice(1),
    [modelName]
  );

  const headerText = useMemo(() => {
    switch (mode) {
      case "EDIT":
        return `Edit ${descriptiveName}: ${instance.title}`;
      case "VIEW":
        return `View ${descriptiveName}`;
      default:
        return `Create ${descriptiveName}`;
    }
  }, [mode, descriptiveName, instance.title]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      {showHeader && (
        <HorizontallyCenteredDiv>
          <div style={{ marginTop: "1rem", textAlign: "left", width: "100%" }}>
            <h2 style={{ textAlign: "center", margin: 0 }}>
              <Box
                size={24}
                style={{
                  maxWidth: "50px",
                  height: "auto",
                  margin: "0 auto",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              />
              <span style={{ marginLeft: "0.5rem" }}>
                {headerText}
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: OS_LEGAL_COLORS.textSecondary,
                  }}
                >{`Values for: ${descriptiveName}`}</div>
              </span>
            </h2>
          </div>
        </HorizontallyCenteredDiv>
      )}
      <HorizontallyCenteredDiv>
        <VerticallyCenteredDiv>
          <div
            style={{
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(34,36,38,.15)",
              background: OS_LEGAL_COLORS.surface,
            }}
          >
            <div>
              {hasFile && (
                <div style={{ marginBottom: "1rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.35em 0.65em",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      borderRadius: "4px",
                      border: "1px solid rgba(34,36,38,.15)",
                      background: OS_LEGAL_COLORS.gray50,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {fileLabel}
                  </span>
                  <FilePreviewAndUpload
                    readOnly={!canWrite}
                    isImage={fileIsImage}
                    acceptedTypes={acceptedFileTypes}
                    disabled={!canWrite}
                    file={instance?.[fileField] || null}
                    onChange={({ data, filename }) =>
                      handleInstanceChange({
                        ...instance,
                        [fileField]: data,
                        filename,
                      } as T)
                    }
                  />
                </div>
              )}
              {renderForm(
                instance as T,
                (updates) =>
                  handleInstanceChange({ ...instance, ...updates } as T),
                !canWrite
              )}
            </div>
          </div>
        </VerticallyCenteredDiv>
      </HorizontallyCenteredDiv>
    </div>
  );
};

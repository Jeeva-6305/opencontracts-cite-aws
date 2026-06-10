import React, { useRef, useEffect, useState } from "react";
import { Dropdown } from "@os-legal/ui";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@os-legal/ui";
import { MetadataColumn, MetadataDataType } from "../../../types/metadata";
import { validateMetadataValue } from "../../../types/metadata";
import { StyledTextArea as BaseStyledTextArea } from "../../widgets/modals/styled";

interface MetadataCellEditorProps {
  column: MetadataColumn;
  value: any;
  onChange: (value: any) => void;
  onValidationChange?: (isValid: boolean) => void;
  onBlur?: () => void;
  onNavigate?: (direction: "next" | "previous" | "down" | "up") => void;
  error?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
}

const EditorContainer = styled.div`
  width: 100%;
  position: relative;

  textarea {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  /* Direct child validation icon positioning */
  > .validation-icon {
    position: absolute;
    right: 0.5em;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    pointer-events: none;
    /* Ensure visibility for Playwright */
    visibility: visible !important;
    display: inline-block !important;
    opacity: 1 !important;
  }

  /* When we have an input with validation */
  .with-validation input {
    padding-right: 2.5em !important;
  }
`;

const ErrorLabel = styled.span`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  z-index: 1000;
  color: ${OS_LEGAL_COLORS.danger};
  background: #fff6f6;
  border: 1px solid #e0b4b4;
  border-radius: 4px;
  padding: 0.25em 0.5em;

  &::before {
    content: "";
    position: absolute;
    top: -5px;
    left: 10px;
    width: 8px;
    height: 8px;
    background: #fff6f6;
    border-left: 1px solid #e0b4b4;
    border-top: 1px solid #e0b4b4;
    transform: rotate(45deg);
  }
`;

const StyledTextArea = styled(BaseStyledTextArea)`
  min-height: auto;
  font-size: 0.875rem;
  line-height: 1.4;

  &[readOnly] {
    background: ${OS_LEGAL_COLORS.gray50};
    cursor: default;
  }
`;

export const MetadataCellEditor: React.FC<MetadataCellEditorProps> = ({
  column,
  value,
  onChange,
  onBlur,
  onNavigate,
  error,
  autoFocus,
  readOnly,
  onValidationChange,
}) => {
  const inputRef = useRef<any>(null);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const element = inputRef.current;

      // Try to find the actual input element
      let inputElement = element;
      if (element.querySelector) {
        const actualInput = element.querySelector("input, textarea, select");
        if (actualInput) {
          inputElement = actualInput;
        }
      }

      // Safely call focus if it exists
      if (inputElement && typeof inputElement.focus === "function") {
        inputElement.focus();
        if (typeof inputElement.select === "function") {
          inputElement.select();
        }
      }
    }
  }, [autoFocus]);

  useEffect(() => {
    const { valid, message } = validateMetadataValue(value, column);
    setIsValid(valid);
    setValidationMessage(message);
    if (onValidationChange) {
      onValidationChange(valid);
    }
  }, [value, column, onValidationChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      if (onNavigate) {
        onNavigate(e.shiftKey ? "previous" : "next");
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (onNavigate) {
        onNavigate("down");
      }
      return;
    }
    e.stopPropagation();
  };

  const renderValidationIcon = () => {
    if (!onValidationChange) return null; // Only show icons if validation is being tracked
    if (isValid) {
      return (
        <CheckCircle
          size={16}
          color={OS_LEGAL_COLORS.success}
          data-testid="validation-icon-success"
          className="validation-icon"
          style={{ visibility: "visible", opacity: 1 }}
        />
      );
    }
    return (
      <AlertCircle
        size={16}
        color={OS_LEGAL_COLORS.danger}
        data-testid="validation-icon-error"
        className="validation-icon"
        style={{ visibility: "visible", opacity: 1 }}
      />
    );
  };

  const renderEditor = () => {
    const config = column.validationConfig || column.validationRules;

    switch (column.dataType) {
      case MetadataDataType.STRING:
      case MetadataDataType.URL:
      case MetadataDataType.EMAIL:
        if (config?.choices && config.choices.length > 0) {
          if (column.extractIsList) {
            // Multi-select for list fields
            return (
              <Dropdown
                ref={inputRef}
                mode="multiselect"
                searchable="local"
                value={value || []}
                options={config.choices.map((choice: string) => ({
                  value: choice,
                  label: choice,
                }))}
                onChange={(value) => onChange(value)}
                onBlur={onBlur}
                placeholder={`Select ${column.name.toLowerCase()}`}
                fluid
                disabled={readOnly}
              />
            );
          } else {
            // Single select for non-list fields
            return (
              <Dropdown
                ref={inputRef}
                mode="select"
                searchable="local"
                clearable
                value={value || null}
                options={config.choices.map((choice: string) => ({
                  value: choice,
                  label: choice,
                }))}
                onChange={(value) => onChange(value)}
                onBlur={onBlur}
                placeholder={`Select ${column.name.toLowerCase()}`}
                fluid
                disabled={readOnly}
              />
            );
          }
        }
        return (
          <div
            ref={inputRef}
            className={onValidationChange ? "with-validation" : ""}
          >
            <Input
              type={
                column.dataType === MetadataDataType.EMAIL ? "email" : "text"
              }
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder={
                column.helpText || `Enter ${column.name.toLowerCase()}`
              }
              fullWidth
              readOnly={readOnly}
              maxLength={config?.max_length}
            />
          </div>
        );

      case MetadataDataType.TEXT:
        return (
          <StyledTextArea
            ref={inputRef}
            value={value || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChange(e.target.value)
            }
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              column.helpText || `Enter ${column.name.toLowerCase()}`
            }
            rows={2}
            readOnly={readOnly}
          />
        );

      case MetadataDataType.NUMBER:
      case MetadataDataType.INTEGER:
        return (
          <div
            ref={inputRef}
            className={onValidationChange ? "with-validation" : ""}
          >
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value ? parseInt(e.target.value) : null)
              }
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder="0"
              fullWidth
              readOnly={readOnly}
            />
          </div>
        );

      case MetadataDataType.FLOAT:
        return (
          <div
            ref={inputRef}
            className={onValidationChange ? "with-validation" : ""}
          >
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value ? parseFloat(e.target.value) : null)
              }
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              fullWidth
              readOnly={readOnly}
            />
          </div>
        );

      case MetadataDataType.BOOLEAN:
        return (
          <input
            ref={inputRef}
            type="checkbox"
            checked={value || false}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onChange(e.target.checked);
              if (onBlur) setTimeout(onBlur, 100);
            }}
            onKeyDown={handleKeyDown}
            disabled={readOnly}
          />
        );

      case MetadataDataType.DATE:
        return (
          <div
            ref={inputRef}
            className={onValidationChange ? "with-validation" : ""}
          >
            <Input
              type="date"
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              fullWidth
              readOnly={readOnly}
            />
          </div>
        );

      case MetadataDataType.DATETIME:
        return (
          <div
            ref={inputRef}
            className={onValidationChange ? "with-validation" : ""}
          >
            <Input
              type="datetime-local"
              value={value ? value.slice(0, 16) : ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value ? `${e.target.value}:00Z` : null)
              }
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              fullWidth
              readOnly={readOnly}
            />
          </div>
        );

      case MetadataDataType.CHOICE:
        return (
          <Dropdown
            ref={inputRef}
            mode="select"
            searchable="local"
            clearable
            value={value || null}
            options={
              config?.choices?.map((choice: string) => ({
                value: choice,
                label: choice,
              })) || []
            }
            onChange={(value) => onChange(value)}
            onBlur={onBlur}
            placeholder={`Select ${column.name.toLowerCase()}`}
            fluid
            disabled={readOnly}
          />
        );

      case MetadataDataType.MULTI_CHOICE:
        return (
          <Dropdown
            ref={inputRef}
            mode="multiselect"
            searchable="local"
            value={value || []}
            options={
              config?.choices?.map((choice: string) => ({
                value: choice,
                label: choice,
              })) || []
            }
            onChange={(value) => onChange(value)}
            onBlur={onBlur}
            placeholder={`Select ${column.name.toLowerCase()}`}
            fluid
            disabled={readOnly}
          />
        );

      case MetadataDataType.JSON:
        return (
          <div style={{ position: "relative", width: "100%" }}>
            <StyledTextArea
              ref={inputRef}
              value={
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)
              }
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                try {
                  onChange(JSON.parse(e.target.value));
                } catch {
                  onChange(e.target.value); // Keep as string if invalid JSON
                }
              }}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder='{"key": "value"}'
              rows={3}
              style={{
                fontFamily: "monospace",
                fontSize: "0.875rem",
                paddingRight: "2.5em",
              }}
              readOnly={readOnly}
              aria-label="JSON editor"
            />
            <div style={{ position: "absolute", top: "0.5em", right: "0.5em" }}>
              {renderValidationIcon()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const editor = renderEditor();

  // Determine if icon is already rendered within editor (JSON textarea case)
  const iconAlreadyInside = column.dataType === MetadataDataType.JSON;

  return (
    <EditorContainer onClick={(e) => e.stopPropagation()}>
      {editor}
      {!iconAlreadyInside && renderValidationIcon()}
      {!isValid && validationMessage && (
        <ErrorLabel data-testid="validation-error-message">
          {validationMessage}
        </ErrorLabel>
      )}
    </EditorContainer>
  );
};

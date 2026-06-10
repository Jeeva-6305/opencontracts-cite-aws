import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Dropdown,
  Input,
} from "@os-legal/ui";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { Database, Plus, Trash2, Save } from "lucide-react";
import {
  MetadataColumn,
  MetadataDataType,
  getDefaultValueForDataType,
} from "../../../types/metadata";
import { InfoMessage } from "../feedback";
import { StyledTextArea } from "./styled";

interface MetadataColumnModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (column: Partial<MetadataColumn>) => void;
  column?: MetadataColumn | null;
}

const dataTypeOptions = [
  { value: "STRING", label: "Short Text" },
  { value: "TEXT", label: "Long Text" },
  { value: "INTEGER", label: "Whole Number" },
  { value: "FLOAT", label: "Decimal Number" },
  { value: "BOOLEAN", label: "Yes/No" },
  { value: "DATE", label: "Date" },
  { value: "DATETIME", label: "Date & Time" },
  { value: "CHOICE", label: "Single Choice" },
  { value: "MULTI_CHOICE", label: "Multiple Choice" },
  { value: "URL", label: "Web Link" },
  { value: "EMAIL", label: "Email Address" },
  { value: "JSON", label: "JSON Data" },
];

const ValidationSection = styled.div`
  padding: 1rem;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 8px;
  background: ${OS_LEGAL_COLORS.surfaceHover};
`;

const ChoiceInput = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;

  input {
    flex: 1;
    margin-right: 0.5rem;
  }
`;

const ChoiceList = styled.div`
  margin-top: 1rem;
`;

const ErrorChip = styled.span`
  display: inline-block;
  margin-left: 0.5em;
  padding: 0.15em 0.5em;
  font-size: 0.75rem;
  color: ${OS_LEGAL_COLORS.danger};
  background: ${OS_LEGAL_COLORS.dangerSurface};
  border: 1px solid ${OS_LEGAL_COLORS.dangerBorder};
  border-radius: 4px;
`;

export const MetadataColumnModal: React.FC<MetadataColumnModalProps> = ({
  open,
  onClose,
  onSave,
  column,
}) => {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<MetadataDataType>(
    MetadataDataType.STRING
  );
  const [helpText, setHelpText] = useState("");
  const [required, setRequired] = useState(false);
  const [minLength, setMinLength] = useState<number | undefined>();
  const [maxLength, setMaxLength] = useState<number | undefined>();
  const [minValue, setMinValue] = useState<number | undefined>();
  const [maxValue, setMaxValue] = useState<number | undefined>();
  const [regexPattern, setRegexPattern] = useState("");
  const [choices, setChoices] = useState<string[]>([""]);
  const [defaultValue, setDefaultValue] = useState<any>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or column changes
  useEffect(() => {
    if (column) {
      setName(column.name);
      setDataType(column.dataType);
      setHelpText(column.helpText || "");
      setRequired(column.validationConfig?.required || false);
      setMinLength(column.validationConfig?.min_length);
      setMaxLength(column.validationConfig?.max_length);
      setMinValue(column.validationConfig?.min_value);
      setMaxValue(column.validationConfig?.max_value);
      setRegexPattern(column.validationConfig?.regex_pattern || "");
      setChoices(column.validationConfig?.choices || [""]);
      setDefaultValue(column.defaultValue);
    } else {
      // Reset to defaults for new column
      setName("");
      setDataType(MetadataDataType.STRING);
      setHelpText("");
      setRequired(false);
      setMinLength(undefined);
      setMaxLength(undefined);
      setMinValue(undefined);
      setMaxValue(undefined);
      setRegexPattern("");
      setChoices([""]);
      setDefaultValue(undefined);
    }
    setErrors({});
  }, [open, column]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Field name is required";
    }

    if (
      dataType === MetadataDataType.CHOICE ||
      dataType === MetadataDataType.MULTI_CHOICE
    ) {
      const validChoices = choices.filter((c) => c.trim());
      if (validChoices.length < 2) {
        newErrors.choices = "At least 2 choices are required";
      }
    }

    if (regexPattern) {
      try {
        new RegExp(regexPattern);
      } catch {
        newErrors.regex = "Invalid regular expression pattern";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const validationConfig: any = { required };

    // Add type-specific validation
    switch (dataType) {
      case MetadataDataType.STRING:
      case MetadataDataType.TEXT:
        if (minLength !== undefined) validationConfig.min_length = minLength;
        if (maxLength !== undefined) validationConfig.max_length = maxLength;
        if (regexPattern) validationConfig.regex_pattern = regexPattern;
        break;
      case MetadataDataType.INTEGER:
      case MetadataDataType.FLOAT:
        if (minValue !== undefined) validationConfig.min_value = minValue;
        if (maxValue !== undefined) validationConfig.max_value = maxValue;
        break;
      case MetadataDataType.CHOICE:
      case MetadataDataType.MULTI_CHOICE:
        validationConfig.choices = choices.filter((c) => c.trim());
        break;
    }

    onSave({
      name,
      dataType,
      helpText: helpText || undefined,
      validationConfig,
      defaultValue:
        defaultValue !== undefined
          ? defaultValue
          : getDefaultValueForDataType(dataType),
    });
  };

  const addChoice = () => {
    setChoices([...choices, ""]);
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 1) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const renderValidationFields = () => {
    switch (dataType) {
      case MetadataDataType.STRING:
      case MetadataDataType.TEXT:
        return (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <Input
                id="metadata-min-length"
                label="Minimum Length"
                type="number"
                min={0}
                value={minLength !== undefined ? String(minLength) : ""}
                onChange={(e) =>
                  setMinLength(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="No minimum"
              />
              <Input
                id="metadata-max-length"
                label="Maximum Length"
                type="number"
                min={0}
                value={maxLength !== undefined ? String(maxLength) : ""}
                onChange={(e) =>
                  setMaxLength(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="No maximum"
              />
            </div>
            {dataType === MetadataDataType.STRING && (
              <div style={{ marginTop: "1rem" }}>
                <Input
                  id="metadata-pattern"
                  label="Pattern (Regular Expression)"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="e.g., ^[A-Z]{2}-\d{4}$"
                  error={errors.regex}
                />
              </div>
            )}
          </>
        );

      case MetadataDataType.INTEGER:
      case MetadataDataType.FLOAT:
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <Input
              id="metadata-min-value"
              label="Minimum Value"
              type="number"
              step={dataType === MetadataDataType.FLOAT ? "0.01" : "1"}
              value={minValue !== undefined ? String(minValue) : ""}
              onChange={(e) =>
                setMinValue(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="No minimum"
            />
            <Input
              id="metadata-max-value"
              label="Maximum Value"
              type="number"
              step={dataType === MetadataDataType.FLOAT ? "0.01" : "1"}
              value={maxValue !== undefined ? String(maxValue) : ""}
              onChange={(e) =>
                setMaxValue(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="No maximum"
            />
          </div>
        );

      case MetadataDataType.CHOICE:
      case MetadataDataType.MULTI_CHOICE:
        return (
          <div>
            <label>
              <strong>Choices</strong>
              {errors.choices && <ErrorChip>{errors.choices}</ErrorChip>}
            </label>
            <ChoiceList>
              {choices.map((choice, index) => (
                <ChoiceInput key={index}>
                  <Input
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    placeholder={`Choice ${index + 1}`}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={choices.length === 1}
                    onClick={() => removeChoice(index)}
                    leftIcon={<Trash2 size={14} />}
                  >
                    {" "}
                  </Button>
                </ChoiceInput>
              ))}
              <Button size="sm" onClick={addChoice}>
                <Plus size={14} style={{ marginRight: "0.5rem" }} />
                Add Choice
              </Button>
            </ChoiceList>
          </div>
        );

      case MetadataDataType.BOOLEAN:
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              id="metadata-default-value"
              checked={defaultValue || false}
              onChange={(e) => setDefaultValue(e.target.checked)}
            />
            <label htmlFor="metadata-default-value">Default Value</label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Database size={16} />
            {column ? "Edit Metadata Field" : "Create Metadata Field"}
          </span>
        }
        onClose={onClose}
      />
      <ModalBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            id="metadata-field-name"
            label="Field Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Contract Status, Due Date, Priority"
            error={errors.name}
          />

          <div>
            <label
              id="metadata-data-type-label"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: 500,
              }}
            >
              Data Type
            </label>
            <Dropdown
              mode="select"
              fluid
              options={dataTypeOptions}
              value={dataType}
              onChange={(value) => setDataType(value as MetadataDataType)}
              disabled={!!column}
              clearable={false}
              aria-labelledby="metadata-data-type-label"
            />
          </div>

          <div>
            <label
              htmlFor="metadata-help-text"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: 500,
              }}
            >
              Help Text
            </label>
            <StyledTextArea
              id="metadata-help-text"
              value={helpText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setHelpText(e.target.value)
              }
              placeholder="Provide guidance for users filling out this field..."
              rows={2}
            />
          </div>

          <ValidationSection>
            <h4>Validation Rules</h4>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <input
                type="checkbox"
                id="metadata-required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <label htmlFor="metadata-required">Required Field</label>
            </div>

            {renderValidationFields()}
          </ValidationSection>

          {dataType !== MetadataDataType.BOOLEAN &&
            !["CHOICE", "MULTI_CHOICE"].includes(dataType) && (
              <InfoMessage title="Default Value">
                You can set default values for individual documents when editing
                metadata.
              </InfoMessage>
            )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          leftIcon={<Save size={14} />}
        >
          {column ? "Update Field" : "Create Field"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

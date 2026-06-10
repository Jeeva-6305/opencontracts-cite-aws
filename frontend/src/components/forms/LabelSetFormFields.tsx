import React, { useCallback } from "react";
import { Input, Textarea } from "@os-legal/ui";
import { FormField } from "./shared";

interface LabelSetFormFieldsProps {
  formData: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  disabled?: boolean;
}

export const LabelSetFormFields: React.FC<LabelSetFormFieldsProps> = ({
  formData,
  onChange,
  disabled = false,
}) => {
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ title: e.target.value });
    },
    [onChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ description: e.target.value });
    },
    [onChange]
  );

  return (
    <div>
      <FormField>
        <Input
          id="labelset-title"
          label="Title *"
          placeholder="Enter label set title"
          value={formData.title ?? ""}
          onChange={handleTitleChange}
          disabled={disabled}
          fullWidth
        />
      </FormField>

      <FormField>
        <Textarea
          id="labelset-description"
          label="Description *"
          placeholder="Add a description..."
          value={formData.description ?? ""}
          onChange={handleDescriptionChange}
          disabled={disabled}
          fullWidth
          autoResize
          maxRows={6}
        />
      </FormField>
    </div>
  );
};

import React, { useCallback } from "react";
import { Input, Textarea } from "@os-legal/ui";
import { FormField } from "./shared";

interface DocumentFormFieldsProps {
  formData: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  disabled?: boolean;
}

export const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
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

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ slug: e.target.value });
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
          id="document-title"
          label="Title *"
          placeholder="Enter document title"
          value={formData.title ?? ""}
          onChange={handleTitleChange}
          disabled={disabled}
          fullWidth
        />
      </FormField>

      <FormField>
        <Input
          id="document-slug"
          label="Slug"
          placeholder="my-document-slug (auto-generated if blank)"
          value={formData.slug ?? ""}
          onChange={handleSlugChange}
          disabled={disabled}
          helperText="Case-sensitive; allowed characters: A-Z, a-z, 0-9, and hyphen (-). Leave blank to auto-generate."
          fullWidth
        />
      </FormField>

      <FormField>
        <Textarea
          id="document-description"
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

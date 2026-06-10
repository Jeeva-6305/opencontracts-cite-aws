import React, { useCallback } from "react";
import { Input, Textarea } from "@os-legal/ui";
import { Edit3 } from "lucide-react";
import { FormField, EmptyState } from "../UploadModalStyles";
import { FileDetails } from "../hooks/useUploadState";

interface FileDetailsFormProps {
  formData: FileDetails | null;
  onChange: (updates: Partial<FileDetails>) => void;
  disabled?: boolean;
}

/**
 * Form for editing document metadata (title, slug, description).
 * Shows empty state when no file is selected.
 */
export const FileDetailsForm: React.FC<FileDetailsFormProps> = ({
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

  // Show empty state when no file is selected
  if (!formData) {
    return (
      <EmptyState>
        <Edit3 />
        <div className="title">No document selected</div>
        <div className="description">
          Click on a document to edit its details
        </div>
      </EmptyState>
    );
  }

  return (
    <div>
      <FormField>
        <Input
          id="document-title"
          label="Title *"
          placeholder="Enter document title"
          value={formData.title}
          onChange={handleTitleChange}
          disabled={disabled}
          size="lg"
          fullWidth
        />
      </FormField>

      <FormField>
        <Input
          id="document-slug"
          label="Slug"
          placeholder="my-document-slug (auto-generated if blank)"
          value={formData.slug}
          onChange={handleSlugChange}
          disabled={disabled}
          helperText="Optional. Case-sensitive. Allowed: A-Z, a-z, 0-9, hyphen (-)"
          size="lg"
          fullWidth
        />
      </FormField>

      <FormField>
        <Textarea
          id="document-description"
          label="Description *"
          placeholder="Describe what this document is about..."
          value={formData.description}
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

export default FileDetailsForm;

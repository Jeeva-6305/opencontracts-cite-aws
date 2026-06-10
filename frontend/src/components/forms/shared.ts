import styled from "styled-components";

export const FormField = styled.div`
  margin-bottom: var(--oc-spacing-md, 1rem);

  &:last-child {
    margin-bottom: 0;
  }
`;

/** Slug must be A-Z, a-z, 0-9, and hyphen only (matches helper text in DocumentFormFields). */
const SLUG_PATTERN = /^[A-Za-z0-9-]+$/;

/**
 * Validates that title and description are non-empty, and slug (if provided) is well-formed.
 * Stable reference — safe to pass as a prop without busting memoization.
 */
export const validateTitleAndDescription = (
  data: Record<string, any>
): string[] => {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.description?.trim()) errors.push("Description is required");
  if (data.slug?.trim() && !SLUG_PATTERN.test(data.slug.trim())) {
    errors.push("Slug may only contain A-Z, a-z, 0-9, and hyphen (-)");
  }
  return errors;
};

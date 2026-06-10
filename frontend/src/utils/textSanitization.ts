/**
 * Text sanitization utilities for user-generated content
 *
 * Per CLAUDE.md: "User-generated content in JSON fields must be escaped on frontend"
 * These utilities help prevent XSS when displaying user-generated text in mentions,
 * tooltips, and other UI elements.
 */

/**
 * Escape HTML special characters in text to prevent XSS when rendered in markdown
 * or other contexts where HTML might be interpreted.
 *
 * This is particularly important for annotation rawText which comes from user
 * documents and may contain special characters.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text with HTML entities escaped
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Sanitize text for use in tooltips and aria-labels.
 * Normalizes whitespace for clean single-line display.
 *
 * Note: React's title prop provides implicit HTML escaping, but we still
 * normalize whitespace for better readability.
 *
 * @param text - The text to sanitize for tooltip display
 * @returns Sanitized text safe for use in tooltips
 */
export function sanitizeForTooltip(text: string): string {
  return text
    .replace(/\r\n/g, " ") // Replace Windows newlines with spaces
    .replace(/\n/g, " ") // Replace Unix newlines with spaces
    .replace(/\r/g, "") // Remove any remaining carriage returns
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Sanitize text for use in mention labels that will be rendered in markdown.
 * Escapes characters that could break markdown link syntax.
 *
 * For mention labels that will be converted to markdown links, we need to
 * escape brackets and special markdown characters.
 *
 * @param text - The text to sanitize for mention display
 * @returns Sanitized text safe for use in mentions
 */
export function sanitizeForMention(text: string): string {
  // Remove or escape characters that could break markdown link syntax
  // [label](url) - we need to escape [ ] ( ) in the label
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, " ") // Replace newlines with spaces for single-line display
    .replace(/\r/g, ""); // Remove carriage returns
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated.
 * Sanitizes the text before truncating to ensure safe display.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param sanitize - Whether to sanitize for mentions (default: true)
 * @returns Truncated and optionally sanitized text
 */
export function truncateText(
  text: string,
  maxLength: number,
  sanitize: boolean = true
): string {
  const processedText = sanitize ? sanitizeForMention(text) : text;
  if (processedText.length <= maxLength) {
    return processedText;
  }
  return processedText.substring(0, maxLength) + "…";
}

/**
 * Create a preview of annotation text for display in mention chips and pickers.
 * Handles sanitization and truncation in one place for consistency.
 *
 * @param rawText - The raw annotation text (may be null)
 * @param fallbackLabel - Label to use if rawText is not available
 * @param maxLength - Maximum length for truncation
 * @returns Object with displayText (truncated) and fullText (for tooltip)
 */
export function createAnnotationPreview(
  rawText: string | null | undefined,
  fallbackLabel: string,
  maxLength: number
): { displayText: string; tooltipText: string } {
  if (!rawText) {
    return {
      displayText: fallbackLabel,
      tooltipText: fallbackLabel,
    };
  }

  // For display: sanitize for markdown context and truncate
  const sanitizedForDisplay = sanitizeForMention(rawText);
  const displayText =
    sanitizedForDisplay.length > maxLength
      ? sanitizedForDisplay.substring(0, maxLength) + "…"
      : sanitizedForDisplay;

  // For tooltip: just normalize whitespace (React handles HTML escaping)
  const tooltipText = sanitizeForTooltip(rawText);

  return { displayText, tooltipText };
}

import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeForTooltip,
  sanitizeForMention,
  truncateText,
  createAnnotationPreview,
} from "./textSanitization";
import { MENTION_PREVIEW_LENGTH } from "../assets/configurations/constants";

describe("textSanitization", () => {
  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("escapes quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("handles empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("handles text without special characters", () => {
      expect(escapeHtml("plain text")).toBe("plain text");
    });
  });

  describe("sanitizeForTooltip", () => {
    it("normalizes newlines to spaces", () => {
      expect(sanitizeForTooltip("line1\nline2\nline3")).toBe(
        "line1 line2 line3"
      );
    });

    it("handles Windows-style newlines", () => {
      expect(sanitizeForTooltip("line1\r\nline2")).toBe("line1 line2");
    });

    it("collapses multiple spaces", () => {
      expect(sanitizeForTooltip("word1    word2")).toBe("word1 word2");
    });

    it("trims leading/trailing whitespace", () => {
      expect(sanitizeForTooltip("  text  ")).toBe("text");
    });

    it("preserves brackets (unlike sanitizeForMention)", () => {
      expect(sanitizeForTooltip("[Section 1.2]")).toBe("[Section 1.2]");
    });

    it("handles empty string", () => {
      expect(sanitizeForTooltip("")).toBe("");
    });
  });

  describe("sanitizeForMention", () => {
    it("escapes markdown link characters", () => {
      expect(sanitizeForMention("[link](url)")).toBe("\\[link\\]\\(url\\)");
    });

    it("escapes backslashes", () => {
      expect(sanitizeForMention("path\\to\\file")).toBe("path\\\\to\\\\file");
    });

    it("replaces newlines with spaces", () => {
      expect(sanitizeForMention("line1\nline2\nline3")).toBe(
        "line1 line2 line3"
      );
    });

    it("removes carriage returns", () => {
      expect(sanitizeForMention("line1\r\nline2")).toBe("line1 line2");
    });

    it("handles empty string", () => {
      expect(sanitizeForMention("")).toBe("");
    });

    it("handles text without special characters", () => {
      expect(sanitizeForMention("plain text")).toBe("plain text");
    });

    it("handles complex annotation text", () => {
      const input =
        "This clause [Section 1.2] references (see Exhibit A)\nand continues...";
      const expected =
        "This clause \\[Section 1.2\\] references \\(see Exhibit A\\) and continues...";
      expect(sanitizeForMention(input)).toBe(expected);
    });
  });

  describe("truncateText", () => {
    it("truncates text longer than maxLength", () => {
      const longText =
        "This is a very long piece of text that should be truncated";
      const result = truncateText(longText, MENTION_PREVIEW_LENGTH);
      expect(result.length).toBeLessThanOrEqual(MENTION_PREVIEW_LENGTH + 1); // +1 for ellipsis
      expect(result.endsWith("…")).toBe(true);
    });

    it("does not truncate text shorter than maxLength", () => {
      const shortText = "Short text";
      expect(truncateText(shortText, MENTION_PREVIEW_LENGTH)).toBe(shortText);
    });

    it("sanitizes by default", () => {
      const textWithBrackets = "[Test]";
      expect(truncateText(textWithBrackets, 50)).toBe("\\[Test\\]");
    });

    it("can skip sanitization", () => {
      const textWithBrackets = "[Test]";
      expect(truncateText(textWithBrackets, 50, false)).toBe("[Test]");
    });

    it("handles empty string", () => {
      expect(truncateText("", 10)).toBe("");
    });
  });

  describe("createAnnotationPreview", () => {
    it("returns fallback when rawText is null", () => {
      const result = createAnnotationPreview(null, "Fallback Label", 24);
      expect(result.displayText).toBe("Fallback Label");
      expect(result.tooltipText).toBe("Fallback Label");
    });

    it("returns fallback when rawText is undefined", () => {
      const result = createAnnotationPreview(undefined, "Fallback", 24);
      expect(result.displayText).toBe("Fallback");
      expect(result.tooltipText).toBe("Fallback");
    });

    it("truncates long text for display", () => {
      const longText =
        "This is a very long annotation text that exceeds the limit";
      const result = createAnnotationPreview(longText, "Label", 24);
      expect(result.displayText.length).toBeLessThanOrEqual(25); // 24 + ellipsis
      expect(result.displayText.endsWith("…")).toBe(true);
    });

    it("provides full text for tooltip", () => {
      const text = "This is annotation text";
      const result = createAnnotationPreview(text, "Label", 10);
      expect(result.tooltipText).toBe(text);
    });

    it("sanitizes markdown chars in displayText but not tooltipText", () => {
      const text = "[Section 1.2]";
      const result = createAnnotationPreview(text, "Label", 50);
      expect(result.displayText).toBe("\\[Section 1.2\\]");
      expect(result.tooltipText).toBe("[Section 1.2]");
    });

    it("normalizes whitespace in tooltipText", () => {
      const text = "Line 1\nLine 2\n\nLine 3";
      const result = createAnnotationPreview(text, "Label", 100);
      expect(result.tooltipText).toBe("Line 1 Line 2 Line 3");
    });
  });
});

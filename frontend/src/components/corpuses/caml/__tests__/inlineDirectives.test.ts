import { describe, it, expect } from "vitest";
import { extractInlineDirectives } from "../inlineDirectives";

describe("extractInlineDirectives", () => {
  it("returns unchanged content when no directives present", () => {
    const input = "This is plain markdown with no directives.";
    const result = extractInlineDirectives(input);
    expect(result.content).toBe(input);
    expect(result.directives).toEqual([]);
  });

  it("extracts a simple @cite sentence directive", () => {
    const input =
      "Force majeure clauses were updated. {{@cite sentence}} Next sentence.";
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].agent).toBe("cite");
    expect(result.directives[0].scope).toBe("sentence");
    expect(result.directives[0].args).toEqual({});
    expect(result.directives[0].context).toBe(
      "Force majeure clauses were updated."
    );
    // Directive should be stripped from content
    expect(result.content).not.toContain("{{@cite");
  });

  it("extracts a @cite paragraph directive", () => {
    const input = [
      "First paragraph here.",
      "",
      "Second paragraph with multiple sentences. It has details. {{@cite paragraph}}",
      "",
      "Third paragraph.",
    ].join("\n");
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].scope).toBe("paragraph");
    expect(result.directives[0].context).toBe(
      "Second paragraph with multiple sentences. It has details."
    );
  });

  it("extracts a @cite block directive", () => {
    const input = "Line one.\nLine two.\nLine three. {{@cite block}}";
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].scope).toBe("block");
    expect(result.directives[0].context).toContain("Line one.");
    expect(result.directives[0].context).toContain("Line two.");
    expect(result.directives[0].context).toContain("Line three.");
  });

  it("parses key=value arguments", () => {
    const input = "Some text. {{@cite sentence mode=all limit=5}}";
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].args).toEqual({ mode: "all", limit: "5" });
  });

  it("parses quoted arguments", () => {
    const input = 'Some text. {{@cite sentence label="force majeure"}}';
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].args).toEqual({ label: "force majeure" });
  });

  it("handles multiple directives in one block", () => {
    const input = [
      "First claim here. {{@cite sentence}}",
      "",
      "Second claim here. {{@cite sentence mode=all}}",
    ].join("\n");
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(2);
    expect(result.directives[0].context).toBe("First claim here.");
    expect(result.directives[1].context).toBe("Second claim here.");
    expect(result.directives[1].args.mode).toBe("all");
  });

  it("supports non-cite agents", () => {
    const input = "This needs review. {{@review paragraph}}";
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(1);
    expect(result.directives[0].agent).toBe("review");
    expect(result.directives[0].scope).toBe("paragraph");
  });

  it("ignores invalid scopes", () => {
    const input = "Some text. {{@cite invalid}}";
    const result = extractInlineDirectives(input);

    expect(result.directives).toHaveLength(0);
    // Invalid directive left in content since it wasn't matched
    expect(result.content).toContain("{{@cite invalid}}");
  });

  it("strips directives from content cleanly", () => {
    const input = "Before directive. {{@cite sentence}} After directive.";
    const result = extractInlineDirectives(input);

    expect(result.content).toBe("Before directive.  After directive.");
    expect(result.content).not.toContain("{{");
  });

  it("handles directive at end of content", () => {
    const input = "Statement needing citation. {{@cite sentence}}";
    const result = extractInlineDirectives(input);

    expect(result.content).toBe("Statement needing citation.");
    expect(result.directives[0].context).toBe("Statement needing citation.");
  });

  it("preserves offset information", () => {
    const input = "Short. {{@cite sentence}}";
    const result = extractInlineDirectives(input);

    expect(result.directives[0].offset).toBe(7);
  });
});

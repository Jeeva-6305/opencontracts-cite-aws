/**
 * Inline directive extraction for CAML prose blocks.
 *
 * This module implements the `{{@agent scope [key=value]}}` directive syntax.
 * It is designed as a proposed upstream addition to `@os-legal/caml` — the
 * code is framework-agnostic with zero dependencies.
 *
 * UPSTREAM TARGET: packages/caml/src/inlineDirectives.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CamlInlineDirective {
  /** Which agent handles this directive (e.g. "cite", "review") */
  agent: string;
  /** How much surrounding text to use as context */
  scope: "sentence" | "paragraph" | "block";
  /** Optional key=value parameters */
  args: Record<string, string>;
  /** The resolved surrounding text at the requested scope */
  context: string;
  /** Character offset in the original content where the directive appeared */
  offset: number;
}

export interface DirectiveExtractionResult {
  /** Content with all directives stripped out (clean markdown) */
  content: string;
  /** Extracted directives with resolved context */
  directives: CamlInlineDirective[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches `{{@agent scope key=val key2=val2}}` with the global flag. */
const DIRECTIVE_PATTERN_GLOBAL =
  /\{\{@(\w+)\s+(sentence|paragraph|block)(?:\s+([^}]+?))?\}\}/g;

/**
 * Sentence boundary: split on ., !, ? followed by whitespace.
 * NOTE: This lookbehind will incorrectly split on abbreviations like
 * "Mr. Smith" or "et al. in the case" — a known limitation that is
 * difficult to solve without NLP tokenisation. Legal text with heavy
 * abbreviation use may produce degraded context for semantic search.
 */
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

const VALID_SCOPES = new Set(["sentence", "paragraph", "block"]);

// ---------------------------------------------------------------------------
// Scope resolvers
// ---------------------------------------------------------------------------

/**
 * Extract the sentence surrounding position `offset` in `text`.
 *
 * The directive marker (`{{@cite sentence}}`) typically appears *after* the
 * sentence it refers to, so we look for the last sentence that *starts*
 * at or before the offset. If the offset lands exactly on whitespace
 * between sentences, we pick the preceding sentence.
 */
function resolveSentence(text: string, offset: number): string {
  const sentences = text.split(SENTENCE_BOUNDARY);
  let pos = 0;
  let best = sentences[0] ?? text;
  for (const sentence of sentences) {
    // If this sentence starts at or beyond the directive offset, stop —
    // the directive belongs to the previous sentence (directives always
    // follow the text they refer to).
    if (pos >= offset) break;
    best = sentence;
    pos += sentence.length + 1; // +1 for the split whitespace
  }
  return best.trim();
}

/**
 * Extract the paragraph surrounding position `offset` in `text`.
 * Paragraphs are separated by blank lines (two+ consecutive newlines).
 */
function resolveParagraph(text: string, offset: number): string {
  const paragraphs = text.split(/\n\s*\n/);
  let pos = 0;
  let best = paragraphs[0] ?? text;
  for (const para of paragraphs) {
    // Use indexOf for exact position instead of assuming a fixed separator
    // width, since /\n\s*\n/ can match separators of varying length.
    // NOTE: indexOf could match a paragraph as a substring of an earlier one
    // if one is a prefix of the other. This is unlikely in typical legal text
    // and the `pos` offset mitigates most false matches.
    const paraStart = text.indexOf(para, pos);
    if (paraStart < 0 || paraStart >= offset) break;
    best = para;
    pos = paraStart + para.length;
  }
  return best.trim();
}

/**
 * For block scope, return the entire text content.
 */
function resolveBlock(text: string): string {
  return text.trim();
}

function resolveContext(text: string, offset: number, scope: string): string {
  switch (scope) {
    case "sentence":
      return resolveSentence(text, offset);
    case "paragraph":
      return resolveParagraph(text, offset);
    case "block":
      return resolveBlock(text);
    default:
      return resolveSentence(text, offset);
  }
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

/**
 * Parse `key=value key2=value2` into a Record.
 * Values may be quoted: `key="some value"` or unquoted: `key=value`.
 */
function parseArgs(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const args: Record<string, string> = {};
  const argPattern = /(\w+)=(?:"([^"]+)"|(\S+))/g;
  let match: RegExpExecArray | null;
  while ((match = argPattern.exec(raw)) !== null) {
    args[match[1]] = match[2] ?? match[3];
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Extract inline directives from a prose content string.
 *
 * Returns the cleaned content (directives stripped) and an array of
 * extracted directives with their resolved context text.
 *
 * This is a pure function with no side effects.
 *
 * @example
 * ```ts
 * const result = extractInlineDirectives(
 *   "Force majeure clauses were updated. {{@cite sentence}} Next paragraph."
 * );
 * // result.content === "Force majeure clauses were updated.  Next paragraph."
 * // result.directives[0].agent === "cite"
 * // result.directives[0].scope === "sentence"
 * // result.directives[0].context === "Force majeure clauses were updated."
 * ```
 */
export function extractInlineDirectives(
  content: string
): DirectiveExtractionResult {
  const directives: CamlInlineDirective[] = [];

  // First pass: find all directives and their positions in the original text.
  const matches: Array<{
    fullMatch: string;
    agent: string;
    scope: string;
    argsRaw: string | undefined;
    index: number;
  }> = [];

  for (const match of content.matchAll(DIRECTIVE_PATTERN_GLOBAL)) {
    const scope = match[2];
    if (!VALID_SCOPES.has(scope)) continue;
    matches.push({
      fullMatch: match[0],
      agent: match[1],
      scope,
      argsRaw: match[3],
      index: match.index!,
    });
  }

  if (matches.length === 0) {
    return { content, directives: [] };
  }

  // Resolve context for each directive against the ORIGINAL content
  // (before stripping), so sentence/paragraph boundaries are intact.
  for (const m of matches) {
    const context = resolveContext(content, m.index, m.scope);
    // Strip the directive marker from the context itself
    const cleanContext = context.replace(DIRECTIVE_PATTERN_GLOBAL, "").trim();

    directives.push({
      agent: m.agent,
      scope: m.scope as CamlInlineDirective["scope"],
      args: parseArgs(m.argsRaw),
      context: cleanContext,
      offset: m.index,
    });
  }

  // Second pass: strip all directive markers from content
  const cleanedContent = content.replace(DIRECTIVE_PATTERN_GLOBAL, "").trim();

  return { content: cleanedContent, directives };
}

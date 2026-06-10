/**
 * Test fixtures for CamlDirectiveRenderer component tests.
 *
 * Separated from the test wrapper to avoid Playwright CT mount issues.
 */
import type { CamlDocument } from "@os-legal/caml";

/** A CAML document with inline directives in prose blocks. */
export const DOCUMENT_WITH_DIRECTIVES: CamlDocument = {
  frontmatter: {
    version: "1.0",
    hero: {
      title: ["Citation Directive", "{Test}"],
      subtitle: "Testing the directive rendering pipeline.",
    },
  },
  chapters: [
    {
      id: "intro",
      title: "Introduction",
      blocks: [
        {
          type: "prose",
          content:
            "Force majeure clauses were updated post-2020. {{@cite sentence}} This affected 38 of 42 agreements.",
        },
      ],
    },
    {
      id: "analysis",
      title: "Analysis",
      blocks: [
        {
          type: "prose",
          content:
            "First paragraph with important details.\n\nSecond paragraph has the citation reference. {{@cite paragraph mode=all limit=3}}",
        },
      ],
    },
  ],
};

/** A document with duplicate prose blocks to test disambiguation. */
export const DOCUMENT_WITH_DUPLICATES: CamlDocument = {
  frontmatter: {},
  chapters: [
    {
      id: "dup-test",
      title: "Duplicate Content Test",
      blocks: [
        {
          type: "prose",
          content: "Identical content with a directive. {{@cite sentence}}",
        },
        {
          type: "prose",
          content: "Identical content with a directive. {{@cite sentence}}",
        },
      ],
    },
  ],
};

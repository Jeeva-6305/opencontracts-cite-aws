/**
 * Test fixtures for CamlCitationChip component tests.
 *
 * Separated from the test wrapper to avoid Playwright CT mount issues
 * (importing non-component exports from wrapper files can prevent
 * the component transform from working correctly).
 */
import type { ResolvedCitation } from "../src/components/corpuses/caml/CamlCitationChip";

export const MOCK_CITATION: ResolvedCitation = {
  annotationId: "ann-123",
  rawText:
    "Force majeure clauses were updated post-2020 to include pandemic-specific language across all jurisdictions.",
  labelText: "Force Majeure",
  labelColor: "#0f766e",
  documentTitle: "Master Supply Agreement v3.pdf",
  documentSlug: "master-supply-agreement-v3",
  corpusSlug: "supply-chain-analysis",
  similarityScore: 0.91,
  page: 12,
};

export const MOCK_CITATION_NO_LABEL: ResolvedCitation = {
  ...MOCK_CITATION,
  annotationId: "ann-456",
  labelText: "",
  labelColor: "",
};

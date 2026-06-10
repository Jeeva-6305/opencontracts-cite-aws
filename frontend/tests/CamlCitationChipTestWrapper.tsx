/**
 * Test wrapper for CamlCitationChip — pure presentational, no GraphQL.
 *
 * Renders the chip component directly with mock citation data.
 * MemoryRouter is required for the `<Link>` in the popover.
 *
 * NOTE: Mock data is in CamlCitationChipFixtures.ts, not here.
 * Playwright CT's JSX transform can break when non-component exports
 * are imported from the same file as the wrapper component.
 */
import React from "react";
import { MemoryRouter } from "react-router-dom";

import {
  CamlCitationChip,
  CamlCitationError,
  CamlCitationLoading,
} from "../src/components/corpuses/caml/CamlCitationChip";
import type { ResolvedCitation } from "../src/components/corpuses/caml/CamlCitationChip";
import { MOCK_CITATION } from "./CamlCitationChipFixtures";

export interface CamlCitationChipTestWrapperProps {
  variant?: "chip" | "loading" | "error";
  citation?: ResolvedCitation;
  errorMessage?: string;
}

export const CamlCitationChipTestWrapper: React.FC<
  CamlCitationChipTestWrapperProps
> = ({ variant = "chip", citation = MOCK_CITATION, errorMessage }) => {
  return (
    <MemoryRouter>
      <div
        style={{
          padding: "4rem",
          background: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid="citation-chip-test-root"
      >
        {variant === "chip" && <CamlCitationChip citation={citation} />}
        {variant === "loading" && <CamlCitationLoading />}
        {variant === "error" && <CamlCitationError message={errorMessage} />}
      </div>
    </MemoryRouter>
  );
};

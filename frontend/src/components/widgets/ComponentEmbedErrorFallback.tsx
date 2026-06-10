/**
 * Shared fallback UI for embedded CAML component ErrorBoundary wrappers.
 *
 * Used by both `useCamlComponentRenderer` and `CamlDirectiveRenderer` to
 * display a consistent error message when an embedded component fails to
 * render. Uses OS Legal design tokens for styling consistency.
 */
import React from "react";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

interface ComponentEmbedErrorFallbackProps {
  error: Error;
}

export const ComponentEmbedErrorFallback: React.FC<
  ComponentEmbedErrorFallbackProps
> = ({ error }) => (
  <div
    style={{
      padding: "0.75rem 1rem",
      margin: "0.5rem 0",
      borderRadius: "8px",
      border: `1px solid ${OS_LEGAL_COLORS.border}`,
      color: OS_LEGAL_COLORS.textMuted,
      fontSize: "0.8125rem",
    }}
  >
    Embedded component failed to render
    {process.env.NODE_ENV === "development" && <>: {error.message}</>}
  </div>
);

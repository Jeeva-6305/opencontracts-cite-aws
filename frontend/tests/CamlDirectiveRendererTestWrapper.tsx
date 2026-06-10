/**
 * Test wrapper for CamlDirectiveRenderer.
 *
 * Registers a mock handler that renders a simple chip for {{@cite}} directives,
 * allowing us to test the full extraction-to-rendering pipeline without
 * real GraphQL queries.
 *
 * NOTE: Fixture documents are in CamlDirectiveRendererFixtures.ts.
 */
import React, { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import type { CamlDocument } from "@os-legal/caml";

import { CamlDirectiveRenderer } from "../src/components/corpuses/caml/CamlDirectiveRenderer";
import {
  registerDirectiveHandler,
  unregisterDirectiveHandler,
} from "../src/components/corpuses/caml/directiveRegistry";
import type { DirectiveHandlerContext } from "../src/components/corpuses/caml/directiveRegistry";
import type { CamlInlineDirective } from "../src/components/corpuses/caml/inlineDirectives";
import { DOCUMENT_WITH_DIRECTIVES } from "./CamlDirectiveRendererFixtures";

/**
 * A mock handler that renders a simple span for each directive,
 * showing the agent name and the resolved context.
 */
function useMockCiteHandler(
  directive: CamlInlineDirective,
  _context: DirectiveHandlerContext
) {
  return {
    loading: false,
    node: (
      <span
        data-testid={`mock-citation-${directive.offset}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.125rem 0.5rem",
          margin: "0 0.125rem",
          border: "1px solid #0f766e33",
          borderRadius: "9999px",
          background: "#0f766e0d",
          color: "#0f766e",
          fontSize: "0.6875rem",
          fontWeight: 600,
        }}
      >
        @{directive.agent}: {directive.context.slice(0, 50)}
        {directive.context.length > 50 ? "..." : ""}
      </span>
    ),
  };
}

export interface CamlDirectiveRendererTestWrapperProps {
  document?: CamlDocument;
}

export const CamlDirectiveRendererTestWrapper: React.FC<
  CamlDirectiveRendererTestWrapperProps
> = ({ document: doc = DOCUMENT_WITH_DIRECTIVES }) => {
  // Register synchronously so the handler is available on the first render
  // (useEffect would fire too late). Map.set is idempotent for same key.
  // Cleanup on unmount prevents singleton collisions across test runs.
  registerDirectiveHandler("cite", useMockCiteHandler);
  useEffect(() => () => unregisterDirectiveHandler("cite"), []);

  return (
    <MemoryRouter>
      <div
        style={{
          width: "100vw",
          minHeight: "100vh",
          background: "#ffffff",
        }}
        data-testid="directive-renderer-test-root"
      >
        <CamlDirectiveRenderer
          document={doc}
          handlerContext={{ corpusId: "test-corpus-1" }}
        />
      </div>
    </MemoryRouter>
  );
};

/**
 * useCiteHandler — React hook that resolves `{{@cite}}` directives by
 * querying the corpus via the existing semanticSearch GraphQL query.
 *
 * This is an OpenContracts-specific handler registered into the generic
 * directive registry. The upstream @os-legal/caml parser knows nothing
 * about citations — it just extracts `{{@cite sentence}}` tokens.
 */
import React, { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";

import {
  SEMANTIC_SEARCH_ANNOTATIONS,
  SemanticSearchInput,
  SemanticSearchOutput,
} from "../../../graphql/queries";
import type { CamlInlineDirective } from "./inlineDirectives";
import type {
  DirectiveHandlerContext,
  DirectiveHandlerResult,
} from "./directiveRegistry";
import {
  CamlCitationChip,
  CamlCitationError,
  CamlCitationLoading,
  ResolvedCitation,
} from "./CamlCitationChip";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 1;
const ALL_MODE_DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCiteHandler(
  directive: CamlInlineDirective,
  context: DirectiveHandlerContext
): DirectiveHandlerResult {
  const [citations, setCitations] = useState<ResolvedCitation[] | null>(null);
  const [error, setError] = useState<string>();
  const resolvedRef = useRef(false);

  const [searchAnnotations] = useLazyQuery<
    SemanticSearchOutput,
    SemanticSearchInput
  >(SEMANTIC_SEARCH_ANNOTATIONS);

  const mode = directive.args.mode ?? "best";
  const parsed = directive.args.limit
    ? parseInt(directive.args.limit, 10)
    : NaN;
  const requestedLimit = isNaN(parsed)
    ? mode === "all"
      ? ALL_MODE_DEFAULT_LIMIT
      : DEFAULT_LIMIT
    : parsed;
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  useEffect(() => {
    if (resolvedRef.current || !context.corpusId || !directive.context) return;

    // Mark as in-flight to prevent duplicate requests. The ref is set
    // synchronously before the async call to avoid race conditions from
    // React batched re-renders.
    resolvedRef.current = true;
    let cancelled = false;

    searchAnnotations({
      variables: {
        query: directive.context,
        corpusId: context.corpusId,
        limit,
      },
    })
      .then(({ data }) => {
        if (cancelled) return;
        const results: ResolvedCitation[] = (data?.semanticSearch ?? []).map(
          (r) => ({
            annotationId: r.annotation.id,
            rawText: r.annotation.rawText ?? "",
            labelText: r.annotation.annotationLabel?.text ?? "",
            labelColor: r.annotation.annotationLabel?.color ?? "#6b7280",
            documentTitle:
              r.document?.title ?? r.annotation.document?.title ?? "Unknown",
            documentSlug: r.document?.slug ?? r.annotation.document?.slug ?? "",
            corpusSlug: r.annotation.corpus?.slug ?? "",
            similarityScore: r.similarityScore,
            page: r.annotation.page,
          })
        );
        setCitations(results);
      })
      .catch((err) => {
        if (cancelled) return;
        // Clear in-flight flag so a retry is possible if context changes
        resolvedRef.current = false;
        setError(err.message ?? "Citation search failed");
      });

    return () => {
      cancelled = true;
    };
  }, [directive.context, context.corpusId, limit, searchAnnotations]);

  if (error) {
    return {
      loading: false,
      node: <CamlCitationError message={error} />,
      error,
    };
  }

  if (!citations) {
    return {
      loading: true,
      node: <CamlCitationLoading />,
    };
  }

  return {
    loading: false,
    node: (
      <>
        {citations.map((c) => (
          <CamlCitationChip key={c.annotationId} citation={c} />
        ))}
      </>
    ),
  };
}

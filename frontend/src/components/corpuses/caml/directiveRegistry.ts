/**
 * Directive handler registry for CAML inline directives.
 *
 * The upstream `@os-legal/caml` parser extracts `{{@agent scope [args]}}`
 * tokens without knowing what any specific agent does. This registry lets
 * host applications register handlers for each agent name.
 *
 * DESIGN:
 *   @os-legal/caml        → extracts raw directives (parser, zero-dep)
 *   @os-legal/caml-react   → renders directive slots via `renderDirective` prop
 *   host app (OC)          → registers handlers in this registry
 *
 * This module lives in OpenContracts but the *pattern* is designed to be
 * liftable into @os-legal/caml-react as a first-class feature.
 */
import { ReactNode } from "react";
import type { CamlInlineDirective } from "./inlineDirectives";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context passed to directive handlers at resolution time. */
export interface DirectiveHandlerContext {
  /** The corpus GraphQL global ID (if applicable). */
  corpusId?: string;
  /** The document GraphQL global ID (if applicable). */
  documentId?: string;
}

/**
 * Return type from a directive handler.
 *
 * - `loading`: true while the handler is still resolving (async search, etc.)
 * - `node`: the React element to render in place of the directive
 * - `error`: optional error message if resolution failed
 */
export interface DirectiveHandlerResult {
  loading: boolean;
  node: ReactNode;
  error?: string;
}

/**
 * A function that handles a single inline directive.
 *
 * Receives the parsed directive and context, returns a result that the
 * renderer can display. Handlers are expected to manage their own async
 * state (e.g., via React hooks internally if needed, or by returning
 * loading placeholders).
 *
 * For hook-based handlers, use `DirectiveHandlerHook` instead — a React
 * hook that can call `useQuery`, `useState`, etc.
 */
export type DirectiveHandlerHook = (
  directive: CamlInlineDirective,
  context: DirectiveHandlerContext
) => DirectiveHandlerResult;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const handlers = new Map<string, DirectiveHandlerHook>();

/**
 * Register a directive handler for a given agent name.
 *
 * @example
 * ```ts
 * registerDirectiveHandler("cite", useCiteHandler);
 * registerDirectiveHandler("review", useReviewHandler);
 * ```
 */
export function registerDirectiveHandler(
  agentName: string,
  handler: DirectiveHandlerHook
): void {
  handlers.set(agentName, handler);
}

/**
 * Remove a previously registered handler.
 */
export function unregisterDirectiveHandler(agentName: string): void {
  handlers.delete(agentName);
}

/**
 * Get the handler for a given agent name, or undefined if none registered.
 */
export function getDirectiveHandler(
  agentName: string
): DirectiveHandlerHook | undefined {
  return handlers.get(agentName);
}

/**
 * Get all registered agent names.
 */
export function getRegisteredAgents(): string[] {
  return Array.from(handlers.keys());
}

/**
 * Clear all registered handlers (useful for testing).
 */
export function clearDirectiveHandlers(): void {
  handlers.clear();
}

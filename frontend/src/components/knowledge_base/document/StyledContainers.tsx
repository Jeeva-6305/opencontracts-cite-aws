/**
 * Backward-compatible re-export.
 *
 * All styled components have been decomposed into feature-specific files
 * under the ./styled/ directory. Import directly from there for new code:
 *
 *   import { HeaderContainer } from "./styled/HeaderAndLayout";
 *   import { SlidingPanel }    from "./styled/RightPanel";
 *   import { EmptyState }      from "./styled/EmptyStates";
 *   ...etc.
 */
export * from "./styled";

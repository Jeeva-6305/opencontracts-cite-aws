/**
 * Shared CAML component registry.
 *
 * Maps component type names (used in `[component:TYPE ...]` markers) to their
 * React component implementations. Both `CamlArticleEditor` and
 * `CorpusArticleView` import this single registry so additions are reflected
 * in both the editor preview and the published article view.
 */
import { ExtractGridEmbed } from "../components/extracts/ExtractGridEmbed";
import type { CamlComponentRegistry } from "./camlComponents";

export const CAML_COMPONENTS: CamlComponentRegistry = {
  "extract-grid": ExtractGridEmbed,
};

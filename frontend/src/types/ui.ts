import { TokenId } from "../components/types";

/**
 * View mode for folder document browser.
 * - modern-list: Compact list view with file details
 * - modern-card: Card grid view with document previews
 * - grid: Traditional table/grid view with metadata columns
 */
export type FolderViewMode = "modern-card" | "modern-list" | "grid";

export interface MenuItemProps {
  key: string;
  content: string;
  icon: string;
  onClick: () => void;
}
// "../../build/webpack/pdf.worker.min.js';";
export interface TextSearchResultsProps {
  start: TokenId;
  end: TokenId;
}
export interface PageTokenMapProps {
  string_index_token_map: Record<number, TokenId>;
  page_text: string;
}

export interface PageTokenMapBuilderProps {
  end_text_index: number;
  token_map: PageTokenMapProps;
}

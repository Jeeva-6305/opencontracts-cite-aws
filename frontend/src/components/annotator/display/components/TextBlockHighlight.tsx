/**
 * TextBlockHighlight - Renders an ephemeral highlight for a deep-linked text
 * block on a PDF page. Similar to ChatSourceResult but driven by the
 * ?tb= URL parameter rather than chat source state.
 *
 * This allows highlighting arbitrary text regions WITHOUT creating DB annotations.
 */
import { ResultBoundary } from "./ResultBoundary";
import { ChatSourceTokens } from "./ChatSourceTokens";
import { PDFPageInfo } from "../../types/pdf";
import { useAnnotationDisplay } from "../../context/UISettingsAtom";
import { TokenId, BoundingBox } from "../../../types";
import { TEXT_BLOCK_HIGHLIGHT_COLOR } from "../../../../assets/configurations/constants";

export interface TextBlockHighlightProps {
  /** Token IDs for this page (from the decoded text block reference) */
  tokens: TokenId[];
  /** Bounding box for this page (computed from token geometry) */
  bounds: BoundingBox;
  /** Page-specific info (viewport, scaling, etc.) */
  pageInfo: PDFPageInfo;
  /** Zero-based page index — used to produce a unique DOM id per page */
  pageIndex: number;
  /** Whether to scroll this highlight into view */
  scrollIntoView?: boolean;
}

export const TextBlockHighlight = ({
  tokens,
  bounds,
  pageInfo,
  pageIndex,
  scrollIntoView = false,
}: TextBlockHighlightProps) => {
  const { showBoundingBoxes } = useAnnotationDisplay();

  const scaledBounds = pageInfo.getScaledBounds(bounds);

  // Scroll is handled entirely by ResultBoundary's internal useEffect.
  return (
    <>
      <ResultBoundary
        id={`TEXT_BLOCK_HIGHLIGHT_p${pageIndex}`}
        hidden={false}
        showBoundingBox={showBoundingBoxes}
        color={TEXT_BLOCK_HIGHLIGHT_COLOR}
        bounds={scaledBounds}
        selected={true}
        scrollIntoView={scrollIntoView}
      />
      {tokens.length > 0 && (
        <ChatSourceTokens
          color={TEXT_BLOCK_HIGHLIGHT_COLOR}
          highOpacity={!showBoundingBoxes}
          hidden={false}
          pageInfo={pageInfo}
          tokens={tokens}
        />
      )}
    </>
  );
};

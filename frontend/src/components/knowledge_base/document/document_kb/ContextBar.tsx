import React from "react";
import { X, TrendingUp, Table2, Tag } from "lucide-react";
import { AnalysisType, ExtractType } from "../../../../types/graphql-api";
import { PdfAnnotations } from "../../../annotator/types/annotations";

import {
  ContextBarContainer,
  ContextBarContent,
  ContextBarBadge,
  ContextBarLabel,
  ContextBarStats,
  StatPill,
  CloseButton,
} from "./styles";

export interface AnalysisExtractContextBarProps {
  /** Currently selected analysis, if any */
  selectedAnalysis: AnalysisType | null;
  /** Currently selected extract, if any */
  selectedExtract: ExtractType | null;
  /** Current PDF annotations (for annotation count display) */
  pdfAnnotations: PdfAnnotations;
  /** Total number of analyses available */
  analysesCount: number;
  /** Total number of extracts available */
  extractsCount: number;
  /** Handler to clear the analysis/extract selection */
  onClearSelection: () => void;
}

/**
 * Displays a context bar when an analysis or extract is actively selected.
 * Shows the type (analysis/extract), name, annotation count, and a close button
 * to clear the selection.
 */
export const AnalysisExtractContextBar: React.FC<
  AnalysisExtractContextBarProps
> = ({
  selectedAnalysis,
  selectedExtract,
  pdfAnnotations,
  analysesCount,
  extractsCount,
  onClearSelection,
}) => {
  if (!selectedAnalysis && !selectedExtract) return null;

  return (
    <ContextBarContainer data-testid="context-bar">
      <ContextBarContent>
        <ContextBarBadge>
          {selectedAnalysis ? (
            <>
              <TrendingUp size={14} />
              ANALYSIS
            </>
          ) : (
            <>
              <Table2 size={14} />
              EXTRACT
            </>
          )}
        </ContextBarBadge>
        <ContextBarLabel>
          {selectedAnalysis
            ? selectedAnalysis.analyzer.description ||
              selectedAnalysis.analyzer.id
            : selectedExtract?.fieldset?.name || "Data Extract"}
        </ContextBarLabel>
        <ContextBarStats>
          <StatPill title="Annotations visible">
            <Tag size={14} />
            {pdfAnnotations?.annotations?.length || 0}
          </StatPill>
          {selectedAnalysis && (
            <StatPill title="Total analyses available">
              <TrendingUp size={14} />
              {analysesCount}
            </StatPill>
          )}
          {selectedExtract && (
            <StatPill title="Total extracts available">
              <Table2 size={14} />
              {extractsCount}
            </StatPill>
          )}
        </ContextBarStats>
      </ContextBarContent>
      <CloseButton
        onClick={onClearSelection}
        data-testid="clear-analysis-extract-button"
        title="Clear filter"
      >
        <X />
      </CloseButton>
    </ContextBarContainer>
  );
};

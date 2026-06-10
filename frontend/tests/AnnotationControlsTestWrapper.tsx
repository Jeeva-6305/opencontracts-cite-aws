import React from "react";
import { Provider as JotaiProvider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { AnnotationControls } from "../src/components/annotator/controls/AnnotationControls";

export const AnnotationControlsTestWrapper: React.FC<{
  variant?: "floating" | "sidebar";
  compact?: boolean;
  showLabelFilters?: boolean;
}> = ({ variant = "sidebar", compact = false, showLabelFilters = false }) => (
  <JotaiProvider>
    <MemoryRouter>
      <div style={{ padding: 16, maxWidth: 400 }}>
        <AnnotationControls
          variant={variant}
          compact={compact}
          showLabelFilters={showLabelFilters}
        />
      </div>
    </MemoryRouter>
  </JotaiProvider>
);

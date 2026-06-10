import React from "react";
import { Provider as JotaiProvider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { ViewLabelSelector } from "../src/components/annotator/labels/view_labels_selector/ViewLabelSelector";

/**
 * ViewLabelSelector reads from Jotai atoms (corpus state, annotation controls,
 * annotation display). With a fresh JotaiProvider the atoms start empty, so the
 * dropdown renders with no options — which is valid for baseline testing.
 *
 * MemoryRouter is included because useAnnotationDisplay (via useAnnotationControls)
 * transitively uses useNavigate / useLocation.
 */
export const ViewLabelSelectorTestWrapper: React.FC = () => (
  <JotaiProvider>
    <MemoryRouter>
      <div style={{ padding: 16, minWidth: 300 }}>
        <ViewLabelSelector />
      </div>
    </MemoryRouter>
  </JotaiProvider>
);

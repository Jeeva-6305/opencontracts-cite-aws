import React, { useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { SidebarControlBar } from "../src/components/knowledge_base/document/unified_feed/SidebarControlBar";
import type {
  ContentFilters,
  SortOption,
  SidebarViewMode,
} from "../src/components/knowledge_base/document/unified_feed/types";

export const SidebarControlBarTestWrapper: React.FC<{
  initialViewMode?: SidebarViewMode["mode"];
  initialSortBy?: SortOption;
  hasActiveSearch?: boolean;
}> = ({
  initialViewMode = "feed",
  initialSortBy = "page",
  hasActiveSearch = false,
}) => {
  const [viewMode, setViewMode] =
    useState<SidebarViewMode["mode"]>(initialViewMode);
  const [filters, setFilters] = useState<ContentFilters>({
    contentTypes: new Set(["note", "annotation", "relationship"]),
    searchQuery: "",
  });
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);

  return (
    <JotaiProvider>
      <MemoryRouter>
        <div style={{ width: 400, padding: 8 }}>
          <SidebarControlBar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={filters}
            onFiltersChange={setFilters}
            sortBy={sortBy}
            onSortChange={setSortBy}
            hasActiveSearch={hasActiveSearch}
          />
        </div>
      </MemoryRouter>
    </JotaiProvider>
  );
};

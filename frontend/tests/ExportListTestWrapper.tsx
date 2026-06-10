import React from "react";
import { ExportList } from "../src/components/exports/ExportList";
import { ExportObject, PageInfo } from "../src/types/graphql-api";

interface ExportListTestWrapperProps {
  items?: ExportObject[];
  pageInfo?: PageInfo;
  loading?: boolean;
}

const defaultItems: ExportObject[] = [
  {
    id: "export-1",
    name: "Contract Export Q1 2024",
    created: "2024-03-15T10:30:00Z",
    started: "2024-03-15T10:30:05Z",
    finished: "2024-03-15T10:32:00Z",
    errors: "",
    backendLock: false,
    file: "/exports/contract-export-q1.zip",
  },
  {
    id: "export-2",
    name: "NDA Analysis Export",
    created: "2024-03-14T14:00:00Z",
    started: "2024-03-14T14:00:03Z",
    finished: null as any,
    errors: "",
    backendLock: true,
    file: "",
  },
  {
    id: "export-3",
    name: "Full Corpus Backup",
    created: "2024-03-13T09:00:00Z",
    started: null as any,
    finished: null as any,
    errors: "",
    backendLock: false,
    file: "",
  },
];

const defaultPageInfo: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: "",
  endCursor: "",
};

export function ExportListTestWrapper({
  items = defaultItems,
  pageInfo = defaultPageInfo,
  loading = false,
}: ExportListTestWrapperProps) {
  return (
    <div style={{ width: "800px", height: "400px", padding: "16px" }}>
      <ExportList
        items={items}
        pageInfo={pageInfo}
        loading={loading}
        fetchMore={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

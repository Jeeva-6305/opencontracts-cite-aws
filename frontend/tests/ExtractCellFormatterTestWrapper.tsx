import React from "react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ExtractCellFormatter } from "../src/components/extracts/datagrid/ExtractCellFormatter";
import { CellStatus } from "../src/types/extract-grid";
import { DatacellType } from "../src/types/graphql-api";

interface WrapperProps {
  value: any;
  cellStatus: CellStatus | null;
  isExtractComplete: boolean;
  readOnly?: boolean;
  cell?: DatacellType;
}

export const ExtractCellFormatterTestWrapper: React.FC<WrapperProps> = ({
  value,
  cellStatus,
  isExtractComplete,
  readOnly = false,
  cell,
}) => (
  <MockedProvider mocks={[]} addTypename={false}>
    <MemoryRouter>
      <div style={{ width: "300px", height: "60px", position: "relative" }}>
        <ExtractCellFormatter
          value={value}
          cellStatus={cellStatus}
          cellId="test-cell-1"
          onApprove={() => {}}
          onReject={() => {}}
          onEdit={() => {}}
          readOnly={readOnly}
          isExtractComplete={isExtractComplete}
          schema={{ type: "string" }}
          extractIsList={false}
          row={{ col1: value }}
          column={{ key: "col1", name: "Column 1" }}
          cell={cell}
        />
      </div>
    </MemoryRouter>
  </MockedProvider>
);

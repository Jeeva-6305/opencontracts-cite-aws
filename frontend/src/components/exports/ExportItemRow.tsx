import { Loader2, Trash2, Download } from "lucide-react";
import { IconButton, Table } from "@os-legal/ui";
import { ExportObject } from "../../types/graphql-api";
import { DateTimeWidget } from "../widgets/data-display/DateTimeWidget";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

interface ExportItemRowProps {
  style?: Record<string, any>;
  item: ExportObject;
  onDelete: (args?: any) => void | any;
}

export function ExportItemRow({ onDelete, item }: ExportItemRowProps) {
  let requestedTime = "";
  let requestedDate = "N/A";
  if (item.created) {
    var dCreate = new Date(item.created);
    requestedTime = dCreate.toLocaleTimeString();
    requestedDate = dCreate.toLocaleDateString();
  }

  let startedTime = "";
  let startedDate = "N/A";
  if (item.started) {
    var dStart = new Date(item.started);
    startedTime = dStart.toLocaleTimeString();
    startedDate = dStart.toLocaleDateString();
  }

  let completedTime = "";
  let completedDate = "N/A";
  if (item.finished) {
    var dCompleted = new Date(item.finished);
    completedTime = dCompleted.toLocaleTimeString();
    completedDate = dCompleted.toLocaleDateString();
  }

  return (
    <Table.Row>
      <Table.Cell>{item.name}</Table.Cell>
      <Table.Cell>
        <DateTimeWidget timeString={requestedTime} dateString={requestedDate} />
      </Table.Cell>
      <Table.Cell align="center">
        {!item.started ? (
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <DateTimeWidget timeString={startedTime} dateString={startedDate} />
        )}
      </Table.Cell>
      <Table.Cell align="center">
        {!item.finished || !item.started ? (
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <DateTimeWidget
            timeString={completedTime}
            dateString={completedDate}
          />
        )}
      </Table.Cell>
      <Table.Cell align="center">
        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
          <IconButton
            aria-label="Delete export"
            size="sm"
            onClick={() => onDelete(item.id)}
            style={{ color: OS_LEGAL_COLORS.dangerBorderHover }}
          >
            <Trash2 size={14} />
          </IconButton>
          {item.finished && (
            <IconButton
              aria-label="Download export"
              size="sm"
              onClick={() => {
                window.location.href = item.file;
              }}
              style={{ color: OS_LEGAL_COLORS.primaryBlue }}
            >
              <Download size={14} />
            </IconButton>
          )}
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

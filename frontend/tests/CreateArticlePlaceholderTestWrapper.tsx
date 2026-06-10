import React from "react";
import { CreateArticlePlaceholder } from "../src/components/documents/CreateArticlePlaceholder";

interface Props {
  viewMode?: "modern-card" | "modern-list";
  onClick?: () => void;
}

export const CreateArticlePlaceholderHarness: React.FC<Props> = ({
  viewMode = "modern-card",
  onClick = () => {},
}) => {
  return (
    <div
      style={{
        width: viewMode === "modern-card" ? 240 : 500,
        padding: "1rem",
        background: "#f5f5f5",
      }}
      data-testid="harness-root"
    >
      <CreateArticlePlaceholder viewMode={viewMode} onClick={onClick} />
    </div>
  );
};

import React, { useState } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { EmbedderSelector } from "../src/components/widgets/CRUD/EmbedderSelector";

interface WrapperProps {
  preferredEmbedder?: string;
  read_only?: boolean;
  mocks?: MockedResponse[];
}

export const EmbedderSelectorTestWrapper: React.FC<WrapperProps> = ({
  preferredEmbedder: initialEmbedder,
  read_only = false,
  mocks = [],
}) => {
  const [selectedEmbedder, setSelectedEmbedder] = useState<string | undefined>(
    initialEmbedder
  );

  const handleChange = (values: any) => {
    setSelectedEmbedder(values.preferredEmbedder ?? undefined);
  };

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <div style={{ padding: 24, maxWidth: 500 }}>
        <EmbedderSelector
          preferredEmbedder={selectedEmbedder}
          read_only={read_only}
          onChange={handleChange}
        />
        <span
          data-testid="selected-embedder"
          style={{ position: "absolute", left: -9999 }}
        >
          {selectedEmbedder ?? ""}
        </span>
      </div>
    </MockedProvider>
  );
};

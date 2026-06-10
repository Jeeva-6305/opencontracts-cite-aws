import React, { useState } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { BadgeCriteriaConfig } from "../src/components/badges/BadgeCriteriaConfig";

export const BadgeCriteriaConfigTestWrapper: React.FC<{
  badgeType?: "GLOBAL" | "CORPUS";
  mocks: MockedResponse[];
}> = ({ badgeType = "GLOBAL", mocks }) => {
  const [config, setConfig] = useState<any>({});

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <div style={{ padding: 16, maxWidth: 500 }}>
        <BadgeCriteriaConfig
          badgeType={badgeType}
          criteriaConfig={config}
          onChange={({ config: newConfig }) => setConfig(newConfig)}
        />
        <span
          data-testid="config-state"
          style={{ position: "absolute", left: -9999 }}
        >
          {JSON.stringify(config)}
        </span>
      </div>
    </MockedProvider>
  );
};

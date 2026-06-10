import React from "react";
import RadialButtonCloud from "../../src/components/widgets/buttons/RadialButtonCloud";
import type { CloudButtonItem } from "../../src/components/widgets/buttons/RadialButtonCloud";

interface RadialButtonCloudWrapperProps {
  actions: CloudButtonItem[];
  parentBackgroundColor?: string;
}

export const RadialButtonCloudWrapper: React.FC<
  RadialButtonCloudWrapperProps
> = ({ actions, parentBackgroundColor = "#ffffff" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "300px",
      height: "300px",
      position: "relative",
    }}
  >
    <RadialButtonCloud
      parentBackgroundColor={parentBackgroundColor}
      actions={actions}
    />
  </div>
);

import React, { useState } from "react";
import { IconDropdown } from "../src/components/widgets/icon-picker/IconDropdown";

export const IconDropdownInteractiveWrapper: React.FC<{
  initialValue?: string;
  disabled?: boolean;
}> = ({ initialValue = "", disabled = false }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div style={{ padding: 24 }}>
      <IconDropdown value={value} onChange={setValue} disabled={disabled} />
      <span
        data-testid="current-value"
        style={{ position: "absolute", left: -9999 }}
      >
        {value}
      </span>
    </div>
  );
};

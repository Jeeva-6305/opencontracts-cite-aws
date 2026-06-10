import React from "react";
import { Select } from "@os-legal/ui";
import {
  LICENSE_OPTIONS,
  type LicenseValue,
} from "../../../assets/configurations/constants";

interface LicenseSelectorProps {
  /** Current license value — accepts any string for flexibility with form state. */
  license: LicenseValue | (string & {});
  onChange: (value: string) => void;
  disabled?: boolean;
}

const options = LICENSE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

export const LicenseSelector: React.FC<LicenseSelectorProps> = ({
  license,
  onChange,
  disabled = false,
}) => (
  <Select
    label="License"
    value={license}
    options={options}
    onChange={onChange}
    disabled={disabled}
    placeholder="Select a license..."
    fullWidth
  />
);

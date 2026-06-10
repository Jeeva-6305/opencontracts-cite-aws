import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { ChevronDown } from "lucide-react";

import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { IconPickerModal } from "./IconPickerModal";
import { resolvePickerIcon } from "./resolvePickerIcon";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconDropdownProps {
  /** Currently selected Lucide icon name (kebab-case). */
  value: string;
  /** Called when the user picks a new icon. */
  onChange: (name: string) => void;
  /** Placeholder text when no icon is selected. */
  placeholder?: string;
  /** Disables the dropdown trigger. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const IconDropdown: React.FC<IconDropdownProps> = ({
  value,
  onChange,
  placeholder = "Choose icon…",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
    },
    [onChange]
  );

  const handleClose = useCallback(() => setOpen(false), []);

  const Icon = value ? resolvePickerIcon(value) : null;

  return (
    <>
      <Trigger
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        data-testid="icon-dropdown-trigger"
      >
        {Icon ? (
          <TriggerIcon>
            <Icon size={18} />
          </TriggerIcon>
        ) : null}
        <TriggerLabel $hasValue={!!value}>{value || placeholder}</TriggerLabel>
        <ChevronDown size={14} />
      </Trigger>

      <IconPickerModal
        open={open}
        value={value}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 160px;
  background: ${OS_LEGAL_COLORS.surface};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: ${OS_LEGAL_COLORS.textPrimary};
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${OS_LEGAL_COLORS.borderHover};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  &:focus-visible {
    outline: none;
    border-color: ${OS_LEGAL_COLORS.accent};
    box-shadow: 0 0 0 3px ${OS_LEGAL_COLORS.accentLight};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TriggerIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${OS_LEGAL_COLORS.accent};
`;

const TriggerLabel = styled.span<{ $hasValue: boolean }>`
  flex: 1;
  text-align: left;
  color: ${(p) =>
    p.$hasValue ? OS_LEGAL_COLORS.textPrimary : OS_LEGAL_COLORS.textMuted};
  font-family: ${(p) => (p.$hasValue ? "monospace" : "inherit")};
`;

import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

/**
 * Shared styled components for the selection action menu used by both
 * the PDF SelectionLayer and TXT TxtAnnotator context menus.
 */

export const SelectionActionMenu = styled.div`
  background: white;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 160px;
`;

export const ActionMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  svg {
    flex-shrink: 0;
  }
`;

export const MenuDivider = styled.div`
  height: 1px;
  background-color: ${OS_LEGAL_COLORS.border};
  margin: 4px 0;
`;

export const ShortcutHint = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: #666;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
`;

export const HelpMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  color: #666;
  font-size: 14px;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${OS_LEGAL_COLORS.folderIcon};
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  span {
    font-weight: 500;
    color: #333;
  }
`;

export const HelpText = styled.div`
  font-size: 12px;
  color: #666;
  line-height: 1.3;
`;

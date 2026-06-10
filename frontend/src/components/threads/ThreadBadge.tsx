import React from "react";
import styled from "styled-components";
import { Pin, Lock, Trash2 } from "lucide-react";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";

interface ThreadBadgeProps {
  type: "pinned" | "locked" | "deleted";
  compact?: boolean;
}

const BadgeContainer = styled.span<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${CORPUS_RADII.full};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  transition: all ${CORPUS_TRANSITIONS.fast};

  ${(props) => {
    switch (props.$type) {
      case "pinned":
        return `
          background: ${CORPUS_COLORS.teal[50]};
          color: ${CORPUS_COLORS.teal[700]};
          border: 1px solid ${CORPUS_COLORS.teal[200]};
        `;
      case "locked":
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        `;
      case "deleted":
        return `
          background: ${CORPUS_COLORS.slate[100]};
          color: ${CORPUS_COLORS.slate[500]};
          border: 1px solid ${CORPUS_COLORS.slate[300]};
        `;
      default:
        return "";
    }
  }}
`;

/**
 * Visual indicator badge for thread states
 */
export function ThreadBadge({ type, compact = false }: ThreadBadgeProps) {
  const icons = {
    pinned: <Pin size={11} />,
    locked: <Lock size={11} />,
    deleted: <Trash2 size={11} />,
  };

  const labels = {
    pinned: "Pinned",
    locked: "Locked",
    deleted: "Deleted",
  };

  return (
    <BadgeContainer $type={type}>
      {icons[type]}
      {!compact && <span>{labels[type]}</span>}
    </BadgeContainer>
  );
}

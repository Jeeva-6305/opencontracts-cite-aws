import React from "react";
import styled from "styled-components";
import { HelpCircle, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
} from "./styles/discussionStyles";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

/**
 * Discussion category types that can be inferred from thread content
 * or explicitly set via a future backend field.
 */
export type DiscussionCategory = "question" | "idea" | "help" | "answered";

interface DiscussionTypeBadgeProps {
  category: DiscussionCategory;
  compact?: boolean;
}

const BadgeContainer = styled.span<{ $category: DiscussionCategory }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${CORPUS_RADII.full};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all ${CORPUS_TRANSITIONS.fast};

  ${(props) => {
    switch (props.$category) {
      case "question":
        return `
          background: ${CORPUS_COLORS.teal[50]};
          color: ${CORPUS_COLORS.teal[700]};
          border: 1px solid ${CORPUS_COLORS.teal[200]};
        `;
      case "idea":
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        `;
      case "help":
        return `
          background: ${OS_LEGAL_COLORS.dangerSurfaceHover};
          color: ${OS_LEGAL_COLORS.dangerText};
          border: 1px solid #fca5a5;
        `;
      case "answered":
        return `
          background: #dcfce7;
          color: ${OS_LEGAL_COLORS.successText};
          border: 1px solid #86efac;
        `;
      default:
        return `
          background: ${CORPUS_COLORS.slate[100]};
          color: ${CORPUS_COLORS.slate[600]};
          border: 1px solid ${CORPUS_COLORS.slate[300]};
        `;
    }
  }}

  svg {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
  }
`;

const categoryConfig: Record<
  DiscussionCategory,
  { icon: React.ReactNode; label: string }
> = {
  question: { icon: <HelpCircle />, label: "Question" },
  idea: { icon: <Lightbulb />, label: "Idea" },
  help: { icon: <AlertCircle />, label: "Help Wanted" },
  answered: { icon: <CheckCircle />, label: "Answered" },
};

/**
 * Infer discussion category from thread title and description.
 * This is a simple heuristic that can be replaced with a backend field.
 */
export function inferDiscussionCategory(
  title: string,
  description?: string | null
): DiscussionCategory {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Check for question indicators
  if (
    text.includes("?") ||
    text.includes("question") ||
    text.includes("how do") ||
    text.includes("how to") ||
    text.includes("what is") ||
    text.includes("why does") ||
    text.includes("can someone") ||
    text.includes("anyone know")
  ) {
    return "question";
  }

  // Check for help/issue indicators
  if (
    text.includes("help") ||
    text.includes("issue") ||
    text.includes("problem") ||
    text.includes("bug") ||
    text.includes("error") ||
    text.includes("stuck") ||
    text.includes("not working")
  ) {
    return "help";
  }

  // Check for idea/suggestion indicators
  if (
    text.includes("idea") ||
    text.includes("suggest") ||
    text.includes("proposal") ||
    text.includes("feature") ||
    text.includes("would be nice") ||
    text.includes("best practice")
  ) {
    return "idea";
  }

  // Default to question for general discussion
  return "question";
}

/**
 * Visual badge for discussion type/category.
 * Shows icon and label to categorize threads.
 */
export function DiscussionTypeBadge({
  category,
  compact = false,
}: DiscussionTypeBadgeProps) {
  const config = categoryConfig[category];

  return (
    <BadgeContainer $category={category}>
      {config.icon}
      {!compact && <span>{config.label}</span>}
    </BadgeContainer>
  );
}

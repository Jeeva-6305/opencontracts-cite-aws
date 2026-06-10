import { DynamicIcon } from "../../widgets/icon-picker/DynamicIcon";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { X } from "lucide-react";

import source_icon from "../../../assets/icons/noun-bow-and-arrow-559923.png";
import target_icon from "../../../assets/icons/noun-target-746597.png";

import { ServerAnnotation, ServerTokenAnnotation } from "../types/annotations";
import { TruncatedText } from "../../widgets/data-display/TruncatedText";

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.625rem;
  border-radius: 4px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
`;

const AvatarImage = styled.img`
  width: 1.75em;
  height: 1.75em;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

interface AnnotationPillProps {
  $color?: string;
}

const AnnotationPill = styled.span<AnnotationPillProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.3em 0.7em;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  background-color: ${(props) => props.$color || OS_LEGAL_COLORS.textMuted};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.85;
  }
`;

const PageLabel = styled.span`
  font-size: 0.7rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
  font-weight: 500;
  margin-left: 0.5rem;
  white-space: nowrap;
`;

const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
  margin-left: 0.625rem;
`;

const RemoveButton = styled.button`
  padding: 0.35em;
  margin-left: 0.375rem;
  background-color: transparent;
  color: ${OS_LEGAL_COLORS.textMuted};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background-color: ${OS_LEGAL_COLORS.dangerSurfaceHover};
    color: ${OS_LEGAL_COLORS.danger};
  }

  &:active {
    background-color: ${OS_LEGAL_COLORS.dangerBorder};
  }
`;

interface RelationHighlightItemProps {
  annotation: ServerAnnotation;
  className?: string;
  type: "SOURCE" | "TARGET";
  read_only: boolean;
  onRemoveAnnotationFromRelation?: (annotationId: string) => void;
  onSelect: (annotationId: string) => void;
}

export const RelationHighlightItem = ({
  annotation,
  className,
  type,
  read_only,
  onRemoveAnnotationFromRelation,
  onSelect,
}: RelationHighlightItemProps) => {
  const labelColor = annotation.annotationLabel.color || undefined;

  return (
    <ItemRow className={className}>
      <AvatarImage
        src={type === "SOURCE" ? source_icon : target_icon}
        alt={type === "SOURCE" ? "Source" : "Target"}
      />
      <ContentArea>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.25rem",
          }}
        >
          <AnnotationPill
            $color={labelColor}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelect(annotation.id);
            }}
          >
            {annotation.annotationLabel.icon && (
              <DynamicIcon name={annotation.annotationLabel.icon} size={12} />
            )}
            {annotation.annotationLabel.text}
          </AnnotationPill>
          {(annotation instanceof ServerTokenAnnotation ||
            annotation.page > 0) && (
            <PageLabel>Page {annotation.page + 1}</PageLabel>
          )}
        </div>
        {annotation?.rawText ? (
          <TruncatedText
            text={annotation.rawText}
            limit={100}
            style={{
              marginTop: "0.375rem",
              fontSize: "0.85rem",
              color: OS_LEGAL_COLORS.textTertiary,
            }}
          />
        ) : null}
      </ContentArea>
      {!read_only && onRemoveAnnotationFromRelation && (
        <RemoveButton
          aria-label="Remove annotation from relation"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRemoveAnnotationFromRelation(annotation.id);
          }}
        >
          <X size={14} />
        </RemoveButton>
      )}
    </ItemRow>
  );
};

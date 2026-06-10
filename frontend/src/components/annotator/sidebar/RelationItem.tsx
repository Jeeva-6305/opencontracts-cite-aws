import styled from "styled-components";
import { Trash2 } from "lucide-react";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

import "./AnnotatorSidebar.css";
import { RelationHighlightItem } from "./RelationHighlightItem";
import { RelationGroup, ServerAnnotation } from "../types/annotations";

interface RelationContainerProps {
  $color?: string;
  $selected?: boolean;
}

const RelationContainer = styled.div<RelationContainerProps>`
  border-left: 4px solid ${(props) => props.$color || OS_LEGAL_COLORS.border};
  background-color: ${(props) =>
    props.$selected ? "rgba(46, 204, 113, 0.08)" : "white"};
  box-shadow: ${(props) =>
    props.$selected
      ? "0 2px 8px rgba(46, 204, 113, 0.2)"
      : "0 1px 3px rgba(0, 0, 0, 0.08)"};
  border-radius: 6px;
  padding: 0.875rem 1rem;
  margin: 0.5rem 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;

  &:hover {
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
    background-color: ${(props) =>
      props.$selected ? "rgba(46, 204, 113, 0.08)" : "rgba(0, 0, 0, 0.01)"};
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
`;

const RelationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
`;

const DeleteButton = styled.button`
  padding: 0.4em;
  margin: 0;
  background-color: transparent;
  color: ${OS_LEGAL_COLORS.textMuted};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${OS_LEGAL_COLORS.dangerSurfaceHover};
    color: ${OS_LEGAL_COLORS.danger};
  }

  &:active {
    background-color: ${OS_LEGAL_COLORS.dangerBorder};
  }
`;

const AnnotationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

interface LabelPillProps {
  $color?: string;
}

const LabelPill = styled.div<LabelPillProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35em 0.9em;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  background-color: ${(props) => props.$color || "#6b7280"};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
`;

const DividerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.625rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background-color: ${OS_LEGAL_COLORS.border};
`;

export function RelationItem({
  relation,
  target_annotations,
  source_annotations,
  read_only,
  selected,
  onSelectAnnotation,
  onSelectRelation,
  onDeleteRelation,
  onRemoveAnnotationFromRelation,
}: {
  relation: RelationGroup;
  read_only: boolean;
  selected: boolean;
  target_annotations: ServerAnnotation[];
  source_annotations: ServerAnnotation[];
  onSelectRelation: () => void;
  onSelectAnnotation: (annotationId: string) => void;
  onDeleteRelation: (relationId: string) => void;
  onRemoveAnnotationFromRelation: (
    annotationId: string,
    relationId: string
  ) => void;
}) {
  const source_cards = source_annotations.map((source_annotation) => (
    <RelationHighlightItem
      key={`1_${source_annotation.id}`}
      type="SOURCE"
      annotation={source_annotation}
      onSelect={onSelectAnnotation}
      onRemoveAnnotationFromRelation={() =>
        onRemoveAnnotationFromRelation(source_annotation.id, relation.id)
      }
      read_only={read_only || relation.structural}
    />
  ));

  const target_cards = target_annotations.map((target_annotation) => (
    <RelationHighlightItem
      key={`2_${target_annotation.id}`}
      type="TARGET"
      annotation={target_annotation}
      onSelect={onSelectAnnotation}
      onRemoveAnnotationFromRelation={() =>
        onRemoveAnnotationFromRelation(target_annotation.id, relation.id)
      }
      read_only={read_only || relation.structural}
    />
  ));

  return (
    <RelationContainer
      $color={relation.label.color}
      $selected={selected}
      onClick={onSelectRelation}
    >
      {!relation.structural && (
        <RelationHeader>
          <DeleteButton
            aria-label="Delete relation"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDeleteRelation(relation.id);
            }}
          >
            <Trash2 size={16} />
          </DeleteButton>
        </RelationHeader>
      )}

      <AnnotationList>{source_cards}</AnnotationList>

      <DividerRow>
        <DividerLine />
        <LabelPill $color={relation.label.color}>
          {relation.label.text}
        </LabelPill>
        <DividerLine />
      </DividerRow>

      <AnnotationList>{target_cards}</AnnotationList>
    </RelationContainer>
  );
}

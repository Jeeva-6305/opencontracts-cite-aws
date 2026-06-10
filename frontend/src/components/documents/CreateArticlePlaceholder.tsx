/**
 * CreateArticlePlaceholder — Ghost tile shown in the document grid when
 * no Readme.CAML exists and the user has edit permissions.
 *
 * Follows the FolderCard pattern: a self-contained card inserted into
 * DocumentCards' prefixItems array.
 */
import React from "react";
import styled from "styled-components";
import { BookOpen } from "lucide-react";
import {
  OS_LEGAL_COLORS,
  OS_LEGAL_SPACING,
} from "../../assets/configurations/osLegalStyles";

const CardContainer = styled.div`
  position: relative;
  background: ${OS_LEGAL_COLORS.surface};
  border: 2px dashed ${OS_LEGAL_COLORS.border};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 1rem;

  &:hover {
    border-color: ${OS_LEGAL_COLORS.accent};
    background: ${OS_LEGAL_COLORS.surfaceHover};
  }
`;

const IconCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${OS_LEGAL_COLORS.surfaceLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${OS_LEGAL_COLORS.textMuted};
`;

const Title = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
`;

const Subtitle = styled.span`
  font-size: 0.6875rem;
  color: ${OS_LEGAL_COLORS.textMuted};
  max-width: 180px;
`;

const ListContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px dashed ${OS_LEGAL_COLORS.border};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${OS_LEGAL_COLORS.accent};
    background: ${OS_LEGAL_COLORS.surfaceHover};
  }
`;

const ListTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
`;

const ListSubtitle = styled.span`
  font-size: 0.75rem;
  color: ${OS_LEGAL_COLORS.textMuted};
`;

interface CreateArticlePlaceholderProps {
  viewMode?: "modern-card" | "modern-list";
  onClick: () => void;
}

export const CreateArticlePlaceholder: React.FC<
  CreateArticlePlaceholderProps
> = ({ viewMode = "modern-card", onClick }) => {
  if (viewMode === "modern-list") {
    return (
      <ListContainer onClick={onClick} data-testid="create-article-placeholder">
        <IconCircle>
          <BookOpen size={18} />
        </IconCircle>
        <div>
          <ListTitle>Readme.CAML</ListTitle>
          <br />
          <ListSubtitle>Create a corpus article</ListSubtitle>
        </div>
      </ListContainer>
    );
  }

  return (
    <CardContainer onClick={onClick} data-testid="create-article-placeholder">
      <IconCircle>
        <BookOpen size={20} />
      </IconCircle>
      <Title>Readme.CAML</Title>
      <Subtitle>Create a corpus article</Subtitle>
    </CardContainer>
  );
};

import React from "react";
import { Chip } from "@os-legal/ui";
import styled from "styled-components";
import { FileText, Image, Layers } from "lucide-react";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

const StyledBadge = styled(Chip)<{ $badgeColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.3em 0.6em;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.7rem;
  margin-left: 0.5rem;
  background: ${(props) => props.$badgeColor} !important;
  color: white !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

interface ModalityBadgeProps {
  modalities: string[];
}

export const ModalityBadge: React.FC<ModalityBadgeProps> = ({ modalities }) => {
  if (!modalities || modalities.length === 0) {
    return null;
  }

  const hasText = modalities.includes("TEXT");
  const hasImage = modalities.includes("IMAGE");

  // Mixed modality (text + image)
  if (hasText && hasImage) {
    return (
      <StyledBadge $badgeColor="#8b5cf6" size="sm">
        <Layers size={12} />
        Mixed
      </StyledBadge>
    );
  }

  // Image only
  if (hasImage) {
    return (
      <StyledBadge $badgeColor={OS_LEGAL_COLORS.folderIcon} size="sm">
        <Image size={12} />
        Image
      </StyledBadge>
    );
  }

  // Text only (or default)
  if (hasText) {
    return (
      <StyledBadge $badgeColor={OS_LEGAL_COLORS.primaryBlue} size="sm">
        <FileText size={12} />
        Text
      </StyledBadge>
    );
  }

  return null;
};

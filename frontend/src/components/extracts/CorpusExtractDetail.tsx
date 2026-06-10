/**
 * CorpusExtractDetail - Embedded extract detail view for corpus context
 *
 * This component renders the extract detail view within a corpus tab,
 * using URL-based selection. When the user closes the detail panel,
 * it clears the extract selection via the onClose callback.
 */

import React, { useState, useRef, useCallback } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Button, Chip } from "@os-legal/ui";
import { X, Download, RefreshCw, Play, ExternalLink } from "lucide-react";

import { ExtractType } from "../../types/graphql-api";
import {
  ExtractDetailContent,
  ExtractDetailContentHandle,
} from "./ExtractDetailContent";
import { getExtractStatus } from "../../utils/extractUtils";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

// Styled Components
const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${OS_LEGAL_COLORS.background};
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid ${OS_LEGAL_COLORS.border};
  flex-shrink: 0;
`;

const HeaderMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h2`
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 20px;
  font-weight: 400;
  color: ${OS_LEGAL_COLORS.textPrimary};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 6px;
  color: ${OS_LEGAL_COLORS.textSecondary};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${OS_LEGAL_COLORS.surfaceLight};
    color: ${OS_LEGAL_COLORS.textPrimary};
    border-color: ${OS_LEGAL_COLORS.borderHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CloseButton = styled(IconButton)``;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

// Props
interface CorpusExtractDetailProps {
  extractId: string;
  onClose: () => void;
}

export const CorpusExtractDetail: React.FC<CorpusExtractDetailProps> = ({
  extractId,
  onClose,
}) => {
  const navigate = useNavigate();
  const contentRef = useRef<ExtractDetailContentHandle>(null);
  const [extract, setExtract] = useState<ExtractType | null>(null);

  const handleExtractLoaded = useCallback((loadedExtract: ExtractType) => {
    setExtract(loadedExtract);
  }, []);

  const handleOpenFullPage = () => {
    navigate(`/extracts/${extractId}`);
  };

  const handleExportCsv = () => {
    contentRef.current?.exportToCsv();
  };

  const handleRefresh = () => {
    contentRef.current?.refetch();
  };

  const handleStartExtract = () => {
    contentRef.current?.startExtract();
  };

  const statusProps = extract ? getExtractStatus(extract) : null;
  const canStart = extract && !extract.started;
  const isRunning = extract?.started && !extract?.finished && !extract?.error;

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderMain>
          <Title>{extract?.name || "Loading..."}</Title>
          {statusProps && (
            <Chip size="sm" color={statusProps.color} static>
              {statusProps.label}
            </Chip>
          )}
        </HeaderMain>
        <Actions>
          {canStart && (
            <IconButton aria-label="Start extract" onClick={handleStartExtract}>
              <Play size={14} />
            </IconButton>
          )}
          <IconButton aria-label="Refresh" onClick={handleRefresh}>
            <RefreshCw size={14} />
          </IconButton>
          <IconButton
            aria-label="Export CSV"
            onClick={handleExportCsv}
            disabled={!extract || Boolean(isRunning)}
          >
            <Download size={14} />
          </IconButton>
          <IconButton aria-label="Open full page" onClick={handleOpenFullPage}>
            <ExternalLink size={14} />
          </IconButton>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={16} />
          </CloseButton>
        </Actions>
      </Header>

      <Content>
        <ExtractDetailContent
          ref={contentRef}
          extractId={extractId}
          compact
          onExtractLoaded={handleExtractLoaded}
        />
      </Content>
    </Container>
  );
};

export default CorpusExtractDetail;

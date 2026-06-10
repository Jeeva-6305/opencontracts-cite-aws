import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, Grid3x3, List, Search } from "lucide-react";
import AnalysisTraySelector from "../../analyses/AnalysisTraySelector";
import { AnalysisType } from "../../../types/graphql-api";

interface FloatingAnalysesPanelProps {
  visible: boolean;
  analyses: AnalysisType[];
  onClose: () => void;
  panelOffset?: number;
  readOnly?: boolean;
}

const FloatingContainer = styled(motion.div)<{ $panelOffset?: number }>`
  position: fixed;
  top: 50%;
  right: ${(props) => {
    const baseOffset = props.$panelOffset ? props.$panelOffset + 32 : 32;
    return `${baseOffset + 80}px`;
  }};
  transform: translateY(-50%);
  z-index: 2001;
  width: 480px;
  height: 80vh;
  max-height: 900px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1400px) {
    width: 420px;
  }

  @media (max-width: 768px) {
    top: 4rem;
    right: 0;
    left: 0;
    transform: none;
    width: 100%;
    height: calc(100vh - 5rem);
    max-height: none;
    padding: 0.5rem;
    box-sizing: border-box;
  }
`;

const ExpandedPanel = styled(motion.div)`
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid ${OS_LEGAL_COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(
    180deg,
    ${OS_LEGAL_COLORS.surfaceHover} 0%,
    rgba(250, 251, 252, 0) 100%
  );
  flex-shrink: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${OS_LEGAL_COLORS.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: ${OS_LEGAL_COLORS.folderIcon};
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ViewToggle = styled.div`
  display: flex;
  background: ${OS_LEGAL_COLORS.surfaceLight};
  border-radius: 10px;
  padding: 0.25rem;
  gap: 0.25rem;
`;

const ViewButton = styled(motion.button)<{ $active: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: ${(props) => (props.$active ? "white" : "transparent")};
  color: ${(props) =>
    props.$active
      ? OS_LEGAL_COLORS.textPrimary
      : OS_LEGAL_COLORS.textSecondary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  box-shadow: ${(props) =>
    props.$active ? "0 2px 4px rgba(0, 0, 0, 0.05)" : "none"};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    color: ${(props) =>
      props.$active
        ? OS_LEGAL_COLORS.textPrimary
        : OS_LEGAL_COLORS.textTertiary};
  }
`;

const ActionButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
    color: ${OS_LEGAL_COLORS.textSecondary};
  }

  &:hover {
    background: ${OS_LEGAL_COLORS.surfaceHover};
    border-color: ${OS_LEGAL_COLORS.borderHover};

    svg {
      color: ${OS_LEGAL_COLORS.textTertiary};
    }
  }
`;

const SearchBar = styled.div`
  padding: 1rem 1.75rem;
  border-bottom: 1px solid ${OS_LEGAL_COLORS.surfaceLight};
  background: ${OS_LEGAL_COLORS.surfaceHover};

  input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    border: 2px solid ${OS_LEGAL_COLORS.border};
    border-radius: 12px;
    font-size: 0.9375rem;
    background: white;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${OS_LEGAL_COLORS.folderIcon};
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    &::placeholder {
      color: ${OS_LEGAL_COLORS.textMuted};
    }
  }

  position: relative;

  svg {
    position: absolute;
    left: 2rem;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: ${OS_LEGAL_COLORS.textMuted};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  background: ${OS_LEGAL_COLORS.surfaceHover};
`;

const StatsBar = styled.div`
  padding: 1rem 1.75rem;
  background: linear-gradient(
    180deg,
    ${OS_LEGAL_COLORS.surfaceHover} 0%,
    ${OS_LEGAL_COLORS.surfaceHover} 100%
  );
  border-bottom: 1px solid ${OS_LEGAL_COLORS.surfaceLight};
  display: flex;
  gap: 2rem;
  font-size: 0.875rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  strong {
    color: ${OS_LEGAL_COLORS.textPrimary};
    font-weight: 600;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${OS_LEGAL_COLORS.danger};
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
`;

// Enhanced styled wrapper for the AnalysisTraySelector
const AnalysisSelectorWrapper = styled.div<{
  $viewMode: "compact" | "expanded";
}>`
  height: 100%;
  overflow: hidden;

  /* Override the default styles to support compact mode */
  ${(props) =>
    props.$viewMode === "compact" &&
    `
    .analysis-card {
      padding: 1rem !important;
      margin-bottom: 0.75rem !important;
      
      .analysis-header {
        margin: -1rem -1rem 0.75rem -1rem !important;
        padding: 1rem !important;
      }
      
      .timestamps {
        display: none !important;
      }
      
      .description-container {
        display: none !important;
      }
      
      .annotations-section {
        margin-top: 0.75rem !important;
        padding-top: 0.75rem !important;
      }
      
      .analyzer-description-header {
        display: none !important;
      }
    }
  `}
`;

export const FloatingAnalysesPanel: React.FC<FloatingAnalysesPanelProps> = ({
  visible,
  analyses,
  onClose,
  panelOffset = 0,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate stats
  const totalAnnotations = analyses.reduce(
    (sum, analysis) => sum + (analysis.annotations?.totalCount || 0),
    0
  );

  const completedAnalyses = analyses.filter(
    (analysis) => analysis.analysisCompleted
  ).length;

  if (!visible) return null;

  return (
    <FloatingContainer $panelOffset={panelOffset}>
      <ExpandedPanel
        key="expanded"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Header>
          <Title>
            <BarChart3 size={24} />
            Document Analyses
            {analyses.length > 0 && <Badge>{analyses.length}</Badge>}
          </Title>
          <HeaderControls>
            <ViewToggle>
              <ViewButton
                $active={viewMode === "compact"}
                onClick={() => setViewMode("compact")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Compact view"
              >
                <Grid3x3 />
                Compact
              </ViewButton>
              <ViewButton
                $active={viewMode === "expanded"}
                onClick={() => setViewMode("expanded")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Expanded view"
              >
                <List />
                Expanded
              </ViewButton>
            </ViewToggle>
            <ActionButton
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Close"
            >
              <X />
            </ActionButton>
          </HeaderControls>
        </Header>

        {analyses.length > 3 && (
          <SearchBar>
            <Search />
            <input
              type="text"
              placeholder="Search analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
        )}

        {analyses.length > 0 && (
          <StatsBar>
            <Stat>
              <strong>{analyses.length}</strong> analyses
            </Stat>
            <Stat>
              <strong>{completedAnalyses}</strong> completed
            </Stat>
            <Stat>
              <strong>{totalAnnotations}</strong> annotations
            </Stat>
          </StatsBar>
        )}

        <Content>
          <AnalysisSelectorWrapper $viewMode={viewMode}>
            <AnalysisTraySelector
              read_only={readOnly}
              analyses={analyses}
              viewMode={viewMode}
              searchTerm={searchTerm}
            />
          </AnalysisSelectorWrapper>
        </Content>
      </ExpandedPanel>
    </FloatingContainer>
  );
};

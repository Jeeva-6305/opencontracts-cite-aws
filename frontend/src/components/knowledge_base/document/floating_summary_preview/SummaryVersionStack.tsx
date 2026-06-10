import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../../assets/configurations/osLegalStyles";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { SummaryPreviewCard } from "./SummaryPreviewCard";
import { DocumentSummaryRevision } from "./graphql/documentSummaryQueries";
import { Spinner } from "@os-legal/ui";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";

interface SummaryVersionStackProps {
  versions: DocumentSummaryRevision[];
  isExpanded: boolean;
  isFanned: boolean;
  onFanToggle: () => void;
  onVersionClick?: (version: number) => void;
  loading?: boolean;
  currentContent?: string;
}

const StackContainer = styled.div`
  position: relative;
  width: 100%;
  height: 220px;
  perspective: 1000px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 180px;
  color: ${OS_LEGAL_COLORS.textMuted};
  text-align: center;
  padding: 2rem;
  background: ${OS_LEGAL_COLORS.surfaceHover};
  border-radius: 16px;
  border: 1px dashed ${OS_LEGAL_COLORS.border};

  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }
`;

const CardsWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const CardsContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const FanToggle = styled(motion.button)`
  position: absolute;
  bottom: -0.5rem;
  right: 1rem;
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 20px;
  font-size: 0.75rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
  z-index: 500;

  &:hover {
    background: ${OS_LEGAL_COLORS.surfaceHover};
    color: ${OS_LEGAL_COLORS.primaryBlue};
    border-color: ${OS_LEGAL_COLORS.blueBorder};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const NavigationButton = styled(motion.button)<{ $position: "left" | "right" }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${(props) =>
    props.$position === "left" ? "left: 0.5rem;" : "right: 0.5rem;"}
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  border: 1px solid ${OS_LEGAL_COLORS.border};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 200;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover:not(:disabled) {
    background: ${OS_LEGAL_COLORS.surfaceHover};
    border-color: ${OS_LEGAL_COLORS.primaryBlue};
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);

    svg {
      color: ${OS_LEGAL_COLORS.primaryBlue};
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${OS_LEGAL_COLORS.textSecondary};
    transition: color 0.2s ease;
  }
`;

const VersionIndicator = styled.div`
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  font-size: 11px;
  color: ${OS_LEGAL_COLORS.textSecondary};
  font-weight: 600;
  z-index: 10;
`;

export const SummaryVersionStack: React.FC<SummaryVersionStackProps> = ({
  versions,
  isExpanded,
  isFanned,
  onFanToggle,
  onVersionClick,
  loading = false,
  currentContent,
}) => {
  const [hoveredVersion, setHoveredVersion] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Show all versions when fanned, otherwise show first 3
  const visibleVersions = isFanned ? versions : versions.slice(0, 3);
  const hasMoreVersions = !isFanned && versions.length > 3;

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < visibleVersions.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  // Swipe handling
  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      handlePrevious();
    } else if (info.offset.x < -swipeThreshold) {
      handleNext();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isFanned) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFanned, activeIndex, visibleVersions.length]);

  if (loading) {
    return (
      <StackContainer>
        <LoaderContainer>
          <Spinner size="sm" />
        </LoaderContainer>
      </StackContainer>
    );
  }

  if (versions.length === 0) {
    return (
      <StackContainer>
        <EmptyState>
          <Layers size={32} />
          <p>No summary versions yet.</p>
          <p>Create your first summary to get started!</p>
        </EmptyState>
      </StackContainer>
    );
  }

  return (
    <StackContainer>
      <CardsWrapper
        as={motion.div}
        drag={isFanned ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: "grabbing" }}
        style={{ cursor: isFanned ? "grab" : "default" }}
      >
        {/* Navigation buttons - only show when fanned and have multiple versions */}
        {isFanned && visibleVersions.length > 1 && (
          <>
            <NavigationButton
              $position="left"
              onClick={handlePrevious}
              disabled={activeIndex === 0}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft />
            </NavigationButton>
            <NavigationButton
              $position="right"
              onClick={handleNext}
              disabled={activeIndex === visibleVersions.length - 1}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight />
            </NavigationButton>
          </>
        )}

        <CardsContainer>
          {visibleVersions.map((version, index) => (
            <SummaryPreviewCard
              key={version.id}
              version={version}
              index={index}
              totalCards={visibleVersions.length}
              isFanned={isFanned}
              isHovered={hoveredVersion === version.version}
              isActive={isFanned && index === activeIndex}
              activeIndex={activeIndex}
              isLatest={index === 0}
              onClick={() => onVersionClick?.(version.version)}
              onMouseEnter={() => setHoveredVersion(version.version)}
              onMouseLeave={() => setHoveredVersion(null)}
              currentContent={index === 0 ? currentContent : undefined}
            />
          ))}
        </CardsContainer>

        {/* Version indicator */}
        {isFanned && visibleVersions.length > 1 && (
          <VersionIndicator>
            {activeIndex + 1} / {visibleVersions.length}
          </VersionIndicator>
        )}

        {(hasMoreVersions || isFanned) && (
          <FanToggle
            onClick={onFanToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="fan-toggle-button"
          >
            <Layers size={14} />
            {isFanned ? "Collapse" : `Show all ${versions.length}`}
          </FanToggle>
        )}
      </CardsWrapper>
    </StackContainer>
  );
};

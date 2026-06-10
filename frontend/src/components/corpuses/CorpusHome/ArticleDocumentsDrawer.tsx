import React from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DocumentTableOfContents } from "../DocumentTableOfContents";
import useWindowDimensions from "../../hooks/WindowDimensionHook";

interface ArticleDocumentsDrawerProps {
  corpusId: string;
  open: boolean;
  onClose: () => void;
}

const MOBILE_BREAKPOINT = 600;

export const ArticleDocumentsDrawer: React.FC<ArticleDocumentsDrawerProps> = ({
  corpusId,
  open,
  onClose,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width <= MOBILE_BREAKPOINT;

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <DrawerPanel
            $isMobile={isMobile}
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <DrawerHeader>
              <DrawerTitle>Documents</DrawerTitle>
              <CloseButton onClick={onClose} title="Close">
                <X size={16} />
              </CloseButton>
            </DrawerHeader>
            <DrawerContent>
              <DocumentTableOfContents
                corpusId={corpusId}
                maxDepth={4}
                embedded
              />
            </DrawerContent>
          </DrawerPanel>
        </>
      )}
    </AnimatePresence>
  );
};

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
`;

const DrawerPanel = styled(motion.div)<{ $isMobile: boolean }>`
  position: fixed;
  z-index: 2001;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);

  ${(props) =>
    props.$isMobile
      ? `
    bottom: 0;
    left: 0;
    right: 0;
    height: 85vh;
    border-radius: 16px 16px 0 0;
  `
      : `
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    border-radius: 16px 0 0 16px;
  `}
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
`;

const DrawerTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const DrawerContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 3px;

    &:hover {
      background: #cbd5e1;
    }
  }
`;

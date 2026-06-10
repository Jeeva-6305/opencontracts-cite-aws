import React from "react";
import { motion } from "framer-motion";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../../assets/configurations/osLegalStyles";

export const EmptyStateContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: #6c757d;

  svg {
    color: #adb5bd;
    margin-bottom: 1.5rem;
    stroke-width: 1.5;
  }

  h3 {
    color: ${OS_LEGAL_COLORS.gray700};
    font-size: 1.25rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  p {
    color: ${OS_LEGAL_COLORS.gray500};
    font-size: 0.875rem;
    max-width: 280px;
    line-height: 1.5;
  }
`;

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <EmptyStateContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
  >
    {icon}
    <h3>{title}</h3>
    <p>{description}</p>
  </EmptyStateContainer>
);

import React from "react";
import styled from "styled-components";

import { Spinner } from "@os-legal/ui";

import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

// ─── Message Components ──────────────────────────────────────────────────────

interface MessageProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const MessageBase = styled.div<{
  $bg: string;
  $border: string;
  $color: string;
}>`
  padding: 0.75rem 1rem;
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  color: ${(p) => p.$color};
  font-size: 0.875rem;
`;

const MessageTitle = styled.strong`
  display: block;
  margin-bottom: 0.25rem;
`;

const MessageBody = styled.div`
  margin: 0;
`;

export const ErrorMessage: React.FC<MessageProps> = ({
  title,
  children,
  style,
}) => (
  <MessageBase
    $bg={OS_LEGAL_COLORS.dangerSurface}
    $border={OS_LEGAL_COLORS.dangerBorder}
    $color={OS_LEGAL_COLORS.dangerText}
    style={style}
  >
    {title && <MessageTitle>{title}</MessageTitle>}
    <MessageBody>{children}</MessageBody>
  </MessageBase>
);

export const InfoMessage: React.FC<MessageProps> = ({
  title,
  children,
  style,
}) => (
  <MessageBase
    $bg={OS_LEGAL_COLORS.infoSurface}
    $border={OS_LEGAL_COLORS.infoBorder}
    $color={OS_LEGAL_COLORS.infoText}
    style={style}
  >
    {title && <MessageTitle>{title}</MessageTitle>}
    <MessageBody>{children}</MessageBody>
  </MessageBase>
);

export const WarningMessage: React.FC<MessageProps> = ({
  title,
  children,
  style,
}) => (
  <MessageBase
    $bg={OS_LEGAL_COLORS.warningSurface}
    $border={OS_LEGAL_COLORS.warningBorder}
    $color={OS_LEGAL_COLORS.warningText}
    style={style}
  >
    {title && <MessageTitle>{title}</MessageTitle>}
    <MessageBody>{children}</MessageBody>
  </MessageBase>
);

export const SuccessMessage: React.FC<MessageProps> = ({
  title,
  children,
  style,
}) => (
  <MessageBase
    $bg={OS_LEGAL_COLORS.successSurface}
    $border={OS_LEGAL_COLORS.successBorder}
    $color={OS_LEGAL_COLORS.successText}
    style={style}
  >
    {title && <MessageTitle>{title}</MessageTitle>}
    <MessageBody>{children}</MessageBody>
  </MessageBase>
);

// ─── Loading State ───────────────────────────────────────────────────────────

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
`;

const LoadingText = styled.span`
  margin-top: 0.75rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
`;

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = "md",
  style,
}) => (
  <LoadingContainer role="status" style={style}>
    <Spinner size={size} />
    <LoadingText>{message}</LoadingText>
  </LoadingContainer>
);

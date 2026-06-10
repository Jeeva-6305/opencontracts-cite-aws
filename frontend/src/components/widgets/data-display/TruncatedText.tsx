import React from "react";
import styled from "styled-components";
import { Tooltip } from "@os-legal/ui";

interface TruncatedTextProps {
  text: string;
  limit: number;
  style?: React.CSSProperties;
}

const TextContainer = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`;

const TriggerContainer = styled(TextContainer)`
  cursor: pointer;
`;

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  limit,
  style,
}) => {
  const shouldTruncate = text.length > limit;

  const truncatedText = shouldTruncate
    ? `${text.slice(0, limit).trim()}…`
    : text;

  return shouldTruncate ? (
    <Tooltip content={<div style={{ maxWidth: "400px" }}>{text}</div>}>
      <TriggerContainer style={style}>{truncatedText}</TriggerContainer>
    </Tooltip>
  ) : (
    <TextContainer style={style}>{text}</TextContainer>
  );
};

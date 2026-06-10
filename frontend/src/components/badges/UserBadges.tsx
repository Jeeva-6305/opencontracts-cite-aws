import React from "react";
import { useQuery } from "@apollo/client";
import { Spinner } from "@os-legal/ui";
import styled from "styled-components";
import { ErrorMessage } from "../widgets/feedback";
import { Badge, BadgeData } from "./Badge";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";
import { GradientSegment } from "../layout/SharedSegments";
import {
  GET_USER_BADGES,
  GetUserBadgesInput,
  GetUserBadgesOutput,
} from "../../graphql/queries";

const BadgesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75em;
  padding: 1em;

  @media (max-width: 768px) {
    padding: 0.75em;
    gap: 0.5em;
    justify-content: center;
  }

  @media (max-width: 480px) {
    padding: 0.5em;
    gap: 0.5em;
  }
`;

const StyledSegment = styled(GradientSegment)`
  position: relative;

  @media (max-width: 768px) {
    border-radius: 12px;
    margin: 0.5em 0;
  }

  h3 {
    @media (max-width: 768px) {
      font-size: 1.1em;
      text-align: center;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3em 1em;
  color: ${OS_LEGAL_COLORS.textSecondary};
  font-size: 1.1em;

  @media (max-width: 768px) {
    padding: 2em 1em;
    font-size: 1em;
  }
`;

interface UserBadgesProps {
  userId: string;
  corpusId?: string;
  showTitle?: boolean;
  title?: string;
}

export const UserBadges: React.FC<UserBadgesProps> = ({
  userId,
  corpusId,
  showTitle = true,
  title = "Badges",
}) => {
  const { loading, error, data } = useQuery<
    GetUserBadgesOutput,
    GetUserBadgesInput
  >(GET_USER_BADGES, {
    variables: {
      userId,
      corpusId,
      limit: 100,
    },
    skip: !userId,
  });

  if (loading) {
    return (
      <StyledSegment>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.8)",
            zIndex: 10,
            borderRadius: "16px",
          }}
        >
          <Spinner />
        </div>
        <div style={{ minHeight: "100px" }} />
      </StyledSegment>
    );
  }

  if (error) {
    return (
      <ErrorMessage title="Error loading badges">{error.message}</ErrorMessage>
    );
  }

  const userBadges = data?.userBadges?.edges?.map((edge) => edge.node) || [];

  if (userBadges.length === 0) {
    return (
      <StyledSegment>
        {showTitle && (
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.25rem",
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
        )}
        <EmptyState>No badges earned yet. Keep contributing!</EmptyState>
      </StyledSegment>
    );
  }

  // Transform UserBadgeNode to BadgeData format
  const badgeData: BadgeData[] = userBadges.map((ub) => ({
    id: ub.badge.id,
    name: ub.badge.name,
    description: ub.badge.description,
    icon: ub.badge.icon,
    color: ub.badge.color,
    badgeType: ub.badge.badgeType,
    awardedAt: ub.awardedAt,
    awardedBy: ub.awardedBy,
    corpus: ub.corpus,
  }));

  return (
    <StyledSegment>
      {showTitle && (
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          {title} ({userBadges.length})
        </h3>
      )}
      <BadgesContainer>
        {badgeData.map((badge) => (
          <Badge key={badge.id} badge={badge} size="small" showTooltip={true} />
        ))}
      </BadgesContainer>
    </StyledSegment>
  );
};

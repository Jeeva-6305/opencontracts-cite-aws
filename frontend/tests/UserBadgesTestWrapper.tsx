import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { UserBadges } from "../src/components/badges/UserBadges";
import { GET_USER_BADGES } from "../src/graphql/queries";

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface UserBadgesTestWrapperProps {
  userId: string;
  badges?: BadgeData[];
}

const UserBadgesTestWrapper: React.FC<UserBadgesTestWrapperProps> = ({
  userId,
  badges = [],
}) => {
  const mockBadges = badges.map((badge) => ({
    node: {
      id: `user-badge-${badge.id}`,
      badge: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        badgeType: "GLOBAL",
      },
      awardedAt: "2024-01-15T10:30:00Z",
      awardedBy: null,
      corpus: null,
    },
  }));

  const mocks: ReadonlyArray<MockedResponse> = [
    {
      request: {
        query: GET_USER_BADGES,
        variables: { userId, corpusId: undefined, limit: 100 },
      },
      result: {
        data: {
          userBadges: {
            edges: mockBadges,
          },
        },
      },
    },
  ];

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <UserBadges userId={userId} />
    </MockedProvider>
  );
};

export default UserBadgesTestWrapper;

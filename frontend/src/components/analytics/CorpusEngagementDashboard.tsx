import React from "react";
import { useQuery } from "@apollo/client";
import { Spinner } from "@os-legal/ui";
import {
  TrendingUp,
  MessageCircle,
  MessageSquare,
  ArrowRightLeft,
  Mail,
  CalendarCheck,
  CalendarDays,
  Users,
  UserPlus,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import styled from "styled-components";
import CountUp from "react-countup";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import {
  GET_CORPUS_ENGAGEMENT_METRICS,
  GetCorpusEngagementMetricsOutput,
  GetCorpusEngagementMetricsInput,
  CorpusEngagementMetrics,
} from "../../graphql/queries";
import { MOBILE_VIEW_BREAKPOINT } from "../../assets/configurations/constants";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";
import useWindowDimensions from "../hooks/WindowDimensionHook";

// Map of icon identifiers to lucide-react components
const ICON_MAP: Record<string, LucideIcon> = {
  comments: MessageCircle,
  "comment alternate outline": MessageSquare,
  exchange: ArrowRightLeft,
  envelope: Mail,
  "calendar check": CalendarCheck,
  "calendar alternate outline": CalendarDays,
  users: Users,
  "user plus": UserPlus,
  "thumbs up": ThumbsUp,
  "chart line": TrendingUp,
};

interface CorpusEngagementDashboardProps {
  corpusId: string;
}

const StatisticWithAnimation = ({
  value,
  label,
  icon,
  color,
}: {
  value: number;
  label: string;
  icon: string;
  color?: string;
}) => {
  const IconComponent = ICON_MAP[icon] || TrendingUp;
  return (
    <StatisticWrapper>
      <StatisticIconWrapper
        style={{ color: color || OS_LEGAL_COLORS.primaryBlue }}
      >
        <IconComponent />
      </StatisticIconWrapper>
      <StatisticContent>
        <StatisticValue>
          <CountUp end={value} duration={1.5} />
        </StatisticValue>
        <StatisticLabel>{label}</StatisticLabel>
      </StatisticContent>
    </StatisticWrapper>
  );
};

export const CorpusEngagementDashboard: React.FC<
  CorpusEngagementDashboardProps
> = ({ corpusId }) => {
  const { width } = useWindowDimensions();
  const isMobile = width <= MOBILE_VIEW_BREAKPOINT;

  const { data, loading, error } = useQuery<
    GetCorpusEngagementMetricsOutput,
    GetCorpusEngagementMetricsInput
  >(GET_CORPUS_ENGAGEMENT_METRICS, {
    variables: { corpusId },
    pollInterval: 300000, // Refetch every 5 minutes
  });

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="md" />
        <div
          style={{ marginTop: "0.5rem", color: OS_LEGAL_COLORS.textSecondary }}
        >
          Loading engagement metrics...
        </div>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <AlertBox $variant="error">
          <strong>Error Loading Metrics</strong>
          <p>{error.message}</p>
        </AlertBox>
      </ErrorContainer>
    );
  }

  const metrics = data?.corpus?.engagementMetrics;

  if (!metrics) {
    return (
      <EmptyStateContainer>
        <AlertBox $variant="info">
          <strong>No Engagement Data Available</strong>
          <p>
            Engagement metrics haven't been calculated for this corpus yet. They
            will be available once the background task has run.
          </p>
        </AlertBox>
      </EmptyStateContainer>
    );
  }

  // Prepare data for the activity comparison chart
  const activityData = [
    {
      period: "Last 7 Days",
      messages: metrics.messagesLast7Days,
    },
    {
      period: "Last 30 Days",
      messages: metrics.messagesLast30Days,
    },
  ];

  const lastUpdated = metrics.lastUpdated
    ? new Date(metrics.lastUpdated)
    : new Date();

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>
          <TrendingUp />
          Engagement Analytics
        </Title>
        <LastUpdated>
          Last updated: {format(lastUpdated, "MMM d, yyyy 'at' h:mm a")}
        </LastUpdated>
      </DashboardHeader>

      <Section>
        <SectionTitle>Thread Metrics</SectionTitle>
        <StatsGrid>
          <StatisticWithAnimation
            value={metrics.totalThreads}
            label="Total Threads"
            icon="comments"
            color={OS_LEGAL_COLORS.primaryBlue}
          />
          <StatisticWithAnimation
            value={metrics.activeThreads}
            label="Active Threads"
            icon="comment alternate outline"
            color={OS_LEGAL_COLORS.green}
          />
          <StatisticWithAnimation
            value={
              metrics.avgMessagesPerThread
                ? Math.round(metrics.avgMessagesPerThread * 10) / 10
                : 0
            }
            label="Avg Msgs/Thread"
            icon="exchange"
            color={OS_LEGAL_COLORS.folderIcon}
          />
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Message Activity</SectionTitle>
        <StatsGrid>
          <StatisticWithAnimation
            value={metrics.totalMessages}
            label="Total Messages"
            icon="envelope"
            color={OS_LEGAL_COLORS.chartPurple}
          />
          <StatisticWithAnimation
            value={metrics.messagesLast7Days}
            label="Last 7 Days"
            icon="calendar check"
            color={OS_LEGAL_COLORS.greenMedium}
          />
          <StatisticWithAnimation
            value={metrics.messagesLast30Days}
            label="Last 30 Days"
            icon="calendar alternate outline"
            color={OS_LEGAL_COLORS.primaryBlue}
          />
        </StatsGrid>

        <ChartContainer>
          <ChartTitle>Message Activity Comparison</ChartTitle>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <BarChart data={activityData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={OS_LEGAL_COLORS.border}
              />
              <XAxis dataKey="period" stroke={OS_LEGAL_COLORS.textSecondary} />
              <YAxis stroke={OS_LEGAL_COLORS.textSecondary} />
              <Tooltip
                contentStyle={{
                  background: OS_LEGAL_COLORS.surface,
                  border: `1px solid ${OS_LEGAL_COLORS.border}`,
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="messages"
                fill={OS_LEGAL_COLORS.primaryBlue}
                name="Messages"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Section>

      <Section>
        <SectionTitle>Community Engagement</SectionTitle>
        <StatsGrid>
          <StatisticWithAnimation
            value={metrics.uniqueContributors}
            label="All Contributors"
            icon="users"
            color={OS_LEGAL_COLORS.chartPink}
          />
          <StatisticWithAnimation
            value={metrics.activeContributors30Days}
            label="Active (30d)"
            icon="user plus"
            color={OS_LEGAL_COLORS.chartTeal}
          />
          <StatisticWithAnimation
            value={metrics.totalUpvotes}
            label="Total Upvotes"
            icon="thumbs up"
            color={OS_LEGAL_COLORS.folderIcon}
          />
        </StatsGrid>
      </Section>
    </DashboardContainer>
  );
};

// Styled Components

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 1rem 0.75rem;
  background: ${OS_LEGAL_COLORS.surface};
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    padding: 2rem;
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${OS_LEGAL_COLORS.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;

  svg {
    color: ${OS_LEGAL_COLORS.primaryBlue};
    width: 24px;
    height: 24px;
  }

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    font-size: 2rem;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.875rem;
  color: ${OS_LEGAL_COLORS.textSecondary};
  font-style: italic;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid ${OS_LEGAL_COLORS.border};

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    font-size: 1.25rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  width: 100%;
  margin-bottom: 1rem;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
`;

const StatisticWrapper = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: ${OS_LEGAL_COLORS.surfaceHover};
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  }

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem 1rem;
  }
`;

const StatisticIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 1rem 0 0;
  opacity: 0.8;

  svg {
    width: 1.75rem;
    height: 1.75rem;
  }

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    margin: 0 0 0.75rem 0;

    svg {
      width: 2.5rem;
      height: 2.5rem;
    }
  }
`;

const AlertBox = styled.div<{ $variant: "error" | "info" }>`
  padding: 1rem 1.5rem;
  border-radius: 8px;
  background: ${(props) =>
    props.$variant === "error"
      ? OS_LEGAL_COLORS.dangerSurfaceHover
      : OS_LEGAL_COLORS.blueSurface};
  border: 1px solid
    ${(props) =>
      props.$variant === "error"
        ? OS_LEGAL_COLORS.dangerBorder
        : OS_LEGAL_COLORS.blueBorder};
  color: ${(props) =>
    props.$variant === "error"
      ? OS_LEGAL_COLORS.dangerText
      : OS_LEGAL_COLORS.blueDark};

  strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  p {
    margin: 0;
  }
`;

const StatisticContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatisticValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textPrimary};
  line-height: 1.2;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    font-size: 2.25rem;
    margin-bottom: 0.25rem;
  }
`;

const StatisticLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${OS_LEGAL_COLORS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    font-size: 0.875rem;
  }
`;

const ChartContainer = styled.div`
  background: ${OS_LEGAL_COLORS.surface};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    padding: 1.5rem;
  }
`;

const ChartTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${OS_LEGAL_COLORS.textTertiary};
  margin: 0 0 1rem 0;

  @media (min-width: ${MOBILE_VIEW_BREAKPOINT}px) {
    font-size: 1.125rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
`;

const ErrorContainer = styled.div`
  padding: 2rem;
  max-width: 600px;
  margin: 2rem auto;
`;

const EmptyStateContainer = styled.div`
  padding: 2rem;
  max-width: 600px;
  margin: 2rem auto;
`;

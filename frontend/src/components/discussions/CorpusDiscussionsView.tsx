import React, { useState, useMemo, useCallback } from "react";
import { useReactiveVar, useQuery } from "@apollo/client";
import { useAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  MessageSquare,
  Plus,
  Search,
  Shield,
  HelpCircle,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import {
  authToken,
  openedCorpus,
  selectedThreadId as selectedThreadIdVar,
} from "../../graphql/cache";
import { getPermissions } from "../../utils/transform";
import { updateThreadParam } from "../../utils/navigationUtils";
import { PermissionTypes } from "../types";
import { ThreadList } from "../threads/ThreadList";
import { CreateThreadForm } from "../threads/CreateThreadForm";
import { ThreadDetailWithContext } from "../threads/ThreadDetailWithContext";
import { ThreadSearch } from "../search/ThreadSearch";
import { ModerationDashboard } from "../moderation";
import { ThreadFilterToggles } from "../threads/ThreadFilterToggles";
import {
  CORPUS_COLORS,
  CORPUS_FONTS,
  CORPUS_RADII,
  CORPUS_TRANSITIONS,
  mediaQuery,
} from "../threads/styles/discussionStyles";
import {
  OS_LEGAL_COLORS,
  accentAlpha,
} from "../../assets/configurations/osLegalStyles";
import { threadSortAtom, ThreadSortOption } from "../../atoms/threadAtoms";
import {
  GET_CONVERSATIONS,
  GetConversationsInputs,
  GetConversationsOutputs,
} from "../../graphql/queries";
import {
  inferDiscussionCategory,
  DiscussionCategory,
} from "../threads/DiscussionTypeBadge";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${OS_LEGAL_COLORS.background};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: ${CORPUS_COLORS.white};
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  gap: 1rem;

  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
    flex-wrap: wrap;
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`;

const Breadcrumb = styled.div`
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  color: ${CORPUS_COLORS.slate[500]};
  white-space: nowrap;

  a {
    color: ${CORPUS_COLORS.slate[500]};
    text-decoration: none;
    transition: color ${CORPUS_TRANSITIONS.fast};

    &:hover {
      color: ${CORPUS_COLORS.teal[700]};
      text-decoration: underline;
    }
  }

  span {
    margin: 0 0.375rem;
  }
`;

const Title = styled.h1`
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 24px;
  font-weight: 400;
  color: ${OS_LEGAL_COLORS.accent};
  margin: 0;
`;

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: ${CORPUS_RADII.md};
  background: linear-gradient(
    135deg,
    ${CORPUS_COLORS.teal[600]} 0%,
    ${CORPUS_COLORS.teal[700]} 100%
  );
  color: ${CORPUS_COLORS.white};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.normal};
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 4px 12px ${accentAlpha(0.35)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px ${accentAlpha(0.45)};
  }

  &:disabled {
    background: ${CORPUS_COLORS.slate[300]};
    cursor: not-allowed;
    opacity: 0.7;
    box-shadow: none;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }

  ${mediaQuery.mobile} {
    padding: 0.5rem;
    span {
      display: none;
    }
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 2rem;
  background: ${CORPUS_COLORS.white};
  border-bottom: 1px solid ${CORPUS_COLORS.slate[200]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 0.625rem 1rem;
    gap: 0.5rem;
  }
`;

const FilterPills = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
`;

const FilterPill = styled.button<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid
    ${(props) =>
      props.$isActive ? CORPUS_COLORS.teal[500] : CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.full};
  background: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[600] : CORPUS_COLORS.white};
  color: ${(props) =>
    props.$isActive ? CORPUS_COLORS.white : CORPUS_COLORS.slate[600]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[400]};
    background: ${(props) =>
      props.$isActive ? CORPUS_COLORS.teal[700] : CORPUS_COLORS.teal[50]};
    color: ${(props) =>
      props.$isActive ? CORPUS_COLORS.white : CORPUS_COLORS.teal[700]};
  }

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const FilterCount = styled.span<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  border-radius: ${CORPUS_RADII.full};
  background: ${(props) =>
    props.$isActive ? "rgba(255,255,255,0.25)" : CORPUS_COLORS.slate[100]};
  font-size: 0.625rem;
  font-weight: 600;
`;

const ToolbarDivider = styled.div`
  width: 1px;
  height: 1.5rem;
  background: ${CORPUS_COLORS.slate[200]};
  margin: 0 0.25rem;

  ${mediaQuery.mobile} {
    display: none;
  }
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
  min-width: 9.375rem;
  max-width: 17.5rem;

  svg {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0.875rem;
    height: 0.875rem;
    color: ${CORPUS_COLORS.slate[400]};
  }

  input {
    width: 100%;
    padding: 0.375rem 0.75rem 0.375rem 2rem;
    border: 1px solid ${CORPUS_COLORS.slate[200]};
    border-radius: ${CORPUS_RADII.md};
    background: ${CORPUS_COLORS.white};
    font-family: ${CORPUS_FONTS.sans};
    font-size: 0.8125rem;
    color: ${CORPUS_COLORS.slate[800]};
    transition: all ${CORPUS_TRANSITIONS.fast};

    &:focus {
      outline: none;
      border-color: ${CORPUS_COLORS.teal[500]};
      box-shadow: 0 0 0 3px ${CORPUS_COLORS.teal[50]};
    }

    &::placeholder {
      color: ${CORPUS_COLORS.slate[400]};
    }
  }

  ${mediaQuery.mobile} {
    max-width: none;
    flex-basis: 100%;
    order: 10;
  }
`;

const SortDropdown = styled.select`
  padding: 0.375rem 1.75rem 0.375rem 0.625rem;
  border: 1px solid ${CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${CORPUS_COLORS.white}
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238C96A3' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.8125rem;
  color: ${CORPUS_COLORS.slate[700]};
  cursor: pointer;
  appearance: none;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:focus {
    outline: none;
    border-color: ${CORPUS_COLORS.teal[500]};
  }

  &:hover {
    border-color: ${CORPUS_COLORS.slate[300]};
  }
`;

const TabGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;

  ${mediaQuery.mobile} {
    margin-left: 0;
  }
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid
    ${(props) =>
      props.$isActive ? CORPUS_COLORS.teal[500] : CORPUS_COLORS.slate[200]};
  border-radius: ${CORPUS_RADII.md};
  background: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[50] : CORPUS_COLORS.white};
  color: ${(props) =>
    props.$isActive ? CORPUS_COLORS.teal[700] : CORPUS_COLORS.slate[500]};
  font-family: ${CORPUS_FONTS.sans};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all ${CORPUS_TRANSITIONS.fast};

  &:hover {
    border-color: ${CORPUS_COLORS.teal[400]};
    color: ${CORPUS_COLORS.teal[700]};
    background: ${CORPUS_COLORS.teal[50]};
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0;
`;

type CategoryFilter = "all" | DiscussionCategory;

interface CorpusDiscussionsViewProps {
  corpusId: string;
  /** When true, hides the built-in header (for embedding in corpus tabs) */
  hideHeader?: boolean;
}

/**
 * CorpusDiscussionsView - Container for corpus discussion threads
 *
 * Redesigned to match GitHub Discussions-style layout with:
 * - Stats bar showing discussion counts
 * - Category filter pills (All, Questions, Ideas, Help)
 * - Search input
 * - Sort dropdown
 * - Moderation dashboard tab for moderators
 */
export const CorpusDiscussionsView: React.FC<CorpusDiscussionsViewProps> = ({
  corpusId,
  hideHeader = false,
}) => {
  const corpus = useReactiveVar(openedCorpus);
  const token = useReactiveVar(authToken);
  const isAuthenticated = Boolean(token);
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "search" | "moderation">(
    "list"
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useAtom(threadSortAtom);

  // Track selected thread from URL-driven reactive var (?thread= param)
  // CentralRouteManager Phase 2 reads ?thread= and sets selectedThreadIdVar
  const currentThreadId = useReactiveVar(selectedThreadIdVar);
  const inThreadView = currentThreadId !== null;

  // Fetch all threads for stats calculation
  const { data: threadsData } = useQuery<
    GetConversationsOutputs,
    GetConversationsInputs
  >(GET_CONVERSATIONS, {
    variables: {
      corpusId,
      conversationType: "THREAD",
      limit: 100, // Fetch more for accurate stats
    },
    fetchPolicy: "cache-and-network",
  });

  // Calculate category counts for filter pills
  const stats = useMemo(() => {
    const threads =
      threadsData?.conversations?.edges
        ?.map((e) => e?.node)
        .filter((n): n is NonNullable<typeof n> => n != null && !n.deletedAt) ||
      [];

    const categoryCounts: Record<DiscussionCategory, number> = {
      question: 0,
      idea: 0,
      help: 0,
      answered: 0,
    };

    threads.forEach((thread) => {
      const category = inferDiscussionCategory(
        thread.title || "",
        thread.description
      );
      categoryCounts[category]++;
    });

    return {
      total: threads.length,
      categories: categoryCounts,
    };
  }, [threadsData]);

  // Check if current user can moderate this corpus
  const canModerate = useMemo(() => {
    if (!corpus) return false;

    const rawPermissions = corpus.myPermissions as unknown as string[];
    const permissions = getPermissions(rawPermissions);

    const hasUpdate = permissions.includes(PermissionTypes.CAN_UPDATE);
    const hasPermission = permissions.includes(PermissionTypes.CAN_PERMISSION);

    return hasUpdate || hasPermission;
  }, [corpus]);

  // Handle thread click - update URL to show thread inline
  // CentralRouteManager will sync ?thread= to selectedThreadIdVar
  const handleThreadClick = useCallback(
    (threadId: string) => {
      updateThreadParam(location, navigate, threadId);
    },
    [location, navigate]
  );

  // Handle back from thread detail by clearing the ?thread= param.
  // Uses replace semantics so the thread-detail entry is removed from history,
  // avoiding double entries. This is also safe for direct-link navigation
  // (e.g., from a notification) where navigate(-1) would leave the corpus.
  const handleBackToList = useCallback(() => {
    updateThreadParam(location, navigate, null, { replace: true });
  }, [location, navigate]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleCategoryChange = useCallback((category: CategoryFilter) => {
    setCategoryFilter(category);
  }, []);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as ThreadSortOption);
    },
    [setSortBy]
  );

  if (!corpus) {
    return (
      <Container>
        <p style={{ padding: "2rem", color: CORPUS_COLORS.slate[500] }}>
          Loading corpus...
        </p>
      </Container>
    );
  }

  // If a thread is selected (via URL ?thread= param), show it inline with context sidebar
  if (inThreadView && currentThreadId) {
    return (
      <Container>
        <ThreadDetailWithContext
          conversationId={currentThreadId}
          corpusId={corpusId}
          onBack={handleBackToList}
        />
      </Container>
    );
  }

  return (
    <Container>
      {/* Compact Header: Breadcrumb + Title + Create button (hidden when embedded) */}
      {!hideHeader && (
        <Header>
          <TitleSection>
            <Breadcrumb>
              <a href="/corpuses">Corpuses</a>
              <span>/</span>
              <a href={`/c/${corpus.creator?.slug}/${corpus.slug}`}>
                {corpus.title}
              </a>
            </Breadcrumb>
            <Title>Discussions</Title>
          </TitleSection>
          {isAuthenticated && (
            <CreateButton
              onClick={() => setShowCreateModal(true)}
              aria-label="Create new discussion"
            >
              <Plus />
              <span>New Discussion</span>
            </CreateButton>
          )}
        </Header>
      )}

      {/* Single Toolbar: Category filters + Search + Sort + Tabs */}
      <Toolbar>
        {/* Create button when header is hidden (embedded mode) */}
        {hideHeader && isAuthenticated && (
          <CreateButton
            onClick={() => setShowCreateModal(true)}
            aria-label="Create new discussion"
          >
            <Plus />
            <span>New</span>
          </CreateButton>
        )}

        {/* Category filter pills */}
        <FilterPills>
          <FilterPill
            $isActive={categoryFilter === "all"}
            onClick={() => handleCategoryChange("all")}
          >
            All
            <FilterCount $isActive={categoryFilter === "all"}>
              {stats.total}
            </FilterCount>
          </FilterPill>
          <FilterPill
            $isActive={categoryFilter === "question"}
            onClick={() => handleCategoryChange("question")}
          >
            <HelpCircle />
            <FilterCount $isActive={categoryFilter === "question"}>
              {stats.categories.question}
            </FilterCount>
          </FilterPill>
          <FilterPill
            $isActive={categoryFilter === "idea"}
            onClick={() => handleCategoryChange("idea")}
          >
            <Lightbulb />
            <FilterCount $isActive={categoryFilter === "idea"}>
              {stats.categories.idea}
            </FilterCount>
          </FilterPill>
          <FilterPill
            $isActive={categoryFilter === "help"}
            onClick={() => handleCategoryChange("help")}
          >
            <AlertCircle />
            <FilterCount $isActive={categoryFilter === "help"}>
              {stats.categories.help}
            </FilterCount>
          </FilterPill>
        </FilterPills>

        <ToolbarDivider />

        {/* Search */}
        <SearchInput>
          <Search />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search discussions"
          />
        </SearchInput>

        {/* Sort */}
        <SortDropdown
          aria-label="Sort discussions"
          value={sortBy}
          onChange={handleSortChange}
        >
          <option value="pinned">Pinned First</option>
          <option value="active">Recent Activity</option>
          <option value="newest">Newest</option>
          <option value="upvoted">Most Upvoted</option>
        </SortDropdown>

        {/* Moderator filter toggles */}
        {canModerate && activeTab === "list" && (
          <>
            <ToolbarDivider />
            <ThreadFilterToggles showModeratorFilters />
          </>
        )}

        {/* Tab buttons (moderators see all three, others see none - just list) */}
        {canModerate && (
          <TabGroup>
            <TabButton
              $isActive={activeTab === "list"}
              onClick={() => setActiveTab("list")}
              type="button"
              aria-label="View all threads"
            >
              <MessageSquare />
              Threads
            </TabButton>
            <TabButton
              $isActive={activeTab === "search"}
              onClick={() => setActiveTab("search")}
              type="button"
              aria-label="Advanced search"
            >
              <Search />
              Search
            </TabButton>
            <TabButton
              $isActive={activeTab === "moderation"}
              onClick={() => setActiveTab("moderation")}
              type="button"
              aria-label="Moderation dashboard"
            >
              <Shield />
              Moderate
            </TabButton>
          </TabGroup>
        )}
      </Toolbar>

      {/* Content */}
      <ContentContainer>
        {activeTab === "list" && (
          <ThreadList
            corpusId={corpusId}
            embedded
            onThreadClick={handleThreadClick}
            showModeratorFilters={false}
            searchQuery={searchQuery}
            showCreateButton={false}
            categoryFilter={categoryFilter}
          />
        )}
        {activeTab === "search" && <ThreadSearch corpusId={corpusId} />}
        {activeTab === "moderation" && canModerate && (
          <ModerationDashboard
            corpusId={corpusId}
            corpusTitle={corpus?.title}
          />
        )}
      </ContentContainer>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <CreateThreadForm
          corpusId={corpusId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(threadId) => {
            setShowCreateModal(false);
            handleThreadClick(threadId);
          }}
        />
      )}
    </Container>
  );
};

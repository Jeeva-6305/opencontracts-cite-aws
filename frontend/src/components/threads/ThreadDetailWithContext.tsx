/**
 * ThreadDetailWithContext - Wrapper that combines ThreadDetail with CorpusContextSidebar
 *
 * Used when viewing thread details inline within the Discussions tab.
 * Provides a two-column layout on larger screens:
 * - Left: Thread detail with compact mode and back navigation
 * - Right: Corpus context sidebar (collapsible on medium screens, hidden on small)
 */

import React, { useRef, useEffect } from "react";

import { ThreadDetail } from "./ThreadDetail";
import { CorpusContextSidebar } from "./CorpusContextSidebar";
import {
  ThreadWithContextContainer,
  ThreadDetailPane,
  VerticalDivider,
} from "./styles/contextSidebarStyles";

interface ThreadDetailWithContextProps {
  /** The conversation/thread ID to display */
  conversationId: string;
  /** The corpus ID for context sidebar */
  corpusId: string;
  /** Callback when back button is clicked - returns to thread list */
  onBack: () => void;
}

/**
 * ThreadDetailWithContext - Thread detail view with corpus context sidebar
 *
 * Layout:
 * - Screen >= 1200px: Thread detail + expanded sidebar (320px)
 * - Screen 1024-1199px: Thread detail + collapsible sidebar (48px collapsed)
 * - Screen < 1024px: Thread detail only (sidebar hidden)
 */
export const ThreadDetailWithContext: React.FC<
  ThreadDetailWithContextProps
> = ({ conversationId, corpusId, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus management: move focus to thread detail container when mounted
  // This helps screen reader users understand the view has changed
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      containerRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [conversationId]);

  return (
    <ThreadWithContextContainer
      ref={containerRef}
      tabIndex={-1}
      role="region"
      aria-label="Thread detail view"
    >
      <ThreadDetailPane>
        <ThreadDetail
          conversationId={conversationId}
          corpusId={corpusId}
          compact
          onBack={onBack}
        />
      </ThreadDetailPane>

      <VerticalDivider />

      <CorpusContextSidebar corpusId={corpusId} />
    </ThreadWithContextContainer>
  );
};

export default ThreadDetailWithContext;

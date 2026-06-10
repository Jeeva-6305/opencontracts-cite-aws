# PDF Search Flow Documentation

**Last Updated**: 2026-01-09

## Overview
The search functionality in the document knowledge base allows users to search text within PDF documents and highlights matching results. Here's how the search flow works.

## Component Flow

### 1. User Input Entry
- Search can be initiated through multiple entry points:
  - The [`SearchSidebarWidget`](../../../../../frontend/src/components/annotator/search_widget/SearchSidebarWidget.tsx) component
  - The unified [`FloatingDocumentInput`](../../../../../frontend/src/components/knowledge_base/document/FloatingDocumentInput.tsx) component
- User input is managed through controlled input with debouncing

### 2. State Management
- Search text is stored in Jotai atoms defined in [`DocumentAtom.tsx`](../../../../../frontend/src/components/annotator/context/DocumentAtom.tsx):
  - `textSearchStateAtom` - stores matches and selected index
  - `searchTextAtom` - stores the current search text

### 3. Search Processing
- The search text is processed to find matching tokens in the PDF document
- Matches are converted into `TextSearchTokenResult` objects containing:
  - Token IDs
  - Page numbers
  - Bounding box coordinates
  - Match metadata
- The `useTextSearch()` hook must be called in `DocumentKnowledgeBase` for search processing to work

### 4. Result Rendering
Results are rendered through a chain of components:

1. [`SearchResult`](../../../../../frontend/src/components/annotator/display/components/SearchResult.tsx) - Renders both the highlight boundary and tokens

2. [`ResultBoundary`](../../../../../frontend/src/components/annotator/display/components/ResultBoundary.tsx) - Creates the yellow highlight box around matched text

3. [`SearchSelectionTokens`](../../../../../frontend/src/components/annotator/display/components/SelectionTokens.tsx) - Renders individual token highlights

### 5. Visual Styling
- Matched text is highlighted using styled components
- See [`TokenSpan`](../../../../../frontend/src/components/annotator/display/components/Tokens.tsx) for the styling implementation

### 6. Integration with Unified Feed
- Search results can also be displayed in the [`UnifiedContentFeed`](../../../../../frontend/src/components/knowledge_base/document/unified_feed/UnifiedContentFeed.tsx) when in feed mode
- The feed shows search results alongside annotations, notes, and relationships
- Clicking a search result in the feed navigates to that location in the document

## Key Features
- Debounced search input to prevent performance issues
- Token-based highlighting for precise text matching
- Visual feedback through highlighting and boundaries
- Support for scrolling to matches
- State management through Jotai atoms
- Integration with unified content feed
- Multiple entry points for search functionality

## Technical Notes
- Search highlights are rendered as absolutely positioned spans on top of the PDF
- Tokens use pointer-events: none to allow interaction with underlying PDF
- Results include both boundary boxes and individual token highlights for visual clarity
- Search state is managed globally through Jotai atoms for consistent access across components
- The PDF virtualization system ensures search result pages are always rendered when active

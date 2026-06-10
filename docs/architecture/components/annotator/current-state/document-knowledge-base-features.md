# DocumentKnowledgeBase Advanced Features

**Last Updated**: 2026-01-09

This document details the advanced features implemented in [`DocumentKnowledgeBase.tsx`](../../../../../frontend/src/components/knowledge_base/document/DocumentKnowledgeBase.tsx) that extend beyond basic PDF annotation functionality.

## Table of Contents

1. [Dual-Layer Architecture](#dual-layer-architecture)
2. [Unified Content Feed](#unified-content-feed)
3. [Summary Version History](#summary-version-history)
4. [Resizable Panel System](#resizable-panel-system)
5. [Floating UI Components](#floating-ui-components)
6. [Tab Navigation System](#tab-navigation-system)
7. [Note Management](#note-management)
8. [Integration Points](#integration-points)

## Dual-Layer Architecture

The DocumentKnowledgeBase implements a sophisticated dual-layer system that allows users to switch between two distinct viewing modes:

### Document Layer
The traditional annotation-focused view that includes:
- PDF/text document rendering with virtualization
- Annotation creation, editing, and filtering
- Search functionality with text highlighting
- Extract and analysis results display
- Real-time collaboration features

### Knowledge Layer
A summary-focused view designed for knowledge synthesis:
- Markdown-based document summaries
- Version history with Git-like branching
- Rich text editing capabilities
- Author attribution and timestamps
- Clean reading experience without distractions

### Layer Switching Logic

The system intelligently switches layers based on context:
- Selecting an annotation switches to document layer
- Clicking summary tab switches to knowledge layer
- Some sidebar modes (like chat) maintain the current layer

See the layer state management in [`DocumentKnowledgeBase.tsx`](../../../../../frontend/src/components/knowledge_base/document/DocumentKnowledgeBase.tsx).

## Unified Content Feed

The unified feed system ([`UnifiedContentFeed`](../../../../../frontend/src/components/knowledge_base/document/unified_feed/UnifiedContentFeed.tsx)) provides a consolidated view of all document-related content.

### Features
- **Multi-content type support**: Notes, annotations, relationships, search results
- **Advanced filtering**: Filter by content type, structural annotations, relationship types
- **Flexible sorting**: By page order or chronological order
- **Real-time updates**: Content updates immediately when changes occur
- **Consistent UI**: Unified interaction patterns across content types

### Sidebar View Modes

The sidebar uses a `SidebarViewMode` type (defined in [`types.ts`](../../../../../frontend/src/components/knowledge_base/document/unified_feed/types.ts)) with these modes:
- `chat` - AI chat interface
- `feed` - Unified content feed
- `extract` - Extract results view
- `analysis` - Analysis results view
- `discussions` - Document discussions/threads

### Control Bar
The [`SidebarControlBar`](../../../../../frontend/src/components/knowledge_base/document/unified_feed/SidebarControlBar.tsx) provides UI controls for:
- Switching between chat and feed modes
- Managing content filters
- Changing sort order
- Indicating active search state

## Summary Version History

The summary versioning system provides Git-like version control for document summaries.

### Core Features
- **Version tracking**: Each edit creates a new version with incrementing numbers
- **Author attribution**: Tracks who made each change with email and timestamp
- **Content snapshots**: Full content stored for each version
- **Diff generation**: Changes tracked between versions
- **Version browsing**: UI to view and switch between versions

### Implementation

The `useSummaryVersions` hook manages version state. See usage in [`DocumentKnowledgeBase.tsx`](../../../../../frontend/src/components/knowledge_base/document/DocumentKnowledgeBase.tsx).

### Version History UI
- Collapsible sidebar showing all versions
- Visual indicators for current version
- Metadata display (author, timestamp)
- One-click version switching
- Warning when viewing historical versions

Related components:
- [`SummaryHistoryModal`](../../../../../frontend/src/components/knowledge_base/document/floating_summary_preview/SummaryHistoryModal.tsx)
- [`SummaryVersionStack`](../../../../../frontend/src/components/knowledge_base/document/floating_summary_preview/SummaryVersionStack.tsx)

## Resizable Panel System

The chat panel implements sophisticated width management via the `useChatPanelWidth` hook (defined in [`UISettingsAtom.tsx`](../../../../../frontend/src/components/annotator/context/UISettingsAtom.tsx)).

### Width Modes
- **Quarter** (25%): Compact view for minimal distraction
- **Half** (50%): Standard balanced view
- **Full** (90%): Wide view for detailed chat conversations
- **Custom**: User-defined width via drag handle

### Auto-minimize Behavior
- Panel minimizes when user hovers over document
- Restores when hovering back over panel
- Can be toggled on/off via settings menu
- Smooth animations for all transitions

### Resize Handle Implementation
- Drag handle for manual resizing
- Snap-to-preset functionality
- Real-time width preview during drag
- Persistent width preferences

## Floating UI Components

Several floating components enhance the user experience:

### FloatingSummaryPreview
**Source**: [`FloatingSummaryPreview.tsx`](../../../../../frontend/src/components/knowledge_base/document/floating_summary_preview/FloatingSummaryPreview.tsx)

Picture-in-picture style preview that:
- Shows summary while in document layer
- Allows quick context switching
- Expandable/collapsible design
- Real-time content updates
- Smart positioning to avoid overlap

### FloatingDocumentControls
**Source**: [`FloatingDocumentControls.tsx`](../../../../../frontend/src/components/knowledge_base/document/FloatingDocumentControls.tsx)

Contextual action buttons that:
- Float over the document
- Show/hide based on current layer
- Provide quick access to common actions
- Maintain consistent positioning

### FloatingDocumentInput
**Source**: [`FloatingDocumentInput.tsx`](../../../../../frontend/src/components/knowledge_base/document/FloatingDocumentInput.tsx)

Unified input for chat and search:
- Toggle between chat and search modes
- Submit messages directly to chat
- Quick search functionality
- Keyboard shortcuts support

### ZoomControls
**Source**: [`ZoomControls.tsx`](../../../../../frontend/src/components/knowledge_base/document/ZoomControls.tsx)

Simple zoom interface:
- Zoom in/out buttons
- Current zoom level display
- Smooth zoom transitions
- Keyboard shortcuts (Ctrl +/-)

## Sidebar Navigation System

The sidebar implements a mode-based navigation system using `SidebarViewMode` (defined in [`types.ts`](../../../../../frontend/src/components/knowledge_base/document/unified_feed/types.ts)).

### Available Modes
- `chat` - AI chat interface
- `feed` - Unified content feed with notes, annotations, relationships
- `extract` - Extract results view (when an extract is selected)
- `analysis` - Analysis results view (when an analysis is selected)
- `discussions` - Document discussions/threads

### Features
- **Layer-aware modes**: Some modes may only be relevant in specific layers
- **Collapsible sidebar**: Hover to expand, auto-collapse when not in use
- **Visual feedback**: Active mode highlighting and hover effects
- **Smart panel management**: Right panel shows/hides based on mode selection
- **Auto-switching**: Mode automatically switches when selecting extracts/analyses

## Note Management

The note system provides rich functionality for document annotations.

### Components
- [`NoteModal`](../../../../../frontend/src/components/knowledge_base/document/StickyNotes.tsx) - View/edit individual notes
- [`NoteEditor`](../../../../../frontend/src/components/knowledge_base/document/NoteEditor.tsx) - Rich text editing interface
- [`NewNoteModal`](../../../../../frontend/src/components/knowledge_base/document/NewNoteModal.tsx) - Note creation interface
- [`SafeMarkdown`](../../../../../frontend/src/components/knowledge_base/markdown/SafeMarkdown.tsx) - Safe markdown rendering

### Features
- Markdown content support via `SafeMarkdown`
- Double-click to edit functionality
- Author and timestamp tracking
- Visual sticky note aesthetic
- Smooth animations and transitions

## Integration Points

### GraphQL Data Loading
The component uses the `GET_DOCUMENT_KNOWLEDGE_AND_ANNOTATIONS` query to load all necessary data. See the query definition in [`queries.ts`](../../../../../frontend/src/graphql/queries.ts).

### URL Synchronization
- Annotation selection synced with URL parameters
- Deep linking support for specific annotations
- Browser back/forward navigation support

### Global State Updates
- Updates Jotai atoms for application-wide state
- Maintains cache consistency
- Triggers re-renders only where necessary

### Permission Management
- Integrates with permission system
- Shows/hides features based on user rights
- Graceful degradation for limited permissions

This architecture creates a comprehensive document management system that goes beyond simple PDF annotation, providing rich knowledge management capabilities while maintaining high performance and user experience standards.

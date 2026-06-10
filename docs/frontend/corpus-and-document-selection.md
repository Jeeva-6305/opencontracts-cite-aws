# Frontend: Corpus and Document Selection

**Last Updated:** 2026-01-09

This document explains how corpus and document selection works in the frontend, including URL routing, state synchronization, and how components consume selection state.

For the complete routing system architecture, see [routing_system.md](routing_system.md).

---

## Overview

OpenContracts uses a **centralized routing architecture** where `CentralRouteManager` is the single source of truth for all URL-to-state synchronization. Components are "dumb consumers" that read reactive variables and never manipulate routing state directly.

### Key Principles

1. **URL is the source of truth** - All selection state is encoded in the URL
2. **CentralRouteManager owns all routing state** - Only this component sets entity reactive vars
3. **Components read, never write** - Use `useReactiveVar()` to read, URL utilities to update
4. **Slug-based URLs** - SEO-friendly paths with automatic ID-to-slug redirection

---

## URL Patterns

### Entity Routes

| Pattern | Example | Purpose |
|---------|---------|---------|
| `/c/:userIdent/:corpusIdent` | `/c/john/my-corpus` | Open corpus |
| `/d/:userIdent/:docIdent` | `/d/john/my-document` | Open standalone document |
| `/d/:userIdent/:corpusIdent/:docIdent` | `/d/john/my-corpus/doc` | Open document within corpus context |
| `/e/:userIdent/:extractIdent` | `/e/john/extract-123` | Open extract |
| `/c/:userIdent/:corpusIdent/discussions/:threadId` | `/c/john/corpus/discussions/thread-1` | Open thread in corpus |

### Query Parameters

Selection and visualization state is encoded in query parameters:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `?ann=` | Selected annotation IDs | `?ann=123,456` |
| `?analysis=` | Selected analysis IDs | `?analysis=789` |
| `?extract=` | Selected extract IDs | `?extract=101` |
| `?folder=` | Filter by folder in corpus | `?folder=folder-123` |
| `?tab=` | Active tab | `?tab=discussions` |
| `?thread=` | Sidebar thread selection | `?thread=thread-456` |
| `?message=` | Highlight specific message | `?message=msg-789` |
| `?homeView=` | Corpus home view (about/toc) | `?homeView=toc` |
| `?structural=` | Show structural annotations | `?structural=true` |
| `?selectedOnly=` | Show only selected annotation | `?selectedOnly=true` |
| `?boundingBoxes=` | Show bounding boxes | `?boundingBoxes=true` |
| `?labels=` | Label display mode | `?labels=ALWAYS` |

---

## State Flow Architecture

The routing system operates in four phases, all handled by CentralRouteManager:

```
URL Change → Phase 1: Parse Path → Phase 2: Parse Query Params
                ↓                          ↓
          Entity Resolution          Reactive Var Updates
                ↓                          ↓
          openedCorpus()            selectedAnnotationIds()
          openedDocument()          showStructuralAnnotations()
          openedExtract()           etc.
          openedThread()
                ↓
          Phase 3: Canonical Redirect (if needed)
                ↓
          Phase 4: Sync Reactive Vars → URL (bidirectional)
```

### Reactive Variables

**Entity State** (set by Phase 1):
- `openedCorpus` - Currently opened corpus object
- `openedDocument` - Currently opened document object
- `openedExtract` - Currently opened extract object
- `openedThread` - Currently opened thread object

**Selection State** (set by Phase 2, synced by Phase 4):
- `selectedAnnotationIds` - Selected annotation IDs
- `selectedAnalysesIds` - Selected analysis IDs
- `selectedExtractIds` - Selected extract IDs
- `selectedFolderId` - Selected folder within corpus
- `selectedTab` - Active tab
- `selectedThreadId` - Thread selected in sidebar
- `selectedMessageId` - Message to highlight

**Visualization State** (set by Phase 2, synced by Phase 4):
- `showStructuralAnnotations` - Show structural annotations
- `showSelectedAnnotationOnly` - Show only selected annotation
- `showAnnotationBoundingBoxes` - Show bounding boxes
- `showAnnotationLabels` - Label display behavior

See [CentralRouteManager.tsx](../../frontend/src/routing/CentralRouteManager.tsx) for implementation details.

---

## Corpus Selection

When a user navigates to a corpus URL (e.g., `/c/john/my-corpus`):

1. **CentralRouteManager Phase 1** parses the URL and resolves the corpus via GraphQL
2. Sets `openedCorpus(corpusData)` reactive variable
3. Route component (`CorpusLandingRoute`) reads `openedCorpus` and renders the corpus view

### Deep Linking

Direct navigation to corpus URLs is fully supported:
- Slug-based URLs are resolved via `RESOLVE_CORPUS_BY_SLUGS_FULL` query
- ID-based URLs are automatically redirected to canonical slug URLs
- Query parameters (tab, folder, etc.) are preserved through redirects

### Key Files

- Routing logic: [CentralRouteManager.tsx](../../frontend/src/routing/CentralRouteManager.tsx)
- Reactive vars: [cache.ts](../../frontend/src/graphql/cache.ts) (`openedCorpus`, `selectedFolderId`, etc.)
- Navigation utilities: [navigationUtils.ts](../../frontend/src/utils/navigationUtils.ts)

---

## Document Selection

When a user navigates to a document URL:

### Standalone Document (`/d/:user/:doc`)

1. **CentralRouteManager Phase 1** resolves document via `RESOLVE_DOCUMENT_BY_SLUGS_FULL`
2. Sets `openedDocument(docData)` and `openedCorpus(null)`
3. `DocumentLandingRoute` renders `DocumentKnowledgeBase` in standalone mode

### Document in Corpus (`/d/:user/:corpus/:doc`)

1. **CentralRouteManager Phase 1** resolves both corpus and document via `RESOLVE_DOCUMENT_IN_CORPUS_BY_SLUGS_FULL`
2. Sets both `openedCorpus(corpusData)` and `openedDocument(docData)`
3. `DocumentLandingRoute` renders `DocumentKnowledgeBase` with corpus context

### Annotation Selection

Query parameters allow deep linking to specific annotations:

```
/d/john/corpus/doc?ann=123,456&structural=true&labels=ALWAYS
```

This will:
- Open the document
- Select annotations 123 and 456
- Enable structural annotation display
- Set labels to always visible

### Key Files

- Route component: [DocumentLandingRoute.tsx](../../frontend/src/components/routes/DocumentLandingRoute.tsx)
- Knowledge base: [DocumentKnowledgeBase.tsx](../../frontend/src/components/knowledge_base/document/DocumentKnowledgeBase.tsx)

---

## Folder Navigation

Folders provide hierarchical organization within a corpus. The folder system uses a combination of URL query parameters and Jotai atoms.

### URL-Driven Folder Selection

The `?folder=` query parameter controls which folder is being viewed:

```
/c/john/my-corpus?tab=documents&folder=folder-123
```

- CentralRouteManager Phase 2 parses `?folder=` and sets `selectedFolderId` reactive var
- Folder state atoms in [folderAtoms.ts](../../frontend/src/atoms/folderAtoms.ts) manage tree expansion and UI state

### Folder State Architecture

The folder system uses Jotai atoms for local UI state:

- `selectedFolderIdAtom` - Currently selected folder
- `folderListAtom` - Flat folder list from server
- `folderTreeAtom` - Derived tree structure
- `expandedFolderIdsAtom` - Persisted expansion state

---

## How Components Consume Selection State

Components follow a strict read-only pattern:

```typescript
// Read entity state
const corpus = useReactiveVar(openedCorpus);
const document = useReactiveVar(openedDocument);

// Read selection state
const selectedAnns = useReactiveVar(selectedAnnotationIds);
const folderId = useReactiveVar(selectedFolderId);

// NEVER do this:
// openedCorpus(someCorpus);  // WRONG - only CentralRouteManager sets this
```

### Updating Selection State

Components must update state by modifying the URL, which triggers CentralRouteManager to update reactive vars:

```typescript
import { updateAnnotationSelectionParams } from "../utils/navigationUtils";

// Update annotation selection
const handleSelectAnnotation = (id: string) => {
  updateAnnotationSelectionParams(location, navigate, {
    annotationIds: [id],
  });
};
```

### Navigation

Use navigation utilities to generate URLs and navigate:

```typescript
import { getDocumentUrl, navigateToDocument } from "../utils/navigationUtils";

// Generate URL
const url = getDocumentUrl(document, corpus, { annotationIds: ["123"] });

// Navigate (smart - checks if already there)
navigateToDocument(document, corpus, navigate, location.pathname);
```

---

## Summary

| Concept | Implementation |
|---------|---------------|
| Corpus/Document selection | CentralRouteManager resolves from URL, sets reactive vars |
| URL sync | Bidirectional: URL drives state, state updates URL |
| Component access | Read-only via `useReactiveVar()` |
| State updates | Via URL utilities (`updateAnnotationSelectionParams`, etc.) |
| Deep linking | Full support with annotation/visualization params |
| Folder navigation | URL `?folder=` param + Jotai atoms for UI state |

For complete architecture details, see [routing_system.md](routing_system.md).

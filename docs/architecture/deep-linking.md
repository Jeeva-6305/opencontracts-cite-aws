# Deep-Linking Architecture

This document describes OpenContracts' deep-linking conventions, implementation patterns, and known gaps.

## Table of Contents

1. [Overview](#overview)
2. [URL Structure](#url-structure)
3. [Entity Routes](#entity-routes)
4. [Query Parameters](#query-parameters)
5. [Implementation Architecture](#implementation-architecture)
6. [Deep-Link Examples](#deep-link-examples)
7. [Known Gaps & Limitations](#known-gaps--limitations)
8. [Adding New Deep-Link Parameters](#adding-new-deep-link-parameters)
9. [Testing Deep-Links](#testing-deep-links)

## Overview

Deep-linking in OpenContracts allows users to share URLs that restore the complete application state, including:

- **Entity context**: Which corpus, document, extract, or thread is open
- **Selection state**: Which annotations, analyses, or extracts are selected
- **Visualization settings**: How annotations are displayed (labels, bounding boxes, etc.)
- **UI state**: Which sidebar panel or tab is active

### Core Principles

1. **URL is Source of Truth**: All shareable state lives in the URL
2. **Centralized Sync**: Only `CentralRouteManager.tsx` sets URL-driven reactive vars
3. **Unidirectional Flow**: Component → URL → CentralRouteManager → Reactive Var → Component
4. **Bidirectional Preservation**: URL changes update state; state changes update URL

## URL Structure

### Base Patterns

```
/c/{userSlug}/{corpusSlug}                           # Corpus page
/c/{userSlug}/{corpusSlug}/discussions/{threadId}    # Full-page thread
/d/{userSlug}/{documentSlug}                         # Standalone document
/d/{userSlug}/{corpusSlug}/{documentSlug}            # Document in corpus context
/e/{userSlug}/{extractId}                            # Extract page
```

### Query Parameter Format

```
?param1=value1&param2=value2,value3&param3=true
```

- Single values: `?thread=abc123`
- Multiple values (CSV): `?ann=id1,id2,id3`
- Boolean flags: `?structural=true` (absence = false)
- Enum values: `?labels=ALWAYS` (one of predefined values)

## Entity Routes

| Route Type | URL Pattern | CentralRouteManager Action | Reactive Vars Set |
|------------|-------------|---------------------------|-------------------|
| Corpus | `/c/:user/:corpus` | Phase 1: Fetch corpus | `openedCorpus` |
| Document (standalone) | `/d/:user/:doc` | Phase 1: Fetch document | `openedDocument` |
| Document (in corpus) | `/d/:user/:corpus/:doc` | Phase 1: Fetch both | `openedCorpus`, `openedDocument` |
| Extract | `/e/:user/:extractId` | Phase 1: Fetch extract | `openedExtract` |
| Thread (full-page) | `/c/:user/:corpus/discussions/:threadId` | Phase 1: Fetch thread + corpus | `openedThread`, `openedCorpus` |

### ID-Based Navigation (Auto-Redirect)

CentralRouteManager automatically detects IDs and redirects to canonical slug URLs:

- `/c/john/Q29ycHVzOjEyMw==` → `/c/john-doe/my-corpus`
- `/d/jane/4567` → `/d/jane/my-document`

Detection criteria:
- Base64 strings (e.g., `Q29ycHVzOjEyMw==`)
- Numeric IDs ≥4 digits (e.g., `1234`, `456789`)
- GID format (e.g., `gid://app/Corpus/123`)

## Query Parameters

### Selection Parameters

| Parameter | Type | Example | Reactive Var | Description |
|-----------|------|---------|--------------|-------------|
| `ann` | CSV IDs | `?ann=id1,id2` | `selectedAnnotationIds` | Highlight annotations |
| `analysis` | CSV IDs | `?analysis=id1` | `selectedAnalysesIds` | Filter by analyses |
| `extract` | CSV IDs | `?extract=id1` | `selectedExtractIds` | Select extracts |
| `thread` | Single ID | `?thread=abc` | `selectedThreadId` | Open thread in sidebar |
| `folder` | Single ID | `?folder=xyz` | `selectedFolderId` | Filter by folder |

### Visualization Parameters

| Parameter | Type | Values | Default | Reactive Var |
|-----------|------|--------|---------|--------------|
| `structural` | Boolean | `true` or omit | `false` | `showStructuralAnnotations` |
| `selectedOnly` | Boolean | `true` or omit | `false` | `showSelectedAnnotationOnly` |
| `boundingBoxes` | Boolean | `true` or omit | `false` | `showAnnotationBoundingBoxes` |
| `labels` | Enum | `ALWAYS\|ON_HOVER\|HIDE` | `ON_HOVER` | `showAnnotationLabels` |

### UI State Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `tab` | Enum | `documents\|discussions\|analyses\|extracts` | Active sidebar tab |
| `message` | Single ID | `?message=msgId` | Scroll to message in thread |

## Implementation Architecture

### Four-Phase Processing (CentralRouteManager.tsx)

```
URL Change
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: URL Path → Entity Resolution                       │
│   - Parse pathname (/c/user/corpus → route type)            │
│   - Fetch entities via GraphQL (RESOLVE_*_BY_SLUGS)         │
│   - Set: openedCorpus, openedDocument, openedExtract        │
│   - Wait for auth before fetching (prevents 401 on refresh) │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: URL Query Params → Reactive Vars                   │
│   - Parse all query params (?ann=, ?analysis=, etc.)        │
│   - Batch update reactive vars (unstable_batchedUpdates)    │
│   - Set: selectedAnnotationIds, showStructural, etc.        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Entity Data → Canonical Redirects                  │
│   - Check if URL matches canonical slug path                │
│   - Redirect /c/john/old-id → /c/john-doe/normalized-slug   │
│   - Preserve query parameters during redirect               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Reactive Vars → URL Sync                           │
│   - Watch reactive vars for changes (user selects item)     │
│   - Build query string from current state                   │
│   - Update URL with navigate({ search }, { replace: true }) │
│   - Guards: Skip during loading, skip on initial mount      │
└─────────────────────────────────────────────────────────────┘
```

### State Flow Diagram

```
┌──────────────────┐    navigate()    ┌───────────────────────┐
│    Component     │ ───────────────> │         URL           │
│  (ViewSettings)  │                  │  ?structural=true     │
└──────────────────┘                  └───────────────────────┘
        ▲                                       │
        │                                       │ Phase 2
        │ useReactiveVar()                      ▼
        │                             ┌───────────────────────┐
        │                             │  CentralRouteManager  │
        │                             │  Sets reactive vars   │
        │                             └───────────────────────┘
        │                                       │
        │                                       │ showStructuralAnnotations(true)
        │                                       ▼
        │                             ┌───────────────────────┐
        └──────────────────────────── │    Reactive Var       │
                                      │  showStructural=true  │
                                      └───────────────────────┘
```

### Navigation Utilities (navigationUtils.ts)

Components MUST use these utilities instead of directly setting reactive vars:

```typescript
// Selection updates
updateAnnotationSelectionParams(location, navigate, {
  annotationIds: ["id1", "id2"],
  analysisIds: ["analysis1"],
});

// Visualization updates
updateAnnotationDisplayParams(location, navigate, {
  showStructural: true,
  showBoundingBoxes: true,
  labelDisplay: "ALWAYS",
});

// Entity navigation
navigateToDocument(document, corpus, navigate, currentPath);
navigateToCorpus(corpus, navigate, currentPath);
navigateToExtract(extract, navigate, currentPath);
navigateToCorpusThread(corpus, threadId, navigate, currentPath);

// Thread sidebar
navigateToDocumentThread(threadId, location, navigate);
clearThreadSelection(location, navigate);

// URL generation
getDocumentUrl(document, corpus, { annotationIds: ["id1"] });
getCorpusUrl(corpus, { analysisIds: ["id1"] });
getCorpusThreadUrl(corpus, threadId);
```

## Deep-Link Examples

### Basic Entity Links

```bash
# Corpus page
/c/john/legal-contracts

# Document in corpus
/d/john/legal-contracts/2024-deal

# Standalone document
/d/jane/my-document

# Extract page
/e/john/RXh0cmFjdFR5cGU6MTIz
```

### Selection Links

```bash
# Document with annotations selected
/d/john/contracts/deal?ann=QW5ub3RhdGlvbjox,QW5ub3RhdGlvbjoy

# Corpus filtered by analysis
/c/john/contracts?analysis=QW5hbHlzaXM6NDU2

# Document with thread open in sidebar
/d/john/contracts/deal?thread=Q29udmVyc2F0aW9uOjEyMw
```

### Visualization Links

```bash
# Show structural annotations with labels always visible
/d/john/contracts/deal?structural=true&labels=ALWAYS

# Show only selected annotations with bounding boxes
/d/john/contracts/deal?ann=id1&selectedOnly=true&boundingBoxes=true

# Full visualization state
/d/john/contracts/deal?ann=id1,id2&structural=true&boundingBoxes=true&labels=ALWAYS&selectedOnly=true
```

### Combined Deep-Links

```bash
# Complete shareable state
/d/john/legal-contracts/2024-deal?ann=ann1,ann2&analysis=analysis1&structural=true&boundingBoxes=true&labels=ALWAYS&thread=thread123&folder=folder456

# Thread with message highlight
/c/john/contracts/discussions/thread123?message=msg456
```

## Known Gaps & Limitations

### Currently Not Deep-Linkable

| Feature | Current State | Impact | Priority |
|---------|--------------|--------|----------|
| Tab state | Stored locally | Can't link to specific tab | P2 |
| Message in sidebar thread | Only works full-page | Can't link to message in sidebar | P2 |
| Thread sort/filter | Jotai atoms only | Preferences reset on refresh | P3 |
| Scroll position | Not tracked | Document opens at top | P4 |
| Panel widths | Local state | Layout not preserved | P4 |

### Architectural Constraints

1. **Query params for UI, not data**: Query params control display state, not data filtering (that's done server-side via GraphQL)

2. **No nested query params**: Can't do `?thread[message]=123`; use flat structure `?thread=abc&message=123`

3. **Boolean defaults**: Only `true` is encoded; `false` is represented by param absence

4. **Enum completeness**: All enum values must be handled in Phase 2 parsing

## Adding New Deep-Link Parameters

### Step-by-Step Process

1. **Add reactive var** (`frontend/src/graphql/cache.ts`):
```typescript
export const myNewSetting = makeVar<boolean>(false);
```

2. **Add Phase 2 parsing** (`CentralRouteManager.tsx`):
```typescript
const myNewValue = searchParams.get("myParam") === "true";
updates.push(() => myNewSetting(myNewValue));
```

3. **Add Phase 4 syncing** (`CentralRouteManager.tsx`):
```typescript
const myNewValue = useReactiveVar(myNewSetting);
// In the useEffect deps and queryString builder
```

4. **Update QueryParams interface** (`navigationUtils.ts`):
```typescript
export interface QueryParams {
  // ... existing
  myNewParam?: boolean;
}
```

5. **Update buildQueryParams()** (`navigationUtils.ts`):
```typescript
if (params.myNewParam) {
  searchParams.set("myParam", "true");
}
```

6. **Add navigation utility** (`navigationUtils.ts`):
```typescript
export function updateMyNewSetting(
  location: { search: string },
  navigate: NavigateFunction,
  value: boolean
): void {
  const searchParams = new URLSearchParams(location.search);
  if (value) {
    searchParams.set("myParam", "true");
  } else {
    searchParams.delete("myParam");
  }
  navigate({ search: searchParams.toString() }, { replace: true });
}
```

7. **Update components** to use the utility:
```typescript
// Read
const myValue = useReactiveVar(myNewSetting);

// Write (via URL)
updateMyNewSetting(location, navigate, true);
```

8. **Add tests** (see Testing section)

9. **Update documentation** (`routing_system.md` and this file)

## Testing Deep-Links

### Unit Tests (navigationUtils.test.ts)

```typescript
describe("buildQueryParams", () => {
  it("should include myParam when true", () => {
    const result = buildQueryParams({ myNewParam: true });
    expect(result).toContain("myParam=true");
  });

  it("should omit myParam when false", () => {
    const result = buildQueryParams({ myNewParam: false });
    expect(result).not.toContain("myParam");
  });
});

describe("parseRoute", () => {
  it("should parse thread routes", () => {
    const result = parseRoute("/c/john/corpus/discussions/thread-123");
    expect(result).toEqual({
      type: "thread",
      userIdent: "john",
      corpusIdent: "corpus",
      threadIdent: "thread-123",
    });
  });
});
```

### Integration Tests (CentralRouteManager.test.tsx)

```typescript
describe("Phase 2: Query Params", () => {
  it("should set reactive var from URL param", () => {
    render(
      <MemoryRouter initialEntries={["/documents?myParam=true"]}>
        <CentralRouteManager />
      </MemoryRouter>
    );

    expect(myNewSetting()).toBe(true);
  });
});

describe("Phase 4: URL Sync", () => {
  it("should update URL when reactive var changes", async () => {
    render(<CentralRouteManager />);

    myNewSetting(true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        { search: expect.stringContaining("myParam=true") },
        { replace: true }
      );
    });
  });
});
```

### Component Tests (Playwright)

```typescript
test("ViewSettingsPopup updates URL on toggle", async ({ mount, page }) => {
  const component = await mount(
    <TestWrapper initialRoute="/d/user/doc">
      <ViewSettingsPopup />
    </TestWrapper>
  );

  // Toggle setting
  await component.getByRole("checkbox", { name: "Show Bounding Boxes" }).click();

  // Verify URL updated
  await expect(page).toHaveURL(/boundingBoxes=true/);
});

test("deep-link restores visualization state", async ({ mount, page }) => {
  const component = await mount(
    <TestWrapper initialRoute="/d/user/doc?structural=true&labels=ALWAYS">
      <DocumentKnowledgeBase />
    </TestWrapper>
  );

  // Verify settings restored
  await expect(component.getByTestId("structural-toggle")).toBeChecked();
  await expect(component.getByTestId("labels-dropdown")).toHaveValue("ALWAYS");
});
```

### E2E Tests

```typescript
test("full deep-link flow", async ({ page }) => {
  // Navigate to deep-link
  await page.goto("/d/john/contracts/deal?ann=id1&structural=true");

  // Verify state restored
  await expect(page.locator("[data-annotation-id='id1']")).toHaveClass(/selected/);
  await expect(page.getByTestId("structural-toggle")).toBeChecked();

  // Modify state
  await page.getByTestId("annotation-id2").click();

  // Verify URL updated
  await expect(page).toHaveURL(/ann=id1,id2/);

  // Refresh and verify state persists
  await page.reload();
  await expect(page.locator("[data-annotation-id='id1']")).toHaveClass(/selected/);
  await expect(page.locator("[data-annotation-id='id2']")).toHaveClass(/selected/);
});
```

---

## Related Documentation

- [Routing System](../frontend/routing_system.md) - Complete routing architecture
- [PDF Data Layer](./PDF-data-layer.md) - Annotation rendering system
- [Authentication Pattern](../../frontend/src/docs/AUTHENTICATION_PATTERN.md) - Auth-gated routing

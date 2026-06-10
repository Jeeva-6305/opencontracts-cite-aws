# PDF Loading Performance Optimization Plan

> **Status**: Phase 1 (lazy structural annotation loading) implemented in PR #1154.
> Phases 2–5 are future work — they are not yet started.

## Problem Statement

Loading a 100-200 page document in `DocumentKnowledgeBase` is unacceptably slow. The root cause is that the initial GraphQL query (`GET_DOCUMENT_KNOWLEDGE_AND_ANNOTATIONS`) fetches **all structural annotations, all corpus annotations, and all relationships in a single monolithic query** — with no pagination.

For a 200-page document, this can mean:
- **4,000-6,000 structural annotations** (~20-30 per page: paragraphs, headers, sections, etc.)
- Each annotation carries a `json` field with token position data and `rawText`
- Estimated payload: **5-20MB of JSON** for structural annotations alone
- All of this data is then **synchronously processed** in `processAnnotationsData()` — mapping thousands of objects through `convertToServerAnnotation()`

Meanwhile, structural annotations are **hidden by default** (`showStructural` defaults to `false`) — the user never sees them unless they explicitly toggle the structural view.

## Current Architecture (What's Slow)

```
Single GraphQL Query
├── Document metadata (small, needed)
├── allStructuralAnnotations (HUGE - thousands, unpaginated)
│   └── Each: id, page, parent, annotationLabel, json, rawText, myPermissions...
├── allAnnotations (moderate - user/analysis annotations)
│   └── Each: id, page, annotationLabel, json, rawText, userFeedback...
├── allRelationships (moderate)
└── Corpus + labelSet (small, needed)

→ processAnnotationsData() synchronously maps ALL annotations
→ Then PDF + PAWLs loading starts (these are already well-optimized)
→ Then all pages eagerly resolved via getPage() loop
```

**Key insight**: The PDF rendering itself is already virtualized (binary search, only visible pages + overscan rendered). The bottleneck is the data fetch and processing, not rendering.

## Optimization Strategy

### Phase 1: Don't Load Structural Annotations by Default (Biggest Win)

**Impact**: Eliminates 80-90% of the payload for most users
**Risk**: Low — structural annotations are hidden by default anyway
**Backend changes**: None — existing `is_structural` filter on `allAnnotations` resolver already supports this

#### 1a. Split the initial query

Create `GET_DOCUMENT_KNOWLEDGE_BASE_LITE` that **excludes** `allStructuralAnnotations`:

```graphql
query GetDocumentKnowledgeBaseLite($documentId: ID!, $corpusId: ID!, $analysisId: ID) {
  document(id: $documentId) {
    # Document metadata (same as before)
    id, title, fileType, creator { id, email }, created,
    mdSummaryFile, pdfFile, pdfFileHash, txtExtractFile, pawlsParseFile,
    myPermissions

    # Notes and doc relationships (same as before)
    allNotes(corpusId: $corpusId) { ... }
    allDocRelationships { ... }

    # ONLY non-structural annotations (user/analysis annotations)
    allAnnotations(corpusId: $corpusId, analysisId: $analysisId) { ... }

    # ONLY non-structural relationships
    allRelationships(corpusId: $corpusId, analysisId: $analysisId) { ... }

    # NEW: lightweight structural annotation count for UI badge
    structuralAnnotationCount
  }
  corpus(id: $corpusId) { ... }
}
```

#### 1b. Lazy-load structural annotations on demand

When the user toggles `showStructural` to `true`, fire a separate query:

```graphql
query GetDocumentStructuralAnnotations($documentId: ID!) {
  document(id: $documentId) {
    id
    allStructuralAnnotations {
      id, page, parent { id }, annotationLabel { ... },
      annotationType, rawText, json, myPermissions, structural, contentModalities
    }
  }
}
```

Store a `structuralAnnotationsLoaded` flag in a Jotai atom to avoid re-fetching.

#### 1c. Handle URL-selected structural annotations

If `initialAnnotationIds` are provided (deep link), check if any are structural by doing a lightweight lookup query first, and only then load structural annotations if needed.

**Implementation files**:
- `frontend/src/graphql/queries.ts` — new query definitions
- `frontend/src/components/knowledge_base/document/DocumentKnowledgeBase.tsx` — swap query, add lazy loading
- `frontend/src/components/annotator/context/AnnotationAtoms.tsx` — add `structuralAnnotationsLoadedAtom`
- `frontend/src/components/annotator/hooks/useStructuralAnnotations.ts` — new hook for lazy loading

### Phase 2: Progressive Annotation Loading (Medium Win)

Even non-structural annotations can be numerous (analysis-generated annotations). Load them progressively.

#### 2a. Page-aware annotation fetching

The backend already has `pageAnnotations` and `pageRelationships` resolvers on the Document type that accept `pages: [Int]` and `structural: Boolean` parameters. Use these for viewport-driven loading:

```graphql
# Fetch annotations for visible pages only
query GetPageAnnotations($documentId: ID!, $corpusId: ID!, $pages: [Int]!) {
  document(id: $documentId) {
    pageAnnotations(corpusId: $corpusId, pages: $pages) { ... }
    pageRelationships(corpusId: $corpusId, pages: $pages) { ... }
  }
}
```

**Strategy**:
1. Initial load: Fetch document metadata + annotations for pages 1-5 (first viewport + overscan)
2. As user scrolls, prefetch annotations for pages entering the overscan zone
3. Cache fetched pages in a `Map<pageNumber, Annotation[]>` atom
4. `useVisibleAnnotations` reads from this map instead of the flat array

#### 2b. Annotation index for sidebar

The sidebar annotation list still needs to know about all annotations (for the count badge and scrollable list). Add a lightweight index query:

```graphql
query GetAnnotationIndex($documentId: ID!, $corpusId: ID!) {
  document(id: $documentId) {
    annotationIndex(corpusId: $corpusId) {
      id
      page
      annotationLabel { id, text, color, labelType }
      structural
      # NO json field, NO rawText (lightweight)
    }
  }
}
```

This requires a new backend resolver that returns annotations without heavy fields. The full annotation data (with `json`) is only fetched when the page enters the viewport.

**Implementation files**:
- `config/graphql/document_types.py` — new `annotation_index` resolver (exclude `json`, `rawText`)
- `frontend/src/graphql/queries.ts` — new queries
- `frontend/src/components/annotator/hooks/usePageAnnotations.ts` — new hook
- `frontend/src/components/annotator/renderers/pdf/PDF.tsx` — integrate scroll-driven fetching

### Phase 3: Optimize JSON Field Transfer (Medium Win)

The `json` field on annotations is the heaviest single field — it contains token position arrays for every page the annotation spans. For structural annotations (which are typically single-page), this is moderate, but for multi-page span annotations it can be large.

#### 3a. Backend: Compact annotation JSON format

Similar to how PAWLs uses a v2 compact format, create a compact annotation JSON format:

```json
// Current (verbose):
{"1": {"tokensJsons": [{"pageIndex": 1, "tokenIndex": 42}, ...], "rawText": "..."}}

// Compact:
{"1": {"t": [[1, 42], [1, 43], ...], "r": "..."}}
```

#### 3b. Defer `json` field loading

Use GraphQL `@defer` directive (if supported by Graphene) or a separate query to load `json` only for visible pages. The annotation outline (sidebar list) doesn't need `json` at all.

### Phase 4: Optimize Page Resolution (Small Win)

Currently all PDF pages are eagerly resolved via `getPage()` in a Promise.all loop. For 200 pages, this creates 200 promises.

#### 4a. Lazy page resolution

Only resolve pages within the viewport + overscan. The virtualization in `PDF.tsx` already knows which pages are visible. Extend it to lazy-resolve `PDFPageInfo` objects:

```typescript
// Instead of resolving all pages upfront:
// Promise.all(Array.from({length: numPages}, (_, i) => pdfDoc.getPage(i + 1)))

// Resolve on demand:
const getOrResolvePage = async (pageNum: number): Promise<PDFPageInfo> => {
  if (resolvedPages.has(pageNum)) return resolvedPages.get(pageNum)!;
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const tokens = resolvePageTokens(pawlsData, pageNum - 1, viewport.width, viewport.height, pageNum);
  const info = new PDFPageInfo(page, tokens, zoomLevel);
  resolvedPages.set(pageNum, info);
  return info;
};
```

**Caveat**: The current code needs all page heights upfront for cumulative height calculation (used by binary search). Solution: use PAWLs page dimensions (already available) for height estimation, then correct when actual page is resolved. PAWLs `page.width` and `page.height` provide the PDF page dimensions at scale=1, which is exactly what `getViewport({scale: 1})` returns.

#### 4b. Defer `createTokenStringSearch`

This function iterates all pages to build a text search index. Defer it to an idle callback or Web Worker:

```typescript
// Instead of blocking:
const { doc_text, string_index_token_map } = createTokenStringSearch(loadedPages);

// Defer to idle time:
requestIdleCallback(() => {
  const result = createTokenStringSearch(loadedPages);
  setPageTextMaps(result.string_index_token_map);
  setDocText(result.doc_text);
});
```

### Phase 5: Backend Query Optimization (Small Win)

#### 5a. Add `structuralAnnotationCount` field

Lightweight count field on Document type to show badge without fetching all structural annotations:

```python
structural_annotation_count = graphene.Int()

def resolve_structural_annotation_count(self, info):
    return AnnotationQueryOptimizer.get_document_annotation_count(
        document_id=self.id,
        structural=True,
    )
```

#### 5b. Add `annotationIndex` resolver

Returns annotations with only lightweight fields (no `json`, no `rawText`):

```python
annotation_index = graphene.List(
    AnnotationIndexType,  # Lightweight type without json/rawText
    corpus_id=graphene.ID(),
    structural=graphene.Boolean(),
)
```

## Implementation Priority

| Phase | Effort | Impact | Risk | Priority |
|-------|--------|--------|------|----------|
| 1a-c: Skip structural on initial load | 2-3 days | **Very High** | Low | **P0** |
| 2a: Page-aware annotation fetching | 3-5 days | High | Medium | P1 |
| 4a: Lazy page resolution | 1-2 days | Medium | Low | P1 |
| 4b: Defer text search index | 0.5 day | Medium | Low | P1 |
| 5a: Structural annotation count | 0.5 day | Low (supports P0) | Low | P0 |
| 2b: Annotation index for sidebar | 2-3 days | Medium | Medium | P2 |
| 3a-b: Compact/deferred JSON | 3-5 days | Medium | High | P2 |
| 5b: Annotation index resolver | 1-2 days | Low (supports P2) | Low | P2 |

## Critical Insight: Structural Annotations Are Analysis-Independent

`allStructuralAnnotations` does NOT accept `corpusId` or `analysisId` parameters. Structural annotations belong to the document's `StructuralAnnotationSet` and never change when switching analyses or extracts. Yet the current code re-fetches them in `GET_DOCUMENT_ANNOTATIONS_ONLY` on every analysis switch — the same 4,000-6,000 annotations re-transferred and re-processed each time for zero benefit.

Even without the full Phase 1, simply removing `allStructuralAnnotations` from `GET_DOCUMENT_ANNOTATIONS_ONLY` is a quick win.

## Phase 1 Detailed Design (Recommended Starting Point)

### Changes Required

**1. New GraphQL queries** (`frontend/src/graphql/queries.ts`):
- `GET_DOCUMENT_KNOWLEDGE_BASE_LITE` — same as current but without `allStructuralAnnotations`
- `GET_DOCUMENT_STRUCTURAL_ANNOTATIONS` — standalone query for structural annotations

**2. DocumentKnowledgeBase.tsx changes**:
- Replace `GET_DOCUMENT_KNOWLEDGE_AND_ANNOTATIONS` with `GET_DOCUMENT_KNOWLEDGE_BASE_LITE`
- Add `useLazyQuery` for structural annotations, triggered by:
  - `showStructural` toggled to `true`
  - `initialAnnotationIds` containing structural annotation IDs
- Remove structural annotation processing from `processAnnotationsData()`
- Add structural annotation processing in the lazy query's `onCompleted`

**3. New atom** (`frontend/src/components/annotator/context/AnnotationAtoms.tsx`):
- `structuralAnnotationsLoadedAtom: atom<boolean>(false)` — tracks whether structural data has been fetched

**4. Update useVisibleAnnotations** (`frontend/src/components/annotator/hooks/useVisibleAnnotations.ts`):
- When `showStructural` is `true` but `structuralAnnotationsLoaded` is `false`, trigger the lazy load
- Show a loading indicator while structural annotations are being fetched

**5. Backend** (`config/graphql/document_types.py`):
- Add `structural_annotation_count` field for UI badge

### What This Preserves
- All existing annotation rendering, selection, and filtering behavior
- URL-based annotation selection (deep links)
- Sidebar annotation list (non-structural annotations still loaded eagerly)
- Text search (unaffected — uses PAWLs data, not annotation data)
- Relationship rendering (non-structural relationships still loaded)

### What Changes for Users
- Structural annotations are no longer visible on first load (but they were already hidden by default)
- Toggling structural view has a brief loading delay on first toggle
- Deep links to structural annotations work but may have a slightly longer initial load

## Measurements

Before implementing, add performance instrumentation:

```typescript
// In DocumentKnowledgeBase.tsx onCompleted:
const t0 = performance.now();
// ... processAnnotationsData(data)
console.log(`[Perf] Annotation processing: ${performance.now() - t0}ms`);

// GraphQL query timing (already available via Apollo DevTools)
// PDF + PAWLs loading timing (already has logging)
```

Key metrics to track:
1. Time from navigation to `ViewState.LOADED`
2. GraphQL query response time
3. `processAnnotationsData()` execution time
4. Number of annotations in initial payload
5. PDF page resolution time

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Structural annotations needed for some sidebar features | Audit all consumers of `structuralAnnotationsAtom` before removing from initial load |
| Race condition between lazy structural load and user interactions | Use loading state in atom; disable structural toggle button while loading |
| Cache invalidation complexity with split queries | Use Apollo's `cache-and-network` for structural annotations; structural data rarely changes |
| Breaking existing component tests | Tests that depend on structural annotations in initial load need mock updates |
| Annotation selection via URL for structural annotations | Do a lightweight check-if-structural query before deciding which annotations to load |

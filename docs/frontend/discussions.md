# Discussions System (Threads & Messages)

This document covers the frontend architecture for OpenContracts' discussion/threading system, including the rich text composer and mention system.

## Overview

The discussions system allows users to have threaded conversations within corpuses. Key components:

- **ThreadDetail**: Displays a conversation with nested message tree
- **MessageTree**: Recursive component for nested replies
- **ReplyForm**: Wrapper for creating new messages/replies
- **MessageComposer**: Rich text editor with @mention support

## MessageComposer Architecture

Located at: `frontend/src/components/threads/MessageComposer.tsx`

The MessageComposer is a TipTap-based rich text editor with custom @mention functionality for linking to internal resources.

### TipTap Extensions Used

| Extension | Purpose | Configuration |
|-----------|---------|---------------|
| `StarterKit` | Basic formatting (bold, italic, lists) | Code blocks and blockquotes disabled |
| `Markdown` | Export content as Markdown | `linkify: false` (see Link extension) |
| `Link` | Handle all link marks | `autolink: true` for URL detection |
| `Placeholder` | Show placeholder text | Standard usage |
| `Mention` | @mention suggestion UI only | Custom render/selection (see below) |

### Custom Mention → Link Architecture

**Why we diverge from default TipTap Mention behavior:**

TipTap's default Mention extension inserts **Mention nodes**:
```html
<span data-type="mention" data-id="123" data-label="@username">@username</span>
```

We instead insert **Link marks** on text:
```html
<a href="/users/user-slug">@username</a>
```

**Reasons for this design:**

1. **Deep linking**: Mentions become clickable links to users, documents, annotations, etc.
2. **Markdown compatibility**: Links serialize naturally as `[text](url)` via tiptap-markdown
3. **Multi-resource support**: Same pattern works for 5 different resource types
4. **No custom serialization**: Standard Link mark needs no special handling

### Mention Flow

```
User types "@foo"
       ↓
TipTap Mention suggestion triggers
       ↓
useUnifiedMentionSearch(query, corpusId) → GraphQL search
       ↓
UnifiedMentionPicker shows results (users, corpuses, documents, annotations, agents)
       ↓
User selects a result
       ↓
getMentionData(resource) builds deep link URL based on resource type
       ↓
Insert text with Link mark (NOT Mention node)
       ↓
Markdown export produces: [Label](deep-link-url)
```

### Resource Types and Deep Links

| Resource | Label Format | URL Pattern |
|----------|--------------|-------------|
| User | `@username` | `/users/{slug}` |
| Corpus | `{title}` | `/c/{creator}/{corpus}` |
| Document | `{title} (in {corpus})` | `/d/{creator}/{corpus}/{doc}` |
| Annotation | `"text..." (Label)` | `/d/.../doc?ann={id}&structural=true` |
| Agent | `@agent:{slug}` | `/agents/{slug}` |

### Key Implementation Details

**We use Mention extension for:**
- `@` character trigger detection
- Suggestion popup positioning (via floating-ui)
- Keyboard navigation (up/down/enter/escape)

**We override Mention's default behavior:**
- `suggestion.render().onSelect` inserts Link marks instead of Mention nodes
- Results come from `useUnifiedMentionSearch` hook (GraphQL backend search)

**Link extension handles:**
- All link mark rendering and behavior
- `autolink: true` for automatic URL detection while typing
- `openOnClick: false` to prevent navigation while editing

### Configuration Notes

**Avoiding duplicate 'link' extension warning:**

The `tiptap-markdown` package with `linkify: true` can conflict with the `Link` extension. To avoid duplication:

```typescript
// CORRECT: Use Link's autolink, disable Markdown's linkify
Markdown.configure({
  linkify: false,  // ← Disable here
}),
Link.configure({
  autolink: true,  // ← URL detection happens here
}),
```

**Autofocus:**

Use TipTap's built-in `autofocus` option instead of manual `useEffect`:

```typescript
const editor = useEditor({
  autofocus: autoFocus,  // ← Built-in, handles mount timing correctly
  // ...
});
```

## Related Files

- `frontend/src/components/threads/MessageComposer.tsx` - Rich text editor
- `frontend/src/components/threads/UnifiedMentionPicker.tsx` - Mention suggestion dropdown
- `frontend/src/components/threads/hooks/useUnifiedMentionSearch.ts` - GraphQL search hook
- `frontend/src/components/threads/ThreadDetail.tsx` - Thread display
- `frontend/src/components/threads/MessageTree.tsx` - Nested message rendering
- `frontend/src/components/threads/ReplyForm.tsx` - Reply form wrapper

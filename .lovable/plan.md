

# Global Trash, Layout Hierarchy, and Wiki-Style Editing

## 1. Database Migration

Add `deleted_at` column to three tables:

```sql
ALTER TABLE public.ideas ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.brainstorms ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz DEFAULT NULL;
```

No new RLS policies needed -- existing per-user policies already cover these tables.

---

## 2. Soft Delete and Filtered Queries

### Update all list queries to filter out soft-deleted items:
- `Ideas.tsx`: Add `.is("deleted_at", null)` to the ideas query
- `Brainstorms.tsx`: Add `.is("deleted_at", null)` to the brainstorms query
- `Projects.tsx`: Add `.is("deleted_at", null)` to the projects query

### Convert delete actions to soft deletes:
- `Ideas.tsx` (`deleteIdea` mutation): Change `.delete()` to `.update({ deleted_at: new Date().toISOString() })`
- `BrainstormWorkspace.tsx`: No delete action currently -- no change needed
- `Projects.tsx`: No delete action currently -- no change needed

---

## 3. Trash Page (`src/pages/Trash.tsx`)

New page at `/trash` route. Displays three collapsible sections:

- **Trashed Ideas**: Query ideas where `deleted_at IS NOT NULL`, show title/summary, with "Restore" and "Permanently Delete" buttons
- **Trashed Brainstorms**: Same pattern for brainstorms
- **Trashed Projects**: Same pattern for projects

Actions:
- **Restore**: `update({ deleted_at: null })` on the row
- **Permanently Delete**: `.delete()` on the row

### Sidebar Update
Add a "Trash" link at the bottom of the sidebar sections (before the footer), using the `Trash2` icon.

### Routing
Add `/trash` route in `App.tsx` wrapped in `ProtectedRoute` and `AppLayout`.

---

## 4. Brainstorm Workspace Layout Reorganization

Restructure the page from the current two-column layout to a single-column vertical flow:

1. **Title** (editable header) + Linked Idea badge + Promote to Project button
2. **AI Interview** (Flashcard Q&A card) -- moved up to be immediately after the title
3. **Compiled Description** and **Bullet Breakdown** sections (wiki-style, see section 6)
4. **References** section at the bottom

This replaces the current `grid grid-cols-1 lg:grid-cols-5` two-column layout with a simple vertical `space-y-6` stack.

---

## 5. Enter-to-Send for Flashcard Q&A

Add an `onKeyDown` handler to the answer `Textarea`:
- If `Enter` is pressed without `Shift`, call `e.preventDefault()` and trigger `handleSubmitAnswer()`
- `Shift+Enter` allows normal newline behavior
- Keep the "Submit Answer" button visible for accessibility

---

## 6. Wiki-Style Inline Editing with Markdown

### New dependency
Install `react-markdown` for rendering markdown content.

### Implementation
Create a reusable `EditableMarkdown` component that toggles between two states:

**Read mode** (default):
- Render the content using `react-markdown` with clean styling
- Entire block is clickable -- clicking swaps to edit mode
- Show a subtle pencil icon on hover to indicate editability

**Edit mode** (on click):
- Swap to a `Textarea` pre-filled with the raw markdown text
- Auto-focus the textarea
- On `blur` or `Escape` keypress: save changes to the database and swap back to read mode

### Usage
Replace the plain `Textarea` components for Compiled Description and Bullet Breakdown with `EditableMarkdown` instances. Each saves to the respective `brainstorms` column on blur.

---

## Files to Create/Modify

| File | Action |
|---|---|
| Migration SQL | Add `deleted_at` to ideas, brainstorms, projects |
| `src/pages/Ideas.tsx` | Filter `deleted_at IS NULL`, soft delete mutation |
| `src/pages/Brainstorms.tsx` | Filter `deleted_at IS NULL` |
| `src/pages/Projects.tsx` | Filter `deleted_at IS NULL` |
| `src/pages/Trash.tsx` | **New** -- trash page with restore/permanent delete |
| `src/components/EditableMarkdown.tsx` | **New** -- wiki-style click-to-edit markdown component |
| `src/components/AppSidebar.tsx` | Add Trash link |
| `src/pages/BrainstormWorkspace.tsx` | Layout reorder, enter-to-send, use EditableMarkdown |
| `src/App.tsx` | Add `/trash` route |
| `package.json` | Add `react-markdown` dependency |

---

## Technical Notes

- `deleted_at` is nullable -- `NULL` means active, a timestamp means soft-deleted
- The `react-markdown` package renders standard markdown (bold, lists, headers, links) without needing `dangerouslySetInnerHTML`
- The `EditableMarkdown` component uses local state to toggle between read/edit modes, with `onBlur` triggering the save callback
- The layout change is purely CSS/JSX restructuring -- no data model changes needed for the reorder
- Enter-to-send checks `e.key === "Enter" && !e.shiftKey` to preserve multiline input capability


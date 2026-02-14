

# Undo/Redo, Tag Updates, Reference Interactions, and Sidebar Nested Lists

This plan covers four features: persistent undo/redo for brainstorm edits, AI-driven tag updates during interviews, clickable reference tiles with viewers/thumbnails, and an expandable sidebar with item titles.

---

## 1. Persistent Undo/Redo (Ctrl+Z / Ctrl+Y)

### New database table: `brainstorm_history`

Create a table to store snapshots of brainstorm field changes:

```text
brainstorm_history
- id (uuid, PK)
- brainstorm_id (uuid, FK -> brainstorms.id)
- user_id (uuid)
- field_name (text) -- e.g. "compiled_description", "bullet_breakdown", "deleted_reference"
- old_value (text)
- new_value (text)
- metadata (jsonb) -- for reference deletions, store the full reference row
- created_at (timestamptz)
- position (integer) -- cursor position in the history stack
```

RLS: users can only CRUD their own history rows.

### How it works

- Every time the user saves a description edit, bullet edit, or deletes a reference, a history entry is pushed to the DB with the old and new values.
- A `useUndoRedo` custom hook maintains a pointer into the history stack. Ctrl+Z pops the latest entry and reverts the field (restoring old_value, or re-inserting a deleted reference from metadata). Ctrl+Y re-applies (restoring new_value, or re-deleting the reference).
- The hook registers a `keydown` listener for `ctrl+z` and `ctrl+y` on the workspace page.
- History entries are scoped per brainstorm. On page load, the most recent N entries are fetched to populate the stack.

### Files to modify/create

| File | Changes |
|---|---|
| Migration SQL | Create `brainstorm_history` table with RLS |
| `src/hooks/useUndoRedo.ts` (new) | Custom hook: manages history stack, keyboard listeners, undo/redo logic |
| `src/pages/BrainstormWorkspace.tsx` | Integrate the hook; wrap save handlers to record history entries |

---

## 2. Update Tags During AI Interview

Currently the `submit_answer` mode in the edge function only returns `updated_description`, `updated_bullets`, and `next_question`. Tags are never updated after creation.

### Edge function changes

**File: `supabase/functions/brainstorm-chat/index.ts`**

- Add `tags` to the context passed in the system prompt for `submit_answer` mode.
- Add `updated_tags` to the `process_answer` tool schema -- an array of strings representing the updated tag list based on the evolving brainstorm content.
- Update the user prompt to instruct the AI to also update the tags.

### Frontend changes

**File: `src/pages/BrainstormWorkspace.tsx`**

- After receiving the `submit_answer` response, read `data.updated_tags` and save it to the brainstorms table alongside the description and bullets.
- Update the local `brainstormTags` display.

---

## 3. Clickable Reference Tiles with Thumbnails and Viewers

### Reference tile click behavior

Each reference card becomes clickable with different behavior per type:

- **Link**: Opens the URL in a new browser tab (`window.open`).
- **Note**: Opens a Dialog/popup showing the note title and full description.
- **Image**: Opens a fullscreen lightbox viewer showing the image.
- **Video**: Opens a fullscreen viewer with a video player (for direct video URLs) or an iframe embed (for YouTube/Vimeo).

### Thumbnails on reference tiles

- **Images**: Show the stored `url` as a small thumbnail `<img>` on the card.
- **Videos**: Extract a thumbnail from YouTube/Vimeo URLs using their known thumbnail URL patterns (e.g., `https://img.youtube.com/vi/{id}/mqdefault.jpg`). For other video URLs, show a film icon placeholder.
- **Links**: Create a new edge function `fetch-link-preview` that fetches the Open Graph `og:image` from a URL's HTML meta tags. When a link reference is created, call this function and store the result in the existing `thumbnail_url` column on `brainstorm_references`. Display the thumbnail on the card if available.

### New components/files

| File | Purpose |
|---|---|
| `src/components/ReferenceViewer.tsx` (new) | Dialog/lightbox component that renders note popup, image viewer, or video player based on type |
| `supabase/functions/fetch-link-preview/index.ts` (new) | Edge function that fetches a URL, parses `og:image` from HTML, returns thumbnail URL |

### Modified files

| File | Changes |
|---|---|
| `src/pages/BrainstormWorkspace.tsx` | Add click handlers per reference type, show thumbnails on cards, integrate ReferenceViewer |
| `src/pages/BrainstormWorkspace.tsx` | On link/video reference creation, call `fetch-link-preview` to get and store thumbnail |

---

## 4. Sidebar with Expandable Nested Lists

### Behavior

- Clicking "Ideas", "Brainstorms", or "Projects" navigates to the list page (current behavior).
- Clicking the chevron (>) next to each section expands it inline to show the titles of items in that section, fetched from the database.
- The chevron rotates 90 degrees when expanded (pointing down).
- Each sub-item is a clickable link that navigates to the detail page (e.g., `/brainstorms/{id}`).

### Implementation

**File: `src/components/AppSidebar.tsx`**

- Add state to track which sections are expanded: `expandedSections: Set<string>`.
- For each section, split the row into two click zones: the label (navigates) and the chevron button (toggles expand).
- When expanded, use a React Query hook to fetch items for that section (e.g., `SELECT id, title FROM brainstorms WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`).
- Render sub-items as indented `SidebarMenuItem` links below the section label.
- For brainstorms, link to `/brainstorms/{id}`. For ideas, show `idea.title` and open the idea page. For projects, link to `/projects/{id}` (or the projects page if no detail route exists yet).

---

## Summary of All Files

| File | Changes |
|---|---|
| Migration SQL | Create `brainstorm_history` table with RLS policies |
| `src/hooks/useUndoRedo.ts` (new) | Persistent undo/redo hook with keyboard shortcuts |
| `src/components/ReferenceViewer.tsx` (new) | Lightbox/popup for viewing references by type |
| `supabase/functions/fetch-link-preview/index.ts` (new) | Edge function to fetch OG image from URLs |
| `supabase/functions/brainstorm-chat/index.ts` | Add `updated_tags` to `process_answer` tool schema |
| `src/pages/BrainstormWorkspace.tsx` | Undo/redo integration, tag updates from AI, clickable reference tiles with thumbnails, reference viewer |
| `src/components/AppSidebar.tsx` | Expandable sections with item sub-lists fetched from DB |

---

## Technical Notes

- The `brainstorm_history` table stores atomic changes, not full snapshots, keeping storage efficient. Each undo/redo operation is a single DB read + write.
- The `fetch-link-preview` edge function fetches only the first ~50KB of HTML to find the og:image meta tag, avoiding downloading full pages.
- Video thumbnail extraction is client-side using URL pattern matching (YouTube, Vimeo) -- no extra API calls needed.
- The sidebar item queries are lightweight (just id + title) and cached via React Query with a short stale time so they stay fresh.
- The `brainstorm-references` storage bucket should be made public so image thumbnails can be displayed. A migration will handle this.


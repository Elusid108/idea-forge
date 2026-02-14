

# Fix Ghost X, Brainstorm Tiles, Sidebar Refresh, Reference Grouping, and Project Detail Page

This plan addresses 7 issues: the double close button on viewers, brainstorm tile status badges, sidebar live updates, reference section overhaul (grouping, sorting, editing, view modes), and a new project detail page with data carried over from brainstorms.

---

## 1. Fix Ghost/Double X on Image and Video Viewers

**Problem**: `DialogContent` in `src/components/ui/dialog.tsx` always renders a built-in X close button (line 45). The `ReferenceViewer` component adds its own custom X button on top of the viewer, resulting in two X buttons visible.

**Fix in `src/components/ReferenceViewer.tsx`**: Remove the custom `<Button>` close buttons from the image and video viewer sections. The built-in DialogContent close button will handle closing. For the dark background viewers (image/video), override the built-in close button styling by adding a class to DialogContent that styles the close button white, e.g. `[&>button]:text-white [&>button]:hover:text-white/80`.

---

## 2. Brainstorm Tiles: Replace "refs" Badge with Status Badge

**Problem**: The brainstorm tiles show a "N refs" badge. User wants Active (electric blue) or Complete (green) status instead.

**Fix in `src/pages/Brainstorms.tsx`**:
- Remove the `brainstorm_references(id)` from the select query (no longer needed on tiles).
- Replace the refs badge with a status badge:
  - If `b.status === "completed"`: green badge saying "Complete"
  - Otherwise: electric blue badge saying "Active"
- Keep the category badge on the left as-is.

---

## 3. Sidebar Nested List Live Updates

**Problem**: When a title changes or a new item is created, the sidebar sub-list doesn't update until collapsed and re-expanded.

**Fix in `src/components/AppSidebar.tsx`**:
- Lower `staleTime` from `30_000` to `0` (or remove it) so the query always refetches when invalidated.
- After creating a brainstorm or updating a title in `BrainstormWorkspace.tsx`, `Brainstorms.tsx`, and `Ideas.tsx`, also invalidate `["sidebar-items", "brainstorms"]` (and the relevant table key) so the sidebar picks up changes immediately.
- Alternatively, set `refetchOnWindowFocus: true` and use React Query's global invalidation pattern. The simplest approach: change `staleTime` to `5_000` and ensure mutations call `queryClient.invalidateQueries({ queryKey: ["sidebar-items"] })`.

---

## 4. Reference Section Overhaul

This is the largest change. The references section in `BrainstormWorkspace.tsx` needs:

### 4a. Group by Type
- Order references into 4 groups: Notes, Links, Images, Videos (in that order).
- Each group is a collapsible section with a header showing the type name and count.
- Groups start expanded by default.
- Collapse state is persisted in `localStorage` (key: `ref-collapse-${brainstormId}`).

### 4b. Tile/List View Toggle
- Add a toggle (Grid/List icons) next to the "References" header.
- **Tile view** (current): 2-column grid of cards with thumbnails.
- **List view**: Single-column compact rows with small icon, title, and description on one line.
- View preference persisted in `localStorage` (key: `ref-view-mode`).

### 4c. Sorting
- Add a sort dropdown next to the view toggle with options:
  - Alphabetical (A-Z)
  - Reverse Alphabetical (Z-A)
  - Newest First
  - Oldest First
  - Recently Accessed (by `updated_at` or `created_at` as a proxy)
- Sort preference persisted in `localStorage`.
- Sorting is applied within each type group.

### 4d. Editing References After Creation
- Clicking a reference tile/row opens a behavior based on type (current: links open externally, notes/images/videos open viewer).
- Add an "Edit" button (pencil icon) on each reference card (next to the delete X).
- Clicking Edit opens the same dialog used for creation, pre-filled with the reference's current data.
- On save, update the reference in the database via `supabase.from("brainstorm_references").update(...)`.

### Implementation
All changes are in `src/pages/BrainstormWorkspace.tsx`:
- Add state: `refViewMode`, `refSortMode`, `collapsedGroups`, `editingRef`.
- Group references by type using a helper function.
- Render each group as a collapsible section using `Collapsible` from `@/components/ui/collapsible`.
- Add sort/view controls in the references header bar.
- Add edit mutation and edit dialog (reuse the existing add-reference dialog with pre-filled values).

---

## 5. Project Detail Page

### 5a. New Route and Page
- Add route `/projects/:id` in `src/App.tsx`.
- Create `src/pages/ProjectWorkspace.tsx`.

### 5b. Promote to Project: Carry Over Data
Update `promoteToProject` mutation in `BrainstormWorkspace.tsx` to also copy:
- `category` from brainstorm
- `compiled_description` as `general_notes` (already done)
- `tags` from brainstorm
- `bullet_breakdown` from brainstorm

This requires adding columns to the `projects` table via migration:
- `category` (text, nullable)
- `tags` (text[], nullable)  
- `bullet_breakdown` (text, nullable)
- `compiled_description` (text, nullable)

### 5c. Copy References to Project
When promoting, also copy all `brainstorm_references` rows, changing `brainstorm_id` to reference the new project. This requires either:
- A `project_references` table (mirroring `brainstorm_references` but with `project_id`), OR
- Adding a nullable `project_id` column to `brainstorm_references`.

**Chosen approach**: Create a new `project_references` table mirroring `brainstorm_references` with `project_id` instead. During promotion, copy all references from the brainstorm.

### 5d. Project Detail Page Layout
`src/pages/ProjectWorkspace.tsx`:
- Title bar with project name, category badge, red Delete button.
- Compiled description (read-only or editable).
- Bullet breakdown.
- Tags display.
- References section (same grouped/sortable view as brainstorms).
- Status indicator (Planning/In Progress/Testing/Done) with ability to change.

### 5e. Sidebar Link
Update `getDetailPath` in `AppSidebar.tsx` to link to `/projects/${itemId}` instead of just `/projects`.

### 5f. Projects List Page Updates
Update `src/pages/Projects.tsx`:
- Make project cards clickable to navigate to `/projects/${id}`.
- Show category, description preview, and tags on cards (like brainstorm tiles).

---

## 6. Database Migration

New columns on `projects`:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bullet_breakdown text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS compiled_description text;
```

New `project_references` table:
```sql
CREATE TABLE project_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  url text,
  description text,
  thumbnail_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project refs"
ON project_references FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Summary of All Files

| File | Changes |
|---|---|
| Migration SQL | Add columns to `projects`, create `project_references` table |
| `src/components/ReferenceViewer.tsx` | Remove custom X buttons; style built-in close button for dark backgrounds |
| `src/pages/Brainstorms.tsx` | Replace refs badge with Active/Complete status badge |
| `src/components/AppSidebar.tsx` | Lower staleTime, link projects to detail page |
| `src/pages/BrainstormWorkspace.tsx` | Reference grouping, sorting, view toggle, editing; invalidate sidebar queries; promote copies all data |
| `src/pages/ProjectWorkspace.tsx` (new) | Project detail page with all carried-over data |
| `src/pages/Projects.tsx` | Make cards clickable, show category/tags/description |
| `src/App.tsx` | Add `/projects/:id` route |




# Brainstorms View Toggle, Ideas Modal Tweaks, Brainstorm Workspace Layout & Typography

## 1. Brainstorms Page -- List/Tile View Toggle + Delete Button

**File: `src/pages/Brainstorms.tsx`**

- Add `viewMode` state initialized from `localStorage.getItem("brainstorms-view-mode") || "grid"`, persist on change
- Add Grid3X3 and List icon toggle buttons in the header next to "New Brainstorm"
- Grid view: responsive `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with compact cards
- List view: current `space-y-3` vertical stack
- Add a soft-delete mutation (update `deleted_at`) and a red "Delete" button on each card (stopping event propagation so the card click still navigates)

## 2. Ideas Page -- Persistent View Mode

**File: `src/pages/Ideas.tsx`**

- Initialize `viewMode` from `localStorage.getItem("ideas-view-mode") || "grid"`, write to localStorage on change

## 3. Ideas Modal -- Title Below Category Chip + Delete Button in Footer

**File: `src/pages/Ideas.tsx` (IdeaDetailModal)**

- Restructure the `DialogHeader`: stack category badge and title vertically (badge first, title below)
- Remove the trash icon button from the header
- Add a red "Delete" `Button variant="destructive"` in the `DialogFooter` with `className="mr-auto"` to push it left, keeping Close and Start Brainstorm right-aligned

## 4. Brainstorm Workspace -- Two-Column Layout

**File: `src/pages/BrainstormWorkspace.tsx`**

Restore a two-column layout below the title bar:

- **Left column** (approx 3/5 width): AI Interview card, then References section below it
- **Right column** (approx 2/5 width): Compiled Description, then Bullet Breakdown

Keep the title bar, linked idea badge, and promote button full-width above the columns.

## 5. Linked Idea Badge -- Opens Idea Popup

**File: `src/pages/BrainstormWorkspace.tsx`**

- Add state for `showLinkedIdea` (boolean)
- Make the "Linked Idea" badge clickable -- on click, set `showLinkedIdea = true`
- Render a `Dialog` that displays the linked idea details (using data already fetched via the brainstorm query's `ideas(...)` join): category badge, title, raw_dump, processed_summary, key_features, tags
- This is a read-only popup (no delete/brainstorm actions needed since it's already linked)

## 6. Brainstorm Workspace -- Delete Button

**File: `src/pages/BrainstormWorkspace.tsx`**

- Add a soft-delete mutation for the brainstorm (update `deleted_at`)
- Add a red "Delete" button in the title bar area (next to Promote to Project), which soft-deletes and navigates back to `/brainstorms`

## 7. Typography & Visual Framing for Wiki Sections

**File: `tailwind.config.ts`**

- Install and add `@tailwindcss/typography` plugin

**File: `src/components/EditableMarkdown.tsx`**

- Update the read-mode container with visual framing: `bg-zinc-900/50 border border-white/5 rounded-lg p-4`
- Update the prose wrapper to use `prose prose-invert max-w-none` for proper dark-mode list formatting, bullet points, and spacing
- Add `leading-relaxed` and softer text color (`text-gray-300`) for readability
- The edit-mode textarea gets matching container styling for visual consistency

**File: `src/pages/BrainstormWorkspace.tsx`**

- The Description and Bullet Breakdown sections already use `EditableMarkdown`, so the typography improvements cascade automatically

---

## Files to Modify

| File | Changes |
|---|---|
| `src/pages/Brainstorms.tsx` | Grid/list toggle, localStorage persistence, soft-delete with red Delete button |
| `src/pages/Ideas.tsx` | localStorage persistence for viewMode, modal header restructure (title below badge), move delete to footer as red button |
| `src/pages/BrainstormWorkspace.tsx` | Two-column layout (left: interview + refs, right: description + bullets), linked idea popup dialog, red delete button in title bar |
| `src/components/EditableMarkdown.tsx` | Visual framing containers, `prose prose-invert` classes, `leading-relaxed`, softer text color |
| `tailwind.config.ts` | Add `@tailwindcss/typography` plugin |
| `package.json` | Add `@tailwindcss/typography` dependency |

---

## Technical Notes

- localStorage keys: `"ideas-view-mode"` and `"brainstorms-view-mode"`
- The linked idea popup reuses data from the existing brainstorm query join (`ideas(raw_dump, processed_summary, title, key_features, tags, category)`) -- no extra fetch needed
- `@tailwindcss/typography` provides the `prose` and `prose-invert` classes that restore proper list markers, heading sizes, and paragraph spacing stripped by Tailwind's CSS reset
- Soft delete on brainstorms page uses `update({ deleted_at: new Date().toISOString() })` same pattern as ideas
- The two-column grid uses `grid grid-cols-1 lg:grid-cols-5` with `lg:col-span-3` (left) and `lg:col-span-2` (right)

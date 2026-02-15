

# Rich Text Notes, Badge Relocation, Scrapped Lock, Linked Badges, Colored Icons, Brainstorm Callout, and Project Resources

This plan covers 9 distinct changes across the application.

---

## 1. Rich Text Editor for Notes

**Current**: Notes use a plain `Textarea` for description input when adding/editing references.

**Change**: Replace the note description input with a basic rich text editor supporting bold, italic, underline, strikethrough, bullet lists, numbered lists, and indentation.

**Approach**: Use a lightweight approach without adding a heavy dependency -- build a toolbar above the `Textarea` that inserts markdown syntax (bold = `**text**`, bullets = `- item`, numbered = `1. item`, etc.). The note content is already rendered via `ReactMarkdown` in `EditableMarkdown`, so markdown-based formatting will display correctly. The toolbar buttons will wrap selected text or insert formatting at cursor position.

**Files**: Create `src/components/RichTextNoteEditor.tsx`. Update the Add/Edit reference dialogs in `BrainstormWorkspace.tsx` and `ProjectWorkspace.tsx` to use it when the ref type is "note".

---

## 2. Move Category and Linked Badges to Right of Timestamp

**Current (Brainstorm Workspace)**: Category badge and "Linked Idea" badge are in the title bar (line 682-694). Timestamp is on a separate line below (line 748-750).

**Change**: Move category badge and linked badges out of the title bar row. Place them inline to the right of the timestamp line:
```
Created Feb 14, 2026 at 4:07 PM  [Hardware/Electronics]  [Linked Idea]
```

**Current (Project Workspace)**: Category badge is in the title bar (line 294-296). Timestamp on line 331-333.

**Change**: Same pattern -- move category badge to the right of the timestamp. Add "Linked Brainstorm" and "Linked Idea" badges there too (see section 4).

**Current (Idea Detail Modal)**: Category badge is above the title (line 125-127). Timestamp on line 133-135.

**Change**: Move category badge to the right of the timestamp. Add "Linked Brainstorm" badge there too (see section 4).

**Files**: `BrainstormWorkspace.tsx`, `ProjectWorkspace.tsx`, `Ideas.tsx`

---

## 3. Scrapped Brainstorms Become Read-Only with AI Assistant

**Current**: `isCompleted` (line 163) controls read-only mode and switches AI from interview to chatbot. Only `status === "completed"` triggers this.

**Change**: Create an `isLocked` variable that is `true` when `status === "completed"` OR `status === "scrapped"`. Use `isLocked` everywhere `isCompleted` is currently used for:
- Making fields read-only
- Switching AI from interview to assistant chatbot
- Hiding edit/delete/promote buttons

When un-scrapped (moved back to active/backburner), `isLocked` becomes false and the page restores to editable with the AI interview.

**File**: `BrainstormWorkspace.tsx`

---

## 4. Linked Brainstorm and Linked Project Badges

### 4a. Projects: "Linked Brainstorm" Badge
The `projects` table already has `brainstorm_id`. Update the project query to join the brainstorm: `select("*, brainstorms(id, title, idea_id)")`. If `brainstorm_id` exists, show a "Linked Brainstorm" badge next to the timestamp. Clicking it navigates to `/brainstorms/{brainstorm_id}`.

If that brainstorm also has an `idea_id`, show a "Linked Idea" badge to the LEFT of "Linked Brainstorm". Clicking navigates to Ideas page and opens the idea modal.

### 4b. Brainstorms: "Linked Project" Badge
Query projects to find if any project references this brainstorm: `select("id, name").eq("brainstorm_id", id).is("deleted_at", null)`. If found, show a "Linked Project" badge to the right of "Linked Idea" (if present). Clicking navigates to `/projects/{project_id}`.

### 4c. Ideas: "Linked Brainstorm" and "Linked Project" Badges
In the Idea Detail Modal, query brainstorms for `idea_id = idea.id`. If found, show "Linked Brainstorm" badge. If that brainstorm also has a linked project (query projects for `brainstorm_id`), show "Linked Project" badge too. Both are clickable navigation links.

**Files**: `ProjectWorkspace.tsx`, `BrainstormWorkspace.tsx`, `Ideas.tsx`

---

## 5. Colored Reference Type Icons

**Current**: All ref icons use `text-muted-foreground` (gray).

**Change**: Assign distinct colors:
- Notes (StickyNote): `text-yellow-400`
- Links (LinkIcon): `text-blue-400`
- Images (Image): `text-emerald-400`
- Videos (Film): `text-red-400`

Apply these colors in the collapsible group headers AND on each reference card/row icon in both `BrainstormWorkspace.tsx` and `ProjectWorkspace.tsx`.

**Files**: `BrainstormWorkspace.tsx`, `ProjectWorkspace.tsx`

---

## 6. Brainstorm Callout on Project Page (Right Column)

**Current**: Right column has Tags, then Bullet Breakdown.

**Change**: Below Tags, add a collapsible "Brainstorm" callout section (default: collapsed). Only shown when the project has a `brainstorm_id`. Contents (all read-only):
1. Compiled Description from the brainstorm
2. Bullet Breakdown from the brainstorm
3. References from `brainstorm_references` table

This requires fetching the brainstorm data and its references. Query: `brainstorms(compiled_description, bullet_breakdown)` joined in the project query, plus a separate query for `brainstorm_references` filtered by `brainstorm_id`.

Collapse state persisted in `localStorage`.

Below the Brainstorm callout: GitHub Repository field (moved from left column to right column, under the callout).

**File**: `ProjectWorkspace.tsx`

---

## 7. Project Left Column: "Resources" Instead of "References"

**Current**: Left column has Description, GitHub URL, and References.

**Change**: 
- Rename "References" to "Resources" on the project page.
- Add a 5th resource type: "file" (for uploading system files, config files, .bat, .stl, .patch, text files, etc.).
- Resource type order: Notes, Links, Images, Videos, Files.
- The "Add" popover gets a "File" option with a file upload input (any file type).
- Files are uploaded to the `brainstorm-references` storage bucket (reuse existing bucket) under a project subfolder.
- Move GitHub URL from the left column to the right column (under the Brainstorm callout).

**Database**: No migration needed. The `project_references` table `type` field is text, so `"file"` works. The `url` field stores the storage URL.

**Files**: `ProjectWorkspace.tsx`

---

## 8. File Icon for Resources

Add `FileText` from lucide-react as the icon for the "file" type.
Color: `text-orange-400`

**File**: `ProjectWorkspace.tsx`

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/components/RichTextNoteEditor.tsx` (new) | Markdown toolbar component for note editing |
| `src/pages/BrainstormWorkspace.tsx` | Move badges to timestamp row; `isLocked` for scrapped+completed; colored ref icons; "Linked Project" badge; use rich text editor for notes |
| `src/pages/ProjectWorkspace.tsx` | Move badges to timestamp row; "Linked Brainstorm" + "Linked Idea" badges; brainstorm callout in right column; rename References to Resources; add "file" type; move GitHub to right column; colored icons; use rich text editor for notes |
| `src/pages/Ideas.tsx` | Move category badge to timestamp row; "Linked Brainstorm" + "Linked Project" badges in detail modal |

No database migration is needed -- all type fields are text and the storage bucket already exists.


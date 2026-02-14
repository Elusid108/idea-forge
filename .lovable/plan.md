
# UI Polish: Auto-focus, Colorful Icons, Delete Logic, Layout & Tags

## 1. Auto-focus Textarea After AI Response

**File: `src/pages/BrainstormWorkspace.tsx`**

Add a `useRef` for the answer textarea. After `handleSubmitAnswer` completes (in the `finally` block, after `setIsThinking(false)` and `setAnswer("")`), call `textareaRef.current?.focus()`. Also add the `ref` attribute to the Textarea element.

## 2. Colorful Sidebar Icons

**File: `src/components/AppSidebar.tsx`**

The screenshot shows emoji-style colorful icons in the sidebar labels. Replace the monochrome Lucide icons with the emoji strings already defined in the `sections` array:

- Ideas: show the lightbulb emoji (already in `section.emoji`)
- Brainstorms: show the brain emoji
- Projects: show the wrench emoji

Replace `<section.icon className="h-4 w-4" />` with `<span>{section.emoji}</span>` in the sidebar group labels. Also give the Trash icon a color (e.g., `text-muted-foreground`).

## 3. Remove Delete Button from Brainstorms List Page

**File: `src/pages/Brainstorms.tsx`**

Remove the red "Delete" button and the `deleteBrainstorm` mutation entirely from this file. Delete is only available inside the opened brainstorm workspace.

## 4. Prevent Deleting Ideas in "Brainstorming" Status

**File: `src/pages/Ideas.tsx` (IdeaDetailModal)**

When `idea.status === "brainstorming"`, hide the Delete button from the modal footer. The idea can only be deleted if its linked brainstorm is deleted first.

## 5. Move Compiled Description to Left Column

**File: `src/pages/BrainstormWorkspace.tsx`**

Change the two-column layout:

- **Left column** (3/5): AI Interview, then Compiled Description, then References
- **Right column** (2/5): Bullet Breakdown, then Tags section (new)

## 6. Display Tags on Brainstorm Workspace

**File: `src/pages/BrainstormWorkspace.tsx`**

Below the Bullet Breakdown in the right column, add a "Tags" section that displays tags from the linked idea (`linkedIdea?.tags`). Render them as `Badge` components with `variant="secondary"`. If no linked idea or no tags, show a subtle empty state.

## 7. Apply Idea Category to Brainstorm Display

**File: `src/pages/BrainstormWorkspace.tsx`**

Show the linked idea's category as a colored badge in the title bar (next to the "Linked Idea" badge). Use the existing `CATEGORY_COLORS` map for styling. This makes the category visible without needing a separate database column on brainstorms.

---

## Database Changes

**Migration needed:** Add `category` and `tags` columns to the `brainstorms` table so that when a brainstorm is created from an idea, the category and tags are copied over and can evolve independently.

```sql
ALTER TABLE public.brainstorms ADD COLUMN category text DEFAULT NULL;
ALTER TABLE public.brainstorms ADD COLUMN tags text[] DEFAULT NULL;
```

**File: `src/pages/Ideas.tsx`** (startBrainstorm mutation): Copy `idea.category` and `idea.tags` into the new brainstorm record during creation.

**File: `src/pages/BrainstormWorkspace.tsx`**: Use `brainstorm.category` and `brainstorm.tags` directly (with fallback to `linkedIdea` data for existing brainstorms). The brainstorm-chat edge function can also update tags as the brainstorm evolves.

---

## Files to Modify

| File | Changes |
|---|---|
| Migration SQL | Add `category` and `tags` columns to brainstorms table |
| `src/pages/BrainstormWorkspace.tsx` | Auto-focus textarea, move compiled description to left column, add tags section in right column, show category badge in title bar |
| `src/components/AppSidebar.tsx` | Replace Lucide icons with emojis in section labels |
| `src/pages/Brainstorms.tsx` | Remove delete button and mutation |
| `src/pages/Ideas.tsx` | Hide delete button when status is "brainstorming", copy category/tags on brainstorm creation |

---

## Technical Notes

- The textarea ref uses `useRef<HTMLTextAreaElement>(null)` and is passed to the `Textarea` component via the `ref` prop (Textarea already forwards refs)
- Tags are stored as `text[]` in Postgres (same as ideas table), rendered as Badge components
- Category is copied at brainstorm creation time so it can be displayed independently even if the idea is later modified
- For existing brainstorms without category/tags, fall back to `linkedIdea?.category` and `linkedIdea?.tags`
- The auto-focus happens after `setIsThinking(false)` using a small `setTimeout` to ensure the textarea is re-enabled before focusing

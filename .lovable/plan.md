

# Delete Confirmations, Category Updates, Link Fix, Brainstorm Tiles, and Storage Setup

## 1. Delete Confirmation Dialogs

Add an AlertDialog confirmation step before any soft-delete action across the app.

**Files to modify:**
- `src/pages/Ideas.tsx` -- Wrap the delete button in `IdeaDetailModal` with an AlertDialog ("Are you sure? This will move the idea to trash.")
- `src/pages/BrainstormWorkspace.tsx` -- Wrap the Delete button with an AlertDialog before calling `deleteBrainstorm.mutate()`
- `src/pages/Projects.tsx` -- When project deletion is added, include an AlertDialog there too
- `src/pages/Trash.tsx` -- Wrap the permanent "Delete" button with an AlertDialog ("This cannot be undone. Permanently delete?")

Each uses the existing `AlertDialog` component from `@/components/ui/alert-dialog`.

---

## 2. AI Category Updates During Interview

The `brainstorm-chat` edge function already updates tags and description during `submit_answer`. Category needs the same treatment.

**File: `supabase/functions/brainstorm-chat/index.ts`**
- Add `- Current category: ${context?.category || "None"}` to the system prompt
- Add `updated_category` (string) to the `process_answer` tool schema alongside `updated_tags`
- Update the user prompt to instruct: "5) If the direction has shifted, update the category. Use one of: Product, Process, Fixture/Jig, Tool, Art, Hardware/Electronics, Software/App, Environment/Space, or suggest a new one."

**File: `src/pages/BrainstormWorkspace.tsx`**
- Pass `category` in `getContext()`
- After receiving `submit_answer` response, read `data.updated_category` and include it in the brainstorms table update
- The UI already reads `brainstorm.category` so it will update automatically on query invalidation

---

## 3. Fix Link Opening Bug

The issue: when a user enters a URL like `google.com` (without `https://`), `window.open("google.com", "_blank")` treats it as a relative path, so the browser navigates to `currentdomain.com/brainstorms/google.com`.

**File: `src/pages/BrainstormWorkspace.tsx`**
- In `handleRefClick`, before calling `window.open`, prepend `https://` if the URL doesn't start with `http://` or `https://`:

```
const url = ref.url.match(/^https?:\/\//) ? ref.url : `https://${ref.url}`;
window.open(url, "_blank", "noopener,noreferrer");
```

---

## 4. Brainstorm Tiles to Match Idea Tiles

Currently brainstorm cards show: title, ref count badge, status badge, linked idea summary, and date. They should match the idea card layout with category badge, description, and max 4 visible tags.

**File: `src/pages/Brainstorms.tsx`**
- Update the query to also select `category, tags, compiled_description` from brainstorms
- Redesign the card to match the Ideas tile layout:
  - Top row: Category badge (colored, left) + Status badge (right)
  - Title (bold)
  - Description preview (compiled_description, 3-line clamp) 
  - Tags row: show max 4 tags, with a "+N more" indicator if there are more than 4
- Apply the same `CATEGORY_COLORS` map used in Ideas and BrainstormWorkspace

---

## 5. Storage Setup Guidance

Your uploaded images and videos aren't loading because the storage bucket needs to be created and made public. This requires a one-time database migration.

**Migration SQL** -- Create the `brainstorm-references` storage bucket and set it to public, plus add an RLS policy so authenticated users can upload:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('brainstorm-references', 'brainstorm-references', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Users can upload reference files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brainstorm-references');

CREATE POLICY "Users can view reference files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'brainstorm-references');

CREATE POLICY "Users can delete own reference files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brainstorm-references');
```

No code changes needed -- the upload logic in BrainstormWorkspace already uses `supabase.storage.from("brainstorm-references")`. Once the bucket exists and is public, images/videos will load.

---

## Summary of All Changes

| File | Changes |
|---|---|
| Migration SQL | Create `brainstorm-references` storage bucket (public) with RLS policies |
| `src/pages/Ideas.tsx` | Add AlertDialog confirmation before delete |
| `src/pages/BrainstormWorkspace.tsx` | Add AlertDialog for delete, fix link URL handling, pass category to AI context, save updated_category |
| `src/pages/Brainstorms.tsx` | Redesign tiles to match Ideas layout (category badge, description, max 4 tags) |
| `src/pages/Trash.tsx` | Add AlertDialog for permanent delete |
| `supabase/functions/brainstorm-chat/index.ts` | Add `updated_category` to process_answer tool schema and system prompt |


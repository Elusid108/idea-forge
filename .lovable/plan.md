

# Execution Strategy Fix, Expense Receipts, Task Grouping, Note HTML Cleanup, Project Layout Restructure, and Project AI Chatbot

This plan covers 7 areas of work, including a new edge function and a database migration.

---

## 1. Fix Execution Strategy Not Generating on Promote

**Problem**: The `generate-strategy` edge function is invoked but logs show no activity, suggesting the call may be silently failing. The function also doesn't include notes from brainstorm references.

**Changes**:

**`src/pages/BrainstormWorkspace.tsx`** (promote mutation, ~line 388):
- Fetch brainstorm references (notes specifically) before invoking the edge function.
- Pass `notes` in the body alongside `title`, `description`, `bullets`, `tags`, `category`.
- Add `.catch(err => console.error("Strategy generation failed:", err))` for debugging.
- Await the function invocation so we can catch errors properly.

**`supabase/functions/generate-strategy/index.ts`**:
- Accept `notes` parameter in the request body.
- Include notes in the prompt: `Notes/Research: ${notes || "None"}`.
- Update CORS headers to include full list (matching other functions).

---

## 2. Fix Expense Receipt Retrieval

**Problem**: The `project-assets` storage bucket is set to `is_public: No`, so `getPublicUrl()` returns a URL that 403s.

**Fix**: Either make the bucket public (like `brainstorm-references`) or use `createSignedUrl()` instead.

**Database migration**: Make the `project-assets` bucket public:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'project-assets';
```

**Also add vendor field**:
- Add a `vendor` column to `project_expenses` table.
- Update expense form in `ProjectWorkspace.tsx` to include a Vendor input field.
- Display vendor in the expense row.

---

## 3. Completed Tasks in Collapsible Group

**Changes in `src/pages/ProjectWorkspace.tsx`** (Tasks section, ~line 666-724):
- Split tasks into `activeTasks` (not completed) and `completedTasks` (completed).
- Render active tasks in the main list.
- Render completed tasks inside a `Collapsible` component (default closed) with header "Completed ({count})".
- Add a `completedTasksOpen` state defaulting to `false`.

---

## 4. Strip HTML from Note Preview in List/Tile View

**Problem**: Notes stored as HTML show raw `<ol><li>` tags in the reference list preview (screenshot confirms this).

**Changes in both `src/pages/ProjectWorkspace.tsx` and `src/pages/BrainstormWorkspace.tsx`**:
- Create a `stripHtml` utility function: `(html: string) => html.replace(/<[^>]*>/g, "").trim()`.
- In the reference list/tile rendering, where `ref.description` is displayed as preview text, wrap with `stripHtml()` for note-type references:
  - Grid view (line ~829 in ProjectWorkspace): `{ref.type === "note" ? stripHtml(ref.description) : ref.description}`
  - List view (line ~1021 in BrainstormWorkspace): same treatment.

---

## 5. Restructure Project Page Layout

**Problem**: The user wants to remove the brainstorm callout and redistribute its elements. New layout:

**Left column** (top to bottom):
1. Description (always shown -- carried from brainstorm if linked)
2. Execution Strategy
3. Project AI Chatbot (new -- see section 7)
4. Tasks
5. Resources
6. Expenses

**Right column** (top to bottom):
1. Tags
2. GitHub (URL + widget)
3. References from brainstorm (if linked) -- displayed as a standalone section, not inside a collapsible callout
4. Bullet Breakdown (always shown, from brainstorm if linked, editable if standalone)

**Changes in `src/pages/ProjectWorkspace.tsx`**:
- Remove the brainstorm callout `Collapsible` component entirely.
- Always show Description (left) and Bullet Breakdown (right), removing the `!brainstormId &&` conditions.
- Move brainstorm references to the right column as "Brainstorm References" section (between GitHub and Bullet Breakdown).
- Keep the description editable -- it saves to `compiled_description` on the project.

---

## 6. Note List Formatting in Rich Text Editor

**Problem**: Bullet and numbered lists created via toolbar buttons don't render in the `contentEditable` editor, only appearing after save. This is likely because `document.execCommand("insertUnorderedList")` requires a selection/cursor to be inside the editor, and the `onMouseDown` with `preventDefault` may cause the editor to lose focus.

**Changes in `src/components/RichTextNoteEditor.tsx`**:
- The `execCmd` function already calls `editorRef.current?.focus()` before `execCommand`. Verify this works. If the issue persists, ensure `handleInput` is called after `execCmd` to sync state.
- The real issue may be that `handleInput` reads `innerHTML` but the DOM hasn't updated yet after `execCommand`. Add a `requestAnimationFrame` wrapper around the `handleInput()` call inside `execCmd` to ensure the DOM has updated.

---

## 7. Project AI Chatbot (New Feature)

**Purpose**: An AI assistant below the Execution Strategy that can modify strategy, manage tasks, and create notes. It takes in description, bullet breakdown, brainstorm notes (if linked), and project notes as context.

### New Edge Function: `supabase/functions/project-chat/index.ts`

System prompt instructs the AI to:
- Help the user plan and execute their project
- Suggest resources (websites, books, articles) with specific titles/authors/dates
- Return structured tool calls for actions: `update_strategy`, `add_task`, `update_task`, `remove_task`, `create_note`

Uses tool calling with these tools:
- `update_strategy`: `{ strategy: string }` -- replaces execution strategy
- `add_task`: `{ title, description, priority, due_date }` -- creates a task
- `create_note`: `{ title, content }` -- creates a project reference note
- `respond`: `{ message }` -- plain text response

Input context includes: description, bullet_breakdown, notes (from brainstorm refs + project refs), execution_strategy, tasks list.

### UI in `src/pages/ProjectWorkspace.tsx`

Place below the Execution Strategy section:
- Chat interface with message history (stored in component state, not persisted)
- Input field + Send button
- Streaming responses using SSE (same pattern as brainstorm chat)
- When tool calls are returned, execute them:
  - `update_strategy`: update the project's `execution_strategy` via mutation
  - `add_task`: insert into `project_tasks` via mutation
  - `create_note`: insert into `project_references` with type "note"
  - `respond`: display the message in chat
- Messages from the AI that include links should be rendered with ReactMarkdown

### Config update: `supabase/config.toml`
Add `[functions.project-chat]` with `verify_jwt = false`.

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Restructure layout (remove callout, always show desc/bullets); completed tasks collapsible; strip HTML from note previews; vendor field on expenses; project AI chatbot UI |
| `src/pages/BrainstormWorkspace.tsx` | Fix strategy generation call (include notes); strip HTML from note previews |
| `src/components/RichTextNoteEditor.tsx` | Fix list rendering with `requestAnimationFrame` in `execCmd` |
| `supabase/functions/generate-strategy/index.ts` | Accept and include notes in prompt; fix CORS headers |
| `supabase/functions/project-chat/index.ts` | New edge function for project AI assistant with tool calling |
| `supabase/config.toml` | Add project-chat function entry |
| Database migration | Make `project-assets` bucket public; add `vendor` column to `project_expenses` |


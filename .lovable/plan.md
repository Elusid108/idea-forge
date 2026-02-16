

# Campaign Assistant Tools, Expand/Reduce Chat, WYSIWYG Lists, Project Column Reorder, and Gotchas Feature

This plan covers 5 major changes across multiple files and a new database table + edge function.

---

## 1. Campaign Assistant: Add Note Creation and Task Addition Tools

**File: `supabase/functions/campaign-chat/index.ts`**

Update the `assistant` mode to use tool-calling (like `project-chat` does) instead of plain chat. Add two tools:

- **`create_note`**: Creates a campaign reference (note type) in `campaign_references`. Parameters: `title` (string), `content` (string, HTML).
- **`add_task`**: Adds a task to any of the 5 Kanban columns. Parameters: `title` (string), `description` (string), `status_column` (enum of the 5 phases).

Update the system prompt to include these capabilities and instruct the AI to use them when appropriate. Also include a `notes` field in the context showing existing campaign references.

**File: `src/pages/CampaignWorkspace.tsx`**

Update `handleChatSubmit` to process returned `actions` array (same pattern as ProjectWorkspace's chat handler):
- For `create_note` actions: insert into `campaign_references` and invalidate query, show a clickable badge in the chat message.
- For `add_task` actions: insert into `campaign_tasks` and invalidate query.

Update `ChatMsg` type to include optional `noteId` and `noteTitle` fields.

---

## 2. Expand/Reduce Button on All Chat Assistants

**File: `src/components/FloatingChatWidget.tsx`**

Add a new `"maximized"` state alongside `"collapsed"` and `"expanded"`. Add an expand/reduce toggle button next to the X button in the title bar.

- **Expanded (default)**: Current size (`w-[400px] max-h-[500px]`).
- **Maximized**: Larger size (`w-[600px] max-h-[80vh]`), with increased message area (`max-h-[60vh]`).
- Use `Maximize2` icon when in expanded state, `Minimize2` icon when maximized.
- Both states persist to localStorage. The X button always collapses.

This automatically applies to all three assistants (Project, Brainstorm, Campaign) since they all use `FloatingChatWidget`.

---

## 3. Fix WYSIWYG Bullet/Numbered Lists in EditableMarkdown

**File: `src/components/EditableMarkdown.tsx`**

The current `markdownToHtml` and `htmlToMarkdown` converters are too simplistic -- they don't properly handle nested lists, ordered lists mixed with unordered lists, or list items created by the `RichTextNoteEditor` toolbar.

Key fixes:
- **`markdownToHtml`**: Properly group consecutive `- ` lines into `<ul>` and consecutive `1. ` lines into `<ol>`. Handle indented sub-items.
- **`htmlToMarkdown`**: Properly detect `<ol>` vs `<ul>` and convert `<li>` inside `<ol>` to numbered format (`1. item`) and inside `<ul>` to `- item`. Currently everything becomes `- item`.
- Preserve list context when converting back, so round-tripping works: edit in WYSIWYG, save as markdown, re-open in WYSIWYG -- lists should survive intact.

---

## 4. Project Page Right Column Reorder

**File: `src/pages/ProjectWorkspace.tsx`** (lines 1086-1367)

Current right column order:
1. Tags
2. GitHub Repository
3. GitHub Activity Widget
4. Brainstorm References
5. Bullet Breakdown
6. Resources

New desired order:
1. Tags
2. Bullet Breakdown
3. Brainstorm References
4. GitHub Repository
5. Resources

Move the Bullet Breakdown section (lines 1224-1234) to directly after Tags (after line 1100). Move Brainstorm References (lines 1197-1222) to after Bullet Breakdown. Keep GitHub Repository + Activity Widget after Brainstorm References. Resources stays at the end.

---

## 5. Gotchas Feature: Root Cause Autopsy (5 Whys)

### 5a. Database Migration

Create a new `gotchas` table:

```sql
CREATE TABLE public.gotchas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  symptom text NOT NULL DEFAULT '',
  root_cause text,
  status text NOT NULL DEFAULT 'active',
  chat_history jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gotchas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own gotchas"
  ON public.gotchas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 5b. Edge Function: `supabase/functions/gotcha-chat/index.ts`

Create a new edge function with two modes:

- **`ask_why`**: System prompt as a strict Root Cause Investigator. Takes the symptom and chat history, asks "Why did this happen?" Only one question at a time. Up to 5 rounds. If the user says "I don't know" / "I'm not sure", returns an `investigation_task` instead of another why. If root cause is reached, returns `root_cause` and a `corrective_action_task`.

- Uses tool calling to return structured output:
  - `ask_why_result`: `{ next_question?: string, investigation_task?: string, root_cause?: string, corrective_action_task?: string }`

Register in `supabase/config.toml` with `verify_jwt = false`.

### 5c. UI in ProjectWorkspace

**File: `src/pages/ProjectWorkspace.tsx`**

Add a "Gotchas" section near the Tasks area (in the left column, after Tasks and before Expenses):

- Query `gotchas` table for the project.
- Display active/investigating gotchas as cards with amber/red border.
- "+ Add Gotcha" button opens a modal.

**Gotcha Modal (two states):**

**State 1 - Definition:**
- Large textarea: "What is the Gotcha?"
- "Start Autopsy" button saves symptom, transitions to State 2.

**State 2 - AI Interview (5 Whys):**
- Flashcard-style Q&A: AI asks why, user answers.
- Show current why round (1-5).
- If AI returns `investigation_task`: auto-create a project task (via `addTask` mutation), set gotcha status to `investigating`, show message, close modal.
- If AI returns `root_cause`: save to gotcha, set status to `resolved`, auto-create corrective action task, close modal with success toast.
- "I don't know" / "I'm not sure" responses are sent to the AI which handles the pivot logic.

**Gotcha cards display:**
- Active: amber border, symptom text, "Continue Autopsy" button.
- Investigating: amber border + investigating badge, symptom text.
- Resolved: green border, symptom + root cause summary, collapsed by default.

---

## Technical Summary

| Area | File(s) | Changes |
|---|---|---|
| Campaign Assistant tools | `campaign-chat/index.ts`, `CampaignWorkspace.tsx` | Add `create_note` and `add_task` tool-calling to assistant mode; process actions on frontend |
| Expand/reduce chat | `FloatingChatWidget.tsx` | Add maximized state with toggle button next to X |
| WYSIWYG lists | `EditableMarkdown.tsx` | Fix `markdownToHtml` and `htmlToMarkdown` converters for proper list handling |
| Project column order | `ProjectWorkspace.tsx` | Reorder right column: Tags, Bullet Breakdown, Brainstorm Refs, GitHub, Resources |
| Gotchas table | DB migration | Create `gotchas` table with RLS |
| Gotchas edge function | `gotcha-chat/index.ts`, `config.toml` | New edge function for 5 Whys root cause analysis |
| Gotchas UI | `ProjectWorkspace.tsx` | Gotchas section with modal, AI interview, auto-task creation |


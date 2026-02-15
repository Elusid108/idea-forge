

# Task Sorting, Subtasks, Task Preview, and AI Chat Note Links

This plan covers 4 areas: task sorting by due date/priority, subtask support, task detail preview popup, and improved AI chat note linking.

---

## 1. Task Sorting by Due Date then Priority

**File**: `src/pages/ProjectWorkspace.tsx`

Currently `activeTasks` and `completedTasks` are split from `tasks` (ordered by `sort_order` from DB). Change the sorting logic:

- Sort active tasks: first by `due_date` ascending (nulls last), then by priority weight (`critical=0, high=1, medium=2, low=3`).
- Same sorting for completed tasks.

```
const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 };

const sortTasks = (list) => [...list].sort((a, b) => {
  // Due date first (nulls last)
  if (a.due_date && b.due_date) {
    const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (diff !== 0) return diff;
  } else if (a.due_date) return -1;
  else if (b.due_date) return 1;
  // Then priority
  return (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2);
});
```

Update `activeTasks` and `completedTasks` useMemo to use `sortTasks`.

---

## 2. Subtask Support

### Database Migration

Add a `parent_task_id` column to `project_tasks`:

```sql
ALTER TABLE public.project_tasks
  ADD COLUMN parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE;
```

### UI Changes in `src/pages/ProjectWorkspace.tsx`

- Filter `activeTasks` into top-level tasks (`parent_task_id IS NULL`) and subtasks.
- Render subtasks indented below their parent task with `ml-6` or similar.
- The task form dialog gets an optional "Parent Task" select dropdown (only shown when adding subtasks).
- Add a small "+" button on each task row to create a subtask under that task (opens the task dialog with `parent_task_id` pre-set).
- Subtasks appear directly below their parent in the sorted list, also sorted by due date/priority within a parent.

### AI Tool Update

**File**: `supabase/functions/project-chat/index.ts`

- Add `parent_task_id` as an optional parameter to the `add_task` tool.
- Update the system prompt to instruct the AI:
  - It can create subtasks by specifying `parent_task_id`.
  - It should set due dates based on estimated task length and desired timeline.
  - If the user hasn't stated a timeline, the AI should ask about it.
  - If no timeline is given after asking, order tasks by logical sequence of operations.

---

## 3. Task Detail Preview Popup

**File**: `src/pages/ProjectWorkspace.tsx`

- Add a `viewingTask` state (initially null).
- Clicking a task row (not the checkbox or action buttons) sets `viewingTask`.
- Render a `Dialog` showing full task details: Title, Description, Priority badge, Due Date, Completion status, Created date, Subtasks list (if any).
- Include Edit and Delete buttons in the dialog footer.

---

## 4. AI Chat: Link to Generated Notes

**Problem**: When the AI creates a note via `create_note`, the chat just shows a toast. The user wants a clickable link in the chat to open the note.

**Changes in `src/pages/ProjectWorkspace.tsx`** (handleChatSubmit, ~line 601):

When a `create_note` action is processed:
- After inserting the note, capture the returned note `id`.
- Append a special marker to the assistant message content indicating a note was created, e.g. append `\n\n[View Note: {title}](#note-{id})` to the message.
- When rendering assistant messages, detect these `#note-{id}` links and make them clickable. On click, find the note in `references` and open it in `ReferenceViewer` (set `viewingRef`).

Alternatively, simpler approach: after inserting the note and getting the ID, add a separate "system" style message in chat with a clickable button/badge to open the note. This avoids parsing markdown links.

Implementation: Add a `noteId` field to `ChatMsg` type. When a note is created, the assistant message includes `noteId` and `noteTitle`. In the chat renderer, if `msg.noteId` exists, render a clickable badge below the message text that opens the note viewer.

### Note Viewer Spacing Fix

The screenshot shows the note content is cramped. In `ReferenceViewer.tsx`, ensure the note content rendering has proper spacing:
- Add `[&_li]:my-1` and `[&_ul]:my-2 [&_ol]:my-2` classes to the prose wrapper for better list spacing.
- Ensure `[&_p]:my-2` for paragraph spacing.

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Task sorting by due date/priority; subtask rendering with indentation; task preview dialog; AI chat note links; subtask "+" button on task rows |
| `supabase/functions/project-chat/index.ts` | Add `parent_task_id` to `add_task` tool; update system prompt for timeline awareness and subtask creation |
| `src/components/ReferenceViewer.tsx` | Improve note content spacing (list margins, paragraph margins) |
| Database migration | Add `parent_task_id` column to `project_tasks` |


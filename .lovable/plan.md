

# Gotcha Improvements, Clickable Past Gotchas, Task Quality, Enter-to-Submit, and Project Locking

This plan covers 4 areas of changes across `ProjectWorkspace.tsx`, the `gotcha-chat` edge function, and the `project-chat` edge function.

---

## 1. Gotcha Modal UX: Enter-to-Submit and Auto-Focus

**File: `src/pages/ProjectWorkspace.tsx`**

- Add an `onKeyDown` handler to the Gotcha answer `<Textarea>` (line ~1831) so pressing Enter (without Shift) submits the answer, same pattern as the project chat (`handleChatKeyDown`).
- Add a `useRef` for the gotcha answer textarea and call `.focus()` after each AI response is received (in the `finally` block or after setting `gotchaQuestion`). This ensures the textarea is selected for easy text entry after each round.
- Also add Enter-to-submit on the "define" state textarea to trigger "Start Autopsy".

---

## 2. Clickable Past Gotchas (View History Modal)

**File: `src/pages/ProjectWorkspace.tsx`**

Currently, gotcha cards only show "Continue Autopsy" for `active` status. The user wants to click any gotcha (including `investigating` and `resolved`) to view its full history.

- Make the gotcha symptom text and root cause clickable (wrap in a `cursor-pointer` div with `onClick`).
- On click, open the Gotcha modal in a **read-only "view" state** (`gotchaModalState === "view"`):
  - Show the symptom at the top.
  - Render the full `chat_history` as a scrollable conversation (alternating user/assistant messages with markdown rendering).
  - Show the root cause summary if resolved.
  - For `active` gotchas, include a "Continue Autopsy" button at the bottom that transitions to the `autopsy` state.
  - For `investigating` gotchas, show a message about the investigation task.
- Add a new `"view"` option to the `gotchaModalState` type (currently `"define" | "autopsy"`, becomes `"define" | "autopsy" | "view"`).

---

## 3. Fix Task Name/Description Swap and Add Subtask Support to Gotcha Engine

The current Gotcha task creation (lines ~1857-1870) puts the full AI text into `title` and a generic string into `description`. This is backwards -- the AI-generated text is too long for a title.

### 3a. Edge Function Update: `supabase/functions/gotcha-chat/index.ts`

Update the `autopsy_response` tool schema to return structured task data with proper separation:

- For `investigation_task`: Change from a single string to an object with fields: `title` (short actionable title), `description` (detailed instructions), and optionally `subtasks` (array of `{ title, description }`).
- For `corrective_action_task`: Same structure -- `title`, `description`, and optional `subtasks`.
- Update the system prompt to instruct the AI to:
  - Return a SHORT task title (under 10 words) and a detailed description separately.
  - Break complex corrective actions into a parent task with subtasks.
  - The gotcha symptom itself should conceptually be the "parent" concern, with investigation/corrective tasks as actionable items.

Updated tool schema (relevant parts):
```
investigation_task: {
  type: "object",
  properties: {
    title: { type: "string", description: "Short task title (under 10 words)" },
    description: { type: "string", description: "Detailed instructions" },
    subtasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  }
}
```

### 3b. Frontend Task Creation: `src/pages/ProjectWorkspace.tsx`

Update the Gotcha modal's task creation logic (lines ~1856-1872) to:

- Use `data.investigation_task.title` for the task title and `data.investigation_task.description` for the description.
- If `subtasks` are provided, insert the parent task first, get its ID, then insert each subtask with `parent_task_id` set.
- Same pattern for `corrective_action_task`.
- Handle backward compatibility: if the AI returns a plain string instead of an object, use the string as description and generate a short title like "Investigate: [first few words]".

---

## 4. Project Locking When Linked to a Campaign

**File: `src/pages/ProjectWorkspace.tsx`**

When `(project as any).campaign_id` is set, the project should be locked:

- **Status selector**: Already hidden when `campaign_id` exists (line 881). Good.
- **Title editing**: Disable the `onClick` that sets `editingTitle` when campaign is linked.
- **Description / Execution Strategy / Bullet Breakdown**: Pass a `readOnly` prop or `disabled` state to `EditableMarkdown` components. Since `EditableMarkdown` likely uses an `onClick` to enter edit mode, add a check: if `campaign_id` exists, don't enter edit mode.
- **Task mutations**: Hide "Add Task", "+", edit, and delete buttons on tasks. Hide task completion checkbox. Keep tasks visible but read-only.
- **Gotchas**: Hide "Add Gotcha" button. Keep existing gotchas visible (read-only).
- **Expenses**: Hide "Add Expense" button and edit/delete controls.
- **References/Resources**: Hide add/edit/delete controls.
- **"Launch Campaign" and "Delete" buttons**: Already conditionally hidden. The delete button should still work (to allow unlinking).
- **Status forced to "done"**: The status cannot be changed from "done" while linked.

Create a derived boolean at the top of the component:
```typescript
const isLocked = !!(project as any).campaign_id;
```

Use this throughout the JSX to conditionally hide edit controls.

**Chat Assistant**: The assistant remains interactive (user can chat), but the `handleChatSubmit` function should skip executing any actions (no task creation, no strategy updates, no note creation) when `isLocked` is true. The AI should still respond conversationally. Update the system prompt context to include a note that the project is locked.

**Unlock condition**: The project becomes editable again only when the linked campaign is deleted. This is already handled -- when a campaign is deleted, `campaign_id` is nulled out on the project. No additional code needed for this.

- Show a small banner or notice at the top when locked: "This project is locked because it has an active campaign. Delete the linked campaign to unlock editing."

---

## Technical Summary

| Area | File(s) | Changes |
|---|---|---|
| Enter-to-submit + auto-focus | `ProjectWorkspace.tsx` | Add onKeyDown to gotcha textarea, useRef + focus after AI response |
| Clickable past gotchas | `ProjectWorkspace.tsx` | New "view" modal state showing full chat history |
| Fix task name/description | `gotcha-chat/index.ts`, `ProjectWorkspace.tsx` | Structured task objects with title/description/subtasks |
| Project locking | `ProjectWorkspace.tsx` | `isLocked` boolean disabling all edit controls when campaign is linked |




# AI Quality Improvements, Task Preview Completion, Link Auto-Prefix, Progress Bar, and Floating Chat Widget

This plan covers 5 areas of work across both the Project and Brainstorm workspaces.

---

## 1. Improve AI Task Generation Quality

**Problem**: The AI created tasks with dates in 2024, only used the 14th/29th, created no subtasks, and didn't put much thought into the plan.

**File**: `supabase/functions/project-chat/index.ts`

Changes to the system prompt:
- Add explicit instruction: "Today's date is ${new Date().toISOString().split('T')[0]}. NEVER use dates in the past."
- Emphasize that when given a timeline (e.g. "3 months"), the AI must:
  - Calculate the actual end date from today
  - Distribute tasks across the full timeline with realistic, varied dates
  - Create parent tasks for major phases/milestones
  - Create subtasks under each parent for the actual work items
  - Each subtask should have its own estimated due date
- Add instruction: "Think carefully about dependencies -- what needs to happen before what. Group related work into parent tasks with subtasks for the specific steps."
- Increase `max_tokens` from 2000 to 4000 to allow for more thorough task generation

---

## 2. Complete a Task from the Preview Dialog

**Problem**: You can view a task in the preview popup but cannot mark it complete from there.

**File**: `src/pages/ProjectWorkspace.tsx` (Task Preview Dialog, ~line 1427)

- Add a "Mark Complete" / "Mark Active" button to the dialog footer
- When clicked, toggle the task's `completed` status and close the dialog (or update the viewingTask state)

---

## 3. Auto-Prefix `https://` on Link References

**Problem**: Links without `https://` don't load when clicked.

**File**: `src/pages/ProjectWorkspace.tsx`
- In `handleAddRef` (~line 450): when `addRefType === "link"`, auto-prefix `https://` to `refForm.url` if it doesn't already start with `http://` or `https://`
- In `handleRefClick` (~line 434): the code already handles this for click navigation. Also apply it when saving/updating references via `updateReference`.

**File**: `src/pages/BrainstormWorkspace.tsx`
- Same treatment for brainstorm reference add/edit flows.

---

## 4. Task Progress Bar

**File**: `src/pages/ProjectWorkspace.tsx` (Tasks section header, ~line 930-941)

- Import `Progress` from `@/components/ui/progress`
- Add a progress bar below the Tasks header showing `completedTasks.length / tasks.length * 100`
- Show percentage text next to the bar: "X% complete"
- Only show when there are tasks

---

## 5. Floating Chat Widget (Gmail-style Flag)

**Problem**: The AI chat is currently inline in both BrainstormWorkspace and ProjectWorkspace. The user wants it as a floating widget in the bottom-right corner, similar to Gmail's "New Message" compose window.

### New Component: `src/components/FloatingChatWidget.tsx`

A reusable floating chat widget with three states:
- **Collapsed (flag)**: A small button/flag in the bottom-right corner showing "AI Assistant" with a Bot icon. Positioned so it doesn't overlap page content (fixed position, bottom-right, with appropriate margins).
- **Minimized**: Just the title bar visible (like Gmail minimized compose).
- **Expanded**: Full chat panel (~400px wide, ~500px tall) with title bar, message area, and input. Title bar has minimize (-), expand, and close (X) buttons.

Props:
- `title`: string (e.g. "Project Assistant" or "Brainstorm Assistant")
- `chatHistory`: ChatMsg[]
- `chatInput`: string
- `onInputChange`: (val: string) => void
- `onSubmit`: () => void
- `isThinking`: boolean
- `renderMessage`: (msg: ChatMsg, i: number) => ReactNode (custom message renderer for note badges etc.)
- `placeholder`: string

The widget renders with `fixed` positioning at `bottom-4 right-4` with a high z-index. When collapsed, it's just a small button. When expanded, it's a card-like panel with shadow.

### Update `src/pages/ProjectWorkspace.tsx`
- Remove the inline "Project Assistant" card from the left column
- Render `FloatingChatWidget` at the bottom of the component with all existing chat state/handlers
- Pass a custom `renderMessage` that includes the note badge for AI-generated notes

### Update `src/pages/BrainstormWorkspace.tsx`
- Remove the inline AI chat section (the "AI Assistant" card shown when `isLocked`)
- Render `FloatingChatWidget` for the brainstorm chatbot when the brainstorm is locked (promoted/scrapped)
- The AI interview UI (when brainstorm is active) stays inline -- only the post-promotion chatbot becomes floating
- Pass existing chat state/handlers

### Layout Consideration
- The widget uses `fixed` positioning so it floats above all content
- The flag button is small enough (about 48px tall) that it sits in the corner without blocking content
- When expanded, it overlays the page content (like Gmail compose) rather than pushing it

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `supabase/functions/project-chat/index.ts` | Improve system prompt with today's date, subtask generation emphasis, and higher max_tokens |
| `src/components/FloatingChatWidget.tsx` | New reusable floating chat widget component |
| `src/pages/ProjectWorkspace.tsx` | Remove inline chat, add FloatingChatWidget, add task completion button in preview, auto-prefix https on links, add progress bar |
| `src/pages/BrainstormWorkspace.tsx` | Remove inline chat for locked brainstorms, add FloatingChatWidget, auto-prefix https on links |

No database migrations needed.


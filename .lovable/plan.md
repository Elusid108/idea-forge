
# Add Gotcha Modal Dialog to ProjectWorkspace

The "+ Add Gotcha" button correctly sets `showGotchaModal` to `true`, but no `<Dialog>` component exists in the JSX to render when that state changes. This is why clicking the button does nothing.

## Change

**File: `src/pages/ProjectWorkspace.tsx`**

Insert a new `<Dialog>` component just before the `FloatingChatWidget` (around line 1758), controlled by `showGotchaModal`. It has two states:

### State 1 - Definition (`gotchaModalState === "define"`)
- Title: "New Gotcha"
- Large textarea: "What is the Gotcha? (What broke, what's your concern, or what is making this difficult?)"
- "Start Autopsy" button that:
  1. Inserts the gotcha into the `gotchas` table with the symptom text
  2. Sets `activeGotchaId` to the new row's ID
  3. Transitions to State 2
  4. Calls `gotcha-chat` edge function with the initial symptom to get the first "why" question

### State 2 - AI Interview (`gotchaModalState === "autopsy"`)
- Title: "Root Cause Autopsy" with a round indicator (e.g., "Round 2/5")
- Display the current AI question (`gotchaQuestion`) with markdown rendering in a scrollable container
- Textarea for the user's answer
- "Submit Answer" button that:
  1. Sends the answer + chat history to `gotcha-chat`
  2. Appends both user answer and AI question to `gotchaChatHistory`
  3. Updates the gotcha's `chat_history` in the database
  4. If AI returns `investigation_task`: creates a project task in "planning" status, updates gotcha status to "investigating", shows toast, closes modal
  5. If AI returns `root_cause`: saves root cause to gotcha, sets status to "resolved", creates a corrective action task, shows success toast, closes modal
  6. If AI returns `next_question`: displays it and increments the round counter
- Loading spinner while AI is thinking

No new state variables are needed -- all the necessary state (`showGotchaModal`, `gotchaSymptom`, `gotchaModalState`, `activeGotchaId`, `gotchaAnswer`, `gotchaQuestion`, `isGotchaThinking`, `gotchaChatHistory`, `gotchaWhyRound`) already exists.

## Technical Details

- The Dialog uses the existing `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` components already imported
- Task creation reuses the existing `supabase.from("project_tasks").insert(...)` pattern already used elsewhere in the file
- Gotcha updates use `supabase.from("gotchas" as any).update(...)` (the `as any` cast is needed since the types may not be regenerated yet)
- After any DB mutation, `queryClient.invalidateQueries` is called for both `"project-gotchas"` and `"project-tasks"` keys
- The `gotcha-chat` edge function (already deployed) returns `{ next_question?, investigation_task?, root_cause?, corrective_action_task?, message }` -- the modal handles each case

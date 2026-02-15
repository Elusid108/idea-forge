

# UI & UX Improvements: Round 3

This plan covers 9 changes across signup, idea workflow, AI chatbots, notes display, rich text editing, link behavior, and task generation.

---

## 1. Confirm Password Field on Signup

Add a "Confirm Password" field to `src/pages/Signup.tsx`. Validate that both passwords match before submitting -- show an error toast if they don't.

**File**: `src/pages/Signup.tsx`
- Add `confirmPassword` state
- Add a "Confirm Password" input field below the Password field
- In `handleSignup`, check `password === confirmPassword` before calling `supabase.auth.signUp`; if mismatch, show `toast.error("Passwords do not match")`

---

## 2. Auto-Open Idea Detail After Processing

When a new idea is dumped and the AI finishes processing, auto-open the idea detail modal so the user can see the results immediately.

**File**: `src/pages/Ideas.tsx`
- In the `createIdea` mutation's `onSuccess`, after the `process-idea` edge function completes successfully, re-fetch the idea data and call `setSelectedIdea(updatedIdea)` to auto-open the detail modal
- The refetch interval already polls for `processing` status; we just need to track the newly created idea ID and auto-select it once status changes from `processing` to `processed`
- Add a `pendingIdeaId` ref that stores the ID of the just-created idea
- In the `useQuery` for ideas, when we detect the pending idea has been processed (status changed), auto-select it and clear the ref

---

## 3. Brainstorm AI Chatbot: Add Note Creation Capability

Currently the brainstorm `chat_query` mode is read-only. Add the `create_note` tool to it, matching the project chat's pattern.

**File**: `supabase/functions/brainstorm-chat/index.ts`
- In the `chat_query` mode, add a `create_note` tool definition (same as project-chat)
- Parse tool calls from the response and return actions array (like project-chat does)
- Return `{ answer, actions }` instead of just `{ answer }`

**File**: `src/pages/BrainstormWorkspace.tsx`
- In `handleChatSubmit` (the post-promotion/scrapped chat handler, ~line 665-694), process `data.actions` to insert notes into `brainstorm_references` (matching how project-chat handles `create_note`)
- Add `noteId`/`noteTitle` to assistant messages for clickable note badges
- Update the `renderMessage` in the floating chat widget to show note badges (matching project workspace pattern)

---

## 4. Notes: Fixed Window Size with Scroll

Notes currently expand to fit all content in the `ReferenceViewer` dialog. Add a fixed max-height with vertical scrollbar.

**File**: `src/components/ReferenceViewer.tsx`
- In the note rendering section, wrap the content in a `div` with `max-h-[60vh] overflow-y-auto` so long notes scroll instead of making the dialog grow unbounded

---

## 5. Rich Text Editing for Bullet Breakdown, Description, and Execution Strategy

The `EditableMarkdown` component currently uses a plain `Textarea` for editing and renders markdown. The user wants the edit mode to use rich text (WYSIWYG) and match the display size of the frame.

**File**: `src/components/EditableMarkdown.tsx`
- Replace the `Textarea` in edit mode with the existing `RichTextNoteEditor` component
- Convert between markdown (storage format) and HTML (edit format) using simple regex-based converters:
  - Markdown to HTML: convert `**bold**` to `<b>`, `*italic*` to `<i>`, `- item` to `<ul><li>`, numbered lists, headings, etc.
  - HTML to Markdown: reverse conversion on save
- The editor div should match the size of the display container (remove fixed `minHeight` on textarea, let it auto-size based on content)
- Remove the small textarea and instead show the `RichTextNoteEditor` inline with the same container styling

---

## 6. All Links Open in New Tab

Ensure all links in the app open in a new window/tab, not replacing the current page. The main concern is links rendered inside AI-generated notes and markdown content.

**Files**:
- `src/components/ReferenceViewer.tsx` -- Add `target="_blank" rel="noopener noreferrer"` to any rendered links. For the HTML `dangerouslySetInnerHTML` content, post-process the HTML to add `target="_blank"` to all `<a>` tags
- `src/components/EditableMarkdown.tsx` -- In the `ReactMarkdown` rendering, add a custom `a` component that opens in new tab
- Any other `ReactMarkdown` usage across workspaces (BrainstormWorkspace, ProjectWorkspace, CampaignWorkspace floating chat messages) -- add the custom link renderer

Create a shared markdown components config:
```text
const markdownComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  )
};
```

Apply this to all `<ReactMarkdown>` instances across the app.

---

## 7. AI Chatbot Welcome Messages

All AI chatbots should launch with an introductory welcome message explaining what they can do.

**Files**:
- `src/pages/BrainstormWorkspace.tsx` -- For the AI Interview, update the initial question generation to include a welcome intro. For the post-promotion/scrapped floating chat, initialize `queryChatHistory` with a welcome message
- `src/pages/ProjectWorkspace.tsx` -- Initialize `chatHistory` with a welcome message about capabilities (generating notes, updating strategy, creating tasks, recommending resources)
- `src/pages/CampaignWorkspace.tsx` -- Initialize `chatHistory` with a welcome message about campaign assistant capabilities

Welcome message examples:
- **AI Interview**: The first question should be preceded by an explanation: "I'm your brainstorm interview partner. I'll ask you targeted questions to help flesh out your idea into a complete project description..."
- **Project Assistant**: "I'm your project assistant. I can help you create tasks and subtasks, generate research notes, update your execution strategy, and recommend specific resources. Ask me anything!"
- **Campaign Assistant**: "I'm your campaign assistant. I can help plan marketing strategy, create tasks, generate research notes, and provide actionable recommendations. How can I help?"

Implementation: Set the initial `chatHistory` state to include one assistant welcome message instead of starting empty.

---

## 8. AI Should Ask About Scope for Resource/Note Generation

When users ask for resources or research, the AI should ask how extensive the response should be.

**Files**:
- `supabase/functions/project-chat/index.ts` -- Add guidance to the system prompt: "When the user asks for resources, research, book recommendations, or notes, FIRST ask them how extensive they want the list to be (e.g., 'Would you like a quick list of 3-5 top resources, or a comprehensive list of 15-30?'). Only generate after they specify."
- `supabase/functions/brainstorm-chat/index.ts` -- Add the same guidance to the `chat_query` mode system prompt (once note creation is enabled there)

---

## 9. Project Chat: Fix Subtask Generation

The AI is generating subtasks as top-level tasks instead of using `parent_task_id`. The issue is that the AI needs to know the IDs of tasks it just created in order to create subtasks under them.

**Problem**: When the AI generates a batch of tasks (parents + subtasks) in a single response, it doesn't know the UUIDs of the parent tasks it's creating because they haven't been inserted yet. The current system processes all tool calls after the AI responds, so the AI can't reference parent IDs it hasn't seen.

**Solution**: Process `add_task` actions in two passes:
1. First pass: Insert all tasks that have no `parent_task_id` (or have a placeholder parent ID). Collect a mapping of placeholder/title to real UUID.
2. Second pass: Insert subtasks, replacing placeholder `parent_task_id` with real UUIDs.

**File**: `src/pages/ProjectWorkspace.tsx` (handleChatSubmit, ~line 646-664)
- Change the task processing logic to:
  1. Separate actions into parent tasks (no `parent_task_id`) and subtasks (with `parent_task_id`)
  2. Insert parent tasks first, collecting `{ title -> real_id }` mapping
  3. For subtasks, try to match `parent_task_id` to an existing task ID first; if not found, try to match by title from the just-created parents
  4. Insert subtasks with corrected `parent_task_id`

**File**: `supabase/functions/project-chat/index.ts`
- Update the system prompt to instruct the AI more explicitly: "When creating tasks and subtasks in the same response, use the TITLE of the parent task as the parent_task_id for subtasks. The system will automatically resolve these to real IDs."
- Add instruction: "ALWAYS break complex work into parent tasks with subtasks underneath. Never create flat lists of tasks when hierarchical grouping makes sense."

---

## Technical Summary

| File | Changes |
|---|---|
| `src/pages/Signup.tsx` | Add confirm password field and validation |
| `src/pages/Ideas.tsx` | Auto-open idea detail modal after processing completes |
| `supabase/functions/brainstorm-chat/index.ts` | Add `create_note` tool to `chat_query` mode; add scope-asking guidance |
| `src/pages/BrainstormWorkspace.tsx` | Process note creation actions from chat; add welcome message |
| `src/components/ReferenceViewer.tsx` | Add max-height + scroll to notes; add target=_blank to links |
| `src/components/EditableMarkdown.tsx` | Switch to RichTextNoteEditor for editing; add target=_blank to markdown links |
| `src/pages/ProjectWorkspace.tsx` | Fix subtask resolution in handleChatSubmit; add welcome message; add target=_blank to chat markdown |
| `src/pages/CampaignWorkspace.tsx` | Add welcome message; add target=_blank to chat markdown |
| `supabase/functions/project-chat/index.ts` | Add scope-asking guidance; improve subtask creation instructions |


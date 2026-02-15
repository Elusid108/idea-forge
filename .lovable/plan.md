

# Rich Text Keyboard Shortcuts, AI Interview Improvements, Idea Navigation, Project Page Cleanup, and Clickable Brainstorm References

This plan covers 9 changes across the application.

---

## 1. Linked Idea Badge on Project Page Opens Overlay Popup

**Problem**: Clicking "Linked Idea" on the project page navigates to `/ideas?open=${linkedIdeaId}`. On brainstorms, it opens an inline overlay dialog. The project page should match the brainstorm behavior.

**Fix in `src/pages/ProjectWorkspace.tsx`**:
- Add a `showLinkedIdea` state and a linked idea query (fetch the idea data by `linkedIdeaId`).
- Replace the `navigate` onClick on the "Linked Idea" badge with `setShowLinkedIdea(true)`.
- Add the same `Dialog` overlay used in `BrainstormWorkspace.tsx` (lines 1097-1148) showing Raw Dump, Summary, Key Features, and Tags.

---

## 2. Rich Text Editor Keyboard Shortcuts and Sidebar Fix

**Problem**: The `RichTextNoteEditor` uses a plain textarea with toolbar buttons but no keyboard shortcuts. Ctrl+B hides the app sidebar instead of bolding text.

**Fix in `src/components/RichTextNoteEditor.tsx`**:
- Add an `onKeyDown` handler to the `Textarea` that intercepts:
  - `Ctrl+B` / `Cmd+B` -- bold
  - `Ctrl+I` / `Cmd+I` -- italic
  - `Ctrl+U` / `Cmd+U` -- underline
  - `Ctrl+Shift+X` -- strikethrough (standard shortcut)
  - `Ctrl+Shift+7` -- numbered list
  - `Ctrl+Shift+8` -- bullet list
  - `Tab` -- indent (insert `  ` prefix)
  - `Shift+Tab` -- un-indent (remove leading `  `)
- All these shortcuts call `e.preventDefault()` and `e.stopPropagation()` to prevent the sidebar toggle or other default browser behavior.
- Add an `IndentDecrease` icon button and a "dedent" action to the toolbar for Shift+Tab.

---

## 3. AI Interview Uses Notes as Context

**Problem**: The `getContext()` function in `BrainstormWorkspace.tsx` builds context from references using `title` and `description/url`. Notes contain richer content in the `description` field that should be more prominently included.

**Fix in `src/pages/BrainstormWorkspace.tsx`**:
- Update `getContext()` to separate notes from other references and include note content more prominently:
```typescript
const getContext = () => {
  const notes = references.filter((r: any) => r.type === "note");
  const otherRefs = references.filter((r: any) => r.type !== "note");
  return {
    title: brainstorm?.title || "",
    idea_raw: (brainstorm as any)?.ideas?.raw_dump || "",
    idea_summary: (brainstorm as any)?.ideas?.processed_summary || "",
    notes: notes.map((r: any) => `${r.title}: ${r.description || ""}`).join("\n"),
    references: otherRefs.map((r: any) => `[${r.type}] ${r.title}: ${r.description || r.url}`).join("\n"),
    tags: (brainstorm as any)?.tags || [],
    category: (brainstorm as any)?.category || "",
  };
};
```
- Update the edge function `brainstorm-chat/index.ts` system prompts to include a `Notes` section from `context.notes`.

---

## 4. AI Interview Supports Questions/Clarification/Uncertainty

**Problem**: Currently the AI interview only accepts direct answers. The user wants to ask for clarification, say "I'm not sure", or ask about benefits before deciding.

**Fix in `supabase/functions/brainstorm-chat/index.ts`**:
- Update the `submit_answer` system prompt to instruct the AI: "If the user's answer is a question, request for clarification, or expresses uncertainty (e.g. 'I'm not sure', 'what do you think?', 'can you explain?'), do NOT update the description or bullets. Instead, respond helpfully to their question and then re-ask the same or a refined version of the original question."
- Add an additional tool response option: when the AI detects a question/uncertainty, it returns a `clarification` field instead of updated content. The existing `process_answer` tool schema gets an optional `clarification` field.
- Update `handleSubmitAnswer` in `BrainstormWorkspace.tsx`: if the response contains a `clarification` field instead of `updated_description`, display it as a follow-up message without updating the description/bullets. Set `currentQuestion` to `next_question` (which may be the same question re-asked).

---

## 5. AI Assistant (Informant Mode) Renders Rich Text

**Problem**: The chatbot responses in locked/informant mode render as raw text (visible markdown syntax like `**bold**`).

**Fix in `src/pages/BrainstormWorkspace.tsx`**:
- Import `ReactMarkdown` (already imported in ProjectWorkspace but not in BrainstormWorkspace).
- In the chat message rendering (line 815), wrap assistant messages with `ReactMarkdown`:
```tsx
<div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
  {msg.role === "assistant" ? (
    <div className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5">
      <ReactMarkdown>{msg.content}</ReactMarkdown>
    </div>
  ) : msg.content}
</div>
```

---

## 6. Next/Back Arrow Buttons for Ideas Popup

**Problem**: The Idea detail popup has no navigation between ideas. User wants next/back arrows to navigate through Fresh Ideas only, and scrapping an idea auto-advances to the next.

**Fix in `src/pages/Ideas.tsx`**:
- Compute a `freshIdeas` list (status in `["new", "processing", "processed"]`) sorted by `created_at` desc.
- Pass the current index within `freshIdeas` to `IdeaDetailModal`.
- Add left/right arrow buttons (`ChevronLeft`, `ChevronRight`) to the modal header.
- "Next" advances to the next fresh idea; "Back" goes to the previous.
- Disable at boundaries (first/last).
- When scrapping, auto-advance to the next fresh idea (or close if none remain).

---

## 7. Remove Description and Bullet Breakdown from Project Page (Outside Brainstorm Callout)

**Problem**: With the Brainstorm callout now containing description and bullet breakdown, the standalone Description and Bullet Breakdown sections are redundant for projects promoted from brainstorms. For directly created projects, these are still useful.

**Clarification needed**: The user said "remove Description and Bullet Breakdown outside of that collapsed section." This means:
- For projects WITH a linked brainstorm: remove the standalone Description (left column) and Bullet Breakdown (right column) since they duplicate the callout.
- For projects WITHOUT a linked brainstorm: keep them as-is (since there's no callout).

**Fix in `src/pages/ProjectWorkspace.tsx`**:
- Conditionally render the Description section: only show if there is NO `brainstorm_id`.
- Conditionally render the Bullet Breakdown section: only show if there is NO `brainstorm_id`.

---

## 8. Brainstorm Callout References Are Clickable

**Problem**: References inside the Brainstorm callout on the project page are just static text rows. They should be clickable to open images/videos/notes in the viewer and links in a new tab.

**Fix in `src/pages/ProjectWorkspace.tsx`**:
- Make each brainstorm reference row clickable with the same `handleRefClick` logic (links open externally, notes/images/videos open the `ReferenceViewer`).
- Add `cursor-pointer hover:border-primary/30` styling to the rows.

---

## 9. Resources Section Is Independent from Brainstorm References

**Problem**: When promoting a brainstorm to a project, references are copied into `project_references`. The user wants Resources to be a separate, empty list for new project-specific uploads, not a copy of brainstorm references.

**Fix in `src/pages/BrainstormWorkspace.tsx`** (promote mutation):
- Remove the code that copies `brainstorm_references` into `project_references` (lines 380-392). The brainstorm references are already viewable in the Brainstorm Callout section.
- Resources start empty on new projects.

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/components/RichTextNoteEditor.tsx` | Add keyboard shortcuts (Ctrl+B/I/U, Ctrl+Shift+X, Tab/Shift+Tab, Ctrl+Shift+7/8); add dedent action |
| `src/pages/BrainstormWorkspace.tsx` | Notes in AI context; handle clarification responses; render assistant messages with ReactMarkdown; remove reference copying on promote |
| `supabase/functions/brainstorm-chat/index.ts` | Add notes to system prompts; support clarification/uncertainty in submit_answer; add optional `clarification` field |
| `src/pages/ProjectWorkspace.tsx` | Linked Idea overlay popup; clickable brainstorm callout references; conditionally hide Description/Bullets when brainstorm exists |
| `src/pages/Ideas.tsx` | Next/back navigation arrows in detail modal; auto-advance on scrap |




# Layout Reorder, Post-Promotion Chatbot Mode, and Sidebar Simplification

## 1. Reorder Brainstorm Workspace Sections

**File: `src/pages/BrainstormWorkspace.tsx`**

**Left column (3/5):** AI Interview, then Compiled Description, then References (current order has References before Description -- swap them).

**Right column (2/5):** Tags first, then Bullet Breakdown below.

**Title bar badge order:** Back arrow, Title, Category badge, Linked Idea badge, then ml-auto Delete + Promote buttons.

Current order in title bar: Title, Linked Idea, Category. Change to: Title, Category, Linked Idea.

## 2. Post-Promotion Read-Only Chatbot Mode

**File: `src/pages/BrainstormWorkspace.tsx`**

When `brainstorm.status === "completed"`:

- Replace the flashcard Q&A interview with an AI chatbot interface. The user can ask questions about the brainstorm content (description, bullets, tags, references, title) but nothing new is added to the brainstorm record.
- The chatbot uses the same `brainstorm-chat` edge function but with a new mode `"chat_query"`.
- All `EditableMarkdown` sections become read-only (render markdown without the edit-on-click behavior). Pass a `readOnly` prop to `EditableMarkdown`.
- Hide the Delete button and the Promote button. Show a "Completed" badge instead.
- References section hides the Add button and the delete (X) buttons on each reference card.

**File: `src/components/EditableMarkdown.tsx`**

Add an optional `readOnly?: boolean` prop. When true, skip the `onClick` handler and hide the pencil icon -- just render the markdown (or placeholder) in the styled container.

**File: `supabase/functions/brainstorm-chat/index.ts`**

Add a third mode `"chat_query"`. The system prompt tells the AI it is a read-only assistant that answers questions about the brainstorm content. It receives the full brainstorm context (title, description, bullets, tags, references) and a chat history. It returns a plain text answer (no tool call needed -- use regular message completion). Store a separate `query_chat_history` in component state (not persisted to DB).

## 3. Flatten Sidebar Navigation

**File: `src/components/AppSidebar.tsx`**

Remove the `Collapsible` wrapper entirely. Each section becomes a direct `SidebarMenuItem` link with the emoji and label. The structure becomes:

```
[emoji] Ideas        >
[emoji] Brainstorms  >
[emoji] Projects     >
---
Trash
```

No nested collapsible groups -- each item is a direct link to its respective page.

---

## Files to Modify

| File | Changes |
|---|---|
| `src/pages/BrainstormWorkspace.tsx` | Reorder sections (desc above refs in left col, tags above bullets in right col), reorder title bar badges, add completed/read-only mode with chatbot |
| `src/components/EditableMarkdown.tsx` | Add `readOnly` prop |
| `src/components/AppSidebar.tsx` | Remove Collapsible wrappers, flatten to direct links |
| `supabase/functions/brainstorm-chat/index.ts` | Add `chat_query` mode for read-only Q&A |

---

## Technical Notes

- The chatbot query history is kept in local component state only (not persisted) since it is ephemeral Q&A about existing content
- `readOnly` on `EditableMarkdown` simply removes the `onClick` and pencil icon -- no new component needed
- The `chat_query` mode uses regular chat completion (no tool calling) since it just returns a text answer
- The sidebar flattening removes `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` imports and the `openSections` state entirely


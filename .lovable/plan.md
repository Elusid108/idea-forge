

# Idea Dashboard UX Overhaul + Brainstorm Workspace

This plan covers two major pieces: refining the Ideas page with truncated cards, a detail modal, and the "Start Brainstorm" flow, then building out the full Brainstorm Workspace page.

---

## Part 1: Ideas Dashboard Refinements

### 1A. Truncated Idea Cards
Simplify `IdeaCard` in `src/pages/Ideas.tsx`:
- Show only: category badge, tags row, and a max 3-line truncated `processed_summary` (use `line-clamp-3`)
- Remove the inline expandable key features section from the card
- Remove the date and status badge from the card face (keep processing glow for in-progress items)
- Card click opens the detail modal (pass `onClick` handler)

### 1B. Idea Detail Modal
Add a new `Dialog` to `IdeasPage` that opens when any card is clicked:
- **Header**: Category badge + trash icon (delete button) aligned right
- **Body sections**:
  - "Raw Dump" label with the full `raw_dump` text in a muted block
  - "Summary" label with the complete `processed_summary`
  - "Key Features" label with the bulleted `key_features` list
  - Tags row at the bottom
- **Footer**: "Start Brainstorm" primary button
- **Delete**: Clicking trash shows a confirmation (or immediate delete with toast), removes the idea from the DB, closes the modal, invalidates the query

### 1C. "Start Brainstorm" Action
When the user clicks "Start Brainstorm" in the detail modal:
1. Insert a new row into `brainstorms` with `idea_id` set to this idea, `title` derived from the processed summary (first ~50 chars), and `user_id`
2. Update the idea's `status` to `'brainstorming'`
3. Navigate to `/brainstorms/:id` (the new workspace page)

**Disabled state**: If `idea.status === 'brainstorming'`, the button text changes to "Brainstorming..." and is grayed out / disabled.

### 1D. New Mutations
- `deleteIdea` mutation: `supabase.from("ideas").delete().eq("id", id)`
- `startBrainstorm` mutation: insert brainstorm + update idea status, then `navigate`

---

## Part 2: Brainstorm Workspace

### 2A. New Route
Add `/brainstorms/:id` route in `src/App.tsx` pointing to a new `BrainstormWorkspace` page component.

### 2B. Brainstorm Workspace Page (`src/pages/BrainstormWorkspace.tsx`)
A full-width workspace with three main sections:

**Top Bar**:
- Back arrow to `/brainstorms`
- Editable brainstorm title (inline edit, auto-saves)
- Link to source idea (if `idea_id` exists, clickable badge)
- "Promote to Project" button (creates project row, navigates to `/projects`)

**Layout** (two-column on desktop, stacked on mobile):

**Left Column -- Reference Board** (~60% width):
- "Add Reference" button that opens a dropdown/popover with options: Link, Image, Video, Note
- **Link**: text input for URL + title + optional description, saves to `brainstorm_references`
- **Image**: file upload to `brainstorm-references` storage bucket, saves path to `brainstorm_references`
- **Video**: paste YouTube/Vimeo URL, saves with type "video"
- **Note**: simple text input for quick thoughts
- References displayed as a grid of cards, each showing:
  - Type icon (Link, Image, Film, FileText, StickyNote)
  - Title, thumbnail (for images/videos), description snippet
  - Delete button (X icon)
- Query: `supabase.from("brainstorm_references").select("*").eq("brainstorm_id", id).order("sort_order")`

**Right Column -- AI Chat + Synthesis** (~40% width):
- **Compiled Description**: An editable `Textarea` bound to `brainstorms.compiled_description`, auto-saves on blur
- **Bullet Breakdown**: An editable `Textarea` bound to `brainstorms.bullet_breakdown`, auto-saves on blur
- **AI Chat Panel**: Scrollable chat area with message bubbles
  - Input bar at the bottom with send button
  - Chat history stored in `brainstorms.chat_history` (JSONB array of `{role, content}`)
  - On send: call a new `brainstorm-chat` edge function that streams AI responses
  - The AI has context of the idea's raw dump + all references + current description

### 2C. Brainstorm Chat Edge Function (`supabase/functions/brainstorm-chat/index.ts`)
- Accepts `{ brainstorm_id, message, chat_history, context }` in the POST body
- `context` includes: idea raw dump, idea summary, references list, current compiled description
- Uses `google/gemini-3-flash-preview` via Lovable AI Gateway
- System prompt: "You are an engineering/design research partner. Help the user explore, refine, and structure their idea. Be specific, ask clarifying questions, suggest approaches."
- Returns the AI response (non-streaming for simplicity in v1, can upgrade later)
- Appends both user message and AI response to `chat_history` in the brainstorms row

### 2D. Update Brainstorms List Page
- Each brainstorm card becomes clickable, navigating to `/brainstorms/:id`
- Show reference count badge on each card
- Add a "New Brainstorm" button at the top to create a standalone brainstorm (no linked idea)

---

## Part 3: Database Migration

A single migration to support the new `'brainstorming'` status value. No schema changes needed since all columns already exist. The `status` field on `ideas` is a text column with no enum constraint, so `'brainstorming'` works without migration.

No new tables or columns required -- all structures are already in place.

---

## Files to Create/Modify

| File | Action |
|---|---|
| `src/pages/Ideas.tsx` | Refactor cards (truncated), add detail modal, delete mutation, start brainstorm mutation |
| `src/pages/Brainstorms.tsx` | Add clickable navigation, reference count, "New Brainstorm" button |
| `src/pages/BrainstormWorkspace.tsx` | **New** -- full workspace with reference board, chat, synthesis |
| `src/App.tsx` | Add `/brainstorms/:id` route |
| `supabase/functions/brainstorm-chat/index.ts` | **New** -- AI chat edge function |

---

## Technical Notes

- The `brainstorm_references` table already has a foreign key to `brainstorms` and RLS policies scoped to `user_id`
- The `brainstorm-references` storage bucket already exists (private)
- Chat history is stored as JSONB in `brainstorms.chat_history`, defaulting to `[]`
- Image uploads use `supabase.storage.from("brainstorm-references").upload(path, file)` and the public URL is stored in `brainstorm_references.url`
- The "Promote to Project" action inserts into `projects` with `brainstorm_id` set, updates brainstorm status to `'completed'`, and navigates to `/projects`



# Combined Plan: Brainstorm Assistant Upgrade + Campaign GTM Interview Overhaul

This plan combines all pending changes into a single implementation pass.

---

## Part A: Brainstorm Workspace Changes

### A1. Merge Welcome Message into First Interview Question

Remove the separate `showWelcomeIntro` state and UI block. Instead, update the `brainstorm-chat` edge function's `generate_question` system prompt to instruct the AI to blend a brief intro into the first question when chat history is empty (e.g., "Let's flesh out this idea of yours. [question]").

**Files:**
- `supabase/functions/brainstorm-chat/index.ts` -- Add to the `generate_question` system prompt: "For the FIRST question (when chat history is empty), blend a brief, friendly introduction into the question itself. Start with something like 'Let's flesh out this idea of yours.' then seamlessly transition into your question. Do NOT separate the intro from the question."
- `src/pages/BrainstormWorkspace.tsx` -- Remove the `showWelcomeIntro` state (line 113), remove `setShowWelcomeIntro(true)` from `generateFirstQuestion` (line 310), and remove any welcome block rendering in the interview card UI.

### A2. Show Brainstorm Assistant Always (Not Just When Locked)

Remove the `{isLocked && (...)}` wrapper (line 1318) around the `FloatingChatWidget` so it renders unconditionally -- during active brainstorming and after completion/scrapping.

### A3. Give Assistant Editing Capabilities When Active

When the brainstorm is active (not locked), the assistant gains three tools: `create_note`, `update_description`, and `update_bullets`. When locked, it remains read-only (no tools).

**File: `supabase/functions/brainstorm-chat/index.ts` (chat_query mode)**
- Accept an optional `is_locked` boolean in the request body
- When `is_locked` is false (active), pass three tools to the AI:
  - `create_note` -- existing tool, creates research notes
  - `update_description` -- takes `{ description: string }`, signals the frontend to update the compiled description
  - `update_bullets` -- takes `{ bullets: string }`, signals the frontend to update the bullet breakdown
- When `is_locked` is true, pass no tools (read-only mode)
- Update the system prompt to explain capabilities based on lock state:
  - Active: "You can answer questions, create research notes, and update the compiled description and bullet breakdown when asked."
  - Locked: "You can answer questions about this brainstorm's content and help explore ideas."

**File: `src/pages/BrainstormWorkspace.tsx`**
- Pass `is_locked: isLocked` in the `handleChatSubmit` request body
- Handle `update_description` actions: call `setDescription(action.description)`, save to DB via `supabase.from("brainstorms").update(...)`, push undo entry, invalidate queries, show toast
- Handle `update_bullets` actions: same pattern as above for `setBullets`
- Keep existing `create_note` action handling
- Update the initial welcome message in `queryChatHistory` to reflect the dual-mode nature:
  - Active: "I'm your brainstorm assistant. I can answer questions, help you dig deeper, create research notes, and update the description and bullet breakdown."
  - Locked: "I'm your brainstorm assistant. I can answer questions about this brainstorm's content and help you explore ideas."

### A4. Update Welcome Message Based on Lock State

Since the widget is now always visible, the initial `queryChatHistory` welcome message (lines 118-119 and 135-136) should be set dynamically based on `isLocked`. Use a `useEffect` that watches `isLocked` and `brainstorm` to set the appropriate welcome message on first load.

---

## Part B: Campaign GTM Interview Overhaul

### B1. Database Migration

Add columns to `campaigns` table:
- `interview_completed` (boolean, default false) -- gate flag for showing interview vs dashboard
- `chat_history` (jsonb, default '[]') -- stores the GTM interview Q&A
- `playbook` (text, default '') -- the generated Campaign Playbook markdown

Create new `campaign_tasks` table:
- `id` (uuid, PK, default gen_random_uuid())
- `campaign_id` (uuid, not null)
- `user_id` (uuid, not null)
- `title` (text, not null, default '')
- `description` (text, default '')
- `status_column` (text, default 'asset_creation') -- Kanban column name
- `completed` (boolean, default false)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz, default now())

RLS policies on `campaign_tasks`: standard user-owns-row pattern (SELECT, INSERT, UPDATE, DELETE where `auth.uid() = user_id`).

### B2. New Edge Function: `campaign-chat`

Create `supabase/functions/campaign-chat/index.ts` with three modes:

**Mode: `generate_question`**
- System prompt: Act as a Go-To-Market Strategist. Review inherited project/brainstorm context (compiled description, tags, category, whether there are CAD/STL files or GitHub repos). Ask targeted questions about:
  - Product type (physical hardware run, 3D-printed product, digital asset, software)
  - Business structure (LLC, hobby piece)
  - Fulfillment method (in-house, 3PL, dropshipper, digital delivery)
  - Target audience and pricing
- Returns `{ question }`

**Mode: `submit_answer`**
- Processes user's answer against interview context
- Returns `{ next_question }` (and optionally `clarification` if user asks a question back)

**Mode: `forge_playbook`**
- Takes the full interview chat history + project context
- Returns structured JSON:
```text
{
  "playbook": "markdown strategy covering IP protection, target audience, pricing, marketing copy, distribution",
  "sales_model": "B2C" (or other recommended model),
  "primary_channel": "Etsy" (or other recommended channel),
  "tasks": [
    { "title": "...", "status_column": "asset_creation", "description": "..." },
    ...4-6 tasks total
  ]
}
```

Register in `supabase/config.toml`:
```text
[functions.campaign-chat]
verify_jwt = false
```

### B3. Rewrite CampaignWorkspace.tsx -- Two-State UI

**State 1: GTM Interview (interview_completed = false)**
- Hide the existing dashboard (metrics, distribution, links)
- Show a focused, centered flashcard Q&A component (same pattern as brainstorm interview):
  - Project context summary at top (title, category, tags from linked project)
  - Sequential AI questions about business model, fulfillment, audience
  - Chat history displayed as Q&A cards
  - After 3+ exchanges, show a prominent "Forge Campaign Playbook" button
- On "Forge Campaign Playbook" click:
  - Call `campaign-chat` with mode `forge_playbook`
  - Save returned `playbook` to the campaign
  - Set `sales_model` and `primary_channel` from the response
  - Create `campaign_tasks` rows from the returned tasks array
  - Set `interview_completed = true`
  - Save `chat_history` to the campaign

**State 2: Dashboard (interview_completed = true)**
- Remove the floating "Campaign Assistant" chat widget
- Add a "Campaign Playbook" section using `EditableMarkdown`, showing the generated playbook (editable like execution strategy in projects)
- Keep existing metrics row, distribution strategy dropdowns, and campaign links
- Add a Kanban-style task board below, showing `campaign_tasks` grouped by `status_column`:
  - Columns: Asset Creation, Pre-Launch, Active Campaign, Fulfillment, Evergreen
  - Tasks can be toggled complete, title edited inline, or deleted
  - Manual "Add Task" button to add tasks to any column

### B4. No Changes Needed to ProjectWorkspace Launch

The existing `launchCampaign` mutation creates campaigns with default values. Since `interview_completed` defaults to `false`, newly promoted campaigns will automatically enter the GTM interview gate.

---

## Technical Summary

| File | Changes |
|---|---|
| `supabase/functions/brainstorm-chat/index.ts` | Update `generate_question` prompt to blend welcome into first question; add `update_description` and `update_bullets` tools to `chat_query` mode (conditionally based on `is_locked`); remove tools when locked |
| `src/pages/BrainstormWorkspace.tsx` | Remove `showWelcomeIntro` state/UI; show FloatingChatWidget unconditionally; handle `update_description`/`update_bullets` actions; pass `is_locked` to edge function; dynamic welcome message |
| **New:** `supabase/functions/campaign-chat/index.ts` | GTM interview edge function with `generate_question`, `submit_answer`, and `forge_playbook` modes |
| `supabase/config.toml` | Add `[functions.campaign-chat]` entry |
| `src/pages/CampaignWorkspace.tsx` | Major rewrite: two-state UI with GTM interview gate and auto-populated dashboard with playbook + Kanban task board |
| **DB Migration** | Add `interview_completed`, `chat_history`, `playbook` columns to `campaigns`; create `campaign_tasks` table with RLS |


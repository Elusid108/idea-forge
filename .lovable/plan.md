

# Campaign Dashboard Overhaul, Resources, Task Popups, Campaign Assistant, and Project Layout Fix

This plan covers 7 changes across the Campaign Workspace dashboard (State 2), the GTM Interview (State 1), and the Project Workspace.

---

## 1. GTM Interview: Render Question with Markdown + Scroll

**Problem:** The AI question text renders as a plain `<p>` tag, so numbered lists and formatting are lost. Long questions overflow without scrolling.

**File: `src/pages/CampaignWorkspace.tsx` (lines 516-522)**

- Replace the plain `<p>` with a `ReactMarkdown` component inside a scrollable container (`max-h-[300px] overflow-y-auto`).
- Apply prose styling: `prose prose-invert prose-sm` with list styles matching the rest of the app.

---

## 2. Campaign Dashboard: Remove Metric Cards, Distribution Strategy, and Campaign Links

**File: `src/pages/CampaignWorkspace.tsx` (lines 621-846)**

- **Remove** the `metricCards` array and the entire Revenue/Units Sold/Target Price grid (lines 621-767).
- **Remove** the Distribution Strategy card (Sales Model + Primary Channel selects) (lines 783-816).
- **Remove** the Campaign Links card and the Add Link dialog (lines 818-933).
- Remove associated state: `editingMetric`, `metricDraft`, `showAddLink`, `linkForm`, and helper functions `handleSaveMetric`, `handleAddLink`, `handleDeleteLink`.

---

## 3. Campaign Dashboard: Two-Column Layout with Tags on Right

Restructure the dashboard (State 2) to match the Project page layout using a `grid-cols-5` two-column split (3 left, 2 right).

**Left column (lg:col-span-3):**
- The four playbook sections (Discovery & IP Strategy, Monetization Strategy, Distribution & Marketing, Logistics & Operations), each as `EditableMarkdown`.

**Right column (lg:col-span-2):**
- Tags at the top
- Resources section (see item 4 below)

---

## 4. Campaign Resources: New Table + Full CRUD

Since campaign resources must be independent from project/brainstorm resources, we need a new `campaign_references` table.

**Database Migration:**
```sql
CREATE TABLE campaign_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  url text DEFAULT '',
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaign references"
  ON campaign_references FOR ALL
  USING (auth.uid() = user_id);
```

**File: `src/pages/CampaignWorkspace.tsx`**

- Add a full Resources section in the right column, mirroring the Project Workspace's Resources implementation:
  - View mode toggle (grid/list) with localStorage persistence
  - Sort mode (newest/oldest/A-Z/Z-A)
  - Collapsible groups by type (notes, links, images, videos, files)
  - Add/Edit/Delete resource dialogs
  - Note type uses `RichTextNoteEditor`
  - Image/file upload to Supabase storage
  - `ReferenceViewer` for viewing resources
- Query `campaign_references` table filtered by `campaign_id`.
- Import needed components: `ReferenceViewer`, `RichTextNoteEditor`, `Popover`, `Collapsible`, etc.

---

## 5. Kanban Pipeline: Move to Top + Task Click Popup

**File: `src/pages/CampaignWorkspace.tsx`**

- Move the "Go-To-Market Pipeline" Kanban board to appear **above** the two-column layout (right after the separator, before the playbook sections).
- Add a task detail popup dialog (matching the Project Workspace's `viewingTask` pattern):
  - Clicking a task card opens a dialog showing title, description, status column, and completion state.
  - Dialog footer has "Mark Complete/Active", "Edit" (inline title/description editing), and "Delete" buttons.
  - Add `viewingTask` state and the corresponding `Dialog` component.

---

## 6. Campaign Assistant: Floating Chat Widget + Edge Function

**Edge Function: `supabase/functions/campaign-chat/index.ts`**

- Add a new mode `"assistant"` to the existing campaign-chat edge function.
- The assistant mode uses a system prompt similar to the project-chat assistant:
  - Understands the campaign context (playbook sections, tasks, tags, status).
  - Can answer questions about the campaign strategy and how to accomplish GTM goals.
  - Does NOT need tool-calling (tasks are managed via the Kanban board) -- it's a conversational assistant.
- Uses the same AI gateway pattern already in place.

**File: `src/pages/CampaignWorkspace.tsx`**

- Add `FloatingChatWidget` to the dashboard (State 2 only, not during interview).
- Add chat state: `chatHistory`, `chatInput`, `isChatThinking`.
- Welcome message: "I'm your Campaign Assistant. I can help you understand your GTM strategy, suggest improvements, and answer questions about launching your product."
- On submit, call `campaign-chat` with `mode: "assistant"` and the full chat history + campaign context.
- Render messages with `ReactMarkdown` + prose styling (same pattern as project assistant).

---

## 7. Project Workspace: Move Resources Under Bullet Breakdown

**File: `src/pages/ProjectWorkspace.tsx`**

Currently, Resources is in the **left column** (after Tasks, around line 1028). Bullet Breakdown is in the **right column** (line 1354).

- **Move** the entire Resources section (including the Add/Edit dialogs, sort/view controls, grouped refs rendering) from the left column to the right column, placing it **after** the Bullet Breakdown section.
- This means the left column will contain: Description, Execution Strategy, Tasks, Expenses.
- The right column will contain: Tags, GitHub, GitHub Activity, Brainstorm References, Bullet Breakdown, **Resources**.

---

## Technical Summary

| Area | Changes |
|---|---|
| **DB Migration** | Create `campaign_references` table with RLS |
| **`src/pages/CampaignWorkspace.tsx`** | Markdown rendering for interview questions with scroll; remove metrics/distribution/links; two-column layout; Resources CRUD; Kanban moved to top with task popups; Campaign Assistant floating widget |
| **`supabase/functions/campaign-chat/index.ts`** | Add `"assistant"` mode for conversational campaign help |
| **`src/pages/ProjectWorkspace.tsx`** | Move Resources section from left column to right column (under Bullet Breakdown) |


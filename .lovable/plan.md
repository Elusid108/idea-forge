

# Brainstorm Page Reorder, WYSIWYG Notes, Sidebar Filtering, GitHub UX, Tasks, Expenses, and Execution Strategy

This plan covers 8 areas of work across multiple files, including 2 new database tables.

---

## 1. Brainstorms Dashboard: Reorder Groups and Rename "Scrap" to "Scrapped"

**File**: `src/pages/Brainstorms.tsx`

Change the `BRAINSTORM_GROUPS` array order so "Complete" comes before "Scrapped", and rename the label:

```
Active -> Backburner -> Complete -> Scrapped
```

---

## 2. WYSIWYG Rich Text Note Editor

**Problem**: The current `RichTextNoteEditor` uses a plain `<Textarea>` that shows raw markdown/HTML (e.g., `<u>text</u>`). The user wants it to function like Windows Sticky Notes -- true rich text editing.

**Approach**: Replace the `<Textarea>` with a `contentEditable` div that renders formatting in real-time. The toolbar actions will use `document.execCommand` for bold, italic, underline, strikethrough, and list operations. The underlying value stored remains HTML (which `ReactMarkdown` or `dangerouslySetInnerHTML` can render). Keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`, `Ctrl+Shift+X`, `Tab`, `Shift+Tab`) will call `e.preventDefault()` and `e.stopPropagation()` to prevent sidebar toggling.

**File**: `src/components/RichTextNoteEditor.tsx` -- full rewrite to use `contentEditable` div instead of `<Textarea>`.

**Rendering impact**: The `ReferenceViewer` and `EditableMarkdown` components already render note descriptions. They will need to render HTML content using `dangerouslySetInnerHTML` instead of `ReactMarkdown` for notes created with the new editor. A check will be added: if the content contains HTML tags, render as HTML; otherwise fall back to ReactMarkdown.

---

## 3. Sidebar: Filter Out Inactive Items from Nested Lists

**Problem**: Scrapped/completed brainstorms, brainstorming/scrapped ideas, and completed projects all show in the sidebar nested list.

**File**: `src/components/AppSidebar.tsx`

Update `useSectionItems` to add status filters per table:
- **Ideas**: exclude `status IN ('brainstorming', 'scrapped')`
- **Brainstorms**: exclude `status IN ('completed', 'scrapped')`
- **Projects**: exclude `status = 'done'`

Add `.not("status", "in", ...)` filters to each query.

---

## 4. GitHub Repo URL: Click-to-Edit and GitHub Pages Link

**File**: `src/pages/ProjectWorkspace.tsx`

**Click-to-edit**: Add an `editingGithub` state. When not editing, display the URL as text (clickable link). When clicked, switch to the input field. On blur/Enter, save and switch back.

**GitHub Pages detection**: The GitHub API response (`githubData.repo`) includes a `has_pages` boolean and `homepage` field. If `has_pages` is true or `homepage` exists, display a "View Site" link badge next to the repo name in the GitHub widget. The homepage URL is typically `https://{owner}.github.io/{repo}` but the API's `homepage` field is more reliable.

---

## 5. Project Tasks Section (New Database Table + UI)

### Database Migration

Create a `project_tasks` table:

```sql
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.project_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.project_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.project_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.project_tasks FOR DELETE USING (auth.uid() = user_id);
```

### UI in `src/pages/ProjectWorkspace.tsx`

Place a "Tasks" section above "Resources" in the left column:
- Task list with checkboxes, priority badge (Low/Medium/High/Critical with color coding), due date, and title
- Completed tasks show with strikethrough and muted styling
- "+ Add Task" button opens a dialog with fields: Title, Description (textarea), Priority (select), Due Date (date input)
- Tasks can be edited (click to open edit dialog) and deleted
- Query: `useQuery` on `project_tasks` filtered by `project_id`

---

## 6. Project Expense Tracker (New Database Table + UI)

### Database Migration

Create a `project_expenses` table:

```sql
CREATE TABLE public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'General',
  receipt_url TEXT DEFAULT '',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.project_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.project_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.project_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.project_expenses FOR DELETE USING (auth.uid() = user_id);
```

### UI in `src/pages/ProjectWorkspace.tsx`

Place an "Expenses" section below "Resources" in the left column:
- Running total displayed in the section header
- Each expense row shows: date, title, amount, category badge, and receipt icon (if receipt attached)
- "+ Add Expense" button opens a dialog with: Title, Amount, Category (select), Date, Description, Receipt upload (image/PDF to `project-assets` bucket)
- Clicking a receipt thumbnail opens it in a new tab
- Expenses can be edited and deleted

---

## 7. AI-Generated Execution Strategy

### Database

Add an `execution_strategy` text column to the `projects` table:

```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS execution_strategy TEXT DEFAULT '';
```

### Auto-Generation on Promote

In `BrainstormWorkspace.tsx`, after the promote-to-project mutation succeeds, invoke a backend function (or inline AI call) to generate an execution strategy based on the brainstorm's description, bullets, tags, and category. Store the result in `execution_strategy`.

### Backend Function

Create `supabase/functions/generate-strategy/index.ts` that takes the project context and returns a structured execution strategy using the Lovable AI (e.g., `google/gemini-2.5-flash`).

### UI in `src/pages/ProjectWorkspace.tsx`

Place "Execution Strategy" section above "Tasks" in the left column:
- Rendered as `EditableMarkdown` so it can be viewed and edited
- For manually created projects (no brainstorm), the field is empty and editable -- the user fills it out manually
- For promoted projects, it's auto-populated but still editable

---

## 8. Summary of All File Changes

| File | Changes |
|---|---|
| `src/pages/Brainstorms.tsx` | Reorder groups: Complete before Scrapped; rename "Scrap" to "Scrapped" |
| `src/components/RichTextNoteEditor.tsx` | Full rewrite to WYSIWYG using `contentEditable` div with `execCommand` |
| `src/components/AppSidebar.tsx` | Add status filters to `useSectionItems` queries per table |
| `src/pages/ProjectWorkspace.tsx` | Click-to-edit GitHub URL; GitHub Pages link; Tasks section; Expenses section; Execution Strategy section |
| `src/pages/BrainstormWorkspace.tsx` | Trigger strategy generation on promote-to-project |
| `src/components/ReferenceViewer.tsx` | Support HTML content rendering for notes |
| `supabase/functions/generate-strategy/index.ts` | New edge function for AI execution strategy generation |
| Database migration | Create `project_tasks` and `project_expenses` tables; add `execution_strategy` column to `projects` |


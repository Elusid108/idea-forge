# List View Fix, Collapsible Kanban, Section Icons, and Task Comments  
  
Interjection  
Change Add Gotcha message to "What unexpected failure, hidden trap, or roadblock did you just hit?"

## 1. Fix List View Description Overflow (Ideas + Brainstorms)

The description text in list rows runs off-screen because the `flex-1` span has no `overflow-hidden` constraint.

**Files: `Ideas.tsx` (line 113), `Brainstorms.tsx` (line 176), `Projects.tsx` (line 179), `Campaigns.tsx` (line 145)**

- Add `overflow-hidden` to the list row container (`flex items-center` div)
- On the description span, ensure `truncate` is working by adding `overflow-hidden text-ellipsis whitespace-nowrap` explicitly, and cap with `max-w-none` removed. The key fix: the description span uses `flex-1` but is missing `overflow-hidden`.
- Slice description text to 80 chars server-side as a safety net (already done in some, ensure consistent).

---

## 2. Collapsible Kanban Groups (All 4 Dashboards)

Currently kanban columns are always open. Add collapsible support to kanban view columns too. Certain groups start collapsed by default.

**Default collapsed groups:**

- Ideas: `scrapped`, `brainstorming`
- Brainstorms: `scrapped`, `completed`
- Projects: `scrapped` (if present), `launched`
- Campaigns: none by default

**Implementation:** Wrap each kanban column's card list in a `Collapsible` with the same `collapsedGroups` state and `toggleGroupCollapse` function already used for tile/list views. The column header becomes a `CollapsibleTrigger`. The collapsed state is shared across all view modes (same localStorage key).

For each dashboard's kanban section, change from:

```
<div className="space-y-3">
  <h3>...</h3>
  {items.map(renderCard)}
</div>
```

To:

```
<Collapsible open={!collapsedGroups.has(key)}>
  <CollapsibleTrigger>
    <ChevronDown/Right> {label} {count}
  </CollapsibleTrigger>
  <CollapsibleContent>
    {items.map(renderCard)}
  </CollapsibleContent>
</Collapsible>
```

**Default collapsed initialization:** Update the `useState` initializer for `collapsedGroups` to seed defaults on first load (when no localStorage key exists).

---

## 3. Section Icons on Page Titles and Card/Row Items

Add the section-specific icon in two places per dashboard:

### 3a. Page Title (large icon left of title text)

- Ideas: `Lightbulb` in yellow (`text-yellow-400`), `h-8 w-8`
- Brainstorms: `Brain` in pink (`text-pink-400`), `h-8 w-8`
- Projects: `Wrench` in blue (`text-blue-400`), `h-8 w-8`
- Campaigns: `Megaphone` in orange (`text-orange-400`), `h-8 w-8`

Place the icon to the left of the `<h1>` in the title `<div>`, using `flex items-center gap-2`.

### 3b. Card/Tile Top-Left (small icon before category badge)

In each card's `CardHeader`, add a small colored icon (`h-4 w-4`) to the left of the category badge row.

### 3c. List Row Far-Left (small icon before category badge)

In each list row, add the same small icon as the first element before the category badge.

---

## 4. Task Comments System (Projects + Campaigns)

### 4a. Database Migration

Create a `task_comments` table:

```sql
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('project', 'campaign')),
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own comments" ON public.task_comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own comments" ON public.task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.task_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

The `task_id` references either `project_tasks.id` or `campaign_tasks.id` depending on `task_type`. We use a polymorphic approach (no FK) to support both table types with one comments table.

### 4b. Frontend: Comment Count Badge on Task Rows

- Query all comments for the project/campaign tasks in a single batch query.
- On each task row (and subtask row), show a small `StickyNote` or `MessageSquare` icon with a count badge (like a notification dot) when comments exist. Example: a small notepad icon with a number overlay.

### 4c. Frontend: Comment Panel/Popover

When clicking the notepad icon on a task:

- Open a popover or small inline panel showing existing comments with timestamps.
- Include a textarea at the bottom to add a new comment.
- Comments are displayed in chronological order.
- Each comment shows content and relative timestamp.

This will be implemented in both `ProjectWorkspace.tsx` and `CampaignWorkspace.tsx`.

---

## Files Changed Summary


| File                              | Changes                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Ideas.tsx`             | Fix list description overflow, add collapsible kanban, add Lightbulb icons to title/cards/rows, default collapse scrapped+brainstorming |
| `src/pages/Brainstorms.tsx`       | Fix list description overflow, add collapsible kanban, add Brain icons, default collapse scrapped+completed                             |
| `src/pages/Projects.tsx`          | Fix list description overflow, add collapsible kanban, add Wrench icons, default collapse launched                                      |
| `src/pages/Campaigns.tsx`         | Fix list description overflow, add collapsible kanban, add Megaphone icons                                                              |
| `src/pages/ProjectWorkspace.tsx`  | Add task comment UI (query, display badge, popover)                                                                                     |
| `src/pages/CampaignWorkspace.tsx` | Add task comment UI (query, display badge, popover)                                                                                     |
| Database migration                | Create `task_comments` table with RLS                                                                                                   |

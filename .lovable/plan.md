
# Dashboard View Modes, Condensed Cards, "Launched" Column, and Task Cascading

This plan covers 5 areas across all 4 dashboard pages and the ProjectWorkspace.

---

## 1. Condensed Card Layout (All Dashboards)

Reduce vertical height on all cards (Ideas, Brainstorms, Projects, Campaigns):

- Reduce `CardHeader` padding from `p-6 pb-2` to `px-4 pt-3 pb-1`
- Reduce `CardContent` padding from `p-6 pt-0` to `px-4 pb-3 pt-0`
- Reduce description `line-clamp-3` to `line-clamp-2`
- Reduce overall `space-y-2` in CardContent to `space-y-1`

Additionally, for **list view** specifically, render a single-row compact layout instead of the full card: category badge, title, truncated description (single line), tags, and date all in one horizontal row.

---

## 2. Three View Modes: Kanban, Tile, List (All 4 Dashboards)

Currently Ideas and Brainstorms have "grid"/"list" and Projects/Campaigns have "kanban"/"list". Standardize all 4 to support 3 modes: `kanban | tile | list`.

**View mode type**: `"kanban" | "tile" | "list"`

**Icons**: `LayoutGrid` (kanban), `Grid3X3` (tile), `List` (list)

**Rendering**:
- **Kanban**: Status-based columns (existing behavior). For Ideas: Fresh/Brainstorming/Scrapped columns. For Brainstorms: Active/Backburner/Complete/Scrapped columns. For Projects: Planning/In Progress/Testing/Done/Launched columns. For Campaigns: existing 5 columns.
- **Tile**: Grid of cards with collapsible groups (current "grid" behavior from Ideas/Brainstorms). Groups match the Kanban columns.
- **List**: Compact single-row items with collapsible groups. Each row: category badge | title | truncated description | tags | date. Same groups as tile view.

**Collapsible groups** (tile and list views): Already implemented in Ideas and Brainstorms. Add the same `collapsedGroups` + `Collapsible` pattern to Projects and Campaigns. Groups correspond to status categories. Persist collapse state to localStorage per page.

---

## 3. Standardized Sorting (All 4 Dashboards)

Replace the current 4 sort options with 6:

| Value | Label |
|---|---|
| `recent` | Last Edited |
| `newest` | Newest |
| `oldest` | Oldest |
| `alpha` | A-Z |
| `alpha_desc` | Z-A |
| `category` | Category |

Add `oldest` (ascending `created_at`) and `alpha_desc` (descending title) to the `sortItems` function in each page. Update all `<SelectItem>` lists.

---

## 4. Projects: Add "Launched" Column and Badge

**File: `src/pages/Projects.tsx`**

- Add `"launched"` to `statusColumns`: `["planning", "in_progress", "testing", "done", "launched"]`
- Add to `statusLabels`: `launched: "Launched"`
- Update kanban grid from `md:grid-cols-4` to `md:grid-cols-5`
- Projects with `campaign_id` set will appear in the "Launched" column (they already have status "done" -- we need to treat them as "launched" in the UI by checking `campaign_id`)
- In the kanban filter, show projects with `campaign_id` in the "Launched" column and exclude them from "Done"

**File: `src/pages/ProjectWorkspace.tsx`**

- Replace the green "Completed" badge (lines 981-984) with a "Launched" badge using a Rocket icon:
  ```
  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border gap-1">
    <Rocket className="h-3 w-3" /> Launched
  </Badge>
  ```
- Remove `CheckCircle2` import if no longer used

---

## 5. Task Cascading: Check/Uncheck Parent Cascades to Subtasks

**File: `src/pages/ProjectWorkspace.tsx`**

Update `toggleTaskComplete` mutation to cascade to subtasks:

```typescript
const toggleTaskComplete = useMutation({
  mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
    // Update the target task
    await supabase.from("project_tasks").update({ completed }).eq("id", taskId);
    // Find and update all subtasks
    const subtaskIds = tasks
      .filter((t: any) => t.parent_task_id === taskId)
      .map((t: any) => t.id);
    if (subtaskIds.length > 0) {
      await supabase.from("project_tasks")
        .update({ completed })
        .in("id", subtaskIds);
    }
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", id] }),
});
```

**Undo/Redo for task toggling**: Wrap the `toggleTaskComplete` call in `pushAction` so Ctrl+Z reverses the toggle (including subtask cascade). Store the previous states of all affected tasks (parent + subtasks) in the undo function.

Update the `onCheckedChange` handler to:
1. Capture current completed states of parent + subtasks before mutating
2. Call `pushAction` with label like "Complete task: [title]" or "Reopen task: [title]"
3. Undo function restores each task's previous completed state individually

---

## Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/Ideas.tsx` | Add kanban view mode, add oldest/Z-A sort options, condense card padding |
| `src/pages/Brainstorms.tsx` | Add kanban view mode, add oldest/Z-A sort options, condense card padding |
| `src/pages/Projects.tsx` | Add tile/list views with collapsible groups, add "launched" column, add oldest/Z-A sort, condense cards |
| `src/pages/Campaigns.tsx` | Add tile/list views with collapsible groups, add oldest/Z-A sort, condense cards |
| `src/pages/ProjectWorkspace.tsx` | Change "Completed" badge to "Launched" with Rocket icon, cascade task completion to subtasks, undo/redo for task toggling |

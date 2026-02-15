

# Cross-Pipeline Badges, Campaign Context, and Persistent Chat State

This plan covers four areas: adding "Linked Campaign" badges to Ideas and Brainstorms, adding full lineage badges to Campaigns, carrying over tags/category during campaign creation, enriching the Campaign Assistant with linked project context, and making the floating chat widget's collapsed/expanded state persist across navigation.

---

## 1. "Linked Campaign" Badge on Ideas

**File**: `src/pages/Ideas.tsx` (inside `IdeaDetailModal`)

Currently the modal queries for `linkedBrainstorm` and `linkedProject`. Add a third query for `linkedCampaign`:

- Query the `campaigns` table where `project_id = linkedProject.id` and `deleted_at IS NULL`
- If found, render a badge:
  ```
  <Megaphone icon /> Linked Campaign
  ```
  clicking navigates to `/campaigns/{id}` (and closes the modal)

This query is chained: `idea -> linkedBrainstorm -> linkedProject -> linkedCampaign` (only enabled when `linkedProject?.id` exists).

---

## 2. "Linked Campaign" Badge on Brainstorm Workspace

**File**: `src/pages/BrainstormWorkspace.tsx`

Currently shows "Linked Idea" and "Linked Project" badges. Add a query for `linkedCampaign`:

- Query `campaigns` where `project_id = linkedProject.id` and `deleted_at IS NULL`
- Render a badge next to the existing "Linked Project" badge:
  ```
  <Megaphone icon /> Linked Campaign
  ```
  clicking navigates to `/campaigns/{id}`

---

## 3. Full Lineage Badges on Campaign Workspace

**File**: `src/pages/CampaignWorkspace.tsx`

Currently only shows "Linked Project". Add queries to trace the full chain:

- **Linked Brainstorm**: Query `projects` for `brainstorm_id` using `linkedProject.id`, then use that to fetch the brainstorm title. Render badge with `Brain` icon navigating to `/brainstorms/{id}`.
- **Linked Idea**: From the brainstorm data, check `idea_id`. Render badge with `Lightbulb` icon that opens a read-only idea overlay (or navigates to ideas page).
- **Category badge**: Display `campaign.category` using the standard `CATEGORY_COLORS` map.
- **Tags**: Display tag badges below the metadata row.

The badge row will show: `Created date | Category | Linked Idea | Linked Brainstorm | Linked Project`

---

## 4. Carry Over Tags and Category During Campaign Launch

**File**: `src/pages/ProjectWorkspace.tsx` (the `launchCampaign` mutation)

Currently the insert only passes `project_id`, `user_id`, and `title`. The campaigns table does not have `tags` or `category` columns yet.

**Database migration needed**: Add `category` (text, nullable, default null) and `tags` (text array, nullable, default null) columns to the `campaigns` table.

Then update the `launchCampaign` mutation to also pass:
- `category: project.category`
- `tags: project.tags`

---

## 5. Enrich Campaign Assistant with Linked Project Context

**File**: `src/pages/CampaignWorkspace.tsx` (the `handleChatSubmit` function)

Currently sends minimal campaign info. Enhance the context by fetching and including:

- Linked project's `compiled_description`, `execution_strategy`, `bullet_breakdown`, `name`
- Linked project's tasks (query `project_tasks` for the project_id)
- Linked project's notes (query `project_references` where type = 'note')

Update the system prompt context to include all of this. The assistant should be told it can READ this project data to make campaign recommendations but cannot modify it. The edge function `project-chat` already accepts a `context` object, so we just need to pass richer data from the frontend.

Updated context object:
```
context: {
  title: campaign.title,
  description: `Campaign. Sales model: ${campaign.sales_model}. Channel: ${campaign.primary_channel}. Revenue: $${campaign.revenue}. Units sold: ${campaign.units_sold}. Target price: $${campaign.target_price}.`,
  tasks: linkedProjectTasks (formatted string),
  notes: linkedProjectNotes (formatted string),
  execution_strategy: linkedProject.execution_strategy,
  bullet_breakdown: linkedProject.bullet_breakdown,
  project_description: linkedProject.compiled_description,
}
```

This reuses the existing `project-chat` edge function -- no new edge function needed.

---

## 6. Persistent Floating Chat Widget State

**File**: `src/components/FloatingChatWidget.tsx`

Currently defaults to `"expanded"` every time the component mounts. Change to use `localStorage`:

- Store state in `localStorage` under key `"chat-widget-state"`
- On first mount (no localStorage value), default to `"expanded"` so users discover the widget
- On subsequent mounts, restore the last saved state
- When the user clicks X (collapse) or the flag (expand), save the new state to localStorage

Implementation:
```tsx
const [state, setState] = useState<WidgetState>(() => {
  const saved = localStorage.getItem("chat-widget-state");
  return (saved === "collapsed") ? "collapsed" : "expanded";
});

// Persist on change
useEffect(() => {
  localStorage.setItem("chat-widget-state", state);
}, [state]);
```

This applies globally across all workspaces (Project, Brainstorm, Campaign) since they all use the same component.

---

## Summary of All Changes

| File | Change |
|---|---|
| **Migration SQL** | Add `category` and `tags` columns to `campaigns` table |
| `src/pages/Ideas.tsx` | Add `linkedCampaign` query and badge in IdeaDetailModal |
| `src/pages/BrainstormWorkspace.tsx` | Add `linkedCampaign` query and badge |
| `src/pages/CampaignWorkspace.tsx` | Add brainstorm/idea badges, category/tags display, enrich chat context |
| `src/pages/ProjectWorkspace.tsx` | Pass `category` and `tags` in `launchCampaign` mutation |
| `src/components/FloatingChatWidget.tsx` | Persist expanded/collapsed state in localStorage |


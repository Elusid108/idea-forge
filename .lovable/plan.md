

# Multi-Area Update: Project Locking UI, Brainstorm Locking Banner, Campaign Cards, Undo/Redo, and Campaign Assistant

This plan covers 5 areas of work.

---

## 1. Replace Delete Button with Green "Completed" Badge on Locked Projects

**File: `src/pages/ProjectWorkspace.tsx` (lines ~904-931)**

When `isLocked` is true (i.e., `campaign_id` exists):
- Hide the entire `<AlertDialog>` delete button block.
- Show the same green "Completed" badge used in BrainstormWorkspace:
  ```
  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border gap-1">
    <CheckCircle2 className="h-3 w-3" /> Completed
  </Badge>
  ```
- The "Launch Campaign" button is already hidden when `campaign_id` exists, so no change needed there.
- Import `CheckCircle2` if not already imported.

---

## 2. Add Yellow Locked Banner to BrainstormWorkspace

**File: `src/pages/BrainstormWorkspace.tsx`**

Currently, completed brainstorms show a green badge and hide buttons, but there is no yellow warning banner explaining WHY editing is locked.

- After the badges row (around line ~910, after the linked badges section), add a banner when `isCompleted` is true:
  ```
  {isCompleted && (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      This brainstorm is locked because it has an active project. Delete the linked project to unlock editing.
    </div>
  )}
  ```
- Import `AlertTriangle` from lucide-react (add to the existing import line).

---

## 3. Campaign Dashboard Card Cleanup

**File: `src/pages/Campaigns.tsx` (lines ~66-97)**

Current card shows: primary_channel badge (Website/GitHub), status badge, title, "0 sold", "$0", and date.

Changes to `renderCampaignCard`:
- Remove the `primary_channel` badge ("Website", "GitHub") from the CardHeader entirely.
- Remove the status badge from Kanban view cards (redundant since column header shows status). Keep it in list view only.
- Remove the "sold" and revenue stats row (lines 87-90).
- Add the carried-over `category` badge (using `CATEGORY_COLORS` -- copy from ProjectsPage or define locally).
- Add up to 4 tag badges below the title (same pattern as Projects page cards).
- Keep the date.

Updated card structure:
```
<CardHeader>
  {category badge || "Uncategorized"}
  {viewMode === "list" && status badge}  // only in list view
</CardHeader>
<CardContent>
  <title>
  <tag badges (up to 4, with +N overflow)>
  <date>
</CardContent>
```

Add `CATEGORY_COLORS` constant (same as in Projects page).

---

## 4. Undo/Redo Across the App (Ctrl+Z / Ctrl+Y)

The current `useUndoRedo` hook is specifically designed for brainstorm history and uses a `brainstorm_history` database table. Extending this to all entities (projects, campaigns) requires a broader approach.

### Approach: Generic client-side undo/redo for deletions

Rather than creating new DB tables for every entity type, implement a lightweight client-side undo pattern for destructive actions (task deletion, expense deletion, reference deletion, etc.):

**New hook: `src/hooks/useActionUndo.ts`**

A simple hook that maintains a stack of recent actions with their undo functions:
- `pushAction(label: string, undoFn: () => Promise<void>)` -- registers an undoable action
- `undo()` -- calls the most recent undo function
- `redo()` -- calls the most recent redo function
- Listens for Ctrl+Z / Ctrl+Y globally
- Shows a toast on undo/redo with the action label
- Stack limited to ~20 entries, client-side only (no DB persistence needed)

**Integration points:**
- **CampaignWorkspace**: Wrap task deletion, task completion toggle, note deletion in `pushAction`.
- **ProjectWorkspace**: Wrap task deletion, expense deletion, reference deletion, gotcha deletion in `pushAction`.
- The existing brainstorm undo/redo (DB-backed) continues to work as-is.

Each workspace component will instantiate this hook and wrap its mutation callbacks.

---

## 5. Campaign Assistant Capabilities (already working)

Based on the code review, the Campaign Assistant already supports `create_note` and `add_task` actions via the `campaign-chat` edge function's assistant mode. The `handleChatSubmit` function in `CampaignWorkspace.tsx` (lines 512-533) already processes these actions, creates DB records, invalidates queries, and shows toasts.

No code changes needed here -- this is already implemented and functional.

---

## Technical Summary

| Area | File(s) | Changes |
|---|---|---|
| Project delete -> green badge | `ProjectWorkspace.tsx` | Replace delete AlertDialog with Completed badge when locked |
| Brainstorm locked banner | `BrainstormWorkspace.tsx` | Add amber warning banner when completed |
| Campaign card cleanup | `Campaigns.tsx` | Remove channel/status badges from kanban, remove sold/revenue, add category + tags |
| App-wide undo/redo | New `useActionUndo.ts`, `CampaignWorkspace.tsx`, `ProjectWorkspace.tsx` | Client-side undo stack for destructive actions |
| Campaign assistant | None | Already implemented |


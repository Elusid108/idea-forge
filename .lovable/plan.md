
# Floating Chat Widget, Strategy Generation UX, and Auto-Refresh

## 1. FloatingChatWidget: Default to Expanded, Remove Minimize Button

**File**: `src/components/FloatingChatWidget.tsx`

- Change default state from `"collapsed"` to `"expanded"`
- Remove the `"minimized"` state entirely -- the minimize button (`Minus`) currently does the same as close
- In the expanded title bar, keep only the X button which sets state to `"collapsed"` (the small flag)
- Remove the `Minimize` and `Maximize2` icon imports since they're no longer needed

## 2. Make Strategy Generation More Apparent

**File**: `src/pages/ProjectWorkspace.tsx`

Currently the placeholder just says "Generating strategy..." in italic text which is easy to miss (as seen in the screenshot).

- When `executionStrategy` is empty and the project has a `brainstorm_id`, show a more prominent loading indicator:
  - A card/box with a `Loader2` spinner icon, bold text "Generating Execution Strategy...", and a subtitle like "Your strategy is being created based on your brainstorm"
  - Replace the plain placeholder text with this visual indicator

## 3. Auto-Refresh Strategy When Generated in Background

**File**: `src/pages/ProjectWorkspace.tsx`

The strategy is generated in the background after promotion (in `BrainstormWorkspace.tsx`). When the user navigates to the project page, the strategy may not be ready yet, and it doesn't auto-update when it finishes.

- Add a polling mechanism: when `executionStrategy` is empty and the project has a `brainstorm_id`, set up an interval (every 3 seconds) that re-fetches the project data
- Once the strategy is populated, the interval clears automatically
- Use `queryClient.invalidateQueries` to refetch the project query

```
useEffect(() => {
  if (!executionStrategy && project?.brainstorm_id) {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    }, 3000);
    return () => clearInterval(interval);
  }
}, [executionStrategy, project?.brainstorm_id, id, queryClient]);
```

This ensures the strategy appears automatically without requiring a page refresh.

---

## Technical Summary

| File | Changes |
|---|---|
| `src/components/FloatingChatWidget.tsx` | Default to expanded; remove minimized state; keep only X button |
| `src/pages/ProjectWorkspace.tsx` | Prominent strategy-generating indicator; polling to auto-refresh strategy |

No database changes needed. Both workspaces (Project and Brainstorm) use the same `FloatingChatWidget` component, so the widget changes apply everywhere.

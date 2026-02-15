
# Three UX Fixes: Brainstorm Delete Reset, Chat Auto-Focus, and Click-Outside Auto-Save

---

## 1. Delete Brainstorm Resets Linked Idea to "Fresh"

When a brainstorm is deleted (soft-deleted), if it has a linked `idea_id`, the linked idea's status should revert from `"brainstorming"` to `"new"` (Fresh Idea).

**File: `src/pages/BrainstormWorkspace.tsx`** (deleteBrainstorm mutation, ~line 333-346)
- In the `mutationFn`, after soft-deleting the brainstorm, check if `brainstorm.idea_id` exists
- If so, update the linked idea's status back to `"new"`:
  ```
  await supabase.from("ideas").update({ status: "new" }).eq("id", brainstorm.idea_id);
  ```
- In `onSuccess`, also invalidate the `ideas` and `sidebar-items` query caches

**File: `src/pages/Trash.tsx`** -- The restore function for brainstorms should also be considered. When restoring a brainstorm from trash, the idea should go back to `"brainstorming"`. However, this requires knowing the brainstorm's `idea_id` which the current generic restore function doesn't have access to. This is a secondary enhancement and can be noted for later.

---

## 2. Auto-Focus Chat Input After Sending a Message

After the user sends a message in any AI assistant (floating chat widget), the textarea should automatically re-focus so they can keep typing without clicking.

**File: `src/components/FloatingChatWidget.tsx`**
- Add a `useRef` for the textarea element
- Add a `useEffect` that watches `isThinking` -- when it transitions from `true` to `false`, focus the textarea
- This handles all three workspaces (Brainstorm, Project, Campaign) since they all use this same widget

The brainstorm interview textarea already has auto-focus (line 662 of BrainstormWorkspace.tsx), so no change needed there.

---

## 3. Click-Outside Auto-Save for Editable Text Fields

Currently the `EditableMarkdown` component requires clicking a "Done" button to save. Instead, clicking anywhere outside the editor should auto-save and revert to display mode. Only one field should be editable at a time.

**File: `src/components/EditableMarkdown.tsx`**
- Add a `useRef` for the editor wrapper div
- Add a `useEffect` with a `mousedown` event listener on `document` that checks if the click target is outside the editor ref
- When a click-outside is detected, run the same save logic as `handleDone` (convert HTML to markdown, call `onChange`, set `editing` to false, call `onSave`)
- Remove the "Done" button since saving is now automatic on click-outside
- The "only one field editable at a time" behavior is naturally achieved: when field A is in edit mode and the user clicks on field B (which is outside field A), the click-outside handler saves field A first. Then field B's `onClick` fires and enters edit mode.

---

## Technical Summary

| File | Changes |
|---|---|
| `src/pages/BrainstormWorkspace.tsx` | In `deleteBrainstorm` mutation: reset linked idea status to `"new"`, invalidate ideas cache |
| `src/components/FloatingChatWidget.tsx` | Add textarea ref; auto-focus textarea when `isThinking` goes from true to false |
| `src/components/EditableMarkdown.tsx` | Add click-outside detection to auto-save and exit edit mode; remove "Done" button |

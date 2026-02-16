
# Fix Expense Edit Bug, Strengthen AI Link Creation

## 1. Expense Edit Dialog Not Closing

**Root cause**: When `updateExpense.mutate()` succeeds, the `onSuccess` callback sets `setEditingExpense(null)` and resets the form, but never calls `setShowExpenseDialog(false)`. The dialog stays open, and since `editingExpense` is now null, it switches to showing the "Add Expense" form.

**Fix in `ProjectWorkspace.tsx` and `CampaignWorkspace.tsx`**:
- Add `setShowExpenseDialog(false)` to the `updateExpense` mutation's `onSuccess` callback

## 2. AI Creates Notes Instead of Links

**Root cause**: The system prompt in `project-chat/index.ts` (and the other chat functions) explicitly says "Use the create_note tool to compile lists of resources, books, references" which directly encourages note creation for URLs. The `create_link` instruction is weaker and appears later. The AI defaults to creating a single note with links listed inside rather than using `create_link` multiple times.

**Fix in `supabase/functions/project-chat/index.ts`, `campaign-chat/index.ts`, `brainstorm-chat/index.ts`**:
- Rewrite the guidelines to strongly prioritize `create_link` for individual URLs:
  - Change: "Use the create_note tool to compile lists of resources, books, references, etc."
  - To: "Use the create_note tool for long-form research notes, summaries, and written content. When recommending individual websites, tools, or URLs, use create_link for EACH one -- do NOT put URLs inside notes."
- Move the `create_link` instruction higher in the guidelines and make it more explicit:
  - "IMPORTANT: When the user asks for links, websites, retailers, tools, or external resources, use the create_link tool ONCE PER URL to create individual link tiles. Do NOT bundle URLs into a single note."

---

## Technical Details

### updateExpense onSuccess fix (both workspaces)

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["project-expenses", id] });
  setShowExpenseDialog(false);  // ADD THIS LINE
  setEditingExpense(null);
  setExpenseForm({ ... });
},
```

### System prompt changes (all three chat edge functions)

Replace the note guideline with:
```
- IMPORTANT: When the user asks for links, websites, retailers, tools, or external resources, call create_link ONCE PER URL to create individual link reference tiles. Do NOT bundle multiple URLs into a single note.
- Use the create_note tool for long-form research, summaries, and written analysis. Do NOT use notes to list URLs.
- Use the create_link tool for EACH website, tool, or external resource. Always provide the full URL starting with https://.
```

### Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Add `setShowExpenseDialog(false)` to updateExpense onSuccess |
| `src/pages/CampaignWorkspace.tsx` | Add `setShowExpenseDialog(false)` to updateExpense onSuccess |
| `supabase/functions/project-chat/index.ts` | Strengthen create_link instructions in system prompt |
| `supabase/functions/campaign-chat/index.ts` | Strengthen create_link instructions in system prompt |
| `supabase/functions/brainstorm-chat/index.ts` | Strengthen create_link instructions in system prompt |

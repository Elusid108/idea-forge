
# Widget Discovery, Task Dialog Spacing, Calculator Keyboard, and Version Bump

## 1. Pass Widget Context to AI Assistants

The AI cannot find existing widgets because widget data is not included in the context sent to the edge functions. Both workspaces only send notes to the AI context.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

- In `handleChatSubmit`, gather widgets alongside notes and pass them as a new `widgets` context field:
  ```
  const widgetsList = references
    .filter(r => r.type === "widget")
    .map(r => {
      const wd = parseWidgetData(r.description);
      return `${r.title}: ${wd.summary} [code length: ${wd.code.length} chars]`;
    }).join("\n");
  ```
- Pass `widgets: widgetsList` in the context object sent to the edge function

**Files: `supabase/functions/project-chat/index.ts`, `supabase/functions/campaign-chat/index.ts`**

- Add `Existing Widgets: ${context.widgets || "None"}` to the system prompt
- Update `update_widget` tool description: change "Update an existing widget's code by its title" to "Update an existing widget by its title. You can update the code, summary, title, and/or instructions. Match the widget by its current title."
- Add optional `new_title` parameter to `update_widget` so the AI can rename widgets

## 2. Improve Task/Subtask Dialog Spacing

The popup is visually cramped (as shown in the screenshot). Increase spacing between sections.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

- Change the task detail dialog's inner container from `space-y-4` to `space-y-5`
- Add `Separator` components between the badges, description, subtasks, comments, and timestamp sections
- Add `pt-1` or small top padding to the created timestamp line for visual breathing room

## 3. Comments Scroll to Most Recent

Currently comments are ordered ascending (oldest first), so the most recent comment may be off-screen.

**File: `TaskCommentsSection.tsx`**

- Add a `useEffect` with a ref on the scrollable comment container that scrolls to the bottom whenever comments load or change:
  ```tsx
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);
  ```

## 4. Calculator Keyboard Support

Add keyboard event listeners to the built-in calculator widget template so users can type numbers and operators.

**File: `src/lib/widgetUtils.ts`**

Update the calculator template code to add a `keydown` event listener:
```javascript
document.addEventListener('keydown', function(e) {
  const key = e.key;
  if ('0123456789.'.includes(key)) d(key);
  else if (key === '+') d('+');
  else if (key === '-') d('-');
  else if (key === '*') d('*');
  else if (key === '/') d('/');
  else if (key === '(' || key === ')') d(key);
  else if (key === 'Enter' || key === '=') eq();
  else if (key === 'Backspace') del();
  else if (key === 'Escape' || key === 'c' || key === 'C') c();
});
```

## 5. Version Bump

**File: `src/components/AppSidebar.tsx`**

- Change `v0.3` to `v0.4`

---

## Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Pass widgets context to AI, task dialog spacing |
| `src/pages/CampaignWorkspace.tsx` | Pass widgets context to AI, task dialog spacing |
| `src/components/TaskCommentsSection.tsx` | Auto-scroll to most recent comment |
| `src/lib/widgetUtils.ts` | Add keyboard support to calculator template |
| `src/components/AppSidebar.tsx` | Version bump to v0.4 |
| `supabase/functions/project-chat/index.ts` | Add widgets to context, update tool descriptions |
| `supabase/functions/campaign-chat/index.ts` | Add widgets to context, update tool descriptions |

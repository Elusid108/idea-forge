
# Widget Chat Links, AI Auto-Fill, Edit Dialog Titles, Thumbnails, and Task Comments

## 1. Widget Badge in Chat (like Notes)

Currently, when the AI creates a note, a clickable badge appears in the chat. Widgets need the same treatment.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

- Extend `ChatMsg` type: add optional `widgetId?: string` and `widgetTitle?: string`
- In the `create_widget` action handler, capture the inserted widget's ID and title (similar to `createdNoteId`/`createdNoteTitle`)
- Attach `widgetId`/`widgetTitle` to the assistant message
- In `renderMessage`, add a second badge button (cyan, with Code icon) when `msg.widgetId` is present, which opens the widget in the viewer

## 2. AI-Generated Widgets Auto-Fill Summary and Instructions

When the AI creates a widget via tool call, it already accepts `summary` and `instructions` parameters. The edge functions already pass these through. The frontend already encodes them via `encodeWidgetData`. This should already work -- but the edge function tool definitions need to make `summary` and `instructions` clearly described so the AI reliably fills them.

**Files: `supabase/functions/project-chat/index.ts`, `supabase/functions/campaign-chat/index.ts`**

- Update the `create_widget` tool's system prompt / parameter descriptions to instruct the AI to always include a brief summary and usage instructions when creating widgets

## 3. Edit Dialog Titles Should Reflect Resource Type

Currently both workspaces show "Edit Resource" regardless of type. Change to show type-specific titles.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

- Replace `<DialogTitle>Edit Resource</DialogTitle>` with dynamic title based on `editingRef?.type`:
  - `"Edit Note"`, `"Edit Link"`, `"Edit Image"`, `"Edit Video"`, `"Edit File"`, `"Edit Widget"`
- Use a simple lookup: `const EDIT_TITLES: Record<string, string> = { note: "Edit Note", link: "Edit Link", image: "Edit Image", video: "Edit Video", file: "Edit File", widget: "Edit Widget" };`

## 4. Widget/Link Thumbnail Snapshots

Generating live thumbnails of widgets and links requires rendering iframes or fetching screenshots, which is complex and has security/performance implications. A practical approach:

**Widgets**: Render a small hidden iframe and capture it isn't feasible in browsers due to cross-origin restrictions on `srcDoc` canvas capture. Instead, show the widget's summary text as the tile preview (already implemented) with the Code icon as a visual indicator. No change needed here.

**Links**: The app already has a `fetch-link-preview` edge function. If `thumbnail_url` is populated from link metadata, it already shows. This is already handled. No additional changes needed unless the edge function isn't being called on link creation -- will verify and ensure it's invoked.

## 5. Comments Section in Task/Subtask Detail Popup

Add a scrolling comment section inside the task detail dialog (both Project and Campaign), between the task metadata and the footer buttons.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

- Add a comments section inside the `viewingTask` dialog, after the subtasks/description and before the timestamp
- Reuse the existing `task_comments` table and query pattern from `TaskCommentButton`
- The section includes:
  - A "Comments" header
  - A scrolling area (`max-h-[200px] overflow-y-auto`) showing comments chronologically
  - Each comment shows content and a timestamp (formatted as date + time)
  - A text input + Send button at the bottom
- Query comments when `viewingTask` is set (using the task ID and type)
- Insert new comments with the same mutation pattern as `TaskCommentButton`

---

## Technical Details

### ChatMsg Type Extension
```typescript
type ChatMsg = { 
  role: "user" | "assistant"; 
  content: string; 
  noteId?: string; 
  noteTitle?: string;
  widgetId?: string;
  widgetTitle?: string;
};
```

### Widget Badge in renderMessage
```tsx
{msg.widgetId && (
  <button
    className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
    onClick={() => {
      const widget = references.find((r: any) => r.id === msg.widgetId);
      if (widget) setViewingRef(widget);
    }}
  >
    <Code className="h-3 w-3" />
    View: {msg.widgetTitle}
  </button>
)}
```

### Task Comments in Dialog
```tsx
{/* Comments Section */}
<div>
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Comments</p>
  <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/30">
    {taskComments.map(c => (
      <div key={c.id} className="text-xs border-b border-border/30 pb-1.5">
        <p className="whitespace-pre-wrap">{c.content}</p>
        <p className="text-[10px] text-muted-foreground/60">
          {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>
    ))}
  </div>
  <div className="flex gap-1 mt-2">
    <Input placeholder="Add a comment..." />
    <Button size="icon"><Send className="h-3 w-3" /></Button>
  </div>
</div>
```

### Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | ChatMsg type, widget badge in chat, edit dialog titles, task comments in popup |
| `src/pages/CampaignWorkspace.tsx` | ChatMsg type, widget badge in chat, edit dialog titles, task comments in popup |
| `supabase/functions/project-chat/index.ts` | Improve create_widget tool description for summary/instructions |
| `supabase/functions/campaign-chat/index.ts` | Improve create_widget tool description for summary/instructions |

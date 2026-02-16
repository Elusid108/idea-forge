

# Fix Toast Stacking, Multi-Link Chat Badges, Welcome Messages, and Reference Hover Popouts

## 1. Fix Toast Notifications Not Disappearing (Stacking)

The "Link added: ..." toasts stack up because multiple `toast.success()` calls fire in rapid succession from the action loop. The fix is to replace the per-link toasts with a single summary toast after all actions are processed.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`, `BrainstormWorkspace.tsx`**

- Remove `toast.success("Link added: ...")` from inside the `create_link` action handler loop
- After the action loop completes, count how many links were created and show a single toast:
  ```
  if (linkCount === 1) toast.success(`Link added: ${lastLinkTitle}`);
  else if (linkCount > 1) toast.success(`${linkCount} links added`);
  ```
- Apply the same pattern for notes/widgets if multiple are created in one response

## 2. Show All Created Links as Badges in Chat (Not Just the Last One)

Currently, `createdLinkId` / `createdLinkTitle` are scalar variables that get overwritten in each loop iteration, so only the last link gets a badge. The fix is to collect all created links into an array and render multiple badges.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`, `BrainstormWorkspace.tsx`**

- Change `ChatMsg` type to support arrays:
  ```typescript
  type ChatMsg = {
    role: "user" | "assistant";
    content: string;
    noteId?: string; noteTitle?: string;
    widgetId?: string; widgetTitle?: string;
    linkId?: string; linkTitle?: string;        // keep for single
    links?: { id: string; title: string }[];     // add for multiple
  };
  ```
- Replace scalar `createdLinkId`/`createdLinkTitle` with an array: `const createdLinks: { id: string; title: string }[] = [];`
- Push each created link into the array during the action loop
- Attach the array to the assistant message: `...(createdLinks.length > 0 ? { links: createdLinks } : {})`
- Update `renderMessage` to render all link badges from the `links` array instead of just `msg.linkId`

**File: `FloatingChatWidget.tsx`**

- Update the `ChatMsg` type to include `links?: { id: string; title: string }[]`

## 3. Update AI Welcome Messages to Mention Link Creation

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`, `BrainstormWorkspace.tsx`**

- **Project**: Add "- **Add reference links** (websites, tools, retailers, articles)" to the welcome message
- **Campaign**: Add "- **Add reference links** to useful websites, tools, and resources" to the welcome message
- **Brainstorm** (active): Change to include "**create research notes**, **add reference links**, and **update the description and bullet breakdown**"

## 4. Reference/Resource Hover Popout

Add a tooltip-style popout when hovering over a reference tile in grid or list view that shows the full title and description/summary.

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`, `BrainstormWorkspace.tsx`**

- Import `HoverCard, HoverCardContent, HoverCardTrigger` from the existing Radix hover-card component
- Wrap each reference tile (both grid Card and list row) with `HoverCardTrigger`
- Show a `HoverCardContent` popout with:
  - Full title (not truncated)
  - Full description/summary text
  - Type icon and color badge
  - URL for link types

---

## Technical Details

### Multi-link badge rendering

```tsx
{msg.links && msg.links.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1">
    {msg.links.map((link) => (
      <button
        key={link.id}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
        onClick={() => {
          const ref = references.find((r) => r.id === link.id);
          if (ref) setViewingRef(ref);
        }}
      >
        <LinkIcon className="h-3 w-3" />
        View: {link.title}
      </button>
    ))}
  </div>
)}
```

### Hover popout for reference tiles

```tsx
<HoverCard openDelay={300} closeDelay={100}>
  <HoverCardTrigger asChild>
    {/* existing Card or list row */}
  </HoverCardTrigger>
  <HoverCardContent className="w-72 p-3" side="top">
    <div className="flex items-start gap-2">
      <Icon className={`h-4 w-4 ${iconColor} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{ref.title}</p>
        {previewText && <p className="text-xs text-muted-foreground mt-1">{previewText}</p>}
        {ref.type === "link" && ref.url && (
          <p className="text-xs text-blue-400 truncate mt-1">{ref.url}</p>
        )}
      </div>
    </div>
  </HoverCardContent>
</HoverCard>
```

### Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Multi-link badges, consolidated toast, welcome message, hover popout |
| `src/pages/CampaignWorkspace.tsx` | Multi-link badges, consolidated toast, welcome message, hover popout |
| `src/pages/BrainstormWorkspace.tsx` | Multi-link badges, consolidated toast, welcome message, hover popout |
| `src/components/FloatingChatWidget.tsx` | Update ChatMsg type for `links` array |


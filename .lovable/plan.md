# Icon Alignment, Status Badge Removal, Mobile Sidebar, and Widget Resources

## 1. Fix Icon + Badge Alignment on Tiles (All 4 Dashboards)

Currently the CardHeader uses `justify-between`, which spaces icon and badges apart. The user wants the icon immediately left of the category badge, both left-aligned.

**Files: Ideas.tsx, Brainstorms.tsx, Projects.tsx, Campaigns.tsx**

Change the CardHeader's inner div from:

```
<div className="flex items-start justify-between gap-2">
  <Icon /> <Badge>Category</Badge> <Badge>Status</Badge>
</div>
```

To:

```
<div className="flex items-center gap-2">
  <Icon /> <Badge>Category</Badge>
</div>
```

This left-aligns both the icon and category badge together.

---

## 2. Remove Redundant Status Badges from Tiles/Kanban (Brainstorms + Projects)

Since group headers already show the status (e.g., "ACTIVE", "PLANNING"), the status badge on each card is redundant.

- **Brainstorms**: Remove the `statusBadge` Badge from `renderCard` (line 143).
- **Projects**: Remove the `statusLabels[effectiveStatus]` Badge from `renderProjectCard` (line 145).
- **Ideas**: Keep the "Brainstorming" badge since it provides additional context beyond the group.
- **Campaigns**: Already removed in prior work for kanban view.

---

## 3. Mobile Sidebar Auto-Close on Navigation

When in mobile view, clicking a sidebar link should close the sidebar so the user can see the page.

**File: `src/components/AppSidebar.tsx**`

- Import `useSidebar` from `@/components/ui/sidebar`.
- Get `setOpenMobile` and `isMobile` from the hook.
- Wrap navigation actions (both section links and item buttons) to call `setOpenMobile(false)` when `isMobile` is true after navigating.
- For the `NavLink` components, add an `onClick` handler that closes the sidebar on mobile.
- For the nested item buttons, add the same close behavior in their `onClick`.

---

## 4. Widget Resource Type (Projects + Campaigns)

Add a new reference type "widget" -- a mini JS/HTML web app that runs in an iframe popup.

### 4a. Database Changes

No schema migration needed. The `project_references` and `campaign_references` tables use a `type` text column. We just store `"widget"` as the type value. The `description` field will hold the HTML/JS code, and `title` holds the widget name.

### 4b. Update Reference Type Constants

**Files: ProjectWorkspace.tsx, CampaignWorkspace.tsx**

- Add `"widget"` to `RefType`: `type RefType = "link" | "image" | "video" | "note" | "file" | "widget";`
- Add to `REF_TYPE_ORDER`: `["note", "link", "image", "video", "file", "widget"]`
- Add to `REF_ICONS`: `widget: Code` (import `Code` from lucide-react)
- Add to `REF_ICON_COLORS`: `widget: "text-cyan-400"`
- Add to `REF_TYPE_LABELS`: `widget: "Widgets"`

### 4c. Widget Add/Edit Dialog

When `addRefType === "widget"`:

- Show a `Title` input
- Show a large code editor area (using `<Textarea>` with monospace font) for the HTML/JS code
- No URL or file upload needed

When editing a widget (pencil icon), reopen the same code editor dialog pre-filled with existing code.

### 4d. Widget Viewer (ReferenceViewer)

**File: `src/components/ReferenceViewer.tsx**`

Add a new case for `type === "widget"`:

- Render a Dialog with an `<iframe>` that loads the widget code via `srcdoc`
- The iframe uses `sandbox="allow-scripts"` for security
- Full-width dialog with reasonable height (e.g., 70vh)

### 4e. Widget Click Handler

In `handleRefClick`:

- When `ref.type === "widget"`, open the viewer (same as note/image/video)

### 4f. AI Assistant Integration

**Files: `supabase/functions/project-chat/index.ts`, `supabase/functions/campaign-chat/index.ts**`

Add a new tool `create_widget` to the assistant:

```json
{
  "name": "create_widget",
  "description": "Create a widget (mini web app) as a resource. The code should be a complete HTML document with embedded JS/CSS.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "code": { "type": "string", "description": "Complete HTML document with embedded JS/CSS" }
    },
    "required": ["title", "code"]
  }
}
```

Handle the `create_widget` action in the frontend's `handleChatSubmit` function by inserting a reference with `type: "widget"`, `title`, and `description: code`.

Also add a `update_widget` tool for modifying existing widgets by title.  
  
Update assistants welcome message to mention the ability to create wedgets. Include a metric to imperial and vice versa converter and a 10 digit calculator as two example widgets the user can add from the add widget popup. Clicking either of these buttons will load the code into the window.

---

## Files Changed Summary


| File                                        | Changes                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/pages/Ideas.tsx`                       | Left-align icon + category badge in card header                                      |
| `src/pages/Brainstorms.tsx`                 | Left-align icon + category badge, remove status badge from cards                     |
| `src/pages/Projects.tsx`                    | Left-align icon + category badge, remove status badge from cards                     |
| `src/pages/Campaigns.tsx`                   | Left-align icon + category badge                                                     |
| `src/components/AppSidebar.tsx`             | Auto-close sidebar on mobile when navigating                                         |
| `src/pages/ProjectWorkspace.tsx`            | Add widget type to refs, widget add/edit UI, widget click handler, AI action handler |
| `src/pages/CampaignWorkspace.tsx`           | Add widget type to refs, widget add/edit UI, widget click handler, AI action handler |
| `src/components/ReferenceViewer.tsx`        | Add widget viewer (iframe with srcdoc)                                               |
| `supabase/functions/project-chat/index.ts`  | Add create_widget and update_widget tools                                            |
| `supabase/functions/campaign-chat/index.ts` | Add create_widget and update_widget tools                                            |

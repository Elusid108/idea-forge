
# UI Polish: Chat Bubbles, Linked Badges, Rename, Version Bump, and Sorting

This plan covers 5 areas of improvement across the app.

---

## 1. Chat Message Differentiation

**Problem**: In the Campaign Assistant, all messages look the same -- no visual distinction between user and AI messages.

**Fix**: Update the `renderMessage` in `CampaignWorkspace.tsx` to match the pattern already used in `ProjectWorkspace.tsx` and `BrainstormWorkspace.tsx`:
- User messages: right-aligned with purple/primary background
- AI messages: left-aligned with muted background, bot avatar icon, and markdown rendering

**File**: `src/pages/CampaignWorkspace.tsx` (lines 531-533)

---

## 2. Linked Idea Badge on Campaign Opens Overlay Instead of Navigating

**Problem**: Clicking "Linked Idea" on Campaign navigates to `/ideas` instead of opening the read-only idea detail overlay.

**Fix**: In `CampaignWorkspace.tsx`, replace the `navigate('/ideas')` with an inline idea detail overlay (Dialog) that shows the idea's title, raw dump, summary, key features, and tags -- matching the same read-only overlay pattern used in `BrainstormWorkspace.tsx` and `ProjectWorkspace.tsx`.

**Files**:
- `src/pages/CampaignWorkspace.tsx` -- add state for `viewingIdea`, fetch full idea data, render a Dialog overlay, and update the Linked Idea badge click handler

---

## 3. Badge Icon Colors Matching Sidebar Emojis

**Problem**: The Linked Idea/Brainstorm/Project/Campaign badges use plain white icons, but the sidebar uses colored emojis (yellow bulb, pink brain, etc.).

**Fix**: Apply consistent icon colors to all badge icons across all workspaces:
- Lightbulb (Linked Idea): `text-yellow-400`
- Brain (Linked Brainstorm): `text-pink-400`
- FolderOpen/Wrench (Linked Project): `text-blue-400`
- Megaphone (Linked Campaign): `text-orange-400`

**Files** (badge icon className updates):
- `src/pages/CampaignWorkspace.tsx` -- Linked Idea, Brainstorm, Project badges
- `src/pages/BrainstormWorkspace.tsx` -- Linked Idea, Project, Campaign badges
- `src/pages/ProjectWorkspace.tsx` -- Linked Idea, Brainstorm, Campaign badges
- `src/pages/Ideas.tsx` -- Linked Brainstorm, Project, Campaign badges in IdeaDetailModal

---

## 4. Rename App to "IdeaForge.AI" and Bump Version

**Files**:
- `src/components/AppSidebar.tsx` -- Change "Brainstormer" to "IdeaForge.AI", version from "v0.1" to "v0.2"
- `index.html` -- Update `<title>`, og:title, twitter:title from "Brainstormer" to "IdeaForge.AI"
- `src/pages/Login.tsx` -- Update "Brainstormer" reference to "IdeaForge.AI"

---

## 5. Sorting for All Dashboard Pages

Add a sort dropdown to each dashboard page (Ideas, Brainstorms, Projects, Campaigns) with these options:
- **Category** (A-Z by category name)
- **Created Date** (newest first -- current default)
- **Alphabetical** (A-Z by title/name)
- **Recently Edited** (most recent `updated_at` first)

Implementation approach:
- Add a sort state with localStorage persistence (e.g. `ideas-sort-mode`)
- Add a sort dropdown button next to the existing grid/list toggle
- Apply sorting to the items array before rendering in both grid/tile and list views
- For Ideas, sorting applies within each group (Fresh, Brainstorming, Scrapped)
- For Brainstorms, sorting applies within each status group
- For Projects and Campaigns, sorting applies within each Kanban column and in list view

**Files**:
- `src/pages/Ideas.tsx` -- add sort dropdown and apply sorting within groups
- `src/pages/Brainstorms.tsx` -- add sort dropdown and apply sorting within groups
- `src/pages/Projects.tsx` -- add sort dropdown and apply sorting within columns and list
- `src/pages/Campaigns.tsx` -- add sort dropdown and apply sorting within columns and list

Sort options constant (shared across all pages):
```text
Sort Options:
- "category"      -> Sort by category alphabetically
- "newest"        -> Sort by created_at descending (default)
- "alpha"         -> Sort alphabetically by title/name
- "recent"        -> Sort by updated_at descending
```

---

## Technical Summary

| File | Changes |
|---|---|
| `src/pages/CampaignWorkspace.tsx` | Fix renderMessage with user/AI bubbles; add idea overlay dialog; color badge icons |
| `src/pages/BrainstormWorkspace.tsx` | Color badge icons |
| `src/pages/ProjectWorkspace.tsx` | Color badge icons |
| `src/pages/Ideas.tsx` | Color badge icons; add sort dropdown |
| `src/pages/Brainstorms.tsx` | Add sort dropdown |
| `src/pages/Projects.tsx` | Add sort dropdown |
| `src/pages/Campaigns.tsx` | Add sort dropdown |
| `src/components/AppSidebar.tsx` | Rename to IdeaForge.AI, bump to v0.2 |
| `index.html` | Update title and meta tags |
| `src/pages/Login.tsx` | Update branding reference |

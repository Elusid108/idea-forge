

# Phase 4: Campaigns GTM Board

This is a major new feature adding a 4th section to the app pipeline: Ideas -> Brainstorms -> Projects -> **Campaigns**.

---

## 1. Database Setup

### New Table: `campaigns`

| Column | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | Primary key |
| project_id | uuid | NOT NULL | References the source project |
| user_id | uuid | NOT NULL | For RLS |
| title | text | 'Untitled Campaign' | |
| sales_model | text | '' | e.g. B2B, B2C, Open Source |
| primary_channel | text | '' | e.g. Shopify, Etsy, GitHub |
| status | text | 'asset_creation' | Pipeline stage |
| marketing_links | jsonb | '[]' | Array of {label, url} objects |
| target_price | integer | 0 | |
| units_sold | integer | 0 | |
| revenue | integer | 0 | |
| deleted_at | timestamptz | NULL | Soft delete |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS Policies (same pattern as all other tables)
- SELECT, INSERT, UPDATE, DELETE -- all scoped to `auth.uid() = user_id`

### Trigger
- `update_updated_at_column` on UPDATE (reuse existing function)

### Project Table Change
- Add `campaign_id` column (uuid, nullable) to `projects` table -- set when a project is promoted to a campaign, used to lock the project (same pattern as brainstorm's `status = 'completed'` lock)

---

## 2. Project Workspace: "Launch Campaign" Button

**File**: `src/pages/ProjectWorkspace.tsx`

- When `project.status === "done"`, show a **"Launch Campaign"** button next to the Delete button (green/primary styled, with a Rocket icon)
- Clicking it:
  1. Creates a new `campaigns` row with `project_id`, `user_id`, `title = project.name`, and carries over `category`/`tags` metadata
  2. Updates the project's `campaign_id` to the new campaign ID
  3. Navigates to `/campaigns/{newId}`
- When the project has a `campaign_id`:
  - Hide the status dropdown (project is locked -- same as how brainstorms hide the status select when completed)
  - Show a "Linked Campaign" badge (similar to existing "Linked Brainstorm" badge)
  - The project becomes read-only for status changes; other edits (description, tasks, etc.) remain available

### Unlocking on Campaign Delete
- When a campaign is deleted, clear the `campaign_id` on the linked project (same pattern as how deleting a project unlocks the linked brainstorm by setting it back to "active")

---

## 3. Sidebar Update

**File**: `src/components/AppSidebar.tsx`

- Add a 4th section: `{ label: "Campaigns", href: "/campaigns", emoji: "📣", table: "campaigns" }`
- Add to `SIDEBAR_EXCLUDED_STATUSES`: campaigns exclude items where `deleted_at` is not null (handled by the query's `.is("deleted_at", null)`)
- The sidebar item query already uses the `name` column for projects; campaigns will need the `title` column (which is the default in `useSectionItems`)

---

## 4. Campaigns Dashboard Page (`/campaigns`)

**File**: `src/pages/Campaigns.tsx` (new file)

A Kanban-style board with 5 columns:

```text
Asset Creation | Pre-Launch | Active Campaign | Fulfillment | Evergreen
```

Each card displays:
- Campaign title (bold)
- `primary_channel` as a colored badge
- Mini-stat row: units_sold and revenue

Includes:
- Kanban and list view toggle (same pattern as Projects page)
- No "New Campaign" button -- campaigns are only created by promoting a project

---

## 5. Campaign Workspace (Detail View) (`/campaigns/:id`)

**File**: `src/pages/CampaignWorkspace.tsx` (new file)

### Header
- Back button, editable title, status dropdown (the 5 Kanban stages)
- Delete button (soft-deletes campaign, unlinks the project by clearing `campaign_id`)
- "Linked Project" badge that navigates back to the source project

### Metrics Row (top)
- Three stat cards: Revenue ($), Units Sold, Target Price
- Each is inline-editable (click to edit the number)

### Distribution Strategy Section
- Dropdowns for `sales_model` (B2B, B2C, Open Source, Marketplace, Direct, Other)
- Dropdown for `primary_channel` (Shopify, Etsy, GitHub, Gumroad, Amazon, Website, Other)

### Campaign Links Widget
- Stored in the `marketing_links` JSONB column as `[{label, url}]`
- "Add Link" button opens a small form (label + URL with auto-https prefix)
- Display as a clean list of clickable outgoing links with external link icons
- Delete button on each link

### Floating Chat Widget
- Same `FloatingChatWidget` component used in Projects and Brainstorms
- Will need a new edge function `campaign-chat` (or reuse `project-chat` with a campaign context) -- for initial implementation, we can wire it up to `project-chat` since the campaign is an extension of a project

---

## 6. Routing

**File**: `src/App.tsx`

Add two new routes:
- `/campaigns` -> `CampaignsPage`
- `/campaigns/:id` -> `CampaignWorkspace`

Both wrapped in `ProtectedRoute` and `AppLayout` (same pattern as all existing routes).

---

## Summary of All Changes

| File | Change |
|---|---|
| **Migration SQL** | Create `campaigns` table with RLS; add `campaign_id` to `projects` |
| `src/components/AppSidebar.tsx` | Add Campaigns section to sidebar |
| `src/App.tsx` | Add `/campaigns` and `/campaigns/:id` routes |
| `src/pages/Campaigns.tsx` | New Kanban dashboard page |
| `src/pages/CampaignWorkspace.tsx` | New detail/workspace page |
| `src/pages/ProjectWorkspace.tsx` | Add "Launch Campaign" button when done; lock status when campaign exists; add "Linked Campaign" badge |


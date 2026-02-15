

# Empty Trash, GTM Consultant Overhaul, and Kanban Column Rename

---

## 1. Empty Trash Button

Add an "Empty Trash" button to the Trash page that permanently deletes all trashed items across all four tables (ideas, brainstorms, projects, campaigns) in one action.

**File: `src/pages/Trash.tsx`**
- Add an "Empty Trash" button next to the page title (with AlertDialog confirmation)
- On confirm, run permanent deletes across all four tables for items where `deleted_at IS NOT NULL`
- For campaigns, also unlink their `project_id` references before deleting
- Invalidate all trash query keys and entity query keys after completion
- Disable the button when there are zero total trashed items

---

## 2. GTM Consultant System Prompt Overhaul

Replace the current interrogation-style prompt with the "Exploratory GTM Consultant" persona that suggests options and educates the user.

**File: `supabase/functions/campaign-chat/index.ts`**

Replace the `generate_question` / `submit_answer` system prompt (lines 132-150) with:

```
You are an expert Go-To-Market Consultant. Your job is to help the user build a launch strategy by asking questions and providing them with industry-standard options they might not know exist. Do not ask broad, open-ended questions. Instead, ask a question and provide 2 to 3 contextual examples of how they could answer it based on their specific project.

Guide the conversation through these 4 exploratory phases:

1. Discovery & IP: Ask what the ultimate goal is (Profit, Portfolio, Open-Source). Suggest relevant licensing (e.g., MIT, Apache) or proprietary IP protections.

2. Monetization Strategy: Pitch revenue models. If it's software, suggest SaaS subscriptions, freemium tiers, or usage-based pricing. If it's open-source, suggest open-core, paid hosting, or premium support. If it's physical, suggest direct-to-consumer vs B2B wholesale.

3. Distribution & Marketing: Suggest specific platforms for their niche (e.g., Product Hunt, Etsy, Tindie, Reddit, LinkedIn Ads) and ask which marketing channels they want to commit to.

4. Logistics & Operations: Ask about their capacity for maintenance. Introduce concepts like SaaS server hosting costs, dropshipping, or third-party logistics (3PL) to see how hands-on they want to be.

Keep your responses conversational and encouraging. Wait for the user to select an option or provide their own before moving to the next phase.
```

Update the `topics_remaining` instruction to use the four phases: `["Discovery & IP", "Monetization Strategy", "Distribution & Marketing", "Logistics & Operations"]`.

Also update the `forge_playbook` system prompt to generate four playbook sections matching these phases (instead of the current six-section format):
1. Discovery & IP Strategy
2. Monetization Strategy
3. Distribution & Marketing Plan
4. Logistics & Operations Plan

Update the tool parameters to return `ip_strategy`, `monetization_plan`, `marketing_plan`, and `operations_plan` as separate text fields alongside the combined `playbook` markdown.

Update the task `status_column` options in the forge prompt to use the new column keys (see section 4 below).

---

## 3. Database Migration: New Playbook Section Columns

Add four new text columns to the `campaigns` table to store the structured playbook sections:

```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ip_strategy text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS monetization_plan text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS marketing_plan text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS operations_plan text DEFAULT '';
```

---

## 4. Rename Kanban Pipeline Columns

Replace the current five columns with the new five phases everywhere they appear:

| Old Key | Old Label | New Key | New Label |
|---|---|---|---|
| asset_creation | Asset Creation | foundation_ip | Foundation & IP |
| pre_launch | Pre-Launch | infrastructure_production | Infrastructure & Production |
| active_campaign | Active Campaign | asset_creation_prelaunch | Asset Creation & Pre-Launch |
| fulfillment | Fulfillment | active_campaign | Active Campaign |
| evergreen | Evergreen | operations_fulfillment | Operations & Fulfillment |

**Files to update:**

- **`src/pages/CampaignWorkspace.tsx`**: Update `STATUS_OPTIONS`, `STATUS_LABELS`, `KANBAN_COLUMNS` constants, and the status `Select` dropdown.
- **`src/pages/Campaigns.tsx`**: Update `statusColumns` and `statusLabels` constants.
- **`supabase/functions/campaign-chat/index.ts`**: Update the `forge_playbook` prompt to use new `status_column` values for generated tasks.

**Data migration**: Update existing `campaign_tasks` rows and `campaigns.status` to map old values to new ones:

```sql
UPDATE campaign_tasks SET status_column = 'foundation_ip' WHERE status_column = 'asset_creation';
UPDATE campaign_tasks SET status_column = 'infrastructure_production' WHERE status_column = 'pre_launch';
UPDATE campaign_tasks SET status_column = 'asset_creation_prelaunch' WHERE status_column = 'active_campaign';
UPDATE campaign_tasks SET status_column = 'active_campaign' WHERE status_column = 'fulfillment';
UPDATE campaign_tasks SET status_column = 'operations_fulfillment' WHERE status_column = 'evergreen';

UPDATE campaigns SET status = 'foundation_ip' WHERE status = 'asset_creation';
UPDATE campaigns SET status = 'infrastructure_production' WHERE status = 'pre_launch';
UPDATE campaigns SET status = 'asset_creation_prelaunch' WHERE status = 'active_campaign';
UPDATE campaigns SET status = 'active_campaign' WHERE status = 'fulfillment';
UPDATE campaigns SET status = 'operations_fulfillment' WHERE status = 'evergreen';
```

Note: The data migration must be done carefully since "active_campaign" maps to "fulfillment" old values, and the old "active_campaign" maps to the new "asset_creation_prelaunch". The SQL must run in the correct order to avoid collisions (rename old values to temp names first, then to final names).

---

## 5. Dashboard: Render Four Playbook Sections

**File: `src/pages/CampaignWorkspace.tsx`** (State 2 dashboard)

After forging, save the four section fields (`ip_strategy`, `monetization_plan`, `marketing_plan`, `operations_plan`) to the campaign alongside the combined `playbook`.

On the dashboard, replace the single `EditablePlaybook` component with four `EditableMarkdown` sections, each with its own heading:
- Discovery & IP Strategy (`ip_strategy`)
- Monetization Strategy (`monetization_plan`)
- Distribution & Marketing (`marketing_plan`)
- Logistics & Operations (`operations_plan`)

Keep the combined `playbook` field as a fallback for campaigns forged before this update (render the single playbook if the four fields are all empty).

---

## Technical Summary

| File | Changes |
|---|---|
| `src/pages/Trash.tsx` | Add "Empty Trash" button with confirmation dialog |
| `supabase/functions/campaign-chat/index.ts` | Replace system prompt with Exploratory GTM Consultant; update forge_playbook to return 4 section fields; update task status_column values |
| `src/pages/CampaignWorkspace.tsx` | Update Kanban column constants; save 4 playbook sections on forge; render 4 section editors on dashboard; update status options |
| `src/pages/Campaigns.tsx` | Update statusColumns and statusLabels to new 5 phases |
| **DB Migration** | Add `ip_strategy`, `monetization_plan`, `marketing_plan`, `operations_plan` columns; migrate existing task/campaign status values to new column keys |


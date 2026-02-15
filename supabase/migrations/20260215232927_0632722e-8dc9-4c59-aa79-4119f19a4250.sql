
-- Add new playbook section columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ip_strategy text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS monetization_plan text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS marketing_plan text DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS operations_plan text DEFAULT '';

-- Migrate kanban statuses using temp names to avoid collisions
-- Step 1: Rename conflicting values to temp names
UPDATE campaign_tasks SET status_column = '_temp_asset_creation_prelaunch' WHERE status_column = 'active_campaign';
UPDATE campaign_tasks SET status_column = '_temp_active_campaign' WHERE status_column = 'fulfillment';
UPDATE campaigns SET status = '_temp_asset_creation_prelaunch' WHERE status = 'active_campaign';
UPDATE campaigns SET status = '_temp_active_campaign' WHERE status = 'fulfillment';

-- Step 2: Rename non-conflicting values
UPDATE campaign_tasks SET status_column = 'foundation_ip' WHERE status_column = 'asset_creation';
UPDATE campaign_tasks SET status_column = 'infrastructure_production' WHERE status_column = 'pre_launch';
UPDATE campaign_tasks SET status_column = 'operations_fulfillment' WHERE status_column = 'evergreen';
UPDATE campaigns SET status = 'foundation_ip' WHERE status = 'asset_creation';
UPDATE campaigns SET status = 'infrastructure_production' WHERE status = 'pre_launch';
UPDATE campaigns SET status = 'operations_fulfillment' WHERE status = 'evergreen';

-- Step 3: Finalize temp names
UPDATE campaign_tasks SET status_column = 'asset_creation_prelaunch' WHERE status_column = '_temp_asset_creation_prelaunch';
UPDATE campaign_tasks SET status_column = 'active_campaign' WHERE status_column = '_temp_active_campaign';
UPDATE campaigns SET status = 'asset_creation_prelaunch' WHERE status = '_temp_asset_creation_prelaunch';
UPDATE campaigns SET status = 'active_campaign' WHERE status = '_temp_active_campaign';

-- Update default for new campaigns
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'foundation_ip';
ALTER TABLE campaign_tasks ALTER COLUMN status_column SET DEFAULT 'foundation_ip';

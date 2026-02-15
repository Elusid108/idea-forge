
-- Make project-assets bucket public for receipt retrieval
UPDATE storage.buckets SET public = true WHERE id = 'project-assets';

-- Add vendor column to project_expenses
ALTER TABLE public.project_expenses ADD COLUMN IF NOT EXISTS vendor TEXT DEFAULT '';


-- Make brainstorm-references bucket public (it already exists but may not be public)
UPDATE storage.buckets SET public = true WHERE id = 'brainstorm-references';

-- Create storage policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload reference files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload reference files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'brainstorm-references');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view reference files' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view reference files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'brainstorm-references');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own reference files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete own reference files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'brainstorm-references');
  END IF;
END $$;


ALTER TABLE public.campaigns ADD COLUMN category text DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN tags text[] DEFAULT NULL;

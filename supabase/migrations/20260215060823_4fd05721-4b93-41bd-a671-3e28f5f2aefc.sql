
-- Cascade scrap: when an item is scrapped, scrap all downstream linked items
CREATE OR REPLACE FUNCTION public.cascade_scrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes TO 'scrapped'
  IF NEW.status = 'scrapped' AND (OLD.status IS DISTINCT FROM 'scrapped') THEN
    IF TG_TABLE_NAME = 'ideas' THEN
      UPDATE brainstorms SET status = 'scrapped' WHERE idea_id = NEW.id AND status != 'scrapped';
    ELSIF TG_TABLE_NAME = 'brainstorms' THEN
      UPDATE projects SET status = 'scrapped' WHERE brainstorm_id = NEW.id AND status != 'scrapped';
    ELSIF TG_TABLE_NAME = 'projects' THEN
      UPDATE campaigns SET status = 'scrapped' WHERE project_id = NEW.id AND status != 'scrapped';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers on each table
CREATE TRIGGER cascade_scrap_ideas
  AFTER UPDATE ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_scrap();

CREATE TRIGGER cascade_scrap_brainstorms
  AFTER UPDATE ON public.brainstorms
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_scrap();

CREATE TRIGGER cascade_scrap_projects
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_scrap();


-- Trigger: when a team_member is inserted, auto-add to workspace_responsibles if not exists
CREATE OR REPLACE FUNCTION public.fn_sync_member_to_responsible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.workspace_responsibles (workspace_id, name, is_active, sort_order)
    SELECT NEW.workspace_id, NEW.nome, true,
      COALESCE((SELECT MAX(sort_order) + 1 FROM public.workspace_responsibles WHERE workspace_id = NEW.workspace_id), 0)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workspace_responsibles 
      WHERE workspace_id = NEW.workspace_id AND name = NEW.nome
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.workspace_responsibles 
    WHERE workspace_id = OLD.workspace_id AND name = OLD.nome;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If name changed, update the responsible name too
    IF OLD.nome <> NEW.nome THEN
      UPDATE public.workspace_responsibles 
      SET name = NEW.nome
      WHERE workspace_id = OLD.workspace_id AND name = OLD.nome;
    END IF;
    -- If soft-deleted, deactivate the responsible
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.workspace_responsibles 
      SET is_active = false
      WHERE workspace_id = NEW.workspace_id AND name = NEW.nome;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_member_responsible
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_member_to_responsible();

-- Backfill: sync existing team_members to workspace_responsibles
INSERT INTO public.workspace_responsibles (workspace_id, name, is_active, sort_order)
SELECT tm.workspace_id, tm.nome, true,
  COALESCE((SELECT MAX(sort_order) + 1 FROM public.workspace_responsibles wr WHERE wr.workspace_id = tm.workspace_id), 0)
FROM public.team_members tm
WHERE tm.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM public.workspace_responsibles wr 
  WHERE wr.workspace_id = tm.workspace_id AND wr.name = tm.nome
);

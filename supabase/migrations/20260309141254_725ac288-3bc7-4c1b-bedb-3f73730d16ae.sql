
-- Create seed_default_profiles function
CREATE OR REPLACE FUNCTION public.seed_default_profiles(_ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if workspace has zero profiles
  IF NOT EXISTS (SELECT 1 FROM public.publishing_profiles WHERE workspace_id = _ws_id) THEN
    INSERT INTO public.publishing_profiles (workspace_id, name, icon_key, sort_order, is_active)
    VALUES
      (_ws_id, 'Perfil 1', 'instagram', 1, true),
      (_ws_id, 'Perfil 2', 'tiktok', 2, true);
  END IF;
END;
$$;

-- Update fn_populate_workspace_defaults to call seed_default_profiles
-- and remove the inline profile inserts to avoid duplication
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert default categories with icon_key
  INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Institucional', '#3b82f6', 'instagram', 0, true),
    (NEW.id, 'Educacional', '#10b981', 'blog', 1, true),
    (NEW.id, 'Portfólio', '#8b5cf6', 'youtube', 2, true),
    (NEW.id, 'Comemorativo', '#f59e0b', 'newsletter', 3, true);

  -- Insert default statuses
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#eab308', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  -- Seed default profiles (checks for duplicates internally)
  PERFORM public.seed_default_profiles(NEW.id);

  RETURN NEW;
END;
$$;

-- Create the AFTER INSERT trigger on workspaces (if not exists)
DROP TRIGGER IF EXISTS trg_populate_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_populate_workspace_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_populate_workspace_defaults();

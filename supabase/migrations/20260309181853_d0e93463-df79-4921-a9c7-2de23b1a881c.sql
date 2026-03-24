
-- 1. Recreate seed_default_profiles with 4 profiles
CREATE OR REPLACE FUNCTION public.seed_default_profiles(_ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.publishing_profiles WHERE workspace_id = _ws_id) THEN
    INSERT INTO public.publishing_profiles (workspace_id, name, icon_key, sort_order, is_active)
    VALUES
      (_ws_id, 'Instagram', 'instagram', 0, true),
      (_ws_id, 'TikTok', 'tiktok', 1, true),
      (_ws_id, 'LinkedIn', 'linkedin', 2, true),
      (_ws_id, 'Blog', 'blog', 3, true);
  END IF;
END;
$$;

-- 2. Recreate fn_populate_workspace_defaults with new categories and updated status colors
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert default categories (2 instead of 4)
  INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Característica 1', '#ef4444', 'instagram', 0, true),
    (NEW.id, 'Característica 2', '#3b82f6', 'instagram', 1, true);

  -- Insert default statuses (orange instead of yellow for "Em Andamento")
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#f97316', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  -- Seed default profiles
  PERFORM public.seed_default_profiles(NEW.id);

  RETURN NEW;
END;
$$;

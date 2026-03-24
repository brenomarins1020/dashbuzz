
-- Update seed_default_profiles to use Institucional, Educativo, Portfólio
CREATE OR REPLACE FUNCTION public.seed_default_profiles(_ws_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO publishing_profiles (workspace_id, name, icon_key, sort_order)
  VALUES
    (_ws_id, 'Instagram', 'instagram', 0),
    (_ws_id, 'TikTok', 'tiktok', 1),
    (_ws_id, 'LinkedIn', 'linkedin', 2),
    (_ws_id, 'Blog', 'blog', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO content_categories (workspace_id, name, color, sort_order)
  VALUES
    (_ws_id, 'Institucional', '#3b82f6', 0),
    (_ws_id, 'Educativo', '#22c55e', 1),
    (_ws_id, 'Portfólio', '#f97316', 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO workflow_statuses (workspace_id, name, color, sort_order)
  VALUES
    (_ws_id, 'Não Começado', '#9ca3af', 0),
    (_ws_id, 'Em Andamento', '#F97316', 1),
    (_ws_id, 'Em Revisão', '#eab308', 2),
    (_ws_id, 'Publicado', '#22c55e', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO appointment_types (workspace_id, name, color, icon_key, sort_order)
  VALUES
    (_ws_id, 'Reunião', '#f97316', 'users', 0),
    (_ws_id, 'Evento', '#3b82f6', 'calendar', 1),
    (_ws_id, 'Entrega', '#22c55e', 'package', 2)
  ON CONFLICT DO NOTHING;

  INSERT INTO task_category_options (workspace_id, group_number, name, color, sort_order)
  VALUES
    (_ws_id, 1, 'Institucional', '#3b82f6', 0),
    (_ws_id, 1, 'Educativo', '#22c55e', 1),
    (_ws_id, 1, 'Portfólio', '#f97316', 2),
    (_ws_id, 2, 'Institucional', '#3b82f6', 0),
    (_ws_id, 2, 'Educativo', '#22c55e', 1),
    (_ws_id, 2, 'Portfólio', '#f97316', 2)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Update the workspace defaults trigger too
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Institucional', '#3b82f6', 'instagram', 0, true),
    (NEW.id, 'Educativo', '#22c55e', 'instagram', 1, true),
    (NEW.id, 'Portfólio', '#f97316', 'instagram', 2, true);

  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#f97316', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  PERFORM public.seed_default_profiles(NEW.id);

  INSERT INTO public.appointment_types (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Reunião', '#f97316', 'users', 0, true),
    (NEW.id, 'Evento', '#3b82f6', 'calendar', 1, true),
    (NEW.id, 'Entrega', '#22c55e', 'package', 2, true);

  RETURN NEW;
END;
$function$;

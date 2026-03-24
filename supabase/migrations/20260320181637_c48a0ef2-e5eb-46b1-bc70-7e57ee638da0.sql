
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
    (_ws_id, 1, 'Comercial', '#3b82f6', 0),
    (_ws_id, 1, 'Projetos', '#22c55e', 1),
    (_ws_id, 1, 'Relações Humanas', '#f97316', 2),
    (_ws_id, 1, 'Presidência', '#8b5cf6', 3),
    (_ws_id, 2, 'Urgente', '#ef4444', 0),
    (_ws_id, 2, 'Moderado', '#f59e0b', 1),
    (_ws_id, 2, 'Tranquilo', '#22c55e', 2)
  ON CONFLICT DO NOTHING;
END;
$function$;

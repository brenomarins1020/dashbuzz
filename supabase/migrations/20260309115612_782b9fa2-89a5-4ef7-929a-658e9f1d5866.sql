
-- Update the workspace defaults trigger to create default publishing profiles (platforms)
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir categorias padrão
  INSERT INTO public.content_categories (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Institucional', '#3b82f6', 0, true),
    (NEW.id, 'Educacional', '#10b981', 1, true),
    (NEW.id, 'Portfólio', '#8b5cf6', 2, true),
    (NEW.id, 'Comemorativo', '#f59e0b', 3, true);

  -- Inserir status padrão
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#eab308', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  -- Inserir plataformas padrão (4 ativas)
  INSERT INTO public.publishing_profiles (workspace_id, name, platform, sort_order, is_active)
  VALUES
    (NEW.id, 'Instagram', 'instagram', 0, true),
    (NEW.id, 'TikTok', 'tiktok', 1, true),
    (NEW.id, 'LinkedIn', 'linkedin', 2, true),
    (NEW.id, 'Blog', 'blog', 3, true);

  RETURN NEW;
END;
$function$;

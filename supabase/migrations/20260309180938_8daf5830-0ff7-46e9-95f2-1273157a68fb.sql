
-- 1. Backfill default publishing profiles for workspaces that have NONE
INSERT INTO public.publishing_profiles (workspace_id, name, icon_key, sort_order, is_active)
SELECT w.id, p.name, p.icon_key, p.sort_order, true
FROM public.workspaces w
CROSS JOIN (
  VALUES ('Perfil 1', 'instagram', 1),
         ('Perfil 2', 'tiktok', 2)
) AS p(name, icon_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.publishing_profiles pp WHERE pp.workspace_id = w.id
);

-- 2. Backfill default content_categories for workspaces that have NONE
INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
SELECT w.id, c.name, c.color, c.icon_key, c.sort_order, true
FROM public.workspaces w
CROSS JOIN (
  VALUES ('Institucional', '#3b82f6', 'instagram', 0),
         ('Educacional', '#10b981', 'blog', 1),
         ('Portfólio', '#8b5cf6', 'youtube', 2),
         ('Comemorativo', '#f59e0b', 'newsletter', 3)
) AS c(name, color, icon_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_categories cc WHERE cc.workspace_id = w.id
);

-- 3. Backfill default workflow_statuses for workspaces that have NONE
INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
SELECT w.id, s.name, s.color, s.sort_order, true
FROM public.workspaces w
CROSS JOIN (
  VALUES ('Não Começado', '#94a3b8', 0),
         ('Em Andamento', '#eab308', 1),
         ('Pronto', '#3b82f6', 2),
         ('Publicado', '#10b981', 3)
) AS s(name, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_statuses ws WHERE ws.workspace_id = w.id
);

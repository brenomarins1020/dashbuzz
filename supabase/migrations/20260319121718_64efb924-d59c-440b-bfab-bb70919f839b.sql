
-- Create task category options table
CREATE TABLE public.task_category_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL CHECK (group_number IN (1, 2)),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_category_options ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view task category options for their workspaces"
ON public.task_category_options FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Users can insert task category options for their workspaces"
ON public.task_category_options FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Users can update task category options for their workspaces"
ON public.task_category_options FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "Users can delete task category options for their workspaces"
ON public.task_category_options FOR DELETE TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- Add category_2 column to tasks (category already exists as category_1)
ALTER TABLE public.tasks ADD COLUMN category_2 TEXT DEFAULT '';

-- Seed defaults for ALL existing workspaces
INSERT INTO public.task_category_options (workspace_id, group_number, name, color, sort_order)
SELECT w.id, g.group_number, o.name, o.color, o.sort_order
FROM public.workspaces w
CROSS JOIN (VALUES (1), (2)) AS g(group_number)
CROSS JOIN (VALUES 
  ('Tipo 1', '#3b82f6', 0),
  ('Tipo 2', '#22c55e', 1),
  ('Tipo 3', '#f97316', 2)
) AS o(name, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_category_options tco 
  WHERE tco.workspace_id = w.id AND tco.group_number = g.group_number
);

-- Update seed_default_profiles to include task categories for new workspaces
CREATE OR REPLACE FUNCTION public.seed_default_profiles(_ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Existing profile seeding
  INSERT INTO publishing_profiles (workspace_id, name, icon_key, sort_order)
  VALUES
    (_ws_id, 'Instagram', 'instagram', 0),
    (_ws_id, 'TikTok', 'tiktok', 1),
    (_ws_id, 'LinkedIn', 'linkedin', 2),
    (_ws_id, 'Blog', 'globe', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO content_categories (workspace_id, name, color, sort_order)
  VALUES
    (_ws_id, 'Característica 1', '#ef4444', 0),
    (_ws_id, 'Característica 2', '#3b82f6', 1)
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

  -- Seed task category options
  INSERT INTO task_category_options (workspace_id, group_number, name, color, sort_order)
  VALUES
    (_ws_id, 1, 'Tipo 1', '#3b82f6', 0),
    (_ws_id, 1, 'Tipo 2', '#22c55e', 1),
    (_ws_id, 1, 'Tipo 3', '#f97316', 2),
    (_ws_id, 2, 'Tipo 1', '#3b82f6', 0),
    (_ws_id, 2, 'Tipo 2', '#22c55e', 1),
    (_ws_id, 2, 'Tipo 3', '#f97316', 2)
  ON CONFLICT DO NOTHING;
END;
$$;

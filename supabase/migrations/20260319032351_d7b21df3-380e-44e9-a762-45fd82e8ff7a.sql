
-- Create appointment_types table
CREATE TABLE public.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  icon_key text NOT NULL DEFAULT 'calendar',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY ws_select_appointment_types ON public.appointment_types
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_insert_appointment_types ON public.appointment_types
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_update_appointment_types ON public.appointment_types
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_delete_appointment_types ON public.appointment_types
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Update the workspace defaults trigger to seed appointment types
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default categories
  INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Característica 1', '#ef4444', 'instagram', 0, true),
    (NEW.id, 'Característica 2', '#3b82f6', 'instagram', 1, true);

  -- Insert default statuses
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#f97316', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  -- Seed default profiles
  PERFORM public.seed_default_profiles(NEW.id);

  -- Insert default appointment types
  INSERT INTO public.appointment_types (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Reunião', '#f97316', 'users', 0, true),
    (NEW.id, 'Evento', '#3b82f6', 'calendar', 1, true),
    (NEW.id, 'Entrega', '#22c55e', 'package', 2, true);

  RETURN NEW;
END;
$function$;

-- Backfill existing workspaces that don't have appointment types
INSERT INTO public.appointment_types (workspace_id, name, color, icon_key, sort_order, is_active)
SELECT w.id, t.name, t.color, t.icon_key, t.sort_order, true
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('Reunião', '#f97316', 'users', 0),
    ('Evento', '#3b82f6', 'calendar', 1),
    ('Entrega', '#22c55e', 'package', 2)
) AS t(name, color, icon_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.appointment_types at WHERE at.workspace_id = w.id
);

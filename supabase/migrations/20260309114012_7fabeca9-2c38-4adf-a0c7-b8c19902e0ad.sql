
-- Create workspace_responsibles table
CREATE TABLE public.workspace_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE public.workspace_responsibles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "ws_select_workspace_responsibles" ON public.workspace_responsibles
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_workspace_responsibles" ON public.workspace_responsibles
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_workspace_responsibles" ON public.workspace_responsibles
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_workspace_responsibles" ON public.workspace_responsibles
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Migrate data from team_members
INSERT INTO public.workspace_responsibles (workspace_id, name, email, is_active, sort_order)
SELECT workspace_id, nome, email, (deleted_at IS NULL), 0
FROM public.team_members
ON CONFLICT (workspace_id, name) DO NOTHING;

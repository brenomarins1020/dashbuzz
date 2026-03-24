
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Semana 1',
  assignee text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'A Fazer',
  priority text NOT NULL DEFAULT 'Média',
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_select_tasks ON public.tasks FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_insert_tasks ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_update_tasks ON public.tasks FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY ws_delete_tasks ON public.tasks FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

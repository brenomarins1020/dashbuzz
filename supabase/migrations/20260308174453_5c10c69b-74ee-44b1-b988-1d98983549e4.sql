
-- Create appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Reunião',
  date date NOT NULL,
  start_time text,
  responsible text,
  status text NOT NULL DEFAULT 'pendente',
  local text,
  notes text,
  recurrence text NOT NULL DEFAULT 'nenhuma',
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  ano_entrada int,
  cargo text NOT NULL,
  foto text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_team_members" ON public.team_members
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_team_members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_team_members" ON public.team_members
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_team_members" ON public.team_members
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Create appointment_overrides table
CREATE TABLE public.appointment_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  override_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, appointment_id, occurrence_date)
);

ALTER TABLE public.appointment_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select_appointment_overrides" ON public.appointment_overrides
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_insert_appointment_overrides" ON public.appointment_overrides
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_update_appointment_overrides" ON public.appointment_overrides
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "ws_delete_appointment_overrides" ON public.appointment_overrides
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;

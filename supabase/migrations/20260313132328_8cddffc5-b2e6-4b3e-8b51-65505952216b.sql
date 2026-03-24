
-- meeting_types
CREATE TABLE public.meeting_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select_meeting_types" ON public.meeting_types FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_meeting_types" ON public.meeting_types FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_meeting_types" ON public.meeting_types FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_meeting_types" ON public.meeting_types FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- meetings
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_type_id uuid REFERENCES public.meeting_types(id) ON DELETE SET NULL,
  title text NOT NULL,
  location text,
  date date NOT NULL,
  time time,
  recurrence text NOT NULL DEFAULT 'none',
  recurrence_end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select_meetings" ON public.meetings FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_meetings" ON public.meetings FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_meetings" ON public.meetings FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- meeting_occurrences
CREATE TABLE public.meeting_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select_meeting_occurrences" ON public.meeting_occurrences FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_meeting_occurrences" ON public.meeting_occurrences FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_meeting_occurrences" ON public.meeting_occurrences FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_meeting_occurrences" ON public.meeting_occurrences FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- attendance_records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.meeting_occurrences(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'present',
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select_attendance_records" ON public.attendance_records FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_attendance_records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_attendance_records" ON public.attendance_records FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_attendance_records" ON public.attendance_records FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- meeting_participants (to track expected participants per meeting)
CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select_meeting_participants" ON public.meeting_participants FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_insert_meeting_participants" ON public.meeting_participants FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_update_meeting_participants" ON public.meeting_participants FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "ws_delete_meeting_participants" ON public.meeting_participants FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Enable realtime for attendance and occurrences
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_occurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;

-- Indexes
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);
CREATE INDEX idx_meeting_occurrences_meeting ON public.meeting_occurrences(meeting_id);
CREATE INDEX idx_meeting_occurrences_workspace ON public.meeting_occurrences(workspace_id);
CREATE INDEX idx_attendance_records_occurrence ON public.attendance_records(occurrence_id);
CREATE INDEX idx_attendance_records_workspace ON public.attendance_records(workspace_id);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);

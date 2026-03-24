
-- Table: global_announcements
CREATE TABLE public.global_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  style text NOT NULL DEFAULT 'info' CHECK (style IN ('info', 'warning', 'urgent')),
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NULL,
  require_ack boolean NOT NULL DEFAULT true,
  link_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: announcement_reads
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.global_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS: global_announcements - everyone authenticated can read
CREATE POLICY "authenticated_select_announcements"
  ON public.global_announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: announcement_reads - users can read their own
CREATE POLICY "users_select_own_reads"
  ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: announcement_reads - users can insert their own
CREATE POLICY "users_insert_own_reads"
  ON public.announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for global_announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_announcements;

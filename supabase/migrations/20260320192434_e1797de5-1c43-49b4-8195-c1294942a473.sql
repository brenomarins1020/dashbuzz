
-- Update approve_join_request to accept member_role parameter
CREATE OR REPLACE FUNCTION public.approve_join_request(
  request_id UUID,
  member_role TEXT DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.workspace_join_requests%ROWTYPE;
BEGIN
  IF member_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT * INTO v_req
  FROM public.workspace_join_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_req.workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (v_req.workspace_id, v_req.user_id, member_role)
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET role = member_role;

  INSERT INTO public.team_members (
    workspace_id, nome, email, cargo, ano_entrada, user_id
  )
  VALUES (
    v_req.workspace_id,
    v_req.requester_name,
    v_req.email,
    '',
    EXTRACT(YEAR FROM now())::int,
    v_req.user_id
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_join_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = request_id;
END;
$$;

-- Function to update member role
CREATE OR REPLACE FUNCTION public.update_member_role(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role = 'member' AND p_user_id = auth.uid() THEN
    IF (
      SELECT COUNT(*) FROM public.memberships
      WHERE workspace_id = p_workspace_id AND role = 'admin'
    ) <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the only admin';
    END IF;
  END IF;

  UPDATE public.memberships
  SET role = p_role
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;
END;
$$;

-- Add unique constraint on memberships if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_workspace_user_unique'
  ) THEN
    ALTER TABLE public.memberships ADD CONSTRAINT memberships_workspace_user_unique UNIQUE (workspace_id, user_id);
  END IF;
END $$;

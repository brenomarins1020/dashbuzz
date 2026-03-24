
-- 1. Fix RLS policy on workspace_invites
DROP POLICY IF EXISTS "anyone_can_read_invite_by_token" ON public.workspace_invites;
CREATE POLICY "anyone_can_read_invite_by_token"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (status = 'pending' AND expires_at > now());

-- 2. Add requester_name column to workspace_invites
ALTER TABLE public.workspace_invites ADD COLUMN IF NOT EXISTS requester_name TEXT;

-- 3. Create workspace_join_requests table
CREATE TABLE IF NOT EXISTS public.workspace_join_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_id    UUID REFERENCES public.workspace_invites(id),
  requester_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_manage_requests"
ON public.workspace_join_requests FOR ALL TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())))
WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

CREATE POLICY "requester_can_read_own"
ON public.workspace_join_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4. Enable realtime for workspace_join_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_join_requests;

-- 5. Update join_workspace_via_invite to accept requester_name and create join request
CREATE OR REPLACE FUNCTION public.join_workspace_via_invite(invite_token UUID, requester_name TEXT DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite   public.workspace_invites%ROWTYPE;
  v_ws_name  TEXT;
  v_ws_type  TEXT;
  v_email    TEXT;
BEGIN
  SELECT * INTO v_invite
  FROM public.workspace_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_invite.workspace_id
      AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'already_member',
      'workspace_id', v_invite.workspace_id);
  END IF;

  -- Check if already has a pending request
  IF EXISTS (
    SELECT 1 FROM public.workspace_join_requests
    WHERE workspace_id = v_invite.workspace_id
      AND user_id = auth.uid()
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('status', 'pending_approval');
  END IF;

  -- Get user email from auth
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  -- Create join request (pending approval)
  INSERT INTO public.workspace_join_requests (workspace_id, user_id, invite_id, requester_name, email, status)
  VALUES (v_invite.workspace_id, auth.uid(), v_invite.id, COALESCE(NULLIF(requester_name, ''), v_email), v_email, 'pending')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE public.workspace_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  -- Get workspace info
  SELECT name, type INTO v_ws_name, v_ws_type
  FROM public.workspaces
  WHERE id = v_invite.workspace_id;

  RETURN jsonb_build_object(
    'status', 'pending_approval',
    'workspace_id', v_invite.workspace_id,
    'workspace_name', v_ws_name,
    'workspace_type', v_ws_type
  );
END;
$$;

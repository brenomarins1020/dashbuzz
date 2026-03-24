
CREATE TABLE public.workspace_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',
  invited_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_manage_invites"
ON public.workspace_invites
FOR ALL
TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "anyone_can_read_invite_by_token"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.join_workspace_via_invite(invite_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite   public.workspace_invites%ROWTYPE;
  v_ws_name  TEXT;
  v_ws_type  TEXT;
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

  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = v_invite.workspace_id
      AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'already_member',
      'workspace_id', v_invite.workspace_id);
  END IF;

  INSERT INTO public.memberships (workspace_id, user_id)
  VALUES (v_invite.workspace_id, auth.uid())
  ON CONFLICT DO NOTHING;

  UPDATE public.workspace_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  SELECT name, type INTO v_ws_name, v_ws_type
  FROM public.workspaces
  WHERE id = v_invite.workspace_id;

  RETURN jsonb_build_object(
    'workspace_id', v_invite.workspace_id,
    'workspace_name', v_ws_name,
    'workspace_type', v_ws_type
  );
END;
$$;

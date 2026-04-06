-- ============================================================
-- FIX: RPCs faltantes para fluxo de convite
-- RODE TUDO DE UMA VEZ no SQL Editor do Supabase
-- ============================================================

-- 1. Atualiza request_workspace_access para buscar por invite_token OU workspace ID
CREATE OR REPLACE FUNCTION public.request_workspace_access(p_invite_token TEXT, p_requester_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_id UUID;
  existing_status TEXT;
BEGIN
  -- Tenta por invite_token primeiro
  SELECT id INTO ws_id FROM public.workspaces WHERE invite_token = p_invite_token;

  -- Se não achou, tenta como workspace ID (UUID)
  IF ws_id IS NULL THEN
    BEGIN
      ws_id := p_invite_token::UUID;
      IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id) THEN
        ws_id := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      ws_id := NULL;
    END;
  END IF;

  IF ws_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_code');
  END IF;

  SELECT status INTO existing_status
  FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();

  IF existing_status = 'approved' THEN
    RETURN jsonb_build_object('error', 'already_member');
  END IF;
  IF existing_status = 'pending' THEN
    RETURN jsonb_build_object('status', 'already_pending');
  END IF;
  IF existing_status = 'rejected' THEN
    UPDATE public.workspace_members
    SET status = 'pending', display_name = p_requester_name, created_at = now()
    WHERE workspace_id = ws_id AND user_id = auth.uid();
    RETURN jsonb_build_object('status', 'pending');
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, display_name, status)
  VALUES (ws_id, auth.uid(), 'member', p_requester_name, 'pending');

  RETURN jsonb_build_object('status', 'pending');
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_workspace_access(TEXT, TEXT) TO authenticated;

-- 2. Cria get_pending_members (usado pelo MembersPanel do admin)
CREATE OR REPLACE FUNCTION public.get_pending_members(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', wm.id,
          'user_id', wm.user_id,
          'display_name', wm.display_name,
          'created_at', wm.created_at,
          'status', wm.status
        )
        ORDER BY wm.created_at ASC
      )
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.status = 'pending'
    ),
    '[]'::jsonb
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_members(UUID) TO authenticated;

-- 3. Cria get_my_pending_status (usado pelo usePendingStatus do membro)
CREATE OR REPLACE FUNCTION public.get_my_pending_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'status', wm.status,
    'workspace_id', wm.workspace_id,
    'workspace_name', w.name
  ) INTO result
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid()
    AND wm.status IN ('pending', 'rejected')
  ORDER BY wm.created_at DESC
  LIMIT 1;

  RETURN COALESCE(result, jsonb_build_object('status', 'none'));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_pending_status() TO authenticated;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';

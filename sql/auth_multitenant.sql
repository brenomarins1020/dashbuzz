-- ============================================================
-- SISTEMA MULTITENANT DE ACCESS CODE — RODE TUDO DE UMA VEZ
-- Usa invite_token (coluna que PostgREST JÁ conhece) como access_code
-- ============================================================

-- 1. Garante constraint UNIQUE em invite_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_invite_token_key'
  ) THEN
    ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_invite_token_key UNIQUE (invite_token);
  END IF;
END;
$$;

-- 2. Gera códigos alfanuméricos de 5 chars para workspaces que não têm
UPDATE public.workspaces
SET invite_token = upper(substr(md5(random()::text || id::text), 1, 5))
WHERE invite_token IS NULL OR length(invite_token) > 6;

-- 3. Garante que workspace_members tem coluna status e display_name
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='status') THEN
    ALTER TABLE public.workspace_members ADD COLUMN status TEXT DEFAULT 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='display_name') THEN
    ALTER TABLE public.workspace_members ADD COLUMN display_name TEXT;
  END IF;
END;
$$;

-- 4. RPC: Criar workspace + admin + access_code
CREATE OR REPLACE FUNCTION public.create_workspace_with_membership(_type TEXT, _name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_ws_id UUID;
  new_code TEXT;
BEGIN
  -- Gera código único de 5 chars
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.workspaces WHERE invite_token = new_code);
  END LOOP;

  INSERT INTO public.workspaces (type, name, invite_token)
  VALUES (_type, _name, new_code)
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, display_name, status)
  VALUES (
    new_ws_id,
    auth.uid(),
    'admin',
    COALESCE(
      (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = auth.uid()),
      _name
    ),
    'approved'
  );

  RETURN new_ws_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_membership(TEXT, TEXT) TO authenticated;

-- 5. RPC: Solicitar acesso via access_code (mesma assinatura que já existe)
CREATE OR REPLACE FUNCTION public.request_workspace_access(p_invite_token TEXT, p_requester_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_id UUID;
  existing_status TEXT;
BEGIN
  SELECT id INTO ws_id FROM public.workspaces WHERE invite_token = p_invite_token;
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

-- 6. RPC: Aprovar membro (mesma assinatura)
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id UUID, member_role TEXT DEFAULT 'member')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.workspace_members
  SET status = 'approved', role = member_role
  WHERE id = request_id AND status = 'pending';
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_join_request(UUID, TEXT) TO authenticated;

-- 7. RPC: Rejeitar membro (mesma assinatura)
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.workspace_members
  WHERE id = request_id AND status = 'pending';
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_join_request(UUID) TO authenticated;

-- 8. RPC: get_email_by_username (já existe, mantém)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users
  WHERE raw_user_meta_data->>'display_name' = p_username
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- 9. Garante realtime em workspace_members
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;

-- 10. RLS: bloquear pending users de ler dados do workspace
-- (workspaces table é aberta, mas outras tabelas devem checar membership ativa)
-- Isso já é feito pelas policies existentes que checam memberships view

NOTIFY pgrst, 'reload schema';

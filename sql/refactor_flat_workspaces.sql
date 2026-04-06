-- ============================================================
-- REFATORACAO: Workspaces sem convites/roles — hierarquia horizontal
-- Entrada apenas por criacao ou login com senha do workspace
-- RODE TUDO DE UMA VEZ no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar coluna de senha no workspace
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS workspace_password TEXT;

-- 2. Atualizar workspaces existentes com senha padrao
UPDATE public.workspaces SET workspace_password = '123456' WHERE workspace_password IS NULL;

-- 3. Remover coluna role de workspace_members (hierarquia horizontal)
-- Primeiro, dropar views/functions que dependem de role
DROP VIEW IF EXISTS public.memberships CASCADE;

-- Recriar view memberships SEM role
CREATE OR REPLACE VIEW public.memberships AS
SELECT id, workspace_id, user_id, display_name, created_at
FROM public.workspace_members
WHERE status = 'approved';

GRANT SELECT ON public.memberships TO authenticated;

-- 4. RPC: Criar workspace COM senha (substitui a versao antiga)
CREATE OR REPLACE FUNCTION public.create_workspace_with_membership(_type TEXT, _name TEXT, _password TEXT DEFAULT '123456')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_ws_id UUID;
  new_code TEXT;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.workspaces WHERE invite_token = new_code);
  END LOOP;

  INSERT INTO public.workspaces (type, name, invite_token, workspace_password)
  VALUES (_type, _name, new_code, _password)
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, display_name, status)
  VALUES (
    new_ws_id,
    auth.uid(),
    COALESCE(
      (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = auth.uid()),
      _name
    ),
    'approved'
  );

  RETURN new_ws_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_membership(TEXT, TEXT, TEXT) TO authenticated;

-- 5. RPC: join_workspace — entrar com nome do workspace + senha
CREATE OR REPLACE FUNCTION public.join_workspace(p_workspace_name TEXT, p_workspace_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_id UUID;
  ws_pass TEXT;
  existing RECORD;
BEGIN
  -- Buscar workspace por nome (case-insensitive)
  SELECT id, workspace_password INTO ws_id, ws_pass
  FROM public.workspaces
  WHERE lower(name) = lower(p_workspace_name)
  LIMIT 1;

  IF ws_id IS NULL THEN
    RETURN jsonb_build_object('error', 'workspace_not_found');
  END IF;

  IF ws_pass IS DISTINCT FROM p_workspace_password THEN
    RETURN jsonb_build_object('error', 'wrong_password');
  END IF;

  -- Verificar se ja eh membro
  SELECT id, status INTO existing
  FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'approved' THEN
      RETURN jsonb_build_object('error', 'already_member', 'workspace_id', ws_id);
    ELSE
      -- Reativar membro removido/pendente
      UPDATE public.workspace_members
      SET status = 'approved', display_name = COALESCE(
        (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = auth.uid()),
        'membro'
      )
      WHERE id = existing.id;
      RETURN jsonb_build_object('status', 'joined', 'workspace_id', ws_id);
    END IF;
  END IF;

  -- Inserir como membro aprovado (sem pending)
  INSERT INTO public.workspace_members (workspace_id, user_id, display_name, status)
  VALUES (
    ws_id,
    auth.uid(),
    COALESCE(
      (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = auth.uid()),
      'membro'
    ),
    'approved'
  );

  RETURN jsonb_build_object('status', 'joined', 'workspace_id', ws_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_workspace(TEXT, TEXT) TO authenticated;

-- 6. RPC: get_workspace_members (substitui get_approved_members e get_pending_members)
CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id UUID)
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
          'created_at', wm.created_at
        )
        ORDER BY wm.created_at ASC
      )
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.status = 'approved'
    ),
    '[]'::jsonb
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated;

-- 7. RPC: get_workspace_password (para exibir no painel de config)
CREATE OR REPLACE FUNCTION public.get_workspace_password(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_pass TEXT;
BEGIN
  -- Somente membros podem ver a senha
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND status = 'approved'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT workspace_password INTO ws_pass FROM public.workspaces WHERE id = p_workspace_id;
  RETURN ws_pass;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_password(UUID) TO authenticated;

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';

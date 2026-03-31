-- ============================================================
-- SISTEMA COMPLETO DE CÓDIGO DE CONVITE - RODE TUDO DE UMA VEZ
-- ============================================================

-- 1. Garante que a tabela workspace_codes existe
CREATE TABLE IF NOT EXISTS public.workspace_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workspace_codes DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.workspace_codes TO anon, authenticated;

-- 2. Gera códigos para workspaces que ainda não têm
INSERT INTO public.workspace_codes (workspace_id, code)
SELECT w.id, LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_codes wc WHERE wc.workspace_id = w.id
)
ON CONFLICT (workspace_id) DO NOTHING;

-- 3. RPC: Retorna o código de um workspace pelo ID (usado pelo frontend para exibir)
CREATE OR REPLACE FUNCTION public.get_join_code_for_workspace(ws_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT code FROM public.workspace_codes WHERE workspace_id = ws_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_join_code_for_workspace(UUID) TO anon, authenticated;

-- 4. RPC: Busca workspace pelo código (usado na tela Welcome para validar código)
CREATE OR REPLACE FUNCTION public.get_workspace_by_code(p_code TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT w.id, w.name
  FROM public.workspace_codes wc
  JOIN public.workspaces w ON w.id = wc.workspace_id
  WHERE wc.code = p_code
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_code(TEXT) TO anon, authenticated;

-- 5. RPC: Cria workspace + membership + código de convite
CREATE OR REPLACE FUNCTION public.create_workspace_with_membership(_type TEXT, _name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_ws_id UUID;
  new_code TEXT;
BEGIN
  -- Cria o workspace
  INSERT INTO public.workspaces (type, name)
  VALUES (_type, _name)
  RETURNING id INTO new_ws_id;

  -- Adiciona o criador como admin
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

  -- Gera código único de 4 dígitos
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    BEGIN
      INSERT INTO public.workspace_codes (workspace_id, code)
      VALUES (new_ws_id, new_code);
      EXIT; -- Sucesso, sai do loop
    EXCEPTION WHEN unique_violation THEN
      -- Código já existe, tenta outro
      CONTINUE;
    END;
  END LOOP;

  RETURN new_ws_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_membership(TEXT, TEXT) TO authenticated;

-- 6. RPC: Solicitar acesso pelo código
CREATE OR REPLACE FUNCTION public.request_access_by_code(p_code TEXT, p_requester_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_id UUID;
  existing_status TEXT;
BEGIN
  -- Acha o workspace pelo código
  SELECT wc.workspace_id INTO ws_id
  FROM public.workspace_codes wc
  WHERE wc.code = p_code;

  IF ws_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_code');
  END IF;

  -- Verifica se já é membro
  SELECT status INTO existing_status
  FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();

  IF existing_status = 'approved' THEN
    RETURN jsonb_build_object('error', 'already_member');
  END IF;

  IF existing_status = 'pending' THEN
    RETURN jsonb_build_object('status', 'pending');
  END IF;

  -- Se foi rejeitado antes, atualiza para pending
  IF existing_status = 'rejected' THEN
    UPDATE public.workspace_members
    SET status = 'pending', display_name = p_requester_name, created_at = now()
    WHERE workspace_id = ws_id AND user_id = auth.uid();
    RETURN jsonb_build_object('status', 'pending');
  END IF;

  -- Cria nova solicitação
  INSERT INTO public.workspace_members (workspace_id, user_id, role, display_name, status)
  VALUES (ws_id, auth.uid(), 'member', p_requester_name, 'pending');

  RETURN jsonb_build_object('status', 'pending');
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_access_by_code(TEXT, TEXT) TO authenticated;

-- 7. RPC: Aprovar solicitação
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

-- 8. RPC: Rejeitar solicitação
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.workspace_members
  SET status = 'rejected'
  WHERE id = request_id AND status = 'pending';
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_join_request(UUID) TO authenticated;

-- 9. RPC: Buscar email pelo username (para login de membro)
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

-- 10. Garante que workspace_members está na publicação realtime (ignora erro se já estiver)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
EXCEPTION WHEN OTHERS THEN
  -- Já está na publicação, tudo certo
  NULL;
END;
$$;

-- 11. Garante que REPLICA IDENTITY está configurada para realtime funcionar
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;

-- 12. Recarrega schema do PostgREST
NOTIFY pgrst, 'reload schema';

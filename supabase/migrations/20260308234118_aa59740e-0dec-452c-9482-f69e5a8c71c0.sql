-- ════════════════════════════════════════════════════════════
-- Configuração de Valores Padrão para Workspace
-- ════════════════════════════════════════════════════════════
-- Categorias: Institucional, Educacional, Portfólio, Comemorativo
-- Status: Não Começado, Em Andamento, Pronto, Publicado
-- ════════════════════════════════════════════════════════════

-- Função para popular workspace com configurações padrão
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir categorias padrão
  INSERT INTO public.content_categories (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Institucional', '#3b82f6', 0, true),
    (NEW.id, 'Educacional', '#10b981', 1, true),
    (NEW.id, 'Portfólio', '#8b5cf6', 2, true),
    (NEW.id, 'Comemorativo', '#f59e0b', 3, true);

  -- Inserir status padrão
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#eab308', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  RETURN NEW;
END;
$$;

-- Criar trigger para popular novos workspaces
DROP TRIGGER IF EXISTS trg_populate_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_populate_workspace_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_populate_workspace_defaults();

-- Popular workspaces existentes (apenas se não tiverem configurações)
DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- Inserir categorias se não existirem
    IF NOT EXISTS (SELECT 1 FROM public.content_categories WHERE workspace_id = ws.id) THEN
      INSERT INTO public.content_categories (workspace_id, name, color, sort_order, is_active)
      VALUES
        (ws.id, 'Institucional', '#3b82f6', 0, true),
        (ws.id, 'Educacional', '#10b981', 1, true),
        (ws.id, 'Portfólio', '#8b5cf6', 2, true),
        (ws.id, 'Comemorativo', '#f59e0b', 3, true);
    END IF;

    -- Inserir status se não existirem
    IF NOT EXISTS (SELECT 1 FROM public.workflow_statuses WHERE workspace_id = ws.id) THEN
      INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
      VALUES
        (ws.id, 'Não Começado', '#94a3b8', 0, true),
        (ws.id, 'Em Andamento', '#eab308', 1, true),
        (ws.id, 'Pronto', '#3b82f6', 2, true),
        (ws.id, 'Publicado', '#10b981', 3, true);
    END IF;
  END LOOP;
END;
$$;
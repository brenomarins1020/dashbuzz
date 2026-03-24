

## Proteger o criador do workspace contra alteração de role

### 1. Migration — Atualizar `update_member_role` RPC
Recriar a função com proteção extra: buscar `created_by` do workspace e bloquear qualquer alteração de role para esse usuário com a exceção `'Cannot change role of workspace creator'`.

### 2. Migration — Trigger `enforce_creator_admin`
Criar função + trigger `BEFORE UPDATE` na tabela `memberships` que força `role = 'admin'` quando o `user_id` é o `created_by` do workspace. Proteção de camada extra contra SQL direto.

### 3. `useWorkspace.tsx` — `createWorkspace`
Adicionar `setUserRole("admin")` após criar o workspace e chamar `await fetchWorkspace()` para confirmar do banco. Linha 194-209.

### 4. `TeamPanel.tsx` — Esconder alteração de role para o criador
- Adicionar query `["workspace-creator", workspaceId]` para buscar `created_by` (staleTime: Infinity)
- Passar `creatorId` para `MemberCard`
- No `MemberCard`: se `member.user_id === creatorId`, mostrar badge fixo "Criador" com ícone `Crown` (amarelo/âmbar), sem popover
- Esconder botão de lixeira para o criador também
- Tratar erro `"Cannot change role of workspace creator"` no `handleChangeRole` com toast em português
- Import `Crown` de lucide-react

### Arquivos afetados
- 1 migration SQL (RPC + trigger)
- `src/hooks/useWorkspace.tsx` — 2 linhas adicionadas no `createWorkspace`
- `src/components/TeamPanel.tsx` — query do criador + lógica no card


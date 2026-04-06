import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Copy, User, Shield, Crown } from "lucide-react";
import { useTeam, type TeamMember } from "@/hooks/useTeam";
import { TeamMemberModal } from "@/components/TeamMemberModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast as sonnerToast } from "sonner";

export function TeamPanel() {
  const { members, addMember, updateMember, removeMember } = useTeam();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  // Fetch membership roles
  const { data: memberRoles = [] } = useQuery({
    queryKey: ["membership-roles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("user_id, role")
        .eq("workspace_id", workspaceId!);
      return data || [];
    },
  });

  // Fetch workspace creator
  const { data: wsData } = useQuery({
    queryKey: ["workspace-creator", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("created_by")
        .eq("id", workspaceId!)
        .single();
      return data;
    },
    enabled: !!workspaceId,
    staleTime: Infinity,
  });

  const creatorId = wsData?.created_by;

  const getRoleForUser = (userId: string | undefined) => {
    if (!userId) return null;
    const m = memberRoles.find((r: any) => r.user_id === userId);
    return m ? (m as any).role : null;
  };

  const handleChangeRole = async (userId: string, name: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_member_role", {
        p_workspace_id: workspaceId!,
        p_user_id: userId,
        p_role: newRole,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["membership-roles", workspaceId] });
      sonnerToast.success(`Role de ${name} atualizado para ${newRole === "admin" ? "Admin" : "Membro"}`);
    } catch (err: any) {
      if (err.message?.includes("Cannot change role of workspace creator")) {
        sonnerToast.error("O criador do workspace não pode ter seu cargo alterado.");
      } else if (err.message?.includes("Cannot demote the only admin")) {
        sonnerToast.error("Não é possível remover o único administrador do workspace.");
      } else {
        sonnerToast.error(err.message || "Erro ao alterar role");
      }
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (member: TeamMember) => {
    setEditing(member);
    setModalOpen(true);
  };

  const handleSave = async (data: Omit<TeamMember, "id" | "workspace_id">) => {
    try {
      if (editing) {
        await updateMember(editing.id, data);
      } else {
        await addMember(data);
      }
      qc.invalidateQueries({ queryKey: ["team-members", workspaceId] });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar membro",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Copiado!", description: `${email} copiado para a área de transferência.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg md:text-xl font-bold font-heading tracking-wide uppercase">Time de Mercado</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Marketing e Vendas (PROJEC)</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar membro
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16">
          <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum membro adicionado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {members.map((member) => {
            const isCreator = !!member.user_id && member.user_id === creatorId;
            return (
              <MemberCard
                key={member.id}
                member={member}
                role={getRoleForUser(member.user_id)}
                isCreator={isCreator}
                onEdit={() => handleEdit(member)}
                onRemove={async () => {
                  qc.setQueryData(["team-members", workspaceId], (old: any) =>
                    old ? old.filter((m: any) => m.id !== member.id) : old
                  );
                  if (member.user_id) {
                    try {
                      const { error } = await supabase.rpc("remove_workspace_member", {
                        p_workspace_id: workspaceId!,
                        p_user_id: member.user_id,
                      });
                      if (error) throw error;
                      qc.invalidateQueries({ queryKey: ["membership-roles", workspaceId] });
                      sonnerToast.success(`${member.nome} foi removido(a) do workspace`);
                    } catch (err: any) {
                      qc.invalidateQueries({ queryKey: ["team-members", workspaceId] });
                      sonnerToast.error(err.message || "Erro ao remover membro");
                    }
                  } else {
                    removeMember(member.id);
                  }
                }}
                onCopyEmail={() => handleCopyEmail(member.email)}
                onChangeRole={member.user_id ? (newRole) => handleChangeRole(member.user_id!, member.nome, newRole) : undefined}
              />
            );
          })}
        </div>
      )}

      <TeamMemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={editing}
        onSave={handleSave}
      />
    </div>
  );
}

function MemberCard({
  member,
  role,
  isCreator,
  onEdit,
  onRemove,
  onCopyEmail,
  onChangeRole,
}: {
  member: TeamMember;
  role: string | null;
  isCreator: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onCopyEmail: () => void;
  onChangeRole?: (newRole: string) => void;
}) {
  return (
    <div className="relative bg-card border border-border rounded-xl shadow-sm overflow-visible pt-4 pb-4 pr-4 pl-24 md:pl-28 min-h-[140px]">
      {/* Photo overlap */}
      <div className="absolute left-3 -top-3 h-20 w-20 md:h-24 md:w-24 rounded-xl overflow-hidden border-2 border-card shadow-md bg-secondary flex items-center justify-center">
        {member.foto ? (
          <img
            src={member.foto}
            alt={member.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Actions — hide trash for creator */}
      <div className="absolute top-2 right-2 flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!isCreator && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold font-heading leading-tight">{member.nome}</p>
          {role && (
            isCreator ? (
              // Creator: fixed badge, no popover
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 cursor-default"
                title="Criador do workspace"
              >
                <Crown className="h-2.5 w-2.5" />
                Criador
              </span>
            ) : onChangeRole ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors",
                      role === "admin"
                        ? "bg-accent/20 text-accent hover:bg-accent/30"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {role === "admin" && <Shield className="h-2.5 w-2.5" />}
                    {role === "admin" ? "Admin" : "Membro"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  <button
                    onClick={() => onChangeRole(role === "admin" ? "member" : "admin")}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
                  >
                    {role === "admin" ? "Tornar Membro" : "Tornar Admin"}
                  </button>
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  role === "admin"
                    ? "bg-accent/20 text-accent"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {role === "admin" && <Shield className="h-2.5 w-2.5" />}
                {role === "admin" ? "Admin" : "Membro"}
              </span>
            )
          )}
        </div>
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", member.cargo ? "text-accent" : "text-muted-foreground/50 italic")}>
          {member.cargo || "Cargo não definido"}
        </p>
        <p className="text-[10px] text-muted-foreground">Desde {member.ano_entrada}</p>
        
        <div className="flex items-center gap-1.5 mt-2">
          <p className="text-xs text-muted-foreground break-all">{member.email}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
            onClick={onCopyEmail}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

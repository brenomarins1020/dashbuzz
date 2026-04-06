import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, Copy, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function MembersPanel() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Fetch workspace password
  const { data: wsPassword } = useQuery({
    queryKey: ["workspace-password", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_workspace_password", {
        p_workspace_id: workspaceId!,
      });
      return data as string || "";
    },
  });

  // Fetch members via RPC
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_workspace_members", {
        p_workspace_id: workspaceId!,
      });
      return data || [];
    },
  });

  const handleCopyName = () => {
    if (!workspaceName) return;
    navigator.clipboard.writeText(workspaceName);
    setCopied(true);
    toast.success("Nome copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPassword = () => {
    if (!wsPassword) return;
    navigator.clipboard.writeText(wsPassword);
    setCopiedPass(true);
    toast.success("Senha copiada!");
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Membros</p>
            <p className="text-xs text-muted-foreground">Dados de acesso e membros do workspace</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0 space-y-4">
          {/* Access info */}
          <div className="text-center py-3 rounded-xl border border-border bg-muted/30 space-y-3">
            <p className="text-xs text-muted-foreground">Para entrar neste workspace, use:</p>

            <div className="px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Nome do workspace</p>
              <p className="text-sm font-semibold text-accent break-all select-all">{workspaceName}</p>
              <button
                onClick={handleCopyName}
                className="mt-1.5 h-7 px-3 rounded-full border border-border text-[11px] hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copiado!" : "Copiar nome"}
              </button>
            </div>

            <div className="px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Senha do workspace</p>
              <p className="text-sm font-mono font-semibold text-foreground select-all">{wsPassword || "..."}</p>
              <button
                onClick={handleCopyPassword}
                className="mt-1.5 h-7 px-3 rounded-full border border-border text-[11px] hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                {copiedPass ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3" />}
                {copiedPass ? "Copiado!" : "Copiar senha"}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/50 leading-relaxed px-4">
              Compartilhe o nome e a senha com quem quiser convidar.
            </p>
          </div>

          {/* Members list */}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Membros ({members.length})
              </p>
              <div className="space-y-1.5">
                {members.map((m: any) => (
                  <div key={m.id || m.user_id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <p className="text-sm truncate">@{m.display_name || "usuário"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, Check, X, Shield, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function MembersPanel() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [roles, setRoles] = useState<Record<string, "member" | "admin">>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  const getRoleForReq = (id: string) => roles[id] ?? "member";
  const setRoleForReq = (id: string, role: "member" | "admin") =>
    setRoles((prev) => ({ ...prev, [id]: role }));

  // Fetch access code for this workspace
  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("workspaces")
      .select("invite_token")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => {
        if (data?.invite_token) setAccessCode(data.invite_token);
      });
  }, [workspaceId]);

  const handleCopyCode = () => {
    if (!accessCode) return;
    navigator.clipboard.writeText(accessCode);
    toast.success("Código copiado!");
  };

  // Fetch pending requests via RPC (workspace_members not exposed via REST)
  const { data: requests = [] } = useQuery({
    queryKey: ["pending-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_pending_members", {
        p_workspace_id: workspaceId!,
      });
      return data || [];
    },
  });

  // Realtime: auto-refresh when workspace_members changes
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel("members-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_members", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["pending-members", workspaceId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, qc]);

  const handleApprove = async (req: any) => {
    if (loadingId) return;
    const role = getRoleForReq(req.id);
    setLoadingId(req.id + "-approve");
    try {
      const { error } = await supabase.rpc("approve_join_request", {
        request_id: req.id,
        member_role: role,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pending-members", workspaceId] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`${req.display_name} aprovado como ${role === "admin" ? "Admin" : "Membro"}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (req: any) => {
    if (loadingId) return;
    setLoadingId(req.id + "-reject");
    try {
      const { error } = await supabase.rpc("reject_join_request", { request_id: req.id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pending-members", workspaceId] });
      toast.success(`${req.display_name} rejeitado`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    } finally {
      setLoadingId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <Collapsible defaultOpen={pendingCount > 0}>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">
              Membros
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Código de acesso e solicitações pendentes</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0 space-y-4">
          {/* Access code display */}
          {accessCode && (
            <div className="text-center py-3 rounded-xl border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Código de acesso do workspace</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-accent">
                {accessCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed px-4">
                Compartilhe este código com quem você quer convidar.
              </p>
              <button
                onClick={handleCopyCode}
                className="mt-2 h-8 px-4 rounded-full border border-border text-xs hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                <Copy className="h-3 w-3" />
                Copiar código
              </button>
            </div>
          )}

          {/* Pending requests */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Solicitações pendentes {pendingCount > 0 && `(${pendingCount})`}
            </p>
            {pendingCount === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-3">
                Nenhuma solicitação pendente.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((req: any) => {
                  const selectedRole = getRoleForReq(req.id);
                  return (
                    <div key={req.id} className="rounded-lg border border-border px-3 py-3 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">@{req.display_name}</p>
                          <p className="text-xs text-muted-foreground/60">
                            {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3 shrink-0">
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={!!loadingId}
                            className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            {loadingId === req.id + "-approve"
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            disabled={!!loadingId}
                            className="h-8 w-8 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            {loadingId === req.id + "-reject"
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <X className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {/* Role selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Entrar como:</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setRoleForReq(req.id, "member")}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
                              selectedRole === "member"
                                ? "bg-secondary text-foreground border-border"
                                : "bg-transparent text-muted-foreground border-transparent hover:border-border"
                            )}
                          >
                            Membro
                          </button>
                          <button
                            onClick={() => setRoleForReq(req.id, "admin")}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
                              selectedRole === "admin"
                                ? "bg-accent/20 text-accent border-accent/40"
                                : "bg-transparent text-muted-foreground border-transparent hover:border-border"
                            )}
                          >
                            <Shield className="h-3 w-3" />
                            Admin
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

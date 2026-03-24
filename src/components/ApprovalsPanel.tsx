import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserCheck, ChevronDown, Check, X, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function ApprovalsPanel() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [roles, setRoles] = useState<Record<string, "member" | "admin">>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [approveAllOpen, setApproveAllOpen] = useState(false);

  const getRoleForReq = (id: string) => roles[id] ?? "member";
  const setRoleForReq = (id: string, role: "member" | "admin") =>
    setRoles((prev) => ({ ...prev, [id]: role }));

  const { data: requests = [] } = useQuery({
    queryKey: ["workspace-join-requests", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_join_requests")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel("join-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_join_requests", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["workspace-join-requests", workspaceId] });
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
      qc.invalidateQueries({ queryKey: ["workspace-join-requests", workspaceId] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`Acesso aprovado para ${req.requester_name} como ${role === "admin" ? "Admin" : "Membro"}`);
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
      qc.invalidateQueries({ queryKey: ["workspace-join-requests", workspaceId] });
      toast.success(`${req.requester_name} foi rejeitado(a)`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveAll = async () => {
    setLoadingId("all");
    try {
      for (const req of requests) {
        await supabase.rpc("approve_join_request", { request_id: req.id, member_role: "member" });
      }
      qc.invalidateQueries({ queryKey: ["workspace-join-requests", workspaceId] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`${requests.length} solicitações aprovadas como Membro`);
    } finally {
      setLoadingId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <Collapsible defaultOpen={pendingCount > 0}>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">
              Aprovações
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Solicitações de acesso ao workspace</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0 space-y-4">
          {pendingCount === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Quando alguém usar um link de convite, aparecerá aqui.
              </p>
            </div>
          ) : (
            <>
              {pendingCount >= 2 && (
                <button
                  onClick={() => setApproveAllOpen(true)}
                  disabled={!!loadingId}
                  className="w-full h-9 rounded-lg bg-emerald-600/20 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors border border-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingId === "all" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Aprovar todos ({pendingCount})
                </button>
              )}
              <div className="space-y-3">
                {requests.map((req: any) => {
                  const selectedRole = getRoleForReq(req.id);
                  return (
                    <div key={req.id} className="rounded-lg border border-border px-3 py-3 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{req.requester_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {req.email?.includes("@member.dashbuzz.app")
                              ? `@${req.email.split("__")[0]}`
                              : req.email}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            {format(new Date(req.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3 shrink-0">
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={!!loadingId}
                            aria-label={`Aprovar ${req.requester_name}`}
                            className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            {loadingId === req.id + "-approve"
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            disabled={!!loadingId}
                            aria-label={`Rejeitar ${req.requester_name}`}
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
            </>
          )}
        </div>
      </CollapsibleContent>

      <AlertDialog open={approveAllOpen} onOpenChange={setApproveAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar todos os {pendingCount} pedidos?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os solicitantes serão adicionados ao workspace como <strong>Membro</strong>. Esta ação não pode ser desfeita em lote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setApproveAllOpen(false); handleApproveAll(); }}>
              Aprovar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}

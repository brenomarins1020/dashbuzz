import { useState, useEffect, useRef } from "react";
import { Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string>("pending");

  // Fetch initial workspace name and status
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("workspace_members")
      .select("workspace_id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(async ({ data }: any) => {
        if (data?.workspace_id) {
          setRequestStatus(data.status);
          const { data: ws } = await supabase
            .from("workspaces")
            .select("name")
            .eq("id", data.workspace_id)
            .single();
          if (ws) setWorkspaceName(ws.name);
        }
      });
  }, [user]);

  // Realtime + polling: listen for approval → auto-redirect
  const redirected = useRef(false);
  const goToDashboard = () => {
    if (redirected.current) return;
    redirected.current = true;
    window.location.replace("/");
  };

  useEffect(() => {
    if (!user) return;

    // Realtime: workspace_members status change
    const channel = supabase
      .channel(`pending-approval-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workspace_members",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === "approved") {
            goToDashboard();
          } else if (newStatus === "rejected") {
            setRequestStatus("rejected");
          }
        }
      )
      .subscribe();

    // Polling fallback every 5s
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (data) goToDashboard();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [user]);

  const handleSignOut = async () => {
    localStorage.removeItem("pendingAccessCode");
    localStorage.removeItem("pendingWorkspaceName");
    await supabase.auth.signOut();
    navigate("/welcome", { replace: true });
  };

  return (
    <AuthLayout title="DASHBUZZ" subtitle="Marketing Dashboard">
      <div className="glass-card-auth p-6 space-y-5 text-center">
        <div className="flex items-center justify-center">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)" }}
          >
            <Clock className="h-7 w-7" style={{ color: "#F5A623" }} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white" style={dmSans}>
            {requestStatus === "rejected" ? "Acesso negado" : "Aguardando aprovação"}
          </h2>
          <p className="text-sm text-white/50" style={dmSans}>
            {requestStatus === "rejected"
              ? `O administrador de ${workspaceName || "o workspace"} recusou seu acesso.`
              : workspaceName
                ? `O administrador de ${workspaceName} precisa aprovar seu acesso.`
                : "Aguarde o administrador aprovar seu acesso."}
          </p>
          {requestStatus === "pending" && (
            <p className="text-xs text-white/30 mt-2" style={dmSans}>
              Você será redirecionado automaticamente quando aprovado.
            </p>
          )}
          {(() => {
            const dn = user?.user_metadata?.display_name;
            const isMember = user?.email?.includes("@member.dashbuzz.app");
            const displayText = dn ? `@${dn}` : isMember ? "" : user?.email;
            return displayText ? (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Mail className="h-3.5 w-3.5 text-white/30" />
                <p className="text-xs text-white/30" style={dmSans}>
                  Solicitação enviada como: {displayText}
                </p>
              </div>
            ) : null;
          })()}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full h-10 rounded-[10px] px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            ...dmSans,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        >
          Entrar com outra conta
        </button>
      </div>
    </AuthLayout>
  );
}

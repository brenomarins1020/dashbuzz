import { Clock, Mail, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePendingStatus } from "@/hooks/usePendingStatus";
import { AuthLayout } from "@/components/AuthLayout";
import { useEffect, useRef } from "react";

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, workspaceName, loading } = usePendingStatus(2000);
  const redirected = useRef(false);

  // Auto-redirect when approved
  useEffect(() => {
    if (status === "approved" && !redirected.current) {
      redirected.current = true;
      localStorage.removeItem("targetWorkspaceId");
      localStorage.removeItem("pendingAccessCode");
      localStorage.removeItem("pendingWorkspaceName");
      window.location.replace("/");
    }
  }, [status]);

  const handleSignOut = async () => {
    localStorage.removeItem("pendingAccessCode");
    localStorage.removeItem("pendingWorkspaceName");
    localStorage.removeItem("targetWorkspaceId");
    await supabase.auth.signOut();
    navigate("/welcome", { replace: true });
  };

  if (loading) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isRejected = status === "rejected";

  return (
    <AuthLayout title="DASHBUZZ" subtitle="Marketing Dashboard">
      <div className="glass-card-auth p-6 space-y-5 text-center">
        <div className="flex items-center justify-center">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{
              background: isRejected ? "rgba(239,68,68,0.15)" : "rgba(245,166,35,0.15)",
              border: `1px solid ${isRejected ? "rgba(239,68,68,0.3)" : "rgba(245,166,35,0.3)"}`,
            }}
          >
            {isRejected
              ? <XCircle className="h-7 w-7" style={{ color: "#f87171" }} />
              : <Clock className="h-7 w-7" style={{ color: "#F5A623" }} />
            }
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white" style={dmSans}>
            {isRejected ? "Acesso negado" : "Aguardando aprovação"}
          </h2>
          <p className="text-sm text-white/50" style={dmSans}>
            {isRejected
              ? `O administrador de ${workspaceName || "o workspace"} recusou seu acesso.`
              : workspaceName
                ? `O administrador de ${workspaceName} precisa aprovar seu acesso.`
                : "Aguarde o administrador aprovar seu acesso."}
          </p>
          {!isRejected && (
            <p className="text-xs text-white/30 mt-2" style={dmSans}>
              Você será redirecionado automaticamente quando aprovado.
            </p>
          )}
          {(() => {
            const dn = user?.user_metadata?.display_name;
            const isMember = user?.email?.includes("@member.dashbuzz.app") || user?.email?.includes("@dashbuzz.internal");
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

        {!isRejected && (
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-xs text-white/30" style={dmSans}>Verificando a cada 2 segundos...</p>
          </div>
        )}

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
          {isRejected ? "Tentar outro código" : "Entrar com outra conta"}
        </button>
      </div>
    </AuthLayout>
  );
}

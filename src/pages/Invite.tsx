import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Invite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug } = useParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    supabase
      .from("workspaces")
      .select("name, invite_token")
      .eq("invite_token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setValid(false);
        } else {
          setValid(true);
          setWorkspaceName(data.name || "Workspace");
          // Redirect to Welcome with join flow
          localStorage.setItem("pendingInviteToken", token);
          localStorage.setItem("pendingWorkspaceName", data.name || "Workspace");
          localStorage.setItem("onboarding_seen", "1");
        }
        setLoading(false);
      });
  }, [token]);

  // Redirect once valid
  useEffect(() => {
    if (!loading && valid && token) {
      navigate("/welcome?flow=join", { replace: true });
    }
  }, [loading, valid, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <Loader2 className="h-6 w-6 animate-spin text-[#F5A623]" />
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f172a" }}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-10 w-10 mx-auto text-red-400" />
          <p className="text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Este convite é inválido ou expirou.
          </p>
          <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Peça ao administrador um novo link.
          </p>
          <button
            onClick={() => navigate("/welcome")}
            className="text-xs hover:underline"
            style={{ color: "#F5A623", fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return null;
}

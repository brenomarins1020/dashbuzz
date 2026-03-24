import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

const MIN_PASSWORD = 8;
const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const valid = password.length >= MIN_PASSWORD;
  const match = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !match) return;
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Erro ao salvar senha.");
    } finally {
      setLoading(false);
    }
  };

  if (sessionReady === null) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <AuthLayout subtitle="Link Inválido">
        <div className="glass-card-auth p-6 space-y-4 text-center">
          <XCircle className="h-12 w-12 mx-auto" style={{ color: "#f87171" }} />
          <p className="text-sm text-white" style={dmSans}>
            Link inválido ou expirado. Solicite um novo link na tela de login.
          </p>
          <Link to="/login">
            <button className="btn-gold-shimmer w-full h-10 text-sm mt-2" style={dmSans}>
              Ir para login
            </button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Definir Nova Senha">
      <form onSubmit={handleSubmit} className="glass-card-auth p-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-white/70" style={dmSans}>Nova senha</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
            style={dmSans}
          />
          <div className="flex items-center gap-1.5 text-xs" style={dmSans}>
            {password.length > 0 ? (
              valid ? (
                <><CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#F5A623" }} /><span style={{ color: "#F5A623" }}>Mínimo 8 caracteres ✓</span></>
              ) : (
                <><XCircle className="h-3.5 w-3.5" style={{ color: "#f87171" }} /><span style={{ color: "#f87171" }}>Mínimo 8 caracteres</span></>
              )
            ) : (
              <span className="text-white/30">Mínimo 8 caracteres</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm" className="text-sm font-medium text-white/70" style={dmSans}>Confirmar senha</label>
          <input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
            style={dmSans}
          />
          {confirm.length > 0 && !match && (
            <p className="text-xs" style={{ color: "#f87171", ...dmSans }}>As senhas não coincidem.</p>
          )}
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", ...dmSans }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !valid || !match}
          className="btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm"
          style={dmSans}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar senha
        </button>
      </form>
    </AuthLayout>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Definir / Recuperar Senha">
      {sent ? (
        <div className="glass-card-auth p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10" style={{ color: "#F5A623" }} />
            <p className="text-sm text-white font-medium" style={dmSans}>
              Enviamos um link para <strong>{email}</strong>.
            </p>
            <p className="text-xs text-white/40" style={dmSans}>
              Verifique sua caixa de entrada (e spam). Clique no link para definir sua senha.
            </p>
          </div>
          <Link to="/login">
            <button className="btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm mt-2" style={dmSans}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card-auth p-6 space-y-4">
          <p className="text-xs text-white/40" style={dmSans}>
            Informe seu email para receber o link de definição/recuperação de senha.
          </p>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white/70" style={dmSans}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
            />
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

          <button type="submit" disabled={loading} className="btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm" style={dmSans}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar link para definir senha
          </button>

          <Link to="/login" className="block text-center text-xs text-white/30 hover:text-white/60 hover:underline transition-all" style={dmSans}>
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Voltar ao login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

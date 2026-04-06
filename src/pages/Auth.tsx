import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";
import { generateMemberEmail, mapSupabaseError } from "@/lib/authHelpers";

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  // Login type: "admin" (email) or "member" (username)
  const [loginType, setLoginType] = useState<"admin" | "member">("member");
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const didLoginRef = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && !didLoginRef.current) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setError("");
    setLoading(true);
    didLoginRef.current = true;

    try {
      const email = loginType === "member"
        ? generateMemberEmail(identifier.trim().toLowerCase())
        : identifier.trim();

      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginErr) throw loginErr;
      navigate("/", { replace: true });
    } catch (err: any) {
      didLoginRef.current = false;
      setError(mapSupabaseError(err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout title="DASHBUZZ" subtitle="Marketing Dashboard">
      <form onSubmit={handleLogin} className="glass-card-auth p-6 space-y-4">
        <p className="text-center text-sm font-semibold text-white mb-1" style={dmSans}>
          Entrar na sua conta
        </p>

        {/* Toggle Admin / Membro */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            type="button"
            onClick={() => { setLoginType("member"); setIdentifier(""); setError(""); }}
            className="flex-1 py-2 text-xs font-medium transition-all"
            style={{
              background: loginType === "member" ? "rgba(245,166,35,0.2)" : "transparent",
              color: loginType === "member" ? "#F5A623" : "rgba(255,255,255,0.4)",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              ...dmSans,
            }}
          >
            Membro
          </button>
          <button
            type="button"
            onClick={() => { setLoginType("admin"); setIdentifier(""); setError(""); }}
            className="flex-1 py-2 text-xs font-medium transition-all"
            style={{
              background: loginType === "admin" ? "rgba(245,166,35,0.2)" : "transparent",
              color: loginType === "admin" ? "#F5A623" : "rgba(255,255,255,0.4)",
              ...dmSans,
            }}
          >
            Admin
          </button>
        </div>

        {/* Identifier field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" style={dmSans}>
            {loginType === "admin" ? "Email" : "Nome de usuário"}
          </label>
          {loginType === "member" ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" style={dmSans}>@</span>
              <input
                type="text"
                placeholder="seunome"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                autoFocus
                required
                className="gold-input-focus w-full h-10 rounded-[10px] pl-7 pr-3 text-sm"
                style={dmSans}
              />
            </div>
          ) : (
            <input
              type="email"
              placeholder="email@empresa.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              required
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
            />
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" style={dmSans}>Senha</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 pr-10 text-sm"
              style={dmSans}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
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
          disabled={loading || !identifier.trim() || !password}
          className="btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold"
          style={dmSans}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </button>

        <div className="text-center space-y-2 pt-1" style={dmSans}>
          {loginType === "admin" && (
            <Link to="/reset-password" className="text-xs hover:underline" style={{ color: "#F5A623" }}>
              Esqueci minha senha
            </Link>
          )}
          <p className="text-xs text-white/40">
            Não tem conta?{" "}
            <button type="button" onClick={() => navigate("/welcome")} className="hover:underline" style={{ color: "#F5A623" }}>
              Criar conta ou entrar com código
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

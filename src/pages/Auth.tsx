import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Info, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AuthLayout } from "@/components/AuthLayout";

const typeLabels: Record<string, string> = {
  atletica: "Atlética",
  ej: "Empresa Júnior",
  outros: "",
};

const rules = [
  { label: "Mínimo 10 caracteres", test: (p: string) => p.length >= 10 },
  { label: "Pelo menos 1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos 1 número", test: (p: string) => /\d/.test(p) },
];

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { createWorkspace } = useWorkspace();
  const obType = localStorage.getItem("onboardingType");
  const obName = localStorage.getItem("onboardingName");

  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  // removed loginMode toggle

  const [displayName, setDisplayName] = useState(obName || "");
  const [email, setEmail] = useState("");
  // removed username state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const inviteToken = localStorage.getItem('pendingInviteToken');

  useEffect(() => {
    const hasInvite = !!localStorage.getItem('pendingInviteToken');
    if (mode === "signup" && (!obType || !obName) && !hasInvite) {
      navigate("/welcome?step=onboarding", { replace: true });
    }
  }, [mode, obType, obName, navigate]);

  // Only redirect if user was ALREADY logged in when arriving at /auth
  // (e.g. pressing browser back button). Do NOT fire after a fresh login
  // because handleLogin/handleSignup already call navigate().
  const didLoginRef = useRef(false);
  useEffect(() => {
    if (!authLoading && user && !didLoginRef.current) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user]);

  const setMode = (m: "login" | "signup") => {
    setError("");
    setSignupSuccess(false);
    const hasInvite = !!localStorage.getItem('pendingInviteToken');
    if (m === "signup" && (!obType || !obName) && !hasInvite) {
      navigate("/welcome?step=onboarding", { replace: true });
      return;
    }
    setSearchParams({ mode: m });
  };

  const allRulesPass = rules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword;

  // social login removed

  /** Try to join workspace via invite token. Returns true if user should stop normal flow. */
  const tryJoinViaInvite = async (userId: string): Promise<boolean> => {
    const pendingToken = localStorage.getItem('pendingInviteToken');
    const pendingName = localStorage.getItem('pendingInviteName') || '';
    if (!pendingToken) return false;

    // Check if user already has a workspace — skip invite processing
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (existingMembership) {
      localStorage.removeItem('pendingInviteToken');
      localStorage.removeItem('pendingInviteName');
      return false; // let normal flow continue
    }

    try {
      const { data: result } = await supabase
        .rpc('request_workspace_access', { p_invite_token: pendingToken, p_requester_name: pendingName });
      const r = result as any;

      localStorage.removeItem('pendingInviteToken');
      localStorage.removeItem('pendingInviteName');

      if (r && r.status === 'pending_approval') {
        navigate("/pending-approval", { replace: true });
        return true;
      }
      if (r && r.status === 'already_member') {
        // User is already a member — let them enter directly
        if (r.workspace_name) localStorage.setItem('onboardingName', r.workspace_name);
        if (r.workspace_type) localStorage.setItem('onboardingType', r.workspace_type);
        return false;
      }
      if (r && r.error) {
        const errMsg = r.error === 'invalid_token' ? 'O convite é inválido ou expirou.' : 'Erro ao processar convite.';
        toast.error(errMsg);
      } else if (r && !r.error) {
        localStorage.setItem('onboardingName', r.workspace_name);
        localStorage.setItem('onboardingType', r.workspace_type);
      }
    } catch (e) {
      console.error('Invite join failed:', e);
      toast.error('Erro ao processar convite.');
      localStorage.removeItem('pendingInviteToken');
      localStorage.removeItem('pendingInviteName');
    }
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    didLoginRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const shouldStop = await tryJoinViaInvite(userId);
        if (shouldStop) return;
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        err.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err.message || "Erro ao fazer login."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass || !passwordsMatch) return;
    setError("");
    setLoading(true);
    didLoginRef.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            org_type: obType,
            org_name: displayName.trim() || obName,
            display_name: displayName.trim() || obName,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        const userId = data.user?.id;
        if (userId) {
          const shouldStop = await tryJoinViaInvite(userId);
          if (shouldStop) return;
        }

        // Clean up any residual invite tokens
        localStorage.removeItem('pendingInviteToken');
        localStorage.removeItem('pendingInviteName');

        try {
          await createWorkspace(obType || "ej", displayName.trim() || obName || "Workspace");
        } catch (wsErr) {
          console.error("Workspace creation error:", wsErr);
        }
        navigate("/", { replace: true });
      } else {
        setSignupSuccess(true);
      }
    } catch (err: any) {
      const msg = err.message === "User already registered"
        ? "Email já registrado."
        : err.message || "Erro ao criar conta.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentName = displayName.trim() || obName;
  const workspaceLabel = mode === "signup" && obType && currentName && !inviteToken
    ? `${typeLabels[obType] || obType} — ${currentName}`
    : null;

  if (authLoading) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout
      title={currentName || "DASHBUZZ"}
      subtitle="Marketing Dashboard"
    >
      {/* Workspace badge (signup without invite only) */}
      {workspaceLabel && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="text-xs font-medium rounded-full px-3 py-1"
            style={{
              background: "rgba(245,166,35,0.15)",
              border: "1px solid rgba(245,166,35,0.3)",
              color: "#F5A623",
              ...dmSans,
            }}
          >
            {workspaceLabel}
          </span>
          <button
            onClick={() => {
              localStorage.removeItem("onboardingType");
              localStorage.removeItem("onboardingName");
              navigate("/welcome?step=onboarding", { replace: true });
            }}
            className="text-[10px] text-white/30 hover:text-white/60 hover:underline transition-all"
            style={dmSans}
          >
            Trocar
          </button>
        </div>
      )}

      {/* Context banners */}
      {mode === "signup" && !inviteToken && obName && (
        <div
          className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4"
          style={{
            background: "rgba(245,166,35,0.1)",
            border: "1px solid rgba(245,166,35,0.2)",
            color: "rgba(245,166,35,0.9)",
            ...dmSans,
          }}
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          Você está criando um novo workspace para {obName}
        </div>
      )}
      {mode === "signup" && inviteToken && (
        <div
          className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4"
          style={{
            background: "rgba(245,166,35,0.1)",
            border: "1px solid rgba(245,166,35,0.2)",
            color: "rgba(245,166,35,0.9)",
            ...dmSans,
          }}
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          Você está criando sua conta para entrar em um workspace
        </div>
      )}

      {/* Signup success message */}
      {signupSuccess ? (
        <div className="glass-card-auth p-6 space-y-4 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto" style={{ color: "#F5A623" }} />
          <p className="text-sm font-medium text-white" style={dmSans}>
            Conta criada! Verifique seu email para confirmar.
          </p>
          <p className="text-xs text-white/40" style={dmSans}>
            Após confirmar, volte aqui e faça login.
          </p>
          <button
            onClick={() => setMode("login")}
            className="btn-gold-shimmer w-full h-10 text-sm"
            style={dmSans}
          >
            Ir para login
          </button>
        </div>
      ) : mode === "login" ? (
        /* LOGIN */
        <form onSubmit={handleLogin} className="glass-card-auth p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white/70" style={dmSans}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white/70" style={dmSans}>Senha</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="gold-input-focus w-full h-10 rounded-[10px] px-3 pr-10 text-sm"
                style={dmSans}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            Entrar
          </button>

          <div className="text-center space-y-2 pt-1" style={dmSans}>
            <Link
              to="/reset-password"
              className="text-xs hover:underline transition-all"
              style={{ color: "#F5A623" }}
            >
              Esqueci minha senha
            </Link>
            <p className="text-xs text-white/40">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="hover:underline"
                style={{ color: "#F5A623" }}
              >
                Criar conta
              </button>
            </p>
            <button
              type="button"
              onClick={() => navigate("/welcome")}
              className="text-xs hover:underline transition-all"
              style={{ color: "#F5A623" }}
            >
              ← Voltar
            </button>
          </div>
        </form>
      ) : (
        /* SIGNUP */
        <form onSubmit={handleSignup} className="glass-card-auth p-6 space-y-4">
          {!inviteToken && (
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-white/70" style={dmSans}>Nome da instituição</label>
            <input
              id="name"
              type="text"
              placeholder="Nome da organização"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                localStorage.setItem("onboardingName", e.target.value.trim() || obName || "");
              }}
              required
              autoFocus
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
            />
          </div>
          )}
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium text-white/70" style={dmSans}>Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-sm font-medium text-white/70" style={dmSans}>Senha</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="gold-input-focus w-full h-10 rounded-[10px] px-3 pr-10 text-sm"
                style={dmSans}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                {rules.map((r) => {
                  const ok = r.test(password);
                  return (
                    <div key={r.label} className="flex items-center gap-1.5 text-xs" style={dmSans}>
                      {ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#F5A623" }} />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" style={{ color: "#f87171" }} />
                      )}
                      <span style={{ color: ok ? "#F5A623" : "#f87171" }}>
                        {r.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-white/70" style={dmSans}>Confirmar senha</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="gold-input-focus w-full h-10 rounded-[10px] px-3 pr-10 text-sm"
                style={dmSans}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
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
            disabled={loading || !allRulesPass || !passwordsMatch || (!inviteToken && !displayName.trim())}
            className="btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm"
            style={dmSans}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar conta
          </button>

          <p className="text-center text-xs text-white/40 pt-1" style={dmSans}>
            Já tem conta?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="hover:underline"
              style={{ color: "#F5A623" }}
            >
              Entrar
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

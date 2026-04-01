import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy, Briefcase, Globe, ArrowRight, UserPlus, LogIn, Users,
  ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type OrgType = "atletica" | "ej" | "outros";
type Step =
  | "choose"
  | "type"
  | "name"
  | "admin-auth"
  | "access-code"
  | "join-auth";

const labels: Record<OrgType, { question: string; prefix: string }> = {
  ej: { question: "Qual o nome da sua Empresa Júnior?", prefix: "Empresa Júnior" },
  atletica: { question: "Qual o nome da sua Atlética?", prefix: "Atlética" },
  outros: { question: "Qual o nome da sua organização?", prefix: "" },
};

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

const passwordRules = [
  { label: "Mínimo 10 caracteres", test: (p: string) => p.length >= 10 },
  { label: "Pelo menos 1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos 1 número", test: (p: string) => /\d/.test(p) },
];

const stepIndex: Record<Step, number> = {
  choose: 0, type: 1, name: 2, "admin-auth": 3,
  "access-code": 1, "join-auth": 2,
};

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("choose");
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | "none">("none");

  // Create workspace flow
  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [orgName, setOrgName] = useState("");

  // Admin auth
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Join workspace flow
  const [accessCode, setAccessCode] = useState("");
  const [joinWsName, setJoinWsName] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!authLoading && user && !joiningRef.current) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Handle ?flow=join from pending redirects
  useEffect(() => {
    const flow = searchParams.get("flow");
    const preCode = localStorage.getItem("pendingAccessCode");
    const preWsName = localStorage.getItem("pendingWorkspaceName");
    if (flow === "join" && preCode) {
      setAccessCode(preCode);
      setJoinWsName(preWsName || "Workspace");
      setStep("join-auth");
    }
  }, [searchParams]);

  const animateTo = (next: Step, cb?: () => void) => {
    const goingForward = (stepIndex[next] ?? 0) >= (stepIndex[step] ?? 0);
    setSlideDir(goingForward ? "left" : "right");
    setTransitioning(true);
    setError("");
    setTimeout(() => {
      setStep(next);
      cb?.();
      setSlideDir(goingForward ? "right" : "left");
      requestAnimationFrame(() => {
        setSlideDir("none");
        setTransitioning(false);
      });
    }, 200);
  };

  // ---- ADMIN FLOW ----
  const handleSelectType = (t: OrgType) => animateTo("name", () => setOrgType(t));

  const handleNameContinue = () => {
    if (!orgType || !orgName.trim()) return;
    localStorage.setItem("onboardingType", orgType);
    localStorage.setItem("onboardingName", orgName.trim());
    animateTo("admin-auth");
  };

  const allAdminRulesPass = passwordRules.every((r) => r.test(adminPassword));
  const adminPasswordsMatch = adminPassword === adminConfirm;

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAdminRulesPass || !adminPasswordsMatch) return;
    setError("");
    setLoading(true);
    try {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            org_type: orgType,
            org_name: orgName.trim(),
            display_name: orgName.trim(),
          },
        },
      });
      if (signupErr) throw signupErr;
      if (data.session) {
        try {
          await supabase.rpc("create_workspace_with_membership", {
            _type: orgType || "ej",
            _name: orgName.trim(),
          });
        } catch (wsErr) {
          console.error("Workspace creation error:", wsErr);
        }
        navigate("/", { replace: true });
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } catch (err: any) {
      setError(err.message === "User already registered" ? "Email já registrado." : err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  // ---- JOIN FLOW ----

  // Step 1: Validate access code (try invite_token first, then workspace ID)
  const handleAccessCodeContinue = async () => {
    setError("");
    const code = accessCode.trim();
    if (code.length < 4) return;
    setLoading(true);
    try {
      // Try by invite_token
      let { data } = await supabase
        .from("workspaces")
        .select("id, name, invite_token")
        .eq("invite_token", code)
        .single();
      // Try uppercase
      if (!data) {
        ({ data } = await supabase
          .from("workspaces")
          .select("id, name, invite_token")
          .eq("invite_token", code.toUpperCase())
          .single());
      }
      // Try by workspace ID (the admin panel now shows workspace ID as code)
      if (!data) {
        ({ data } = await supabase
          .from("workspaces")
          .select("id, name, invite_token")
          .eq("id", code)
          .single());
      }
      if (!data) {
        setError("Código inválido. Verifique e tente novamente.");
        return;
      }
      setJoinWsName(data.name);
      // Store the ACTUAL invite_token from DB for the RPC call
      const actualToken = data.invite_token || code;
      localStorage.setItem("pendingAccessCode", actualToken);
      localStorage.setItem("pendingWorkspaceName", data.name);
      localStorage.setItem("targetWorkspaceId", data.id);
      animateTo("join-auth");
    } catch {
      setError("Erro ao verificar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create account + request access
  const usernameValid = /^[a-z0-9_]{3,}$/.test(joinUsername);

  const handleJoinSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameValid || joinPassword.length < 8) return;
    setError("");
    setLoading(true);
    joiningRef.current = true;
    try {
      const code = accessCode.trim().toUpperCase();
      const fakeEmail = `${joinUsername}__${code}@member.dashbuzz.app`;

      // Check if user already exists
      const { data: existingEmail } = await supabase.rpc("get_email_by_username", {
        p_username: joinUsername,
      });

      if (existingEmail) {
        // User exists — login
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: existingEmail as string,
          password: joinPassword,
        });
        if (loginErr) {
          joiningRef.current = false;
          setError("Senha incorreta. Tente novamente.");
          setLoading(false);
          return;
        }
      } else {
        // New user — create account
        const { data: signupData, error: signupErr } = await supabase.auth.signUp({
          email: fakeEmail,
          password: joinPassword,
          options: { data: { display_name: joinUsername } },
        });
        if (signupErr) throw signupErr;
        if (!signupData.session) {
          joiningRef.current = false;
          setError("Erro ao criar conta. Tente novamente.");
          setLoading(false);
          return;
        }
      }

      // Request workspace access
      localStorage.setItem("memberUsername", joinUsername);
      const storedCode = localStorage.getItem("pendingAccessCode") || code;
      const { data: result } = await supabase.rpc("request_workspace_access", {
        p_invite_token: storedCode,
        p_requester_name: joinUsername,
      });
      const r = result as any;
      if (r?.error === "already_member") {
        navigate("/", { replace: true });
      } else {
        navigate("/pending-approval", { replace: true });
      }

      localStorage.removeItem("pendingAccessCode");
      localStorage.removeItem("pendingWorkspaceName");
    } catch (err: any) {
      joiningRef.current = false;
      setError(err.message || "Erro ao acessar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ---- HEADLINE ----
  const headline = (() => {
    if (step === "admin-auth") return orgName.trim() || "DASHBUZZ";
    if (step === "name" && orgName.trim() && orgType) {
      const prefix = labels[orgType].prefix;
      return `${prefix ? prefix + " " : ""}${orgName.trim()}`;
    }
    if (step === "join-auth") return joinWsName;
    return "DASHBUZZ";
  })();

  if (authLoading) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const slideStyle: React.CSSProperties = transitioning
    ? {
        transform: slideDir === "left" ? "translateX(-24px)" : "translateX(24px)",
        opacity: 0,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      }
    : {
        transform: "translateX(0)",
        opacity: 1,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      };

  return (
    <AuthLayout title={headline} subtitle="Marketing Dashboard">
      <div style={slideStyle}>
        {/* ── STEP: CHOOSE ── */}
        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-white/50 mb-2" style={dmSans}>
              Como deseja entrar?
            </p>

            {[
              {
                icon: UserPlus,
                title: "Criar um workspace",
                sub: "Você será o administrador",
                action: () => animateTo("type"),
              },
              {
                icon: LogIn,
                title: "Já tenho um workspace",
                sub: "Entre com seu usuário e senha",
                action: () => navigate("/auth?mode=login"),
              },
              {
                icon: Users,
                title: "Entrar em um workspace",
                sub: "Use o código de acesso",
                action: () => animateTo("access-code"),
              },
            ].map((opt) => (
              <button
                key={opt.title}
                onClick={opt.action}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(245,166,35,0.12)" }}
                >
                  <opt.icon className="h-5 w-5" style={{ color: "#F59E0B" }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-white" style={dmSans}>{opt.title}</p>
                  <p className="text-[11px] text-white/40" style={dmSans}>{opt.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── STEP: TYPE ── */}
        {step === "type" && (
          <div className="space-y-5">
            <p className="text-center text-sm text-white/50" style={dmSans}>
              Escolha seu tipo de organização
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: "ej" as OrgType, icon: Briefcase, label: "Empresas Juniores" },
                { type: "atletica" as OrgType, icon: Trophy, label: "Atléticas" },
                { type: "outros" as OrgType, icon: Globe, label: "Outros" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSelectType(item.type)}
                  className="selection-card group flex flex-col items-center gap-3 p-5"
                >
                  <item.icon className="h-8 w-8 transition-transform group-hover:scale-110" style={{ color: "#F5A623" }} />
                  <span className="text-xs font-semibold text-white" style={dmSans}>{item.label}</span>
                </button>
              ))}
            </div>
            <BackButton onClick={() => animateTo("choose")} />
          </div>
        )}

        {/* ── STEP: NAME ── */}
        {step === "name" && orgType && (
          <div className="glass-card-auth p-6 space-y-4">
            <p className="text-sm font-medium text-white/80" style={dmSans}>{labels[orgType].question}</p>
            <input
              className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
              style={dmSans}
              placeholder="Digite o nome..."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && orgName.trim() && handleNameContinue()}
            />
            <PrimaryButton onClick={handleNameContinue} disabled={!orgName.trim()}>
              Continuar <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
            <BackButton onClick={() => animateTo("type", () => { setOrgType(null); setOrgName(""); })} />
          </div>
        )}

        {/* ── STEP: ADMIN AUTH ── */}
        {step === "admin-auth" && (
          <form onSubmit={handleAdminSignup} className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Crie sua conta de administrador</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>
                Você gerenciará o workspace {orgName.trim()}
              </p>
            </div>

            <InputField id="admin-email" label="Email" type="email" placeholder="email@empresa.com"
              value={adminEmail} onChange={setAdminEmail} autoFocus />

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" style={dmSans}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="gold-input-focus w-full h-10 rounded-[10px] px-3 pr-10 text-sm"
                  style={dmSans}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {adminPassword.length > 0 && (
                <div className="space-y-1 pt-1">
                  {passwordRules.map((r) => {
                    const ok = r.test(adminPassword);
                    return (
                      <div key={r.label} className="flex items-center gap-1.5 text-xs" style={dmSans}>
                        {ok ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#F5A623" }} />
                          : <XCircle className="h-3.5 w-3.5" style={{ color: "#f87171" }} />}
                        <span style={{ color: ok ? "#F5A623" : "#f87171" }}>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <InputField id="admin-confirm" label="Confirmar senha" type="password" placeholder="••••••••••"
              value={adminConfirm} onChange={setAdminConfirm} />
            {adminConfirm.length > 0 && !adminPasswordsMatch && (
              <p className="text-xs" style={{ color: "#f87171", ...dmSans }}>As senhas não coincidem.</p>
            )}

            <ErrorBanner error={error} />

            <PrimaryButton type="submit" disabled={loading || !allAdminRulesPass || !adminPasswordsMatch || !adminEmail}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar conta
            </PrimaryButton>
            <BackButton onClick={() => animateTo("name")} />
          </form>
        )}

        {/* ── STEP: ACCESS CODE (Etapa 1) ── */}
        {step === "access-code" && (
          <div className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Digite o código de acesso</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>Peça o código ao administrador do workspace</p>
            </div>
            <input
              type="text"
              maxLength={36}
              placeholder="Cole o código aqui"
              value={accessCode}
              onChange={(e) => { setAccessCode(e.target.value.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 36)); setError(""); }}
              autoFocus
              className="gold-input-focus w-full h-16 rounded-[10px] px-3 text-lg font-mono tracking-widest text-center uppercase"
              style={dmSans}
              onKeyDown={(e) => e.key === "Enter" && accessCode.length >= 4 && handleAccessCodeContinue()}
            />
            <ErrorBanner error={error} />
            <PrimaryButton onClick={handleAccessCodeContinue} disabled={accessCode.length < 4 || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continuar <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
            <BackButton onClick={() => animateTo("choose")} />
          </div>
        )}

        {/* ── STEP: JOIN AUTH (Etapa 2 — nome de usuário + senha) ── */}
        {step === "join-auth" && (
          <form onSubmit={handleJoinSignup} className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Crie sua conta</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>
                Entrando em {joinWsName}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" style={dmSans}>Nome de usuário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" style={dmSans}>@</span>
                <input
                  type="text"
                  placeholder="seunome"
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  autoFocus
                  className="gold-input-focus w-full h-10 rounded-[10px] pl-7 pr-3 text-sm"
                  style={dmSans}
                />
              </div>
              <p className="text-xs text-white/35 leading-relaxed" style={dmSans}>
                Coloque seu nome_sobrenome. <strong className="text-white/50">Guarde-o bem</strong>, pois você precisará dele para entrar novamente.
              </p>
              {joinUsername.length > 0 && !usernameValid && (
                <p className="text-xs" style={{ color: "#f87171", ...dmSans }}>Mínimo 3 caracteres (letras, números, _)</p>
              )}
            </div>

            <InputField id="join-pass" label="Senha (mín. 8 caracteres)" type="password" placeholder="••••••••"
              value={joinPassword} onChange={setJoinPassword} />

            <ErrorBanner error={error} />

            <PrimaryButton type="submit" disabled={loading || !usernameValid || joinPassword.length < 8}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Solicitar acesso
            </PrimaryButton>
            <BackButton onClick={() => animateTo("access-code")} />
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

// ---- Reusable sub-components ----

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn-gold-shimmer w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold ${props.className || ""}`}
      style={{ fontFamily: "'DM Sans', sans-serif", WebkitTapHighlightColor: "transparent", ...props.style }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block mx-auto text-xs hover:underline transition-all"
      style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5A623" }}
    >
      ← Voltar
    </button>
  );
}

function InputField({ id, label, value, onChange, autoFocus, ...props }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  autoFocus?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        className="gold-input-focus w-full h-10 rounded-[10px] px-3 text-sm"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        {...props}
      />
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div
      className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
      style={{
        background: "rgba(239,68,68,0.15)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "#f87171",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error}
    </div>
  );
}

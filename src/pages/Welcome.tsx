import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Briefcase, Globe, ArrowRight, UserPlus, Users,
  ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff, Lock,
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
  | "ws-password"
  | "admin-auth"
  | "join-form";

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
  choose: 0, type: 1, name: 2, "ws-password": 3, "admin-auth": 4,
  "join-form": 1,
};

export default function Welcome() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("choose");
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | "none">("none");

  // Create workspace flow
  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [orgName, setOrgName] = useState("");
  const [wsPassword, setWsPassword] = useState("");

  // Admin auth
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Join workspace flow
  const [joinWsName, setJoinWsName] = useState("");
  const [joinWsPassword, setJoinWsPassword] = useState("");
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

  // ---- CREATE FLOW ----
  const handleSelectType = (t: OrgType) => animateTo("name", () => setOrgType(t));

  const handleNameContinue = () => {
    if (!orgType || !orgName.trim()) return;
    animateTo("ws-password");
  };

  const handleWsPasswordContinue = () => {
    if (!wsPassword.trim()) return;
    localStorage.setItem("onboardingType", orgType!);
    localStorage.setItem("onboardingName", orgName.trim());
    localStorage.setItem("onboardingPassword", wsPassword.trim());
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
          await (supabase as any).rpc("create_workspace_with_membership", {
            _type: orgType || "ej",
            _name: orgName.trim(),
            _password: wsPassword.trim(),
          });
        } catch (wsErr) {
          console.error("Workspace creation error:", wsErr);
        }
        localStorage.removeItem("onboardingPassword");
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
  const usernameValid = /^[a-z0-9_]{3,}$/.test(joinUsername);

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWsName.trim() || !joinWsPassword.trim() || !usernameValid || joinPassword.length < 8) return;
    setError("");
    setLoading(true);
    joiningRef.current = true;
    try {
      const shortId = joinWsName.trim().replace(/\s+/g, "").slice(0, 8).toLowerCase();
      const fakeEmail = `${joinUsername}__${shortId}@member.dashbuzz.app`;

      // Check if user already exists
      const { data: existingEmail } = await supabase.rpc("get_email_by_username", {
        p_username: joinUsername,
      });

      if (existingEmail) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: existingEmail as string,
          password: joinPassword,
        });
        if (loginErr) {
          joiningRef.current = false;
          setError("Senha do usuário incorreta. Tente novamente.");
          setLoading(false);
          return;
        }
      } else {
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

      // Join workspace via RPC (validates password server-side)
      const { data: result } = await (supabase as any).rpc("join_workspace", {
        p_workspace_name: joinWsName.trim(),
        p_workspace_password: joinWsPassword.trim(),
      });
      const r = result as any;

      if (r?.error === "workspace_not_found") {
        joiningRef.current = false;
        setError("Workspace não encontrado. Verifique o nome.");
        setLoading(false);
        return;
      }
      if (r?.error === "wrong_password") {
        joiningRef.current = false;
        setError("Senha do workspace incorreta.");
        setLoading(false);
        return;
      }

      // Success — joined or already_member
      if (r?.workspace_id) {
        localStorage.setItem("targetWorkspaceId", r.workspace_id);
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      joiningRef.current = false;
      setError(err.message || "Erro ao acessar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ---- HEADLINE ----
  const headline = (() => {
    if (step === "admin-auth" || step === "ws-password") return orgName.trim() || "DASHBUZZ";
    if (step === "name" && orgName.trim() && orgType) {
      const prefix = labels[orgType].prefix;
      return `${prefix ? prefix + " " : ""}${orgName.trim()}`;
    }
    if (step === "join-form" && joinWsName) return joinWsName;
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
                sub: "Crie e defina uma senha de acesso",
                action: () => animateTo("type"),
              },
              {
                icon: Users,
                title: "Entrar em um workspace",
                sub: "Use o nome e senha do workspace",
                action: () => animateTo("join-form"),
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

        {/* ── STEP: WORKSPACE PASSWORD ── */}
        {step === "ws-password" && (
          <div className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Defina a senha do workspace</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>
                Membros usarão esta senha para entrar em {orgName.trim()}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" style={dmSans}>Senha do workspace</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Ex: minha-organizacao-2024"
                  value={wsPassword}
                  onChange={(e) => setWsPassword(e.target.value)}
                  autoFocus
                  className="gold-input-focus w-full h-10 rounded-[10px] pl-9 pr-3 text-sm"
                  style={dmSans}
                  onKeyDown={(e) => e.key === "Enter" && wsPassword.trim() && handleWsPasswordContinue()}
                />
              </div>
              <p className="text-xs text-white/35 leading-relaxed" style={dmSans}>
                Escolha algo fácil de compartilhar com sua equipe.
              </p>
            </div>
            <PrimaryButton onClick={handleWsPasswordContinue} disabled={!wsPassword.trim()}>
              Continuar <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
            <BackButton onClick={() => animateTo("name")} />
          </div>
        )}

        {/* ── STEP: ADMIN AUTH ── */}
        {step === "admin-auth" && (
          <form onSubmit={handleAdminSignup} className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Crie sua conta</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>
                Workspace: {orgName.trim()}
              </p>
            </div>

            <InputField id="admin-email" label="Email" type="email" placeholder="email@empresa.com"
              value={adminEmail} onChange={setAdminEmail} autoFocus />

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" style={dmSans}>Senha da conta</label>
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
            <BackButton onClick={() => animateTo("ws-password")} />
          </form>
        )}

        {/* ── STEP: JOIN FORM (nome do workspace + senha + criar conta) ── */}
        {step === "join-form" && (
          <form onSubmit={handleJoinWorkspace} className="glass-card-auth p-6 space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-white" style={dmSans}>Entrar em um workspace</p>
              <p className="text-xs text-white/40 mt-1" style={dmSans}>
                Peça o nome e a senha ao responsável
              </p>
            </div>

            <InputField id="join-ws-name" label="Nome do workspace" type="text" placeholder="Nome exato do workspace"
              value={joinWsName} onChange={setJoinWsName} autoFocus />

            <InputField id="join-ws-pass" label="Senha do workspace" type="password" placeholder="Senha de acesso"
              value={joinWsPassword} onChange={setJoinWsPassword} />

            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3" style={dmSans}>Seus dados de acesso pessoal:</p>

              <div className="space-y-2 mb-3">
                <label className="text-sm font-medium text-white/70" style={dmSans}>Nome de usuário</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" style={dmSans}>@</span>
                  <input
                    type="text"
                    placeholder="seunome"
                    value={joinUsername}
                    onChange={(e) => setJoinUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="gold-input-focus w-full h-10 rounded-[10px] pl-7 pr-3 text-sm"
                    style={dmSans}
                  />
                </div>
                <p className="text-xs text-white/35 leading-relaxed" style={dmSans}>
                  Use nome_sobrenome. <strong className="text-white/50">Guarde-o bem</strong> para entrar novamente.
                </p>
                {joinUsername.length > 0 && !usernameValid && (
                  <p className="text-xs" style={{ color: "#f87171", ...dmSans }}>Mínimo 3 caracteres (letras, números, _)</p>
                )}
              </div>

              <InputField id="join-pass" label="Sua senha pessoal (mín. 8 caracteres)" type="password" placeholder="••••••••"
                value={joinPassword} onChange={setJoinPassword} />
            </div>

            <ErrorBanner error={error} />

            <PrimaryButton type="submit" disabled={loading || !usernameValid || joinPassword.length < 8 || !joinWsName.trim() || !joinWsPassword.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Entrar no workspace
            </PrimaryButton>
            <BackButton onClick={() => animateTo("choose")} />
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

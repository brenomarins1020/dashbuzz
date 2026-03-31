import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Briefcase, Globe, ArrowRight, UserPlus, LogIn,
  ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type OrgType = "atletica" | "ej" | "outros";
type Step = "choose" | "type" | "name" | "admin-auth";

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

  // Admin auth
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
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

  // ---- HEADLINE ----
  const headline = (() => {
    if (step === "admin-auth") return orgName.trim() || "DASHBUZZ";
    if (step === "name" && orgName.trim() && orgType) {
      const prefix = labels[orgType].prefix;
      return `${prefix ? prefix + " " : ""}${orgName.trim()}`;
    }
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

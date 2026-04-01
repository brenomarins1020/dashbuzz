import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { FloatingBackground } from "@/components/FloatingBackground";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { MarketingCalendar } from "@/components/MarketingCalendar";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded panels

const SettingsPanel = lazy(() => import("@/components/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const PublicacoesPanel = lazy(() => import("@/components/PublicacoesPanel").then(m => ({ default: m.PublicacoesPanel })));
const DadosDashboard = lazy(() => import("@/components/DadosDashboard").then(m => ({ default: m.DadosDashboard })));
const CompromissosPanel = lazy(() => import("@/components/CompromissosPanel").then(m => ({ default: m.CompromissosPanel })));
const AttendancePanel = lazy(() => import("@/components/attendance").then(m => ({ default: m.AttendancePanel })));
const BackupPanel = lazy(() => import("@/components/BackupPanel").then(m => ({ default: m.BackupPanel })));
const TrashPanel = lazy(() => import("@/components/TrashPanel").then(m => ({ default: m.TrashPanel })));
const AdminAnnouncementsPanel = lazy(() => import("@/components/AdminAnnouncementsPanel").then(m => ({ default: m.AdminAnnouncementsPanel })));
const WorkspaceConfigPanel = lazy(() => import("@/components/WorkspaceConfigPanel").then(m => ({ default: m.WorkspaceConfigPanel })));
const InicioPanel = lazy(() => import("@/components/InicioPanel").then(m => ({ default: m.InicioPanel })));
// WhatsappAgente removed — file not available in production build
const TasksPanelNew = lazy(() => import("@/components/TasksPanelNew").then(m => ({ default: m.TasksPanelNew })));
const MembersPanel = lazy(() => import("@/components/MembersPanel").then(m => ({ default: m.MembersPanel })));

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CalendarDays, LayoutDashboard, Settings, BookOpen, BarChart3, ClipboardCheck, Trash2, LogOut, ChevronDown, User, Users, ListChecks, Home } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type View = "inicio" | "calendar" | "settings" | "publicacoes" | "dados" | "compromissos" | "trash" | "presencas" | "tarefas";

const NAV_CENTER: { view: View; icon: React.ElementType; label: string } = {
  view: "calendar", icon: CalendarDays, label: "Calendário",
};

// MOBILE_NAV and MOBILE_SIDEBAR_WIDTH removed — using MobileBottomNav component

const ALL_DESKTOP_NAV = [
  { view: "inicio" as View, icon: Home, label: "Início" },
  NAV_CENTER,
  { view: "publicacoes" as View, icon: BookOpen, label: "Mídia" },
  { view: "tarefas" as View, icon: ListChecks, label: "Tarefas" },
  { view: "compromissos" as View, icon: ClipboardCheck, label: "Compromissos" },
  { view: "dados" as View, icon: BarChart3, label: "Dados" },
];

const VIEW_LABELS: Record<View, string> = {
  inicio: "Início",
  calendar: "Calendário",
  publicacoes: "Mídia",
  tarefas: "Tarefas",
  compromissos: "Compromissos",
  dados: "Dados",
  presencas: "Gestão",
  settings: "Configurações",
  trash: "Lixeira",
};
const VALID_VIEWS: View[] = ["inicio", "calendar", "publicacoes", "tarefas", "compromissos", "dados", "presencas", "settings"];

// Module-level splash flag — persists in memory across tab switches
let _splashAlreadyShown = false;

function hasSplashBeenShown(): boolean {
  if (_splashAlreadyShown) return true;
  try {
    const ts = localStorage.getItem("dashbuzz_splash_ts");
    if (ts) {
      const age = Date.now() - parseInt(ts, 10);
      if (age < 8 * 60 * 60 * 1000) return true;
    }
  } catch {}
  return false;
}

function markSplashShown() {
  _splashAlreadyShown = true;
  try {
    localStorage.setItem("dashbuzz_splash_ts", String(Date.now()));
  } catch {}
}

function PanelSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-6 w-40 bg-muted/40 rounded-lg" />
      <div className="h-4 w-56 bg-muted/30 rounded-lg" />
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 w-full bg-muted/20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

const Index = () => {
  const [view, setView] = useState<View>("inicio");
  const alreadyShown = hasSplashBeenShown();
  const [splashDone, setSplashDone] = useState(alreadyShown);
  const [appReady, setAppReady] = useState(alreadyShown);
  const [contentVisible, setContentVisible] = useState(alreadyShown);
  const rafRef = useRef<number>();

  const [visitedViews, setVisitedViews] = useState<Set<View>>(() => {
    const initial = new Set<View>(["inicio"]);
    try {
      const saved = localStorage.getItem("dashbuzz_last_view");
      if (VALID_VIEWS.includes(saved as View)) initial.add(saved as View);
    } catch {}
    return initial;
  });

  const changeView = useCallback((v: View) => {
    setView(v);
    setVisitedViews(prev => prev.has(v) ? prev : new Set([...prev, v]));
    try { localStorage.setItem("dashbuzz_last_view", v); } catch {}
  }, []);

  const prefetchView = useCallback((v: View) => {
    setVisitedViews(prev => prev.has(v) ? prev : new Set([...prev, v]));
  }, []);

  // Mobile nav removed — using MobileBottomNav component

  // Sliding pill refs & state — desktop
  const desktopNavRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const desktopNavRef = useRef<HTMLElement>(null);
  const [desktopIndicator, setDesktopIndicator] = useState({ left: 0, width: 0, ready: false });

  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, workspaceId, workspaceName } = useWorkspace();

  // Display name logic for synthetic emails
  const isMemberEmail = user?.email?.includes("@member.dashbuzz.app");
  const dn = user?.user_metadata?.display_name;
  const accountDisplay = isMemberEmail
    ? `@${user?.email?.split("__")[0]}`
    : user?.email || "";
  const displayName = dn
    ? `@${dn}`
    : isMemberEmail
    ? `@${user?.email?.split("__")[0] || "usuário"}`
    : user?.email?.split("@")[0] || "Conta";


  const loading = false;

  const handleSplashFinished = useCallback(() => {
    markSplashShown();
    setSplashDone(true);
  }, []);


  useEffect(() => {
    if (splashDone && !loading) {
      setAppReady(true);
    }
  }, [splashDone, loading]);


  // Measure desktop sliding pill
  const measureDesktopIndicator = useCallback(() => {
    // Now includes settings
    const el = desktopNavRefs.current[view];
    if (el && desktopNavRef.current) {
      const parentRect = desktopNavRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setDesktopIndicator({
        left: elRect.left - parentRect.left,
        width: elRect.width,
        ready: true,
      });
    } else {
      setDesktopIndicator(prev => ({ ...prev, width: 0, ready: prev.ready }));
    }
  }, [view]);

  useEffect(() => {
    if (!contentVisible) return;
    measureDesktopIndicator();
  }, [view, contentVisible, measureDesktopIndicator]);

  // ResizeObserver to track active item size changes (scale animation)
  useEffect(() => {
    if (!contentVisible) return;
    const el = desktopNavRefs.current[view];
    if (!el) return;
    const ro = new ResizeObserver(() => measureDesktopIndicator());
    ro.observe(el);
    return () => ro.disconnect();
  }, [view, contentVisible, measureDesktopIndicator]);

  useEffect(() => {
    if (!contentVisible) return;
    window.addEventListener("resize", measureDesktopIndicator);
    return () => window.removeEventListener("resize", measureDesktopIndicator);
  }, [contentVisible, measureDesktopIndicator]);

  useEffect(() => {
    if (appReady) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setContentVisible(true);
        });
      });
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [appReady]);

  if (!splashDone) {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  if (!appReady) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="min-h-screen" style={{ background: "transparent" }}>
      <FloatingBackground />
      {/* Desktop header */}
      <header
        className="sticky top-0 z-50 hidden md:block"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%), #0f172a",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + brand */}
            <div className="flex-1 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg border-2 border-amber-500/70 flex items-center justify-center">
                <LayoutDashboard className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none tracking-[0.2em] uppercase text-white font-heading">
                  {workspaceName || "PROJEC"}
                </h1>
                <p className="text-[10px] mt-0.5 tracking-[0.12em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Marketing Dashboard
                </p>
              </div>
            </div>

            {/* Center: Nav menu */}
            <nav ref={desktopNavRef} className="flex-1 flex items-center justify-center relative">
              {/* Sliding indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 bg-amber-500 rounded-lg pointer-events-none z-0"
                style={{
                  left: desktopIndicator.left,
                  width: desktopIndicator.width,
                  height: "100%",
                  opacity: desktopIndicator.ready && desktopIndicator.width > 0 ? 1 : 0,
                  boxShadow: "0 0 20px rgba(245,158,11,0.35)",
                  transition: desktopIndicator.ready
                    ? "left 120ms cubic-bezier(0.4,0.0,0.2,1), width 120ms cubic-bezier(0.4,0.0,0.2,1), opacity 80ms ease"
                    : "none",
                }}
              />
              {ALL_DESKTOP_NAV.map((item) => {
                const isActive = view === item.view;
                return (
                  <button
                    key={item.view}
                    ref={(el) => { desktopNavRefs.current[item.view] = el; }}
                    onClick={() => changeView(item.view)}
                    onMouseEnter={() => prefetchView(item.view)}
                    className="relative z-10 flex items-center gap-1.5 rounded-lg tracking-[0.08em] uppercase font-heading px-4 py-2.5"
                    style={{
                      fontSize: isActive ? "0.9rem" : "0.8rem",
                      fontWeight: isActive ? 700 : 600,
                      transform: isActive ? "scale(1.08)" : "scale(1)",
                      color: isActive ? "rgb(15,23,42)" : "rgba(255,255,255,0.55)",
                      transition: "transform 120ms cubic-bezier(0.4,0,0.2,1), font-size 120ms cubic-bezier(0.4,0,0.2,1)",
                      transformOrigin: "center center",
                    }}
                  >
                    <item.icon className="h-[18px] w-[18px]" style={{ color: "inherit" }} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right: Gestão + Config */}
            <div className="flex-1 flex items-center justify-end">
              <div className="h-6 mx-4" style={{ borderLeft: "1px solid rgba(255,255,255,0.12)" }} />
              {isAdmin && (
                <button
                  ref={(el) => { desktopNavRefs.current["presencas"] = el; }}
                  onClick={() => changeView("presencas")}
                  onMouseEnter={() => prefetchView("presencas")}
                  className={cn(
                    "relative z-10 flex items-center gap-1.5 rounded-lg tracking-[0.08em] uppercase font-heading px-3 py-2.5",
                    view === "presencas"
                      ? "text-slate-900 font-bold"
                      : "font-semibold hover:text-white/85"
                  )}
                  style={{
                    fontSize: "0.8rem",
                    transform: view === "presencas" ? "scale(1.08)" : "scale(1)",
                    transition: "transform 120ms cubic-bezier(0.4,0.0,0.2,1), color 80ms ease",
                    transformOrigin: "center center",
                    ...(view !== "presencas" ? { color: "rgba(255,255,255,0.5)" } : {}),
                  }}
                >
                  <Users className="h-[18px] w-[18px]" />
                  Gestão
                </button>
              )}
              {isAdmin && (
                <button
                  ref={(el) => { desktopNavRefs.current["settings"] = el; }}
                  onClick={() => changeView("settings")}
                  className={cn(
                    "relative z-10 flex items-center gap-1.5 rounded-lg tracking-[0.08em] uppercase font-heading px-3 py-2.5",
                    view === "settings"
                      ? "text-slate-900 font-bold"
                      : "font-semibold hover:text-white/85"
                  )}
                  style={{
                    fontSize: "0.8rem",
                    transform: view === "settings" ? "scale(1.08)" : "scale(1)",
                    transition: "transform 120ms cubic-bezier(0.4,0.0,0.2,1), color 80ms ease",
                    transformOrigin: "center center",
                    ...(view !== "settings" ? { color: "rgba(255,255,255,0.5)" } : {}),
                  }}
                >
                  <Settings className="h-[18px] w-[18px]" />
                  Config
                </button>
              )}

              {/* User name + popover for all users */}
              <div className="h-6 mx-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.12)" }} />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <User className="h-4 w-4 text-white/50" />
                    <span className="text-[13px] font-medium text-white/70 truncate max-w-[120px]">
                      {displayName}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        admin
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2" sideOffset={8}>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 py-1 truncate">
                      {accountDisplay}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={signOut}
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive h-9"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header + bottom nav */}
      <MobileHeader viewTitle={VIEW_LABELS[view]} />
      <MobileBottomNav view={view} changeView={changeView} isAdmin={isAdmin} onSignOut={signOut} />

      {/* Main content */}
      <main
        className={cn(
          "relative z-10 mx-auto px-4 pt-[56px] pb-[72px] md:pt-4 md:pb-4 md:px-6 md:py-10 space-y-6 md:space-y-8 overflow-x-hidden max-w-full",
          view === "calendar" ? "" : "md:max-w-7xl md:px-10"
        )}
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
          willChange: contentVisible ? "auto" : "opacity, transform",
        }}
      >
        
        {/* Persistent panels — stay mounted once visited, hidden via CSS */}
        <div style={{ display: view === "inicio" ? "block" : "none" }}>
          {visitedViews.has("inicio") && (
            <Suspense fallback={<PanelSkeleton />}>
              <InicioPanel changeView={changeView} />
            </Suspense>
          )}
        </div>
        {view === "calendar" && (
            <MarketingCalendar />
        )}
        <div style={{ display: view === "publicacoes" ? "block" : "none" }}>
          {visitedViews.has("publicacoes") && <Suspense fallback={<PanelSkeleton />}><PublicacoesPanel /></Suspense>}
        </div>
        <div style={{ display: view === "tarefas" ? "block" : "none" }}>
          {visitedViews.has("tarefas") && <Suspense fallback={<PanelSkeleton />}><TasksPanelNew /></Suspense>}
        </div>
        <div style={{ display: view === "dados" ? "block" : "none" }}>
          {visitedViews.has("dados") && <Suspense fallback={<PanelSkeleton />}><DadosDashboard /></Suspense>}
        </div>
        <div style={{ display: view === "compromissos" ? "block" : "none" }}>
          {visitedViews.has("compromissos") && <Suspense fallback={<PanelSkeleton />}><CompromissosPanel /></Suspense>}
        </div>
        <div style={{ display: view === "presencas" ? "block" : "none" }}>
          {visitedViews.has("presencas") && <Suspense fallback={<PanelSkeleton />}><AttendancePanel /></Suspense>}
        </div>
        {view === "settings" && (
          <Suspense fallback={<PanelSkeleton />}>
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Configurações</h2>
                <p className="text-sm text-muted-foreground mt-1">Gerencie preferências e dados do app.</p>
              </div>
              {isAdmin && <MembersPanel />}
              <SettingsPanel theme={theme} toggleTheme={toggleTheme} />
              {isAdmin && <WorkspaceConfigPanel />}
              {isAdmin && <AdminAnnouncementsPanel />}
              <BackupPanel />
              {/* Lixeira collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-accent" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Lixeira</p>
                      <p className="text-xs text-muted-foreground">Itens excluídos expiram após 30 dias</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                   <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0">
                    <TrashPanel />
                  </div>
                </CollapsibleContent>
              </Collapsible>
              {/* Conta collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-accent" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Conta</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{accountDisplay}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{accountDisplay}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Conectado</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={signOut} className="gap-2 text-destructive hover:text-destructive">
                        <LogOut className="h-4 w-4" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default Index;

import { useState } from "react";
import { CalendarDays, ListChecks, BookOpen, BarChart3, Menu, ClipboardCheck, Settings, ChevronRight, Users, LogOut } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type View = "calendar" | "settings" | "publicacoes" | "dados" | "compromissos" | "trash" | "presencas" | "tarefas";

const TABS = [
  { view: "calendar" as View, icon: CalendarDays, label: "Início" },
  { view: "tarefas" as View, icon: ListChecks, label: "Tarefas" },
  { view: "publicacoes" as View, icon: BookOpen, label: "Mídia" },
  { view: "dados" as View, icon: BarChart3, label: "Dados" },
] as const;

const MORE_VIEWS: View[] = ["compromissos", "presencas", "settings"];

interface MobileBottomNavProps {
  view: View;
  changeView: (v: View) => void;
  pendingCount?: number;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

export function MobileBottomNav({ view, changeView, pendingCount = 0, isAdmin = false, onSignOut }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_VIEWS.includes(view);
  const activeColor = "#F59E0B";
  const inactiveColor = "rgba(255,255,255,0.45)";

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 z-50 flex md:hidden w-[100vw]"
        style={{
          background: "#0f172a",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: 56,
          maxWidth: "100vw",
          overflow: "hidden",
        }}
      >
        {TABS.map((tab) => {
          const isActive = view === tab.view;
          return (
            <button
              key={tab.view}
              onClick={() => changeView(tab.view)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ color: isActive ? activeColor : inactiveColor, WebkitTapHighlightColor: "transparent" }}
            >
              <tab.icon className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <button
              aria-label="Mais opções"
              aria-current={isMoreActive ? "page" : undefined}
              aria-expanded={moreOpen}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              style={{ color: isMoreActive ? activeColor : inactiveColor, WebkitTapHighlightColor: "transparent" }}
            >
              <div className="relative">
                <Menu className="h-[22px] w-[22px]" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="pb-8">
            <div className="px-4 pt-2 pb-4">
              <p className="text-sm font-medium text-foreground mb-3">Menu</p>
              <div className="space-y-1">
                {/* Compromissos — todos veem */}
                <button
                  onClick={() => { setMoreOpen(false); changeView("compromissos"); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/50 transition-colors"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1 text-left">Compromissos</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>

                {/* Gestão — só admin */}
                {isAdmin && (
                  <button
                    onClick={() => { setMoreOpen(false); changeView("presencas"); }}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/50 transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1 text-left">Gestão</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </button>
                )}

                {/* Configurações — todos veem */}
                <button
                  onClick={() => { setMoreOpen(false); changeView("settings"); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/50 transition-colors"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1 text-left">Configurações</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>

                <Separator className="my-2" />

                {/* Sair — todos veem */}
                <button
                  onClick={() => { setMoreOpen(false); onSignOut?.(); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors text-destructive hover:bg-destructive/10"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium flex-1 text-left">Sair</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </nav>
    </>
  );
}

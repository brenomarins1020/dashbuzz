import { LayoutDashboard, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

interface MobileHeaderProps {
  viewTitle?: string;
}

export function MobileHeader({ viewTitle }: MobileHeaderProps) {
  const { user, signOut } = useAuth();
  const { workspaceName, isAdmin } = useWorkspace();

  const dn = user?.user_metadata?.display_name;
  const isMember = user?.email?.includes("@member.dashbuzz.app");
  const displayName = dn ? `@${dn}` : isMember ? user?.email?.split("__")[0] || "Usuário" : user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:hidden"
      style={{
        height: 52,
        background: "#0f172a",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Left: Logo + workspace name + current view */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-md border-2 border-amber-500/70 flex items-center justify-center shrink-0">
          <LayoutDashboard className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[11px] font-bold leading-none tracking-[0.15em] uppercase text-white truncate max-w-[140px]">
            {viewTitle || workspaceName || "PROJEC"}
          </h1>
          <p className="text-[9px] mt-0.5 tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
            {viewTitle ? (workspaceName || "Marketing Dashboard") : "Marketing Dashboard"}
          </p>
        </div>
      </div>

      {/* Right: User name + badge */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg -mr-1" style={{ WebkitTapHighlightColor: "transparent" }}>
            <span className="text-[11px] font-medium text-white/70 truncate max-w-[80px]">
              {displayName}
            </span>
            {isAdmin && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                admin
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-2" sideOffset={8}>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1 truncate">
              {isMember
                ? (dn ? `@${dn}` : `@${user?.email?.split("__")[0] || "usuário"}`)
                : user?.email}
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
    </header>
  );
}

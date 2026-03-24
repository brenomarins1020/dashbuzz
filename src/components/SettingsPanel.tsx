import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SettingsPanelProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export function SettingsPanel({ theme, toggleTheme }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          {theme === "dark" ? <Moon className="h-5 w-5 text-accent" /> : <Sun className="h-5 w-5 text-accent" />}
          <div className="text-left">
            <p className="text-sm font-semibold">Modo Escuro</p>
            <p className="text-xs text-muted-foreground">{theme === "dark" ? "Ativado" : "Desativado"}</p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-xl px-5 py-4 -mt-2 pt-6 border-t-0">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-sm cursor-pointer">
              Alternar tema
            </Label>
            <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { useWorkspace } from "@/hooks/useWorkspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserPlus, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";

export function InvitePanel() {
  const { joinCode } = useWorkspace();

  const handleCopy = () => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
    toast.success("Código copiado!");
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Convidar membros</p>
            <p className="text-xs text-muted-foreground">Compartilhe o código de acesso ao workspace</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0">
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-3">Código do workspace</p>
            <p className="text-5xl font-mono font-bold tracking-[0.3em] text-accent">
              {joinCode || "----"}
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Compartilhe este código com quem você quer convidar para o workspace.
            </p>
            <button
              onClick={handleCopy}
              disabled={!joinCode}
              className="mt-3 h-8 px-4 rounded-full border border-border text-xs hover:bg-muted transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50"
            >
              <Copy className="h-3 w-3" />
              Copiar código
            </button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

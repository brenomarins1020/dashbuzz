import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserPlus, ChevronDown, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = "https://dashbuz.lovable.app";

export function InvitePanel() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [copied, setCopied] = useState(false);

  const { data: inviteToken, isLoading } = useQuery({
    queryKey: ["workspace-invite-token", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      // Cada workspace tem seu próprio invite_token único.
      // Este link é exclusivo para o workspace [workspaceId].
      const { data } = await supabase
        .from("workspaces")
        .select("invite_token")
        .eq("id", workspaceId!)
        .single();
      return (data as any)?.invite_token as string | null;
    },
  });

  const fullLink = inviteToken ? `${BASE_URL}/invite?token=${inviteToken}` : "";

  const handleCopy = () => {
    if (!fullLink) return;
    navigator.clipboard.writeText(fullLink);
    toast.success("Link copiado!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full glass-card rounded-2xl p-4 hover:bg-amber-500/[0.04] transition-colors duration-150">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold">Convidar membros</p>
            <p className="text-xs text-muted-foreground">Compartilhe o link de acesso ao workspace</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-card rounded-b-2xl px-5 py-4 -mt-2 pt-6 border-t-0 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-bold text-foreground leading-snug">
                Entre na comunidade de: {workspaceName || "DashBuzz"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Veja quem está fazendo as tarefas, quem está indo nas reuniões, e veja o que o marketing está fazendo, tudo em um só lugar.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-8 rounded-lg border border-border bg-background px-3 flex items-center overflow-hidden">
                  <span className="text-xs text-muted-foreground truncate">
                    {fullLink || "—"}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  disabled={!fullLink}
                  aria-label="Copiar link de convite"
                  className={`h-8 px-3 rounded-lg border transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 ${
                    copied
                      ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 pt-1">
                Link permanente e exclusivo deste workspace.
              </p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

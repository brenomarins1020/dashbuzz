import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = "https://dashbuz.lovable.app";

export function InvitePopover() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [open, setOpen] = useState(false);

  const { data: inviteToken, isLoading } = useQuery({
    queryKey: ["workspace-invite-token", workspaceId],
    enabled: !!workspaceId && open,
    queryFn: async () => {
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
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="relative z-10 flex items-center gap-1.5 rounded-lg tracking-[0.08em] uppercase font-heading px-3 py-2.5 font-semibold hover:text-white/85"
              style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", transition: "color 80ms ease" }}
            >
              <Link2 className="h-[18px] w-[18px]" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Convidar para o workspace</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
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
                  className="h-8 px-3 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

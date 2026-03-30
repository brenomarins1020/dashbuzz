import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, Copy } from "lucide-react";
import { toast } from "sonner";

export function InvitePopover() {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("get_my_workspace_join_code" as any)
      .then(({ data }) => { if (data) setJoinCode(data as string); });
  }, []);

  const handleCopy = () => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
    toast.success("Código copiado!");
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
      <PopoverContent className="w-64" align="end">
        <div className="text-center py-2 space-y-2">
          <p className="text-xs text-muted-foreground">Código do workspace</p>
          <p className="text-4xl font-mono font-bold tracking-[0.3em] text-accent">
            {joinCode || "----"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Compartilhe este código com quem você quer convidar.
          </p>
          <button
            onClick={handleCopy}
            disabled={!joinCode}
            className="mt-1 h-8 px-4 rounded-full border border-border text-xs hover:bg-muted transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50"
          >
            <Copy className="h-3 w-3" />
            Copiar código
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

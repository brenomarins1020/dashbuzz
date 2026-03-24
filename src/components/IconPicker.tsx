import { FIXED_ICONS, getIconDef } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
}

export function IconPicker({ value, onChange, size = "sm" }: IconPickerProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-1">
        {FIXED_ICONS.map((def) => {
          const Icon = def.icon;
          const selected = value === def.key;
          return (
            <Tooltip key={def.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(def.key)}
                  className={cn(
                    "rounded-full flex items-center justify-center border transition-all",
                    btnSize,
                    selected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  )}
                  style={selected ? { color: def.color } : undefined}
                >
                  <Icon className={iconSize} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{def.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

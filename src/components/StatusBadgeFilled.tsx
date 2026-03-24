import { cn } from "@/lib/utils";

export function StatusBadgeFilled({ status, className, color }: { status: string; className?: string; color?: string }) {
  // Use color if provided, otherwise use semantic tokens for known statuses
  const lowerStatus = status.toLowerCase();

  const KNOWN_STYLES: Record<string, string> = {
    publicada: "bg-green-500/[0.12] text-green-600 border border-green-500/20",
    pronto: "bg-blue-500/[0.12] text-blue-600 border border-blue-500/20",
    "em andamento": "bg-amber-500/[0.12] text-amber-700 border border-amber-500/20",
    "não começada": "bg-slate-400/[0.12] text-slate-500 border border-slate-400/20",
    atrasado: "bg-red-500/[0.12] text-red-600 border border-red-500/20",
  };

  const knownStyle = KNOWN_STYLES[lowerStatus];
  const style = color
    ? { backgroundColor: color + "1F", color: color, borderColor: color + "33" }
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-[0.05em] whitespace-nowrap border",
        !color && (knownStyle || "bg-muted text-muted-foreground border-border"),
        className
      )}
      style={style}
    >
      {status}
    </span>
  );
}

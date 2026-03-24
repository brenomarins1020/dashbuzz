import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentStatus, ContentType, ContentCategory } from "@/data/mockData";

export function StatusBadge({ status }: { status: ContentStatus }) {
  const styles: Record<ContentStatus, string> = {
    "Publicada": "bg-status-published/10 text-status-published border-status-published/20",
    "Não Começado": "bg-muted text-muted-foreground border-border",
    "Em Andamento": "bg-status-in-progress/15 text-status-in-progress-foreground border-status-in-progress/30",
  };

  return (
    <Badge variant="outline" className={cn("font-medium text-[10px] uppercase tracking-wide", styles[status])}>
      {status}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: ContentType }) {
  const styles: Record<string, string> = {
    "Instagram": "bg-primary/10 text-primary border-primary/20",
    "Blog": "bg-accent/15 text-accent-foreground border-accent/30",
  };

  return (
    <Badge variant="outline" className={cn("font-medium text-[10px] uppercase tracking-wide", styles[type] || "bg-muted text-muted-foreground")}>
      {type}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: ContentCategory }) {
  const colors: Record<ContentCategory, string> = {
    "Institucional": "bg-primary/10 text-primary border-primary/20",
    "Autoridade": "bg-accent/15 text-accent-foreground border-accent/30",
    "Portfólio": "bg-primary/5 text-primary border-primary/15",
  };

  return (
    <Badge variant="outline" className={cn("font-medium text-[10px] uppercase tracking-wide", colors[category])}>
      {category}
    </Badge>
  );
}

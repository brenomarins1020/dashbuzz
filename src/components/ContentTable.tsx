import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, TypeBadge, CategoryBadge } from "@/components/StatusBadges";
import { ExternalLink } from "lucide-react";
import type { ContentItem } from "@/data/mockData";

export function ContentTable({ data = [] }: { data: ContentItem[] }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12 font-semibold">N</TableHead>
              <TableHead className="font-semibold min-w-[180px]">Conteúdo</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Responsável</TableHead>
              <TableHead className="font-semibold min-w-[200px]">Detalhes</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="font-semibold text-right">Interações</TableHead>
              <TableHead className="font-semibold text-right">Likes</TableHead>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold w-10">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="border-border/30 hover:bg-muted/50 transition-colors">
                <TableCell className="font-bold text-muted-foreground">{item.number}</TableCell>
                <TableCell className="font-semibold">{item.title}</TableCell>
                <TableCell><TypeBadge type={item.type} /></TableCell>
                <TableCell className="text-muted-foreground">{item.responsible || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{item.details}</TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {item.date ? new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">{item.interactions.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right font-medium">{item.likes.toLocaleString("pt-BR")}</TableCell>
                <TableCell><CategoryBadge category={item.category} /></TableCell>
                <TableCell>
                  {item.canvaLink && (
                    <a href={item.canvaLink} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

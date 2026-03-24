import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosts, type Post } from "@/hooks/usePosts";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";

export function TrashPanel() {
  const { trashedPosts, restorePost: onRestorePost, permanentDeletePost: onPermanentDeletePost } = usePosts();
  const { trashedAppointments, restoreAppointment: onRestoreAppointment, permanentDeleteAppointment: onPermanentDeleteAppointment } = useAppointments();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "post" | "appointment"; label: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const totalTrashed = trashedPosts.length + trashedAppointments.length;

  const handlePermanentDelete = async () => {
    if (!deleteTarget || confirmText !== "EXCLUIR") return;
    if (deleteTarget.type === "post") await onPermanentDeletePost(deleteTarget.id);
    else await onPermanentDeleteAppointment(deleteTarget.id);
    setDeleteTarget(null);
    setConfirmText("");
  };

  const formatDate = (ds: string) => {
    try {
      return new Date(ds).toLocaleDateString("pt-BR");
    } catch { return ds; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-destructive" />
          Lixeira
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalTrashed === 0
            ? "A lixeira está vazia."
            : `${totalTrashed} item${totalTrashed !== 1 ? "s" : ""} na lixeira.`}
        </p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">Mídia ({trashedPosts.length})</TabsTrigger>
          <TabsTrigger value="appointments">Compromissos ({trashedAppointments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {trashedPosts.length === 0 ? (
            <EmptyState />
          ) : (
            trashedPosts
              .sort((a, b) => (b.deleted_at || "").localeCompare(a.deleted_at || ""))
              .map((p) => (
                <TrashItem
                  key={p.id}
                  title={p.conteudo}
                  subtitle={`${p.local} · ${p.tipo_conteudo} · ${formatDate(p.data_postagem)}`}
                  deletedAt={p.deleted_at ? formatDate(p.deleted_at) : ""}
                  onRestore={() => onRestorePost(p.id)}
                  onDelete={() => setDeleteTarget({ id: p.id, type: "post", label: p.conteudo })}
                />
              ))
          )}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {trashedAppointments.length === 0 ? (
            <EmptyState />
          ) : (
            trashedAppointments
              .sort((a, b) => (b.deleted_at || "").localeCompare(a.deleted_at || ""))
              .map((a) => (
                <TrashItem
                  key={a.id}
                  title={a.title}
                  subtitle={`${a.type} · ${formatDate(a.date)}`}
                  deletedAt={a.deleted_at ? formatDate(a.deleted_at) : ""}
                  onRestore={() => onRestoreAppointment(a.id)}
                  onDelete={() => setDeleteTarget({ id: a.id, type: "appointment", label: a.title })}
                />
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Essa ação é <strong className="text-destructive">irreversível</strong>. O item será apagado definitivamente do banco de dados.
              </span>
              {deleteTarget && (
                <span className="block text-sm font-medium text-foreground">
                  "{deleteTarget.label}"
                </span>
              )}
              <span className="block text-sm">
                Digite <strong className="font-mono text-destructive">EXCLUIR</strong> para confirmar:
              </span>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && confirmText === "EXCLUIR") handlePermanentDelete(); }}
                placeholder="EXCLUIR"
                className="font-mono"
                autoFocus
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={confirmText !== "EXCLUIR"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrashItem({ title, subtitle, deletedAt, onRestore, onDelete }: {
  title: string; subtitle: string; deletedAt: string;
  onRestore: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        {deletedAt && (
          <p className="text-[10px] text-destructive/70 mt-0.5">Excluído em {deletedAt}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" onClick={onRestore} className="gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Nenhum item na lixeira.</p>
    </div>
  );
}

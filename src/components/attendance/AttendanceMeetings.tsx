import { useMemo, useState } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
  onNewMeeting: () => void;
}

const RECURRENCE_LABELS: Record<string, string> = {
  none: "Única",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function AttendanceMeetings({ attendance, members, onNewMeeting }: Props) {
  const { meetings, meetingTypes, occurrences, attendance: records, participants, deleteMeeting } = attendance;
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");

  const enriched = useMemo(() => {
    return meetings.map(m => {
      const type = m.meeting_type_id ? meetingTypes.find(t => t.id === m.meeting_type_id) : null;
      const occ = occurrences.filter(o => o.meeting_id === m.id && !o.cancelled && o.occurrence_date <= today);
      const occCount = occ.length;
      const totalRecords = occ.flatMap(o => records.filter(r => r.occurrence_id === o.id));
      const presentCount = totalRecords.filter(r => r.status === "present").length;
      const totalExpected = occ.length * participants.filter(p => p.meeting_id === m.id).length;
      const avgPct = totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0;
      return { ...m, type, occCount, avgPct };
    });
  }, [meetings, meetingTypes, occurrences, records, participants, today]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMeeting(id);
      toast({ title: "Reunião excluída" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const pctBg = (pct: number) =>
    pct >= 90 ? "bg-emerald-500/20 text-emerald-400" : pct >= 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Reuniões</h2>
        <Button onClick={onNewMeeting} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova reunião
        </Button>
      </div>

      {enriched.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma reunião criada ainda.</p>
      )}

      <div className="space-y-3">
        {enriched.map(m => (
          <Card key={m.id} className="glass-card border-0">
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: m.type?.color ?? "#94a3b8" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{m.title}</p>
                  {m.type && (
                    <Badge variant="secondary" className="text-[10px]" style={{ color: m.type.color }}>
                      {m.type.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{RECURRENCE_LABELS[m.recurrence] ?? m.recurrence}</span>
                  <span>Início: {format(parseISO(m.date), "dd/MM/yy")}</span>
                  {m.recurrence_end_date && <span>Fim: {format(parseISO(m.recurrence_end_date), "dd/MM/yy")}</span>}
                  <span>{m.occCount} ocorrências</span>
                </div>
              </div>
              <Badge className={cn("text-xs", pctBg(m.avgPct))}>{m.avgPct}%</Badge>
              <div className="flex gap-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso removerá a reunião, todas as ocorrências e registros de presença. Essa ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

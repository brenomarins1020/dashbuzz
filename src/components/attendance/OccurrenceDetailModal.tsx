import { useState, useEffect, useMemo } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Props {
  occurrenceId: string | null;
  attendance: ReturnType<typeof useAttendance>;
  onClose: () => void;
}

type RecordDraft = {
  member_name: string;
  member_id: string | null;
  status: "present" | "absent" | "justified";
  justification: string;
};

export function OccurrenceDetailModal({ occurrenceId, attendance, onClose }: Props) {
  const { occurrences, meetings, meetingTypes, participants, attendance: records, saveAttendance } = attendance;
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<RecordDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const occurrence = occurrenceId ? occurrences.find(o => o.id === occurrenceId) : null;
  const meeting = occurrence ? meetings.find(m => m.id === occurrence.meeting_id) : null;
  const type = meeting?.meeting_type_id ? meetingTypes.find(t => t.id === meeting.meeting_type_id) : null;

  const expectedParticipants = useMemo(() => {
    if (!occurrence) return [];
    return participants.filter(p => p.meeting_id === occurrence.meeting_id);
  }, [occurrence, participants]);

  // Initialize drafts from existing records or participants
  useEffect(() => {
    if (!occurrenceId || expectedParticipants.length === 0) return;
    const existingRecords = records.filter(r => r.occurrence_id === occurrenceId);
    const newDrafts = expectedParticipants.map(p => {
      const existing = existingRecords.find(r => r.member_name === p.member_name);
      return {
        member_name: p.member_name,
        member_id: p.member_id,
        status: (existing?.status ?? "present") as "present" | "absent" | "justified",
        justification: existing?.justification ?? "",
      };
    });
    setDrafts(newDrafts);
  }, [occurrenceId, expectedParticipants, records]);

  const handleSave = async () => {
    if (!occurrenceId) return;
    setSaving(true);
    try {
      await saveAttendance(occurrenceId, drafts.map(d => ({
        member_name: d.member_name,
        member_id: d.member_id,
        status: d.status,
        justification: d.justification || null,
      })));
      toast({ title: "Presenças salvas" });
      onClose();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (idx: number, changes: Partial<RecordDraft>) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...changes } : d));
  };

  const statusColors: Record<string, string> = {
    present: "bg-emerald-500",
    absent: "bg-red-500",
    justified: "bg-amber-500",
  };

  return (
    <Dialog open={!!occurrenceId} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {meeting?.title ?? "Reunião"}
            {occurrence && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {format(parseISO(occurrence.occurrence_date), "dd MMM yyyy", { locale: ptBR })}
              </span>
            )}
          </DialogTitle>
          {type && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} />
              <span className="text-xs text-muted-foreground">{type.name}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum participante esperado.</p>
          )}
          {drafts.map((d, idx) => (
            <div key={d.member_name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                    {d.member_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{d.member_name}</span>
                </div>
                <div className="flex gap-1">
                  {(["present", "absent", "justified"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateDraft(idx, { status: s })}
                      className={cn(
                        "h-7 px-2 rounded-md text-[10px] font-medium uppercase tracking-wider transition-colors",
                        d.status === s
                          ? `${statusColors[s]} text-white`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {s === "present" ? "✓" : s === "absent" ? "✗" : "~"}
                    </button>
                  ))}
                </div>
              </div>
              {(d.status === "absent" || d.status === "justified") && (
                <Input
                  placeholder="Justificativa (opcional)"
                  value={d.justification}
                  onChange={e => updateDraft(idx, { justification: e.target.value })}
                  className="h-7 text-xs"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Salvando..." : "Salvar presenças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

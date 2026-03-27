import { useState } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Única" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
];

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

export function MeetingFormModal({ open, onOpenChange, attendance, members }: Props) {
  const { meetingTypes, addMeeting, addMeetingType } = attendance;
  const { toast } = useToast();

  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [endDate, setEndDate] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // New type inline
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#3b82f6");
  const [showNewType, setShowNewType] = useState(false);

  const filteredMembers = members.filter(
    m => !selectedParticipants.includes(m.nome) &&
    m.nome.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const reset = () => {
    setTypeId(""); setDate(""); setTime(""); setLocation("");
    setRecurrence("none"); setEndDate(""); setSelectedParticipants([]);
    setParticipantSearch(""); setShowNewType(false); setNewTypeName(""); setNewTypeColor("#3b82f6");
  };

  // Derive title from meeting type name
  const selectedType = meetingTypes.find(t => t.id === typeId);
  const derivedTitle = selectedType?.name ?? "Reunião";

  const handleSave = async () => {
    if (!typeId || !date) {
      toast({ title: "Selecione um tipo e uma data", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await addMeeting(
        {
          title: derivedTitle,
          meeting_type_id: typeId,
          date,
          time: time || null,
          location: location || null,
          recurrence,
          recurrence_end_date: recurrence !== "none" && endDate ? endDate : null,
          notes: null,
        },
        selectedParticipants
      );
      toast({ title: "Reunião criada!" });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao criar reunião", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const newId = await addMeetingType({ name: newTypeName.trim(), color: newTypeColor });
      setTypeId(newId);
      setNewTypeName("");
      setShowNewType(false);
      toast({ title: "Tipo criado e selecionado!" });
    } catch {
      toast({ title: "Erro ao criar tipo", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            {!showNewType ? (
              <div className="flex gap-2">
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowNewType(true)}>+ Novo</Button>
              </div>
            ) : (
              <div className="space-y-2 p-3 border border-border rounded-lg">
                <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Nome do tipo" />
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewTypeColor(c)}
                      className={cn("h-6 w-6 rounded-full border-2 transition-colors", newTypeColor === c ? "border-white" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateType} disabled={!newTypeName.trim()}>Criar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewType(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Local</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Sala 3" />
          </div>

          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <div className="flex gap-1.5">
              {RECURRENCE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setRecurrence(o.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                    recurrence === o.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {recurrence !== "none" && (
            <div className="space-y-1.5">
              <Label>Data final (opcional)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Participantes</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedParticipants.map(name => (
                <span key={name} className="inline-flex items-center gap-1 bg-accent/20 text-accent rounded-full px-2.5 py-1 text-xs font-medium">
                  {name}
                  <button onClick={() => setSelectedParticipants(prev => prev.filter(n => n !== name))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              placeholder="Buscar membro..."
              value={participantSearch}
              onChange={e => setParticipantSearch(e.target.value)}
            />
            {participantSearch && filteredMembers.length > 0 && (
              <div className="border border-border rounded-lg mt-1 max-h-32 overflow-y-auto">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedParticipants(prev => [...prev, m.nome]);
                      setParticipantSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    {m.nome} <span className="text-xs text-muted-foreground">({m.cargo})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Criando..." : "Criar reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

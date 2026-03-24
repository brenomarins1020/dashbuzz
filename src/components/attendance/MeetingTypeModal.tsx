import { useState } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: ReturnType<typeof useAttendance>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

export function MeetingTypeModal({ open, onOpenChange, attendance }: Props) {
  const { meetingTypes, addMeetingType, deleteMeetingType } = attendance;
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await addMeetingType({ name: name.trim(), color });
      setName("");
      toast({ title: "Tipo criado!" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeetingType(id);
      toast({ title: "Tipo excluído" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tipos de reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {meetingTypes.map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-sm flex-1">{t.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => handleDelete(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <div className="border-t border-border pt-3 space-y-2">
            <Label>Novo tipo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-6 w-6 rounded-full border-2 transition-colors", color === c ? "border-white" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!name.trim()}>Adicionar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

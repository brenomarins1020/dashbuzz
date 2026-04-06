import { useMemo, useState, useCallback } from "react";
import type { useAttendance } from "@/hooks/useAttendance";
import type { TeamMember } from "@/hooks/useTeam";
import { useTeam } from "@/hooks/useTeam";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Check, X, Plus, UserPlus, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  attendance: ReturnType<typeof useAttendance>;
  members: TeamMember[];
}

export function AttendancePeople({ attendance, members }: Props) {
  const { participants, occurrences, attendance: records, meetings, updateParticipants } = attendance;
  const { addMember, removeMember, updateMember } = useTeam();
  const { workspaceId } = useWorkspace();
  const { activeGroup1: areaOptions } = useTaskCategories();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [detailName, setDetailName] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch membership roles
  const { data: memberRoles = [] } = useQuery({
    queryKey: ["membership-roles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("user_id, role")
        .eq("workspace_id", workspaceId!);
      return data || [];
    },
  });

  const getRoleForUser = (userId: string | null) => {
    if (!userId) return null;
    const m = memberRoles.find((r: any) => r.user_id === userId);
    return m ? (m as any).role : null;
  };

  const handleChangeRole = async (userId: string, name: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_member_role", {
        p_workspace_id: workspaceId!,
        p_user_id: userId,
        p_role: newRole,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["membership-roles", workspaceId] });
      sonnerToast.success(`Role de ${name} atualizado para ${newRole === "admin" ? "Admin" : "Membro"}`);
    } catch (err: any) {
      if (err.message?.includes("Cannot demote the only admin")) {
        sonnerToast.error("Não é possível remover o único administrador do workspace.");
      } else {
        sonnerToast.error(err.message || "Erro ao alterar role");
      }
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  // Show ALL team members, not just participants
  const memberStats = useMemo(() => {
    return members.map(member => {
      const name = member.nome;
      const memberMeetingIds = new Set(
        participants.filter(p => p.member_name === name).map(p => p.meeting_id)
      );
      // Only past/today occurrences
      const relevantOccs = occurrences.filter(o => memberMeetingIds.has(o.meeting_id) && !o.cancelled && o.occurrence_date <= today);
      const total = relevantOccs.length;
      const present = relevantOccs.filter(o => {
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === name);
        return rec?.status === "present";
      }).length;
      const absent = relevantOccs.filter(o => {
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === name);
        return rec?.status === "absent";
      }).length;
      const justified = relevantOccs.filter(o => {
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === name);
        return rec?.status === "justified";
      }).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const memberMeetingsArr = Array.from(memberMeetingIds);
      return { name, total, present, absent, justified, pct, teamMember: member, memberMeetingIds: memberMeetingsArr };
    });
  }, [members, participants, occurrences, records, today]);

  const detailData = useMemo(() => {
    if (!detailName) return null;
    const stat = memberStats.find(m => m.name === detailName);
    if (!stat) return null;
    const memberMeetingIds = new Set(
      participants.filter(p => p.member_name === stat.name).map(p => p.meeting_id)
    );
    const memberOccs = occurrences
      .filter(o => memberMeetingIds.has(o.meeting_id) && !o.cancelled && o.occurrence_date <= today)
      .map(o => {
        const meeting = meetings.find(m => m.id === o.meeting_id);
        const rec = records.find(r => r.occurrence_id === o.id && r.member_name === stat.name);
        return { occurrence: o, meeting, record: rec };
      })
      .sort((a, b) => b.occurrence.occurrence_date.localeCompare(a.occurrence.occurrence_date));
    return { ...stat, occurrences: memberOccs };
  }, [detailName, memberStats, participants, occurrences, meetings, records]);

  const pctBg = (pct: number) =>
    pct >= 90 ? "bg-emerald-500/20 text-emerald-400" : pct >= 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";

  // Toggle meeting participation for a member
  const toggleMeetingForMember = async (memberName: string, meetingId: string, isCurrentlyIn: boolean) => {
    const currentParticipants = participants.filter(p => p.meeting_id === meetingId).map(p => p.member_name);
    const newNames = isCurrentlyIn
      ? currentParticipants.filter(n => n !== memberName)
      : [...currentParticipants, memberName];
    try {
      await updateParticipants(meetingId, newNames);
    } catch {
      toast({ title: "Erro ao atualizar participação", variant: "destructive" });
    }
  };

  // Add a new person (just name)
  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await addMember({ nome: newName.trim(), cargo: "Membro", email: "", ano_entrada: new Date().getFullYear() });
      setNewName("");
      setShowAddForm(false);
      toast({ title: `${newName.trim()} adicionado(a)!` });
    } catch {
      toast({ title: "Erro ao adicionar pessoa", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePerson = async (id: string, name: string) => {
    try {
      await removeMember(id);
      toast({ title: `${name} removido(a)` });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleSetArea = useCallback(async (memberId: string, area: string) => {
    try {
      await updateMember(memberId, { cargo: area });
    } catch {
      toast({ title: "Erro ao salvar área", variant: "destructive" });
    }
  }, [updateMember, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading tracking-wide uppercase">Pessoas</h2>
        <Button
          size="sm"
          variant={showAddForm ? "secondary" : "outline"}
          className="gap-1.5"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <UserPlus className="h-4 w-4" />
          Adicionar pessoa
        </Button>
      </div>

      {/* Inline add person form */}
      {showAddForm && (
        <div className="glass-card rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome da pessoa..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddPerson()}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddPerson} disabled={saving || !newName.trim()}>
              {saving ? "..." : "Adicionar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewName(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {memberStats.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada. Clique em "Adicionar pessoa" para começar.</p>
      )}

      <div className="space-y-3">
        {memberStats.map(m => {
          const memberMeetingIdSet = new Set(m.memberMeetingIds);
          const memberRole = getRoleForUser(m.teamMember.user_id ?? null);
          return (
            <Card key={m.teamMember.id} className="glass-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-sm shrink-0">
                    {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      {memberRole && (
                        m.teamMember.user_id ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors",
                                  memberRole === "admin"
                                    ? "bg-accent/20 text-accent hover:bg-accent/30"
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                )}
                              >
                                {memberRole === "admin" && <Shield className="h-2.5 w-2.5" />}
                                {memberRole === "admin" ? "Admin" : "Membro"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" align="start">
                              <button
                                onClick={() => handleChangeRole(m.teamMember.user_id!, m.name, memberRole === "admin" ? "member" : "admin")}
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors"
                              >
                                {memberRole === "admin" ? "Tornar Membro" : "Tornar Admin"}
                              </button>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              memberRole === "admin"
                                ? "bg-accent/20 text-accent"
                                : "bg-secondary text-muted-foreground"
                            )}
                          >
                            {memberRole === "admin" && <Shield className="h-2.5 w-2.5" />}
                            {memberRole === "admin" ? "Admin" : "Membro"}
                          </span>
                        )
                      )}
                    </div>
                    {m.teamMember.cargo && m.teamMember.cargo !== "Membro" && m.teamMember.cargo !== "" && (
                      <p className="text-xs text-muted-foreground truncate">{m.teamMember.cargo}</p>
                    )}
                  </div>
                  {m.total > 0 && (
                    <Badge className={cn("text-xs", pctBg(m.pct))}>{m.pct}%</Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover {m.name}?</AlertDialogTitle>
                        <AlertDialogDescription>Isso removerá a pessoa do cadastro.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemovePerson(m.teamMember.id, m.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {m.total > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Progress value={m.pct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{m.present}/{m.total}</span>
                  </div>
                )}

                {/* Área (task category 1) */}
                {areaOptions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Área</p>
                    <Select
                      value={m.teamMember.cargo && m.teamMember.cargo !== "Membro" ? m.teamMember.cargo : ""}
                      onValueChange={(val) => handleSetArea(m.teamMember.id, val)}
                    >
                      <SelectTrigger className="h-7 text-xs rounded-lg">
                        <SelectValue placeholder="Selecionar área..." />
                      </SelectTrigger>
                      <SelectContent>
                        {areaOptions.map((a) => (
                          <SelectItem key={a.id} value={a.name}>
                            <span className="flex items-center gap-2">
                              {a.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />}
                              {a.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Inline meeting toggles */}
                {meetings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reuniões</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meetings.map(meeting => {
                        const isIn = memberMeetingIdSet.has(meeting.id);
                        const type = meeting.meeting_type_id
                          ? attendance.meetingTypes.find(t => t.id === meeting.meeting_type_id)
                          : null;
                        return (
                          <button
                            key={meeting.id}
                            onClick={() => toggleMeetingForMember(m.name, meeting.id, isIn)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                              isIn
                                ? "border-transparent text-white"
                                : "border-border text-muted-foreground hover:border-accent/50"
                            )}
                            style={isIn ? { backgroundColor: type?.color ?? "#64748b" } : undefined}
                            title={isIn ? "Clique para remover desta reunião" : "Clique para adicionar a esta reunião"}
                          >
                            {isIn ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {meeting.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {m.total > 0 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setDetailName(m.name)}>
                    Ver detalhes
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail modal */}
      <Dialog open={!!detailName} onOpenChange={open => !open && setDetailName(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailData && (
                <>
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                    {detailData.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p>{detailData.name}</p>
                    {detailData.teamMember.cargo && detailData.teamMember.cargo !== "Membro" && (
                      <p className="text-xs text-muted-foreground font-normal">{detailData.teamMember.cargo}</p>
                    )}
                  </div>
                  <Badge className={cn("ml-auto text-xs", pctBg(detailData.pct))}>{detailData.pct}%</Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailData && (
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                    <th className="text-left py-2">Data</th>
                    <th className="text-left py-2">Reunião</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-left py-2">Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.occurrences.map(({ occurrence, meeting, record }) => (
                    <tr key={occurrence.id} className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">{format(parseISO(occurrence.occurrence_date), "dd/MM/yy")}</td>
                      <td className="py-2">{meeting?.title}</td>
                      <td className="py-2 text-center">
                        {record?.status === "present" && <Check className="h-4 w-4 text-emerald-400 inline" />}
                        {record?.status === "absent" && <X className="h-4 w-4 text-red-400 inline" />}
                        {record?.status === "justified" && <span className="text-amber-400">~</span>}
                        {!record && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{record?.justification ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-muted-foreground pt-3 flex gap-4">
                <span>{detailData.present} presenças</span>
                <span>{detailData.absent} faltas</span>
                <span>{detailData.justified} justificadas</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

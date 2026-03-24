import { useState } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import { useTeam } from "@/hooks/useTeam";
import { AttendanceOverview } from "./AttendanceOverview";
import { AttendancePeople } from "./AttendancePeople";
import { AttendanceMeetings } from "./AttendanceMeetings";

import { MeetingFormModal } from "./MeetingFormModal";
import { MeetingTypeModal } from "./MeetingTypeModal";
import { MeetingAttendanceTable } from "./MeetingAttendanceTable";
import { cn } from "@/lib/utils";
import { Users, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SubView = "people" | "meetings";

const SUB_NAV: { view: SubView; icon: React.ElementType; label: string }[] = [
  { view: "people", icon: Users, label: "Pessoas" },
  { view: "meetings", icon: CalendarDays, label: "Reuniões" },
];

export function AttendancePanel() {
  const [subView, setSubView] = useState<SubView>("people");
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [filterTypeIds, setFilterTypeIds] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const attendance = useAttendance();
  const { members } = useTeam();

  if (attendance.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 mt-6">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const toggleTypeFilter = (id: string) => {
    setFilterTypeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // If a meeting type is selected, show the attendance table
  if (selectedTypeId) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0">

          <div className="glass-card rounded-2xl p-3 space-y-1">
            {SUB_NAV.map(item => (
              <button
                key={item.view}
                onClick={() => { setSelectedTypeId(null); setSubView(item.view); }}
                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 glass-card rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipos</p>
              <button onClick={() => setTypeModalOpen(true)} className="text-xs text-accent hover:underline">Gerenciar</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {attendance.meetingTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypeId(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                    selectedTypeId === t.id
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  )}
                  style={{
                    backgroundColor: selectedTypeId === t.id ? t.color : "transparent",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedTypeId === t.id ? "white" : t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <MeetingAttendanceTable
            attendance={attendance}
            members={members}
            meetingTypeId={selectedTypeId}
            onBack={() => setSelectedTypeId(null)}
          />
        </div>

        <MeetingFormModal open={meetingModalOpen} onOpenChange={setMeetingModalOpen} attendance={attendance} members={members} />
        <MeetingTypeModal open={typeModalOpen} onOpenChange={setTypeModalOpen} attendance={attendance} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0">

        <div className="glass-card rounded-2xl p-3 space-y-1">
          {SUB_NAV.map(item => (
            <button
              key={item.view}
              onClick={() => setSubView(item.view)}
              className={cn(
                "flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                subView === item.view
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Meeting type chips - clicking opens attendance table */}
        <div className="mt-4 glass-card rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipos</p>
            <button onClick={() => setTypeModalOpen(true)} className="text-xs text-accent hover:underline">Gerenciar</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attendance.meetingTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTypeId(t.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border border-transparent text-white transition-colors hover:opacity-80"
                style={{ backgroundColor: t.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "white" }} />
                {t.name}
              </button>
            ))}
            {attendance.meetingTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum tipo criado</p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden flex gap-1 mb-4 overflow-x-auto pb-2 w-full">
        {SUB_NAV.map(item => (
          <button
            key={item.view}
            onClick={() => setSubView(item.view)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
              subView === item.view
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <Button onClick={() => setMeetingModalOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova reunião
          </Button>
        </div>

        {subView === "people" && (
          <AttendancePeople attendance={attendance} members={members} />
        )}
        {subView === "meetings" && (
          <AttendanceMeetings attendance={attendance} members={members} onNewMeeting={() => setMeetingModalOpen(true)} />
        )}
      </div>

      <MeetingFormModal open={meetingModalOpen} onOpenChange={setMeetingModalOpen} attendance={attendance} members={members} />
      <MeetingTypeModal open={typeModalOpen} onOpenChange={setTypeModalOpen} attendance={attendance} />
    </div>
  );
}

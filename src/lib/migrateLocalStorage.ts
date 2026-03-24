import { supabase } from "@/integrations/supabase/client";

const LEGACY_KEYS = ["appointments", "projec-team-members", "posts"];
const MIGRATION_FLAG = (wsId: string) => `migration_done_${wsId}`;

export async function migrateLocalStorageToDb(workspaceId: string) {
  const flag = MIGRATION_FLAG(workspaceId);
  if (localStorage.getItem(flag)) return;

  let migrated = false;

  // Migrate appointments
  try {
    const raw = localStorage.getItem("appointments");
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        const rows = items.map((a: any) => ({
          title: a.title || "Sem título",
          type: a.type || "Reunião",
          date: a.date || new Date().toISOString().slice(0, 10),
          start_time: a.startTime || a.start_time || null,
          responsible: a.responsible || null,
          status: a.status || "pendente",
          local: a.local || null,
          notes: a.notes || null,
          recurrence: a.recurrence || "nenhuma",
          deleted_at: a.deleted_at || null,
          deleted_by: a.deleted_by || null,
          workspace_id: workspaceId,
        }));
        await supabase.from("appointments").insert(rows as any);
        migrated = true;
      }
    }
  } catch (e) {
    console.error("Migration error (appointments):", e);
  }

  // Migrate team members
  try {
    const raw = localStorage.getItem("projec-team-members");
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        const rows = items.map((m: any) => ({
          nome: m.nome || "Sem nome",
          email: m.email || null,
          ano_entrada: m.ano_entrada || null,
          cargo: m.cargo || "Assessor(a) de Marketing",
          foto: m.foto || null,
          workspace_id: workspaceId,
        }));
        await supabase.from("team_members").insert(rows as any);
        migrated = true;
      }
    }
  } catch (e) {
    console.error("Migration error (team):", e);
  }

  // Mark as done and clean up
  localStorage.setItem(flag, "true");
  if (migrated) {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  }
}

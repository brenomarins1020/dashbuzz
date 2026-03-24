import React, { createContext, useContext, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface PublishingProfile {
  id: string;
  workspace_id: string;
  name: string;
  icon_key: string;
  is_active: boolean;
  sort_order: number;
}

export interface ContentCategory {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon_key: string;
  is_active: boolean;
  sort_order: number;
}

export interface WorkflowStatus {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TeamRole {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface Responsible {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface AppointmentType {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon_key: string;
  is_active: boolean;
  sort_order: number;
}

export interface WorkspaceConfigContextType {
  profiles: PublishingProfile[];
  activeProfiles: PublishingProfile[];
  addProfile: (data: { name: string; icon_key?: string }) => Promise<void>;
  updateProfile: (id: string, changes: Partial<PublishingProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  categories: ContentCategory[];
  activeCategories: ContentCategory[];
  addCategory: (data: { name: string; color?: string; icon_key?: string }) => Promise<void>;
  updateCategory: (id: string, changes: Partial<ContentCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  statuses: WorkflowStatus[];
  activeStatuses: WorkflowStatus[];
  addStatus: (data: { name: string; color?: string }) => Promise<void>;
  updateStatus: (id: string, changes: Partial<WorkflowStatus>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  roles: TeamRole[];
  activeRoles: TeamRole[];
  addRole: (data: { name: string }) => Promise<void>;
  updateRole: (id: string, changes: Partial<TeamRole>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  responsibles: Responsible[];
  activeResponsibles: Responsible[];
  addResponsible: (data: { name: string; email?: string }) => Promise<void>;
  updateResponsible: (id: string, changes: Partial<Responsible>) => Promise<void>;
  deleteResponsible: (id: string) => Promise<void>;
  appointmentTypes: AppointmentType[];
  activeAppointmentTypes: AppointmentType[];
  addAppointmentType: (data: { name: string; color?: string; icon_key?: string }) => Promise<void>;
  updateAppointmentType: (id: string, changes: Partial<AppointmentType>) => Promise<void>;
  deleteAppointmentType: (id: string) => Promise<void>;
  loading: boolean;
  refresh: () => void;
}

const WorkspaceConfigContext = createContext<WorkspaceConfigContextType | null>(null);

async function fetchProfiles(workspaceId: string) {
  const { data } = await supabase.from("publishing_profiles").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as unknown as PublishingProfile[];
}
async function fetchCategories(workspaceId: string) {
  const { data } = await supabase.from("content_categories").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as unknown as ContentCategory[];
}
async function fetchStatuses(workspaceId: string) {
  const { data } = await supabase.from("workflow_statuses").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as WorkflowStatus[];
}
async function fetchRoles(workspaceId: string) {
  const { data } = await supabase.from("team_roles").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as TeamRole[];
}
async function fetchResponsibles(workspaceId: string) {
  const { data } = await supabase.from("workspace_responsibles").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as Responsible[];
}
async function fetchAppointmentTypes(workspaceId: string) {
  const { data } = await supabase.from("appointment_types").select("*").eq("workspace_id", workspaceId).order("sort_order");
  return (data ?? []) as AppointmentType[];
}

export function WorkspaceConfigProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const enabled = !!workspaceId;

  const profilesQ = useQuery({ queryKey: ["ws-config", "profiles", workspaceId], queryFn: () => fetchProfiles(workspaceId!), enabled, staleTime: 15 * 60_000 });
  const categoriesQ = useQuery({ queryKey: ["ws-config", "categories", workspaceId], queryFn: () => fetchCategories(workspaceId!), enabled, staleTime: 15 * 60_000 });
  const statusesQ = useQuery({ queryKey: ["ws-config", "statuses", workspaceId], queryFn: () => fetchStatuses(workspaceId!), enabled, staleTime: 15 * 60_000 });
  const rolesQ = useQuery({ queryKey: ["ws-config", "roles", workspaceId], queryFn: () => fetchRoles(workspaceId!), enabled, staleTime: 15 * 60_000 });
  const responsiblesQ = useQuery({ queryKey: ["ws-config", "responsibles", workspaceId], queryFn: () => fetchResponsibles(workspaceId!), enabled, staleTime: 15 * 60_000 });
  const appointmentTypesQ = useQuery({ queryKey: ["ws-config", "appointmentTypes", workspaceId], queryFn: () => fetchAppointmentTypes(workspaceId!), enabled, staleTime: 15 * 60_000 });

  const profiles = profilesQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const statuses = statusesQ.data ?? [];
  const roles = rolesQ.data ?? [];
  const responsibles = responsiblesQ.data ?? [];
  const appointmentTypes = appointmentTypesQ.data ?? [];
  const loading = profilesQ.isLoading || categoriesQ.isLoading || statusesQ.isLoading || rolesQ.isLoading || responsiblesQ.isLoading;

  const invalidateAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["ws-config"] });
  }, [qc]);

  const addProfile = useCallback(async (data: { name: string; icon_key?: string }) => {
    if (!workspaceId) return;
    const maxOrder = profiles.length > 0 ? Math.max(...profiles.map(p => p.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("publishing_profiles").insert({ name: data.name, icon_key: data.icon_key || "instagram", workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "profiles", workspaceId], (old: PublishingProfile[] | undefined) => [...(old ?? []), inserted as unknown as PublishingProfile]);
    }
    await invalidateAll();
  }, [workspaceId, profiles, invalidateAll, qc]);

  const updateProfile = useCallback(async (id: string, changes: Partial<PublishingProfile>) => {
    await supabase.from("publishing_profiles").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteProfile = useCallback(async (id: string) => {
    await supabase.from("publishing_profiles").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const addCategory = useCallback(async (data: { name: string; color?: string; icon_key?: string }) => {
    if (!workspaceId) return;
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("content_categories").insert({ name: data.name, color: data.color, icon_key: data.icon_key || "instagram", workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "categories", workspaceId], (old: ContentCategory[] | undefined) => [...(old ?? []), inserted as unknown as ContentCategory]);
    }
    await invalidateAll();
  }, [workspaceId, categories, invalidateAll, qc]);

  const updateCategory = useCallback(async (id: string, changes: Partial<ContentCategory>) => {
    await supabase.from("content_categories").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from("content_categories").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const addStatus = useCallback(async (data: { name: string; color?: string }) => {
    if (!workspaceId) return;
    const maxOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("workflow_statuses").insert({ ...data, workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "statuses", workspaceId], (old: WorkflowStatus[] | undefined) => [...(old ?? []), inserted as unknown as WorkflowStatus]);
    }
    await invalidateAll();
  }, [workspaceId, statuses, invalidateAll, qc]);

  const updateStatus = useCallback(async (id: string, changes: Partial<WorkflowStatus>) => {
    await supabase.from("workflow_statuses").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteStatus = useCallback(async (id: string) => {
    await supabase.from("workflow_statuses").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const addRole = useCallback(async (data: { name: string }) => {
    if (!workspaceId) return;
    const maxOrder = roles.length > 0 ? Math.max(...roles.map(r => r.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("team_roles").insert({ ...data, workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "roles", workspaceId], (old: TeamRole[] | undefined) => [...(old ?? []), inserted as unknown as TeamRole]);
    }
    await invalidateAll();
  }, [workspaceId, roles, invalidateAll, qc]);

  const updateRole = useCallback(async (id: string, changes: Partial<TeamRole>) => {
    await supabase.from("team_roles").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteRole = useCallback(async (id: string) => {
    await supabase.from("team_roles").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const addResponsible = useCallback(async (data: { name: string; email?: string }) => {
    if (!workspaceId) return;
    const maxOrder = responsibles.length > 0 ? Math.max(...responsibles.map(r => r.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("workspace_responsibles").insert({ ...data, workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "responsibles", workspaceId], (old: Responsible[] | undefined) => [...(old ?? []), inserted as unknown as Responsible]);
    }
    await invalidateAll();
  }, [workspaceId, responsibles, invalidateAll, qc]);

  const updateResponsible = useCallback(async (id: string, changes: Partial<Responsible>) => {
    await supabase.from("workspace_responsibles").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteResponsible = useCallback(async (id: string) => {
    await supabase.from("workspace_responsibles").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const addAppointmentType = useCallback(async (data: { name: string; color?: string; icon_key?: string }) => {
    if (!workspaceId) return;
    const maxOrder = appointmentTypes.length > 0 ? Math.max(...appointmentTypes.map(a => a.sort_order)) + 1 : 0;
    const { data: inserted } = await supabase.from("appointment_types").insert({ name: data.name, color: data.color || "#3b82f6", icon_key: data.icon_key || "calendar", workspace_id: workspaceId, sort_order: maxOrder } as any).select().single();
    if (inserted) {
      qc.setQueryData(["ws-config", "appointmentTypes", workspaceId], (old: AppointmentType[] | undefined) => [...(old ?? []), inserted as unknown as AppointmentType]);
    }
    await invalidateAll();
  }, [workspaceId, appointmentTypes, invalidateAll, qc]);

  const updateAppointmentType = useCallback(async (id: string, changes: Partial<AppointmentType>) => {
    await supabase.from("appointment_types").update(changes as any).eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const deleteAppointmentType = useCallback(async (id: string) => {
    await supabase.from("appointment_types").delete().eq("id", id);
    await invalidateAll();
  }, [invalidateAll]);

  const value = useMemo<WorkspaceConfigContextType>(() => ({
    profiles,
    activeProfiles: profiles.filter(p => p.is_active),
    addProfile, updateProfile, deleteProfile,
    categories,
    activeCategories: categories.filter(c => c.is_active),
    addCategory, updateCategory, deleteCategory,
    statuses,
    activeStatuses: statuses.filter(s => s.is_active),
    addStatus, updateStatus, deleteStatus,
    roles,
    activeRoles: roles.filter(r => r.is_active),
    addRole, updateRole, deleteRole,
    responsibles,
    activeResponsibles: responsibles.filter(r => r.is_active),
    addResponsible, updateResponsible, deleteResponsible,
    appointmentTypes,
    activeAppointmentTypes: appointmentTypes.filter(a => a.is_active),
    addAppointmentType, updateAppointmentType, deleteAppointmentType,
    loading,
    refresh: invalidateAll,
  }), [profiles, categories, statuses, roles, responsibles, appointmentTypes, loading, addProfile, updateProfile, deleteProfile, addCategory, updateCategory, deleteCategory, addStatus, updateStatus, deleteStatus, addRole, updateRole, deleteRole, addResponsible, updateResponsible, deleteResponsible, addAppointmentType, updateAppointmentType, deleteAppointmentType, invalidateAll]);

  return (
    <WorkspaceConfigContext.Provider value={value}>
      {children}
    </WorkspaceConfigContext.Provider>
  );
}

export function useWorkspaceConfigContext() {
  const ctx = useContext(WorkspaceConfigContext);
  if (!ctx) throw new Error("useWorkspaceConfigContext must be used within WorkspaceConfigProvider");
  return ctx;
}

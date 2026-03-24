// Re-export types and hook from the centralized provider
// This file exists for backward compatibility — all consumers get the same cached data
export type {
  PublishingProfile,
  ContentCategory,
  WorkflowStatus,
  TeamRole,
  Responsible,
  AppointmentType,
} from "@/hooks/useWorkspaceConfigProvider";

import { useWorkspaceConfigContext } from "@/hooks/useWorkspaceConfigProvider";

export function useWorkspaceConfig() {
  return useWorkspaceConfigContext();
}

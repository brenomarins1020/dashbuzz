export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "global_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_overrides: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          occurrence_date: string
          override_data: Json
          workspace_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          occurrence_date: string
          override_data?: Json
          workspace_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          occurrence_date?: string
          override_data?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_overrides_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          color: string
          created_at: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          local: string | null
          notes: string | null
          recurrence: string
          responsible: string | null
          start_time: string | null
          status: string
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          local?: string | null
          notes?: string | null
          recurrence?: string
          responsible?: string | null
          start_time?: string | null
          status?: string
          title: string
          type?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          local?: string | null
          notes?: string | null
          recurrence?: string
          responsible?: string | null
          start_time?: string | null
          status?: string
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          member_id: string | null
          member_name: string
          occurrence_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          member_id?: string | null
          member_name: string
          occurrence_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          member_id?: string | null
          member_name?: string
          occurrence_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "meeting_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories: {
        Row: {
          color: string | null
          created_at: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          content_date: string
          content_title: string
          content_type: string
          id: string
          responsible_name: string
          sent_at: string
          workspace_id: string
        }
        Insert: {
          content_date: string
          content_title: string
          content_type: string
          id?: string
          responsible_name: string
          sent_at?: string
          workspace_id: string
        }
        Update: {
          content_date?: string
          content_title?: string
          content_type?: string
          id?: string
          responsible_name?: string
          sent_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      global_announcements: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          is_active: boolean
          link_url: string | null
          message: string
          priority: number
          require_ack: boolean
          start_at: string
          style: string
          title: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message: string
          priority?: number
          require_ack?: boolean
          start_at?: string
          style?: string
          title: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message?: string
          priority?: number
          require_ack?: boolean
          start_at?: string
          style?: string
          title?: string
        }
        Relationships: []
      }
      meeting_occurrences: {
        Row: {
          cancelled: boolean
          created_at: string
          id: string
          meeting_id: string
          occurrence_date: string
          workspace_id: string
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          id?: string
          meeting_id: string
          occurrence_date: string
          workspace_id: string
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          id?: string
          meeting_id?: string
          occurrence_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_occurrences_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_occurrences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          member_id: string | null
          member_name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          member_id?: string | null
          member_name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          member_id?: string | null
          member_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_types: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string | null
          meeting_type_id: string | null
          notes: string | null
          recurrence: string
          recurrence_end_date: string | null
          time: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string | null
          meeting_type_id?: string | null
          notes?: string | null
          recurrence?: string
          recurrence_end_date?: string | null
          time?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          meeting_type_id?: string | null
          notes?: string | null
          recurrence?: string
          recurrence_end_date?: string | null
          time?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "meeting_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          conteudo: string
          created_at: string
          data_postagem: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          link_canva: string
          local: string
          responsavel: string
          status: string
          tipo_conteudo: string
          workspace_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          data_postagem?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          link_canva?: string
          local?: string
          responsavel?: string
          status?: string
          tipo_conteudo?: string
          workspace_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          data_postagem?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          link_canva?: string
          local?: string
          responsavel?: string
          status?: string
          tipo_conteudo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_profiles: {
        Row: {
          created_at: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          local: string
          status: string
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          local?: string
          status?: string
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          local?: string
          status?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_category_options: {
        Row: {
          color: string | null
          created_at: string
          group_number: number
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          group_number: number
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          group_number?: number
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_category_options_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string
          category: string
          category_2: string | null
          completed: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          workspace_id: string
        }
        Insert: {
          assignee?: string
          category?: string
          category_2?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          workspace_id: string
        }
        Update: {
          assignee?: string
          category?: string
          category_2?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          ano_entrada: number | null
          cargo: string
          created_at: string
          deleted_at: string | null
          email: string | null
          foto: string | null
          id: string
          nome: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          ano_entrada?: number | null
          cargo: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          foto?: string | null
          id?: string
          nome: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          ano_entrada?: number | null
          cargo?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          foto?: string | null
          id?: string
          nome?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          requester_name: string | null
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          requester_name?: string | null
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          requester_name?: string | null
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_join_requests: {
        Row: {
          email: string
          id: string
          invite_id: string | null
          requested_at: string
          requester_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          email: string
          id?: string
          invite_id?: string | null
          requested_at?: string
          requester_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          email?: string
          id?: string
          invite_id?: string | null
          requested_at?: string
          requester_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_join_requests_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "workspace_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_join_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_responsibles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_responsibles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_token: string | null
          join_code: string | null
          name: string
          task_cat1_label: string
          task_cat2_label: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_token?: string | null
          join_code?: string | null
          name: string
          task_cat1_label?: string
          task_cat2_label?: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_token?: string | null
          join_code?: string | null
          name?: string
          task_cat1_label?: string
          task_cat2_label?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_join_request:
        | { Args: { request_id: string }; Returns: undefined }
        | {
            Args: { member_role?: string; request_id: string }
            Returns: undefined
          }
      create_workspace_with_membership: {
        Args: { _name: string; _type: string }
        Returns: string
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      join_workspace_via_invite:
        | { Args: { invite_token: string }; Returns: Json }
        | {
            Args: { invite_token: string; requester_name?: string }
            Returns: Json
          }
      reject_join_request: { Args: { request_id: string }; Returns: undefined }
      remove_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
      request_workspace_access: {
        Args: { p_invite_token: string; p_requester_name: string }
        Returns: Json
      }
      reset_workspace_invite_token: { Args: never; Returns: string }
      seed_default_profiles: { Args: { _ws_id: string }; Returns: undefined }
      update_member_role: {
        Args: { p_role: string; p_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
      user_workspace_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

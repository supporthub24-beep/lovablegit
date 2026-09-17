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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_providers: {
        Row: {
          allowed_models_json: Json
          capabilities_json: Json
          created_at: string
          display_name: string
          enabled: boolean
          id: string
          provider_key: string
          rate_limits_json: Json
          server_only: boolean
          updated_at: string
        }
        Insert: {
          allowed_models_json?: Json
          capabilities_json?: Json
          created_at?: string
          display_name: string
          enabled?: boolean
          id?: string
          provider_key: string
          rate_limits_json?: Json
          server_only?: boolean
          updated_at?: string
        }
        Update: {
          allowed_models_json?: Json
          capabilities_json?: Json
          created_at?: string
          display_name?: string
          enabled?: boolean
          id?: string
          provider_key?: string
          rate_limits_json?: Json
          server_only?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          latency_ms: number | null
          request_id: string
          route: string
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          request_id: string
          route: string
          status_code: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          request_id?: string
          route?: string
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata_json: Json
          target_id: string | null
          target_type: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string | null
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
      app_user_connections: {
        Row: {
          account_label: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          data_url: string
          id: string
          kind: string
          project_id: string | null
          prompt: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data_url: string
          id?: string
          kind?: string
          project_id?: string | null
          prompt?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_url?: string
          id?: string
          kind?: string
          project_id?: string | null
          prompt?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments_json: Json
          chat_id: string
          content: string
          created_at: string
          id: string
          model_id: string | null
          provider: string | null
          role: Database["public"]["Enums"]["message_role"]
          sequence_number: number
          token_usage_json: Json
          user_id: string
        }
        Insert: {
          attachments_json?: Json
          chat_id: string
          content: string
          created_at?: string
          id?: string
          model_id?: string | null
          provider?: string | null
          role: Database["public"]["Enums"]["message_role"]
          sequence_number?: number
          token_usage_json?: Json
          user_id: string
        }
        Update: {
          attachments_json?: Json
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          model_id?: string | null
          provider?: string | null
          role?: Database["public"]["Enums"]["message_role"]
          sequence_number?: number
          token_usage_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          project_id: string
          status: Database["public"]["Enums"]["chat_status"]
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["chat_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["chat_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          rules_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          rules_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          created_at: string
          encrypted_metadata: string | null
          external_account_id: string | null
          id: string
          provider: string
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          encrypted_metadata?: string | null
          external_account_id?: string | null
          id?: string
          provider: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          encrypted_metadata?: string | null
          external_account_id?: string | null
          id?: string
          provider?: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          features_json: Json
          id: string
          limits_json: Json
          monthly_price_cents: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          features_json?: Json
          id?: string
          limits_json?: Json
          monthly_price_cents?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          features_json?: Json
          id?: string
          limits_json?: Json
          monthly_price_cents?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          locale: string
          status: Database["public"]["Enums"]["account_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id: string
          locale?: string
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          locale?: string
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          checksum: string | null
          content: string | null
          created_at: string
          id: string
          language: string | null
          path: string
          project_id: string
          size_bytes: number
          storage_path: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          checksum?: string | null
          content?: string | null
          created_at?: string
          id?: string
          language?: string | null
          path: string
          project_id: string
          size_bytes?: number
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          checksum?: string | null
          content?: string | null
          created_at?: string
          id?: string
          language?: string | null
          path?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          manifest_json: Json
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          manifest_json?: Json
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          manifest_json?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          created_at: string
          id: string
          project_id: string
          supabase_anon_key: string | null
          supabase_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          files: Json
          id: string
          label: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          label?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          label?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          default_model_id: string | null
          description: string | null
          framework: string | null
          id: string
          name: string
          owner_id: string
          repo_branch: string
          repo_full_name: string | null
          slug: string
          status: Database["public"]["Enums"]["project_status"]
          storage_path: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["project_visibility"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_model_id?: string | null
          description?: string | null
          framework?: string | null
          id?: string
          name: string
          owner_id: string
          repo_branch?: string
          repo_full_name?: string | null
          slug: string
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_model_id?: string | null
          description?: string | null
          framework?: string | null
          id?: string
          name?: string
          owner_id?: string
          repo_branch?: string
          repo_full_name?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_cents: number
          id: string
          latency_ms: number | null
          model_id: string | null
          project_id: string | null
          prompt_tokens: number
          provider: string | null
          request_id: string
          status: Database["public"]["Enums"]["usage_status"]
          total_tokens: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_cents?: number
          id?: string
          latency_ms?: number | null
          model_id?: string | null
          project_id?: string | null
          prompt_tokens?: number
          provider?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["usage_status"]
          total_tokens?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_cents?: number
          id?: string
          latency_ms?: number | null
          model_id?: string | null
          project_id?: string | null
          prompt_tokens?: number
          provider?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["usage_status"]
          total_tokens?: number
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
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
          id: string
          name: string
          owner_id: string
          plan_id: string | null
          slug: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: {
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      app_role: "admin" | "user"
      chat_status: "active" | "archived" | "error"
      integration_status: "connected" | "disconnected" | "error" | "not_configured"
      member_status: "active" | "invited" | "suspended"
      message_role: "system" | "user" | "assistant" | "tool"
      project_status: "active" | "archived" | "deleted"
      project_visibility: "private" | "workspace" | "public"
      subscription_status:
        | "incomplete"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "not_configured"
      usage_status: "success" | "error" | "rate_limited" | "quota_exceeded"
      workspace_role: "owner" | "admin" | "member" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleted"],
      app_role: ["admin", "user"],
      chat_status: ["active", "archived", "error"],
      integration_status: ["connected", "disconnected", "error", "not_configured"],
      member_status: ["active", "invited", "suspended"],
      message_role: ["system", "user", "assistant", "tool"],
      project_status: ["active", "archived", "deleted"],
      project_visibility: ["private", "workspace", "public"],
      subscription_status: [
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "not_configured",
      ],
      usage_status: ["success", "error", "rate_limited", "quota_exceeded"],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const

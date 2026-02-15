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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brainstorm_history: {
        Row: {
          brainstorm_id: string
          created_at: string
          field_name: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          position: number
          user_id: string
        }
        Insert: {
          brainstorm_id: string
          created_at?: string
          field_name: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          position?: number
          user_id: string
        }
        Update: {
          brainstorm_id?: string
          created_at?: string
          field_name?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brainstorm_history_brainstorm_id_fkey"
            columns: ["brainstorm_id"]
            isOneToOne: false
            referencedRelation: "brainstorms"
            referencedColumns: ["id"]
          },
        ]
      }
      brainstorm_references: {
        Row: {
          brainstorm_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          brainstorm_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          brainstorm_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brainstorm_references_brainstorm_id_fkey"
            columns: ["brainstorm_id"]
            isOneToOne: false
            referencedRelation: "brainstorms"
            referencedColumns: ["id"]
          },
        ]
      }
      brainstorms: {
        Row: {
          bullet_breakdown: string | null
          category: string | null
          chat_history: Json | null
          compiled_description: string | null
          created_at: string
          deleted_at: string | null
          id: string
          idea_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bullet_breakdown?: string | null
          category?: string | null
          chat_history?: Json | null
          compiled_description?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idea_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bullet_breakdown?: string | null
          category?: string | null
          chat_history?: Json | null
          compiled_description?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idea_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brainstorms_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_tasks: {
        Row: {
          campaign_id: string
          completed: boolean
          created_at: string
          description: string | null
          id: string
          sort_order: number
          status_column: string
          title: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status_column?: string
          title?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status_column?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          category: string | null
          chat_history: Json | null
          created_at: string
          deleted_at: string | null
          id: string
          interview_completed: boolean
          ip_strategy: string | null
          marketing_links: Json
          marketing_plan: string | null
          monetization_plan: string | null
          operations_plan: string | null
          playbook: string | null
          primary_channel: string
          project_id: string
          revenue: number
          sales_model: string
          status: string
          tags: string[] | null
          target_price: number
          title: string
          units_sold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          chat_history?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          interview_completed?: boolean
          ip_strategy?: string | null
          marketing_links?: Json
          marketing_plan?: string | null
          monetization_plan?: string | null
          operations_plan?: string | null
          playbook?: string | null
          primary_channel?: string
          project_id: string
          revenue?: number
          sales_model?: string
          status?: string
          tags?: string[] | null
          target_price?: number
          title?: string
          units_sold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          chat_history?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          interview_completed?: boolean
          ip_strategy?: string | null
          marketing_links?: Json
          marketing_plan?: string | null
          monetization_plan?: string | null
          operations_plan?: string | null
          playbook?: string | null
          primary_channel?: string
          project_id?: string
          revenue?: number
          sales_model?: string
          status?: string
          tags?: string[] | null
          target_price?: number
          title?: string
          units_sold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          id: string
          key_features: string | null
          processed_summary: string | null
          raw_dump: string
          status: string
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          key_features?: string | null
          processed_summary?: string | null
          raw_dump?: string
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          key_features?: string | null
          processed_summary?: string | null
          raw_dump?: string
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          category: string
          created_at: string
          file_name: string
          id: string
          project_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name?: string
          id?: string
          project_id: string
          storage_path?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          id?: string
          project_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          project_id: string
          receipt_url: string | null
          title: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          project_id: string
          receipt_url?: string | null
          title?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          project_id?: string
          receipt_url?: string | null
          title?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_references: {
        Row: {
          created_at: string
          description: string | null
          id: string
          project_id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          parent_task_id: string | null
          priority: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          project_id: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brainstorm_id: string | null
          bullet_breakdown: string | null
          campaign_id: string | null
          category: string | null
          compiled_description: string | null
          created_at: string
          deleted_at: string | null
          execution_strategy: string | null
          general_notes: string | null
          github_repo_url: string | null
          id: string
          name: string
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brainstorm_id?: string | null
          bullet_breakdown?: string | null
          campaign_id?: string | null
          category?: string | null
          compiled_description?: string | null
          created_at?: string
          deleted_at?: string | null
          execution_strategy?: string | null
          general_notes?: string | null
          github_repo_url?: string | null
          id?: string
          name?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brainstorm_id?: string | null
          bullet_breakdown?: string | null
          campaign_id?: string | null
          category?: string | null
          compiled_description?: string | null
          created_at?: string
          deleted_at?: string | null
          execution_strategy?: string | null
          general_notes?: string | null
          github_repo_url?: string | null
          id?: string
          name?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brainstorm_id_fkey"
            columns: ["brainstorm_id"]
            isOneToOne: false
            referencedRelation: "brainstorms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

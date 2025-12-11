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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          expense_date: string
          id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_name: string
          completion_date: string | null
          cost: number
          created_at: string | null
          created_by: string
          id: string
          job_height: number | null
          job_quantity: number | null
          job_type: string
          job_width: number | null
          length_deducted: number | null
          material_roll_id: string | null
          materials_used: string | null
          payment_at: string | null
          payment_mode: string | null
          payment_received: number | null
          rate_per_sqm: number | null
          received_by: string | null
          sqm_used: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_name: string
          completion_date?: string | null
          cost: number
          created_at?: string | null
          created_by: string
          id?: string
          job_height?: number | null
          job_quantity?: number | null
          job_type: string
          job_width?: number | null
          length_deducted?: number | null
          material_roll_id?: string | null
          materials_used?: string | null
          payment_at?: string | null
          payment_mode?: string | null
          payment_received?: number | null
          rate_per_sqm?: number | null
          received_by?: string | null
          sqm_used?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          completion_date?: string | null
          cost?: number
          created_at?: string | null
          created_by?: string
          id?: string
          job_height?: number | null
          job_quantity?: number | null
          job_type?: string
          job_width?: number | null
          length_deducted?: number | null
          material_roll_id?: string | null
          materials_used?: string | null
          payment_at?: string | null
          payment_mode?: string | null
          payment_received?: number | null
          rate_per_sqm?: number | null
          received_by?: string | null
          sqm_used?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_material_roll_id_fkey"
            columns: ["material_roll_id"]
            isOneToOne: false
            referencedRelation: "material_rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      material_rolls: {
        Row: {
          alert_level: number
          cost_per_sqm: number
          created_at: string | null
          created_by: string | null
          id: string
          initial_length: number
          material_type: Database["public"]["Enums"]["material_type"]
          remaining_length: number
          roll_id: string
          roll_width: number
          selling_rate_per_sqm: number
          updated_at: string | null
        }
        Insert: {
          alert_level?: number
          cost_per_sqm?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          initial_length: number
          material_type: Database["public"]["Enums"]["material_type"]
          remaining_length: number
          roll_id: string
          roll_width: number
          selling_rate_per_sqm?: number
          updated_at?: string | null
        }
        Update: {
          alert_level?: number
          cost_per_sqm?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          initial_length?: number
          material_type?: Database["public"]["Enums"]["material_type"]
          remaining_length?: number
          roll_id?: string
          roll_width?: number
          selling_rate_per_sqm?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          name: string
          quantity: number
          threshold: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          name: string
          quantity?: number
          threshold?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number
          threshold?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          generated_at: string | null
          id: string
          report_data: Json
          report_date: string
          report_type: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          report_data: Json
          report_date: string
          report_type: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          report_data?: Json
          report_date?: string
          report_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      material_type: "Vinyl" | "PVC Banner" | "Banner Material" | "DTF"
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
      material_type: ["Vinyl", "PVC Banner", "Banner Material", "DTF"],
    },
  },
} as const

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
      ai_health_reports: {
        Row: {
          content: Json
          created_at: string
          health_record_id: string | null
          id: string
          report_type: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          health_record_id?: string | null
          id?: string
          report_type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          health_record_id?: string | null
          id?: string
          report_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_health_reports_health_record_id_fkey"
            columns: ["health_record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_health_reviews: {
        Row: {
          created_at: string
          id: string
          report_id: string
          review_content: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          review_content?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          review_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_health_reviews_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_health_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      checkin_reports: {
        Row: {
          created_at: string
          energy_level: number | null
          id: string
          mood: string | null
          notes: string | null
          recorded_at: string
          sleep_hours: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          recorded_at?: string
          sleep_hours?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          recorded_at?: string
          sleep_hours?: number | null
          user_id?: string
        }
        Relationships: []
      }
      coach_notification_settings: {
        Row: {
          chat_alert: boolean | null
          checkin_alert: boolean | null
          coach_id: string
          created_at: string
          health_record_alert: boolean | null
          id: string
          new_user_alert: boolean | null
          updated_at: string
        }
        Insert: {
          chat_alert?: boolean | null
          checkin_alert?: boolean | null
          coach_id: string
          created_at?: string
          health_record_alert?: boolean | null
          id?: string
          new_user_alert?: boolean | null
          updated_at?: string
        }
        Update: {
          chat_alert?: boolean | null
          checkin_alert?: boolean | null
          coach_id?: string
          created_at?: string
          health_record_alert?: boolean | null
          id?: string
          new_user_alert?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      coaching_feedback: {
        Row: {
          coach_id: string
          created_at: string
          feedback: string | null
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      coaching_records: {
        Row: {
          coach_id: string
          created_at: string
          duration_min: number | null
          id: string
          notes: string | null
          session_type: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          session_type?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          session_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_name: string
          id: string
          protein_g: number | null
          serving_size: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name: string
          id?: string
          protein_g?: number | null
          serving_size?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string
          id?: string
          protein_g?: number | null
          serving_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          mission_date: string
          mission_type: string
          points: number | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mission_date?: string
          mission_type: string
          points?: number | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mission_date?: string
          mission_type?: string
          points?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_foods: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_name: string
          id: string
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name: string
          id?: string
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string
          id?: string
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      guardian_connections: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gym_records: {
        Row: {
          calories_burned: number | null
          created_at: string
          duration_min: number | null
          exercise_type: string
          id: string
          image_url: string | null
          notes: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          duration_min?: number | null
          exercise_type: string
          id?: string
          image_url?: string | null
          notes?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          duration_min?: number | null
          exercise_type?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_age_records: {
        Row: {
          actual_age: number
          created_at: string
          factors: Json | null
          health_age: number
          id: string
          user_id: string
        }
        Insert: {
          actual_age: number
          created_at?: string
          factors?: Json | null
          health_age: number
          id?: string
          user_id: string
        }
        Update: {
          actual_age?: number
          created_at?: string
          factors?: Json | null
          health_age?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          coach_comment: string | null
          created_at: string
          data: Json
          id: string
          image_url: string | null
          record_type: string
          recorded_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          coach_comment?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          record_type: string
          recorded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          coach_comment?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          record_type?: string
          recorded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_records: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_name: string
          id: string
          image_url: string | null
          meal_type: string
          protein_g: number | null
          recorded_at: string
          serving_size: string | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name: string
          id?: string
          image_url?: string | null
          meal_type: string
          protein_g?: number | null
          recorded_at?: string
          serving_size?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string
          id?: string
          image_url?: string | null
          meal_type?: string
          protein_g?: number | null
          recorded_at?: string
          serving_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_sets: {
        Row: {
          created_at: string
          foods: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          foods?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          foods?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          exercise_reminder: boolean | null
          id: string
          meal_reminder: boolean | null
          push_enabled: boolean | null
          updated_at: string
          user_id: string
          water_reminder: boolean | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          exercise_reminder?: boolean | null
          id?: string
          meal_reminder?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
          water_reminder?: boolean | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          exercise_reminder?: boolean | null
          id?: string
          meal_reminder?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          water_reminder?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_settings: {
        Row: {
          activity_level: string | null
          age: number | null
          calorie_goal: number | null
          carb_goal_g: number | null
          conditions: string[] | null
          created_at: string
          current_weight: number | null
          fat_goal_g: number | null
          gender: string | null
          goal_weight: number | null
          height_cm: number | null
          id: string
          protein_goal_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          conditions?: string[] | null
          created_at?: string
          current_weight?: number | null
          fat_goal_g?: number | null
          gender?: string | null
          goal_weight?: number | null
          height_cm?: number | null
          id?: string
          protein_goal_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          conditions?: string[] | null
          created_at?: string
          current_weight?: number | null
          fat_goal_g?: number | null
          gender?: string | null
          goal_weight?: number | null
          height_cm?: number | null
          id?: string
          protein_goal_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          payment_method: string | null
          product_id: string | null
          quantity: number | null
          shipping_address: Json | null
          status: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string | null
          product_id?: string | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string | null
          product_id?: string | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          order_id: string | null
          status: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          point_price: number | null
          price: number
          stock: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          point_price?: number | null
          price: number
          stock?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          point_price?: number | null
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_coach_id: string | null
          created_at: string
          current_points: number
          id: string
          nickname: string | null
          phone: string | null
          subscription_tier: string
          updated_at: string
          user_type: string
        }
        Insert: {
          assigned_coach_id?: string | null
          created_at?: string
          current_points?: number
          id: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?: string
          updated_at?: string
          user_type?: string
        }
        Update: {
          assigned_coach_id?: string | null
          created_at?: string
          current_points?: number
          id?: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_coach_id_fkey"
            columns: ["assigned_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          consented: boolean | null
          consented_at: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          consent_type: string
          consented?: boolean | null
          consented_at?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          consented?: boolean | null
          consented_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      water_records: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          recorded_at?: string
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
      app_role: "admin" | "coach" | "guardian" | "user"
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
      app_role: ["admin", "coach", "guardian", "user"],
    },
  },
} as const

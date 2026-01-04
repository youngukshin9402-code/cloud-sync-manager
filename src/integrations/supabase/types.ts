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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string
          target_table: string
        }
        Insert: {
          action_type: string
          admin_id: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id: string
          target_table: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      ai_health_reports: {
        Row: {
          ai_result: Json | null
          created_at: string
          id: string
          input_snapshot: Json | null
          source_record_id: string | null
          source_type: string
          status: string
          user_id: string
        }
        Insert: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          source_record_id?: string | null
          source_type?: string
          status?: string
          user_id: string
        }
        Update: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          source_record_id?: string | null
          source_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_health_reviews: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          overrides: Json | null
          report_id: string
          review_note: string | null
          review_status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          overrides?: Json | null
          report_id: string
          review_note?: string | null
          review_status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          overrides?: Json | null
          report_id?: string
          review_note?: string | null
          review_status?: string
          updated_at?: string
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
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean | null
          message: string
          message_type: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message: string
          message_type?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message?: string
          message_type?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      checkin_reports: {
        Row: {
          admin_id: string | null
          coach_id: string
          created_at: string
          id: string
          report_date: string
          sent_at: string
          snapshot_data: Json | null
          summary: Json
          user_id: string
          version_number: number
        }
        Insert: {
          admin_id?: string | null
          coach_id: string
          created_at?: string
          id?: string
          report_date?: string
          sent_at?: string
          snapshot_data?: Json | null
          summary?: Json
          user_id: string
          version_number?: number
        }
        Update: {
          admin_id?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          report_date?: string
          sent_at?: string
          snapshot_data?: Json | null
          summary?: Json
          user_id?: string
          version_number?: number
        }
        Relationships: []
      }
      checkin_templates: {
        Row: {
          condition_score: number | null
          created_at: string
          exercise_done: boolean | null
          id: string
          meal_count: number | null
          notes: string | null
          sleep_hours: number | null
          user_id: string
        }
        Insert: {
          condition_score?: number | null
          created_at?: string
          exercise_done?: boolean | null
          id?: string
          meal_count?: number | null
          notes?: string | null
          sleep_hours?: number | null
          user_id: string
        }
        Update: {
          condition_score?: number | null
          created_at?: string
          exercise_done?: boolean | null
          id?: string
          meal_count?: number | null
          notes?: string | null
          sleep_hours?: number | null
          user_id?: string
        }
        Relationships: []
      }
      coach_availability: {
        Row: {
          available_date: string
          coach_id: string
          end_time: string
          id: string
          is_booked: boolean | null
          start_time: string
        }
        Insert: {
          available_date: string
          coach_id: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          start_time: string
        }
        Update: {
          available_date?: string
          coach_id?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notification_settings: {
        Row: {
          chat_message: boolean | null
          coach_id: string
          created_at: string
          health_checkup_upload: boolean | null
          id: string
          inbody_upload: boolean | null
          updated_at: string
        }
        Insert: {
          chat_message?: boolean | null
          coach_id: string
          created_at?: string
          health_checkup_upload?: boolean | null
          id?: string
          inbody_upload?: boolean | null
          updated_at?: string
        }
        Update: {
          chat_message?: boolean | null
          coach_id?: string
          created_at?: string
          health_checkup_upload?: boolean | null
          id?: string
          inbody_upload?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notification_settings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_feedback: {
        Row: {
          audio_url: string | null
          coach_id: string
          content: string | null
          created_at: string
          feedback_type: string
          id: string
          is_read: boolean
          session_id: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          coach_id: string
          content?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          is_read?: boolean
          session_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          coach_id?: string
          content?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_read?: boolean
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_records: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          notes: string | null
          session_date: string
          session_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          session_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          session_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_records_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_id: string
          coach_notes: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id: string
          video_room_id: string | null
        }
        Insert: {
          coach_id: string
          coach_notes?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id: string
          video_room_id?: string | null
        }
        Update: {
          coach_id?: string
          coach_notes?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["coaching_session_status"] | null
          user_id?: string
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_requests: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          message: string | null
          name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string | null
          fat: number
          id: string
          name: string
          protein: number
          user_id: string
        }
        Insert: {
          calories: number
          carbs?: number
          created_at?: string | null
          fat?: number
          id?: string
          name: string
          protein?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string | null
          fat?: number
          id?: string
          name?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_goal_achievements: {
        Row: {
          achieved: boolean
          created_at: string
          date: string
          id: string
          notified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved?: boolean
          created_at?: string
          date?: string
          id?: string
          notified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved?: boolean
          created_at?: string
          date?: string
          id?: string
          notified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          ai_feedback: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_completed: boolean | null
          log_date: string
          log_type: Database["public"]["Enums"]["daily_log_type"]
          points_earned: number | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          log_date?: string
          log_type: Database["public"]["Enums"]["daily_log_type"]
          points_earned?: number | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          log_date?: string
          log_type?: Database["public"]["Enums"]["daily_log_type"]
          points_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          id: string
          name: string
          portion: string | null
          protein: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name: string
          portion?: string | null
          protein?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          name?: string
          portion?: string | null
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      guardian_connections: {
        Row: {
          code_expires_at: string | null
          connected_at: string | null
          connection_code: string | null
          guardian_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          code_expires_at?: string | null
          connected_at?: string | null
          connection_code?: string | null
          guardian_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code_expires_at?: string | null
          connected_at?: string | null
          connection_code?: string | null
          guardian_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_connections_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_records: {
        Row: {
          client_id: string | null
          created_at: string | null
          date: string
          exercises: Json
          id: string
          images: string[] | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          date: string
          exercises?: Json
          id?: string
          images?: string[] | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          date?: string
          exercises?: Json
          id?: string
          images?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      health_age_results: {
        Row: {
          actual_age: number
          analysis: string | null
          body_score: number | null
          calculated_at: string
          created_at: string
          health_age: number
          id: string
          inbody_data: Json | null
          inbody_record_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_age: number
          analysis?: string | null
          body_score?: number | null
          calculated_at?: string
          created_at?: string
          health_age: number
          id?: string
          inbody_data?: Json | null
          inbody_record_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_age?: number
          analysis?: string | null
          body_score?: number | null
          calculated_at?: string
          created_at?: string
          health_age?: number
          id?: string
          inbody_data?: Json | null
          inbody_record_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_checkup_records: {
        Row: {
          alt: number | null
          ast: number | null
          blood_sugar: number | null
          cholesterol: number | null
          created_at: string | null
          creatinine: number | null
          date: string
          diastolic_bp: number | null
          hba1c: number | null
          id: string
          systolic_bp: number | null
          triglyceride: number | null
          user_id: string
        }
        Insert: {
          alt?: number | null
          ast?: number | null
          blood_sugar?: number | null
          cholesterol?: number | null
          created_at?: string | null
          creatinine?: number | null
          date: string
          diastolic_bp?: number | null
          hba1c?: number | null
          id?: string
          systolic_bp?: number | null
          triglyceride?: number | null
          user_id: string
        }
        Update: {
          alt?: number | null
          ast?: number | null
          blood_sugar?: number | null
          cholesterol?: number | null
          created_at?: string | null
          creatinine?: number | null
          date?: string
          diastolic_bp?: number | null
          hba1c?: number | null
          id?: string
          systolic_bp?: number | null
          triglyceride?: number | null
          user_id?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          coach_comment: string | null
          created_at: string | null
          exam_date: string | null
          health_age: number | null
          health_tags: string[] | null
          id: string
          parsed_data: Json | null
          raw_image_urls: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["health_record_status"] | null
          user_id: string
        }
        Insert: {
          coach_comment?: string | null
          created_at?: string | null
          exam_date?: string | null
          health_age?: number | null
          health_tags?: string[] | null
          id?: string
          parsed_data?: Json | null
          raw_image_urls: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["health_record_status"] | null
          user_id: string
        }
        Update: {
          coach_comment?: string | null
          created_at?: string | null
          exam_date?: string | null
          health_age?: number | null
          health_tags?: string[] | null
          id?: string
          parsed_data?: Json | null
          raw_image_urls?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["health_record_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inbody_records: {
        Row: {
          bmr: number | null
          body_fat: number | null
          body_fat_percent: number | null
          created_at: string | null
          date: string
          id: string
          skeletal_muscle: number | null
          user_id: string
          visceral_fat: number | null
          visceral_fat_area: number | null
          weight: number
        }
        Insert: {
          bmr?: number | null
          body_fat?: number | null
          body_fat_percent?: number | null
          created_at?: string | null
          date: string
          id?: string
          skeletal_muscle?: number | null
          user_id: string
          visceral_fat?: number | null
          visceral_fat_area?: number | null
          weight: number
        }
        Update: {
          bmr?: number | null
          body_fat?: number | null
          body_fat_percent?: number | null
          created_at?: string | null
          date?: string
          id?: string
          skeletal_muscle?: number | null
          user_id?: string
          visceral_fat?: number | null
          visceral_fat_area?: number | null
          weight?: number
        }
        Relationships: []
      }
      meal_records: {
        Row: {
          client_id: string | null
          created_at: string | null
          date: string
          foods: Json
          id: string
          image_url: string | null
          meal_type: string
          total_calories: number | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          date: string
          foods?: Json
          id?: string
          image_url?: string | null
          meal_type: string
          total_calories?: number | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          date?: string
          foods?: Json
          id?: string
          image_url?: string | null
          meal_type?: string
          total_calories?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meal_sets: {
        Row: {
          created_at: string
          foods: Json
          id: string
          meal_type: string
          name: string
          total_calories: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          foods?: Json
          id?: string
          meal_type?: string
          name: string
          total_calories?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          foods?: Json
          id?: string
          meal_type?: string
          name?: string
          total_calories?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_templates: {
        Row: {
          coach_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          points: number | null
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          user_id: string
        }
        Update: {
          coach_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          coaching_reminder: boolean | null
          default_reminder: boolean | null
          exercise_reminder: boolean | null
          id: string
          meal_reminder: boolean | null
          updated_at: string | null
          user_id: string
          water_reminder: boolean | null
        }
        Insert: {
          coaching_reminder?: boolean | null
          default_reminder?: boolean | null
          exercise_reminder?: boolean | null
          id?: string
          meal_reminder?: boolean | null
          updated_at?: string | null
          user_id: string
          water_reminder?: boolean | null
        }
        Update: {
          coaching_reminder?: boolean | null
          default_reminder?: boolean | null
          exercise_reminder?: boolean | null
          id?: string
          meal_reminder?: boolean | null
          updated_at?: string | null
          user_id?: string
          water_reminder?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          is_read: boolean
          message: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
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
          current_weight: number | null
          fat_goal_g: number | null
          gender: string | null
          goal_weight: number | null
          height_cm: number | null
          protein_goal_g: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          conditions?: string[] | null
          current_weight?: number | null
          fat_goal_g?: number | null
          gender?: string | null
          goal_weight?: number | null
          height_cm?: number | null
          protein_goal_g?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          conditions?: string[] | null
          current_weight?: number | null
          fat_goal_g?: number | null
          gender?: string | null
          goal_weight?: number | null
          height_cm?: number | null
          protein_goal_g?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          is_beta: boolean | null
          payment_method: string | null
          price: number
          product_id: string | null
          product_name: string
          product_type: string
          status: Database["public"]["Enums"]["order_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_beta?: boolean | null
          payment_method?: string | null
          price: number
          product_id?: string | null
          product_name: string
          product_type: string
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_beta?: boolean | null
          payment_method?: string | null
          price?: number
          product_id?: string | null
          product_name?: string
          product_type?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
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
          order_id: string
          paid_at: string | null
          payment_key: string | null
          product_id: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          payment_key?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_key?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          purpose?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      point_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          health_tags: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          purchase_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          health_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          purchase_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          health_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          purchase_link?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_coach_id: string | null
          created_at: string | null
          current_points: number | null
          id: string
          nickname: string | null
          phone: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          assigned_coach_id?: string | null
          created_at?: string | null
          current_points?: number | null
          id: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          assigned_coach_id?: string | null
          created_at?: string | null
          current_points?: number | null
          id?: string
          nickname?: string | null
          phone?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
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
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          reminder_type: string
          scheduled_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          reminder_type: string
          scheduled_time: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          reminder_type?: string
          scheduled_time?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          payer_id: string
          payment_method: string | null
          plan_type: string
          price: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payer_id: string
          payment_method?: string | null
          plan_type: string
          price: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payer_id?: string
          payment_method?: string | null
          plan_type?: string
          price?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_message_history: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          message_id: string
          previous_message: string
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          message_id: string
          previous_message: string
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          message_id?: string
          previous_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_message_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_replies: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_admin: boolean
          is_deleted: boolean
          message: string
          sender_type: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_admin?: boolean
          is_deleted?: boolean
          message: string
          sender_type?: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_admin?: boolean
          is_deleted?: boolean
          message?: string
          sender_type?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          additional_messages: Json | null
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_messages?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_messages?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          agreed_at: string | null
          created_at: string | null
          health_info_agreed: boolean
          id: string
          marketing_agreed: boolean | null
          privacy_agreed: boolean
          terms_agreed: boolean
          user_id: string
        }
        Insert: {
          agreed_at?: string | null
          created_at?: string | null
          health_info_agreed?: boolean
          id?: string
          marketing_agreed?: boolean | null
          privacy_agreed?: boolean
          terms_agreed?: boolean
          user_id: string
        }
        Update: {
          agreed_at?: string | null
          created_at?: string | null
          health_info_agreed?: boolean
          id?: string
          marketing_agreed?: boolean | null
          privacy_agreed?: boolean
          terms_agreed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_settings: {
        Row: {
          daily_goal: number
          evening_reminder: boolean | null
          id: string
          reminder_enabled: boolean | null
          reminder_end: string | null
          reminder_interval: number | null
          reminder_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          daily_goal?: number
          evening_reminder?: boolean | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_end?: string | null
          reminder_interval?: number | null
          reminder_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          daily_goal?: number
          evening_reminder?: boolean | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_end?: string | null
          reminder_interval?: number | null
          reminder_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          avg_calories: number | null
          avg_carbs: number | null
          avg_fat: number | null
          avg_protein: number | null
          calorie_goal_rate: number | null
          created_at: string
          id: string
          improvements: Json | null
          protein_goal_rate: number | null
          recommendations: Json | null
          top_foods: Json | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          avg_calories?: number | null
          avg_carbs?: number | null
          avg_fat?: number | null
          avg_protein?: number | null
          calorie_goal_rate?: number | null
          created_at?: string
          id?: string
          improvements?: Json | null
          protein_goal_rate?: number | null
          recommendations?: Json | null
          top_foods?: Json | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          avg_calories?: number | null
          avg_carbs?: number | null
          avg_fat?: number | null
          avg_protein?: number | null
          calorie_goal_rate?: number | null
          created_at?: string
          id?: string
          improvements?: Json | null
          protein_goal_rate?: number | null
          recommendations?: Json | null
          top_foods?: Json | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weight_goals: {
        Row: {
          created_at: string | null
          id: string
          start_date: string
          start_weight: number
          target_date: string
          target_weight: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          start_date: string
          start_weight: number
          target_date: string
          target_weight: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          start_date?: string
          start_weight?: number
          target_date?: string
          target_weight?: number
          user_id?: string
        }
        Relationships: []
      }
      weight_records: {
        Row: {
          created_at: string | null
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      connect_guardian_with_code: { Args: { p_code: string }; Returns: Json }
      connect_guardian_with_phone_verification: {
        Args: { p_target_user_phone: string; p_verification_code: string }
        Returns: Json
      }
      generate_phone_verification_code: {
        Args: { p_phone: string; p_purpose?: string }
        Returns: Json
      }
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
      coaching_session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      daily_log_type: "food" | "mission"
      health_record_status:
        | "uploading"
        | "analyzing"
        | "pending_review"
        | "completed"
        | "rejected"
      order_status:
        | "requested"
        | "pending"
        | "paid"
        | "coaching_started"
        | "cancel_requested"
        | "cancelled"
        | "refunded"
      subscription_tier: "basic" | "premium"
      user_type: "user" | "guardian" | "coach" | "admin"
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
      coaching_session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      daily_log_type: ["food", "mission"],
      health_record_status: [
        "uploading",
        "analyzing",
        "pending_review",
        "completed",
        "rejected",
      ],
      order_status: [
        "requested",
        "pending",
        "paid",
        "coaching_started",
        "cancel_requested",
        "cancelled",
        "refunded",
      ],
      subscription_tier: ["basic", "premium"],
      user_type: ["user", "guardian", "coach", "admin"],
    },
  },
} as const

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
      greeting_cards: {
        Row: {
          background_color: string
          created_at: string
          created_by: string | null
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          template_style: string
          text_color: string
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          template_style?: string
          text_color?: string
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          template_style?: string
          text_color?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "greeting_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          item_description: string
          item_icon: string
          item_name: string
          item_type: string
          quantity: number
          redeemed: boolean
          redeemed_at: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description?: string
          item_icon?: string
          item_name: string
          item_type?: string
          quantity?: number
          redeemed?: boolean
          redeemed_at?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string
          item_icon?: string
          item_name?: string
          item_type?: string
          quantity?: number
          redeemed?: boolean
          redeemed_at?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard: {
        Row: {
          created_at: string
          id: string
          levels_completed: number
          player_name: string
          profile_photo: string | null
          total_dimsum: number
          total_stars: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          levels_completed?: number
          player_name: string
          profile_photo?: string | null
          total_dimsum?: number
          total_stars?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          levels_completed?: number
          player_name?: string
          profile_photo?: string | null
          total_dimsum?: number
          total_stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_progress: {
        Row: {
          best_time: number
          completed: boolean
          created_at: string
          dimsum_collected: number
          dimsum_total: number
          id: string
          level_id: number
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_time?: number
          completed?: boolean
          created_at?: string
          dimsum_collected?: number
          dimsum_total?: number
          id?: string
          level_id: number
          stars?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_time?: number
          completed?: boolean
          created_at?: string
          dimsum_collected?: number
          dimsum_total?: number
          id?: string
          level_id?: number
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_boxes: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          created_at: string
          custom_message: string | null
          description: string
          expires_at: string | null
          greeting_card_id: string | null
          id: string
          name: string
          opened_at: string | null
          prize_id: string | null
          redemption_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          created_at?: string
          custom_message?: string | null
          description?: string
          expires_at?: string | null
          greeting_card_id?: string | null
          id?: string
          name: string
          opened_at?: string | null
          prize_id?: string | null
          redemption_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          created_at?: string
          custom_message?: string | null
          description?: string
          expires_at?: string | null
          greeting_card_id?: string | null
          id?: string
          name?: string
          opened_at?: string | null
          prize_id?: string | null
          redemption_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_boxes_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_boxes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_boxes_greeting_card_id_fkey"
            columns: ["greeting_card_id"]
            isOneToOne: false
            referencedRelation: "greeting_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mystery_boxes_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          type: string
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prizes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          character_id: string
          created_at: string
          display_name: string
          game_user_id: string
          id: string
          levels_completed: number
          role: string
          tickets: number
          tickets_used: number
          total_dimsum: number
          total_stars: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          character_id?: string
          created_at?: string
          display_name?: string
          game_user_id?: string
          id: string
          levels_completed?: number
          role?: string
          tickets?: number
          tickets_used?: number
          total_dimsum?: number
          total_stars?: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          character_id?: string
          created_at?: string
          display_name?: string
          game_user_id?: string
          id?: string
          levels_completed?: number
          role?: string
          tickets?: number
          tickets_used?: number
          total_dimsum?: number
          total_stars?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      generate_game_user_id: { Args: never; Returns: string }
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

/**
 * Database Types for Supabase
 * 
 * TypeScript definitions matching the Supabase database schema.
 * These types are used by the Supabase client for type-safe queries.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;               // UUID from auth.users
          username: string;
          game_user_id: string;     // Unique game ID like "DD-XXXX"
          display_name: string;
          avatar_url: string | null;
          character_id: string;
          role: 'player' | 'admin';
          total_dimsum: number;
          total_stars: number;
          levels_completed: number;
          tickets: number;
          tickets_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          game_user_id?: string;
          display_name: string;
          avatar_url?: string | null;
          character_id?: string;
          role?: 'player' | 'admin';
          total_dimsum?: number;
          total_stars?: number;
          levels_completed?: number;
          tickets?: number;
          tickets_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          game_user_id?: string;
          display_name?: string;
          avatar_url?: string | null;
          character_id?: string;
          role?: 'player' | 'admin';
          total_dimsum?: number;
          total_stars?: number;
          levels_completed?: number;
          tickets?: number;
          tickets_used?: number;
          updated_at?: string;
        };
      };
      level_progress: {
        Row: {
          id: string;
          user_id: string;
          level_id: number;
          dimsum_collected: number;
          dimsum_total: number;
          stars: number;
          completed: boolean;
          best_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          level_id: number;
          dimsum_collected?: number;
          dimsum_total?: number;
          stars?: number;
          completed?: boolean;
          best_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          dimsum_collected?: number;
          dimsum_total?: number;
          stars?: number;
          completed?: boolean;
          best_time?: number;
          updated_at?: string;
        };
      };
      prizes: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          type: 'birthday_card' | 'inventory_item' | 'dimsum_bonus' | 'cosmetic' | 'spin_ticket' | 'physical_gift';
          value: number | null;
          image_url: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon?: string;
          type: 'birthday_card' | 'inventory_item' | 'dimsum_bonus' | 'cosmetic' | 'spin_ticket' | 'physical_gift';
          value?: number | null;
          image_url?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string;
          type?: 'birthday_card' | 'inventory_item' | 'dimsum_bonus' | 'cosmetic' | 'spin_ticket' | 'physical_gift';
          value?: number | null;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      greeting_cards: {
        Row: {
          id: string;
          title: string;
          message: string;
          template_style: string;
          background_color: string;
          text_color: string;
          icon: string;
          image_url: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          template_style?: string;
          background_color?: string;
          text_color?: string;
          icon?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          template_style?: string;
          background_color?: string;
          text_color?: string;
          icon?: string;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      mystery_boxes: {
        Row: {
          id: string;
          name: string;
          description: string;
          prize_id: string | null;
          greeting_card_id: string | null;
          assigned_to: string | null;
          assigned_by: string;
          status: 'pending' | 'delivered' | 'opened' | 'expired';
          redemption_code: string | null;
          custom_message: string | null;
          expires_at: string | null;
          opened_at: string | null;
          include_spin_wheel: boolean;
          spin_count: number;
          wish_flow_step: string | null;
          wish_input: string | null;
          wish_birth_day: number | null;
          wish_birth_month: number | null;
          wish_ai_reply: string | null;
          wish_completed: boolean;
          wish_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          prize_id?: string | null;
          greeting_card_id?: string | null;
          assigned_to?: string | null;
          assigned_by: string;
          status?: 'pending' | 'delivered' | 'opened' | 'expired';
          redemption_code?: string | null;
          custom_message?: string | null;
          expires_at?: string | null;
          opened_at?: string | null;
          include_spin_wheel?: boolean;
          spin_count?: number;
          wish_flow_step?: string | null;
          wish_input?: string | null;
          wish_birth_day?: number | null;
          wish_birth_month?: number | null;
          wish_ai_reply?: string | null;
          wish_completed?: boolean;
          wish_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          prize_id?: string | null;
          greeting_card_id?: string | null;
          assigned_to?: string | null;
          status?: 'pending' | 'delivered' | 'opened' | 'expired';
          redemption_code?: string | null;
          custom_message?: string | null;
          expires_at?: string | null;
          opened_at?: string | null;
          include_spin_wheel?: boolean;
          spin_count?: number;
          wish_flow_step?: string | null;
          wish_input?: string | null;
          wish_birth_day?: number | null;
          wish_birth_month?: number | null;
          wish_ai_reply?: string | null;
          wish_completed?: boolean;
          wish_updated_at?: string | null;
          updated_at?: string;
        };
      };
      spin_wheel_prizes: {
        Row: {
          id: string;
          name: string;
          label: string;
          description: string;
          icon: string;
          color: string;
          dark_color: string;
          image_url: string | null;
          prize_type: 'physical' | 'dimsum_bonus' | 'cosmetic' | 'special';
          value: number;
          weight: number;
          is_active: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          label: string;
          description?: string;
          icon?: string;
          color?: string;
          dark_color?: string;
          image_url?: string | null;
          prize_type?: 'physical' | 'dimsum_bonus' | 'cosmetic' | 'special';
          value?: number;
          weight?: number;
          is_active?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          label?: string;
          description?: string;
          icon?: string;
          color?: string;
          dark_color?: string;
          image_url?: string | null;
          prize_type?: 'physical' | 'dimsum_bonus' | 'cosmetic' | 'special';
          value?: number;
          weight?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      voucher_redemptions: {
        Row: {
          id: string;
          user_id: string;
          source_type: string;
          status: 'pending' | 'sent' | 'redeemed' | 'cancelled';
          voucher_code: string | null;
          prizes_text: string;
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type?: string;
          status?: 'pending' | 'sent' | 'redeemed' | 'cancelled';
          voucher_code?: string | null;
          prizes_text: string;
          message: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_type?: string;
          status?: 'pending' | 'sent' | 'redeemed' | 'cancelled';
          voucher_code?: string | null;
          prizes_text?: string;
          message?: string;
          metadata?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          user_id: string;
          item_name: string;
          item_description: string;
          item_icon: string;
          item_type: 'consumable' | 'cosmetic' | 'special';
          quantity: number;
          redeemed: boolean;
          redeemed_at: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_name: string;
          item_description: string;
          item_icon?: string;
          item_type?: 'consumable' | 'cosmetic' | 'special';
          quantity?: number;
          redeemed?: boolean;
          redeemed_at?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          quantity?: number;
          redeemed?: boolean;
          redeemed_at?: string | null;
        };
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          player_name: string;
          profile_photo: string | null;
          total_dimsum: number;
          levels_completed: number;
          total_stars: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          player_name: string;
          profile_photo?: string | null;
          total_dimsum?: number;
          levels_completed?: number;
          total_stars?: number;
          created_at?: string;
        };
        Update: {
          player_name?: string;
          profile_photo?: string | null;
          total_dimsum?: number;
          levels_completed?: number;
          total_stars?: number;
        };
      };
    };
    Functions: {
      generate_game_user_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// ─── Convenience type aliases ─────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type Prize = Database['public']['Tables']['prizes']['Row'];
export type PrizeInsert = Database['public']['Tables']['prizes']['Insert'];
export type GreetingCard = Database['public']['Tables']['greeting_cards']['Row'];
export type GreetingCardInsert = Database['public']['Tables']['greeting_cards']['Insert'];
export type MysteryBox = Database['public']['Tables']['mystery_boxes']['Row'];
export type MysteryBoxInsert = Database['public']['Tables']['mystery_boxes']['Insert'];
export type LevelProgress = Database['public']['Tables']['level_progress']['Row'];
export type InventoryItem = Database['public']['Tables']['inventory']['Row'];
export type LeaderboardEntry = Database['public']['Tables']['leaderboard']['Row'];
export type SpinWheelPrize = Database['public']['Tables']['spin_wheel_prizes']['Row'];
export type SpinWheelPrizeInsert = Database['public']['Tables']['spin_wheel_prizes']['Insert'];
export type SpinWheelPrizeUpdate = Database['public']['Tables']['spin_wheel_prizes']['Update'];
export type VoucherRedemption = Database['public']['Tables']['voucher_redemptions']['Row'];
export type VoucherRedemptionInsert = Database['public']['Tables']['voucher_redemptions']['Insert'];
export type VoucherRedemptionUpdate = Database['public']['Tables']['voucher_redemptions']['Update'];

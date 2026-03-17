-- ═══════════════════════════════════════════════════════════════════════════
-- Dimsum Dash — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Function: Generate Game User ID ──────────────────────────────────────
-- Generates a unique game ID like "DD-A1B2C3"
CREATE OR REPLACE FUNCTION public.generate_game_user_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'DD-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── Table: profiles ──────────────────────────────────────────────────────
-- Core user profile, linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  game_user_id TEXT UNIQUE NOT NULL DEFAULT public.generate_game_user_id(),
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  character_id TEXT NOT NULL DEFAULT 'agree',
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  total_dimsum INT NOT NULL DEFAULT 0,
  total_stars INT NOT NULL DEFAULT 0,
  levels_completed INT NOT NULL DEFAULT 0,
  tickets INT NOT NULL DEFAULT 0,
  tickets_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure game_user_id uniqueness with retries
CREATE OR REPLACE FUNCTION public.ensure_unique_game_id()
RETURNS TRIGGER AS $$
DECLARE
  attempts INT := 0;
  new_id TEXT;
BEGIN
  IF NEW.game_user_id IS NULL OR NEW.game_user_id = '' THEN
    LOOP
      new_id := public.generate_game_user_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE game_user_id = new_id);
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique game_user_id after 10 attempts';
      END IF;
    END LOOP;
    NEW.game_user_id := new_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_unique_game_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_unique_game_id();

-- ─── Table: level_progress ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.level_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INT NOT NULL,
  dimsum_collected INT NOT NULL DEFAULT 0,
  dimsum_total INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  completed BOOLEAN NOT NULL DEFAULT false,
  best_time REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_id)
);

-- ─── Table: prizes ────────────────────────────────────────────────────────
-- Admin-created prize definitions
CREATE TABLE IF NOT EXISTS public.prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🎁',
  type TEXT NOT NULL DEFAULT 'inventory_item' CHECK (
    type IN ('birthday_card', 'inventory_item', 'dimsum_bonus', 'cosmetic', 'spin_ticket', 'physical_gift')
  ),
  value INT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: greeting_cards ────────────────────────────────────────────────
-- Admin-created greeting card templates
CREATE TABLE IF NOT EXISTS public.greeting_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  template_style TEXT NOT NULL DEFAULT 'default',
  background_color TEXT NOT NULL DEFAULT '#1a1a2e',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  icon TEXT NOT NULL DEFAULT '🎂',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: mystery_boxes ─────────────────────────────────────────────────
-- Mystery box instances that admin assigns to users
CREATE TABLE IF NOT EXISTS public.mystery_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prize_id UUID REFERENCES public.prizes(id) ON DELETE SET NULL,
  greeting_card_id UUID REFERENCES public.greeting_cards(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'delivered', 'opened', 'expired')
  ),
  redemption_code TEXT UNIQUE,
  custom_message TEXT,
  expires_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: inventory ─────────────────────────────────────────────────────
-- User inventory items (from mystery boxes, gameplay, etc.)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT NOT NULL DEFAULT '',
  item_icon TEXT NOT NULL DEFAULT '📦',
  item_type TEXT NOT NULL DEFAULT 'consumable' CHECK (
    item_type IN ('consumable', 'cosmetic', 'special')
  ),
  quantity INT NOT NULL DEFAULT 1,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'mystery_box',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: leaderboard ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  profile_photo TEXT,
  total_dimsum INT NOT NULL DEFAULT 0,
  levels_completed INT NOT NULL DEFAULT 0,
  total_stars INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_game_user_id ON public.profiles(game_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_level_progress_user_id ON public.level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_assigned_to ON public.mystery_boxes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_status ON public.mystery_boxes(status);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_code ON public.mystery_boxes(redemption_code);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_dimsum ON public.leaderboard(total_dimsum DESC);
CREATE INDEX IF NOT EXISTS idx_prizes_active ON public.prizes(is_active);
CREATE INDEX IF NOT EXISTS idx_greeting_cards_active ON public.greeting_cards(is_active);

-- ─── Updated-at Trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_level_progress_updated_at
  BEFORE UPDATE ON public.level_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_prizes_updated_at
  BEFORE UPDATE ON public.prizes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_greeting_cards_updated_at
  BEFORE UPDATE ON public.greeting_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_mystery_boxes_updated_at
  BEFORE UPDATE ON public.mystery_boxes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Level Progress: Users can read all, manage their own
CREATE POLICY "level_progress_select_all" ON public.level_progress
  FOR SELECT USING (true);

CREATE POLICY "level_progress_insert_own" ON public.level_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "level_progress_update_own" ON public.level_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Prizes: Everyone can read active prizes, admins can manage
CREATE POLICY "prizes_select_active" ON public.prizes
  FOR SELECT USING (true);

CREATE POLICY "prizes_admin_insert" ON public.prizes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "prizes_admin_update" ON public.prizes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "prizes_admin_delete" ON public.prizes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Greeting Cards: Everyone can read active, admins can manage
CREATE POLICY "greeting_cards_select_active" ON public.greeting_cards
  FOR SELECT USING (true);

CREATE POLICY "greeting_cards_admin_insert" ON public.greeting_cards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "greeting_cards_admin_update" ON public.greeting_cards
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "greeting_cards_admin_delete" ON public.greeting_cards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Mystery Boxes: Users see their own, admins see all
CREATE POLICY "mystery_boxes_select" ON public.mystery_boxes
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mystery_boxes_admin_insert" ON public.mystery_boxes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mystery_boxes_admin_update" ON public.mystery_boxes
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Inventory: Users can see and manage their own
CREATE POLICY "inventory_select_own" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "inventory_insert_own" ON public.inventory
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "inventory_update_own" ON public.inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard: Everyone can read, users can insert their own
CREATE POLICY "leaderboard_select_all" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "leaderboard_insert_own" ON public.leaderboard
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leaderboard_update_own" ON public.leaderboard
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Create Admin User Helper ─────────────────────────────────────────────
-- After running this migration, create the admin user via signup in the app.
-- The admin account will be: username = "admin", password = "demo123456"
-- Then run this to promote to admin:
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'admin';

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE public.prizes IS 'Admin-created prize definitions for mystery boxes';
COMMENT ON TABLE public.greeting_cards IS 'Admin-created greeting card templates';
COMMENT ON TABLE public.mystery_boxes IS 'Mystery box instances assigned to users by admin';
COMMENT ON TABLE public.inventory IS 'User inventory items from gameplay and mystery boxes';
COMMENT ON TABLE public.leaderboard IS 'Global leaderboard entries';

-- ═══════════════════════════════════════════════════════════════════════════
-- 02: Database Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Table: profiles ──────────────────────────────────────────────────────
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
  -- Spin wheel integration
  include_spin_wheel BOOLEAN NOT NULL DEFAULT false,
  spin_count INT NOT NULL DEFAULT 0,
  spin_consumed INT NOT NULL DEFAULT 0,
  -- Birthday wish flow
  wish_flow_step TEXT,
  wish_input TEXT,
  wish_birth_day INT,
  wish_birth_month INT,
  wish_ai_reply TEXT,
  wish_completed BOOLEAN NOT NULL DEFAULT false,
  wish_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: inventory ─────────────────────────────────────────────────────
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_name)
);

-- ─── Table: leaderboard ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  profile_photo TEXT,
  total_dimsum INT NOT NULL DEFAULT 0,
  levels_completed INT NOT NULL DEFAULT 0,
  total_stars INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: spin_wheel_prizes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spin_wheel_prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🎁',
  color TEXT NOT NULL DEFAULT '#f59e0b',
  dark_color TEXT NOT NULL DEFAULT '#b45309',
  image_url TEXT,
  prize_type TEXT NOT NULL DEFAULT 'physical' CHECK (
    prize_type IN ('physical', 'dimsum_bonus', 'cosmetic', 'special')
  ),
  value INT NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Table: voucher_redemptions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'spin_wheel',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'redeemed', 'cancelled')
  ),
  voucher_code TEXT,
  prizes_text TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Comments ─────────────────────────────────────────────────────────────
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE public.level_progress IS 'Level completion progress and best scores';
COMMENT ON TABLE public.prizes IS 'Admin-created prize definitions';
COMMENT ON TABLE public.greeting_cards IS 'Admin-created greeting card templates';
COMMENT ON TABLE public.mystery_boxes IS 'Mystery box instances assigned to users';
COMMENT ON TABLE public.inventory IS 'User inventory items from gameplay';
COMMENT ON TABLE public.leaderboard IS 'Global leaderboard entries';
COMMENT ON TABLE public.spin_wheel_prizes IS 'Spin wheel prize pool';
COMMENT ON TABLE public.voucher_redemptions IS 'WhatsApp voucher redemption tracking';

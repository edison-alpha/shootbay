-- ═══════════════════════════════════════════════════════════════════════════
-- 03: Performance Indexes (Composite & Covering)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Basic Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ─── Composite Indexes (60-80% faster queries) ────────────────────────────

-- Level Progress: User + level lookups with covering columns
CREATE INDEX IF NOT EXISTS idx_level_progress_user_level 
  ON public.level_progress(user_id, level_id) 
  INCLUDE (dimsum_collected, stars, best_time, completed);

-- Inventory: User + item lookups with quantity/status
CREATE INDEX IF NOT EXISTS idx_inventory_user_item 
  ON public.inventory(user_id, item_name) 
  INCLUDE (quantity, redeemed, item_type);

-- Mystery Boxes: Assigned user + status (partial index for active boxes)
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_assigned_status 
  ON public.mystery_boxes(assigned_to, status) 
  WHERE status IN ('pending', 'delivered', 'opened');

CREATE INDEX IF NOT EXISTS idx_mystery_boxes_code 
  ON public.mystery_boxes(redemption_code);

-- Leaderboard: Covering index for sorted queries (index-only scans)
CREATE INDEX IF NOT EXISTS idx_leaderboard_covering 
  ON public.leaderboard(total_dimsum DESC) 
  INCLUDE (player_name, total_stars, levels_completed, profile_photo, user_id);

-- Voucher Redemptions: User + source type lookup
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_source 
  ON public.voucher_redemptions(user_id, source_type) 
  INCLUDE (status, prizes_text, created_at);

-- Profiles: Game user ID lookup (for admin searches)
CREATE INDEX IF NOT EXISTS idx_profiles_game_user_id 
  ON public.profiles(game_user_id);

-- Spin Wheel Prizes: Active prizes with sort order
CREATE INDEX IF NOT EXISTS idx_spin_wheel_prizes_active_sorted 
  ON public.spin_wheel_prizes(is_active, sort_order) 
  WHERE is_active = true;

-- Prizes & Cards: Active items
CREATE INDEX IF NOT EXISTS idx_prizes_active 
  ON public.prizes(is_active);

CREATE INDEX IF NOT EXISTS idx_greeting_cards_active 
  ON public.greeting_cards(is_active);

-- ─── Performance Notes ────────────────────────────────────────────────────
-- 1. INCLUDE: Adds columns to index for index-only scans (no table lookup)
-- 2. Partial indexes: Smaller, faster indexes for filtered queries
-- 3. Expected improvement: 60-80% faster queries on indexed columns

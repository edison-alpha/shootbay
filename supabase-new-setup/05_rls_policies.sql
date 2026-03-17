-- ═══════════════════════════════════════════════════════════════════════════
-- 05: Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_wheel_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- ─── Profiles Policies ────────────────────────────────────────────────────
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can update any profile
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Level Progress Policies ──────────────────────────────────────────────
CREATE POLICY "level_progress_select_all" ON public.level_progress
  FOR SELECT USING (true);

CREATE POLICY "level_progress_insert_own" ON public.level_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "level_progress_update_own" ON public.level_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Prizes Policies ──────────────────────────────────────────────────────
CREATE POLICY "prizes_select_active" ON public.prizes
  FOR SELECT USING (true);

CREATE POLICY "prizes_admin_all" ON public.prizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Greeting Cards Policies ──────────────────────────────────────────────
CREATE POLICY "greeting_cards_select_active" ON public.greeting_cards
  FOR SELECT USING (true);

CREATE POLICY "greeting_cards_admin_all" ON public.greeting_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Mystery Boxes Policies ───────────────────────────────────────────────
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

CREATE POLICY "mystery_boxes_update" ON public.mystery_boxes
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mystery_boxes_admin_delete" ON public.mystery_boxes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Inventory Policies ───────────────────────────────────────────────────
CREATE POLICY "inventory_select_own" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "inventory_insert_own" ON public.inventory
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "inventory_update_own" ON public.inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Leaderboard Policies ─────────────────────────────────────────────────
CREATE POLICY "leaderboard_select_all" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "leaderboard_insert_own" ON public.leaderboard
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leaderboard_update_own" ON public.leaderboard
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Spin Wheel Prizes Policies ───────────────────────────────────────────
CREATE POLICY "spin_wheel_prizes_select_active" ON public.spin_wheel_prizes
  FOR SELECT USING (is_active = true);

CREATE POLICY "spin_wheel_prizes_admin_all" ON public.spin_wheel_prizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Voucher Redemptions Policies ─────────────────────────────────────────
CREATE POLICY "voucher_redemptions_select" ON public.voucher_redemptions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "voucher_redemptions_insert" ON public.voucher_redemptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "voucher_redemptions_update" ON public.voucher_redemptions
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

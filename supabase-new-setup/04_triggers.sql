-- ═══════════════════════════════════════════════════════════════════════════
-- 04: Triggers
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ensure Unique Game ID ────────────────────────────────────────────────
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

-- ─── Auto-Create Profile on Auth Signup ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    'player'
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users (requires Supabase auth schema access)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Prevent Unauthorized Role Changes ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
DECLARE
  actor_is_admin BOOLEAN := false;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO actor_is_admin;

  IF actor_is_admin THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only admins can change roles';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_unauthorized_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_unauthorized_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_role_change();

-- ─── Updated At Triggers ──────────────────────────────────────────────────
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

CREATE TRIGGER set_spin_wheel_prizes_updated_at
  BEFORE UPDATE ON public.spin_wheel_prizes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_voucher_redemptions_updated_at
  BEFORE UPDATE ON public.voucher_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

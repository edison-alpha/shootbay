-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 004: Harden auth role handling and bootstrap the first admin
--
-- Fixes:
-- 1. Prevent public signup from becoming admin just by using username = 'admin'
-- 2. Prevent regular users from changing their own role
-- 3. Allow exactly one first authenticated user to bootstrap as admin via RPC
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure new auth users are always created as player by default.
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

-- Prevent non-admin users from changing profile role values.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
AS $$
DECLARE
  actor_is_admin BOOLEAN := false;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
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
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_role_change();

-- Allow the first authenticated user that reaches admin flow to become admin.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Not authorized to bootstrap admin for another user';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin'
  ) INTO admin_exists;

  IF admin_exists THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'admin'
    );
  END IF;

  UPDATE public.profiles
  SET role = 'admin',
      updated_at = now()
  WHERE id = target_user_id;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(UUID) TO authenticated;

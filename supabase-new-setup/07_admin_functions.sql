-- ═══════════════════════════════════════════════════════════════════════════
-- 07: Admin Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Bootstrap First Admin ────────────────────────────────────────────────
-- Allow the first authenticated user to become admin
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

-- ─── Grant Tickets to Single Player ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_grant_tickets_to_player(
  target_user_id UUID,
  amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_amount INTEGER := GREATEST(1, COALESCE(amount, 1));
  updated_rows INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin can grant tickets';
  END IF;

  UPDATE public.profiles
  SET tickets = COALESCE(tickets, 0) + safe_amount,
      updated_at = NOW()
  WHERE id = target_user_id AND role = 'player';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_tickets_to_player(UUID, INTEGER) TO authenticated;

-- ─── Grant Tickets to All Players ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_grant_tickets_to_all(
  amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_amount INTEGER := GREATEST(1, COALESCE(amount, 1));
  updated_rows INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin can grant tickets';
  END IF;

  UPDATE public.profiles
  SET tickets = COALESCE(tickets, 0) + safe_amount,
      updated_at = NOW()
  WHERE role = 'player';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_tickets_to_all(INTEGER) TO authenticated;

-- ─── Promote User to Admin (by email) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(
  target_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  updated_rows INTEGER := 0;
BEGIN
  -- Only existing admins can promote others
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  -- Promote to admin
  UPDATE public.profiles
  SET role = 'admin',
      updated_at = NOW()
  WHERE id = target_user_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(TEXT) TO authenticated;

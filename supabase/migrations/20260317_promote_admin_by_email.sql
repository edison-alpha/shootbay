-- ═══════════════════════════════════════════════════════════════════════════
-- Promote bayumukti3366@gmail.com to admin role
--
-- The prevent_unauthorized_role_change trigger blocks role changes when
-- auth.uid() is NULL (e.g., from SQL Editor). We temporarily disable it.
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Temporarily disable the role-change guard trigger
ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Step 2: Promote by email (looks up auth.users → profiles)
UPDATE public.profiles
SET role = 'admin',
    updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com'
);

-- Step 3: Re-enable the trigger
ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Also create a helper function to promote any user by email (admin-only, bypasses trigger via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.promote_to_admin_by_email(target_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN := false;
  target_id UUID;
BEGIN
  -- Only existing admins can promote others
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  -- Find the user by email
  SELECT au.id INTO target_id
  FROM auth.users au
  WHERE au.email = target_email
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  -- Temporarily disable the trigger within this SECURITY DEFINER context
  ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

  UPDATE public.profiles
  SET role = 'admin',
      updated_at = now()
  WHERE id = target_id;

  ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.promote_to_admin_by_email(TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Promote bayumukti3366@gmail.com to Admin
-- Run this in Supabase SQL Editor (runs as postgres superuser, bypasses RLS)
-- IMPORTANT: Run AFTER user has signed up via Google OAuth
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Temporarily disable the trigger that prevents role changes
ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Step 2: Promote by email
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com'
);

-- Step 3: Re-enable the trigger
ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Step 4: Verify promotion
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.role,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'bayumukti3366@gmail.com';

-- Expected result: role should be 'admin'

-- ═══════════════════════════════════════════════════════════════════════════
-- Alternative: If you get permission error, use this simpler approach
-- ═══════════════════════════════════════════════════════════════════════════

-- Just run this single command (SQL Editor runs as superuser):
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com' LIMIT 1);

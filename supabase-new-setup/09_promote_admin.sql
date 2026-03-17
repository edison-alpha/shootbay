-- ═══════════════════════════════════════════════════════════════════════════
-- 09: Promote Specific Email to Admin
-- 
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- 2. SQL Editor runs as postgres superuser, so it bypasses RLS and triggers
-- 3. Run AFTER the user has signed up via Google OAuth
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Temporarily disable the trigger that prevents role changes
ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Step 2: Promote bayumukti3366@gmail.com to admin
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com'
);

-- Step 3: Re-enable the trigger (important for security!)
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
-- Alternative Methods
-- ═══════════════════════════════════════════════════════════════════════════

-- Method 1: Single line (if trigger is already disabled)
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com' LIMIT 1);

-- Method 2: Promote by User ID (if you know the UUID)
-- ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;
-- UPDATE public.profiles SET role = 'admin', updated_at = NOW() WHERE id = 'your-user-uuid-here';
-- ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Method 3: Use the promote function (requires existing admin)
-- SELECT promote_user_to_admin_by_email('bayumukti3366@gmail.com');

-- ═══════════════════════════════════════════════════════════════════════════
-- Troubleshooting
-- ═══════════════════════════════════════════════════════════════════════════

-- If you get "Only admins can change roles" error:
-- → You're running as authenticated user, not superuser
-- → Solution: Run in Supabase SQL Editor (Dashboard), not via client code

-- If user doesn't exist yet:
-- → User must sign up first via Google OAuth
-- → Check: SELECT * FROM auth.users WHERE email = 'bayumukti3366@gmail.com';

-- ═══════════════════════════════════════════════════════════════════════════
-- Note: This must be run AFTER the user signs up for the first time
-- The profile is auto-created on first login via the handle_new_user trigger
-- ═══════════════════════════════════════════════════════════════════════════

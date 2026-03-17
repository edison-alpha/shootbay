-- ═══════════════════════════════════════════════════════════════════════════
-- Debug & Fix Script untuk Signup Issues
-- Jalankan di Supabase SQL Editor untuk diagnosa dan perbaikan
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. CEK STATUS TRIGGER AUTO-CREATE PROFILE ────────────────────────────

SELECT 
  '✅ Trigger Status' as check_type,
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Jika tidak ada hasil, trigger belum dibuat!
-- Jalankan migration 003_auto_create_profile_trigger.sql

-- ─── 2. CEK JUMLAH SIGNUP DALAM 1 JAM TERAKHIR ────────────────────────────

SELECT 
  '📊 Signup Statistics' as check_type,
  COUNT(*) as signups_last_hour,
  MIN(created_at) as first_signup,
  MAX(created_at) as last_signup,
  CASE 
    WHEN COUNT(*) >= 30 THEN '⚠️ RATE LIMIT REACHED (30/hour)'
    WHEN COUNT(*) >= 20 THEN '⚠️ APPROACHING LIMIT'
    ELSE '✅ OK'
  END as status
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ─── 3. CEK USER YANG BELUM PUNYA PROFILE ─────────────────────────────────

SELECT 
  '🔍 Orphaned Users' as check_type,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  u.raw_user_meta_data->>'username' as intended_username
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- Jika ada user tanpa profile, trigger tidak berjalan dengan benar

-- ─── 4. FIX: BUAT PROFILE UNTUK USER YANG ORPHANED ────────────────────────

-- UNCOMMENT DAN JALANKAN JIKA ADA ORPHANED USERS:
/*
INSERT INTO public.profiles (id, username, display_name, role)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username', 
    split_part(u.email, '@', 1),
    'user_' || substr(u.id::text, 1, 8)
  ) as username,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1)
  ) as display_name,
  'player' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
*/

-- ─── 5. CEK RLS POLICIES PADA PROFILES ────────────────────────────────────

SELECT 
  '🔒 RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ─── 6. CEK FUNCTION BOOTSTRAP ADMIN ───────────────────────────────────────

SELECT 
  '⚙️ Functions' as check_type,
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'bootstrap_first_admin', 'generate_game_user_id')
ORDER BY routine_name;

-- ─── 7. TEST GENERATE GAME USER ID ────────────────────────────────────────

SELECT 
  '🎮 Game ID Generator Test' as check_type,
  public.generate_game_user_id() as sample_game_id_1,
  public.generate_game_user_id() as sample_game_id_2,
  public.generate_game_user_id() as sample_game_id_3;

-- Setiap ID harus unik dan format DD-XXXXXX

-- ─── 8. CEK DUPLICATE USERNAMES ───────────────────────────────────────────

SELECT 
  '⚠️ Duplicate Usernames' as check_type,
  username,
  COUNT(*) as count
FROM public.profiles
GROUP BY username
HAVING COUNT(*) > 1;

-- Tidak boleh ada duplicate!

-- ─── 9. CEK DUPLICATE GAME USER IDs ────────────────────────────────────────

SELECT 
  '⚠️ Duplicate Game IDs' as check_type,
  game_user_id,
  COUNT(*) as count
FROM public.profiles
GROUP BY game_user_id
HAVING COUNT(*) > 1;

-- Tidak boleh ada duplicate!

-- ─── 10. CEK RECENT SIGNUPS & PROFILES ─────────────────────────────────────

SELECT 
  '📋 Recent Signups' as check_type,
  u.email,
  p.username,
  p.game_user_id,
  p.role,
  u.created_at,
  u.email_confirmed_at,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '⚠️ NOT CONFIRMED'
    ELSE '✅ CONFIRMED'
  END as email_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- ─── 11. CLEANUP: HAPUS TEST USERS (OPTIONAL) ─────────────────────────────

-- UNCOMMENT UNTUK HAPUS USER TEST (HATI-HATI!):
/*
-- Hapus user dengan email test
DELETE FROM auth.users 
WHERE email LIKE '%test%' 
  OR email LIKE '%demo%'
  OR email LIKE '%example%';

-- Atau hapus semua user yang dibuat hari ini (DANGER!)
-- DELETE FROM auth.users WHERE created_at::date = CURRENT_DATE;
*/

-- ─── 12. SUMMARY REPORT ────────────────────────────────────────────────────

SELECT 
  '📊 Database Summary' as report_type,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'player') as player_count;

-- ═══════════════════════════════════════════════════════════════════════════
-- HASIL YANG DIHARAPKAN:
-- 
-- ✅ Trigger 'on_auth_user_created' harus ada
-- ✅ Tidak ada orphaned users (users tanpa profile)
-- ✅ Tidak ada duplicate username atau game_user_id
-- ✅ Function generate_game_user_id() menghasilkan ID unik
-- ✅ Total users = Total profiles
-- 
-- Jika ada masalah, ikuti instruksi di TROUBLESHOOTING_SIGNUP.md
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Promote User ke Admin (Bypass Security Trigger)
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. CEK USER YANG ADA ──────────────────────────────────────────────────

SELECT 
  p.id,
  p.username,
  p.game_user_id,
  p.role,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- ─── 2. PROMOTE USER KE ADMIN (BYPASS TRIGGER) ────────────────────────────

-- METODE 1: Disable trigger sementara, update, lalu enable kembali
-- (Recommended - Paling aman)

BEGIN;

-- Disable trigger
ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

-- Promote user berdasarkan email (GANTI EMAIL SESUAI KEBUTUHAN)
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@gmail.com'
);

-- Enable trigger kembali
ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

COMMIT;

-- ─── ALTERNATIF: Promote berdasarkan username ─────────────────────────────

-- BEGIN;
-- ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;
-- UPDATE public.profiles
-- SET role = 'admin', updated_at = NOW()
-- WHERE username = 'admin';
-- ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;
-- COMMIT;

-- ─── ALTERNATIF: Promote user pertama yang signup ─────────────────────────

-- BEGIN;
-- ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;
-- UPDATE public.profiles
-- SET role = 'admin', updated_at = NOW()
-- WHERE id = (
--   SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1
-- );
-- ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;
-- COMMIT;

-- ─── 3. VERIFIKASI HASIL ───────────────────────────────────────────────────

SELECT 
  p.username,
  p.role,
  u.email,
  CASE 
    WHEN p.role = 'admin' THEN '✅ ADMIN'
    ELSE '👤 PLAYER'
  END as status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';

-- Harus ada minimal 1 admin

-- ─── 4. CEK TRIGGER STATUS ─────────────────────────────────────────────────

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '⚠️ DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'profiles' 
  AND t.tgname = 'prevent_unauthorized_role_change_trigger';

-- Pastikan trigger ENABLED setelah promote

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES:
-- 
-- ⚠️ PENTING: Script ini disable trigger sementara untuk bypass security
-- - Trigger akan di-enable kembali setelah update
-- - Gunakan BEGIN/COMMIT untuk atomic transaction
-- - Jika ada error, trigger tetap enabled (rollback otomatis)
-- 
-- SECURITY:
-- - Hanya jalankan dari Supabase SQL Editor (service role)
-- - Jangan expose script ini ke client
-- - Setelah ada admin pertama, gunakan Admin Dashboard untuk promote user lain
-- 
-- ALTERNATIVE:
-- - Gunakan Admin Access page untuk auto-create admin pertama
-- - Gunakan bootstrap_first_admin() RPC function (sudah built-in)
-- ═══════════════════════════════════════════════════════════════════════════

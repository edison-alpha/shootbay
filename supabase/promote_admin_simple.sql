-- ═══════════════════════════════════════════════════════════════════════════
-- SIMPLE: Promote User ke Admin
-- Copy-paste dan jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1: Lihat user yang ada (opsional, untuk cek email)
SELECT 
  p.username,
  u.email,
  p.role,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- STEP 2: Promote user ke admin (GANTI EMAIL SESUAI KEBUTUHAN!)
-- Copy-paste HANYA bagian ini:

BEGIN;

ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;

UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@gmail.com'
);

ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;

COMMIT;

-- STEP 3: Verifikasi hasil
SELECT 
  p.username,
  u.email,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN '✅ ADMIN'
    ELSE '👤 PLAYER'
  END as status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'admin@gmail.com';

-- ═══════════════════════════════════════════════════════════════════════════
-- SELESAI! Sekarang logout dan login kembali dengan email yang sudah di-promote
-- ═══════════════════════════════════════════════════════════════════════════

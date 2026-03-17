# Quick Start Guide - Supabase New Setup

## 🚀 Setup dalam 5 Menit

### Step 1: Buat Supabase Project Baru

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Klik "New Project"
3. Isi:
   - Name: `dimsum-dash` (atau nama lain)
   - Database Password: (simpan password ini!)
   - Region: Singapore (atau terdekat)
4. Tunggu ~2 menit sampai project ready

### Step 2: Apply Database Schema

**Option A: Via Dashboard (Recommended)**

1. Buka project → SQL Editor
2. Klik "New Query"
3. Copy-paste file SQL satu per satu sesuai urutan:
   ```
   01_extensions_and_functions.sql
   02_tables.sql
   03_indexes.sql
   04_triggers.sql
   05_rls_policies.sql
   06_atomic_functions.sql
   07_admin_functions.sql
   08_seed_data.sql (optional)
   ```
4. Klik "Run" untuk setiap file

**Option B: Via psql**

```bash
# Get connection string from Dashboard → Settings → Database → Connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migrations
\i supabase-new-setup/01_extensions_and_functions.sql
\i supabase-new-setup/02_tables.sql
\i supabase-new-setup/03_indexes.sql
\i supabase-new-setup/04_triggers.sql
\i supabase-new-setup/05_rls_policies.sql
\i supabase-new-setup/06_atomic_functions.sql
\i supabase-new-setup/07_admin_functions.sql
\i supabase-new-setup/08_seed_data.sql
```

### Step 3: Configure Environment Variables

1. Copy `.env.template` ke `.env` di root project:
   ```bash
   cp supabase-new-setup/.env.template .env
   ```

2. Get credentials dari Supabase Dashboard:
   - Go to: Settings → API
   - Copy "Project URL" → paste ke `VITE_SUPABASE_URL`
   - Copy "anon public" key → paste ke `VITE_SUPABASE_PUBLISHABLE_KEY`

3. File `.env` final:
   ```env
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 4: Enable Google OAuth (Optional)

1. Dashboard → Authentication → Providers
2. Enable "Google"
3. Add OAuth credentials:
   - Get from [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### Step 5: Test Application

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:5173
```

### Step 6: Create First Admin

**Signup & Promote:**
1. Buka aplikasi di browser
2. Login dengan Google menggunakan email: `bayumukti3366@gmail.com`
3. Setelah login pertama kali, buka **Supabase Dashboard → SQL Editor**
4. Run SQL berikut (atau copy dari file `09_promote_admin.sql`):
   ```sql
   -- Disable trigger temporarily
   ALTER TABLE public.profiles DISABLE TRIGGER prevent_unauthorized_role_change_trigger;
   
   -- Promote to admin
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id IN (
     SELECT id FROM auth.users WHERE email = 'bayumukti3366@gmail.com'
   );
   
   -- Re-enable trigger (important!)
   ALTER TABLE public.profiles ENABLE TRIGGER prevent_unauthorized_role_change_trigger;
   
   -- Verify
   SELECT p.role, u.email 
   FROM profiles p 
   JOIN auth.users u ON u.id = p.id 
   WHERE u.email = 'bayumukti3366@gmail.com';
   ```
5. Refresh aplikasi - sekarang ada tombol "⚙ Admin" di main menu
6. Klik tombol Admin untuk masuk ke admin dashboard

**Why disable trigger?**
- Trigger `prevent_unauthorized_role_change` mencegah user biasa promote diri sendiri
- SQL Editor berjalan sebagai postgres superuser, jadi aman untuk disable sementara
- Setelah promote, trigger di-enable kembali untuk keamanan

**Troubleshooting:**
- Error "Only admins can change roles" → Pastikan run di SQL Editor (Dashboard), bukan via client
- User not found → User harus signup dulu via aplikasi
- Trigger error → Pastikan trigger di-disable sebelum UPDATE

## ✅ Verification Checklist

Run these queries di SQL Editor untuk verify setup:

```sql
-- 1. Check tables (should return 9 tables)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Check indexes (should return 15+ indexes)
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';

-- 3. Check functions (should return 10+ functions)
SELECT COUNT(*) FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;

-- 4. Check RLS enabled (all should be true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Check seed data (should return 5 prizes)
SELECT COUNT(*) FROM spin_wheel_prizes;
```

## 🎯 Expected Results

✅ 9 tables created
✅ 15+ indexes created (including composite indexes)
✅ 10+ functions created (including atomic RPCs)
✅ RLS enabled on all tables
✅ Triggers configured
✅ Seed data loaded (if ran 08_seed_data.sql)

## 🐛 Common Issues

### Issue: "permission denied for schema public"
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
```

### Issue: "relation already exists"
```sql
-- Drop and recreate (WARNING: deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
-- Then re-run migrations
```

### Issue: "function does not exist"
- Make sure you ran 01_extensions_and_functions.sql first
- Check function names match exactly (case-sensitive)

### Issue: RLS blocking queries
```sql
-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Temporarily disable for debugging
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## 📊 Performance Monitoring

After setup, monitor performance:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🎉 Done!

Your Supabase is now ready with:
- ✅ Optimized schema
- ✅ Performance indexes
- ✅ Atomic functions
- ✅ RLS security
- ✅ Admin tools

Next: Start building! 🚀

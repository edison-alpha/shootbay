# Troubleshooting: Admin Bulk Mystery Boxes Lambat

## 🐌 Masalah

Membuat mystery boxes secara bulk di admin dashboard sangat lambat (15-20 detik untuk 100 boxes).

## 🔍 Penyebab

Ada 2 kemungkinan:

### 1. RPC Function Belum Di-Apply ❌
Migration `20260318_add_atomic_functions.sql` belum dijalankan di database, sehingga:
- Aplikasi fallback ke method lama (N individual queries)
- Setiap box dibuat satu per satu (sangat lambat)
- 100 boxes = 100 queries = 15-20 detik

### 2. RPC Function Sudah Ada ✅
Function `create_mystery_boxes_bulk` sudah ada tapi masih lambat karena:
- Database overload
- Network latency
- Supabase free tier limits

## ✅ Solusi

### Step 1: Cek Apakah Function Sudah Ada

Run SQL ini di Supabase Dashboard → SQL Editor:

```sql
-- Check if function exists
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'create_mystery_boxes_bulk';
```

**Expected Result:**
```
proname                    | pg_get_function_arguments
---------------------------+---------------------------
create_mystery_boxes_bulk  | p_boxes jsonb, p_admin_id uuid
```

### Step 2A: Jika Function TIDAK Ada

Apply migration:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via SQL Editor
# Copy-paste isi file: supabase/migrations/20260318_add_atomic_functions.sql
```

Atau langsung copy-paste SQL ini:

```sql
-- Create the bulk function
CREATE OR REPLACE FUNCTION public.create_mystery_boxes_bulk(
  p_boxes JSONB,
  p_admin_id UUID
)
RETURNS TABLE (
  id UUID,
  redemption_code TEXT,
  assigned_to UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create mystery boxes';
  END IF;

  -- Bulk insert with generated redemption codes
  RETURN QUERY
  INSERT INTO public.mystery_boxes (
    name,
    description,
    prize_id,
    greeting_card_id,
    assigned_to,
    assigned_by,
    redemption_code,
    status,
    custom_message,
    include_spin_wheel,
    spin_count
  )
  SELECT 
    (box->>'name')::TEXT,
    (box->>'description')::TEXT,
    (box->>'prize_id')::UUID,
    (box->>'greeting_card_id')::UUID,
    (box->>'assigned_to')::UUID,
    p_admin_id,
    'MB-' || upper(substring(md5(random()::text || clock_timestamp()::text || (box->>'assigned_to')::text) from 1 for 8)),
    CASE 
      WHEN (box->>'assigned_to')::UUID IS NOT NULL THEN 'delivered'::TEXT
      ELSE 'pending'::TEXT
    END,
    (box->>'custom_message')::TEXT,
    COALESCE((box->>'include_spin_wheel')::BOOLEAN, false),
    COALESCE((box->>'spin_count')::INT, 0)
  FROM jsonb_array_elements(p_boxes) AS box
  RETURNING 
    public.mystery_boxes.id,
    public.mystery_boxes.redemption_code,
    public.mystery_boxes.assigned_to;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mystery_boxes_bulk(JSONB, UUID) TO authenticated;
```

### Step 2B: Jika Function SUDAH Ada

Function sudah ada tapi masih lambat. Coba:

1. **Check Browser Console**
   - Buka DevTools → Console
   - Lihat apakah ada log: `✅ Bulk created X mystery boxes via RPC`
   - Atau: `⚠️ RPC function not available, falling back...`

2. **Check Network Tab**
   - Buka DevTools → Network
   - Filter: `create_mystery_boxes_bulk`
   - Lihat response time

3. **Optimize Database**
   - Apply indexes: `supabase/migrations/20260318_add_performance_indexes.sql`
   - Check Supabase usage limits (free tier has limits)

## 📊 Performance Comparison

| Method | Time (100 boxes) | Queries |
|--------|------------------|---------|
| ❌ Old (N queries) | 15-20 seconds | 100 queries |
| ✅ New (RPC bulk) | 1-2 seconds | 1 query |
| **Improvement** | **90% faster** | **99% fewer queries** |

## 🧪 Test Function

Test apakah function bekerja:

```sql
-- Replace with real UUIDs
SELECT * FROM create_mystery_boxes_bulk(
  '[
    {"name":"Test Box 1","description":"Test","assigned_to":"user-uuid-1"},
    {"name":"Test Box 2","description":"Test","assigned_to":"user-uuid-2"}
  ]'::jsonb,
  'admin-uuid-here'::uuid
);
```

Expected: Returns 2 rows with id, redemption_code, assigned_to

## 🔧 Fallback Behavior

Aplikasi sudah punya fallback otomatis:
1. **Try RPC first** (fast)
2. **If RPC fails** → fallback ke individual inserts (slow)
3. **Console log** menunjukkan method mana yang digunakan

Check console untuk melihat:
- ✅ `Bulk created X mystery boxes via RPC` → Fast method
- ⚠️ `RPC function not available, falling back...` → Slow method

## 📝 Checklist

- [ ] Function `create_mystery_boxes_bulk` exists in database
- [ ] Function has correct permissions (GRANT EXECUTE)
- [ ] Indexes applied (`20260318_add_performance_indexes.sql`)
- [ ] Browser console shows RPC success message
- [ ] Network tab shows single RPC call (not 100 individual calls)

## 🆘 Still Slow?

Jika masih lambat setelah apply function:

1. **Check Supabase Limits**
   - Dashboard → Settings → Usage
   - Free tier: 500MB database, 2GB bandwidth/month
   - Upgrade jika sudah limit

2. **Check Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%mystery_boxes%'
   ORDER BY mean_exec_time DESC
   LIMIT 5;
   ```

3. **Reduce Batch Size**
   - Jangan create 100+ boxes sekaligus
   - Split jadi 20-30 boxes per batch

---

**TL;DR:** Apply migration `20260318_add_atomic_functions.sql` untuk speed up 90%! 🚀

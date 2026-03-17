# Troubleshooting Guide

## 🔧 Common Issues & Solutions

### 1. "relation already exists"

**Problem:** Table already exists from previous setup

**Solution:**
```sql
-- Option A: Drop specific table
DROP TABLE IF EXISTS table_name CASCADE;

-- Option B: Fresh start (WARNING: deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### 2. "permission denied for schema public"

**Problem:** Insufficient permissions

**Solution:**
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
```

### 3. "function does not exist"

**Problem:** Functions not created or wrong name

**Solution:**
- Verify 01_extensions_and_functions.sql ran successfully
- Check function name spelling (case-sensitive)
- List functions: `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;`

### 4. RLS blocking queries

**Problem:** Row Level Security preventing access

**Solution:**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Temporarily disable for debugging
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 5. "duplicate key value violates unique constraint"

**Problem:** Trying to insert duplicate data

**Solution:**
```sql
-- Use ON CONFLICT for upserts
INSERT INTO table_name (...)
VALUES (...)
ON CONFLICT (unique_column) DO UPDATE SET ...;
```

### 6. Slow queries after migration

**Problem:** Indexes not being used

**Solution:**
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;

-- Analyze tables
ANALYZE;

-- Check query plan
EXPLAIN ANALYZE SELECT ...;
```

### 7. "could not serialize access due to concurrent update"

**Problem:** Concurrent transactions conflict

**Solution:**
- Use atomic RPC functions instead of multiple queries
- Implement retry logic in client code
- Use optimistic locking with updated_at checks

### 8. Environment variables not working

**Problem:** .env file not loaded

**Solution:**
```bash
# Verify .env exists in root
ls -la .env

# Check Vite prefix
# Must be VITE_SUPABASE_URL not SUPABASE_URL

# Restart dev server
npm run dev
```

## 📊 Performance Issues

### Slow Initial Load

**Check:**
```sql
-- Table sizes
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

-- Missing indexes
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_indexes WHERE schemaname = 'public'
);
```

### High Memory Usage

**Solution:**
- Reduce polling frequency
- Implement pagination
- Use realtime filters
- Clear query cache periodically

## 🔍 Debugging Tools

```sql
-- Active connections
SELECT * FROM pg_stat_activity;

-- Lock conflicts
SELECT * FROM pg_locks WHERE NOT granted;

-- Slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;
```

## 📞 Getting Help

1. Check Supabase logs: Dashboard → Logs
2. Enable verbose logging in client
3. Use browser DevTools Network tab
4. Check this guide first
5. Search Supabase Discord/GitHub

---

**Still stuck?** Check the main README.md for more resources.

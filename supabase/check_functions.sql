-- ═══════════════════════════════════════════════════════════════════════════
-- Check if Performance Functions Exist
-- Run this to verify atomic functions are installed
-- ═══════════════════════════════════════════════════════════════════════════

-- Check all custom functions
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  CASE 
    WHEN provolatile = 'i' THEN 'IMMUTABLE'
    WHEN provolatile = 's' THEN 'STABLE'
    WHEN provolatile = 'v' THEN 'VOLATILE'
  END as volatility
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'upsert_inventory_item',
    'create_mystery_boxes_bulk',
    'is_admin',
    'sync_level_best_values',
    'admin_grant_tickets_to_player',
    'admin_grant_tickets_to_all',
    'promote_user_to_admin_by_email',
    'bootstrap_first_admin'
  )
ORDER BY proname;

-- Expected result: Should show 8 functions
-- If missing, run: supabase/migrations/20260318_add_atomic_functions.sql

-- ═══════════════════════════════════════════════════════════════════════════
-- Quick Test: Create Mystery Boxes Bulk
-- ═══════════════════════════════════════════════════════════════════════════

-- Test if function exists and works
-- SELECT create_mystery_boxes_bulk(
--   '[{"name":"Test Box","description":"Test","assigned_to":"user-uuid-here"}]'::jsonb,
--   'admin-uuid-here'::uuid
-- );

-- ═══════════════════════════════════════════════════════════════════════════
-- If function doesn't exist, apply migration:
-- ═══════════════════════════════════════════════════════════════════════════

-- Option 1: Via Supabase CLI
-- supabase db push

-- Option 2: Via SQL Editor
-- Copy-paste content from: supabase/migrations/20260318_add_atomic_functions.sql

-- Option 3: Via psql
-- psql -f supabase/migrations/20260318_add_atomic_functions.sql

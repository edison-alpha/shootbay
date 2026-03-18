-- =====================================================================
-- Verification Script: Spin Wheel Persistence Fix
-- Run this after applying migrations to verify everything is working
-- =====================================================================

-- 1. Check if spin_consumed column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mystery_boxes' 
  AND column_name = 'spin_consumed';

-- Expected: 1 row with spin_consumed, integer, 0, NO

-- 2. Check if consume_spin_tickets function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'consume_spin_tickets';

-- Expected: 1 row with consume_spin_tickets, FUNCTION, jsonb

-- 3. Check current spin ticket status for all users
SELECT 
  mb.assigned_to as user_id,
  p.display_name,
  COUNT(*) as total_boxes,
  SUM(mb.spin_count) as total_spins,
  SUM(mb.spin_consumed) as consumed_spins,
  SUM(mb.spin_count - mb.spin_consumed) as available_spins
FROM mystery_boxes mb
LEFT JOIN profiles p ON p.id = mb.assigned_to
WHERE mb.include_spin_wheel = true
  AND mb.status = 'opened'
GROUP BY mb.assigned_to, p.display_name
ORDER BY available_spins DESC;

-- 4. Check index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'mystery_boxes'
  AND indexname = 'idx_mystery_boxes_spin_available';

-- Expected: 1 row with index definition

-- 5. Test consume_spin_tickets function (DRY RUN - will rollback)
DO $$
DECLARE
  v_test_user_id uuid;
  v_result jsonb;
BEGIN
  -- Find a user with available spins
  SELECT assigned_to INTO v_test_user_id
  FROM mystery_boxes
  WHERE include_spin_wheel = true
    AND spin_count > spin_consumed
    AND status = 'opened'
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE 'No users with available spins found for testing';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing consume_spin_tickets for user: %', v_test_user_id;

  -- Test consuming 1 spin (will be rolled back)
  BEGIN
    v_result := consume_spin_tickets(v_test_user_id, 1);
    RAISE NOTICE 'Test result: %', v_result;
    
    -- Rollback the test
    RAISE EXCEPTION 'Test completed successfully - rolling back';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Test completed successfully%' THEN
        RAISE NOTICE 'Function test passed!';
      ELSE
        RAISE NOTICE 'Function test failed: %', SQLERRM;
      END IF;
  END;
END $$;

-- 6. Show detailed spin status per box
SELECT 
  mb.id,
  mb.name,
  p.display_name as user_name,
  mb.spin_count,
  mb.spin_consumed,
  (mb.spin_count - mb.spin_consumed) as available,
  mb.status,
  mb.opened_at,
  mb.created_at
FROM mystery_boxes mb
LEFT JOIN profiles p ON p.id = mb.assigned_to
WHERE mb.include_spin_wheel = true
ORDER BY mb.created_at DESC
LIMIT 20;

-- 7. Check for any boxes with invalid spin_consumed values
SELECT 
  id,
  name,
  spin_count,
  spin_consumed,
  CASE 
    WHEN spin_consumed > spin_count THEN 'ERROR: consumed > total'
    WHEN spin_consumed < 0 THEN 'ERROR: negative consumed'
    ELSE 'OK'
  END as validation_status
FROM mystery_boxes
WHERE include_spin_wheel = true
  AND (spin_consumed > spin_count OR spin_consumed < 0);

-- Expected: 0 rows (no invalid data)

-- 8. Final summary
SELECT '✓ Verification complete!' as status;

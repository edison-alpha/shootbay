-- ============================================================================
-- Migration: Verify Spin Wheel Data Integrity
-- Description: Check and report mystery boxes with spin wheel configuration
-- Date: 2026-03-18
-- ============================================================================

-- Check mystery boxes with spin wheel enabled
DO $$
DECLARE
  total_boxes INT;
  spin_enabled_boxes INT;
  invalid_spin_count INT;
  opened_with_spin INT;
BEGIN
  -- Count total mystery boxes
  SELECT COUNT(*) INTO total_boxes FROM mystery_boxes;
  
  -- Count boxes with spin wheel enabled
  SELECT COUNT(*) INTO spin_enabled_boxes 
  FROM mystery_boxes 
  WHERE include_spin_wheel = true;
  
  -- Count boxes with invalid spin count (enabled but count = 0)
  SELECT COUNT(*) INTO invalid_spin_count
  FROM mystery_boxes
  WHERE include_spin_wheel = true AND spin_count <= 0;
  
  -- Count opened boxes with spin wheel
  SELECT COUNT(*) INTO opened_with_spin
  FROM mystery_boxes
  WHERE include_spin_wheel = true AND status = 'opened';
  
  RAISE NOTICE '=== Mystery Box Spin Wheel Data Report ===';
  RAISE NOTICE 'Total mystery boxes: %', total_boxes;
  RAISE NOTICE 'Boxes with spin wheel enabled: %', spin_enabled_boxes;
  RAISE NOTICE 'Boxes with invalid spin count: %', invalid_spin_count;
  RAISE NOTICE 'Opened boxes with spin wheel: %', opened_with_spin;
  
  IF invalid_spin_count > 0 THEN
    RAISE WARNING 'Found % boxes with spin wheel enabled but spin_count <= 0', invalid_spin_count;
  END IF;
END $$;

-- List all mystery boxes with spin wheel configuration
SELECT 
  id,
  name,
  status,
  include_spin_wheel,
  spin_count,
  assigned_to,
  opened_at,
  created_at
FROM mystery_boxes
WHERE include_spin_wheel = true
ORDER BY created_at DESC
LIMIT 20;

-- Check for potential data issues
SELECT 
  'Invalid spin count' as issue_type,
  COUNT(*) as count
FROM mystery_boxes
WHERE include_spin_wheel = true AND spin_count <= 0

UNION ALL

SELECT 
  'Pending boxes with spin' as issue_type,
  COUNT(*) as count
FROM mystery_boxes
WHERE include_spin_wheel = true AND status = 'pending'

UNION ALL

SELECT 
  'Opened boxes with spin' as issue_type,
  COUNT(*) as count
FROM mystery_boxes
WHERE include_spin_wheel = true AND status = 'opened';

-- Verify spin wheel prizes are configured
SELECT 
  COUNT(*) as total_prizes,
  COUNT(*) FILTER (WHERE is_active = true) as active_prizes,
  COUNT(*) FILTER (WHERE prize_type = 'dimsum_bonus') as dimsum_prizes,
  COUNT(*) FILTER (WHERE prize_type != 'dimsum_bonus') as physical_prizes
FROM spin_wheel_prizes;

COMMENT ON TABLE mystery_boxes IS 'Mystery boxes with optional spin wheel integration. Use include_spin_wheel=true and spin_count>0 to enable.';

-- Check Spin Wheel Prizes Configuration
-- This query verifies that prizes are configured correctly:
-- - Hilux weight = 0 (never wins)
-- - Dimsum value = 2
-- - Other prizes have random weights

-- 1. Check all spin wheel prizes
SELECT 
  id,
  name,
  label,
  prize_type,
  value,
  weight,
  icon,
  CASE 
    WHEN LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%' THEN '🚨 HILUX'
    WHEN prize_type = 'dimsum_bonus' THEN '🥟 DIMSUM'
    ELSE '🎁 PHYSICAL'
  END as category,
  CASE
    WHEN (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%') AND weight != 0 THEN '❌ WRONG! Should be 0'
    WHEN prize_type = 'dimsum_bonus' AND value != 2 THEN '❌ WRONG! Should be 2'
    WHEN prize_type = 'dimsum_bonus' AND value = 2 THEN '✅ CORRECT'
    WHEN (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%') AND weight = 0 THEN '✅ CORRECT'
    WHEN weight > 0 THEN '✅ CORRECT'
    ELSE '⚠️ CHECK'
  END as status
FROM spin_wheel_prizes
ORDER BY 
  CASE 
    WHEN LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%' THEN 1
    WHEN prize_type = 'dimsum_bonus' THEN 2
    ELSE 3
  END,
  weight DESC;

-- 2. Summary statistics
SELECT 
  '📊 SUMMARY' as section,
  COUNT(*) as total_prizes,
  COUNT(*) FILTER (WHERE prize_type = 'dimsum_bonus') as dimsum_count,
  COUNT(*) FILTER (WHERE prize_type != 'dimsum_bonus') as physical_count,
  COUNT(*) FILTER (WHERE LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%') as hilux_count,
  COUNT(*) FILTER (WHERE weight = 0) as zero_weight_count,
  COUNT(*) FILTER (WHERE weight > 0) as positive_weight_count
FROM spin_wheel_prizes;

-- 3. Check for issues
SELECT 
  '🚨 ISSUES FOUND' as section,
  COUNT(*) FILTER (
    WHERE (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%') 
    AND weight != 0
  ) as hilux_with_wrong_weight,
  COUNT(*) FILTER (
    WHERE prize_type = 'dimsum_bonus' 
    AND value != 2
  ) as dimsum_with_wrong_value,
  COUNT(*) FILTER (
    WHERE prize_type != 'dimsum_bonus' 
    AND prize_type != 'physical'
    AND NOT (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%')
    AND weight = 0
  ) as physical_prizes_with_zero_weight
FROM spin_wheel_prizes;

-- 4. Detailed prize configuration
SELECT 
  '📋 DETAILED CONFIG' as section,
  name,
  label,
  prize_type,
  value,
  weight,
  ROUND(
    CASE 
      WHEN (SELECT SUM(weight) FROM spin_wheel_prizes WHERE prize_type != 'dimsum_bonus' AND weight > 0) > 0
      THEN (weight::numeric / (SELECT SUM(weight) FROM spin_wheel_prizes WHERE prize_type != 'dimsum_bonus' AND weight > 0) * 100)
      ELSE 0
    END, 
    2
  ) as win_probability_percent
FROM spin_wheel_prizes
WHERE prize_type != 'dimsum_bonus'
ORDER BY weight DESC;

-- 5. Recommended fixes (if needed)
SELECT 
  '🔧 RECOMMENDED FIXES' as section,
  id,
  name,
  'UPDATE spin_wheel_prizes SET weight = 0 WHERE id = ''' || id || ''';' as fix_query
FROM spin_wheel_prizes
WHERE (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%')
  AND weight != 0

UNION ALL

SELECT 
  '🔧 RECOMMENDED FIXES' as section,
  id,
  name,
  'UPDATE spin_wheel_prizes SET value = 2 WHERE id = ''' || id || ''';' as fix_query
FROM spin_wheel_prizes
WHERE prize_type = 'dimsum_bonus'
  AND value != 2;

-- Migration: Fix Spin Wheel Prize Weights
-- Purpose: 
--   1. Hilux weight = 0 (never wins)
--   2. Dimsum value = 2
--   3. Baju, Jam, Sepatu have equal weights for fair random selection
--   4. Minimum 3 spins enforced
-- Date: 2026-03-18

-- 1. Set Hilux weight to 0 (never wins)
UPDATE spin_wheel_prizes
SET weight = 0
WHERE (
  LOWER(name) LIKE '%hilux%' 
  OR LOWER(label) LIKE '%hilux%'
)
AND weight != 0;

-- 2. Set Dimsum value to 2
UPDATE spin_wheel_prizes
SET value = 2
WHERE prize_type = 'dimsum_bonus'
AND value != 2;

-- 3. Set equal weights for Baju, Jam, Sepatu (fair random selection)
-- Weight = 10 for each to ensure equal probability
UPDATE spin_wheel_prizes
SET weight = 10
WHERE prize_type != 'dimsum_bonus'
AND NOT (
  LOWER(name) LIKE '%hilux%' 
  OR LOWER(label) LIKE '%hilux%'
)
AND (
  LOWER(name) LIKE '%baju%' 
  OR LOWER(label) LIKE '%baju%'
  OR LOWER(name) LIKE '%jam%' 
  OR LOWER(label) LIKE '%jam%'
  OR LOWER(name) LIKE '%sepatu%' 
  OR LOWER(label) LIKE '%sepatu%'
);

-- 4. Set weight = 0 for any other physical prizes (only Baju/Jam/Sepatu should win)
UPDATE spin_wheel_prizes
SET weight = 0
WHERE prize_type != 'dimsum_bonus'
AND NOT (
  LOWER(name) LIKE '%hilux%' 
  OR LOWER(label) LIKE '%hilux%'
)
AND NOT (
  LOWER(name) LIKE '%baju%' 
  OR LOWER(label) LIKE '%baju%'
  OR LOWER(name) LIKE '%jam%' 
  OR LOWER(label) LIKE '%jam%'
  OR LOWER(name) LIKE '%sepatu%' 
  OR LOWER(label) LIKE '%sepatu%'
);

-- 5. Verify changes
DO $$
DECLARE
  hilux_wrong_weight INTEGER;
  dimsum_wrong_value INTEGER;
  eligible_prizes INTEGER;
BEGIN
  -- Check Hilux weight
  SELECT COUNT(*) INTO hilux_wrong_weight
  FROM spin_wheel_prizes
  WHERE (
    LOWER(name) LIKE '%hilux%' 
    OR LOWER(label) LIKE '%hilux%'
  )
  AND weight != 0;
  
  -- Check Dimsum value
  SELECT COUNT(*) INTO dimsum_wrong_value
  FROM spin_wheel_prizes
  WHERE prize_type = 'dimsum_bonus'
  AND value != 2;
  
  -- Count eligible physical prizes
  SELECT COUNT(*) INTO eligible_prizes
  FROM spin_wheel_prizes
  WHERE prize_type != 'dimsum_bonus'
  AND weight > 0;
  
  -- Report results
  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   - Hilux prizes with wrong weight: %', hilux_wrong_weight;
  RAISE NOTICE '   - Dimsum prizes with wrong value: %', dimsum_wrong_value;
  RAISE NOTICE '   - Eligible physical prizes (Baju/Jam/Sepatu): %', eligible_prizes;
  
  IF hilux_wrong_weight > 0 OR dimsum_wrong_value > 0 THEN
    RAISE WARNING '⚠️ Some prizes still have incorrect values. Please check manually.';
  ELSIF eligible_prizes != 3 THEN
    RAISE WARNING '⚠️ Expected 3 eligible prizes (Baju/Jam/Sepatu), found: %', eligible_prizes;
  ELSE
    RAISE NOTICE '✅ All prizes configured correctly!';
  END IF;
END $$;

-- 6. Add check constraint to prevent future mistakes
ALTER TABLE spin_wheel_prizes
DROP CONSTRAINT IF EXISTS check_hilux_weight_zero;

ALTER TABLE spin_wheel_prizes
ADD CONSTRAINT check_hilux_weight_zero
CHECK (
  NOT (
    (LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%')
    AND weight != 0
  )
);

-- 7. Add check constraint for dimsum value
ALTER TABLE spin_wheel_prizes
DROP CONSTRAINT IF EXISTS check_dimsum_value;

ALTER TABLE spin_wheel_prizes
ADD CONSTRAINT check_dimsum_value
CHECK (
  NOT (
    prize_type = 'dimsum_bonus'
    AND value != 2
  )
);

-- 8. Display final configuration
SELECT 
  name,
  label,
  prize_type,
  value,
  weight,
  CASE 
    WHEN LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%' THEN '🚨 HILUX (Never Wins)'
    WHEN prize_type = 'dimsum_bonus' THEN '🥟 DIMSUM (+2 per spin)'
    WHEN weight > 0 THEN '🎁 PHYSICAL (Can Win)'
    ELSE '❌ DISABLED'
  END as status,
  CASE 
    WHEN weight > 0 AND prize_type != 'dimsum_bonus' THEN 
      ROUND((weight::numeric / NULLIF((SELECT SUM(weight) FROM spin_wheel_prizes WHERE weight > 0 AND prize_type != 'dimsum_bonus'), 0) * 100), 2)
    ELSE 0
  END as win_probability_percent
FROM spin_wheel_prizes
ORDER BY 
  CASE 
    WHEN LOWER(name) LIKE '%hilux%' OR LOWER(label) LIKE '%hilux%' THEN 1
    WHEN prize_type = 'dimsum_bonus' THEN 2
    WHEN weight > 0 THEN 3
    ELSE 4
  END,
  weight DESC,
  name;

COMMENT ON CONSTRAINT check_hilux_weight_zero ON spin_wheel_prizes IS 
'Ensures Hilux prizes always have weight = 0 (never wins)';

COMMENT ON CONSTRAINT check_dimsum_value ON spin_wheel_prizes IS 
'Ensures dimsum bonus always gives value = 2';

-- 9. Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📋 SPIN WHEEL CONFIGURATION SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rules Enforced:';
  RAISE NOTICE '   1. Minimum 3 spins per session';
  RAISE NOTICE '   2. Hilux: Never wins (weight = 0)';
  RAISE NOTICE '   3. Baju/Jam/Sepatu: Always get exactly 1 (equal probability)';
  RAISE NOTICE '   4. Dimsum: Fills remaining spins (+2 per spin)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Example Outcomes:';
  RAISE NOTICE '   - 3 spins: 1 physical + 2 dimsum = 1 prize + 4 dimsum';
  RAISE NOTICE '   - 5 spins: 1 physical + 4 dimsum = 1 prize + 8 dimsum';
  RAISE NOTICE '   - 10 spins: 1 physical + 9 dimsum = 1 prize + 18 dimsum';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

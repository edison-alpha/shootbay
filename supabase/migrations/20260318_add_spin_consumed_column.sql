-- =====================================================================
-- Migration: Add spin_consumed column to mystery_boxes
-- Description: Track how many spins have been consumed from each box
-- =====================================================================

-- Add spin_consumed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'mystery_boxes' 
    AND column_name = 'spin_consumed'
  ) THEN
    ALTER TABLE public.mystery_boxes 
    ADD COLUMN spin_consumed INTEGER DEFAULT 0 NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.mystery_boxes.spin_consumed IS 
      'Number of spins consumed from this box. Used to track spin ticket usage.';
  END IF;
END $$;

-- Create index for efficient querying of available spins
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_spin_available 
ON public.mystery_boxes (assigned_to, include_spin_wheel, spin_count, spin_consumed)
WHERE include_spin_wheel = true AND spin_count > 0;

COMMENT ON INDEX idx_mystery_boxes_spin_available IS 
  'Optimize queries for finding boxes with available spin tickets';

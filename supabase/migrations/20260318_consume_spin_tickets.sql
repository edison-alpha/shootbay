-- =====================================================================
-- Migration: Consume Spin Tickets Function
-- Description: Atomic function to consume spin tickets from mystery boxes
-- =====================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS consume_spin_tickets(uuid, integer);

-- Create function to consume spin tickets atomically
CREATE OR REPLACE FUNCTION consume_spin_tickets(
  p_user_id uuid,
  p_spin_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_box record;
  v_remaining_spins integer := p_spin_count;
  v_consumed_count integer := 0;
  v_updated_boxes jsonb := '[]'::jsonb;
BEGIN
  -- Validate input
  IF p_spin_count <= 0 THEN
    RAISE EXCEPTION 'Spin count must be positive';
  END IF;

  -- Lock user's mystery boxes for update
  FOR v_box IN
    SELECT id, spin_count, spin_consumed
    FROM mystery_boxes
    WHERE assigned_to = p_user_id
      AND include_spin_wheel = true
      AND spin_count > 0
      AND (spin_consumed IS NULL OR spin_consumed < spin_count)
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    -- Calculate available spins for this box
    DECLARE
      v_box_consumed integer := COALESCE(v_box.spin_consumed, 0);
      v_box_available integer := v_box.spin_count - v_box_consumed;
      v_to_consume integer := LEAST(v_box_available, v_remaining_spins);
    BEGIN
      -- Update spin_consumed for this box
      UPDATE mystery_boxes
      SET 
        spin_consumed = v_box_consumed + v_to_consume,
        updated_at = now()
      WHERE id = v_box.id;

      -- Track consumed count
      v_consumed_count := v_consumed_count + v_to_consume;
      v_remaining_spins := v_remaining_spins - v_to_consume;

      -- Add to result
      v_updated_boxes := v_updated_boxes || jsonb_build_object(
        'box_id', v_box.id,
        'consumed', v_to_consume,
        'total_consumed', v_box_consumed + v_to_consume,
        'total_spins', v_box.spin_count
      );

      -- Exit if we've consumed enough
      EXIT WHEN v_remaining_spins <= 0;
    END;
  END LOOP;

  -- Check if we consumed all requested spins
  IF v_consumed_count < p_spin_count THEN
    RAISE EXCEPTION 'Not enough spin tickets available. Requested: %, Available: %', 
      p_spin_count, v_consumed_count;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'consumed_count', v_consumed_count,
    'updated_boxes', v_updated_boxes
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION consume_spin_tickets(uuid, integer) TO authenticated;

-- Add comment
COMMENT ON FUNCTION consume_spin_tickets IS 
  'Atomically consume spin tickets from mystery boxes. Ensures proper tracking of spin consumption.';

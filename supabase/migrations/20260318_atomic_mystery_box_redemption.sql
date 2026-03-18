-- Migration: Atomic Mystery Box Redemption
-- Purpose: Replace multi-step redemption with single atomic transaction
-- Benefits: Eliminates race conditions, automatic rollback, better performance

-- Drop existing function if exists
DROP FUNCTION IF EXISTS redeem_mystery_box_atomic(UUID, TEXT);

-- Create atomic redemption function
CREATE OR REPLACE FUNCTION redeem_mystery_box_atomic(
  p_user_id UUID,
  p_redemption_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  box_data JSONB,
  error_message TEXT,
  remaining_tickets INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_box mystery_boxes%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_prize prizes%ROWTYPE;
  v_card greeting_cards%ROWTYPE;
BEGIN
  -- Lock rows to prevent race conditions (FOR UPDATE)
  SELECT * INTO v_box
  FROM mystery_boxes
  WHERE redemption_code = UPPER(TRIM(p_redemption_code))
  FOR UPDATE NOWAIT; -- Fail fast if locked by another transaction
  
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE NOWAIT;
  
  -- Validation 1: Box exists
  IF v_box IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'Invalid redemption code', 0;
    RETURN;
  END IF;
  
  -- Validation 2: Assigned to user
  IF v_box.assigned_to != p_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'This code is not assigned to you', 0;
    RETURN;
  END IF;
  
  -- Validation 3: Not already opened
  IF v_box.status = 'opened' THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'This mystery box has already been opened', 0;
    RETURN;
  END IF;
  
  -- Validation 4: Profile exists
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'Profile not found', 0;
    RETURN;
  END IF;
  
  -- Validation 5: Has tickets
  IF v_profile.tickets <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'You need at least 1 ticket to open this mystery box', 0;
    RETURN;
  END IF;
  
  -- Atomic Update 1: Consume ticket
  UPDATE profiles
  SET 
    tickets = tickets - 1,
    tickets_used = COALESCE(tickets_used, 0) + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Atomic Update 2: Mark box as opened
  UPDATE mystery_boxes
  SET 
    status = 'opened',
    opened_at = NOW()
  WHERE id = v_box.id
  RETURNING * INTO v_box;
  
  -- Fetch related data (prize and card)
  IF v_box.prize_id IS NOT NULL THEN
    SELECT * INTO v_prize FROM prizes WHERE id = v_box.prize_id;
  END IF;
  
  IF v_box.greeting_card_id IS NOT NULL THEN
    SELECT * INTO v_card FROM greeting_cards WHERE id = v_box.greeting_card_id;
  END IF;
  
  -- Build complete response with all details
  RETURN QUERY
  SELECT 
    TRUE,
    jsonb_build_object(
      'id', v_box.id,
      'name', v_box.name,
      'redemption_code', v_box.redemption_code,
      'status', v_box.status,
      'opened_at', v_box.opened_at,
      'assigned_to', v_box.assigned_to,
      'assigned_by', v_box.assigned_by,
      'created_at', v_box.created_at,
      
      -- Spin wheel data
      'include_spin_wheel', v_box.include_spin_wheel,
      'spin_count', v_box.spin_count,
      
      -- Prize data (if exists)
      'prize_id', v_box.prize_id,
      'prize_name', v_prize.name,
      'prize_description', v_prize.description,
      'prize_icon', v_prize.icon,
      
      -- Greeting card data (if exists)
      'greeting_card_id', v_box.greeting_card_id,
      'card_title', v_card.title,
      'card_message', v_card.message,
      'card_icon', v_card.icon,
      'card_background_color', v_card.background_color,
      'card_text_color', v_card.text_color,
      
      -- Custom overrides
      'custom_message', v_box.custom_message,
      'wish_completed', v_box.wish_completed
    ),
    NULL::TEXT,
    (v_profile.tickets - 1); -- Return new ticket count
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION redeem_mystery_box_atomic(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION redeem_mystery_box_atomic IS 
'Atomically redeem a mystery box: validates, consumes ticket, opens box, and returns complete data in a single transaction. Uses row-level locks to prevent race conditions.';

-- Create index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_redemption_code_upper 
ON mystery_boxes (UPPER(redemption_code));

CREATE INDEX IF NOT EXISTS idx_mystery_boxes_assigned_to_status 
ON mystery_boxes (assigned_to, status);

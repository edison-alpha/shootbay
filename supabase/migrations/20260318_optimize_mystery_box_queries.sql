-- Optimize Mystery Box Queries
-- This migration adds indexes to improve query performance for mystery box operations

-- 1. Index for fetching user's mystery boxes (most common query)
-- Covers: WHERE assigned_to = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_assigned_to_created 
ON mystery_boxes(assigned_to, created_at DESC)
WHERE assigned_to IS NOT NULL;

-- 2. Index for redemption code lookup (used during box redemption)
-- Covers: WHERE redemption_code = ? (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_redemption_code_upper
ON mystery_boxes(UPPER(redemption_code))
WHERE redemption_code IS NOT NULL;

-- 3. Index for status filtering (pending boxes, opened boxes, etc)
-- Covers: WHERE assigned_to = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_assigned_status
ON mystery_boxes(assigned_to, status)
WHERE assigned_to IS NOT NULL;

-- 4. Composite index for wish flow queries
-- Covers: WHERE assigned_to = ? AND wish_completed = false
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_wish_flow
ON mystery_boxes(assigned_to, wish_completed, wish_flow_step)
WHERE assigned_to IS NOT NULL AND wish_completed = false;

-- 5. Index for prizes table (batch lookups)
CREATE INDEX IF NOT EXISTS idx_prizes_id ON prizes(id);

-- 6. Index for greeting cards table (batch lookups)  
CREATE INDEX IF NOT EXISTS idx_greeting_cards_id ON greeting_cards(id);

-- Add comments for documentation
COMMENT ON INDEX idx_mystery_boxes_assigned_to_created IS 
'Optimizes fetching user mystery boxes ordered by creation date';

COMMENT ON INDEX idx_mystery_boxes_redemption_code_upper IS 
'Optimizes case-insensitive redemption code lookups';

COMMENT ON INDEX idx_mystery_boxes_assigned_status IS 
'Optimizes filtering boxes by user and status';

COMMENT ON INDEX idx_mystery_boxes_wish_flow IS 
'Optimizes queries for incomplete wish flows';

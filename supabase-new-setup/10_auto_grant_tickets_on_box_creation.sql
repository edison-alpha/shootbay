-- ═══════════════════════════════════════════════════════════════════════════
-- 10: Auto-Grant Tickets When Mystery Box is Created
-- 
-- Automatically give 1 ticket to user when admin creates a mystery box for them.
-- This prevents the bug where users receive boxes but have no tickets to open them.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Trigger Function: Auto-Grant Ticket ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_grant_ticket_on_box_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only grant ticket if box is assigned to a user
  IF NEW.assigned_to IS NOT NULL THEN
    -- Grant 1 ticket to the assigned user
    UPDATE public.profiles
    SET tickets = COALESCE(tickets, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.assigned_to
      AND role = 'player';
    
    -- Log for debugging
    RAISE NOTICE 'Auto-granted 1 ticket to user % for mystery box %', NEW.assigned_to, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ─── Attach Trigger to mystery_boxes Table ────────────────────────────────
DROP TRIGGER IF EXISTS trigger_auto_grant_ticket_on_box_creation ON public.mystery_boxes;

CREATE TRIGGER trigger_auto_grant_ticket_on_box_creation
  AFTER INSERT ON public.mystery_boxes
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION public.auto_grant_ticket_on_box_creation();

-- ═══════════════════════════════════════════════════════════════════════════
-- Benefits:
-- 
-- 1. Eliminates manual ticket distribution step
-- 2. Prevents "no ticket" errors when users try to open boxes
-- 3. Atomic operation: box creation + ticket grant in single transaction
-- 4. Works for both single and bulk box creation
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.auto_grant_ticket_on_box_creation() IS 
  'Automatically grants 1 ticket to user when a mystery box is assigned to them';

COMMENT ON TRIGGER trigger_auto_grant_ticket_on_box_creation ON public.mystery_boxes IS
  'Auto-grant ticket trigger for mystery box creation';

-- Performance optimization: atomic admin ticket grants using SQL functions.
-- Replaces N+1 client-side profile reads/updates with single RPC calls.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_grant_tickets_to_player(
  target_user_id UUID,
  amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_amount INTEGER := GREATEST(1, COALESCE(amount, 1));
  updated_rows INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin can grant tickets';
  END IF;

  UPDATE public.profiles
  SET tickets = COALESCE(tickets, 0) + safe_amount,
      updated_at = NOW()
  WHERE id = target_user_id
    AND role = 'player';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_tickets_to_all(
  amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_amount INTEGER := GREATEST(1, COALESCE(amount, 1));
  updated_rows INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin can grant tickets';
  END IF;

  UPDATE public.profiles
  SET tickets = COALESCE(tickets, 0) + safe_amount,
      updated_at = NOW()
  WHERE role = 'player';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_tickets_to_player(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_tickets_to_all(INTEGER) TO authenticated;

COMMIT;


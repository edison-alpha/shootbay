-- ═══════════════════════════════════════════════════════════════════════════
-- 01: Extensions & Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Function: Generate Game User ID ──────────────────────────────────────
-- Generates a unique game ID like "DD-A1B2C3"
CREATE OR REPLACE FUNCTION public.generate_game_user_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'DD-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── Function: Updated At Trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_game_user_id() IS 'Generates unique game user ID like DD-A1B2C3';
COMMENT ON FUNCTION public.handle_updated_at() IS 'Automatically updates updated_at timestamp';

-- ═══════════════════════════════════════════════════════════════════════════
-- 01: Extensions and Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this first to enable required PostgreSQL extensions and create
-- utility functions needed by other migration files.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable Required Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions

-- ─── Game User ID Generator ───────────────────────────────────────────────
-- Generates unique 8-character alphanumeric IDs for players
-- Format: XXXXXXXX (uppercase letters and numbers)
CREATE OR REPLACE FUNCTION public.generate_game_user_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0,O,1,I)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$;

-- ─── Updated At Trigger Function ──────────────────────────────────────────
-- Automatically updates the updated_at timestamp on row updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$;

-- ─── Comments ─────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.generate_game_user_id() IS 
  'Generates unique 8-character game user IDs (excludes confusing characters)';

COMMENT ON FUNCTION public.handle_updated_at() IS 
  'Trigger function to automatically update updated_at timestamp';

-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: Make created_by nullable in prizes and greeting_cards
-- This allows seed data to be inserted without an admin user reference.
-- Run this if you already applied 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.prizes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.greeting_cards ALTER COLUMN created_by DROP NOT NULL;

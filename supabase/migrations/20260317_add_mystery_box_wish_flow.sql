-- Persist birthday wish conversation progress per mystery box
ALTER TABLE public.mystery_boxes
  ADD COLUMN IF NOT EXISTS wish_flow_step TEXT,
  ADD COLUMN IF NOT EXISTS wish_input TEXT,
  ADD COLUMN IF NOT EXISTS wish_birth_day INTEGER,
  ADD COLUMN IF NOT EXISTS wish_birth_month INTEGER,
  ADD COLUMN IF NOT EXISTS wish_ai_reply TEXT,
  ADD COLUMN IF NOT EXISTS wish_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wish_updated_at TIMESTAMPTZ;


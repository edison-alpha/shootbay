-- Add spin_wheel_prizes table for admin-customizable spin wheel
CREATE TABLE IF NOT EXISTS spin_wheel_prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🎁',
  color TEXT NOT NULL DEFAULT '#f59e0b',
  dark_color TEXT NOT NULL DEFAULT '#b45309',
  image_url TEXT,
  prize_type TEXT NOT NULL DEFAULT 'physical' CHECK (prize_type IN ('physical', 'dimsum_bonus', 'cosmetic', 'special')),
  value INTEGER DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add spin_wheel_config to mystery_boxes (link mystery box to spin wheel)
ALTER TABLE mystery_boxes ADD COLUMN IF NOT EXISTS include_spin_wheel BOOLEAN DEFAULT false;
ALTER TABLE mystery_boxes ADD COLUMN IF NOT EXISTS spin_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE spin_wheel_prizes ENABLE ROW LEVEL SECURITY;

-- Policies for spin_wheel_prizes
CREATE POLICY "Anyone can read active spin wheel prizes" ON spin_wheel_prizes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage spin wheel prizes" ON spin_wheel_prizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Insert default spin wheel prizes
INSERT INTO spin_wheel_prizes (name, label, description, icon, color, dark_color, prize_type, value, weight, sort_order) VALUES
  ('Jam Tangan', 'Jam', 'Jam tangan eksklusif!', '⌚', '#f59e0b', '#b45309', 'physical', 0, 1, 1),
  ('Sepatu', 'Sepatu', 'Sepatu keren untukmu!', '👟', '#10b981', '#047857', 'physical', 0, 1, 2),
  ('Hilux', 'Hilux', 'Toyota Hilux!', '🚗', '#ef4444', '#b91c1c', 'physical', 0, 1, 3),
  ('Baju', 'Baju', 'Baju stylish untukmu!', '👕', '#3b82f6', '#1d4ed8', 'physical', 0, 1, 4),
  ('Dimsum Bonus', 'Dimsum', '+2 Dimsum bonus!', '🥟', '#fbbf24', '#92400e', 'dimsum_bonus', 2, 2, 5)
ON CONFLICT DO NOTHING;

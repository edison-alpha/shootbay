-- ═══════════════════════════════════════════════════════════════════════════
-- Dimsum Dash — Seed Data (for testing/development)
-- Run this AFTER 001_initial_schema.sql
-- NOTE: Prizes and greeting cards can be seeded without user references.
--       Mystery boxes require valid user references (create admin first).
-- ═══════════════════════════════════════════════════════════════════════════

-- Sample prizes (created_by is NULL for seed data — admin will own them in production)
INSERT INTO public.prizes (name, description, icon, type, value, is_active) VALUES
  ('Golden Chopsticks', 'A pair of premium golden chopsticks', '🥢', 'physical_gift', 50000, true),
  ('Dimsum Voucher 50K', 'Rp 50.000 voucher for dimsum restaurant', '🎫', 'spin_ticket', 50000, true),
  ('Premium Skin Pack', 'Exclusive character skin collection', '🎨', 'cosmetic', 25000, true),
  ('Lucky Cat Charm', 'In-game lucky cat companion', '🐱', 'inventory_item', 10000, true),
  ('Dragon Bowl Set', 'Ceramic dragon-themed bowl set', '🐉', 'physical_gift', 150000, true),
  ('Birthday Special', 'Special birthday reward package', '🎂', 'birthday_card', 30000, true),
  ('Dimsum Bonus x100', '100 extra dimsum for your collection', '🥟', 'dimsum_bonus', 100, true);

-- Sample greeting cards
INSERT INTO public.greeting_cards (title, message, template_style, background_color, text_color, icon) VALUES
  ('Selamat!', 'Kamu berhasil menyelesaikan tantangan! Ini hadiah spesial untukmu.', 'celebration', '#FFD700', '#333333', '🎉'),
  ('Happy Birthday!', 'Selamat ulang tahun! Semoga hari ini menyenangkan. Ini kado dari kami!', 'birthday', '#FF69B4', '#FFFFFF', '🎂'),
  ('Champion!', 'Kamu adalah juara sejati Dimsum Dash! Terima hadiah eksklusif ini.', 'achievement', '#4CAF50', '#FFFFFF', '🏆'),
  ('Thank You!', 'Terima kasih telah bermain Dimsum Dash. Ini apresiasi dari kami!', 'thank_you', '#2196F3', '#FFFFFF', '❤️');

-- ═══════════════════════════════════════════════════════════════════════════
-- 08: Seed Data (Optional - for testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Seed Spin Wheel Prizes ───────────────────────────────────────────────
INSERT INTO public.spin_wheel_prizes (
  name, label, description, icon, color, dark_color, 
  prize_type, value, weight, sort_order
) VALUES
  ('Jam Tangan', 'Jam', 'Jam tangan eksklusif!', '⌚', '#f59e0b', '#b45309', 'physical', 0, 1, 1),
  ('Sepatu', 'Sepatu', 'Sepatu keren untukmu!', '👟', '#10b981', '#047857', 'physical', 0, 1, 2),
  ('Hilux', 'Hilux', 'Toyota Hilux!', '🚗', '#ef4444', '#b91c1c', 'physical', 0, 1, 3),
  ('Baju', 'Baju', 'Baju stylish untukmu!', '👕', '#3b82f6', '#1d4ed8', 'physical', 0, 1, 4),
  ('Dimsum Bonus', 'Dimsum', '+2 Dimsum bonus!', '🥟', '#fbbf24', '#92400e', 'dimsum_bonus', 2, 2, 5)
ON CONFLICT DO NOTHING;

-- ─── Seed Sample Prizes ───────────────────────────────────────────────────
INSERT INTO public.prizes (
  name, description, icon, type, value, is_active
) VALUES
  ('Golden Chopstick', 'A rare golden chopstick for the ultimate dimsum collector', '🥢', 'cosmetic', NULL, true),
  ('Dimsum Voucher', 'Redeem for 10 free dimsum at any restaurant', '🎟️', 'physical_gift', 10, true),
  ('Birthday Card', 'Special birthday greeting card', '🎂', 'birthday_card', NULL, true),
  ('Lucky Spin', 'Extra spin on the lucky wheel', '🎰', 'spin_ticket', 1, true),
  ('Dimsum Boost', 'Instant +50 dimsum bonus', '🥟', 'dimsum_bonus', 50, true)
ON CONFLICT DO NOTHING;

-- ─── Seed Sample Greeting Cards ───────────────────────────────────────────
INSERT INTO public.greeting_cards (
  title, message, template_style, background_color, text_color, icon, is_active
) VALUES
  (
    '🎂 Birthday Card',
    E'Selamat Ulang Tahun! 🎉🎂\n\nSemoga di hari yang spesial ini, semua harapan dan impianmu terwujud. Kamu adalah orang yang luar biasa dan dunia beruntung memilikimu.\n\nTerus bersinar dan jangan pernah berhenti bermimpi! ✨\n\nWith love and warm wishes! 💝',
    'birthday',
    '#1a1a2e',
    '#ffffff',
    '🎂',
    true
  ),
  (
    '🎉 Congratulations',
    E'Congratulations on your achievement! 🎊\n\nYour hard work and dedication have paid off. Keep up the amazing work!',
    'celebration',
    '#16213e',
    '#ffffff',
    '🎉',
    true
  ),
  (
    '🎁 Special Gift',
    E'You''ve received a special gift! 🎁\n\nEnjoy this reward as a token of appreciation for being awesome!',
    'gift',
    '#0f3460',
    '#ffffff',
    '🎁',
    true
  )
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Notes:
-- - This seed data is optional and for testing purposes
-- - In production, admin will create prizes and cards via admin dashboard
-- - Spin wheel prizes can be customized by admin after initial setup
-- ═══════════════════════════════════════════════════════════════════════════

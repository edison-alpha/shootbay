-- ═══════════════════════════════════════════════════════════════════════════
-- MASTER MIGRATION FILE - Run All Database Setup
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- This file runs all migration files in the correct order.
-- Use this for fresh database setup or complete migration to new account.
--
-- USAGE:
--   psql -h <host> -U postgres -d postgres -f 00_run_all_migrations.sql
--
-- OR via Supabase SQL Editor:
--   Copy and paste this entire file into the SQL Editor and run
--
-- ═══════════════════════════════════════════════════════════════════════════

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo 'Starting Complete Database Migration'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ─── Step 1: Extensions and Helper Functions ──────────────────────────────
\echo '→ Step 1/9: Creating extensions and helper functions...'
\i 01_extensions_and_functions.sql
\echo '✓ Extensions and functions created'
\echo ''

-- ─── Step 2: Database Tables ──────────────────────────────────────────────
\echo '→ Step 2/9: Creating database tables...'
\i 02_tables.sql
\echo '✓ Tables created'
\echo ''

-- ─── Step 3: Performance Indexes ──────────────────────────────────────────
\echo '→ Step 3/9: Creating performance indexes...'
\i 03_indexes.sql
\echo '✓ Indexes created'
\echo ''

-- ─── Step 4: Triggers ─────────────────────────────────────────────────────
\echo '→ Step 4/9: Creating triggers...'
\i 04_triggers.sql
\echo '✓ Triggers created'
\echo ''

-- ─── Step 5: RLS Policies ─────────────────────────────────────────────────
\echo '→ Step 5/9: Creating RLS policies...'
\i 05_rls_policies.sql
\echo '✓ RLS policies created'
\echo ''

-- ─── Step 6: Atomic Functions ─────────────────────────────────────────────
\echo '→ Step 6/9: Creating atomic functions...'
\i 06_atomic_functions.sql
\echo '✓ Atomic functions created'
\echo ''

-- ─── Step 7: Admin Functions ──────────────────────────────────────────────
\echo '→ Step 7/9: Creating admin functions...'
\i 07_admin_functions.sql
\echo '✓ Admin functions created'
\echo ''

-- ─── Step 8: Seed Data ────────────────────────────────────────────────────
\echo '→ Step 8/9: Inserting seed data...'
\i 08_seed_data.sql
\echo '✓ Seed data inserted'
\echo ''

-- ─── Step 9: Promote First Admin ──────────────────────────────────────────
\echo '→ Step 9/9: Admin promotion script available...'
\echo '  Run 09_promote_admin.sql separately after first user signup'
\echo ''

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '✓ Database Migration Complete!'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Next Steps:'
\echo '1. Sign up your first user via the app'
\echo '2. Run: psql -f 09_promote_admin.sql (replace email in file)'
\echo '3. Verify admin access in the app'
\echo ''
\echo 'For troubleshooting, see: TROUBLESHOOTING.md'
\echo '═══════════════════════════════════════════════════════════════════════════'

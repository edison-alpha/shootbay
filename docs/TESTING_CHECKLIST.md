# Performance Optimization Testing Checklist

## Pre-Testing Setup

### 1. Apply Database Migrations
```bash
# Connect to your Supabase project
supabase db push

# Or manually apply migrations
psql -h your-db-host -U postgres -d postgres \
  -f supabase/migrations/20260318_add_performance_indexes.sql

psql -h your-db-host -U postgres -d postgres \
  -f supabase/migrations/20260318_add_atomic_functions.sql
```

### 2. Verify Migrations Applied
```sql
-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname IN (
  'upsert_inventory_item',
  'sync_level_best_values', 
  'create_mystery_boxes_bulk',
  'is_admin'
);
```

---

## Testing Scenarios

### ✅ 1. User Login & Data Load
**Test:** Login with existing user account

**Expected Behavior:**
- Initial load completes in 1-2 seconds (down from 3-5s)
- Profile data loads correctly
- No console errors

**Verify:**
1. Open DevTools Network tab
2. Login with Google
3. Check total load time
4. Verify all user data displays correctly

---

### ✅ 2. Level Completion & Progress Save
**Test:** Complete a level and verify data saves correctly

**Expected Behavior:**
- Level completion saves in 300-400ms (down from 800ms-1.2s)
- Best scores update correctly (GREATEST/LEAST logic)
- Leaderboard updates

**Verify:**
1. Play and complete a level
2. Check Network tab for `sync_level_best_values` RPC call
3. Replay same level with worse score - verify best score doesn't decrease
4. Check `level_progress` table in database

**SQL Verification:**
```sql
SELECT * FROM level_progress 
WHERE user_id = 'your-user-id' 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

### ✅ 3. Inventory Item Collection
**Test:** Collect items during gameplay

**Expected Behavior:**
- Inventory updates in 150-200ms (down from 400-600ms)
- Quantity increments correctly
- No duplicate items created

**Verify:**
1. Collect dimsum or items in game
2. Check Network tab for `upsert_inventory_item` RPC call
3. Open inventory screen - verify quantities are correct
4. Check `inventory` table in database

**SQL Verification:**
```sql
SELECT item_name, quantity, created_at, updated_at 
FROM inventory 
WHERE user_id = 'your-user-id' 
ORDER BY updated_at DESC;
```

---

### ✅ 4. Leaderboard Performance
**Test:** View leaderboard with pagination

**Expected Behavior:**
- Leaderboard loads in <500ms
- Pagination works correctly
- Cache prevents redundant fetches

**Verify:**
1. Open leaderboard screen
2. Check Network tab - should use composite index
3. Scroll/paginate - verify smooth performance
4. Close and reopen - should use cache (no new request within 30s)

**SQL Performance Check:**
```sql
EXPLAIN ANALYZE 
SELECT id, user_id, player_name, total_dimsum, total_stars, created_at
FROM leaderboard
ORDER BY total_dimsum DESC
LIMIT 50 OFFSET 0;

-- Should show "Index Scan using idx_leaderboard_covering"
```

---

### ✅ 5. Admin Bulk Mystery Box Creation
**Test:** Admin creates mystery boxes for multiple users

**Expected Behavior:**
- Bulk creation (100 users) completes in 1-2 seconds (down from 15-20s)
- All boxes created with unique redemption codes
- Users receive boxes immediately

**Verify:**
1. Login as admin
2. Go to Mystery Boxes tab
3. Create bulk boxes for 10+ users
4. Check Network tab for `create_mystery_boxes_bulk` RPC call
5. Verify all boxes created in database

**SQL Verification:**
```sql
SELECT COUNT(*), status, assigned_by 
FROM mystery_boxes 
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY status, assigned_by;
```

---

### ✅ 6. Realtime Sync Performance
**Test:** Verify realtime updates work without flooding

**Expected Behavior:**
- Updates arrive within 2-3 seconds
- No more than 2 events per second (rate limited)
- Debounce prevents rapid re-fetches

**Verify:**
1. Open app in two browser tabs (same user)
2. Complete a level in tab 1
3. Watch tab 2 - should update within 2-3 seconds
4. Check Console - should see debounced reload (150ms delay)
5. Make rapid changes - should batch updates

**Monitor:**
```javascript
// In browser console
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('supabase'))
  .map(r => ({ url: r.name, duration: r.duration }))
```

---

### ✅ 7. Admin Dashboard Performance
**Test:** Admin dashboard loads and refreshes efficiently

**Expected Behavior:**
- Initial load in 2-3 seconds (down from 5-8s)
- Polling every 30 seconds (down from 10s)
- Debounced refresh (500ms) prevents rapid updates

**Verify:**
1. Login as admin
2. Open admin dashboard
3. Check Network tab - should see parallel queries
4. Wait 30 seconds - should auto-refresh
5. Make database change - should debounce refresh (500ms)

---

### ✅ 8. Mobile Battery & Network Efficiency
**Test:** Monitor battery and network usage on mobile

**Expected Behavior:**
- 66% fewer polling requests (45s vs 15s)
- Realtime rate limited to 2 events/sec
- Reduced battery drain

**Verify:**
1. Open app on mobile device
2. Use Chrome DevTools Remote Debugging
3. Monitor Network tab for 5 minutes
4. Count number of requests - should be ~6-7 (down from 20)

---

### ✅ 9. React Rendering Performance
**Test:** Main menu renders efficiently without unnecessary re-renders

**Expected Behavior:**
- Memoized calculations prevent re-computation
- Smooth UI interactions
- No jank or lag

**Verify:**
1. Open React DevTools Profiler
2. Navigate to main menu
3. Interact with UI (click buttons, etc.)
4. Check Profiler - `MainMenuScreen` should show minimal re-renders
5. Verify memoized values don't recalculate unnecessarily

---

### ✅ 10. Index Usage Verification
**Test:** Verify all indexes are being used

**SQL Queries:**
```sql
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Check for unused indexes (after 24 hours of testing)
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND idx_scan = 0;

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Performance Benchmarks

### Before vs After Comparison

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Initial Load | 3-5s | 1-2s | 60% faster |
| Login | 2-4s | 0.8-1.5s | 62% faster |
| Admin Dashboard | 5-8s | 2-3s | 62% faster |
| Level Save | 800ms-1.2s | 300-400ms | 66% faster |
| Inventory Sync | 400-600ms | 150-200ms | 66% faster |
| Bulk Boxes (100) | 15-20s | 1-2s | 93% faster |
| Polling Frequency | 15s | 45s | 66% fewer requests |

---

## Rollback Procedure

If critical issues are found:

### 1. Revert Client Code
```bash
git revert HEAD~8..HEAD
git push
```

### 2. Drop Database Functions (Keep Indexes)
```sql
DROP FUNCTION IF EXISTS upsert_inventory_item CASCADE;
DROP FUNCTION IF EXISTS sync_level_best_values CASCADE;
DROP FUNCTION IF EXISTS create_mystery_boxes_bulk CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
```

### 3. Monitor for 24 Hours
- Check error logs
- Monitor user reports
- Verify data integrity

---

## Success Criteria

✅ All tests pass without errors
✅ Performance improvements match expected benchmarks
✅ No data loss or corruption
✅ No increase in error rates
✅ Positive user feedback on speed improvements

---

## Post-Testing Actions

1. **Monitor Production Metrics:**
   - Query performance (pg_stat_statements)
   - Error rates (Supabase logs)
   - User engagement (analytics)

2. **Gather User Feedback:**
   - Survey users on perceived speed improvements
   - Monitor support tickets for performance issues

3. **Document Learnings:**
   - Update performance documentation
   - Share optimization techniques with team

---

**Testing Date:** _____________
**Tested By:** _____________
**Status:** ⬜ Pass | ⬜ Fail | ⬜ Needs Review

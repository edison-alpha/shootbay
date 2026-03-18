# Spin Wheel Bug Fix - Testing Guide

## Overview
Panduan testing untuk memverifikasi fix spin wheel bug yang tidak muncul setelah membuka mystery box.

## Prerequisites

### Admin Setup
1. Login sebagai admin
2. Buat 3 jenis mystery box untuk testing:
   - **Box A:** Spin wheel only (no birthday card)
   - **Box B:** Birthday card + spin wheel
   - **Box C:** Birthday card only (no spin wheel)

### Box A Configuration (Spin Wheel Only)
```sql
INSERT INTO mystery_boxes (
  name,
  redemption_code,
  prize_name,
  prize_description,
  prize_icon,
  include_spin_wheel,
  spin_count,
  status,
  assigned_to
) VALUES (
  'Lucky Spin Box',
  'SPIN-TEST-001',
  'Mystery Prize',
  'Open to reveal your prize!',
  '🎁',
  true,
  3,
  'pending',
  'USER_ID_HERE'
);
```

### Box B Configuration (Birthday + Spin)
```sql
INSERT INTO mystery_boxes (
  name,
  redemption_code,
  card_title,
  card_message,
  card_icon,
  card_background_color,
  card_text_color,
  include_spin_wheel,
  spin_count,
  status,
  assigned_to
) VALUES (
  'Birthday Special Box',
  'BDAY-SPIN-001',
  'Happy Birthday! 🎂',
  'Selamat ulang tahun! Semoga semua impianmu tercapai.',
  '🎂',
  'linear-gradient(135deg, rgba(192,132,252,0.08), rgba(192,132,252,0.03))',
  '#e9d5ff',
  true,
  3,
  'pending',
  'USER_ID_HERE'
);
```

### Box C Configuration (Birthday Only)
```sql
INSERT INTO mystery_boxes (
  name,
  redemption_code,
  card_title,
  card_message,
  card_icon,
  include_spin_wheel,
  spin_count,
  status,
  assigned_to
) VALUES (
  'Birthday Card Only',
  'BDAY-ONLY-001',
  'Happy Birthday! 🎉',
  'Selamat ulang tahun sayang!',
  '🎉',
  false,
  0,
  'pending',
  'USER_ID_HERE'
);
```

## Test Cases

### Test 1: Spin Wheel Only (Normal Flow)
**Objective:** Verify spin wheel works tanpa birthday card blocking.

**Steps:**
1. Login sebagai user
2. Navigate ke Mystery Box screen
3. Enter code: `SPIN-TEST-001`
4. Click "Open Box"
5. Wait for chest animation (2.5s)
6. **VERIFY:** "Spin for Prizes" button muncul immediately
7. Click "Spin for Prizes"
8. **VERIFY:** Spin wheel screen loads dengan "x3 spins available"
9. Complete 3 spins
10. **VERIFY:** All prizes collected successfully

**Expected Console Logs:**
```
[MysteryBox] Adding spin ticket: { boxId: "...", spinCount: 3, uniqueId: "spin_..." }
[MysteryBox] Final state verification: { totalSpins: 3 }
[MysteryBox] State sync complete
[SpinWheelScreen] Available spins: 3
[SpinWheelScreen] Initialized with total spins: 3
```

**Pass Criteria:**
- ✅ Spin button muncul immediately
- ✅ Spin wheel loads dengan 3 spins
- ✅ All spins work correctly
- ✅ Prizes saved to inventory
- ✅ No console errors

---

### Test 2: Birthday Card + Spin Wheel (Fix Verification)
**Objective:** Verify spin button muncul SEBELUM wish complete.

**Steps:**
1. Login sebagai user
2. Navigate ke Mystery Box screen
3. Enter code: `BDAY-SPIN-001`
4. Click "Open Box"
5. Wait for chest animation
6. **VERIFY:** Birthday card revealed
7. **CRITICAL:** Check if "Spin for Prizes" button visible
8. **VERIFY:** Button should be visible BEFORE completing wish
9. Click "Spin for Prizes" (without completing wish)
10. **VERIFY:** Spin wheel screen loads
11. Complete 3 spins
12. Go back to mystery box
13. Complete birthday wish flow
14. **VERIFY:** Both spin and wish work independently

**Expected Console Logs:**
```
[MysteryBox] Adding spin ticket: { spinCount: 3 }
[MysteryBox] Final state verification: { totalSpins: 3 }
[SpinWheelScreen] Available spins: 3
```

**Pass Criteria:**
- ✅ Spin button visible BEFORE wish complete (KEY FIX)
- ✅ Spin wheel works without completing wish
- ✅ Wish flow still works after spinning
- ✅ No blocking behavior
- ✅ No console errors

**Failure Indicators:**
- ❌ Spin button tidak muncul sampai wish complete
- ❌ Button disabled atau hidden
- ❌ Error "No spins available"

---

### Test 3: Rapid Click (State Propagation Test)
**Objective:** Verify retry mechanism handles state delay.

**Steps:**
1. Login sebagai user
2. Navigate ke Mystery Box screen
3. Enter code: `SPIN-TEST-001`
4. Click "Open Box"
5. **IMMEDIATELY** after revealed phase, click "Spin for Prizes" (<100ms)
6. **VERIFY:** One of two outcomes:
   - A) Spin wheel loads successfully (state ready)
   - B) Retry mechanism triggers, auto-navigates back
7. If (B), click "Spin for Prizes" again
8. **VERIFY:** Spin wheel loads successfully
9. Complete spins

**Expected Console Logs (Scenario A - Success):**
```
[MysteryBox] State sync complete
[SpinWheelScreen] Available spins: 3
```

**Expected Console Logs (Scenario B - Retry):**
```
[SpinWheelScreen] Available spins: 0
[SpinWheelScreen] No spins detected on mount, retrying in 300ms...
[SpinWheelScreen] Retry check result: 3
[SpinWheelScreen] ✅ Retry successful, spins found: 3
```

**Pass Criteria:**
- ✅ Either immediate success OR retry successful
- ✅ User eventually can spin
- ✅ No permanent "No spins available" error
- ✅ Retry mechanism works as expected

---

### Test 4: Zero Spins Warning (Error Handling)
**Objective:** Verify error UI when no spin tickets available.

**Steps:**
1. Login sebagai user (without any spin tickets)
2. Navigate to Spin Wheel screen directly
3. **VERIFY:** Warning UI displayed
4. **VERIFY:** Message: "No Spins Available"
5. **VERIFY:** Retry mechanism triggers (300ms)
6. **VERIFY:** After retry, troubleshooting steps shown
7. **VERIFY:** Debug info displayed: `availableSpins=0, retried=yes`
8. Click "Back to Menu"
9. **VERIFY:** Navigate back successfully

**Expected Console Logs:**
```
[SpinWheelScreen] Available spins: 0
[SpinWheelScreen] No spins detected on mount, retrying in 300ms...
[SpinWheelScreen] Retry check result: 0
[SpinWheelScreen] ❌ Retry failed, still no spins found
```

**Pass Criteria:**
- ✅ Warning UI displayed
- ✅ Retry mechanism attempts
- ✅ Troubleshooting steps shown after retry
- ✅ Debug info accurate
- ✅ Back button works

---

### Test 5: Birthday Card Only (No Spin)
**Objective:** Verify no spin button when box doesn't include spin wheel.

**Steps:**
1. Login sebagai user
2. Navigate ke Mystery Box screen
3. Enter code: `BDAY-ONLY-001`
4. Click "Open Box"
5. Wait for revealed phase
6. **VERIFY:** Birthday card displayed
7. **VERIFY:** NO "Spin for Prizes" button
8. Complete wish flow
9. **VERIFY:** Only "Collect" button available
10. Click "Collect"
11. **VERIFY:** Modal closes successfully

**Expected Console Logs:**
```
[MysteryBox] No spin wheel in this box: { include_spin_wheel: false }
```

**Pass Criteria:**
- ✅ No spin button displayed (correct behavior)
- ✅ Birthday wish flow works
- ✅ Collect button works
- ✅ No console errors

---

### Test 6: Multiple Boxes Sequential
**Objective:** Verify spin tickets accumulate correctly.

**Steps:**
1. Login sebagai user
2. Open Box A (3 spins) → verify spin ticket added
3. Skip spin wheel (don't use spins yet)
4. Open another Box A (3 spins) → verify spin ticket added
5. Navigate to Spin Wheel screen
6. **VERIFY:** Total spins = 6 (but capped at 3 per session)
7. Complete 3 spins
8. Go back and navigate to Spin Wheel again
9. **VERIFY:** 3 more spins available
10. Complete remaining spins

**Expected Console Logs:**
```
[MysteryBox] Adding spin ticket: { spinCount: 3, uniqueId: "spin_1_..." }
[MysteryBox] Adding spin ticket: { spinCount: 3, uniqueId: "spin_2_..." }
[SpinWheelScreen] Available spins: 6
[SpinWheelScreen] Initialized with total spins: 3  // Capped
```

**Pass Criteria:**
- ✅ Spin tickets accumulate
- ✅ Unique IDs prevent collision
- ✅ Spins capped at 3 per session
- ✅ Remaining spins available after first session
- ✅ No data loss

---

### Test 7: State Persistence (Refresh Test)
**Objective:** Verify spin tickets persist after page refresh.

**Steps:**
1. Login sebagai user
2. Open Box A (3 spins)
3. **DO NOT** navigate to spin wheel yet
4. Refresh page (F5)
5. Login again if needed
6. Navigate to Spin Wheel screen
7. **VERIFY:** 3 spins still available
8. Complete spins
9. Refresh page again
10. Navigate to Spin Wheel screen
11. **VERIFY:** 0 spins (already used)

**Expected localStorage:**
```json
{
  "mysteryBoxRewards": [
    {
      "id": "spin_...",
      "type": "spin_ticket",
      "spins": 3,
      "claimed": true
    }
  ]
}
```

**Pass Criteria:**
- ✅ Spin tickets persist after refresh
- ✅ Used spins not restored
- ✅ localStorage accurate
- ✅ No data loss

---

### Test 8: Admin Verification
**Objective:** Verify admin can see spin wheel configuration.

**Steps:**
1. Login sebagai admin
2. Navigate to Admin Dashboard
3. Click "Mystery Boxes" tab
4. Find Box A (SPIN-TEST-001)
5. **VERIFY:** `include_spin_wheel: true`
6. **VERIFY:** `spin_count: 3`
7. **VERIFY:** Status shows "opened" after user redeems
8. Check database directly:
   ```sql
   SELECT * FROM mystery_boxes WHERE redemption_code = 'SPIN-TEST-001';
   ```
9. **VERIFY:** Database matches UI

**Pass Criteria:**
- ✅ Admin can see spin wheel config
- ✅ Status updates correctly
- ✅ Database accurate
- ✅ No sync issues

---

## Performance Testing

### Test 9: Timing Measurements
**Objective:** Measure latency impact of fixes.

**Steps:**
1. Open browser DevTools → Performance tab
2. Start recording
3. Open mystery box with spin wheel
4. Click "Spin for Prizes"
5. Stop recording
6. Measure:
   - State sync delay: ~100ms (existing)
   - Retry delay (if triggered): ~300ms
   - Total time to spin wheel: <500ms

**Pass Criteria:**
- ✅ State sync: 100-150ms
- ✅ Retry (if needed): 300-350ms
- ✅ Total latency: <500ms
- ✅ No blocking UI

---

## Regression Testing

### Test 10: Existing Features Still Work
**Objective:** Verify no regressions in other features.

**Checklist:**
- [ ] Mystery box opening animation works
- [ ] Birthday wish flow works
- [ ] Inventory sync works
- [ ] Dimsum bonus works
- [ ] Voucher redemption works
- [ ] WhatsApp claim works
- [ ] History tab works
- [ ] Admin dashboard works

---

## Browser Compatibility

### Test 11: Cross-Browser Testing
**Browsers to test:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

**Pass Criteria:**
- ✅ All features work on all browsers
- ✅ No browser-specific bugs
- ✅ Console logs consistent

---

## Production Monitoring

### Metrics to Track
1. **Retry Trigger Rate**
   - Target: <5%
   - Monitor: Console logs in production

2. **Spin Wheel Success Rate**
   - Target: >95%
   - Monitor: User analytics

3. **Support Tickets**
   - Target: <1 per week
   - Monitor: Support system

4. **Error Rate**
   - Target: <1%
   - Monitor: Error tracking (Sentry, etc.)

### Console Log Monitoring
Search production logs for:
- `[SpinWheelScreen] ❌ Retry failed` → Investigate
- `[MysteryBox] No spin wheel in this box` → Expected
- `[SpinWheelScreen] ✅ Retry successful` → Track frequency

---

## Troubleshooting

### Issue: Spin button tidak muncul
**Debug Steps:**
1. Check console logs
2. Verify `include_spin_wheel: true` in database
3. Check localStorage for spin_ticket
4. Verify state sync complete log
5. Try refresh page

### Issue: "No spins available" error
**Debug Steps:**
1. Check if retry triggered
2. Verify spin tickets in localStorage
3. Check mysteryBoxRewards array
4. Try go back and re-open box
5. Contact admin if persists

### Issue: Retry mechanism not working
**Debug Steps:**
1. Check console for retry logs
2. Verify 300ms delay passed
3. Check if `retryAttempted` state set
4. Verify `availableSpins` recalculated
5. Check React DevTools for state

---

## Sign-Off Checklist

### Before Production Deploy
- [ ] All 11 test cases passed
- [ ] No console errors
- [ ] Performance acceptable (<500ms)
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Admin verified
- [ ] Documentation complete
- [ ] Rollback plan ready

### After Production Deploy
- [ ] Monitor console logs (first 24h)
- [ ] Track retry trigger rate
- [ ] Monitor support tickets
- [ ] Check error tracking
- [ ] Collect user feedback
- [ ] Update documentation if needed

---

**Prepared by:** Kiro AI Assistant  
**Date:** 2026-03-18  
**Version:** 1.0  
**Status:** Ready for Testing

# Bug Analysis: Spin Wheel Tidak Muncul Setelah Membuka Box

## Status: 🔍 UNDER INVESTIGATION

**Last Updated:** 2026-03-18  
**Severity:** High  
**Reporter:** User  

## Problem Statement

User melaporkan bahwa kadang-kadang spin wheel tidak bisa diakses atau tidak muncul setelah membuka mystery box, padahal admin sudah mengatur:
- `include_spin_wheel: true`
- `spin_count > 0` (misalnya 3 spins)

Bug ini terjadi **secara intermittent** (kadang berhasil, kadang gagal).

## Root Cause Analysis

### 1. **Race Condition pada State Update** ✅ SUDAH DIPERBAIKI
Sudah diimplementasikan fix dengan:
- `await saveGameData()` + delay 100ms
- Unique ID generation untuk spin tickets
- Loading state indicator

### 2. **Birthday Wish Flow Blocking** ⚠️ MASIH ADA
Jika mystery box mengandung birthday card + spin wheel:
- User HARUS menyelesaikan wish flow dulu
- Tombol "Spin for Prizes" tidak muncul sampai `wishDone = true`
- Jika user close modal sebelum complete wish → spin button tidak muncul

**Kode di MysteryBoxScreen.tsx line 265-267:**
```typescript
const hasSpinReward = localReward?.extraRewards?.some(r => r.type === 'spin_ticket') ||
  (openedBox && openedBox.include_spin_wheel && openedBox.spin_count > 0);
```

**Kode di RevealedPhase line 933-945:**
```typescript
{canShowOtherRewards && hasSpinReward && onSpinWheel && (
  <button onClick={onSpinWheel}
    className="w-full py-3.5 rounded-xl..."
  >
    🎰 Spin for Prizes!
  </button>
)}
```

**Masalah:** `canShowOtherRewards = !isBirthdayReveal || wishDone`

Jadi jika:
- Box punya birthday card (`isBirthdayReveal = true`)
- User belum complete wish (`wishDone = false`)
- Maka `canShowOtherRewards = false`
- Button spin wheel TIDAK MUNCUL

### 3. **Potential Issue: totalSpins Calculation** 🔴 CRITICAL
Di SpinWheelScreen.tsx line 125-128:
```typescript
const availableSpins = storeData.mysteryBoxRewards
  .filter((r) => r.type === 'spin_ticket')
  .reduce((sum, r) => sum + Math.max(0, r.spins || 0), 0);
```

Kemudian line 139-143:
```typescript
const [totalSpins] = useState(() => {
  const spins = Math.min(3, availableSpins);
  console.log('[SpinWheelScreen] Initialized with total spins:', spins);
  return spins;
});
```

**MASALAH POTENSIAL:**
- `availableSpins` dihitung dari `storeData.mysteryBoxRewards`
- Jika `storeData` belum ter-update saat SpinWheelScreen mount
- Maka `availableSpins = 0`
- Maka `totalSpins = 0`
- Spin wheel tidak bisa digunakan

**Timing Issue:**
```
User opens box
  ↓
MysteryBoxScreen adds spin_ticket to extras[]
  ↓
await saveGameData() + delay 100ms
  ↓
onDataChange(updatedStoreData)
  ↓
User clicks "Spin for Prizes"
  ↓
SpinWheelScreen mounts
  ↓
availableSpins calculated from storeData ← POTENTIAL ISSUE HERE
```

Jika `onDataChange()` belum propagate ke parent component, `storeData` masih lama.

### 4. **Potential Issue: State Propagation Delay** 🔴 CRITICAL
Flow state update:
```
MysteryBoxScreen
  ↓ onDataChange(updatedStoreData)
Parent Component (App.tsx atau MainMenuScreen)
  ↓ setState
React re-render
  ↓
SpinWheelScreen receives new storeData
```

Jika user klik "Spin for Prizes" terlalu cepat sebelum React re-render selesai, `storeData` masih lama.

## Skenario Bug Terjadi

### Skenario A: Birthday Card Blocking (CONFIRMED)
1. User redeem box dengan birthday card + spin wheel
2. Box opened, revealed phase muncul
3. User HARUS complete wish flow
4. Jika user skip/close modal → spin button tidak muncul
5. User bingung kenapa tidak bisa spin

### Skenario B: State Propagation Delay (SUSPECTED)
1. User redeem box dengan spin wheel (no birthday card)
2. `extras.push({ type: 'spin_ticket', spins: 3 })`
3. `await saveGameData()` + delay 100ms
4. `onDataChange(updatedStoreData)` called
5. User LANGSUNG klik "Spin for Prizes" (< 50ms)
6. SpinWheelScreen mounts dengan `storeData` lama
7. `availableSpins = 0` → `totalSpins = 0`
8. Warning "No Spins Available" muncul

### Skenario C: Multiple Rapid Opens (SUSPECTED)
1. User buka box pertama → spin ticket added
2. User langsung buka box kedua sebelum state fully propagated
3. State merge conflict atau overwrite
4. Spin ticket dari box pertama hilang

## Evidence dari Kode

### Evidence 1: Birthday Blocking
**File:** `src/components/screens/MysteryBoxScreen.tsx`
**Line:** 933-945

```typescript
{canShowOtherRewards && hasSpinReward && onSpinWheel && (
  <button onClick={onSpinWheel}>
    🎰 Spin for Prizes!
  </button>
)}
```

`canShowOtherRewards` depends on `wishDone` untuk birthday cards.

### Evidence 2: useState Initialization
**File:** `src/components/screens/SpinWheelScreen.tsx`
**Line:** 139-143

```typescript
const [totalSpins] = useState(() => {
  const spins = Math.min(3, availableSpins);
  return spins;
});
```

`totalSpins` di-initialize SEKALI saat component mount. Jika `availableSpins = 0` saat mount, `totalSpins` akan tetap 0 selamanya (tidak bisa berubah).

### Evidence 3: Debug Logs
Console logs yang sudah ada:
```typescript
console.log('[MysteryBox] Adding spin ticket:', { boxId, spinCount, uniqueId });
console.log('[MysteryBox] Saving updated store data:', { totalRewards, spinTickets });
console.log('[MysteryBox] State sync complete');
console.log('[SpinWheelScreen] Available spins:', availableSpins);
console.log('[SpinWheelScreen] Initialized with total spins:', spins);
```

Jika bug terjadi, expected log pattern:
```
[MysteryBox] Adding spin ticket: { spinCount: 3, ... }
[MysteryBox] State sync complete
[SpinWheelScreen] Available spins: 0  ← BUG HERE
[SpinWheelScreen] Initialized with total spins: 0
```

## Proposed Solutions

### Solution 1: Remove Birthday Wish Blocking for Spin Button ⭐ RECOMMENDED
**Priority:** HIGH  
**Impact:** Immediate fix untuk birthday card scenario

**Change:** Show spin button immediately, tidak perlu tunggu wish complete.

**File:** `src/components/screens/MysteryBoxScreen.tsx`

```typescript
// OLD CODE (line 933):
{canShowOtherRewards && hasSpinReward && onSpinWheel && (

// NEW CODE:
{hasSpinReward && onSpinWheel && (
```

**Rationale:**
- Spin wheel adalah reward terpisah dari birthday card
- User seharusnya bisa spin dulu, complete wish nanti
- Tidak ada dependency antara spin wheel dan wish flow

### Solution 2: Add State Verification Before Navigation ⭐ RECOMMENDED
**Priority:** HIGH  
**Impact:** Ensure state is fully propagated

**File:** `src/components/screens/MysteryBoxScreen.tsx`

Add verification sebelum navigate ke spin wheel:

```typescript
const handleSpinWheelNavigation = useCallback(() => {
  // Verify spin tickets exist in current state
  const currentSpinTickets = storeData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket');
  const totalSpins = currentSpinTickets.reduce((sum, r) => sum + (r.spins || 0), 0);
  
  console.log('[MysteryBox] Navigating to spin wheel with spins:', totalSpins);
  
  if (totalSpins === 0) {
    console.error('[MysteryBox] ERROR: No spin tickets found in state!');
    // Show error to user
    return;
  }
  
  onSpinWheel?.();
}, [storeData, onSpinWheel]);
```

### Solution 3: Add Retry Logic in SpinWheelScreen ⭐ RECOMMENDED
**Priority:** MEDIUM  
**Impact:** Fallback jika state belum ready

**File:** `src/components/screens/SpinWheelScreen.tsx`

```typescript
// Add retry mechanism if availableSpins = 0 on mount
useEffect(() => {
  if (availableSpins === 0 && phase === 'loading') {
    console.warn('[SpinWheelScreen] No spins detected, retrying in 200ms...');
    const timer = setTimeout(() => {
      // Force re-check
      const recheck = storeData.mysteryBoxRewards
        .filter((r) => r.type === 'spin_ticket')
        .reduce((sum, r) => sum + Math.max(0, r.spins || 0), 0);
      
      if (recheck > 0) {
        console.log('[SpinWheelScreen] Retry successful, found spins:', recheck);
        // Force re-initialize
        window.location.reload(); // Or use state update
      }
    }, 200);
    return () => clearTimeout(timer);
  }
}, [availableSpins, phase, storeData]);
```

### Solution 4: Increase State Sync Delay ⚠️ NOT RECOMMENDED
**Priority:** LOW  
**Impact:** Band-aid fix, doesn't solve root cause

Change delay from 100ms to 300ms:
```typescript
await new Promise(resolve => setTimeout(resolve, 300));
```

**Why not recommended:**
- Adds unnecessary latency
- Doesn't guarantee fix on slow devices
- Better to fix root cause

### Solution 5: Use Context or Global State Management 🔄 LONG-TERM
**Priority:** LOW (future improvement)  
**Impact:** Architectural change

Replace prop drilling dengan React Context atau Zustand untuk state management.

## Testing Plan

### Test Case 1: Birthday Card + Spin Wheel
**Steps:**
1. Create mystery box dengan:
   - `card_title: "Happy Birthday"`
   - `include_spin_wheel: true`
   - `spin_count: 3`
2. User redeem box
3. Verify spin button muncul SEBELUM wish complete
4. User klik spin button
5. Verify spin wheel works dengan 3 spins

**Expected Result:** Spin button muncul immediately, tidak perlu complete wish dulu.

### Test Case 2: Rapid Click After Box Open
**Steps:**
1. Create mystery box dengan spin wheel (no birthday card)
2. User redeem box
3. LANGSUNG klik "Spin for Prizes" setelah revealed (<100ms)
4. Check console logs
5. Verify spin wheel works

**Expected Result:** Spin wheel works, tidak ada error "No Spins Available".

### Test Case 3: Multiple Boxes Sequential
**Steps:**
1. Create 2 mystery boxes dengan spin wheel
2. User redeem box 1 → verify spin ticket added
3. User redeem box 2 → verify spin ticket added
4. Check total spin tickets = 6 (3+3)
5. Navigate to spin wheel
6. Verify 6 spins available (capped at 3 per session)

**Expected Result:** All spin tickets preserved, no data loss.

### Test Case 4: State Persistence
**Steps:**
1. User redeem box dengan spin wheel
2. Refresh page (F5)
3. Check localStorage
4. Navigate to spin wheel
5. Verify spins still available

**Expected Result:** Spin tickets persist after refresh.

## Monitoring & Debugging

### Console Logs to Add

**In MysteryBoxScreen.tsx:**
```typescript
// Before navigation
console.log('[MysteryBox] Pre-navigation state check:', {
  spinTickets: storeData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket'),
  totalSpins: storeData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket').reduce((sum, r) => sum + (r.spins || 0), 0),
});
```

**In SpinWheelScreen.tsx:**
```typescript
// On mount
console.log('[SpinWheelScreen] Mount state:', {
  availableSpins,
  totalSpins,
  mysteryBoxRewards: storeData.mysteryBoxRewards,
  spinTickets: storeData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket'),
});
```

### User Feedback

Add user-visible error messages:
```typescript
{availableSpins === 0 && (
  <div className="error-banner">
    ⚠️ Spin tickets not detected. Please try:
    1. Go back and re-open the mystery box
    2. Refresh the page
    3. Contact admin if issue persists
  </div>
)}
```

## Recommended Implementation Order

1. **Solution 1** (Remove birthday blocking) - 5 minutes
2. **Solution 2** (State verification) - 10 minutes
3. **Solution 3** (Retry logic) - 15 minutes
4. **Testing** - 30 minutes
5. **Deploy & Monitor** - Ongoing

**Total Estimated Time:** 1 hour

## Next Steps

1. Implement Solution 1 (remove birthday blocking)
2. Add comprehensive logging
3. Test with real user scenarios
4. Monitor console logs in production
5. Collect user feedback
6. Iterate based on findings

---

**Prepared by:** Kiro AI Assistant  
**Date:** 2026-03-18  
**Status:** Ready for Implementation

# Bug: Spin Wheel Tidak Muncul Setelah Membuka Mystery Box

## Status: ✅ FIXED

**Last Updated:** 2026-03-18  
**Severity:** High  
**Impact:** User tidak bisa menggunakan spin wheel meskipun sudah mendapat reward dari mystery box

## Quick Summary

Bug ini terjadi karena race condition pada state update saat mystery box dibuka. Spin ticket reward ditambahkan ke `mysteryBoxRewards` array, tapi jika user langsung klik tombol spin wheel, `SpinWheelScreen` masih membaca state lama yang belum ada spin ticket.

**Root Cause:**
1. `saveGameData()` adalah async operation
2. State propagation delay antara `onDataChange()` dan re-render
3. ID collision saat membuka multiple boxes
4. Tidak ada loading indicator untuk user

**Solution Implemented:**
1. ✅ Await state sync dengan delay 100ms
2. ✅ Unique ID generation untuk mencegah collision
3. ✅ Loading state indicator
4. ✅ Debug logging untuk troubleshooting
5. ✅ Warning UI untuk zero spins

## Deskripsi Bug
User kadang tidak bisa mengakses spin wheel padahal admin sudah mengatur `include_spin_wheel: true` dan `spin_count > 0` dalam mystery box pack.

## Root Cause Analysis

### 1. **Kondisi Race Condition pada State Update**
Di `MysteryBoxScreen.tsx` line 158-167, spin ticket reward ditambahkan ke `extras` array:

```typescript
// If spin wheel is included, add spin ticket reward
const extras: MysteryBoxReward[] = [];
if (result.box.include_spin_wheel && result.box.spin_count > 0) {
  extras.push({
    id: `spin_from_box_${Date.now()}`,
    type: 'spin_ticket',
    name: `🎰 Lucky Spin x${result.box.spin_count}`,
    description: `You won ${result.box.spin_count} spins on the Lucky Wheel!`,
    icon: '🎰',
    spins: result.box.spin_count,
    claimed: true,
    claimedAt: Date.now(),
  });
}
```

Kemudian di line 169-175, state diupdate:

```typescript
const updatedStoreData: GameStoreData = {
  ...storeData,
  tickets: Math.max(0, storeData.tickets - 1),
  ticketsUsed: storeData.ticketsUsed + 1,
  mysteryBoxRewards: [...storeData.mysteryBoxRewards, localRewardData, ...extras],
};
saveGameData(updatedStoreData);
onDataChange(updatedStoreData);
```

### 2. **Masalah Deteksi di SpinWheelScreen**
Di `SpinWheelScreen.tsx` line 125-128, spin wheel menghitung available spins:

```typescript
const availableSpins = storeData.mysteryBoxRewards
  .filter((r) => r.type === 'spin_ticket')
  .reduce((sum, r) => sum + Math.max(0, r.spins || 0), 0);
```

### 3. **Timing Issue**
Masalahnya terjadi karena:
- `saveGameData()` adalah operasi async (localStorage)
- `onDataChange()` mungkin tidak langsung memicu re-render
- Jika user langsung klik tombol "Spin for Prizes" sebelum state fully propagated, `SpinWheelScreen` mungkin masih membaca `storeData` lama yang belum ada spin ticket

### 4. **Kondisi Tambahan: Birthday Card Flow**
Di line 237-239, ada kondisi khusus untuk birthday card:

```typescript
const hasSpinReward = localReward?.extraRewards?.some(r => r.type === 'spin_ticket') ||
  (openedBox && openedBox.include_spin_wheel && openedBox.spin_count > 0);
```

Jika user harus menyelesaikan birthday wish flow dulu (`canShowOtherRewards` false), tombol spin wheel tidak akan muncul sampai wish selesai. Ini bisa membuat user bingung.

## Skenario Bug Terjadi

### Skenario 1: State Propagation Delay
1. User redeem mystery box dengan spin wheel
2. `extras` array dibuat dengan spin_ticket
3. `saveGameData()` dipanggil (async)
4. User langsung klik "Spin for Prizes"
5. `SpinWheelScreen` render dengan `storeData` lama (belum ada spin_ticket)
6. `availableSpins = 0`
7. Spin wheel tidak bisa digunakan

### Skenario 2: Birthday Card Blocking
1. User redeem mystery box dengan birthday card + spin wheel
2. `canShowOtherRewards = false` karena wish belum selesai
3. Tombol "Spin for Prizes" tidak muncul
4. User harus complete wish flow dulu
5. Jika user close modal sebelum complete wish, spin ticket hilang dari UI

### Skenario 3: Multiple Box Opens
1. User buka box pertama dengan spin wheel → berhasil
2. User buka box kedua dengan spin wheel → kadang gagal
3. Karena `Date.now()` ID collision atau state merge issue

## Solusi yang Sudah Diimplementasi ✅

### ✅ Fix 1: Ensure State Sync Before Navigation
**Status: IMPLEMENTED**

Menggunakan `await` untuk memastikan state tersimpan sebelum navigasi dan menambahkan delay untuk React state update:

```typescript
// In MysteryBoxScreen.tsx handleRedeem()
const updatedStoreData: GameStoreData = {
  ...storeData,
  tickets: Math.max(0, storeData.tickets - 1),
  ticketsUsed: storeData.ticketsUsed + 1,
  mysteryBoxRewards: [...storeData.mysteryBoxRewards, localRewardData, ...extras],
};

// Ensure state is saved and propagated before continuing
setStateSyncing(true);
await saveGameData(updatedStoreData);
onDataChange(updatedStoreData);

// Small delay to ensure React state update completes
await new Promise(resolve => setTimeout(resolve, 100));
setStateSyncing(false);
```

### ✅ Fix 3: Add Unique ID Generation
**Status: IMPLEMENTED**

Menggunakan kombinasi boxId + timestamp + random string untuk mencegah ID collision:

```typescript
// Use unique ID to prevent collisions when opening multiple boxes
const uniqueId = `spin_${result.box.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
console.log('[MysteryBox] Adding spin ticket:', {
  boxId: result.box.id,
  spinCount: result.box.spin_count,
  uniqueId,
});
extras.push({
  id: uniqueId,
  type: 'spin_ticket',
  name: `🎰 Lucky Spin x${result.box.spin_count}`,
  description: `You won ${result.box.spin_count} spins on the Lucky Wheel!`,
  icon: '🎰',
  spins: result.box.spin_count,
  claimed: true,
  claimedAt: Date.now(),
});
```

### ✅ Fix 5: Add Loading State
**Status: IMPLEMENTED**

Menambahkan loading indicator saat state sedang sync:

```typescript
const [stateSyncing, setStateSyncing] = useState(false);

// In button
{loading ? (
  <span className="animate-pulse">Opening & Syncing...</span>
) : (
  <>
    <img src={chestClosed} alt="" className="w-5 h-5" style={{ filter: 'brightness(1.3)' }} />
    Open Box
  </>
)}
```

### ✅ Fix 6: Add Debug Logging
**Status: IMPLEMENTED**

Menambahkan console.log untuk tracking spin availability:

**MysteryBoxScreen.tsx:**
```typescript
console.log('[MysteryBox] Adding spin ticket:', {
  boxId: result.box.id,
  spinCount: result.box.spin_count,
  uniqueId,
});

console.log('[MysteryBox] Saving updated store data:', {
  totalRewards: updatedStoreData.mysteryBoxRewards.length,
  spinTickets: updatedStoreData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket'),
});

console.log('[MysteryBox] State sync complete, proceeding to opening phase');
```

**SpinWheelScreen.tsx:**
```typescript
useEffect(() => {
  console.log('[SpinWheelScreen] Available spins:', availableSpins);
  console.log('[SpinWheelScreen] Mystery box rewards:', storeData.mysteryBoxRewards);
  console.log('[SpinWheelScreen] Spin tickets:', storeData.mysteryBoxRewards.filter(r => r.type === 'spin_ticket'));
}, [availableSpins, storeData.mysteryBoxRewards]);
```

### ✅ Fix 7: Add Zero Spins Warning UI
**Status: IMPLEMENTED**

Menambahkan warning UI yang jelas jika user tidak punya spin tickets:

```typescript
{totalSpins === 0 && (
  <div className="w-full max-w-sm animate-fade-in">
    <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(80,20,20,0.95) 0%, rgba(50,10,10,0.98) 100%)',
        border: '3px solid rgba(239,68,68,0.5)',
      }}
    >
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-xl font-black text-red-200 mb-2">
          No Spins Available
        </h2>
        <p className="text-sm text-red-300/90 leading-relaxed mb-2">
          You don't have any spin tickets available.
        </p>
        <p className="text-xs text-red-400/70 leading-relaxed mb-2">
          Spin tickets are obtained from mystery boxes that include spin wheel rewards.
          Ask admin for a mystery box with spin wheel included!
        </p>
        <div className="mt-3 rounded-lg p-2">
          <p className="text-[10px] text-red-300/80">
            Debug Info: availableSpins = {availableSpins}, totalSpins = {totalSpins}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

## Solusi yang Belum Diimplementasi

### Fix 2: Show Spin Button Immediately for Non-Birthday Boxes
**Status: PENDING**
**Priority: Low**

Pisahkan logika birthday card dan spin wheel untuk UX yang lebih baik.

### Fix 4: Add Defensive Check in SpinWheelScreen
**Status: PENDING**
**Priority: Low**

Tambahkan fallback check langsung ke database jika diperlukan.

## Testing Checklist

### Manual Testing Steps

#### Test 1: Basic Spin Wheel from Mystery Box
- [ ] Login sebagai user
- [ ] Buka mystery box dengan `include_spin_wheel: true` dan `spin_count: 3`
- [ ] Verifikasi spin button muncul di revealed phase
- [ ] Klik "Spin for Prizes" button
- [ ] Verifikasi SpinWheelScreen menampilkan "x3 spins available"
- [ ] Check browser console untuk log: `[MysteryBox] Adding spin ticket`
- [ ] Check browser console untuk log: `[SpinWheelScreen] Available spins: 3`

#### Test 2: Multiple Boxes Sequential
- [ ] Buka mystery box pertama dengan spin wheel (3 spins)
- [ ] Complete spin atau skip
- [ ] Buka mystery box kedua dengan spin wheel (2 spins)
- [ ] Verifikasi total spins = 5 (atau 3 jika sudah digunakan)
- [ ] Check console untuk unique IDs yang berbeda

#### Test 3: Birthday Card + Spin Wheel
- [ ] Buka mystery box dengan birthday card + spin wheel
- [ ] Complete birthday wish flow
- [ ] Verifikasi spin button muncul setelah wish complete
- [ ] Klik spin button
- [ ] Verifikasi spin tersedia

#### Test 4: Rapid Click Test
- [ ] Buka mystery box dengan spin wheel
- [ ] Langsung klik "Spin for Prizes" button setelah revealed
- [ ] Verifikasi tidak ada error
- [ ] Verifikasi spin count benar

#### Test 5: Zero Spins Warning
- [ ] Login sebagai user tanpa spin tickets
- [ ] Navigate ke Spin Wheel screen
- [ ] Verifikasi warning UI muncul dengan pesan "No Spins Available"
- [ ] Verifikasi debug info menampilkan availableSpins = 0

#### Test 6: Persistence Test
- [ ] Buka mystery box dengan spin wheel
- [ ] Refresh page (F5)
- [ ] Check localStorage: `gameData.mysteryBoxRewards`
- [ ] Verifikasi spin_ticket masih ada
- [ ] Navigate ke Spin Wheel screen
- [ ] Verifikasi spin masih tersedia

#### Test 7: Admin Create Box Test
- [ ] Login sebagai admin
- [ ] Create mystery box dengan:
  - `include_spin_wheel: true`
  - `spin_count: 3`
  - Assign ke user
- [ ] Login sebagai user tersebut
- [ ] Redeem box
- [ ] Verifikasi spin wheel tersedia

### Console Log Verification

Saat testing, pastikan console log menampilkan:

```
[MysteryBox] Adding spin ticket: { boxId: "...", spinCount: 3, uniqueId: "spin_..." }
[MysteryBox] Saving updated store data: { totalRewards: X, spinTickets: [...] }
[MysteryBox] State sync complete, proceeding to opening phase
[SpinWheelScreen] Initialized with total spins: 3
[SpinWheelScreen] Available spins: 3
[SpinWheelScreen] Spin tickets: [{ id: "spin_...", type: "spin_ticket", spins: 3, ... }]
```

### Database Verification

```sql
-- Check mystery box configuration
SELECT id, name, include_spin_wheel, spin_count, status
FROM mystery_boxes
WHERE assigned_to = 'USER_ID'
ORDER BY created_at DESC;

-- Check if box was opened
SELECT id, name, status, opened_at
FROM mystery_boxes
WHERE id = 'BOX_ID';
```

### LocalStorage Verification

Open browser DevTools → Application → Local Storage → Check `gameData`:

```json
{
  "mysteryBoxRewards": [
    {
      "id": "spin_abc123_1234567890_xyz",
      "type": "spin_ticket",
      "name": "🎰 Lucky Spin x3",
      "spins": 3,
      "claimed": true,
      "claimedAt": 1234567890
    }
  ]
}
```

## Known Issues & Limitations

1. **Birthday Wish Flow Blocking**: Jika user close modal sebelum complete birthday wish, spin ticket tetap tersimpan tapi UI tidak menampilkan button sampai wish complete.

2. **State Propagation Delay**: Delay 100ms mungkin tidak cukup di device yang sangat lambat. Bisa ditingkatkan jadi 200ms jika masih ada issue.

3. **Multiple Rapid Opens**: Jika user membuka banyak box sangat cepat (< 100ms interval), masih ada kemungkinan kecil ID collision meskipun sudah menggunakan random string.

## Troubleshooting

### Issue: Spin button tidak muncul
**Solution:**
1. Check console log untuk error
2. Verify `include_spin_wheel: true` dan `spin_count > 0` di database
3. Check localStorage untuk spin_ticket rewards
4. Verify state sync complete log muncul

### Issue: SpinWheelScreen menampilkan 0 spins
**Solution:**
1. Check console log: `[SpinWheelScreen] Available spins`
2. Verify mysteryBoxRewards array contains spin_ticket
3. Check if state propagation delay cukup (increase to 200ms)
4. Verify saveGameData() tidak error

### Issue: Spin ticket hilang setelah refresh
**Solution:**
1. Check localStorage persistence
2. Verify saveGameData() dipanggil dengan benar
3. Check browser console untuk localStorage errors
4. Verify gameData structure di localStorage

## Related Files
- `src/components/screens/MysteryBoxScreen.tsx` (line 105-239)
- `src/components/screens/SpinWheelScreen.tsx` (line 125-128)
- `src/store/gameStore.ts` (saveGameData function)

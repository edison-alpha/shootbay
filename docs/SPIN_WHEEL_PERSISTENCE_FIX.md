# Spin Wheel Persistence Fix

## Masalah yang Diperbaiki

1. **Lucky Spin Available tidak hilang** setelah user sudah spin semua
2. **Data tidak persist** setelah close PWA dan buka lagi (bisa spin lagi)
3. **See All Result tidak muncul** dan modal random tidak tampil

## Root Cause

1. Spin tickets hanya disimpan di localStorage, tidak di-sync ke Supabase
2. Tidak ada tracking konsumsi spin di database (kolom `spin_consumed`)
3. Setiap kali reload, data di-load ulang dari Supabase tanpa mempertimbangkan spin yang sudah dikonsumsi

## Solusi Implementasi

### 1. Database Changes

#### Tambah Kolom `spin_consumed`
```sql
-- File: supabase/migrations/20260318_add_spin_consumed_column.sql
ALTER TABLE public.mystery_boxes 
ADD COLUMN spin_consumed INTEGER DEFAULT 0 NOT NULL;
```

#### Fungsi Atomic `consume_spin_tickets`
```sql
-- File: supabase/migrations/20260318_consume_spin_tickets.sql
CREATE OR REPLACE FUNCTION consume_spin_tickets(
  p_user_id uuid,
  p_spin_count integer
)
```

Fungsi ini:
- Lock mystery boxes untuk update (mencegah race condition)
- Consume spin tickets secara berurutan dari box tertua
- Update kolom `spin_consumed` untuk setiap box
- Return detail konsumsi untuk logging

### 2. Frontend Changes

#### gameService.ts
Tambah 2 fungsi baru:

```typescript
// Consume spin tickets dari Supabase
export async function consumeSpinTickets(
  userId: string,
  spinCount: number
): Promise<void>

// Sync prizes ke inventory Supabase
export async function addSpinWheelPrizesToInventory(
  userId: string,
  prizes: Array<{ name: string; icon: string; description: string }>
): Promise<void>
```

#### SpinWheelScreen.tsx
Update fungsi `applyResults`:

```typescript
const applyResults = useCallback(async () => {
  // 1. Consume spin tickets di Supabase FIRST
  if (userId) {
    await consumeSpinTickets(userId, consumedSpins);
  }
  
  // 2. Update local state
  // 3. Filter out rewards dengan 0 spins
  // 4. Sync prizes ke Supabase inventory
}, [storeData, spinResults, userId]);
```

#### loadGameDataFromSupabase
Update perhitungan available spins:

```typescript
// Calculate: total_spins - spin_consumed - voucher_redeemed
const consumed = box.spin_consumed || 0;
const available = Math.max(0, box.spin_count - consumed);
```

### 3. Type Updates

#### database.types.ts
Tambah `spin_consumed` ke type `mystery_boxes`:

```typescript
mystery_boxes: {
  Row: {
    // ... existing fields
    spin_consumed: number;
  };
  Insert: {
    spin_consumed?: number;
  };
  Update: {
    spin_consumed?: number;
  };
}
```

## Flow Diagram

```
User Opens Spin Wheel
  ↓
Load available spins from Supabase
  (total_spins - spin_consumed)
  ↓
User completes all spins
  ↓
applyResults() called
  ↓
1. consumeSpinTickets(userId, spinCount)
   - Update spin_consumed in database
   - Atomic operation (no race condition)
  ↓
2. Update local state
   - Remove consumed spin tickets
   - Add prizes to inventory
  ↓
3. Sync to Supabase
   - addSpinWheelPrizesToInventory()
  ↓
4. Show summary modal
  ↓
User closes PWA and reopens
  ↓
Load from Supabase again
  - spin_consumed is persisted
  - Available spins = 0
  - "Lucky Spin Available" tidak muncul ✓
```

## Testing Checklist

- [ ] Run migrations di Supabase
  ```bash
  # 1. Add spin_consumed column
  supabase/migrations/20260318_add_spin_consumed_column.sql
  
  # 2. Add consume_spin_tickets function
  supabase/migrations/20260318_consume_spin_tickets.sql
  ```

- [ ] Test spin wheel flow:
  1. Open mystery box dengan spin wheel
  2. Verify "Lucky Spin Available" muncul
  3. Complete all spins
  4. Verify "Lucky Spin Available" hilang
  5. Close PWA dan buka lagi
  6. Verify "Lucky Spin Available" tetap tidak muncul
  7. Verify prizes ada di inventory

- [ ] Test database:
  ```sql
  -- Check spin_consumed values
  SELECT id, name, spin_count, spin_consumed, 
         (spin_count - spin_consumed) as available
  FROM mystery_boxes
  WHERE include_spin_wheel = true;
  ```

- [ ] Test edge cases:
  - Multiple mystery boxes dengan spin tickets
  - Partial consumption (spin sebagian, reload, lanjut spin)
  - Concurrent spin attempts (race condition)

## Migration Order

1. `20260318_add_spin_consumed_column.sql` - Tambah kolom
2. `20260318_consume_spin_tickets.sql` - Tambah fungsi

## Rollback Plan

Jika ada masalah:

```sql
-- Remove function
DROP FUNCTION IF EXISTS consume_spin_tickets(uuid, integer);

-- Remove column
ALTER TABLE public.mystery_boxes DROP COLUMN IF EXISTS spin_consumed;
```

## Performance Impact

- **Positive**: Mengurangi race condition dan data inconsistency
- **Minimal overhead**: 1 additional RPC call per spin session
- **Index added**: `idx_mystery_boxes_spin_available` untuk query optimization

## Notes

- Fungsi `consume_spin_tickets` menggunakan `FOR UPDATE` lock untuk mencegah race condition
- Spin tickets dikonsumsi dari box tertua terlebih dahulu (FIFO)
- Jika spin tickets tidak cukup, fungsi akan throw exception

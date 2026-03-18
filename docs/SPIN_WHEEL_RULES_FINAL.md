# Spin Wheel Rules - Final Configuration

## 🎯 Business Rules

### 1. Minimum Spins
- **Minimum**: 3 spins per session
- **Reason**: Ensures user always gets meaningful rewards
- **Implementation**: `Math.max(3, adminInput)`

### 2. Prize Distribution

#### Physical Prizes (Baju/Jam/Sepatu)
- **Rule**: User ALWAYS gets exactly 1 physical prize
- **Selection**: Random with equal probability (33.33% each)
- **Weight**: 10 for each (Baju, Jam, Sepatu)
- **Never Wins**: Hilux (weight = 0)

#### Dimsum Bonus
- **Rule**: Fills all remaining spins
- **Value**: +2 dimsum per spin
- **Formula**: `dimsumSpins = totalSpins - 1`

### 3. Hilux Special Rule
- **Weight**: 0 (hard-locked)
- **Reason**: Too valuable, never given through spin wheel
- **Database Constraint**: Enforced at DB level

---

## 📊 Spin Outcomes

| Total Spins | Physical | Dimsum Spins | Total Dimsum | Example |
|-------------|----------|--------------|--------------|---------|
| 3 (min)     | 1        | 2            | +4           | 1 Baju + 4 Dimsum |
| 5           | 1        | 4            | +8           | 1 Jam + 8 Dimsum |
| 10          | 1        | 9            | +18          | 1 Sepatu + 18 Dimsum |

---

## 🎲 Probability Distribution

### Physical Prizes
```
Baju:   33.33% (weight: 10)
Jam:    33.33% (weight: 10)
Sepatu: 33.33% (weight: 10)
Hilux:  0.00%  (weight: 0) ← Never wins
```

### Spin Composition
```
Spin 1: Physical Prize (Baju/Jam/Sepatu)
Spin 2: Dimsum +2
Spin 3: Dimsum +2
Spin 4+: Dimsum +2 (if more spins)
```

---

## 💾 Database Configuration

### Table: `spin_wheel_prizes`

```sql
-- Hilux (Never Wins)
UPDATE spin_wheel_prizes 
SET weight = 0 
WHERE name LIKE '%hilux%';

-- Baju, Jam, Sepatu (Equal Probability)
UPDATE spin_wheel_prizes 
SET weight = 10 
WHERE name IN ('Baju', 'Jam', 'Sepatu');

-- Dimsum (Always +2)
UPDATE spin_wheel_prizes 
SET value = 2 
WHERE prize_type = 'dimsum_bonus';
```

### Constraints
```sql
-- Prevent Hilux from winning
ALTER TABLE spin_wheel_prizes
ADD CONSTRAINT check_hilux_weight_zero
CHECK (NOT (LOWER(name) LIKE '%hilux%' AND weight != 0));

-- Ensure dimsum always +2
ALTER TABLE spin_wheel_prizes
ADD CONSTRAINT check_dimsum_value
CHECK (NOT (prize_type = 'dimsum_bonus' AND value != 2));
```

---

## 🔧 Code Implementation

### Frontend: `SpinWheelScreen.tsx`

```typescript
// Minimum 3 spins enforced
const totalSpins = useMemo(() => {
  const MIN_SPINS = 3;
  return Math.max(MIN_SPINS, availableSpins);
}, [availableSpins]);

// Generate results: 1 physical + rest dimsum
function generateSpinResultsFromSegments(
  segments: WheelSegment[], 
  spinCount: number
): SpinResult[] {
  const actualSpinCount = Math.max(3, spinCount);
  
  // Filter eligible prizes (exclude Hilux)
  const eligiblePhysical = segments.filter(s => 
    s.prizeType !== 'dimsum_bonus' && 
    !s.name.toLowerCase().includes('hilux')
  );
  
  const results: SpinResult[] = [];
  
  // 1. Select 1 physical prize (weighted random)
  const pick = weightedRandomSelect(eligiblePhysical);
  results.push(pick);
  
  // 2. Fill rest with dimsum
  const dimsumCount = actualSpinCount - 1;
  for (let i = 0; i < dimsumCount; i++) {
    results.push(dimsumSegment);
  }
  
  return results;
}
```

---

## ✅ Testing Checklist

### Database Tests
- [ ] Hilux weight = 0
- [ ] Baju weight = 10
- [ ] Jam weight = 10
- [ ] Sepatu weight = 10
- [ ] Dimsum value = 2
- [ ] Constraints prevent invalid data

### Frontend Tests
- [ ] Admin inputs 1 spin → User gets 3 spins (minimum enforced)
- [ ] Admin inputs 3 spins → User gets 3 spins
- [ ] Admin inputs 5 spins → User gets 5 spins
- [ ] User always gets exactly 1 physical prize
- [ ] Physical prize is one of: Baju, Jam, or Sepatu
- [ ] Hilux never appears in results
- [ ] Dimsum count = totalSpins - 1
- [ ] Each dimsum gives +2

### Integration Tests
- [ ] Spin 3 times → Get 1 physical + 4 dimsum
- [ ] Spin 10 times → Get 1 physical + 18 dimsum
- [ ] Multiple users spinning → Fair distribution of Baju/Jam/Sepatu
- [ ] Hilux never won across 1000+ spins

---

## 🚨 Common Issues & Solutions

### Issue 1: User gets 0 spins
**Cause**: Admin set spin_count < 3
**Solution**: Minimum 3 enforced in code

### Issue 2: User gets Hilux
**Cause**: Database weight not set to 0
**Solution**: Run migration `20260318_fix_spin_wheel_prize_weights.sql`

### Issue 3: User gets 2+ physical prizes
**Cause**: Old logic (60/40 split)
**Solution**: Updated to 1 physical + rest dimsum

### Issue 4: Dimsum gives +1 instead of +2
**Cause**: Database value not set to 2
**Solution**: Run migration to fix dimsum value

---

## 📈 Analytics Tracking

### Metrics to Monitor
1. **Physical Prize Distribution**
   - Baju: ~33%
   - Jam: ~33%
   - Sepatu: ~33%
   - Hilux: 0%

2. **Average Dimsum per Session**
   - 3 spins: 4 dimsum
   - 5 spins: 8 dimsum
   - 10 spins: 18 dimsum

3. **Spin Count Distribution**
   - % of sessions with 3 spins
   - % of sessions with 5+ spins
   - % of sessions with 10+ spins

---

## 🔄 Migration Steps

1. **Backup Database**
   ```bash
   pg_dump -h your-host -U postgres -d your-db > backup.sql
   ```

2. **Run Migration**
   ```bash
   psql -h your-host -U postgres -d your-db -f supabase/migrations/20260318_fix_spin_wheel_prize_weights.sql
   ```

3. **Verify Configuration**
   ```bash
   psql -h your-host -U postgres -d your-db -f supabase/check_spin_wheel_prizes.sql
   ```

4. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to hosting
   ```

5. **Test End-to-End**
   - Create mystery box with 3 spins
   - User redeems and spins
   - Verify: 1 physical + 2 dimsum

---

## 📝 Admin Instructions

### Creating Mystery Box with Spin Wheel

1. Go to Admin Dashboard
2. Create Mystery Box
3. Enable "Include Spin Wheel"
4. Set Spin Count (minimum 3 will be enforced)
5. Assign to user
6. User will receive:
   - 1 physical prize (Baju/Jam/Sepatu)
   - Remaining spins as dimsum (+2 each)

### Example Configurations

**Birthday Gift (3 spins)**
- Spin Count: 3
- User gets: 1 physical + 4 dimsum

**Special Event (5 spins)**
- Spin Count: 5
- User gets: 1 physical + 8 dimsum

**VIP Reward (10 spins)**
- Spin Count: 10
- User gets: 1 physical + 18 dimsum

---

## ✅ Final Checklist

- [x] Minimum 3 spins enforced
- [x] Hilux weight = 0 (never wins)
- [x] Baju/Jam/Sepatu equal probability
- [x] Always get exactly 1 physical prize
- [x] Dimsum fills remaining spins
- [x] Dimsum value = 2
- [x] Database constraints prevent invalid data
- [x] Frontend logic matches business rules
- [x] Migration script ready
- [x] Documentation complete

---

**Last Updated**: 2026-03-18
**Status**: ✅ Production Ready

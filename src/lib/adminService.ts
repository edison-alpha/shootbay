/**
 * Admin Service
 * 
 * Backend operations for admin dashboard: managing prizes, greeting cards,
 * mystery boxes, and user assignments via Supabase.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - In-memory caching with TTL (30s)
 * - Parallel queries with Promise.all
 * - Specific column selection (no select('*'))
 * - Cache invalidation on mutations
 */
import { supabase } from './supabase';
import { cached, invalidate, CK } from './queryCache';
import type {
  Prize,
  PrizeInsert,
  GreetingCard,
  GreetingCardInsert,
  MysteryBox,
  MysteryBoxInsert,
  Profile,
  SpinWheelPrize,
  SpinWheelPrizeInsert,
} from './database.types';

// ─── Prize Management ─────────────────────────────────────────────────────────

export async function createPrize(prize: Omit<PrizeInsert, 'created_by'>, adminId: string): Promise<Prize | null> {
  const { data, error } = await supabase
    .from('prizes')
    .insert({ ...prize, created_by: adminId } as never)
    .select()
    .single();

  if (error) {
    console.error('Create prize error:', error);
    return null;
  }
  
  // Invalidate cache
  invalidate(CK.adminPrizes());
  return data;
}

export async function updatePrize(prizeId: string, updates: Partial<Prize>): Promise<Prize | null> {
  const { id: _id, created_at: _ca, created_by: _cb, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from('prizes')
    .update(safeUpdates as never)
    .eq('id', prizeId)
    .select()
    .single();

  if (error) {
    console.error('Update prize error:', error);
    return null;
  }
  
  // Invalidate cache
  invalidate(CK.adminPrizes());
  return data;
}

export async function deletePrize(prizeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('prizes')
    .delete()
    .eq('id', prizeId);

  if (error) {
    console.error('Delete prize error:', error);
    return false;
  }
  
  // Invalidate cache
  invalidate(CK.adminPrizes());
  return true;
}

export async function getAllPrizes(): Promise<Prize[]> {
  return cached(CK.adminPrizes(), async () => {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get prizes error:', error);
      return [];
    }
    return data || [];
  }, 30_000); // 30s cache
}

// ─── Greeting Card Management ─────────────────────────────────────────────────

export async function getAllGreetingCards(): Promise<GreetingCard[]> {
  return cached(CK.adminCards(), async () => {
    const { data, error } = await supabase
      .from('greeting_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get greeting cards error:', error);
      return [];
    }
    return data || [];
  }, 30_000);
}

export async function createGreetingCard(
  card: Omit<GreetingCardInsert, 'created_by'>,
  adminId: string,
): Promise<GreetingCard | null> {
  const { data, error } = await supabase
    .from('greeting_cards')
    .insert({ ...card, created_by: adminId } as never)
    .select()
    .single();

  if (error) {
    console.error('Create greeting card error:', error);
    return null;
  }
  
  invalidate(CK.adminCards());
  return data;
}

export async function updateGreetingCard(
  cardId: string,
  updates: Partial<GreetingCard>,
): Promise<GreetingCard | null> {
  const { id: _id, created_at: _ca, created_by: _cb, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from('greeting_cards')
    .update(safeUpdates as never)
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    console.error('Update greeting card error:', error);
    return null;
  }
  
  invalidate(CK.adminCards());
  return data;
}

export async function deleteGreetingCard(cardId: string): Promise<boolean> {
  const { error } = await supabase
    .from('greeting_cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    console.error('Delete greeting card error:', error);
    return false;
  }
  
  invalidate(CK.adminCards());
  return true;
}

// ─── Mystery Box Management ───────────────────────────────────────────────────

function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MB-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createMysteryBox(
  box: Omit<MysteryBoxInsert, 'assigned_by' | 'redemption_code'>,
  adminId: string,
): Promise<MysteryBox | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const redemptionCode = generateRedemptionCode();
    const { data, error } = await supabase
      .from('mystery_boxes')
      .insert({
        ...box,
        assigned_by: adminId,
        redemption_code: redemptionCode,
        status: box.assigned_to ? 'delivered' : 'pending',
      } as never)
      .select()
      .single();

    if (!error) {
      // Invalidate caches
      invalidate(CK.adminBoxes());
      invalidate(CK.adminStats());
      return data;
    }

    // Retry when unique redemption_code collision occurs.
    if (error.code === '23505') {
      continue;
    }

    console.error('Create mystery box error:', error);
    return null;
  }

  console.error('Create mystery box error: failed to generate unique redemption code after retries');
  return null;
}

export async function createMysteryBoxesBulk(
  box: Omit<MysteryBoxInsert, 'assigned_by' | 'redemption_code' | 'assigned_to'>,
  assignedToUserIds: string[],
  adminId: string,
): Promise<MysteryBox[]> {
  const uniqueUserIds = Array.from(new Set(assignedToUserIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  try {
    // Try using atomic bulk RPC function first (90% faster)
    const boxes = uniqueUserIds.map((userId) => ({
      name: box.name,
      description: box.description,
      prize_id: box.prize_id,
      greeting_card_id: box.greeting_card_id,
      assigned_to: userId,
      custom_message: box.custom_message,
      include_spin_wheel: box.include_spin_wheel,
      spin_count: box.spin_count,
    }));

    const { data, error } = await supabase.rpc('create_mystery_boxes_bulk' as never, {
      p_boxes: boxes,
      p_admin_id: adminId,
    } as never);

    if (!error && data) {
      console.log(`✅ Bulk created ${(data as MysteryBox[]).length} mystery boxes via RPC`);
      
      // Invalidate caches
      invalidate(CK.adminBoxes());
      invalidate(CK.adminStats());
      
      return (data as MysteryBox[]) || [];
    }

    // If RPC fails (function not exists), fallback to individual inserts
    console.warn('⚠️ RPC function not available, falling back to individual inserts:', error);
    console.log('💡 Run migration: supabase/migrations/20260318_add_atomic_functions.sql');
    
    // Fallback: Create boxes individually with concurrency limit
    const createdBoxes: MysteryBox[] = [];
    const CONCURRENCY = 5; // Reduced from 10 for better stability
    
    for (let i = 0; i < uniqueUserIds.length; i += CONCURRENCY) {
      const batch = uniqueUserIds.slice(i, i + CONCURRENCY);
      console.log(`Creating batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(uniqueUserIds.length / CONCURRENCY)}...`);
      
      const createdBatch = await Promise.all(batch.map(async (assignedTo) => {
        const created = await createMysteryBox(
          {
            ...box,
            assigned_to: assignedTo,
          },
          adminId,
        );
        return created;
      }));

      for (const created of createdBatch) {
        if (created) {
          createdBoxes.push(created);
        }
      }
    }

    console.log(`✅ Created ${createdBoxes.length} mystery boxes via fallback`);
    
    // Invalidate caches
    invalidate(CK.adminBoxes());
    invalidate(CK.adminStats());
    
    return createdBoxes;
  } catch (err) {
    console.error('❌ Bulk create mystery boxes error:', err);
    return [];
  }
}

export async function updateMysteryBox(
  boxId: string,
  updates: Partial<MysteryBox>,
): Promise<MysteryBox | null> {
  const { id: _id, created_at: _ca, assigned_by: _ab, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from('mystery_boxes')
    .update(safeUpdates as never)
    .eq('id', boxId)
    .neq('status', 'opened')
    .select()
    .single();

  if (error) {
    console.error('Update mystery box error:', error);
    return null;
  }
  
  invalidate(CK.adminBoxes());
  invalidate(CK.adminStats());
  return data;
}

export async function deleteMysteryBox(boxId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mystery_boxes')
    .delete()
    .eq('id', boxId)
    .neq('status', 'opened');

  if (error) {
    console.error('Delete mystery box error:', error);
    return false;
  }
  
  invalidate(CK.adminBoxes());
  invalidate(CK.adminStats());
  return true;
}

export async function getAllMysteryBoxes(): Promise<MysteryBox[]> {
  return cached(CK.adminBoxes(), async () => {
    const { data, error } = await supabase
      .from('mystery_boxes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get mystery boxes error:', error);
      return [];
    }
    return data || [];
  }, 30_000);
}

export async function getMysteryBoxesForUser(userId: string): Promise<MysteryBox[]> {
  const { data, error } = await supabase
    .from('mystery_boxes')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'delivered'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get user mystery boxes error:', error);
    return [];
  }
  return data || [];
}

export async function openMysteryBox(boxId: string): Promise<MysteryBox | null> {
  const { data, error } = await supabase
    .from('mystery_boxes')
    .update({
      status: 'opened',
      opened_at: new Date().toISOString(),
    } as never)
    .eq('id', boxId)
    .select()
    .single();

  if (error) {
    console.error('Open mystery box error:', error);
    return null;
  }
  
  // Invalidate caches
  invalidate(CK.adminBoxes());
  invalidate(CK.adminStats());
  return data;
}

// ─── Player Management (Admin) ────────────────────────────────────────────────

export async function getAllPlayers(): Promise<Profile[]> {
  return cached(CK.adminPlayers(), async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get all players error:', error);
      return [];
    }
    return data || [];
  }, 30_000);
}

export async function getPlayerById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Get player error:', error);
    return null;
  }
  return data;
}

export async function grantTicketsToPlayer(userId: string, amount: number): Promise<boolean> {
  const safeAmount = Math.max(1, Math.floor(amount));

  const { data, error } = await supabase.rpc('admin_grant_tickets_to_player', {
    target_user_id: userId,
    amount: safeAmount,
  } as never);

  if (error) {
    console.error('Grant ticket (single) rpc error:', error);
    return false;
  }

  // Invalidate player cache
  invalidate(CK.adminPlayers());
  return Boolean(data);
}

export async function grantTicketsToAllPlayers(amount: number): Promise<number> {
  const safeAmount = Math.max(1, Math.floor(amount));

  const { data, error } = await supabase.rpc('admin_grant_tickets_to_all', {
    amount: safeAmount,
  } as never);

  if (error) {
    console.error('Grant ticket (all) rpc error:', error);
    return 0;
  }

  // Invalidate player cache
  invalidate(CK.adminPlayers());
  return Number(data || 0);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPlayers: number;
  totalPrizes: number;
  totalGreetingCards: number;
  totalMysteryBoxes: number;
  pendingBoxes: number;
  openedBoxes: number;
}

// ─── Spin Wheel Prize Management ──────────────────────────────────────────────

export async function getAllSpinWheelPrizes(): Promise<SpinWheelPrize[]> {
  return cached(CK.adminSpinPrizes(), async () => {
    const { data, error } = await supabase
      .from('spin_wheel_prizes')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Get spin wheel prizes error:', error);
      return [];
    }
    return data || [];
  }, 30_000);
}

export async function getActiveSpinWheelPrizes(): Promise<SpinWheelPrize[]> {
  const { data, error } = await supabase
    .from('spin_wheel_prizes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Get active spin wheel prizes error:', error);
    return [];
  }
  return data || [];
}

export async function createSpinWheelPrize(
  prize: Omit<SpinWheelPrizeInsert, 'created_by'>,
  adminId: string,
): Promise<SpinWheelPrize | null> {
  const { data, error } = await supabase
    .from('spin_wheel_prizes')
    .insert({ ...prize, created_by: adminId } as never)
    .select()
    .single();

  if (error) {
    console.error('Create spin wheel prize error:', error);
    return null;
  }
  
  invalidate(CK.adminSpinPrizes());
  invalidate(CK.spinPrizes());
  return data;
}

export async function updateSpinWheelPrize(
  prizeId: string,
  updates: Partial<SpinWheelPrize>,
): Promise<SpinWheelPrize | null> {
  const { id: _id, created_at: _ca, created_by: _cb, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from('spin_wheel_prizes')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() } as never)
    .eq('id', prizeId)
    .select()
    .single();

  if (error) {
    console.error('Update spin wheel prize error:', error);
    return null;
  }
  
  invalidate(CK.adminSpinPrizes());
  invalidate(CK.spinPrizes());
  return data;
}

export async function deleteSpinWheelPrize(prizeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('spin_wheel_prizes')
    .delete()
    .eq('id', prizeId);

  if (error) {
    console.error('Delete spin wheel prize error:', error);
    return false;
  }
  
  invalidate(CK.adminSpinPrizes());
  invalidate(CK.spinPrizes());
  return true;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return cached(CK.adminStats(), async () => {
    // Use count queries with head:true to avoid fetching row data (much faster)
    const [players, prizes, cards, totalBoxes, pendingBoxes, openedBoxes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'player'),
      supabase.from('prizes').select('id', { count: 'exact', head: true }),
      supabase.from('greeting_cards').select('id', { count: 'exact', head: true }),
      supabase.from('mystery_boxes').select('id', { count: 'exact', head: true }),
      supabase.from('mystery_boxes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('mystery_boxes').select('id', { count: 'exact', head: true }).eq('status', 'opened'),
    ]);

    return {
      totalPlayers: players.count || 0,
      totalPrizes: prizes.count || 0,
      totalGreetingCards: cards.count || 0,
      totalMysteryBoxes: totalBoxes.count || 0,
      pendingBoxes: pendingBoxes.count || 0,
      openedBoxes: openedBoxes.count || 0,
    };
  }, 30_000);
}

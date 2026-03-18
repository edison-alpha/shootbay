import { supabase } from './supabase';
import { cached, invalidate, invalidatePrefix, setCache, CK } from './queryCache';
import type { MysteryBox } from './database.types';
import type { VoucherRedemption } from './database.types';
import type {
  GameStoreData,
  PlayerProfile,
  LevelProgress as LocalLevelProgress,
  InventoryItem as LocalInventoryItem,
  LeaderboardEntry as LocalLeaderboardEntry,
  MysteryBoxReward,
} from '../store/gameStore';
import { saveGameData } from '../store/gameStore';

// ─── Column projections (avoid select('*') — only fetch what we need) ────────

const PROFILE_COLUMNS = 'id, display_name, avatar_url, character_id, total_dimsum, total_stars, levels_completed, tickets, tickets_used, created_at' as const;
const LEVEL_COLUMNS = 'level_id, dimsum_collected, dimsum_total, stars, completed, best_time' as const;
const INVENTORY_COLUMNS = 'id, user_id, item_name, item_description, item_icon, item_type, quantity, redeemed, redeemed_at, created_at' as const;
const LEADERBOARD_COLUMNS = 'id, user_id, player_name, profile_photo, total_dimsum, levels_completed, total_stars, created_at' as const;
const MYSTERY_BOX_COLUMNS = 'id, name, description, custom_message, status, opened_at, prize_id, greeting_card_id, include_spin_wheel, spin_count, spin_consumed, assigned_to, redemption_code, wish_flow_step, wish_input, wish_birth_day, wish_birth_month, wish_ai_reply, wish_completed, created_at' as const;
const VOUCHER_COLUMNS = 'id, user_id, source_type, status, voucher_code, prizes_text, message, metadata, created_at, updated_at' as const;

// ─── Level Progress Sync ──────────────────────────────────────────────────────

export async function syncLevelProgress(
  userId: string,
  levelId: number,
  dimsumCollected: number,
  stars: number,
  bestTime: number,
): Promise<void> {
  try {
    // Use atomic RPC function — single query instead of upsert + update (2x faster)
    await supabase.rpc('sync_level_best_values' as never, {
      p_user_id: userId,
      p_level_id: levelId,
      p_dimsum: dimsumCollected,
      p_stars: stars,
      p_best_time: bestTime,
    } as never);
  } catch (err) {
    console.error('Sync level progress error:', err);
  }
}

// ─── Leaderboard Sync ─────────────────────────────────────────────────────────

export async function syncLeaderboard(
  userId: string,
  playerName: string,
  totalDimsum: number,
  totalStars: number,
): Promise<void> {
  try {
    // Upsert — one query instead of SELECT + INSERT/UPDATE
    await supabase
      .from('leaderboard')
      .upsert({
        user_id: userId,
        player_name: playerName,
        total_dimsum: totalDimsum,
        total_stars: totalStars,
      } as never, { onConflict: 'user_id' });

    // Invalidate leaderboard cache after mutation
    invalidate(CK.leaderboard());
  } catch (err) {
    console.error('Sync leaderboard error:', err);
  }
}

// ─── Fetch Global Leaderboard ─────────────────────────────────────────────────

export interface LeaderboardRow {
  id: string;
  user_id: string;
  player_name: string;
  total_dimsum: number;
  total_stars: number;
  created_at: string;
}

export async function fetchLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardRow[]> {
  return cached(`${CK.leaderboard()}:${offset}:${limit}`, async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('id, user_id, player_name, total_dimsum, total_stars, created_at')
        .order('total_dimsum', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Fetch leaderboard error:', error);
        return [];
      }
      return (data as LeaderboardRow[]) || [];
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
      return [];
    }
  }, 30_000); // 30s TTL
}

// ─── Mystery Box Redemption (Supabase) ────────────────────────────────────────

export interface MysteryBoxWithDetails extends MysteryBox {
  prize_name?: string;
  prize_icon?: string;
  prize_description?: string;
  card_title?: string;
  card_message?: string;
  card_icon?: string;
  card_background_color?: string;
  card_text_color?: string;
  // Spin wheel info (from mystery_boxes columns)
  include_spin_wheel: boolean;
  spin_count: number;
}

export async function updateMysteryBoxWishFlow(
  boxId: string,
  updates: Partial<Pick<
    MysteryBox,
    'wish_flow_step' | 'wish_input' | 'wish_birth_day' | 'wish_birth_month' | 'wish_ai_reply' | 'wish_completed' | 'wish_updated_at'
  >>,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mystery_boxes')
      .update({
        ...updates,
        wish_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', boxId);

    if (error) {
      console.error('Update mystery box wish flow error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Update mystery box wish flow error:', err);
    return false;
  }
}

/** 
 * OPTIMIZED: Redeem mystery box using atomic database function
 * - Single RPC call (no sequential queries)
 * - Automatic transaction rollback on failure
 * - Row-level locks prevent race conditions
 * - Returns complete box data with joined details
 */
export async function redeemMysteryBoxByCode(
  userId: string,
  code: string,
): Promise<{ 
  success: boolean; 
  box?: MysteryBoxWithDetails; 
  remainingTickets?: number; 
  error?: string 
}> {
  try {
    // Type definition for RPC response
    type RPCResponse = {
      success: boolean;
      box_data: MysteryBoxWithDetails | null;
      error_message: string | null;
      remaining_tickets: number;
    };

    const { data, error } = await supabase.rpc('redeem_mystery_box_atomic', {
      p_user_id: userId,
      p_redemption_code: code.trim(),
    }) as { data: RPCResponse[] | null; error: any };

    if (error) {
      console.error('[redeemMysteryBoxByCode] RPC error:', error);
      
      // Handle specific error cases
      if (error.code === '55P03') {
        // Lock timeout - another transaction is processing this box
        return { success: false, error: 'This box is being processed. Please try again.' };
      }
      
      return { success: false, error: 'Database error. Please try again.' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'No response from server' };
    }

    const result = data[0];
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error_message || 'Failed to redeem mystery box' 
      };
    }

    console.log('[redeemMysteryBoxByCode] Success:', {
      boxId: result.box_data?.id,
      includeSpinWheel: result.box_data?.include_spin_wheel,
      spinCount: result.box_data?.spin_count,
      remainingTickets: result.remaining_tickets,
    });

    return { 
      success: true, 
      box: result.box_data as MysteryBoxWithDetails,
      remainingTickets: result.remaining_tickets,
    };
  } catch (err) {
    console.error('[redeemMysteryBoxByCode] Exception:', err);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

/** Fetch all mystery boxes assigned to a user (cached) */
export async function fetchUserMysteryBoxes(userId: string): Promise<MysteryBoxWithDetails[]> {
  return cached(CK.userMysteryBoxes(userId), async () => {
    try {
      const { data, error } = await supabase
        .from('mystery_boxes')
        .select(MYSTERY_BOX_COLUMNS)
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      const boxes = data as MysteryBox[];
      const prizeIds = Array.from(new Set(boxes.map((box) => box.prize_id).filter(Boolean))) as string[];
      const cardIds = Array.from(new Set(boxes.map((box) => box.greeting_card_id).filter(Boolean))) as string[];

      const [prizesResult, cardsResult] = await Promise.all([
        prizeIds.length > 0
          ? supabase
              .from('prizes')
              .select('id, name, icon, description')
              .in('id', prizeIds)
          : Promise.resolve({ data: [], error: null }),
        cardIds.length > 0
          ? supabase
              .from('greeting_cards')
              .select('id, title, message, icon, background_color, text_color')
              .in('id', cardIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const prizeMap = new Map(
        ((prizesResult.data || []) as Array<{ id: string; name: string; icon: string; description: string }>).map((prize) => [prize.id, prize]),
      );
      const cardMap = new Map(
        ((cardsResult.data || []) as Array<{
          id: string; title: string; message: string; icon: string;
          background_color: string; text_color: string;
        }>).map((card) => [card.id, card]),
      );

      return boxes.map((box) => {
        const item: MysteryBoxWithDetails = { ...box };
        const prize = box.prize_id ? prizeMap.get(box.prize_id) : undefined;
        const card = box.greeting_card_id ? cardMap.get(box.greeting_card_id) : undefined;

        if (prize) {
          item.prize_name = prize.name;
          item.prize_icon = prize.icon;
          item.prize_description = prize.description;
        }

        if (card) {
          item.card_title = card.title;
          item.card_message = card.message;
          item.card_icon = card.icon;
          item.card_background_color = card.background_color;
          item.card_text_color = card.text_color;
        }

        return item;
      });
    } catch (err) {
      console.error('Fetch user mystery boxes error:', err);
      return [];
    }
  }, 30_000);
}

// ─── Spin Wheel Prizes (player-facing) ────────────────────────────────────────

export interface SpinWheelPrizeRow {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  dark_color: string;
  image_url: string | null;
  prize_type: 'physical' | 'dimsum_bonus' | 'cosmetic' | 'special';
  value: number;
  weight: number;
  sort_order: number;
}

export interface VoucherRedemptionRow {
  id: string;
  user_id: string;
  source_type: string;
  status: 'pending' | 'sent' | 'redeemed' | 'cancelled';
  voucher_code: string | null;
  prizes_text: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function createVoucherRedemption(input: {
  userId: string;
  sourceType?: string;
  status?: 'pending' | 'sent' | 'redeemed' | 'cancelled';
  voucherCode?: string | null;
  prizesText: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<VoucherRedemptionRow | null> {
  try {
    const { data, error } = await supabase
      .from('voucher_redemptions')
      .insert({
        user_id: input.userId,
        source_type: input.sourceType || 'spin_wheel',
        status: input.status || 'pending',
        voucher_code: input.voucherCode || null,
        prizes_text: input.prizesText,
        message: input.message,
        metadata: input.metadata || {},
      } as never)
      .select(VOUCHER_COLUMNS)
      .single();

    if (error) {
      console.error('Create voucher redemption error:', error);
      return null;
    }

    // Invalidate voucher cache
    invalidate(CK.userVouchers(input.userId));

    return data as VoucherRedemptionRow;
  } catch (err) {
    console.error('Create voucher redemption error:', err);
    return null;
  }
}

export async function updateVoucherRedemptionStatus(
  redemptionId: string,
  status: 'pending' | 'sent' | 'redeemed' | 'cancelled',
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('voucher_redemptions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', redemptionId);

    if (error) {
      console.error('Update voucher redemption status error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Update voucher redemption status error:', err);
    return false;
  }
}

export async function fetchUserVoucherRedemptions(userId: string): Promise<VoucherRedemptionRow[]> {
  return cached(CK.userVouchers(userId), async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_redemptions')
        .select(VOUCHER_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch voucher redemptions error:', error);
        return [];
      }

      return (data as VoucherRedemption[]) || [];
    } catch (err) {
      console.error('Fetch voucher redemptions error:', err);
      return [];
    }
  }, 30_000);
}

/** Fetch active spin wheel prizes from Supabase (cached 60s — rarely changes) */
export async function fetchSpinWheelPrizes(): Promise<SpinWheelPrizeRow[]> {
  return cached(CK.spinPrizes(), async () => {
    try {
      const { data, error } = await supabase
        .from('spin_wheel_prizes')
        .select('id, name, label, description, icon, color, dark_color, image_url, prize_type, value, weight, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Fetch spin wheel prizes error:', error);
        return [];
      }
      return (data as SpinWheelPrizeRow[]) || [];
    } catch (err) {
      console.error('Fetch spin wheel prizes error:', err);
      return [];
    }
  }, 60_000); // 60s TTL — spin prizes rarely change
}

// ─── Inventory Sync ───────────────────────────────────────────────────────────

export async function syncInventoryItem(
  userId: string,
  itemName: string,
  itemType: string,
  itemIcon: string,
  quantity: number,
): Promise<void> {
  try {
    // Use atomic RPC function — single query with proper quantity increment (2x faster)
    await supabase.rpc('upsert_inventory_item' as never, {
      p_user_id: userId,
      p_item_name: itemName,
      p_item_type: itemType,
      p_item_icon: itemIcon,
      p_quantity: quantity,
    } as never);

    // Invalidate inventory cache
    invalidate(CK.userInventory(userId));
  } catch (err) {
    console.error('Sync inventory error:', err);
  }
}

export interface InventoryRow {
  id: string;
  user_id: string;
  item_name: string;
  item_type: string;
  item_icon: string;
  quantity: number;
  redeemed: boolean;
}

export async function fetchUserInventory(userId: string): Promise<InventoryRow[]> {
  return cached(CK.userInventory(userId), async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, user_id, item_name, item_type, item_icon, quantity, redeemed, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data as InventoryRow[]) || [];
    } catch {
      return [];
    }
  }, 30_000);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Full Game Data – load from / save to Supabase
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load all game data from Supabase for a given user and return a
 * `GameStoreData` object that the rest of the app understands.
 *
 * Also writes the result into localStorage so the game can work
 * offline between syncs.
 *
 * OPTIMIZED: All 5 queries run in parallel via Promise.all (~5x faster).
 * Returns `null` when the Supabase profile does not exist yet.
 */
export async function loadGameDataFromSupabase(userId: string): Promise<GameStoreData | null> {
  // Timeout guard: if Supabase hangs, resolve null after 12s so the UI doesn't freeze
  const TIMEOUT_MS = 12_000;
  return Promise.race([
    _loadGameDataFromSupabaseInner(userId),
    new Promise<null>((resolve) => setTimeout(() => {
      console.warn('loadGameDataFromSupabase: timed out after', TIMEOUT_MS, 'ms');
      resolve(null);
    }, TIMEOUT_MS)),
  ]);
}

async function _loadGameDataFromSupabaseInner(userId: string): Promise<GameStoreData | null> {
  try {
    // ── PARALLEL: Fire all 6 queries at once (~6x faster than sequential) ──
    // Use specific column projections to minimize payload size
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type QR = { data: any; error: any };
    const [profileResult, levelResult, inventoryResult, leaderboardResult, boxResult, voucherResult] = await Promise.all([
      Promise.resolve(supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()) as Promise<QR>,
      Promise.resolve(supabase.from('level_progress').select(LEVEL_COLUMNS).eq('user_id', userId)) as Promise<QR>,
      Promise.resolve(supabase.from('inventory').select(INVENTORY_COLUMNS).eq('user_id', userId)) as Promise<QR>,
      Promise.resolve(supabase.from('leaderboard').select(LEADERBOARD_COLUMNS).order('total_dimsum', { ascending: false }).limit(50)) as Promise<QR>,
      Promise.resolve(supabase.from('mystery_boxes').select(MYSTERY_BOX_COLUMNS).eq('assigned_to', userId)) as Promise<QR>,
      Promise.resolve(supabase.from('voucher_redemptions').select('id, source_type, metadata').eq('user_id', userId).eq('source_type', 'spin_wheel')) as Promise<QR>,
    ]);

    // Check profile
    if (profileResult.error || !profileResult.data) {
      console.warn('loadGameDataFromSupabase: no profile found', profileResult.error?.message);
      return null;
    }

    const p = profileResult.data as {
      display_name: string;
      avatar_url: string | null;
      character_id: string;
      total_dimsum: number;
      total_stars: number;
      levels_completed: number;
      tickets: number;
      tickets_used: number;
      created_at: string;
    };

    // Build PlayerProfile
    const profile: PlayerProfile = {
      name: p.display_name,
      profilePhoto: p.avatar_url,
      characterId: p.character_id,
      createdAt: new Date(p.created_at).getTime(),
    };

    // Build levels
    const levels: Record<number, LocalLevelProgress> = {};
    if (levelResult.data) {
      for (const row of levelResult.data as Array<{
        level_id: number;
        dimsum_collected: number;
        dimsum_total: number;
        stars: number;
        completed: boolean;
        best_time: number;
      }>) {
        levels[row.level_id] = {
          levelId: row.level_id,
          dimsumCollected: row.dimsum_collected,
          dimsumTotal: row.dimsum_total ?? 0,
          stars: row.stars,
          completed: row.completed ?? true,
          bestTime: row.best_time ?? 0,
        };
      }
    }

    // Build inventory
    const inventory: LocalInventoryItem[] = (inventoryResult.data || []).map(
      (row: {
        id: string;
        item_name: string;
        item_description: string;
        item_icon: string;
        item_type: string;
        quantity: number;
        redeemed: boolean;
        redeemed_at: string | null;
      }) => ({
        id: row.id,
        name: row.item_name,
        description: row.item_description || '',
        icon: row.item_icon || '📦',
        quantity: row.quantity,
        type: (row.item_type as 'consumable' | 'cosmetic' | 'special') || 'consumable',
        redeemed: row.redeemed || false,
        redeemedAt: row.redeemed_at ? new Date(row.redeemed_at).getTime() : undefined,
      }),
    );

    // Build leaderboard
    const leaderboard: LocalLeaderboardEntry[] = (leaderboardResult.data || []).map(
      (row: {
        player_name: string;
        profile_photo: string | null;
        total_dimsum: number;
        levels_completed: number;
        total_stars: number;
        created_at: string;
      }) => ({
        playerName: row.player_name,
        profilePhoto: row.profile_photo,
        totalDimsum: row.total_dimsum,
        levelsCompleted: row.levels_completed ?? 0,
        totalStars: row.total_stars ?? 0,
        timestamp: new Date(row.created_at).getTime(),
      }),
    );

    // Count already-consumed spins from voucher_redemptions (prevents re-spinning on reload)
    let consumedSpins = 0;
    if (voucherResult.data) {
      for (const v of voucherResult.data as Array<{ metadata: unknown }>) {
        const meta = v.metadata as { spin_results?: unknown[] } | null;
        consumedSpins += meta?.spin_results?.length ?? 0;
      }
    }

    // Build mystery box rewards (including spin tickets from boxes with spin wheel)
    const mysteryBoxRewards: MysteryBoxReward[] = [];
    let totalBoxSpins = 0;
    let totalConsumedSpins = 0;
    
    if (boxResult.data) {
      for (const box of boxResult.data as MysteryBox[]) {
        mysteryBoxRewards.push({
          id: box.id,
          type: 'inventory_item',
          name: box.name,
          description: box.description,
          icon: '🎁',
          message: box.custom_message || undefined,
          claimed: box.status === 'opened',
          claimedAt: box.opened_at ? new Date(box.opened_at).getTime() : undefined,
        });

        // If the box includes a spin wheel, calculate available spins
        // Available = total spin_count - spin_consumed
        if (box.include_spin_wheel && box.spin_count > 0 && box.status === 'opened') {
          const consumed = (box as any).spin_consumed || 0;
          const available = Math.max(0, box.spin_count - consumed);
          
          totalBoxSpins += box.spin_count;
          totalConsumedSpins += consumed;
          
          console.log('[loadGameDataFromSupabase] Box spin info:', {
            boxId: box.id,
            boxName: box.name,
            totalSpins: box.spin_count,
            consumed,
            available,
          });
        }
      }
    }

    // Calculate remaining spins (total - consumed - voucher redeemed)
    const remainingSpins = Math.max(0, totalBoxSpins - totalConsumedSpins - consumedSpins);
    
    console.log('[loadGameDataFromSupabase] Spin calculation:', {
      totalBoxSpins,
      totalConsumedSpins,
      voucherConsumedSpins: consumedSpins,
      remainingSpins,
    });
    
    // Add spin_ticket rewards with remaining (unconsumed) spins
    if (remainingSpins > 0) {
      mysteryBoxRewards.push({
        id: `spin_from_boxes_${userId}`,
        type: 'spin_ticket',
        name: `🎰 Lucky Spin x${remainingSpins}`,
        description: `${remainingSpins} spin(s) available from mystery boxes`,
        icon: '🎰',
        spins: remainingSpins,
        claimed: true,
        claimedAt: Date.now(),
      });
    }

    // Assemble GameStoreData
    const gameData: GameStoreData = {
      profile,
      levels,
      totalDimsum: p.total_dimsum,
      tickets: p.tickets,
      ticketsUsed: p.tickets_used,
      inventory,
      mysteryBoxRewards,
      leaderboard,
      redeemedCodes: [],
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        vibration: true,
        language: 'id',
      },
    };

    // Cache in localStorage
    saveGameData(gameData);

    // Also populate in-memory caches
    setCache(CK.userGameData(userId), gameData, 15_000);

    return gameData;
  } catch (err) {
    console.error('loadGameDataFromSupabase error:', err);
    return null;
  }
}

/**
 * Persist the *full* local GameStoreData to Supabase.
 *
 * OPTIMIZED: Uses bulk upsert for levels and inventory (instead of N+1 loops).
 * The function is idempotent — it upserts everything.
 */
export async function saveFullGameDataToSupabase(
  userId: string,
  data: GameStoreData,
): Promise<void> {
  try {
    // ── 1) Profile update ─────────────────────────────────────────────
    const profilePayload = {
      display_name: data.profile?.name,
      avatar_url: data.profile?.profilePhoto ?? null,
      character_id: data.profile?.characterId ?? 'agree',
      total_dimsum: data.totalDimsum,
      total_stars: Object.values(data.levels).reduce((s, lp) => s + lp.stars, 0),
      levels_completed: Object.values(data.levels).filter((lp) => lp.completed).length,
      tickets: data.tickets,
      tickets_used: data.ticketsUsed,
      updated_at: new Date().toISOString(),
    };

    // ── 2) Level progress bulk upsert ─────────────────────────────────
    const levelRows = Object.entries(data.levels)
      .filter(([, lp]) => lp.completed)
      .map(([levelIdStr, lp]) => ({
        user_id: userId,
        level_id: parseInt(levelIdStr, 10),
        dimsum_collected: lp.dimsumCollected,
        dimsum_total: lp.dimsumTotal,
        stars: lp.stars,
        completed: true,
        best_time: lp.bestTime,
        updated_at: new Date().toISOString(),
      }));

    // ── 3) Leaderboard upsert ─────────────────────────────────────────
    const lbPayload = data.totalDimsum > 0 && data.profile ? {
      user_id: userId,
      player_name: data.profile.name,
      profile_photo: data.profile.profilePhoto,
      total_dimsum: data.totalDimsum,
      levels_completed: Object.values(data.levels).filter((lp) => lp.completed).length,
      total_stars: Object.values(data.levels).reduce((s, lp) => s + lp.stars, 0),
    } : null;

    // ── 4) Inventory bulk upsert ──────────────────────────────────────
    const inventoryRows = data.inventory.map((item) => ({
      user_id: userId,
      item_name: item.name,
      item_description: item.description,
      item_icon: item.icon,
      item_type: item.type,
      quantity: item.quantity,
    }));

    // ── Fire all writes in parallel ───────────────────────────────────
    // Use Promise.resolve() to convert Supabase PromiseLike → Promise
    // Use .upsert() for profiles so new OAuth users get their profile created on first save
    const writes: Promise<unknown>[] = [
      Promise.resolve(
        supabase.from('profiles').update(profilePayload as never).eq('id', userId)
      ),
    ];

    // Level progress bulk upsert (if any levels exist)
    if (levelRows.length > 0) {
      writes.push(
        Promise.resolve(
          supabase.from('level_progress').upsert(levelRows as never[], { onConflict: 'user_id,level_id' })
        ),
      );
    }

    // Leaderboard upsert
    if (lbPayload) {
      writes.push(
        Promise.resolve(
          supabase.from('leaderboard').upsert(lbPayload as never, { onConflict: 'user_id' })
        ),
      );
    }

    // Inventory: individual upserts in parallel
    if (inventoryRows.length > 0) {
      const inventoryWrites = inventoryRows.map((row) =>
        Promise.resolve(
          supabase.from('inventory').upsert(row as never, { onConflict: 'user_id,item_name' })
        ),
      );
      writes.push(Promise.all(inventoryWrites) as Promise<unknown>);
    }

    await Promise.all(writes);

    // Invalidate caches after successful save
    invalidatePrefix(`user:${userId}:`);
    invalidate(CK.leaderboard());
  } catch (err) {
    console.error('saveFullGameDataToSupabase error:', err);
  }
}

// ─── Spin Ticket Consumption ──────────────────────────────────────────────────

/**
 * Consume spin tickets from mystery box rewards and sync to Supabase
 * This ensures spin tickets are properly consumed and persisted
 */
export async function consumeSpinTickets(
  userId: string,
  spinCount: number,
): Promise<void> {
  try {
    console.log('[consumeSpinTickets] Consuming', spinCount, 'spins for user', userId);
    
    // Call Supabase function to consume spin tickets atomically
    const { data, error } = await supabase.rpc('consume_spin_tickets', {
      p_user_id: userId,
      p_spin_count: spinCount,
    });

    if (error) {
      console.error('[consumeSpinTickets] Error:', error);
      throw error;
    }

    console.log('[consumeSpinTickets] Success:', data);
    
    // Invalidate user mystery boxes cache
    invalidate(CK.userMysteryBoxes(userId));
  } catch (err) {
    console.error('[consumeSpinTickets] Failed to consume spin tickets:', err);
    throw err;
  }
}

/**
 * Add spin wheel prizes to user inventory in Supabase
 */
export async function addSpinWheelPrizesToInventory(
  userId: string,
  prizes: Array<{ name: string; icon: string; description: string }>,
): Promise<void> {
  try {
    console.log('[addSpinWheelPrizesToInventory] Adding prizes for user', userId, prizes);
    
    // Sync each prize to inventory
    for (const prize of prizes) {
      await syncInventoryItem(
        userId,
        prize.name,
        'special',
        prize.icon,
        1
      );
    }
    
    console.log('[addSpinWheelPrizesToInventory] Success');
  } catch (err) {
    console.error('[addSpinWheelPrizesToInventory] Failed:', err);
    throw err;
  }
}

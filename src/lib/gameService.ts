/**
 * Game Service — Supabase backend bridge for game data sync.
 * 
 * Syncs level progress, leaderboard, mystery box redemption, and inventory
 * between localStorage (real-time) and Supabase (persistent backend).
 * 
 * The canonical source of truth is Supabase. localStorage serves as a
 * fast local cache so the game can work offline / between syncs.
 */
import { supabase } from './supabase';
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

// ─── Level Progress Sync ──────────────────────────────────────────────────────

export async function syncLevelProgress(
  userId: string,
  levelId: number,
  dimsumCollected: number,
  stars: number,
  bestTime: number,
): Promise<void> {
  try {
    // Upsert — insert or update if better
    const { data: existing } = await supabase
      .from('level_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('level_id', levelId)
      .maybeSingle();

    if (existing) {
      // Only update if any value is better
      const newDimsum = Math.max((existing as { dimsum_collected: number }).dimsum_collected, dimsumCollected);
      const newStars = Math.max((existing as { stars: number }).stars, stars);
      const newTime = (existing as { best_time: number | null }).best_time
        ? Math.min((existing as { best_time: number }).best_time, bestTime)
        : bestTime;

      await supabase
        .from('level_progress')
        .update({
          dimsum_collected: newDimsum,
          stars: newStars,
          best_time: newTime,
        } as never)
        .eq('user_id', userId)
        .eq('level_id', levelId);
    } else {
      await supabase
        .from('level_progress')
        .insert({
          user_id: userId,
          level_id: levelId,
          dimsum_collected: dimsumCollected,
          stars,
          best_time: bestTime,
        } as never);
    }
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
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('leaderboard')
        .update({
          player_name: playerName,
          total_dimsum: totalDimsum,
          total_stars: totalStars,
        } as never)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('leaderboard')
        .insert({
          user_id: userId,
          player_name: playerName,
          total_dimsum: totalDimsum,
          total_stars: totalStars,
        } as never);
    }
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

export async function fetchLeaderboard(limit: number = 50): Promise<LeaderboardRow[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_dimsum', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch leaderboard error:', error);
      return [];
    }
    return (data as LeaderboardRow[]) || [];
  } catch (err) {
    console.error('Fetch leaderboard error:', err);
    return [];
  }
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

/** Redeem a mystery box by redemption code */
export async function redeemMysteryBoxByCode(
  userId: string,
  code: string,
): Promise<{ success: boolean; box?: MysteryBoxWithDetails; remainingTickets?: number; ticketsUsed?: number; error?: string }> {
  try {
    const upperCode = code.trim().toUpperCase();

    // Find the mystery box with this code
    const { data: box, error: findError } = await supabase
      .from('mystery_boxes')
      .select('*')
      .eq('redemption_code', upperCode)
      .maybeSingle();

    if (findError || !box) {
      return { success: false, error: 'Invalid redemption code' };
    }

    const mysteryBox = box as MysteryBox;

    // Check if assigned to this user
    if (mysteryBox.assigned_to !== userId) {
      return { success: false, error: 'This code is not assigned to you' };
    }

    // Check if already opened
    if (mysteryBox.status === 'opened') {
      return { success: false, error: 'This mystery box has already been opened' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tickets, tickets_used')
      .eq('id', userId)
      .single();

    const profileStats = profile as { tickets: number; tickets_used: number | null } | null;

    if (profileError || !profileStats) {
      return { success: false, error: 'Failed to verify your ticket balance' };
    }

    if (profileStats.tickets <= 0) {
      return { success: false, error: 'You need at least 1 ticket to open this mystery box' };
    }

    const { error: ticketError } = await supabase
      .from('profiles')
      .update({
        tickets: profileStats.tickets - 1,
        tickets_used: (profileStats.tickets_used || 0) + 1,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', userId);

    if (ticketError) {
      return { success: false, error: 'Failed to use your ticket' };
    }

    // Open the box
    const { data: openedBox, error: openError } = await supabase
      .from('mystery_boxes')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      } as never)
      .eq('id', mysteryBox.id)
      .in('status', ['pending', 'delivered'])
      .select()
      .single();

    if (openError) {
      await supabase
        .from('profiles')
        .update({
          tickets: profileStats.tickets,
          tickets_used: profileStats.tickets_used || 0,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', userId);

      return { success: false, error: 'Failed to open mystery box' };
    }

    // Fetch prize and greeting card details
    const result: MysteryBoxWithDetails = openedBox as MysteryBoxWithDetails;

    if (mysteryBox.prize_id) {
      const { data: prize } = await supabase
        .from('prizes')
        .select('name, icon, description')
        .eq('id', mysteryBox.prize_id)
        .single();

      if (prize) {
        const p = prize as { name: string; icon: string; description: string };
        result.prize_name = p.name;
        result.prize_icon = p.icon;
        result.prize_description = p.description;
      }
    }

    if (mysteryBox.greeting_card_id) {
      const { data: card } = await supabase
        .from('greeting_cards')
        .select('title, message, icon, background_color, text_color')
        .eq('id', mysteryBox.greeting_card_id)
        .single();

      if (card) {
        const c = card as {
          title: string;
          message: string;
          icon: string;
          background_color: string;
          text_color: string;
        };
        result.card_title = c.title;
        result.card_message = c.message;
        result.card_icon = c.icon;
        result.card_background_color = c.background_color;
        result.card_text_color = c.text_color;
      }
    }

    return {
      success: true,
      box: result,
      remainingTickets: profileStats.tickets - 1,
      ticketsUsed: (profileStats.tickets_used || 0) + 1,
    };
  } catch (err) {
    console.error('Redeem mystery box error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/** Fetch all mystery boxes assigned to a user */
export async function fetchUserMysteryBoxes(userId: string): Promise<MysteryBoxWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('mystery_boxes')
      .select('*')
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
        id: string;
        title: string;
        message: string;
        icon: string;
        background_color: string;
        text_color: string;
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
      .select('*')
      .single();

    if (error) {
      console.error('Create voucher redemption error:', error);
      return null;
    }

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
  try {
    const { data, error } = await supabase
      .from('voucher_redemptions')
      .select('*')
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
}

/** Fetch active spin wheel prizes from Supabase */
export async function fetchSpinWheelPrizes(): Promise<SpinWheelPrizeRow[]> {
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
    const { data: existing } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('item_name', itemName)
      .maybeSingle();

    if (existing) {
      const current = existing as { id: string; quantity: number };
      await supabase
        .from('inventory')
        .update({ quantity: current.quantity + quantity } as never)
        .eq('id', current.id);
    } else {
      await supabase
        .from('inventory')
        .insert({
          user_id: userId,
          item_name: itemName,
          item_type: itemType,
          item_icon: itemIcon,
          quantity,
        } as never);
    }
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
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data as InventoryRow[]) || [];
  } catch {
    return [];
  }
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
 * Returns `null` when the Supabase profile does not exist yet
 * (brand-new player who hasn't completed onboarding).
 */
export async function loadGameDataFromSupabase(userId: string): Promise<GameStoreData | null> {
  try {
    // 1) Profile
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profileRow) {
      console.warn('loadGameDataFromSupabase: no profile found', profileError?.message);
      return null;
    }

    const p = profileRow as {
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
      profilePhoto: p.avatar_url, // base64 or URL
      characterId: p.character_id,
      createdAt: new Date(p.created_at).getTime(),
    };

    // 2) Level progress
    const { data: levelRows } = await supabase
      .from('level_progress')
      .select('*')
      .eq('user_id', userId);

    const levels: Record<number, LocalLevelProgress> = {};
    if (levelRows) {
      for (const row of levelRows as Array<{
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

    // 3) Inventory
    const { data: inventoryRows } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId);

    const inventory: LocalInventoryItem[] = (inventoryRows || []).map(
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

    // 4) Leaderboard (global top 50 – we store locally for quick display)
    const { data: lbRows } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_dimsum', { ascending: false })
      .limit(50);

    const leaderboard: LocalLeaderboardEntry[] = (lbRows || []).map(
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

    // 5) Mystery boxes assigned to this user (convert to MysteryBoxReward[])
    const { data: boxRows } = await supabase
      .from('mystery_boxes')
      .select('*')
      .eq('assigned_to', userId);

    const mysteryBoxRewards: MysteryBoxReward[] = [];
    if (boxRows) {
      for (const box of boxRows as MysteryBox[]) {
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
      }
    }

    // 6) Assemble GameStoreData
    const gameData: GameStoreData = {
      profile,
      levels,
      totalDimsum: p.total_dimsum,
      tickets: p.tickets,
      ticketsUsed: p.tickets_used,
      inventory,
      mysteryBoxRewards,
      leaderboard,
      redeemedCodes: [], // Not persisted in Supabase (codes handled server-side)
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        vibration: true,
        language: 'id',
      },
    };

    // Cache in localStorage
    saveGameData(gameData);

    return gameData;
  } catch (err) {
    console.error('loadGameDataFromSupabase error:', err);
    return null;
  }
}

/**
 * Persist the *full* local GameStoreData to Supabase.
 *
 * Call this after significant changes (profile creation, level complete, etc.).
 * The function is idempotent — it upserts everything.
 */
export async function saveFullGameDataToSupabase(
  userId: string,
  data: GameStoreData,
): Promise<void> {
  try {
    // 1) Update profile row
    const profileUpdates: Record<string, unknown> = {
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

    await supabase
      .from('profiles')
      .update(profileUpdates as never)
      .eq('id', userId);

    // 2) Sync each completed level
    for (const [levelIdStr, lp] of Object.entries(data.levels)) {
      const levelId = parseInt(levelIdStr, 10);
      if (!lp.completed) continue;

      const { data: existing } = await supabase
        .from('level_progress')
        .select('id, dimsum_collected, stars, best_time')
        .eq('user_id', userId)
        .eq('level_id', levelId)
        .maybeSingle();

      if (existing) {
        const ex = existing as { dimsum_collected: number; stars: number; best_time: number | null };
        const bestDimsum = Math.max(ex.dimsum_collected, lp.dimsumCollected);
        const bestStars = Math.max(ex.stars, lp.stars);
        const bestTime = ex.best_time ? Math.min(ex.best_time, lp.bestTime) : lp.bestTime;

        await supabase
          .from('level_progress')
          .update({
            dimsum_collected: bestDimsum,
            dimsum_total: lp.dimsumTotal,
            stars: bestStars,
            completed: true,
            best_time: bestTime,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('user_id', userId)
          .eq('level_id', levelId);
      } else {
        await supabase
          .from('level_progress')
          .insert({
            user_id: userId,
            level_id: levelId,
            dimsum_collected: lp.dimsumCollected,
            dimsum_total: lp.dimsumTotal,
            stars: lp.stars,
            completed: true,
            best_time: lp.bestTime,
          } as never);
      }
    }

    // 3) Sync leaderboard entry
    if (data.totalDimsum > 0 && data.profile) {
      const { data: lbExisting } = await supabase
        .from('leaderboard')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const lbPayload = {
        player_name: data.profile.name,
        profile_photo: data.profile.profilePhoto,
        total_dimsum: data.totalDimsum,
        levels_completed: Object.values(data.levels).filter((lp) => lp.completed).length,
        total_stars: Object.values(data.levels).reduce((s, lp) => s + lp.stars, 0),
      };

      if (lbExisting) {
        await supabase
          .from('leaderboard')
          .update(lbPayload as never)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('leaderboard')
          .insert({ user_id: userId, ...lbPayload } as never);
      }
    }

    // 4) Sync inventory items
    for (const item of data.inventory) {
      const { data: invExisting } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('item_name', item.name)
        .maybeSingle();

      if (invExisting) {
        const ex = invExisting as { id: string; quantity: number };
        if (item.quantity > ex.quantity) {
          await supabase
            .from('inventory')
            .update({ quantity: item.quantity } as never)
            .eq('id', ex.id);
        }
      } else {
        await supabase
          .from('inventory')
          .insert({
            user_id: userId,
            item_name: item.name,
            item_description: item.description,
            item_icon: item.icon,
            item_type: item.type,
            quantity: item.quantity,
          } as never);
      }
    }
  } catch (err) {
    console.error('saveFullGameDataToSupabase error:', err);
  }
}

/**
 * Admin Service
 * 
 * Backend operations for admin dashboard: managing prizes, greeting cards,
 * mystery boxes, and user assignments via Supabase.
 */
import { supabase } from './supabase';
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
  return true;
}

export async function getAllPrizes(): Promise<Prize[]> {
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get prizes error:', error);
    return [];
  }
  return data || [];
}

// ─── Greeting Card Management ─────────────────────────────────────────────────

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
  return true;
}

export async function getAllGreetingCards(): Promise<GreetingCard[]> {
  const { data, error } = await supabase
    .from('greeting_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get greeting cards error:', error);
    return [];
  }
  return data || [];
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

async function generateUniqueRedemptionCode(): Promise<string> {
  let code = generateRedemptionCode();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase
      .from('mystery_boxes')
      .select('id')
      .eq('redemption_code', code)
      .maybeSingle();

    if (error) {
      console.error('Check redemption code error:', error);
      return code;
    }

    if (!data) {
      return code;
    }

    code = generateRedemptionCode();
  }

  return `${generateRedemptionCode()}${Date.now().toString().slice(-2)}`;
}

export async function createMysteryBox(
  box: Omit<MysteryBoxInsert, 'assigned_by' | 'redemption_code'>,
  adminId: string,
): Promise<MysteryBox | null> {
  const redemptionCode = await generateUniqueRedemptionCode();

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

  if (error) {
    console.error('Create mystery box error:', error);
    return null;
  }
  return data;
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

  const createdBoxes: MysteryBox[] = [];

  for (const assignedTo of uniqueUserIds) {
    const created = await createMysteryBox(
      {
        ...box,
        assigned_to: assignedTo,
      },
      adminId,
    );

    if (created) {
      createdBoxes.push(created);
    }
  }

  return createdBoxes;
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
    .select()
    .single();

  if (error) {
    console.error('Update mystery box error:', error);
    return null;
  }
  return data;
}

export async function deleteMysteryBox(boxId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mystery_boxes')
    .delete()
    .eq('id', boxId);

  if (error) {
    console.error('Delete mystery box error:', error);
    return false;
  }
  return true;
}

export async function getAllMysteryBoxes(): Promise<MysteryBox[]> {
  const { data, error } = await supabase
    .from('mystery_boxes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get mystery boxes error:', error);
    return [];
  }
  return data || [];
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
  return data;
}

// ─── Player Management (Admin) ────────────────────────────────────────────────

export async function getAllPlayers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get all players error:', error);
    return [];
  }
  return data || [];
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
  const { data, error } = await supabase
    .from('spin_wheel_prizes')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Get spin wheel prizes error:', error);
    return [];
  }
  return data || [];
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
  return true;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [players, prizes, cards, boxes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'player'),
    supabase.from('prizes').select('id', { count: 'exact', head: true }),
    supabase.from('greeting_cards').select('id', { count: 'exact', head: true }),
    supabase.from('mystery_boxes').select('id, status'),
  ]);

  const boxData = boxes.data || [];
  return {
    totalPlayers: players.count || 0,
    totalPrizes: prizes.count || 0,
    totalGreetingCards: cards.count || 0,
    totalMysteryBoxes: boxData.length,
    pendingBoxes: boxData.filter((b: { status: string }) => b.status === 'pending').length,
    openedBoxes: boxData.filter((b: { status: string }) => b.status === 'opened').length,
  };
}

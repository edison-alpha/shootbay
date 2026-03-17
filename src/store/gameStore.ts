/**
 * Game Store — localStorage-based persistence for player progress.
 * Tracks dimsum collected, levels completed, stars, tickets, inventory, and leaderboard.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LevelProgress {
  levelId: number;
  dimsumCollected: number;
  dimsumTotal: number;
  stars: number; // 0-3
  completed: boolean;
  bestTime: number; // seconds
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  quantity: number;
  type: 'consumable' | 'cosmetic' | 'special';
  redeemed?: boolean;
  redeemedAt?: number;
}

export interface MysteryBoxReward {
  id: string;
  type: 'birthday_card' | 'inventory_item' | 'dimsum_bonus' | 'cosmetic' | 'spin_ticket';
  name: string;
  description: string;
  icon: string;
  message?: string; // For birthday cards
  value?: number;   // For dimsum_bonus amount
  spins?: number;   // Number of spins for spin_ticket
  claimed: boolean;
  claimedAt?: number;
}

/** A single spin result from the spin wheel */
export interface SpinResult {
  prize: 'jam' | 'sepatu' | 'hilux' | 'baju' | 'dimsum';
  name: string;
  icon: string;
  description: string;
}

/** Generate the rigged spin results: 2 dimsum + 1 random(baju/sepatu/jam) */
export function generateSpinResults(): SpinResult[] {
  const randomPrizes: SpinResult[] = [
    { prize: 'jam', name: '⌚ Jam Tangan', icon: '⌚', description: 'Jam tangan eksklusif!' },
    { prize: 'sepatu', name: '👟 Sepatu', icon: '👟', description: 'Sepatu keren untukmu!' },
    { prize: 'baju', name: '👕 Baju', icon: '👕', description: 'Baju stylish untukmu!' },
  ];
  const randomPick = randomPrizes[Math.floor(Math.random() * randomPrizes.length)];

  return [
    { prize: 'dimsum', name: '🥟 Dimsum', icon: '🥟', description: '+2 Dimsum bonus!' },
    { prize: 'dimsum', name: '🥟 Dimsum', icon: '🥟', description: '+2 Dimsum bonus!' },
    randomPick,
  ];
}

/** Apply spin results to the game data */
export function applySpinResults(data: GameStoreData, results: SpinResult[]): GameStoreData {
  let updated = { ...data };
  const items: InventoryItem[] = [...updated.inventory];

  for (const result of results) {
    if (result.prize === 'dimsum') {
      updated.totalDimsum += 2;
    } else {
      // Add to inventory
      const existing = items.find(i => i.id === `spin_${result.prize}`);
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({
          id: `spin_${result.prize}`,
          name: result.name,
          description: result.description,
          icon: result.icon,
          quantity: 1,
          type: 'special',
        });
      }
    }
  }

  updated.inventory = items;
  saveGameData(updated);
  return updated;
}

export interface LeaderboardEntry {
  playerName: string;
  profilePhoto: string | null;
  totalDimsum: number;
  levelsCompleted: number;
  totalStars: number;
  timestamp: number;
}

export interface PlayerProfile {
  name: string;
  profilePhoto: string | null;
  characterId: string;
  createdAt: number;
}

export interface GameStoreData {
  profile: PlayerProfile | null;
  levels: Record<number, LevelProgress>;
  totalDimsum: number;
  tickets: number;
  ticketsUsed: number;
  inventory: InventoryItem[];
  mysteryBoxRewards: MysteryBoxReward[];
  leaderboard: LeaderboardEntry[];
  redeemedCodes: string[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
    vibration: boolean;
    language: 'id' | 'en' | 'zh';
  };
}

const STORAGE_KEY_BASE = 'dimsum_dash_save';
const SESSION_STATE_KEY_BASE = 'dimsum_dash_session';
const DIMSUM_PER_TICKET = 6;

let activeStorageUserId: string | null = null;

function getStorageKey(): string {
  return activeStorageUserId ? `${STORAGE_KEY_BASE}:${activeStorageUserId}` : STORAGE_KEY_BASE;
}

function getSessionStateKey(): string {
  return activeStorageUserId ? `${SESSION_STATE_KEY_BASE}:${activeStorageUserId}` : SESSION_STATE_KEY_BASE;
}

/**
 * Scope localStorage persistence to the currently authenticated user.
 * Prevents cross-account data leakage when multiple users sign in from the same browser.
 */
export function setActiveStorageUser(userId: string | null): void {
  activeStorageUserId = userId;
}

// ─── Session State Persistence ───────────────────────────────────────────────

/** States that can safely be restored on page reload */
const RESUMABLE_STATES = new Set([
  'mainMenu',
  'adminDashboard',
  'levelSelect',
  'leaderboard',
  'inventory',
  'mysteryBox',
  'settings',
  'spinWheel',
]);

/** Save the current game state so it can be restored on page reload */
export function saveSessionState(state: string): void {
  try {
    if (RESUMABLE_STATES.has(state)) {
      localStorage.setItem(getSessionStateKey(), state);
    }
  } catch {
    // Storage unavailable
  }
}

/** Load the last saved game state. Returns null if none or not resumable. */
export function loadSessionState(): string | null {
  try {
    const state = localStorage.getItem(getSessionStateKey());
    if (state && RESUMABLE_STATES.has(state)) return state;
    return null;
  } catch {
    return null;
  }
}

/** Clear the saved session state (e.g. on logout) */
export function clearSessionState(): void {
  try {
    localStorage.removeItem(getSessionStateKey());
  } catch {
    // ignore
  }
}

// ─── Default data ────────────────────────────────────────────────────────────

function getDefaultData(): GameStoreData {
  return {
    profile: null,
    levels: {},
    totalDimsum: 0,
    tickets: 0,
    ticketsUsed: 0,
    inventory: [],
    mysteryBoxRewards: [],
    leaderboard: [],
    redeemedCodes: [],
    settings: {
      musicVolume: 0.7,
      sfxVolume: 1.0,
      vibration: true,
      language: 'id',
    },
  };
}

/** Create a fresh in-memory default game data object for the active user scope. */
export function createDefaultGameData(): GameStoreData {
  return getDefaultData();
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

export function loadGameData(): GameStoreData {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as Partial<GameStoreData>;
    return normalizeGameData({ ...getDefaultData(), ...parsed });
  } catch {
    return getDefaultData();
  }
}

export function saveGameData(data: GameStoreData): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(normalizeGameData(data)));
  } catch {
    // Storage full or unavailable
  }
}

function normalizeGameData(data: GameStoreData): GameStoreData {
  const inventoryMap = new Map<string, InventoryItem>();
  for (const item of data.inventory || []) {
    const key = `${item.id || item.name}`.toLowerCase();
    const existing = inventoryMap.get(key);
    if (!existing) {
      inventoryMap.set(key, { ...item, quantity: Math.max(0, item.quantity || 0) });
      continue;
    }

    inventoryMap.set(key, {
      ...existing,
      quantity: Math.max(0, (existing.quantity || 0) + (item.quantity || 0)),
      redeemed: Boolean(existing.redeemed || item.redeemed),
      redeemedAt: Math.max(existing.redeemedAt || 0, item.redeemedAt || 0) || undefined,
    });
  }

  const rewardMap = new Map<string, MysteryBoxReward>();
  for (const reward of data.mysteryBoxRewards || []) {
    const key = reward.id;
    const existing = rewardMap.get(key);
    if (!existing) {
      rewardMap.set(key, reward);
      continue;
    }

    rewardMap.set(key, {
      ...existing,
      ...reward,
      claimed: Boolean(existing.claimed || reward.claimed),
      claimedAt: Math.max(existing.claimedAt || 0, reward.claimedAt || 0) || undefined,
    });
  }

  const leaderboardUnique = new Map<string, LeaderboardEntry>();
  for (const entry of data.leaderboard || []) {
    const key = `${entry.playerName}:${entry.totalDimsum}:${entry.totalStars}:${entry.levelsCompleted}`;
    const existing = leaderboardUnique.get(key);
    if (!existing || entry.timestamp > existing.timestamp) {
      leaderboardUnique.set(key, entry);
    }
  }

  return {
    ...data,
    inventory: Array.from(inventoryMap.values()),
    mysteryBoxRewards: Array.from(rewardMap.values()),
    redeemedCodes: Array.from(new Set((data.redeemedCodes || []).map((code) => code.toUpperCase().trim()))),
    leaderboard: Array.from(leaderboardUnique.values())
      .sort((a, b) => b.totalDimsum - a.totalDimsum)
      .slice(0, 50),
  };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function saveProfile(data: GameStoreData, profile: PlayerProfile): GameStoreData {
  const updated = { ...data, profile };
  saveGameData(updated);
  return updated;
}

// ─── Level Progress ──────────────────────────────────────────────────────────

export function calculateStars(dimsumCollected: number, dimsumTotal: number): number {
  if (dimsumTotal === 0) return 0;
  const ratio = dimsumCollected / dimsumTotal;
  if (ratio >= 1) return 3;
  if (ratio >= 0.66) return 2;
  if (ratio >= 0.33) return 1;
  return 0;
}

export function saveLevelProgress(
  data: GameStoreData,
  levelId: number,
  dimsumCollected: number,
  dimsumTotal: number,
  timeSeconds: number,
): GameStoreData {
  const stars = calculateStars(dimsumCollected, dimsumTotal);
  const existing = data.levels[levelId];

  // Only update if better
  const bestDimsum = existing ? Math.max(existing.dimsumCollected, dimsumCollected) : dimsumCollected;
  const bestStars = existing ? Math.max(existing.stars, stars) : stars;
  const bestTime = existing?.bestTime ? Math.min(existing.bestTime, timeSeconds) : timeSeconds;

  const newTotalDimsum = Object.values({ ...data.levels, [levelId]: { dimsumCollected: bestDimsum } })
    .reduce((sum, lp) => sum + (lp as { dimsumCollected: number }).dimsumCollected, 0);

  // Calculate tickets based on total dimsum
  const totalTicketsEarned = Math.floor(newTotalDimsum / DIMSUM_PER_TICKET);
  const newTickets = totalTicketsEarned - data.ticketsUsed;

  const updated: GameStoreData = {
    ...data,
    levels: {
      ...data.levels,
      [levelId]: {
        levelId,
        dimsumCollected: bestDimsum,
        dimsumTotal,
        stars: bestStars,
        completed: true,
        bestTime,
      },
    },
    totalDimsum: newTotalDimsum,
    tickets: Math.max(0, newTickets),
  };

  saveGameData(updated);
  return updated;
}

// ─── Ticket System ───────────────────────────────────────────────────────────

export function useTicket(data: GameStoreData): GameStoreData | null {
  if (data.tickets <= 0) return null;
  const updated = {
    ...data,
    tickets: data.tickets - 1,
    ticketsUsed: data.ticketsUsed + 1,
  };
  saveGameData(updated);
  return updated;
}

export function getTicketProgress(data: GameStoreData): { current: number; needed: number } {
  const totalEarned = Math.floor(data.totalDimsum / DIMSUM_PER_TICKET) * DIMSUM_PER_TICKET;
  const current = data.totalDimsum - totalEarned;
  return { current: current % DIMSUM_PER_TICKET, needed: DIMSUM_PER_TICKET };
}

// ─── Mystery Box / Code Redemption ───────────────────────────────────────────

/** Check if a code is a birthday code (BDAY/HBD/ULTAH prefix) */
export function isBirthdayCode(code: string): boolean {
  const upper = code.toUpperCase().trim();
  return upper.startsWith('BDAY') || upper.startsWith('HBD') || upper.startsWith('ULTAH');
}

export function redeemCode(data: GameStoreData, code: string): { data: GameStoreData; reward: MysteryBoxReward; extraRewards?: MysteryBoxReward[] } | null {
  // Check if code already redeemed
  if (data.redeemedCodes.includes(code.toUpperCase())) return null;

  const isBday = isBirthdayCode(code);

  // Birthday codes do NOT require a ticket; other codes do
  if (!isBday && data.tickets <= 0) return null;

  // Generate reward based on code
  const reward = generateMysteryReward(code);
  const extraRewards: MysteryBoxReward[] = [];

  // Birthday codes also grant 3 spin tickets
  if (isBday) {
    const spinReward: MysteryBoxReward = {
      id: `bday_spin_${Date.now()}`,
      type: 'spin_ticket',
      name: '🎰 Birthday Lucky Spin x3',
      description: 'Birthday bonus! 3 free spins on the Lucky Wheel!',
      icon: '🎰',
      spins: 3,
      claimed: true,
      claimedAt: Date.now(),
    };
    extraRewards.push(spinReward);
  }

  const updated: GameStoreData = {
    ...data,
    tickets: isBday ? data.tickets : data.tickets - 1,
    ticketsUsed: isBday ? data.ticketsUsed : data.ticketsUsed + 1,
    redeemedCodes: [...data.redeemedCodes, code.toUpperCase()],
    mysteryBoxRewards: [...data.mysteryBoxRewards, reward, ...extraRewards],
  };

  // Add inventory item if applicable
  if (reward.type === 'inventory_item' || reward.type === 'cosmetic') {
    const existingItem = updated.inventory.find(i => i.id === reward.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updated.inventory.push({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        icon: reward.icon,
        quantity: 1,
        type: reward.type === 'cosmetic' ? 'cosmetic' : 'consumable',
      });
    }
  }

  if (reward.type === 'dimsum_bonus') {
    updated.totalDimsum += 10;
  }

  saveGameData(updated);
  return { data: updated, reward, extraRewards: extraRewards.length > 0 ? extraRewards : undefined };
}

function generateMysteryReward(code: string): MysteryBoxReward {
  const upperCode = code.toUpperCase();

  // ── Special Code: BAYUGANTENG → 3x Lucky Spin ──
  if (upperCode === 'BAYUGANTENG') {
    return {
      id: `bayu_spin_${Date.now()}`,
      type: 'spin_ticket',
      name: '🎰 Lucky Spin x3',
      description: 'You won 3 spins on the Lucky Wheel!',
      icon: '🎰',
      spins: 3,
      claimed: true,
      claimedAt: Date.now(),
    };
  }

  // Special birthday codes (generic)
  if (upperCode.startsWith('BDAY') || upperCode.startsWith('HBD') || upperCode.startsWith('ULTAH')) {
    return {
      id: `bday_${Date.now()}`,
      type: 'birthday_card',
      name: '🎂 Birthday Card',
      description: 'A special birthday greeting card!',
      icon: '🎂',
      message: 'Selamat Ulang Tahun! 🎉🎂\n\nSemoga di hari yang spesial ini, semua harapan dan impianmu terwujud. Kamu adalah orang yang luar biasa dan dunia beruntung memilikimu.\n\nTerus bersinar dan jangan pernah berhenti bermimpi! ✨\n\nWith love and warm wishes! 💝',
      claimed: true,
      claimedAt: Date.now(),
    };
  }

  // Random rewards for other codes
  const rewards: MysteryBoxReward[] = [
    {
      id: `bonus_dimsum_${Date.now()}`,
      type: 'dimsum_bonus',
      name: '🥟 Dimsum Bonus Pack',
      description: '+10 Bonus Dimsum added to your collection!',
      icon: '🥟',
      value: 10,
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `golden_chopstick_${Date.now()}`,
      type: 'inventory_item',
      name: '🥢 Golden Chopstick',
      description: 'A rare golden chopstick. Boosts dimsum collection!',
      icon: '🥢',
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `lucky_cat_${Date.now()}`,
      type: 'cosmetic',
      name: '🐱 Lucky Cat Charm',
      description: 'A maneki-neko charm that brings good fortune!',
      icon: '🐱',
      claimed: true,
      claimedAt: Date.now(),
    },
    {
      id: `dragon_hat_${Date.now()}`,
      type: 'cosmetic',
      name: '🐉 Dragon Hat',
      description: 'A legendary dragon hat for your character!',
      icon: '🐉',
      claimed: true,
      claimedAt: Date.now(),
    },
  ];

  return rewards[Math.floor(Math.random() * rewards.length)];
}

// ─── Birthday Greeting Reward ────────────────────────────────────────────────

export function addBirthdayReward(
  data: GameStoreData,
  playerName: string,
  wishes: string[],
): GameStoreData {
  // Don't add duplicate birthday greetings
  const alreadyHas = data.mysteryBoxRewards.some(
    (r) => r.type === 'birthday_card' && r.id.startsWith('bday_greeting_'),
  );
  if (alreadyHas) return data;

  const wishText = wishes.length > 0
    ? wishes.map((w) => `✨ ${w}`).join('\n')
    : '';

  const message = [
    `Selamat Ulang Tahun, ${playerName}! 🎉🎂`,
    '',
    'Terima kasih sudah bermain Dimsum Dash!',
    'Semoga di hari spesialmu ini semua harapan dan impianmu terwujud.',
    '',
    wishText ? '── Wishes ──' : '',
    wishText,
    '',
    'Kamu adalah orang yang luar biasa! ✨',
    '',
    'With love and warm wishes! 💝',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const reward: MysteryBoxReward = {
    id: `bday_greeting_${Date.now()}`,
    type: 'birthday_card',
    name: `🎂 Birthday Card for ${playerName}`,
    description: 'A special birthday greeting saved from your adventure!',
    icon: '🎂',
    message,
    claimed: true,
    claimedAt: Date.now(),
  };

  const updated = {
    ...data,
    mysteryBoxRewards: [...data.mysteryBoxRewards, reward],
  };
  saveGameData(updated);
  return updated;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function addToLeaderboard(data: GameStoreData, entry: Omit<LeaderboardEntry, 'timestamp'>): GameStoreData {
  const newEntry: LeaderboardEntry = { ...entry, timestamp: Date.now() };
  const leaderboard = [...data.leaderboard, newEntry]
    .sort((a, b) => b.totalDimsum - a.totalDimsum)
    .slice(0, 50); // Keep top 50

  const updated = { ...data, leaderboard };
  saveGameData(updated);
  return updated;
}

export function getLeaderboard(data: GameStoreData): LeaderboardEntry[] {
  return [...data.leaderboard].sort((a, b) => b.totalDimsum - a.totalDimsum);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function updateSettings(data: GameStoreData, settings: Partial<GameStoreData['settings']>): GameStoreData {
  const updated = {
    ...data,
    settings: { ...data.settings, ...settings },
  };
  saveGameData(updated);
  return updated;
}

// ─── Redeem Inventory Item ───────────────────────────────────────────────────

export function redeemInventoryItem(data: GameStoreData, itemId: string): GameStoreData | null {
  const item = data.inventory.find(i => i.id === itemId);
  if (!item || item.redeemed) return null;

  const updatedInventory = data.inventory.map(i =>
    i.id === itemId ? { ...i, redeemed: true, redeemedAt: Date.now() } : i,
  );

  const updated = { ...data, inventory: updatedInventory };
  saveGameData(updated);
  return updated;
}

// ─── Reset ───────────────────────────────────────────────────────────────────

export function resetAllProgress(): GameStoreData {
  const data = getDefaultData();
  saveGameData(data);
  return data;
}

// ─── Computed helpers ────────────────────────────────────────────────────────

export function getTotalStars(data: GameStoreData): number {
  return Object.values(data.levels).reduce((sum, lp) => sum + lp.stars, 0);
}

export function getCompletedLevels(data: GameStoreData): number {
  return Object.values(data.levels).filter(lp => lp.completed).length;
}

export function isLevelUnlocked(data: GameStoreData, levelId: number): boolean {
  if (levelId === 1) return true;
  // Previous level must be completed
  return data.levels[levelId - 1]?.completed ?? false;
}

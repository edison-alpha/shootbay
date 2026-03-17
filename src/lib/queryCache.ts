/**
 * Lightweight in-memory TTL query cache.
 *
 * Prevents duplicate Supabase fetches when navigating between screens.
 * No external dependencies — just a Map with expiry timestamps.
 *
 * Usage:
 *   const data = await cached('leaderboard', () => fetchLeaderboard(50), 30_000);
 *
 * Cache is automatically cleared on logout via `clearAllCache()`.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  /** In-flight promise so concurrent calls share one request */
  pending?: Promise<T>;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Default TTL: 30 seconds (good balance for game data) */
const DEFAULT_TTL_MS = 30_000;

/**
 * Fetch with cache. Returns cached data if still valid, otherwise calls `fetcher`.
 * Concurrent calls to the same key share a single in-flight request.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const existing = store.get(key) as CacheEntry<T> | undefined;

  // Return from cache if fresh
  if (existing && existing.expiresAt > Date.now() && !existing.pending) {
    return existing.data;
  }

  // If a request is already in-flight for this key, piggy-back on it
  if (existing?.pending) {
    return existing.pending;
  }

  // Create new fetch
  const pending = fetcher();
  const entry: CacheEntry<T> = {
    data: existing?.data as T, // stale data as placeholder
    expiresAt: 0,
    pending,
  };
  store.set(key, entry as CacheEntry<unknown>);

  try {
    const result = await pending;
    entry.data = result;
    entry.expiresAt = Date.now() + ttlMs;
    entry.pending = undefined;
    return result;
  } catch (err) {
    // On error, remove the pending flag but keep stale data
    entry.pending = undefined;
    // If we have stale data, return it; otherwise re-throw
    if (existing?.data !== undefined) {
      return existing.data;
    }
    throw err;
  }
}

/** Invalidate a specific cache key (e.g. after a mutation) */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Invalidate all keys matching a prefix (e.g. 'user:abc123:' clears all user data) */
export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/** Clear the entire cache (call on logout) */
export function clearAllCache(): void {
  store.clear();
}

/** Pre-populate cache with known data (e.g. after a Supabase write returns fresh data) */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs } as CacheEntry<unknown>);
}

/** Check if a key is cached and still fresh */
export function isCached(key: string): boolean {
  const entry = store.get(key);
  return !!entry && entry.expiresAt > Date.now();
}

// ── Cache key builders ────────────────────────────────────────────────────

export const CK = {
  leaderboard: () => 'leaderboard:top50',
  userInventory: (uid: string) => `user:${uid}:inventory`,
  userMysteryBoxes: (uid: string) => `user:${uid}:mysteryBoxes`,
  userVouchers: (uid: string) => `user:${uid}:vouchers`,
  spinPrizes: () => 'spinPrizes:active',
  userGameData: (uid: string) => `user:${uid}:gameData`,
  // Admin
  adminPrizes: () => 'admin:prizes',
  adminCards: () => 'admin:cards',
  adminBoxes: () => 'admin:boxes',
  adminPlayers: () => 'admin:players',
  adminSpinPrizes: () => 'admin:spinPrizes',
  adminStats: () => 'admin:stats',
} as const;

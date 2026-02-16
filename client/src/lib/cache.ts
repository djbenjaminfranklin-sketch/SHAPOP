/**
 * Simple localStorage cache with TTL.
 * Allows the app to display data instantly on launch,
 * then refresh in the background.
 */

const PREFIX = 'shapop_cache_'

interface CacheEntry<T> {
  data: T
  ts: number
}

/** Save data to cache */
export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() }
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — ignore
  }
}

/** Get cached data. Returns null if missing or older than maxAge (ms). */
export function cacheGet<T>(key: string, maxAge = 24 * 60 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.ts > maxAge) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

/** Remove a cache entry */
export function cacheClear(key: string): void {
  localStorage.removeItem(PREFIX + key)
}

/** Clear all cache entries */
export function cacheClearAll(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k))
}

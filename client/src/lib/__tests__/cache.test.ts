import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { cacheSet, cacheGet, cacheClear, cacheClearAll } from '../cache'

describe('cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('cacheSet() and cacheGet()', () => {
    it('stores and retrieves a string value', () => {
      cacheSet('testKey', 'hello')
      expect(cacheGet<string>('testKey')).toBe('hello')
    })

    it('stores and retrieves an object value', () => {
      const data = { name: 'Test', items: [1, 2, 3] }
      cacheSet('obj', data)
      expect(cacheGet<typeof data>('obj')).toEqual(data)
    })

    it('stores and retrieves an array value', () => {
      const arr = ['a', 'b', 'c']
      cacheSet('arr', arr)
      expect(cacheGet<string[]>('arr')).toEqual(arr)
    })

    it('stores and retrieves a numeric value', () => {
      cacheSet('num', 42)
      expect(cacheGet<number>('num')).toBe(42)
    })

    it('stores and retrieves a boolean value', () => {
      cacheSet('bool', true)
      expect(cacheGet<boolean>('bool')).toBe(true)
    })

    it('overwrites existing cache entry', () => {
      cacheSet('key', 'first')
      cacheSet('key', 'second')
      expect(cacheGet<string>('key')).toBe('second')
    })
  })

  describe('cacheGet() with TTL', () => {
    it('returns null for missing key', () => {
      expect(cacheGet('nonexistent')).toBeNull()
    })

    it('returns data when within default TTL (24 hours)', () => {
      cacheSet('fresh', 'data')
      expect(cacheGet<string>('fresh')).toBe('data')
    })

    it('returns null when data is older than maxAge', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      cacheSet('expiring', 'data')

      // Advance time by 2 hours
      vi.setSystemTime(now + 2 * 60 * 60 * 1000)

      // Request with 1-hour maxAge => should be expired
      expect(cacheGet<string>('expiring', 1 * 60 * 60 * 1000)).toBeNull()
    })

    it('returns data when within custom maxAge', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      cacheSet('short', 'data')

      // Advance 30 minutes
      vi.setSystemTime(now + 30 * 60 * 1000)

      // Request with 1-hour maxAge => should still be valid
      expect(cacheGet<string>('short', 1 * 60 * 60 * 1000)).toBe('data')
    })

    it('removes expired entry from localStorage', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      cacheSet('cleanup', 'data')

      // Advance past default TTL (24h + 1ms)
      vi.setSystemTime(now + 24 * 60 * 60 * 1000 + 1)

      cacheGet('cleanup')

      // The entry should have been removed
      expect(localStorage.getItem('shapop_cache_cleanup')).toBeNull()
    })
  })

  describe('cacheClear()', () => {
    it('removes a specific cache entry', () => {
      cacheSet('a', 1)
      cacheSet('b', 2)
      cacheClear('a')
      expect(cacheGet<number>('a')).toBeNull()
      expect(cacheGet<number>('b')).toBe(2)
    })
  })

  describe('cacheClearAll()', () => {
    it('removes all cache entries with the shapop_cache_ prefix', () => {
      cacheSet('x', 1)
      cacheSet('y', 2)
      cacheSet('z', 3)

      // Also set a non-cache localStorage item
      localStorage.setItem('other_key', 'keep')

      cacheClearAll()

      expect(cacheGet<number>('x')).toBeNull()
      expect(cacheGet<number>('y')).toBeNull()
      expect(cacheGet<number>('z')).toBeNull()
      // Non-cache items should remain
      expect(localStorage.getItem('other_key')).toBe('keep')
    })
  })

  describe('error handling', () => {
    it('cacheGet returns null for corrupted JSON in localStorage', () => {
      localStorage.setItem('shapop_cache_corrupt', 'not-valid-json{{{')
      expect(cacheGet('corrupt')).toBeNull()
    })

    it('cacheSet silently handles storage errors', () => {
      // Simulate localStorage being full by mocking setItem to throw
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError')
      })
      // Should not throw
      expect(() => cacheSet('key', 'value')).not.toThrow()
    })
  })
})

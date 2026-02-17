import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  trackStreamView,
  getTopCategories,
  getBehaviorScore,
  getBehaviorData,
} from '../behaviorTracker'

describe('behaviorTracker', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('trackStreamView()', () => {
    it('increments totalViews on each call', () => {
      trackStreamView('fashion_w')
      trackStreamView('sneakers')
      trackStreamView(null)
      const data = getBehaviorData()
      expect(data.totalViews).toBe(3)
    })

    it('tracks category views correctly', () => {
      trackStreamView('fashion_w')
      trackStreamView('fashion_w')
      trackStreamView('sneakers')
      const data = getBehaviorData()
      expect(data.categoryViews['fashion_w'].count).toBe(2)
      expect(data.categoryViews['sneakers'].count).toBe(1)
    })

    it('sets lastViewed timestamp for categories', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      trackStreamView('bags')
      const data = getBehaviorData()
      expect(data.categoryViews['bags'].lastViewed).toBe(now)
    })

    it('tracks seller views correctly', () => {
      trackStreamView('fashion_w', 'SellerA')
      trackStreamView('sneakers', 'SellerA')
      trackStreamView('bags', 'SellerB')
      const data = getBehaviorData()
      expect(data.sellerViews['SellerA']).toBe(2)
      expect(data.sellerViews['SellerB']).toBe(1)
    })

    it('handles null category without crashing', () => {
      trackStreamView(null, 'SellerA')
      const data = getBehaviorData()
      expect(data.totalViews).toBe(1)
      expect(Object.keys(data.categoryViews)).toHaveLength(0)
      expect(data.sellerViews['SellerA']).toBe(1)
    })

    it('handles undefined seller without crashing', () => {
      trackStreamView('fashion_w')
      const data = getBehaviorData()
      expect(data.totalViews).toBe(1)
      expect(data.categoryViews['fashion_w'].count).toBe(1)
      expect(Object.keys(data.sellerViews)).toHaveLength(0)
    })
  })

  describe('getTopCategories()', () => {
    it('returns empty array when no data exists', () => {
      expect(getTopCategories()).toEqual([])
    })

    it('returns categories sorted by view count (descending)', () => {
      trackStreamView('sneakers')
      trackStreamView('bags')
      trackStreamView('bags')
      trackStreamView('bags')
      trackStreamView('fashion_w')
      trackStreamView('fashion_w')

      const top = getTopCategories()
      expect(top[0]).toBe('bags')
      expect(top[1]).toBe('fashion_w')
      expect(top[2]).toBe('sneakers')
    })

    it('respects the limit parameter', () => {
      trackStreamView('a')
      trackStreamView('b')
      trackStreamView('c')
      trackStreamView('d')
      trackStreamView('e')
      trackStreamView('f')

      expect(getTopCategories(3)).toHaveLength(3)
    })

    it('defaults to limit of 5', () => {
      for (let i = 0; i < 10; i++) {
        trackStreamView(`cat${i}`)
      }
      expect(getTopCategories()).toHaveLength(5)
    })
  })

  describe('getBehaviorScore()', () => {
    it('returns 0 when no data exists', () => {
      expect(getBehaviorScore('fashion_w')).toBe(0)
    })

    it('returns 0 for unknown category', () => {
      trackStreamView('sneakers')
      expect(getBehaviorScore('nonexistent')).toBe(0)
    })

    it('returns a positive score for a viewed category', () => {
      trackStreamView('fashion_w')
      trackStreamView('fashion_w')
      trackStreamView('fashion_w')
      const score = getBehaviorScore('fashion_w')
      expect(score).toBeGreaterThan(0)
    })

    it('gives higher score to more frequently viewed categories', () => {
      // View fashion_w 8 times, sneakers 2 times
      for (let i = 0; i < 8; i++) trackStreamView('fashion_w')
      for (let i = 0; i < 2; i++) trackStreamView('sneakers')

      const fashionScore = getBehaviorScore('fashion_w')
      const sneakersScore = getBehaviorScore('sneakers')
      expect(fashionScore).toBeGreaterThan(sneakersScore)
    })

    it('includes recency bonus for recently viewed categories', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      // Create 10 total views to have a base
      for (let i = 0; i < 10; i++) trackStreamView('fashion_w')

      const recentScore = getBehaviorScore('fashion_w')

      // Now advance time beyond the 1-hour recency window
      vi.setSystemTime(now + 2 * 3600000)

      const oldScore = getBehaviorScore('fashion_w')

      // Recent score should include the +5 recency bonus
      expect(recentScore).toBeGreaterThan(oldScore)
      expect(recentScore - oldScore).toBe(5)
    })

    it('adds seller affinity bonus', () => {
      trackStreamView('fashion_w', 'SellerA')
      trackStreamView('fashion_w', 'SellerA')

      const withSeller = getBehaviorScore('fashion_w', 'SellerA')
      const withoutSeller = getBehaviorScore('fashion_w')
      expect(withSeller).toBeGreaterThan(withoutSeller)
    })

    it('caps total score at 40', () => {
      // Create a heavily skewed distribution
      for (let i = 0; i < 100; i++) {
        trackStreamView('fashion_w', 'SellerA')
      }
      const score = getBehaviorScore('fashion_w', 'SellerA')
      expect(score).toBeLessThanOrEqual(40)
    })

    it('handles null category with seller', () => {
      trackStreamView(null, 'SellerA')
      trackStreamView(null, 'SellerA')
      const score = getBehaviorScore(null, 'SellerA')
      expect(score).toBeGreaterThan(0)
    })
  })

  describe('getBehaviorData()', () => {
    it('returns default data when nothing is tracked', () => {
      const data = getBehaviorData()
      expect(data).toEqual({
        categoryViews: {},
        sellerViews: {},
        totalViews: 0,
      })
    })

    it('returns correct structure after tracking', () => {
      trackStreamView('fashion_w', 'SellerA')
      const data = getBehaviorData()
      expect(data.totalViews).toBe(1)
      expect(data.categoryViews).toHaveProperty('fashion_w')
      expect(data.categoryViews['fashion_w']).toHaveProperty('count')
      expect(data.categoryViews['fashion_w']).toHaveProperty('lastViewed')
      expect(data.sellerViews).toHaveProperty('SellerA')
    })

    it('returns default data when localStorage has corrupt data', () => {
      localStorage.setItem('shapop_behavior', 'not-valid-json')
      const data = getBehaviorData()
      expect(data).toEqual({
        categoryViews: {},
        sellerViews: {},
        totalViews: 0,
      })
    })
  })
})

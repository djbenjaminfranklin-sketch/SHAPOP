import { describe, it, expect, beforeEach } from 'vitest'
import { computeMatchingScore, sortStreamsByMatch } from '../matchingAlgorithm'
import type { LocalPreferences } from '../../types/preferences'

// Helper to build a minimal stream object for testing
function makeStream(overrides: Partial<{
  id: string
  seller_id: string
  title: string
  category: string
  tags: string[]
  status: 'scheduled' | 'live' | 'ended'
  viewer_count: number
  engagement_score: number
  city: string | null
  created_at: string
  peak_viewers: number
  avg_watch_time_seconds: number
  total_reactions: number
  description: string | null
  thumbnail_url: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  community_id: string | null
  seller: { display_name: string; avatar_url: string | null; store_name?: string }
}> = {}) {
  return {
    id: 'stream-1',
    seller_id: 'seller-1',
    title: 'Test Stream',
    description: null,
    category: 'fashion_w',
    tags: [],
    status: 'live' as const,
    thumbnail_url: null,
    viewer_count: 0,
    peak_viewers: 0,
    engagement_score: 0,
    avg_watch_time_seconds: 0,
    total_reactions: 0,
    scheduled_at: null,
    started_at: null,
    ended_at: null,
    city: null,
    community_id: null,
    created_at: new Date().toISOString(),
    seller: { display_name: 'Test Seller', avatar_url: null },
    ...overrides,
  }
}

function makePrefs(overrides: Partial<LocalPreferences> = {}): LocalPreferences {
  return {
    favorite_categories: [],
    preferred_cities: [],
    price_range_min: 0,
    price_range_max: 10000,
    favorite_sellers: [],
    ...overrides,
  }
}

describe('matchingAlgorithm', () => {
  beforeEach(() => {
    // Clear localStorage to reset behavior tracker data
    localStorage.clear()
  })

  describe('computeMatchingScore()', () => {
    it('returns 0 for a stream with no matching criteria and no behavioral data', () => {
      const stream = makeStream()
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('adds 20 points when stream category matches a favorite category', () => {
      const stream = makeStream({ category: 'sneakers' })
      const prefs = makePrefs({ favorite_categories: ['sneakers', 'bags'] })
      const score = computeMatchingScore(stream, prefs)
      // With no behavioral data, only category match applies + possible engagement
      expect(score).toBeGreaterThanOrEqual(20)
    })

    it('does not add category bonus when favorite_categories is empty', () => {
      const stream = makeStream({ category: 'sneakers' })
      const prefs = makePrefs({ favorite_categories: [] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('does not add category bonus when stream category does not match', () => {
      const stream = makeStream({ category: 'sneakers' })
      const prefs = makePrefs({ favorite_categories: ['bags', 'jewelry'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('adds 15 points when stream city matches a preferred city', () => {
      const stream = makeStream({ city: 'Paris' })
      const prefs = makePrefs({ preferred_cities: ['Paris', 'Lyon'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('does not add city bonus when preferred_cities is empty', () => {
      const stream = makeStream({ city: 'Paris' })
      const prefs = makePrefs({ preferred_cities: [] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('does not add city bonus when stream city is null', () => {
      const stream = makeStream({ city: null })
      const prefs = makePrefs({ preferred_cities: ['Paris'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('adds 15 points when seller is in favorites (using store_name)', () => {
      const stream = makeStream({
        seller: { display_name: 'John Doe', avatar_url: null, store_name: 'JohnsShop' },
      })
      const prefs = makePrefs({ favorite_sellers: ['JohnsShop'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('adds 15 points when seller is in favorites (using display_name as fallback)', () => {
      const stream = makeStream({
        seller: { display_name: 'John Doe', avatar_url: null },
      })
      const prefs = makePrefs({ favorite_sellers: ['John Doe'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('does not add seller bonus when favorite_sellers is empty', () => {
      const stream = makeStream({
        seller: { display_name: 'John Doe', avatar_url: null, store_name: 'JohnsShop' },
      })
      const prefs = makePrefs({ favorite_sellers: [] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('does not add seller bonus when seller has no name', () => {
      const stream = makeStream()
      // stream.seller defaults to { display_name: 'Test Seller', avatar_url: null }
      const prefs = makePrefs({ favorite_sellers: ['SomeOtherSeller'] })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('adds engagement bonus based on viewer_count and engagement_score', () => {
      const stream = makeStream({ viewer_count: 100, engagement_score: 100 })
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      // viewerScore = Math.min(100/100, 1) * 6 = 6
      // engagementBonus = Math.min(100/100, 1) * 4 = 4
      // total engagement = min(6 + 4, 10) = 10
      expect(score).toBe(10)
    })

    it('caps engagement bonus at 10 points', () => {
      const stream = makeStream({ viewer_count: 500, engagement_score: 500 })
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      // viewerScore = Math.min(500/100, 1) * 6 = 1 * 6 = 6
      // engagementBonus = Math.min(500/100, 1) * 4 = 1 * 4 = 4
      // total engagement = min(10, 10) = 10
      expect(score).toBe(10)
    })

    it('gives partial engagement bonus for lower viewer counts', () => {
      const stream = makeStream({ viewer_count: 50, engagement_score: 0 })
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      // viewerScore = Math.min(50/100, 1) * 6 = 0.5 * 6 = 3
      // engagementBonus = 0
      // total engagement = min(round(3), 10) = 3
      expect(score).toBe(3)
    })

    it('handles zero viewer_count and zero engagement_score', () => {
      const stream = makeStream({ viewer_count: 0, engagement_score: 0 })
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBe(0)
    })

    it('combines all scoring components together', () => {
      const stream = makeStream({
        category: 'sneakers',
        city: 'Paris',
        viewer_count: 100,
        engagement_score: 100,
        seller: { display_name: 'TopSeller', avatar_url: null, store_name: 'TopShop' },
      })
      const prefs = makePrefs({
        favorite_categories: ['sneakers'],
        preferred_cities: ['Paris'],
        favorite_sellers: ['TopShop'],
      })
      const score = computeMatchingScore(stream, prefs)
      // Behavioral = 0 (no history)
      // Category = 20
      // City = 15
      // Seller = 15
      // Engagement = 10
      // Total = 60
      expect(score).toBe(60)
    })

    it('clamps score to maximum of 100', () => {
      // Even if all bonuses were somehow inflated, score should not exceed 100
      const stream = makeStream({
        category: 'sneakers',
        city: 'Paris',
        viewer_count: 10000,
        engagement_score: 10000,
        seller: { display_name: 'TopSeller', avatar_url: null, store_name: 'TopShop' },
      })
      const prefs = makePrefs({
        favorite_categories: ['sneakers'],
        preferred_cities: ['Paris'],
        favorite_sellers: ['TopShop'],
      })
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('clamps score to minimum of 0', () => {
      const stream = makeStream()
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeGreaterThanOrEqual(0)
    })

    it('returns integer values (rounded)', () => {
      const stream = makeStream({ viewer_count: 33, engagement_score: 17 })
      const prefs = makePrefs()
      const score = computeMatchingScore(stream, prefs)
      expect(Number.isInteger(score)).toBe(true)
    })

    it('handles stream with no seller object', () => {
      const stream = makeStream()
      // Remove the seller to simulate edge case
      delete (stream as any).seller
      const prefs = makePrefs({ favorite_sellers: ['SomeSeller'] })
      // Should not throw; seller name fallback results in empty string
      const score = computeMatchingScore(stream, prefs)
      expect(score).toBeGreaterThanOrEqual(0)
    })

    it('prefers store_name over display_name for seller matching', () => {
      const stream = makeStream({
        seller: { display_name: 'Jane Smith', avatar_url: null, store_name: 'JanesStore' },
      })
      // Should match on store_name, not display_name
      const prefsWithStoreName = makePrefs({ favorite_sellers: ['JanesStore'] })
      const prefsWithDisplayName = makePrefs({ favorite_sellers: ['Jane Smith'] })

      const scoreWithStore = computeMatchingScore(stream, prefsWithStoreName)
      const scoreWithDisplay = computeMatchingScore(stream, prefsWithDisplayName)

      // store_name match should work
      expect(scoreWithStore).toBeGreaterThanOrEqual(15)
      // display_name should NOT match when store_name exists and differs
      expect(scoreWithDisplay).toBe(0)
    })
  })

  describe('sortStreamsByMatch()', () => {
    it('returns empty array when given empty array', () => {
      const result = sortStreamsByMatch([], makePrefs())
      expect(result).toEqual([])
    })

    it('returns single stream with matching_score attached', () => {
      const stream = makeStream({ category: 'sneakers' })
      const prefs = makePrefs({ favorite_categories: ['sneakers'] })
      const result = sortStreamsByMatch([stream], prefs)
      expect(result).toHaveLength(1)
      expect(result[0].matching_score).toBeDefined()
      expect(typeof result[0].matching_score).toBe('number')
    })

    it('sorts streams in descending order by matching score', () => {
      const streamHigh = makeStream({
        id: 'high',
        category: 'sneakers',
        city: 'Paris',
        viewer_count: 100,
        engagement_score: 100,
      })
      const streamMedium = makeStream({
        id: 'medium',
        category: 'sneakers',
        viewer_count: 0,
        engagement_score: 0,
      })
      const streamLow = makeStream({
        id: 'low',
        category: 'bags',
        viewer_count: 0,
        engagement_score: 0,
      })

      const prefs = makePrefs({
        favorite_categories: ['sneakers'],
        preferred_cities: ['Paris'],
      })

      const result = sortStreamsByMatch([streamLow, streamHigh, streamMedium], prefs)

      expect(result[0].id).toBe('high')
      expect(result[1].id).toBe('medium')
      expect(result[2].id).toBe('low')
    })

    it('preserves all original stream properties', () => {
      const stream = makeStream({
        id: 'test-123',
        title: 'Special Stream',
        category: 'fashion_w',
        tags: ['test', 'live'],
      })
      const prefs = makePrefs()
      const result = sortStreamsByMatch([stream], prefs)
      expect(result[0].id).toBe('test-123')
      expect(result[0].title).toBe('Special Stream')
      expect(result[0].tags).toEqual(['test', 'live'])
    })

    it('handles multiple streams with the same score', () => {
      const stream1 = makeStream({ id: 'a', viewer_count: 0, engagement_score: 0 })
      const stream2 = makeStream({ id: 'b', viewer_count: 0, engagement_score: 0 })
      const prefs = makePrefs()
      const result = sortStreamsByMatch([stream1, stream2], prefs)
      expect(result).toHaveLength(2)
      // Both should have score 0
      expect(result[0].matching_score).toBe(0)
      expect(result[1].matching_score).toBe(0)
    })

    it('attaches correct matching_score values', () => {
      const stream = makeStream({
        category: 'sneakers',
        city: 'Paris',
        viewer_count: 100,
        engagement_score: 100,
      })
      const prefs = makePrefs({
        favorite_categories: ['sneakers'],
        preferred_cities: ['Paris'],
      })
      const result = sortStreamsByMatch([stream], prefs)
      // Expected: category(20) + city(15) + engagement(10) = 45
      expect(result[0].matching_score).toBe(45)
    })

    it('does not mutate the original array', () => {
      const streams = [
        makeStream({ id: 'c', viewer_count: 100, engagement_score: 100 }),
        makeStream({ id: 'a', viewer_count: 0, engagement_score: 0 }),
        makeStream({ id: 'b', viewer_count: 50, engagement_score: 50 }),
      ]
      const originalOrder = streams.map(s => s.id)
      const prefs = makePrefs()
      sortStreamsByMatch(streams, prefs)
      // Original array order should not have changed
      expect(streams.map(s => s.id)).toEqual(originalOrder)
    })
  })
})

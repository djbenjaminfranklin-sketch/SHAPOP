import { describe, it, expect, beforeEach, vi } from 'vitest'
import { track, getEvents } from '../analytics'

// We need to reset the module between tests to clear the eventQueue
// Since the queue is module-level, we use dynamic imports
describe('analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('track()', () => {
    it('adds an event to the queue', () => {
      const before = getEvents().length
      track('page_view', { page: 'home' })
      const after = getEvents()
      expect(after.length).toBe(before + 1)
      const last = after[after.length - 1]
      expect(last.name).toBe('page_view')
      expect(last.properties).toEqual({ page: 'home' })
      expect(last.timestamp).toBeGreaterThan(0)
    })

    it('adds an event without properties', () => {
      const before = getEvents().length
      track('login')
      const after = getEvents()
      expect(after.length).toBe(before + 1)
      const last = after[after.length - 1]
      expect(last.name).toBe('login')
      expect(last.properties).toBeUndefined()
    })

    it('stores timestamp as a number', () => {
      track('signup')
      const events = getEvents()
      const last = events[events.length - 1]
      expect(typeof last.timestamp).toBe('number')
      // Should be a recent timestamp (within 5 seconds)
      expect(Date.now() - last.timestamp).toBeLessThan(5000)
    })

    it('logs in development mode', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      track('search', { query: 'test' })
      // In test environment, import.meta.env.DEV is true
      expect(spy).toHaveBeenCalledWith('[analytics] search', { query: 'test' })
      spy.mockRestore()
    })
  })

  describe('getEvents()', () => {
    it('returns a copy of the events (not the original array)', () => {
      track('bid_placed', { stream_id: '123', amount: 50 })
      const events1 = getEvents()
      const events2 = getEvents()
      expect(events1).not.toBe(events2)
      expect(events1).toEqual(events2)
    })

    it('reflects all tracked events', () => {
      const initialLen = getEvents().length
      track('stream_join', { stream_id: 'abc' })
      track('stream_leave', { stream_id: 'abc' })
      const events = getEvents()
      expect(events.length).toBe(initialLen + 2)
    })
  })

  describe('queue bounds', () => {
    it('keeps queue bounded to MAX_QUEUE_SIZE (100)', () => {
      // Track more than 100 events
      for (let i = 0; i < 150; i++) {
        track('page_view', { page: `page_${i}` })
      }
      const events = getEvents()
      expect(events.length).toBeLessThanOrEqual(100)
    })
  })
})

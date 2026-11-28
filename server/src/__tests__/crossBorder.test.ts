import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
})
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import { fakeDb } from './helpers/fakeSupabase'
import { isCrossBorderBlocked, crossBorderGuard, BLOCKED_ERROR } from '../services/crossBorder'

describe('vendeur israélien pro -> acheteur de l\'UE : achat bloqué (28/11/2026)', () => {
  it('règle', () => {
    expect(isCrossBorderBlocked('FR', 'IL', 'business')).toBe(true)
    expect(isCrossBorderBlocked('de', 'il', 'business')).toBe(true)
    expect(isCrossBorderBlocked('FR', 'IL', 'individual')).toBe(false) // particulier israélien : libre
    expect(isCrossBorderBlocked('IL', 'IL', 'business')).toBe(false)   // acheteur israélien : libre
    expect(isCrossBorderBlocked('GB', 'IL', 'business')).toBe(false)   // hors UE : libre
    expect(isCrossBorderBlocked('FR', 'FR', 'business')).toBe(false)
    expect(isCrossBorderBlocked(null, 'IL', 'business')).toBe(false)
  })

  describe('garde sur les routes d\'achat', () => {
    beforeEach(() => {
      fakeDb.reset()
      fakeDb.table('items').push({ id: 'I', seller_id: 'S' })
      fakeDb.table('profiles').push({ id: 'S', country: 'IL' }, { id: 'B', country: 'FR' }, { id: 'C', country: 'IL' })
      fakeDb.table('sellers').push({ id: 'S', seller_type: 'business' })
    })
    const run = async (userId: string) => {
      const res = { code: 0, body: null as unknown, status(c: number) { this.code = c; return this }, json(b: unknown) { this.body = b; return this } }
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await crossBorderGuard({ params: { id: 'I' }, body: {}, user: { id: userId } } as any, res as any, next)
      return { res, next }
    }
    it('acheteur français : refusé avec le motif', async () => {
      const { res, next } = await run('B')
      expect(next).not.toHaveBeenCalled()
      expect(res.code).toBe(403)
      expect(res.body).toEqual({ error: BLOCKED_ERROR })
    })
    it('acheteur israélien : passe', async () => {
      const { next } = await run('C')
      expect(next).toHaveBeenCalled()
    })
  })
})

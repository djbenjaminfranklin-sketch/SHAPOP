import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.WISE_ENABLED = 'true'
  process.env.WISE_API_TOKEN = 'tok'
  process.env.WISE_PROFILE_ID = '123'
})
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import { fakeDb } from './helpers/fakeSupabase'
import { isWiseSeller } from '../payments/provider'

describe('vendeur israélien : PayPal prime sur Wise (Wise fermé le 27/11/2026)', () => {
  beforeEach(() => {
    fakeDb.reset()
    fakeDb.table('profiles').push({ id: 'S', country: 'IL' })
  })
  it('IBAN seul : payé par Wise (file gardée)', async () => {
    fakeDb.table('sellers').push({ id: 'S', payout_iban: 'IL070108030000006259465' })
    expect(await isWiseSeller('S')).toBe(true)
  })
  it('a choisi PayPal : payé par PayPal, même avec un IBAN', async () => {
    fakeDb.table('sellers').push({ id: 'S', payout_iban: 'IL070108030000006259465', bank_choice: 'paypal', paypal_email: 'v@x.il' })
    expect(await isWiseSeller('S')).toBe(false)
  })
})

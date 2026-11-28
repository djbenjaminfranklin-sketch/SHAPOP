import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.PAYPAL_MODE = 'live'
  delete process.env.PAYPAL_WEBHOOK_ID
})
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return { ...actual, supabase: fakeDb, resend: null }
})

import { fakeDb } from './helpers/fakeSupabase'
import { paypalWebhookHandler } from '../routes/webhooks'

function fakeRes() {
  const r: { code: number; body: unknown; status: (c: number) => typeof r; json: (b: unknown) => typeof r } = {
    code: 200, body: null,
    status(c) { r.code = c; return r },
    json(b) { r.body = b; return r },
  }
  return r
}

describe('webhook PayPal en mode réel sans identifiant (28/11/2026)', () => {
  beforeEach(() => {
    fakeDb.reset()
    fakeDb.table('paypal_payouts').push({ id: 'P', paypal_item_id: 'ITEM1', status: 'processing', attempts: 1 })
  })
  it('refuse un faux « versement échoué » non signé : pas de relance, donc pas de double paiement', async () => {
    const res = fakeRes()
    const req = { headers: {}, body: { id: 'EVT1', event_type: 'PAYMENT.PAYOUTS-ITEM.FAILED', resource: { payout_item_id: 'ITEM1' } } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await paypalWebhookHandler(req as any, res as any)
    expect(res.code).toBe(503)
    expect(fakeDb.table('paypal_payouts')[0].status).toBe('processing')
  })
})

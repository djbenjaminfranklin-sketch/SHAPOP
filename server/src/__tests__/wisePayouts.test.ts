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
const calls: string[] = []
vi.mock('../payments/wise', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../payments/wise')>()
  return {
    ...actual,
    createBatchGroup: async () => { calls.push('group'); return { id: 'bg1', version: 0 } },
    createIlsRecipient: async () => { calls.push('recipient'); return 'rcp1' },
    createQuote: async (amount: number) => { calls.push(`quote:${amount}`); return 'q1' },
    addBatchTransfer: async (_b: string, i: { orderId: string }) => { calls.push(`transfer:${i.orderId}`); return `t-${i.orderId}` },
    getBatchGroupVersion: async () => 1,
    completeBatchGroup: async () => { calls.push('complete') },
    getTransferStatus: async () => 'processing',
  }
})

import { fakeDb } from './helpers/fakeSupabase'
import { checkWisePayout, prepareWiseBatch, type WiseOrder, type WiseSeller } from '../services/wisePayouts'

const IBAN = 'IL620108000000099999999'
const DAY = 86400000
const order = (o: Partial<WiseOrder> = {}): WiseOrder => ({
  id: 'o1', seller_id: 'S', status: 'delivered', payout_status: 'released', payout_method: 'wise', wise_status: 'queued',
  wise_transfer_id: null, currency: 'ILS', total_amount: 85, platform_fee: 4.8, processing_fee: 2, seller_payout: 78.2, ...o,
})
const seller = (s: Partial<WiseSeller> = {}): WiseSeller => ({
  id: 'S', payout_iban: IBAN, payout_holder_name: 'Dana Levi', payout_iban_updated_at: new Date(Date.now() - 2 * DAY).toISOString(),
  wise_recipient_id: null, sanction_level: 0, sanction_until: null, ...s,
})
const ctx = { openDispute: false, sellerBanned: false }

describe('Contrôle avant chaque virement Wise', () => {
  it('vente conforme : ok', () => {
    expect(checkWisePayout(order(), seller(), ctx)).toEqual({ verdict: 'ok' })
  })
  it('vente pas acceptée, litige, vendeur banni ou sanctionné : retirée', () => {
    expect(checkWisePayout(order({ payout_status: 'held' }), seller(), ctx).verdict).toBe('exclude')
    expect(checkWisePayout(order({ status: 'disputed' }), seller(), ctx).verdict).toBe('exclude')
    expect(checkWisePayout(order(), seller(), { ...ctx, openDispute: true }).verdict).toBe('exclude')
    expect(checkWisePayout(order(), seller(), { ...ctx, sellerBanned: true }).verdict).toBe('exclude')
    expect(checkWisePayout(order(), seller({ sanction_level: 2, sanction_until: new Date(Date.now() + DAY).toISOString() }), ctx).verdict).toBe('exclude')
  })
  it('montant faux (commission mal déduite) : retirée', () => {
    const c = checkWisePayout(order({ seller_payout: 85 }), seller(), ctx)
    expect(c.verdict).toBe('exclude')
    expect(c.verdict !== 'ok' && c.reason).toContain('Montant')
  })
  it('déjà payé : retirée (pas de double paiement)', () => {
    expect(checkWisePayout(order({ wise_transfer_id: 't1' }), seller(), ctx).verdict).toBe('exclude')
    expect(checkWisePayout(order({ wise_status: 'in_batch' }), seller(), ctx).verdict).toBe('exclude')
  })
  it('IBAN modifié il y a moins de 24 h, invalide ou manquant : reporté au lendemain', () => {
    expect(checkWisePayout(order(), seller({ payout_iban_updated_at: new Date(Date.now() - 3600000).toISOString() }), ctx)).toEqual({ verdict: 'wait', reason: 'IBAN modifié il y a moins de 24 h' })
    expect(checkWisePayout(order(), seller({ payout_iban: 'IL620108000000099999998' }), ctx).verdict).toBe('wait')
    expect(checkWisePayout(order(), null, ctx).verdict).toBe('wait')
  })
})

describe('Lot quotidien Wise', () => {
  beforeEach(() => {
    fakeDb.reset()
    calls.length = 0
    fakeDb.table('profiles').push({ id: 'S', is_banned: false }, { id: 'S2', is_banned: false })
    fakeDb.table('sellers').push(seller(), seller({ id: 'S2', payout_iban_updated_at: new Date().toISOString() }))
    fakeDb.table('orders').push(
      { ...order({ id: 'o1' }) },
      { ...order({ id: 'o2', seller_payout: 85 }) },
      { ...order({ id: 'o3', seller_id: 'S2' }) },
    )
  })

  it('prépare le lot avec les ventes conformes, retire et reporte les autres, une seule fois par jour', async () => {
    const r = await prepareWiseBatch()
    expect(r!.count).toBe(1)
    expect(r!.total).toBe(78.2)
    expect(r!.excluded.map(e => e.reason)[0]).toContain('Montant faux')
    expect(r!.waiting.map(e => e.reason)).toEqual(['IBAN modifié il y a moins de 24 h'])
    expect(calls).toEqual(['group', 'recipient', 'quote:78.2', 'transfer:o1', 'complete'])
    const rows = Object.fromEntries(fakeDb.table('orders').map(o => [o.id, o.wise_status]))
    expect(rows).toEqual({ o1: 'in_batch', o2: 'excluded', o3: 'queued' })
    expect(fakeDb.table('sellers').find(s => s.id === 'S')!.wise_recipient_id).toBe('rcp1')
    // Relancé le même jour : rien (pas de double lot)
    expect(await prepareWiseBatch()).toBeNull()
    expect(calls.filter(c => c === 'group')).toHaveLength(1)
  })

  it('en pause (Wise fermé) : aucun lot et les ventes restent en file', async () => {
    process.env.WISE_PAYOUTS_PAUSED = 'true'
    try {
      expect(await prepareWiseBatch()).toBeNull()
      expect(calls).toEqual([])
      expect(fakeDb.table('orders').every(o => o.wise_status === 'queued')).toBe(true)
    } finally { delete process.env.WISE_PAYOUTS_PAUSED }
  })
})

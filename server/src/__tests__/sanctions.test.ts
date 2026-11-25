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
const notified: { user: string; key: unknown }[] = []
vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>()
  return { ...actual, notifyUserT: async (user: string, _type: string, key: unknown) => { notified.push({ user, key }) } }
})

import { fakeDb } from './helpers/fakeSupabase'
import { applyBuyerSanction, applySellerSanction, buyerBlocked, sellerRestricted } from '../services/sanctions'
import { sendOrderReminders } from '../services/reminders'

const lostDispute = (n: number, who: 'seller' | 'buyer') => {
  for (let i = 0; i < n; i++) fakeDb.table('disputes').push({ id: `d${who}${i}`, seller_id: 'S', buyer_id: 'B', status: who === 'seller' ? 'resolved_buyer' : 'resolved_seller' })
}

beforeEach(() => {
  fakeDb.reset()
  notified.length = 0
  fakeDb.table('sellers').push({ id: 'S', sanction_level: 0, sanction_until: null })
  fakeDb.table('profiles').push({ id: 'S', is_banned: false }, { id: 'B', is_banned: false })
})

describe('Sanctions vendeur', () => {
  it('1er litige perdu : avertissement seulement', async () => {
    lostDispute(1, 'seller')
    expect(await applySellerSanction('S')).toBe(1)
    expect(await sellerRestricted('S')).toBe(false)
    expect(notified.map(n => n.key)).toEqual(['sellerWarning'])
  })
  it('2e : paiement seulement à la réception pendant 30 jours', async () => {
    lostDispute(2, 'seller')
    expect(await applySellerSanction('S')).toBe(2)
    expect(await sellerRestricted('S')).toBe(true)
    const until = Date.parse(fakeDb.table('sellers')[0].sanction_until as string) - Date.now()
    expect(until).toBeGreaterThan(29 * 86400000)
  })
  it('3e : compte banni', async () => {
    lostDispute(3, 'seller')
    expect(await applySellerSanction('S')).toBe(3)
    expect(fakeDb.table('profiles').find(p => p.id === 'S')!.is_banned).toBe(true)
  })
})

describe('Acheteur de mauvaise foi', () => {
  it('1 litige perdu : pas bloqué ; 2 : bloqué', async () => {
    lostDispute(1, 'buyer')
    expect(await applyBuyerSanction('B')).toBe(false)
    expect(await buyerBlocked('B')).toBe(false)
    lostDispute(1, 'buyer')
    fakeDb.table('disputes')[1].id = 'dbuyer-2'
    expect(await applyBuyerSanction('B')).toBe(true)
    expect(await buyerBlocked('B')).toBe(true)
  })
})

describe('Rappels', () => {
  it('acheteur : rappel à J+3, envoyé une seule fois ; plus que 4 h ; vendeur : litige sans réponse', async () => {
    fakeDb.table('orders').push(
      { id: 'o1', buyer_id: 'B', seller_id: 'S', status: 'shipped', fulfillment_method: 'post', payout_status: 'held', buyer_confirmed_at: null, shipped_at: new Date(Date.now() - 3.2 * 86400000).toISOString(), reminders: {} },
      { id: 'o2', buyer_id: 'B', seller_id: 'S', status: 'delivered', fulfillment_method: 'post', payout_status: 'held', claim_deadline: new Date(Date.now() + 3 * 3600000).toISOString(), reminders: {} },
      { id: 'o3', buyer_id: 'B', seller_id: 'S', status: 'disputed', fulfillment_method: 'post', payout_status: 'held', reminders: {} },
    )
    fakeDb.table('disputes').push({ id: 'x', order_id: 'o3', seller_id: 'S', buyer_id: 'B', status: 'under_review', created_at: new Date(Date.now() - 25 * 3600000).toISOString(), seller_photo_urls: [] })
    expect(await sendOrderReminders()).toBe(3)
    expect(notified.map(n => n.key).sort()).toEqual(['claimEndingSoon', 'disputeRespond', 'receiptReminder'])
    expect(await sendOrderReminders()).toBe(0)
  })
})

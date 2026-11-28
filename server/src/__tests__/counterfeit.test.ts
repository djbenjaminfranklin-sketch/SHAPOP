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
const refund = vi.hoisted(() => vi.fn(async () => true))
const ban = vi.hoisted(() => vi.fn(async () => {}))
const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../payments/refunds', () => ({ refundOrderPayment: refund }))
vi.mock('../services/accountBan', () => ({ banAccount: ban }))
vi.mock('../utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('../utils')>()), notifyUserT: notify, logAdminAction: vi.fn(async () => {}) }))
vi.mock('../services/orderLifecycle', async (importOriginal) => ({ ...(await importOriginal<typeof import('../services/orderLifecycle')>()), alertAdmins: vi.fn(async () => {}) }))

import { fakeDb } from './helpers/fakeSupabase'
import { openCounterfeitCase, sellerAnswersCounterfeit, processCounterfeitDeadlines, COUNTERFEIT_REPLY_DAYS } from '../services/counterfeit'

const DAY = 86400000
function seed() {
  fakeDb.reset()
  fakeDb.table('orders').push({ id: 'O1234567', item_id: 'I', seller_id: 'S', buyer_id: 'B', amount: 1000, currency: 'ILS', status: 'disputed', payout_status: 'held', seller_payout: 890 })
  fakeDb.table('items').push({ id: 'I', seller_id: 'S', status: 'sold', moderation_status: null })
  fakeDb.table('disputes').push({ id: 'D', order_id: 'O1234567', buyer_id: 'B', seller_id: 'S', reason: 'counterfeit', status: 'under_review' })
  fakeDb.table('sellers').push({ id: 'S', penalty_due: 0 })
}
const dispute = () => fakeDb.table('disputes')[0]
const order = () => fakeDb.table('orders')[0]

describe('contrefaçon de luxe : traitement automatique (28/11/2026)', () => {
  beforeEach(() => { seed(); refund.mockClear(); ban.mockClear(); notify.mockClear() })

  it('signalement : annonce retirée, versement bloqué, vendeur prévenu avec un délai de 7 jours, aucune pénalité', async () => {
    await openCounterfeitCase('D')
    expect(fakeDb.table('items')[0].moderation_status).toBe('removed')
    expect(order().payout_status).toBe('held')
    expect(Date.parse(dispute().counterfeit_reply_deadline) - Date.now()).toBeGreaterThan((COUNTERFEIT_REPLY_DAYS - 0.1) * DAY)
    expect(notify).toHaveBeenCalledWith('S', 'counterfeit_reported', 'counterfeitReported', expect.anything(), expect.anything())
    expect(fakeDb.table('sellers')[0].penalty_due).toBe(0)
    expect(ban).not.toHaveBeenCalled()
  })

  it('le vendeur reconnaît : acheteur remboursé, pénalité 50 %, compte fermé', async () => {
    await openCounterfeitCase('D')
    expect(await sellerAnswersCounterfeit('D', 'S', { accept: true, message: '', proof_urls: [] })).toBe('confirmed')
    expect(refund).toHaveBeenCalled()
    expect(fakeDb.table('sellers')[0].penalty_due).toBe(500)
    expect(order()).toMatchObject({ status: 'refunded', payout_status: 'cancelled' })
    expect(ban).toHaveBeenCalledWith('S', null, expect.any(String))
  })

  it('le vendeur conteste : examen par une personne, AUCUNE pénalité automatique', async () => {
    await openCounterfeitCase('D')
    expect(await sellerAnswersCounterfeit('D', 'S', { accept: false, message: 'Voici ma facture et le certificat.', proof_urls: [] })).toBe('contested')
    expect(dispute().status).toBe('escalated')
    expect(fakeDb.table('sellers')[0].penalty_due).toBe(0)
    expect(ban).not.toHaveBeenCalled()
    // et la tâche planifiée ne tranche jamais un dossier contesté
    expect(await processCounterfeitDeadlines(Date.now() + 30 * DAY)).toEqual({ reminded: 0, confirmed: 0 })
  })

  it('pas de réponse : rappel 2 jours avant, puis contrefaçon retenue à la fin du délai', async () => {
    await openCounterfeitCase('D')
    expect(await processCounterfeitDeadlines(Date.now() + 5.5 * DAY)).toEqual({ reminded: 1, confirmed: 0 })
    expect(fakeDb.table('sellers')[0].penalty_due).toBe(0)
    expect(await processCounterfeitDeadlines(Date.now() + 7.1 * DAY)).toEqual({ reminded: 0, confirmed: 1 })
    expect(fakeDb.table('sellers')[0].penalty_due).toBe(500)
    expect(ban).toHaveBeenCalled()
  })

  it('un autre utilisateur ne peut pas répondre à la place du vendeur', async () => {
    await openCounterfeitCase('D')
    expect(await sellerAnswersCounterfeit('D', 'B', { accept: true, message: '', proof_urls: [] })).toBe('forbidden')
  })
})

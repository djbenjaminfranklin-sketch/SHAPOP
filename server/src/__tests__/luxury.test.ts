// Règle « articles de luxe » contre les contrefaçons (26/11/2026)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.ADMIN_EMAILS = 'admin@test.dev'
})

const refunds: string[] = []
vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>()
  const { fakeDb } = await import('./helpers/fakeSupabase')
  return {
    ...actual,
    supabase: fakeDb,
    resend: null,
    stripe: {
      paymentMethods: { list: async () => ({ data: [{ id: 'pm_test' }] }) },
      paymentIntents: { retrieve: async () => ({ status: 'requires_payment_method' }), cancel: async () => ({}) },
      refunds: { create: async (p: { payment_intent: string }) => { refunds.push(p.payment_intent); return {} } },
    },
  }
})

import express from 'express'
import { fakeDb } from './helpers/fakeSupabase'
import fulfillmentRoutes from '../routes/fulfillment'
import itemRoutes from '../routes/items'
import disputeRoutes from '../routes/disputes'
import adminRoutes from '../routes/admin'
import { markOrderPaid, releaseDuePostPayouts } from '../services/orderLifecycle'
import {
  LUXURY_BRANDS, counterfeitDeadline, detectLuxuryBrand, isLuxuryItem, luxuryThreshold, penaltyDeduction,
} from '../luxury'

const BUYER = 'buyer-1'
const SELLER = 'seller-1'
const ADMIN = 'admin-1'
const ORDER = '11111111-1111-4111-8111-111111111111'
const ORDER2 = '44444444-4444-4444-8444-444444444444'
const ITEM = '22222222-2222-4222-8222-222222222222'
const DAY = 86400000

let server: Server
let base = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(fulfillmentRoutes)
  app.use(itemRoutes)
  app.use(disputeRoutes)
  app.use(adminRoutes)
  server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => { server?.close() })

function seed(order: Record<string, unknown> | null, item: Record<string, unknown> = {}) {
  fakeDb.reset()
  refunds.length = 0
  fakeDb.users[BUYER] = { id: BUYER, email: 'buyer@test.dev' }
  fakeDb.users[SELLER] = { id: SELLER, email: 'seller@test.dev' }
  fakeDb.users[ADMIN] = { id: ADMIN, email: 'admin@test.dev' }
  fakeDb.table('profiles').push(
    { id: BUYER, display_name: 'Acheteur', country: 'FR', is_banned: false },
    { id: SELLER, display_name: 'Vendeur', country: 'FR', is_banned: false },
    { id: ADMIN, display_name: 'Admin', country: 'FR', is_banned: false },
  )
  fakeDb.table('sellers').push({ id: SELLER, allow_pickup: true, pickup_area: 'Paris', post_price: null, shipping_delay_days: 4, penalty_due: 0 })
  fakeDb.table('items').push({ id: ITEM, title: 'Veste vintage', seller_id: SELLER, status: 'sold', starting_price: 100, current_price: 100, ...item })
  if (order) {
    fakeDb.table('orders').push({
      id: ORDER, buyer_id: BUYER, seller_id: SELLER, item_id: ITEM, amount: 100, currency: 'EUR',
      status: 'paid', fulfillment_method: 'post', payout_status: 'held', payout_method: 'stripe',
      paid_at: new Date().toISOString(), shipping_cost: 0, shipping_address: { name: 'A', street: 'B', city: 'C', zip: '1' },
      ...order,
    })
  }
}

async function call(method: string, path: string, user: string | null, body?: unknown) {
  const resp = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: resp.status, body: await resp.json().catch(() => ({})) as Record<string, any> }
}

const order = (id = ORDER) => fakeDb.table('orders').find(o => o.id === id)!
const PNG = 'data:image/png;base64,' + Buffer.alloc(2048, 7).toString('base64')
const inDays = (iso: unknown) => (Date.parse(String(iso)) - Date.now()) / DAY

async function ship() {
  await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG, defer_ship: true })
  await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'slip', image: PNG, defer_ship: true })
  return call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'RR123456785IL' })
}

// =====================================================================
// Qu'est-ce qu'un article de luxe ?
// =====================================================================
describe('Article de luxe : détection', () => {
  it('article à 600 € → luxe ; à 499 € → non', () => {
    expect(isLuxuryItem({ prices: [600], currency: 'EUR', title: 'Sac en cuir' })).toBe(true)
    expect(isLuxuryItem({ prices: [499], currency: 'EUR', title: 'Sac en cuir' })).toBe(false)
  })
  it('article Gucci à 200 € → luxe (la marque suffit)', () => {
    expect(isLuxuryItem({ prices: [200], currency: 'EUR', title: 'Ceinture GUCCI' })).toBe(true)
  })
  it('équivalent dans la devise du vendeur (conversion fixe)', () => {
    expect(luxuryThreshold('EUR')).toBe(500)
    expect(luxuryThreshold('ILS')).toBe(2000)
    expect(isLuxuryItem({ prices: [1999], currency: 'ILS' })).toBe(false)
    expect(isLuxuryItem({ prices: [2000], currency: 'ILS' })).toBe(true)
    expect(isLuxuryItem({ prices: [560], currency: 'USD' })).toBe(true)
  })
  it('marques repérées dans le titre, la marque ou la description, accents et langues compris', () => {
    expect(detectLuxuryBrand('Sac Hermès Birkin')).toBe('Hermès')
    expect(detectLuxuryBrand('Montre', 'Rolex')).toBe('Rolex')
    expect(detectLuxuryBrand('Montre', null, 'Une Patek Philippe de 1990')).toBe('Patek Philippe')
    expect(detectLuxuryBrand('תיק גוצ׳י מקורי')).toBe('Gucci')
    expect(detectLuxuryBrand('Сумка Шанель')).toBe('Chanel')
    expect(detectLuxuryBrand('Sweat YSL')).toBe('Saint Laurent')
  })
  it('pas de faux positif évident', () => {
    expect(detectLuxuryBrand('Veste vintage en jean')).toBeNull()
    expect(detectLuxuryBrand('Oméga 3 capsules')).toBeNull()
    expect(detectLuxuryBrand('Chaussures Diorama')).toBeNull() // « dior » doit être un mot entier
  })
  it('case « article de marque de luxe » cochée par le vendeur', () => {
    expect(isLuxuryItem({ prices: [50], currency: 'EUR', title: 'Sac', declared: true })).toBe(true)
  })
  it('la base contient la même liste de marques (trigger items_luxury_guard)', () => {
    const sql = readFileSync(join(__dirname, '../../../supabase/luxe-contrefacons-2026-11-26.sql'), 'utf8')
    for (const b of LUXURY_BRANDS) expect(sql, b.name).toContain(b.pattern)
  })
  it('délai contrefaçon : 30 jours après la réception ; pénalité jamais plus que le versement', () => {
    const r = '2026-11-01T10:00:00.000Z'
    expect(counterfeitDeadline({ buyer_confirmed_at: r })).toBe('2026-12-01T10:00:00.000Z')
    expect(counterfeitDeadline({})).toBeNull()
    expect(penaltyDeduction(100, 300)).toBe(100)
    expect(penaltyDeduction(400, 300)).toBe(300)
  })
})

// =====================================================================
// Certification d'authenticité à la mise en vente
// =====================================================================
describe('Mise en vente d\'un article de luxe', () => {
  beforeEach(() => seed(null))
  const listing = { title: 'Sac Gucci Marmont', category: 'fashion', starting_price: 200 }

  it('publication sans certification → refusée', async () => {
    const r = await call('POST', '/api/items/create-listing', SELLER, listing)
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('authenticity_certification_required')
    expect(r.body.brand).toBe('Gucci')
    expect(fakeDb.table('items').length).toBe(1)
  })

  it('avec la case cochée → publiée, date et vendeur enregistrés', async () => {
    const r = await call('POST', '/api/items/create-listing', SELLER, { ...listing, authenticity_certified: true })
    expect(r.status).toBe(200)
    const it = fakeDb.table('items').find(i => i.id === r.body.item_id)!
    expect(it.is_luxury).toBe(true)
    expect(it.authenticity_certified_by).toBe(SELLER)
    expect(Math.abs(Date.parse(String(it.authenticity_certified_at)) - Date.now())).toBeLessThan(60000)
  })

  it('article ordinaire : pas de certification demandée', async () => {
    const r = await call('POST', '/api/items/create-listing', SELLER, { title: 'Veste en jean', category: 'fashion', starting_price: 40 })
    expect(r.status).toBe(200)
  })

  it('article de live à 600 € : mise en vente (activate) refusée sans certification, acceptée avec', async () => {
    fakeDb.table('items').push({ id: 'live-1', seller_id: SELLER, title: 'Sac en cuir', starting_price: 600, current_price: 600, status: 'draft' })
    const refused = await call('POST', '/api/items/live-1/activate', SELLER)
    expect(refused.status).toBe(400)
    expect(refused.body.error).toBe('authenticity_certification_required')
    expect(fakeDb.table('items').find(i => i.id === 'live-1')!.status).toBe('draft')
    const ok = await call('POST', '/api/items/live-1/activate', SELLER, { authenticity_certified: true })
    expect(ok.status).toBe(200)
    expect(fakeDb.table('items').find(i => i.id === 'live-1')!.authenticity_certified_by).toBe(SELLER)
  })
})

// =====================================================================
// Versement du vendeur : 30 jours après la réception
// =====================================================================
describe('Versement d\'une vente de luxe', () => {
  it('article à 600 € : marqué luxe au paiement, versement à +30 j après l\'envoi', async () => {
    seed({ status: 'pending_payment', amount: 600 }, { title: 'Sac en cuir', starting_price: 600, current_price: 600 })
    await markOrderPaid(ORDER)
    expect(order().is_luxury).toBe(true)
    const r = await ship()
    expect(r.status).toBe(200)
    expect(inDays(order().payout_scheduled_at)).toBeGreaterThan(29.9)
  })

  it('le seuil porte sur le prix d\'UN article, jamais sur le total de la commande', async () => {
    // Commande de 900 € (port, plusieurs articles…) mais l'article lui-même vaut 300 € : pas de luxe
    seed({ status: 'pending_payment', amount: 900, total_amount: 900 }, { title: 'Lot de t-shirts', starting_price: 300, current_price: 300 })
    await markOrderPaid(ORDER)
    expect(order().is_luxury).toBe(false)
    expect(isLuxuryItem({ prices: [300, 300], currency: 'EUR', title: 'T-shirt' })).toBe(false)
  })

  it('« Tout est conforme » ne paie PAS tout de suite : versement 30 j après la réception', async () => {
    seed({ is_luxury: true, amount: 600 })
    await ship()
    const r = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { conform: true })
    expect(r.status).toBe(200)
    expect(order().payout_status).toBe('held')
    expect(inDays(order().payout_scheduled_at)).toBeGreaterThan(29.9)
    expect(await releaseDuePostPayouts()).toBe(0)
    order().payout_scheduled_at = new Date(Date.now() - 1000).toISOString()
    expect(await releaseDuePostPayouts()).toBe(1)
    expect(order().payout_status).toBe('released')
  })

  it('remise en main propre : versement 30 j après la remise', async () => {
    seed({ is_luxury: true, amount: 600, fulfillment_method: 'pickup' })
    fakeDb.table('order_handover_codes').push({ order_id: ORDER, code: '1234', attempts: 0 })
    const r = await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '1234' })
    expect(r.status).toBe(200)
    expect(order().status).toBe('handed_over')
    expect(order().payout_status).toBe('held')
    expect(inDays(order().payout_scheduled_at)).toBeGreaterThan(29.9)
    order().payout_scheduled_at = new Date(Date.now() - 1000).toISOString()
    expect(await releaseDuePostPayouts()).toBe(1)
    expect(order().payout_status).toBe('released')
  })

  it('article ordinaire : inchangé (10 jours, paiement immédiat si conforme)', async () => {
    seed({})
    await ship()
    expect(inDays(order().payout_scheduled_at)).toBeLessThan(10.1)
    await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { conform: true })
    expect(order().payout_status).toBe('released')
  })
})

// =====================================================================
// Signaler un faux, puis faux confirmé par l'équipe
// =====================================================================
describe('Contrefaçon', () => {
  const received = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()
  const dispute = (reason: string) => call('POST', '/api/disputes', BUYER, {
    order_id: ORDER, reason, description: 'Le sac est un faux, avis de la boutique joint.', photo_urls: ['https://x.test/p.jpg'],
  })

  it('luxe : faux signalable 20 jours après la réception ; autre problème refusé après 24 h', async () => {
    seed({ is_luxury: true, amount: 600, status: 'delivered', buyer_confirmed_at: received(20), claim_deadline: received(19) })
    expect((await dispute('damaged')).status).toBe(400)
    const r = await dispute('counterfeit')
    expect(r.status).toBe(200)
    expect(r.body.auto_refund).toBe(false)
    expect(order().status).toBe('disputed')
  })

  it('luxe : faux refusé après 30 jours', async () => {
    seed({ is_luxury: true, amount: 600, status: 'delivered', buyer_confirmed_at: received(31), claim_deadline: received(30) })
    expect((await dispute('counterfeit')).status).toBe(400)
  })

  it('« Contrefaçon confirmée » : remboursement, pénalité 50 %, compte fermé, preuves gardées, pénalité prélevée ensuite', async () => {
    seed({ is_luxury: true, amount: 600, status: 'disputed', stripe_payment_intent_id: 'pi_1', payout_status: 'held' })
    fakeDb.table('disputes').push({ id: 'd-1', order_id: ORDER, buyer_id: BUYER, seller_id: SELLER, reason: 'counterfeit', status: 'under_review', amount: 600, photo_urls: ['https://x.test/p.jpg'] })
    expect((await call('POST', '/api/admin/disputes/d-1/counterfeit-confirmed', BUYER, {})).status).toBe(403)
    const r = await call('POST', '/api/admin/disputes/d-1/counterfeit-confirmed', ADMIN, { note: 'Avis de la marque reçu' })
    expect(r.status).toBe(200)
    expect(refunds).toEqual(['pi_1'])
    expect(order().status).toBe('refunded')
    expect(order().payout_status).toBe('cancelled')
    const d = fakeDb.table('disputes').find(x => x.id === 'd-1')!
    expect(d.status).toBe('resolved_buyer')
    expect(d.counterfeit_confirmed_at).toBeTruthy()
    expect(d.evidence_retained).toBe(true)
    expect(fakeDb.table('profiles').find(p => p.id === SELLER)!.is_banned).toBe(true)
    const seller = fakeDb.table('sellers').find(s => s.id === SELLER)!
    expect(seller.penalty_due).toBe(300)

    // Versement suivant du vendeur : la pénalité est retenue
    fakeDb.table('orders').push({
      id: ORDER2, buyer_id: BUYER, seller_id: SELLER, amount: 200, seller_payout: 180, currency: 'EUR', status: 'delivered',
      fulfillment_method: 'post', payout_status: 'held', payout_method: 'wise', proof_submitted_at: received(15),
      buyer_confirmed_at: received(2), payout_scheduled_at: received(1),
    })
    expect(await releaseDuePostPayouts()).toBe(1)
    expect(order(ORDER2).penalty_deducted).toBe(180)
    expect(fakeDb.table('sellers').find(s => s.id === SELLER)!.penalty_due).toBe(120)
  })
})

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'

vi.hoisted(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://supabase.test'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-key-test'
  process.env.ADMIN_EMAILS = 'admin@test.dev'
})

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
      refunds: { create: async () => ({}) },
    },
  }
})

import express from 'express'
import { fakeDb } from './helpers/fakeSupabase'
import fulfillmentRoutes from '../routes/fulfillment'
import { releaseDuePostPayouts } from '../services/orderLifecycle'
import itemRoutes from '../routes/items'
import messageRoutes from '../routes/messages'
import {
  computePostPrice,
  generateHandoverCode,
  normalizeWhatsapp,
  suggestedPostPrice,
  whatsappLink,
  HANDOVER_MAX_ATTEMPTS,
} from '../fulfillment'

const BUYER = 'buyer-1'
const SELLER = 'seller-1'
const STRANGER = 'stranger-1'
const ADMIN = 'admin-1'
const ORDER = '11111111-1111-4111-8111-111111111111'
const ITEM = '22222222-2222-4222-8222-222222222222'

let server: Server
let base = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(fulfillmentRoutes)
  app.use(itemRoutes)
  app.use(messageRoutes)
  server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => { server?.close() })

function seed(order: Record<string, unknown>, extra?: () => void) {
  fakeDb.reset()
  fakeDb.users[BUYER] = { id: BUYER, email: 'buyer@test.dev' }
  fakeDb.users[SELLER] = { id: SELLER, email: 'seller@test.dev' }
  fakeDb.users[STRANGER] = { id: STRANGER, email: 'x@test.dev' }
  fakeDb.users[ADMIN] = { id: ADMIN, email: 'admin@test.dev' }
  fakeDb.table('profiles').push(
    { id: BUYER, display_name: 'Acheteur', country: 'IL', is_banned: false },
    { id: SELLER, display_name: 'Vendeur', country: 'IL', is_banned: false },
    { id: STRANGER, display_name: 'Autre', country: 'FR', is_banned: false },
    { id: ADMIN, display_name: 'Admin', country: 'FR', is_banned: false },
  )
  fakeDb.table('sellers').push({ id: SELLER, allow_pickup: true, pickup_area: 'Tel Aviv — Florentin', post_price: null, shipping_delay_days: 4 })
  fakeDb.table('user_contacts').push(
    { user_id: BUYER, whatsapp: '+972521112233' },
    { user_id: SELLER, whatsapp: '+972541234567' },
  )
  fakeDb.table('items').push({ id: ITEM, title: 'Veste vintage', weight_grams: 400, seller_shipping_override: null, seller_id: SELLER, status: 'sold', current_price: 100 })
  fakeDb.table('orders').push({
    id: ORDER, buyer_id: BUYER, seller_id: SELLER, item_id: ITEM, amount: 100, currency: 'ILS',
    status: 'paid', fulfillment_method: 'pickup', payout_status: 'held', payout_method: 'stripe',
    paid_at: new Date().toISOString(), shipping_cost: 0, ...order,
  })
  extra?.()
}

async function call(method: string, path: string, user: string | null, body?: unknown) {
  const resp = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: resp.status, body: await resp.json().catch(() => ({})) as Record<string, any> }
}

const order = () => fakeDb.table('orders').find(o => o.id === ORDER)!
const handoverRow = () => fakeDb.table('order_handover_codes').find(r => r.order_id === ORDER)!
const PNG = 'data:image/png;base64,' + Buffer.alloc(2048, 7).toString('base64')

// =====================================================================
// Logique pure
// =====================================================================
describe('Numéro WhatsApp', () => {
  it('ajoute +972 à un numéro israélien national', () => {
    expect(normalizeWhatsapp('052-111-2233', 'IL')).toBe('+972521112233')
  })
  it('ajoute +33 à un numéro français national (pas +972 en dur)', () => {
    expect(normalizeWhatsapp('06 12 34 56 78', 'FR')).toBe('+33612345678')
  })
  it('garde un numéro déjà international (+ ou 00)', () => {
    expect(normalizeWhatsapp('+1 415 555 0100', 'IL')).toBe('+14155550100')
    expect(normalizeWhatsapp('0044 7700 900123', 'IL')).toBe('+447700900123')
  })
  it('refuse les saisies invalides ou un pays sans indicatif connu', () => {
    expect(normalizeWhatsapp('abc', 'IL')).toBeNull()
    expect(normalizeWhatsapp('0612345678', 'ZZ')).toBeNull()
    expect(normalizeWhatsapp('', 'IL')).toBeNull()
  })
  it('construit le lien wa.me sans le +', () => {
    expect(whatsappLink('+972541234567', 'Commande #AB')).toBe('https://wa.me/972541234567?text=Commande%20%23AB')
  })
})

describe('Frais d\'envoi par la poste (module unique)', () => {
  it('prix de l\'article > forfait du vendeur > prix suggéré', () => {
    expect(computePostPrice({ itemOverride: 15, sellerPostPrice: 20, sellerCountry: 'IL' })).toEqual({ price: 15, source: 'item' })
    expect(computePostPrice({ sellerPostPrice: 20, sellerCountry: 'IL' })).toEqual({ price: 20, source: 'seller' })
    expect(computePostPrice({ sellerCountry: 'IL', weightGrams: 400 })).toEqual({ price: 24.5, source: 'suggested' })
  })
  it('suggère un prix pour tous les pays, dans la devise du pays', () => {
    expect(suggestedPostPrice('IL', 1500)).toEqual({ price: 29, currency: 'ILS' })
    expect(suggestedPostPrice('FR', 900).currency).toBe('EUR')
    expect(suggestedPostPrice('GB').currency).toBe('GBP')
    expect(suggestedPostPrice('ZZ').currency).toBe('USD')
  })
  it('génère un code de 4 chiffres', () => {
    for (let i = 0; i < 50; i++) expect(generateHandoverCode()).toMatch(/^\d{4}$/)
  })
})

// =====================================================================
// Remise en main propre : code à 4 chiffres
// =====================================================================
describe('Code de remise en main propre', () => {
  beforeEach(() => seed({}, () => {
    fakeDb.table('order_handover_codes').push({ order_id: ORDER, code: '4821', attempts: 0, locked_at: null })
  }))

  it('le bon code : commande remise et argent libéré', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '4821' })
    expect(r.status).toBe(200)
    expect(order().status).toBe('handed_over')
    expect(order().payout_status).toBe('released')
    expect(order().payout_released_at).toBeTruthy()
    expect(order().handed_over_at).toBeTruthy()
  })

  it('un mauvais code : refusé, argent toujours bloqué, essais restants', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '0000' })
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('wrong_code')
    expect(r.body.attempts_left).toBe(HANDOVER_MAX_ATTEMPTS - 1)
    expect(order().status).toBe('paid')
    expect(order().payout_status).toBe('held')
  })

  it('trop d\'essais : blocage, même le bon code est ensuite refusé', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    for (let i = 0; i < HANDOVER_MAX_ATTEMPTS - 1; i++) {
      expect((await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '1111' })).status).toBe(400)
    }
    const last = await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '1111' })
    expect(last.status).toBe(423)
    expect(handoverRow().locked_at).toBeTruthy()
    expect(errSpy.mock.calls.some(c => String(c[0]).includes('[ADMIN ALERT]'))).toBe(true)
    const good = await call('POST', `/api/orders/${ORDER}/handover`, SELLER, { code: '4821' })
    expect(good.status).toBe(423)
    expect(order().payout_status).toBe('held')
    errSpy.mockRestore()
  })

  it('seul le vendeur peut saisir le code', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/handover`, BUYER, { code: '4821' })
    expect(r.status).toBe(403)
    expect(order().status).toBe('paid')
  })

  it('seul l\'acheteur voit le code', async () => {
    const buyer = await call('GET', `/api/orders/${ORDER}/fulfillment`, BUYER)
    expect(buyer.body.handover.code).toBe('4821')
    const seller = await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    expect(seller.status).toBe(200)
    expect(seller.body.handover.code).toBeUndefined()
    expect(JSON.stringify(seller.body)).not.toContain('4821')
    expect(seller.body.handover.attempts_left).toBe(HANDOVER_MAX_ATTEMPTS)
    const stranger = await call('GET', `/api/orders/${ORDER}/fulfillment`, STRANGER)
    expect(stranger.status).toBe(404)
    expect(JSON.stringify(stranger.body)).not.toContain('4821')
  })
})

// =====================================================================
// Envoi par la poste : 2 photos obligatoires
// =====================================================================
describe('Preuve d\'envoi postal', () => {
  beforeEach(() => seed({ fulfillment_method: 'post', shipping_cost: 24.5, shipping_address: { name: 'A', street: 'B', city: 'C', zip: '1' } }))

  it('une seule photo : refus de passer « expédiée », argent bloqué', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    expect(r.status).toBe(200)
    expect(r.body.complete).toBe(false)
    expect(r.body.missing).toBe('slip')
    expect(order().status).toBe('paid')
    expect(order().payout_status).toBe('held')
    expect(order().proof_parcel_path).toBeTruthy()
  })

  it('les deux photos (anciennes versions de l’appli) : commande expédiée, argent bloqué 10 jours', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    const before = Date.now()
    const r = await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'slip', image: PNG, tracking_number: 'RR123456789IL' })
    expect(r.status).toBe(200)
    expect(r.body.complete).toBe(true)
    expect(order().status).toBe('shipped')
    expect(order().payout_status).toBe('held')
    const delayMs = new Date(order().payout_scheduled_at as string).getTime() - before
    expect(delayMs).toBeGreaterThan(10 * 86400000 - 60000)
    expect(delayMs).toBeLessThan(10 * 86400000 + 60000)
    expect(order().tracking_number).toBe('RR123456789IL')
    // Photos rangées dans l'espace privé
    expect(Object.keys(fakeDb.storageObjects).every(k => k.startsWith('order-proofs/'))).toBe(true)
    // L'acheteur voit les deux photos (URL signées)
    const buyer = await call('GET', `/api/orders/${ORDER}/fulfillment`, BUYER)
    expect(buyer.body.proofs.parcel_url).toContain('https://signed.test/order-proofs/')
    expect(buyer.body.proofs.slip_url).toContain('https://signed.test/order-proofs/')
  })

  it('l\'acheteur confirme la réception : vendeur payé tout de suite', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'slip', image: PNG })
    const notBuyer = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, SELLER)
    expect(notBuyer.status).toBe(404)
    expect(order().payout_status).toBe('held')
    const r = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER)
    expect(r.status).toBe(200)
    expect(order().status).toBe('delivered')
    expect(order().payout_status).toBe('released')
    expect(order().buyer_confirmed_at).toBeTruthy()
  })

  it('confirmer la réception est impossible avant les 2 photos', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    const r = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER)
    expect(r.status).toBe(409)
    expect(order().payout_status).toBe('held')
  })

  it('après 10 jours sans litige, l\'argent est libéré automatiquement ; pas avant', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'slip', image: PNG })
    expect(await releaseDuePostPayouts()).toBe(0)
    expect(order().payout_status).toBe('held')
    order().payout_scheduled_at = new Date(Date.now() - 1000).toISOString()
    expect(await releaseDuePostPayouts()).toBe(1)
    expect(order().payout_status).toBe('released')
  })

  it('une commande en litige n\'est pas libérée automatiquement', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'slip', image: PNG })
    order().status = 'disputed'
    order().payout_scheduled_at = new Date(Date.now() - 1000).toISOString()
    expect(await releaseDuePostPayouts()).toBe(0)
    expect(order().payout_status).toBe('held')
  })

  it('refuse les photos envoyées par quelqu\'un d\'autre que le vendeur', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/proof`, BUYER, { kind: 'parcel', image: PNG })
    expect(r.status).toBe(403)
  })

  it('refuse un fichier qui n\'est pas une image', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: 'data:application/pdf;base64,' + Buffer.alloc(500).toString('base64') })
    expect(r.status).toBe(400)
  })

  it('les photos sont invisibles pour un tiers', async () => {
    await call('POST', `/api/orders/${ORDER}/proof`, SELLER, { kind: 'parcel', image: PNG })
    const r = await call('GET', `/api/orders/${ORDER}/fulfillment`, STRANGER)
    expect(r.status).toBe(404)
    const admin = await call('GET', `/api/orders/${ORDER}/fulfillment`, ADMIN)
    expect(admin.status).toBe(200)
    expect(admin.body.proofs.parcel_url).toBeTruthy()
    expect(admin.body.contact).toBeNull()
  })
})

// =====================================================================
// Coordonnées : seulement après paiement, seulement l'autre partie
// =====================================================================
describe('Coordonnées WhatsApp / e-mail', () => {
  it('avant paiement : aucune coordonnée', async () => {
    seed({ status: 'pending_payment', payout_status: 'pending', paid_at: null })
    const r = await call('GET', `/api/orders/${ORDER}/fulfillment`, BUYER)
    expect(r.status).toBe(200)
    expect(r.body.contact).toBeNull()
    expect(JSON.stringify(r.body)).not.toContain('972541234567')
  })

  it('après paiement : l\'acheteur voit le vendeur, le vendeur voit l\'acheteur', async () => {
    seed({})
    const b = await call('GET', `/api/orders/${ORDER}/fulfillment`, BUYER)
    expect(b.body.contact.whatsapp).toBe('+972541234567')
    expect(b.body.contact.whatsapp_link).toMatch(/^https:\/\/wa\.me\/972541234567\?text=/)
    expect(b.body.contact.email).toBe('seller@test.dev')
    const s = await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    expect(s.body.contact.whatsapp).toBe('+972521112233')
    expect(s.body.contact.email).toBe('buyer@test.dev')
  })

  it('un tiers ne voit rien', async () => {
    seed({})
    const r = await call('GET', `/api/orders/${ORDER}/fulfillment`, STRANGER)
    expect(r.status).toBe(404)
    expect(JSON.stringify(r.body)).not.toMatch(/972/)
  })
})

// =====================================================================
// Choix au paiement
// =====================================================================
describe('Choix retrait / poste avant paiement', () => {
  beforeEach(() => seed({ status: 'pending_payment', fulfillment_method: null, paid_at: null }))

  it('poste : frais de port ajoutés au total, adresse obligatoire', async () => {
    const noAddr = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, { method: 'post' })
    expect(noAddr.body.error).toBe('address_required')
    const r = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, {
      method: 'post', address: { name: 'Dana', street: 'Herzl 1', city: 'Haifa', zip: '3100000' },
    })
    expect(r.status).toBe(200)
    expect(order().fulfillment_method).toBe('post')
    expect(order().shipping_cost).toBe(24.5)
    expect(order().total_amount).toBe(124.5)
    expect(order().currency).toBe('ILS')
  })

  it('retrait : 0 de port, pas d\'adresse', async () => {
    const r = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, { method: 'pickup' })
    expect(r.status).toBe(200)
    expect(order().shipping_cost).toBe(0)
    expect(order().total_amount).toBe(100)
    expect(order().shipping_address).toBeNull()
  })

  it('retrait refusé si le vendeur ne l\'autorise pas', async () => {
    fakeDb.table('sellers')[0].allow_pickup = false
    const r = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, { method: 'pickup' })
    expect(r.body.error).toBe('pickup_not_allowed')
  })

  it('numéro WhatsApp demandé à l\'acheteur qui n\'en a pas', async () => {
    fakeDb.tables.user_contacts = fakeDb.table('user_contacts').filter(c => c.user_id !== BUYER)
    const r = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, { method: 'pickup' })
    expect(r.body.error).toBe('whatsapp_required')
    const ok = await call('POST', `/api/orders/${ORDER}/fulfillment`, BUYER, { method: 'pickup', whatsapp: '050-765-4321' })
    expect(ok.status).toBe(200)
    expect(fakeDb.table('user_contacts').find(c => c.user_id === BUYER)!.whatsapp).toBe('+972507654321')
  })
})

// =====================================================================
// Enchère sans adresse
// =====================================================================
describe('Enchérir sans adresse', () => {
  it('une enchère est acceptée sans aucune adresse enregistrée', async () => {
    seed({}, () => {
      const item = fakeDb.table('items')[0]
      item.status = 'active'
      item.current_price = 10
    })
    expect(fakeDb.table('addresses')).toHaveLength(0)
    fakeDb.table('profiles').find(p => p.id === BUYER)!.stripe_customer_id = 'cus_test'
    const r = await call('POST', `/api/items/${ITEM}/bid`, BUYER, { amount: 12 })
    expect(r.body.error).not.toBe('address_required')
    expect(r.status).toBe(200)
    expect(fakeDb.table('bids')).toHaveLength(1)
  })
})

// =====================================================================
// Messagerie : échange de coordonnées permis seulement après paiement
// =====================================================================
describe('Conversation liée à une commande', () => {
  const CONV = '33333333-3333-4333-8333-333333333333'
  const addConv = () => fakeDb.table('conversations').push({ id: CONV, type: 'order', order_id: ORDER, participant_1: BUYER, participant_2: SELLER, status: 'active' })
  const lastMsg = () => fakeDb.table('conversation_messages').at(-1)!

  it('commande payée : un numéro de téléphone n\'est ni bloqué ni sanctionné', async () => {
    seed({}, addConv)
    const r = await call('POST', `/api/conversations/${CONV}/messages`, BUYER, { message: 'Mon WhatsApp : 0521112233' })
    expect(r.status).toBe(200)
    expect(r.body.warning).toBeUndefined()
    expect(lastMsg().is_flagged).toBe(false)
  })

  it('avant paiement : le blocage reste', async () => {
    seed({ status: 'pending_payment', paid_at: null }, addConv)
    const r = await call('POST', `/api/conversations/${CONV}/messages`, BUYER, { message: 'Mon WhatsApp : 0521112233' })
    expect(r.body.warning).toBe('contact_blocked')
    expect(lastMsg().is_flagged).toBe(true)
  })

})

describe('Envoi postal : suivi obligatoire et code de réception', () => {
  beforeEach(() => seed({ fulfillment_method: 'post', shipping_cost: 24.5, shipping_address: { name: 'A', street: 'B', city: 'C', zip: '1' } }))

  // ---------------------------------------------------------------------------
  // Nouvelle règle (25/11/2026) : numéro de suivi obligatoire + code de réception dans le colis
  // ---------------------------------------------------------------------------
  it('envoi : refuse sans numéro de suivi, avec un faux numéro international, ou un numéro déjà utilisé', async () => {
    expect((await call('POST', `/api/orders/${ORDER}/ship`, SELLER, {})).body.error).toBe('tracking_required')
    expect((await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'RR123456784IL' })).body.error).toBe('tracking_invalid')
    expect((await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'abc' })).body.error).toBe('tracking_invalid')
    fakeDb.table('orders').push({ id: 'autre', buyer_id: BUYER, seller_id: SELLER, status: 'shipped', fulfillment_method: 'post', tracking_number: 'RR123456785IL' })
    const dup = await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'rr 123 456 785 il' })
    expect(dup.status).toBe(409)
    expect(dup.body.error).toBe('tracking_already_used')
    expect(order().status).toBe('paid')
    expect((await call('POST', `/api/orders/${ORDER}/ship`, BUYER, { tracking_number: 'RR123456785IL' })).status).toBe(404)
  })

  it('envoi avec numéro valide : expédiée, versement à 10 jours, code visible du vendeur seulement', async () => {
    const before = await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    expect(before.body.receipt_code).toMatch(/^\d{6}$/)
    const r = await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'RR123456785IL' })
    expect(r.status).toBe(200)
    expect(order().status).toBe('shipped')
    expect(order().tracking_number).toBe('RR123456785IL')
    const delayMs = new Date(order().payout_scheduled_at as string).getTime() - Date.now()
    expect(delayMs).toBeGreaterThan(10 * 86400000 - 60000)
    const seller = await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    expect(seller.body.receipt_code).toBe(before.body.receipt_code)
    const buyer = await call('GET', `/api/orders/${ORDER}/fulfillment`, BUYER)
    expect(buyer.body.receipt_code).toBeNull()
    expect(buyer.body.receipt).toEqual({ required: true, locked: false, attempts_left: 5 })
  })

  it('réception : sans le bon code, pas de versement ; bloqué après 5 faux codes', async () => {
    await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'RR123456785IL' })
    const code = fakeDb.table('order_receipt_codes').find(r => r.order_id === ORDER)!.code as string
    const wrong = code === '000000' ? '111111' : '000000'
    const none = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, {})
    expect(none.body.error).toBe('wrong_receipt_code')
    for (let i = 0; i < 3; i++) await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { code: wrong })
    const last = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { code: wrong })
    expect(last.status).toBe(423)
    const tooLate = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { code })
    expect(tooLate.status).toBe(423)
    expect(order().payout_status).toBe('held')
  })

  it('réception avec le bon code : vendeur payé tout de suite ; le vendeur ne peut pas le saisir lui-même', async () => {
    await call('GET', `/api/orders/${ORDER}/fulfillment`, SELLER)
    await call('POST', `/api/orders/${ORDER}/ship`, SELLER, { tracking_number: 'RR123456785IL' })
    const code = fakeDb.table('order_receipt_codes').find(r => r.order_id === ORDER)!.code as string
    expect((await call('POST', `/api/orders/${ORDER}/confirm-receipt`, SELLER, { code })).status).toBe(404)
    const r = await call('POST', `/api/orders/${ORDER}/confirm-receipt`, BUYER, { code })
    expect(r.status).toBe(200)
    expect(order().status).toBe('delivered')
    expect(order().payout_status).toBe('released')
  })
})


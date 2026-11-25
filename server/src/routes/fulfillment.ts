import { Router } from 'express'
import type { Response } from 'express'
import { z } from 'zod'
import { supabase, stripe, ADMIN_EMAILS } from '../config'
import { requireAuth } from '../middleware'
import { notifyUserT, paramStr } from '../utils'
import {
  HANDOVER_DELAY_ALLOWED_DAYS,
  HANDOVER_DELAY_DEFAULT_DAYS,
  HANDOVER_MAX_ATTEMPTS,
  POST_PAYOUT_DELAY_DAYS,
  codesMatch,
  computePostPrice,
  currencyForCountry,
  dialCodeForCountry,
  formatMoney,
  isPaidStatus,
  mailtoLink,
  normalizeWhatsapp,
  shortOrderRef,
  suggestedPostPrice,
  whatsappLink,
} from '../fulfillment'
import { alertAdmins, getUserWhatsapp, releaseOrderPayout, saveUserWhatsapp } from '../services/orderLifecycle'
import { RECEIPT_CLAIM_HOURS, startCarrierTracking } from '../services/parcelTracking'
import { checkTrackingNumber } from '../payments/ship24'
import type { AuthenticatedRequest } from '../types'

const router = Router()

export const PROOF_BUCKET = 'order-proofs'
const SIGNED_URL_TTL_SECONDS = 600
const MAX_PROOF_BYTES = 8 * 1024 * 1024
const PROOF_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
}

const AddressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(250),
  city: z.string().trim().min(1).max(120),
  zip: z.string().trim().min(1).max(20),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().length(2).optional(),
})

const FulfillmentBody = z.object({
  method: z.enum(['pickup', 'post']),
  address: AddressSchema.optional(),
  whatsapp: z.string().max(40).optional(),
})

const HandoverBody = z.object({ code: z.string().regex(/^\d{4}$/) })

const ProofBody = z.object({
  kind: z.enum(['parcel', 'slip']),
  image: z.string().min(20),
  content_type: z.string().optional(),
  tracking_number: z.string().trim().max(60).optional(),
  // Nouvelle appli : les 2 photos sont gardées comme preuves de litige, l'envoi se valide ensuite avec le numéro de suivi
  defer_ship: z.boolean().optional(),
})

const SellerSettingsBody = z.object({
  allow_pickup: z.boolean(),
  pickup_area: z.string().trim().max(120).nullable().optional(),
  post_price: z.number().min(0).max(100000).nullable().optional(),
  handover_delay_days: z.number().int().optional(),
  whatsapp: z.string().max(40),
})

function isAdmin(req: AuthenticatedRequest): boolean {
  return !!req.user?.email && ADMIN_EMAILS.includes(req.user.email)
}

async function getProfileCountry(userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('country').eq('id', userId).maybeSingle()
  return data?.country || null
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch {
    return null
  }
}

/** Prix d'envoi par la poste pour une commande (module unique : ../fulfillment). */
export async function postPriceForOrder(order: { seller_id: string; item_id: string | null }) {
  const [{ data: seller }, { data: item }, sellerCountry] = await Promise.all([
    supabase.from('sellers').select('allow_pickup, pickup_area, post_price').eq('id', order.seller_id).maybeSingle(),
    order.item_id
      ? supabase.from('items').select('weight_grams, seller_shipping_override').eq('id', order.item_id).maybeSingle()
      : Promise.resolve({ data: null as { weight_grams: number | null; seller_shipping_override: number | null } | null }),
    getProfileCountry(order.seller_id),
  ])
  const post = computePostPrice({
    itemOverride: item?.seller_shipping_override,
    sellerPostPrice: seller?.post_price,
    sellerCountry,
    weightGrams: item?.weight_grams,
  })
  return {
    seller,
    sellerCountry,
    currency: currencyForCountry(sellerCountry),
    postPrice: post.price,
    postSource: post.source,
  }
}

// =============================================
// GET /api/orders/:id/checkout-options — avant paiement (acheteur)
// =============================================
router.get('/api/orders/:id/checkout-options', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, item_id, amount, status, fulfillment_method, shipping_cost')
      .eq('id', paramStr(req.params.id))
      .single()
    if (!order || order.buyer_id !== userId) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    const info = await postPriceForOrder(order)
    const [whatsapp, buyerCountry, { data: savedAddress }] = await Promise.all([
      getUserWhatsapp(userId),
      getProfileCountry(userId),
      supabase.from('addresses').select('name, street, city, zip, phone').eq('user_id', userId).eq('is_default', true).maybeSingle(),
    ])
    res.json({
      order_id: order.id,
      status: order.status,
      amount: Number(order.amount),
      currency: info.currency,
      pickup: { allowed: !!info.seller?.allow_pickup, area: info.seller?.pickup_area || null },
      post: { price: info.postPrice },
      selected_method: order.fulfillment_method === 'pickup' || order.fulfillment_method === 'post' ? order.fulfillment_method : null,
      whatsapp,
      country: buyerCountry,
      dial_code: dialCodeForCountry(buyerCountry),
      saved_address: savedAddress || null,
    })
  } catch (err) {
    console.error('[fulfillment] checkout-options', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/fulfillment — l'acheteur choisit retrait ou poste AVANT de payer.
// L'adresse n'est demandée QUE pour un envoi par la poste. Les frais de port
// sont ajoutés au total payé (plus de prélèvement après coup).
// =============================================
router.post('/api/orders/:id/fulfillment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = FulfillmentBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const { method, address, whatsapp } = parsed.data
    const userId = req.user!.id
    const orderId = paramStr(req.params.id)

    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, item_id, amount, status, stripe_payment_intent_id')
      .eq('id', orderId)
      .single()
    if (!order || order.buyer_id !== userId) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (order.status !== 'pending_payment') {
      res.status(409).json({ error: 'already_paid' })
      return
    }

    const info = await postPriceForOrder(order)
    if (method === 'pickup' && !info.seller?.allow_pickup) {
      res.status(400).json({ error: 'pickup_not_allowed' })
      return
    }
    if (method === 'post' && !address) {
      res.status(400).json({ error: 'address_required' })
      return
    }

    // Numéro WhatsApp de l'acheteur : demandé s'il n'en a pas encore
    const buyerCountry = await getProfileCountry(userId)
    let buyerWhatsapp = await getUserWhatsapp(userId)
    if (whatsapp && whatsapp.trim()) {
      const normalized = normalizeWhatsapp(whatsapp, buyerCountry)
      if (!normalized) {
        res.status(400).json({ error: 'invalid_whatsapp' })
        return
      }
      if (normalized !== buyerWhatsapp) {
        if (!(await saveUserWhatsapp(userId, normalized))) {
          res.status(500).json({ error: 'Failed to save WhatsApp number' })
          return
        }
        buyerWhatsapp = normalized
      }
    }
    if (!buyerWhatsapp) {
      res.status(400).json({ error: 'whatsapp_required' })
      return
    }

    // Un paiement déjà préparé pour un autre montant est annulé (le total change)
    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id.startsWith('pi_')) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
        if (pi.status === 'succeeded') {
          res.status(409).json({ error: 'already_paid' })
          return
        }
        await stripe.paymentIntents.cancel(order.stripe_payment_intent_id)
      } catch { /* déjà annulé ou expiré */ }
    }

    const shippingCost = method === 'post' ? info.postPrice : 0
    let shippingAddress: Record<string, string> | null = null
    if (method === 'post' && address) {
      shippingAddress = {
        name: address.name, street: address.street, city: address.city, zip: address.zip,
        phone: address.phone || '', country: (address.country || buyerCountry || info.sellerCountry || '').toUpperCase(),
      }
      const { data: existing } = await supabase.from('addresses').select('id').eq('user_id', userId).eq('is_default', true).maybeSingle()
      const addrRow = { name: address.name, street: address.street, city: address.city, zip: address.zip, phone: address.phone || '' }
      if (existing) await supabase.from('addresses').update(addrRow).eq('id', existing.id)
      else await supabase.from('addresses').insert({ ...addrRow, user_id: userId, is_default: true })
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({
        fulfillment_method: method,
        shipping_cost: shippingCost,
        total_amount: Math.round((Number(order.amount) + shippingCost) * 100) / 100,
        shipping_address: shippingAddress,
        currency: info.currency,
        stripe_payment_intent_id: null,
      })
      .eq('id', orderId)
      .eq('status', 'pending_payment')
      .select('id, fulfillment_method, shipping_cost, total_amount, currency, amount')
      .single()
    if (error || !updated) {
      res.status(500).json({ error: 'Failed to save delivery choice' })
      return
    }
    res.json(updated)
  } catch (err) {
    console.error('[fulfillment] choose', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/orders/:id/fulfillment — état de la remise pour l'acheteur, le vendeur ou l'admin.
// - le CODE n'est renvoyé qu'à l'acheteur ;
// - les coordonnées de l'autre partie seulement si la commande est payée ;
// - les photos de preuve par URL signée courte.
// =============================================
router.get('/api/orders/:id/fulfillment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = paramStr(req.params.id)
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    const isBuyer = order.buyer_id === userId
    const isSeller = order.seller_id === userId
    const admin = isAdmin(req)
    if (!isBuyer && !isSeller && !admin) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const paid = isPaidStatus(order.status)
    const result: Record<string, unknown> = {
      order_id: order.id,
      role: isBuyer ? 'buyer' : isSeller ? 'seller' : 'admin',
      status: order.status,
      fulfillment_method: order.fulfillment_method,
      currency: order.currency,
      amount: Number(order.amount),
      shipping_cost: Number(order.shipping_cost || 0),
      total_amount: order.total_amount != null ? Number(order.total_amount) : Number(order.amount),
      paid_at: order.paid_at,
      handover_deadline: order.handover_deadline,
      handed_over_at: order.handed_over_at,
      proof_submitted_at: order.proof_submitted_at,
      shipped_at: order.shipped_at,
      tracking_number: order.tracking_number,
      payout_status: order.payout_status,
      payout_released_at: order.payout_released_at,
      payout_scheduled_at: order.payout_scheduled_at,
      shipping_address: order.fulfillment_method === 'post' ? order.shipping_address : null,
      pickup_area: null,
      handover: null,
      proofs: { parcel_url: null, slip_url: null },
      contact: null,
      claim_deadline: order.claim_deadline || null,
      buyer_confirmed_at: order.buyer_confirmed_at || null,
      // Seulement si le suivi transporteur (Ship24) suit vraiment ce colis
      carrier: order.tracking_number && order.carrier_tracker_id ? {
        status: order.tracking_status || null,
        first_event_at: order.carrier_first_event_at || null,
        delivered_at: order.carrier_delivered_at || null,
      } : null,
    }

    if (order.fulfillment_method === 'pickup') {
      const { data: seller } = await supabase.from('sellers').select('pickup_area').eq('id', order.seller_id).maybeSingle()
      result.pickup_area = seller?.pickup_area || null
      if (paid) {
        const { data: hc } = await supabase
          .from('order_handover_codes')
          .select('code, attempts, locked_at')
          .eq('order_id', orderId)
          .maybeSingle()
        if (hc) {
          const attemptsLeft = Math.max(0, HANDOVER_MAX_ATTEMPTS - (hc.attempts || 0))
          result.handover = isBuyer
            ? { code: hc.code, locked: !!hc.locked_at }
            : { attempts_left: attemptsLeft, locked: !!hc.locked_at }
        }
      }
    }

    if (order.fulfillment_method === 'post') {
      const proofs: Record<string, string | null> = { parcel_url: null, slip_url: null }
      for (const [key, path] of [['parcel_url', order.proof_parcel_path], ['slip_url', order.proof_slip_path]] as const) {
        if (!path) continue
        const { data: signed } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
        proofs[key] = signed?.signedUrl || null
      }
      result.proofs = proofs
    }

    if (paid && (isBuyer || isSeller)) {
      const otherId = isBuyer ? order.seller_id : order.buyer_id
      const [{ data: otherProfile }, whatsapp, email, { data: item }] = await Promise.all([
        supabase.from('profiles').select('display_name, username').eq('id', otherId).maybeSingle(),
        getUserWhatsapp(otherId),
        getUserEmail(otherId),
        order.item_id ? supabase.from('items').select('title').eq('id', order.item_id).maybeSingle() : Promise.resolve({ data: null as { title: string } | null }),
      ])
      const ref = shortOrderRef(order.id)
      const title = item?.title || ''
      const message = `ShaPop — #${ref}${title ? ` (${title})` : ''}: `
      result.contact = {
        name: otherProfile?.display_name || otherProfile?.username || null,
        whatsapp,
        whatsapp_link: whatsapp ? whatsappLink(whatsapp, message) : null,
        email,
        email_link: email ? mailtoLink(email, `ShaPop #${ref}${title ? ` — ${title}` : ''}`, message) : null,
      }
    }

    res.json(result)
  } catch (err) {
    console.error('[fulfillment] get', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/handover — le vendeur saisit le code donné par l'acheteur
// =============================================
router.post('/api/orders/:id/handover', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = HandoverBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_code_format' })
      return
    }
    const orderId = paramStr(req.params.id)
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, fulfillment_method, amount, currency')
      .eq('id', orderId)
      .single()
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can enter the code' })
      return
    }
    if (order.fulfillment_method !== 'pickup') {
      res.status(400).json({ error: 'not_pickup' })
      return
    }
    if (order.status !== 'paid') {
      res.status(409).json({ error: order.status === 'handed_over' ? 'already_handed_over' : 'not_paid' })
      return
    }

    const { data: hc } = await supabase
      .from('order_handover_codes')
      .select('code, attempts, locked_at')
      .eq('order_id', orderId)
      .maybeSingle()
    if (!hc) {
      res.status(409).json({ error: 'no_code' })
      return
    }
    if (hc.locked_at || (hc.attempts || 0) >= HANDOVER_MAX_ATTEMPTS) {
      res.status(423).json({ error: 'locked', attempts_left: 0 })
      return
    }

    if (!codesMatch(hc.code, parsed.data.code)) {
      const attempts = (hc.attempts || 0) + 1
      const locked = attempts >= HANDOVER_MAX_ATTEMPTS
      await supabase
        .from('order_handover_codes')
        .update({ attempts, ...(locked ? { locked_at: new Date().toISOString() } : {}) })
        .eq('order_id', orderId)
      if (locked) {
        alertAdmins(
          `Code de remise bloqué — commande ${shortOrderRef(orderId)}`,
          `${HANDOVER_MAX_ATTEMPTS} codes faux saisis par le vendeur ${order.seller_id} pour la commande ${orderId} (acheteur ${order.buyer_id}). À vérifier.`,
        ).catch(() => {})
        notifyUserT(order.buyer_id, 'handover_locked', 'handoverLocked', {}, { order_id: orderId }).catch(() => {})
        res.status(423).json({ error: 'locked', attempts_left: 0 })
        return
      }
      res.status(400).json({ error: 'wrong_code', attempts_left: HANDOVER_MAX_ATTEMPTS - attempts })
      return
    }

    const now = new Date()
    const updated = await releaseOrderPayout(orderId, {
      status: 'handed_over',
      handed_over_at: now.toISOString(),
      delivered_at: now.toISOString(),
      claim_deadline: new Date(now.getTime() + 48 * 3600000).toISOString(),
    })
    if (!updated) {
      res.status(409).json({ error: 'not_paid' })
      return
    }
    notifyUserT(order.buyer_id, 'order_handed_over', 'orderHandedOver', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
    res.json({ success: true, status: 'handed_over', payout_status: 'released', amount: formatMoney(order.amount, order.currency) })
  } catch (err) {
    console.error('[fulfillment] handover', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/proof — le vendeur envoie UNE des 2 photos obligatoires
//   kind = 'parcel' : intérieur du colis avec l'article dedans
//   kind = 'slip'   : bordereau d'envoi tamponné par la poste
// Quand les DEUX sont là : commande « expédiée » + argent libéré.
// =============================================
// Le vendeur coche « commande traitée » (colis préparé) — ou la décoche
router.post('/api/orders/:id/prepared', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const prepared = req.body?.prepared !== false
    const { data: order } = await supabase.from('orders').select('id, seller_id, buyer_id, status, prepared_at').eq('id', orderId).maybeSingle()
    if (!order || order.seller_id !== req.user!.id) { res.status(404).json({ error: 'Order not found' }); return }
    if (order.status !== 'paid') { res.status(409).json({ error: 'not_paid' }); return }
    const prepared_at = prepared ? (order.prepared_at || new Date().toISOString()) : null
    await supabase.from('orders').update({ prepared_at }).eq('id', orderId)
    if (prepared && !order.prepared_at) {
      notifyUserT(order.buyer_id, 'order_prepared', 'orderPrepared', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
    }
    res.json({ success: true, prepared_at })
  } catch (err) {
    console.error('[fulfillment] prepared', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api/orders/:id/proof', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ProofBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input' })
      return
    }
    const { kind, image, tracking_number, defer_ship } = parsed.data
    const orderId = paramStr(req.params.id)
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, fulfillment_method, proof_parcel_path, proof_slip_path, tracking_number')
      .eq('id', orderId)
      .single()
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can send proofs' })
      return
    }
    if (order.fulfillment_method !== 'post') {
      res.status(400).json({ error: 'not_post' })
      return
    }
    if (order.status !== 'paid') {
      res.status(409).json({ error: 'not_paid' })
      return
    }

    // Image en base64 (avec ou sans en-tête data:)
    const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(image)
    const contentType = (m ? m[1] : parsed.data.content_type || 'image/jpeg').toLowerCase()
    const ext = PROOF_MIME[contentType]
    if (!ext) {
      res.status(400).json({ error: 'invalid_image_type' })
      return
    }
    const buffer = Buffer.from(m ? m[2] : image, 'base64')
    if (buffer.length < 100 || buffer.length > MAX_PROOF_BYTES) {
      res.status(400).json({ error: 'invalid_image_size' })
      return
    }

    const path = `${orderId}/${kind}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(path, buffer, { contentType, upsert: true })
    if (upErr) {
      console.error('[fulfillment] proof upload', upErr.message)
      res.status(500).json({ error: 'upload_failed' })
      return
    }

    const patch: Record<string, unknown> = kind === 'parcel' ? { proof_parcel_path: path } : { proof_slip_path: path }
    if (tracking_number) patch.tracking_number = tracking_number
    const parcelPath = kind === 'parcel' ? path : order.proof_parcel_path
    const slipPath = kind === 'slip' ? path : order.proof_slip_path

    if (!parcelPath || !slipPath || defer_ship) {
      await supabase.from('orders').update(patch).eq('id', orderId)
      res.json({
        success: true,
        status: 'paid',
        complete: false,
        missing: !parcelPath ? 'parcel' : !slipPath ? 'slip' : null,
        payout_status: 'held',
      })
      return
    }

    // Les 2 photos sont là : commande « expédiée ». L'argent reste bloqué POST_PAYOUT_DELAY_DAYS jours
    // (le temps pour l'acheteur de signaler un problème), ou jusqu'à ce qu'il confirme la réception.
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const payoutAt = new Date(now + POST_PAYOUT_DELAY_DAYS * 86400000).toISOString()
    const { data: shippedRows } = await supabase
      .from('orders')
      .update({
        ...patch,
        status: 'shipped',
        shipped_at: nowIso,
        proof_submitted_at: nowIso,
        payout_scheduled_at: payoutAt,
        claim_deadline: new Date(now + 14 * 86400000).toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'paid')
      .select('id')
    if (!shippedRows || shippedRows.length === 0) {
      res.status(409).json({ error: 'not_paid' })
      return
    }
    notifyUserT(order.buyer_id, 'order_shipped', 'orderShipped', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
    res.json({ success: true, status: 'shipped', complete: true, payout_status: 'held', payout_scheduled_at: payoutAt })
  } catch (err) {
    console.error('[fulfillment] proof', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/ship — le vendeur a posté le colis : numéro de suivi OBLIGATOIRE
// (les 2 photos restent obligatoires, comme preuves de litige). L'argent reste bloqué jusqu'à la
// réception confirmée par l'acheteur (+ 24 h, ou tout de suite si « conforme »), sinon 10 jours.
// =============================================
router.post('/api/orders/:id/ship', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const check = checkTrackingNumber(String((req.body || {}).tracking_number || ''))
    if (!check.ok) {
      res.status(400).json({ error: check.error })
      return
    }
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, fulfillment_method, shipping_address, proof_parcel_path, proof_slip_path')
      .eq('id', orderId)
      .single()
    if (!order || order.seller_id !== req.user!.id) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (order.fulfillment_method !== 'post') {
      res.status(400).json({ error: 'not_post' })
      return
    }
    if (order.status !== 'paid') {
      res.status(409).json({ error: 'not_paid' })
      return
    }
    // Les 2 photos (intérieur du colis, bordereau) restent obligatoires : preuves en cas de litige
    if (!order.proof_parcel_path || !order.proof_slip_path) {
      res.status(400).json({ error: 'photos_required', missing: !order.proof_parcel_path ? 'parcel' : 'slip' })
      return
    }
    // Un même numéro ne peut servir qu'à une seule commande
    const { data: dup } = await supabase.from('orders').select('id').eq('tracking_number', check.value).neq('id', orderId).limit(1)
    if (dup && dup.length) {
      res.status(409).json({ error: 'tracking_already_used' })
      return
    }
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const payoutAt = new Date(now + POST_PAYOUT_DELAY_DAYS * 86400000).toISOString()
    const { data: shippedRows } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: check.value,
        shipped_at: nowIso,
        proof_submitted_at: nowIso,
        payout_scheduled_at: payoutAt,
        // Sans code ni « livré » de la poste : la vente est acceptée 10 jours après l'envoi
        claim_deadline: payoutAt,
      })
      .eq('id', orderId)
      .eq('status', 'paid')
      .select('id')
    if (!shippedRows || shippedRows.length === 0) {
      res.status(409).json({ error: 'not_paid' })
      return
    }
    notifyUserT(order.buyer_id, 'order_shipped', 'orderShippedCode', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
    startCarrierTracking(orderId, check.value, order.shipping_address as { zip?: string; country?: string } | null).catch(() => {})
    res.json({ success: true, status: 'shipped', tracking_number: check.value, payout_status: 'held', payout_scheduled_at: payoutAt })
  } catch (err) {
    console.error('[fulfillment] ship', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/confirm-receipt — l'acheteur confirme avoir reçu son colis :
// le vendeur est payé tout de suite (sans attendre le délai de sécurité).
// =============================================
router.post('/api/orders/:id/confirm-receipt', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, status, fulfillment_method, payout_status, carrier_delivered_at')
      .eq('id', orderId)
      .single()
    if (!order || order.buyer_id !== req.user!.id) {
      res.status(404).json({ error: 'Order not found' })
      return
    }
    if (order.fulfillment_method !== 'post' || order.status !== 'shipped' || order.payout_status !== 'held') {
      res.status(409).json({ error: 'not_confirmable' })
      return
    }
    const nowIso = new Date().toISOString()
    // Règle du 25/11/2026 : l'acheteur confirme la réception dans l'appli (sans code).
    // « Tout est conforme » → vendeur payé tout de suite ; sinon 24 h pour signaler un problème.
    // (Les anciennes versions de l'appli n'envoient pas « conform » : leur bouton voulait dire « tout est OK ».)
    if ((req.body || {}).conform === false) {
      // Si la poste a déjà dit « livré », les 24 h comptent depuis la livraison (pas de rallonge en confirmant tard)
      const from = order.carrier_delivered_at ? Math.min(Date.parse(order.carrier_delivered_at), Date.now()) : Date.now()
      const deadline = new Date(from + RECEIPT_CLAIM_HOURS * 3600_000).toISOString()
      const { data: rows } = await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: nowIso, buyer_confirmed_at: nowIso, claim_deadline: deadline, payout_scheduled_at: deadline })
        .eq('id', orderId).eq('status', 'shipped').eq('payout_status', 'held')
        .select('id')
      if (!rows || rows.length === 0) {
        res.status(409).json({ error: 'not_confirmable' })
        return
      }
      notifyUserT(order.seller_id, 'order_received', 'orderReceived', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
      res.json({ success: true, status: 'delivered', payout_status: 'held', claim_deadline: deadline })
      return
    }
    const updated = await releaseOrderPayout(orderId, {
      status: 'delivered',
      delivered_at: nowIso,
      buyer_confirmed_at: nowIso,
    }, 'shipped')
    if (!updated) {
      res.status(409).json({ error: 'not_confirmable' })
      return
    }
    notifyUserT(order.seller_id, 'payout_released', 'payoutReleased', { ref: shortOrderRef(orderId) }, { order_id: orderId }).catch(() => {})
    res.json({ success: true, status: 'delivered', payout_status: 'released' })
  } catch (err) {
    console.error('[fulfillment] confirm-receipt', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Réglages vendeur : retrait en main propre, prix d'envoi, délai de remise, WhatsApp
// =============================================
router.get('/api/seller/fulfillment-settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const [{ data: seller }, whatsapp, country] = await Promise.all([
      supabase.from('sellers').select('allow_pickup, pickup_area, post_price, shipping_delay_days').eq('id', userId).maybeSingle(),
      getUserWhatsapp(userId),
      getProfileCountry(userId),
    ])
    const suggestion = suggestedPostPrice(country)
    res.json({
      allow_pickup: !!seller?.allow_pickup,
      pickup_area: seller?.pickup_area || null,
      post_price: seller?.post_price != null ? Number(seller.post_price) : null,
      suggested_post_price: suggestion.price,
      currency: currencyForCountry(country),
      handover_delay_days: seller?.shipping_delay_days ?? HANDOVER_DELAY_DEFAULT_DAYS,
      handover_delay_allowed: HANDOVER_DELAY_ALLOWED_DAYS,
      whatsapp,
      country,
      dial_code: dialCodeForCountry(country),
    })
  } catch (err) {
    console.error('[fulfillment] settings get', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/api/seller/fulfillment-settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = SellerSettingsBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const userId = req.user!.id
    const body = parsed.data
    const country = await getProfileCountry(userId)
    const whatsapp = normalizeWhatsapp(body.whatsapp, country)
    if (!whatsapp) {
      res.status(400).json({ error: body.whatsapp.trim() ? 'invalid_whatsapp' : 'whatsapp_required' })
      return
    }
    const delay = body.handover_delay_days ?? HANDOVER_DELAY_DEFAULT_DAYS
    if (!HANDOVER_DELAY_ALLOWED_DAYS.includes(delay)) {
      res.status(400).json({ error: 'invalid_delay' })
      return
    }
    const row = {
      allow_pickup: body.allow_pickup,
      pickup_area: body.pickup_area || null,
      post_price: body.post_price ?? null,
      shipping_delay_days: delay,
    }
    const { data: existing } = await supabase.from('sellers').select('id').eq('id', userId).maybeSingle()
    const { error } = existing
      ? await supabase.from('sellers').update(row).eq('id', userId)
      : await supabase.from('sellers').insert({ id: userId, ...row })
    if (error) {
      console.error('[fulfillment] settings save', error.message)
      res.status(500).json({ error: 'Failed to save settings' })
      return
    }
    if (!(await saveUserWhatsapp(userId, whatsapp))) {
      res.status(500).json({ error: 'Failed to save WhatsApp number' })
      return
    }
    res.json({ ...row, whatsapp, handover_delay_days: delay })
  } catch (err) {
    console.error('[fulfillment] settings put', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Prix d'envoi suggéré pour un article (selon le pays du vendeur et le poids)
router.get('/api/shipping/suggested', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const weight = parseInt(String(req.query.weight_grams || ''), 10)
  const country = await getProfileCountry(req.user!.id)
  const s = suggestedPostPrice(country, Number.isFinite(weight) && weight > 0 ? weight : null)
  res.json({ price: s.price, currency: currencyForCountry(country) })
})

// Numéro WhatsApp de l'utilisateur connecté (jamais celui d'un autre)
router.get('/api/me/whatsapp', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const [whatsapp, country] = await Promise.all([getUserWhatsapp(userId), getProfileCountry(userId)])
  res.json({ whatsapp, country, dial_code: dialCodeForCountry(country) })
})

router.put('/api/me/whatsapp', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const country = await getProfileCountry(userId)
  const whatsapp = normalizeWhatsapp(req.body?.whatsapp, country)
  if (!whatsapp) {
    res.status(400).json({ error: 'invalid_whatsapp' })
    return
  }
  if (!(await saveUserWhatsapp(userId, whatsapp))) {
    res.status(500).json({ error: 'Failed to save WhatsApp number' })
    return
  }
  res.json({ whatsapp })
})

/** Vendeur sans numéro WhatsApp : bloque la mise en vente (création de live). */
export async function sellerHasWhatsapp(userId: string): Promise<boolean> {
  return !!(await getUserWhatsapp(userId))
}

export default router

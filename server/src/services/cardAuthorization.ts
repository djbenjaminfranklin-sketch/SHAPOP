// Autorisation de la carte du gagnant dès la fin de l'enchère.
// L'argent est RÉSERVÉ sur la carte (capture manuelle) : il n'est prélevé que lorsque l'acheteur
// a choisi la remise (main propre ou poste), pour le montant réel. Si la carte est refusée,
// l'écran du vendeur l'affiche et le vendeur peut réessayer.
// Tout ce qui parle à Stripe est ici : c'est ce module qu'il faudra adapter pour Rapyd.
import { isWiseSeller } from '../payments/provider'
import type Stripe from 'stripe'
import { supabase, stripe, ADMIN_EMAILS } from '../config'
import { calculateFees, notifyUserT } from '../utils'
import { localized, money } from '../i18n'
import { isPaidStatus } from '../fulfillment'
import { postPriceForOrder } from '../routes/fulfillment'
import { providerForSeller } from '../payments/provider'
import * as rapyd from '../payments/rapyd'
import * as awx from '../payments/airwallex'

export type AuthorizationStatus = 'authorized' | 'paid' | 'declined' | 'no_card' | 'error'
export type AuthorizationResult = { status: AuthorizationStatus; code?: string }

type OrderRow = {
  id: string
  buyer_id: string
  seller_id: string
  item_id: string | null
  amount: number | string
  status: string
  auth_payment_intent_id: string | null
  rapyd_payment_id?: string | null
  airwallex_intent_id?: string | null
}

/** Destination de l'argent : compte Stripe du vendeur, ou compte ShaPop (admin / PayPal). */
export async function sellerDestination(sellerId: string): Promise<{ ok: true; account: string | null } | { ok: false; code: string }> {
  const { data: seller } = await supabase
    .from('sellers')
    .select('stripe_account_id, bank_choice, paypal_email')
    .eq('id', sellerId)
    .maybeSingle()
  if (seller?.bank_choice === 'paypal' && seller?.paypal_email) return { ok: true, account: null }
  // Vendeur israélien payé par Wise : encaissement sur le compte ShaPop, virement quotidien ensuite
  if (await isWiseSeller(sellerId)) return { ok: true, account: null }
  const { data: sellerAuth } = await supabase.auth.admin.getUserById(sellerId)
  const email = sellerAuth?.user?.email
  if (email && ADMIN_EMAILS.includes(email)) return { ok: true, account: null }
  if (!seller?.stripe_account_id) return { ok: false, code: 'seller_not_ready' }
  const account = await stripe.accounts.retrieve(seller.stripe_account_id)
  if (!account.charges_enabled) return { ok: false, code: 'seller_not_ready' }
  return { ok: true, account: seller.stripe_account_id }
}

async function saveResult(orderId: string, fields: Record<string, unknown>) {
  await supabase
    .from('orders')
    .update({ ...fields, auth_updated_at: new Date().toISOString() })
    .eq('id', orderId)
}

/**
 * Réserve sur la carte du gagnant le prix de l'article + le tarif poste du vendeur
 * (le maximum possible ; on ne prélève ensuite que le montant réel).
 * Idempotent : une autorisation déjà valable est réutilisée.
 */
export async function authorizeOrderPayment(orderId: string, opts: { notifyBuyer?: boolean } = {}): Promise<AuthorizationResult> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, item_id, amount, status, auth_payment_intent_id, rapyd_payment_id, airwallex_intent_id')
    .eq('id', orderId)
    .maybeSingle<OrderRow>()
  if (!order) return { status: 'error', code: 'order_not_found' }
  if (isPaidStatus(order.status)) return { status: 'paid' }
  if (order.status !== 'pending_payment') return { status: 'error', code: 'order_closed' }

  // Israël → Rapyd ; autres pays → Stripe (suite de la fonction)
  const provider = await providerForSeller(order.seller_id)
  if (provider === 'airwallex') return authorizeWithAirwallex(order, opts)
  if (provider === 'rapyd') return authorizeWithRapyd(order, opts)

  // Une autorisation encore valable ? On la garde. Sinon on l'annule avant d'en refaire une.
  if (order.auth_payment_intent_id) {
    try {
      const prev = await stripe.paymentIntents.retrieve(order.auth_payment_intent_id)
      if (prev.status === 'requires_capture') return { status: 'authorized' }
      if (prev.status === 'succeeded') return { status: 'paid' }
      if (prev.status !== 'canceled') await stripe.paymentIntents.cancel(prev.id)
    } catch { /* déjà annulée ou introuvable */ }
  }

  const dest = await sellerDestination(order.seller_id)
  if (!dest.ok) {
    await saveResult(order.id, { auth_status: 'error', auth_error_code: dest.code })
    return { status: 'error', code: dest.code }
  }

  const info = await postPriceForOrder(order)
  const itemAmount = Number(order.amount)
  const holdAmount = Math.round((itemAmount + (info.postPrice || 0)) * 100) / 100
  const currency = String(info.currency || 'ILS').toLowerCase()

  const { data: buyer } = await supabase.from('profiles').select('stripe_customer_id').eq('id', order.buyer_id).maybeSingle()
  let paymentMethod: string | undefined
  if (buyer?.stripe_customer_id) {
    const pms = await stripe.paymentMethods.list({ customer: buyer.stripe_customer_id, type: 'card', limit: 1 })
    paymentMethod = pms.data[0]?.id
  }

  let result: AuthorizationResult
  let piId: string | null = null
  if (!buyer?.stripe_customer_id || !paymentMethod) {
    result = { status: 'no_card' }
  } else {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(holdAmount * 100),
      currency,
      customer: buyer.stripe_customer_id,
      payment_method: paymentMethod,
      payment_method_types: ['card'],
      capture_method: 'manual',
      off_session: true,
      confirm: true,
      metadata: {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        item_id: order.item_id || '',
        type: 'auction_auth',
      },
      description: `ShaPop - Order ${order.id} (authorization)`,
    }
    if (dest.account) {
      params.application_fee_amount = Math.max(50, Math.round(calculateFees(itemAmount).totalFees * 100))
      params.transfer_data = { destination: dest.account }
    }
    try {
      const pi = await stripe.paymentIntents.create(params)
      piId = pi.id
      result = pi.status === 'requires_capture' ? { status: 'authorized' } : { status: 'declined', code: pi.status }
    } catch (err: any) {
      piId = err?.payment_intent?.id || null
      if (err?.type === 'StripeCardError') {
        result = { status: 'declined', code: err.decline_code || err.code || 'card_declined' }
      } else {
        console.error('[cardAuthorization]', err?.message || err)
        result = { status: 'error', code: 'provider_error' }
      }
    }
  }

  await saveResult(order.id, {
    auth_payment_intent_id: piId,
    auth_status: result.status,
    auth_amount: result.status === 'authorized' ? holdAmount : null,
    auth_error_code: result.code || null,
    currency: info.currency,
  })

  if ((result.status === 'declined' || result.status === 'no_card') && opts.notifyBuyer !== false) {
    const { data: item } = order.item_id
      ? await supabase.from('items').select('title').eq('id', order.item_id).maybeSingle()
      : { data: null as { title: string | null } | null }
    await notifyUserT(order.buyer_id, 'card_declined', 'cardDeclined', {
      item: item?.title || localized('fallback.item'),
      amount: money(itemAmount, info.currency),
    }, { order_id: order.id }).catch(() => {}) // ouvre le détail de la commande (bouton « Payer »)
  }
  return result
}

/**
 * Prélève une autorisation existante pour le montant réel (≤ montant réservé).
 * Renvoie le paiement prélevé, ou null s'il faut repasser par un paiement classique.
 */
export async function captureAuthorizedPayment(
  authPaymentIntentId: string,
  amountCents: number,
  feeCents: number | null,
): Promise<Stripe.PaymentIntent | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(authPaymentIntentId)
    if (pi.status !== 'requires_capture') return null
    if (pi.amount_capturable < amountCents) {
      await stripe.paymentIntents.cancel(pi.id).catch(() => {})
      return null
    }
    const captured = await stripe.paymentIntents.capture(pi.id, {
      amount_to_capture: amountCents,
      ...(pi.transfer_data && feeCents != null ? { application_fee_amount: feeCents } : {}),
    })
    return captured.status === 'succeeded' ? captured : null
  } catch (err: any) {
    console.error('[cardAuthorization] capture', err?.message || err)
    return null
  }
}

/** Libère l'argent réservé (commande annulée). */
export async function releaseAuthorization(authPaymentIntentId: string | null | undefined): Promise<void> {
  if (!authPaymentIntentId) return
  try {
    const pi = await stripe.paymentIntents.retrieve(authPaymentIntentId)
    if (pi.status === 'requires_capture' || pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation' || pi.status === 'requires_action') {
      await stripe.paymentIntents.cancel(pi.id)
    }
  } catch { /* déjà libérée */ }
}

// ---------------------------------------------------------------------------
// Rapyd (Israël) : même logique — réserve sur la carte enregistrée du gagnant,
// prélevée au choix de la remise (captureRapydOrder), versée au vendeur à la remise.
// ---------------------------------------------------------------------------
async function authorizeWithRapyd(order: OrderRow, opts: { notifyBuyer?: boolean }): Promise<AuthorizationResult> {
  if (order.rapyd_payment_id) {
    try {
      const prev = await rapyd.getPayment(order.rapyd_payment_id)
      if (prev.status === 'CLO') return { status: 'paid' }
      if (prev.status === 'ACT' && !prev.captured) {
        if (prev.next_action === 'pending_capture') return { status: 'authorized' }
        await rapyd.cancelPayment(prev.id).catch(() => {})
      }
    } catch { /* introuvable : on refait */ }
  }
  const info = await postPriceForOrder(order)
  const itemAmount = Number(order.amount)
  const holdAmount = Math.round((itemAmount + (info.postPrice || 0)) * 100) / 100
  const currency = String(info.currency || 'ILS').toUpperCase()
  const { data: buyer } = await supabase.from('profiles').select('rapyd_customer_id').eq('id', order.buyer_id).maybeSingle()
  const customer = (buyer as { rapyd_customer_id?: string | null } | null)?.rapyd_customer_id

  let result: AuthorizationResult
  let paymentId: string | null = null
  if (!customer) {
    result = { status: 'no_card' }
  } else {
    try {
      const c = await rapyd.getCustomer(customer)
      if (!c?.default_payment_method) {
        result = { status: 'no_card' }
      } else {
        const p = await rapyd.authorizePayment({ amount: holdAmount, currency, customer, paymentMethod: c.default_payment_method, orderId: order.id, description: `ShaPop - Order ${order.id}` })
        paymentId = p.id
        result = (p.status === 'ACT' && p.next_action === 'pending_capture') ? { status: 'authorized' } : { status: 'declined', code: p.failure_code || p.next_action || p.status }
      }
    } catch (err: any) {
      if (err instanceof rapyd.RapydError && err.status >= 400 && err.status < 500) {
        result = { status: 'declined', code: err.errorCode || 'card_declined' }
      } else {
        console.error('[cardAuthorization] rapyd', err?.message || err)
        result = { status: 'error', code: 'provider_error' }
      }
    }
  }
  await saveResult(order.id, {
    payment_provider: 'rapyd',
    rapyd_payment_id: paymentId,
    auth_status: result.status,
    auth_amount: result.status === 'authorized' ? holdAmount : null,
    auth_error_code: result.code || null,
    currency: info.currency,
  })
  if ((result.status === 'declined' || result.status === 'no_card') && opts.notifyBuyer !== false) {
    const { data: item } = order.item_id
      ? await supabase.from('items').select('title').eq('id', order.item_id).maybeSingle()
      : { data: null as { title: string | null } | null }
    await notifyUserT(order.buyer_id, 'card_declined', 'cardDeclined', {
      item: item?.title || localized('fallback.item'),
      amount: money(itemAmount, info.currency),
    }, { order_id: order.id }).catch(() => {})
  }
  return result
}

/** Prélèvement Rapyd au choix de la remise. Renvoie true si la commande est payée. */
export async function captureRapydOrder(orderId: string, totalAmount: number): Promise<boolean> {
  const { data: order } = await supabase.from('orders').select('id, rapyd_payment_id').eq('id', orderId).maybeSingle()
  let paymentId = (order as { rapyd_payment_id?: string | null } | null)?.rapyd_payment_id || null
  if (!paymentId) {
    const r = await authorizeOrderPayment(orderId, { notifyBuyer: false })
    if (r.status !== 'authorized') return false
    const { data: again } = await supabase.from('orders').select('rapyd_payment_id').eq('id', orderId).maybeSingle()
    paymentId = (again as { rapyd_payment_id?: string | null } | null)?.rapyd_payment_id || null
    if (!paymentId) return false
  }
  try {
    let p = await rapyd.getPayment(paymentId)
    if (p.status === 'CLO') return true
    if (!(p.status === 'ACT' && p.next_action === 'pending_capture')) {
      // Autorisation refusée ou expirée : nouvel essai avec la carte actuelle
      const r = await authorizeOrderPayment(orderId, { notifyBuyer: false })
      if (r.status !== 'authorized') return false
      const { data: again } = await supabase.from('orders').select('rapyd_payment_id').eq('id', orderId).maybeSingle()
      paymentId = (again as { rapyd_payment_id?: string | null } | null)?.rapyd_payment_id || paymentId
    }
    p = await rapyd.capturePayment(paymentId!, totalAmount)
    return p.status === 'CLO'
  } catch (err: any) {
    console.error('[cardAuthorization] rapyd capture', err?.message || err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Airwallex (Israël) : réserve sur la carte enregistrée du gagnant (consentement « marchand »),
// prélevée au choix de la remise (captureAirwallexOrder), versée au vendeur à la remise.
// ---------------------------------------------------------------------------
async function notifyDeclined(order: OrderRow, currency: string) {
  const { data: item } = order.item_id
    ? await supabase.from('items').select('title').eq('id', order.item_id).maybeSingle()
    : { data: null as { title: string | null } | null }
  await notifyUserT(order.buyer_id, 'card_declined', 'cardDeclined', {
    item: item?.title || localized('fallback.item'),
    amount: money(Number(order.amount), currency),
  }, { order_id: order.id }).catch(() => {})
}

async function authorizeWithAirwallex(order: OrderRow, opts: { notifyBuyer?: boolean }): Promise<AuthorizationResult> {
  if (order.airwallex_intent_id) {
    try {
      const prev = await awx.getIntent(order.airwallex_intent_id)
      if (prev.status === 'REQUIRES_CAPTURE') return { status: 'authorized' }
      if (prev.status === 'SUCCEEDED') return { status: 'paid' }
      if (['REQUIRES_PAYMENT_METHOD', 'REQUIRES_CUSTOMER_ACTION'].includes(prev.status)) await awx.cancel(prev.id).catch(() => {})
    } catch { /* introuvable : on refait */ }
  }
  const info = await postPriceForOrder(order)
  const itemAmount = Number(order.amount)
  const holdAmount = Math.round((itemAmount + (info.postPrice || 0)) * 100) / 100
  const currency = String(info.currency || 'ILS').toUpperCase()
  const { data: buyer } = await supabase.from('profiles').select('airwallex_customer_id').eq('id', order.buyer_id).maybeSingle()
  const customerId = (buyer as { airwallex_customer_id?: string | null } | null)?.airwallex_customer_id

  let result: AuthorizationResult
  let intentId: string | null = null
  try {
    const consent = customerId ? await awx.latestVerifiedConsent(customerId) : null
    if (!customerId || !consent) {
      result = { status: 'no_card' }
    } else {
      const intent = await awx.authorize({ orderId: order.id, amount: holdAmount, currency, customerId, consent })
      intentId = intent.id
      result = intent.status === 'REQUIRES_CAPTURE' ? { status: 'authorized' }
        : intent.status === 'SUCCEEDED' ? { status: 'authorized' }
        : { status: 'declined', code: intent.latest_payment_attempt?.failure_code || intent.status }
    }
  } catch (err: any) {
    intentId = err?.intentId || intentId
    if (err instanceof awx.AirwallexError && err.status >= 400 && err.status < 500) {
      result = { status: 'declined', code: err.code || 'card_declined' }
    } else {
      console.error('[cardAuthorization] airwallex', err?.message || err)
      result = { status: 'error', code: 'provider_error' }
    }
  }
  await saveResult(order.id, {
    payment_provider: 'airwallex',
    airwallex_intent_id: intentId,
    auth_status: result.status,
    auth_amount: result.status === 'authorized' ? holdAmount : null,
    auth_error_code: result.code || null,
    currency: info.currency,
  })
  if ((result.status === 'declined' || result.status === 'no_card') && opts.notifyBuyer !== false) await notifyDeclined(order, info.currency)
  return result
}

/** Prélèvement Airwallex au choix de la remise. Renvoie true si la commande est payée. */
export async function captureAirwallexOrder(orderId: string, totalAmount: number): Promise<boolean> {
  const readIntent = async () => {
    const { data } = await supabase.from('orders').select('airwallex_intent_id').eq('id', orderId).maybeSingle()
    return (data as { airwallex_intent_id?: string | null } | null)?.airwallex_intent_id || null
  }
  try {
    let id = await readIntent()
    let intent = id ? await awx.getIntent(id).catch(() => null) : null
    if (intent?.status === 'SUCCEEDED') return true
    if (!intent || intent.status !== 'REQUIRES_CAPTURE' || Number(intent.amount) < totalAmount) {
      // Pas d'autorisation valable (refusée, expirée, montant trop bas) : nouvel essai avec la carte actuelle
      if (intent && intent.status === 'REQUIRES_CAPTURE') await awx.cancel(intent.id).catch(() => {})
      const r = await authorizeOrderPayment(orderId, { notifyBuyer: false })
      if (r.status !== 'authorized') return false
      id = await readIntent()
      if (!id) return false
    }
    const captured = await awx.capture(id!, totalAmount)
    return captured.status === 'SUCCEEDED' || Number(captured.captured_amount || 0) >= totalAmount
  } catch (err: any) {
    console.error('[cardAuthorization] airwallex capture', err?.message || err)
    return false
  }
}

/** Annule la réservation Airwallex d'une commande annulée. */
export async function releaseAirwallexAuthorization(intentId: string | null | undefined): Promise<void> {
  if (!intentId) return
  try {
    const i = await awx.getIntent(intentId)
    if (['REQUIRES_CAPTURE', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_CUSTOMER_ACTION'].includes(i.status)) await awx.cancel(i.id)
  } catch { /* déjà libérée */ }
}

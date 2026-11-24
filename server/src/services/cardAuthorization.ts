// Autorisation de la carte du gagnant dès la fin de l'enchère.
// L'argent est RÉSERVÉ sur la carte (capture manuelle) : il n'est prélevé que lorsque l'acheteur
// a choisi la remise (main propre ou poste), pour le montant réel. Si la carte est refusée,
// l'écran du vendeur l'affiche et le vendeur peut réessayer.
// Tout ce qui parle à Stripe est ici : c'est ce module qu'il faudra adapter pour Rapyd.
import type Stripe from 'stripe'
import { supabase, stripe, ADMIN_EMAILS } from '../config'
import { calculateFees, notifyUserT } from '../utils'
import { localized, money } from '../i18n'
import { isPaidStatus } from '../fulfillment'
import { postPriceForOrder } from '../routes/fulfillment'

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
}

/** Destination de l'argent : compte Stripe du vendeur, ou compte ShaPop (admin / PayPal). */
export async function sellerDestination(sellerId: string): Promise<{ ok: true; account: string | null } | { ok: false; code: string }> {
  const { data: seller } = await supabase
    .from('sellers')
    .select('stripe_account_id, bank_choice, paypal_email')
    .eq('id', sellerId)
    .maybeSingle()
  if (seller?.bank_choice === 'paypal' && seller?.paypal_email) return { ok: true, account: null }
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
    .select('id, buyer_id, seller_id, item_id, amount, status, auth_payment_intent_id')
    .eq('id', orderId)
    .maybeSingle<OrderRow>()
  if (!order) return { status: 'error', code: 'order_not_found' }
  if (isPaidStatus(order.status)) return { status: 'paid' }
  if (order.status !== 'pending_payment') return { status: 'error', code: 'order_closed' }

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

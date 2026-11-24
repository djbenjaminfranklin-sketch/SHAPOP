// Remboursement d'une commande, quel que soit le prestataire (Stripe ou Rapyd pour Israël).
import { supabase, stripe } from '../config'
import * as rapyd from './rapyd'
import * as awx from './airwallex'

/** Rembourse le paiement de la commande. Ne fait rien s'il n'y a pas de paiement. Lève une erreur en cas d'échec. */
export async function refundOrderPayment(orderId: string, opts: { reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' } = {}): Promise<boolean> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, payment_provider, stripe_payment_intent_id, rapyd_payment_id, airwallex_intent_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return false
  if (order.payment_provider === 'airwallex' && order.airwallex_intent_id) {
    const i = await awx.getIntent(order.airwallex_intent_id)
    if (i.status === 'REQUIRES_CAPTURE') await awx.cancel(i.id) // pas encore prélevé : on libère
    else await awx.refund(i.id, undefined, opts.reason)
    return true
  }
  if (order.payment_provider === 'rapyd' && order.rapyd_payment_id) {
    const p = await rapyd.getPayment(order.rapyd_payment_id)
    if (p.status === 'ACT') await rapyd.cancelPayment(p.id) // pas encore prélevé : on annule
    else await rapyd.createRefund({ payment: p.id, orderId, reason: opts.reason })
    return true
  }
  if (order.stripe_payment_intent_id) {
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id, ...(opts.reason ? { reason: opts.reason } : {}) })
    return true
  }
  return false
}

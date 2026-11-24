import { supabase, resend, ADMIN_EMAILS } from '../config'
import { transferToWallet } from '../payments/rapyd'
import { notifyUserT, calculateFees, escapeHtml } from '../utils'
import { HANDOVER_DELAY_DEFAULT_DAYS, generateHandoverCode, shortOrderRef } from '../fulfillment'

// =====================================================================
// Cycle de vie d'une commande : payée → (code ou 2 photos) → argent libéré.
// Utilisé par confirm-payment, le webhook Stripe et le débit automatique.
// La libération est un ÉTAT EN BASE (payout_status = 'released' + payout_released_at),
// indépendant du prestataire de paiement (Stripe aujourd'hui, prestataire israélien demain).
// =====================================================================

/**
 * Passe une commande en « payée » (une seule fois, même si appelée plusieurs fois),
 * fixe le délai de remise, génère le code à 4 chiffres pour un retrait en main propre,
 * crée la conversation acheteur-vendeur.
 */
export async function markOrderPaid(orderId: string): Promise<{ updated: boolean }> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, buyer_id, seller_id, amount, seller_payout, fulfillment_method, currency')
    .eq('id', orderId)
    .single()
  if (!order || order.status !== 'pending_payment') return { updated: false }

  let holdbackPercent = 0
  let payoutScheduledAt: string | null = null
  const { data: trust } = await supabase
    .from('seller_trust')
    .select('holdback_percent, payout_delay_days')
    .eq('seller_id', order.seller_id)
    .maybeSingle()
  if (trust) {
    holdbackPercent = trust.holdback_percent || 0
    payoutScheduledAt = new Date(Date.now() + (trust.payout_delay_days || 0) * 86400000).toISOString()
  }

  const { data: seller } = await supabase
    .from('sellers')
    .select('bank_choice, paypal_email, shipping_delay_days')
    .eq('id', order.seller_id)
    .maybeSingle()
  const payoutMethod = seller?.bank_choice === 'paypal' && seller?.paypal_email ? 'paypal' : 'stripe'
  const delayDays = seller?.shipping_delay_days ?? HANDOVER_DELAY_DEFAULT_DAYS
  const now = new Date()
  const handoverDeadline = new Date(now.getTime() + delayDays * 86400000).toISOString()

  // Passage atomique pending_payment → paid (évite le double traitement webhook + confirm)
  const { data: updatedRows } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      holdback_percent: holdbackPercent,
      payout_scheduled_at: payoutScheduledAt,
      payout_method: payoutMethod,
      payout_status: 'held',
      handover_deadline: handoverDeadline,
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id')
  if (!updatedRows || updatedRows.length === 0) return { updated: false }

  if (order.fulfillment_method === 'pickup') {
    await supabase
      .from('order_handover_codes')
      .upsert({ order_id: orderId, code: generateHandoverCode() }, { onConflict: 'order_id', ignoreDuplicates: true })
  }

  if (payoutMethod === 'paypal' && seller?.paypal_email) {
    const { data: existingPayout } = await supabase.from('paypal_payouts').select('id').eq('order_id', orderId).maybeSingle()
    if (!existingPayout) {
      await supabase.from('paypal_payouts').insert({
        order_id: orderId,
        seller_id: order.seller_id,
        paypal_email: seller.paypal_email,
        amount: order.seller_payout ?? calculateFees(order.amount).sellerPayout,
        currency: order.currency || 'ILS',
        status: 'pending',
      })
    }
  }

  const { data: existingConv } = await supabase.from('conversations').select('id').eq('order_id', orderId).maybeSingle()
  if (!existingConv) {
    await supabase.from('conversations').insert({
      type: 'order',
      order_id: orderId,
      participant_1: order.buyer_id,
      participant_2: order.seller_id,
    })
  }

  const { data: existingTrust } = await supabase.from('seller_trust').select('seller_id').eq('seller_id', order.seller_id).maybeSingle()
  if (!existingTrust) await supabase.from('seller_trust').insert({ seller_id: order.seller_id })
  const { data: existingScore } = await supabase.from('buyer_scores').select('user_id').eq('user_id', order.buyer_id).maybeSingle()
  if (!existingScore) await supabase.from('buyer_scores').insert({ user_id: order.buyer_id })

  const ref = shortOrderRef(orderId)
  if (order.fulfillment_method === 'pickup') {
    notifyUserT(order.seller_id, 'order_to_hand_over', { title: 'orderPaid.title', body: 'orderPaid.bodySellerPickup' },
      { ref, days: delayDays }, { order_id: orderId }).catch(() => {})
    notifyUserT(order.buyer_id, 'order_paid', { title: 'orderPaid.title', body: 'orderPaid.bodyBuyerPickup' },
      { ref }, { order_id: orderId }).catch(() => {})
  } else {
    notifyUserT(order.seller_id, 'order_to_ship', { title: 'orderPaid.title', body: 'orderPaid.bodySellerPost' },
      { ref, days: delayDays }, { order_id: orderId }).catch(() => {})
  }

  return { updated: true }
}

/**
 * Libère l'argent du vendeur (état en base) en même temps que la preuve.
 * Ne fait rien si la commande n'est plus « payée » (double appel, annulation…).
 */
export async function releaseOrderPayout(
  orderId: string,
  patch: Record<string, unknown>,
  fromStatus: string = 'paid',
): Promise<Record<string, unknown> | null> {
  const nowIso = new Date().toISOString()
  const { data: updated } = await supabase
    .from('orders')
    .update({ ...patch, payout_status: 'released', payout_released_at: nowIso })
    .eq('id', orderId)
    .eq('status', fromStatus)
    .eq('payout_status', 'held')
    .select('*')
  const row = updated && updated[0]
  if (!row) return null

  // Israël (Rapyd) : la part du vendeur passe du portefeuille ShaPop au sien
  if (row.payment_provider === 'rapyd') {
    try {
      const platform = (process.env.RAPYD_PLATFORM_EWALLET || '').trim()
      const { data: seller } = await supabase.from('sellers').select('rapyd_ewallet_id').eq('id', row.seller_id).maybeSingle()
      const dest = (seller as { rapyd_ewallet_id?: string | null } | null)?.rapyd_ewallet_id
      if (!platform || !dest) throw new Error(`portefeuille manquant (plateforme: ${!!platform}, vendeur: ${!!dest})`)
      await transferToWallet({ sourceEwallet: platform, destinationEwallet: dest, amount: Number(row.seller_payout), currency: String(row.currency || 'ILS').toUpperCase(), orderId })
    } catch (err) {
      console.error('[payout] rapyd', err)
      await alertAdmins('Versement Rapyd à faire à la main', `Commande ${orderId} : le transfert vers le portefeuille du vendeur a échoué (${(err as Error).message}).`)
    }
  }

  if (row.payout_method === 'paypal') {
    await supabase.from('paypal_payouts').update({ status: 'ready' }).eq('order_id', orderId).eq('status', 'pending')
  }

  const { data: trust } = await supabase.from('seller_trust').select('total_completed_orders, avg_ship_time_hours').eq('seller_id', row.seller_id).maybeSingle()
  if (trust) {
    const hours = row.paid_at ? (Date.now() - new Date(row.paid_at as string).getTime()) / 3600000 : 0
    const total = (trust.total_completed_orders || 0) + 1
    const avg = (((trust.avg_ship_time_hours || 0) * (trust.total_completed_orders || 0)) + hours) / total
    await supabase.from('seller_trust').update({
      total_completed_orders: total,
      avg_ship_time_hours: Math.round(avg * 10) / 10,
      updated_at: nowIso,
    }).eq('seller_id', row.seller_id)
  }
  return row
}

/**
 * Envoi postal : libère l'argent des commandes expédiées (2 photos envoyées) dont le délai
 * de sécurité est passé. Une commande en litige n'est plus « shipped » : elle est ignorée.
 */
export async function releaseDuePostPayouts(): Promise<number> {
  const { data: due } = await supabase
    .from('orders')
    .select('id, seller_id')
    .eq('status', 'shipped')
    .eq('fulfillment_method', 'post')
    .eq('payout_status', 'held')
    .not('proof_submitted_at', 'is', null)
    .lte('payout_scheduled_at', new Date().toISOString())
  let count = 0
  for (const o of due || []) {
    const row = await releaseOrderPayout(o.id, {}, 'shipped')
    if (row) {
      count++
      notifyUserT(o.seller_id, 'payout_released', 'payoutReleased', { ref: shortOrderRef(o.id) }, { order_id: o.id }).catch(() => {})
    }
  }
  return count
}

/** Alerte les administrateurs par e-mail (et dans les journaux du serveur). */
export async function alertAdmins(subject: string, text: string): Promise<void> {
  console.error(`[ADMIN ALERT] ${subject} — ${text}`)
  if (!resend) return
  try {
    await resend.emails.send({
      from: 'ShaPop <noreply@shapop.app>',
      to: ADMIN_EMAILS,
      subject: `[ShaPop admin] ${subject}`,
      html: `<p>${escapeHtml(text)}</p>`,
    })
  } catch (err) {
    console.error('[alertAdmins] email failed:', err)
  }
}

/** Numéro WhatsApp (format international) d'un utilisateur, ou null. Jamais public. */
export async function getUserWhatsapp(userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_contacts').select('whatsapp').eq('user_id', userId).maybeSingle()
  return data?.whatsapp || null
}

export async function saveUserWhatsapp(userId: string, whatsapp: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_contacts')
    .upsert({ user_id: userId, whatsapp, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) console.error('[saveUserWhatsapp]', error.message)
  return !error
}

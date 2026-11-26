import { supabase, resend, ADMIN_EMAILS } from '../config'
import { transferToWallet } from '../payments/rapyd'
import { transferToBeneficiary } from '../payments/airwallex'
import { isWiseSeller } from '../payments/provider'
import { notifyUserT, calculateFees, escapeHtml } from '../utils'
import { HANDOVER_DELAY_DEFAULT_DAYS, generateHandoverCode, shortOrderRef } from '../fulfillment'
import { isLuxuryItem, penaltyDeduction } from '../luxury'

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
    .select('id, status, buyer_id, seller_id, item_id, amount, seller_payout, fulfillment_method, currency')
    .eq('id', orderId)
    .single()
  if (!order || order.status !== 'pending_payment') return { updated: false }

  // Article de luxe (prix ≥ 500 € ou l'équivalent, grande marque, case cochée) : versement 30 jours après la réception
  const isLuxury = await orderIsLuxury(order)

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
  const payoutMethod = (await isWiseSeller(order.seller_id)) ? 'wise' : seller?.bank_choice === 'paypal' && seller?.paypal_email ? 'paypal' : 'stripe'
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
      is_luxury: isLuxury,
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
 * La commande porte-t-elle sur un article de luxe ?
 * Le seuil de 500 € s'applique au prix d'UN SEUL article (départ, achat immédiat ou prix final de cet
 * article), jamais au total de la commande ni à un panier : plusieurs articles bon marché ne font pas du luxe.
 */
export async function orderIsLuxury(order: { item_id?: string | null; currency?: string | null; is_luxury?: boolean | null }): Promise<boolean> {
  if (order.is_luxury) return true
  if (!order.item_id) return false
  const { data: item } = await supabase.from('items').select('title, description, brand, is_luxury, starting_price, buy_now_price, current_price').eq('id', order.item_id).maybeSingle()
  if (!item) return false
  return isLuxuryItem({
    prices: [item.starting_price, item.buy_now_price, item.current_price],
    currency: order.currency,
    title: item.title, brand: item.brand, description: item.description, declared: item.is_luxury,
  })
}

/**
 * Pénalité pour contrefaçon en attente : prélevée sur ce versement (même devise seulement).
 * Renvoie le montant retenu (0 sinon). Le versement net = seller_payout - penalty_deducted.
 */
async function deductPendingPenalty(row: Record<string, unknown>): Promise<number> {
  const { data: seller } = await supabase.from('sellers').select('penalty_due, penalty_currency').eq('id', row.seller_id as string).maybeSingle()
  const s = seller as { penalty_due?: number | string | null; penalty_currency?: string | null } | null
  if (!s || !(Number(s.penalty_due) > 0)) return 0
  if (s.penalty_currency && String(s.penalty_currency).toUpperCase() !== String(row.currency || '').toUpperCase()) return 0
  const cut = penaltyDeduction(row.seller_payout as number, s.penalty_due)
  if (cut <= 0) return 0
  const left = Math.round((Number(s.penalty_due) - cut) * 100) / 100
  await supabase.from('sellers').update({ penalty_due: left }).eq('id', row.seller_id as string)
  await supabase.from('orders').update({ penalty_deducted: cut }).eq('id', row.id as string)
  row.penalty_deducted = cut
  if (row.payout_method === 'paypal') {
    await supabase.from('paypal_payouts').update({ amount: Math.round((Number(row.seller_payout) - cut) * 100) / 100 }).eq('order_id', row.id as string)
  }
  // Stripe Connect : la part du vendeur lui a déjà été transférée au paiement, l'équipe la récupère à la main
  if (row.payout_method === 'stripe' && !['airwallex', 'rapyd'].includes(String(row.payment_provider || ''))) {
    alertAdmins('Pénalité contrefaçon à récupérer', `Commande ${row.id} : ${cut} ${row.currency} de pénalité à reprendre sur le compte Stripe du vendeur ${row.seller_id}.`).catch(() => {})
  }
  return cut
}

/** Montant réellement versé au vendeur (part du vendeur moins la pénalité retenue). */
export function netSellerPayout(row: { seller_payout?: number | string | null; penalty_deducted?: number | string | null }): number {
  return Math.round((Number(row.seller_payout || 0) - Number(row.penalty_deducted || 0)) * 100) / 100
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

  // Contrefaçon confirmée sur une vente précédente : la pénalité est retenue sur ce versement
  await deductPendingPenalty(row).catch(err => console.error('[payout] penalty', err))

  // Israël (Airwallex) : virement en shekels sur le compte bancaire israélien du vendeur
  if (row.payment_provider === 'airwallex') {
    try {
      const { data: seller } = await supabase.from('sellers').select('airwallex_beneficiary_id').eq('id', row.seller_id).maybeSingle()
      const ben = (seller as { airwallex_beneficiary_id?: string | null } | null)?.airwallex_beneficiary_id
      if (!ben) throw new Error('compte bancaire du vendeur manquant')
      const t = await transferToBeneficiary({ beneficiaryId: ben, amount: netSellerPayout(row), currency: String(row.currency || 'ILS').toUpperCase(), orderId })
      await supabase.from('orders').update({ payout_transfer_id: t.id }).eq('id', orderId)
    } catch (err) {
      console.error('[payout] airwallex', err)
      await alertAdmins('Versement Airwallex à faire à la main', `Commande ${orderId} : le virement au vendeur a échoué (${(err as Error).message}).`)
    }
  }

  // Israël (Rapyd) : la part du vendeur passe du portefeuille ShaPop au sien
  if (row.payment_provider === 'rapyd') {
    try {
      const platform = (process.env.RAPYD_PLATFORM_EWALLET || '').trim()
      const { data: seller } = await supabase.from('sellers').select('rapyd_ewallet_id').eq('id', row.seller_id).maybeSingle()
      const dest = (seller as { rapyd_ewallet_id?: string | null } | null)?.rapyd_ewallet_id
      if (!platform || !dest) throw new Error(`portefeuille manquant (plateforme: ${!!platform}, vendeur: ${!!dest})`)
      await transferToWallet({ sourceEwallet: platform, destinationEwallet: dest, amount: netSellerPayout(row), currency: String(row.currency || 'ILS').toUpperCase(), orderId })
    } catch (err) {
      console.error('[payout] rapyd', err)
      await alertAdmins('Versement Rapyd à faire à la main', `Commande ${orderId} : le transfert vers le portefeuille du vendeur a échoué (${(err as Error).message}).`)
    }
  }

  // Israël (Wise) : la vente part dans le lot de virements du jour (vérifié, puis validé par Benjamin)
  if (row.payout_method === 'wise') {
    await supabase.from('orders').update({ wise_status: 'queued' }).eq('id', orderId).is('wise_transfer_id', null)
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
    .select('id, seller_id, status, buyer_confirmed_at, carrier_tracker_id, carrier_delivered_at, carrier_alerted_at')
    .in('status', ['shipped', 'delivered'])
    .eq('fulfillment_method', 'post')
    .eq('payout_status', 'held')
    .not('proof_submitted_at', 'is', null)
    .lte('payout_scheduled_at', new Date().toISOString())
  let count = 0
  const { carrierAllowsRelease } = await import('./parcelTracking')
  const { sellerRestricted } = await import('./sanctions')
  for (const o of due || []) {
    // Avec le suivi transporteur branché : la poste doit dire « livré » (sinon l'équipe vérifie)
    if (!(await carrierAllowsRelease(o))) continue
    // Vendeur sanctionné (2e litige perdu) : jamais de versement sans réception (confirmée ou « livré » de la poste)
    if (!o.buyer_confirmed_at && !o.carrier_delivered_at && (await sellerRestricted(o.seller_id))) continue
    const row = await releaseOrderPayout(o.id, {}, o.status)
    if (row) {
      count++
      notifyUserT(o.seller_id, 'payout_released', 'payoutReleased', { ref: shortOrderRef(o.id) }, { order_id: o.id }).catch(() => {})
    }
  }

  // Luxe remis en main propre : versement 30 jours après la remise (code saisi)
  const { data: luxPickups } = await supabase
    .from('orders')
    .select('id, seller_id, status')
    .eq('status', 'handed_over')
    .eq('fulfillment_method', 'pickup')
    .eq('payout_status', 'held')
    .eq('is_luxury', true)
    .lte('payout_scheduled_at', new Date().toISOString())
  for (const o of luxPickups || []) {
    const row = await releaseOrderPayout(o.id, {}, 'handed_over')
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

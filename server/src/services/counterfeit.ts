// Contrefaçons d'articles de luxe : traitement AUTOMATIQUE (28/11/2026, demande de Benjamin).
// 1. Signalement de l'acheteur (preuves, 30 jours après réception) -> annonce retirée, versement bloqué,
//    vendeur prévenu avec les motifs et un délai de réponse (DSA art. 17 : exposé des motifs).
// 2. Le vendeur reconnaît -> contrefaçon retenue. Il ne répond pas dans le délai -> contrefaçon retenue.
//    Il conteste avec ses preuves -> une personne de l'équipe examine (aucune pénalité automatique).
// 3. Contrefaçon retenue : acheteur remboursé (port compris), pénalité de 50 % du prix (plafonnée au prix)
//    retenue sur ce que ShaPop doit au vendeur, compte fermé, annonces retirées, preuves conservées.
import { supabase, stripe } from '../config'
import { refundOrderPayment } from '../payments/refunds'
import { logAdminAction, notifyUserT } from '../utils'
import { counterfeitPenalty } from '../luxury'
import { alertAdmins, netSellerPayout } from './orderLifecycle'
import { banAccount } from './accountBan'

export const COUNTERFEIT_REPLY_DAYS = 7
export const COUNTERFEIT_REMINDER_BEFORE_DAYS = 2
// Acteur des décisions automatiques dans le journal (aucun administrateur humain)
export const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000'

const refOf = (orderId: string) => String(orderId).slice(0, 8).toUpperCase()
const dateFr = (iso: string) => iso.slice(0, 10)

/** Étape 1 : à l'ouverture d'un litige « contrefaçon » sur un article de luxe. */
export async function openCounterfeitCase(disputeId: string): Promise<void> {
  const { data: d } = await supabase.from('disputes').select('id, order_id, buyer_id, seller_id').eq('id', disputeId).single()
  if (!d) return
  const { data: order } = await supabase.from('orders').select('id, item_id, payout_status').eq('id', d.order_id).single()
  if (!order) return
  const now = new Date()
  const deadline = new Date(now.getTime() + COUNTERFEIT_REPLY_DAYS * 86400000).toISOString()

  // Annonce retirée (réversible si la contrefaçon n'est pas retenue)
  if (order.item_id) {
    await supabase.from('items').update({
      moderation_status: 'removed', moderated_at: now.toISOString(), moderated_by: null, moderation_reason: 'counterfeit_report',
    }).eq('id', order.item_id)
  }
  // Versement bloqué tant que le litige n'est pas tranché (s'il n'est pas déjà parti)
  if (order.payout_status !== 'released' && order.payout_status !== 'cancelled') {
    await supabase.from('orders').update({ payout_status: 'held' }).eq('id', order.id)
  }
  await supabase.from('disputes').update({ status: 'under_review', counterfeit_reply_deadline: deadline }).eq('id', disputeId)

  const ref = refOf(order.id)
  notifyUserT(d.seller_id, 'counterfeit_reported', 'counterfeitReported', { ref, date: dateFr(deadline) }, { order_id: order.id, dispute_id: disputeId }).catch(() => {})
  notifyUserT(d.buyer_id, 'counterfeit_reported', 'counterfeitReportedBuyer', { ref, date: dateFr(deadline) }, { order_id: order.id, dispute_id: disputeId }).catch(() => {})
}

export type SellerAnswer = { accept: boolean; message: string; proof_urls: string[] }

/** Étape 2 : réponse du vendeur. Renvoie l'issue. */
export async function sellerAnswersCounterfeit(disputeId: string, sellerId: string, a: SellerAnswer): Promise<'not_found' | 'forbidden' | 'closed' | 'confirmed' | 'contested'> {
  const { data: d } = await supabase.from('disputes').select('*').eq('id', disputeId).maybeSingle()
  if (!d || d.reason !== 'counterfeit') return 'not_found'
  if (d.seller_id !== sellerId) return 'forbidden'
  if (d.status !== 'under_review' || d.counterfeit_confirmed_at || d.seller_response_at) return 'closed'
  const now = new Date().toISOString()
  await supabase.from('disputes').update({
    seller_response: a.message.slice(0, 2000), seller_response_at: now, seller_accepted: a.accept,
    seller_proof_urls: a.proof_urls.slice(0, 5),
    ...(a.accept ? {} : { status: 'escalated' }),
  }).eq('id', disputeId)
  if (a.accept) {
    await confirmCounterfeit(disputeId, SYSTEM_ACTOR, 'automatique', 'Contrefaçon reconnue par le vendeur', 'seller_accepted')
    return 'confirmed'
  }
  // Contestation : seul cas examiné par une personne (pas de pénalité sans examen des preuves)
  const { data: order } = await supabase.from('orders').select('id, buyer_id').eq('id', d.order_id).single()
  if (order) {
    notifyUserT(order.buyer_id, 'counterfeit_contested', 'counterfeitContested', { ref: refOf(order.id) }, { order_id: order.id, dispute_id: disputeId }).catch(() => {})
  }
  alertAdmins('Contrefaçon contestée : à examiner', `Litige ${disputeId} (commande ${d.order_id}) : le vendeur conteste avec ses preuves. Versement bloqué en attendant ta décision (page Litiges de l'admin).`).catch(() => {})
  return 'contested'
}

/** Étape 3 : contrefaçon retenue (admin, aveu du vendeur, ou absence de réponse). Même effet dans les 3 cas. */
export async function confirmCounterfeit(
  disputeId: string, actorId: string, actorEmail: string, note: string | null,
  cause: 'admin' | 'seller_accepted' | 'no_reply',
): Promise<{ status: 'not_found' | 'already_confirmed' } | { status: 'ok'; refunded: boolean; penalty: number; penalty_due: number; currency: string | null }> {
  const { data: dispute } = await supabase.from('disputes').select('*').eq('id', disputeId).single()
  if (!dispute) return { status: 'not_found' }
  if (dispute.counterfeit_confirmed_at) return { status: 'already_confirmed' }
  const { data: order } = await supabase.from('orders').select('*').eq('id', dispute.order_id).single()
  if (!order) return { status: 'not_found' }
  const now = new Date().toISOString()
  const human = cause === 'admin' ? actorId : null

  // 1. Remboursement complet de l'acheteur (le paiement couvre l'article ET le port)
  let refunded = order.status === 'refunded'
  if (!refunded) {
    try { refunded = await refundOrderPayment(order.id) } catch (err) {
      console.error('[counterfeit] refund', order.id, (err as Error).message)
    }
    if (order.shipping_payment_intent_id) {
      try { await stripe.refunds.create({ payment_intent: order.shipping_payment_intent_id }) } catch (err) {
        console.error('[counterfeit] shipping refund', order.id, (err as Error).message)
      }
    }
    if (!refunded) alertAdmins('Remboursement contrefaçon à faire à la main', `Commande ${order.id} : le remboursement automatique de l'acheteur a échoué.`).catch(() => {})
  }

  // 2. Pénalité de 50 % du prix, plafonnée au prix (+ ce qui aurait déjà été versé au vendeur pour cette vente)
  const penalty = Math.min(counterfeitPenalty(order.amount), Number(order.amount) || 0)
  const alreadyPaid = order.payout_status === 'released' ? netSellerPayout(order) : 0
  const { data: seller } = await supabase.from('sellers').select('penalty_due, penalty_currency').eq('id', order.seller_id).maybeSingle()
  const due = Math.round((Number(seller?.penalty_due || 0) + penalty + alreadyPaid) * 100) / 100
  if (seller) {
    await supabase.from('sellers').update({ penalty_due: due, penalty_currency: seller.penalty_currency || order.currency || null, sanction_level: 3 }).eq('id', order.seller_id)
  }
  if (alreadyPaid > 0) {
    alertAdmins('Contrefaçon : vendeur déjà payé', `Commande ${order.id} : ${alreadyPaid} ${order.currency} déjà versés au vendeur ${order.seller_id}, ajoutés à sa dette (${due} ${order.currency}).`).catch(() => {})
  }
  await supabase.from('orders').update({ status: 'refunded', payout_status: 'cancelled', counterfeit_penalty: penalty }).eq('id', order.id)

  // 3. Litige tranché pour l'acheteur, preuves conservées
  const reasonText = cause === 'no_reply' ? 'Contrefaçon retenue : pas de réponse du vendeur dans le délai'
    : cause === 'seller_accepted' ? 'Contrefaçon reconnue par le vendeur' : (note || 'Contrefaçon confirmée par l\'équipe')
  await supabase.from('disputes').update({
    status: 'resolved_buyer', resolution_note: reasonText, resolved_at: now, counterfeit_confirmed_at: now, evidence_retained: true,
  }).eq('id', disputeId)

  // 4. Fermeture définitive du compte du vendeur + annonces retirées
  await banAccount(order.seller_id, human, `Contrefaçon retenue (commande ${order.id})`)
  await supabase.from('items')
    .update({ moderation_status: 'removed', moderated_at: now, moderated_by: human, moderation_reason: 'counterfeit_seller_banned' })
    .eq('seller_id', order.seller_id)
    .in('status', ['draft', 'pending', 'active'])

  // 5. Statistiques
  const { data: st } = await supabase.from('seller_trust').select('disputes_lost').eq('seller_id', order.seller_id).maybeSingle()
  if (st) await supabase.from('seller_trust').update({ disputes_lost: (st.disputes_lost || 0) + 1, updated_at: now }).eq('seller_id', order.seller_id)
  const { data: bs } = await supabase.from('buyer_scores').select('disputes_won, total_refunds, refund_amount').eq('user_id', order.buyer_id).maybeSingle()
  if (bs) {
    await supabase.from('buyer_scores').update({
      disputes_won: (bs.disputes_won || 0) + 1, total_refunds: (bs.total_refunds || 0) + 1,
      refund_amount: Number(bs.refund_amount || 0) + Number(order.amount || 0), updated_at: now,
    }).eq('user_id', order.buyer_id)
  }

  const ref = refOf(order.id)
  notifyUserT(order.buyer_id, 'counterfeit_confirmed', 'counterfeitBuyer', { ref }, { order_id: order.id }).catch(() => {})
  notifyUserT(order.seller_id, 'account_closed', 'counterfeitSeller', { ref }, { order_id: order.id }).catch(() => {})

  // Trace complète (preuves comprises) dans le journal
  await logAdminAction(actorId, actorEmail, 'counterfeit_confirmed', 'dispute', disputeId, {
    cause, note, order_id: order.id, seller_id: order.seller_id, buyer_id: order.buyer_id,
    refunded, penalty, already_paid: alreadyPaid, penalty_due: due, currency: order.currency,
    evidence: { photo_urls: dispute.photo_urls || [], evidence_urls: dispute.evidence_urls || [], seller_photo_urls: dispute.seller_photo_urls || [],
      seller_proof_urls: dispute.seller_proof_urls || [], seller_response: dispute.seller_response || null,
      proof_parcel_path: order.proof_parcel_path || null, proof_slip_path: order.proof_slip_path || null, tracking_number: order.tracking_number || null },
  })
  return { status: 'ok', refunded, penalty, penalty_due: due, currency: order.currency || null }
}

/** Tâche planifiée : rappel 2 jours avant la fin du délai, puis contrefaçon retenue si toujours pas de réponse. */
export async function processCounterfeitDeadlines(now = Date.now()): Promise<{ reminded: number; confirmed: number }> {
  const { data: open } = await supabase.from('disputes')
    .select('id, order_id, seller_id, counterfeit_reply_deadline, counterfeit_reminded_at, seller_response_at, counterfeit_confirmed_at, status')
    .eq('reason', 'counterfeit').eq('status', 'under_review').not('counterfeit_reply_deadline', 'is', null)
  let reminded = 0, confirmed = 0
  for (const d of (open || []) as Array<{ id: string; order_id: string; seller_id: string; counterfeit_reply_deadline: string; counterfeit_reminded_at: string | null; seller_response_at: string | null; counterfeit_confirmed_at: string | null }>) {
    if (d.seller_response_at || d.counterfeit_confirmed_at) continue
    const deadline = Date.parse(d.counterfeit_reply_deadline)
    if (now >= deadline) {
      const r = await confirmCounterfeit(d.id, SYSTEM_ACTOR, 'automatique', null, 'no_reply')
      if (r.status === 'ok') confirmed++
    } else if (!d.counterfeit_reminded_at && now >= deadline - COUNTERFEIT_REMINDER_BEFORE_DAYS * 86400000) {
      await supabase.from('disputes').update({ counterfeit_reminded_at: new Date(now).toISOString() }).eq('id', d.id)
      notifyUserT(d.seller_id, 'counterfeit_reminder', 'counterfeitReminder', { ref: refOf(d.order_id), date: dateFr(d.counterfeit_reply_deadline) }, { order_id: d.order_id, dispute_id: d.id }).catch(() => {})
      reminded++
    }
  }
  return { reminded, confirmed }
}

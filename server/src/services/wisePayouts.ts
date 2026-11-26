// Lot quotidien de virements Wise aux vendeurs israéliens (décision du 25/11/2026).
// 1. Les ventes acceptées (24 h sans plainte, ou 10 jours après l'envoi) passent en wise_status « queued »
//    au moment où l'argent est libéré (releaseOrderPayout).
// 2. Une fois par jour, chaque vente est VÉRIFIÉE (vente acceptée, montant juste, IBAN du vendeur
//    inchangé depuis 24 h, pas de double paiement, ni litige ni sanction). Une vente suspecte est
//    retirée du lot avec son motif.
// 3. Le lot est préparé chez Wise ; Benjamin le finance et le valide lui-même dans l'appli Wise.
// 4. Un message court résume le lot pour qu'il sache s'il peut valider.
import { supabase, resend, ADMIN_EMAILS } from '../config'
import { escapeHtml } from '../utils'
import { shortOrderRef } from '../fulfillment'
import { normalizeIsraeliIban } from '../payments/airwallex'
import * as wise from '../payments/wise'

export const IBAN_COOLDOWN_HOURS = 24
const ACCEPTED_STATUSES = new Set(['delivered', 'shipped', 'handed_over'])

export type WiseOrder = {
  id: string; seller_id: string; status: string; payout_status: string; payout_method: string | null
  wise_status: string | null; wise_transfer_id: string | null; currency: string | null
  total_amount: number | null; platform_fee: number | null; processing_fee: number | null; seller_payout: number | null
  promotion_id?: string | null; promo_code_id?: string | null
  /** Pénalité pour contrefaçon retenue sur cette vente (versement net = seller_payout - penalty_deducted) */
  penalty_deducted?: number | null
}
export type WiseSeller = {
  id: string; payout_iban: string | null; payout_holder_name: string | null; payout_iban_updated_at: string | null
  wise_recipient_id: string | null; sanction_level?: number | null; sanction_until?: string | null
}
/** Résultat du contrôle : « ok », « attendre » (on réessaie demain) ou « retirer » (l'équipe regarde). */
export type Check = { verdict: 'ok' } | { verdict: 'wait' | 'exclude'; reason: string }

/** Contrôle d'une vente avant de l'ajouter au lot. Fonction pure : testée à part. */
export function checkWisePayout(o: WiseOrder, s: WiseSeller | null, ctx: { openDispute: boolean; sellerBanned: boolean; now?: number }): Check {
  const now = ctx.now ?? Date.now()
  if (o.payout_method !== 'wise' || o.payout_status !== 'released' || !ACCEPTED_STATUSES.has(o.status)) return { verdict: 'exclude', reason: 'Vente pas acceptée (statut ' + o.status + ')' }
  if (o.wise_transfer_id || o.wise_status !== 'queued') return { verdict: 'exclude', reason: 'Déjà payé ou déjà dans un lot (double paiement évité)' }
  if (ctx.openDispute) return { verdict: 'exclude', reason: 'Litige en cours' }
  if (ctx.sellerBanned) return { verdict: 'exclude', reason: 'Vendeur banni' }
  if (s && Number(s.sanction_level || 0) >= 2 && s.sanction_until && Date.parse(s.sanction_until) > now) return { verdict: 'exclude', reason: 'Vendeur sanctionné' }
  if (String(o.currency || '').toUpperCase() !== 'ILS') return { verdict: 'exclude', reason: `Devise ${o.currency} (attendu ILS)` }
  const payout = Number(o.seller_payout)
  const total = Number(o.total_amount)
  if (!(payout > 0) || !(total > 0) || payout > total) return { verdict: 'exclude', reason: `Montant incohérent (${payout} ₪ sur ${total} ₪)` }
  const expected = Math.round((total - Number(o.platform_fee || 0) - Number(o.processing_fee || 0)) * 100) / 100
  if (!o.promotion_id && !o.promo_code_id && Math.abs(expected - payout) > 0.02) return { verdict: 'exclude', reason: `Montant faux : ${payout} ₪ au lieu de ${expected} ₪ (commission déduite)` }
  if (!(payout - Number(o.penalty_deducted || 0) > 0)) return { verdict: 'exclude', reason: 'Versement entièrement retenu (pénalité pour contrefaçon)' }
  if (!s?.payout_iban || !normalizeIsraeliIban(s.payout_iban)) return { verdict: 'wait', reason: 'IBAN du vendeur manquant ou invalide' }
  if (!s.payout_holder_name) return { verdict: 'wait', reason: 'Nom du titulaire du compte manquant' }
  if (!s.payout_iban_updated_at || now - Date.parse(s.payout_iban_updated_at) < IBAN_COOLDOWN_HOURS * 3600000) return { verdict: 'wait', reason: 'IBAN modifié il y a moins de 24 h' }
  return { verdict: 'ok' }
}

const fmtIls = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' ₪'

async function sendDailyMessage(subject: string, lines: string[]) {
  console.log(`[wise] ${subject}\n${lines.join('\n')}`)
  if (!resend) return
  try {
    await resend.emails.send({
      from: 'ShaPop <noreply@shapop.app>', to: ADMIN_EMAILS, subject: `[ShaPop] ${subject}`,
      html: `<p><strong>${escapeHtml(subject)}</strong></p>${lines.length ? `<ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}<p>Ouvre l'appli Wise pour financer et valider le lot.</p>`,
    })
  } catch (err) {
    console.error('[wise] message', err)
  }
}

/** Prépare le lot du jour. Retourne le résumé (aussi envoyé par e-mail). */
export async function prepareWiseBatch(): Promise<{ count: number; total: number; excluded: { ref: string; reason: string }[]; waiting: { ref: string; reason: string }[] } | null> {
  if (!wise.wiseConfig().enabled) return null
  // Une seule fois par jour
  const since = new Date(Date.now() - 20 * 3600000).toISOString()
  const { data: recent } = await supabase.from('wise_batches').select('id').gte('created_at', since).limit(1)
  if (recent && recent.length) return null

  await syncPaidTransfers().catch(err => console.error('[wise] sync', err))

  const { data: queued } = await supabase.from('orders')
    .select('id, seller_id, status, payout_status, payout_method, wise_status, wise_transfer_id, currency, total_amount, platform_fee, processing_fee, seller_payout, penalty_deducted, promotion_id, promo_code_id')
    .eq('payout_method', 'wise').eq('wise_status', 'queued')
  const orders = (queued || []) as WiseOrder[]
  if (!orders.length) return null

  const ok: { o: WiseOrder; s: WiseSeller }[] = []
  const excluded: { ref: string; reason: string }[] = []
  const waiting: { ref: string; reason: string }[] = []
  for (const o of orders) {
    const [{ data: seller }, { data: profile }, { count: disputes }] = await Promise.all([
      supabase.from('sellers').select('id, payout_iban, payout_holder_name, payout_iban_updated_at, wise_recipient_id, sanction_level, sanction_until').eq('id', o.seller_id).maybeSingle(),
      supabase.from('profiles').select('is_banned').eq('id', o.seller_id).maybeSingle(),
      supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('order_id', o.id).eq('status', 'under_review'),
    ])
    const c = checkWisePayout(o, seller as WiseSeller | null, { openDispute: (disputes || 0) > 0, sellerBanned: !!(profile as { is_banned?: boolean } | null)?.is_banned })
    if (c.verdict === 'ok') ok.push({ o, s: seller as WiseSeller })
    else if (c.verdict === 'wait') waiting.push({ ref: shortOrderRef(o.id), reason: c.reason })
    else {
      excluded.push({ ref: shortOrderRef(o.id), reason: c.reason })
      await supabase.from('orders').update({ wise_status: 'excluded', wise_excluded_reason: c.reason }).eq('id', o.id).eq('wise_status', 'queued')
    }
  }

  const { data: batchRow } = await supabase.from('wise_batches').insert({ status: 'preparing', created_at: new Date().toISOString(), excluded: [...excluded, ...waiting] }).select('id').single()
  const batchRowId = (batchRow as { id: string } | null)?.id || null
  let total = 0
  let count = 0
  try {
    if (ok.length) {
      const day = new Date().toISOString().slice(0, 10)
      const group = await wise.createBatchGroup(`ShaPop vendeurs ${day}`)
      for (const { o, s } of ok) {
        try {
          let recipientId = s.wise_recipient_id
          if (!recipientId) {
            recipientId = await wise.createIlsRecipient({ holderName: s.payout_holder_name!, iban: normalizeIsraeliIban(s.payout_iban!)! })
            await supabase.from('sellers').update({ wise_recipient_id: recipientId }).eq('id', s.id)
          }
          // Pénalité pour contrefaçon éventuelle déjà retenue sur cette vente
          const amount = Math.round((Number(o.seller_payout) - Number(o.penalty_deducted || 0)) * 100) / 100
          const quoteId = await wise.createQuote(amount, recipientId)
          const transferId = await wise.addBatchTransfer(group.id, { recipientId, quoteId, orderId: o.id, reference: `ShaPop ${shortOrderRef(o.id)}` })
          await supabase.from('orders').update({ wise_status: 'in_batch', wise_batch_id: batchRowId, wise_transfer_id: transferId, wise_excluded_reason: null }).eq('id', o.id).eq('wise_status', 'queued')
          total += amount
          count++
        } catch (err) {
          const reason = `Refusé par Wise : ${(err as Error).message}`
          excluded.push({ ref: shortOrderRef(o.id), reason })
          await supabase.from('orders').update({ wise_status: 'excluded', wise_excluded_reason: reason }).eq('id', o.id)
        }
      }
      if (count) await wise.completeBatchGroup(group.id, await wise.getBatchGroupVersion(group.id))
      if (batchRowId) await supabase.from('wise_batches').update({ wise_batch_group_id: group.id, status: count ? 'awaiting_validation' : 'empty', transfer_count: count, total_ils: Math.round(total * 100) / 100, excluded: [...excluded, ...waiting] }).eq('id', batchRowId)
    } else if (batchRowId) {
      await supabase.from('wise_batches').update({ status: 'empty' }).eq('id', batchRowId)
    }
  } catch (err) {
    if (batchRowId) await supabase.from('wise_batches').update({ status: 'error', error: (err as Error).message }).eq('id', batchRowId)
    await sendDailyMessage('Virements Israël : le lot n’a pas pu être préparé', [(err as Error).message])
    throw err
  }

  const lines = [
    ...excluded.map(e => `Retiré #${e.ref} : ${e.reason}`),
    ...waiting.map(e => `Reporté #${e.ref} : ${e.reason}`),
  ]
  const head = count
    ? `${count} virement${count > 1 ? 's' : ''}, ${fmtIls(total)}, ${excluded.length ? `${excluded.length} retiré${excluded.length > 1 ? 's' : ''}` : 'tout est conforme'}`
    : `Aucun virement à valider aujourd’hui${excluded.length ? ` (${excluded.length} retiré${excluded.length > 1 ? 's' : ''})` : ''}`
  await sendDailyMessage(head, lines)
  return { count, total: Math.round(total * 100) / 100, excluded, waiting }
}

/** Virements partis : passe les commandes en « paid ». */
export async function syncPaidTransfers(): Promise<number> {
  const { data } = await supabase.from('orders').select('id, wise_transfer_id').eq('wise_status', 'in_batch').not('wise_transfer_id', 'is', null).limit(200)
  let n = 0
  for (const o of (data || []) as { id: string; wise_transfer_id: string }[]) {
    const status = await wise.getTransferStatus(o.wise_transfer_id).catch(() => '')
    if (status === 'outgoing_payment_sent') {
      await supabase.from('orders').update({ wise_status: 'paid' }).eq('id', o.id)
      n++
    } else if (['cancelled', 'funds_refunded', 'bounced_back'].includes(status)) {
      await supabase.from('orders').update({ wise_status: 'excluded', wise_excluded_reason: `Virement Wise ${status}` }).eq('id', o.id)
    }
  }
  return n
}

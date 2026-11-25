// Suivi des colis envoyés par la poste : code de réception glissé dans le colis + suivi transporteur (Ship24).
import crypto from 'crypto'
import { supabase } from '../config'
import { shortOrderRef } from '../fulfillment'
import { ship24Enabled, trackShipment, trackerResults, type CarrierTracking } from '../payments/ship24'
import { alertAdmins } from './orderLifecycle'

export const RECEIPT_CODE_MAX_ATTEMPTS = 5

/** Code à 6 chiffres que le vendeur glisse dans le colis ; créé une seule fois par commande. */
export async function ensureReceiptCode(orderId: string): Promise<string | null> {
  const { data: existing } = await supabase.from('order_receipt_codes').select('code').eq('order_id', orderId).maybeSingle()
  if (existing?.code) return existing.code
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  const { error } = await supabase.from('order_receipt_codes').insert({ order_id: orderId, code, attempts: 0 })
  if (error) {
    // Course entre deux appels : on relit celui qui a gagné
    const { data: again } = await supabase.from('order_receipt_codes').select('code').eq('order_id', orderId).maybeSingle()
    return again?.code || null
  }
  return code
}

export async function getReceiptCode(orderId: string) {
  const { data } = await supabase.from('order_receipt_codes').select('code, attempts, locked_at').eq('order_id', orderId).maybeSingle()
  return data as { code: string; attempts: number; locked_at: string | null } | null
}

/** Enregistre ce que dit le transporteur ; alerte l'équipe si le dépôt date d'avant la vente. */
export async function applyCarrierTracking(orderId: string, ct: CarrierTracking): Promise<void> {
  const { data: order } = await supabase.from('orders').select('id, created_at, carrier_alerted_at, carrier_delivered_at').eq('id', orderId).maybeSingle()
  if (!order) return
  const patch: Record<string, unknown> = { carrier_checked_at: new Date().toISOString() }
  if (ct.trackerId) patch.carrier_tracker_id = ct.trackerId
  if (ct.milestone) patch.tracking_status = ct.milestone
  if (ct.firstEventAt) patch.carrier_first_event_at = ct.firstEventAt
  if (ct.deliveredAt && !order.carrier_delivered_at) patch.carrier_delivered_at = ct.deliveredAt
  const depositedBeforeSale = ct.firstEventAt && Date.parse(ct.firstEventAt) < Date.parse(order.created_at) - 24 * 3600_000
  if (depositedBeforeSale && !order.carrier_alerted_at) {
    patch.carrier_alerted_at = new Date().toISOString()
    alertAdmins('Numéro de suivi suspect',
      `Commande #${shortOrderRef(orderId)} : le colis de ce numéro a été déposé le ${ct.firstEventAt}, AVANT la vente (${order.created_at}). Le vendeur n'est pas payé automatiquement : vérifier dans l'admin.`).catch(() => {})
  }
  await supabase.from('orders').update(patch).eq('id', orderId)
}

/** À l'envoi : crée le suivi chez Ship24 (sans bloquer le vendeur si Ship24 ne répond pas). */
export async function startCarrierTracking(orderId: string, trackingNumber: string, address: { zip?: string | null; country?: string | null } | null): Promise<void> {
  if (!ship24Enabled()) return
  try {
    const ct = await trackShipment({
      trackingNumber, orderId,
      destinationCountryCode: (address?.country || 'IL').slice(0, 2).toUpperCase(),
      destinationPostCode: address?.zip || null,
    })
    if (ct) await applyCarrierTracking(orderId, ct)
  } catch (err) {
    console.error('[ship24] track', orderId, err instanceof Error ? err.message : err)
  }
}

/**
 * Le versement automatique (10 jours après l'envoi) peut-il partir ?
 * Sans Ship24 : oui. Avec Ship24 : seulement si le transporteur dit « livré » et que le dépôt n'est pas suspect ;
 * sinon l'argent reste bloqué et l'équipe est prévenue une fois.
 */
export async function carrierAllowsRelease(order: { id: string; carrier_tracker_id?: string | null; carrier_delivered_at?: string | null; carrier_alerted_at?: string | null }): Promise<boolean> {
  if (!ship24Enabled() || !order.carrier_tracker_id) return true
  let deliveredAt = order.carrier_delivered_at
  if (!deliveredAt) {
    try {
      const ct = await trackerResults(order.carrier_tracker_id)
      if (ct) {
        await applyCarrierTracking(order.id, ct)
        deliveredAt = ct.deliveredAt
      }
    } catch (err) {
      console.error('[ship24] results', order.id, err instanceof Error ? err.message : err)
    }
  }
  const { data: fresh } = await supabase.from('orders').select('carrier_alerted_at, carrier_delivered_at').eq('id', order.id).maybeSingle()
  if (fresh?.carrier_alerted_at) return false
  if (deliveredAt || fresh?.carrier_delivered_at) return true
  await supabase.from('orders').update({ carrier_alerted_at: new Date().toISOString() }).eq('id', order.id).is('carrier_alerted_at', null)
  alertAdmins('Colis non livré selon la poste',
    `Commande #${shortOrderRef(order.id)} : 10 jours après l'envoi, la poste n'indique pas « livré ». Le vendeur n'est pas payé automatiquement : vérifier dans l'admin.`).catch(() => {})
  return false
}

// Rappels automatiques (25/11/2026), chacun une seule fois par commande (colonne orders.reminders) :
// acheteur : colis envoyé sans réception confirmée (J+3, J+5, J+7), « livré » par la poste sans confirmation,
// plus que 4 h pour signaler un problème ; vendeur : litige sans réponse depuis 24 h.
import { supabase } from '../config'
import { notifyUserT } from '../utils'
import { shortOrderRef } from '../fulfillment'

type Row = { id: string; buyer_id: string; seller_id: string; shipped_at?: string | null; claim_deadline?: string | null; reminders?: Record<string, string> | null }

async function once(o: Row, key: string, send: () => Promise<unknown>): Promise<boolean> {
  const done = o.reminders || {}
  if (done[key]) return false
  await supabase.from('orders').update({ reminders: { ...done, [key]: new Date().toISOString() } }).eq('id', o.id)
  o.reminders = { ...done, [key]: new Date().toISOString() }
  await send().catch(() => {})
  return true
}

export async function sendOrderReminders(): Promise<number> {
  const now = Date.now()
  let sent = 0
  // Acheteur : colis envoyé, réception pas encore confirmée
  const { data: shipped } = await supabase.from('orders')
    .select('id, buyer_id, seller_id, shipped_at, claim_deadline, carrier_delivered_at, reminders')
    .eq('status', 'shipped').eq('fulfillment_method', 'post').eq('payout_status', 'held').is('buyer_confirmed_at', null)
  for (const o of (shipped || []) as (Row & { carrier_delivered_at?: string | null })[]) {
    const ref = { ref: shortOrderRef(o.id) }
    if (o.carrier_delivered_at) {
      if (await once(o, 'carrier_delivered', () => notifyUserT(o.buyer_id, 'receipt_reminder', 'carrierDelivered', ref, { order_id: o.id }))) sent++
      continue
    }
    if (!o.shipped_at) continue
    const days = (now - Date.parse(o.shipped_at)) / 86400000
    for (const d of [7, 5, 3]) {
      if (days >= d) {
        if (await once(o, `buyer_d${d}`, () => notifyUserT(o.buyer_id, 'receipt_reminder', 'receiptReminder', ref, { order_id: o.id }))) sent++
        break
      }
    }
  }
  // Acheteur : réception confirmée, plus que 4 h pour signaler un problème
  const { data: delivered } = await supabase.from('orders')
    .select('id, buyer_id, seller_id, claim_deadline, reminders')
    .eq('status', 'delivered').eq('fulfillment_method', 'post').eq('payout_status', 'held')
  for (const o of (delivered || []) as Row[]) {
    if (!o.claim_deadline) continue
    const left = Date.parse(o.claim_deadline) - now
    if (left > 0 && left <= 4 * 3600000) {
      if (await once(o, 'claim_4h', () => notifyUserT(o.buyer_id, 'claim_ending', 'claimEndingSoon', { ref: shortOrderRef(o.id) }, { order_id: o.id }))) sent++
    }
  }
  // Vendeur : litige ouvert depuis plus de 24 h sans sa réponse (photos)
  const { data: disputes } = await supabase.from('disputes')
    .select('order_id, seller_id, created_at, seller_photo_urls').eq('status', 'under_review')
  for (const d of (disputes || []) as { order_id: string; seller_id: string; created_at: string; seller_photo_urls?: string[] | null }[]) {
    if ((d.seller_photo_urls || []).length || now - Date.parse(d.created_at) < 24 * 3600000) continue
    const { data: o } = await supabase.from('orders').select('id, buyer_id, seller_id, reminders').eq('id', d.order_id).maybeSingle()
    if (!o) continue
    if (await once(o as Row, 'seller_dispute', () => notifyUserT(d.seller_id, 'dispute_reminder', 'disputeRespond', { ref: shortOrderRef(d.order_id) }, { order_id: d.order_id }))) sent++
  }
  return sent
}

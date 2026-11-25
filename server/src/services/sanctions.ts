// Sanctions (décision du 25/11/2026) :
// - vendeur : 1er litige perdu → avertissement ; 2e → 30 jours de paiement seulement à la réception
//   (jamais de versement « à l'aveugle » au bout de 10 jours) ; 3e → bannissement ;
// - acheteur de mauvaise foi : 2 litiges perdus → plus de litiges ni de retours possibles.
import { supabase } from '../config'
import { notifyUserT } from '../utils'
import { alertAdmins } from './orderLifecycle'

export const SELLER_SANCTION_DAYS = 30
export const BUYER_BLOCK_AFTER_LOST = 2

/** À appeler quand un litige est tranché en faveur de l'acheteur. */
export async function applySellerSanction(sellerId: string): Promise<number> {
  const { count } = await supabase.from('disputes').select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId).eq('status', 'resolved_buyer')
  const level = Math.min(count || 0, 3)
  const { data: seller } = await supabase.from('sellers').select('sanction_level').eq('id', sellerId).maybeSingle()
  const current = Number((seller as { sanction_level?: number } | null)?.sanction_level || 0)
  if (level <= current) return current
  const patch: Record<string, unknown> = { sanction_level: level }
  if (level === 2) patch.sanction_until = new Date(Date.now() + SELLER_SANCTION_DAYS * 86400000).toISOString()
  await supabase.from('sellers').update(patch).eq('id', sellerId)
  if (level === 1) notifyUserT(sellerId, 'seller_warning', 'sellerWarning').catch(() => {})
  if (level === 2) notifyUserT(sellerId, 'seller_restricted', 'sellerRestricted').catch(() => {})
  if (level === 3) {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', sellerId)
    alertAdmins('Vendeur banni automatiquement', `Le vendeur ${sellerId} a perdu 3 litiges : compte banni. Ses versements en attente servent aux remboursements.`).catch(() => {})
  }
  return level
}

/** Le vendeur est-il en période de « paiement seulement à la réception » ? */
export async function sellerRestricted(sellerId: string): Promise<boolean> {
  const { data } = await supabase.from('sellers').select('sanction_level, sanction_until').eq('id', sellerId).maybeSingle()
  const s = data as { sanction_level?: number; sanction_until?: string | null } | null
  return !!s && Number(s.sanction_level || 0) >= 2 && !!s.sanction_until && Date.parse(s.sanction_until) > Date.now()
}

/** À appeler quand un litige est tranché en faveur du vendeur. */
export async function applyBuyerSanction(buyerId: string): Promise<boolean> {
  const { count } = await supabase.from('disputes').select('id', { count: 'exact', head: true })
    .eq('buyer_id', buyerId).eq('status', 'resolved_seller')
  if ((count || 0) < BUYER_BLOCK_AFTER_LOST) return false
  const { data: bs } = await supabase.from('buyer_scores').select('user_id').eq('user_id', buyerId).maybeSingle()
  if (bs) await supabase.from('buyer_scores').update({ risk_level: 'blocked' }).eq('user_id', buyerId)
  else await supabase.from('buyer_scores').insert({ user_id: buyerId, risk_level: 'blocked', score: 0 })
  notifyUserT(buyerId, 'buyer_blocked', 'buyerBlocked').catch(() => {})
  return true
}

export async function buyerBlocked(buyerId: string): Promise<boolean> {
  const { data } = await supabase.from('buyer_scores').select('risk_level').eq('user_id', buyerId).maybeSingle()
  return (data as { risk_level?: string } | null)?.risk_level === 'blocked'
}

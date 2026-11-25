/** Délai pendant lequel le meilleur enchérisseur peut acheter au prix minimum après un invendu. */
export const RESERVE_OFFER_SECONDS = 60
/** Marge pour la latence réseau entre la fin affichée et la demande d'achat. */
const GRACE_SECONDS = 10

type OfferItem = { status: string; stream_id: string | null; min_price: number | string | null; ended_at: string | null }
type TopBid = { bidder_id: string; amount: number | string } | null

/**
 * Raison du refus de l'offre « acheter au prix minimum », ou null si l'achat est autorisé.
 * Autorisé seulement : lot de live invendu, prix minimum défini, dans les 60 s après la fin, pour le meilleur enchérisseur.
 */
export function reserveOfferRefusal(item: OfferItem, topBid: TopBid, buyerId: string, now: number):
  null | 'offer_unavailable' | 'offer_expired' | 'not_top_bidder' {
  const minPrice = Number(item.min_price) || 0
  if (item.status !== 'unsold' || !item.stream_id || minPrice <= 0) return 'offer_unavailable'
  const endedAt = item.ended_at ? new Date(item.ended_at).getTime() : 0
  if (!endedAt || now - endedAt > (RESERVE_OFFER_SECONDS + GRACE_SECONDS) * 1000) return 'offer_expired'
  if (!topBid || topBid.bidder_id !== buyerId) return 'not_top_bidder'
  return null
}

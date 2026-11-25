/** Marge laissée à l'appli du vendeur (qui clôt normalement elle-même) avant que le serveur ne clôture. */
export const AUCTION_GRACE_SECONDS = 3

/** Enchère échue ? (durée > 0 seulement : la « mort subite » se prolonge à chaque mise, gérée par l'appli). */
export function isAuctionExpired(startedAt: string | null, durationSeconds: number | null, now: number): boolean {
  if (!startedAt || !durationSeconds || durationSeconds <= 0) return false
  return now > new Date(startedAt).getTime() + (durationSeconds + AUCTION_GRACE_SECONDS) * 1000
}

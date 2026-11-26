// =====================================================================
// Articles de luxe — règle contre les contrefaçons (validée par Benjamin le 26/11/2026).
// Logique pure, sans base de données (testée à part).
//
// Article de luxe = prix d'UN article ≥ 500 € (ou l'équivalent dans la devise du vendeur, conversion fixe ;
//                   jamais le total d'une commande ni d'un panier)
//                   OU grande marque de luxe repérée dans le titre, la marque ou la description
//                   OU case « article de marque de luxe » cochée par le vendeur.
// Conséquences :
//   - publication refusée sans la certification d'authenticité (date + vendeur enregistrés) ;
//   - vendeur payé 30 jours après la réception (même si l'acheteur dit « Tout est conforme ») ;
//     sans réception confirmée, les 10 jours sans nouvelles deviennent 30 jours ;
//   - l'acheteur a 30 jours après la réception pour signaler une contrefaçon (24 h pour le reste) ;
//   - faux confirmé par l'équipe : remboursement complet, pénalité de 50 % du prix prélevée sur
//     les prochains versements, compte fermé définitivement, preuves conservées.
// La même détection existe en base (trigger items_luxury_guard, migration
// supabase/luxe-contrefacons-2026-11-26.sql) : garder les deux listes alignées.
// =====================================================================

/** Seuil « luxe » en euros. */
export const LUXURY_THRESHOLD_EUR = 500
/** Luxe : versement au vendeur 30 jours après la réception (ou après l'envoi, sans réception confirmée). */
export const LUXURY_PAYOUT_DELAY_DAYS = 30
/** Luxe : délai pour signaler une contrefaçon après la réception. */
export const COUNTERFEIT_CLAIM_DAYS = 30
/** Faux confirmé : pénalité de 50 % du prix, prélevée sur les prochains versements du vendeur. */
export const COUNTERFEIT_PENALTY_RATE = 0.5

/** Texte de la case à cocher (référence ; les traductions sont dans l'appli). */
export const AUTHENTICITY_CERTIFICATION_FR =
  "Je certifie que cet article est authentique. Je sais que vendre une contrefaçon est un délit et qu'en cas de faux je devrai rembourser l'acheteur, payer une pénalité de 50 % du prix, et que mon compte sera fermé."

/**
 * Conversion simple et fixe : nombre d'unités de la devise pour 1 €.
 * (Arrondis volontaires : le seuil doit rester lisible, ex. 2 000 ₪, 550 $.)
 */
export const EUR_RATES: Record<string, number> = {
  EUR: 1, ILS: 4, USD: 1.1, GBP: 0.85, CHF: 0.95, CAD: 1.5, AUD: 1.7, RUB: 100, UAH: 45,
  JPY: 165, CNY: 8, INR: 95, BRL: 6, MXN: 20, AED: 4, MAD: 11, TRY: 40, PLN: 4.3,
  SEK: 11.5, NOK: 12, DKK: 7.5, CZK: 25, HUF: 400, RON: 5, ZAR: 20,
}

/** Seuil « luxe » dans une devise (devise inconnue : comme le dollar). */
export function luxuryThreshold(currency?: string | null): number {
  const rate = EUR_RATES[(currency || '').toUpperCase()] ?? EUR_RATES.USD
  return LUXURY_THRESHOLD_EUR * rate
}

export function isLuxuryPrice(price: number | string | null | undefined, currency?: string | null): boolean {
  const n = Number(price)
  return Number.isFinite(n) && n > 0 && n >= luxuryThreshold(currency)
}

/**
 * Grandes marques de luxe : nom affiché + motif (minuscules, sans accents).
 * Formes hébreu et russe pour les marques les plus copiées.
 */
export const LUXURY_BRANDS: { name: string; pattern: string }[] = [
  { name: 'Louis Vuitton', pattern: 'louis ?vuitton|לואי ויטון|луи виттон' },
  { name: 'Chanel', pattern: 'chanel|שאנל|шанель' },
  { name: 'Hermès', pattern: 'hermes|הרמס|эрмес|гермес' },
  { name: 'Gucci', pattern: "gucci|גוצ['׳]?י|гуччи" },
  { name: 'Dior', pattern: 'dior|דיור|диор' },
  { name: 'Prada', pattern: 'prada|פראדה|прада' },
  { name: 'Miu Miu', pattern: 'miu ?miu' },
  { name: 'Balenciaga', pattern: 'balenciaga|בלנסיאגה|баленсиага' },
  { name: 'Saint Laurent', pattern: 'saint ?-?laurent|ysl|סן לורן|сен-?лоран' },
  { name: 'Celine', pattern: 'celine' },
  { name: 'Fendi', pattern: 'fendi|פנדי|фенди' },
  { name: 'Bottega Veneta', pattern: 'bottega ?veneta' },
  { name: 'Givenchy', pattern: 'givenchy|живанши' },
  { name: 'Valentino', pattern: 'valentino' },
  { name: 'Versace', pattern: "versace|ורסאצ['׳]?ה|версаче" },
  { name: 'Burberry', pattern: 'burberry|ברברי|барберри' },
  { name: 'Loewe', pattern: 'loewe' },
  { name: 'Moncler', pattern: 'moncler|монклер' },
  { name: 'Off-White', pattern: 'off-white|offwhite' },
  { name: 'Dolce & Gabbana', pattern: 'dolce ?(&|and|e) ?gabbana|d&g' },
  { name: 'Alexander McQueen', pattern: 'mc ?queen' },
  { name: 'Christian Louboutin', pattern: 'louboutin|לובוטן|лубутен' },
  { name: 'Goyard', pattern: 'goyard' },
  { name: 'Balmain', pattern: 'balmain' },
  { name: 'Chrome Hearts', pattern: 'chrome ?hearts' },
  { name: 'Rolex', pattern: 'rolex|רולקס|ролекс' },
  { name: 'Cartier', pattern: 'cartier|קרטייה|картье' },
  { name: 'Audemars Piguet', pattern: 'audemars ?piguet' },
  { name: 'Patek Philippe', pattern: 'patek ?philippe|patek' },
  { name: 'Richard Mille', pattern: 'richard ?mille' },
  { name: 'Vacheron Constantin', pattern: 'vacheron' },
  { name: 'Jaeger-LeCoultre', pattern: 'jaeger ?-?le ?coultre' },
  { name: 'Hublot', pattern: 'hublot' },
  { name: 'Omega', pattern: 'omega(?! ?-?3)' },
  { name: 'Breitling', pattern: 'breitling' },
  { name: 'TAG Heuer', pattern: 'tag ?heuer' },
  { name: 'IWC', pattern: 'iwc' },
  { name: 'Panerai', pattern: 'panerai' },
  { name: 'Chopard', pattern: 'chopard' },
  { name: 'Piaget', pattern: 'piaget' },
  { name: 'Van Cleef & Arpels', pattern: 'van ?cleef' },
  { name: 'Bulgari', pattern: 'bulgari|bvlgari|булгари' },
  { name: 'Tiffany & Co.', pattern: 'tiffany' },
  { name: 'Boucheron', pattern: 'boucheron' },
  { name: 'Harry Winston', pattern: 'harry ?winston' },
  { name: 'Messika', pattern: 'messika' },
  { name: 'Montblanc', pattern: 'montblanc' },
]

/** Minuscules, sans accents (Hermès → hermes, Chloé → chloe). */
export function normalizeForBrand(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’`]/g, "'")
}

// Le nom doit être un mot entier : ni lettre ni chiffre juste avant ou juste après
const BRAND_REGEXES = LUXURY_BRANDS.map(b => ({
  name: b.name,
  re: new RegExp(`(^|[^\\p{L}\\p{N}])(?:${b.pattern})(?![\\p{L}\\p{N}])`, 'u'),
}))

/** Marque de luxe repérée dans les textes donnés (titre, marque, description), ou null. */
export function detectLuxuryBrand(...texts: (string | null | undefined)[]): string | null {
  const text = normalizeForBrand(texts.filter(Boolean).join(' \n '))
  if (!text.trim()) return null
  for (const b of BRAND_REGEXES) if (b.re.test(text)) return b.name
  return null
}

/**
 * Données d'UN SEUL article. Les prix sont ceux de cet article (départ, achat immédiat, prix final) :
 * le seuil ne s'applique jamais au total d'une commande ni à un panier.
 */
export type LuxuryInput = {
  prices?: (number | string | null | undefined)[]
  currency?: string | null
  title?: string | null
  brand?: string | null
  description?: string | null
  declared?: boolean | null
}

/** Pourquoi l'article est « de luxe » (null s'il ne l'est pas). */
export function luxuryReason(input: LuxuryInput): { reason: 'declared' | 'brand' | 'price'; brand?: string } | null {
  if (input.declared) return { reason: 'declared' }
  const brand = detectLuxuryBrand(input.title, input.brand, input.description)
  if (brand) return { reason: 'brand', brand }
  if ((input.prices || []).some(p => isLuxuryPrice(p, input.currency))) return { reason: 'price' }
  return null
}

export function isLuxuryItem(input: LuxuryInput): boolean {
  return luxuryReason(input) !== null
}

/** Date de réception d'une commande (confirmée par l'acheteur, « livré » de la poste, ou remise en main propre). */
export function receivedAt(order: {
  buyer_confirmed_at?: string | null
  carrier_delivered_at?: string | null
  handed_over_at?: string | null
  delivered_at?: string | null
}): string | null {
  const dates = [order.buyer_confirmed_at, order.carrier_delivered_at, order.handed_over_at, order.delivered_at]
    .filter((d): d is string => !!d && Number.isFinite(Date.parse(d)))
  if (dates.length === 0) return null
  // La plus ancienne : pas de rallonge en confirmant tard
  return dates.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b))
}

/** Luxe : fin du délai pour signaler une contrefaçon (null tant que l'article n'est pas reçu). */
export function counterfeitDeadline(order: Parameters<typeof receivedAt>[0]): string | null {
  const r = receivedAt(order)
  return r ? new Date(Date.parse(r) + COUNTERFEIT_CLAIM_DAYS * 86400000).toISOString() : null
}

/** Date de versement d'une vente de luxe : 30 jours après la date donnée (réception ou envoi). */
export function luxuryPayoutAt(fromMs: number): string {
  return new Date(fromMs + LUXURY_PAYOUT_DELAY_DAYS * 86400000).toISOString()
}

/** Pénalité pour contrefaçon : 50 % du prix de l'article, arrondie au centime. */
export function counterfeitPenalty(price: number | string | null | undefined): number {
  const n = Number(price)
  return Number.isFinite(n) && n > 0 ? Math.round(n * COUNTERFEIT_PENALTY_RATE * 100) / 100 : 0
}

/** Part de la pénalité prélevée sur un versement (jamais plus que le versement). */
export function penaltyDeduction(payout: number | string | null | undefined, penaltyDue: number | string | null | undefined): number {
  const p = Number(payout)
  const d = Number(penaltyDue)
  if (!(p > 0) || !(d > 0)) return 0
  return Math.round(Math.min(p, d) * 100) / 100
}

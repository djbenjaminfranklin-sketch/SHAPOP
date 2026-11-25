import crypto from 'crypto'

// =====================================================================
// Remise des commandes — logique pure, sans base de données.
// Deux modes seulement :
//   - 'pickup' : retrait en main propre, l'acheteur donne un code à 4 chiffres
//   - 'post'   : envoi par la poste, le vendeur envoie 2 photos (colis + bordereau)
// Plus aucun transporteur intégré (ni étiquette, ni point relais, ni suivi auto).
// =====================================================================

export type FulfillmentMethod = 'pickup' | 'post'

/** Délai de remise par défaut (jours) : sans preuve, rappel puis annulation + remboursement. */
export const HANDOVER_DELAY_DEFAULT_DAYS = 4
export const HANDOVER_DELAY_ALLOWED_DAYS = [1, 2, 3, 4, 5, 6, 7]
/** Nombre d'essais de code avant blocage (et alerte admin). */
export const HANDOVER_MAX_ATTEMPTS = 5
/** Envoi postal : le vendeur est payé 3 jours après ses 2 photos (ou dès que l'acheteur confirme la réception). */
// Envoi par la poste : sans code de réception saisi par l'acheteur, versement 10 jours après l'envoi (25/11/2026)
export const POST_PAYOUT_DELAY_DAYS = 10
/** Poids retenu quand l'article n'a pas de poids renseigné. */
export const DEFAULT_ITEM_WEIGHT_GRAMS = 1000

/** Statuts d'une commande PAYÉE (coordonnées visibles, litige « non reçu » possible). */
export const PAID_STATUSES = ['paid', 'shipped', 'handed_over', 'delivered', 'disputed', 'return_requested', 'return_rejected']

export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.includes(status)
}

// ---------------------------------------------------------------------
// Frais d'envoi par la poste — UN SEUL endroit.
// C'est le VENDEUR qui fixe son prix ; l'app lui propose un prix suggéré.
// Ordre de priorité :
//   1. prix fixé par le vendeur sur l'article (items.seller_shipping_override)
//   2. forfait fixé par le vendeur dans ses réglages (sellers.post_price)
//   3. prix suggéré : tarif d'un petit colis national de la poste du pays du
//      vendeur (tableau ci-dessous), dans la devise du pays.
// ---------------------------------------------------------------------

type PriceTier = { maxGrams: number; price: number }
export type SuggestedPostRate = { currency: string; tiers: PriceTier[]; source: string }

/**
 * Prix suggérés par pays (code ISO du pays du vendeur). Les paliers sont TTC,
 * dépôt au guichet, envoi national suivi. Sources et dates : voir chaque ligne.
 */
export const SUGGESTED_POST_RATES: Record<string, SuggestedPostRate> = {
  // Israel Post, « תעריפי חברת הדואר 01.06.2026 » (דברי דואר פנים) :
  // ≤ 2 kg « דואר רשום » (section 5), au-delà colis guichet à guichet 1-2 colis (section 16.1).
  IL: {
    currency: 'ILS',
    source: 'Israel Post, tarifs officiels au 01/06/2026',
    tiers: [
      { maxGrams: 200, price: 22.5 },
      { maxGrams: 500, price: 24.5 },
      { maxGrams: 2000, price: 29.0 },
      { maxGrams: 5000, price: 75.0 },
      { maxGrams: 10000, price: 75.0 },
      { maxGrams: 20000, price: 84.0 },
    ],
  },
  // La Poste Colissimo domicile, tarif au 01/01/2026 — laposte.fr/tarif-colissimo
  FR: { currency: 'EUR', source: 'La Poste Colissimo, 01/01/2026', tiers: [
    { maxGrams: 500, price: 7.59 }, { maxGrams: 1000, price: 9.59 }, { maxGrams: 2000, price: 11.19 }] },
  // Correos Paq Estándar, 01/01/2026 (via ShippyPro, TVA à confirmer)
  ES: { currency: 'EUR', source: 'Correos Paq Estándar, 01/01/2026 (non officiel)', tiers: [
    { maxGrams: 1000, price: 13.65 }, { maxGrams: 2000, price: 17.1 }] },
  // Royal Mail Tracked 48 small parcel (≤ 2 kg) au Post Office — postoffice.co.uk, 10/2026
  GB: { currency: 'GBP', source: 'Royal Mail Tracked 48, 10/2026', tiers: [{ maxGrams: 2000, price: 4.7 }] },
  // USPS Ground Advantage retail, zone 4, Notice 123 au 04/10/2026
  US: { currency: 'USD', source: 'USPS Ground Advantage zone 4, 04/10/2026', tiers: [
    { maxGrams: 230, price: 8.8 }, { maxGrams: 450, price: 11.1 }, { maxGrams: 900, price: 13.5 }] },
  // DHL Paket jusqu'à 5 kg au guichet (le 2 kg n'est vendu qu'en ligne en 2026) — dhl.de
  DE: { currency: 'EUR', source: 'DHL Paket 5 kg, grille 2025-2026', tiers: [{ maxGrams: 5000, price: 7.69 }] },
  // Poste Delivery Standard 0-3 kg, 01/05/2026 — poste.it
  IT: { currency: 'EUR', source: 'Poste Delivery Standard, 01/05/2026', tiers: [{ maxGrams: 3000, price: 10.3 }] },
  // bpost colis national Standard au bureau, 01/01/2026 — bpost.be
  BE: { currency: 'EUR', source: 'bpost colis Standard, 01/01/2026', tiers: [
    { maxGrams: 2000, price: 8.6 }, { maxGrams: 10000, price: 11.5 }] },
  // PostPac Economy au guichet, 01/01/2026 — post.ch
  CH: { currency: 'CHF', source: 'La Poste PostPac Economy, 01/01/2026', tiers: [{ maxGrams: 2000, price: 9.0 }] },
  // Postes Canada Colis standard, national, 1 kg ~16 CAD hors taxes, 02/07/2025
  CA: { currency: 'CAD', source: 'Postes Canada Colis standard, 02/07/2025', tiers: [{ maxGrams: 1000, price: 16.0 }, { maxGrams: 2000, price: 17.0 }] },
  // Pochta Rossii посылка ~1 kg : ordre de grandeur (tarifs du 10/03/2026, chiffre non officiel)
  RU: { currency: 'RUB', source: 'Pochta Rossii, estimation 2026', tiers: [{ maxGrams: 1000, price: 500 }] },
}

/** Pays absent du tableau : prix suggéré par défaut (en dollars US). */
export const DEFAULT_SUGGESTED_POST_RATE: SuggestedPostRate = {
  currency: 'USD',
  source: 'valeur par défaut',
  tiers: [{ maxGrams: 2000, price: 10 }, { maxGrams: 20000, price: 25 }],
}

export function suggestedPostRateFor(country?: string | null): SuggestedPostRate {
  return SUGGESTED_POST_RATES[(country || '').toUpperCase()] || DEFAULT_SUGGESTED_POST_RATE
}

export function suggestedPostPrice(country?: string | null, weightGrams?: number | null): { price: number; currency: string } {
  const rate = suggestedPostRateFor(country)
  const w = weightGrams && weightGrams > 0 ? weightGrams : DEFAULT_ITEM_WEIGHT_GRAMS
  const tier = rate.tiers.find(t => w <= t.maxGrams) || rate.tiers[rate.tiers.length - 1]
  return { price: tier.price, currency: rate.currency }
}

export type PostPriceSource = 'item' | 'seller' | 'suggested'

export function computePostPrice(input: {
  itemOverride?: number | string | null
  sellerPostPrice?: number | string | null
  sellerCountry?: string | null
  weightGrams?: number | null
}): { price: number; source: PostPriceSource } {
  const itemOverride = input.itemOverride != null ? Number(input.itemOverride) : NaN
  if (Number.isFinite(itemOverride) && itemOverride > 0) return { price: round2(itemOverride), source: 'item' }
  const sellerPrice = input.sellerPostPrice != null ? Number(input.sellerPostPrice) : NaN
  if (Number.isFinite(sellerPrice) && sellerPrice >= 0) return { price: round2(sellerPrice), source: 'seller' }
  return { price: suggestedPostPrice(input.sellerCountry, input.weightGrams).price, source: 'suggested' }
}

// ---------------------------------------------------------------------
// Devise : celle du pays du vendeur (les prix des articles sont saisis dans sa devise).
// ---------------------------------------------------------------------
const EURO_COUNTRIES = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK', 'MC', 'AD', 'SM', 'VA', 'ME', 'XK'])
const COUNTRY_CURRENCY: Record<string, string> = {
  IL: 'ILS', US: 'USD', GB: 'GBP', CH: 'CHF', CA: 'CAD', AU: 'AUD', RU: 'RUB', UA: 'UAH',
  JP: 'JPY', CN: 'CNY', IN: 'INR', BR: 'BRL', MX: 'MXN', AE: 'AED', MA: 'MAD', TR: 'TRY',
  PL: 'PLN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CZ: 'CZK', HU: 'HUF', RO: 'RON', ZA: 'ZAR',
}

export function currencyForCountry(country?: string | null): string {
  const c = (country || '').toUpperCase()
  if (EURO_COUNTRIES.has(c)) return 'EUR'
  return COUNTRY_CURRENCY[c] || 'USD'
}

/** Seule fonction de formatage des montants côté serveur (notifications, e-mails). */
export function formatMoney(amount: number | string | null | undefined, currency?: string | null, locale = 'en'): string {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: (currency || 'ILS').toUpperCase() }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency || ''}`.trim()
  }
}

// ---------------------------------------------------------------------
// Numéro WhatsApp : stocké au format international « +<indicatif><numéro> ».
// L'indicatif par défaut dépend du pays de l'utilisateur (+972 seulement pour Israël).
// ---------------------------------------------------------------------
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  IL: '972', FR: '33', BE: '32', CH: '41', LU: '352', MC: '377', DE: '49', ES: '34', IT: '39',
  PT: '351', NL: '31', AT: '43', IE: '353', GB: '44', US: '1', CA: '1', RU: '7', UA: '380',
  PL: '48', SE: '46', NO: '47', DK: '45', FI: '358', GR: '30', CY: '357', RO: '40', HU: '36',
  CZ: '420', TR: '90', MA: '212', TN: '216', DZ: '213', AE: '971', AU: '61', BR: '55', MX: '52',
  AR: '54', ZA: '27', IN: '91', JP: '81', CN: '86',
}

export function dialCodeForCountry(country?: string | null): string | null {
  return COUNTRY_DIAL_CODES[(country || '').toUpperCase()] || null
}

/**
 * Normalise une saisie libre en numéro international (« +972501234567 »).
 * - « +… » ou « 00… » : déjà international
 * - « 0… » : numéro national → indicatif du pays par défaut
 * Renvoie null si le numéro est invalide ou si l'indicatif est inconnu.
 */
export function normalizeWhatsapp(input: unknown, defaultCountry?: string | null): string | null {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null
  let digits = raw.replace(/[\s().\-/]/g, '')
  if (!/^\+?\d+$/.test(digits)) return null
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else {
    const dial = dialCodeForCountry(defaultCountry)
    if (!dial) return null
    digits = dial + digits.replace(/^0+/, '')
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null
  return `+${digits}`
}

export function whatsappLink(e164: string, message: string): string {
  return `https://wa.me/${e164.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
}

export function mailtoLink(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Code à 4 chiffres, tiré au hasard de façon sûre. */
export function generateHandoverCode(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0')
}

/** Comparaison à temps constant (le code est court mais on reste propre). */
export function codesMatch(expected: string, given: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function shortOrderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

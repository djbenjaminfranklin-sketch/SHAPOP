// Remise des commandes : retrait en main propre (code à 4 chiffres) ou envoi
// par la poste (2 photos). Tout passe par le serveur ; aucune écriture directe
// dans la table orders depuis l'app.
import { supabase } from './supabase'
import { apiFetch } from './api'
import { getLang } from './i18n'

export type FulfillmentMethod = 'pickup' | 'post'
export type OrderStatus =
  | 'pending_payment' | 'paid' | 'shipped' | 'handed_over' | 'delivered'
  | 'refunded' | 'disputed' | 'cancelled' | 'return_requested' | 'return_rejected'

export interface CheckoutOptions {
  order_id: string
  status: OrderStatus
  amount: number
  currency: string
  pickup: { allowed: boolean; area: string | null }
  post: { price: number }
  selected_method: FulfillmentMethod | null
  whatsapp: string | null
  country: string | null
  dial_code: string | null
  saved_address: { name: string; street: string; city: string; zip: string; phone?: string } | null
}

export interface OrderContact {
  name: string | null
  whatsapp: string | null
  whatsapp_link: string | null
  email: string | null
  email_link: string | null
}

export interface OrderFulfillment {
  order_id: string
  role: 'buyer' | 'seller' | 'admin'
  status: OrderStatus
  fulfillment_method: FulfillmentMethod | 'legacy_carrier' | null
  currency: string | null
  amount: number
  shipping_cost: number
  total_amount: number
  paid_at: string | null
  handover_deadline: string | null
  handed_over_at: string | null
  proof_submitted_at: string | null
  shipped_at: string | null
  tracking_number: string | null
  payout_status: string | null
  payout_released_at: string | null
  payout_scheduled_at?: string | null
  shipping_address: { name?: string; street?: string; city?: string; zip?: string; phone?: string; country?: string } | null
  pickup_area: string | null
  handover: { code?: string; attempts_left?: number; locked: boolean } | null
  proofs: { parcel_url: string | null; slip_url: string | null }
  contact: OrderContact | null
}

export interface SellerFulfillmentSettings {
  allow_pickup: boolean
  pickup_area: string | null
  post_price: number | null
  suggested_post_price: number
  currency: string
  handover_delay_days: number
  handover_delay_allowed: number[]
  whatsapp: string | null
  country: string | null
  dial_code: string | null
}

// ---------------------------------------------------------------------
// Montants : UNE seule fonction de formatage, avec la devise de la commande
// ---------------------------------------------------------------------
const LOCALES: Record<string, string> = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ru: 'ru-RU', he: 'he-IL' }

export function formatMoney(amount: number | string | null | undefined, currency?: string | null, lang: string = getLang()): string {
  const n = Number(amount || 0)
  const cur = (currency || 'ILS').toUpperCase()
  try {
    return new Intl.NumberFormat(LOCALES[lang] || 'en-US', { style: 'currency', currency: cur }).format(n)
  } catch {
    return `${n.toFixed(2)} ${cur}`
  }
}

// Devise d'un prix d'article : celle du pays du vendeur (même règle que le serveur,
// server/src/fulfillment.ts → currencyForCountry).
const EURO_COUNTRIES = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK', 'MC', 'AD', 'SM', 'VA', 'ME', 'XK'])
const COUNTRY_CURRENCY: Record<string, string> = {
  IL: 'ILS', US: 'USD', GB: 'GBP', CH: 'CHF', CA: 'CAD', AU: 'AUD', RU: 'RUB', UA: 'UAH',
  JP: 'JPY', CN: 'CNY', IN: 'INR', BR: 'BRL', MX: 'MXN', AE: 'AED', MA: 'MAD', TR: 'TRY',
  PL: 'PLN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CZ: 'CZK', HU: 'HUF', RO: 'RON', ZA: 'ZAR',
}

export function currencyForCountry(country?: string | null): string {
  const c = (country || '').toUpperCase()
  if (EURO_COUNTRIES.has(c)) return 'EUR' // i18n-ignore (table des devises)
  return COUNTRY_CURRENCY[c] || 'USD'
}

/** Prix d'un article affiché hors commande : devise du pays du vendeur (ou, à défaut, du pays donné). */
export function formatItemPrice(amount: number | string | null | undefined, sellerCountry?: string | null, lang: string = getLang()): string {
  return formatMoney(amount, currencyForCountry(sellerCountry), lang)
}

/** Symbole seul d'une devise (ex. champ de saisie d'un prix). */
export function currencySymbol(currency?: string | null, lang: string = getLang()): string {
  try {
    const part = new Intl.NumberFormat(LOCALES[lang] || 'en-US', { style: 'currency', currency: (currency || 'USD').toUpperCase() })
      .formatToParts(0).find(p => p.type === 'currency')
    return part?.value || (currency || '').toUpperCase()
  } catch {
    return (currency || '').toUpperCase()
  }
}

export function formatDateTime(iso: string | null | undefined, lang: string = getLang()): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(LOCALES[lang] || 'en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export function shortOrderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

/** Commande payée = coordonnées visibles, remise attendue ou faite. */
export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && ['paid', 'shipped', 'handed_over', 'delivered', 'disputed', 'return_requested', 'return_rejected'].includes(status)
}

/** Commande payée qui attend encore sa preuve (code ou 2 photos). */
export function isAwaitingHandover(order: { status: string; fulfillment_method?: string | null }): boolean {
  return order.status === 'paid' && (order.fulfillment_method === 'pickup' || order.fulfillment_method === 'post')
}

// ---------------------------------------------------------------------
// Appels serveur
// ---------------------------------------------------------------------
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export class ApiError extends Error {
  code: string
  status: number
  body: Record<string, unknown>
  constructor(code: string, status: number, body: Record<string, unknown>) {
    super(code)
    this.code = code
    this.status = status
    this.body = body
  }
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const resp = await apiFetch(path, {
    method: init?.method || 'GET',
    headers: await authHeaders(),
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new ApiError(String(body?.error || 'error'), resp.status, body)
  return body as T
}

export const fulfillmentApi = {
  checkoutOptions: (orderId: string) => api<CheckoutOptions>(`/api/orders/${orderId}/checkout-options`),
  choose: (orderId: string, body: { method: FulfillmentMethod; address?: { name: string; street: string; city: string; zip: string; phone?: string }; whatsapp?: string }) =>
    api<{ fulfillment_method: FulfillmentMethod; shipping_cost: number; total_amount: number; currency: string }>(`/api/orders/${orderId}/fulfillment`, { method: 'POST', body }),
  get: (orderId: string) => api<OrderFulfillment>(`/api/orders/${orderId}/fulfillment`),
  submitCode: (orderId: string, code: string) =>
    api<{ success: boolean }>(`/api/orders/${orderId}/handover`, { method: 'POST', body: { code } }),
  submitProof: (orderId: string, kind: 'parcel' | 'slip', image: string, trackingNumber?: string) =>
    api<{ success: boolean; complete: boolean; missing?: 'parcel' | 'slip' }>(`/api/orders/${orderId}/proof`, {
      method: 'POST', body: { kind, image, tracking_number: trackingNumber || undefined },
    }),
  confirmReceipt: (orderId: string) =>
    api<{ success: boolean }>(`/api/orders/${orderId}/confirm-receipt`, { method: 'POST' }),
  sellerSettings: () => api<SellerFulfillmentSettings>('/api/seller/fulfillment-settings'),
  saveSellerSettings: (body: { allow_pickup: boolean; pickup_area: string | null; post_price: number | null; handover_delay_days: number; whatsapp: string }) =>
    api<Record<string, unknown>>('/api/seller/fulfillment-settings', { method: 'PUT', body }),
  myWhatsapp: () => api<{ whatsapp: string | null; country: string | null; dial_code: string | null }>('/api/me/whatsapp'),
}

// ---------------------------------------------------------------------
// Photo prise à l'appareil : réduite en JPEG (≤ 1600 px) avant envoi
// ---------------------------------------------------------------------
export async function fileToJpegDataUrl(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}

/** Titre d'article sans le code interne « [ABCD] » ajouté à la création (utile aux commandes, pas aux acheteurs du live). */
export function displayItemTitle(title: string | null | undefined): string {
  return (title || '').replace(/\s*\[[A-Z0-9]{3,8}\]\s*$/, '')
}

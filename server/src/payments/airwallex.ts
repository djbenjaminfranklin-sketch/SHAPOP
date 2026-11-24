// Client Airwallex (paiements en Israël, à la place de Rapyd — décision du 24/11/2026).
// Éteint tant que AIRWALLEX_ENABLED n'est pas « true » et que les clés ne sont pas posées.
// Doc : https://www.airwallex.com/docs (lue le 24/11/2026).
import crypto from 'crypto'

export const AIRWALLEX_SANDBOX_URL = 'https://api.sandbox.airwallex.com'
export const AIRWALLEX_PRODUCTION_URL = 'https://api.airwallex.com'
const CHECKOUT_API_VERSION = '2026-08-21'

export function airwallexConfig() {
  const clientId = (process.env.AIRWALLEX_CLIENT_ID || '').trim()
  const apiKey = (process.env.AIRWALLEX_API_KEY || '').trim()
  const accountId = (process.env.AIRWALLEX_ACCOUNT_ID || '').trim()
  const baseUrl = (process.env.AIRWALLEX_BASE_URL || AIRWALLEX_SANDBOX_URL).replace(/\/+$/, '')
  const enabled = process.env.AIRWALLEX_ENABLED === 'true' && !!clientId && !!apiKey
  return { clientId, apiKey, accountId, baseUrl, enabled, sandbox: baseUrl.includes('sandbox') }
}

export class AirwallexError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: unknown) { super(message) }
}

// Jeton valable 30 min : gardé en mémoire et renouvelé 2 min avant la fin
let cachedToken: { token: string; exp: number } | null = null
async function token(): Promise<string> {
  const { clientId, apiKey, baseUrl } = airwallexConfig()
  if (!clientId || !apiKey) throw new AirwallexError('Airwallex keys missing', 0, 'not_configured')
  if (cachedToken && cachedToken.exp - Date.now() > 120_000) return cachedToken.token
  const r = await fetch(`${baseUrl}/api/v1/authentication/login`, { method: 'POST', headers: { 'x-client-id': clientId, 'x-api-key': apiKey } })
  const j = await r.json().catch(() => ({})) as { token?: string; expires_at?: string; code?: string; message?: string }
  if (!r.ok || !j.token) throw new AirwallexError(j.message || `login ${r.status}`, r.status, j.code)
  cachedToken = { token: j.token, exp: j.expires_at ? Date.parse(j.expires_at) : Date.now() + 25 * 60_000 }
  return j.token
}

export async function awxRequest<T = any>(method: 'GET' | 'POST', path: string, body?: unknown, opts: { apiVersion?: string } = {}): Promise<T> {
  const { baseUrl } = airwallexConfig()
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }
  if (opts.apiVersion) headers['x-api-version'] = opts.apiVersion
  const r = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const j = await r.json().catch(() => ({})) as any
  if (!r.ok) throw new AirwallexError(j?.message || `Airwallex HTTP ${r.status}`, r.status, j?.code, j?.details)
  return j as T
}

const rid = (prefix: string) => `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.slice(0, 64)

// ---------------------------------------------------------------------------
// Acheteur : client + carte enregistrée (consentement « débit par le marchand »)
// ---------------------------------------------------------------------------
export function createCustomer(input: { merchantCustomerId: string; email?: string | null; name?: string | null }) {
  return awxRequest<{ id: string }>('POST', '/api/v1/pa/customers/create', {
    request_id: rid('cus'), merchant_customer_id: input.merchantCustomerId.slice(0, 64),
    ...(input.email ? { email: input.email } : {}),
    ...(input.name ? { first_name: input.name.slice(0, 50) } : {}),
  })
}

/** Page hébergée Airwallex pour enregistrer une carte (débitée plus tard par ShaPop). */
export function createSaveCardSession(input: { customerId: string; currency: string; successUrl: string }) {
  const { accountId } = airwallexConfig()
  return awxRequest<{ id: string; url: string }>('POST', '/api/v1/checkout/checkout_sessions/create', {
    ...(accountId ? { account_id: accountId } : {}),
    mode: 'SETUP', request_id: rid('setup'), currency: input.currency, customer_id: input.customerId,
    success_url: input.successUrl,
    payment_options: { payment_method_save: { next_triggered_by: 'MERCHANT' } },
  }, { apiVersion: CHECKOUT_API_VERSION })
}

export type AwxConsent = { id: string; status: string; payment_method?: { id: string; type?: string; card?: { brand?: string; last4?: string; expiry_month?: string; expiry_year?: string } } }

/** Dernière carte enregistrée (consentement vérifié) du client, ou null. */
export async function latestVerifiedConsent(customerId: string): Promise<AwxConsent | null> {
  const r = await awxRequest<{ items?: AwxConsent[] }>('GET', `/api/v1/pa/payment_consents?customer_id=${encodeURIComponent(customerId)}&status=VERIFIED&page_size=20`)
  const items = (r.items || []).filter(c => c.status === 'VERIFIED' && c.payment_method?.id)
  return items.length ? items[0] : null
}

// ---------------------------------------------------------------------------
// Paiement : réservation sans l'acheteur, prélèvement, annulation, remboursement
// ---------------------------------------------------------------------------
export type AwxIntent = { id: string; status: string; amount: number; currency: string; captured_amount?: number; latest_payment_attempt?: { failure_code?: string } }

export async function authorize(input: { orderId: string; amount: number; currency: string; customerId: string; consent: AwxConsent }) {
  const intent = await awxRequest<AwxIntent>('POST', '/api/v1/pa/payment_intents/create', {
    request_id: rid('pi'), amount: input.amount, currency: input.currency,
    merchant_order_id: input.orderId, customer_id: input.customerId,
    metadata: { order_id: input.orderId, type: 'auction_auth' },
  })
  try {
    const confirmed = await awxRequest<AwxIntent>('POST', `/api/v1/pa/payment_intents/${intent.id}/confirm`, {
      request_id: rid('cf'), customer_id: input.customerId, payment_consent_id: input.consent.id,
      payment_method: { id: input.consent.payment_method!.id, type: 'card' },
      triggered_by: 'merchant',
      payment_method_options: { card: { auto_capture: false } },
    })
    return confirmed
  } catch (err) {
    // Refus de la banque : on garde l'id pour la commande
    if (err instanceof AirwallexError) (err as AirwallexError & { intentId?: string }).intentId = intent.id
    throw err
  }
}

export function getIntent(id: string) {
  return awxRequest<AwxIntent>('GET', `/api/v1/pa/payment_intents/${encodeURIComponent(id)}`)
}
export function capture(id: string, amount: number) {
  return awxRequest<AwxIntent>('POST', `/api/v1/pa/payment_intents/${encodeURIComponent(id)}/capture`, { request_id: rid('cap'), amount })
}
export function cancel(id: string, reason = 'Order cancelled') {
  return awxRequest<AwxIntent>('POST', `/api/v1/pa/payment_intents/${encodeURIComponent(id)}/cancel`, { request_id: rid('can'), cancellation_reason: reason })
}
export function refund(intentId: string, amount?: number, reason?: string) {
  return awxRequest('POST', '/api/v1/pa/refunds/create', {
    request_id: rid('rf'), payment_intent_id: intentId,
    ...(amount != null ? { amount } : {}), ...(reason ? { reason: reason.slice(0, 128) } : {}),
  })
}

// ---------------------------------------------------------------------------
// Vendeur israélien : compte bancaire (IBAN IL…) et virement en shekels (Masav)
// ---------------------------------------------------------------------------
export function normalizeIsraeliIban(input: string): string | null {
  const iban = String(input || '').replace(/\s+/g, '').toUpperCase()
  if (!/^IL\d{21}$/.test(iban)) return null
  // Contrôle IBAN (modulo 97)
  const moved = iban.slice(4) + iban.slice(0, 4)
  const digits = moved.replace(/[A-Z]/g, ch => String(ch.charCodeAt(0) - 55))
  let rem = 0
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97
  return rem === 1 ? iban : null
}

export function createIsraeliBeneficiary(input: { firstName: string; lastName: string; iban: string; city: string; street: string; postcode?: string | null; nickname: string }) {
  return awxRequest<{ beneficiary_id?: string; id?: string }>('POST', '/api/v1/beneficiaries/create', {
    beneficiary: {
      type: 'BANK_ACCOUNT', entity_type: 'PERSONAL', first_name: input.firstName, last_name: input.lastName,
      address: { country_code: 'IL', city: input.city, street_address: input.street, ...(input.postcode ? { postcode: input.postcode } : {}) },
      bank_details: { bank_country_code: 'IL', account_currency: 'ILS', account_name: `${input.firstName} ${input.lastName}`.slice(0, 200), iban: input.iban },
    },
    transfer_methods: ['LOCAL'],
    nickname: input.nickname.slice(0, 60),
  })
}

/**
 * Virement au vendeur. Part du solde dans la même devise ; si ce solde ne suffit pas et qu'une devise
 * de secours est réglée (AIRWALLEX_PAYOUT_SOURCE_CURRENCY, ex. USD), Airwallex convertit depuis celle-ci.
 * Le vendeur reçoit toujours le montant exact dans sa devise.
 */
export async function transferToBeneficiary(input: { beneficiaryId: string; amount: number; currency: string; orderId: string }) {
  try {
    return await createTransfer(input, input.currency, '')
  } catch (err) {
    const fallback = (process.env.AIRWALLEX_PAYOUT_SOURCE_CURRENCY || '').trim().toUpperCase()
    if (err instanceof AirwallexError && err.code === 'balance_insufficient' && fallback && fallback !== input.currency) {
      return createTransfer(input, fallback, '-fx')
    }
    throw err
  }
}

function createTransfer(input: { beneficiaryId: string; amount: number; currency: string; orderId: string }, sourceCurrency: string, suffix: string) {
  return awxRequest<{ id: string; status: string }>('POST', '/api/v1/transfers/create', {
    request_id: `payout-${input.orderId}${suffix}`.slice(0, 64),
    beneficiary_id: input.beneficiaryId,
    transfer_amount: input.amount.toFixed(2),
    transfer_currency: input.currency,
    source_currency: sourceCurrency,
    transfer_method: 'LOCAL',
    reason: 'marketplace_payout',
    reference: `ShaPop ${input.orderId.slice(0, 8).toUpperCase()}`,
  })
}

// ---------------------------------------------------------------------------
// Webhooks : x-signature = hex(HMAC-SHA256(secret, x-timestamp + corps brut))
// ---------------------------------------------------------------------------
export function signAirwallexWebhook(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(timestamp + body).digest('hex')
}
export function verifyAirwallexWebhook(input: { timestamp?: string; signature?: string; body: string }): boolean {
  const secret = (process.env.AIRWALLEX_WEBHOOK_SECRET || '').trim()
  if (!secret || !input.timestamp || !input.signature) return false
  const ts = Number(input.timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60_000) return false
  const expected = Buffer.from(signAirwallexWebhook(secret, input.timestamp, input.body))
  const got = Buffer.from(input.signature)
  return expected.length === got.length && crypto.timingSafeEqual(expected, got)
}

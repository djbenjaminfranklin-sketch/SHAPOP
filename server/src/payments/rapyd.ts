// Client Rapyd (paiements en Israël). Éteint tant que RAPYD_ENABLED n'est pas « true »
// et que les clés ne sont pas posées. Doc : https://docs.rapyd.net (lue le 24/11/2026).
//
// Signature d'une requête (https://docs.rapyd.net/en/request-signatures.html) :
//   chaîne = méthode en minuscules + chemin (/v1/…, avec ?query) + salt + timestamp + access_key + secret_key + corps
//   signature = base64( hex( HMAC-SHA256(secret_key, chaîne) ) )
//   corps = JSON SANS espaces (celui-là même qui est envoyé), "" si pas de corps.
import crypto from 'crypto'

export const RAPYD_SANDBOX_URL = 'https://sandboxapi.rapyd.net'
export const RAPYD_PRODUCTION_URL = 'https://api.rapyd.net'

export function rapydConfig() {
  const accessKey = (process.env.RAPYD_ACCESS_KEY || '').trim()
  const secretKey = (process.env.RAPYD_SECRET_KEY || '').trim()
  const baseUrl = (process.env.RAPYD_BASE_URL || RAPYD_SANDBOX_URL).replace(/\/+$/, '')
  const enabled = process.env.RAPYD_ENABLED === 'true' && !!accessKey && !!secretKey
  return { accessKey, secretKey, baseUrl, enabled }
}

/** Corps exactement tel qu'il sera envoyé ET signé (aucun espace hors des chaînes). */
export function rapydBody(body: unknown): string {
  return body === undefined || body === null ? '' : JSON.stringify(body)
}

export function rapydSalt(): string {
  return crypto.randomBytes(8).toString('hex') // 16 caractères
}

export function signRapydRequest(input: {
  method: string; path: string; salt: string; timestamp: string; accessKey: string; secretKey: string; body: string
}): string {
  const toSign = input.method.toLowerCase() + input.path + input.salt + input.timestamp + input.accessKey + input.secretKey + input.body
  const hex = crypto.createHmac('sha256', input.secretKey).update(toSign).digest('hex')
  return Buffer.from(hex).toString('base64')
}

/** Webhook : même calcul, SANS méthode, avec l'adresse complète du point de réception. */
export function signRapydWebhook(input: {
  url: string; salt: string; timestamp: string; accessKey: string; secretKey: string; body: string
}): string {
  const toSign = input.url + input.salt + input.timestamp + input.accessKey + input.secretKey + input.body
  const hex = crypto.createHmac('sha256', input.secretKey).update(toSign).digest('hex')
  return Buffer.from(hex).toString('base64')
}

export function verifyRapydWebhook(input: { url: string; salt?: string; timestamp?: string; signature?: string; body: string }): boolean {
  const { accessKey, secretKey } = rapydConfig()
  if (!accessKey || !secretKey || !input.salt || !input.timestamp || !input.signature) return false
  const ts = Number(input.timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false
  const expected = signRapydWebhook({ url: input.url, salt: input.salt, timestamp: input.timestamp, accessKey, secretKey, body: input.body })
  const a = Buffer.from(expected); const b = Buffer.from(input.signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export class RapydError extends Error {
  constructor(message: string, public status: number, public errorCode?: string, public response?: unknown) {
    super(message)
  }
}

export async function rapydRequest<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, opts: { idempotency?: string } = {}): Promise<T> {
  const { accessKey, secretKey, baseUrl } = rapydConfig()
  if (!accessKey || !secretKey) throw new RapydError('Rapyd keys missing', 0, 'NOT_CONFIGURED')
  const salt = rapydSalt()
  const timestamp = String(Math.floor(Date.now() / 1000))
  const bodyStr = rapydBody(body)
  const signature = signRapydRequest({ method, path, salt, timestamp, accessKey, secretKey, body: bodyStr })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', access_key: accessKey, salt, timestamp, signature,
  }
  if (opts.idempotency) headers.idempotency = opts.idempotency
  const resp = await fetch(baseUrl + path, { method, headers, body: bodyStr || undefined })
  const json = await resp.json().catch(() => ({})) as { status?: { status?: string; error_code?: string; message?: string }; data?: T }
  if (!resp.ok || json?.status?.status === 'ERROR') {
    throw new RapydError(json?.status?.message || `Rapyd HTTP ${resp.status}`, resp.status, json?.status?.error_code, json)
  }
  return json.data as T
}

// ---------------------------------------------------------------------------
// Appels utilisés par ShaPop
// ---------------------------------------------------------------------------
export type RapydPayment = {
  id: string; status: string; amount: number; captured?: boolean; next_action?: string
  failure_code?: string; failure_message?: string
  escrow?: { id: string; status: string; amount_on_hold?: number } | null
}

/** Client acheteur (cus_…). */
export function createCustomer(input: { name: string; email?: string | null; metadata?: Record<string, string> }) {
  return rapydRequest<{ id: string; default_payment_method?: string }>('POST', '/v1/customers', {
    name: input.name, ...(input.email ? { email: input.email } : {}), ...(input.metadata ? { metadata: input.metadata } : {}),
  })
}

/** Page hébergée pour enregistrer une carte (débitée plus tard sans le client). */
export function createSaveCardPage(input: { customer: string; country: string; currency: string; completeUrl: string; cancelUrl: string; language?: string }) {
  return rapydRequest<{ id: string; redirect_url: string }>('POST', '/v1/hosted/collect/card', {
    customer: input.customer, country: input.country, currency: input.currency,
    complete_url: input.completeUrl, cancel_url: input.cancelUrl,
    complete_payment_url: input.completeUrl, error_payment_url: input.cancelUrl,
    ...(input.language ? { language: input.language } : {}),
    card_fields: { recurrence_type: 'unscheduled' },
  })
}

export function getCustomer(customer: string) {
  return rapydRequest<{ id: string; default_payment_method?: string; payment_methods?: { data?: { id: string; type: string; last4?: string; category?: string }[] } }>('GET', `/v1/customers/${encodeURIComponent(customer)}`)
}

/**
 * Autorisation à la fin de l'enchère : carte du client débitée sans lui (unscheduled), capture=false,
 * argent en séquestre et partagé avec le portefeuille du vendeur (le reste = commission ShaPop).
 */
export function authorizePayment(input: {
  amount: number; currency: string; customer: string; paymentMethod?: string
  sellerEwallet?: string | null; sellerAmount?: number; orderId: string; description?: string
}) {
  return rapydRequest<RapydPayment>('POST', '/v1/payments', {
    amount: input.amount,
    currency: input.currency,
    customer: input.customer,
    ...(input.paymentMethod ? { payment_method: input.paymentMethod } : {}),
    capture: false,
    initiation_type: 'unscheduled',
    ...(input.sellerEwallet ? {
      ewallets: [{ ewallet: input.sellerEwallet, amount: input.sellerAmount }],
      escrow: true,
      escrow_release_days: 90,
    } : {}),
    merchant_reference_id: input.orderId,
    metadata: { order_id: input.orderId, type: 'auction_auth' },
    ...(input.description ? { description: input.description } : {}),
  }, { idempotency: `auth-${input.orderId}-${Date.now()}` })
}

export function getPayment(payment: string) {
  return rapydRequest<RapydPayment>('GET', `/v1/payments/${encodeURIComponent(payment)}`)
}

/** Prélève le montant réel (≤ montant autorisé). */
export function capturePayment(payment: string, amount?: number) {
  return rapydRequest<RapydPayment>('POST', `/v1/payments/${encodeURIComponent(payment)}/capture`, amount != null ? { amount } : {})
}

/** Annule une autorisation non prélevée (statut ACT). */
export function cancelPayment(payment: string) {
  return rapydRequest<RapydPayment>('DELETE', `/v1/payments/${encodeURIComponent(payment)}`)
}

/** Remise confirmée : libère l'argent du séquestre vers le portefeuille du vendeur. */
export function releaseEscrow(payment: string, escrow: string, sellerEwallet: string, amount?: number) {
  return rapydRequest('POST', `/v1/payments/${encodeURIComponent(payment)}/escrows/${encodeURIComponent(escrow)}/escrow_releases`, {
    ewallets: [amount != null ? { ewallet: sellerEwallet, amount } : { ewallet: sellerEwallet, percentage: 100 }],
  })
}

export function createRefund(input: { payment: string; amount?: number; reason?: string; orderId?: string }) {
  return rapydRequest('POST', '/v1/refunds', {
    payment: input.payment,
    ...(input.amount != null ? { amount: input.amount } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.orderId ? { merchant_reference_id: input.orderId } : {}),
  })
}

/** Portefeuille d'un vendeur particulier (vérification d'identité ensuite). */
export function createPersonWallet(input: { firstName: string; lastName: string; referenceId: string; email?: string | null; phone?: string | null; country: string }) {
  return rapydRequest<{ id: string }>('POST', '/v1/ewallets', {
    type: 'person',
    first_name: input.firstName,
    last_name: input.lastName,
    ewallet_reference_id: input.referenceId,
    contact: {
      contact_type: 'personal', first_name: input.firstName, last_name: input.lastName, country: input.country,
      ...(input.email ? { email: input.email } : {}), ...(input.phone ? { phone_number: input.phone } : {}),
    },
  })
}

/** À appeler avec les clés pour savoir ce que Rapyd propose en Israël (Bit ? cartes ILS ? virements ?). */
export function listPaymentMethodsForCountry(country: string, currency: string) {
  return rapydRequest('GET', `/v1/payment_methods/countries/${encodeURIComponent(country)}?currency=${encodeURIComponent(currency)}`)
}
export function listPayoutMethodTypes(country: string, currency: string) {
  return rapydRequest('GET', `/v1/payout_method_types?beneficiary_country=${encodeURIComponent(country)}&payout_currency=${encodeURIComponent(currency)}`)
}

/**
 * Remise confirmée : l'argent encaissé reste sur le portefeuille de la plateforme (ShaPop) jusqu'à la
 * remise, puis la part du vendeur passe sur SON portefeuille (transfert entre portefeuilles,
 * accepté aussitôt). À VÉRIFIER avec Rapyd au moment de l'activation (doc « Transfer Funds Between Wallets »).
 */
export async function transferToWallet(input: { sourceEwallet: string; destinationEwallet: string; amount: number; currency: string; orderId: string }) {
  const t = await rapydRequest<{ id: string; status: string }>('POST', '/v1/account/transfer', {
    source_ewallet: input.sourceEwallet,
    destination_ewallet: input.destinationEwallet,
    amount: input.amount,
    currency: input.currency,
    metadata: { order_id: input.orderId, type: 'seller_payout' },
  }, { idempotency: `payout-${input.orderId}` })
  if (t?.status === 'PEN') {
    await rapydRequest('POST', '/v1/account/transfer/response', { id: t.id, status: 'accept' })
  }
  return t
}

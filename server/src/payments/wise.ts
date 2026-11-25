// Wise Business : virements en shekels (ILS) aux vendeurs israéliens (décision du 25/11/2026).
// L'acheteur paie par Stripe sur le compte ShaPop ; Stripe verse les euros sur le compte Wise Business ;
// chaque jour, le serveur PRÉPARE un lot de virements (batch group) ; Benjamin le FINANCE et le valide
// lui-même dans l'appli Wise (validation forte obligatoire en Europe : le serveur ne finance jamais).
// Éteint tant que WISE_ENABLED n'est pas « true » avec WISE_API_TOKEN et WISE_PROFILE_ID.
// Doc : https://docs.wise.com/api-docs (batch groups, quotes v3, recipients).

export const WISE_PRODUCTION_URL = 'https://api.transferwise.com'
export const WISE_SANDBOX_URL = 'https://api.sandbox.transferwise.tech'

export function wiseConfig() {
  const token = (process.env.WISE_API_TOKEN || '').trim()
  const profileId = (process.env.WISE_PROFILE_ID || '').trim()
  const baseUrl = (process.env.WISE_BASE_URL || WISE_PRODUCTION_URL).replace(/\/+$/, '')
  const sourceCurrency = (process.env.WISE_SOURCE_CURRENCY || 'EUR').trim().toUpperCase()
  const enabled = process.env.WISE_ENABLED === 'true' && !!token && !!profileId
  return { token, profileId, baseUrl, sourceCurrency, enabled, sandbox: baseUrl.includes('sandbox') }
}

export class WiseError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message) }
}

async function wiseRequest<T = any>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const { token, baseUrl } = wiseConfig()
  if (!token) throw new WiseError('Wise token missing', 0)
  const r = await fetch(baseUrl + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({})) as any
  if (!r.ok) {
    const msg = j?.errors?.[0]?.message || j?.message || j?.error || `Wise HTTP ${r.status}`
    throw new WiseError(String(msg), r.status, j)
  }
  return j as T
}

/** Destinataire : compte bancaire israélien (IBAN IL…, 23 caractères) au nom du vendeur. */
export async function createIlsRecipient(input: { holderName: string; iban: string }): Promise<string> {
  const { profileId } = wiseConfig()
  const r = await wiseRequest<{ id: number | string }>('POST', '/v1/accounts', {
    profile: Number(profileId) || profileId,
    accountHolderName: input.holderName.slice(0, 140),
    currency: 'ILS',
    type: 'iban',
    details: { legalType: 'PRIVATE', IBAN: input.iban },
  })
  return String(r.id)
}

export async function createBatchGroup(name: string): Promise<{ id: string; version: number }> {
  const { profileId, sourceCurrency } = wiseConfig()
  const r = await wiseRequest<{ id: string; version: number }>('POST', `/v3/profiles/${profileId}/batch-groups`, { name: name.slice(0, 100), sourceCurrency })
  return { id: String(r.id), version: Number(r.version || 0) }
}

/** Devis : le vendeur reçoit EXACTEMENT targetAmount en ILS ; Wise calcule les euros à prélever. */
export async function createQuote(targetAmount: number, recipientId: string): Promise<string> {
  const { profileId, sourceCurrency } = wiseConfig()
  const r = await wiseRequest<{ id: string }>('POST', `/v3/profiles/${profileId}/quotes`, {
    sourceCurrency, targetCurrency: 'ILS', targetAmount: Math.round(targetAmount * 100) / 100,
    targetAccount: Number(recipientId) || recipientId, payOut: 'BANK_TRANSFER',
  })
  return String(r.id)
}

export async function addBatchTransfer(batchId: string, input: { recipientId: string; quoteId: string; orderId: string; reference: string }): Promise<string> {
  const { profileId } = wiseConfig()
  const r = await wiseRequest<{ id: number | string }>('POST', `/v3/profiles/${profileId}/batch-groups/${batchId}/transfers`, {
    targetAccount: Number(input.recipientId) || input.recipientId,
    quoteUuid: input.quoteId,
    // Identifiant unique côté ShaPop : Wise refuse un 2e virement avec le même (pas de double paiement)
    customerTransactionId: input.orderId,
    details: { reference: input.reference.slice(0, 35) },
  })
  return String(r.id)
}

/** Ferme le lot : il apparaît alors dans l'appli Wise, prêt à être financé et validé par Benjamin. */
export async function completeBatchGroup(batchId: string, version: number): Promise<void> {
  const { profileId } = wiseConfig()
  await wiseRequest('PATCH', `/v3/profiles/${profileId}/batch-groups/${batchId}`, { status: 'COMPLETED', version })
}

export async function getBatchGroupVersion(batchId: string): Promise<number> {
  const { profileId } = wiseConfig()
  const r = await wiseRequest<{ version: number }>('GET', `/v3/profiles/${profileId}/batch-groups/${batchId}`)
  return Number(r.version || 0)
}

export async function getTransferStatus(transferId: string): Promise<string> {
  const r = await wiseRequest<{ status: string }>('GET', `/v1/transfers/${encodeURIComponent(transferId)}`)
  return String(r.status || '')
}

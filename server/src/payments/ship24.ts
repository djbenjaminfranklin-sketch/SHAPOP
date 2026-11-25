// Suivi des colis par Ship24 (relié aux transporteurs, dont Israel Post) — décision du 25/11/2026.
// Le site d'Israel Post bloque toute lecture automatique (Cloudflare, 403) : on passe par Ship24.
// Éteint tant que SHIP24_API_KEY n'est pas posée : la règle provisoire s'applique alors seule
// (code de réception saisi par l'acheteur, sinon versement 10 jours après l'envoi).
// Doc : https://docs.ship24.com (lue le 25/11/2026).
import crypto from 'crypto'

const BASE_URL = 'https://api.ship24.com/public/v1'

export function ship24Enabled(): boolean {
  return !!(process.env.SHIP24_API_KEY || '').trim()
}

export class Ship24Error extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}

async function request<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const key = (process.env.SHIP24_API_KEY || '').trim()
  if (!key) throw new Ship24Error('Ship24 key missing', 0, 'not_configured')
  const r = await fetch(BASE_URL + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({})) as any
  if (!r.ok) {
    const err = Array.isArray(j?.errors) ? j.errors[0] : null
    throw new Ship24Error(err?.message || `Ship24 HTTP ${r.status}`, r.status, err?.code)
  }
  return j as T
}

// ---------------------------------------------------------------------------
// Numéro de suivi : forme et chiffre de contrôle (norme UPU S10 : 2 lettres, 8 chiffres + 1 chiffre de contrôle, 2 lettres)
// ---------------------------------------------------------------------------
export function normalizeTrackingNumber(input: string): string {
  return String(input || '').replace(/[\s-]+/g, '').toUpperCase()
}

export function isValidS10(tn: string): boolean {
  const m = /^[A-Z]{2}(\d{8})(\d)[A-Z]{2}$/.exec(tn)
  if (!m) return false
  const weights = [8, 6, 4, 2, 3, 5, 9, 7]
  const sum = m[1].split('').reduce((s, d, i) => s + Number(d) * weights[i], 0)
  let check = 11 - (sum % 11)
  if (check === 10) check = 0
  if (check === 11) check = 5
  return check === Number(m[2])
}

/** Numéro accepté : format international S10 valide, sinon 8 à 30 lettres/chiffres (autres formats de transporteurs). */
export function checkTrackingNumber(input: string): { ok: true; value: string } | { ok: false; error: 'tracking_required' | 'tracking_invalid' } {
  const tn = normalizeTrackingNumber(input)
  if (!tn) return { ok: false, error: 'tracking_required' }
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(tn)) return isValidS10(tn) ? { ok: true, value: tn } : { ok: false, error: 'tracking_invalid' }
  if (!/^[A-Z0-9]{8,30}$/.test(tn) || !/\d{6,}/.test(tn)) return { ok: false, error: 'tracking_invalid' }
  return { ok: true, value: tn }
}

// ---------------------------------------------------------------------------
// Suivi : création du suivi, lecture des résultats, lecture d'un webhook
// ---------------------------------------------------------------------------
export type CarrierTracking = {
  trackerId: string | null
  trackingNumber: string | null
  milestone: string | null
  firstEventAt: string | null
  deliveredAt: string | null
  shipmentReference: string | null
}

export function parseTracking(t: any): CarrierTracking {
  const events: any[] = Array.isArray(t?.events) ? t.events : []
  const dates = events.map(e => e?.occurrenceDatetime || e?.datetime).filter(Boolean).map(String).sort()
  const milestone = t?.shipment?.statusMilestone || null
  const deliveredEvent = events.find(e => e?.statusMilestone === 'delivered')
  const deliveredAt = milestone === 'delivered' ? String(deliveredEvent?.occurrenceDatetime || new Date().toISOString()) : null
  return {
    trackerId: t?.tracker?.trackerId || null,
    trackingNumber: t?.tracker?.trackingNumber || null,
    milestone,
    firstEventAt: dates[0] || null,
    deliveredAt,
    shipmentReference: t?.tracker?.shipmentReference || null,
  }
}

/** Crée le suivi du colis (Ship24 interroge le transporteur et préviendra par webhook à chaque étape). */
export async function trackShipment(input: { trackingNumber: string; orderId: string; destinationCountryCode?: string | null; destinationPostCode?: string | null }): Promise<CarrierTracking | null> {
  const r = await request<{ data?: { trackings?: any[] } }>('POST', '/trackers/track', {
    trackingNumber: input.trackingNumber,
    shipmentReference: input.orderId,
    ...(input.destinationCountryCode ? { destinationCountryCode: input.destinationCountryCode } : {}),
    ...(input.destinationPostCode ? { destinationPostCode: input.destinationPostCode } : {}),
  })
  const t = r?.data?.trackings?.[0]
  return t ? parseTracking(t) : null
}

export async function trackerResults(trackerId: string): Promise<CarrierTracking | null> {
  const r = await request<{ data?: { trackings?: any[] } }>('GET', `/trackers/${encodeURIComponent(trackerId)}/results`)
  const t = r?.data?.trackings?.[0]
  return t ? parseTracking(t) : null
}

/** Webhook : Ship24 envoie « Authorization: Bearer <secret du webhook> ». */
export function verifyShip24Webhook(authorization: string | undefined): boolean {
  const secret = (process.env.SHIP24_WEBHOOK_SECRET || '').trim()
  if (!secret || !authorization) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const got = Buffer.from(authorization.trim())
  return expected.length === got.length && crypto.timingSafeEqual(expected, got)
}

import crypto from 'crypto'

// =============================================
// Sendcloud API Integration
// Multi-carrier shipping via Sendcloud (Mondial Relay, DHL, etc.)
// =============================================

const SENDCLOUD_PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY || ''
const SENDCLOUD_SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY || ''

const PANEL_BASE_URL = 'https://panel.sendcloud.sc'
const SERVICEPOINTS_BASE_URL = 'https://servicepoints.sendcloud.sc'

export function isSendcloudConfigured(): boolean {
  return !!(SENDCLOUD_PUBLIC_KEY && SENDCLOUD_SECRET_KEY)
}

// =============================================
// HTTP helper with Basic Auth
// =============================================
async function sendcloudRequest(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const auth = Buffer.from(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`).toString('base64')

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await resp.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!resp.ok) {
      const errMsg = data?.error?.message || data?.message || `Sendcloud API error: ${resp.status}`
      console.error(`[Sendcloud] ${method} ${url} failed:`, resp.status, errMsg)
      return { ok: false, status: resp.status, data, error: errMsg }
    }

    return { ok: true, status: resp.status, data }
  } catch (err) {
    console.error(`[Sendcloud] ${method} ${url} exception:`, err)
    return { ok: false, status: 0, data: null, error: 'Sendcloud request failed' }
  }
}

// =============================================
// Shipping Methods
// =============================================
export interface SendcloudShippingMethod {
  id: number
  name: string
  carrier: string
  min_weight: number // kg
  max_weight: number // kg
  countries: Array<{ id: number; iso_2: string; iso_3: string; name: string; price: number }>
}

let cachedShippingMethods: SendcloudShippingMethod[] | null = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function getShippingMethods(): Promise<SendcloudShippingMethod[]> {
  if (cachedShippingMethods && Date.now() - cachedAt < CACHE_TTL) {
    return cachedShippingMethods
  }

  const result = await sendcloudRequest('GET', `${PANEL_BASE_URL}/api/v2/shipping_methods`)
  if (!result.ok) {
    console.error('[Sendcloud] Failed to fetch shipping methods:', result.error)
    return cachedShippingMethods || []
  }

  cachedShippingMethods = result.data.shipping_methods || []
  cachedAt = Date.now()
  return cachedShippingMethods!
}

/** Find the best shipping method for a given weight and country pair */
export async function findShippingMethod(
  fromCountry: string,
  toCountry: string,
  weightKg: number,
  carrier?: string,
): Promise<SendcloudShippingMethod | null> {
  const methods = await getShippingMethods()
  const to = toCountry.toUpperCase()

  const matching = methods.filter(m => {
    if (weightKg < m.min_weight || weightKg > m.max_weight) return false
    if (!m.countries.some(c => c.iso_2 === to)) return false
    if (carrier && !m.carrier.toLowerCase().includes(carrier.toLowerCase())) return false
    return true
  })

  // Prefer service-point methods for Mondial Relay
  return matching[0] || null
}

// =============================================
// Shipping Price
// =============================================
export async function getShippingPrice(
  methodId: number,
  fromCountry: string,
  toCountry: string,
  weightKg: number,
): Promise<{ price: number; currency: string } | null> {
  const params = new URLSearchParams({
    shipping_method_id: String(methodId),
    from_country: fromCountry.toUpperCase(),
    to_country: toCountry.toUpperCase(),
    weight: String(weightKg),
    weight_unit: 'kilogram',
  })

  const result = await sendcloudRequest('GET', `${PANEL_BASE_URL}/api/v2/shipping-price?${params}`)
  if (!result.ok) return null

  const prices = result.data
  if (Array.isArray(prices) && prices.length > 0) {
    return { price: prices[0].price, currency: prices[0].currency || 'EUR' }
  }
  return null
}

// =============================================
// Service Points (Relay Points)
// =============================================
export interface SendcloudServicePoint {
  id: number
  name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  country: string
  latitude: string
  longitude: string
  distance: number | null
  carrier: string
  open_tomorrow: boolean
  open_upcoming_week: boolean
  opening_hours: Record<string, { open: string; close: string }[]>
}

export async function searchServicePoints(params: {
  country: string
  zip: string
  carrier?: string
  radius?: number
  nb?: number
}): Promise<{ points: SendcloudServicePoint[]; error?: string }> {
  const queryParams = new URLSearchParams({
    country: params.country.toUpperCase(),
    address: params.zip,
  })
  if (params.carrier) queryParams.set('carrier', params.carrier)
  if (params.radius) queryParams.set('radius', String(params.radius))

  const result = await sendcloudRequest(
    'GET',
    `${SERVICEPOINTS_BASE_URL}/api/v2/service-points/?${queryParams}`,
  )

  if (!result.ok) {
    return { points: [], error: result.error }
  }

  let points: SendcloudServicePoint[] = result.data || []
  // If the API wraps in a results array
  if (result.data?.results) points = result.data.results

  // Limit results
  const limit = params.nb || 10
  points = points.slice(0, limit)

  return { points }
}

/** Map Sendcloud service points to the RelayPoint format the client expects */
export function mapServicePointToRelay(sp: SendcloudServicePoint): {
  id: string
  name: string
  address: string
  city: string
  zip: string
  country: string
  latitude: string
  longitude: string
  distance: string
  openingHours: Record<string, string>
  photoUrl: string | null
} {
  // Format opening hours from Sendcloud format to display strings
  const formatHours = (dayHours?: { open: string; close: string }[]): string => {
    if (!dayHours || dayHours.length === 0) return 'Ferme'
    return dayHours.map(h => `${h.open}-${h.close}`).join(', ')
  }

  const oh = sp.opening_hours || {}
  // Sendcloud uses day index (0=Monday) or day name — handle both formats
  const dayMap: Record<string, string[]> = {
    monday: ['0', 'monday'],
    tuesday: ['1', 'tuesday'],
    wednesday: ['2', 'wednesday'],
    thursday: ['3', 'thursday'],
    friday: ['4', 'friday'],
    saturday: ['5', 'saturday'],
    sunday: ['6', 'sunday'],
  }

  const openingHours: Record<string, string> = {}
  for (const [day, keys] of Object.entries(dayMap)) {
    const hours = oh[keys[0]] || oh[keys[1]] || (oh as any)[day]
    openingHours[day] = formatHours(hours)
  }

  return {
    id: String(sp.id),
    name: sp.name || '',
    address: [sp.street, sp.house_number].filter(Boolean).join(' '),
    city: sp.city || '',
    zip: sp.postal_code || '',
    country: sp.country || '',
    latitude: sp.latitude || '',
    longitude: sp.longitude || '',
    distance: sp.distance != null ? String(Math.round(sp.distance)) : '',
    openingHours,
    photoUrl: null,
  }
}

// =============================================
// Create Parcel (with label)
// =============================================
export interface CreateParcelParams {
  name: string
  address: string
  house_number?: string
  city: string
  postal_code: string
  country: string // ISO 2-letter
  telephone?: string
  email?: string
  order_number?: string
  weight: number // kg (decimal)
  shipment: { id: number } // shipping method ID
  request_label: boolean
  to_service_point?: number // service point ID for relay delivery
  sender_address?: number // sender address ID from Sendcloud panel
  // Customs fields for international
  customs_invoice_nr?: string
  customs_shipment_type?: number
  parcel_items?: Array<{
    description: string
    quantity: number
    weight: number
    value: string
    hs_code?: string
    origin_country?: string
  }>
}

export interface SendcloudParcel {
  id: number
  tracking_number: string
  tracking_url: string
  status: { id: number; message: string }
  label: { normal_printer: string[]; label_printer: string[] }
  carrier: { code: string }
  order_number: string
}

export async function createParcel(params: CreateParcelParams): Promise<{
  parcel: SendcloudParcel | null
  error?: string
}> {
  const result = await sendcloudRequest('POST', `${PANEL_BASE_URL}/api/v2/parcels`, {
    parcel: params,
  })

  if (!result.ok) {
    return { parcel: null, error: result.error }
  }

  return { parcel: result.data.parcel || null }
}

// =============================================
// Get Label PDF
// =============================================
export function getLabelUrl(parcelId: number, format: 'normal_printer' | 'label_printer' = 'normal_printer'): string {
  return `${PANEL_BASE_URL}/api/v2/labels/${format}/${parcelId}`
}

export async function getLabel(parcelId: number, format: 'normal_printer' | 'label_printer' = 'normal_printer'): Promise<{
  url: string
  error?: string
}> {
  const url = getLabelUrl(parcelId, format)
  const auth = Buffer.from(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`).toString('base64')

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` },
      redirect: 'follow',
    })

    if (!resp.ok) {
      return { url: '', error: `Label download failed: ${resp.status}` }
    }

    // The API returns the PDF URL or redirects to it
    return { url }
  } catch (err) {
    console.error('[Sendcloud] Label download error:', err)
    return { url: '', error: 'Label download failed' }
  }
}

// =============================================
// Webhook Verification (HMAC-SHA256)
// =============================================
export function verifySendcloudWebhook(payload: string | Buffer, signature: string): boolean {
  if (!SENDCLOUD_SECRET_KEY || !signature) return false

  const hmac = crypto.createHmac('sha256', SENDCLOUD_SECRET_KEY)
  hmac.update(typeof payload === 'string' ? payload : payload.toString('utf8'))
  const expected = hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  )
}

// =============================================
// Sendcloud status → ShaPop order status mapping
// =============================================
export function mapSendcloudStatus(statusId: number): string | null {
  // See https://docs.sendcloud.sc/api/v2/shipping/#parcel-statuses
  switch (statusId) {
    case 1000: // Ready to send
    case 11:   // En route to sorting center
    case 12:   // Sorting
    case 22:   // At sorting centre
    case 31:   // Parcel en route
    case 32:   // In transit
    case 33:   // In transit
    case 41:   // Being delivered
    case 62:   // Being sorted
      return 'shipped'

    case 3:    // Delivered
    case 92:   // At service point (available for pickup)
      return 'delivered'

    case 10:   // Returned to sender
    case 15:   // Announced: returning
    case 93:   // Returned to sender
    case 2001: // Unable to deliver
      return 'returned'

    default:
      return null // Unknown status, don't update
  }
}

/** Get a tracking URL for a Sendcloud-managed parcel */
export function getSendcloudTrackingUrl(trackingNumber: string, carrier?: string): string {
  // Sendcloud provides a tracking URL per parcel; use generic one as fallback
  if (carrier?.includes('mondial_relay') || carrier?.includes('mondial-relay')) {
    return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(trackingNumber)}`
  }
  if (carrier?.includes('dhl')) {
    return `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${encodeURIComponent(trackingNumber)}`
  }
  if (carrier?.includes('dpd')) {
    return `https://trace.dpd.fr/fr/trace/${encodeURIComponent(trackingNumber)}`
  }
  // Generic Sendcloud tracking
  return `https://tracking.sendcloud.sc/forward/${encodeURIComponent(trackingNumber)}`
}

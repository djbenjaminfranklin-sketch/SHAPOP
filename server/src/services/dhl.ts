// =============================================
// DHL Express MyDHL API Integration (International)
// Skeleton — credentials not yet available
// =============================================

const DHL_API_KEY = process.env.DHL_API_KEY || ''
const DHL_API_SECRET = process.env.DHL_API_SECRET || ''
const DHL_ACCOUNT_NUMBER = process.env.DHL_ACCOUNT_NUMBER || ''

// Test: https://express.api.dhl.com/mydhlapi/test
// Prod: https://express.api.dhl.com/mydhlapi
const DHL_SANDBOX = process.env.DHL_SANDBOX === 'true'
const DHL_BASE_URL = DHL_SANDBOX
  ? 'https://express.api.dhl.com/mydhlapi/test'
  : 'https://express.api.dhl.com/mydhlapi'

export function isDhlConfigured(): boolean {
  return !!(DHL_API_KEY && DHL_API_SECRET && DHL_ACCOUNT_NUMBER)
}

export async function createDhlShipment(params: {
  orderNo: string
  weight: number // grammes
  content: string
  sender: { name: string; street: string; city: string; zip: string; country: string; phone: string; email: string }
  recipient: { name: string; street: string; city: string; zip: string; country: string; phone: string; email: string }
}): Promise<{ shipmentNumber: string; labelUrl: string; error?: string }> {
  if (!isDhlConfigured()) {
    return { shipmentNumber: '', labelUrl: '', error: 'DHL Express not configured yet' }
  }

  // TODO: When credentials are available, implement:
  // POST {DHL_BASE_URL}/shipments
  // Auth: Basic (DHL_API_KEY:DHL_API_SECRET)
  // Body: DHL Express shipment request with account number
  try {
    const _params = params // placeholder for future implementation
    void _params
    return { shipmentNumber: '', labelUrl: '', error: 'DHL Express integration pending credentials' }
  } catch (err) {
    console.error('[DHL] Shipment creation error:', err)
    return { shipmentNumber: '', labelUrl: '', error: 'DHL Express shipment creation failed' }
  }
}

export async function trackDhlShipment(trackingNumber: string): Promise<{
  delivered: boolean
  events: { date: string; label: string }[]
  status: string
  error?: string
}> {
  if (!isDhlConfigured()) {
    return { delivered: false, events: [], status: '', error: 'DHL Express not configured' }
  }

  // TODO: When credentials are available, implement:
  // GET https://api-eu.dhl.com/track/shipments?trackingNumber={number}
  // Auth: DHL-API-Key header
  try {
    void trackingNumber
    return { delivered: false, events: [], status: '', error: 'DHL Express tracking pending credentials' }
  } catch (err) {
    console.error('[DHL] Tracking error:', err)
    return { delivered: false, events: [], status: '', error: 'DHL Express tracking failed' }
  }
}

export function getDhlTrackingUrl(trackingNumber: string): string {
  return `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${encodeURIComponent(trackingNumber)}`
}

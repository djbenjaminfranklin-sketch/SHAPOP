import crypto from 'crypto'
import { XMLParser } from 'fast-xml-parser'

// =============================================
// Mondial Relay API Integration
// SOAP v1: Relay point search + Tracking
// REST v2: Shipment creation + Label generation
// =============================================

// Credentials from .env
const MR_ENSEIGNE = process.env.MONDIAL_RELAY_ENSEIGNE || ''
const MR_PRIVATE_KEY = process.env.MONDIAL_RELAY_PRIVATE_KEY || ''
const MR_API2_LOGIN = process.env.MONDIAL_RELAY_API2_LOGIN || ''
const MR_API2_PASSWORD = process.env.MONDIAL_RELAY_API2_PASSWORD || ''
const MR_CUSTOMER_ID = process.env.MONDIAL_RELAY_CUSTOMER_ID || ''

const MR_SANDBOX = process.env.MONDIAL_RELAY_SANDBOX === 'true'

const SOAP_URL = MR_SANDBOX
  ? 'https://api.mondialrelay.com/Web_Services.asmx' // same URL, test via credentials
  : 'https://api.mondialrelay.com/Web_Services.asmx'
const REST_URL = MR_SANDBOX
  ? 'https://connect-sandbox-api.mondialrelay.com/api/shipment'
  : 'https://connect-api.mondialrelay.com/api/shipment'

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export function isMondialRelayConfigured(): boolean {
  return !!(MR_ENSEIGNE && MR_PRIVATE_KEY)
}

export function isMondialRelayShipmentConfigured(): boolean {
  return !!(MR_API2_LOGIN && MR_API2_PASSWORD && MR_CUSTOMER_ID)
}

// =============================================
// SOAP: Search Relay Points (WSI4_PointRelais_Recherche)
// =============================================
export interface RelayPoint {
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
}

export async function searchRelayPoints(params: {
  country: string
  zip: string
  city?: string
  weight?: number
  nbResults?: number
}): Promise<{ points: RelayPoint[]; error?: string }> {
  if (!isMondialRelayConfigured()) {
    return { points: [], error: 'Mondial Relay not configured' }
  }

  const enseigne = MR_ENSEIGNE
  const pays = params.country || 'FR'
  const ville = params.city || ''
  const cp = params.zip || ''
  const latitude = ''
  const longitude = ''
  const taille = ''
  const poids = params.weight ? String(params.weight) : ''
  const action = ''
  const delaiEnvoi = '0'
  const rayonRecherche = ''
  const typeActivite = ''
  const nace = ''
  const nbResults = String(params.nbResults || 10)

  // Compute MD5 security hash
  const hashInput = enseigne + pays + ville + cp + latitude + longitude + taille + poids + action + delaiEnvoi + rayonRecherche + typeActivite + nace + nbResults + MR_PRIVATE_KEY
  const security = crypto.createHash('md5').update(hashInput).digest('hex').toUpperCase()

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.mondialrelay.fr/webservice/">
  <soap:Body>
    <web:WSI4_PointRelais_Recherche>
      <web:Enseigne>${enseigne}</web:Enseigne>
      <web:Pays>${pays}</web:Pays>
      <web:Ville>${escXml(ville)}</web:Ville>
      <web:CP>${cp}</web:CP>
      <web:Latitude>${latitude}</web:Latitude>
      <web:Longitude>${longitude}</web:Longitude>
      <web:Taille>${taille}</web:Taille>
      <web:Poids>${poids}</web:Poids>
      <web:Action>${action}</web:Action>
      <web:DelaiEnvoi>${delaiEnvoi}</web:DelaiEnvoi>
      <web:RayonRecherche>${rayonRecherche}</web:RayonRecherche>
      <web:TypeActivite>${typeActivite}</web:TypeActivite>
      <web:NACE>${nace}</web:NACE>
      <web:NombreResultats>${nbResults}</web:NombreResultats>
      <web:Security>${security}</web:Security>
    </web:WSI4_PointRelais_Recherche>
  </soap:Body>
</soap:Envelope>`

  try {
    const resp = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche',
      },
      body: soapBody,
    })

    if (!resp.ok) {
      return { points: [], error: `Mondial Relay API error: ${resp.status}` }
    }

    const xml = await resp.text()
    const parsed = xmlParser.parse(xml)

    // Navigate SOAP envelope to get result
    const envelope = parsed['soap:Envelope'] || parsed['s:Envelope'] || parsed['SOAP-ENV:Envelope']
    const body = envelope?.['soap:Body'] || envelope?.['s:Body'] || envelope?.['SOAP-ENV:Body']
    const result = body?.['WSI4_PointRelais_RechercheResponse']?.['WSI4_PointRelais_RechercheResult']

    if (!result) {
      return { points: [], error: 'Invalid SOAP response' }
    }

    // Check STAT code (0 = success)
    const stat = result.STAT
    if (stat && String(stat) !== '0') {
      return { points: [], error: `Mondial Relay error code: ${stat}` }
    }

    // Parse relay points
    const rawPoints = result.PointsRelais?.PointRelais_Details
    if (!rawPoints) return { points: [] }

    const pointsList = Array.isArray(rawPoints) ? rawPoints : [rawPoints]

    const points: RelayPoint[] = pointsList.map((p: Record<string, unknown>) => ({
      id: String(p.Num || ''),
      name: String(p.LgAdr1 || '').trim(),
      address: [p.LgAdr2, p.LgAdr3, p.LgAdr4].filter(Boolean).map(s => String(s).trim()).join(', '),
      city: String(p.Ville || '').trim(),
      zip: String(p.CP || ''),
      country: String(p.Pays || ''),
      latitude: String(p.Latitude || '').replace(',', '.'),
      longitude: String(p.Longitude || '').replace(',', '.'),
      distance: String(p.Distance || ''),
      openingHours: {
        monday: formatHours(p.Horaires_Lundi),
        tuesday: formatHours(p.Horaires_Mardi),
        wednesday: formatHours(p.Horaires_Mercredi),
        thursday: formatHours(p.Horaires_Jeudi),
        friday: formatHours(p.Horaires_Vendredi),
        saturday: formatHours(p.Horaires_Samedi),
        sunday: formatHours(p.Horaires_Dimanche),
      },
      photoUrl: p.URL_Photo ? `https://www.mondialrelay.fr${p.URL_Photo}` : null,
    }))

    return { points }
  } catch (err) {
    console.error('[MondialRelay] Search error:', err)
    return { points: [], error: 'Mondial Relay search failed' }
  }
}

// =============================================
// REST v2: Create Shipment + Get Label
// =============================================
export interface ShipmentAddress {
  title?: string // MR, MME
  firstname: string
  lastname: string
  street: string
  houseNo?: string
  countryCode: string
  postCode: string
  city: string
  phone?: string
  mobile?: string
  email?: string
}

export interface CreateShipmentResult {
  shipmentNumber: string
  labelUrl: string
  error?: string
}

export async function createShipment(params: {
  orderNo: string
  weight: number // grams
  content: string
  sender: ShipmentAddress
  recipient: ShipmentAddress
  relayPointId?: string // MR relay point ID for 24R delivery
}): Promise<CreateShipmentResult> {
  if (!isMondialRelayShipmentConfigured()) {
    return { shipmentNumber: '', labelUrl: '', error: 'Mondial Relay shipment API not configured' }
  }

  const deliveryMode = params.relayPointId ? '24R' : 'HOM'
  const deliveryLocation = params.relayPointId
    ? `${params.recipient.countryCode}-${params.relayPointId}`
    : ''

  // Sanitize OrderNo: alphanumeric only, max 15 chars
  const orderNo = (params.orderNo || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 15)

  // CustomerNo: max 9 chars, alphanumeric only
  const customerNo = orderNo.slice(0, 9)

  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<ShipmentCreationRequest xmlns="http://www.example.org/Request" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Context>
    <Login>${escXml(MR_API2_LOGIN)}</Login>
    <Password>${escXml(MR_API2_PASSWORD)}</Password>
    <CustomerId>${escXml(MR_CUSTOMER_ID)}</CustomerId>
    <Culture>fr-FR</Culture>
    <VersionAPI>1.0</VersionAPI>
  </Context>
  <OutputOptions>
    <OutputFormat>10x15</OutputFormat>
    <OutputType>PdfUrl</OutputType>
  </OutputOptions>
  <ShipmentsList>
    <Shipment>
      <OrderNo>${orderNo}</OrderNo>
      <CustomerNo>${customerNo}</CustomerNo>
      <ParcelCount>1</ParcelCount>
      <DeliveryInstruction></DeliveryInstruction>
      <CollectionMode Mode="CCC"/>
      <DeliveryMode Mode="${deliveryMode}"${deliveryLocation ? ` Location="${escXml(deliveryLocation)}"` : ''}/>
      <Sender>
        <Address>
          <Title>${mrField(params.sender.title || 'MR', 5)}</Title>
          <Firstname>${mrField(params.sender.firstname, 20)}</Firstname>
          <Lastname>${mrField(params.sender.lastname, 20)}</Lastname>
          <Streetname>${mrField(params.sender.street, 40)}</Streetname>
          <HouseNo>${mrField(params.sender.houseNo, 10)}</HouseNo>
          <CountryCode>${mrField(params.sender.countryCode, 2)}</CountryCode>
          <PostCode>${mrField(params.sender.postCode, 10)}</PostCode>
          <City>${mrField(params.sender.city, 30)}</City>
          <PhoneNo>${mrPhone(params.sender.phone)}</PhoneNo>
          <MobileNo>${mrPhone(params.sender.mobile)}</MobileNo>
          <Email>${mrField(params.sender.email, 70)}</Email>
        </Address>
      </Sender>
      <Recipient>
        <Address>
          <Title>${mrField(params.recipient.title || 'MR', 5)}</Title>
          <Firstname>${mrField(params.recipient.firstname, 20)}</Firstname>
          <Lastname>${mrField(params.recipient.lastname, 20)}</Lastname>
          <Streetname>${mrField(params.recipient.street, 40)}</Streetname>
          <HouseNo>${mrField(params.recipient.houseNo, 10)}</HouseNo>
          <CountryCode>${mrField(params.recipient.countryCode, 2)}</CountryCode>
          <PostCode>${mrField(params.recipient.postCode, 10)}</PostCode>
          <City>${mrField(params.recipient.city, 30)}</City>
          <PhoneNo>${mrPhone(params.recipient.phone)}</PhoneNo>
          <MobileNo>${mrPhone(params.recipient.mobile)}</MobileNo>
          <Email>${mrField(params.recipient.email, 70)}</Email>
        </Address>
      </Recipient>
      <Parcels>
        <Parcel>
          <Content>${mrField(params.content, 40)}</Content>
          <Weight Value="${params.weight}" Unit="gr"/>
        </Parcel>
      </Parcels>
    </Shipment>
  </ShipmentsList>
</ShipmentCreationRequest>`

  // Log the XML body for debugging
  console.log('[MondialRelay] Sending shipment XML:', xmlBody)

  try {
    const resp = await fetch(REST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlBody,
    })

    const responseText = await resp.text()

    if (!resp.ok) {
      console.error('[MondialRelay] Shipment creation failed:', resp.status, responseText)
      return { shipmentNumber: '', labelUrl: '', error: `API error: ${resp.status}` }
    }

    console.log('[MondialRelay] Response:', responseText)

    const parsed = xmlParser.parse(responseText)

    // Navigate response structure
    const shipmentResponse = parsed.ShipmentCreationResponse || parsed
    const statusList = shipmentResponse?.StatusList?.Status
    const shipments = shipmentResponse?.ShipmentsList?.Shipment

    // Check for errors in status list
    if (statusList) {
      const statuses = Array.isArray(statusList) ? statusList : [statusList]
      const errors = statuses.filter((s: Record<string, unknown>) => s['@_Code'] && String(s['@_Code']) !== '0')
      if (errors.length > 0) {
        const errMsg = errors.map((e: Record<string, unknown>) => `${e['@_Code']}: ${e['@_Message'] || ''}`).join('; ')
        console.error('[MondialRelay] API error:', errMsg, '| Full response:', responseText)
        return { shipmentNumber: '', labelUrl: '', error: errMsg }
      }
    }

    // Extract shipment number and label URL
    if (shipments) {
      const shipment = Array.isArray(shipments) ? shipments[0] : shipments
      const label = shipment?.LabelList?.Label
      const labelData = Array.isArray(label) ? label[0] : label

      const shipmentNumber = labelData?.RawContent?.LabelValues?.ShipmentNumber
        || shipment?.ShipmentNumber
        || ''
      const labelUrl = labelData?.Output || ''

      if (shipmentNumber) {
        return { shipmentNumber: String(shipmentNumber), labelUrl: String(labelUrl) }
      }
    }

    return { shipmentNumber: '', labelUrl: '', error: 'Could not parse shipment response' }
  } catch (err) {
    console.error('[MondialRelay] Shipment creation error:', err)
    return { shipmentNumber: '', labelUrl: '', error: 'Shipment creation failed' }
  }
}

// =============================================
// SOAP: Track Shipment (WSI2_TracingColisDetaille)
// =============================================
export interface TrackingEvent {
  label: string
  date: string
  time: string
  location: string
}

export interface TrackingResult {
  status: string
  statusDetail: string
  relayName: string | null
  relayId: string | null
  events: TrackingEvent[]
  delivered: boolean
  error?: string
}

export async function trackShipment(shipmentNumber: string): Promise<TrackingResult> {
  if (!isMondialRelayConfigured()) {
    return { status: '', statusDetail: '', relayName: null, relayId: null, events: [], delivered: false, error: 'Not configured' }
  }

  const enseigne = MR_ENSEIGNE
  const expedition = shipmentNumber
  const langue = 'FR'

  const hashInput = enseigne + expedition + langue + MR_PRIVATE_KEY
  const security = crypto.createHash('md5').update(hashInput).digest('hex').toUpperCase()

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.mondialrelay.fr/webservice/">
  <soap:Body>
    <web:WSI2_TracingColisDetaille>
      <web:Enseigne>${enseigne}</web:Enseigne>
      <web:Expedition>${expedition}</web:Expedition>
      <web:Langue>${langue}</web:Langue>
      <web:Security>${security}</web:Security>
    </web:WSI2_TracingColisDetaille>
  </soap:Body>
</soap:Envelope>`

  try {
    const resp = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI2_TracingColisDetaille',
      },
      body: soapBody,
    })

    if (!resp.ok) {
      return { status: '', statusDetail: '', relayName: null, relayId: null, events: [], delivered: false, error: `API error: ${resp.status}` }
    }

    const xml = await resp.text()
    const parsed = xmlParser.parse(xml)

    const envelope = parsed['soap:Envelope'] || parsed['s:Envelope']
    const body = envelope?.['soap:Body'] || envelope?.['s:Body']
    const result = body?.['WSI2_TracingColisDetailleResponse']?.['WSI2_TracingColisDetailleResult']

    if (!result) {
      return { status: '', statusDetail: '', relayName: null, relayId: null, events: [], delivered: false, error: 'Invalid response' }
    }

    const stat = result.STAT
    if (stat && String(stat) !== '0') {
      return { status: '', statusDetail: '', relayName: null, relayId: null, events: [], delivered: false, error: `Error code: ${stat}` }
    }

    // Parse tracking events
    const rawEvents = result.Tracing?.ret_WSI2_sub_TracingColisDetaille
    const eventsList = rawEvents ? (Array.isArray(rawEvents) ? rawEvents : [rawEvents]) : []

    const events: TrackingEvent[] = eventsList.map((e: Record<string, unknown>) => ({
      label: String(e.Libelle || ''),
      date: String(e.Date || ''),
      time: String(e.Heure || ''),
      location: String(e.Emplacement || ''),
    }))

    const statusLabel = String(result.Libelle01 || '')
    const statusDetail = String(result.Libelle02 || '')
    const relayName = result.Relais_Libelle ? String(result.Relais_Libelle) : null
    const relayId = result.Relais_Num ? String(result.Relais_Num) : null

    // Determine if delivered based on status keywords
    const deliveredKeywords = ['livre', 'livré', 'retir', 'distribu', 'deliver', 'picked up', 'disponible']
    const allText = (statusLabel + statusDetail + events.map(e => e.label).join(' ')).toLowerCase()
    const delivered = deliveredKeywords.some(kw => allText.includes(kw))

    return { status: statusLabel, statusDetail, relayName, relayId, events, delivered }
  } catch (err) {
    console.error('[MondialRelay] Tracking error:', err)
    return { status: '', statusDetail: '', relayName: null, relayId: null, events: [], delivered: false, error: 'Tracking request failed' }
  }
}

// =============================================
// Helpers
// =============================================
function escXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/** Sanitize a field for Mondial Relay: trim, remove special chars that break MR XML (error 10061), truncate, escape XML */
function mrField(value: string | undefined | null, maxLen: number): string {
  if (!value) return ''
  // Remove control characters, brackets, #, /, \, |, {, }, ~, ^, and other MR-problematic chars
  let clean = String(value).replace(/[\x00-\x1F\x7F\[\]#/\\|{}~^`]/g, '').trim()
  // Truncate to max length
  if (clean.length > maxLen) clean = clean.slice(0, maxLen)
  return escXml(clean)
}

/** Clean a phone number for Mondial Relay: digits only, convert +33 to 0, max 10 digits */
function mrPhone(value: string | undefined | null): string {
  if (!value) return ''
  let phone = String(value).replace(/[\s.\-()]/g, '')
  // Convert +33 to 0
  if (phone.startsWith('+33')) phone = '0' + phone.slice(3)
  // Remove remaining + prefix
  if (phone.startsWith('+')) phone = phone.slice(1)
  // Keep only digits
  phone = phone.replace(/\D/g, '')
  // Truncate to 10 digits
  return phone.slice(0, 10)
}

function formatHours(raw: unknown): string {
  if (!raw) return ''
  const str = String(raw).trim()
  if (str === '0000' || str === '00000000') return 'Ferme'
  // Format: "0830 1230 1400 1900" -> "08:30-12:30, 14:00-19:00"
  const parts = str.match(/\d{4}/g)
  if (!parts || parts.length < 2) return str
  const pairs: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i + 1]) {
      const from = parts[i].slice(0, 2) + ':' + parts[i].slice(2)
      const to = parts[i + 1].slice(0, 2) + ':' + parts[i + 1].slice(2)
      if (from !== '00:00' || to !== '00:00') {
        pairs.push(`${from}-${to}`)
      }
    }
  }
  return pairs.join(', ') || 'Ferme'
}

/** Generate a public tracking URL for Mondial Relay */
export function getMondialRelayTrackingUrl(shipmentNumber: string): string {
  return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(shipmentNumber)}`
}

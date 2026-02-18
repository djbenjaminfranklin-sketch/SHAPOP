import http2 from 'http2'
import crypto from 'crypto'
import fs from 'fs'
import { supabase, PLATFORM_COMMISSION, PROCESSING_FEE_RATE, PROCESSING_FEE_FIXED, VAT_RATE, PAYPAL_BASE_URL } from './config'

// =============================================
// Pure helper functions
// =============================================

// Helper: escape HTML special characters to prevent injection
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Helper: calcule tous les frais sur un montant de vente (TVA incluse sur les frais)
export function calculateFees(amount: number) {
  const platformFeeHT = amount * PLATFORM_COMMISSION
  const processingFeeHT = amount * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED
  // TVA appliquee sur les frais de service (comme Whatnot Europe)
  const platformFee = Math.round(platformFeeHT * (1 + VAT_RATE) * 100) / 100
  const processingFee = Math.round(processingFeeHT * (1 + VAT_RATE) * 100) / 100
  const totalFees = Math.round((platformFee + processingFee) * 100) / 100
  const sellerPayout = Math.round((amount - totalFees) * 100) / 100
  return { platformFee, processingFee, totalFees, sellerPayout }
}

// =============================================
// Shipping cost calculation (zone-based carriers)
// =============================================

type ShippingRate = { maxGrams: number; cost: number }[]

// Zone: france (default), dom_tom, europe, international
type ShippingZone = 'france' | 'dom_tom' | 'europe' | 'international'

// Rates per zone per carrier
// france = France metropolitaine (current rates)
// dom_tom = DOM-TOM (~2x France prices)
// europe = EU countries (~1.5-2x France prices)
// international = Rest of world (~2.5-3x France prices)
const SHIPPING_RATES: Record<string, Record<string, ShippingRate>> = {
  mondial_relay: {
    france: [
      { maxGrams: 500, cost: 3.99 },
      { maxGrams: 1000, cost: 4.99 },
      { maxGrams: 2000, cost: 5.99 },
      { maxGrams: 5000, cost: 6.99 },
      { maxGrams: 10000, cost: 9.99 },
      { maxGrams: 30000, cost: 14.99 },
    ],
    // Mondial Relay available in select EU countries (BE, LU, NL, DE, ES, PT, AT, IT)
    europe: [
      { maxGrams: 500, cost: 6.99 },
      { maxGrams: 1000, cost: 8.49 },
      { maxGrams: 2000, cost: 10.49 },
      { maxGrams: 5000, cost: 12.99 },
      { maxGrams: 10000, cost: 18.99 },
      { maxGrams: 30000, cost: 27.99 },
    ],
    // Mondial Relay NOT available for DOM-TOM or international
  },
  colissimo: {
    france: [
      { maxGrams: 250, cost: 4.95 },
      { maxGrams: 500, cost: 6.35 },
      { maxGrams: 1000, cost: 7.25 },
      { maxGrams: 2000, cost: 8.55 },
      { maxGrams: 5000, cost: 13.75 },
      { maxGrams: 10000, cost: 20.05 },
    ],
    dom_tom: [
      { maxGrams: 250, cost: 9.90 },
      { maxGrams: 500, cost: 12.70 },
      { maxGrams: 1000, cost: 14.50 },
      { maxGrams: 2000, cost: 17.10 },
      { maxGrams: 5000, cost: 27.50 },
      { maxGrams: 10000, cost: 40.10 },
    ],
    europe: [
      { maxGrams: 250, cost: 8.90 },
      { maxGrams: 500, cost: 11.40 },
      { maxGrams: 1000, cost: 13.05 },
      { maxGrams: 2000, cost: 15.40 },
      { maxGrams: 5000, cost: 24.75 },
      { maxGrams: 10000, cost: 36.10 },
    ],
    international: [
      { maxGrams: 250, cost: 13.85 },
      { maxGrams: 500, cost: 17.80 },
      { maxGrams: 1000, cost: 20.30 },
      { maxGrams: 2000, cost: 23.95 },
      { maxGrams: 5000, cost: 38.50 },
      { maxGrams: 10000, cost: 56.15 },
    ],
  },
  chronopost: {
    france: [
      { maxGrams: 500, cost: 13.19 },
      { maxGrams: 1000, cost: 14.49 },
      { maxGrams: 2000, cost: 16.49 },
      { maxGrams: 5000, cost: 22.49 },
    ],
    dom_tom: [
      { maxGrams: 500, cost: 26.49 },
      { maxGrams: 1000, cost: 29.49 },
      { maxGrams: 2000, cost: 33.49 },
      { maxGrams: 5000, cost: 45.49 },
    ],
    europe: [
      { maxGrams: 500, cost: 22.99 },
      { maxGrams: 1000, cost: 25.49 },
      { maxGrams: 2000, cost: 28.99 },
      { maxGrams: 5000, cost: 39.49 },
    ],
    international: [
      { maxGrams: 500, cost: 36.49 },
      { maxGrams: 1000, cost: 39.99 },
      { maxGrams: 2000, cost: 45.49 },
      { maxGrams: 5000, cost: 61.99 },
    ],
  },
  laposte: {
    france: [
      { maxGrams: 250, cost: 4.95 },
      { maxGrams: 500, cost: 6.35 },
      { maxGrams: 1000, cost: 7.25 },
      { maxGrams: 2000, cost: 8.55 },
    ],
    dom_tom: [
      { maxGrams: 250, cost: 9.90 },
      { maxGrams: 500, cost: 12.70 },
      { maxGrams: 1000, cost: 14.50 },
      { maxGrams: 2000, cost: 17.10 },
    ],
    europe: [
      { maxGrams: 250, cost: 8.90 },
      { maxGrams: 500, cost: 11.40 },
      { maxGrams: 1000, cost: 13.05 },
      { maxGrams: 2000, cost: 15.40 },
    ],
    international: [
      { maxGrams: 250, cost: 13.85 },
      { maxGrams: 500, cost: 17.80 },
      { maxGrams: 1000, cost: 20.30 },
      { maxGrams: 2000, cost: 23.95 },
    ],
  },
}

// EU country codes for zone detection
const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'DE',
  'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
  'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

// DOM-TOM zip code prefixes (971xx=Guadeloupe, 972xx=Martinique, 973xx=Guyane, 974xx=Reunion, 976xx=Mayotte)
const DOM_TOM_ZIP_PREFIXES = ['971', '972', '973', '974', '976']

/** Determine the shipping zone from a country code and optional zip code */
export function getZoneFromCountry(countryCode?: string, zip?: string): ShippingZone {
  if (!countryCode) return 'france'

  const code = countryCode.toUpperCase().trim()

  if (code === 'FR') {
    // Check for DOM-TOM via zip code prefix
    if (zip) {
      const zipClean = zip.replace(/\s/g, '')
      for (const prefix of DOM_TOM_ZIP_PREFIXES) {
        if (zipClean.startsWith(prefix)) {
          return 'dom_tom'
        }
      }
    }
    return 'france'
  }

  if (EU_COUNTRY_CODES.has(code)) {
    return 'europe'
  }

  return 'international'
}

/** Calculate shipping cost in EUR based on weight, carrier, and zone */
export function calculateShippingCost(weightGrams: number, carrier: string, zone?: string): number {
  const zoneKey = (zone || 'france') as ShippingZone
  const carrierRates = SHIPPING_RATES[carrier]
  if (!carrierRates) return 0

  // Get rates for the requested zone; if not available for this carrier/zone, return 0 (unavailable)
  const rates = carrierRates[zoneKey]
  if (!rates) return 0

  for (const tier of rates) {
    if (weightGrams <= tier.maxGrams) {
      return tier.cost
    }
  }

  // Weight exceeds max tier — return highest tier price
  return rates[rates.length - 1].cost
}

/** Check if a carrier is available for a given zone */
export function isCarrierAvailableForZone(carrier: string, zone?: string): boolean {
  const zoneKey = (zone || 'france') as ShippingZone
  const carrierRates = SHIPPING_RATES[carrier]
  if (!carrierRates) return false
  return !!carrierRates[zoneKey]
}

/** Get all available carriers and their costs for a given weight and zone */
export function getShippingOptions(weightGrams: number, zone?: string): { carrier: string; cost: number; zone: string }[] {
  const zoneKey = (zone || 'france') as ShippingZone
  return Object.keys(SHIPPING_RATES)
    .filter(carrier => isCarrierAvailableForZone(carrier, zoneKey))
    .map(carrier => ({
      carrier,
      cost: calculateShippingCost(weightGrams, carrier, zoneKey),
      zone: zoneKey,
    }))
}

// Compute a seller score out of 10 from their trust data
export function computeSellerScore(trust: Record<string, unknown>): number {
  const baseScores: Record<string, number> = { new: 8.0, standard: 8.5, trusted: 9.0, premium: 9.5 }
  let score = baseScores[(trust.trust_level as string) || 'new'] ?? 8.0
  // Bonus for delivery rate
  const deliveryRate = (trust.positive_delivery_rate as number) ?? 1.0
  score += (deliveryRate - 0.9) * 2 // +0.2 if 100%, -0.2 if 80%
  // Penalty for disputes
  const completed = (trust.total_completed_orders as number) || 1
  const disputesLost = (trust.disputes_lost as number) || 0
  const disputeRate = disputesLost / completed
  score -= disputeRate * 5 // -0.5 per 10% dispute rate
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10
}

// Penalize buyer score on a 0-10 scale (automatic, behavior-based only)
// Penalties: -1.0 abandoned order, -1.5 no address, -2.0 lost dispute
export async function penalizeBuyerScore(buyerId: string, penalty: number, reason: string) {
  const { data: bs } = await supabase
    .from('buyer_scores')
    .select('*')
    .eq('user_id', buyerId)
    .single()

  if (bs) {
    const currentScore = (bs as Record<string, unknown>).score as number ?? 10
    const newScore = Math.round(Math.max(0, currentScore - penalty) * 100) / 100
    let riskLevel = 'low'
    if (newScore < 3) riskLevel = 'blocked'
    else if (newScore < 5) riskLevel = 'high'
    else if (newScore < 7) riskLevel = 'medium'

    await supabase.from('buyer_scores').update({
      score: newScore,
      risk_level: riskLevel,
      updated_at: new Date().toISOString(),
    }).eq('user_id', buyerId)
    if (process.env.NODE_ENV !== 'production') console.log(`[buyer-score] ${buyerId} penalized -${penalty} (${reason}): ${currentScore} → ${newScore}/10 (${riskLevel})`)
  } else {
    const newScore = Math.round(Math.max(0, 10 - penalty) * 100) / 100
    let riskLevel = 'low'
    if (newScore < 7) riskLevel = 'medium'
    await supabase.from('buyer_scores').insert({
      user_id: buyerId,
      score: newScore,
      risk_level: riskLevel,
    })
    if (process.env.NODE_ENV !== 'production') console.log(`[buyer-score] ${buyerId} new score created with -${penalty} (${reason}): ${newScore}/10`)
  }
}

// =============================================
// APNs Push Notifications (iOS)
// =============================================
const APNS_KEY_ID = process.env.APNS_KEY_ID || ''
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || ''
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.shapop.app'
const APNS_KEY_PATH = process.env.APNS_KEY_PATH || ''
const APNS_PRODUCTION = process.env.APNS_PRODUCTION === 'true'

let apnsPrivateKey: string | null = null
if (APNS_KEY_PATH && fs.existsSync(APNS_KEY_PATH)) {
  apnsPrivateKey = fs.readFileSync(APNS_KEY_PATH, 'utf8')
  console.log('APNs key loaded from', APNS_KEY_PATH)
} else if (process.env.APNS_PRIVATE_KEY) {
  apnsPrivateKey = process.env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n')
  console.log('APNs key loaded from env')
} else {
  console.warn('WARNING: APNs key not configured — push notifications will not work')
}

let apnsJwtToken: string | null = null
let apnsJwtIssuedAt = 0

function getApnsJwt(): string | null {
  if (!apnsPrivateKey || !APNS_KEY_ID || !APNS_TEAM_ID) return null
  const now = Math.floor(Date.now() / 1000)
  // APNs tokens are valid for 1 hour — refresh every 50 minutes
  if (apnsJwtToken && (now - apnsJwtIssuedAt) < 3500) return apnsJwtToken

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })).toString('base64url')
  const signer = crypto.createSign('SHA256')
  signer.update(`${header}.${payload}`)
  const signature = signer.sign(apnsPrivateKey, 'base64url')
  apnsJwtToken = `${header}.${payload}.${signature}`
  apnsJwtIssuedAt = now
  return apnsJwtToken
}

export async function sendApnsPush(deviceToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  const jwt = getApnsJwt()
  if (!jwt) return false

  const host = APNS_PRODUCTION ? 'api.push.apple.com' : 'api.sandbox.push.apple.com'

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`)
    client.on('error', () => { resolve(false) })

    const payload = JSON.stringify({
      aps: { alert: { title, body }, sound: 'default', badge: 1 },
      ...(data || {}),
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    })

    req.on('response', (headers) => {
      const status = headers[':status'] as number
      if (status !== 200) {
        console.warn(`APNs error ${status} for token ${deviceToken.slice(0, 8)}...`)
      }
      resolve(status === 200)
    })
    req.on('error', () => resolve(false))
    req.end(payload)

    // Close HTTP/2 session after response
    req.on('close', () => client.close())
  })
}

/** Send push + in-app notification to a specific user */
export async function notifyUser(userId: string, type: string, title: string, body: string, data?: Record<string, string>) {
  // Determine which preference column to check based on notification type
  const prefColumnMap: Record<string, string> = {
    live: 'notify_live',
    message: 'notify_messages',
    auction_won: 'notify_orders',
    return_requested: 'notify_orders',
    return_approved: 'notify_orders',
    return_rejected: 'notify_orders',
    order_shipped: 'notify_orders',
    order_delivered: 'notify_orders',
    deal: 'notify_deals',
    reminder: 'notify_reminders',
    community: 'notify_community',
  }
  const prefColumn = prefColumnMap[type] || 'notify_orders'

  // Push notification — check user preference before sending
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token, notify_live, notify_orders, notify_deals, notify_messages, notify_reminders, notify_community')
    .eq('user_id', userId)
    .neq('token', `prefs-${userId}`)
  if (tokens) {
    for (const t of tokens) {
      // Only send push if the user has the relevant notification preference enabled
      const prefs = t as Record<string, unknown>
      if (prefs[prefColumn] !== false) {
        await sendApnsPush(t.token, title, body, data)
      }
    }
  }
  // In-app notification (always insert regardless of push preferences)
  await supabase.from('notifications').insert({
    user_id: userId, type, title, body, data: data || {},
  })
}

/** Send push notification to all followers of a seller who have notify_live enabled */
export async function notifyFollowersSellerLive(sellerId: string, streamTitle: string, streamId: string) {
  // Step 1: Get follower user IDs
  const { data: followers } = await supabase
    .from('followers')
    .select('user_id')
    .eq('seller_id', sellerId)

  if (!followers || followers.length === 0) return
  const followerIds = followers.map(f => f.user_id)

  // Step 2: Get device tokens for these followers who have live notifications enabled
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('notify_live', true)
    .in('user_id', followerIds)

  if (!tokens || tokens.length === 0) return

  // Get seller name and stream category
  const { data: seller } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', sellerId)
    .single()

  const { data: streamData } = await supabase
    .from('streams')
    .select('category')
    .eq('id', streamId)
    .single()

  const sellerName = seller?.display_name || 'Un vendeur'
  const category = streamData?.category || ''

  // Engaging notification messages
  const title = `${sellerName} est en live !`
  const body = category
    ? `${streamTitle} — ${category}. Rejoins maintenant !`
    : `${streamTitle}. Rejoins maintenant !`

  if (process.env.NODE_ENV !== 'production') console.log(`[push] Sending live notification to ${tokens.length} followers of ${sellerName}`)

  // Send in parallel (safety cap at 200)
  const batch = tokens.slice(0, 200)
  await Promise.allSettled(
    batch.map(t => sendApnsPush(t.token, title, body, { stream_id: streamId }))
  )

  // Insert in-app notifications for all followers
  const notifRows = followerIds.map(uid => ({
    user_id: uid,
    type: 'live',
    title,
    body,
    data: { stream_id: streamId },
  }))
  const { error: insertErr } = await supabase.from('notifications').insert(notifRows)
  if (insertErr) console.error('[notifications] insert error:', insertErr.message)
  else if (process.env.NODE_ENV !== 'production') console.log(`[notifications] inserted ${notifRows.length} in-app notifications`)
}

// Audit log helper
export async function logAdminAction(adminId: string, adminEmail: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
    })
  } catch (err: any) {
    console.error('Audit log insert failed (table may not exist):', err?.message || err)
  }
}

// PayPal access token helper
export async function getPaypalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured')

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const resp = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`PayPal OAuth failed: ${resp.status} ${text}`)
  }
  const data = await resp.json() as { access_token: string }
  return data.access_token
}

// Helper: safely get param as string (Express 5 can return string | string[])
export function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val
}

// =============================================
// Chat filtering
// =============================================
export const CONTACT_PATTERNS: { pattern: RegExp; label: string }[] = [
  // --- Emails ---
  { pattern: /[\w.-]+@[\w.-]+\.\w{2,}/i, label: 'email' },
  { pattern: /[\w.-]+\s*\[\s*at\s*\]\s*[\w.-]+/i, label: 'email_obfuscated' }, // user [at] domain
  { pattern: /[\w.-]+\s*arobase\s*[\w.-]+/i, label: 'email_arobase' },

  // --- Phone numbers ---
  { pattern: /\+?\d{10,14}/, label: 'phone_international' },
  { pattern: /0[0-9]{1,2}[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}/, label: 'phone_french' },
  { pattern: /0[0-9]{1,2}[-.\s]?[0-9]{6,8}/, label: 'phone_local' },
  // Phone with dots/spaces separating each digit: 0 6 1 2 3 4 5 6 7 8
  { pattern: /0\s*[0-9]\s+[0-9][\s.]{1,2}[0-9][\s.]{1,2}[0-9][\s.]{1,2}[0-9][\s.]{1,2}[0-9]/, label: 'phone_spaced' },
  // Phone numbers written as words (French)
  { pattern: /\b(z[eé]ro)\s*(six|sept|cinq|un|deux|trois|quatre|huit|neuf)\b/i, label: 'phone_words_fr' },

  // --- Social handles ---
  { pattern: /@[\w]{3,}/, label: 'handle' },

  // --- Social platforms ---
  { pattern: /\b(instagram|insta|ig)\b/i, label: 'social_instagram' },
  { pattern: /\b(telegram|tele?gram|tg)\b/i, label: 'social_telegram' },
  { pattern: /\b(whatsapp|whats\s?app|wh?atsap)\b/i, label: 'social_whatsapp' },
  { pattern: /\b(snapchat|snap)\b/i, label: 'social_snapchat' },
  { pattern: /\b(signal)\b/i, label: 'social_signal' },
  { pattern: /\b(discord)\b/i, label: 'social_discord' },
  { pattern: /\b(facebook|fb|messenger)\b/i, label: 'social_facebook' },
  { pattern: /\b(tiktok|tik\s?tok)\b/i, label: 'social_tiktok' },
  { pattern: /\b(twitter|x\.com)\b/i, label: 'social_twitter' },
  { pattern: /\b(viber|wechat|line)\b/i, label: 'social_other' },

  // --- URLs ---
  { pattern: /https?:\/\/[^\s]+/i, label: 'url' },
  { pattern: /\b[\w-]+\.(com|fr|net|org|io|co|app|me|link|ly)\b/i, label: 'url_domain' },

  // --- Contact solicitation (FR + EN) ---
  { pattern: /\b(dm\s+me|message\s+me|contact\s+me|text\s+me|call\s+me|hit\s+me\s+up|hmu)\b/i, label: 'solicitation_en' },
  { pattern: /\b(appelle[\s-]?moi|ecris[\s-]?moi|contacte[\s-]?moi|envoie[\s-]?moi|ajoute[\s-]?moi|rejoins[\s-]?moi)\b/i, label: 'solicitation_fr' },
  { pattern: /\b(mon\s+(num[eé]ro|tel|t[eé]l[eé]phone|mail|adresse|compte|profil|insta|snap|whatsapp))\b/i, label: 'solicitation_possessive_fr' },
  { pattern: /\b(en\s+priv[eé]|en\s+dm|en\s+mp|hors\s+(de\s+)?la\s+plateforme|hors\s+appli|en\s+dehors)\b/i, label: 'solicitation_offplatform_fr' },

  // --- IBAN / financial ---
  { pattern: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}/i, label: 'iban' },
  { pattern: /\b(paypal\.me|revolut\.me|lydia)\b/i, label: 'payment_link' },
]

export function detectContactInfo(message: string): string | null {
  // Normalize: remove zero-width chars, replace common obfuscation
  const normalized = message
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\(/g, '').replace(/\)/g, '')  // parentheses around digits
    .replace(/\b(dot|point|punto)\b/gi, '.') // "dot" -> "."
    .replace(/\b(at|arobase|arroba)\b/gi, '@') // "at" -> "@"

  for (const { pattern, label } of CONTACT_PATTERNS) {
    if (pattern.test(normalized)) {
      return label
    }
  }
  return null
}

// Auto-sanction system: track flags per user, warn then suspend
const FLAG_WARN_THRESHOLD = 3   // Warning after 3 flagged messages
const FLAG_SUSPEND_THRESHOLD = 5 // Auto-suspend after 5 flagged messages

export async function handleAutoSanction(userId: string, flagLabel: string): Promise<void> {
  try {
    // Count total flagged messages (chat + conversations)
    const [chatFlags, convFlags] = await Promise.all([
      supabase.from('chat_messages').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('is_flagged', true),
      supabase.from('conversation_messages').select('id', { count: 'exact', head: true })
        .eq('sender_id', userId).eq('is_flagged', true),
    ])

    const totalFlags = (chatFlags.count || 0) + (convFlags.count || 0)
    if (process.env.NODE_ENV !== 'production') console.log(`[Moderation] User ${userId} — flag #${totalFlags} (${flagLabel})`)

    if (totalFlags >= FLAG_SUSPEND_THRESHOLD) {
      // Auto-suspend
      await supabase.from('profiles').update({
        is_suspended: true,
        suspension_reason: `Auto-suspended: ${totalFlags} messages flagged for sharing contact info`,
        suspended_at: new Date().toISOString(),
      }).eq('id', userId)
      if (process.env.NODE_ENV !== 'production') console.log(`[Moderation] User ${userId} AUTO-SUSPENDED after ${totalFlags} flags`)

    } else if (totalFlags === FLAG_WARN_THRESHOLD) {
      // Log warning (could send push notification in the future)
      if (process.env.NODE_ENV !== 'production') console.log(`[Moderation] User ${userId} WARNING: ${totalFlags} flagged messages`)
    }
  } catch (err) {
    console.error('[Moderation] Auto-sanction error:', err)
  }
}

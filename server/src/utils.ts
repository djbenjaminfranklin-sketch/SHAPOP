import http2 from 'http2'
import crypto from 'crypto'
import fs from 'fs'
import { supabase, resend, PLATFORM_COMMISSION, PROCESSING_FEE_RATE, PROCESSING_FEE_FIXED, VAT_RATE, PAYPAL_BASE_URL } from './config'
import { LOCALES, getUserLang, getUsersLangs, isRtl, localized, msg, type Lang, type MsgKey, type NotifKey, type Params } from './i18n'
import { formatMoney, shortOrderRef } from './fulfillment'
import { dispatchPush, readFcmConfig, sendFcmPush, type PushDevice } from './services/push'

// =============================================
// Pure helper functions
// =============================================

// Helper: escape HTML special characters to prevent injection
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Helper: calcule tous les frais sur un montant de vente (TVA sur les frais : VAT_RATE, 0 en franchise)
export function calculateFees(amount: number) {
  const platformFeeHT = amount * PLATFORM_COMMISSION
  const processingFeeHT = amount * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED
  // TVA sur les frais seulement si VAT_RATE > 0 (aujourd'hui 0 : franchise en base, art. 293 B du CGI)
  const platformFee = Math.round(platformFeeHT * (1 + VAT_RATE) * 100) / 100
  const processingFee = Math.round(processingFeeHT * (1 + VAT_RATE) * 100) / 100
  const totalFees = Math.round((platformFee + processingFee) * 100) / 100
  const sellerPayout = Math.round((amount - totalFees) * 100) / 100
  return { platformFee, processingFee, totalFees, sellerPayout }
}

// Frais d'envoi par la poste : voir ./fulfillment.ts (module unique).

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
if (APNS_KEY_PATH && fs.existsSync(APNS_KEY_PATH) && fs.statSync(APNS_KEY_PATH).size > 0) {
  apnsPrivateKey = fs.readFileSync(APNS_KEY_PATH, 'utf8')
  console.log('APNs key loaded from', APNS_KEY_PATH)
} else if (process.env.APNS_PRIVATE_KEY) {
  let raw = process.env.APNS_PRIVATE_KEY
  // Normalize: handle literal \n, forward slashes used as line separators, or already correct newlines
  raw = raw.replace(/\\n/g, '\n')
  // If the key is on a single line with / separators (common in Render env vars), reconstruct PEM
  if (!raw.includes('\n') || raw.split('\n').length < 3) {
    const parts = raw.split('/')
    raw = parts.join('\n')
  }
  apnsPrivateKey = raw.trim() + '\n'
  console.log('APNs key loaded from env, lines:', apnsPrivateKey.split('\n').length)
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
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          console.warn(`APNs error ${status} for token ${deviceToken.slice(0, 8)}...: ${body}`)
          resolve(false)
        })
      } else {
        resolve(true)
      }
    })
    req.on('error', (err) => { console.warn('APNs request error:', err.message); resolve(false) })
    req.end(payload)

    // Close HTTP/2 session after response
    req.on('close', () => client.close())
  })
}

// FCM (Android) : actif seulement si FCM_PROJECT_ID et FCM_SERVICE_ACCOUNT_JSON sont définis
const fcmConfig = readFcmConfig()
if (fcmConfig) console.log('FCM (Android) enabled for project', fcmConfig.projectId)

/** Envoie une notification push à un appareil : APNs pour iOS, FCM pour Android. */
export async function sendPushToDevice(device: PushDevice, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  return dispatchPush(device, { title, body, data }, {
    apnsEnabled: Boolean(apnsPrivateKey && APNS_KEY_ID && APNS_TEAM_ID),
    sendApns: (token, m) => sendApnsPush(token, m.title, m.body, m.data),
    fcm: fcmConfig,
    sendFcm: sendFcmPush,
    // Jeton Android périmé (app désinstallée…) : on le retire
    onUnregistered: async (token) => {
      const { error } = await supabase.from('device_tokens').delete().eq('token', token).eq('platform', 'android')
      if (error) console.warn('[fcm] Suppression du jeton périmé impossible :', error.message)
    },
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
    scheduled_reminder: 'notify_reminders',
    community: 'notify_community',
    new_follower: 'notify_community',
    outbid: 'notify_live',
  }
  // In-app notification FIRST (always insert, regardless of push success)
  await supabase.from('notifications').insert({
    user_id: userId, type, title, body, data: data || {},
  })

  // Push notification — best-effort, errors don't block
  try {
    if (type === 'welcome') {
      const { data: tokens } = await supabase
        .from('device_tokens')
        .select('token, platform')
        .eq('user_id', userId)
        .neq('token', `prefs-${userId}`)
      if (tokens) {
        for (const t of tokens) {
          await sendPushToDevice(t, title, body, data).catch(() => {})
        }
      }
      return
    }

    const prefColumn = prefColumnMap[type] || 'notify_orders'
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token, platform, notify_live, notify_orders, notify_deals, notify_messages, notify_reminders, notify_community')
      .eq('user_id', userId)
      .neq('token', `prefs-${userId}`)
    if (tokens) {
      for (const t of tokens) {
        const prefs = t as Record<string, unknown>
        if (prefs[prefColumn] !== false) {
          await sendPushToDevice(t, title, body, data).catch(() => {})
        }
      }
    }
  } catch (err) {
    console.error(`[notifyUser] Push failed for ${userId} (${type}):`, err)
  }
}

/**
 * Comme notifyUser, mais le titre et le corps sont produits dans la langue du DESTINATAIRE.
 * `keys` : un préfixe du dictionnaire ('welcome' → 'welcome.title' + 'welcome.body')
 * ou deux clés explicites ({ title, body }).
 */
export async function notifyUserT(
  userId: string,
  type: string,
  keys: NotifKey | { title: MsgKey; body: MsgKey },
  params: Params = {},
  data?: Record<string, string>,
) {
  const lang = await getUserLang(userId)
  const k = typeof keys === 'string'
    ? { title: `${keys}.title` as MsgKey, body: `${keys}.body` as MsgKey }
    : keys
  return notifyUser(userId, type, msg(lang, k.title, params), msg(lang, k.body, params), data)
}

/**
 * Prévient les abonnés d'un vendeur (push + notification in-app), chacun dans sa langue.
 * kind 'live' : le live commence ; 'soon' : il commence dans 15 minutes.
 */
export async function notifyFollowersSellerLive(sellerId: string, streamTitle: string, streamId: string, kind: 'live' | 'soon' = 'live') {
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
    .select('token, platform, user_id')
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

  const category = streamData?.category || ''
  const params: Params = {
    name: seller?.display_name || localized('fallback.seller'),
    title: streamTitle,
    category,
  }

  // Texte construit une fois par langue, puis choisi selon la langue de chaque abonné
  const textFor = (lang: Lang) => kind === 'soon'
    ? { title: msg(lang, 'liveSoon.title', params), body: msg(lang, 'liveSoon.body', params) }
    : {
        title: msg(lang, 'sellerLive.title', params),
        body: msg(lang, category ? 'sellerLive.body' : 'sellerLive.bodyNoCategory', params),
      }
  const langs = await getUsersLangs(followerIds)
  const texts = new Map<Lang, { title: string; body: string }>()
  const textOf = (uid: string) => {
    const lang = langs.get(uid) || 'en'
    if (!texts.has(lang)) texts.set(lang, textFor(lang))
    return texts.get(lang)!
  }

  if (process.env.NODE_ENV !== 'production') console.log(`[push] Sending live notification to ${tokens.length} followers of ${sellerId}`)

  // Send in parallel (safety cap at 200)
  const batch = tokens.slice(0, 200)
  await Promise.allSettled(
    batch.map(t => {
      const { title, body } = textOf(t.user_id)
      return sendPushToDevice(t, title, body, { stream_id: streamId })
    })
  )

  // Insert in-app notifications for all followers
  const notifRows = followerIds.map(uid => ({
    user_id: uid,
    type: 'live',
    ...textOf(uid),
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

// =============================================
// Transactional Emails (Resend)
// =============================================

const FROM_EMAIL = 'ShaPop <noreply@shapop.app>'

async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId)
  return data?.user?.email || null
}

type EmailRow = { label: string; value: string; style?: string }

/**
 * Gabarit HTML commun des e-mails transactionnels, dans la langue du destinataire
 * (dir="rtl" pour l'hébreu). Tous les textes passés ici sont déjà échappés par l'appelant
 * via escapeHtml ; `rows[].value` est échappé ici.
 */
export function renderEmailHtml(lang: Lang, opts: { color: string; heading: string; intro: string; rows: EmailRow[]; footnote: string }): string {
  const rtl = isRtl(lang)
  const dirAttr = rtl ? ' dir="rtl"' : ''
  const align = rtl ? 'right' : 'left'
  const rows = opts.rows.map(r =>
    `<tr><td style="padding:8px 0;color:#666">${escapeHtml(r.label)}</td><td style="padding:8px 0;${r.style || ''}">${escapeHtml(r.value)}</td></tr>`,
  ).join('\n            ')
  return `
        <div lang="${lang}"${dirAttr} style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;text-align:${align}">
          <h2 style="color:${opts.color}">${escapeHtml(opts.heading)}</h2>
          <p>${escapeHtml(opts.intro)}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${rows}
          </table>
          <p style="color:#888;font-size:13px">${escapeHtml(opts.footnote)}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#aaa;font-size:11px">${escapeHtml(msg(lang, 'email.tagline'))}</p>
        </div>
      `
}

/** Contenu de l'e-mail de confirmation de commande (exporté pour les tests). */
export function buildOrderConfirmationEmail(lang: Lang, d: { id: string; itemTitle?: string | null; amount: number; currency?: string | null; sellerName?: string | null }) {
  const item = d.itemTitle || msg(lang, 'fallback.item')
  const ref = shortOrderRef(d.id)
  return {
    subject: msg(lang, 'orderEmail.subject', { item }),
    html: renderEmailHtml(lang, {
      color: '#E8344E',
      heading: msg(lang, 'orderEmail.heading'),
      intro: msg(lang, 'orderEmail.intro', { ref }),
      rows: [
        { label: msg(lang, 'email.item'), value: item, style: 'font-weight:600' },
        { label: msg(lang, 'email.seller'), value: d.sellerName || msg(lang, 'fallback.seller') },
        { label: msg(lang, 'email.amount'), value: formatMoney(d.amount, d.currency, LOCALES[lang]), style: 'font-weight:700;color:#E8344E' },
      ],
      footnote: msg(lang, 'orderEmail.footnote'),
    }),
  }
}

/** Contenu de l'e-mail de rappel de paiement (exporté pour les tests). */
export function buildPaymentReminderEmail(lang: Lang, d: { orderId: string; itemTitle?: string | null; amount: number; currency?: string | null }) {
  const item = d.itemTitle || msg(lang, 'fallback.item')
  const ref = shortOrderRef(d.orderId)
  return {
    subject: msg(lang, 'paymentEmail.subject', { item }),
    html: renderEmailHtml(lang, {
      color: '#F59E0B',
      heading: msg(lang, 'paymentEmail.heading'),
      intro: msg(lang, 'paymentEmail.intro', { ref }),
      rows: [
        { label: msg(lang, 'email.item'), value: item, style: 'font-weight:600' },
        { label: msg(lang, 'email.amount'), value: formatMoney(d.amount, d.currency, LOCALES[lang]), style: 'font-weight:700;color:#E8344E' },
      ],
      footnote: msg(lang, 'paymentEmail.footnote'),
    }),
  }
}

/** Send order confirmation email to buyer (dans la langue de l'acheteur) */
export async function sendOrderConfirmationEmail(buyerId: string, orderData: { id: string; itemTitle?: string | null; amount: number; currency?: string | null; sellerName?: string | null }) {
  if (!resend) return
  const email = await getUserEmail(buyerId)
  if (!email) return
  try {
    const lang = await getUserLang(buyerId)
    const { subject, html } = buildOrderConfirmationEmail(lang, orderData)
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html })
  } catch (err) {
    console.error('[Email] Order confirmation error:', err)
  }
}

/** Send payment reminder email to buyer (dans la langue de l'acheteur) */
export async function sendPaymentReminderEmail(buyerId: string, data: { orderId: string; itemTitle?: string | null; amount: number; currency?: string | null }) {
  if (!resend) return
  const email = await getUserEmail(buyerId)
  if (!email) return
  try {
    const lang = await getUserLang(buyerId)
    const { subject, html } = buildPaymentReminderEmail(lang, data)
    await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html })
  } catch (err) {
    console.error('[Email] Payment reminder error:', err)
  }
}

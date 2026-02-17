import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createServer } from 'http'
import http2 from 'http2'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { WebSocketServer, type WebSocket } from 'ws'
import { spawn, type ChildProcess } from 'child_process'
import Mux from '@mux/mux-node'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk'

dotenv.config()

// =============================================
// Config & validation
// =============================================
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\s+/g, '')
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_KEY || '').replace(/\s+/g, '')

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

const PLATFORM_COMMISSION = Number(process.env.PLATFORM_COMMISSION) || 0.08  // 8% HT
const PROCESSING_FEE_RATE = 0.029   // 2.9% HT (Stripe)
const PROCESSING_FEE_FIXED = 0.30   // 0.30€ HT fixe (Stripe)
const VAT_RATE = 0.20               // 20% TVA (France)
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929'
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://shapop.app'

// Helper: escape HTML special characters to prevent injection
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Helper: calcule tous les frais sur un montant de vente (TVA incluse sur les frais)
function calculateFees(amount: number) {
  const platformFeeHT = amount * PLATFORM_COMMISSION
  const processingFeeHT = amount * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED
  // TVA appliquée sur les frais de service (comme Whatnot Europe)
  const platformFee = Math.round(platformFeeHT * (1 + VAT_RATE) * 100) / 100
  const processingFee = Math.round(processingFeeHT * (1 + VAT_RATE) * 100) / 100
  const totalFees = Math.round((platformFee + processingFee) * 100) / 100
  const sellerPayout = Math.round((amount - totalFees) * 100) / 100
  return { platformFee, processingFee, totalFees, sellerPayout }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// =============================================
// Stripe client
// =============================================
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY not set — Stripe features will fail')
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

// Resend for email notifications
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// =============================================
// PayPal Payouts config
// =============================================
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPaypalAccessToken(): Promise<string> {
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

// =============================================
// APNs Push Notifications (iOS)
// =============================================
const APNS_KEY_ID = process.env.APNS_KEY_ID || ''
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || ''
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.shapop.app'
const APNS_KEY_PATH = process.env.APNS_KEY_PATH || ''
const APNS_PRODUCTION = process.env.NODE_ENV === 'production'

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

async function sendApnsPush(deviceToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
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

/** Send push notification to all followers of a seller who have notify_live enabled */
async function notifyFollowersSellerLive(sellerId: string, streamTitle: string, streamId: string) {
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

  // Get seller name
  const { data: seller } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', sellerId)
    .single()

  const sellerName = seller?.display_name || 'A seller'
  const title = `${sellerName} is live!`
  const body = streamTitle

  // Send in parallel (safety cap at 200)
  const batch = tokens.slice(0, 200)
  await Promise.allSettled(
    batch.map(t => sendApnsPush(t.token, title, body, { stream_id: streamId }))
  )
}

// =============================================
// Mux client
// =============================================
if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  console.warn('WARNING: MUX_TOKEN_ID or MUX_TOKEN_SECRET not set — Mux features will fail')
}
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
})

// =============================================
// LiveKit client (WebRTC low-latency streaming)
// =============================================
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const LIVEKIT_URL = process.env.LIVEKIT_URL || '' // e.g. wss://xxx.livekit.cloud

const livekitRoomService = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL)
  ? new RoomServiceClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

const livekitWebhookReceiver = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
  ? new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.warn('WARNING: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL not set — LiveKit features will fail')
}

// =============================================
// Webhook handlers (defined early, registered before express.json)
// =============================================
async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    let event: Stripe.Event

    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — rejecting webhook')
      res.status(500).json({ error: 'Webhook secret not configured' })
      return
    }
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' })
      return
    }
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, webhookSecret)
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message)
      res.status(400).json({ error: 'Invalid signature' })
      return
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          // Look up seller trust for holdback
          const { data: orderData } = await supabase
            .from('orders')
            .select('seller_id, buyer_id')
            .eq('id', orderId)
            .single()

          let holdbackPercent = 0
          let payoutScheduledAt: string | null = null
          let payoutMethod = 'stripe'

          if (orderData) {
            const { data: trust } = await supabase
              .from('seller_trust')
              .select('holdback_percent, payout_delay_days')
              .eq('seller_id', orderData.seller_id)
              .single()

            if (trust) {
              holdbackPercent = trust.holdback_percent
              const payoutDate = new Date()
              payoutDate.setDate(payoutDate.getDate() + trust.payout_delay_days)
              payoutScheduledAt = payoutDate.toISOString()
            }

            // Check if seller uses PayPal
            const { data: sellerInfo } = await supabase
              .from('sellers')
              .select('bank_choice, paypal_email')
              .eq('id', orderData.seller_id)
              .single()

            if (sellerInfo?.bank_choice === 'paypal' && sellerInfo?.paypal_email) {
              payoutMethod = 'paypal'
            }
          }

          await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              holdback_percent: holdbackPercent,
              payout_scheduled_at: payoutScheduledAt,
              payout_method: payoutMethod,
            })
            .eq('id', orderId)

          // If PayPal seller, create a paypal_payouts record
          if (payoutMethod === 'paypal' && orderData) {
            const { data: sellerInfo } = await supabase
              .from('sellers')
              .select('paypal_email')
              .eq('id', orderData.seller_id)
              .single()

            if (sellerInfo?.paypal_email) {
              const fees = calculateFees(pi.amount / 100)
              await supabase.from('paypal_payouts').insert({
                order_id: orderId,
                seller_id: orderData.seller_id,
                paypal_email: sellerInfo.paypal_email,
                amount: fees.sellerPayout,
                currency: 'EUR',
                status: 'pending',
              })
              console.log(`[PayPal] Created payout record for order ${orderId} (${fees.sellerPayout} EUR)`)
            }
          }

          // Auto-create conversation between buyer and seller
          if (orderData) {
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('order_id', orderId)
              .limit(1)
              .single()

            if (!existingConv) {
              await supabase.from('conversations').insert({
                type: 'order',
                order_id: orderId,
                participant_1: orderData.buyer_id,
                participant_2: orderData.seller_id,
              })
            }
          }

          console.log(`[Stripe] Order ${orderId} marked as paid (holdback: ${holdbackPercent}%, payout: ${payoutMethod})`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'pending_payment' })
            .eq('id', orderId)
          console.log(`[Stripe] Order ${orderId} payment failed`)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.charges_enabled && account.details_submitted) {
          await supabase
            .from('sellers')
            .update({ kyc_status: 'verified' })
            .eq('stripe_account_id', account.id)
          console.log(`[Stripe] Account ${account.id} verified`)
        }
        break
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    res.status(400).json({ error: 'Webhook error' })
  }
}

async function muxWebhookHandler(req: Request, res: Response) {
  try {
    // Verify Mux webhook signature if secret is configured
    const muxWebhookSecret = process.env.MUX_WEBHOOK_SECRET
    if (muxWebhookSecret) {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
      const signature = req.headers['mux-signature'] as string
      if (!signature) {
        res.status(401).json({ error: 'Missing Mux signature header' })
        return
      }
      try {
        muxClient.webhooks.verifySignature(rawBody.toString(), { 'mux-signature': signature }, muxWebhookSecret)
      } catch {
        console.error('[Mux Webhook] Signature verification failed')
        res.status(401).json({ error: 'Invalid Mux webhook signature' })
        return
      }
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body)
    const type = body?.type as string
    const data = body?.data as Record<string, unknown>

    if (type === 'video.live_stream.active' && data?.id) {
      // Update stream status
      const { data: streams } = await supabase
        .from('streams')
        .update({ status: 'live' })
        .eq('mux_stream_id', data.id as string)
        .select('id, title, seller_id')

      // Send push notifications to followers
      if (streams && streams.length > 0) {
        const stream = streams[0]
        notifyFollowersSellerLive(stream.seller_id, stream.title, stream.id).catch(err =>
          console.error('Push notification error:', err)
        )
      }
    }

    if (type === 'video.asset.ready' && data?.id) {
      const liveStreamId = (data as { live_stream_id?: string }).live_stream_id
      if (liveStreamId) {
        await supabase
          .from('streams')
          .update({ mux_asset_id: data.id as string })
          .eq('mux_stream_id', liveStreamId)
      }
    }

    res.json({ received: true })
  } catch {
    res.status(400).json({ error: 'Invalid webhook' })
  }
}

async function livekitWebhookHandler(req: Request, res: Response) {
  try {
    if (!livekitWebhookReceiver) {
      res.status(500).json({ error: 'LiveKit webhook receiver not configured' })
      return
    }

    const body = Buffer.isBuffer(req.body) ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    const authHeader = req.headers['authorization'] as string || ''
    const event = await livekitWebhookReceiver.receive(body, authHeader)

    if (event.event === 'participant_joined' && event.participant?.identity?.startsWith('seller-')) {
      // Publisher (seller) joined → mark stream as live + push notifs
      const roomName = event.room?.name
      if (roomName) {
        const { data: streams } = await supabase
          .from('streams')
          .update({ status: 'live', started_at: new Date().toISOString() })
          .eq('livekit_room_name', roomName)
          .eq('status', 'scheduled')
          .select('id, title, seller_id')

        if (streams && streams.length > 0) {
          const stream = streams[0]
          notifyFollowersSellerLive(stream.seller_id, stream.title, stream.id).catch(err =>
            console.error('Push notification error:', err)
          )
        }
      }
    }

    if (event.event === 'room_finished') {
      const roomName = event.room?.name
      if (roomName) {
        await supabase
          .from('streams')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('livekit_room_name', roomName)
          .eq('status', 'live')
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('LiveKit webhook error:', err)
    res.status(400).json({ error: 'Invalid webhook' })
  }
}

// =============================================
// Express setup
// =============================================
const app = express()
const PORT = process.env.PORT || 4000

// Extend Request type for auth
type AuthenticatedRequest = Request & { user?: { id: string; email?: string } }

// Security headers
app.use(helmet())

// CORS - accept configured origins + Capacitor
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow Capacitor origins
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return callback(null, true)
    // Allow configured origins
    if (allowed.includes(origin)) return callback(null, true)
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Webhooks need raw body for signature verification — MUST be before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler as express.RequestHandler)
app.post('/api/webhooks/mux', express.raw({ type: 'application/json' }), muxWebhookHandler as express.RequestHandler)
app.post('/api/webhooks/livekit', express.raw({ type: 'application/json' }), livekitWebhookHandler as express.RequestHandler)

app.use(express.json({ limit: '10mb' }))

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests, please try again later' },
})

const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { error: 'Too many admin requests, slow down' },
})

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives, reessayez plus tard' },
})

app.use(globalLimiter)

// =============================================
// OTP store (in-memory, expires after 5 min)
// =============================================
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>()

// Cleanup expired OTPs every 5 min
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of otpStore) {
    if (now > val.expiresAt) otpStore.delete(key)
  }
}, 5 * 60 * 1000)

// Normalize phone to E.164 format
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '')
}

// =============================================
// Zod schemas
// =============================================
const UuidParam = z.object({ id: z.string().uuid() })

const CreateListingBody = z.object({
  image_url: z.string().url(),
  seller_id: z.string().uuid(),
})

const TrackEngagementBody = z.object({
  viewer_count: z.number().int().min(0),
  active_chatters: z.number().int().min(0),
  bids_count: z.number().int().min(0),
  reactions_count: z.number().int().min(0),
  new_followers: z.number().int().min(0).optional(),
})

const JoinCommunityBody = z.object({
  user_id: z.string().uuid(),
})

const GenerateBannerBody = z.object({
  image_url: z.string().url(),
  store_name: z.string().min(1).max(200),
  style: z.string().max(500).optional(),
  seller_id: z.string().uuid().optional(),
})

// =============================================
// Auth middleware
// =============================================
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Check if user is banned
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', data.user.id)
      .single()
    if (profile?.is_banned) {
      res.status(403).json({ error: 'Votre compte a ete banni' })
      return
    }

    req.user = { id: data.user.id, email: data.user.email }
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// =============================================
// Health
// =============================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =============================================
// Auth: OTP & Ban check (public)
// =============================================

// Send OTP via SMS
app.post('/api/auth/send-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Numero de telephone requis' })
      return
    }

    const normalized = normalizePhone(phone)
    if (!/^\+\d{8,15}$/.test(normalized)) {
      res.status(400).json({ error: 'Format de numero invalide (ex: +33612345678)' })
      return
    }

    // Check if phone is banned
    const { data: banned } = await supabase
      .from('banned_identifiers')
      .select('id')
      .eq('type', 'phone')
      .eq('value', normalized)
      .maybeSingle()
    if (banned) {
      res.status(403).json({ error: 'Ce numero de telephone est bloque' })
      return
    }

    // Check if phone already used by a verified profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', normalized)
      .eq('phone_verified', true)
      .maybeSingle()
    if (existingProfile) {
      res.status(409).json({ error: 'Ce numero est deja utilise par un autre compte' })
      return
    }

    // Generate 6-digit code (cryptographically secure)
    const code = String(crypto.randomInt(100000, 999999))
    otpStore.set(normalized, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 })

    // Send via Twilio if configured
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    if (twilioSid && twilioToken && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const body = new URLSearchParams({
        To: normalized,
        From: twilioFrom,
        Body: `Votre code ShaPop : ${code}`,
      })
      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    } else {
      console.log(`[DEV OTP] Code for ${normalized}: ${code}`)
    }

    res.json({ sent: true })
  } catch (err) {
    console.error('[send-otp]', err)
    res.status(500).json({ error: "Erreur lors de l'envoi du code" })
  }
})

// Verify OTP code
app.post('/api/auth/verify-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      res.status(400).json({ error: 'Telephone et code requis' })
      return
    }

    const normalized = normalizePhone(phone)
    const entry = otpStore.get(normalized)

    if (!entry) {
      res.json({ verified: false, error: 'Code expire ou inexistant' })
      return
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized)
      res.json({ verified: false, error: 'Code expire' })
      return
    }

    entry.attempts++
    if (entry.attempts > 5) {
      otpStore.delete(normalized)
      res.json({ verified: false, error: 'Trop de tentatives, demandez un nouveau code' })
      return
    }

    if (entry.code !== String(code).trim()) {
      res.json({ verified: false, error: 'Code incorrect' })
      return
    }

    // Success — remove from store
    otpStore.delete(normalized)
    res.json({ verified: true })
  } catch {
    res.status(500).json({ error: 'Erreur de verification' })
  }
})

// Check if email or phone is banned
app.post('/api/auth/check-banned', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body
    const conditions: { type: string; value: string }[] = []

    if (email && typeof email === 'string') {
      conditions.push({ type: 'email', value: email.toLowerCase().trim() })
    }
    if (phone && typeof phone === 'string') {
      conditions.push({ type: 'phone', value: normalizePhone(phone) })
    }

    if (conditions.length === 0) {
      res.json({ banned: false })
      return
    }

    // Check each identifier
    for (const cond of conditions) {
      const { data } = await supabase
        .from('banned_identifiers')
        .select('reason')
        .eq('type', cond.type)
        .eq('value', cond.value)
        .maybeSingle()
      if (data) {
        const label = cond.type === 'email' ? 'Cet email est bloque' : 'Ce numero est bloque'
        res.json({ banned: true, reason: label })
        return
      }
    }

    res.json({ banned: false })
  } catch {
    res.status(500).json({ error: 'Erreur de verification' })
  }
})

// =============================================
// STREAMS (public reads, auth writes)
// =============================================
app.get('/api/streams', async (req: Request, res: Response) => {
  try {
    const { category, city, status } = req.query

    let query = supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, id, return_policy, profiles:profiles!id(display_name, avatar_url))')
      .in('status', status ? [status as string] : ['live', 'scheduled'])
      .order('engagement_score', { ascending: false })

    if (category && typeof category === 'string') query = query.eq('category', category)
    if (city && typeof city === 'string') query = query.eq('city', city)

    const { data, error } = await query.limit(50)
    if (error) {
      res.status(500).json({ error: 'Failed to fetch streams' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// DIRECT SALES — AI Express items (public)
// =============================================
app.get('/api/items/direct-sales', async (req: Request, res: Response) => {
  try {
    const { category } = req.query

    let query = supabase
      .from('items')
      .select('*, seller:profiles!seller_id(display_name, avatar_url)')
      .is('stream_id', null)
      .eq('ai_generated', true)
      .in('status', ['draft', 'pending', 'active'])
      .order('created_at', { ascending: false })

    if (category && typeof category === 'string') query = query.eq('category', category)

    const { data, error } = await query.limit(50)
    if (error) {
      res.status(500).json({ error: 'Failed to fetch direct sales items' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*, seller:profiles!seller_id(display_name, avatar_url)')
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/streams/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, id, return_policy, profiles:profiles!id(display_name, avatar_url))')
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/streams — create a new stream (auth required)
// =============================================
app.post('/api/streams', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Validate request body
    const { title, category, scheduled_at, thumbnail_url, city } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'category is required' })
      return
    }
    if (scheduled_at && isNaN(Date.parse(scheduled_at))) {
      res.status(400).json({ error: 'scheduled_at must be a valid ISO date' })
      return
    }

    // Auto-create seller record if missing
    const { error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', userId)
      .single()

    if (sellerError && sellerError.code === 'PGRST116') {
      const { error: createSellerError } = await supabase
        .from('sellers')
        .insert({ id: userId })
      if (createSellerError) {
        console.error('Failed to auto-create seller:', createSellerError)
        res.status(500).json({ error: 'Failed to create seller record' })
        return
      }
    } else if (sellerError) {
      console.error('Seller check error:', sellerError)
      res.status(500).json({ error: 'Failed to verify seller record' })
      return
    }

    // Insert stream
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .insert({
        seller_id: userId,
        title: title.trim(),
        category,
        status: scheduled_at ? 'scheduled' : 'scheduled',
        scheduled_at: scheduled_at || null,
        thumbnail_url: thumbnail_url || null,
        city: city || null,
      })
      .select()
      .single()

    if (streamError) {
      console.error('Stream creation error:', streamError)
      res.status(500).json({ error: 'Failed to create stream' })
      return
    }

    res.json(stream)
  } catch (err) {
    console.error('POST /api/streams error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders — create an order for a won auction item (auth required)
// =============================================
app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Validate request body
    const { item_id } = req.body
    if (!item_id || typeof item_id !== 'string') {
      res.status(400).json({ error: 'item_id is required' })
      return
    }
    // Basic UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item_id)) {
      res.status(400).json({ error: 'item_id must be a valid UUID' })
      return
    }

    // Fetch the item — must be sold with a winner
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, status, winner_id, current_price, seller_id, stream_id')
      .eq('id', item_id)
      .single()

    if (itemError || !item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    if (item.status !== 'sold') {
      res.status(400).json({ error: 'Item is not sold' })
      return
    }
    if (!item.winner_id) {
      res.status(400).json({ error: 'Item has no winner' })
      return
    }

    // Check for existing order (idempotency)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('item_id', item_id)
      .maybeSingle()

    if (existingOrder) {
      res.json(existingOrder)
      return
    }

    // Calculate fees using the server-side helper
    const amount = item.current_price
    const fees = calculateFees(amount)

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: item.winner_id,
        seller_id: item.seller_id,
        item_id: item.id,
        stream_id: item.stream_id,
        amount,
        platform_fee: fees.platformFee,
        processing_fee: fees.processingFee,
        seller_payout: fees.sellerPayout,
        status: 'pending_payment',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      res.status(500).json({ error: 'Failed to create order' })
      return
    }

    res.json(order)
  } catch (err) {
    console.error('POST /api/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/streams/:id/end', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify ownership
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id')
      .eq('id', req.params.id)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only end your own streams' })
      return
    }

    const { error } = await supabase
      .from('streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to end stream' })
      return
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// ENCHÈRES (auth required)
// =============================================
app.post('/api/items/:id/start-auction', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify ownership
    const { data: item } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', req.params.id)
      .single()

    if (!item || item.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only start auctions for your own items' })
      return
    }

    const { error } = await supabase
      .from('items')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to start auction' })
      return
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/items/:id/end-auction', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify ownership
    const { data: itemCheck } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', req.params.id)
      .single()

    if (!itemCheck || itemCheck.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only end auctions for your own items' })
      return
    }

    // Get full item for min_price check
    const { data: fullItem } = await supabase
      .from('items')
      .select('min_price')
      .eq('id', req.params.id)
      .single()

    const minPrice = fullItem?.min_price || 0

    const { data: topBid } = await supabase
      .from('bids')
      .select('*')
      .eq('item_id', req.params.id)
      .order('amount', { ascending: false })
      .limit(1)
      .single()

    // Only mark sold if bid meets reserve price
    const meetsReserve = topBid && topBid.amount >= minPrice
    const status = meetsReserve ? 'sold' : 'unsold'
    const winnerId = meetsReserve ? topBid.bidder_id : null

    const { error } = await supabase
      .from('items')
      .update({
        status,
        winner_id: winnerId,
        current_price: topBid?.amount || undefined,
        ended_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to end auction' })
      return
    }

    // Create order if sold
    if (topBid && winnerId) {
      // Idempotency check: skip if an order already exists for this item
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('item_id', req.params.id)
        .limit(1)
        .maybeSingle()

      if (existingOrder) {
        // Order already exists (possible duplicate request), return it
        res.json({ success: true, status, winner_id: winnerId, order: existingOrder })
        return
      }

      const { data: item } = await supabase
        .from('items')
        .select('*')
        .eq('id', req.params.id)
        .single()

      if (item) {
        const fees = calculateFees(topBid.amount)
        await supabase.from('orders').insert({
          buyer_id: winnerId,
          seller_id: item.seller_id,
          item_id: item.id,
          stream_id: item.stream_id,
          amount: topBid.amount,
          platform_fee: fees.platformFee,
          processing_fee: fees.processingFee,
          seller_payout: fees.sellerPayout,
        })
      }
    }

    res.json({ success: true, status, winner_id: winnerId, final_price: topBid?.amount || 0 })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// IA — Création automatique de listing (auth + rate limit)
// =============================================
app.post('/api/ai/create-listing', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = CreateListingBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const { image_url, seller_id } = parsed.data

    // Verify the authenticated user is the seller
    if (seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only create listings for yourself' })
      return
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: image_url },
            },
            {
              type: 'text',
              text: `Analyze this product image for a live auction marketplace in Israel.
Return a JSON object with:
- "title": product name in Hebrew (with English in parentheses)
- "description": detailed description in Hebrew
- "category": one of [Cards, Sneakers, Vintage, Electronics, Fashion, Toys, Art, Jewelry, Other]
- "subcategory": more specific category
- "condition": one of [mint, near_mint, good, fair, poor]
- "tags": array of relevant tags
- "estimated_price_low": minimum estimated price in ILS
- "estimated_price_high": maximum estimated price in ILS
- "confidence": your confidence score 0 to 1

Return ONLY the JSON, no other text.`
            }
          ]
        }]
      })
    })

    const aiResult = await response.json() as { content?: { text?: string }[] }
    const content = aiResult.content?.[0]?.text
    if (!content) throw new Error('No AI response')

    let listing: Record<string, unknown>
    try {
      listing = JSON.parse(content)
    } catch {
      res.status(500).json({ error: 'Failed to parse AI response' })
      return
    }

    // ai_confidence comes as 0-1 from this prompt, but normalize just in case
    const confidence = listing.confidence != null
      ? (Number(listing.confidence) > 1 ? Number(listing.confidence) / 100 : Number(listing.confidence))
      : null

    const { data: item, error } = await supabase.from('items').insert({
      seller_id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      subcategory: listing.subcategory,
      image_urls: [image_url],
      starting_price: listing.estimated_price_low,
      current_price: listing.estimated_price_low,
      estimated_price_low: listing.estimated_price_low,
      estimated_price_high: listing.estimated_price_high,
      ai_generated: true,
      ai_tags: listing.tags,
      ai_condition: listing.condition,
      ai_confidence: confidence,
      status: 'draft',
    }).select().single()

    if (error) {
      res.status(500).json({ error: 'Failed to save listing' })
      return
    }

    res.json({ item, ai_analysis: listing })
  } catch {
    res.status(500).json({ error: 'AI analysis failed' })
  }
})

// =============================================
// MATCHING — Lives personnalisés (public)
// =============================================
app.get('/api/matching/personalized-lives', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string

    if (!userId) {
      const { data } = await supabase
        .from('streams')
        .select('*, seller:sellers!seller_id(store_name)')
        .eq('status', 'live')
        .order('engagement_score', { ascending: false })
        .limit(20)
      res.json(data || [])
      return
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: recentBids } = await supabase
      .from('bids')
      .select('item:items!item_id(category, seller_id)')
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: lives } = await supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, categories)')
      .eq('status', 'live')
      .limit(50)

    if (!lives) {
      res.json([])
      return
    }

    const scoredLives = lives.map(live => {
      let score = live.engagement_score || 0

      if (prefs?.favorite_categories?.includes(live.category)) {
        score += 50
      }
      if (prefs?.favorite_sellers?.includes(live.seller_id)) {
        score += 100
      }
      if (prefs?.preferred_cities?.includes(live.city)) {
        score += 30
      }

      const bidCategories = recentBids
        ?.map(b => {
          const item = b.item as { category?: string } | null
          return item?.category
        })
        .filter(Boolean) || []
      if (bidCategories.includes(live.category)) {
        score += 25
      }

      return { ...live, matching_score: score }
    })

    scoredLives.sort((a, b) => {
      const exploreA = Math.random() < 0.1 ? Math.random() * 100 : 0
      const exploreB = Math.random() < 0.1 ? Math.random() * 100 : 0
      return (b.matching_score + exploreB) - (a.matching_score + exploreA)
    })

    res.json(scoredLives.slice(0, 20))
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// COMMUNAUTÉS LOCALES (public reads, auth writes)
// =============================================
app.get('/api/communities', async (req: Request, res: Response) => {
  try {
    const { city } = req.query

    let query = supabase
      .from('communities')
      .select('*, member_count')
      .order('member_count', { ascending: false })

    if (city && typeof city === 'string') query = query.eq('city', city)

    const { data, error } = await query.limit(20)
    if (error) {
      res.status(500).json({ error: 'Failed to fetch communities' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/communities/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius_km } = req.query

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng required' })
      return
    }

    const radiusMeters = (Number(radius_km) || 50) * 1000

    const { data, error } = await supabase.rpc('nearby_communities', {
      user_lat: Number(lat),
      user_lng: Number(lng),
      radius_meters: radiusMeters,
    })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch nearby communities' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/communities/:id/join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const communityId = req.params.id
    const userId = req.user!.id

    // Check for existing membership
    const { data: existing } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      res.status(409).json({ error: 'Already a member of this community' })
      return
    }

    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: userId,
    })

    if (error) {
      res.status(500).json({ error: 'Failed to join community' })
      return
    }

    await supabase.rpc('increment_community_members', { community_id: communityId })

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// LIVE ADAPTATIF — Suggestions temps réel (public)
// =============================================
app.get('/api/streams/:id/adaptive-suggestions', async (req: Request, res: Response) => {
  try {
    const streamId = req.params.id
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: metrics } = await supabase
      .from('engagement_metrics')
      .select('*')
      .eq('stream_id', streamId)
      .gte('timestamp', fiveMinAgo)
      .order('timestamp', { ascending: false })

    if (!metrics || metrics.length === 0) {
      res.json({ suggestions: [], energy: 'unknown' })
      return
    }

    const latest = metrics[0]
    const suggestions: string[] = []

    if (latest.energy_level === 'low') {
      suggestions.push('Engagement faible — lance une enchère flash à 1₪ pour réveiller le public')
      suggestions.push('Essaie de poser une question au chat')
    }

    if (latest.energy_level === 'peak') {
      suggestions.push('Engagement au max ! Lance ton article le plus cher maintenant')
      suggestions.push('Propose un bundle exclusif')
    }

    if (latest.active_chatters < latest.viewer_count * 0.1) {
      suggestions.push('Peu de gens chattent — invite les viewers à écrire un message')
    }

    if (latest.bids_count === 0 && latest.viewer_count > 5) {
      suggestions.push('Aucune enchère — baisse le prix de départ ou montre mieux l\'article')
    }

    const avgEngagement = metrics.reduce((sum, m) => sum + Number(m.engagement_rate), 0) / metrics.length
    if (avgEngagement > 0.3) {
      suggestions.push('Ton taux d\'engagement est excellent (>' + Math.round(avgEngagement * 100) + '%) — continue comme ça !')
    }

    res.json({
      suggestions,
      energy: latest.energy_level,
      metrics: {
        viewers: latest.viewer_count,
        chatters: latest.active_chatters,
        bids: latest.bids_count,
        reactions: latest.reactions_count,
        engagement_rate: latest.engagement_rate,
      }
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// PUSH NOTIFICATIONS — Send test notification
// =============================================
app.post('/api/notifications/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) {
      res.status(404).json({ error: 'No device token registered' })
      return
    }

    const results = await Promise.allSettled(
      tokens.map(t => sendApnsPush(t.token, 'ShaPop', 'Test notification — push is working!'))
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
    res.json({ sent, total: tokens.length })
  } catch {
    res.status(500).json({ error: 'Failed to send test notification' })
  }
})

// =============================================
// ENGAGEMENT TRACKING (auth required)
// =============================================
app.post('/api/streams/:id/track-engagement', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = TrackEngagementBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' })
      return
    }

    const streamId = req.params.id
    const { viewer_count, active_chatters, bids_count, reactions_count, new_followers } = parsed.data

    // Verify the authenticated user is the stream owner/seller
    const { data: stream, error: streamFetchError } = await supabase
      .from('streams')
      .select('seller_id, peak_viewers')
      .eq('id', streamId)
      .single()

    if (streamFetchError || !stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }
    if (stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to update this stream' })
      return
    }

    const engagementRate = viewer_count > 0
      ? (active_chatters + bids_count + reactions_count) / viewer_count
      : 0

    let energyLevel = 'medium'
    if (engagementRate < 0.05) energyLevel = 'low'
    else if (engagementRate < 0.2) energyLevel = 'medium'
    else if (engagementRate < 0.4) energyLevel = 'high'
    else energyLevel = 'peak'

    const { error: metricsError } = await supabase.from('engagement_metrics').insert({
      stream_id: streamId,
      timestamp: new Date().toISOString(),
      viewer_count,
      active_chatters,
      bids_count,
      reactions_count,
      new_followers: new_followers || 0,
      engagement_rate: engagementRate,
      energy_level: energyLevel,
    })

    if (metricsError) {
      res.status(500).json({ error: 'Failed to track engagement' })
      return
    }

    const { error: streamUpdateError } = await supabase
      .from('streams')
      .update({
        engagement_score: engagementRate * 100,
        viewer_count,
        peak_viewers: Math.max(viewer_count, stream.peak_viewers || 0),
      })
      .eq('id', streamId)

    if (streamUpdateError) {
      res.status(500).json({ error: 'Failed to update stream engagement' })
      return
    }

    res.json({ energy_level: energyLevel, engagement_rate: engagementRate })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Contact — Store support messages
// =============================================
app.post('/api/contact', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, message } = req.body
    if (!topic || !message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Topic and message are required' })
      return
    }

    const userEmail = req.user!.email || 'unknown'
    const userName = req.user!.id

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', req.user!.id)
      .single()

    const displayName = profile?.display_name || profile?.username || 'Unknown'

    // Store in Supabase
    await supabase.from('contact_messages').insert({
      user_id: req.user!.id,
      user_email: userEmail,
      user_name: displayName,
      topic,
      message: message.trim(),
      status: 'new',
    })

    // Send email notification via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: 'ShaPop Support <onboarding@resend.dev>',
          to: 'shapopcontact@gmail.com',
          subject: `[ShaPop Contact] ${topic} — ${displayName}`,
          html: `
            <h2>New contact message</h2>
            <p><strong>From:</strong> ${displayName} (${userEmail})</p>
            <p><strong>Topic:</strong> ${topic}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left:3px solid #F0908A;padding-left:12px;color:#333">${escapeHtml(message.trim()).replace(/\n/g, '<br>')}</blockquote>
            <p style="color:#888;font-size:12px">User ID: ${userName}</p>
          `,
        })
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr)
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Contact endpoint error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// =============================================
// IA — Générateur de bannière (auth + rate limit)
// =============================================
app.post('/api/ai/generate-store-banner', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = GenerateBannerBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const { image_url, store_name, style, seller_id } = parsed.data

    const conceptResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: image_url },
            },
            {
              type: 'text',
              text: `Tu es un directeur artistique expert en branding pour les boutiques en ligne.

Le vendeur "${store_name}" veut une image de présentation pour sa boutique sur une plateforme de live shopping en Israël.
Il a envoyé cette photo comme inspiration.
${style ? `Style demandé : ${style}` : ''}

Analyse cette image et génère :

1. "concept": Une description du concept visuel que tu proposes (2-3 phrases en français)
2. "image_prompt": Un prompt détaillé en anglais pour générer une image de bannière de boutique professionnelle inspirée de cette photo. Le prompt doit décrire :
   - Le style visuel (couleurs, ambiance, éclairage)
   - La composition (mise en page de bannière, ratio 16:9)
   - Les éléments décoratifs inspirés de la photo
   - L'espace pour le nom de la boutique
   - Un rendu moderne, clean, premium
   Le prompt doit commencer par "Professional e-commerce store banner, 16:9 ratio,"
3. "color_palette": Un array de 4 couleurs hex qui correspondent au mood
4. "tagline": Une phrase d'accroche courte et percutante pour la boutique (en hébreu + français)

Retourne UNIQUEMENT le JSON, rien d'autre.`
            }
          ]
        }]
      })
    })

    const conceptResult = await conceptResponse.json() as { content?: { text?: string }[] }
    const conceptText = conceptResult.content?.[0]?.text
    if (!conceptText) throw new Error('No AI response for concept')

    let concept: Record<string, unknown>
    try {
      concept = JSON.parse(conceptText)
    } catch {
      res.status(500).json({ error: 'Failed to parse AI response' })
      return
    }

    // Generate image with Replicate (Flux)
    let generatedImageUrl = null

    if (process.env.REPLICATE_API_KEY) {
      const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-1.1-pro',
          input: {
            prompt: concept.image_prompt,
            aspect_ratio: '16:9',
            output_quality: 90,
          }
        })
      })

      const prediction = await replicateResponse.json() as { id: string; urls?: { get: string } }

      if (prediction.urls?.get) {
        let result: { status: string; output?: string | string[] } = { status: 'starting' }
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000))
          const pollResponse = await fetch(prediction.urls!.get, {
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}` }
          })
          result = await pollResponse.json() as typeof result
          if (result.status === 'succeeded' || result.status === 'failed') break
        }

        if (result.status === 'succeeded' && result.output) {
          generatedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output
        }
      }
    }

    // Save to DB if seller_id provided
    if (seller_id && generatedImageUrl) {
      await supabase
        .from('sellers')
        .update({ store_banner_url: generatedImageUrl })
        .eq('id', seller_id)
    }

    res.json({
      concept: concept.concept,
      image_prompt: concept.image_prompt,
      color_palette: concept.color_palette,
      tagline: concept.tagline,
      generated_image_url: generatedImageUrl,
      inspiration_image: image_url,
    })
  } catch {
    res.status(500).json({ error: 'Banner generation failed' })
  }
})

// =============================================
// MUX LIVE STREAMING
// =============================================

// Create a Mux live stream for a given stream
app.post('/api/streams/:id/create-mux-stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id

    // Verify ownership
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, mux_stream_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only create Mux streams for your own streams' })
      return
    }

    // Don't create duplicate Mux streams
    if (stream.mux_stream_id) {
      const { data: existing } = await supabase
        .from('streams')
        .select('mux_stream_id, mux_playback_id')
        .eq('id', streamId)
        .single()
      res.json({
        mux_stream_id: existing?.mux_stream_id,
        mux_playback_id: existing?.mux_playback_id,
      })
      return
    }

    const muxStream = await muxClient.video.liveStreams.create({
      playback_policy: ['public'],
      new_asset_settings: { playback_policy: ['public'] },
      latency_mode: 'low',
      reconnect_window: 30,
    })

    const muxStreamId = muxStream.id
    const muxPlaybackId = muxStream.playback_ids?.[0]?.id || null
    const muxStreamKey = muxStream.stream_key || null

    await supabase
      .from('streams')
      .update({
        mux_stream_id: muxStreamId,
        mux_playback_id: muxPlaybackId,
        mux_stream_key: muxStreamKey,
      })
      .eq('id', streamId)

    // Return only safe fields (never the stream_key)
    res.json({
      mux_stream_id: muxStreamId,
      mux_playback_id: muxPlaybackId,
    })
  } catch (err: any) {
    console.error('Mux stream creation error:', err?.message || err, err?.response?.data)
    res.status(500).json({ error: 'Failed to create Mux stream', details: err?.message })
  }
})

// End a Mux live stream
app.post('/api/streams/:id/end-mux-stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, mux_stream_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only end your own Mux streams' })
      return
    }

    if (stream.mux_stream_id) {
      try {
        await muxClient.video.liveStreams.complete(stream.mux_stream_id)
      } catch {
        // Stream may already be idle/complete — ignore
      }
    }

    await supabase
      .from('streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', streamId)

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to end Mux stream' })
  }
})

// Mux Webhooks — registered early (before express.json)

// =============================================
// LIVEKIT LIVE STREAMING (WebRTC, sub-300ms latency)
// =============================================

// Create a LiveKit room for a stream
app.post('/api/streams/:id/create-livekit-room', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only create LiveKit rooms for your own streams' })
      return
    }

    // Don't create duplicate rooms
    if (stream.livekit_room_name) {
      res.json({ livekit_room_name: stream.livekit_room_name })
      return
    }

    if (!livekitRoomService) {
      res.status(500).json({ error: 'LiveKit not configured' })
      return
    }

    const roomName = `stream-${streamId}`
    await livekitRoomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 500 })

    await supabase
      .from('streams')
      .update({ livekit_room_name: roomName })
      .eq('id', streamId)

    res.json({ livekit_room_name: roomName })
  } catch (err: any) {
    console.error('LiveKit room creation error:', err?.message || err)
    res.status(500).json({ error: 'Failed to create LiveKit room', details: err?.message })
  }
})

// Generate a LiveKit access token for a stream
app.post('/api/streams/:id/livekit-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const userId = req.user!.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream || !stream.livekit_room_name) {
      res.status(404).json({ error: 'Stream not found or LiveKit room not created' })
      return
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      res.status(500).json({ error: 'LiveKit not configured' })
      return
    }

    const isSeller = stream.seller_id === userId
    const identity = isSeller ? `seller-${userId}` : `viewer-${userId}`

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      ttl: '6h',
    })

    token.addGrant({
      room: stream.livekit_room_name,
      roomJoin: true,
      canPublish: isSeller,
      canSubscribe: true,
    })

    const jwt = await token.toJwt()

    res.json({ token: jwt, url: LIVEKIT_URL })
  } catch (err: any) {
    console.error('LiveKit token error:', err?.message || err)
    res.status(500).json({ error: 'Failed to generate LiveKit token' })
  }
})

// Mark stream as live (fallback when webhook doesn't fire)
app.post('/api/streams/:id/mark-live', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, status')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Not your stream' })
      return
    }
    if (stream.status === 'live') {
      res.json({ success: true, already_live: true })
      return
    }

    await supabase
      .from('streams')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', streamId)

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to mark stream as live' })
  }
})

// End a LiveKit stream
app.post('/api/streams/:id/end-livekit-stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only end your own streams' })
      return
    }

    // Delete the LiveKit room
    if (stream.livekit_room_name && livekitRoomService) {
      try {
        await livekitRoomService.deleteRoom(stream.livekit_room_name)
      } catch {
        // Room may already be gone
      }
    }

    await supabase
      .from('streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', streamId)

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to end LiveKit stream' })
  }
})

// Create AI Express listing (bypasses RLS)
app.post('/api/items/create-listing', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { title, description, category, starting_price, image_urls, ai_generated, ai_tags, ai_condition, ai_confidence } = req.body

    if (!title || !category) {
      res.status(400).json({ error: 'Missing required fields (title, category)' })
      return
    }

    const price = parseFloat(starting_price) || 0
    // ai_confidence comes as 70-98 from the AI but DB expects 0-1 (numeric(3,2))
    const normalizedConfidence = ai_confidence != null
      ? (ai_confidence > 1 ? ai_confidence / 100 : ai_confidence)
      : null

    const { data, error } = await supabase.from('items').insert({
      seller_id: userId,
      title,
      description: description || '',
      category,
      starting_price: price,
      current_price: price,
      image_urls: image_urls || [],
      ai_generated: ai_generated || false,
      ai_tags: ai_tags || [],
      ai_condition: ai_condition || null,
      ai_confidence: normalizedConfidence,
      status: 'draft',
    }).select('id').single()

    if (error) throw error
    res.json({ success: true, item_id: data.id })
  } catch (err: any) {
    console.error('Create listing error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Failed to create listing' })
  }
})

// Activate an item (start auction) — uses service key to bypass RLS
app.post('/api/items/:id/activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id

    const { data: item } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single()

    if (!item || item.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Not your item' })
      return
    }

    const { error } = await supabase
      .from('items')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) throw error
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to activate item' })
  }
})

// Save shipping address + update order (bypasses RLS)
app.post('/api/orders/:id/address', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id
    const userId = req.user!.id
    const { name, street, city, zip, phone } = req.body

    if (!name || !street || !city || !zip) {
      res.status(400).json({ error: 'Missing required address fields' })
      return
    }

    // Verify order belongs to buyer
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id')
      .eq('id', orderId)
      .eq('buyer_id', userId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const addr = { name, street, city, zip, phone: phone || '' }

    // Save/update default address
    const { data: existing } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (existing) {
      await supabase.from('addresses').update(addr).eq('id', existing.id)
    } else {
      await supabase.from('addresses').insert({ ...addr, user_id: userId, is_default: true })
    }

    // Save shipping address on order
    await supabase
      .from('orders')
      .update({ shipping_address: addr })
      .eq('id', orderId)

    res.json({ success: true })
  } catch (err: any) {
    console.error('Save address error:', err?.message || err)
    res.status(500).json({ error: 'Failed to save address' })
  }
})

// Place a bid on an item (bypasses RLS)
app.post('/api/items/:id/bid', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id
    const { amount } = req.body
    const userId = req.user!.id

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Invalid bid amount' })
      return
    }

    // Verify item exists and is active
    const { data: item } = await supabase
      .from('items')
      .select('id, current_price, status, seller_id')
      .eq('id', itemId)
      .single()

    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    if (item.status !== 'active') {
      res.status(400).json({ error: 'Auction is not active' })
      return
    }
    if (item.seller_id === userId) {
      res.status(400).json({ error: 'Cannot bid on your own item' })
      return
    }
    if (amount <= item.current_price) {
      res.status(400).json({ error: 'Bid must be higher than current price' })
      return
    }

    // Verify bidder has a saved payment method (card on file)
    const { data: bidderProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!bidderProfile?.stripe_customer_id) {
      res.status(403).json({ error: 'card_required' })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: bidderProfile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      res.status(403).json({ error: 'card_required' })
      return
    }

    // Insert bid
    const { error: bidError } = await supabase.from('bids').insert({
      item_id: itemId,
      bidder_id: userId,
      amount,
    })
    if (bidError) throw bidError

    // Update item current price
    await supabase
      .from('items')
      .update({ current_price: amount })
      .eq('id', itemId)

    res.json({ success: true })
  } catch (err: any) {
    console.error('Bid error:', err?.message || err)
    res.status(500).json({ error: 'Failed to place bid' })
  }
})

// Track viewer count: increment on join, decrement on leave
app.post('/api/streams/:id/viewer-join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const { data } = await supabase.from('streams').select('viewer_count').eq('id', streamId).single()
    if (data) {
      await supabase.from('streams').update({ viewer_count: (data.viewer_count || 0) + 1 }).eq('id', streamId)
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update viewer count' })
  }
})

app.post('/api/streams/:id/viewer-leave', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const { data } = await supabase.from('streams').select('viewer_count').eq('id', streamId).single()
    if (data) {
      await supabase.from('streams').update({ viewer_count: Math.max(0, (data.viewer_count || 0) - 1) }).eq('id', streamId)
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update viewer count' })
  }
})

// =============================================
// STRIPE CONNECT
// =============================================

// Create a Stripe Connect Express account for a seller
app.post('/api/stripe/create-connect-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check if seller already has a Stripe account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (seller?.stripe_account_id) {
      // Account already exists, just create a new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: seller.stripe_account_id,
        refresh_url: `${APP_BASE_URL}/payments?stripe=refresh`,
        return_url: `${APP_BASE_URL}/payments?stripe=success`,
        type: 'account_onboarding',
      })
      res.json({ url: accountLink.url, account_id: seller.stripe_account_id })
      return
    }

    // Get seller profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, country')
      .eq('id', userId)
      .single()

    // Use country from request body, then profile, then default to FR
    const country = req.body?.country || profile?.country || 'FR'

    // Create Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: profile?.display_name || profile?.username || 'ShaPop Seller',
        product_description: 'Live shopping sales on ShaPop',
      },
    })

    // Store the Stripe account ID
    await supabase
      .from('sellers')
      .update({ stripe_account_id: account.id })
      .eq('id', userId)

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_BASE_URL}/payments?stripe=refresh`,
      return_url: `${APP_BASE_URL}/payments?stripe=success`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url, account_id: account.id })
  } catch (err: any) {
    console.error('Stripe Connect error:', err)
    const msg = err?.message || err?.raw?.message || 'Failed to create Stripe account'
    res.status(500).json({ error: msg })
  }
})

// Check Stripe account status
app.get('/api/stripe/account-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, bank_choice, paypal_email')
      .eq('id', userId)
      .single()

    // PayPal sellers: considered connected if they have a paypal_email
    if (seller?.bank_choice === 'paypal' && seller?.paypal_email) {
      res.json({ connected: true, charges_enabled: true, payouts_enabled: true, payment_method: 'paypal' })
      return
    }

    if (!seller?.stripe_account_id) {
      res.json({ connected: false })
      return
    }

    const account = await stripe.accounts.retrieve(seller.stripe_account_id)

    res.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      account_id: seller.stripe_account_id,
      payment_method: 'stripe',
    })
  } catch (err) {
    console.error('Stripe status error:', err)
    res.status(500).json({ error: 'Failed to check account status' })
  }
})

// Create Stripe Express dashboard login link (for sellers to manage their account)
app.post('/api/stripe/dashboard-link', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (!seller?.stripe_account_id) {
      res.status(400).json({ error: 'No Stripe account connected' })
      return
    }

    const loginLink = await stripe.accounts.createLoginLink(seller.stripe_account_id)
    res.json({ url: loginLink.url })
  } catch (err) {
    console.error('Stripe dashboard link error:', err)
    res.status(500).json({ error: 'Failed to create dashboard link' })
  }
})

// Create a SetupIntent so a buyer can save a card before bidding
app.post('/api/stripe/create-setup-intent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check if user already has a Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      })
      customerId = customer.id

      // Save customer ID in profiles
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create SetupIntent (card only — avoids redirect-based methods that break on Capacitor)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    })

    res.json({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    })
  } catch (err: any) {
    console.error('Stripe SetupIntent error:', err)
    res.status(500).json({ error: err?.message || 'Failed to create setup intent' })
  }
})

// Check if a buyer has a saved payment method (card on file)
app.get('/api/stripe/check-card', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      res.json({ has_card: false })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    res.json({ has_card: paymentMethods.data.length > 0 })
  } catch (err: any) {
    console.error('Check card error:', err)
    res.status(500).json({ error: err?.message || 'Failed to check card' })
  }
})

// Get buyer's saved card details (brand + last4)
app.get('/api/stripe/card-info', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      res.json({ has_card: false })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      res.json({ has_card: false })
      return
    }

    const pm = paymentMethods.data[0]
    res.json({
      has_card: true,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '****',
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    })
  } catch (err: any) {
    console.error('Card info error:', err)
    res.status(500).json({ error: err?.message || 'Failed to get card info' })
  }
})

// Create a PaymentIntent when a buyer wins an auction
app.post('/api/stripe/create-payment-intent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id } = req.body
    const buyerId = req.user!.id

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('buyer_id', buyerId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id.startsWith('pi_')) {
      // Already has a real PaymentIntent
      const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      res.json({ client_secret: existing.client_secret, payment_intent_id: existing.id })
      return
    }

    // Get seller info (Stripe account + PayPal choice)
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, bank_choice, paypal_email')
      .eq('id', order.seller_id)
      .single()

    const isPaypalSeller = seller?.bank_choice === 'paypal' && seller?.paypal_email

    if (!isPaypalSeller) {
      // Stripe seller: must have a connected Stripe account
      if (!seller?.stripe_account_id) {
        res.status(400).json({ error: 'Seller has not connected Stripe' })
        return
      }

      // Verify seller's Stripe account can accept payments
      const sellerAccount = await stripe.accounts.retrieve(seller.stripe_account_id)
      if (!sellerAccount.charges_enabled) {
        res.status(400).json({ error: 'Seller Stripe account is not fully onboarded' })
        return
      }
    }

    // Recalculate fees server-side (don't trust client values)
    const fees = calculateFees(order.amount)
    const amountCents = Math.round(order.amount * 100)
    const feeCents = Math.round(fees.totalFees * 100)

    // Check if buyer has a saved card — try to auto-charge
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', buyerId)
      .single()

    let defaultPaymentMethod: string | undefined
    if (buyerProfile?.stripe_customer_id) {
      const pms = await stripe.paymentMethods.list({
        customer: buyerProfile.stripe_customer_id,
        type: 'card',
        limit: 1,
      })
      if (pms.data.length > 0) {
        defaultPaymentMethod = pms.data[0].id
      }
    }

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: 'eur',
      metadata: {
        order_id: order.id,
        buyer_id: buyerId,
        seller_id: order.seller_id,
        item_id: order.item_id,
      },
      description: `ShaPop - Order ${order.id}`,
    }

    if (isPaypalSeller) {
      // PayPal seller: money stays on ShaPop's Stripe account (no transfer_data)
      // We'll pay the seller later via PayPal Payouts
      console.log(`[Stripe] PayPal seller ${order.seller_id.slice(0, 8)} — no transfer_data`)
    } else {
      // Stripe seller: direct transfer with application fee
      piParams.application_fee_amount = feeCents
      piParams.transfer_data = {
        destination: seller!.stripe_account_id!,
      }
    }

    // If buyer has a saved card, attach it and try to auto-charge
    if (buyerProfile?.stripe_customer_id && defaultPaymentMethod) {
      piParams.customer = buyerProfile.stripe_customer_id
      piParams.payment_method = defaultPaymentMethod
      piParams.off_session = true
      piParams.confirm = true
      piParams.payment_method_types = ['card']
    } else {
      piParams.automatic_payment_methods = { enabled: true }
    }

    let paymentIntent: Stripe.PaymentIntent
    let autoCharged = false

    try {
      paymentIntent = await stripe.paymentIntents.create(piParams)
      autoCharged = paymentIntent.status === 'succeeded'
    } catch (stripeErr: any) {
      // If auto-charge fails (e.g. 3D Secure required, card declined),
      // fall back to manual payment
      if (stripeErr.type === 'StripeCardError' && stripeErr.payment_intent) {
        paymentIntent = stripeErr.payment_intent as Stripe.PaymentIntent
      } else {
        // Create without auto-charge as fallback
        delete piParams.customer
        delete piParams.payment_method
        delete piParams.off_session
        delete piParams.confirm
        delete piParams.payment_method_types
        piParams.automatic_payment_methods = { enabled: true }
        paymentIntent = await stripe.paymentIntents.create(piParams)
      }
    }

    // Update order with PaymentIntent ID (+ mark paid if auto-charged)
    const updateData: Record<string, unknown> = {
      stripe_payment_intent_id: paymentIntent.id,
      status: autoCharged ? 'paid' : 'pending_payment',
      payout_method: isPaypalSeller ? 'paypal' : 'stripe',
    }
    if (autoCharged) {
      updateData.paid_at = new Date().toISOString()
    }

    const { error: dbUpdateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    // If auto-charged + PayPal seller, create payout record immediately
    if (autoCharged && isPaypalSeller && seller?.paypal_email) {
      const fees = calculateFees(order.amount)
      await supabase.from('paypal_payouts').insert({
        order_id: order_id,
        seller_id: order.seller_id,
        paypal_email: seller.paypal_email,
        amount: fees.sellerPayout,
        currency: 'EUR',
        status: 'pending',
      })
      console.log(`[PayPal] Auto-charged: created payout record for order ${order_id}`)
    }

    if (dbUpdateError) {
      console.error('DB update failed after PaymentIntent creation, cancelling PaymentIntent:', dbUpdateError)
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id)
      } catch (cancelErr) {
        console.error('Failed to cancel PaymentIntent after DB error:', cancelErr)
      }
      res.status(500).json({ error: 'Failed to create payment' })
      return
    }

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      auto_charged: autoCharged,
    })
  } catch (err: any) {
    console.error('Stripe PaymentIntent error:', err)
    res.status(500).json({ error: err?.message || 'Failed to create payment' })
  }
})

// Stripe webhook — registered early (before express.json)

// Confirm payment — client calls this after stripe.confirmPayment() succeeds
// This is the reliable "pull" approach: we check the PaymentIntent status directly with Stripe
app.post('/api/stripe/confirm-payment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id, payment_intent_id } = req.body
    const buyerId = req.user!.id

    if (!order_id || !payment_intent_id) {
      res.status(400).json({ error: 'Missing order_id or payment_intent_id' })
      return
    }

    // Verify the order belongs to this buyer
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('buyer_id', buyerId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Check the PaymentIntent status directly with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status === 'succeeded') {
      // Look up seller trust for holdback
      let holdbackPercent = 0
      let payoutScheduledAt: string | null = null
      let payoutMethod = 'stripe'

      const { data: trust } = await supabase
        .from('seller_trust')
        .select('holdback_percent, payout_delay_days')
        .eq('seller_id', order.seller_id)
        .single()
      if (trust) {
        holdbackPercent = trust.holdback_percent
        const payoutDate = new Date()
        payoutDate.setDate(payoutDate.getDate() + trust.payout_delay_days)
        payoutScheduledAt = payoutDate.toISOString()
      }

      // Check if seller uses PayPal
      const { data: sellerInfo } = await supabase
        .from('sellers')
        .select('bank_choice, paypal_email')
        .eq('id', order.seller_id)
        .single()

      if (sellerInfo?.bank_choice === 'paypal' && sellerInfo?.paypal_email) {
        payoutMethod = 'paypal'
      }

      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          holdback_percent: holdbackPercent,
          payout_scheduled_at: payoutScheduledAt,
          payout_method: payoutMethod,
        })
        .eq('id', order_id)

      // If PayPal seller, create a paypal_payouts record
      if (payoutMethod === 'paypal' && sellerInfo?.paypal_email) {
        const fees = calculateFees(order.amount)
        // Check if payout record already exists (webhook may have created it)
        const { data: existingPayout } = await supabase
          .from('paypal_payouts')
          .select('id')
          .eq('order_id', order_id)
          .single()

        if (!existingPayout) {
          await supabase.from('paypal_payouts').insert({
            order_id: order_id,
            seller_id: order.seller_id,
            paypal_email: sellerInfo.paypal_email,
            amount: fees.sellerPayout,
            currency: 'EUR',
            status: 'pending',
          })
          console.log(`[PayPal] Created payout record for order ${order_id} (${fees.sellerPayout} EUR)`)
        }
      }

      // Auto-create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('order_id', order_id)
        .limit(1)
        .single()

      if (!existingConv) {
        await supabase.from('conversations').insert({
          type: 'order',
          order_id: order_id,
          participant_1: order.buyer_id,
          participant_2: order.seller_id,
        })
      }

      // Ensure seller has a trust record
      const { data: existingTrust } = await supabase
        .from('seller_trust')
        .select('seller_id')
        .eq('seller_id', order.seller_id)
        .single()
      if (!existingTrust) {
        await supabase.from('seller_trust').insert({ seller_id: order.seller_id })
      }

      // Ensure buyer has a score record
      const { data: existingScore } = await supabase
        .from('buyer_scores')
        .select('user_id')
        .eq('user_id', order.buyer_id)
        .single()
      if (!existingScore) {
        await supabase.from('buyer_scores').insert({ user_id: order.buyer_id })
      }

      console.log(`[Stripe] Order ${order_id} confirmed paid via direct check (payout: ${payoutMethod})`)
      res.json({ success: true, status: 'paid' })
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      res.json({ success: false, status: paymentIntent.status, message: '3D Secure or additional action required' })
    } else {
      res.json({ success: false, status: paymentIntent.status })
    }
  } catch (err) {
    console.error('Stripe confirm-payment error:', err)
    res.status(500).json({ error: 'Failed to confirm payment' })
  }
})

// Get Stripe publishable key (for client)
app.get('/api/stripe/config', (_req: Request, res: Response) => {
  res.json({ publishable_key: process.env.STRIPE_PUBLISHABLE_KEY })
})

// =============================================
// PAYPAL PAYOUTS
// =============================================

// Save PayPal email for seller
app.post('/api/paypal/save-email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body
    const userId = req.user!.id

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Invalid PayPal email' })
      return
    }

    // Verify user is a seller
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', userId)
      .single()

    if (!seller) {
      res.status(403).json({ error: 'Not a seller' })
      return
    }

    await supabase
      .from('sellers')
      .update({ paypal_email: email, bank_choice: 'paypal' })
      .eq('id', userId)

    console.log(`[PayPal] Seller ${userId.slice(0, 8)} saved PayPal email`)
    res.json({ success: true })
  } catch (err) {
    console.error('PayPal save-email error:', err)
    res.status(500).json({ error: 'Failed to save PayPal email' })
  }
})

// Get PayPal payout status for seller
app.get('/api/paypal/payout-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('paypal_email, bank_choice')
      .eq('id', userId)
      .single()

    if (!seller) {
      res.status(404).json({ error: 'Seller not found' })
      return
    }

    // Get recent payouts
    const { data: payouts } = await supabase
      .from('paypal_payouts')
      .select('id, order_id, amount, currency, status, error_message, completed_at, created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      paypal_email: seller.paypal_email,
      bank_choice: seller.bank_choice,
      payouts: payouts || [],
    })
  } catch (err) {
    console.error('PayPal payout-status error:', err)
    res.status(500).json({ error: 'Failed to get payout status' })
  }
})

// PayPal Webhook handler
app.post('/api/paypal/webhook', express.json(), async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (webhookId) {
      const transmissionId = req.headers['paypal-transmission-id'] as string
      const transmissionTime = req.headers['paypal-transmission-time'] as string
      const certUrl = req.headers['paypal-cert-url'] as string
      const transmissionSig = req.headers['paypal-transmission-sig'] as string
      const authAlgo = req.headers['paypal-auth-algo'] as string

      if (!transmissionId || !transmissionSig) {
        console.warn('[PayPal Webhook] Missing signature headers')
        res.status(400).json({ error: 'Missing signature' })
        return
      }

      // Verify via PayPal API
      try {
        const token = await getPaypalAccessToken()
        const verifyResp = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: req.body,
          }),
        })
        const verifyData = await verifyResp.json() as { verification_status: string }
        if (verifyData.verification_status !== 'SUCCESS') {
          console.warn('[PayPal Webhook] Signature verification failed')
          res.status(400).json({ error: 'Invalid signature' })
          return
        }
      } catch (verifyErr) {
        console.error('[PayPal Webhook] Verification error:', verifyErr)
        // In sandbox, continue even if verification fails
        if (PAYPAL_MODE === 'live') {
          res.status(400).json({ error: 'Verification failed' })
          return
        }
      }
    }

    const eventType = req.body.event_type
    const resource = req.body.resource

    if (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
      const payoutItemId = resource?.payout_item_id
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('paypal_item_id', payoutItemId)
        console.log(`[PayPal Webhook] Payout item ${payoutItemId} completed`)
      }
    } else if (eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED' || eventType === 'PAYMENT.PAYOUTS-ITEM.DENIED') {
      const payoutItemId = resource?.payout_item_id
      const errorMsg = resource?.errors?.message || resource?.transaction_status || 'Payout failed'
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'failed',
            error_message: errorMsg,
          })
          .eq('paypal_item_id', payoutItemId)
        console.log(`[PayPal Webhook] Payout item ${payoutItemId} failed: ${errorMsg}`)
      }
    } else if (eventType === 'PAYMENT.PAYOUTS-ITEM.BLOCKED' || eventType === 'PAYMENT.PAYOUTS-ITEM.RETURNED' || eventType === 'PAYMENT.PAYOUTS-ITEM.REFUNDED') {
      const payoutItemId = resource?.payout_item_id
      if (payoutItemId) {
        await supabase
          .from('paypal_payouts')
          .update({
            status: 'failed',
            error_message: `Payout ${eventType.split('.').pop()?.toLowerCase()}`,
          })
          .eq('paypal_item_id', payoutItemId)
        console.log(`[PayPal Webhook] Payout item ${payoutItemId} - ${eventType}`)
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[PayPal Webhook] Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Process PayPal payouts - called from run-automations and setInterval
async function processPaypalPayouts(): Promise<number> {
  let processed = 0

  // Step 1: Transition pending → ready when conditions are met
  // Conditions: order delivered + claim window closed (payout_status = 'released') + payout_scheduled_at passed
  const { data: pendingPayouts } = await supabase
    .from('paypal_payouts')
    .select('id, order_id')
    .eq('status', 'pending')

  for (const payout of (pendingPayouts || [])) {
    const { data: order } = await supabase
      .from('orders')
      .select('status, payout_status, claim_deadline, payout_scheduled_at')
      .eq('id', payout.order_id)
      .single()

    if (!order) continue

    const now = new Date()
    const claimClosed = order.payout_status === 'released'
    const payoutTimeReached = !order.payout_scheduled_at || new Date(order.payout_scheduled_at) <= now

    if (claimClosed && payoutTimeReached) {
      await supabase
        .from('paypal_payouts')
        .update({ status: 'ready' })
        .eq('id', payout.id)
    }
  }

  // Step 2: Batch-send ready payouts via PayPal Payouts API
  const { data: readyPayouts } = await supabase
    .from('paypal_payouts')
    .select('*')
    .eq('status', 'ready')
    .lt('attempts', 3)
    .limit(50)

  if (!readyPayouts || readyPayouts.length === 0) return 0

  try {
    const token = await getPaypalAccessToken()

    const items = readyPayouts.map(p => ({
      recipient_type: 'EMAIL',
      amount: {
        value: p.amount.toFixed(2),
        currency: p.currency || 'EUR',
      },
      receiver: p.paypal_email,
      note: `ShaPop payout for order ${p.order_id.slice(0, 8)}`,
      sender_item_id: p.id,
    }))

    const batchId = `ShaPop_${Date.now()}`

    const payoutResp = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: 'You have a payment from ShaPop',
          email_message: 'You received a payout for your sale on ShaPop.',
        },
        items,
      }),
    })

    if (!payoutResp.ok) {
      const errText = await payoutResp.text()
      console.error(`[PayPal Payouts] Batch send failed: ${payoutResp.status} ${errText}`)
      // Mark all as failed with incremented attempts
      for (const p of readyPayouts) {
        await supabase
          .from('paypal_payouts')
          .update({ attempts: p.attempts + 1, error_message: `Batch failed: ${payoutResp.status}` })
          .eq('id', p.id)
      }
      return 0
    }

    const payoutData = await payoutResp.json() as {
      batch_header?: { payout_batch_id?: string }
      items?: Array<{ payout_item_id?: string; payout_item?: { sender_item_id?: string } }>
    }
    const batchHeader = payoutData.batch_header

    // Update payouts with batch info
    for (const p of readyPayouts) {
      await supabase
        .from('paypal_payouts')
        .update({
          status: 'processing',
          paypal_batch_id: batchHeader?.payout_batch_id || batchId,
          attempts: p.attempts + 1,
        })
        .eq('id', p.id)
      processed++
    }

    // Try to get individual item IDs from the response
    if (payoutData.items) {
      for (const item of payoutData.items) {
        if (item.payout_item_id && item.payout_item?.sender_item_id) {
          await supabase
            .from('paypal_payouts')
            .update({ paypal_item_id: item.payout_item_id })
            .eq('id', item.payout_item.sender_item_id)
        }
      }
    }

    console.log(`[PayPal Payouts] Batch ${batchId} sent with ${readyPayouts.length} items`)
  } catch (err) {
    console.error('[PayPal Payouts] Error:', err)
    for (const p of readyPayouts) {
      await supabase
        .from('paypal_payouts')
        .update({ attempts: p.attempts + 1, error_message: String(err) })
        .eq('id', p.id)
    }
  }

  return processed
}

// =============================================
// ORDERS — Ship & confirm delivery
// =============================================
const ShipOrderProof = z.object({
  type: z.enum(['photo_package', 'photo_content', 'video_packing']),
  url: z.string().url(),
})

const ShipOrderBody = z.object({
  shipping_proof_url: z.string().url().optional(),
  proofs: z.array(ShipOrderProof).optional(),
  tracking_number: z.string().max(100).optional(),
})

// Seller marks order as shipped with proof photo(s)
app.post('/api/orders/:id/ship', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ShipOrderBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }

    const { shipping_proof_url, proofs, tracking_number } = parsed.data
    const orderId = req.params.id

    if (!shipping_proof_url && (!proofs || proofs.length === 0)) {
      res.status(400).json({ error: 'At least one shipping proof is required' })
      return
    }

    // Fetch the order
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can mark this order as shipped' })
      return
    }

    if (order.status !== 'paid') {
      res.status(400).json({ error: 'Only paid orders can be shipped' })
      return
    }

    // Validate proofs against seller trust proof_level
    if (proofs && proofs.length > 0) {
      const { data: trust } = await supabase
        .from('seller_trust')
        .select('proof_level, trust_level')
        .eq('seller_id', req.user!.id)
        .single()

      const proofLevel = trust?.proof_level || 'enhanced'
      const trustLevel = trust?.trust_level || 'new'
      const amount = order.amount

      // Determine required proofs
      let requiredTypes: string[] = []
      if (proofLevel === 'basic' && amount < 20 && ['trusted', 'premium'].includes(trustLevel)) {
        requiredTypes = ['photo_package']
      } else if (proofLevel === 'standard' || (amount >= 20 && amount <= 100)) {
        requiredTypes = ['photo_package', 'photo_content']
      } else {
        // enhanced: > 100€ or trust new
        requiredTypes = ['photo_package', 'photo_content', 'video_packing']
      }

      const proofTypes = proofs.map(p => p.type) as string[]
      const missingTypes = requiredTypes.filter(t => !proofTypes.includes(t))
      if (missingTypes.length > 0) {
        res.status(400).json({
          error: `Preuves manquantes: ${missingTypes.join(', ')}`,
          required: requiredTypes,
          provided: proofTypes,
        })
        return
      }

      // Insert shipping proofs
      const proofInserts = proofs.map(p => ({
        order_id: orderId,
        seller_id: req.user!.id,
        type: p.type,
        url: p.url,
      }))
      await supabase.from('shipping_proofs').insert(proofInserts)
    }

    const updateData: Record<string, unknown> = {
      status: 'shipped',
      shipped_at: new Date().toISOString(),
      shipping_proof_url: shipping_proof_url || (proofs && proofs.length > 0 ? proofs[0].url : null),
    }
    if (tracking_number) {
      updateData.tracking_number = tracking_number
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Buyer confirms delivery
app.post('/api/orders/:id/confirm-delivery', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the buyer can confirm delivery' })
      return
    }

    if (order.status !== 'shipped') {
      res.status(400).json({ error: 'Only shipped orders can be confirmed as delivered' })
      return
    }

    const now = new Date()
    const claimDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h from now

    // Get seller trust for payout delay
    let payoutScheduledAt: string | null = order.payout_scheduled_at || null
    if (!payoutScheduledAt) {
      const { data: trust } = await supabase
        .from('seller_trust')
        .select('payout_delay_days')
        .eq('seller_id', order.seller_id)
        .single()
      const delayDays = trust?.payout_delay_days || 7
      const payoutDate = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
      payoutScheduledAt = payoutDate.toISOString()
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: now.toISOString(),
        claim_deadline: claimDeadline.toISOString(),
        payout_scheduled_at: payoutScheduledAt,
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    // Update seller trust stats
    const { data: trust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', order.seller_id)
      .single()
    if (trust) {
      const shipTime = order.shipped_at && order.paid_at
        ? (new Date(order.shipped_at).getTime() - new Date(order.paid_at).getTime()) / (1000 * 60 * 60)
        : 0
      const newTotal = trust.total_completed_orders + 1
      const newAvgShip = ((trust.avg_ship_time_hours * trust.total_completed_orders) + shipTime) / newTotal
      await supabase
        .from('seller_trust')
        .update({
          total_completed_orders: newTotal,
          avg_ship_time_hours: Math.round(newAvgShip * 10) / 10,
          updated_at: now.toISOString(),
        })
        .eq('seller_id', order.seller_id)
    }

    // Update buyer score total_orders
    const { data: buyerScore } = await supabase
      .from('buyer_scores')
      .select('*')
      .eq('user_id', order.buyer_id)
      .single()
    if (buyerScore) {
      await supabase
        .from('buyer_scores')
        .update({ total_orders: buyerScore.total_orders + 1, updated_at: now.toISOString() })
        .eq('user_id', order.buyer_id)
    } else {
      await supabase.from('buyer_scores').insert({
        user_id: order.buyer_id,
        total_orders: 1,
      })
    }

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// ADMIN BACK-OFFICE
// =============================================
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'djbenjaminfranklin@gmail.com').split(',').map(e => e.trim())

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const token = authHeader.split('Bearer ')[1]
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    if (!data.user.email || !ADMIN_EMAILS.includes(data.user.email)) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    req.user = { id: data.user.id, email: data.user.email }
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Helper: safely get param as string (Express 5 can return string | string[])
function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val
}

// Audit log helper
async function logAdminAction(adminId: string, adminEmail: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
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

app.use('/api/admin', adminLimiter)

// --- Admin: Overview stats ---
app.get('/api/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      { count: userCount },
      { count: sellerCount },
      { count: orderCount },
      { count: liveCount },
      { count: disputeCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).then(r => ({ count: r.count || 0 })),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).then(r => ({ count: r.count || 0 })),
      supabase.from('orders').select('*', { count: 'exact', head: true }).then(r => ({ count: r.count || 0 })),
      supabase.from('streams').select('*', { count: 'exact', head: true }).eq('status', 'live').then(r => ({ count: r.count || 0 })),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed').then(r => ({ count: r.count || 0 })),
    ])

    // Revenue totals
    const { data: revenueData } = await supabase.from('orders').select('amount, platform_fee').in('status', ['paid', 'shipped', 'delivered'])
    const totalRevenue = revenueData?.reduce((s, o) => s + Number(o.amount), 0) || 0
    const totalFees = revenueData?.reduce((s, o) => s + Number(o.platform_fee), 0) || 0

    // Orders last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { count: orders30d } = await supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo)

    // Suspended users
    const { count: suspendedCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true)
    const { count: bannedCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true)

    res.json({
      users: userCount,
      sellers: sellerCount,
      orders: orderCount,
      orders_30d: orders30d || 0,
      lives_now: liveCount,
      disputes: disputeCount,
      total_revenue: totalRevenue,
      total_fees: totalFees,
      suspended_users: suspendedCount || 0,
      banned_users: bannedCount || 0,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// --- Admin: Users list ---
app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    const search = (req.query.search as string) || ''
    const filter = (req.query.filter as string) || 'all' // all, suspended, banned, sellers

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) {
      const safeSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`username.ilike.%${safeSearch}%,display_name.ilike.%${safeSearch}%`)
    }
    if (filter === 'suspended') query = query.eq('is_suspended', true)
    if (filter === 'banned') query = query.eq('is_banned', true)
    if (filter === 'sellers') query = query.eq('is_seller', true)

    const { data, count, error } = await query
    if (error) throw error

    res.json({ users: data || [], total: count || 0, page, limit })
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// --- Admin: User detail ---
app.get('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)

    const [profileRes, sellerRes, ordersRes, notesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('sellers').select('*').eq('id', userId).single(),
      supabase.from('orders').select('id, buyer_id, seller_id, amount, status, created_at')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('admin_notes').select('*').eq('target_user_id', userId).order('created_at', { ascending: false }),
    ])

    if (!profileRes.data) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Compute stats
    const allOrders = ordersRes.data || []
    const purchases = allOrders.filter(o => o.buyer_id === userId)
    const sales = allOrders.filter(o => o.seller_id === userId)
    const totalSpent = purchases.reduce((s, o) => s + Number(o.amount), 0)
    const totalEarned = sales.reduce((s, o) => s + Number(o.amount), 0)

    res.json({
      profile: profileRes.data,
      seller: sellerRes.data,
      orders: ordersRes.data || [],
      notes: notesRes.data || [],
      stats: {
        total_purchases: purchases.length,
        total_sales: sales.length,
        total_spent: totalSpent,
        total_earned: totalEarned,
      },
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// --- Admin: Suspend user ---
app.post('/api/admin/users/:id/suspend', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)
    const { reason } = req.body || {}

    const { error } = await supabase.from('profiles').update({
      is_suspended: true,
      suspension_reason: reason || 'Suspended by admin',
      suspended_at: new Date().toISOString(),
    }).eq('id', userId)

    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'suspend_user', 'user', userId, { reason })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to suspend user' })
  }
})

// --- Admin: Unsuspend user ---
app.post('/api/admin/users/:id/unsuspend', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)

    const { error } = await supabase.from('profiles').update({
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
    }).eq('id', userId)

    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'unsuspend_user', 'user', userId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to unsuspend user' })
  }
})

// --- Admin: Ban user ---
app.post('/api/admin/users/:id/ban', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)
    const { reason } = req.body || {}

    const { error } = await supabase.from('profiles').update({
      is_banned: true,
      is_suspended: true,
      suspension_reason: reason || 'Banned by admin',
      banned_at: new Date().toISOString(),
    }).eq('id', userId)

    if (error) throw error

    // Add email + phone to banned_identifiers
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const { data: profile } = await supabase.from('profiles').select('phone_number').eq('id', userId).single()

    const identifiers: { type: string; value: string; banned_user_id: string; banned_by: string; reason: string }[] = []
    if (authUser?.user?.email) {
      identifiers.push({ type: 'email', value: authUser.user.email.toLowerCase().trim(), banned_user_id: userId, banned_by: req.user!.id, reason: reason || 'Banned by admin' })
    }
    if (profile?.phone_number) {
      identifiers.push({ type: 'phone', value: profile.phone_number, banned_user_id: userId, banned_by: req.user!.id, reason: reason || 'Banned by admin' })
    }
    if (identifiers.length > 0) {
      await supabase.from('banned_identifiers').upsert(identifiers, { onConflict: 'type,value' })
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'ban_user', 'user', userId, { reason })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to ban user' })
  }
})

// --- Admin: Unban user ---
app.post('/api/admin/users/:id/unban', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)

    const { error } = await supabase.from('profiles').update({
      is_banned: false,
      is_suspended: false,
      suspension_reason: null,
      banned_at: null,
      suspended_at: null,
    }).eq('id', userId)

    if (error) throw error

    // Remove from banned_identifiers
    await supabase.from('banned_identifiers').delete().eq('banned_user_id', userId)

    await logAdminAction(req.user!.id, req.user!.email || '', 'unban_user', 'user', userId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to unban user' })
  }
})

// --- Admin: Add note on user ---
app.post('/api/admin/users/:id/note', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = paramStr(req.params.id)
    const { note } = req.body
    if (!note || typeof note !== 'string' || !note.trim()) {
      res.status(400).json({ error: 'Note is required' })
      return
    }
    if (note.length > 5000) {
      res.status(400).json({ error: 'Note too long (max 5000 characters)' })
      return
    }

    const { data, error } = await supabase.from('admin_notes').insert({
      target_user_id: userId,
      admin_id: req.user!.id,
      admin_email: req.user!.email || '',
      note: note.trim(),
    }).select().single()

    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'add_note', 'user', userId, { note: note.trim().slice(0, 100) })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to add note' })
  }
})

// --- Admin: Sellers list (risk view) ---
app.get('/api/admin/sellers', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 50)

    const { data: sellers, count, error } = await supabase
      .from('sellers')
      .select('*, profiles:profiles!id(username, display_name, avatar_url, country, created_at, is_suspended, is_banned)', { count: 'exact' })
      .order('total_revenue', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Enrich with order stats per seller
    const enriched = await Promise.all((sellers || []).map(async (seller: Record<string, unknown>) => {
      const sellerId = seller.id as string
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

      const [ordersAll, orders30d, refundsAll, disputesAll] = await Promise.all([
        supabase.from('orders').select('amount', { count: 'exact', head: true }).eq('seller_id', sellerId).in('status', ['paid', 'shipped', 'delivered']),
        supabase.from('orders').select('amount', { count: 'exact', head: true }).eq('seller_id', sellerId).gte('created_at', thirtyDaysAgo),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('status', 'refunded'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('status', 'disputed'),
      ])

      const totalOrders = ordersAll.count || 0
      const refundRate = totalOrders > 0 ? ((refundsAll.count || 0) / totalOrders) * 100 : 0
      const disputeRate = totalOrders > 0 ? ((disputesAll.count || 0) / totalOrders) * 100 : 0

      return {
        ...seller,
        risk_metrics: {
          total_orders: totalOrders,
          orders_30d: orders30d.count || 0,
          refund_count: refundsAll.count || 0,
          dispute_count: disputesAll.count || 0,
          refund_rate: Math.round(refundRate * 100) / 100,
          dispute_rate: Math.round(disputeRate * 100) / 100,
        },
      }
    }))

    res.json({ sellers: enriched, total: count || 0, page, limit })
  } catch {
    res.status(500).json({ error: 'Failed to fetch sellers' })
  }
})

// --- Admin: Block seller payments ---
app.post('/api/admin/sellers/:id/block-payments', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { block } = req.body // true to block, false to unblock

    const { error } = await supabase.from('sellers').update({ payments_blocked: !!block }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', block ? 'block_payments' : 'unblock_payments', 'seller', sellerId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update seller' })
  }
})

// --- Admin: Set seller reserve ---
app.post('/api/admin/sellers/:id/reserve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { percent } = req.body
    const reservePercent = Math.max(0, Math.min(100, Number(percent) || 0))

    const { error } = await supabase.from('sellers').update({ reserve_percent: reservePercent }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'set_reserve', 'seller', sellerId, { percent: reservePercent })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to set reserve' })
  }
})

// --- Admin: Request documents from seller ---
app.post('/api/admin/sellers/:id/request-documents', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)

    const { error } = await supabase.from('sellers').update({ documents_requested: true }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'request_documents', 'seller', sellerId)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to request documents' })
  }
})

// --- Admin: Set seller sale limit ---
app.post('/api/admin/sellers/:id/set-limit', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { limit: saleLimit } = req.body

    const { error } = await supabase.from('sellers').update({
      sale_limit: saleLimit ? Number(saleLimit) : null,
    }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'set_sale_limit', 'seller', sellerId, { limit: saleLimit })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to set limit' })
  }
})

// --- Admin: Orders / Payments list ---
app.get('/api/admin/orders', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    const status = req.query.status as string

    let query = supabase
      .from('orders')
      .select('*, item:items(title, image_urls), buyer:profiles!orders_buyer_id_fkey(username, display_name), seller_profile:profiles!orders_seller_id_fkey(username, display_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
    if (error) throw error

    res.json({ orders: data || [], total: count || 0, page, limit })
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// --- Admin: Disputes ---
app.get('/api/admin/disputes', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, item:items(title, image_urls), buyer:profiles!orders_buyer_id_fkey(username, display_name), seller_profile:profiles!orders_seller_id_fkey(username, display_name)')
      .in('status', ['disputed', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// --- Admin: Streams (lives) ---
app.get('/api/admin/streams', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'live'

    const { data, error } = await supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, id)')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Admin streams query error:', error.message)
      return res.json([])
    }

    // Enrich with seller profile info
    const enriched = await Promise.all((data || []).map(async (stream: any) => {
      try {
        if (stream.seller?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, is_suspended')
            .eq('id', stream.seller.id)
            .single()
          if (profile) stream.seller.profiles = profile
        }
      } catch { /* ignore enrichment errors */ }
      return stream
    }))

    res.json(enriched)
  } catch (err: any) {
    console.error('Admin streams error:', err?.message || err)
    res.json([])
  }
})

// --- Admin: Stop a live stream ---
app.post('/api/admin/streams/:id/stop', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = paramStr(req.params.id)

    const { data: stream } = await supabase
      .from('streams')
      .select('mux_stream_id, livekit_room_name, seller_id')
      .eq('id', streamId)
      .single()

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }

    // End on Mux if active
    if (stream.mux_stream_id) {
      try {
        await muxClient.video.liveStreams.complete(stream.mux_stream_id)
      } catch {
        // May already be ended
      }
    }

    // End on LiveKit if active
    if (stream.livekit_room_name && livekitRoomService) {
      try {
        await livekitRoomService.deleteRoom(stream.livekit_room_name)
      } catch {
        // Room may already be gone
      }
    }

    const { error } = await supabase
      .from('streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', streamId)

    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'stop_stream', 'stream', streamId, { seller_id: stream.seller_id })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to stop stream' })
  }
})

// --- Admin: Suspend streamer (suspend user + stop live) ---
app.post('/api/admin/streams/:id/suspend-streamer', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = paramStr(req.params.id)
    const { reason } = req.body || {}

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, mux_stream_id, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }

    // Stop stream on Mux
    if (stream.mux_stream_id) {
      try { await muxClient.video.liveStreams.complete(stream.mux_stream_id) } catch { /* ignore */ }
    }
    // Stop stream on LiveKit
    if (stream.livekit_room_name && livekitRoomService) {
      try { await livekitRoomService.deleteRoom(stream.livekit_room_name) } catch { /* ignore */ }
    }
    await supabase.from('streams').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', streamId)

    // Suspend user
    await supabase.from('profiles').update({
      is_suspended: true,
      suspension_reason: reason || 'Suspended during live stream by admin',
      suspended_at: new Date().toISOString(),
    }).eq('id', stream.seller_id)

    await logAdminAction(req.user!.id, req.user!.email || '', 'suspend_streamer', 'stream', streamId, { seller_id: stream.seller_id, reason })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to suspend streamer' })
  }
})

// --- Admin: Audit log ---
app.get('/api/admin/audit-log', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Number(req.query.limit) || 50)

    const { data, count, error } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      // Table might not exist yet — return empty
      console.error('Admin audit-log error:', error.message)
      return res.json({ logs: [], total: 0, page, limit })
    }
    res.json({ logs: data || [], total: count || 0, page, limit })
  } catch (err: any) {
    console.error('Admin audit-log error:', err?.message || err)
    res.json({ logs: [], total: 0, page: 1, limit: 50 })
  }
})

// =============================================
// CHAT FILTERING (Priority #1 — replaces direct Supabase insert)
// =============================================
const CONTACT_PATTERNS: { pattern: RegExp; label: string }[] = [
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

function detectContactInfo(message: string): string | null {
  // Normalize: remove zero-width chars, replace common obfuscation
  const normalized = message
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\(/g, '').replace(/\)/g, '')  // parentheses around digits
    .replace(/\b(dot|point|punto)\b/gi, '.') // "dot" → "."
    .replace(/\b(at|arobase|arroba)\b/gi, '@') // "at" → "@"

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

async function handleAutoSanction(userId: string, flagLabel: string): Promise<void> {
  try {
    // Count total flagged messages (chat + conversations)
    const [chatFlags, convFlags] = await Promise.all([
      supabase.from('chat_messages').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('is_flagged', true),
      supabase.from('conversation_messages').select('id', { count: 'exact', head: true })
        .eq('sender_id', userId).eq('is_flagged', true),
    ])

    const totalFlags = (chatFlags.count || 0) + (convFlags.count || 0)
    console.log(`[Moderation] User ${userId} — flag #${totalFlags} (${flagLabel})`)

    if (totalFlags >= FLAG_SUSPEND_THRESHOLD) {
      // Auto-suspend
      await supabase.from('profiles').update({
        is_suspended: true,
        suspension_reason: `Auto-suspended: ${totalFlags} messages flagged for sharing contact info`,
        suspended_at: new Date().toISOString(),
      }).eq('id', userId)
      console.log(`[Moderation] User ${userId} AUTO-SUSPENDED after ${totalFlags} flags`)

    } else if (totalFlags === FLAG_WARN_THRESHOLD) {
      // Log warning (could send push notification in the future)
      console.log(`[Moderation] User ${userId} WARNING: ${totalFlags} flagged messages`)
    }
  } catch (err) {
    console.error('[Moderation] Auto-sanction error:', err)
  }
}

app.post('/api/chat/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stream_id, message, type } = req.body
    if (!stream_id || !message || typeof message !== 'string') {
      res.status(400).json({ error: 'stream_id and message are required' })
      return
    }

    const msgType = type === 'reaction' ? 'reaction' : 'message'

    const trimmed = message.trim().slice(0, 500) // Max 500 chars
    if (!trimmed) {
      res.status(400).json({ error: 'Message cannot be empty' })
      return
    }

    // Skip contact-info flagging for reactions
    const flagReason = msgType === 'reaction' ? null : detectContactInfo(trimmed)
    const isFlagged = flagReason !== null

    const { data, error } = await supabase.from('chat_messages').insert({
      stream_id,
      user_id: req.user!.id,
      message: trimmed,
      type: msgType,
      is_flagged: isFlagged,
      flag_reason: flagReason,
    }).select('*').single()

    if (error) {
      res.status(500).json({ error: 'Failed to send message' })
      return
    }

    // Auto-sanction if flagged
    if (isFlagged) {
      handleAutoSanction(req.user!.id, flagReason!).catch(() => {})
    }

    res.json({ ...data, warning: isFlagged ? 'contact_blocked' : undefined })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// DISPUTES
// =============================================
const DisputeBody = z.object({
  order_id: z.string().uuid(),
  reason: z.enum(['not_received', 'wrong_item', 'damaged', 'not_as_described', 'counterfeit']),
  description: z.string().min(20).max(2000),
  evidence_urls: z.array(z.string().url()).max(5).optional(),
})

// Buyer opens a dispute
app.post('/api/disputes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = DisputeBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors })
      return
    }

    const { order_id, reason, description, evidence_urls } = parsed.data
    const buyerId = req.user!.id

    // Fetch order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' })
      return
    }

    if (order.buyer_id !== buyerId) {
      res.status(403).json({ error: 'Seul l\'acheteur peut ouvrir un litige' })
      return
    }

    if (order.status !== 'delivered') {
      res.status(400).json({ error: 'Un litige ne peut être ouvert que sur une commande livrée' })
      return
    }

    // Check claim deadline (48h window)
    if (order.claim_deadline && new Date(order.claim_deadline) < new Date()) {
      res.status(400).json({ error: 'Le délai de réclamation de 48h est dépassé' })
      return
    }

    // Check for existing dispute
    const { data: existing } = await supabase
      .from('disputes')
      .select('id')
      .eq('order_id', order_id)
      .limit(1)
      .single()

    if (existing) {
      res.status(409).json({ error: 'Un litige existe déjà pour cette commande' })
      return
    }

    // Check buyer score for auto-refund eligibility
    const { data: buyerScore } = await supabase
      .from('buyer_scores')
      .select('score')
      .eq('user_id', buyerId)
      .single()

    const score = buyerScore?.score ?? 100
    const autoRefund = order.amount < 30 && score > 70

    const disputeData = {
      order_id,
      buyer_id: buyerId,
      seller_id: order.seller_id,
      reason,
      description,
      evidence_urls: evidence_urls || [],
      status: autoRefund ? 'resolved_buyer' : 'under_review',
      auto_refund: autoRefund,
      amount: order.amount,
      resolved_at: autoRefund ? new Date().toISOString() : null,
    }

    const { data: dispute, error: insertErr } = await supabase
      .from('disputes')
      .insert(disputeData)
      .select('*')
      .single()

    if (insertErr) {
      res.status(500).json({ error: 'Échec de la création du litige' })
      return
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: autoRefund ? 'refunded' : 'disputed' })
      .eq('id', order_id)

    // Update buyer scores
    const { data: existingScore } = await supabase
      .from('buyer_scores')
      .select('*')
      .eq('user_id', buyerId)
      .single()

    if (existingScore) {
      const updates: Record<string, unknown> = {
        total_disputes: existingScore.total_disputes + 1,
        last_dispute_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      if (autoRefund) {
        updates.disputes_won = existingScore.disputes_won + 1
        updates.total_refunds = existingScore.total_refunds + 1
        updates.refund_amount = existingScore.refund_amount + order.amount
      }
      await supabase.from('buyer_scores').update(updates).eq('user_id', buyerId)
    } else {
      await supabase.from('buyer_scores').insert({
        user_id: buyerId,
        total_disputes: 1,
        last_dispute_at: new Date().toISOString(),
        disputes_won: autoRefund ? 1 : 0,
        total_refunds: autoRefund ? 1 : 0,
        refund_amount: autoRefund ? order.amount : 0,
      })
    }

    // Update seller trust stats
    const { data: sellerTrust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', order.seller_id)
      .single()

    if (sellerTrust) {
      const updates: Record<string, unknown> = {
        total_disputes_against: sellerTrust.total_disputes_against + 1,
        updated_at: new Date().toISOString(),
      }
      if (autoRefund) {
        updates.disputes_lost = sellerTrust.disputes_lost + 1
      }
      await supabase.from('seller_trust').update(updates).eq('seller_id', order.seller_id)
    }

    // Auto-create dispute conversation
    await supabase.from('conversations').insert({
      type: 'dispute',
      order_id,
      participant_1: buyerId,
      participant_2: order.seller_id,
    })

    res.json(dispute)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// User views their disputes
app.get('/api/disputes/mine', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('disputes')
      .select('*, order:orders(*, item:items(title, image_urls))')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch disputes' })
      return
    }

    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single dispute by order ID
app.get('/api/disputes/order/:orderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('order_id', req.params.orderId)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    // Verify user is participant
    const userId = req.user!.id
    if (data.buyer_id !== userId && data.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin resolves dispute
app.post('/api/admin/disputes/:id/resolve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const disputeId = paramStr(req.params.id)
    const { resolution, note } = req.body

    if (!resolution || !['buyer', 'seller'].includes(resolution)) {
      res.status(400).json({ error: 'resolution must be "buyer" or "seller"' })
      return
    }

    const { data: dispute } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single()

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    if (['resolved_buyer', 'resolved_seller'].includes(dispute.status)) {
      res.status(400).json({ error: 'Dispute already resolved' })
      return
    }

    const now = new Date().toISOString()
    const newStatus = resolution === 'buyer' ? 'resolved_buyer' : 'resolved_seller'

    // Update dispute
    await supabase
      .from('disputes')
      .update({
        status: newStatus,
        resolution_note: note || null,
        resolved_at: now,
      })
      .eq('id', disputeId)

    // Update order
    if (resolution === 'buyer') {
      await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', dispute.order_id)

      // Update buyer score (won)
      const { data: bs } = await supabase
        .from('buyer_scores')
        .select('*')
        .eq('user_id', dispute.buyer_id)
        .single()
      if (bs) {
        await supabase.from('buyer_scores').update({
          disputes_won: bs.disputes_won + 1,
          total_refunds: bs.total_refunds + 1,
          refund_amount: bs.refund_amount + dispute.amount,
          updated_at: now,
        }).eq('user_id', dispute.buyer_id)
      }

      // Update seller trust (lost)
      const { data: st } = await supabase
        .from('seller_trust')
        .select('*')
        .eq('seller_id', dispute.seller_id)
        .single()
      if (st) {
        await supabase.from('seller_trust').update({
          disputes_lost: st.disputes_lost + 1,
          updated_at: now,
        }).eq('seller_id', dispute.seller_id)
      }
    } else {
      // Resolution in favor of seller — penalize buyer
      await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', dispute.order_id)

      const { data: bs } = await supabase
        .from('buyer_scores')
        .select('*')
        .eq('user_id', dispute.buyer_id)
        .single()
      if (bs) {
        const newScore = Math.max(0, bs.score - 20)
        let riskLevel = 'low'
        if (newScore < 30) riskLevel = 'blocked'
        else if (newScore < 50) riskLevel = 'high'
        else if (newScore < 70) riskLevel = 'medium'

        await supabase.from('buyer_scores').update({
          disputes_lost: bs.disputes_lost + 1,
          score: newScore,
          risk_level: riskLevel,
          updated_at: now,
        }).eq('user_id', dispute.buyer_id)
      }
    }

    // Audit log
    await logAdminAction(req.user!.id, req.user!.email || '', `resolve_dispute_${resolution}`, 'dispute', disputeId, { note, order_id: dispute.order_id })

    res.json({ success: true, status: newStatus })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// SELLER TRUST LEVELS
// =============================================

// Seller views their trust info
app.get('/api/sellers/:id/trust', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.params.id
    const { data: trust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', sellerId)
      .single()

    if (!trust) {
      // Return defaults for new seller
      res.json({
        seller_id: sellerId,
        trust_level: 'new',
        total_completed_orders: 0,
        total_disputes_against: 0,
        disputes_lost: 0,
        avg_ship_time_hours: 0,
        positive_delivery_rate: 1.0,
        holdback_percent: 20,
        payout_delay_days: 7,
        proof_level: 'enhanced',
        manually_set: false,
      })
      return
    }

    res.json(trust)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin forces trust level
app.post('/api/admin/sellers/:id/trust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { trust_level, holdback_percent, payout_delay_days } = req.body

    if (!trust_level || !['new', 'standard', 'trusted', 'premium'].includes(trust_level)) {
      res.status(400).json({ error: 'Invalid trust_level' })
      return
    }

    // Derive defaults based on level
    const defaults: Record<string, { holdback: number; delay: number; proof: string }> = {
      new: { holdback: 20, delay: 7, proof: 'enhanced' },
      standard: { holdback: 15, delay: 5, proof: 'standard' },
      trusted: { holdback: 10, delay: 3, proof: 'basic' },
      premium: { holdback: 5, delay: 1, proof: 'basic' },
    }
    const d = defaults[trust_level]

    const { data: existing } = await supabase
      .from('seller_trust')
      .select('seller_id')
      .eq('seller_id', sellerId)
      .single()

    const updateData = {
      trust_level,
      holdback_percent: holdback_percent ?? d.holdback,
      payout_delay_days: payout_delay_days ?? d.delay,
      proof_level: d.proof,
      manually_set: true,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('seller_trust').update(updateData).eq('seller_id', sellerId)
    } else {
      await supabase.from('seller_trust').insert({ seller_id: sellerId, ...updateData })
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'set_trust_level', 'seller', sellerId, { trust_level, holdback_percent: updateData.holdback_percent, payout_delay_days: updateData.payout_delay_days })

    res.json({ success: true, ...updateData })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// CONVERSATIONS (Internal messaging — Phase 3)
// =============================================

// List user's conversations
app.get('/api/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('conversations')
      .select('*, order:orders(id, amount, status, item:items(title, image_urls))')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' })
      return
    }

    // Enrich with other participant profile and last message
    const enriched = await Promise.all((data || []).map(async (conv: any) => {
      const otherId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .eq('id', otherId)
        .single()

      const { data: lastMsg } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return { ...conv, other_participant: profile, last_message: lastMsg }
    }))

    res.json(enriched)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get messages for a conversation
app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id
    const userId = req.user!.id

    // Verify participant
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single()

    if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*, sender:profiles!sender_id(display_name, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch messages' })
      return
    }

    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send message in conversation (with filtering)
app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id
    const userId = req.user!.id
    const { message, attachment_urls } = req.body

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    // Validate attachment URLs - only allow Supabase storage URLs
    const validatedUrls = (attachment_urls || []).filter((url: string) => {
      if (typeof url !== 'string') return false
      return url.startsWith(process.env.SUPABASE_URL + '/storage/') || url.startsWith('https://jscmqcjornseiclxvvqv.supabase.co/storage/')
    })

    // Verify participant
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single()

    if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    if (conv.status !== 'active') {
      res.status(400).json({ error: 'Conversation is closed' })
      return
    }

    const trimmed = message.trim().slice(0, 2000)
    const flagReason = detectContactInfo(trimmed)
    const isFlagged = flagReason !== null

    const { data, error } = await supabase.from('conversation_messages').insert({
      conversation_id: convId,
      sender_id: userId,
      message: trimmed,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      attachment_urls: validatedUrls,
    }).select('*, sender:profiles!sender_id(display_name, avatar_url)').single()

    if (error) {
      res.status(500).json({ error: 'Failed to send message' })
      return
    }

    // Auto-sanction if flagged
    if (isFlagged) {
      handleAutoSanction(userId, flagReason!).catch(() => {})
    }

    res.json({ ...data, warning: isFlagged ? 'contact_blocked' : undefined })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// FOLLOW / UNFOLLOW SELLERS
// =============================================

// Get followed sellers for current user
app.get('/api/following', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('followers')
      .select('seller_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch following' })
      return
    }

    if (!data || data.length === 0) {
      res.json([])
      return
    }

    // Enrich with seller + profile info
    const sellerIds = data.map(f => f.seller_id)
    const { data: sellers } = await supabase
      .from('sellers')
      .select('id, store_name, store_description, categories, profiles:profiles!sellers_id_fkey(display_name, avatar_url, username)')
      .in('id', sellerIds)

    // Get upcoming/recent streams for each seller
    const { data: streams } = await supabase
      .from('streams')
      .select('id, seller_id, title, thumbnail_url, status, scheduled_at')
      .in('seller_id', sellerIds)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })
      .limit(20)

    const enriched = (sellers || []).map(seller => ({
      ...seller,
      followed_at: data.find(f => f.seller_id === seller.id)?.created_at,
      upcoming_streams: (streams || []).filter(s => s.seller_id === seller.id),
    }))

    res.json(enriched)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Follow a seller
app.post('/api/follow/:sellerId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const sellerId = req.params.sellerId

    if (userId === sellerId) {
      res.status(400).json({ error: 'Cannot follow yourself' })
      return
    }

    // Check seller exists
    const { data: seller } = await supabase.from('sellers').select('id').eq('id', sellerId).single()
    if (!seller) {
      res.status(404).json({ error: 'Seller not found' })
      return
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('followers')
      .select('id')
      .eq('user_id', userId)
      .eq('seller_id', sellerId)
      .single()

    if (existing) {
      res.json({ status: 'already_following' })
      return
    }

    const { error } = await supabase.from('followers').insert({
      user_id: userId,
      seller_id: sellerId,
    })

    if (error) {
      res.status(500).json({ error: 'Failed to follow seller' })
      return
    }

    res.json({ status: 'followed' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Unfollow a seller
app.delete('/api/follow/:sellerId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const sellerId = req.params.sellerId

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('user_id', userId)
      .eq('seller_id', sellerId)

    if (error) {
      res.status(500).json({ error: 'Failed to unfollow' })
      return
    }

    res.json({ status: 'unfollowed' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Check if user follows a seller
app.get('/api/follow/:sellerId/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const sellerId = req.params.sellerId

    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('user_id', userId)
      .eq('seller_id', sellerId)
      .single()

    res.json({ following: !!data })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// FAVORITES
// =============================================

// Add a stream to favorites (upsert)
app.post('/api/favorites/:stream_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const streamId = req.params.stream_id

    const { error } = await supabase
      .from('stream_favorites')
      .upsert({ user_id: userId, stream_id: streamId }, { onConflict: 'user_id,stream_id' })

    if (error) {
      res.status(500).json({ error: 'Failed to add favorite' })
      return
    }
    res.json({ status: 'favorited' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove a stream from favorites
app.delete('/api/favorites/:stream_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const streamId = req.params.stream_id

    const { error } = await supabase
      .from('stream_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('stream_id', streamId)

    if (error) {
      res.status(500).json({ error: 'Failed to remove favorite' })
      return
    }
    res.json({ status: 'unfavorited' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all favorited streams with seller info
app.get('/api/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: favs, error } = await supabase
      .from('stream_favorites')
      .select('stream_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch favorites' })
      return
    }

    if (!favs || favs.length === 0) {
      res.json([])
      return
    }

    const streamIds = favs.map(f => f.stream_id)
    const { data: streams } = await supabase
      .from('streams')
      .select('*, seller:profiles!seller_id(display_name, avatar_url, store_name)')
      .in('id', streamIds)

    // Preserve favorites order
    const streamMap = new Map((streams || []).map(s => [s.id, s]))
    const ordered = streamIds.map(id => streamMap.get(id)).filter(Boolean)

    res.json(ordered)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// ITEM FAVORITES
// =============================================

// Add an item to favorites
app.post('/api/item-favorites/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = req.params.item_id

    const { error } = await supabase
      .from('item_favorites')
      .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' })

    if (error) {
      res.status(500).json({ error: 'Failed to add item favorite' })
      return
    }
    res.json({ status: 'favorited' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove an item from favorites
app.delete('/api/item-favorites/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = req.params.item_id

    const { error } = await supabase
      .from('item_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)

    if (error) {
      res.status(500).json({ error: 'Failed to remove item favorite' })
      return
    }
    res.json({ status: 'unfavorited' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all favorited items with seller info
app.get('/api/item-favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: favs, error } = await supabase
      .from('item_favorites')
      .select('item_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch item favorites' })
      return
    }

    if (!favs || favs.length === 0) {
      res.json([])
      return
    }

    const itemIds = favs.map(f => f.item_id)
    const { data: items } = await supabase
      .from('items')
      .select('*, seller:profiles!seller_id(display_name, avatar_url)')
      .in('id', itemIds)

    // Preserve favorites order
    const itemMap = new Map((items || []).map(i => [i.id, i]))
    const ordered = itemIds.map(id => itemMap.get(id)).filter(Boolean)

    res.json(ordered)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET OR CREATE CONVERSATION BY ORDER
// =============================================

app.post('/api/orders/:id/conversation', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    // Verify user is buyer or seller of this order
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', orderId)
      .single()

    if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Check existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'order')
      .single()

    if (existing) {
      res.json(existing)
      return
    }

    // Create conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        type: 'order',
        order_id: orderId,
        participant_1: order.buyer_id,
        participant_2: order.seller_id,
        status: 'active',
      })
      .select('id')
      .single()

    if (error) {
      res.status(500).json({ error: 'Failed to create conversation' })
      return
    }

    res.json(conv)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// AUTOMATIONS (Phase 4)
// =============================================
async function recalculateTrustLevel(sellerId: string) {
  const { data: trust } = await supabase
    .from('seller_trust')
    .select('*')
    .eq('seller_id', sellerId)
    .single()

  if (!trust || trust.manually_set) return

  const { data: seller } = await supabase
    .from('sellers')
    .select('created_at')
    .eq('id', sellerId)
    .single()

  if (!seller) return

  const accountAgeDays = (Date.now() - new Date(seller.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const disputeRate = trust.total_completed_orders > 0
    ? trust.total_disputes_against / trust.total_completed_orders
    : 0

  // Demotion check first
  if (disputeRate > 0.15 && trust.trust_level !== 'new') {
    const levels = ['new', 'standard', 'trusted', 'premium']
    const currentIdx = levels.indexOf(trust.trust_level)
    if (currentIdx > 0) {
      const newLevel = levels[currentIdx - 1]
      const defaults: Record<string, { holdback: number; delay: number; proof: string }> = {
        new: { holdback: 20, delay: 7, proof: 'enhanced' },
        standard: { holdback: 15, delay: 5, proof: 'standard' },
        trusted: { holdback: 10, delay: 3, proof: 'basic' },
        premium: { holdback: 5, delay: 1, proof: 'basic' },
      }
      const d = defaults[newLevel]
      await supabase.from('seller_trust').update({
        trust_level: newLevel,
        holdback_percent: d.holdback,
        payout_delay_days: d.delay,
        proof_level: d.proof,
        updated_at: new Date().toISOString(),
      }).eq('seller_id', sellerId)
      return
    }
  }

  // Promotion check
  let newLevel = trust.trust_level
  if (trust.trust_level === 'new' &&
    trust.total_completed_orders >= 10 &&
    disputeRate < 0.10 &&
    trust.avg_ship_time_hours < 72 &&
    accountAgeDays > 30) {
    newLevel = 'standard'
  } else if (trust.trust_level === 'standard' &&
    trust.total_completed_orders >= 50 &&
    disputeRate < 0.05 &&
    trust.avg_ship_time_hours < 48 &&
    trust.positive_delivery_rate > 0.95 &&
    accountAgeDays > 90) {
    newLevel = 'trusted'
  } else if (trust.trust_level === 'trusted' &&
    trust.total_completed_orders >= 200 &&
    disputeRate < 0.02 &&
    trust.avg_ship_time_hours < 36 &&
    trust.positive_delivery_rate > 0.98 &&
    accountAgeDays > 180) {
    newLevel = 'premium'
  }

  if (newLevel !== trust.trust_level) {
    const defaults: Record<string, { holdback: number; delay: number; proof: string }> = {
      new: { holdback: 20, delay: 7, proof: 'enhanced' },
      standard: { holdback: 15, delay: 5, proof: 'standard' },
      trusted: { holdback: 10, delay: 3, proof: 'basic' },
      premium: { holdback: 5, delay: 1, proof: 'basic' },
    }
    const d = defaults[newLevel]
    await supabase.from('seller_trust').update({
      trust_level: newLevel,
      holdback_percent: d.holdback,
      payout_delay_days: d.delay,
      proof_level: d.proof,
      updated_at: new Date().toISOString(),
    }).eq('seller_id', sellerId)
  }
}

// Admin-triggered automation run (or cron)
app.post('/api/admin/run-automations', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results: Record<string, number> = {
      auto_confirmed: 0,
      claim_windows_closed: 0,
      trust_recalculated: 0,
      paypal_payouts_processed: 0,
    }

    // 1. Auto-confirm delivery if shipped > 14 days without dispute
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: autoConfirmOrders } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, shipped_at')
      .eq('status', 'shipped')
      .lt('shipped_at', fourteenDaysAgo)

    for (const order of (autoConfirmOrders || [])) {
      const claimDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      await supabase.from('orders').update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        claim_deadline: claimDeadline,
      }).eq('id', order.id)
      results.auto_confirmed++
    }

    // 2. Close claim windows + release payouts
    const { data: expiredClaims } = await supabase
      .from('orders')
      .select('id, seller_id')
      .eq('status', 'delivered')
      .eq('payout_status', 'pending')
      .lt('claim_deadline', new Date().toISOString())

    for (const order of (expiredClaims || [])) {
      await supabase.from('orders').update({
        payout_status: 'released',
      }).eq('id', order.id)
      results.claim_windows_closed++
    }

    // 3. Recalculate trust levels for all sellers
    const { data: sellers } = await supabase
      .from('seller_trust')
      .select('seller_id')
      .eq('manually_set', false)

    for (const seller of (sellers || [])) {
      await recalculateTrustLevel(seller.seller_id)
      results.trust_recalculated++
    }

    // 4. Process PayPal payouts
    try {
      results.paypal_payouts_processed = await processPaypalPayouts()
    } catch (ppErr) {
      console.error('[Automations] PayPal payouts error:', ppErr)
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'run_automations', 'system', 'global', results)

    res.json({ success: true, results })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Enhanced admin disputes endpoint (replaces basic one above)
// =============================================
app.get('/api/admin/disputes-enhanced', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('*, order:orders(*, item:items(title, image_urls))')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Enrich with buyer/seller profiles and shipping proofs
    const enriched = await Promise.all((disputes || []).map(async (dispute: any) => {
      const [buyerRes, sellerRes, proofsRes] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url').eq('id', dispute.buyer_id).single(),
        supabase.from('profiles').select('display_name, username, avatar_url').eq('id', dispute.seller_id).single(),
        supabase.from('shipping_proofs').select('*').eq('order_id', dispute.order_id),
      ])

      return {
        ...dispute,
        buyer_profile: buyerRes.data,
        seller_profile: sellerRes.data,
        shipping_proofs: proofsRes.data || [],
      }
    }))

    res.json(enriched)
  } catch {
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// Admin get buyer scores for users
app.get('/api/admin/buyer-scores', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('buyer_scores')
      .select('*')
      .order('score', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch buyer scores' })
  }
})

// Admin get all seller trust levels
app.get('/api/admin/seller-trusts', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('seller_trust')
      .select('*')
      .order('trust_level', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch seller trusts' })
  }
})

// =============================================
// Global error handler
// =============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' })
})

// =============================================
// START SERVER with WebSocket support
// =============================================
const server = createServer(app)

// Track active FFmpeg processes per stream
const activeStreams = new Map<string, { ffmpeg: ChildProcess; ws: WebSocket }>()

const wss = new WebSocketServer({ server, path: '/ws/video' })

wss.on('connection', async (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`)
  const streamId = url.searchParams.get('streamId')
  const token = url.searchParams.get('token')

  if (!streamId || !token) {
    ws.close(4001, 'Missing streamId or token')
    return
  }

  // Authenticate via Supabase JWT
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    ws.close(4002, 'Authentication failed')
    return
  }

  const userId = authData.user.id

  // Verify the user is the seller of this stream
  const { data: stream } = await supabase
    .from('streams')
    .select('seller_id, mux_stream_key')
    .eq('id', streamId)
    .single()

  if (!stream || stream.seller_id !== userId) {
    ws.close(4003, 'Not authorized to broadcast this stream')
    return
  }

  if (!stream.mux_stream_key) {
    ws.close(4004, 'Mux stream not provisioned')
    return
  }

  const rtmpUrl = `rtmp://global-live.mux.com:5222/app/${stream.mux_stream_key}`

  // Spawn FFmpeg: pipe WebM chunks from stdin → RTMP to Mux
  const ffmpeg = spawn('ffmpeg', [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-g', '30',           // Keyframe every 1s (at 30fps) — helps LL-HLS segmenting
    '-c:a', 'aac',
    '-ar', '44100',
    '-b:a', '128k',
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',
    rtmpUrl,
  ], {
    stdio: ['pipe', 'ignore', 'pipe'],
  })

  ffmpeg.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString()
    // Only log important FFmpeg messages (errors or key info)
    if (msg.includes('Error') || msg.includes('error') || msg.includes('Output #0')) {
      console.log(`[FFmpeg ${streamId.slice(0, 8)}] ${msg.trim()}`)
    }
  })

  ffmpeg.on('close', (code) => {
    console.log(`[FFmpeg ${streamId.slice(0, 8)}] exited with code ${code}`)
    activeStreams.delete(streamId)
  })

  activeStreams.set(streamId, { ffmpeg, ws })

  console.log(`[WS] Broadcast started for stream ${streamId.slice(0, 8)} by user ${userId.slice(0, 8)}`)

  // Prevent unhandled errors on ffmpeg stdin
  ffmpeg.stdin?.on('error', (err) => {
    console.error(`[FFmpeg ${streamId.slice(0, 8)}] stdin error:`, err.message)
  })

  ws.on('message', (data: Buffer) => {
    // Forward binary video chunks to FFmpeg stdin
    if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
      try {
        ffmpeg.stdin.write(data)
      } catch (err) {
        console.error(`[FFmpeg ${streamId.slice(0, 8)}] write error:`, (err as Error).message)
        ws.close(4005, 'FFmpeg write failed')
      }
    }
  })

  ws.on('close', () => {
    console.log(`[WS] Broadcast ended for stream ${streamId.slice(0, 8)}`)
    // Gracefully close FFmpeg
    if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end()
    }
    setTimeout(() => {
      if (!ffmpeg.killed) ffmpeg.kill('SIGTERM')
    }, 3000)
    activeStreams.delete(streamId)
  })

  ws.on('error', (err) => {
    console.error(`[WS] Error for stream ${streamId.slice(0, 8)}:`, err.message)
    if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end()
    }
    if (!ffmpeg.killed) ffmpeg.kill('SIGTERM')
    activeStreams.delete(streamId)
  })
})

server.listen(PORT, () => {
  console.log(`ShaPop API + WebSocket running on http://localhost:${PORT}`)
  if (process.env.MUX_TOKEN_ID) {
    console.log('Mux client initialized')
  } else {
    console.warn('Warning: MUX_TOKEN_ID not set — Mux features will not work')
  }

  // Process PayPal payouts every 4 hours
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    console.log(`[PayPal] Payouts processing enabled (mode: ${PAYPAL_MODE})`)
    setInterval(async () => {
      try {
        const count = await processPaypalPayouts()
        if (count > 0) {
          console.log(`[PayPal] Auto-processed ${count} payouts`)
        }
      } catch (err) {
        console.error('[PayPal] Auto-processing error:', err)
      }
    }, 4 * 60 * 60 * 1000) // 4 hours
  }
})

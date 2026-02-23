import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { RoomServiceClient, WebhookReceiver, EgressClient, IngressClient } from 'livekit-server-sdk'

dotenv.config()

// =============================================
// Config & validation
// =============================================
export const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\s+/g, '')
export const supabaseServiceKey = (process.env.SUPABASE_SERVICE_KEY || '').replace(/\s+/g, '')

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

export const PLATFORM_COMMISSION = Number(process.env.PLATFORM_COMMISSION) || 0.08  // 8% HT
export const PROCESSING_FEE_RATE = 0.029   // 2.9% HT (Stripe)
export const PROCESSING_FEE_FIXED = 0.30   // 0.30EUR HT fixe (Stripe)
export const VAT_RATE = 0.20               // 20% TVA (France)
export const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929'
export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://shapop.app'

// Shipping delay: default 2 days, max 4 days — auto-cancel + refund if seller doesn't ship
export const SHIPPING_DELAY_DEFAULT = 2
export const SHIPPING_DELAY_MAX = 4

// Safe column list for streams table (mux_stream_id/playback_id/asset_id kept for historical data).
export const STREAMS_SAFE_COLUMNS = 'id, seller_id, cohost_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_stream_id, mux_playback_id, mux_asset_id, created_at, livekit_room_name, recording_url'

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// =============================================
// Stripe client
// =============================================
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY not set — Stripe features will fail')
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

// Resend for email notifications
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// =============================================
// PayPal Payouts config
// =============================================
export const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'
export const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// =============================================
// LiveKit client (WebRTC low-latency streaming)
// =============================================
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
export const LIVEKIT_URL = process.env.LIVEKIT_URL || '' // e.g. wss://xxx.livekit.cloud

export const livekitRoomService = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL)
  ? new RoomServiceClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

export const livekitEgressClient = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL)
  ? new EgressClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

export const livekitIngressClient = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL)
  ? new IngressClient(LIVEKIT_URL.replace('wss://', 'https://'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

export const LIVEKIT_RECORDING_BUCKET = process.env.LIVEKIT_RECORDING_BUCKET || ''

export const livekitWebhookReceiver = (LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
  ? new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.warn('WARNING: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL not set — LiveKit features will fail')
}

// =============================================
// La Poste Tracking API (optional)
// =============================================
export const LAPOSTE_API_KEY = process.env.LAPOSTE_API_KEY || ''

// =============================================
// Mondial Relay API
// SOAP v1 (relay point search + tracking): ENSEIGNE + PRIVATE_KEY
// REST v2 (shipment creation + labels): API2_LOGIN + API2_PASSWORD + CUSTOMER_ID
// =============================================
export const MONDIAL_RELAY_ENSEIGNE = process.env.MONDIAL_RELAY_ENSEIGNE || ''
export const MONDIAL_RELAY_PRIVATE_KEY = process.env.MONDIAL_RELAY_PRIVATE_KEY || ''

// =============================================
// Admin config
// =============================================
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'djbenjaminfranklin@gmail.com').split(',').map(e => e.trim())

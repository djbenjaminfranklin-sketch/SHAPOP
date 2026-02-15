import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createServer } from 'http'
import { WebSocketServer, type WebSocket } from 'ws'
import { spawn, type ChildProcess } from 'child_process'
import Mux from '@mux/mux-node'
import Stripe from 'stripe'

dotenv.config()

// =============================================
// Config & validation
// =============================================
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

const PLATFORM_COMMISSION = Number(process.env.PLATFORM_COMMISSION) || 0.08  // 8% HT
const PROCESSING_FEE_RATE = 0.029   // 2.9% HT (Stripe)
const PROCESSING_FEE_FIXED = 0.30   // 0.30€ HT fixe (Stripe)
const VAT_RATE = 0.20               // 20% TVA (France)
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929'

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

// =============================================
// Mux client
// =============================================
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
})

// =============================================
// Webhook handlers (defined early, registered before express.json)
// =============================================
async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    let event: Stripe.Event

    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (webhookSecret && sig) {
      // Verify signature in production
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, webhookSecret)
    } else {
      // Dev mode: parse without verification (log a warning)
      console.warn('[Stripe Webhook] No STRIPE_WEBHOOK_SECRET set — skipping signature verification')
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body)
      event = body as Stripe.Event
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', orderId)
          console.log(`[Stripe] Order ${orderId} marked as paid`)
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body)
    const type = body?.type as string
    const data = body?.data as Record<string, unknown>

    if (type === 'video.live_stream.active' && data?.id) {
      await supabase
        .from('streams')
        .update({ status: 'live' })
        .eq('mux_stream_id', data.id as string)
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

// =============================================
// Express setup
// =============================================
const app = express()
const PORT = process.env.PORT || 4000

// Extend Request type for auth
interface AuthenticatedRequest extends Request {
  user?: { id: string }
}

// Security headers
app.use(helmet())

// CORS - restricted origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Webhooks need raw body for signature verification — MUST be before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler as express.RequestHandler)
app.post('/api/webhooks/mux', express.raw({ type: 'application/json' }), muxWebhookHandler as express.RequestHandler)

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

app.use(globalLimiter)

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
    req.user = { id: data.user.id }
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
// STREAMS (public reads, auth writes)
// =============================================
app.get('/api/streams', async (req: Request, res: Response) => {
  try {
    const { category, city, status } = req.query

    let query = supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, id, profiles:profiles!id(display_name, avatar_url))')
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

app.get('/api/streams/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name, id, profiles:profiles!id(display_name, avatar_url))')
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

    const { data: topBid } = await supabase
      .from('bids')
      .select('*')
      .eq('item_id', req.params.id)
      .order('amount', { ascending: false })
      .limit(1)
      .single()

    const status = topBid ? 'sold' : 'unsold'
    const winnerId = topBid?.bidder_id || null

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

    res.json({ success: true, status, winner_id: winnerId })
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
      ai_confidence: listing.confidence,
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

    const engagementRate = viewer_count > 0
      ? (active_chatters + bids_count + reactions_count) / viewer_count
      : 0

    let energyLevel = 'medium'
    if (engagementRate < 0.05) energyLevel = 'low'
    else if (engagementRate < 0.2) energyLevel = 'medium'
    else if (engagementRate < 0.4) energyLevel = 'high'
    else energyLevel = 'peak'

    const { error } = await supabase.from('engagement_metrics').insert({
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

    await supabase
      .from('streams')
      .update({
        engagement_score: engagementRate * 100,
        viewer_count,
        peak_viewers: viewer_count,
      })
      .eq('id', streamId)

    if (error) {
      res.status(500).json({ error: 'Failed to track engagement' })
      return
    }
    res.json({ energy_level: energyLevel, engagement_rate: engagementRate })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
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
      reduced_latency: true,
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
  } catch (err) {
    console.error('Mux stream creation error:', err)
    res.status(500).json({ error: 'Failed to create Mux stream' })
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
        refresh_url: `${req.headers.origin || 'https://shapop.app'}/payments?stripe=refresh`,
        return_url: `${req.headers.origin || 'https://shapop.app'}/payments?stripe=success`,
        type: 'account_onboarding',
      })
      res.json({ url: accountLink.url, account_id: seller.stripe_account_id })
      return
    }

    // Get seller profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', userId)
      .single()

    // Create Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
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
      refresh_url: `${req.headers.origin || 'https://shapop.app'}/payments?stripe=refresh`,
      return_url: `${req.headers.origin || 'https://shapop.app'}/payments?stripe=success`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url, account_id: account.id })
  } catch (err) {
    console.error('Stripe Connect error:', err)
    res.status(500).json({ error: 'Failed to create Stripe account' })
  }
})

// Check Stripe account status
app.get('/api/stripe/account-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

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

// Create a PaymentIntent when a buyer wins an auction
app.post('/api/stripe/create-payment-intent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id } = req.body
    const buyerId = req.user!.id

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, items:item_id(title)')
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

    // Get seller's Stripe account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', order.seller_id)
      .single()

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

    // Recalculate fees server-side (don't trust client values)
    const fees = calculateFees(order.amount)
    const amountCents = Math.round(order.amount * 100)
    const feeCents = Math.round(fees.totalFees * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: feeCents,
      transfer_data: {
        destination: seller.stripe_account_id,
      },
      metadata: {
        order_id: order.id,
        buyer_id: buyerId,
        seller_id: order.seller_id,
        item_id: order.item_id,
      },
      description: `ShaPop - ${(order as Record<string, unknown>).items && typeof (order as Record<string, unknown>).items === 'object' ? ((order as Record<string, unknown>).items as Record<string, string>).title : 'Purchase'}`,
    })

    // Update order with real PaymentIntent ID
    await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending_payment',
      })
      .eq('id', order_id)

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
    })
  } catch (err) {
    console.error('Stripe PaymentIntent error:', err)
    res.status(500).json({ error: 'Failed to create payment' })
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
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      console.log(`[Stripe] Order ${order_id} confirmed paid via direct check`)
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
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
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

  ws.on('message', (data: Buffer) => {
    // Forward binary video chunks to FFmpeg stdin
    if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.write(data)
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
})

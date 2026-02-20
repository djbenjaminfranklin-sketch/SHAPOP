import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { AccessToken } from 'livekit-server-sdk'
import { supabase, STREAMS_SAFE_COLUMNS, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, livekitRoomService, livekitEgressClient, LIVEKIT_RECORDING_BUCKET } from '../config'
import { EncodedFileOutput, S3Upload } from 'livekit-server-sdk'
import { requireAuth, createLimiter } from '../middleware'
import { computeSellerScore } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

const TrackEngagementBody = z.object({
  viewer_count: z.number().int().min(0),
  active_chatters: z.number().int().min(0),
  bids_count: z.number().int().min(0),
  reactions_count: z.number().int().min(0),
  new_followers: z.number().int().min(0).optional(),
})

// =============================================
// STREAMS (public reads, auth writes)
// =============================================
router.get('/api/streams', async (req: Request, res: Response) => {
  try {
    const { category, city, status } = req.query

    let query = supabase
      .from('streams')
      .select(`${STREAMS_SAFE_COLUMNS}, seller:profiles!seller_id(display_name, avatar_url)`)
      .in('status', status ? [status as string] : ['live', 'scheduled'])
      .order('engagement_score', { ascending: false })

    if (category && typeof category === 'string') query = query.eq('category', category)
    if (city && typeof city === 'string') query = query.eq('city', city)

    const { data, error } = await query.limit(50)
    if (error) {
      console.error('Supabase streams error:', error.message, error.code, error.details)
      res.status(500).json({ error: 'Failed to fetch streams', details: error.message })
      return
    }

    // Enrich with seller info + trust scores
    if (data && data.length > 0) {
      const sellerIds = [...new Set(data.map((s: Record<string, unknown>) => s.seller_id as string))]

      const [{ data: sellers }, { data: trusts }] = await Promise.all([
        supabase.from('sellers').select('id, store_name, return_policy, shipping_delay_days').in('id', sellerIds),
        supabase.from('seller_trust').select('seller_id, trust_level, total_completed_orders, positive_delivery_rate, total_disputes_against, disputes_lost').in('seller_id', sellerIds),
      ])

      const sellerMap = new Map((sellers || []).map((s: Record<string, unknown>) => [s.id, s]))
      const trustMap = new Map((trusts || []).map((t: Record<string, unknown>) => [t.seller_id, t]))

      for (const stream of data as Record<string, unknown>[]) {
        const sid = stream.seller_id as string
        const sellerInfo = sellerMap.get(sid) as Record<string, unknown> | undefined
        if (sellerInfo) {
          stream.seller = { ...(stream.seller as Record<string, unknown> || {}), store_name: sellerInfo.store_name, id: sellerInfo.id, return_policy: sellerInfo.return_policy, shipping_delay_days: sellerInfo.shipping_delay_days }
        }
        const trust = trustMap.get(sid) as Record<string, unknown> | undefined
        stream.seller_score = trust ? computeSellerScore(trust) : 8.0
        stream.seller_trust_level = trust ? trust.trust_level : 'new'
      }
    }

    res.json(data)
  } catch (err) {
    console.error('Streams list error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/api/streams/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select(`${STREAMS_SAFE_COLUMNS}, seller:profiles!seller_id(display_name, avatar_url)`)
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }

    // Enrich with seller info + trust score
    const [{ data: sellerInfo }, { data: trust }] = await Promise.all([
      supabase.from('sellers').select('id, store_name, return_policy, shipping_delay_days').eq('id', data.seller_id).single(),
      supabase.from('seller_trust').select('seller_id, trust_level, total_completed_orders, positive_delivery_rate, total_disputes_against, disputes_lost').eq('seller_id', data.seller_id).single(),
    ])
    if (sellerInfo) {
      ;(data as Record<string, unknown>).seller = { ...(data.seller as unknown as Record<string, unknown> || {}), store_name: sellerInfo.store_name, id: sellerInfo.id, return_policy: sellerInfo.return_policy, shipping_delay_days: sellerInfo.shipping_delay_days }
    }
    ;(data as Record<string, unknown>).seller_score = trust ? computeSellerScore(trust as Record<string, unknown>) : 8.0
    ;(data as Record<string, unknown>).seller_trust_level = trust ? trust.trust_level : 'new'

    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/streams — create a new stream (auth required)
// =============================================
router.post('/api/streams', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check stream creation limit per seller
    const { count: activeStreamCount } = await supabase
      .from('streams')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .in('status', ['scheduled', 'live'])

    if (activeStreamCount != null && activeStreamCount >= 15) {
      res.status(429).json({ error: 'Too many active streams. Please end or delete existing streams first.' })
      return
    }

    // Validate request body
    const { title, category, scheduled_at, thumbnail_url, city } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    if (title.trim().length < 3) {
      res.status(400).json({ error: 'Title must be at least 3 characters' })
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
      // Get display_name for default store_name
      const { data: profileForStore } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', userId)
        .single()
      const defaultStoreName = profileForStore?.display_name || profileForStore?.username || 'Ma boutique'
      const { error: createSellerError } = await supabase
        .from('sellers')
        .insert({ id: userId, store_name: defaultStoreName })
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
      .select(STREAMS_SAFE_COLUMNS)
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
// DELETE /api/streams/:id — delete a stream and its items (auth, owner only)
// =============================================
router.delete('/api/streams/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const streamId = req.params.id

    // Verify ownership
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'You can only delete your own streams' })
      return
    }

    // Delete ALL dependent records before the stream
    // Order matters: children before parents
    const errors: string[] = []

    // 1) Get item IDs and order IDs for this stream
    const { data: streamItems } = await supabase.from('items').select('id').eq('stream_id', streamId)
    const itemIds = streamItems?.map((i: { id: string }) => i.id) || []

    const { data: streamOrders } = await supabase.from('orders').select('id').eq('stream_id', streamId)
    const orderIds = streamOrders?.map((o: { id: string }) => o.id) || []

    // 2) Delete all tables that reference orders (shipping_proofs, conversations, paypal_payouts, disputes)
    if (orderIds.length > 0) {
      for (const table of ['shipping_proofs', 'conversations', 'paypal_payouts', 'disputes']) {
        const { error: err } = await supabase.from(table).delete().in('order_id', orderIds)
        if (err) errors.push(`${table}: ${err.message}`)
      }
    }

    // 3) Delete bids and item_favorites (reference items)
    if (itemIds.length > 0) {
      for (const table of ['bids', 'item_favorites']) {
        const { error: err } = await supabase.from(table).delete().in('item_id', itemIds)
        if (err) errors.push(`${table}: ${err.message}`)
      }
    }

    // 4) Delete tables that reference stream_id directly
    for (const table of ['orders', 'events', 'stream_favorites', 'engagement_metrics', 'chat_messages', 'items']) {
      try {
        const { error: err } = await supabase.from(table).delete().eq('stream_id', streamId)
        if (err) errors.push(`${table}: ${err.message}`)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.log(`[stream-delete] Table ${table} skip:`, (e as Error).message)
      }
    }

    // 5) Clean up in-app notifications that reference this stream
    try {
      const { error: notifErr } = await supabase
        .from('notifications')
        .delete()
        .filter('data->>stream_id', 'eq', streamId)
      if (notifErr) errors.push(`notifications: ${notifErr.message}`)
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.log(`[stream-delete] notifications skip:`, (e as Error).message)
    }

    if (errors.length > 0) {
      console.error(`[stream-delete] Dependency errors for ${streamId}:`, errors)
    }

    const { error, count } = await supabase.from('streams').delete().eq('id', streamId).select('id')
    if (process.env.NODE_ENV !== 'production') console.log(`[stream-delete] stream=${streamId} deleted=${count ?? 'unknown'} error=${error?.message || 'none'}`)

    if (error) {
      res.status(500).json({ error: `Failed to delete stream: ${error.message}`, details: errors })
      return
    }
    res.json({ status: 'deleted' })
  } catch (err) {
    console.error('[stream-delete] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api/streams/:id/end', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
// LIVE ADAPTATIF — Suggestions temps reel (public)
// =============================================
router.get('/api/streams/:id/adaptive-suggestions', async (req: Request, res: Response) => {
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
      suggestions.push('Engagement faible — lance une enchere flash a 1\u20aa pour reveiller le public')
      suggestions.push('Essaie de poser une question au chat')
    }

    if (latest.energy_level === 'peak') {
      suggestions.push('Engagement au max ! Lance ton article le plus cher maintenant')
      suggestions.push('Propose un bundle exclusif')
    }

    if (latest.active_chatters < latest.viewer_count * 0.1) {
      suggestions.push('Peu de gens chattent — invite les viewers a ecrire un message')
    }

    if (latest.bids_count === 0 && latest.viewer_count > 5) {
      suggestions.push('Aucune enchere — baisse le prix de depart ou montre mieux l\'article')
    }

    const avgEngagement = metrics.reduce((sum, m) => sum + Number(m.engagement_rate), 0) / metrics.length
    if (avgEngagement > 0.3) {
      suggestions.push('Ton taux d\'engagement est excellent (>' + Math.round(avgEngagement * 100) + '%) — continue comme ca !')
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
router.post('/api/streams/:id/track-engagement', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

// Track viewer count: increment on join, decrement on leave
router.post('/api/streams/:id/viewer-join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const userId = req.user!.id

    // Atomic increment to avoid race conditions
    const { error } = await supabase.rpc('increment_viewer_count', { stream_id: streamId })
    if (error) {
      // Fallback: read-then-update with GREATEST to stay non-negative
      const { data } = await supabase.from('streams').select('viewer_count').eq('id', streamId).single()
      if (data) {
        await supabase.from('streams').update({ viewer_count: Math.max((data.viewer_count || 0) + 1, 0) }).eq('id', streamId)
      }
    }

    // Insert a system "joined" chat message (one per user per stream to avoid spam)
    try {
      const { data: existingJoin } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('stream_id', streamId)
        .eq('user_id', userId)
        .eq('message', '__system:join__')
        .limit(1)
        .maybeSingle()

      if (!existingJoin) {
        await supabase.from('chat_messages').insert({
          stream_id: streamId,
          user_id: userId,
          message: '__system:join__',
        })
      }
    } catch (chatErr) {
      // Non-blocking: don't fail the join if chat message insert fails
      console.error('[viewer-join] Failed to insert join chat message:', chatErr)
    }

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update viewer count' })
  }
})

router.post('/api/streams/:id/viewer-leave', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    // Atomic decrement to avoid race conditions
    const { error } = await supabase.rpc('decrement_viewer_count', { stream_id: streamId })
    if (error) {
      // Fallback: read-then-update with GREATEST to stay non-negative
      const { data } = await supabase.from('streams').select('viewer_count').eq('id', streamId).single()
      if (data) {
        await supabase.from('streams').update({ viewer_count: Math.max((data.viewer_count || 0) - 1, 0) }).eq('id', streamId)
      }
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to update viewer count' })
  }
})

// =============================================
// LIVEKIT LIVE STREAMING (WebRTC, sub-300ms latency)
// =============================================

// Create a LiveKit room for a stream
router.post('/api/streams/:id/create-livekit-room', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    // Start recording egress if bucket is configured
    if (livekitEgressClient && LIVEKIT_RECORDING_BUCKET) {
      try {
        const s3Output = new S3Upload({
          bucket: LIVEKIT_RECORDING_BUCKET,
          region: process.env.AWS_REGION || 'eu-west-3',
          accessKey: process.env.AWS_ACCESS_KEY_ID || '',
          secret: process.env.AWS_SECRET_ACCESS_KEY || '',
        })
        const fileOutput = new EncodedFileOutput({
          filepath: `recordings/${streamId}/{time}`,
          output: { case: 's3', value: s3Output },
        })
        const egress = await livekitEgressClient.startRoomCompositeEgress(roomName, fileOutput)
        await supabase.from('streams').update({ egress_id: egress.egressId }).eq('id', streamId)
      } catch (egressErr) {
        console.error('[egress] Failed to start recording:', egressErr)
      }
    }

    res.json({ livekit_room_name: roomName })
  } catch (err: any) {
    console.error('LiveKit room creation error:', err?.message || err)
    res.status(500).json({ error: 'Failed to create LiveKit room', details: err?.message })
  }
})

// Generate a LiveKit access token for a stream
router.post('/api/streams/:id/livekit-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/api/streams/:id/mark-live', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/api/streams/:id/end-livekit-stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    // Stop recording if active
    const { data: streamData } = await supabase.from('streams').select('egress_id').eq('id', streamId).single()
    if (streamData?.egress_id && livekitEgressClient) {
      try {
        const result = await livekitEgressClient.stopEgress(streamData.egress_id)
        // Store recording URL
        if (result.fileResults?.[0]?.location) {
          await supabase.from('streams').update({ recording_url: result.fileResults[0].location }).eq('id', streamId)
        }
      } catch { /* egress may already be stopped */ }
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

// =============================================
// MATCHING — Lives personnalises (auth required for personalized results)
// =============================================
router.get('/api/matching/personalized-lives', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

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
      .select(`${STREAMS_SAFE_COLUMNS}, seller:sellers!seller_id(store_name, categories)`)
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

export default router

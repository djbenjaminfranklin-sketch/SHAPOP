import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { AccessToken } from 'livekit-server-sdk'
import { supabase, stripe, STREAMS_SAFE_COLUMNS, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, livekitRoomService, livekitEgressClient, livekitIngressClient, LIVEKIT_RECORDING_BUCKET } from '../config'
import { EncodedFileOutput, S3Upload, StreamOutput, StreamProtocol } from 'livekit-server-sdk'
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

    // 1) Get item IDs for this stream
    const { data: streamItems } = await supabase.from('items').select('id').eq('stream_id', streamId)
    const itemIds = streamItems?.map((i: { id: string }) => i.id) || []

    // 2) Get ALL order IDs (by stream_id OR by item_id) — orders.item_id has no CASCADE
    const orderIdSet = new Set<string>()
    const { data: ordersByStream } = await supabase.from('orders').select('id').eq('stream_id', streamId)
    if (ordersByStream) ordersByStream.forEach((o: { id: string }) => orderIdSet.add(o.id))

    if (itemIds.length > 0) {
      const { data: ordersByItem } = await supabase.from('orders').select('id').in('item_id', itemIds)
      if (ordersByItem) ordersByItem.forEach((o: { id: string }) => orderIdSet.add(o.id))
    }
    const orderIds = Array.from(orderIdSet)

    // 3) Delete all tables that reference orders (shipping_proofs, conversations, paypal_payouts, disputes)
    if (orderIds.length > 0) {
      for (const table of ['shipping_proofs', 'conversations', 'paypal_payouts', 'disputes']) {
        const { error: err } = await supabase.from(table).delete().in('order_id', orderIds)
        if (err) errors.push(`${table}: ${err.message}`)
      }
      // Delete orders themselves (by ID, covers both stream_id and item_id matches)
      const { error: ordErr } = await supabase.from('orders').delete().in('id', orderIds)
      if (ordErr) errors.push(`orders: ${ordErr.message}`)
    }

    // 4) Delete bids, item_favorites, max_bids, pre_bids, offers (reference items)
    if (itemIds.length > 0) {
      for (const table of ['bids', 'item_favorites', 'max_bids', 'pre_bids', 'offers']) {
        const { error: err } = await supabase.from(table).delete().in('item_id', itemIds)
        if (err) errors.push(`${table}: ${err.message}`)
      }
    }

    // 5) Delete tables that reference stream_id directly (orders already handled above)
    for (const table of ['events', 'stream_favorites', 'engagement_metrics', 'chat_messages', 'items', 'giveaways']) {
      try {
        const { error: err } = await supabase.from(table).delete().eq('stream_id', streamId)
        if (err) errors.push(`${table}: ${err.message}`)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.log(`[stream-delete] Table ${table} skip:`, (e as Error).message)
      }
    }

    // 6) Clean up in-app notifications that reference this stream
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

    const { error } = await supabase.from('streams').delete().eq('id', streamId)
    console.log(`[stream-delete] stream=${streamId} error=${error?.message || 'none'}`)

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

// Generate an RTMP ingress URL for OBS streaming
router.post('/api/streams/:id/rtmp-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, livekit_room_name, rtmp_ingress_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    if (!livekitIngressClient || !livekitRoomService) {
      res.status(500).json({ error: 'LiveKit not configured' })
      return
    }

    // Create room if needed
    let roomName = stream.livekit_room_name
    if (!roomName) {
      roomName = `stream-${streamId}`
      await livekitRoomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 500 })
      await supabase.from('streams').update({ livekit_room_name: roomName }).eq('id', streamId)
    }

    // If we already have an ingress, return it
    if (stream.rtmp_ingress_id) {
      try {
        const ingressList = await livekitIngressClient.listIngress({ roomName })
        const existing = ingressList.find((i: any) => i.ingressId === stream.rtmp_ingress_id)
        if (existing) {
          res.json({
            rtmp_url: existing.url,
            stream_key: existing.streamKey,
            ingress_id: existing.ingressId,
          })
          return
        }
      } catch { /* ingress may have expired, create new one */ }
    }

    // Create new RTMP ingress
    const { IngressInput } = await import('livekit-server-sdk')
    const ingress = await livekitIngressClient.createIngress(IngressInput.RTMP_INPUT, {
      name: `OBS-${streamId}`,
      roomName,
      participantIdentity: `seller-${req.user!.id}`,
      participantName: 'Seller (OBS)',
    })

    // Save ingress ID
    await supabase.from('streams').update({ rtmp_ingress_id: ingress.ingressId }).eq('id', streamId)

    res.json({
      rtmp_url: ingress.url,
      stream_key: ingress.streamKey,
      ingress_id: ingress.ingressId,
    })
  } catch (err: any) {
    console.error('[rtmp-url] Error:', err?.message || err)
    res.status(500).json({ error: 'Failed to create RTMP ingress', details: err?.message })
  }
})

// Generate a LiveKit access token for a stream
router.post('/api/streams/:id/livekit-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const userId = req.user!.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, cohost_id, livekit_room_name')
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
    const isCohost = stream.cohost_id === userId
    const identity = isSeller ? `seller-${userId}` : isCohost ? `cohost-${userId}` : `viewer-${userId}`

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      ttl: '6h',
    })

    token.addGrant({
      room: stream.livekit_room_name,
      roomJoin: true,
      canPublish: isSeller || isCohost,
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

    // Stop recording and save URL
    const { data: streamData } = await supabase.from('streams').select('egress_id').eq('id', streamId).single()
    if (streamData?.egress_id && livekitEgressClient) {
      const egressId = streamData.egress_id
      const sid = streamId
      try {
        await livekitEgressClient.stopEgress(egressId)
      } catch {
        // Egress may already be completed or stopped
      }
      // Poll async to get recording URL once egress completes
      ;(async () => {
        for (let attempt = 0; attempt < 12; attempt++) {
          await new Promise(r => setTimeout(r, 5000))
          try {
            const { data: check } = await supabase.from('streams').select('recording_url').eq('id', sid).single()
            if (check?.recording_url) return
            const egresses = await livekitEgressClient!.listEgress({ egressId })
            const egress = egresses[0]
            if (!egress) return
            if (egress.status === 4) { console.error(`[egress] FAILED for ${sid}: ${egress.error}`); return }
            if (egress.status === 3) {
              const fileInfo = egress.fileResults?.[0] || (egress as any).result?.value || (egress as any).file
              const fileLocation = fileInfo?.location || fileInfo?.filename
              if (fileLocation) {
                const recordingUrl = fileLocation.startsWith('http') ? fileLocation
                  : `https://shapop-recordings.s3.eu-west-3.amazonaws.com/${fileLocation}`
                await supabase.from('streams').update({ recording_url: recordingUrl }).eq('id', sid)
              }
              return
            }
          } catch { /* retry */ }
        }
      })()
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

// =============================================
// CADEAU SURPRISE (Giveaway) — 4 endpoints
// =============================================

// POST /api/streams/:id/giveaway — seller launches a giveaway
router.post('/api/streams/:id/giveaway', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const streamId = req.params.id

    // Verify stream ownership
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    const { prize_description, title, buyers_only } = req.body
    if (!prize_description || typeof prize_description !== 'string' || !prize_description.trim()) {
      res.status(400).json({ error: 'prize_description is required' })
      return
    }

    // Check max 5 active giveaways per stream
    const { count: activeCount } = await supabase
      .from('giveaways')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .eq('status', 'active')

    if ((activeCount ?? 0) >= 5) {
      res.status(409).json({ error: 'Maximum 5 active giveaways per stream' })
      return
    }

    const { data: giveaway, error } = await supabase
      .from('giveaways')
      .insert({
        stream_id: streamId,
        seller_id: userId,
        title: title?.trim() || 'Cadeau Surprise',
        prize_description: prize_description.trim(),
        buyers_only: buyers_only === true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Giveaway creation error:', error)
      res.status(500).json({ error: 'Failed to create giveaway' })
      return
    }

    res.json(giveaway)
  } catch (err) {
    console.error('POST /api/streams/:id/giveaway error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/streams/:id/giveaway — get active giveaway for a stream
router.get('/api/streams/:id/giveaway', async (req: Request, res: Response) => {
  try {
    const streamId = req.params.id

    // Return active or recently drawn giveaway
    const { data: giveaway } = await supabase
      .from('giveaways')
      .select('*')
      .eq('stream_id', streamId)
      .in('status', ['active', 'drawn'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    res.json(giveaway || null)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/giveaways/:id/enter — viewer enters the giveaway
router.post('/api/giveaways/:id/enter', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const giveawayId = req.params.id

    // Verify giveaway is active
    const { data: giveaway } = await supabase
      .from('giveaways')
      .select('id, status')
      .eq('id', giveawayId)
      .single()

    if (!giveaway) {
      res.status(404).json({ error: 'Giveaway not found' })
      return
    }
    if (giveaway.status !== 'active') {
      res.status(400).json({ error: 'Giveaway is no longer active' })
      return
    }

    // Get user display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()

    // Insert entry (unique constraint prevents duplicates)
    const { error: entryError } = await supabase
      .from('giveaway_entries')
      .insert({
        giveaway_id: giveawayId,
        user_id: userId,
        display_name: profile?.display_name || null,
      })

    if (entryError) {
      if (entryError.code === '23505') {
        res.status(409).json({ error: 'Already entered' })
        return
      }
      console.error('Giveaway entry error:', entryError)
      res.status(500).json({ error: 'Failed to enter giveaway' })
      return
    }

    // Increment entry_count
    const { data: updated } = await supabase
      .from('giveaways')
      .select('entry_count')
      .eq('id', giveawayId)
      .single()

    if (updated) {
      await supabase
        .from('giveaways')
        .update({ entry_count: (updated.entry_count || 0) + 1 })
        .eq('id', giveawayId)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/giveaways/:id/enter error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/giveaways/:id/draw — seller draws a winner
router.post('/api/giveaways/:id/draw', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const giveawayId = req.params.id

    // Verify ownership
    const { data: giveaway } = await supabase
      .from('giveaways')
      .select('id, stream_id, seller_id, title, status, entry_count, buyers_only')
      .eq('id', giveawayId)
      .single()

    if (!giveaway) {
      res.status(404).json({ error: 'Giveaway not found' })
      return
    }
    if (giveaway.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }
    if (giveaway.status !== 'active') {
      res.status(400).json({ error: 'Giveaway is not active' })
      return
    }

    // Get all entries
    const { data: entries } = await supabase
      .from('giveaway_entries')
      .select('user_id, display_name')
      .eq('giveaway_id', giveawayId)

    if (!entries || entries.length === 0) {
      res.status(400).json({ error: 'No participants to draw from' })
      return
    }

    // If buyers_only, filter to users who have an order in this stream
    let eligible = entries
    if (giveaway.buyers_only) {
      const { data: buyerOrders } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('stream_id', giveaway.stream_id)
      const buyerIds = new Set((buyerOrders || []).map((o: { buyer_id: string }) => o.buyer_id))
      eligible = entries.filter(e => buyerIds.has(e.user_id))
      if (eligible.length === 0) {
        res.status(400).json({ error: 'No buyers among participants' })
        return
      }
    }

    // Random winner
    const winner = eligible[Math.floor(Math.random() * eligible.length)]

    // Get winner display name (fallback to profile if not on entry)
    let winnerName = winner.display_name
    if (!winnerName) {
      const { data: wp } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', winner.user_id)
        .single()
      winnerName = wp?.display_name || wp?.username || 'Unknown'
    }

    // Update giveaway
    const { data: updated, error: updateError } = await supabase
      .from('giveaways')
      .update({
        status: 'drawn',
        winner_id: winner.user_id,
        winner_name: winnerName,
        drawn_at: new Date().toISOString(),
      })
      .eq('id', giveawayId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Giveaway draw update error:', updateError)
      res.status(500).json({ error: 'Failed to draw winner' })
      return
    }

    // Insert system chat message announcing the winner
    await supabase.from('chat_messages').insert({
      stream_id: giveaway.stream_id,
      user_id: userId,
      message: `🎁 ${winnerName} a gagné le cadeau "${giveaway.title}" !`,
      type: 'system',
    })

    res.json(updated)
  } catch (err) {
    console.error('POST /api/giveaways/:id/draw error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// SHOW BOOST / PROMOTE
// =============================================
router.post('/api/streams/:id/boost', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const userId = req.user!.id
    const BOOST_AMOUNT_CENTS = 499 // 4.99€

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, status, is_boosted')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    if (stream.status !== 'live' && stream.status !== 'scheduled') {
      res.status(400).json({ error: 'Can only boost live or scheduled streams' })
      return
    }

    if (stream.is_boosted) {
      res.json({ ok: true, already_boosted: true })
      return
    }

    // Get seller's saved card
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      res.status(400).json({ error: 'no_card', message: 'No saved payment method. Please add a card in Settings > Payments first.' })
      return
    }

    const pms = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (pms.data.length === 0) {
      res.status(400).json({ error: 'no_card', message: 'No saved card found. Please add a card first.' })
      return
    }

    // Charge 4.99€ off-session on seller's saved card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: BOOST_AMOUNT_CENTS,
      currency: 'eur',
      customer: profile.stripe_customer_id,
      payment_method: pms.data[0].id,
      off_session: true,
      confirm: true,
      payment_method_types: ['card'],
      metadata: { stream_id: String(streamId), seller_id: userId, type: 'boost' },
      description: `ShaPop Boost – Stream ${String(streamId).slice(0, 8)}`,
    })

    if (paymentIntent.status !== 'succeeded') {
      res.status(402).json({ error: 'payment_failed', message: 'Payment could not be completed. Please check your card.' })
      return
    }

    // Payment succeeded — activate boost for 24 hours
    const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('streams').update({
      is_boosted: true,
      boosted_until: boostedUntil,
    }).eq('id', streamId)

    res.json({ ok: true, boosted_until: boostedUntil })
  } catch (err: any) {
    console.error('POST /api/streams/:id/boost error:', err)
    if (err.type === 'StripeCardError') {
      res.status(402).json({ error: 'card_declined', message: 'Card declined. Please update your payment method.' })
      return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Co-hosting
// =============================================

// POST /api/streams/:id/cohost — invite a co-host by username/email
router.post('/api/streams/:id/cohost', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.id)
    const userId = req.user!.id
    const { cohost_id } = req.body

    if (!cohost_id) {
      res.status(400).json({ error: 'cohost_id required' })
      return
    }

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, cohost_id, status')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    if (cohost_id === userId) {
      res.status(400).json({ error: 'Cannot co-host your own stream' })
      return
    }

    // Verify cohost exists and is a seller
    const { data: cohostProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, store_name, is_seller')
      .eq('id', cohost_id)
      .single()

    if (!cohostProfile) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    await supabase.from('streams').update({ cohost_id }).eq('id', streamId)

    res.json({ ok: true, cohost: { id: cohostProfile.id, display_name: cohostProfile.store_name || cohostProfile.display_name, avatar_url: cohostProfile.avatar_url } })
  } catch (err) {
    console.error('POST /api/streams/:id/cohost error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/streams/:id/cohost — remove co-host
router.delete('/api/streams/:id/cohost', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.id)
    const userId = req.user!.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, cohost_id')
      .eq('id', streamId)
      .single()

    if (!stream || (stream.seller_id !== userId && stream.cohost_id !== userId)) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    await supabase.from('streams').update({ cohost_id: null }).eq('id', streamId)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/streams/:id/cohost error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/sellers/search — search sellers by name (for co-host invite)
router.post('/api/sellers/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query } = req.body
    if (!query || typeof query !== 'string' || query.length < 2) {
      res.json({ sellers: [] })
      return
    }

    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, store_name')
      .eq('is_seller', true)
      .neq('id', req.user!.id)
      .or(`display_name.ilike.%${query}%,store_name.ilike.%${query}%`)
      .limit(10)

    res.json({ sellers: sellers || [] })
  } catch (err) {
    console.error('POST /api/sellers/search error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Multicasting — stream to external RTMP destinations (YouTube, Instagram, TikTok)
// =============================================

// POST /api/streams/:id/multicast — start streaming to an external RTMP URL
router.post('/api/streams/:id/multicast', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.id)
    const userId = req.user!.id
    const { rtmp_url } = req.body // full RTMP URL including stream key, e.g. rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx

    if (!rtmp_url || typeof rtmp_url !== 'string' || !rtmp_url.startsWith('rtmp')) {
      res.status(400).json({ error: 'Valid RTMP URL required' })
      return
    }

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, status, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    if (stream.status !== 'live') {
      res.status(400).json({ error: 'Stream must be live to multicast' })
      return
    }

    if (!livekitEgressClient || !stream.livekit_room_name) {
      res.status(500).json({ error: 'LiveKit not configured' })
      return
    }

    // Start a room composite egress to the external RTMP destination
    const streamOutput = new StreamOutput({ urls: [rtmp_url], protocol: StreamProtocol.RTMP })
    const egress = await livekitEgressClient.startRoomCompositeEgress(stream.livekit_room_name, streamOutput)

    res.json({ ok: true, egress_id: egress.egressId })
  } catch (err) {
    console.error('POST /api/streams/:id/multicast error:', err)
    res.status(500).json({ error: 'Failed to start multicast' })
  }
})

// DELETE /api/streams/:id/multicast/:egressId — stop an external stream
router.delete('/api/streams/:id/multicast/:egressId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.id)
    const egressId = String(req.params.egressId)
    const userId = req.user!.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    if (!livekitEgressClient) {
      res.status(500).json({ error: 'LiveKit not configured' })
      return
    }

    await livekitEgressClient.stopEgress(egressId)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/streams/:id/multicast error:', err)
    res.status(500).json({ error: 'Failed to stop multicast' })
  }
})

// =============================================
// CLIPS — Create clips from stream recordings
// =============================================

// POST /api/streams/:id/clips — create a clip from a stream recording
router.post('/api/streams/:id/clips', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = req.params.id
    const userId = req.user!.id
    const { start_seconds, duration_seconds, title } = req.body

    // Verify stream exists and has a recording
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, recording_url, started_at, ended_at, title')
      .eq('id', streamId)
      .single()

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
    }

    if (!stream.recording_url) {
      res.status(400).json({ error: 'Stream has no recording' })
      return
    }

    // Only stream owner can create clips
    if (stream.seller_id !== userId) {
      res.status(403).json({ error: 'Only the stream owner can create clips' })
      return
    }

    // Validate clip parameters
    const start = Number(start_seconds) || 0
    const duration = Number(duration_seconds) || 60
    if (duration < 5 || duration > 300) {
      res.status(400).json({ error: 'Clip duration must be between 5 and 300 seconds' })
      return
    }

    // Calculate total stream duration
    let totalDuration = 0
    if (stream.started_at && stream.ended_at) {
      totalDuration = Math.floor((new Date(stream.ended_at).getTime() - new Date(stream.started_at).getTime()) / 1000)
    }

    if (start < 0 || (totalDuration > 0 && start + duration > totalDuration + 10)) {
      res.status(400).json({ error: 'Clip range exceeds stream duration' })
      return
    }

    // Check max 20 clips per stream
    const { count } = await supabase
      .from('clips')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId)

    if ((count ?? 0) >= 20) {
      res.status(409).json({ error: 'Maximum 20 clips per stream' })
      return
    }

    const clipTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim()
      : `Clip - ${stream.title || 'Live'}`

    // Store clip metadata (points to original recording with time offsets)
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .insert({
        stream_id: streamId,
        seller_id: userId,
        title: clipTitle,
        recording_url: stream.recording_url,
        start_seconds: start,
        duration_seconds: duration,
        thumbnail_url: null,
      })
      .select('*')
      .single()

    if (clipError) {
      console.error('Clip creation error:', clipError)
      res.status(500).json({ error: 'Failed to create clip' })
      return
    }

    res.json(clip)
  } catch (err) {
    console.error('POST /api/streams/:id/clips error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/streams/:id/clips — list clips for a stream
router.get('/api/streams/:id/clips', async (req: Request, res: Response) => {
  try {
    const streamId = req.params.id

    const { data: clips, error } = await supabase
      .from('clips')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch clips' })
      return
    }

    res.json(clips || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/streams/:id/clips/:clipId — delete a clip
router.delete('/api/streams/:id/clips/:clipId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const clipId = req.params.clipId

    const { data: clip } = await supabase
      .from('clips')
      .select('seller_id')
      .eq('id', clipId)
      .single()

    if (!clip || clip.seller_id !== userId) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    await supabase.from('clips').delete().eq('id', clipId)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/sellers/:id/clips — list all clips by a seller (public)
router.get('/api/sellers/:id/clips', async (req: Request, res: Response) => {
  try {
    const sellerId = req.params.id

    const { data: clips, error } = await supabase
      .from('clips')
      .select('*, stream:streams!stream_id(title, thumbnail_url)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      res.status(500).json({ error: 'Failed to fetch clips' })
      return
    }

    res.json(clips || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

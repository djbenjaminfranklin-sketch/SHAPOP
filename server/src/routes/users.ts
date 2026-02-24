import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase, STREAMS_SAFE_COLUMNS, ADMIN_EMAILS } from '../config'
import { requireAuth, reportLimiter, createLimiter } from '../middleware'
import { notifyUser } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// PROFILE UPDATE (display_name + bio)
// =============================================

router.put('/api/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { display_name, bio } = req.body

    // Validate display_name
    if (display_name !== undefined) {
      if (typeof display_name !== 'string' || display_name.trim().length === 0) {
        res.status(400).json({ error: 'display_name must be a non-empty string' })
        return
      }
      if (display_name.length > 50) {
        res.status(400).json({ error: 'display_name must be 50 characters or less' })
        return
      }
    }

    // Validate bio
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        res.status(400).json({ error: 'bio must be a string' })
        return
      }
      if (bio.length > 200) {
        res.status(400).json({ error: 'bio must be 200 characters or less' })
        return
      }
    }

    const updates: Record<string, unknown> = {}
    if (display_name !== undefined) updates.display_name = display_name.trim()
    if (bio !== undefined) updates.bio = bio.trim() || null

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('[profile-update] Error:', error.message)
      res.status(500).json({ error: error.message })
      return
    }

    res.json({ profile: data })
  } catch (err) {
    console.error('[profile-update] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/my-score — buyer sees their own score
// =============================================
router.get('/api/my-score', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data: bs } = await supabase
      .from('buyer_scores')
      .select('score, total_orders, total_disputes, risk_level')
      .eq('user_id', userId)
      .single()

    if (!bs) {
      // New buyer — default 10/10
      res.json({ score: 10.0, total_orders: 0, total_disputes: 0, risk_level: 'low' })
      return
    }
    res.json(bs)
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// BLOCK & REPORT (user-to-user)
// =============================================
router.post('/api/users/:id/block', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const blockerId = req.user!.id
    const blockedId = req.params.id
    if (blockerId === blockedId) { res.status(400).json({ error: 'Cannot block yourself' }); return }
    await supabase.from('user_blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
    res.json({ success: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/api/users/:id/block', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await supabase.from('user_blocks').delete().eq('blocker_id', req.user!.id).eq('blocked_id', req.params.id)
    res.json({ success: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api/report', reportLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reported_id, reason, context } = req.body
    if (!reported_id || !reason) { res.status(400).json({ error: 'reported_id and reason required' }); return }
    await supabase.from('reports').insert({
      reporter_id: req.user!.id,
      reported_id,
      reason: String(reason).slice(0, 500),
      context: context ? String(context).slice(0, 200) : null,
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// SELLER TRUST LEVELS
// =============================================

// Seller views their trust info
router.get('/api/sellers/:id/trust', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.params.id

    // Only the seller themselves or an admin can view trust data
    const isOwner = req.user?.id === sellerId
    const isAdmin = req.user?.email && ADMIN_EMAILS.includes(req.user.email)
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: you can only view your own trust data' })
      return
    }

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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// FOLLOW / UNFOLLOW SELLERS
// =============================================

// Get followed sellers for current user
router.get('/api/following', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Follow a seller
router.post('/api/follow/:sellerId', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const sellerId = req.params.sellerId

    if (userId === sellerId) {
      res.status(400).json({ error: 'Cannot follow yourself' })
      return
    }

    // Check user/profile exists (not necessarily a seller with a sellers record)
    const { data: sellerProfile } = await supabase.from('profiles').select('id').eq('id', sellerId).single()
    if (!sellerProfile) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('followers')
      .select('user_id')
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

    // Notify the seller about their new follower
    const { data: followerProfile } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
    const followerName = followerProfile?.display_name || 'Quelqu\'un'
    notifyUser(String(sellerId), 'new_follower', 'Nouveau follower !', `${followerName} te suit maintenant`, { follower_id: userId }).catch(() => {})

    res.json({ status: 'followed' })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Unfollow a seller
router.delete('/api/follow/:sellerId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Check if user follows a seller
router.get('/api/follow/:sellerId/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const sellerId = req.params.sellerId

    const { data } = await supabase
      .from('followers')
      .select('user_id')
      .eq('user_id', userId)
      .eq('seller_id', sellerId)
      .single()

    res.json({ following: !!data })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// FAVORITES
// =============================================

// Add a stream to favorites (upsert)
router.post('/api/favorites/:stream_id', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove a stream from favorites
router.delete('/api/favorites/:stream_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all favorited streams with seller info
router.get('/api/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      .select(`${STREAMS_SAFE_COLUMNS}, seller:profiles!seller_id(display_name, avatar_url, store_name)`)
      .in('id', streamIds)

    // Preserve favorites order
    const streamMap = new Map((streams || []).map(s => [s.id, s]))
    const ordered = streamIds.map(id => streamMap.get(id)).filter(Boolean)

    res.json(ordered)
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// ITEM FAVORITES
// =============================================

// Add an item to favorites
router.post('/api/item-favorites/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove an item from favorites
router.delete('/api/item-favorites/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all favorited items with seller info
router.get('/api/item-favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Seller Dashboard Analytics
// =============================================
router.get('/api/seller/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const validStatuses = ['paid', 'shipped', 'delivered', 'completed']

    // Fetch orders for this seller with valid statuses
    const { data: orders } = await supabase
      .from('orders')
      .select('seller_payout, amount, status, created_at, item_id')
      .eq('seller_id', userId)
      .in('status', validStatuses)
      .order('created_at', { ascending: false })

    const allOrders = orders || []
    const total_revenue = allOrders.reduce((sum: number, o: Record<string, unknown>) => sum + ((o.seller_payout as number) || 0), 0)
    const total_sales = allOrders.length

    // Monthly revenue (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthly_revenue = allOrders
      .filter((o: Record<string, unknown>) => (o.created_at as string) >= monthStart)
      .reduce((sum: number, o: Record<string, unknown>) => sum + ((o.seller_payout as number) || 0), 0)

    // Active streams (status = 'live')
    const { count: active_streams } = await supabase
      .from('streams')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'live')

    // Total streams
    const { count: total_streams } = await supabase
      .from('streams')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)

    // Total followers
    const { count: total_followers } = await supabase
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)

    // Average peak viewers from streams
    const { data: streamsData } = await supabase
      .from('streams')
      .select('peak_viewers')
      .eq('seller_id', userId)

    const streamsArr = streamsData || []
    const avg_viewers = streamsArr.length > 0
      ? Math.round(streamsArr.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.peak_viewers as number) || 0), 0) / streamsArr.length)
      : 0

    // Recent orders: last 50 with item title + buyer name
    const { data: recentOrdersRaw } = await supabase
      .from('orders')
      .select('id, amount, seller_payout, status, created_at, item_id, buyer_id, label_url, tracking_number, carrier, stream_id, purchase_stream_offset_seconds')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const recentArr = recentOrdersRaw || []
    // Fetch item titles for recent orders
    const itemIds = recentArr.map((o: Record<string, unknown>) => o.item_id as string).filter(Boolean)
    let itemTitles: Record<string, string> = {}
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from('items')
        .select('id, title')
        .in('id', itemIds)
      if (items) {
        itemTitles = Object.fromEntries(items.map((i: Record<string, unknown>) => [i.id as string, i.title as string]))
      }
    }

    // Fetch buyer display names
    const buyerIds = [...new Set(recentArr.map((o: Record<string, unknown>) => o.buyer_id as string).filter(Boolean))]
    let buyerNames: Record<string, string> = {}
    if (buyerIds.length > 0) {
      const { data: buyers } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', buyerIds)
      if (buyers) {
        buyerNames = Object.fromEntries(buyers.map((b: Record<string, unknown>) => [b.id as string, b.display_name as string]))
      }
    }

    // Fetch recording URLs for streams linked to orders
    const streamIds = [...new Set(recentArr.map((o: Record<string, unknown>) => o.stream_id as string).filter(Boolean))]
    let streamRecordings: Record<string, string> = {}
    if (streamIds.length > 0) {
      const { data: streams } = await supabase
        .from('streams')
        .select('id, recording_url')
        .in('id', streamIds)
      if (streams) {
        streamRecordings = Object.fromEntries(
          streams.filter((s: Record<string, unknown>) => s.recording_url).map((s: Record<string, unknown>) => [s.id as string, s.recording_url as string])
        )
      }
    }

    const recent_orders = recentArr.map((o: Record<string, unknown>) => ({
      id: o.id,
      item_title: itemTitles[o.item_id as string] || 'Unknown item',
      amount: o.amount,
      seller_payout: o.seller_payout,
      status: o.status,
      created_at: o.created_at,
      buyer_id: o.buyer_id,
      buyer_name: buyerNames[o.buyer_id as string] || null,
      label_url: o.label_url || null,
      tracking_number: o.tracking_number || null,
      carrier: o.carrier || null,
      stream_id: o.stream_id || null,
      purchase_stream_offset_seconds: o.purchase_stream_offset_seconds ?? null,
      recording_url: o.stream_id ? (streamRecordings[o.stream_id as string] || null) : null,
    }))

    // ─── Account Health Metrics ───
    // All orders (including refunded/disputed/cancelled) for health calculation
    const { data: allOrdersForHealth } = await supabase
      .from('orders')
      .select('status, created_at, shipped_at')
      .eq('seller_id', userId)

    const healthOrders = allOrdersForHealth || []
    const totalOrderCount = healthOrders.length

    // Dispute rate
    const disputeCount = healthOrders.filter((o: Record<string, unknown>) => o.status === 'disputed').length
    const disputeRate = totalOrderCount > 0 ? Math.round((disputeCount / totalOrderCount) * 1000) / 10 : 0

    // Cancellation / refund rate
    const cancelCount = healthOrders.filter((o: Record<string, unknown>) => o.status === 'refunded' || o.status === 'cancelled').length
    const cancelRate = totalOrderCount > 0 ? Math.round((cancelCount / totalOrderCount) * 1000) / 10 : 0

    // Completion rate (shipped + delivered + completed)
    const completedCount = healthOrders.filter((o: Record<string, unknown>) =>
      ['shipped', 'delivered', 'completed'].includes(o.status as string)
    ).length
    const completionRate = totalOrderCount > 0 ? Math.round((completedCount / totalOrderCount) * 1000) / 10 : 0

    // Average shipping time (days between created_at and shipped_at)
    const shippedOrders = healthOrders.filter((o: Record<string, unknown>) => o.shipped_at && o.created_at)
    let avgShippingDays = 0
    if (shippedOrders.length > 0) {
      const totalDays = shippedOrders.reduce((sum: number, o: Record<string, unknown>) => {
        const created = new Date(o.created_at as string).getTime()
        const shipped = new Date(o.shipped_at as string).getTime()
        return sum + Math.max(0, (shipped - created) / (1000 * 60 * 60 * 24))
      }, 0)
      avgShippingDays = Math.round((totalDays / shippedOrders.length) * 10) / 10
    }

    res.json({
      total_revenue: Math.round(total_revenue * 100) / 100,
      total_sales,
      active_streams: active_streams || 0,
      total_streams: total_streams || 0,
      total_followers: total_followers || 0,
      avg_viewers,
      recent_orders,
      monthly_revenue: Math.round(monthly_revenue * 100) / 100,
      // Health metrics
      health: {
        dispute_rate: disputeRate,
        cancel_rate: cancelRate,
        completion_rate: completionRate,
        avg_shipping_days: avgShippingDays,
        total_orders: totalOrderCount,
      },
    })
  } catch (err) {
    console.error('[seller/dashboard] Error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

// =============================================
// SELLER SHIPPING DELAY
// =============================================

// GET /api/seller/shipping-delay — get the seller's shipping delay
router.get('/api/seller/shipping-delay', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data, error } = await supabase
      .from('sellers')
      .select('shipping_delay_days')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Seller record not found — return default
      res.json({ shipping_delay_days: 2 })
      return
    }
    if (error) {
      res.status(500).json({ error: 'Failed to fetch shipping delay' })
      return
    }

    res.json({ shipping_delay_days: data.shipping_delay_days ?? 2 })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/seller/shipping-delay — update the seller's shipping delay
router.put('/api/seller/shipping-delay', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { shipping_delay_days } = req.body

    if (shipping_delay_days === undefined || typeof shipping_delay_days !== 'number') {
      res.status(400).json({ error: 'shipping_delay_days must be a number' })
      return
    }

    const allowed = [1, 2, 3, 4]
    if (!allowed.includes(shipping_delay_days)) {
      res.status(400).json({ error: `shipping_delay_days must be one of: ${allowed.join(', ')}` })
      return
    }

    // Upsert: update if exists, create seller record if not
    const { data: existing } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existing) {
      const { error: insertErr } = await supabase
        .from('sellers')
        .insert({ id: userId, shipping_delay_days })
      if (insertErr) {
        console.error('[shipping-delay] Insert error:', insertErr.message)
        res.status(500).json({ error: 'Failed to save shipping delay' })
        return
      }
    } else {
      const { error: updateErr } = await supabase
        .from('sellers')
        .update({ shipping_delay_days })
        .eq('id', userId)
      if (updateErr) {
        console.error('[shipping-delay] Update error:', updateErr.message)
        res.status(500).json({ error: 'Failed to save shipping delay' })
        return
      }
    }

    res.json({ shipping_delay_days })
  } catch (err) {
    console.error('[shipping-delay] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/seller/:id/shipping-delay — public: get any seller's shipping delay
router.get('/api/seller/:id/shipping-delay', async (req: Request, res: Response) => {
  try {
    const sellerId = req.params.id
    const { data, error } = await supabase
      .from('sellers')
      .select('shipping_delay_days')
      .eq('id', sellerId)
      .single()

    if (error || !data) {
      res.json({ shipping_delay_days: 2 })
      return
    }

    res.json({ shipping_delay_days: data.shipping_delay_days ?? 2 })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// BUYER STATS
// =============================================
router.get('/api/buyer/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Fetch all non-cancelled/refunded orders for this buyer
    const { data: orders } = await supabase
      .from('orders')
      .select('id, amount, status')
      .eq('buyer_id', userId)

    const allOrders = orders || []
    const total_orders = allOrders.length
    const total_spent = allOrders
      .filter((o: Record<string, unknown>) => !['cancelled', 'refunded'].includes(o.status as string))
      .reduce((sum: number, o: Record<string, unknown>) => sum + ((o.amount as number) || 0), 0)
    const active_orders = allOrders.filter((o: Record<string, unknown>) => ['paid', 'shipped'].includes(o.status as string)).length
    const completed_orders = allOrders.filter((o: Record<string, unknown>) => o.status === 'delivered').length

    // Get buyer score
    const { data: bs } = await supabase
      .from('buyer_scores')
      .select('score, risk_level')
      .eq('user_id', userId)
      .single()

    res.json({
      total_orders,
      order_count: total_orders,
      total_spent: Math.round(total_spent * 100) / 100,
      active_orders,
      pending_count: active_orders,
      completed_orders,
      score: bs?.score ?? 10.0,
      buyer_score: bs?.score ?? 10.0,
      risk_level: bs?.risk_level ?? 'low',
    })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// SPEND LIMITS
// =============================================

// GET /api/spend-limits — get user's spend limits
router.get('/api/spend-limits', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('spend_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No limits set — return defaults (inactive)
      res.json({ weekly_limit: null, monthly_limit: null, is_active: false })
      return
    }
    if (error) {
      res.status(500).json({ error: 'Failed to fetch spend limits' })
      return
    }

    res.json(data)
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/spend-limits — update user's spend limits
router.put('/api/spend-limits', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { weekly_limit, monthly_limit, is_active } = req.body

    if (weekly_limit !== undefined && weekly_limit !== null && (typeof weekly_limit !== 'number' || weekly_limit < 0)) {
      res.status(400).json({ error: 'weekly_limit must be a non-negative number or null' })
      return
    }
    if (monthly_limit !== undefined && monthly_limit !== null && (typeof monthly_limit !== 'number' || monthly_limit < 0)) {
      res.status(400).json({ error: 'monthly_limit must be a non-negative number or null' })
      return
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (weekly_limit !== undefined) updates.weekly_limit = weekly_limit
    if (monthly_limit !== undefined) updates.monthly_limit = monthly_limit
    if (is_active !== undefined) updates.is_active = !!is_active

    // Upsert
    const { data: existing } = await supabase
      .from('spend_limits')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('spend_limits')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) {
        res.status(500).json({ error: 'Failed to update spend limits' })
        return
      }
      res.json(data)
    } else {
      const { data, error } = await supabase
        .from('spend_limits')
        .insert({ user_id: userId, ...updates })
        .select()
        .single()
      if (error) {
        res.status(500).json({ error: 'Failed to create spend limits' })
        return
      }
      res.json(data)
    }
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// LOYALTY
// =============================================

// GET /api/loyalty — get user's loyalty data
router.get('/api/loyalty', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: loyalty } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Calculate next tier info
    const tierThresholds: Record<string, number> = { bronze: 0, silver: 100, gold: 500, platinum: 1000 }
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum']

    if (!loyalty) {
      res.json({
        points: 0,
        total_earned: 0,
        tier: 'bronze',
        next_tier: 'silver',
        next_tier_threshold: 100,
      })
      return
    }

    const currentTier = loyalty.tier || 'bronze'
    const currentIdx = tierOrder.indexOf(currentTier)
    const nextTier = currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : null
    const nextThreshold = nextTier ? tierThresholds[nextTier] : tierThresholds.platinum

    res.json({
      ...loyalty,
      points: loyalty.points || 0,
      next_tier: nextTier,
      next_tier_threshold: nextThreshold,
    })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// REFERRAL PROGRAM
// =============================================

// Record a referral (called after registration)
router.post('/api/referrals/record', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const referredId = req.user!.id
    const { referral_code } = req.body

    if (!referral_code) {
      res.status(400).json({ error: 'referral_code required' })
      return
    }

    // Find referrer by code (first 8 chars of user ID uppercase)
    const code = referral_code.toUpperCase().trim()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')

    const referrer = (profiles || []).find((p: { id: string }) => p.id.slice(0, 8).toUpperCase() === code)

    if (!referrer) {
      res.status(404).json({ error: 'Invalid referral code' })
      return
    }

    // Can't refer yourself
    if (referrer.id === referredId) {
      res.status(400).json({ error: 'Cannot refer yourself' })
      return
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referredId)
      .maybeSingle()

    if (existing) {
      res.json({ success: true, already_recorded: true })
      return
    }

    // Record the referral
    const { error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: referredId,
        referral_code: code,
      })

    if (error) {
      console.error('Referral record error:', error.message)
      res.status(500).json({ error: 'Failed to record referral' })
      return
    }

    // Create promo codes for both users (5% off item price)
    const referrerCode = `REF${code}${Date.now().toString(36).slice(-4)}`.toUpperCase()
    const referredCode = `WELCOME${referredId.slice(0, 4)}${Date.now().toString(36).slice(-4)}`.toUpperCase()

    await supabase.from('promo_codes').insert([
      { code: referrerCode, discount_percent: 5, discount_type: 'item', max_uses: 1, created_by: referrer.id },
      { code: referredCode, discount_percent: 5, discount_type: 'item', max_uses: 1, created_by: referredId },
    ])

    // Notify referrer
    notifyUser(referrer.id, 'referral', 'Nouveau filleul !', 'Un ami a rejoint ShaPop grace a toi ! Tu as recu un code promo de 5%.', { promo_code: referrerCode })

    // Update referral with promo codes
    await supabase
      .from('referrals')
      .update({ referrer_reward_code: referrerCode, referred_reward_code: referredCode, reward_granted: true })
      .eq('referred_id', referredId)
      .eq('referrer_id', referrer.id)

    res.json({ success: true, promo_code: referredCode })
  } catch (err) {
    console.error('Record referral error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get referral stats for current user
router.get('/api/referrals/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Count referrals made by this user
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, referred_id, reward_granted, referrer_reward_code, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch referral stats' })
      return
    }

    const total = (referrals || []).length
    const rewarded = (referrals || []).filter((r: Record<string, unknown>) => r.reward_granted).length
    const codes = (referrals || []).filter((r: Record<string, unknown>) => r.referrer_reward_code).map((r: Record<string, unknown>) => r.referrer_reward_code as string)

    // Check if current user was referred (has a welcome code)
    const { data: myReferral } = await supabase
      .from('referrals')
      .select('referred_reward_code')
      .eq('referred_id', userId)
      .maybeSingle()

    res.json({
      total_referrals: total,
      rewards_earned: rewarded,
      reward_codes: codes,
      my_welcome_code: myReferral?.referred_reward_code || null,
    })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// PRICE DROP ALERTS
// =============================================

// Subscribe to price alerts for an item
router.post('/api/price-alerts/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = req.params.item_id

    const { error } = await supabase
      .from('price_alerts')
      .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' })

    if (error) {
      res.status(500).json({ error: 'Failed to subscribe' })
      return
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Unsubscribe from price alerts
router.delete('/api/price-alerts/:item_id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = req.params.item_id

    await supabase
      .from('price_alerts')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)

    res.json({ success: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's price alerts
router.get('/api/price-alerts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('price_alerts')
      .select('item_id')
      .eq('user_id', userId)

    if (error) {
      res.status(500).json({ error: 'Failed to fetch price alerts' })
      return
    }

    res.json((data || []).map((d: { item_id: string }) => d.item_id))
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Notify users when an item price drops (called from items.ts on price update)
export async function notifyPriceDropSubscribers(itemId: string, oldPrice: number, newPrice: number, itemTitle: string) {
  if (newPrice >= oldPrice) return 0

  const { data: subscribers } = await supabase
    .from('price_alerts')
    .select('user_id')
    .eq('item_id', itemId)

  if (!subscribers || subscribers.length === 0) return 0

  let notified = 0
  for (const sub of subscribers) {
    try {
      notifyUser(
        sub.user_id,
        'price_drop',
        'Baisse de prix !',
        `"${itemTitle}" est passe de ${oldPrice}€ a ${newPrice}€`,
        { item_id: itemId },
      )
      notified++
    } catch {
      // ignore
    }
  }
  return notified
}

// =============================================
// TEAM PERMISSIONS — Invite employees with roles
// =============================================

// POST /api/team/invite — invite a team member
router.post('/api/team/invite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user!.id
    const { email, role } = req.body

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'email is required' })
      return
    }

    const validRoles = ['manager', 'moderator', 'shipper']
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` })
      return
    }

    // Verify caller is a seller
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .single()

    if (!seller) {
      res.status(403).json({ error: 'You must be a seller to invite team members' })
      return
    }

    // Find user by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, email')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (!targetProfile) {
      res.status(404).json({ error: 'User not found with this email' })
      return
    }

    if (targetProfile.id === sellerId) {
      res.status(400).json({ error: 'Cannot invite yourself' })
      return
    }

    // Check max 10 team members
    const { count } = await supabase
      .from('seller_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .neq('status', 'removed')

    if ((count ?? 0) >= 10) {
      res.status(409).json({ error: 'Maximum 10 team members' })
      return
    }

    // Upsert (in case re-inviting a removed member)
    const { data: member, error } = await supabase
      .from('seller_team_members')
      .upsert({
        seller_id: sellerId,
        user_id: targetProfile.id,
        role,
        status: 'pending',
        invited_at: new Date().toISOString(),
      }, { onConflict: 'seller_id,user_id' })
      .select('*')
      .single()

    if (error) {
      console.error('Team invite error:', error)
      res.status(500).json({ error: 'Failed to invite team member' })
      return
    }

    // Notify the invited user
    notifyUser(
      targetProfile.id,
      'team_invite',
      'Invitation equipe',
      `Vous avez ete invite a rejoindre une equipe vendeur.`,
      { seller_id: sellerId },
    )

    res.json({ ...member, user: { display_name: targetProfile.display_name, avatar_url: targetProfile.avatar_url } })
  } catch (err) {
    console.error('POST /api/team/invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/team/members — list team members for current seller
router.get('/api/team/members', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user!.id

    const { data: members, error } = await supabase
      .from('seller_team_members')
      .select('*, user:profiles!user_id(display_name, avatar_url, email)')
      .eq('seller_id', sellerId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch team members' })
      return
    }

    res.json(members || [])
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/team/accept — accept a team invitation
router.post('/api/team/accept', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { seller_id } = req.body

    if (!seller_id) {
      res.status(400).json({ error: 'seller_id is required' })
      return
    }

    const { data: member } = await supabase
      .from('seller_team_members')
      .select('id, status')
      .eq('seller_id', seller_id)
      .eq('user_id', userId)
      .single()

    if (!member || member.status !== 'pending') {
      res.status(404).json({ error: 'No pending invitation found' })
      return
    }

    await supabase
      .from('seller_team_members')
      .update({ status: 'active' })
      .eq('id', member.id)

    res.json({ ok: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/team/decline — decline a team invitation
router.post('/api/team/decline', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { seller_id } = req.body

    if (!seller_id) {
      res.status(400).json({ error: 'seller_id is required' })
      return
    }

    await supabase
      .from('seller_team_members')
      .update({ status: 'removed' })
      .eq('seller_id', seller_id)
      .eq('user_id', userId)

    res.json({ ok: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/team/members/:userId — update role
router.put('/api/team/members/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user!.id
    const targetUserId = req.params.userId
    const { role } = req.body

    const validRoles = ['manager', 'moderator', 'shipper']
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` })
      return
    }

    const { error } = await supabase
      .from('seller_team_members')
      .update({ role })
      .eq('seller_id', sellerId)
      .eq('user_id', targetUserId)

    if (error) {
      res.status(500).json({ error: 'Failed to update role' })
      return
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/team/members/:userId — remove team member
router.delete('/api/team/members/:userId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user!.id
    const targetUserId = req.params.userId

    await supabase
      .from('seller_team_members')
      .update({ status: 'removed' })
      .eq('seller_id', sellerId)
      .eq('user_id', targetUserId)

    res.json({ ok: true })
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/team/invitations — list pending invitations for current user
router.get('/api/team/invitations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: invitations, error } = await supabase
      .from('seller_team_members')
      .select('*, seller:profiles!seller_id(display_name, avatar_url, store_name)')
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) {
      res.status(500).json({ error: 'Failed to fetch invitations' })
      return
    }

    res.json(invitations || [])
  } catch (err) {
    console.error('[users]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase, stripe, STREAMS_SAFE_COLUMNS, PAYPAL_MODE } from '../config'
import { requireAdmin, adminLimiter } from '../middleware'
import { logAdminAction, paramStr, penalizeBuyerScore, calculateFees } from '../utils'
import { processPaypalPayouts } from './payments'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// Apply admin rate limiter to all /api/admin routes
router.use('/api/admin', adminLimiter)

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

// --- Admin: Overview stats ---
router.get('/api/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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
      supabase.from('streams').select('id', { count: 'exact', head: true }).eq('status', 'live').then(r => ({ count: r.count || 0 })),
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
  } catch (err) {
    console.error('[admin] fetch stats:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// --- Admin: Users list ---
router.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] fetch users:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// --- Admin: User detail ---
router.get('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] fetch user:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// --- Admin: Suspend user ---
router.post('/api/admin/users/:id/suspend', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] suspend user:', err)
    res.status(500).json({ error: 'Failed to suspend user' })
  }
})

// --- Admin: Unsuspend user ---
router.post('/api/admin/users/:id/unsuspend', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] unsuspend user:', err)
    res.status(500).json({ error: 'Failed to unsuspend user' })
  }
})

// --- Admin: Ban user ---
router.post('/api/admin/users/:id/ban', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] ban user:', err)
    res.status(500).json({ error: 'Failed to ban user' })
  }
})

// --- Admin: Unban user ---
router.post('/api/admin/users/:id/unban', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] unban user:', err)
    res.status(500).json({ error: 'Failed to unban user' })
  }
})

// --- Admin: Add note on user ---
router.post('/api/admin/users/:id/note', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] add note:', err)
    res.status(500).json({ error: 'Failed to add note' })
  }
})

// --- Admin: Sellers list (risk view) ---
router.get('/api/admin/sellers', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] fetch sellers:', err)
    res.status(500).json({ error: 'Failed to fetch sellers' })
  }
})

// --- Admin: Block seller payments ---
router.post('/api/admin/sellers/:id/block-payments', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { block } = req.body // true to block, false to unblock

    const { error } = await supabase.from('sellers').update({ payments_blocked: !!block }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', block ? 'block_payments' : 'unblock_payments', 'seller', sellerId)
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] update seller:', err)
    res.status(500).json({ error: 'Failed to update seller' })
  }
})

// --- Admin: Set seller reserve ---
router.post('/api/admin/sellers/:id/reserve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { percent } = req.body
    const reservePercent = Math.max(0, Math.min(100, Number(percent) || 0))

    const { error } = await supabase.from('sellers').update({ reserve_percent: reservePercent }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'set_reserve', 'seller', sellerId, { percent: reservePercent })
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] set reserve:', err)
    res.status(500).json({ error: 'Failed to set reserve' })
  }
})

// --- Admin: Request documents from seller ---
router.post('/api/admin/sellers/:id/request-documents', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)

    const { error } = await supabase.from('sellers').update({ documents_requested: true }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'request_documents', 'seller', sellerId)
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] request documents:', err)
    res.status(500).json({ error: 'Failed to request documents' })
  }
})

// --- Admin: Set seller sale limit ---
router.post('/api/admin/sellers/:id/set-limit', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = paramStr(req.params.id)
    const { limit: saleLimit } = req.body

    const { error } = await supabase.from('sellers').update({
      sale_limit: saleLimit ? Number(saleLimit) : null,
    }).eq('id', sellerId)
    if (error) throw error

    await logAdminAction(req.user!.id, req.user!.email || '', 'set_sale_limit', 'seller', sellerId, { limit: saleLimit })
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] set limit:', err)
    res.status(500).json({ error: 'Failed to set limit' })
  }
})

// --- Admin: Orders / Payments list ---
router.get('/api/admin/orders', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] fetch orders:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// --- Admin: Disputes ---
router.get('/api/admin/disputes', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, item:items(title, image_urls), buyer:profiles!orders_buyer_id_fkey(username, display_name), seller_profile:profiles!orders_seller_id_fkey(username, display_name)')
      .in('status', ['disputed', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('[admin] fetch disputes:', err)
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// --- Admin: Streams (lives) ---
router.get('/api/admin/streams', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'live'

    const { data, error } = await supabase
      .from('streams')
      .select(`${STREAMS_SAFE_COLUMNS}, seller:sellers!seller_id(store_name, id)`)
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
router.post('/api/admin/streams/:id/stop', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = paramStr(req.params.id)
    const { livekitRoomService } = await import('../config')

    const { data: stream } = await supabase
      .from('streams')
      .select('livekit_room_name, seller_id')
      .eq('id', streamId)
      .single()

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
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
  } catch (err) {
    console.error('[admin] stop stream:', err)
    res.status(500).json({ error: 'Failed to stop stream' })
  }
})

// --- Admin: Suspend streamer (suspend user + stop live) ---
router.post('/api/admin/streams/:id/suspend-streamer', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = paramStr(req.params.id)
    const { reason } = req.body || {}
    const { livekitRoomService } = await import('../config')

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, livekit_room_name')
      .eq('id', streamId)
      .single()

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' })
      return
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
  } catch (err) {
    console.error('[admin] suspend streamer:', err)
    res.status(500).json({ error: 'Failed to suspend streamer' })
  }
})

// --- Admin: Audit log ---
router.get('/api/admin/audit-log', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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

// --- Admin: Resolve dispute ---
router.post('/api/admin/disputes/:id/resolve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
      // Fetch order to get Stripe payment intent ID and status
      const { data: order } = await supabase
        .from('orders')
        .select('stripe_payment_intent_id, status')
        .eq('id', dispute.order_id)
        .single()

      // Process actual Stripe refund (skip if already refunded)
      if (order?.stripe_payment_intent_id && order.status !== 'refunded') {
        try {
          await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
          if (process.env.NODE_ENV !== 'production') console.log(`[refund] Admin refund processed for order ${dispute.order_id}, PI: ${order.stripe_payment_intent_id}`)
        } catch (refundErr: unknown) {
          console.error(`[refund] Admin refund failed for order ${dispute.order_id}:`, (refundErr as Error).message)
        }
      }

      await supabase
        .from('orders')
        .update({ status: 'refunded', payout_status: 'cancelled' })
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
        const newScore = Math.round(Math.max(0, bs.score - 2.0) * 100) / 100
        let riskLevel = 'low'
        if (newScore < 3) riskLevel = 'blocked'
        else if (newScore < 5) riskLevel = 'high'
        else if (newScore < 7) riskLevel = 'medium'

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
  } catch (err) {
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// --- Admin: Set seller trust level ---
router.post('/api/admin/sellers/:id/trust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// --- Admin: Run automations ---
router.post('/api/admin/run-automations', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results: Record<string, number> = {
      auto_confirmed: 0,
      claim_windows_closed: 0,
      trust_recalculated: 0,
      paypal_payouts_processed: 0,
      stale_orders_cancelled: 0,
      no_address_cancelled: 0,
    }

    // 0a. Auto-cancel pending_payment orders older than 7 days (-10 buyer score)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: staleOrders } = await supabase
      .from('orders')
      .select('id, buyer_id, stripe_payment_intent_id')
      .eq('status', 'pending_payment')
      .lt('created_at', sevenDaysAgo)

    for (const order of (staleOrders || [])) {
      if (order.stripe_payment_intent_id) {
        try { await stripe.paymentIntents.cancel(order.stripe_payment_intent_id) } catch { /* ignore */ }
      }
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      await penalizeBuyerScore(order.buyer_id, 1.0, 'abandoned_order_no_payment')
      results.stale_orders_cancelled++
    }

    // 0b. Auto-cancel paid orders without shipping address after 3 days (-15 buyer score + refund)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: noAddressOrders } = await supabase
      .from('orders')
      .select('id, buyer_id, stripe_payment_intent_id, status')
      .eq('status', 'paid')
      .is('shipping_address', null)
      .lt('paid_at', threeDaysAgo)

    for (const order of (noAddressOrders || [])) {
      // Refund the buyer since they paid but never provided address (skip if already refunded)
      if (order.stripe_payment_intent_id && order.status !== 'refunded') {
        try { await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id }) } catch { /* ignore */ }
      }
      await supabase.from('orders').update({ status: 'refunded', payout_status: 'cancelled' }).eq('id', order.id)
      await penalizeBuyerScore(order.buyer_id, 1.5, 'no_address_timeout')
      results.no_address_cancelled++
    }

    if (results.stale_orders_cancelled > 0 && process.env.NODE_ENV !== 'production') console.log(`[automations] Cancelled ${results.stale_orders_cancelled} stale pending_payment orders`)
    if (results.no_address_cancelled > 0 && process.env.NODE_ENV !== 'production') console.log(`[automations] Refunded ${results.no_address_cancelled} paid orders without address`)

    // 1. Auto-confirm delivery if shipped > 14 days without dispute
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: autoConfirmOrders } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, shipped_at')
      .eq('status', 'shipped')
      .neq('status', 'disputed')
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
  } catch (err) {
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// Enhanced admin disputes endpoint (replaces basic one above)
// =============================================
router.get('/api/admin/disputes-enhanced', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error('[admin] fetch disputes:', err)
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// Admin get buyer scores for users
router.get('/api/admin/buyer-scores', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('buyer_scores')
      .select('*')
      .order('score', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('[admin] fetch buyer scores:', err)
    res.status(500).json({ error: 'Failed to fetch buyer scores' })
  }
})

// Admin get all seller trust levels
router.get('/api/admin/seller-trusts', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('seller_trust')
      .select('*')
      .order('trust_level', { ascending: true })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('[admin] fetch seller trusts:', err)
    res.status(500).json({ error: 'Failed to fetch seller trusts' })
  }
})

export default router

import { Router } from 'express'
import type { Response } from 'express'
import { supabase } from '../config'
import { requireAdmin, adminLimiter, requireAuth } from '../middleware'
import { sendApnsPush, logAdminAction } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// Helper: get active promotion
// =============================================
export async function getActivePromotion(): Promise<{
  id: string
  title: string
  description: string | null
  type: 'commission' | 'shipping' | 'both'
  discount_percent: number
  starts_at: string
  ends_at: string
} | null> {
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data || null
}

// =============================================
// PUBLIC: Get active promotions
// =============================================
router.get('/api/promotions/active', async (_req, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active promotions:', error.message)
      res.status(500).json({ error: 'Failed to fetch promotions' })
      return
    }

    res.json(data || [])
  } catch (err) {
    console.error('Active promotions error:', err)
    res.status(500).json({ error: 'Failed to fetch promotions' })
  }
})

// =============================================
// ADMIN: Create promotion
// =============================================
router.post('/api/admin/promotions', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, type, discount_percent, starts_at, ends_at } = req.body

    // Validate required fields
    if (!title || !type || !discount_percent || !starts_at || !ends_at) {
      res.status(400).json({ error: 'Missing required fields: title, type, discount_percent, starts_at, ends_at' })
      return
    }

    // Validate type
    if (!['commission', 'shipping', 'both'].includes(type)) {
      res.status(400).json({ error: 'type must be commission, shipping, or both' })
      return
    }

    // Validate discount_percent
    const discountNum = Number(discount_percent)
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      res.status(400).json({ error: 'discount_percent must be between 1 and 100' })
      return
    }

    // Validate dates
    const startsDate = new Date(starts_at)
    const endsDate = new Date(ends_at)
    if (isNaN(startsDate.getTime()) || isNaN(endsDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' })
      return
    }
    if (endsDate <= startsDate) {
      res.status(400).json({ error: 'ends_at must be after starts_at' })
      return
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        title,
        description: description || null,
        type,
        discount_percent: discountNum,
        starts_at: startsDate.toISOString(),
        ends_at: endsDate.toISOString(),
        created_by: req.user!.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating promotion:', error.message)
      res.status(500).json({ error: 'Failed to create promotion' })
      return
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'create_promotion', 'promotion', data.id, {
      title, type, discount_percent: discountNum,
    })

    res.json(data)
  } catch (err) {
    console.error('Create promotion error:', err)
    res.status(500).json({ error: 'Failed to create promotion' })
  }
})

// =============================================
// ADMIN: Get all promotions (active + expired)
// =============================================
router.get('/api/admin/promotions', adminLimiter, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching promotions:', error.message)
      res.status(500).json({ error: 'Failed to fetch promotions' })
      return
    }

    res.json(data || [])
  } catch (err) {
    console.error('Fetch promotions error:', err)
    res.status(500).json({ error: 'Failed to fetch promotions' })
  }
})

// =============================================
// ADMIN: Deactivate promotion
// =============================================
router.delete('/api/admin/promotions/:id', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const { error } = await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('id', promoId)

    if (error) {
      console.error('Error deactivating promotion:', error.message)
      res.status(500).json({ error: 'Failed to deactivate promotion' })
      return
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'deactivate_promotion', 'promotion', promoId)

    res.json({ success: true })
  } catch (err) {
    console.error('Deactivate promotion error:', err)
    res.status(500).json({ error: 'Failed to deactivate promotion' })
  }
})

// =============================================
// ADMIN: Notify all users about a promotion
// =============================================
router.post('/api/admin/promotions/:id/notify', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    // Get the promotion
    const { data: promo } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promoId)
      .single()

    if (!promo) {
      res.status(404).json({ error: 'Promotion not found' })
      return
    }

    // Get all device tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token, user_id')
      .eq('notify_deals', true)

    if (!tokens || tokens.length === 0) {
      res.json({ success: true, notified: 0 })
      return
    }

    // Filter out preference-only rows
    const realTokens = tokens.filter(t => !t.token.startsWith('prefs-'))

    const title = promo.title
    const body = promo.description || title

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[push] Sending promotion notification to ${realTokens.length} devices`)
    }

    // Send push notifications in parallel (cap at 500)
    const batch = realTokens.slice(0, 500)
    const results = await Promise.allSettled(
      batch.map(t => sendApnsPush(t.token, title, body, { promotion_id: promoId }))
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length

    // Also insert in-app notifications for all unique users
    const uniqueUserIds = [...new Set(tokens.map(t => t.user_id))]
    const notifRows = uniqueUserIds.map(uid => ({
      user_id: uid,
      type: 'deal',
      title,
      body,
      data: { promotion_id: promoId },
    }))

    const { error: insertErr } = await supabase.from('notifications').insert(notifRows)
    if (insertErr) console.error('[notifications] promotion insert error:', insertErr.message)

    await logAdminAction(req.user!.id, req.user!.email || '', 'notify_promotion', 'promotion', promoId, {
      devices: realTokens.length, sent, users: uniqueUserIds.length,
    })

    res.json({ success: true, notified: sent, total_devices: realTokens.length, users: uniqueUserIds.length })
  } catch (err) {
    console.error('Notify promotion error:', err)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

// =============================================
// PROMO CODES (user-facing coupon codes)
// Table: promo_codes (code, discount_percent, discount_type, max_uses, current_uses, expires_at, is_active)
// Table: promo_code_uses (promo_code_id, user_id, order_id)
// =============================================

// Helper: validate and get a promo code
export async function getValidPromoCode(code: string, userId?: string): Promise<{
  id: string
  code: string
  discount_percent: number
  discount_type: 'item' | 'commission' | 'shipping'
  max_uses: number | null
  current_uses: number
} | null> {
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Check max uses
  if (data.max_uses !== null && data.current_uses >= data.max_uses) return null

  // Check if user already used this code
  if (userId) {
    const { data: used } = await supabase
      .from('promo_code_uses')
      .select('id')
      .eq('promo_code_id', data.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (used) return null
  }

  return data
}

// PUBLIC: Validate a promo code (buyer checks before payment)
router.post('/api/promo-codes/validate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body
    if (!code) {
      res.status(400).json({ error: 'Code required' })
      return
    }

    const promo = await getValidPromoCode(code, req.user!.id)

    if (!promo) {
      res.json({ valid: false })
      return
    }

    res.json({
      valid: true,
      discount_percent: promo.discount_percent,
      discount_type: promo.discount_type,
      code: promo.code,
    })
  } catch (err) {
    console.error('Validate promo code error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ADMIN: Create promo code
router.post('/api/admin/promo-codes', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, discount_percent, discount_type, max_uses, expires_at } = req.body

    if (!code || !discount_percent) {
      res.status(400).json({ error: 'code and discount_percent required' })
      return
    }

    const type = discount_type || 'item'
    if (!['item', 'commission', 'shipping'].includes(type)) {
      res.status(400).json({ error: 'discount_type must be item, commission, or shipping' })
      return
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: code.toUpperCase().trim(),
        discount_percent: Number(discount_percent),
        discount_type: type,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        created_by: req.user!.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Code already exists' })
        return
      }
      console.error('Create promo code error:', error.message)
      res.status(500).json({ error: 'Failed to create promo code' })
      return
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'create_promo_code', 'promo_code', data.id, { code, discount_percent })

    res.json(data)
  } catch (err) {
    console.error('Create promo code error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ADMIN: List promo codes
router.get('/api/admin/promo-codes', adminLimiter, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch promo codes' })
      return
    }

    res.json(data || [])
  } catch (err) {
    console.error('Fetch promo codes error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ADMIN: Deactivate promo code
router.delete('/api/admin/promo-codes/:id', adminLimiter, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const codeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: false })
      .eq('id', codeId)

    if (error) {
      res.status(500).json({ error: 'Failed to deactivate promo code' })
      return
    }

    await logAdminAction(req.user!.id, req.user!.email || '', 'deactivate_promo_code', 'promo_code', codeId)

    res.json({ success: true })
  } catch (err) {
    console.error('Deactivate promo code error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

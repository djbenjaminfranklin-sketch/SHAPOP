import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../config'
import { requireAuth } from '../middleware'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// NOTIFICATION PREFERENCES (auth required)
// =============================================

// Get notification preferences
router.get('/api/notification-prefs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    // Must filter by the exact prefs token to avoid fetching a real push token record
    const { data } = await supabase
      .from('device_tokens')
      .select('notify_live, notify_orders, notify_deals, notify_messages, notify_reminders, notify_community')
      .eq('user_id', userId)
      .eq('token', `prefs-${userId}`)
      .maybeSingle()

    res.json(data || {
      notify_live: true, notify_orders: true, notify_deals: false,
      notify_messages: true, notify_reminders: true, notify_community: false,
    })
  } catch (err) {
    console.error('[notifications]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update a single notification preference
router.put('/api/notification-prefs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { column, value, allPrefs } = req.body

    const validColumns = ['notify_live', 'notify_orders', 'notify_deals', 'notify_messages', 'notify_reminders', 'notify_community']
    if (!column || !validColumns.includes(column)) {
      res.status(400).json({ error: 'Invalid column' })
      return
    }

    const now = new Date().toISOString()
    const prefsToken = `prefs-${userId}`

    // Check if prefs record already exists
    const { data: existing } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', prefsToken)
      .maybeSingle()

    if (existing) {
      // UPDATE existing record
      const { error: updateErr } = await supabase
        .from('device_tokens')
        .update({ [column]: !!value, updated_at: now })
        .eq('id', existing.id)

      if (process.env.NODE_ENV !== 'production') console.log(`[notif-prefs] UPDATE id=${existing.id} user=${userId} column=${column} value=${value} error=${updateErr?.message || 'none'}`)
      if (updateErr) {
        res.status(500).json({ error: updateErr.message })
        return
      }
    } else {
      // INSERT new record with all prefs
      const { error: insertErr } = await supabase
        .from('device_tokens')
        .insert({
          user_id: userId,
          token: prefsToken,
          platform: 'web',
          notify_live: allPrefs?.live ?? true,
          notify_orders: allPrefs?.orders ?? true,
          notify_deals: allPrefs?.deals ?? false,
          notify_messages: allPrefs?.messages ?? true,
          notify_reminders: allPrefs?.reminders ?? true,
          notify_community: allPrefs?.community ?? false,
          [column]: !!value,
          updated_at: now,
        })

      if (process.env.NODE_ENV !== 'production') console.log(`[notif-prefs] INSERT user=${userId} column=${column} value=${value} error=${insertErr?.message || 'none'}`)
      if (insertErr) {
        res.status(500).json({ error: insertErr.message })
        return
      }
    }

    res.json({ status: 'updated' })
  } catch (err) {
    console.error('[notif-prefs] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// IN-APP NOTIFICATIONS FEED
// =============================================

router.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.json(data || [])
  } catch (err) {
    console.error('[notifications]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Clear all notifications for user
router.delete('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await supabase.from('notifications').delete().eq('user_id', req.user!.id)
    res.json({ success: true })
  } catch (err) {
    console.error('[notifications]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// REGISTER DEVICE TOKEN (push notifications)
// =============================================
router.post('/api/device-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { token, platform } = req.body
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'token is required' })
      return
    }
    const plat = platform === 'android' ? 'android' : 'ios'

    // Check if already exists
    const { data: existing } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle()

    if (existing) {
      const { error: updErr } = await supabase.from('device_tokens').update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (updErr) console.error('[device-token] Update error:', updErr.message)
    } else {
      const { error: insErr } = await supabase.from('device_tokens').insert({
        user_id: userId,
        token,
        platform: plat,
        notify_live: true,
        notify_orders: true,
        notify_messages: true,
        notify_reminders: true,
      })
      if (insErr) {
        console.error('[device-token] Insert error:', insErr.message)
        res.status(500).json({ error: insErr.message })
        return
      }
    }

    if (process.env.NODE_ENV !== 'production') console.log(`[device-token] Registered ${plat} token for user ${userId}: ${token.slice(0, 12)}...`)
    res.json({ status: 'registered' })
  } catch (err) {
    console.error('[device-token] Error:', err)
    res.status(500).json({ error: 'Failed to register device token' })
  }
})

export default router

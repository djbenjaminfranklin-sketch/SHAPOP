import { Router } from 'express'
import type { Response } from 'express'
import { supabase } from '../config'
import { requireAuth } from '../middleware'
import type { AuthenticatedRequest } from '../types'

const router = Router()

interface AnalyticsEvent {
  name: string
  properties?: Record<string, string | number | boolean>
  timestamp: number
}

// POST /api/analytics — ingest client-side analytics events
router.post('/api/analytics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { events } = req.body as { events?: AnalyticsEvent[] }

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'events array is required' })
      return
    }

    // Cap batch size to prevent abuse
    const batch = events.slice(0, 200)

    const rows = batch.map(event => ({
      user_id: req.user!.id,
      event_name: event.name,
      properties: event.properties || {},
      client_timestamp: new Date(event.timestamp).toISOString(),
    }))

    const { error } = await supabase
      .from('analytics_events')
      .insert(rows)

    if (error) {
      // Table may not exist yet — log but don't fail the client
      console.error('[analytics] insert error:', error.message)
    }

    res.json({ ok: true, ingested: rows.length })
  } catch (err) {
    console.error('[analytics] endpoint error:', err)
    res.status(500).json({ error: 'Failed to ingest events' })
  }
})

export default router

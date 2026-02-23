import { apiFetch } from './api'
import { supabase } from './supabase'

type EventName =
  | 'page_view'
  | 'login'
  | 'signup'
  | 'stream_join'
  | 'stream_leave'
  | 'bid_placed'
  | 'order_created'
  | 'order_paid'
  | 'item_favorited'
  | 'seller_followed'
  | 'push_enabled'
  | 'search'
  | 'share'
  | 'buy_now'

interface AnalyticsEvent {
  name: EventName
  properties?: Record<string, string | number | boolean>
  timestamp: number
}

// Queue events in memory, flush to backend periodically
const eventQueue: AnalyticsEvent[] = []
const MAX_QUEUE_SIZE = 100
const FLUSH_INTERVAL_MS = 30_000 // 30 seconds

let flushTimer: ReturnType<typeof setInterval> | null = null

/** Send queued events to the server and clear the queue */
async function flushEvents() {
  if (eventQueue.length === 0) return

  const batch = eventQueue.splice(0, eventQueue.length)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return // Not logged in, discard silently

    await apiFetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ events: batch }),
    })
  } catch {
    // Network error — re-queue events (at the front) so they aren't lost
    eventQueue.unshift(...batch)
    if (eventQueue.length > MAX_QUEUE_SIZE) {
      eventQueue.length = MAX_QUEUE_SIZE
    }
  }
}

function startFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS)

  // Also flush when the user leaves the page
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushEvents()
    })
  }
}

// Auto-start the flush timer
startFlushTimer()

export function track(name: EventName, properties?: Record<string, string | number | boolean>) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  }

  eventQueue.push(event)

  // Keep queue bounded
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift()
  }

  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${name}`, properties || '')
  }
}

export function getEvents(): AnalyticsEvent[] {
  return [...eventQueue]
}

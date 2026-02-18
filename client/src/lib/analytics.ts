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

interface AnalyticsEvent {
  name: EventName
  properties?: Record<string, string | number | boolean>
  timestamp: number
}

// Queue events in memory, flush to backend when ready
const eventQueue: AnalyticsEvent[] = []
const MAX_QUEUE_SIZE = 100

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

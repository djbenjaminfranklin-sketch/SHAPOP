import { initMonitoring, Sentry } from './monitoring'
initMonitoring()

import express, { type Request, type Response, type NextFunction } from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { PAYPAL_MODE, supabase } from './config'
import { notifyFollowersSellerLive } from './utils'
import { globalLimiter, webhookLimiter } from './middleware'

// Route modules
import authRoutes from './routes/auth'
import streamRoutes from './routes/streams'
import itemRoutes from './routes/items'
import orderRoutes from './routes/orders'
import { cancelOverdueOrders, remindHandoverDeadline, remindPendingPayments } from './routes/orders'
import { releaseDuePostPayouts } from './services/orderLifecycle'
import paymentRoutes from './routes/payments'
import { processPaypalPayouts } from './routes/payments'
import messageRoutes from './routes/messages'
import notificationRoutes from './routes/notifications'
import userRoutes from './routes/users'
import disputeRoutes from './routes/disputes'
import fulfillmentRoutes from './routes/fulfillment'
import adminRoutes from './routes/admin'
import analyticsRoutes from './routes/analytics'
import promotionRoutes from './routes/promotions'
import reviewRoutes from './routes/reviews'
import offerRoutes from './routes/offers'

// Webhook handlers (raw body — must be registered before express.json)
import { stripeWebhookHandler, livekitWebhookHandler, paypalWebhookHandler } from './routes/webhooks'

// =============================================
// Express setup
// =============================================
const app = express()
const PORT = process.env.PORT || 4000

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    }
  }
}))

// CORS - accept configured origins + Capacitor
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow Capacitor origins
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return callback(null, true)
    // Allow configured origins
    if (allowed.includes(origin)) return callback(null, true)
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Webhooks need raw body for signature verification — MUST be before express.json()
app.post('/api/webhooks/stripe', webhookLimiter, express.raw({ type: 'application/json' }), stripeWebhookHandler as express.RequestHandler)
app.post('/api/webhooks/livekit', webhookLimiter, express.raw({ type: 'application/json' }), livekitWebhookHandler as express.RequestHandler)

// PayPal webhook uses express.json() (registered inline with its own parser)
app.post('/api/paypal/webhook', express.json(), paypalWebhookHandler as express.RequestHandler)

// Body parsing + compression (AFTER webhook raw body routes)
app.use(express.json({ limit: '10mb' }))
app.use(compression())

// Global rate limiting
app.use(globalLimiter)

// =============================================
// Health
// =============================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =============================================
// Register route modules
// =============================================
app.use(authRoutes)
app.use(streamRoutes)
app.use(itemRoutes)
app.use(orderRoutes)
app.use(paymentRoutes)
app.use(messageRoutes)
app.use(notificationRoutes)
app.use(userRoutes)
app.use(disputeRoutes)
app.use(fulfillmentRoutes)
app.use(adminRoutes)
app.use(analyticsRoutes)
app.use(promotionRoutes)
app.use(reviewRoutes)
app.use(offerRoutes)

// =============================================
// Sentry error handler (must be before generic error handler)
// =============================================
Sentry.setupExpressErrorHandler(app)

// =============================================
// Global error handler
// =============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' })
})

// =============================================
// START SERVER
// =============================================
const server = createServer(app)

server.listen(PORT, () => {
  console.log(`ShaPop API running on http://localhost:${PORT}`)

  // Process PayPal payouts every 4 hours
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    console.log(`[PayPal] Payouts processing enabled (mode: ${PAYPAL_MODE})`)
    setInterval(async () => {
      try {
        const count = await processPaypalPayouts()
        if (count > 0) {
          if (process.env.NODE_ENV !== 'production') console.log(`[PayPal] Auto-processed ${count} payouts`)
        }
      } catch (err) {
        console.error('[PayPal] Auto-processing error:', err)
      }
    }, 4 * 60 * 60 * 1000) // 4 hours
  }

  // Délai de remise : rappel au vendeur puis annulation + remboursement si aucune preuve
  // (code de retrait saisi ou 2 photos d'envoi) n'est fournie à temps. Toutes les heures.
  console.log('[Handover-Deadline] Overdue handover check enabled (every 1h)')
  setInterval(async () => {
    try {
      const cancelled = await cancelOverdueOrders()
      if (cancelled > 0) console.log(`[Handover-Deadline] Auto-cancelled ${cancelled} overdue order(s)`)
      const reminded = await remindHandoverDeadline()
      if (reminded > 0) console.log(`[Handover-Deadline] Reminded ${reminded} seller(s)`)
      const released = await releaseDuePostPayouts()
      if (released > 0) console.log(`[Payout] Released ${released} post order payout(s) after the safety delay`)
    } catch (err) {
      console.error('[Handover-Deadline] Error:', err)
    }
  }, 60 * 60 * 1000) // 1 hour

  // Remind buyers about pending payments every 6 hours
  console.log('[Payments] Payment reminder enabled (every 6h)')
  setInterval(async () => {
    try {
      const reminded = await remindPendingPayments()
      if (reminded > 0) console.log(`[Payments] Reminded ${reminded} buyer(s) about pending payment`)
    } catch (err) {
      console.error('[Payments] Reminder error:', err)
    }
  }, 6 * 60 * 60 * 1000) // 6 hours

  // Remind followers about scheduled lives starting in ~15 minutes (check every 5 min)
  console.log('[Live-Reminder] Scheduled live reminder enabled (every 5min)')
  setInterval(async () => {
    try {
      const now = new Date()
      const in15min = new Date(now.getTime() + 15 * 60 * 1000)
      // Find streams scheduled within the next 15 minutes that haven't been reminded yet
      const { data: upcomingStreams } = await supabase
        .from('streams')
        .select('id, title, seller_id, scheduled_at')
        .eq('status', 'scheduled')
        .eq('reminder_sent', false)
        .lte('scheduled_at', in15min.toISOString())
        .gte('scheduled_at', now.toISOString())
      if (upcomingStreams && upcomingStreams.length > 0) {
        for (const stream of upcomingStreams) {
          // Notify all followers of the seller (chacun dans sa langue)
          await notifyFollowersSellerLive(stream.seller_id, stream.title, stream.id, 'soon')
          // Mark as reminded to avoid duplicate notifications
          await supabase.from('streams').update({ reminder_sent: true }).eq('id', stream.id)
        }
        if (process.env.NODE_ENV !== 'production') console.log(`[Live-Reminder] Sent reminders for ${upcomingStreams.length} upcoming stream(s)`)
      }
    } catch (err) {
      console.error('[Live-Reminder] Error:', err)
    }
  }, 5 * 60 * 1000) // 5 minutes
})

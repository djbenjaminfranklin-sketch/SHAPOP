import { initMonitoring, Sentry } from './monitoring'
initMonitoring()

import express, { type Request, type Response, type NextFunction } from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { PAYPAL_MODE } from './config'
import { globalLimiter, webhookLimiter } from './middleware'

// Route modules
import authRoutes from './routes/auth'
import streamRoutes from './routes/streams'
import itemRoutes from './routes/items'
import orderRoutes from './routes/orders'
import paymentRoutes from './routes/payments'
import { processPaypalPayouts } from './routes/payments'
import messageRoutes from './routes/messages'
import notificationRoutes from './routes/notifications'
import userRoutes from './routes/users'
import disputeRoutes from './routes/disputes'
import adminRoutes from './routes/admin'
import analyticsRoutes from './routes/analytics'

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
app.use(adminRoutes)
app.use(analyticsRoutes)

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
})

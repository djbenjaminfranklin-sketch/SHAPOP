import type { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase, ADMIN_EMAILS } from './config'
import type { AuthenticatedRequest } from './types'

// =============================================
// Auth middleware
// =============================================
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Check if user is banned
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', data.user.id)
      .single()
    if (profile?.is_banned) {
      res.status(403).json({ error: 'Votre compte a ete banni' })
      return
    }

    req.user = { id: data.user.id, email: data.user.email }
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const token = authHeader.split('Bearer ')[1]
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    if (!data.user.email || !ADMIN_EMAILS.includes(data.user.email)) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    req.user = { id: data.user.id, email: data.user.email }
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// =============================================
// Rate limiters
// =============================================
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many webhook requests' },
})

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests, please try again later' },
})

export const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { error: 'Too many admin requests, slow down' },
})

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives, reessayez plus tard' },
})

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many payment requests, please try again later' },
  keyGenerator: (req: Request) => {
    const auth = req.headers.authorization
    return auth ? auth.split('Bearer ')[1]?.slice(0, 20) || req.ip || 'unknown' : req.ip || 'unknown'
  },
})

export const disputeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many dispute requests, please try again later' },
})

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many messages, slow down' },
})

export const bidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many bids, please try again later' },
})

export const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reports, please try again later' },
  keyGenerator: (req: Request) => {
    const auth = req.headers.authorization
    return auth ? auth.split('Bearer ')[1]?.slice(0, 20) || req.ip || 'unknown' : req.ip || 'unknown'
  },
})

export const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many create requests, please try again later' },
})

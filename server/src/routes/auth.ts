import { Router } from 'express'
import type { Request, Response } from 'express'
import crypto from 'crypto'
import { supabase } from '../config'
import { otpLimiter } from '../middleware'
import { notifyUser } from '../utils'

const router = Router()

// =============================================
// OTP store (in-memory, expires after 5 min)
// =============================================
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>()

// Cleanup expired OTPs every 5 min
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of otpStore) {
    if (now > val.expiresAt) otpStore.delete(key)
  }
}, 5 * 60 * 1000)

// Normalize phone to E.164 format
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '')
}

// Send OTP via SMS
router.post('/api/auth/send-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Numero de telephone requis' })
      return
    }

    const normalized = normalizePhone(phone)
    if (!/^\+\d{8,15}$/.test(normalized)) {
      res.status(400).json({ error: 'Format de numero invalide (ex: +33612345678)' })
      return
    }

    // Check if phone is banned
    const { data: banned } = await supabase
      .from('banned_identifiers')
      .select('id')
      .eq('type', 'phone')
      .eq('value', normalized)
      .maybeSingle()
    if (banned) {
      res.status(403).json({ error: 'Ce numero de telephone est bloque' })
      return
    }

    // Check if phone already used by a verified profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', normalized)
      .eq('phone_verified', true)
      .maybeSingle()
    if (existingProfile) {
      res.status(409).json({ error: 'Ce numero est deja utilise par un autre compte' })
      return
    }

    // Generate 6-digit code (cryptographically secure)
    const code = String(crypto.randomInt(100000, 999999))
    otpStore.set(normalized, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 })

    // Send via Twilio if configured
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    if (twilioSid && twilioToken && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const body = new URLSearchParams({
        To: normalized,
        From: twilioFrom,
        Body: `Votre code ShaPop : ${code}`,
      })
      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] Code for ${normalized}: ${code}`)
      }
    }

    res.json({ sent: true })
  } catch (err) {
    console.error('[send-otp]', err)
    res.status(500).json({ error: "Erreur lors de l'envoi du code" })
  }
})

// Verify OTP code
router.post('/api/auth/verify-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      res.status(400).json({ error: 'Telephone et code requis' })
      return
    }

    const normalized = normalizePhone(phone)
    const entry = otpStore.get(normalized)

    if (!entry) {
      res.json({ verified: false, error: 'Code expire ou inexistant' })
      return
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized)
      res.json({ verified: false, error: 'Code expire' })
      return
    }

    entry.attempts++
    if (entry.attempts > 5) {
      otpStore.delete(normalized)
      res.json({ verified: false, error: 'Trop de tentatives, demandez un nouveau code' })
      return
    }

    const submitted = String(code).trim()
    const expected = entry.code
    const match = submitted.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))
    if (!match) {
      res.json({ verified: false, error: 'Code incorrect' })
      return
    }

    // Success — remove from store
    otpStore.delete(normalized)

    // Send welcome push notification on first verification
    // Look up user by phone to send welcome notification
    const { data: verifiedProfile } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('phone_number', normalized)
      .maybeSingle()
    if (verifiedProfile) {
      // Only send welcome if profile was created recently (within last 5 minutes = new signup)
      const profileAge = Date.now() - new Date(verifiedProfile.created_at).getTime()
      if (profileAge < 5 * 60 * 1000) {
        notifyUser(verifiedProfile.id, 'welcome', 'Bienvenue sur ShaPop !', 'Découvre les lives et commence à acheter ou vendre.').catch(() => {})
      }
    }

    res.json({ verified: true })
  } catch (err) {
    console.error('[auth] verification:', err)
    res.status(500).json({ error: 'Erreur de verification' })
  }
})

// Check if email or phone is banned
router.post('/api/auth/check-banned', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body
    const conditions: { type: string; value: string }[] = []

    if (email && typeof email === 'string') {
      conditions.push({ type: 'email', value: email.toLowerCase().trim() })
    }
    if (phone && typeof phone === 'string') {
      conditions.push({ type: 'phone', value: normalizePhone(phone) })
    }

    if (conditions.length === 0) {
      res.json({ banned: false })
      return
    }

    // Check each identifier
    for (const cond of conditions) {
      const { data } = await supabase
        .from('banned_identifiers')
        .select('reason')
        .eq('type', cond.type)
        .eq('value', cond.value)
        .maybeSingle()
      if (data) {
        const label = cond.type === 'email' ? 'Cet email est bloque' : 'Ce numero est bloque'
        res.json({ banned: true, reason: label })
        return
      }
    }

    res.json({ banned: false })
  } catch (err) {
    console.error('[auth] verification:', err)
    res.status(500).json({ error: 'Erreur de verification' })
  }
})

export default router

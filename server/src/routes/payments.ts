import { z } from 'zod'
import { Router } from 'express'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { supabase, stripe, APP_BASE_URL, PAYPAL_BASE_URL, PAYPAL_MODE, ADMIN_EMAILS } from '../config'
import { requireAuth, paymentLimiter } from '../middleware'
import { calculateFees, getPaypalAccessToken } from '../utils'
import { getActivePromotion, getValidPromoCode } from './promotions'
import { markOrderPaid } from '../services/orderLifecycle'
import { captureAuthorizedPayment, captureRapydOrder, captureAirwallexOrder } from '../services/cardAuthorization'
import * as awx from '../payments/airwallex'
import { userHasSavedCard } from '../viewerPreview'
import { providerForCountry } from '../payments/provider'
import { rapydConfig, createCustomer as createRapydCustomer, createSaveCardPage, createPersonWallet, createIdentityPage } from '../payments/rapyd'
import type { AuthenticatedRequest } from '../types'

// Admin bypass: admins can sell without Stripe Connect (money stays on platform account)
function isAdminUser(email?: string): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

const router = Router()

// =============================================
// STRIPE CONNECT
// =============================================

// Create a Stripe Connect Express account for a seller
router.post('/api/stripe/create-connect-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check if seller already has a Stripe account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (seller?.stripe_account_id) {
      // Account already exists, just create a new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: seller.stripe_account_id,
        refresh_url: `${APP_BASE_URL}/payments?stripe=refresh`,
        return_url: `${APP_BASE_URL}/payments?stripe=success`,
        type: 'account_onboarding',
      })
      res.json({ url: accountLink.url, account_id: seller.stripe_account_id })
      return
    }

    // Get seller profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, country')
      .eq('id', userId)
      .single()

    // Use country from request body, then profile, then default to FR
    const country = req.body?.country || profile?.country || 'FR'

    // Create Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: profile?.display_name || profile?.username || 'ShaPop Seller',
        product_description: 'Live shopping sales on ShaPop',
      },
    })

    // Store the Stripe account ID
    await supabase
      .from('sellers')
      .update({ stripe_account_id: account.id })
      .eq('id', userId)

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_BASE_URL}/payments?stripe=refresh`,
      return_url: `${APP_BASE_URL}/payments?stripe=success`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url, account_id: account.id })
  } catch (err: any) {
    console.error('Stripe Connect error:', err)
    const msg = err?.message || err?.raw?.message || 'Failed to create Stripe account'
    res.status(500).json({ error: msg })
  }
})

// Check Stripe account status
router.get('/api/stripe/account-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, bank_choice, paypal_email')
      .eq('id', userId)
      .single()

    // Admin bypass: admins are always considered connected (no Stripe Connect needed)
    if (isAdminUser(req.user?.email)) {
      res.json({ connected: true, charges_enabled: true, payouts_enabled: true, payment_method: 'admin_bypass' })
      return
    }

    // PayPal sellers: considered connected if they have a paypal_email
    if (seller?.bank_choice === 'paypal' && seller?.paypal_email) {
      res.json({ connected: true, charges_enabled: true, payouts_enabled: true, payment_method: 'paypal' })
      return
    }

    if (!seller?.stripe_account_id) {
      res.json({ connected: false })
      return
    }

    const account = await stripe.accounts.retrieve(seller.stripe_account_id)

    res.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      account_id: seller.stripe_account_id,
      payment_method: 'stripe',
    })
  } catch (err) {
    console.error('Stripe status error:', err)
    res.status(500).json({ error: 'Failed to check account status' })
  }
})

// Create Stripe Express dashboard login link (for sellers to manage their account)
router.post('/api/stripe/dashboard-link', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (!seller?.stripe_account_id) {
      res.status(400).json({ error: 'No Stripe account connected' })
      return
    }

    const loginLink = await stripe.accounts.createLoginLink(seller.stripe_account_id)
    res.json({ url: loginLink.url })
  } catch (err) {
    console.error('Stripe dashboard link error:', err)
    res.status(500).json({ error: 'Failed to create dashboard link' })
  }
})

// Create a SetupIntent so a buyer can save a card before bidding
router.post('/api/stripe/create-setup-intent', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check if user already has a Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      })
      customerId = customer.id

      // Save customer ID in profiles
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create SetupIntent (card only — avoids redirect-based methods that break on Capacitor)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    })

    res.json({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    })
  } catch (err: any) {
    console.error('Stripe SetupIntent error:', err)
    res.status(500).json({ error: err?.message || 'Failed to create setup intent' })
  }
})

// Check if a buyer has a saved payment method (card on file)
router.get('/api/stripe/check-card', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Stripe, ou Rapyd (Israël) quand il est activé
    const hasCard = await userHasSavedCard(userId)

    // Check if buyer has at least one shipping address
    const { data: addresses } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    const hasAddress = (addresses && addresses.length > 0) || false

    res.json({ has_card: hasCard, has_address: hasAddress })
  } catch (err: any) {
    console.error('Check card error:', err)
    res.status(500).json({ error: err?.message || 'Failed to check card' })
  }
})

// Get buyer's saved card details (brand + last4)
router.get('/api/stripe/card-info', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, airwallex_customer_id')
      .eq('id', userId)
      .single()

    // Israël : carte enregistrée chez Airwallex
    if (profile?.airwallex_customer_id && awx.airwallexConfig().enabled) {
      const consent = await awx.latestVerifiedConsent(profile.airwallex_customer_id).catch(() => null)
      const card = consent?.payment_method?.card
      if (consent) {
        res.json({ has_card: true, provider: 'airwallex', brand: (card?.brand || 'card').toLowerCase(), last4: card?.last4 || '****', exp_month: card?.expiry_month ? Number(card.expiry_month) : undefined, exp_year: card?.expiry_year ? Number(card.expiry_year) : undefined })
        return
      }
    }

    if (!profile?.stripe_customer_id) {
      res.json({ has_card: false })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      res.json({ has_card: false })
      return
    }

    const pm = paymentMethods.data[0]
    res.json({
      has_card: true,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '****',
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    })
  } catch (err: any) {
    console.error('Card info error:', err)
    res.status(500).json({ error: err?.message || 'Failed to get card info' })
  }
})

// Delete saved card
router.delete('/api/stripe/card', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', req.user!.id).single()
    if (!profile?.stripe_customer_id) { res.json({ success: true }); return }
    const pms = await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: 'card' })
    for (const pm of pms.data) {
      await stripe.paymentMethods.detach(pm.id)
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[payments] delete card:', err)
    res.status(500).json({ error: 'Failed to delete card' })
  }
})

// =============================================
// RAPYD (Israël) — prestataire de l'utilisateur et page d'enregistrement de carte
// =============================================
router.get('/api/payments/provider', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { data: profile } = await supabase.from('profiles').select('country').eq('id', req.user!.id).maybeSingle()
  res.json({ provider: providerForCountry((profile as { country?: string | null } | null)?.country), rapyd_enabled: rapydConfig().enabled })
})

router.post('/api/rapyd/card-page', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!rapydConfig().enabled) { res.status(503).json({ error: 'rapyd_not_enabled' }); return }
    const userId = req.user!.id
    const { data: profile } = await supabase.from('profiles').select('rapyd_customer_id, display_name, username, country').eq('id', userId).maybeSingle()
    let customer = (profile as { rapyd_customer_id?: string | null } | null)?.rapyd_customer_id || null
    if (!customer) {
      const c = await createRapydCustomer({ name: profile?.display_name || profile?.username || 'ShaPop', email: req.user!.email, metadata: { user_id: userId } })
      customer = c.id
      await supabase.from('profiles').update({ rapyd_customer_id: customer }).eq('id', userId)
    }
    const lang = String(req.body?.lang || 'en').slice(0, 2)
    const page = await createSaveCardPage({
      customer, country: 'IL', currency: 'ILS', language: lang,
      completeUrl: `${APP_BASE_URL}/payments?card=saved`, cancelUrl: `${APP_BASE_URL}/payments?card=cancel`,
    })
    res.json({ redirect_url: page.redirect_url })
  } catch (err: any) {
    console.error('[rapyd] card-page', err?.message || err)
    res.status(500).json({ error: 'Failed to open card page' })
  }
})

// Vendeur israélien : portefeuille Rapyd + vérification d'identité
const SellerWalletBody = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().min(3).max(120),
  city: z.string().trim().min(1).max(60),
})

router.get('/api/rapyd/seller-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const [{ data: seller }, { data: profile }] = await Promise.all([
    supabase.from('sellers').select('rapyd_ewallet_id, rapyd_kyc_status').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('country').eq('id', userId).maybeSingle(),
  ])
  res.json({
    enabled: rapydConfig().enabled,
    country: (profile as { country?: string | null } | null)?.country || null,
    has_wallet: !!(seller as { rapyd_ewallet_id?: string | null } | null)?.rapyd_ewallet_id,
    kyc_status: (seller as { rapyd_kyc_status?: string | null } | null)?.rapyd_kyc_status || 'none',
  })
})

router.post('/api/rapyd/seller-wallet', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!rapydConfig().enabled) { res.status(503).json({ error: 'rapyd_not_enabled' }); return }
    const parsed = SellerWalletBody.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }); return }
    const userId = req.user!.id
    const { data: existing } = await supabase.from('sellers').select('rapyd_ewallet_id').eq('id', userId).maybeSingle()
    if ((existing as { rapyd_ewallet_id?: string | null } | null)?.rapyd_ewallet_id) { res.json({ success: true, already: true }); return }
    const b = parsed.data
    const w = await createPersonWallet({
      firstName: b.first_name, lastName: b.last_name, referenceId: `shapop_${userId}`, country: 'IL',
      email: req.user!.email, phone: b.phone, dateOfBirth: b.date_of_birth, addressLine1: b.address, city: b.city,
    })
    const contact = w.contacts?.data?.[0]?.id || null
    await supabase.from('sellers').upsert({ id: userId, rapyd_ewallet_id: w.id, rapyd_contact_id: contact, rapyd_kyc_status: 'none' }, { onConflict: 'id' })
    res.json({ success: true })
  } catch (err: any) {
    console.error('[rapyd] seller-wallet', err?.message || err)
    res.status(500).json({ error: 'Failed to create wallet' })
  }
})

router.post('/api/rapyd/seller-identity', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!rapydConfig().enabled) { res.status(503).json({ error: 'rapyd_not_enabled' }); return }
    const userId = req.user!.id
    const { data: seller } = await supabase.from('sellers').select('rapyd_ewallet_id, rapyd_contact_id').eq('id', userId).maybeSingle()
    const s = seller as { rapyd_ewallet_id?: string | null; rapyd_contact_id?: string | null } | null
    if (!s?.rapyd_ewallet_id || !s.rapyd_contact_id) { res.status(400).json({ error: 'wallet_required' }); return }
    const page = await createIdentityPage({
      ewallet: s.rapyd_ewallet_id, contact: s.rapyd_contact_id, country: 'IL', referenceId: `idv_${userId}_${Date.now()}`,
      completeUrl: `${APP_BASE_URL}/payouts-israel?idv=done`, cancelUrl: `${APP_BASE_URL}/payouts-israel?idv=cancel`,
    })
    await supabase.from('sellers').update({ rapyd_kyc_status: 'pending' }).eq('id', userId)
    res.json({ redirect_url: page.redirect_url })
  } catch (err: any) {
    console.error('[rapyd] seller-identity', err?.message || err)
    res.status(500).json({ error: 'Failed to open identity page' })
  }
})

// =============================================
// AIRWALLEX (Israël) — carte de l'acheteur et compte bancaire du vendeur
// =============================================
async function ensureAirwallexCustomer(userId: string, email?: string): Promise<string> {
  const { data: profile } = await supabase.from('profiles').select('airwallex_customer_id, display_name, username').eq('id', userId).maybeSingle()
  const existing = (profile as { airwallex_customer_id?: string | null } | null)?.airwallex_customer_id
  if (existing) return existing
  const c = await awx.createCustomer({ merchantCustomerId: userId, email, name: profile?.display_name || profile?.username || null })
  await supabase.from('profiles').update({ airwallex_customer_id: c.id }).eq('id', userId)
  return c.id
}

router.post('/api/airwallex/card-page', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!awx.airwallexConfig().enabled) { res.status(503).json({ error: 'airwallex_not_enabled' }); return }
    const customerId = await ensureAirwallexCustomer(req.user!.id, req.user!.email)
    const session = await awx.createSaveCardSession({ customerId, currency: 'ILS', successUrl: process.env.AIRWALLEX_SUCCESS_URL || 'https://shapop.onrender.com/card-saved' })
    res.json({ redirect_url: session.url })
  } catch (err: any) {
    console.error('[airwallex] card-page', err?.message || err, err?.code)
    res.status(500).json({ error: 'Failed to open card page' })
  }
})

const IsraeliBankBody = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  iban: z.string().trim().min(15).max(40),
  street: z.string().trim().min(3).max(120),
  city: z.string().trim().min(1).max(60),
  postcode: z.string().trim().max(12).optional(),
})

router.get('/api/payouts-il/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id
  const [{ data: seller }, { data: profile }] = await Promise.all([
    supabase.from('sellers').select('airwallex_beneficiary_id, payout_bank_last4').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('country').eq('id', userId).maybeSingle(),
  ])
  const sel = seller as { airwallex_beneficiary_id?: string | null; payout_bank_last4?: string | null } | null
  res.json({
    enabled: awx.airwallexConfig().enabled,
    country: (profile as { country?: string | null } | null)?.country || null,
    has_bank: !!sel?.airwallex_beneficiary_id,
    bank_last4: sel?.payout_bank_last4 || null,
  })
})

router.post('/api/payouts-il/bank', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!awx.airwallexConfig().enabled) { res.status(503).json({ error: 'airwallex_not_enabled' }); return }
    const parsed = IsraeliBankBody.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }); return }
    const b = parsed.data
    const iban = awx.normalizeIsraeliIban(b.iban)
    if (!iban) { res.status(400).json({ error: 'invalid_iban' }); return }
    const userId = req.user!.id
    const ben = await awx.createIsraeliBeneficiary({ firstName: b.first_name, lastName: b.last_name, iban, city: b.city, street: b.street, postcode: b.postcode || null, nickname: `shapop_${userId}` })
    const id = ben.beneficiary_id || ben.id
    if (!id) throw new Error('no beneficiary id')
    await supabase.from('sellers').upsert({ id: userId, airwallex_beneficiary_id: id, payout_bank_last4: iban.slice(-4) }, { onConflict: 'id' })
    res.json({ success: true, bank_last4: iban.slice(-4) })
  } catch (err: any) {
    console.error('[airwallex] bank', err?.message || err, err?.code, JSON.stringify(err?.details || '').slice(0, 300))
    res.status(err?.status === 400 ? 400 : 500).json({ error: err?.status === 400 ? 'bank_rejected' : 'Failed to save bank account' })
  }
})

// Page affichée par le navigateur intégré après l'enregistrement de la carte (Airwallex)
router.get('/card-saved', (_req: Request, res: Response) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShaPop</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0b0b0b;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h1{color:#22C55E;font-size:24px}p{color:#bbb;line-height:1.6}</style></head>
<body><div><h1>✓</h1><p>Card saved — you can close this page.<br>Carte enregistrée — tu peux fermer cette page.<br>Tarjeta guardada — puedes cerrar esta página.<br>Карта сохранена — можно закрыть страницу.<br>הכרטיס נשמר — אפשר לסגור את הדף.</p></div></body></html>`)
})

// Create a PaymentIntent when a buyer wins an auction
router.post('/api/stripe/create-payment-intent', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id, promo_code } = req.body
    const buyerId = req.user!.id

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('buyer_id', buyerId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id.startsWith('pi_')) {
      // Already has a real PaymentIntent
      const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      res.json({ client_secret: existing.client_secret, payment_intent_id: existing.id })
      return
    }

    // Get seller info (Stripe account + PayPal choice)
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, bank_choice, paypal_email')
      .eq('id', order.seller_id)
      .single()

    const isPaypalSeller = seller?.bank_choice === 'paypal' && seller?.paypal_email

    // Check if seller is an admin (bypass Stripe Connect requirement)
    const { data: sellerAuth } = await supabase.auth.admin.getUserById(order.seller_id)
    const isAdminSeller = isAdminUser(sellerAuth?.user?.email ?? undefined)

    // Commande Israël (Rapyd) : pas de compte Stripe du vendeur à vérifier
    const isRapydOrder = order.payment_provider === 'rapyd' || order.payment_provider === 'airwallex'

    if (!isRapydOrder && !isPaypalSeller && !isAdminSeller) {
      // Stripe seller: must have a connected Stripe account
      if (!seller?.stripe_account_id) {
        res.status(400).json({ error: 'Seller has not connected Stripe' })
        return
      }

      // Verify seller's Stripe account can accept payments
      const sellerAccount = await stripe.accounts.retrieve(seller.stripe_account_id)
      if (!sellerAccount.charges_enabled) {
        res.status(400).json({ error: 'Seller Stripe account is not fully onboarded' })
        return
      }
    }

    // L'acheteur doit d'abord choisir retrait en main propre ou envoi par la poste
    // (POST /api/orders/:id/fulfillment). Les frais de port sont payés MAINTENANT,
    // avec l'article (plus de prélèvement après coup).
    if (order.fulfillment_method !== 'pickup' && order.fulfillment_method !== 'post') {
      res.status(400).json({ error: 'fulfillment_required' })
      return
    }
    const shippingCost = order.fulfillment_method === 'post' ? Number(order.shipping_cost || 0) : 0
    const currency = String(order.currency || 'ILS').toLowerCase()

    // Check for active promotions and apply discounts
    const activePromo = await getActivePromotion()
    let promotionId: string | null = null

    if (activePromo) {
      promotionId = activePromo.id
    }

    // Recalculate fees server-side (don't trust client values)
    // Fees are calculated on item price only, not on shipping
    // If promotion reduces commission, apply that discount to the platform fee
    let fees = calculateFees(order.amount)
    if (activePromo && (activePromo.type === 'commission' || activePromo.type === 'both')) {
      const discountFactor = activePromo.discount_percent / 100
      const discountedPlatformFee = Math.round(fees.platformFee * (1 - discountFactor) * 100) / 100
      const newTotalFees = Math.round((discountedPlatformFee + fees.processingFee) * 100) / 100
      const newSellerPayout = Math.round((order.amount - newTotalFees) * 100) / 100
      fees = { ...fees, platformFee: discountedPlatformFee, totalFees: newTotalFees, sellerPayout: newSellerPayout }
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Promo] Commission discount ${activePromo.discount_percent}%: platformFee -> ${discountedPlatformFee}`)
      }
    }

    // Apply promo code discount (user-facing coupon)
    let promoCodeId: string | null = null
    let promoDiscount = 0
    let totalAmount = order.amount

    if (promo_code) {
      const validCode = await getValidPromoCode(promo_code, buyerId)
      if (validCode) {
        promoCodeId = validCode.id
        if (validCode.discount_type === 'item') {
          // Discount on the item price
          promoDiscount = Math.round(order.amount * (validCode.discount_percent / 100) * 100) / 100
          totalAmount = Math.round((order.amount - promoDiscount) * 100) / 100
          if (totalAmount < 0.50) totalAmount = 0.50 // Stripe minimum
          // Recalculate fees on discounted amount
          fees = calculateFees(totalAmount)
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[PromoCode] ${validCode.code}: -${validCode.discount_percent}% on item = -${promoDiscount}€ → ${totalAmount}€`)
          }
        } else if (validCode.discount_type === 'commission') {
          const discountFactor = validCode.discount_percent / 100
          const discountedPlatformFee = Math.round(fees.platformFee * (1 - discountFactor) * 100) / 100
          const newTotalFees = Math.round((discountedPlatformFee + fees.processingFee) * 100) / 100
          const newSellerPayout = Math.round((order.amount - newTotalFees) * 100) / 100
          fees = { ...fees, platformFee: discountedPlatformFee, totalFees: newTotalFees, sellerPayout: newSellerPayout }
        }
      }
    }

    // Le vendeur paie la poste : les frais de port lui reviennent (hors commission)
    if (shippingCost > 0) {
      fees = { ...fees, sellerPayout: Math.round((fees.sellerPayout + shippingCost) * 100) / 100 }
    }
    totalAmount = Math.round((totalAmount + shippingCost) * 100) / 100

    const amountCents = Math.round(totalAmount * 100)
    const feeCents = Math.round(fees.totalFees * 100)

    // Israël (Rapyd) : on prélève l'argent réservé à la fin de l'enchère (montant réel)
    if (isRapydOrder) {
      const prov = order.payment_provider as string
      const paid = prov === 'airwallex' ? await captureAirwallexOrder(order_id, totalAmount) : await captureRapydOrder(order_id, totalAmount)
      if (!paid) { res.status(402).json({ error: 'card_declined', provider: prov }); return }
      await supabase.from('orders').update({
        payout_method: prov, shipping_cost: shippingCost, total_amount: totalAmount,
        platform_fee: fees.platformFee, processing_fee: fees.processingFee, seller_payout: fees.sellerPayout,
        ...(promotionId ? { promotion_id: promotionId } : {}),
        ...(promoCodeId ? { promo_code_id: promoCodeId, promo_discount: promoDiscount } : {}),
      }).eq('id', order_id)
      await markOrderPaid(order_id)
      res.json({ auto_charged: true, provider: prov, shipping_cost: shippingCost, total_amount: totalAmount })
      return
    }

    // Check if buyer has a saved card — try to auto-charge
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', buyerId)
      .single()

    let defaultPaymentMethod: string | undefined
    if (buyerProfile?.stripe_customer_id) {
      const pms = await stripe.paymentMethods.list({
        customer: buyerProfile.stripe_customer_id,
        type: 'card',
        limit: 1,
      })
      if (pms.data.length > 0) {
        defaultPaymentMethod = pms.data[0].id
      }
    }

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency,
      metadata: {
        order_id: order.id,
        buyer_id: buyerId,
        seller_id: order.seller_id,
        item_id: order.item_id,
      },
      description: `ShaPop - Order ${order.id}`,
    }

    if (isPaypalSeller || isAdminSeller) {
      // PayPal/Admin seller: money stays on ShaPop's Stripe account (no transfer_data)
      if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] ${isAdminSeller ? 'Admin' : 'PayPal'} seller ${order.seller_id.slice(0, 8)} — no transfer_data`)
    } else {
      // Stripe seller: direct transfer with application fee (minimum 50 centimes)
      piParams.application_fee_amount = Math.max(50, feeCents)
      piParams.transfer_data = {
        destination: seller!.stripe_account_id!,
      }
    }

    // If buyer has a saved card, attach it and try to auto-charge
    if (buyerProfile?.stripe_customer_id && defaultPaymentMethod) {
      piParams.customer = buyerProfile.stripe_customer_id
      piParams.payment_method = defaultPaymentMethod
      piParams.off_session = true
      piParams.confirm = true
      piParams.payment_method_types = ['card']
    } else {
      piParams.automatic_payment_methods = { enabled: true }
    }

    let paymentIntent: Stripe.PaymentIntent
    let autoCharged = false

    // Carte déjà autorisée à la fin de l'enchère : on prélève le montant réel sur l'argent réservé
    const capturedAuth = order.auth_payment_intent_id
      ? await captureAuthorizedPayment(order.auth_payment_intent_id, amountCents, piParams.application_fee_amount ?? null)
      : null

    if (capturedAuth) {
      paymentIntent = capturedAuth
      autoCharged = true
    } else try {
      paymentIntent = await stripe.paymentIntents.create(piParams)
      autoCharged = paymentIntent.status === 'succeeded'
    } catch (stripeErr: any) {
      // If auto-charge fails (e.g. 3D Secure required, card declined),
      // fall back to manual payment
      if (stripeErr.type === 'StripeCardError' && stripeErr.payment_intent) {
        paymentIntent = stripeErr.payment_intent as Stripe.PaymentIntent
      } else {
        // Create without auto-charge as fallback
        delete piParams.customer
        delete piParams.payment_method
        delete piParams.off_session
        delete piParams.confirm
        delete piParams.payment_method_types
        piParams.automatic_payment_methods = { enabled: true }
        paymentIntent = await stripe.paymentIntents.create(piParams)
      }
    }

    // Update order with PaymentIntent ID, shipping cost, and total amount (+ mark paid if auto-charged)
    const updateData: Record<string, unknown> = {
      stripe_payment_intent_id: paymentIntent.id,
      payout_method: isPaypalSeller ? 'paypal' : 'stripe',
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      platform_fee: fees.platformFee,
      processing_fee: fees.processingFee,
      seller_payout: fees.sellerPayout,
    }
    if (promotionId) {
      updateData.promotion_id = promotionId
    }
    if (promoCodeId) {
      updateData.promo_code_id = promoCodeId
      updateData.promo_discount = promoDiscount
    }
    const { error: dbUpdateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    // Débit automatique réussi : passage « payée » commun (code de retrait, délai de remise…)
    if (autoCharged && !dbUpdateError) {
      await markOrderPaid(order_id)
    }

    if (dbUpdateError) {
      console.error('DB update failed after PaymentIntent creation, cancelling PaymentIntent:', dbUpdateError)
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id)
      } catch (cancelErr) {
        console.error('Failed to cancel PaymentIntent after DB error:', cancelErr)
      }
      res.status(500).json({ error: 'Failed to create payment' })
      return
    }

    // Record promo code usage synchronously to prevent abuse on limited coupons
    if (promoCodeId) {
      try {
        const { error: useErr } = await supabase.from('promo_code_uses').insert({ promo_code_id: promoCodeId, user_id: buyerId, order_id: order_id })
        if (!useErr) {
          // Increment usage count
          const { data: pc } = await supabase.from('promo_codes').select('current_uses').eq('id', promoCodeId).single()
          if (pc) await supabase.from('promo_codes').update({ current_uses: (pc.current_uses || 0) + 1 }).eq('id', promoCodeId)
        } else {
          console.error('[PromoCode] Usage insert failed (possible duplicate):', useErr.message)
        }
      } catch (err) {
        console.error('[PromoCode] Usage record failed:', err)
      }
    }

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      auto_charged: autoCharged,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      promo_discount: promoDiscount || undefined,
    })
  } catch (err: any) {
    console.error('Stripe PaymentIntent error:', err)
    res.status(500).json({ error: err?.message || 'Failed to create payment' })
  }
})

// Confirm payment — client calls this after stripe.confirmPayment() succeeds
// This is the reliable "pull" approach: we check the PaymentIntent status directly with Stripe
router.post('/api/stripe/confirm-payment', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id, payment_intent_id } = req.body
    const buyerId = req.user!.id

    if (!order_id || !payment_intent_id) {
      res.status(400).json({ error: 'Missing order_id or payment_intent_id' })
      return
    }

    // Verify the order belongs to this buyer
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('buyer_id', buyerId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // C5 fix: Validate that the payment_intent_id matches the one stored on the order
    // This prevents a malicious user from using a different succeeded PI to mark orders as paid
    if (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== payment_intent_id) {
      res.status(400).json({ error: 'Payment intent mismatch' })
      return
    }

    // Idempotency: prevent double confirmation
    if (order.status !== 'pending_payment') {
      res.json({ success: true, message: 'Order already processed' })
      return
    }

    // Check the PaymentIntent status directly with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status === 'succeeded') {
      await markOrderPaid(order_id)
      if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Order ${order_id} confirmed paid via direct check`)
      res.json({ success: true, status: 'paid' })
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      res.json({ success: false, status: paymentIntent.status, message: '3D Secure or additional action required' })
    } else {
      res.json({ success: false, status: paymentIntent.status })
    }
  } catch (err) {
    console.error('Stripe confirm-payment error:', err)
    res.status(500).json({ error: 'Failed to confirm payment' })
  }
})

// Get Stripe publishable key (for client)
router.get('/api/stripe/config', (_req: Request, res: Response) => {
  res.json({ publishable_key: process.env.STRIPE_PUBLISHABLE_KEY })
})

// =============================================
// PAYPAL PAYOUTS
// =============================================

// Save PayPal email for seller
router.post('/api/paypal/save-email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body
    const userId = req.user!.id

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Invalid PayPal email' })
      return
    }

    // Verify user is a seller
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', userId)
      .single()

    if (!seller) {
      res.status(403).json({ error: 'Not a seller' })
      return
    }

    await supabase
      .from('sellers')
      .update({ paypal_email: email, bank_choice: 'paypal' })
      .eq('id', userId)

    if (process.env.NODE_ENV !== 'production') console.log(`[PayPal] Seller ${userId.slice(0, 8)} saved PayPal email`)
    res.json({ success: true })
  } catch (err) {
    console.error('PayPal save-email error:', err)
    res.status(500).json({ error: 'Failed to save PayPal email' })
  }
})

// Get PayPal payout status for seller
router.get('/api/paypal/payout-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data: seller } = await supabase
      .from('sellers')
      .select('paypal_email, bank_choice')
      .eq('id', userId)
      .single()

    if (!seller) {
      res.status(404).json({ error: 'Seller not found' })
      return
    }

    // Get recent payouts
    const { data: payouts } = await supabase
      .from('paypal_payouts')
      .select('id, order_id, amount, currency, status, error_message, completed_at, created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      paypal_email: seller.paypal_email,
      bank_choice: seller.bank_choice,
      payouts: payouts || [],
    })
  } catch (err) {
    console.error('PayPal payout-status error:', err)
    res.status(500).json({ error: 'Failed to get payout status' })
  }
})

// Process PayPal payouts - called from run-automations and setInterval
export async function processPaypalPayouts(): Promise<number> {
  let processed = 0

  // Step 1: Transition pending -> ready when conditions are met
  // Conditions: order delivered + claim window closed (payout_status = 'released') + payout_scheduled_at passed
  const { data: pendingPayouts } = await supabase
    .from('paypal_payouts')
    .select('id, order_id')
    .eq('status', 'pending')

  for (const payout of (pendingPayouts || [])) {
    const { data: order } = await supabase
      .from('orders')
      .select('status, payout_status, claim_deadline, payout_scheduled_at')
      .eq('id', payout.order_id)
      .single()

    if (!order) continue

    const now = new Date()
    const claimClosed = order.payout_status === 'released'
    const payoutTimeReached = !order.payout_scheduled_at || new Date(order.payout_scheduled_at) <= now

    if (claimClosed && payoutTimeReached) {
      await supabase
        .from('paypal_payouts')
        .update({ status: 'ready' })
        .eq('id', payout.id)
    }
  }

  // Step 1b: Retry failed payouts with < 3 attempts (exponential backoff)
  const { data: failedPayouts } = await supabase
    .from('paypal_payouts')
    .select('id, attempts, updated_at')
    .eq('status', 'failed')
    .lt('attempts', 3)

  if (failedPayouts && failedPayouts.length > 0) {
    const now = Date.now()
    let requeued = 0
    for (const p of failedPayouts as { id: string; attempts: number; updated_at: string }[]) {
      // Exponential backoff: 5min, 30min, 2h based on attempt count
      const delayMs = [5 * 60_000, 30 * 60_000, 2 * 3600_000][p.attempts] || 2 * 3600_000
      const lastAttempt = new Date(p.updated_at).getTime()
      if (now - lastAttempt < delayMs) continue // Too early to retry
      await supabase
        .from('paypal_payouts')
        .update({ status: 'ready', error_message: null })
        .eq('id', p.id)
      requeued++
    }
    if (requeued > 0 && process.env.NODE_ENV !== 'production') console.log(`[PayPal Payouts] Re-queued ${requeued} failed payout(s) for retry (exponential backoff)`)
  }

  // Step 2: Batch-send ready payouts via PayPal Payouts API
  const { data: readyPayouts } = await supabase
    .from('paypal_payouts')
    .select('*')
    .eq('status', 'ready')
    .lt('attempts', 3)
    .limit(50)

  if (!readyPayouts || readyPayouts.length === 0) return 0

  try {
    const token = await getPaypalAccessToken()

    const items = readyPayouts.map(p => ({
      recipient_type: 'EMAIL',
      amount: {
        value: p.amount.toFixed(2),
        currency: p.currency || 'EUR',
      },
      receiver: p.paypal_email,
      note: `ShaPop payout for order ${p.order_id.slice(0, 8)}`,
      sender_item_id: p.id,
    }))

    const batchId = `ShaPop_${Date.now()}`

    const payoutResp = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: 'You have a payment from ShaPop',
          email_message: 'You received a payout for your sale on ShaPop.',
        },
        items,
      }),
    })

    if (!payoutResp.ok) {
      const errText = await payoutResp.text()
      console.error(`[PayPal Payouts] Batch send failed: ${payoutResp.status} ${errText}`)
      // Mark all as failed with incremented attempts
      for (const p of readyPayouts) {
        await supabase
          .from('paypal_payouts')
          .update({ attempts: p.attempts + 1, error_message: `Batch failed: ${payoutResp.status}` })
          .eq('id', p.id)
      }
      return 0
    }

    const payoutData = await payoutResp.json() as {
      batch_header?: { payout_batch_id?: string }
      items?: Array<{ payout_item_id?: string; payout_item?: { sender_item_id?: string } }>
    }
    const batchHeader = payoutData.batch_header

    // Update payouts with batch info
    for (const p of readyPayouts) {
      await supabase
        .from('paypal_payouts')
        .update({
          status: 'processing',
          paypal_batch_id: batchHeader?.payout_batch_id || batchId,
          attempts: p.attempts + 1,
        })
        .eq('id', p.id)
      processed++
    }

    // Try to get individual item IDs from the response
    if (payoutData.items) {
      for (const item of payoutData.items) {
        if (item.payout_item_id && item.payout_item?.sender_item_id) {
          await supabase
            .from('paypal_payouts')
            .update({ paypal_item_id: item.payout_item_id })
            .eq('id', item.payout_item.sender_item_id)
        }
      }
    }

    if (process.env.NODE_ENV !== 'production') console.log(`[PayPal Payouts] Batch ${batchId} sent with ${readyPayouts.length} items`)
  } catch (err) {
    console.error('[PayPal Payouts] Error:', err)
    for (const p of readyPayouts) {
      await supabase
        .from('paypal_payouts')
        .update({ attempts: p.attempts + 1, error_message: String(err) })
        .eq('id', p.id)
    }
  }

  return processed
}

export default router

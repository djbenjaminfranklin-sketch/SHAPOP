import { Router } from 'express'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { supabase, stripe, APP_BASE_URL, PAYPAL_BASE_URL, PAYPAL_MODE, ADMIN_EMAILS } from '../config'
import { requireAuth, paymentLimiter } from '../middleware'
import { calculateFees, calculateShippingCost, getCarrierForZone, getPaypalAccessToken, getZoneFromCountry } from '../utils'
import { getActivePromotion } from './promotions'
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      res.json({ has_card: false })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    res.json({ has_card: paymentMethods.data.length > 0 })
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
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

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
  } catch {
    res.status(500).json({ error: 'Failed to delete card' })
  }
})

// Create a PaymentIntent when a buyer wins an auction
router.post('/api/stripe/create-payment-intent', paymentLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { order_id } = req.body
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

    if (!isPaypalSeller && !isAdminSeller) {
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

    // Calculate shipping cost if item has weight and order has a carrier
    // Determine shipping zone from buyer's shipping address (country + zip)
    let shippingCost = 0
    let sellerShippingAbsorption = 0
    if (order.item_id) {
      const { data: item } = await supabase
        .from('items')
        .select('weight_grams, seller_shipping_override')
        .eq('id', order.item_id)
        .single()

      if (item?.weight_grams) {
        // Get zone from shipping address on the order, or fall back to buyer's profile country
        let buyerCountry: string | undefined
        let buyerZip: string | undefined

        if (order.shipping_address) {
          const addr = order.shipping_address as Record<string, string>
          buyerCountry = addr.country
          buyerZip = addr.zip
        }

        // Fall back to profile country if no country on shipping address
        if (!buyerCountry) {
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('country')
            .eq('id', buyerId)
            .single()
          buyerCountry = buyerProfile?.country || undefined
        }

        const zone = getZoneFromCountry(buyerCountry, buyerZip)
        // Auto-determine carrier from zone
        const orderCarrier = order.carrier || getCarrierForZone(zone)
        const realCarrierCost = calculateShippingCost(item.weight_grams, orderCarrier, zone)

        if (item.seller_shipping_override != null && Number(item.seller_shipping_override) > 0) {
          // Seller set a custom shipping price — buyer pays the override price
          shippingCost = Number(item.seller_shipping_override)
          // If seller's price is lower than real cost, they absorb the difference
          if (shippingCost < realCarrierCost) {
            sellerShippingAbsorption = Math.round((realCarrierCost - shippingCost) * 100) / 100
          }
          if (process.env.NODE_ENV !== 'production') console.log(`[Shipping] Seller override: ${shippingCost}EUR (real: ${realCarrierCost}EUR, absorption: ${sellerShippingAbsorption}EUR)`)
        } else {
          shippingCost = realCarrierCost
        }
      }
    }

    // Check for active promotions and apply discounts
    const activePromo = await getActivePromotion()
    let promotionId: string | null = null

    if (activePromo) {
      promotionId = activePromo.id
      const discountFactor = activePromo.discount_percent / 100

      // Apply shipping discount
      if ((activePromo.type === 'shipping' || activePromo.type === 'both') && shippingCost > 0) {
        const originalShipping = shippingCost
        shippingCost = Math.round(shippingCost * (1 - discountFactor) * 100) / 100
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Promo] Shipping discount ${activePromo.discount_percent}%: ${originalShipping} -> ${shippingCost}`)
        }
      }
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

    // Check if seller has a pending shipping deduction (surplus from previous weight errors)
    let sellerShippingDeduction = 0
    const { data: sellerTrust } = await supabase
      .from('seller_trust')
      .select('shipping_balance')
      .eq('seller_id', order.seller_id)
      .single()
    if (sellerTrust && (sellerTrust as Record<string, unknown>).shipping_balance != null) {
      const balance = Number((sellerTrust as Record<string, unknown>).shipping_balance)
      if (balance < 0) {
        // Negative balance = seller owes money from past weight errors
        sellerShippingDeduction = Math.abs(balance)
        // Clear the balance
        await supabase
          .from('seller_trust')
          .update({ shipping_balance: 0 })
          .eq('seller_id', order.seller_id)
        if (process.env.NODE_ENV !== 'production') console.log(`[Shipping] Deducting ${sellerShippingDeduction}EUR from seller payout (past weight error)`)
      }
    }

    const totalAmount = Math.round((order.amount + shippingCost) * 100) / 100
    const amountCents = Math.round(totalAmount * 100)
    const feeCents = Math.round(fees.totalFees * 100)

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
      currency: 'eur',
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
      // Add shipping absorption + any deduction from past weight errors
      const absorptionCents = Math.round(sellerShippingAbsorption * 100)
      const deductionCents = Math.round(sellerShippingDeduction * 100)
      piParams.application_fee_amount = Math.max(50, feeCents + absorptionCents + deductionCents)
      piParams.transfer_data = {
        destination: seller!.stripe_account_id!,
      }
      if ((absorptionCents > 0 || deductionCents > 0) && process.env.NODE_ENV !== 'production') {
        console.log(`[Stripe] Seller deductions: absorption=${sellerShippingAbsorption}EUR, past_debt=${sellerShippingDeduction}EUR added to application_fee`)
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

    try {
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
      status: autoCharged ? 'paid' : 'pending_payment',
      payout_method: isPaypalSeller ? 'paypal' : 'stripe',
      shipping_cost: shippingCost,
      total_amount: totalAmount,
    }
    if (promotionId) {
      updateData.promotion_id = promotionId
    }
    if (autoCharged) {
      updateData.paid_at = new Date().toISOString()
      updateData.payout_status = 'held'
      updateData.tracking_status = 'pending'
    }

    const { error: dbUpdateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    // If auto-charged + PayPal seller, create payout record immediately
    if (autoCharged && isPaypalSeller && seller?.paypal_email) {
      const fees = calculateFees(order.amount)
      // Deduct seller shipping absorption + past weight error debt from PayPal payout
      const paypalPayoutAmount = Math.round((fees.sellerPayout - sellerShippingAbsorption - sellerShippingDeduction) * 100) / 100
      await supabase.from('paypal_payouts').insert({
        order_id: order_id,
        seller_id: order.seller_id,
        paypal_email: seller.paypal_email,
        amount: paypalPayoutAmount,
        currency: 'EUR',
        status: 'pending',
      })
      if (process.env.NODE_ENV !== 'production') console.log(`[PayPal] Auto-charged: created payout record for order ${order_id}`)
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

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      auto_charged: autoCharged,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
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

    // Idempotency: prevent double confirmation
    if (order.status !== 'pending_payment') {
      res.json({ success: true, message: 'Order already processed' })
      return
    }

    // Check the PaymentIntent status directly with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status === 'succeeded') {
      // Look up seller trust for holdback
      let holdbackPercent = 0
      let payoutScheduledAt: string | null = null
      let payoutMethod = 'stripe'

      const { data: trust } = await supabase
        .from('seller_trust')
        .select('holdback_percent, payout_delay_days')
        .eq('seller_id', order.seller_id)
        .single()
      if (trust) {
        holdbackPercent = trust.holdback_percent
        const payoutDate = new Date()
        payoutDate.setDate(payoutDate.getDate() + trust.payout_delay_days)
        payoutScheduledAt = payoutDate.toISOString()
      }

      // Check if seller uses PayPal
      const { data: sellerInfo } = await supabase
        .from('sellers')
        .select('bank_choice, paypal_email')
        .eq('id', order.seller_id)
        .single()

      if (sellerInfo?.bank_choice === 'paypal' && sellerInfo?.paypal_email) {
        payoutMethod = 'paypal'
      }

      // Escrow: payment is held until delivery is confirmed (buyer confirms, tracking shows delivered, or 14-day auto-release)
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          holdback_percent: holdbackPercent,
          payout_scheduled_at: payoutScheduledAt,
          payout_method: payoutMethod,
          payout_status: 'held',
          tracking_status: 'pending',
        })
        .eq('id', order_id)

      // If PayPal seller, create a paypal_payouts record (status 'pending' — will become 'ready' when delivery confirmed)
      if (payoutMethod === 'paypal' && sellerInfo?.paypal_email) {
        const fees = calculateFees(order.amount)

        // Check if seller has a shipping override that is lower than real cost — deduct absorption from payout
        let confirmAbsorption = 0
        if (order.item_id) {
          const { data: itemForShipping } = await supabase
            .from('items')
            .select('weight_grams, seller_shipping_override')
            .eq('id', order.item_id)
            .single()
          if (itemForShipping?.weight_grams && itemForShipping.seller_shipping_override != null && Number(itemForShipping.seller_shipping_override) > 0) {
            let cBuyerCountry: string | undefined
            let cBuyerZip: string | undefined
            if (order.shipping_address) {
              const addr = order.shipping_address as Record<string, string>
              cBuyerCountry = addr.country
              cBuyerZip = addr.zip
            }
            if (!cBuyerCountry) {
              const { data: cProfile } = await supabase.from('profiles').select('country').eq('id', order.buyer_id).single()
              cBuyerCountry = cProfile?.country || undefined
            }
            const cZone = getZoneFromCountry(cBuyerCountry, cBuyerZip)
            const confirmCarrier = order.carrier || getCarrierForZone(cZone)
            const realCost = calculateShippingCost(itemForShipping.weight_grams, confirmCarrier, cZone)
            if (Number(itemForShipping.seller_shipping_override) < realCost) {
              confirmAbsorption = Math.round((realCost - Number(itemForShipping.seller_shipping_override)) * 100) / 100
            }
          }
        }

        const paypalPayoutAmount = Math.round((fees.sellerPayout - confirmAbsorption) * 100) / 100

        // Check if payout record already exists (webhook may have created it)
        const { data: existingPayout } = await supabase
          .from('paypal_payouts')
          .select('id')
          .eq('order_id', order_id)
          .maybeSingle()

        if (!existingPayout) {
          await supabase.from('paypal_payouts').insert({
            order_id: order_id,
            seller_id: order.seller_id,
            paypal_email: sellerInfo.paypal_email,
            amount: paypalPayoutAmount,
            currency: 'EUR',
            status: 'pending',
          })
          if (process.env.NODE_ENV !== 'production') console.log(`[PayPal] Created payout record for order ${order_id} (${paypalPayoutAmount} EUR, absorption: ${confirmAbsorption} EUR, held until delivery)`)
        }
      }

      // Auto-create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('order_id', order_id)
        .maybeSingle()

      if (!existingConv) {
        await supabase.from('conversations').insert({
          type: 'order',
          order_id: order_id,
          participant_1: order.buyer_id,
          participant_2: order.seller_id,
        })
      }

      // Ensure seller has a trust record
      const { data: existingTrust } = await supabase
        .from('seller_trust')
        .select('seller_id')
        .eq('seller_id', order.seller_id)
        .maybeSingle()
      if (!existingTrust) {
        await supabase.from('seller_trust').insert({ seller_id: order.seller_id })
      }

      // Ensure buyer has a score record
      const { data: existingScore } = await supabase
        .from('buyer_scores')
        .select('user_id')
        .eq('user_id', order.buyer_id)
        .maybeSingle()
      if (!existingScore) {
        await supabase.from('buyer_scores').insert({ user_id: order.buyer_id })
      }

      if (process.env.NODE_ENV !== 'production') console.log(`[Stripe] Order ${order_id} confirmed paid via direct check (payout: ${payoutMethod})`)
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

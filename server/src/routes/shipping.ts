import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase, stripe } from '../config'
import { requireAuth } from '../middleware'
import { calculateShippingCost, getCarrierForZone, getShippingOptions, getZoneFromCountry, paramStr } from '../utils'
import {
  searchRelayPoints,
  createShipment,
  trackShipment,
  getMondialRelayTrackingUrl,
  isMondialRelayConfigured,
  isMondialRelayShipmentConfigured,
} from '../services/mondialrelay'
import { isDpdConfigured, createDpdShipment, getDpdTrackingUrl } from '../services/dpd'
import { isDhlConfigured, createDhlShipment, getDhlTrackingUrl } from '../services/dhl'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// Helper: charge shipping off-session on buyer's saved card
// =============================================
async function chargeShippingOffSession(
  buyerId: string,
  orderId: string,
  shippingCost: number,
): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
  // 1. Get buyer's stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', buyerId)
    .single()

  if (!profile?.stripe_customer_id) {
    return { success: false, error: 'L\'acheteur n\'a pas de carte enregistree' }
  }

  // 2. Get default payment method
  const pms = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: 'card',
    limit: 1,
  })

  if (pms.data.length === 0) {
    return { success: false, error: 'L\'acheteur n\'a pas de carte enregistree' }
  }

  const paymentMethodId = pms.data[0].id
  const amountCents = Math.round(shippingCost * 100)

  // 3. Create and confirm PaymentIntent off-session
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      payment_method_types: ['card'],
      metadata: {
        order_id: orderId,
        buyer_id: buyerId,
        type: 'shipping',
      },
      description: `ShaPop - Frais de port commande ${orderId}`,
    })

    if (pi.status === 'succeeded') {
      return { success: true, paymentIntentId: pi.id }
    }

    return { success: false, error: 'Le paiement necessite une action supplementaire (3DS)' }
  } catch (err: any) {
    const message = err?.raw?.message || err?.message || 'Paiement refuse'
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Shipping] Off-session charge failed for order ${orderId}:`, message)
    }
    return { success: false, error: message }
  }
}

// =============================================
// GET /api/shipping/calculate — Public shipping cost preview
// =============================================
router.get('/api/shipping/calculate', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)
  const carrier = req.query.carrier as string
  const country = req.query.country as string | undefined
  const zip = req.query.zip as string | undefined

  if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
    res.status(400).json({ error: 'weight_grams must be a positive integer' })
    return
  }

  if (!carrier) {
    res.status(400).json({ error: 'carrier is required' })
    return
  }

  const zone = getZoneFromCountry(country, zip)
  const autoCarrier = carrier || getCarrierForZone(zone)
  const shippingCost = calculateShippingCost(weightGrams, autoCarrier, zone)

  res.json({
    shipping_cost: shippingCost,
    carrier: autoCarrier,
    weight_grams: weightGrams,
    zone,
  })
})

// =============================================
// GET /api/shipping/options — Get all carrier options for a weight
// =============================================
router.get('/api/shipping/options', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)
  const country = req.query.country as string | undefined
  const zip = req.query.zip as string | undefined

  if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
    res.status(400).json({ error: 'weight_grams must be a positive integer' })
    return
  }

  const zone = getZoneFromCountry(country, zip)
  const options = getShippingOptions(weightGrams, zone)

  res.json({
    weight_grams: weightGrams,
    zone,
    options,
  })
})

// =============================================
// GET /api/shipping/relay-points — Search Mondial Relay points near a zip code
// Public endpoint (used during checkout)
// =============================================
router.get('/api/shipping/relay-points', async (req: Request, res: Response) => {
  const country = (req.query.country as string) || 'FR'
  const zip = req.query.zip as string
  const city = req.query.city as string | undefined
  const weight = req.query.weight ? parseInt(req.query.weight as string, 10) : undefined
  const nb = req.query.nb ? parseInt(req.query.nb as string, 10) : 10

  if (!zip) {
    res.status(400).json({ error: 'zip is required' })
    return
  }

  if (!isMondialRelayConfigured()) {
    res.status(503).json({ error: 'Mondial Relay not configured' })
    return
  }

  try {
    const result = await searchRelayPoints({ country, zip, city, weight, nbResults: nb })
    if (result.error) {
      res.status(502).json({ error: result.error })
      return
    }
    res.json({ points: result.points })
  } catch (err) {
    console.error('[shipping] Relay point search error:', err)
    res.status(500).json({ error: 'Failed to search relay points' })
  }
})

// =============================================
// POST /api/orders/:id/select-relay — Buyer selects a Mondial Relay point
// =============================================
router.post('/api/orders/:id/select-relay', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const userId = req.user!.id
    const { relay_point_id, relay_point_name } = req.body

    if (!relay_point_id || typeof relay_point_id !== 'string') {
      res.status(400).json({ error: 'relay_point_id is required' })
      return
    }

    // Verify order belongs to buyer and is pending payment
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, buyer_id, status')
      .eq('id', orderId)
      .eq('buyer_id', userId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.status !== 'pending_payment') {
      res.status(400).json({ error: 'Relay point can only be selected before payment' })
      return
    }

    await supabase
      .from('orders')
      .update({
        relay_point_id: relay_point_id.trim(),
        relay_point_name: (relay_point_name || '').trim() || null,
      })
      .eq('id', orderId)

    res.json({ success: true, relay_point_id, relay_point_name })
  } catch (err) {
    console.error('[shipping] Select relay error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/:id/create-label — Seller generates a Mondial Relay shipping label
// ShaPop acts as intermediary: creates shipment via our MR contract
// =============================================
router.post('/api/orders/:id/create-label', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const userId = req.user!.id

    // Fetch order with item details
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, shipping_address, item_id, carrier, label_url, tracking_number, relay_point_id, relay_point_name, shipping_cost')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can create a shipping label' })
      return
    }

    if (!['paid', 'preparing', 'shipped'].includes(order.status)) {
      res.status(400).json({ error: 'Order must be paid to generate a label' })
      return
    }

    // Determine carrier
    const buyerAddr = order.shipping_address as Record<string, string>
    const shippingZone = buyerAddr ? getZoneFromCountry(buyerAddr.country, buyerAddr.zip) : 'france'
    const carrier = order.carrier || getCarrierForZone(shippingZone)

    // Return existing label if already generated
    if (order.label_url && order.tracking_number) {
      const trackingUrl = carrier === 'dpd' ? getDpdTrackingUrl(order.tracking_number)
        : carrier === 'dhl' ? getDhlTrackingUrl(order.tracking_number)
        : getMondialRelayTrackingUrl(order.tracking_number)
      res.json({
        shipment_number: order.tracking_number,
        label_url: order.label_url,
        tracking_url: trackingUrl,
        already_exists: true,
      })
      return
    }

    if (!order.shipping_address) {
      res.status(400).json({ error: 'Buyer has not provided a shipping address' })
      return
    }

    // Check carrier configuration
    if (carrier === 'mondial_relay' && !isMondialRelayShipmentConfigured()) {
      res.status(503).json({ error: 'Mondial Relay shipment API not configured' })
      return
    }
    if (carrier === 'dpd' && !isDpdConfigured()) {
      res.status(503).json({ error: 'DPD not configured yet' })
      return
    }
    if (carrier === 'dhl' && !isDhlConfigured()) {
      res.status(503).json({ error: 'DHL Express not configured yet' })
      return
    }

    // Get item weight — seller can override via request body
    const { data: item } = await supabase
      .from('items')
      .select('title, weight_grams')
      .eq('id', order.item_id)
      .single()

    const manualWeight = req.body?.weight_grams ? Number(req.body.weight_grams) : null
    const weight = manualWeight || item?.weight_grams || 500 // Manual > item > default 500g

    // Calculate shipping cost and charge buyer off-session BEFORE generating label
    const shippingCost = calculateShippingCost(weight, carrier, shippingZone)

    if (shippingCost > 0 && !(order.shipping_cost > 0)) {
      // Double-check Stripe: maybe buyer was already charged but DB update failed
      let alreadyPaidInStripe = false
      try {
        const existingPIs = await stripe.paymentIntents.search({
          query: `metadata["order_id"]:"${orderId}" metadata["type"]:"shipping" status:"succeeded"`,
        })
        if (existingPIs.data.length > 0) {
          alreadyPaidInStripe = true
          console.log(`[Shipping] Found existing Stripe charge for order ${orderId}, skipping`)
          // Fix DB: save the shipping cost that was already charged
          await supabase.from('orders').update({ shipping_cost: shippingCost }).eq('id', orderId)
        }
      } catch (searchErr) {
        console.error('[Shipping] Stripe search failed, proceeding with charge check:', searchErr)
      }

      if (!alreadyPaidInStripe) {
        const chargeResult = await chargeShippingOffSession(order.buyer_id, orderId, shippingCost)
        if (!chargeResult.success) {
          res.status(402).json({ error: chargeResult.error || 'Le paiement des frais de port a echoue' })
          return
        }

        // Store shipping cost (and payment intent if column exists)
        const { error: costErr } = await supabase
          .from('orders')
          .update({
            shipping_cost: shippingCost,
            shipping_payment_intent_id: chargeResult.paymentIntentId,
          })
          .eq('id', orderId)

        // If update failed (shipping_payment_intent_id column might not exist), retry with just shipping_cost
        if (costErr) {
          console.error(`[shipping] Cost update failed, retrying without payment_intent_id:`, costErr.message)
          await supabase
            .from('orders')
            .update({ shipping_cost: shippingCost })
            .eq('id', orderId)
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Shipping] Charged ${shippingCost}EUR shipping for order ${orderId} (PI: ${chargeResult.paymentIntentId})`)
        }
      }
    }

    // Get seller's return address (for sender)
    const { data: seller } = await supabase
      .from('sellers')
      .select('return_address, store_name')
      .eq('id', userId)
      .single()

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('display_name, phone_number')
      .eq('id', userId)
      .single()

    const returnAddr = seller?.return_address as Record<string, string> | null
    if (!returnAddr || !returnAddr.street || !returnAddr.city || !returnAddr.zip) {
      res.status(400).json({ error: 'Seller must set a return address before generating labels' })
      return
    }

    const buyerNameParts = (buyerAddr.name || '').split(' ')

    // Get buyer profile for phone/email
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', order.buyer_id)
      .single()

    // Get emails from auth
    const { data: buyerAuth } = await supabase.auth.admin.getUserById(order.buyer_id)
    const { data: sellerAuth } = await supabase.auth.admin.getUserById(userId)
    const buyerEmail = buyerAuth?.user?.email || ''
    const sellerEmail = sellerAuth?.user?.email || ''

    // Dispatch to the right carrier
    let shipResult: { shipmentNumber: string; labelUrl: string; error?: string }

    if (carrier === 'mondial_relay') {
      shipResult = await createShipment({
        orderNo: orderId.slice(0, 15),
        weight,
        content: item?.title || 'Article ShaPop',
        sender: {
          firstname: sellerProfile?.display_name?.split(' ')[0] || 'ShaPop',
          lastname: sellerProfile?.display_name?.split(' ').slice(1).join(' ') || 'Seller',
          street: returnAddr.street,
          postCode: returnAddr.zip,
          city: returnAddr.city,
          countryCode: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          mobile: sellerProfile?.phone_number || '',
          email: sellerEmail,
        },
        recipient: {
          firstname: buyerNameParts[0] || 'Acheteur',
          lastname: buyerNameParts.slice(1).join(' ') || 'ShaPop',
          street: buyerAddr.street || '',
          postCode: buyerAddr.zip || '',
          city: buyerAddr.city || '',
          countryCode: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          mobile: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: buyerEmail,
        },
        relayPointId: order.relay_point_id || undefined,
      })
    } else if (carrier === 'dpd') {
      shipResult = await createDpdShipment({
        orderNo: orderId.slice(0, 15),
        weight,
        content: item?.title || 'Article ShaPop',
        sender: {
          name: sellerProfile?.display_name || 'ShaPop Seller',
          street: returnAddr.street,
          city: returnAddr.city,
          zip: returnAddr.zip,
          country: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          email: '',
        },
        recipient: {
          name: buyerAddr.name || 'Acheteur',
          street: buyerAddr.street || '',
          city: buyerAddr.city || '',
          zip: buyerAddr.zip || '',
          country: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: '',
        },
      })
    } else if (carrier === 'dhl') {
      shipResult = await createDhlShipment({
        orderNo: orderId.slice(0, 15),
        weight,
        content: item?.title || 'Article ShaPop',
        sender: {
          name: sellerProfile?.display_name || 'ShaPop Seller',
          street: returnAddr.street,
          city: returnAddr.city,
          zip: returnAddr.zip,
          country: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          email: '',
        },
        recipient: {
          name: buyerAddr.name || 'Acheteur',
          street: buyerAddr.street || '',
          city: buyerAddr.city || '',
          zip: buyerAddr.zip || '',
          country: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: '',
        },
      })
    } else {
      res.status(400).json({ error: `Unsupported carrier: ${carrier}` })
      return
    }

    if (shipResult.error || !shipResult.shipmentNumber) {
      console.error(`[shipping] Label creation failed (${carrier}):`, shipResult.error)
      res.status(502).json({ error: shipResult.error || 'Failed to create shipment' })
      return
    }

    // Store label URL and tracking number — status 'preparing' until carrier scans the parcel
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        tracking_number: shipResult.shipmentNumber,
        carrier,
        label_url: shipResult.labelUrl,
        tracking_status: 'pending',
        status: 'preparing',
      })
      .eq('id', orderId)

    if (updateErr) {
      console.error(`[shipping] Failed to save label to order ${orderId}:`, updateErr.message)
      // Retry once without tracking_status in case column doesn't exist
      const { error: retryErr } = await supabase
        .from('orders')
        .update({
          tracking_number: shipResult.shipmentNumber,
          carrier,
          label_url: shipResult.labelUrl,
          status: 'preparing',
        })
        .eq('id', orderId)
      if (retryErr) {
        console.error(`[shipping] Retry also failed for order ${orderId}:`, retryErr.message)
      }
    }

    const trackingUrl = carrier === 'dpd' ? getDpdTrackingUrl(shipResult.shipmentNumber)
      : carrier === 'dhl' ? getDhlTrackingUrl(shipResult.shipmentNumber)
      : getMondialRelayTrackingUrl(shipResult.shipmentNumber)

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${carrier}] Label created for order ${orderId}: ${shipResult.shipmentNumber}`)
    }

    res.json({
      shipment_number: shipResult.shipmentNumber,
      label_url: shipResult.labelUrl,
      tracking_url: trackingUrl,
    })
  } catch (err) {
    console.error('[shipping] Create label error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/orders/group-label — Generate one label for multiple orders (same buyer)
// Seller groups orders, enters weight, gets one Mondial Relay label
// =============================================
router.post('/api/orders/group-label', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { order_ids, weight_grams } = req.body

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      res.status(400).json({ error: 'order_ids required' })
      return
    }
    if (!weight_grams || Number(weight_grams) <= 0) {
      res.status(400).json({ error: 'weight_grams required (> 0)' })
      return
    }

    // Fetch all orders
    const { data: orders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, shipping_address, item_id, carrier, label_url, tracking_number, relay_point_id, relay_point_name, shipping_cost')
      .in('id', order_ids)

    if (fetchErr || !orders || orders.length === 0) {
      res.status(404).json({ error: 'Orders not found' })
      return
    }

    // Verify all orders belong to this seller
    if (orders.some(o => o.seller_id !== userId)) {
      res.status(403).json({ error: 'Not your orders' })
      return
    }

    // Verify all orders are from the same buyer
    const buyerIds = [...new Set(orders.map(o => o.buyer_id))]
    if (buyerIds.length > 1) {
      res.status(400).json({ error: 'All orders must be from the same buyer' })
      return
    }

    // Verify all orders are paid or preparing
    if (orders.some(o => !['paid', 'preparing', 'shipped'].includes(o.status))) {
      res.status(400).json({ error: 'All orders must be paid' })
      return
    }

    // Use the first order's shipping address
    const primaryOrder = orders.find(o => o.shipping_address) || orders[0]
    if (!primaryOrder.shipping_address) {
      res.status(400).json({ error: 'Buyer has not provided a shipping address' })
      return
    }

    // Determine carrier
    const groupBuyerAddr = primaryOrder.shipping_address as Record<string, string>
    const groupZone = getZoneFromCountry(groupBuyerAddr.country, groupBuyerAddr.zip)
    const groupCarrier = primaryOrder.carrier || getCarrierForZone(groupZone)

    // If any order already has a label, return it
    const existingLabel = orders.find(o => o.label_url && o.tracking_number)
    if (existingLabel) {
      const existingTrackingUrl = groupCarrier === 'dpd' ? getDpdTrackingUrl(existingLabel.tracking_number!)
        : groupCarrier === 'dhl' ? getDhlTrackingUrl(existingLabel.tracking_number!)
        : getMondialRelayTrackingUrl(existingLabel.tracking_number!)
      res.json({
        shipment_number: existingLabel.tracking_number,
        label_url: existingLabel.label_url,
        tracking_url: existingTrackingUrl,
        already_exists: true,
      })
      return
    }

    // Check carrier configuration
    if (groupCarrier === 'mondial_relay' && !isMondialRelayShipmentConfigured()) {
      res.status(503).json({ error: 'Mondial Relay shipment API not configured' })
      return
    }
    if (groupCarrier === 'dpd' && !isDpdConfigured()) {
      res.status(503).json({ error: 'DPD not configured yet' })
      return
    }
    if (groupCarrier === 'dhl' && !isDhlConfigured()) {
      res.status(503).json({ error: 'DHL Express not configured yet' })
      return
    }

    // Calculate shipping cost for the grouped weight and charge buyer off-session
    let alreadyCharged = orders.some(o => o.shipping_cost > 0)
    const groupShippingCost = calculateShippingCost(Number(weight_grams), groupCarrier, groupZone)

    // Double-check Stripe if DB says not charged
    if (groupShippingCost > 0 && !alreadyCharged) {
      try {
        const existingPIs = await stripe.paymentIntents.search({
          query: `metadata["order_id"]:"${primaryOrder.id}" metadata["type"]:"shipping" status:"succeeded"`,
        })
        if (existingPIs.data.length > 0) {
          alreadyCharged = true
          console.log(`[Shipping] Found existing Stripe charge for group order ${primaryOrder.id}, skipping`)
          const perOrderShippingFix = Math.round((groupShippingCost / orders.length) * 100) / 100
          for (const o of orders) {
            await supabase.from('orders').update({ shipping_cost: perOrderShippingFix }).eq('id', o.id)
          }
        }
      } catch (searchErr) {
        console.error('[Shipping] Stripe search failed:', searchErr)
      }
    }

    if (groupShippingCost > 0 && !alreadyCharged) {
      const chargeResult = await chargeShippingOffSession(buyerIds[0], primaryOrder.id, groupShippingCost)
      if (!chargeResult.success) {
        res.status(402).json({ error: chargeResult.error || 'Le paiement des frais de port a echoue' })
        return
      }

      // Distribute shipping cost evenly across orders
      const perOrderShipping = Math.round((groupShippingCost / orders.length) * 100) / 100
      for (const o of orders) {
        const { error: costErr } = await supabase
          .from('orders')
          .update({
            shipping_cost: perOrderShipping,
            shipping_payment_intent_id: chargeResult.paymentIntentId,
          })
          .eq('id', o.id)

        if (costErr) {
          await supabase
            .from('orders')
            .update({ shipping_cost: perOrderShipping })
            .eq('id', o.id)
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Shipping] Charged ${groupShippingCost}EUR shipping for group (${orders.length} orders, PI: ${chargeResult.paymentIntentId})`)
      }
    }

    // Get item titles for the label content
    const { data: items } = await supabase
      .from('items')
      .select('title')
      .in('id', orders.map(o => o.item_id))

    const content = items?.map(i => i.title).join(', ').slice(0, 60) || 'Articles ShaPop'

    // Get seller address
    const { data: seller } = await supabase
      .from('sellers')
      .select('return_address, store_name')
      .eq('id', userId)
      .single()

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('display_name, phone_number')
      .eq('id', userId)
      .single()

    const returnAddr = seller?.return_address as Record<string, string> | null
    if (!returnAddr || !returnAddr.street || !returnAddr.city || !returnAddr.zip) {
      res.status(400).json({ error: 'Seller must set a return address before generating labels' })
      return
    }

    const buyerAddr = primaryOrder.shipping_address as Record<string, string>
    const buyerNameParts = (buyerAddr.name || '').split(' ')

    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', buyerIds[0])
      .single()

    // Get emails from auth
    const { data: buyerAuth } = await supabase.auth.admin.getUserById(buyerIds[0])
    const { data: sellerAuth } = await supabase.auth.admin.getUserById(userId)
    const buyerEmail = buyerAuth?.user?.email || ''
    const sellerEmail = sellerAuth?.user?.email || ''

    // Dispatch to the right carrier
    let groupShipResult: { shipmentNumber: string; labelUrl: string; error?: string }

    if (groupCarrier === 'mondial_relay') {
      groupShipResult = await createShipment({
        orderNo: primaryOrder.id.slice(0, 15),
        weight: Number(weight_grams),
        content,
        sender: {
          firstname: sellerProfile?.display_name?.split(' ')[0] || 'ShaPop',
          lastname: sellerProfile?.display_name?.split(' ').slice(1).join(' ') || 'Seller',
          street: returnAddr.street,
          postCode: returnAddr.zip,
          city: returnAddr.city,
          countryCode: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          mobile: sellerProfile?.phone_number || '',
          email: sellerEmail,
        },
        recipient: {
          firstname: buyerNameParts[0] || 'Acheteur',
          lastname: buyerNameParts.slice(1).join(' ') || 'ShaPop',
          street: buyerAddr.street || '',
          postCode: buyerAddr.zip || '',
          city: buyerAddr.city || '',
          countryCode: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          mobile: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: buyerEmail,
        },
        relayPointId: primaryOrder.relay_point_id || undefined,
      })
    } else if (groupCarrier === 'dpd') {
      groupShipResult = await createDpdShipment({
        orderNo: primaryOrder.id.slice(0, 15),
        weight: Number(weight_grams),
        content,
        sender: {
          name: sellerProfile?.display_name || 'ShaPop Seller',
          street: returnAddr.street,
          city: returnAddr.city,
          zip: returnAddr.zip,
          country: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          email: '',
        },
        recipient: {
          name: buyerAddr.name || 'Acheteur',
          street: buyerAddr.street || '',
          city: buyerAddr.city || '',
          zip: buyerAddr.zip || '',
          country: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: '',
        },
      })
    } else if (groupCarrier === 'dhl') {
      groupShipResult = await createDhlShipment({
        orderNo: primaryOrder.id.slice(0, 15),
        weight: Number(weight_grams),
        content,
        sender: {
          name: sellerProfile?.display_name || 'ShaPop Seller',
          street: returnAddr.street,
          city: returnAddr.city,
          zip: returnAddr.zip,
          country: returnAddr.country || 'FR',
          phone: sellerProfile?.phone_number || '',
          email: '',
        },
        recipient: {
          name: buyerAddr.name || 'Acheteur',
          street: buyerAddr.street || '',
          city: buyerAddr.city || '',
          zip: buyerAddr.zip || '',
          country: buyerAddr.country || 'FR',
          phone: buyerAddr.phone || buyerProfile?.phone_number || '',
          email: '',
        },
      })
    } else {
      res.status(400).json({ error: `Unsupported carrier: ${groupCarrier}` })
      return
    }

    if (groupShipResult.error || !groupShipResult.shipmentNumber) {
      console.error(`[shipping] Group label creation failed (${groupCarrier}):`, groupShipResult.error)
      res.status(502).json({ error: groupShipResult.error || 'Failed to create shipment' })
      return
    }

    // Update ALL orders with tracking info — status 'preparing' until carrier scans the parcel
    const { error: groupUpdateErr } = await supabase
      .from('orders')
      .update({
        tracking_number: groupShipResult.shipmentNumber,
        carrier: groupCarrier,
        label_url: groupShipResult.labelUrl,
        tracking_status: 'pending',
        status: 'preparing',
      })
      .in('id', order_ids)

    if (groupUpdateErr) {
      console.error(`[shipping] Failed to save group label to orders:`, groupUpdateErr.message)
      // Retry once without tracking_status in case column doesn't exist
      const { error: retryErr } = await supabase
        .from('orders')
        .update({
          tracking_number: groupShipResult.shipmentNumber,
          carrier: groupCarrier,
          label_url: groupShipResult.labelUrl,
          status: 'preparing',
        })
        .in('id', order_ids)
      if (retryErr) {
        console.error(`[shipping] Group retry also failed:`, retryErr.message)
      }
    }

    const groupTrackingUrl = groupCarrier === 'dpd' ? getDpdTrackingUrl(groupShipResult.shipmentNumber)
      : groupCarrier === 'dhl' ? getDhlTrackingUrl(groupShipResult.shipmentNumber)
      : getMondialRelayTrackingUrl(groupShipResult.shipmentNumber)

    console.log(`[${groupCarrier}] Group label for ${order_ids.length} orders: ${groupShipResult.shipmentNumber}`)

    res.json({
      shipment_number: groupShipResult.shipmentNumber,
      label_url: groupShipResult.labelUrl,
      tracking_url: groupTrackingUrl,
      orders_updated: order_ids.length,
    })
  } catch (err) {
    console.error('[shipping] Group label error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/orders/:id/mondial-relay-tracking — Get MR tracking details (legacy)
// GET /api/orders/:id/tracking-details — Generic multi-carrier tracking
// =============================================
router.get(['/api/orders/:id/mondial-relay-tracking', '/api/orders/:id/tracking-details'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = paramStr(req.params.id)
    const userId = req.user!.id

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, tracking_number, carrier')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    if (!order.tracking_number) {
      res.status(400).json({ error: 'No tracking number for this order' })
      return
    }

    if (order.carrier === 'mondial_relay') {
      const result = await trackShipment(order.tracking_number)
      if (result.error) {
        res.status(502).json({ error: result.error })
        return
      }
      res.json({
        ...result,
        tracking_url: getMondialRelayTrackingUrl(order.tracking_number),
      })
    } else if (order.carrier === 'dpd') {
      const { trackDpdShipment } = await import('../services/dpd')
      const result = await trackDpdShipment(order.tracking_number)
      if (result.error) {
        res.status(502).json({ error: result.error })
        return
      }
      res.json({
        ...result,
        tracking_url: getDpdTrackingUrl(order.tracking_number),
      })
    } else if (order.carrier === 'dhl') {
      const { trackDhlShipment } = await import('../services/dhl')
      const result = await trackDhlShipment(order.tracking_number)
      if (result.error) {
        res.status(502).json({ error: result.error })
        return
      }
      res.json({
        ...result,
        tracking_url: getDhlTrackingUrl(order.tracking_number),
      })
    } else {
      res.status(400).json({ error: `Tracking not supported for carrier: ${order.carrier}` })
    }
  } catch (err) {
    console.error('[shipping] Tracking details error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

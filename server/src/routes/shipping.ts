import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase } from '../config'
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
import type { AuthenticatedRequest } from '../types'

const router = Router()

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

    if (!isMondialRelayShipmentConfigured()) {
      res.status(503).json({ error: 'Mondial Relay shipment API not configured' })
      return
    }

    // Fetch order with item details
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, status, shipping_address, item_id, carrier, label_url, tracking_number, relay_point_id, relay_point_name')
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

    if (!['paid', 'shipped'].includes(order.status)) {
      res.status(400).json({ error: 'Order must be paid to generate a label' })
      return
    }

    // Return existing label if already generated
    if (order.label_url && order.tracking_number) {
      res.json({
        shipment_number: order.tracking_number,
        label_url: order.label_url,
        tracking_url: getMondialRelayTrackingUrl(order.tracking_number),
        already_exists: true,
      })
      return
    }

    if (!order.shipping_address) {
      res.status(400).json({ error: 'Buyer has not provided a shipping address' })
      return
    }

    // Get item weight
    const { data: item } = await supabase
      .from('items')
      .select('title, weight_grams')
      .eq('id', order.item_id)
      .single()

    const weight = item?.weight_grams || 500 // Default 500g if not set

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

    const buyerAddr = order.shipping_address as Record<string, string>
    const buyerNameParts = (buyerAddr.name || '').split(' ')

    // Get buyer profile for phone/email
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', order.buyer_id)
      .single()

    const result = await createShipment({
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
      },
      relayPointId: order.relay_point_id || undefined,
    })

    if (result.error || !result.shipmentNumber) {
      console.error('[shipping] Label creation failed:', result.error)
      res.status(502).json({ error: result.error || 'Failed to create shipment' })
      return
    }

    // Store label URL and tracking number on the order
    const now = new Date().toISOString()
    await supabase
      .from('orders')
      .update({
        tracking_number: result.shipmentNumber,
        carrier: 'mondial_relay',
        label_url: result.labelUrl,
        tracking_status: 'pending',
        status: order.status === 'paid' ? 'paid' : order.status, // Don't change status yet
      })
      .eq('id', orderId)

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MondialRelay] Label created for order ${orderId}: ${result.shipmentNumber}`)
    }

    res.json({
      shipment_number: result.shipmentNumber,
      label_url: result.labelUrl,
      tracking_url: getMondialRelayTrackingUrl(result.shipmentNumber),
    })
  } catch (err) {
    console.error('[shipping] Create label error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/orders/:id/mondial-relay-tracking — Get MR tracking details
// =============================================
router.get('/api/orders/:id/mondial-relay-tracking', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    if (order.carrier !== 'mondial_relay' || !order.tracking_number) {
      res.status(400).json({ error: 'No Mondial Relay tracking for this order' })
      return
    }

    const result = await trackShipment(order.tracking_number)
    if (result.error) {
      res.status(502).json({ error: result.error })
      return
    }

    res.json({
      ...result,
      tracking_url: getMondialRelayTrackingUrl(order.tracking_number),
    })
  } catch (err) {
    console.error('[shipping] MR tracking error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

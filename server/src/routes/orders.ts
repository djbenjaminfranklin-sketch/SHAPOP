import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { supabase, stripe } from '../config'
import { requireAuth } from '../middleware'
import { calculateFees, calculateShippingCost, getCarrierForZone, getZoneFromCountry, notifyUser } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

const ShipOrderProof = z.object({
  type: z.enum(['photo_package', 'photo_content', 'video_packing']),
  url: z.string().url(),
})

const ShipOrderBody = z.object({
  shipping_proof_url: z.string().url().optional(),
  proofs: z.array(ShipOrderProof).optional(),
  tracking_number: z.string().max(100).optional(),
})

// =============================================
// POST /api/orders — create an order for a won auction item (auth required)
// =============================================
router.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Check if buyer is blocked
    const { data: buyerScoreData } = await supabase
      .from('buyer_scores')
      .select('risk_level')
      .eq('user_id', userId)
      .single()
    if (buyerScoreData?.risk_level === 'blocked') {
      res.status(403).json({ error: 'Your account is blocked from making purchases' })
      return
    }

    // Validate request body
    const { item_id } = req.body
    if (!item_id || typeof item_id !== 'string') {
      res.status(400).json({ error: 'item_id is required' })
      return
    }
    // Basic UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item_id)) {
      res.status(400).json({ error: 'item_id must be a valid UUID' })
      return
    }

    // Fetch the item — must be sold with a winner
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, status, winner_id, current_price, seller_id, stream_id')
      .eq('id', item_id)
      .single()

    if (itemError || !item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    if (item.status !== 'sold') {
      res.status(400).json({ error: 'Item is not sold' })
      return
    }
    if (!item.winner_id) {
      res.status(400).json({ error: 'Item has no winner' })
      return
    }

    // Authorization: only the winner can create the order
    if (item.winner_id && item.winner_id !== userId) {
      res.status(403).json({ error: 'You are not the winner of this auction' })
      return
    }

    // Prevent buying your own item
    if (item.seller_id === userId) {
      res.status(400).json({ error: 'Cannot buy your own item' })
      return
    }

    // Check for existing active order (idempotency + race condition prevention)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('item_id', item_id)
      .not('status', 'in', '("refunded","cancelled")')
      .maybeSingle()

    if (existingOrder) {
      res.json(existingOrder)
      return
    }

    // Calculate fees using the server-side helper
    const amount = item.current_price
    const fees = calculateFees(amount)

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: item.winner_id,
        seller_id: item.seller_id,
        item_id: item.id,
        stream_id: item.stream_id,
        amount,
        platform_fee: fees.platformFee,
        processing_fee: fees.processingFee,
        seller_payout: fees.sellerPayout,
        status: 'pending_payment',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      res.status(500).json({ error: 'Failed to create order' })
      return
    }

    res.json(order)
  } catch (err) {
    console.error('POST /api/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel an order (only pending_payment, buyer or seller)
router.post('/api/orders/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id, stripe_payment_intent_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({ error: 'Not your order' })
      return
    }

    if (order.status !== 'pending_payment') {
      res.status(400).json({ error: 'Only pending_payment orders can be cancelled' })
      return
    }

    // Cancel Stripe payment intent if exists
    if (order.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(order.stripe_payment_intent_id)
      } catch { /* PI may already be cancelled or expired */ }
    }

    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (process.env.NODE_ENV !== 'production') console.log(`[orders] Order ${orderId} cancelled by user ${userId}`)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Save shipping address + update order (bypasses RLS)
router.post('/api/orders/:id/address', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id
    const userId = req.user!.id
    const { name, street, city, zip, phone } = req.body

    if (!name || !street || !city || !zip) {
      res.status(400).json({ error: 'Missing required address fields' })
      return
    }

    // Verify order belongs to buyer
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id')
      .eq('id', orderId)
      .eq('buyer_id', userId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const addr = { name, street, city, zip, phone: phone || '' }

    // Save/update default address
    const { data: existing } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (existing) {
      await supabase.from('addresses').update(addr).eq('id', existing.id)
    } else {
      await supabase.from('addresses').insert({ ...addr, user_id: userId, is_default: true })
    }

    // Save shipping address on order
    await supabase
      .from('orders')
      .update({ shipping_address: addr })
      .eq('id', orderId)

    res.json({ success: true })
  } catch (err: any) {
    console.error('Save address error:', err?.message || err)
    res.status(500).json({ error: 'Failed to save address' })
  }
})

// Auto-assign carrier based on buyer's shipping zone
router.post('/api/orders/:id/carrier', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id
    const userId = req.user!.id

    // Verify order belongs to buyer
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, item_id, status, shipping_address')
      .eq('id', orderId)
      .eq('buyer_id', userId)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.status !== 'pending_payment') {
      res.status(400).json({ error: 'Carrier can only be set before payment' })
      return
    }

    // Determine shipping zone from buyer's address
    let buyerCountry: string | undefined
    let buyerZip: string | undefined

    if (order.shipping_address) {
      const addr = order.shipping_address as Record<string, string>
      buyerCountry = addr.country
      buyerZip = addr.zip
    }

    if (!buyerCountry) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', userId)
        .single()
      buyerCountry = buyerProfile?.country || undefined
    }

    const zone = getZoneFromCountry(buyerCountry, buyerZip)
    const carrier = getCarrierForZone(zone)

    // Get item weight to calculate shipping cost
    let shippingCost = 0
    if (order.item_id) {
      const { data: item } = await supabase
        .from('items')
        .select('weight_grams')
        .eq('id', order.item_id)
        .single()

      if (item?.weight_grams) {
        shippingCost = calculateShippingCost(item.weight_grams, carrier, zone)
      }
    }

    await supabase
      .from('orders')
      .update({
        carrier,
        shipping_cost: shippingCost,
        total_amount: Math.round(((order as Record<string, unknown>).amount as number + shippingCost) * 100) / 100,
      })
      .eq('id', orderId)

    res.json({ success: true, carrier, shipping_cost: shippingCost, zone })
  } catch (err: any) {
    console.error('Set carrier error:', err?.message || err)
    res.status(500).json({ error: 'Failed to set carrier' })
  }
})

// Seller marks order as shipped with proof photo(s)
router.post('/api/orders/:id/ship', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ShipOrderBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }

    const { shipping_proof_url, proofs, tracking_number } = parsed.data
    const orderId = req.params.id

    if (!shipping_proof_url && (!proofs || proofs.length === 0)) {
      res.status(400).json({ error: 'At least one shipping proof is required' })
      return
    }

    // Fetch the order
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can mark this order as shipped' })
      return
    }

    if (!order.shipping_address) {
      res.status(400).json({ error: 'Shipping address required before shipping' })
      return
    }

    if (order.status !== 'paid') {
      res.status(400).json({ error: 'Only paid orders can be shipped' })
      return
    }

    // Validate proofs against seller trust proof_level
    if (proofs && proofs.length > 0) {
      const { data: trust } = await supabase
        .from('seller_trust')
        .select('proof_level, trust_level')
        .eq('seller_id', req.user!.id)
        .single()

      const proofLevel = trust?.proof_level || 'enhanced'
      const trustLevel = trust?.trust_level || 'new'
      const amount = order.amount

      // Determine required proofs
      let requiredTypes: string[] = []
      if (proofLevel === 'basic' && amount < 20 && ['trusted', 'premium'].includes(trustLevel)) {
        requiredTypes = ['photo_package']
      } else if (proofLevel === 'standard' || (amount >= 20 && amount <= 100)) {
        requiredTypes = ['photo_package', 'photo_content']
      } else {
        // enhanced: > 100EUR or trust new
        requiredTypes = ['photo_package', 'photo_content', 'video_packing']
      }

      const proofTypes = proofs.map(p => p.type) as string[]
      const missingTypes = requiredTypes.filter(t => !proofTypes.includes(t))
      if (missingTypes.length > 0) {
        res.status(400).json({
          error: `Preuves manquantes: ${missingTypes.join(', ')}`,
          required: requiredTypes,
          provided: proofTypes,
        })
        return
      }

      // Insert shipping proofs
      const proofInserts = proofs.map(p => ({
        order_id: orderId,
        seller_id: req.user!.id,
        type: p.type,
        url: p.url,
      }))
      await supabase.from('shipping_proofs').insert(proofInserts)
    }

    const updateData: Record<string, unknown> = {
      status: 'shipped',
      shipped_at: new Date().toISOString(),
      shipping_proof_url: shipping_proof_url || (proofs && proofs.length > 0 ? proofs[0].url : null),
    }
    if (tracking_number) {
      updateData.tracking_number = tracking_number
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Buyer confirms delivery
router.post('/api/orders/:id/confirm-delivery', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the buyer can confirm delivery' })
      return
    }

    if (order.status !== 'shipped') {
      res.status(400).json({ error: 'Only shipped orders can be confirmed as delivered' })
      return
    }

    const now = new Date()
    const claimDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h from now

    // Get seller trust for payout delay
    let payoutScheduledAt: string | null = order.payout_scheduled_at || null
    if (!payoutScheduledAt) {
      const { data: trust } = await supabase
        .from('seller_trust')
        .select('payout_delay_days')
        .eq('seller_id', order.seller_id)
        .single()
      const delayDays = trust?.payout_delay_days || 7
      const payoutDate = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
      payoutScheduledAt = payoutDate.toISOString()
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: now.toISOString(),
        claim_deadline: claimDeadline.toISOString(),
        payout_scheduled_at: payoutScheduledAt,
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    // Update seller trust stats
    const { data: trust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', order.seller_id)
      .single()
    if (trust) {
      const shipTime = order.shipped_at && order.paid_at
        ? (new Date(order.shipped_at).getTime() - new Date(order.paid_at).getTime()) / (1000 * 60 * 60)
        : 0
      const newTotal = trust.total_completed_orders + 1
      const newAvgShip = ((trust.avg_ship_time_hours * trust.total_completed_orders) + shipTime) / newTotal
      await supabase
        .from('seller_trust')
        .update({
          total_completed_orders: newTotal,
          avg_ship_time_hours: Math.round(newAvgShip * 10) / 10,
          updated_at: now.toISOString(),
        })
        .eq('seller_id', order.seller_id)
    }

    // Update buyer score total_orders
    const { data: buyerScore } = await supabase
      .from('buyer_scores')
      .select('*')
      .eq('user_id', order.buyer_id)
      .single()
    if (buyerScore) {
      await supabase
        .from('buyer_scores')
        .update({ total_orders: buyerScore.total_orders + 1, updated_at: now.toISOString() })
        .eq('user_id', order.buyer_id)
    } else {
      await supabase.from('buyer_scores').insert({
        user_id: order.buyer_id,
        total_orders: 1,
      })
    }

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// RETURN / REFUND REQUESTS
// =============================================

// Buyer requests a return
router.post('/api/orders/:id/request-return', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : ''

    if (!reason.trim()) {
      res.status(400).json({ error: 'A reason is required' })
      return
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.buyer_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the buyer can request a return' })
      return
    }

    if (order.status !== 'delivered') {
      res.status(400).json({ error: 'Returns can only be requested for delivered orders' })
      return
    }

    // Enforce return deadline (claim_deadline or delivered_at + 48h)
    const deadline = order.claim_deadline
      ? new Date(order.claim_deadline)
      : order.delivered_at
        ? new Date(new Date(order.delivered_at).getTime() + 48 * 60 * 60 * 1000)
        : null

    if (deadline && new Date() > deadline) {
      res.status(400).json({ error: 'Return deadline has passed' })
      return
    }

    // Create return request record
    await supabase.from('return_requests').insert({
      order_id: orderId,
      buyer_id: req.user!.id,
      seller_id: order.seller_id,
      reason: reason.trim(),
      status: 'pending',
    })

    // Update order status
    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'return_requested' })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    // Notify seller
    notifyUser(order.seller_id, 'return_requested', 'Return requested', `A buyer has requested a return: ${reason.trim().slice(0, 100)}`, { order_id: String(orderId) })

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Seller approves a return (triggers Stripe refund)
router.post('/api/orders/:id/approve-return', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can approve a return' })
      return
    }

    if (order.status !== 'return_requested') {
      res.status(400).json({ error: 'This order does not have a pending return request' })
      return
    }

    // Process Stripe refund (skip if already refunded)
    if (order.stripe_payment_intent_id && order.status !== 'refunded') {
      try {
        await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
        if (process.env.NODE_ENV !== 'production') console.log(`[refund] Return refund processed for order ${orderId}, PI: ${order.stripe_payment_intent_id}`)
      } catch (err) {
        console.error(`[refund] Failed to refund order ${orderId}:`, err)
        res.status(500).json({ error: 'Failed to process refund' })
        return
      }
    }

    // Update order status
    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    // Update return request record
    await supabase.from('return_requests').update({ status: 'approved' }).eq('order_id', orderId).eq('status', 'pending')

    // Notify buyer
    notifyUser(order.buyer_id, 'return_approved', 'Return approved', 'Your return has been approved and a refund is being processed.', { order_id: String(orderId) })

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Seller rejects a return
router.post('/api/orders/:id/reject-return', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : ''

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the seller can reject a return' })
      return
    }

    if (order.status !== 'return_requested') {
      res.status(400).json({ error: 'This order does not have a pending return request' })
      return
    }

    // Revert order status to what it was before the return request (delivered)
    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'return_rejected' })
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update order' })
      return
    }

    // Update return request record
    await supabase.from('return_requests').update({ status: 'rejected', reject_reason: reason.trim() || null }).eq('order_id', orderId).eq('status', 'pending')

    // Notify buyer
    notifyUser(order.buyer_id, 'return_rejected', 'Return rejected', reason.trim() ? `Your return was rejected: ${reason.trim().slice(0, 100)}` : 'Your return request was rejected by the seller.', { order_id: String(orderId) })

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get or create conversation by order
router.post('/api/orders/:id/conversation', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    // Verify user is buyer or seller of this order
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', orderId)
      .single()

    if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Check existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'order')
      .single()

    if (existing) {
      res.json(existing)
      return
    }

    // Create conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        type: 'order',
        order_id: orderId,
        participant_1: order.buyer_id,
        participant_2: order.seller_id,
        status: 'active',
      })
      .select('id')
      .single()

    if (error) {
      res.status(500).json({ error: 'Failed to create conversation' })
      return
    }

    res.json(conv)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

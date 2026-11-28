import { buyerBlocked } from '../services/sanctions'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase, stripe } from '../config'
import { refundOrderPayment } from '../payments/refunds'
import { requireAuth } from '../middleware'
import { calculateFees, notifyUserT, sendOrderConfirmationEmail, sendPaymentReminderEmail } from '../utils'
import { localized, money } from '../i18n'
import { shortOrderRef } from '../fulfillment'
import { authorizeOrderPayment, releaseAuthorization, releaseAirwallexAuthorization } from '../services/cardAuthorization'
import type { AuthenticatedRequest } from '../types'
import { crossBorderGuard } from '../services/crossBorder'

const router = Router()

// =============================================
// POST /api/orders — create an order for a won auction item (auth required)
// =============================================
router.post('/api/orders', requireAuth, crossBorderGuard, async (req: AuthenticatedRequest, res: Response) => {
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
      .select('id, title, status, winner_id, current_price, seller_id, stream_id')
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

    // Check spend limits
    const { data: spendLimits } = await supabase
      .from('spend_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (spendLimits && spendLimits.is_active) {
      const orderAmount = item.current_price

      // Get orders not cancelled/refunded for spend calculation
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('amount, created_at')
        .eq('buyer_id', userId)
        .not('status', 'in', '("cancelled","refunded")')

      const now = new Date()

      if (spendLimits.weekly_limit !== null) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const weeklySpent = (recentOrders || [])
          .filter((o: Record<string, unknown>) => (o.created_at as string) >= weekAgo)
          .reduce((sum: number, o: Record<string, unknown>) => sum + ((o.amount as number) || 0), 0)

        if (weeklySpent + orderAmount > spendLimits.weekly_limit) {
          res.status(429).json({ error: 'Weekly spend limit exceeded', weekly_spent: Math.round(weeklySpent * 100) / 100, weekly_limit: spendLimits.weekly_limit })
          return
        }
      }

      if (spendLimits.monthly_limit !== null) {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const monthlySpent = (recentOrders || [])
          .filter((o: Record<string, unknown>) => (o.created_at as string) >= monthAgo)
          .reduce((sum: number, o: Record<string, unknown>) => sum + ((o.amount as number) || 0), 0)

        if (monthlySpent + orderAmount > spendLimits.monthly_limit) {
          res.status(429).json({ error: 'Monthly spend limit exceeded', monthly_spent: Math.round(monthlySpent * 100) / 100, monthly_limit: spendLimits.monthly_limit })
          return
        }
      }
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

    // Send confirmation email (async, don't block response)
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', item.seller_id)
      .single()

    sendOrderConfirmationEmail(item.winner_id, {
      id: order.id,
      itemTitle: item.title,
      amount: item.current_price,
      currency: order.currency,
      sellerName: sellerProfile?.display_name,
    }).catch(err => console.error('[email] Order confirmation failed:', err))
  } catch (err) {
    console.error('POST /api/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel an order (only pending_payment, buyer or seller)
// Nouvelle tentative d'autorisation de la carte du gagnant (bouton « Réessayer » du vendeur)
router.post('/api/orders/:id/authorize-payment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', req.params.id)
      .maybeSingle()
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    if (order.seller_id !== userId && order.buyer_id !== userId) { res.status(403).json({ error: 'Not your order' }); return }
    const payment = await authorizeOrderPayment(order.id)
    res.json({ success: true, order_id: order.id, payment })
  } catch (err) {
    console.error('[orders] authorize-payment', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api/orders/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id, stripe_payment_intent_id, auth_payment_intent_id, airwallex_intent_id')
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
    // Libère l'argent réservé sur la carte à la fin de l'enchère
    await releaseAuthorization(order.auth_payment_intent_id)
    await releaseAirwallexAuthorization(order.airwallex_intent_id)

    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (process.env.NODE_ENV !== 'production') console.log(`[orders] Order ${orderId} cancelled by user ${userId}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[orders]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Choix retrait / poste, adresse, code de remise et photos d'envoi : voir routes/fulfillment.ts.
// (Les anciennes routes /address, /carrier, /ship et /confirm-delivery sont supprimées :
//  confirm-delivery était un doublon qui ne libérait pas le paiement.)

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

    if (!['delivered', 'handed_over', 'shipped'].includes(order.status)) {
      res.status(400).json({ error: 'Returns can only be requested for received orders' })
      return
    }
    // Règle du 25/11/2026 : retour seulement pour un colis reçu (confirmé ou « livré » par la poste),
    // pendant les 24 h pour signaler un problème ; acheteur de mauvaise foi bloqué.
    if (order.status === 'shipped' && !order.carrier_delivered_at) {
      res.status(400).json({ error: 'not_received_yet' })
      return
    }
    if (await buyerBlocked(req.user!.id)) {
      res.status(403).json({ error: 'buyer_blocked' })
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
    notifyUserT(order.seller_id, 'return_requested', 'returnRequested', { reason: reason.trim().slice(0, 100) }, { order_id: String(orderId) })

    res.json(updated)
  } catch (err) {
    console.error('[orders]', err)
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
    if ((order.stripe_payment_intent_id || order.payment_provider === 'rapyd') && order.status !== 'refunded') {
      try {
        await refundOrderPayment(order.id)
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
    notifyUserT(order.buyer_id, 'return_approved', 'returnApproved', {}, { order_id: String(orderId) })

    res.json(updated)
  } catch (err) {
    console.error('[orders]', err)
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
    notifyUserT(order.buyer_id, 'return_rejected', { title: 'returnRejected.title', body: reason.trim() ? 'returnRejected.body' : 'returnRejected.bodyNoReason' }, { reason: reason.trim().slice(0, 100) }, { order_id: String(orderId) })

    res.json(updated)
  } catch (err) {
    console.error('[orders]', err)
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
  } catch (err) {
    console.error('[orders]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// CRON « délai de remise » : sans preuve (code saisi ou 2 photos) avant
// handover_deadline (par défaut 4 jours après paiement) → annulation + remboursement.
// Appelé toutes les heures depuis index.ts.
// =============================================
export async function cancelOverdueOrders(): Promise<number> {
  const now = new Date().toISOString()

  const { data: overdueOrders, error } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, amount, total_amount, currency, stripe_payment_intent_id, handover_deadline, payment_provider')
    .eq('status', 'paid')
    .not('handover_deadline', 'is', null)
    .lt('handover_deadline', now)
    .limit(50)

  if (error || !overdueOrders || overdueOrders.length === 0) return 0

  let cancelled = 0

  for (const order of overdueOrders) {
    try {
      // Statut d'abord (garde : seulement si toujours « payée »), puis remboursement
      const { data: rows } = await supabase
        .from('orders')
        .update({ status: 'cancelled', payout_status: 'cancelled' })
        .eq('id', order.id)
        .eq('status', 'paid')
        .select('id')
      if (!rows || rows.length === 0) continue

      if (order.stripe_payment_intent_id || order.payment_provider === 'rapyd') {
        await refundOrderPayment(order.id, { reason: 'requested_by_customer' })
      }

      await supabase
        .from('paypal_payouts')
        .update({ status: 'cancelled' })
        .eq('order_id', order.id)
        .eq('status', 'pending')

      const ref = shortOrderRef(order.id)
      notifyUserT(order.buyer_id, 'order_cancelled', 'orderCancelledBuyer',
        { ref, amount: money(order.total_amount ?? order.amount, order.currency) }, { order_id: order.id })
      notifyUserT(order.seller_id, 'order_cancelled', 'orderCancelledSeller', { ref }, { order_id: order.id })

      cancelled++
      console.log(`[Handover-Deadline] Order ${order.id} auto-cancelled + refunded (deadline was ${order.handover_deadline})`)
    } catch (err) {
      console.error(`[Handover-Deadline] Failed to cancel order ${order.id}:`, err)
    }
  }

  return cancelled
}

// =============================================
// CRON : rappel au vendeur 24 h avant la fin du délai de remise (une seule fois)
// =============================================
export async function remindHandoverDeadline(): Promise<number> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: urgentOrders, error } = await supabase
    .from('orders')
    .select('id, seller_id, fulfillment_method, handover_deadline')
    .eq('status', 'paid')
    .is('handover_reminder_sent_at', null)
    .not('handover_deadline', 'is', null)
    .gt('handover_deadline', now.toISOString())
    .lt('handover_deadline', in24h.toISOString())
    .limit(50)

  if (error || !urgentOrders || urgentOrders.length === 0) return 0

  let reminded = 0
  for (const order of urgentOrders) {
    try {
      await supabase.from('orders').update({ handover_reminder_sent_at: now.toISOString() }).eq('id', order.id)
      const ref = shortOrderRef(order.id)
      notifyUserT(
        order.seller_id,
        'handover_reminder',
        { title: 'handoverReminder.title', body: order.fulfillment_method === 'pickup' ? 'handoverReminder.bodyPickup' : 'handoverReminder.bodyPost' },
        { ref },
        { order_id: order.id },
      )
      reminded++
    } catch {
      // ignore notification errors
    }
  }
  return reminded
}

// =============================================
// CRON: Remind buyers about pending payments (24h after order)
// =============================================
export async function remindPendingPayments(): Promise<number> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  // Find pending_payment orders created between 24h and 48h ago (remind once)
  const { data: pendingOrders, error } = await supabase
    .from('orders')
    .select('id, buyer_id, amount, currency, item_id')
    .eq('status', 'pending_payment')
    .lt('created_at', oneDayAgo)
    .gt('created_at', twoDaysAgo)
    .limit(50)

  if (error || !pendingOrders || pendingOrders.length === 0) return 0

  let reminded = 0

  for (const order of pendingOrders) {
    try {
      const { data: item } = await supabase
        .from('items')
        .select('title')
        .eq('id', order.item_id)
        .single()

      sendPaymentReminderEmail(order.buyer_id, {
        orderId: order.id,
        itemTitle: item?.title,
        amount: order.amount,
        currency: order.currency,
      }).catch(() => {})

      notifyUserT(
        order.buyer_id,
        'payment_reminder',
        'paymentReminder',
        { item: item?.title || localized('fallback.item'), amount: money(order.amount, order.currency) },
        { order_id: order.id },
      )
      reminded++
    } catch {
      // ignore errors
    }
  }

  return reminded
}

export default router

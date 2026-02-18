import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { supabase, stripe } from '../config'
import { requireAuth, disputeLimiter } from '../middleware'
import { calculateFees } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

const DisputeBody = z.object({
  order_id: z.string().uuid(),
  reason: z.enum(['not_received', 'wrong_item', 'damaged', 'not_as_described', 'counterfeit']),
  description: z.string().min(20).max(2000),
  evidence_urls: z.array(z.string().url()).max(5).optional(),
})

// Buyer opens a dispute
router.post('/api/disputes', disputeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = DisputeBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors })
      return
    }

    const { order_id, reason, description, evidence_urls } = parsed.data
    const buyerId = req.user!.id

    // Fetch order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' })
      return
    }

    if (order.buyer_id !== buyerId) {
      res.status(403).json({ error: 'Seul l\'acheteur peut ouvrir un litige' })
      return
    }

    if (order.status !== 'delivered') {
      res.status(400).json({ error: 'Un litige ne peut être ouvert que sur une commande livrée' })
      return
    }

    // Check claim deadline (48h window)
    if (order.claim_deadline && new Date(order.claim_deadline) < new Date()) {
      res.status(400).json({ error: 'Le délai de réclamation de 48h est dépassé' })
      return
    }

    // Check for existing dispute
    const { data: existing } = await supabase
      .from('disputes')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle()

    if (existing) {
      res.status(409).json({ error: 'Un litige existe déjà pour cette commande' })
      return
    }

    // Check buyer score for auto-refund eligibility
    const { data: buyerScore } = await supabase
      .from('buyer_scores')
      .select('score')
      .eq('user_id', buyerId)
      .maybeSingle()

    const score = buyerScore?.score ?? 10
    const autoRefund = order.amount < 30 && score > 7

    const disputeData = {
      order_id,
      buyer_id: buyerId,
      seller_id: order.seller_id,
      reason,
      description,
      evidence_urls: evidence_urls || [],
      status: autoRefund ? 'resolved_buyer' : 'under_review',
      auto_refund: autoRefund,
      amount: order.amount,
      resolved_at: autoRefund ? new Date().toISOString() : null,
    }

    const { data: dispute, error: insertErr } = await supabase
      .from('disputes')
      .insert(disputeData)
      .select('*')
      .single()

    if (insertErr) {
      res.status(500).json({ error: 'Échec de la création du litige' })
      return
    }

    // Process actual Stripe refund if auto-refund (skip if already refunded)
    if (autoRefund && order.stripe_payment_intent_id && order.status !== 'refunded') {
      try {
        await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
        if (process.env.NODE_ENV !== 'production') console.log(`[refund] Auto-refund processed for order ${order_id}, PI: ${order.stripe_payment_intent_id}`)
      } catch (refundErr: unknown) {
        console.error(`[refund] Auto-refund failed for order ${order_id}:`, (refundErr as Error).message)
      }
    }

    // Update order status + cancel payout if refunded
    await supabase
      .from('orders')
      .update({
        status: autoRefund ? 'refunded' : 'disputed',
        ...(autoRefund ? { payout_status: 'cancelled' } : {}),
      })
      .eq('id', order_id)

    // Update buyer scores
    const { data: existingScore } = await supabase
      .from('buyer_scores')
      .select('*')
      .eq('user_id', buyerId)
      .single()

    if (existingScore) {
      const updates: Record<string, unknown> = {
        total_disputes: existingScore.total_disputes + 1,
        last_dispute_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      if (autoRefund) {
        updates.disputes_won = existingScore.disputes_won + 1
        updates.total_refunds = existingScore.total_refunds + 1
        updates.refund_amount = existingScore.refund_amount + order.amount
      }
      await supabase.from('buyer_scores').update(updates).eq('user_id', buyerId)
    } else {
      await supabase.from('buyer_scores').insert({
        user_id: buyerId,
        total_disputes: 1,
        last_dispute_at: new Date().toISOString(),
        disputes_won: autoRefund ? 1 : 0,
        total_refunds: autoRefund ? 1 : 0,
        refund_amount: autoRefund ? order.amount : 0,
      })
    }

    // Update seller trust stats
    const { data: sellerTrust } = await supabase
      .from('seller_trust')
      .select('*')
      .eq('seller_id', order.seller_id)
      .single()

    if (sellerTrust) {
      const updates: Record<string, unknown> = {
        total_disputes_against: sellerTrust.total_disputes_against + 1,
        updated_at: new Date().toISOString(),
      }
      if (autoRefund) {
        updates.disputes_lost = sellerTrust.disputes_lost + 1
      }
      await supabase.from('seller_trust').update(updates).eq('seller_id', order.seller_id)
    }

    // Auto-create dispute conversation
    await supabase.from('conversations').insert({
      type: 'dispute',
      order_id,
      participant_1: buyerId,
      participant_2: order.seller_id,
    })

    res.json(dispute)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// User views their disputes
router.get('/api/disputes/mine', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('disputes')
      .select('*, order:orders(*, item:items(title, image_urls))')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch disputes' })
      return
    }

    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single dispute by order ID
router.get('/api/disputes/order/:orderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('order_id', req.params.orderId)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    // Verify user is participant
    const userId = req.user!.id
    if (data.buyer_id !== userId && data.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import type { Response } from 'express'
import { supabase } from '../config'
import { requireAuth, createLimiter } from '../middleware'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// POST /api/orders/:id/review — buyer leaves a review after delivery
// =============================================
router.post('/api/orders/:id/review', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    // Validate body
    const { rating, comment } = req.body
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      res.status(400).json({ error: 'rating must be an integer between 1 and 5' })
      return
    }
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        res.status(400).json({ error: 'comment must be a string' })
        return
      }
      if (comment.length > 500) {
        res.status(400).json({ error: 'comment must be 500 characters or less' })
        return
      }
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Only the buyer can review
    if (order.buyer_id !== userId) {
      res.status(403).json({ error: 'Only the buyer can leave a review' })
      return
    }

    // Order must be delivered or completed
    if (!['delivered', 'completed'].includes(order.status)) {
      res.status(400).json({ error: 'Order must be delivered before you can leave a review' })
      return
    }

    // Check for existing review on this order
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .single()

    if (existing) {
      res.status(409).json({ error: 'You have already reviewed this order' })
      return
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        order_id: orderId,
        buyer_id: userId,
        seller_id: order.seller_id,
        rating,
        comment: comment ? String(comment).trim().slice(0, 500) : null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[review] Insert error:', insertError.message)
      res.status(500).json({ error: 'Failed to create review' })
      return
    }

    res.status(201).json(review)
  } catch (err) {
    console.error('[review] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/reviews/:id/respond — seller responds to a review
// =============================================
router.post('/api/reviews/:id/respond', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const reviewId = req.params.id

    // Validate body
    const { response } = req.body
    if (!response || typeof response !== 'string' || !response.trim()) {
      res.status(400).json({ error: 'response is required' })
      return
    }
    if (response.length > 500) {
      res.status(400).json({ error: 'response must be 500 characters or less' })
      return
    }

    // Fetch the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, seller_id, seller_response')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      res.status(404).json({ error: 'Review not found' })
      return
    }

    // Only the seller of the review can respond
    if (review.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can respond to this review' })
      return
    }

    // Check if already responded
    if (review.seller_response) {
      res.status(409).json({ error: 'You have already responded to this review' })
      return
    }

    // Update review with seller response
    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({
        seller_response: response.trim().slice(0, 500),
        seller_responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) {
      console.error('[review] Response update error:', updateError.message)
      res.status(500).json({ error: 'Failed to save response' })
      return
    }

    res.json(updated)
  } catch (err) {
    console.error('[review] Respond exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/orders/:id/purchase-proof — get recording URL + offset for an order
// =============================================
router.get('/api/orders/:id/purchase-proof', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, stream_id, purchase_stream_offset_seconds')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Only buyer or seller can access
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    let recordingUrl: string | null = null
    if (order.stream_id) {
      const { data: stream } = await supabase
        .from('streams')
        .select('recording_url')
        .eq('id', order.stream_id)
        .single()
      recordingUrl = stream?.recording_url || null
    }

    res.json({
      recording_url: recordingUrl,
      offset_seconds: order.purchase_stream_offset_seconds || null,
    })
  } catch (err) {
    console.error('[purchase-proof] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/sellers/:id/reviews — public: get all reviews for a seller
// =============================================
router.get('/api/sellers/:id/reviews', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = _req.params.id

    // Fetch reviews with reviewer profile and order data for purchase proof
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, order_id, buyer_id, seller_id, rating, comment, created_at, seller_response, seller_responded_at, buyer:profiles!buyer_id(display_name, avatar_url), order:orders!order_id(stream_id, purchase_stream_offset_seconds, stream:streams!stream_id(recording_url))')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[reviews] Fetch error:', error.message)
      res.status(500).json({ error: 'Failed to fetch reviews' })
      return
    }

    const reviewsList = reviews || []

    // Calculate average rating and total count
    const totalCount = reviewsList.length
    const avgRating = totalCount > 0
      ? Math.round((reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0) / totalCount) * 10) / 10
      : 0

    res.json({
      reviews: reviewsList,
      avg_rating: avgRating,
      total_count: totalCount,
    })
  } catch (err) {
    console.error('[reviews] Exception:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import type { Response } from 'express'
import { supabase } from '../config'
import { requireAuth, createLimiter } from '../middleware'
import { notifyUser, paramStr } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// POST /api/items/:id/offer — buyer makes an offer
// =============================================
router.post('/api/items/:id/offer', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = paramStr(req.params.id)
    const { amount } = req.body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' })
      return
    }

    // Fetch the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, title, seller_id, status, current_price, ai_generated, stream_id')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

    // Only allow offers on direct sale items (AI Express or non-stream items)
    if (item.stream_id) {
      res.status(400).json({ error: 'Offers are only allowed on direct sale items' })
      return
    }

    // Cannot make offer on your own item
    if (item.seller_id === userId) {
      res.status(400).json({ error: 'Cannot make an offer on your own item' })
      return
    }

    // Item must be available (not sold, etc.)
    if (item.status === 'sold') {
      res.status(400).json({ error: 'Item is already sold' })
      return
    }

    // Create the offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        item_id: itemId,
        buyer_id: userId,
        seller_id: item.seller_id,
        amount: Math.round(amount * 100) / 100,
        status: 'pending',
      })
      .select()
      .single()

    if (offerError) {
      console.error('[offers] Create error:', offerError.message)
      res.status(500).json({ error: 'Failed to create offer' })
      return
    }

    // Notify seller
    notifyUser(
      item.seller_id,
      'offer_received',
      'Nouvelle offre',
      `Vous avez recu une offre de ${amount}EUR pour "${item.title}"`,
      { item_id: itemId, offer_id: offer.id },
    )

    res.json(offer)
  } catch (err) {
    console.error('[offers] POST error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// POST /api/offers/:id/respond — seller accepts/declines/counters
// =============================================
router.post('/api/offers/:id/respond', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const offerId = paramStr(req.params.id)
    const { action, counter_amount } = req.body

    if (!action || !['accept', 'decline', 'counter'].includes(action)) {
      res.status(400).json({ error: 'action must be accept, decline, or counter' })
      return
    }

    if (action === 'counter' && (!counter_amount || typeof counter_amount !== 'number' || counter_amount <= 0)) {
      res.status(400).json({ error: 'counter_amount must be a positive number' })
      return
    }

    // Fetch the offer
    const { data: offer, error: fetchErr } = await supabase
      .from('offers')
      .select('*, item:items!item_id(title)')
      .eq('id', offerId)
      .single()

    if (fetchErr || !offer) {
      res.status(404).json({ error: 'Offer not found' })
      return
    }

    if (offer.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can respond to this offer' })
      return
    }

    if (offer.status !== 'pending') {
      res.status(400).json({ error: 'This offer has already been responded to' })
      return
    }

    const updateData: Record<string, unknown> = {
      responded_at: new Date().toISOString(),
    }

    let notifTitle = ''
    let notifBody = ''
    const itemTitle = (offer.item as Record<string, unknown>)?.title || 'un article'

    if (action === 'accept') {
      updateData.status = 'accepted'
      notifTitle = 'Offre acceptee'
      notifBody = `Votre offre de ${offer.amount}EUR pour "${itemTitle}" a ete acceptee !`
    } else if (action === 'decline') {
      updateData.status = 'declined'
      notifTitle = 'Offre refusee'
      notifBody = `Votre offre de ${offer.amount}EUR pour "${itemTitle}" a ete refusee.`
    } else if (action === 'counter') {
      updateData.status = 'countered'
      updateData.counter_amount = Math.round(counter_amount * 100) / 100
      notifTitle = 'Contre-offre'
      notifBody = `Le vendeur a fait une contre-offre de ${counter_amount}EUR pour "${itemTitle}".`
    }

    const { data: updated, error: updateErr } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', offerId)
      .select()
      .single()

    if (updateErr) {
      res.status(500).json({ error: 'Failed to update offer' })
      return
    }

    // Notify buyer
    notifyUser(
      offer.buyer_id,
      'offer_response',
      notifTitle,
      notifBody,
      { item_id: offer.item_id, offer_id: offerId },
    )

    res.json(updated)
  } catch (err) {
    console.error('[offers] Respond error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// GET /api/offers — list offers (filter by buyer_id or seller_id)
// =============================================
router.get('/api/offers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { role } = req.query

    let query = supabase
      .from('offers')
      .select('*, item:items!item_id(id, title, current_price, image_urls)')
      .order('created_at', { ascending: false })

    if (role === 'seller') {
      query = query.eq('seller_id', userId)
    } else {
      // Default to buyer
      query = query.eq('buyer_id', userId)
    }

    const { data, error } = await query

    if (error) {
      res.status(500).json({ error: 'Failed to fetch offers' })
      return
    }

    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

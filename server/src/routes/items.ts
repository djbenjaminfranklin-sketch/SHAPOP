import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { supabase, AI_MODEL } from '../config'
import { requireAuth, createLimiter, aiLimiter, bidLimiter } from '../middleware'
import { calculateFees, notifyUser } from '../utils'
import { stripe } from '../config'
import type { AuthenticatedRequest } from '../types'

const router = Router()

const CreateListingBody = z.object({
  image_url: z.string().url(),
  seller_id: z.string().uuid(),
})

const GenerateBannerBody = z.object({
  image_url: z.string().url(),
  store_name: z.string().min(1).max(200),
  style: z.string().max(500).optional(),
  seller_id: z.string().uuid().optional(),
})

// =============================================
// DIRECT SALES — AI Express items (public)
// =============================================
router.get('/api/items/direct-sales', async (req: Request, res: Response) => {
  try {
    const { category } = req.query

    let query = supabase
      .from('items')
      .select('*, seller:profiles!seller_id(display_name, avatar_url)')
      .is('stream_id', null)
      .eq('ai_generated', true)
      .in('status', ['draft', 'pending', 'active'])
      .order('created_at', { ascending: false })

    if (category && typeof category === 'string') query = query.eq('category', category)

    const { data, error } = await query.limit(50)
    if (error) {
      res.status(500).json({ error: 'Failed to fetch direct sales items' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*, seller:profiles!seller_id(display_name, avatar_url)')
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// ENCHERES (auth required)
// =============================================
router.post('/api/items/:id/start-auction', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify ownership
    const { data: item } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', req.params.id)
      .single()

    if (!item || item.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only start auctions for your own items' })
      return
    }

    const { error } = await supabase
      .from('items')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to start auction' })
      return
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api/items/:id/end-auction', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify ownership
    const { data: itemCheck } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', req.params.id)
      .single()

    if (!itemCheck || itemCheck.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only end auctions for your own items' })
      return
    }

    // Get full item for min_price check
    const { data: fullItem } = await supabase
      .from('items')
      .select('min_price')
      .eq('id', req.params.id)
      .single()

    const minPrice = fullItem?.min_price || 0

    const { data: topBid } = await supabase
      .from('bids')
      .select('*')
      .eq('item_id', req.params.id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Only mark sold if bid meets reserve price
    const meetsReserve = topBid && topBid.amount >= minPrice
    const status = meetsReserve ? 'sold' : 'unsold'
    const winnerId = meetsReserve ? topBid.bidder_id : null

    const { error } = await supabase
      .from('items')
      .update({
        status,
        winner_id: winnerId,
        current_price: topBid?.amount || undefined,
        ended_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)

    if (error) {
      res.status(500).json({ error: 'Failed to end auction' })
      return
    }

    // Create order if sold
    if (topBid && winnerId) {
      // Idempotency check: skip if an order already exists for this item
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('item_id', req.params.id)
        .limit(1)
        .maybeSingle()

      if (existingOrder) {
        // Order already exists (possible duplicate request), return it
        res.json({ success: true, status, winner_id: winnerId, order: existingOrder })
        return
      }

      const { data: item } = await supabase
        .from('items')
        .select('*')
        .eq('id', req.params.id)
        .single()

      if (item) {
        // Calculate stream offset for purchase proof
        let purchaseStreamOffsetSeconds: number | null = null
        if (item.stream_id) {
          const { data: stream } = await supabase
            .from('streams')
            .select('started_at')
            .eq('id', item.stream_id)
            .single()
          if (stream?.started_at) {
            purchaseStreamOffsetSeconds = Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 1000)
          }
        }

        const fees = calculateFees(topBid.amount)
        await supabase.from('orders').insert({
          buyer_id: winnerId,
          seller_id: item.seller_id,
          item_id: item.id,
          stream_id: item.stream_id,
          amount: topBid.amount,
          platform_fee: fees.platformFee,
          processing_fee: fees.processingFee,
          seller_payout: fees.sellerPayout,
          purchase_stream_offset_seconds: purchaseStreamOffsetSeconds,
        })
        // Notify winner
        await notifyUser(winnerId, 'auction_won', 'Tu as gagne !', `${item.title} — ${topBid.amount}\u20ac. Paye pour recevoir ton article.`, { item_id: item.id, stream_id: item.stream_id || '' })
      }
    }

    res.json({ success: true, status, winner_id: winnerId, final_price: topBid?.amount || 0 })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create AI Express listing (bypasses RLS)
router.post('/api/items/create-listing', createLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { title, description, category, starting_price, image_urls, ai_generated, ai_tags, ai_condition, ai_confidence, weight_grams, seller_shipping_override } = req.body

    if (!title || !category) {
      res.status(400).json({ error: 'Missing required fields (title, category)' })
      return
    }

    const price = parseFloat(starting_price) || 0
    if (price < 0.01) {
      res.status(400).json({ error: 'Price must be at least 0.01\u20ac' })
      return
    }
    if (price > 50000) {
      res.status(400).json({ error: 'Price exceeds maximum allowed' })
      return
    }
    // ai_confidence comes as 70-98 from the AI but DB expects 0-1 (numeric(3,2))
    const normalizedConfidence = ai_confidence != null
      ? (ai_confidence > 1 ? ai_confidence / 100 : ai_confidence)
      : null

    const { data, error } = await supabase.from('items').insert({
      seller_id: userId,
      title,
      description: description || '',
      category,
      starting_price: price,
      current_price: price,
      image_urls: image_urls || [],
      ai_generated: ai_generated || false,
      ai_tags: ai_tags || [],
      ai_condition: ai_condition || null,
      ai_confidence: normalizedConfidence,
      weight_grams: (weight_grams && Number(weight_grams) > 0) ? Number(weight_grams) : null,
      seller_shipping_override: (seller_shipping_override && Number(seller_shipping_override) > 0) ? Number(seller_shipping_override) : null,
      status: 'draft',
    }).select('id').single()

    if (error) throw error
    res.json({ success: true, item_id: data.id })
  } catch (err: any) {
    console.error('Create listing error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Failed to create listing' })
  }
})

// Delete an item (owner only)
router.delete('/api/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const itemId = req.params.id

    // Verify ownership
    const { data: item } = await supabase.from('items').select('id, seller_id, status').eq('id', itemId).single()
    if (!item) { res.status(404).json({ error: 'Item not found' }); return }
    if (item.seller_id !== userId) { res.status(403).json({ error: 'Not your item' }); return }
    if (item.status === 'sold') { res.status(400).json({ error: 'Cannot delete sold item' }); return }

    const { error } = await supabase.from('items').delete().eq('id', itemId)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Activate an item (start auction) — uses service key to bypass RLS
router.post('/api/items/:id/activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id

    const { data: item } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', itemId)
      .single()

    if (!item || item.seller_id !== req.user!.id) {
      res.status(403).json({ error: 'Not your item' })
      return
    }

    const { error } = await supabase
      .from('items')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) throw error
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to activate item' })
  }
})

// Place a bid on an item (bypasses RLS)
router.post('/api/items/:id/bid', bidLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id
    const amount = Math.round(parseFloat(req.body.amount) * 100) / 100
    const userId = req.user!.id

    if (!amount || isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'Invalid bid amount' })
      return
    }

    // Verify item exists and is active
    const { data: item } = await supabase
      .from('items')
      .select('id, current_price, status, seller_id')
      .eq('id', itemId)
      .single()

    if (!item) {
      res.status(404).json({ error: 'Item not found' })
      return
    }
    if (item.status !== 'active') {
      res.status(400).json({ error: 'Auction is not active' })
      return
    }
    if (item.seller_id === userId) {
      res.status(400).json({ error: 'Cannot bid on your own item' })
      return
    }
    if (amount <= item.current_price) {
      res.status(400).json({ error: 'Bid must be higher than current price' })
      return
    }
    if (amount - item.current_price < 0.50) {
      res.status(400).json({ error: 'Minimum bid increment is 0.50\u20ac' })
      return
    }

    // Verify bidder has a saved payment method (card on file)
    const { data: bidderProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!bidderProfile?.stripe_customer_id) {
      res.status(403).json({ error: 'card_required' })
      return
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: bidderProfile.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      res.status(403).json({ error: 'card_required' })
      return
    }

    // Insert bid
    const { error: bidError } = await supabase.from('bids').insert({
      item_id: itemId,
      bidder_id: userId,
      amount,
    })
    if (bidError) throw bidError

    // Update item current price only if our bid is still the highest (race condition guard)
    const { data: updatedItem } = await supabase
      .from('items')
      .update({ current_price: amount })
      .eq('id', itemId)
      .lt('current_price', amount)
      .select('id')

    if (!updatedItem || updatedItem.length === 0) {
      // A higher concurrent bid already updated the price — bid is recorded but price not overwritten
      if (process.env.NODE_ENV !== 'production') console.log(`[Bid] Concurrent bid detected: item ${itemId}, amount ${amount} not applied (higher bid exists)`)
    }

    res.json({ success: true })
  } catch (err: any) {
    console.error('Bid error:', err?.message || err)
    res.status(500).json({ error: 'Failed to place bid' })
  }
})

// =============================================
// IA — Creation automatique de listing (auth + rate limit)
// =============================================
router.post('/api/ai/create-listing', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = CreateListingBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const { image_url, seller_id } = parsed.data

    // Verify the authenticated user is the seller
    if (seller_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only create listings for yourself' })
      return
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: image_url },
            },
            {
              type: 'text',
              text: `Analyze this product image for a live auction marketplace in Israel.
Return a JSON object with:
- "title": product name in Hebrew (with English in parentheses)
- "description": detailed description in Hebrew
- "category": one of [Cards, Sneakers, Vintage, Electronics, Fashion, Toys, Art, Jewelry, Other]
- "subcategory": more specific category
- "condition": one of [mint, near_mint, good, fair, poor]
- "tags": array of relevant tags
- "estimated_price_low": minimum estimated price in ILS
- "estimated_price_high": maximum estimated price in ILS
- "confidence": your confidence score 0 to 1

Return ONLY the JSON, no other text.`
            }
          ]
        }]
      })
    })

    const aiResult = await response.json() as { content?: { text?: string }[] }
    const content = aiResult.content?.[0]?.text
    if (!content) throw new Error('No AI response')

    let listing: Record<string, unknown>
    try {
      listing = JSON.parse(content)
    } catch {
      res.status(500).json({ error: 'Failed to parse AI response' })
      return
    }

    // Max price validation on AI-generated starting_price
    const aiPrice = Number(listing.estimated_price_low) || 0
    if (aiPrice > 50000) {
      res.status(400).json({ error: 'Price exceeds maximum allowed' })
      return
    }

    // ai_confidence comes as 0-1 from this prompt, but normalize just in case
    const confidence = listing.confidence != null
      ? (Number(listing.confidence) > 1 ? Number(listing.confidence) / 100 : Number(listing.confidence))
      : null

    const { data: item, error } = await supabase.from('items').insert({
      seller_id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      subcategory: listing.subcategory,
      image_urls: [image_url],
      starting_price: listing.estimated_price_low,
      current_price: listing.estimated_price_low,
      estimated_price_low: listing.estimated_price_low,
      estimated_price_high: listing.estimated_price_high,
      ai_generated: true,
      ai_tags: listing.tags,
      ai_condition: listing.condition,
      ai_confidence: confidence,
      status: 'draft',
    }).select().single()

    if (error) {
      res.status(500).json({ error: 'Failed to save listing' })
      return
    }

    res.json({ item, ai_analysis: listing })
  } catch {
    res.status(500).json({ error: 'AI analysis failed' })
  }
})

// =============================================
// IA — Generateur de banniere (auth + rate limit)
// =============================================
router.post('/api/ai/generate-store-banner', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = GenerateBannerBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
      return
    }
    const { image_url, store_name, style, seller_id } = parsed.data

    const conceptResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: image_url },
            },
            {
              type: 'text',
              text: `Tu es un directeur artistique expert en branding pour les boutiques en ligne.

Le vendeur "${store_name}" veut une image de presentation pour sa boutique sur une plateforme de live shopping en Israel.
Il a envoye cette photo comme inspiration.
${style ? `Style demande : ${style}` : ''}

Analyse cette image et genere :

1. "concept": Une description du concept visuel que tu proposes (2-3 phrases en francais)
2. "image_prompt": Un prompt detaille en anglais pour generer une image de banniere de boutique professionnelle inspiree de cette photo. Le prompt doit decrire :
   - Le style visuel (couleurs, ambiance, eclairage)
   - La composition (mise en page de banniere, ratio 16:9)
   - Les elements decoratifs inspires de la photo
   - L'espace pour le nom de la boutique
   - Un rendu moderne, clean, premium
   Le prompt doit commencer par "Professional e-commerce store banner, 16:9 ratio,"
3. "color_palette": Un array de 4 couleurs hex qui correspondent au mood
4. "tagline": Une phrase d'accroche courte et percutante pour la boutique (en hebreu + francais)

Retourne UNIQUEMENT le JSON, rien d'autre.`
            }
          ]
        }]
      })
    })

    const conceptResult = await conceptResponse.json() as { content?: { text?: string }[] }
    const conceptText = conceptResult.content?.[0]?.text
    if (!conceptText) throw new Error('No AI response for concept')

    let concept: Record<string, unknown>
    try {
      concept = JSON.parse(conceptText)
    } catch {
      res.status(500).json({ error: 'Failed to parse AI response' })
      return
    }

    // Generate image with Replicate (Flux)
    let generatedImageUrl = null

    if (process.env.REPLICATE_API_KEY) {
      const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-1.1-pro',
          input: {
            prompt: concept.image_prompt,
            aspect_ratio: '16:9',
            output_quality: 90,
          }
        })
      })

      const prediction = await replicateResponse.json() as { id: string; urls?: { get: string } }

      if (prediction.urls?.get) {
        let result: { status: string; output?: string | string[] } = { status: 'starting' }
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000))
          const pollResponse = await fetch(prediction.urls!.get, {
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}` }
          })
          result = await pollResponse.json() as typeof result
          if (result.status === 'succeeded' || result.status === 'failed') break
        }

        if (result.status === 'succeeded' && result.output) {
          generatedImageUrl = Array.isArray(result.output) ? result.output[0] : result.output
        }
      }
    }

    // Save to DB if seller_id provided
    if (seller_id && generatedImageUrl) {
      await supabase
        .from('sellers')
        .update({ store_banner_url: generatedImageUrl })
        .eq('id', seller_id)
    }

    res.json({
      concept: concept.concept,
      image_prompt: concept.image_prompt,
      color_palette: concept.color_palette,
      tagline: concept.tagline,
      generated_image_url: generatedImageUrl,
      inspiration_image: image_url,
    })
  } catch {
    res.status(500).json({ error: 'Banner generation failed' })
  }
})

export default router

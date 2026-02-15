import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'placeholder'
)

// =============================================
// Health
// =============================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// =============================================
// STREAMS
// =============================================
app.get('/api/streams', async (req, res) => {
  const { category, city, status } = req.query

  let query = supabase
    .from('streams')
    .select('*, seller:sellers!seller_id(store_name, id, profiles:profiles!id(display_name, avatar_url))')
    .in('status', status ? [status as string] : ['live', 'scheduled'])
    .order('engagement_score', { ascending: false })

  if (category) query = query.eq('category', category)
  if (city) query = query.eq('city', city)

  const { data, error } = await query.limit(50)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.get('/api/streams/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('streams')
    .select('*, seller:sellers!seller_id(store_name, id, profiles:profiles!id(display_name, avatar_url))')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Stream not found' })
  res.json(data)
})

app.post('/api/streams/:id/end', async (req, res) => {
  const { error } = await supabase
    .from('streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// =============================================
// ENCHÈRES
// =============================================
app.post('/api/items/:id/start-auction', async (req, res) => {
  const { error } = await supabase
    .from('items')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

app.post('/api/items/:id/end-auction', async (req, res) => {
  const { data: topBid } = await supabase
    .from('bids')
    .select('*')
    .eq('item_id', req.params.id)
    .order('amount', { ascending: false })
    .limit(1)
    .single()

  const status = topBid ? 'sold' : 'unsold'
  const winnerId = topBid?.bidder_id || null

  const { error } = await supabase
    .from('items')
    .update({
      status,
      winner_id: winnerId,
      current_price: topBid?.amount || undefined,
      ended_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })

  // Créer la commande si vendu
  if (topBid && winnerId) {
    const { data: item } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (item) {
      const platformFee = topBid.amount * 0.08  // 8% commission
      await supabase.from('orders').insert({
        buyer_id: winnerId,
        seller_id: item.seller_id,
        item_id: item.id,
        stream_id: item.stream_id,
        amount: topBid.amount,
        platform_fee: platformFee,
        seller_payout: topBid.amount - platformFee,
      })
    }
  }

  res.json({ success: true, status, winner_id: winnerId })
})

// =============================================
// IA — Création automatique de listing
// =============================================
app.post('/api/ai/create-listing', async (req, res) => {
  const { image_url, seller_id } = req.body

  if (!image_url || !seller_id) {
    return res.status(400).json({ error: 'image_url and seller_id required' })
  }

  try {
    // Appel à Claude API pour analyser l'image
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
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

    const listing = JSON.parse(content)

    // Insérer en brouillon
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
      ai_confidence: listing.confidence,
      status: 'draft',
    }).select().single()

    if (error) throw error

    res.json({ item, ai_analysis: listing })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI analysis failed' })
  }
})

// =============================================
// MATCHING — Lives personnalisés
// =============================================
app.get('/api/matching/personalized-lives', async (req, res) => {
  const userId = req.query.user_id as string

  if (!userId) {
    // Utilisateur non connecté : retourner les lives par popularité
    const { data } = await supabase
      .from('streams')
      .select('*, seller:sellers!seller_id(store_name)')
      .eq('status', 'live')
      .order('engagement_score', { ascending: false })
      .limit(20)
    return res.json(data || [])
  }

  // Récupérer les préférences utilisateur
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Récupérer l'historique récent (enchères, achats)
  const { data: recentBids } = await supabase
    .from('bids')
    .select('item:items!item_id(category, seller_id)')
    .eq('bidder_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Construire le score de matching
  let query = supabase
    .from('streams')
    .select('*, seller:sellers!seller_id(store_name, categories)')
    .eq('status', 'live')

  const { data: lives } = await query.limit(50)
  if (!lives) return res.json([])

  // Scoring simple (sera remplacé par ML plus tard)
  const scoredLives = lives.map(live => {
    let score = live.engagement_score || 0

    // Boost si catégorie préférée
    if (prefs?.favorite_categories?.includes(live.category)) {
      score += 50
    }

    // Boost si vendeur favori
    if (prefs?.favorite_sellers?.includes(live.seller_id)) {
      score += 100
    }

    // Boost si même ville
    if (prefs?.preferred_cities?.includes(live.city)) {
      score += 30
    }

    // Boost basé sur l'historique d'enchères
    const bidCategories = recentBids
      ?.map(b => (b.item as any)?.category)
      .filter(Boolean) || []
    if (bidCategories.includes(live.category)) {
      score += 25
    }

    return { ...live, matching_score: score }
  })

  // Trier par score + exploration (10% aléatoire pour découverte)
  scoredLives.sort((a, b) => {
    const exploreA = Math.random() < 0.1 ? Math.random() * 100 : 0
    const exploreB = Math.random() < 0.1 ? Math.random() * 100 : 0
    return (b.matching_score + exploreB) - (a.matching_score + exploreA)
  })

  res.json(scoredLives.slice(0, 20))
})

// =============================================
// COMMUNAUTÉS LOCALES
// =============================================
app.get('/api/communities', async (req, res) => {
  const { city } = req.query

  let query = supabase
    .from('communities')
    .select('*, member_count')
    .order('member_count', { ascending: false })

  if (city) query = query.eq('city', city)

  const { data, error } = await query.limit(20)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.get('/api/communities/nearby', async (req, res) => {
  const { lat, lng, radius_km } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required' })
  }

  const radiusMeters = (Number(radius_km) || 50) * 1000

  const { data, error } = await supabase.rpc('nearby_communities', {
    user_lat: Number(lat),
    user_lng: Number(lng),
    radius_meters: radiusMeters,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/communities/:id/join', async (req, res) => {
  const { user_id } = req.body
  const communityId = req.params.id

  const { error } = await supabase.from('community_members').insert({
    community_id: communityId,
    user_id,
  })

  if (error) return res.status(500).json({ error: error.message })

  // Incrémenter le compteur
  await supabase.rpc('increment_community_members', { community_id: communityId })

  res.json({ success: true })
})

// =============================================
// LIVE ADAPTATIF — Suggestions temps réel
// =============================================
app.get('/api/streams/:id/adaptive-suggestions', async (req, res) => {
  const streamId = req.params.id

  // Récupérer les métriques récentes (dernières 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: metrics } = await supabase
    .from('engagement_metrics')
    .select('*')
    .eq('stream_id', streamId)
    .gte('timestamp', fiveMinAgo)
    .order('timestamp', { ascending: false })

  if (!metrics || metrics.length === 0) {
    return res.json({ suggestions: [], energy: 'unknown' })
  }

  const latest = metrics[0]
  const suggestions: string[] = []

  // Règles de live adaptatif
  if (latest.energy_level === 'low') {
    suggestions.push('Engagement faible — lance une enchère flash à 1₪ pour réveiller le public')
    suggestions.push('Essaie de poser une question au chat')
  }

  if (latest.energy_level === 'peak') {
    suggestions.push('Engagement au max ! Lance ton article le plus cher maintenant')
    suggestions.push('Propose un bundle exclusif')
  }

  if (latest.active_chatters < latest.viewer_count * 0.1) {
    suggestions.push('Peu de gens chattent — invite les viewers à écrire un message')
  }

  if (latest.bids_count === 0 && latest.viewer_count > 5) {
    suggestions.push('Aucune enchère — baisse le prix de départ ou montre mieux l\'article')
  }

  const avgEngagement = metrics.reduce((sum, m) => sum + Number(m.engagement_rate), 0) / metrics.length
  if (avgEngagement > 0.3) {
    suggestions.push('Ton taux d\'engagement est excellent (>' + Math.round(avgEngagement * 100) + '%) — continue comme ça !')
  }

  res.json({
    suggestions,
    energy: latest.energy_level,
    metrics: {
      viewers: latest.viewer_count,
      chatters: latest.active_chatters,
      bids: latest.bids_count,
      reactions: latest.reactions_count,
      engagement_rate: latest.engagement_rate,
    }
  })
})

// =============================================
// ENGAGEMENT TRACKING
// =============================================
app.post('/api/streams/:id/track-engagement', async (req, res) => {
  const streamId = req.params.id
  const { viewer_count, active_chatters, bids_count, reactions_count, new_followers } = req.body

  const engagementRate = viewer_count > 0
    ? (active_chatters + bids_count + reactions_count) / viewer_count
    : 0

  let energyLevel = 'medium'
  if (engagementRate < 0.05) energyLevel = 'low'
  else if (engagementRate < 0.2) energyLevel = 'medium'
  else if (engagementRate < 0.4) energyLevel = 'high'
  else energyLevel = 'peak'

  const { error } = await supabase.from('engagement_metrics').insert({
    stream_id: streamId,
    timestamp: new Date().toISOString(),
    viewer_count,
    active_chatters,
    bids_count,
    reactions_count,
    new_followers: new_followers || 0,
    engagement_rate: engagementRate,
    energy_level: energyLevel,
  })

  // Mettre à jour le score d'engagement du stream
  await supabase
    .from('streams')
    .update({
      engagement_score: engagementRate * 100,
      viewer_count,
      peak_viewers: viewer_count,  // sera max() côté client
    })
    .eq('id', streamId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ energy_level: energyLevel, engagement_rate: engagementRate })
})

// =============================================
// IA — Générateur de bannière de boutique
// =============================================
app.post('/api/ai/generate-store-banner', async (req, res) => {
  const { image_url, store_name, style, seller_id } = req.body

  if (!image_url || !store_name) {
    return res.status(400).json({ error: 'image_url and store_name required' })
  }

  try {
    // Étape 1 : Claude analyse la photo et génère un concept créatif
    const conceptResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
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

Le vendeur "${store_name}" veut une image de présentation pour sa boutique sur une plateforme de live shopping en Israël.
Il a envoyé cette photo comme inspiration.
${style ? `Style demandé : ${style}` : ''}

Analyse cette image et génère :

1. "concept": Une description du concept visuel que tu proposes (2-3 phrases en français)
2. "image_prompt": Un prompt détaillé en anglais pour générer une image de bannière de boutique professionnelle inspirée de cette photo. Le prompt doit décrire :
   - Le style visuel (couleurs, ambiance, éclairage)
   - La composition (mise en page de bannière, ratio 16:9)
   - Les éléments décoratifs inspirés de la photo
   - L'espace pour le nom de la boutique
   - Un rendu moderne, clean, premium
   Le prompt doit commencer par "Professional e-commerce store banner, 16:9 ratio,"
3. "color_palette": Un array de 4 couleurs hex qui correspondent au mood
4. "tagline": Une phrase d'accroche courte et percutante pour la boutique (en hébreu + français)

Retourne UNIQUEMENT le JSON, rien d'autre.`
            }
          ]
        }]
      })
    })

    const conceptResult = await conceptResponse.json() as { content?: { text?: string }[] }
    const conceptText = conceptResult.content?.[0]?.text
    if (!conceptText) throw new Error('No AI response for concept')

    const concept = JSON.parse(conceptText)

    // Étape 2 : Générer l'image avec Replicate (Flux)
    let generatedImageUrl = null

    if (process.env.REPLICATE_API_KEY) {
      // Lancer la génération via Replicate Flux
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

      // Attendre le résultat (polling)
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

    // Sauvegarder en DB si seller_id fourni
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

  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Banner generation failed' })
  }
})

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`WhatFor API running on http://localhost:${PORT}`)
})

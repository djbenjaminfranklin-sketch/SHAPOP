import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CATEGORIES = [
  'Sneakers', 'Mode Femme', 'Mode Homme', 'Sacs', 'Bijoux',
  'Montres', 'High-tech', 'Gaming', 'Cartes', 'Vintage',
  'Art', 'Jouets', 'Musique', 'Sport', 'Photo',
]

const CONDITIONS = ['Neuf', 'Comme neuf', 'Bon etat', 'Correct']

const SYSTEM_PROMPT = `Tu es un expert en estimation d'objets pour une plateforme de live shopping (type Whatnot/Vinted).

Analyse l'image fournie et retourne un JSON avec ces champs :
- "title": titre court et precis de l'article (ex: "Nike Air Max 90 Infrared")
- "category": une des categories suivantes EXACTEMENT: ${CATEGORIES.join(', ')}
- "condition": une des conditions suivantes EXACTEMENT: ${CONDITIONS.join(', ')}
- "confidence": un score de confiance entre 70 et 98 (entier)
- "tags": un tableau de 4-6 tags pertinents en minuscule (ex: ["nike", "sneakers", "vintage"])
- "priceLow": prix bas estime en euros (entier) - prix minimum raisonnable sur le marche de l'occasion
- "priceHigh": prix haut estime en euros (entier) - prix maximum raisonnable sur le marche de l'occasion
- "description": description de 2-3 phrases en francais decrivant l'article, sa marque, ses caracteristiques et son etat apparent

IMPORTANT pour les prix :
- Base-toi sur les prix reels du marche de l'occasion (Vinted, Leboncoin, eBay)
- Tiens compte de la marque, du modele, de l'etat apparent sur la photo
- Pour les articles de luxe, verifie si c'est un modele connu et ajuste le prix en consequence
- Pour l'electronique, tiens compte de la generation/anciennete
- Si tu ne reconnais pas l'objet precisement, donne une estimation basee sur la categorie generale

Reponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte autour.`

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { image } = await req.json()

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Extract base64 data and media type from data URL
    let mediaType = 'image/jpeg'
    let base64Data = image

    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        mediaType = match[1]
        base64Data = match[2]
      }
    }

    // Call Claude API with vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: 'Analyse cet objet et donne-moi le JSON avec titre, categorie, etat, prix estime, tags et description.',
              },
            ],
          },
        ],
        system: SYSTEM_PROMPT,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Parse the JSON from Claude's response
    let result
    try {
      // Try to extract JSON even if there's surrounding text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    } catch {
      console.error('Failed to parse Claude response:', text)
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: text }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Validate and sanitize the result
    const sanitized = {
      title: String(result.title || 'Article'),
      category: CATEGORIES.includes(result.category) ? result.category : 'Vintage',
      condition: CONDITIONS.includes(result.condition) ? result.condition : 'Bon etat',
      confidence: Math.min(98, Math.max(70, Number(result.confidence) || 85)),
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 6).map(String) : ['article'],
      priceLow: Math.max(1, Number(result.priceLow) || 10),
      priceHigh: Math.max(Number(result.priceLow) || 10, Number(result.priceHigh) || 50),
      description: String(result.description || ''),
    }

    return new Response(
      JSON.stringify(sanitized),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})

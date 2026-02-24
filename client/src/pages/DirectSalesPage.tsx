import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import { categories, CategoryScroll } from '../components/CategoryIcons'
import { getLang } from '../lib/i18n'
import type { Item } from '../types/database'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

// Category ID → localized label mapping (matches CategoryIcons)
const catLabels: Record<string, Record<string, string>> = {
  fashion_w: { fr: 'Mode femme', en: "Women's fashion", he: 'אופנת נשים', es: 'Moda mujer' },
  fashion_m: { fr: 'Mode homme', en: "Men's fashion", he: 'אופנת גברים', es: 'Moda hombre' },
  sneakers: { fr: 'Sneakers', en: 'Sneakers', he: 'סניקרס', es: 'Sneakers' },
  bags: { fr: 'Sacs', en: 'Bags', he: 'תיקים', es: 'Bolsos' },
  jewelry: { fr: 'Bijoux', en: 'Jewelry', he: 'תכשיטים', es: 'Joyería' },
  watches: { fr: 'Montres', en: 'Watches', he: 'שעונים', es: 'Relojes' },
  beauty: { fr: 'Beaute', en: 'Beauty', he: 'יופי', es: 'Belleza' },
  electronics: { fr: 'High-tech', en: 'Electronics', he: 'אלקטרוניקה', es: 'Electrónica' },
  gaming: { fr: 'Gaming', en: 'Gaming', he: 'גיימינג', es: 'Gaming' },
  cards: { fr: 'Cartes', en: 'Cards', he: 'קלפים', es: 'Cartas' },
  toys: { fr: 'Jouets', en: 'Toys', he: 'צעצועים', es: 'Juguetes' },
  vintage: { fr: 'Vintage', en: 'Vintage', he: 'וינטג׳', es: 'Vintage' },
  art: { fr: 'Art', en: 'Art', he: 'אמנות', es: 'Arte' },
  furniture: { fr: 'Meubles', en: 'Furniture', he: 'רהיטים', es: 'Muebles' },
  home: { fr: 'Maison', en: 'Home', he: 'בית', es: 'Hogar' },
  sports: { fr: 'Sport', en: 'Sports', he: 'ספורט', es: 'Deportes' },
  fitness: { fr: 'Fitness', en: 'Fitness', he: 'כושר', es: 'Fitness' },
  music: { fr: 'Musique', en: 'Music', he: 'מוזיקה', es: 'Música' },
  books: { fr: 'Livres', en: 'Books', he: 'ספרים', es: 'Libros' },
  kids: { fr: 'Enfants', en: 'Kids', he: 'ילדים', es: 'Niños' },
  pets: { fr: 'Animaux', en: 'Pets', he: 'חיות מחמד', es: 'Mascotas' },
  auto: { fr: 'Auto-Moto', en: 'Auto-Moto', he: 'רכב', es: 'Auto-Moto' },
  garden: { fr: 'Jardin', en: 'Garden', he: 'גינה', es: 'Jardín' },
  food: { fr: 'Food', en: 'Food', he: 'אוכל', es: 'Comida' },
  handmade: { fr: 'Fait main', en: 'Handmade', he: 'עבודת יד', es: 'Hecho a mano' },
  collect: { fr: 'Collection', en: 'Collectibles', he: 'אספנות', es: 'Colección' },
  photo: { fr: 'Photo', en: 'Photo', he: 'צילום', es: 'Foto' },
  tools: { fr: 'Bricolage', en: 'DIY & Tools', he: 'כלי עבודה', es: 'Bricolaje' },
}

const content = {
  fr: {
    title: 'Ventes directes',
    subtitle: 'Articles mis en vente par AI Express',
    searchPlaceholder: 'Rechercher un article...',
    emptyTitle: 'Aucun article disponible',
    emptySubtitle: 'Les articles mis en vente via AI Express apparaitront ici.',
    noResults: 'Aucun resultat',
    noResultsSub: 'Essaie une autre categorie ou un autre mot-cle.',
    buy: 'Acheter',
    buyConfirm: 'Acheter pour',
    bought: 'Achete !',
  },
  en: {
    title: 'Direct Sales',
    subtitle: 'Items listed via AI Express',
    searchPlaceholder: 'Search items...',
    emptyTitle: 'No items available',
    emptySubtitle: 'Items listed via AI Express will appear here.',
    noResults: 'No results',
    noResultsSub: 'Try another category or keyword.',
    buy: 'Buy',
    buyConfirm: 'Buy for',
    bought: 'Purchased!',
  },
  he: {
    title: 'מכירות ישירות',
    subtitle: 'פריטים שהועלו דרך AI Express',
    searchPlaceholder: '...חיפוש פריטים',
    emptyTitle: 'אין פריטים זמינים',
    emptySubtitle: 'פריטים שהועלו דרך AI Express יופיעו כאן.',
    noResults: 'אין תוצאות',
    noResultsSub: 'נסה קטגוריה אחרת או מילת מפתח אחרת.',
    buy: 'קנה',
    buyConfirm: 'קנה ב',
    bought: '!נרכש',
  },
  es: {
    title: 'Ventas directas',
    subtitle: 'Articulos publicados via AI Express',
    searchPlaceholder: 'Buscar articulos...',
    emptyTitle: 'No hay articulos disponibles',
    emptySubtitle: 'Los articulos publicados via AI Express apareceran aqui.',
    noResults: 'Sin resultados',
    noResultsSub: 'Prueba otra categoria u otra palabra clave.',
    buy: 'Comprar',
    buyConfirm: 'Comprar por',
    bought: 'Comprado!',
  },
} as Record<string, Record<string, string>>

const retryTranslations: Record<string, string> = {
  fr: 'Reessayer',
  en: 'Retry',
  he: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
  es: 'Reintentar',
}

export default function DirectSalesPage() {
  const [items, setItems] = useState<ItemWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('for_you')
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null)
  const [buyError, setBuyError] = useState('')
  const [boughtItemId, setBoughtItemId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = getLang()
  const tx = content[lang] || content.fr
  usePageTitle(tx.title)

  // Fetch item favorites
  useEffect(() => {
    if (!user || !session?.access_token) return
    apiFetch('/api/item-favorites', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch favorites')
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setFavoriteIds(new Set(data.map((i: { id: string }) => i.id)))
        }
      })
      .catch(() => {})
  }, [user, session])

  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!user || !session?.access_token) {
      navigate('/login')
      return
    }
    const isFav = favoriteIds.has(itemId)
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    try {
      await apiFetch(`/api/item-favorites/${itemId}`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (isFav) next.add(itemId)
        else next.delete(itemId)
        return next
      })
    }
  }, [user, session, favoriteIds, navigate])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const cat = categories.find(c => c.id === selectedCategory)
      const categoryLabel = cat && cat.id !== 'for_you' && cat.id !== 'following' ? (catLabels[cat.id]?.[lang] || catLabels[cat.id]?.fr) : null
      const params = categoryLabel ? `?category=${encodeURIComponent(categoryLabel)}` : ''
      const res = await apiFetch(`/api/items/direct-sales${params}`)
      const data = await res.json()
      setItems(data || [])
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, lang])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Client-side search filter
  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.seller?.display_name?.toLowerCase().includes(q) ||
      item.ai_tags?.some(tag => tag.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <button onClick={() => navigate(-1)} aria-label={lang === 'fr' ? 'Retour' : lang === 'es' ? 'Volver' : lang === 'he' ? 'חזרה' : 'Back'} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>{tx.title}</h1>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F0908A" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>{tx.subtitle}</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#1a1a1a', borderRadius: '12px',
          padding: '10px 14px', border: '1px solid #222',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tx.searchPlaceholder}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: '14px',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label={lang === 'fr' ? 'Effacer la recherche' : lang === 'es' ? 'Borrar busqueda' : lang === 'he' ? 'נקה חיפוש' : 'Clear search'} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: '12px' }}>
        <CategoryScroll selected={selectedCategory} onSelect={setSelectedCategory} lang={lang} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#E8344E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : fetchError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(232,52,78,0.12), rgba(232,52,78,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={() => fetchItems()}
            aria-label={retryTranslations[lang] || retryTranslations.fr}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#E8344E', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {retryTranslations[lang] || retryTranslations.fr}
          </button>
        </div>
      ) : displayItems.length === 0 && items.length > 0 ? (
        // Search returned no matches but items exist
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{tx.noResults}</h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>{tx.noResultsSub}</p>
        </div>
      ) : displayItems.length === 0 ? (
        // No items at all
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{tx.emptyTitle}</h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>{tx.emptySubtitle}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-2">
          {displayItems.map(item => (
            <div key={item.id}>
              <ItemCard item={item} isFavorited={favoriteIds.has(item.id)} onToggleFavorite={toggleFavorite} />
              {/* Buy now button */}
              {user && item.seller_id !== user.id && (
                <button
                  disabled={buyingItemId === item.id || boughtItemId === item.id}
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!user) { navigate('/login'); return }
                    const price = item.current_price ?? item.starting_price
                    if (!confirm(`${tx.buyConfirm} ${price}€ ?`)) return
                    setBuyingItemId(item.id)
                    setBuyError('')
                    try {
                      const { data: { session: s } } = await supabase.auth.getSession()
                      if (!s) { setBuyingItemId(null); return }
                      const resp = await apiFetch(`/api/items/${item.id}/buy-now`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
                      })
                      if (resp.ok) {
                        setBoughtItemId(item.id)
                        setTimeout(() => {
                          setItems(prev => prev.filter(i => i.id !== item.id))
                          navigate('/activity')
                        }, 1200)
                      } else {
                        const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }))
                        setBuyError(err.error || 'Erreur')
                        alert(err.error || 'Erreur')
                      }
                    } catch { setBuyError('Erreur de connexion'); alert('Erreur de connexion') }
                    setBuyingItemId(null)
                  }}
                  style={{
                    width: '100%', marginTop: '6px', padding: '8px',
                    borderRadius: '10px', border: 'none',
                    background: boughtItemId === item.id
                      ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                      : buyingItemId === item.id
                        ? '#555'
                        : 'linear-gradient(135deg, #E8344E, #D42A42)',
                    color: '#fff', fontSize: '12px', fontWeight: 700,
                    cursor: buyingItemId === item.id ? 'default' : 'pointer',
                    opacity: buyingItemId === item.id ? 0.7 : 1,
                  }}
                >
                  {boughtItemId === item.id ? tx.bought : buyingItemId === item.id ? '...' : `${tx.buy} — ${item.current_price ?? item.starting_price}€`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

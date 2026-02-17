import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import { categories, CategoryScroll } from '../components/CategoryIcons'
import type { Item } from '../types/database'

type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

// Category ID → label mapping (matches CategoryIcons)
const catIdToLabel: Record<string, string> = {
  fashion_w: 'Mode femme', fashion_m: 'Mode homme', sneakers: 'Sneakers', bags: 'Sacs',
  jewelry: 'Bijoux', watches: 'Montres', beauty: 'Beaute', electronics: 'High-tech',
  gaming: 'Gaming', cards: 'Cartes', toys: 'Jouets', vintage: 'Vintage',
  art: 'Art', furniture: 'Meubles', home: 'Maison', sports: 'Sport',
  fitness: 'Fitness', music: 'Musique', books: 'Livres', kids: 'Enfants',
  pets: 'Animaux', auto: 'Auto-Moto', garden: 'Jardin', food: 'Food',
  handmade: 'Fait main', collect: 'Collection', photo: 'Photo', tools: 'Bricolage',
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
  },
  en: {
    title: 'Direct Sales',
    subtitle: 'Items listed via AI Express',
    searchPlaceholder: 'Search items...',
    emptyTitle: 'No items available',
    emptySubtitle: 'Items listed via AI Express will appear here.',
    noResults: 'No results',
    noResultsSub: 'Try another category or keyword.',
  },
  he: {
    title: 'מכירות ישירות',
    subtitle: 'פריטים שהועלו דרך AI Express',
    searchPlaceholder: '...חיפוש פריטים',
    emptyTitle: 'אין פריטים זמינים',
    emptySubtitle: 'פריטים שהועלו דרך AI Express יופיעו כאן.',
    noResults: 'אין תוצאות',
    noResultsSub: 'נסה קטגוריה אחרת או מילת מפתח אחרת.',
  },
  es: {
    title: 'Ventas directas',
    subtitle: 'Articulos publicados via AI Express',
    searchPlaceholder: 'Buscar articulos...',
    emptyTitle: 'No hay articulos disponibles',
    emptySubtitle: 'Los articulos publicados via AI Express apareceran aqui.',
    noResults: 'Sin resultados',
    noResultsSub: 'Prueba otra categoria u otra palabra clave.',
  },
} as Record<string, { title: string; subtitle: string; searchPlaceholder: string; emptyTitle: string; emptySubtitle: string; noResults: string; noResultsSub: string }>

export default function DirectSalesPage() {
  const [items, setItems] = useState<ItemWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('for_you')
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = localStorage.getItem('shapop_lang') || 'fr'
  const tx = content[lang] || content.fr

  // Fetch item favorites
  useEffect(() => {
    if (!user || !session?.access_token) return
    apiFetch('/api/item-favorites', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFavoriteIds(new Set(data.map((i: any) => i.id)))
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
    try {
      const cat = categories.find(c => c.id === selectedCategory)
      const categoryLabel = cat && cat.id !== 'for_you' && cat.id !== 'following' ? catIdToLabel[cat.id] : null
      const params = categoryLabel ? `?category=${encodeURIComponent(categoryLabel)}` : ''
      const res = await apiFetch(`/api/items/direct-sales${params}`)
      const data = await res.json()
      setItems(data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

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
        padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
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
            <ItemCard key={item.id} item={item} isFavorited={favoriteIds.has(item.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ItemCard from '../components/ItemCard'
import { categories, CategoryScroll } from '../components/CategoryIcons'
import { getLang, tr, type Localized } from '../lib/i18n'
import { formatItemPrice } from '../lib/fulfillment'
import type { Item } from '../types/database'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

const content = {
  en: {
    title: 'Direct sales',
    subtitle: 'Items listed with AI Express',
    searchPlaceholder: 'Search items…',
    emptyTitle: 'No items available',
    emptySubtitle: 'Items listed with AI Express will show up here.',
    noResults: 'No results',
    noResultsSub: 'Try another category or keyword.',
    buy: 'Buy',
    buyConfirm: 'Buy for {price}?',
    bought: 'Purchased!',
    back: 'Back',
    clearSearch: 'Clear search',
    retry: 'Retry',
    buyError: 'The purchase didn\'t go through. Please try again.',
    connectionError: 'Connection error. Check your network and try again.',
  },
  fr: {
    title: 'Ventes directes',
    subtitle: 'Articles mis en vente avec AI Express',
    searchPlaceholder: 'Rechercher un article…',
    emptyTitle: 'Aucun article disponible',
    emptySubtitle: 'Les articles mis en vente avec AI Express apparaîtront ici.',
    noResults: 'Aucun résultat',
    noResultsSub: 'Essaie une autre catégorie ou un autre mot-clé.',
    buy: 'Acheter',
    buyConfirm: 'Acheter pour {price} ?',
    bought: 'Acheté !',
    back: 'Retour',
    clearSearch: 'Effacer la recherche',
    retry: 'Réessayer',
    buyError: 'L\'achat n\'a pas abouti. Réessaie.',
    connectionError: 'Erreur de connexion. Vérifie ton réseau et réessaie.',
  },
  es: {
    title: 'Ventas directas',
    subtitle: 'Artículos publicados con AI Express',
    searchPlaceholder: 'Buscar artículos…',
    emptyTitle: 'No hay artículos disponibles',
    emptySubtitle: 'Los artículos publicados con AI Express aparecerán aquí.',
    noResults: 'Sin resultados',
    noResultsSub: 'Prueba otra categoría u otra palabra clave.',
    buy: 'Comprar',
    buyConfirm: '¿Comprar por {price}?',
    bought: '¡Comprado!',
    back: 'Volver',
    clearSearch: 'Borrar búsqueda',
    retry: 'Reintentar',
    buyError: 'No se pudo completar la compra. Inténtalo de nuevo.',
    connectionError: 'Error de conexión. Revisa tu red e inténtalo de nuevo.',
  },
  ru: {
    title: 'Прямые продажи',
    subtitle: 'Товары, выставленные через AI Express',
    searchPlaceholder: 'Поиск товаров…',
    emptyTitle: 'Пока нет товаров',
    emptySubtitle: 'Здесь появятся товары, выставленные через AI Express.',
    noResults: 'Ничего не найдено',
    noResultsSub: 'Попробуй другую категорию или другое слово.',
    buy: 'Купить',
    buyConfirm: 'Купить за {price}?',
    bought: 'Куплено!',
    back: 'Назад',
    clearSearch: 'Очистить поиск',
    retry: 'Повторить',
    buyError: 'Не удалось оформить покупку. Попробуй ещё раз.',
    connectionError: 'Ошибка соединения. Проверь сеть и попробуй ещё раз.',
  },
  he: {
    title: 'מכירות ישירות',
    subtitle: 'פריטים שפורסמו דרך AI Express',
    searchPlaceholder: 'חיפוש פריטים…',
    emptyTitle: 'אין פריטים זמינים',
    emptySubtitle: 'פריטים שפורסמו דרך AI Express יופיעו כאן.',
    noResults: 'אין תוצאות',
    noResultsSub: 'אפשר לנסות קטגוריה אחרת או מילת חיפוש אחרת.',
    buy: 'לקנייה',
    buyConfirm: 'לקנות ב-{price}?',
    bought: 'נרכש!',
    back: 'חזרה',
    clearSearch: 'ניקוי החיפוש',
    retry: 'לנסות שוב',
    buyError: 'הרכישה לא הושלמה. כדאי לנסות שוב.',
    connectionError: 'שגיאת חיבור. כדאי לבדוק את הרשת ולנסות שוב.',
  },
} satisfies Localized<Record<string, string>>

export default function DirectSalesPage() {
  const [items, setItems] = useState<ItemWithSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('for_you')
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null)
  const [, setBuyError] = useState('')
  const [boughtItemId, setBoughtItemId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, session, profile } = useAuth()
  const lang = getLang()
  const tx = tr(content, lang)
  // Prix : le pays du vendeur n'est pas renvoyé par /api/items/direct-sales → devise du pays de l'utilisateur
  const price = (n: number | null | undefined) => formatItemPrice(n, profile?.country, lang)
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
      // Filtre par identifiant de catégorie (valeur enregistrée sur les articles), jamais par un nom traduit
      const categoryId = cat && cat.id !== 'for_you' && cat.id !== 'following' ? cat.id : null
      const params = categoryId ? `?category=${encodeURIComponent(categoryId)}` : ''
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
        <button onClick={() => navigate(-1)} aria-label={tx.back} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{tx.title}</h1>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#00E5FF" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>{tx.subtitle}</p>
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
              color: '#fff', fontSize: 'calc(14px * var(--fs, 1))',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label={tx.clearSearch} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
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
            borderTopColor: '#00E5FF', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : fetchError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,229,255,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={() => fetchItems()}
            aria-label={tx.retry}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#00E5FF', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {tx.retry}
          </button>
        </div>
      ) : displayItems.length === 0 && items.length > 0 ? (
        // Search returned no matches but items exist
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12), rgba(0,229,255,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{tx.noResults}</h3>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: 0, maxWidth: '260px' }}>{tx.noResultsSub}</p>
        </div>
      ) : displayItems.length === 0 ? (
        // No items at all
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12), rgba(0,229,255,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{tx.emptyTitle}</h3>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: 0, maxWidth: '260px' }}>{tx.emptySubtitle}</p>
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
                    if (!confirm(tx.buyConfirm.replace('{price}', price(item.current_price ?? item.starting_price)))) return
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
                        const err = await resp.json().catch(() => ({}))
                        if (import.meta.env.DEV) console.error(err)
                        setBuyError(tx.buyError)
                        alert(tx.buyError)
                      }
                    } catch { setBuyError(tx.connectionError); alert(tx.connectionError) }
                    setBuyingItemId(null)
                  }}
                  style={{
                    width: '100%', marginTop: '6px', padding: '8px',
                    borderRadius: '10px', border: 'none',
                    background: boughtItemId === item.id
                      ? '#22C55E'
                      : buyingItemId === item.id
                        ? '#555'
                        : 'linear-gradient(135deg, #00E5FF, #0091EA)',
                    color: boughtItemId === item.id || buyingItemId === item.id ? '#fff' : '#001014', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
                    cursor: buyingItemId === item.id ? 'default' : 'pointer',
                    opacity: buyingItemId === item.id ? 0.7 : 1,
                  }}
                >
                  {boughtItemId === item.id ? tx.bought : buyingItemId === item.id ? '…' : `${tx.buy} — ${price(item.current_price ?? item.starting_price)}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

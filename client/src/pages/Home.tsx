import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StreamCard from '../components/stream/StreamCard'
import { categories, CategoryScroll } from '../components/CategoryIcons'
import { useLocation } from '../hooks/useLocation'
import { useAuth } from '../contexts/AuthContext'
import type { Stream } from '../types/database'
import PreferencesModal, { loadPreferences, hasPreferences } from '../components/PreferencesModal'
import { sortStreamsByMatch } from '../lib/matchingAlgorithm'
import { getBehaviorData } from '../lib/behaviorTracker'
import { cacheGet, cacheSet } from '../lib/cache'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'
import { usePageTitle } from '../hooks/usePageTitle'
import { rtlFlip } from '../lib/rtl'

type StreamWithSeller = Stream & { seller?: { display_name: string; avatar_url: string | null; store_name?: string }; seller_score?: number; seller_trust_level?: string }

import { t, tr, useLang, setLang, LANGS, LANG_META, type Localized } from '../lib/i18n'
import CitySearchField from '../components/CitySearchField'
import { useCitySuggestions } from '../hooks/useCitySuggestions'
import { buildCitySuggestions, sameCity, type CityOption } from '../lib/cities'
import { PAID_EXTRAS_ENABLED } from '../lib/paidExtras'
import { DIRECT_SALES_ENABLED } from '../lib/directSales'
import { DEMO_LIVES_ENABLED, demoLives } from '../lib/demoLives'

type HomeText = {
  sortedByRelevance: string
  basedOnPrefs: string
  modify: string
  promoCta: string
  promoCommission: string
  directSales: string
  emptyTitle: string
  emptySubtitle: string
  retry: string
  tagline: string
  subtitle: string
  signIn: string
  createAccount: string
  filters: string
  messages: string
  notifications: string
  language: string
  recentSearches: string
  clear: string
  clearSearch: string
  city: string
  nearbyLives: string
  cityPlaceholder: string
  minSellerRating: string
  all: string
  reset: string
  refreshing: string
  loadingStreams: string
  closePromo: string
  pageTitle: string
}

const homeContent: Localized<HomeText> = {
  en: {
    sortedByRelevance: 'Sorted by relevance',
    basedOnPrefs: 'Based on your preferences',
    modify: 'Edit',
    promoCta: 'Grab it now!',
    promoCommission: 'Reduced commission',
    directSales: 'Browse direct sales',
    emptyTitle: 'No live streams right now',
    emptySubtitle: 'Come back soon or start your own live!',
    retry: 'Retry',
    tagline: 'Live shopping,\nreinvented.',
    subtitle: 'Buy, sell and join live streams with thousands of enthusiasts.',
    signIn: 'Sign in',
    createAccount: 'Create account',
    filters: 'Filters',
    messages: 'Messages',
    notifications: 'Notifications',
    language: 'Language',
    recentSearches: 'Recent searches',
    clear: 'Clear',
    clearSearch: 'Clear search',
    city: 'City',
    nearbyLives: 'Lives near me',
    cityPlaceholder: 'London, New York...',
    minSellerRating: 'Minimum seller rating',
    all: 'All',
    reset: 'Reset',
    refreshing: 'Refreshing...',
    loadingStreams: 'Loading live streams',
    closePromo: 'Close',
    pageTitle: 'ShaPop — Live Shopping',
  },
  fr: {
    sortedByRelevance: 'Trié par pertinence',
    basedOnPrefs: 'Selon tes préférences',
    modify: 'Modifier',
    promoCta: 'Profites-en !',
    promoCommission: 'Commission réduite',
    directSales: 'Voir les ventes directes',
    emptyTitle: 'Aucun live en ce moment',
    emptySubtitle: 'Reviens bientôt ou lance ton propre live !',
    retry: 'Réessayer',
    tagline: 'Le shopping en live,\nréinventé.',
    subtitle: 'Achète, vends et rejoins des lives avec des milliers de passionnés.',
    signIn: 'Se connecter',
    createAccount: 'Créer un compte',
    filters: 'Filtres',
    messages: 'Messages',
    notifications: 'Notifications',
    language: 'Langue',
    recentSearches: 'Recherches récentes',
    clear: 'Effacer',
    clearSearch: 'Effacer la recherche',
    city: 'Ville',
    nearbyLives: 'Lives autour de toi',
    cityPlaceholder: 'Londres, New York...',
    minSellerRating: 'Note minimale du vendeur',
    all: 'Tous',
    reset: 'Réinitialiser',
    refreshing: 'Actualisation...',
    loadingStreams: 'Chargement des lives',
    closePromo: 'Fermer',
    pageTitle: 'ShaPop — Shopping en live',
  },
  es: {
    sortedByRelevance: 'Ordenado por relevancia',
    basedOnPrefs: 'Según tus preferencias',
    modify: 'Editar',
    promoCta: '¡Aprovéchalo!',
    promoCommission: 'Comisión reducida',
    directSales: 'Ver ventas directas',
    emptyTitle: 'No hay directos ahora mismo',
    emptySubtitle: '¡Vuelve pronto o empieza tu propio directo!',
    retry: 'Reintentar',
    tagline: 'Compras en directo,\nreinventadas.',
    subtitle: 'Compra, vende y únete a directos con miles de apasionados.',
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    filters: 'Filtros',
    messages: 'Mensajes',
    notifications: 'Notificaciones',
    language: 'Idioma',
    recentSearches: 'Búsquedas recientes',
    clear: 'Borrar',
    clearSearch: 'Borrar búsqueda',
    city: 'Ciudad',
    nearbyLives: 'Directos cerca de mí',
    cityPlaceholder: 'Londres, Nueva York...',
    minSellerRating: 'Valoración mínima del vendedor',
    all: 'Todos',
    reset: 'Restablecer',
    refreshing: 'Actualizando...',
    loadingStreams: 'Cargando directos',
    closePromo: 'Cerrar',
    pageTitle: 'ShaPop — Compras en directo',
  },
  ru: {
    sortedByRelevance: 'По релевантности',
    basedOnPrefs: 'С учётом твоих предпочтений',
    modify: 'Изменить',
    promoCta: 'Успей воспользоваться!',
    promoCommission: 'Сниженная комиссия',
    directSales: 'Смотреть прямые продажи',
    emptyTitle: 'Сейчас нет эфиров',
    emptySubtitle: 'Загляни позже или запусти свой эфир!',
    retry: 'Повторить',
    tagline: 'Покупки в прямом эфире —\nпо-новому.',
    subtitle: 'Покупай, продавай и участвуй в эфирах вместе с тысячами увлечённых людей.',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',
    filters: 'Фильтры',
    messages: 'Сообщения',
    notifications: 'Уведомления',
    language: 'Язык',
    recentSearches: 'Недавние запросы',
    clear: 'Очистить',
    clearSearch: 'Очистить поиск',
    city: 'Город',
    nearbyLives: 'Эфиры рядом',
    cityPlaceholder: 'Лондон, Нью-Йорк...',
    minSellerRating: 'Минимальный рейтинг продавца',
    all: 'Все',
    reset: 'Сбросить',
    refreshing: 'Обновление...',
    loadingStreams: 'Загрузка эфиров',
    closePromo: 'Закрыть',
    pageTitle: 'ShaPop — покупки в прямом эфире',
  },
  he: {
    sortedByRelevance: 'ממוין לפי רלוונטיות',
    basedOnPrefs: 'לפי ההעדפות שלך',
    modify: 'עריכה',
    promoCta: 'נצלו את ההזדמנות!',
    promoCommission: 'עמלה מופחתת',
    directSales: 'למכירות הישירות',
    emptyTitle: 'אין שידורים חיים כרגע',
    emptySubtitle: 'חזרו בקרוב או פתחו שידור חי משלכם!',
    retry: 'נסו שוב',
    tagline: 'קניות בשידור חי,\nבגרסה חדשה.',
    subtitle: 'קונים, מוכרים ומצטרפים לשידורים חיים עם אלפי חובבים.',
    signIn: 'התחברות',
    createAccount: 'יצירת חשבון',
    filters: 'מסננים',
    messages: 'הודעות',
    notifications: 'התראות',
    language: 'שפה',
    recentSearches: 'חיפושים אחרונים',
    clear: 'ניקוי',
    clearSearch: 'ניקוי החיפוש',
    city: 'עיר',
    nearbyLives: 'שידורים קרוב אליי',
    cityPlaceholder: 'לונדון, ניו יורק...',
    minSellerRating: 'דירוג מוכר מינימלי',
    all: 'הכל',
    reset: 'איפוס',
    refreshing: 'מרענן...',
    loadingStreams: 'טוען שידורים חיים',
    closePromo: 'סגירה',
    pageTitle: 'ShaPop — קניות בשידור חי',
  },
}

// Identifiant de catégorie → libellés possibles en base (toutes langues confondues),
// pour retrouver les lives d'une catégorie quelle que soit la langue du vendeur.
const catLabels: Record<string, Localized<string>> = {
  fashion_w: { en: "Women's fashion", fr: 'Mode femme', es: 'Moda mujer', ru: 'Женская мода', he: 'אופנת נשים' },
  fashion_m: { en: "Men's fashion", fr: 'Mode homme', es: 'Moda hombre', ru: 'Мужская мода', he: 'אופנת גברים' },
  sneakers: { en: 'Sneakers', fr: 'Sneakers', es: 'Sneakers', ru: 'Кроссовки', he: 'סניקרס' },
  bags: { en: 'Bags', fr: 'Sacs', es: 'Bolsos', ru: 'Сумки', he: 'תיקים' },
  jewelry: { en: 'Jewelry', fr: 'Bijoux', es: 'Joyería', ru: 'Украшения', he: 'תכשיטים' },
  watches: { en: 'Watches', fr: 'Montres', es: 'Relojes', ru: 'Часы', he: 'שעונים' },
  beauty: { en: 'Beauty', fr: 'Beauté', es: 'Belleza', ru: 'Красота', he: 'יופי' },
  electronics: { en: 'Electronics', fr: 'High-tech', es: 'Electrónica', ru: 'Электроника', he: 'אלקטרוניקה' },
  gaming: { en: 'Gaming', fr: 'Gaming', es: 'Gaming', ru: 'Игры', he: 'גיימינג' },
  cards: { en: 'Cards', fr: 'Cartes', es: 'Cartas', ru: 'Карточки', he: 'קלפים' },
  toys: { en: 'Toys', fr: 'Jouets', es: 'Juguetes', ru: 'Игрушки', he: 'צעצועים' },
  vintage: { en: 'Vintage', fr: 'Vintage', es: 'Vintage', ru: 'Винтаж', he: 'וינטג׳' },
  art: { en: 'Art', fr: 'Art', es: 'Arte', ru: 'Искусство', he: 'אמנות' },
  furniture: { en: 'Furniture', fr: 'Meubles', es: 'Muebles', ru: 'Мебель', he: 'רהיטים' },
  home: { en: 'Home', fr: 'Maison', es: 'Hogar', ru: 'Дом', he: 'בית' },
  sports: { en: 'Sports', fr: 'Sport', es: 'Deportes', ru: 'Спорт', he: 'ספורט' },
  fitness: { en: 'Fitness', fr: 'Fitness', es: 'Fitness', ru: 'Фитнес', he: 'כושר' },
  music: { en: 'Music', fr: 'Musique', es: 'Música', ru: 'Музыка', he: 'מוזיקה' },
  books: { en: 'Books', fr: 'Livres', es: 'Libros', ru: 'Книги', he: 'ספרים' },
  kids: { en: 'Kids', fr: 'Enfants', es: 'Niños', ru: 'Детям', he: 'ילדים' },
  pets: { en: 'Pets', fr: 'Animaux', es: 'Mascotas', ru: 'Животные', he: 'חיות מחמד' },
  auto: { en: 'Auto-Moto', fr: 'Auto-Moto', es: 'Auto-Moto', ru: 'Авто и мото', he: 'רכב' },
  garden: { en: 'Garden', fr: 'Jardin', es: 'Jardín', ru: 'Сад', he: 'גינה' },
  food: { en: 'Food', fr: 'Food', es: 'Comida', ru: 'Еда', he: 'אוכל' },
  handmade: { en: 'Handmade', fr: 'Fait main', es: 'Hecho a mano', ru: 'Ручная работа', he: 'עבודת יד' },
  collect: { en: 'Collectibles', fr: 'Collection', es: 'Colección', ru: 'Коллекционное', he: 'אספנות' },
  photo: { en: 'Photo', fr: 'Photo', es: 'Foto', ru: 'Фото', he: 'צילום' },
  tools: { en: 'DIY & Tools', fr: 'Bricolage', es: 'Bricolaje', ru: 'Инструменты', he: 'כלי עבודה' },
}

// Anciennes valeurs enregistrées en base (sans accent) encore reconnues
const legacyCatLabels: Record<string, string[]> = {
  beauty: ['Beaute'],
}

export default function Home() {
  const lang = useLang()
  const ht = tr(homeContent, lang)
  usePageTitle(ht.pageTitle)
  const [streams, setStreams] = useState<StreamWithSeller[]>(() => {
    // Load cached streams instantly (5 min TTL — stale streams disappear fast)
    return cacheGet<StreamWithSeller[]>('home_streams', 5 * 60 * 1000) || []
  })
  const [searchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'for_you')
  const hasCachedStreams = useRef(!!cacheGet<StreamWithSeller[]>('home_streams', 5 * 60 * 1000))
  const [loading, setLoading] = useState(!hasCachedStreams.current)
  const [refreshing, setRefreshing] = useState(hasCachedStreams.current)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showPrefsModal, setShowPrefsModal] = useState(() => {
    // Only show after a fresh login/register, not on app restart
    const freshLogin = sessionStorage.getItem('shapop_fresh_login')
    if (freshLogin && !hasPreferences()) {
      sessionStorage.removeItem('shapop_fresh_login')
      return true
    }
    return false
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('shapop_search_history') || '[]') } catch { return [] }
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filterCity, setFilterCity] = useState('')
  const [filterMinRating, setFilterMinRating] = useState(0) // 0 = no filter, 3, 4, 4.5
  const [fetchError, setFetchError] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [activePromotion, setActivePromotion] = useState<{ id: string; title: string; description: string | null; type: string; discount_percent: number } | null>(null)
  const [promoBannerDismissed, setPromoBannerDismissed] = useState(false)
  const navigate = useNavigate()
  // Inscription vendeur faite sur le site : direction l'assistant « Devenir vendeur » (tableau de bord)
  const { profile: siteProfile } = useAuth()
  useEffect(() => {
    if (siteProfile && localStorage.getItem('shapop_open_seller_onboarding')) navigate('/dashboard')
  }, [siteProfile, navigate])
  const { city, cityLabel: cityName, cityOption, loading: locationLoading, setManualCity } = useLocation()
  const { user, loading: authLoading, updateCity } = useAuth()

  // Track page view on mount
  useEffect(() => {
    track('page_view', { page: 'home' })
  }, [])

  // Fetch active promotions
  useEffect(() => {
    const controller = new AbortController()
    const fetchPromo = async () => {
      try {
        const res = await apiFetch('/api/promotions/active', { signal: controller.signal })
        if (!controller.signal.aborted && res.ok) {
          const data = await res.json()
          // Plus de transporteur : seules les promos sur la commission s'affichent
          const promo = Array.isArray(data) ? data.find((p: { type?: string }) => p.type === 'commission') : null
          if (!controller.signal.aborted && promo) {
            setActivePromotion(promo)
          }
        }
      } catch { /* ignore */ }
    }
    fetchPromo()
    return () => controller.abort()
  }, [])

  // Sync detected city to user profile
  useEffect(() => {
    if (city && user) {
      updateCity(city).catch(() => {})
    }
  }, [city, user, updateCity])

  const fetchStreams = useCallback(async () => {
    setFetchError(false)
    try {
      let query = supabase
        .from('streams')
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url, is_boosted, seller_type, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
      // Directs boostés en tête seulement si les extras payants sont actifs
      if (PAID_EXTRAS_ENABLED) query = query.order('is_boosted', { ascending: false, nullsFirst: false })
      query = query
        .order('status', { ascending: true })
        .order('viewer_count', { ascending: false })

      const cat = categories.find(c => c.id === selectedCategory)
      if (cat && cat.id !== 'for_you' && cat.id !== 'following') {
        query = query.eq('category', cat.label)
      }

      const { data } = await query
      const real = ((data || []) as unknown as StreamWithSeller[])
      // Faux directs seulement dans une version d'essai compilée avec VITE_DEMO_LIVES=1 (lib/demoLives.ts)
      const fresh = DEMO_LIVES_ENABLED ? [...real, ...demoLives<StreamWithSeller>()] : real
      setStreams(fresh)
      cacheSet('home_streams', fresh)
    } catch (err) {
      console.error('fetchStreams failed:', err)
      // Fetch failed — show retry if no cached data
      if (streams.length === 0) setFetchError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchStreams()

    const channel = supabase
      .channel('streams-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => {
        fetchStreams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchStreams])

  // Fetch favorite IDs for heart buttons
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const fetchFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || controller.signal.aborted) return
        const res = await apiFetch('/api/favorites', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        })
        if (!controller.signal.aborted && res.ok) {
          const data = await res.json()
          setFavoriteIds(new Set(data.map((s: { id: string }) => s.id)))
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error('fetchFavorites failed:', err)
      }
    }
    fetchFavorites()
    return () => controller.abort()
  }, [user])

  const toggleFavorite = useCallback(async (streamId: string) => {
    if (!user) { navigate('/login'); return }
    let wasFav = false
    // Optimistic update using functional state to avoid stale closure
    setFavoriteIds(prev => {
      wasFav = prev.has(streamId)
      const next = new Set(prev)
      if (wasFav) next.delete(streamId)
      else next.add(streamId)
      return next
    })
    if (!wasFav) {
      track('item_favorited', { item_id: streamId })
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await apiFetch(`/api/favorites/${streamId}`, {
        method: wasFav ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch (err) {
      console.error('toggleFavorite failed:', err)
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (wasFav) next.add(streamId)
        else next.delete(streamId)
        return next
      })
    }
  }, [user, navigate])

  // Apply matching algorithm when "Pour toi" tab is active
  // Uses both explicit preferences AND behavioral tracking (what you actually watch)
  const filteredStreams = useMemo((): StreamWithSeller[] => {
    if (selectedCategory === 'for_you') {
      const prefs = loadPreferences()
      const behavior = getBehaviorData()
      const hasExplicitPrefs = prefs && (prefs.favorite_categories.length > 0 || prefs.preferred_cities.length > 0 || prefs.favorite_sellers.length > 0)
      const hasBehaviorData = behavior.totalViews > 0

      if (hasExplicitPrefs || hasBehaviorData) {
        const defaultPrefs = prefs || { favorite_categories: [], preferred_cities: [], price_range_min: 0, price_range_max: 10000, favorite_sellers: [] }
        return sortStreamsByMatch(streams, defaultPrefs)
      }
      return streams
    }
    if (selectedCategory === 'following') return streams
    // Filtre par catégorie : on accepte le libellé dans n'importe quelle langue
    const labels = catLabels[selectedCategory]
    if (labels) {
      const accepted = new Set<string>([
        ...Object.values(labels),
        ...(legacyCatLabels[selectedCategory] || []),
        ...categories.filter(c => c.id === selectedCategory).map(c => c.label),
      ])
      const filtered = streams.filter(s => accepted.has(s.category))
      if (filtered.length > 0) return filtered
    }
    return streams
  }, [streams, selectedCategory])

  const displayStreams = useMemo(() => {
    const blocked: string[] = JSON.parse(localStorage.getItem('shapop_blocked_users') || '[]')
    let result = filteredStreams.filter(s => !blocked.includes(s.seller_id))
    // City filter
    if (filterCity) {
      const fc = filterCity.toLowerCase()
      result = result.filter(s => (s.city || '').toLowerCase().includes(fc))
    }
    // Seller rating filter
    if (filterMinRating > 0) {
      result = result.filter(s => (s.seller_score || 0) >= filterMinRating)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q)
        || s.category.toLowerCase().includes(q)
        || (s.seller?.store_name || s.seller?.display_name || '').toLowerCase().includes(q)
        || (s.city || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [filteredStreams, searchQuery, filterCity, filterMinRating])

  const handleCitySelect = (selectedCity: CityOption | null) => {
    setManualCity(selectedCity)
    setShowCityPicker(false)
  }

  const saveSearchHistory = (query: string) => {
    const q = query.trim()
    if (!q || q.length < 2) return
    const updated = [q, ...searchHistory.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 10)
    setSearchHistory(updated)
    localStorage.setItem('shapop_search_history', JSON.stringify(updated))
  }

  const removeSearchHistoryItem = (item: string) => {
    const updated = searchHistory.filter(h => h !== item)
    setSearchHistory(updated)
    localStorage.setItem('shapop_search_history', JSON.stringify(updated))
  }

  // Pull-to-refresh (disabled — causes glitchy behavior on iOS WKWebView)
  const scrollRef = useRef<HTMLDivElement>(null)


  // ═══ WELCOME SCREEN — shown when user is not logged in ═══
  if (!user && !authLoading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 32px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 16px)',
      }}>
        <img src="/logo.png" alt="ShaPop" style={{ width: '60%', maxWidth: '260px', marginBottom: '40px', objectFit: 'contain' }} />
        <h1 style={{
          fontSize: 'calc(32px * var(--fs, 1))', fontWeight: 900, color: '#fff',
          textAlign: 'center', lineHeight: 1.2, margin: '0 0 16px',
          whiteSpace: 'pre-line',
        }}>
          {ht.tagline}
        </h1>
        <p style={{
          fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
          lineHeight: 1.5, maxWidth: '320px', margin: '0 0 40px',
        }}>
          {ht.subtitle}
        </p>
        <Link to="/login" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px',
          borderRadius: '14px', textDecoration: 'none',
          background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
          color: '#001014', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, textAlign: 'center',
          boxShadow: '0 6px 24px rgba(0, 229, 255,0.35)', marginBottom: '12px',
        }}>
          {ht.signIn}
        </Link>
        <Link to="/register" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px',
          borderRadius: '14px', textDecoration: 'none',
          backgroundColor: 'transparent', border: '1.5px solid #333',
          color: '#ccc', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, textAlign: 'center',
        }}>
          {ht.createAccount}
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="pb-20"
      // Hauteur = la zone qui défile, pas l'écran entier (28/11) : avec « min-h-screen », l'accueil dépassait
      // toujours de la place de la barre du bas -> petite marge à faire défiler même sans contenu
      style={{ overflowX: 'hidden', maxWidth: '100%', width: '100%', minHeight: '100%', backgroundColor: '#0A0A0A' }}
    >
      {/* Top bar — WhatNot-style clean header */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)', backgroundColor: '#0A0A0A', position: 'sticky', top: 0, zIndex: 40 }}>

        {/* Search bar + icons — priority layout like WhatNot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px 6px' }}>
          <div style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#1C1C1E', borderRadius: '12px', padding: '10px 12px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={e => { if (e.key === 'Enter') { saveSearchHistory(searchQuery); setSearchFocused(false); (e.target as HTMLInputElement).blur() } }}
              placeholder={t(lang, 'search_placeholder')}
              aria-label={t(lang, 'search_placeholder')}
              style={{ background: 'transparent', fontSize: 'calc(15px * var(--fs, 1))', color: '#fff', outline: 'none', border: 'none', flex: 1, minWidth: 0 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label={ht.clearSearch} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={ht.filters}
            style={{
              padding: '6px', background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative', flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={(filterCity || filterMinRating > 0) ? '#00E5FF' : '#999'} strokeWidth="1.5">
              <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/>
              <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round"/>
              <line x1="10" y1="18" x2="14" y2="18" strokeLinecap="round"/>
            </svg>
            {(filterCity || filterMinRating > 0) && (
              <div style={{ position: 'absolute', top: '6px', insetInlineEnd: '6px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF' }} />
            )}
          </button>
          {/* Chat icon */}
          <button onClick={() => navigate('/messages')} aria-label={ht.messages} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Notifications */}
          <button onClick={() => navigate('/notifications')} aria-label={ht.notifications} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ overflow: 'visible', display: 'block' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Langue : bouton drapeau seul (la place manque pour le nom à 390 px), menu drapeau + nom natif */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowLangPicker(!showLangPicker)}
              aria-haspopup="menu"
              aria-expanded={showLangPicker}
              aria-label={`${ht.language} : ${LANG_META[lang].name}`}
              data-testid="lang-selector"
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#1C1C1E', border: '1px solid #2A2A2A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 'calc(16px * var(--fs, 1))', lineHeight: 1, padding: 0,
              }}
            >
              <span aria-hidden="true" className="no-theme-invert">{LANG_META[lang].flag}</span>
            </button>
            {showLangPicker && (
              <div role="menu" style={{
                position: 'absolute', top: '110%', insetInlineEnd: 0,
                backgroundColor: '#1C1C1E', borderRadius: '14px',
                padding: '6px 0', zIndex: 51, minWidth: '170px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid #2A2A2A',
              }}>
                {LANGS.map(code => (
                  <button
                    key={code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={lang === code}
                    lang={code}
                    dir={code === 'he' ? 'rtl' : 'ltr'}
                    data-testid={`lang-option-${code}`}
                    onClick={() => { setShowLangPicker(false); if (code !== lang) setLang(code) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '11px 16px', background: 'transparent', border: 'none',
                      color: lang === code ? '#00E5FF' : '#ccc', fontSize: 'calc(14px * var(--fs, 1))',
                      fontWeight: lang === code ? 700 : 400, cursor: 'pointer', textAlign: 'start',
                    }}
                  >
                    <span aria-hidden="true" className="no-theme-invert" style={{ fontSize: 'calc(18px * var(--fs, 1))' }}>{LANG_META[code].flag}</span>
                    <span style={{ flex: 1 }}>{LANG_META[code].name}</span>
                    {lang === code && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search history dropdown */}
        {searchFocused && !searchQuery && searchHistory.length > 0 && (
          <div style={{ padding: '4px 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600 }}>
                {ht.recentSearches}
              </span>
              <button
                onClick={() => { setSearchHistory([]); localStorage.removeItem('shapop_search_history') }}
                style={{ background: 'none', border: 'none', color: '#00E5FF', fontSize: 'calc(12px * var(--fs, 1))', cursor: 'pointer' }}
              >
                {ht.clear}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {searchHistory.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1C1C1E', borderRadius: '16px', padding: '6px 10px' }}>
                  <button
                    onClick={() => { setSearchQuery(item); setSearchFocused(false) }}
                    style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 'calc(13px * var(--fs, 1))', cursor: 'pointer', padding: 0 }}
                  >{item}</button>
                  <button
                    onClick={() => removeSearchHistoryItem(item)}
                    aria-label={`${ht.clear} ${item}`}
                    style={{ background: 'none', border: 'none', padding: 0, paddingInlineStart: '2px', cursor: 'pointer' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* City indicator — compact, under search */}
        <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            aria-label={ht.city}
            style={{
              background: 'transparent', border: 'none',
              padding: '2px 0', color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              cursor: 'pointer',
            }}
          >
            {locationLoading ? (
              <span style={{ color: '#f0f0f0' }}>{t(lang, 'detecting_location')}</span>
            ) : city ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span dir="auto">{cityName}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                <span>{t(lang, 'all_cities')}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </>
            )}
          </button>
          {/* « Local » n'est plus dans la barre du bas : accès aux lives autour de soi ici */}
          <button
            onClick={() => navigate('/map')}
            style={{
              marginInlineStart: 'auto', background: 'transparent', border: 'none', padding: '2px 0',
              color: '#00E5FF', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {ht.nearbyLives} ›
          </button>

          {/* City picker dropdown : toutes les villes, champ « Ta ville », villes autour de toi */}
          {showCityPicker && (
            <HomeCityMenu
              current={cityOption}
              onSelect={handleCitySelect}
            />
          )}
        </div>
      </div>

      {/* Close dropdowns when tapping outside */}
      {(showCityPicker || showLangPicker) && (
        <div
          role="presentation"
          onClick={() => { setShowCityPicker(false); setShowLangPicker(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 39 }}
        />
      )}

      {/* Categories horizontal scroll */}
      <div style={{ marginTop: '2px', marginBottom: '16px' }}>
        <CategoryScroll selected={selectedCategory} onSelect={setSelectedCategory} lang={lang} />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          margin: '0 16px 12px', padding: '14px 16px',
          backgroundColor: '#1A1A1A', borderRadius: '14px',
          border: '1px solid #333',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          {/* City filter */}
          <div>
            <label style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', marginBottom: '6px', display: 'block' }}>
              {ht.city}
            </label>
            <input
              type="text"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              placeholder={ht.cityPlaceholder}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                backgroundColor: '#0D0D0D', border: '1px solid #333',
                borderRadius: '10px', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', outline: 'none',
              }}
            />
          </div>
          {/* Seller rating filter */}
          <div>
            <label style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', marginBottom: '6px', display: 'block' }}>
              {ht.minSellerRating}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 3, 4, 4.5].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterMinRating(r)}
                  style={{
                    flex: 1, padding: '8px 0',
                    backgroundColor: filterMinRating === r ? 'rgba(0, 229, 255,0.15)' : 'rgba(255,255,255,0.04)',
                    border: filterMinRating === r ? '1px solid #00E5FF' : '1px solid #333',
                    borderRadius: '8px',
                    color: filterMinRating === r ? '#00E5FF' : '#f0f0f0',
                    fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {r === 0 ? ht.all : `${r.toLocaleString(LANG_META[lang].locale)}+`}
                </button>
              ))}
            </div>
          </div>
          {/* Reset */}
          {(filterCity || filterMinRating > 0) && (
            <button
              onClick={() => { setFilterCity(''); setFilterMinRating(0) }}
              style={{
                padding: '8px', backgroundColor: 'transparent',
                border: '1px solid #444', borderRadius: '8px',
                color: '#f0f0f0', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {ht.reset}
            </button>
          )}
        </div>
      )}

      {/* Promotion banner */}
      {activePromotion && !promoBannerDismissed && (() => {
        const promoLabel = ht.promoCommission
        return (
          <div style={{
            margin: '0 16px 12px 16px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #B91C3C 100%)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,229,255,0.3)',
          }}>
            {/* Close button */}
            <button
              onClick={() => setPromoBannerDismissed(true)}
              aria-label={ht.closePromo}
              style={{
                position: 'absolute', top: '8px', insetInlineEnd: '8px',
                background: 'rgba(0,0,0,0.3)', border: 'none',
                borderRadius: '50%', width: '24px', height: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 'calc(20px * var(--fs, 1))',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, margin: '0 0 2px', paddingInlineEnd: '20px' }}>
                  {activePromotion.title}
                </p>
                <p style={{ color: '#f0f0f0', fontSize: 'calc(12px * var(--fs, 1))', margin: '0 0 4px' }}>
                  {activePromotion.description || `${promoLabel} -${activePromotion.discount_percent}%`}
                </p>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 'calc(11px * var(--fs, 1))',
                  fontWeight: 700,
                }}>
                  {ht.promoCta}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Direct sales banner (coupé tant que DIRECT_SALES_ENABLED est faux) */}
      {DIRECT_SALES_ENABLED && <Link to="/direct-sales" style={{ textDecoration: 'none' }}>
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.08))',
          border: '1px solid rgba(0, 229, 255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#001014" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p style={{ color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, margin: 0 }}>
              {ht.directSales}
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </Link>}

      {/* "Pour toi" personalized banner */}
      {selectedCategory === 'for_you' && hasPreferences() && loadPreferences()?.favorite_categories && loadPreferences()!.favorite_categories.length > 0 && (
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(0, 229, 255,0.15), rgba(0,229,255,0.08))',
          border: '1px solid rgba(0, 229, 255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#001014" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, margin: 0 }}>
                {ht.sortedByRelevance}
              </p>
              <p style={{ color: '#f0f0f0', fontSize: 'calc(11px * var(--fs, 1))', margin: '2px 0 0 0' }}>
                {ht.basedOnPrefs}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPrefsModal(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 229, 255,0.4)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: '#00E5FF',
              fontSize: 'calc(12px * var(--fs, 1))',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ht.modify}
          </button>
        </div>
      )}

      {/* Subtle refresh indicator when showing cached data */}
      {refreshing && streams.length > 0 && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '6px 0',
          }}
        >
          <div style={{
            width: '14px', height: '14px', border: '2px solid #333',
            borderTopColor: '#00E5FF', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 500 }}>
            {ht.refreshing}
          </span>
        </div>
      )}

      {/* Streams grid — 2 columns */}
      {loading ? (
        <div className="flex justify-center py-20" role="status" aria-label={ht.loadingStreams}>
          <div className="w-8 h-8 border-2 border-[#333] border-t-accent rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,229,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={() => fetchStreams()}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#00E5FF', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {ht.retry}
          </button>
        </div>
      ) : displayStreams.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12), rgba(0,229,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            {ht.emptyTitle}
          </h3>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: 0, maxWidth: '260px' }}>
            {ht.emptySubtitle}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '12px', rowGap: '24px', padding: '8px 16px 0' }}>
          {displayStreams.map(stream => (
            <StreamCard key={stream.id} stream={stream} isFavorited={favoriteIds.has(stream.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}

      {/* Spacer for bottom nav */}
      <div className="h-4" />

      {/* Preferences setup modal — shows on first launch */}
      <PreferencesModal
        visible={showPrefsModal}
        onClose={() => setShowPrefsModal(false)}
      />
    </div>
  )
}

/** Menu du sélecteur de ville de l'accueil (monté seulement quand il est ouvert). */
function HomeCityMenu({ current, onSelect }: { current: CityOption | null; onSelect: (city: CityOption | null) => void }) {
  const lang = useLang()
  const { status, detected, nearby, coords } = useCitySuggestions()
  const suggestions = buildCitySuggestions({ detected, selected: current ? [current] : [], nearby, max: 8 })
  const itemStyle = (active: boolean, bold = false) => ({
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'start' as const,
    padding: '11px 16px', color: active ? '#00E5FF' : '#ccc',
    fontSize: 'calc(14px * var(--fs, 1))', background: 'transparent', border: 'none', cursor: 'pointer',
    fontWeight: bold ? 700 : 400,
  })
  return (
    <div style={{
      position: 'absolute', top: '100%', insetInlineStart: '16px',
      backgroundColor: '#1C1C1E', borderRadius: '14px',
      padding: '8px 0', zIndex: 50, width: 'min(320px, calc(100vw - 32px))',
      maxHeight: '60vh', overflowY: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid #2A2A2A',
    }}>
      <button onClick={() => onSelect(null)} style={itemStyle(!current)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        {t(lang, 'all_cities')}
      </button>
      <div style={{ padding: '4px 12px 8px' }}>
        <CitySearchField onPick={onSelect} near={coords} background="#111" />
      </div>
      {status === 'locating' && suggestions.length === 0 && (
        <p style={{ color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))', margin: 0, padding: '6px 16px' }}>{t(lang, 'detecting_location')}</p>
      )}
      {suggestions.map(c => {
        const isHere = !!detected && sameCity(detected.key, c.key)
        return (
          <button key={c.key} onClick={() => onSelect(c)} style={itemStyle(!!current && sameCity(current.key, c.key), isHere)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span dir="auto">{c.label}</span>
            {isHere && <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>{tr(homeCityText, lang).here}</span>}
          </button>
        )
      })}
    </div>
  )
}

const homeCityText: Localized<{ here: string }> = {
  en: { here: '(you are here)' },
  fr: { here: '(tu es ici)' },
  es: { here: '(estás aquí)' },
  ru: { here: '(ты здесь)' },
  he: { here: '(את/ה כאן)' },
}

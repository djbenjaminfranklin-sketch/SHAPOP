import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StreamCard from '../components/StreamCard'
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

type StreamWithSeller = Stream & { seller?: { display_name: string; avatar_url: string | null; store_name?: string }; seller_score?: number; seller_trust_level?: string }

import { t } from '../lib/i18n'
import { getCommunitiesByCountry, detectUserCountry } from '../lib/communitiesData'
import { getStoredGPSCountry } from '../lib/geolocation'

const homeContent = {
  fr: {
    sortedByRelevance: 'Trie par pertinence',
    basedOnPrefs: 'Selon tes preferences',
    modify: 'Modifier',
  },
  en: {
    sortedByRelevance: 'Sorted by relevance',
    basedOnPrefs: 'Based on your preferences',
    modify: 'Edit',
  },
  he: {
    sortedByRelevance: '\u05DE\u05DE\u05D5\u05D9\u05DF \u05DC\u05E4\u05D9 \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9\u05D5\u05EA',
    basedOnPrefs: '\u05DC\u05E4\u05D9 \u05D4\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05E9\u05DC\u05DA',
    modify: '\u05E2\u05E8\u05D5\u05DA',
  },
  es: {
    sortedByRelevance: 'Ordenado por relevancia',
    basedOnPrefs: 'Segun tus preferencias',
    modify: 'Editar',
  },
} as Record<string, { sortedByRelevance: string; basedOnPrefs: string; modify: string }>

const promoBannerText = {
  fr: { cta: 'Profitez-en !', commission: 'Commission reduite', shipping: 'Livraison reduite', both: 'Commission + Livraison reduites' },
  en: { cta: 'Take advantage!', commission: 'Reduced commission', shipping: 'Reduced shipping', both: 'Commission + Shipping reduced' },
  he: { cta: '!נצלו את ההזדמנות', commission: 'עמלה מופחתת', shipping: 'משלוח מופחת', both: 'עמלה + משלוח מופחתים' },
  es: { cta: 'Aprovecha!', commission: 'Comision reducida', shipping: 'Envio reducido', both: 'Comision + Envio reducidos' },
} as Record<string, { cta: string; commission: string; shipping: string; both: string }>

const directSalesBanner = {
  fr: 'Acceder aux ventes directes',
  en: 'Browse direct sales',
  he: 'גלה מכירות ישירות',
  es: 'Ver ventas directas',
} as Record<string, string>

// Category ID → demo category label mapping (matches CategoryIcons IDs)
const catIdToLabel: Record<string, string> = {
  fashion_w: 'Mode femme', fashion_m: 'Mode homme', sneakers: 'Sneakers', bags: 'Sacs',
  jewelry: 'Bijoux', watches: 'Montres', beauty: 'Beaute', electronics: 'High-tech',
  gaming: 'Gaming', cards: 'Cartes', toys: 'Jouets', vintage: 'Vintage',
  art: 'Art', furniture: 'Meubles', home: 'Maison', sports: 'Sport',
  fitness: 'Fitness', music: 'Musique', books: 'Livres', kids: 'Enfants',
  pets: 'Animaux', auto: 'Auto-Moto', garden: 'Jardin', food: 'Food',
  handmade: 'Fait main', collect: 'Collection', photo: 'Photo', tools: 'Bricolage',
}

const emptyStateText: Record<string, { title: string; subtitle: string }> = {
  fr: { title: 'Aucun live en cours', subtitle: 'Reviens bientot ou lance ton propre live !' },
  en: { title: 'No live streams right now', subtitle: 'Come back soon or start your own live!' },
  he: { title: 'אין שידורים חיים כרגע', subtitle: 'חזור בקרוב או התחל שידור משלך!' },
  es: { title: 'No hay directos ahora', subtitle: 'Vuelve pronto o empieza tu propio directo!' },
}

const retryText: Record<string, string> = {
  fr: 'Reessayer',
  en: 'Retry',
  he: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
  es: 'Reintentar',
}

const welcomeContent = {
  fr: {
    tagline: 'Le shopping en live,\nreinvente.',
    subtitle: 'Achete, vends et participe aux lives en direct avec des milliers de passionnes.',
    signIn: 'Se connecter',
    createAccount: 'Creer un compte',
  },
  en: {
    tagline: 'Live shopping,\nreinvented.',
    subtitle: 'Buy, sell and join live streams with thousands of passionate people.',
    signIn: 'Sign in',
    createAccount: 'Create account',
  },
  he: {
    tagline: 'קניות בשידור חי,\nהמצאה מחדש.',
    subtitle: 'קנו, מכרו והצטרפו לשידורים חיים עם אלפי אנשים.',
    signIn: 'התחבר',
    createAccount: 'צור חשבון',
  },
  es: {
    tagline: 'Shopping en vivo,\nreinventado.',
    subtitle: 'Compra, vende y unete a las transmisiones en vivo con miles de apasionados.',
    signIn: 'Iniciar sesion',
    createAccount: 'Crear cuenta',
  },
} as Record<string, { tagline: string; subtitle: string; signIn: string; createAccount: string }>

export default function Home() {
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
  const [lang, setLang] = useState(() => localStorage.getItem('shapop_lang') || 'fr')
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
  const [showFilters, setShowFilters] = useState(false)
  const [filterCity, setFilterCity] = useState('')
  const [filterMinRating, setFilterMinRating] = useState(0) // 0 = no filter, 3, 4, 4.5
  const [fetchError, setFetchError] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [activePromotion, setActivePromotion] = useState<{ id: string; title: string; description: string | null; type: string; discount_percent: number } | null>(null)
  const [promoBannerDismissed, setPromoBannerDismissed] = useState(false)
  const navigate = useNavigate()
  const { city, loading: locationLoading, setManualCity } = useLocation()
  const { user, updateCity } = useAuth()

  // Track page view on mount
  useEffect(() => {
    track('page_view', { page: 'home' })
  }, [])

  // Fetch active promotions
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const res = await apiFetch('/api/promotions/active')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setActivePromotion(data[0])
          }
        }
      } catch { /* ignore */ }
    }
    fetchPromo()
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
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url, is_boosted, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('is_boosted', { ascending: false, nullsFirst: false })
        .order('status', { ascending: true })
        .order('viewer_count', { ascending: false })

      const cat = categories.find(c => c.id === selectedCategory)
      if (cat && cat.id !== 'for_you' && cat.id !== 'following') {
        query = query.eq('category', cat.label)
      }

      const { data } = await query
      const fresh = ((data || []) as unknown as StreamWithSeller[])
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
    const fetchFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await apiFetch('/api/favorites', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setFavoriteIds(new Set(data.map((s: { id: string }) => s.id)))
        }
      } catch (err) { console.error('fetchFavorites failed:', err) }
    }
    fetchFavorites()
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
    // Filter by category label
    const expectedLabel = catIdToLabel[selectedCategory]
    if (expectedLabel) {
      const filtered = streams.filter(s => s.category === expectedLabel)
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
  }, [filteredStreams, searchQuery])

  const handleCitySelect = (selectedCity: string) => {
    setManualCity(selectedCity)
    setShowCityPicker(false)
  }

  // Pull-to-refresh (disabled — causes glitchy behavior on iOS WKWebView)
  const scrollRef = useRef<HTMLDivElement>(null)

  const wc = welcomeContent[lang] || welcomeContent.fr

  // ═══ WELCOME SCREEN — shown when user is not logged in ═══
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 32px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}>
        <img src="/logo.png" alt="ShaPop" style={{ width: '60%', maxWidth: '260px', marginBottom: '40px', objectFit: 'contain' }} />
        <h1 style={{
          fontSize: '32px', fontWeight: 900, color: '#fff',
          textAlign: 'center', lineHeight: 1.2, margin: '0 0 16px',
          whiteSpace: 'pre-line',
        }}>
          {wc.tagline}
        </h1>
        <p style={{
          fontSize: '15px', color: '#888', textAlign: 'center',
          lineHeight: 1.5, maxWidth: '320px', margin: '0 0 40px',
        }}>
          {wc.subtitle}
        </p>
        <Link to="/login" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px',
          borderRadius: '14px', textDecoration: 'none',
          background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
          color: '#fff', fontSize: '16px', fontWeight: 700, textAlign: 'center',
          boxShadow: '0 6px 24px rgba(240,144,138,0.35)', marginBottom: '12px',
        }}>
          {wc.signIn}
        </Link>
        <Link to="/register" style={{
          display: 'block', width: '100%', maxWidth: '320px', padding: '16px',
          borderRadius: '14px', textDecoration: 'none',
          backgroundColor: 'transparent', border: '1.5px solid #333',
          color: '#ccc', fontSize: '16px', fontWeight: 700, textAlign: 'center',
        }}>
          {wc.createAccount}
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="pb-20 min-h-screen"
      style={{ overflowX: 'hidden', maxWidth: '100vw', backgroundColor: '#0A0A0A' }}
    >
      {/* Top bar — WhatNot-style clean header */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)', backgroundColor: '#0A0A0A', position: 'sticky', top: 0, zIndex: 40 }}>

        {/* Search bar + icons — priority layout like WhatNot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px 6px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '12px',
            backgroundColor: '#1C1C1E', borderRadius: '12px', padding: '12px 16px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t(lang, 'search_placeholder')}
              aria-label={t(lang, 'search_placeholder')}
              style={{ background: 'transparent', fontSize: '15px', color: '#fff', outline: 'none', border: 'none', flex: 1 }}
            />
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filters"
            style={{
              padding: '8px', background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={(filterCity || filterMinRating > 0) ? '#F0908A' : '#999'} strokeWidth="1.5">
              <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/>
              <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round"/>
              <line x1="10" y1="18" x2="14" y2="18" strokeLinecap="round"/>
            </svg>
            {(filterCity || filterMinRating > 0) && (
              <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F0908A' }} />
            )}
          </button>
          {/* Chat icon */}
          <button onClick={() => navigate('/messages')} aria-label="Messages" style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Notifications */}
          <button onClick={() => navigate('/notifications')} aria-label="Notifications" style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Language flag */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              aria-label="Language"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: '#F5C518', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '16px',
              }}
            >
              {lang === 'fr' ? '🇫🇷' : lang === 'he' ? '🇮🇱' : lang === 'es' ? '🇪🇸' : '🇬🇧'}
            </button>
            {showLangPicker && (
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                backgroundColor: '#1C1C1E', borderRadius: '14px',
                padding: '6px 0', zIndex: 51, minWidth: '150px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid #2A2A2A',
              }}>
                {([['fr', 'Francais', '🇫🇷'], ['en', 'English', '🇬🇧'], ['he', 'עברית', '🇮🇱'], ['es', 'Espanol', '🇪🇸']] as const).map(([code, label, flag]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); localStorage.setItem('shapop_lang', code); setShowLangPicker(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '11px 16px', background: 'transparent', border: 'none',
                      color: lang === code ? '#F0908A' : '#ccc', fontSize: '14px',
                      fontWeight: lang === code ? 700 : 400, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{flag}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* City indicator — compact, under search */}
        <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            aria-label="City"
            style={{
              background: 'transparent', border: 'none',
              padding: '2px 0', color: '#888', fontSize: '13px',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              cursor: 'pointer',
            }}
          >
            {locationLoading ? (
              <span style={{ color: '#555' }}>{t(lang, 'detecting_location')}</span>
            ) : city ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{city}</span>
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

          {/* City picker dropdown */}
          {showCityPicker && (
            <div style={{
              position: 'absolute', top: '100%', left: '16px',
              backgroundColor: '#1C1C1E', borderRadius: '14px',
              padding: '8px 0', zIndex: 50, minWidth: '220px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid #2A2A2A',
            }}>
              <button
                onClick={() => { setManualCity(''); setShowCityPicker(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                  padding: '11px 16px', color: !city ? '#F0908A' : '#ccc',
                  fontSize: '14px', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                {t(lang, 'all_cities')}
              </button>
              {(() => {
                const country = getStoredGPSCountry() || detectUserCountry()
                const communities = getCommunitiesByCountry(country)
                const commCities = communities.map(c => c.city).filter((c, i, arr) => arr.indexOf(c) === i)
                const detectedCity = localStorage.getItem('shapop_user_city')
                const allCities = detectedCity && !commCities.includes(detectedCity)
                  ? [detectedCity, ...commCities]
                  : commCities
                return allCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleCitySelect(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                      padding: '11px 16px',
                      color: city === c ? '#F0908A' : '#ccc',
                      fontSize: '14px', background: 'transparent', border: 'none',
                      cursor: 'pointer', fontWeight: c === detectedCity ? 700 : 400,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {c}{c === detectedCity && !commCities.includes(detectedCity) ? ' (GPS)' : ''}
                  </button>
                ))
              })()}
            </div>
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
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', display: 'block' }}>
              {lang === 'fr' ? 'Ville' : lang === 'es' ? 'Ciudad' : lang === 'he' ? 'עיר' : 'City'}
            </label>
            <input
              type="text"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              placeholder={lang === 'fr' ? 'Paris, Lyon...' : 'Paris, Madrid...'}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                backgroundColor: '#0D0D0D', border: '1px solid #333',
                borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
              }}
            />
          </div>
          {/* Seller rating filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', display: 'block' }}>
              {lang === 'fr' ? 'Note vendeur minimum' : lang === 'es' ? 'Calificacion minima' : lang === 'he' ? 'דירוג מינימלי' : 'Min seller rating'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 3, 4, 4.5].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterMinRating(r)}
                  style={{
                    flex: 1, padding: '8px 0',
                    backgroundColor: filterMinRating === r ? 'rgba(240,144,138,0.15)' : 'rgba(255,255,255,0.04)',
                    border: filterMinRating === r ? '1px solid #F0908A' : '1px solid #333',
                    borderRadius: '8px',
                    color: filterMinRating === r ? '#F0908A' : '#888',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {r === 0 ? (lang === 'fr' ? 'Tous' : 'All') : `${r}+`}
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
                color: '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {lang === 'fr' ? 'Reinitialiser' : lang === 'es' ? 'Restablecer' : lang === 'he' ? 'איפוס' : 'Reset'}
            </button>
          )}
        </div>
      )}

      {/* Promotion banner */}
      {activePromotion && !promoBannerDismissed && (() => {
        const pt = promoBannerText[lang] || promoBannerText.fr
        const typeKey = activePromotion.type as 'commission' | 'shipping' | 'both'
        return (
          <div style={{
            margin: '0 16px 12px 16px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 60%, #B91C3C 100%)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(232,52,78,0.3)',
          }}>
            {/* Close button */}
            <button
              onClick={() => setPromoBannerDismissed(true)}
              style={{
                position: 'absolute', top: '8px', right: '8px',
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
                flexShrink: 0, fontSize: '20px',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 800, margin: '0 0 2px', paddingRight: '20px' }}>
                  {activePromotion.title}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', margin: '0 0 4px' }}>
                  {activePromotion.description || (pt[typeKey] + ' -' + activePromotion.discount_percent + '%')}
                </p>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  {pt.cta}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Direct sales banner */}
      <Link to="/direct-sales" style={{ textDecoration: 'none' }}>
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
          border: '1px solid rgba(240,144,138,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: 0 }}>
              {directSalesBanner[lang] || directSalesBanner.fr}
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </Link>

      {/* "Pour toi" personalized banner */}
      {selectedCategory === 'for_you' && hasPreferences() && loadPreferences()?.favorite_categories && loadPreferences()!.favorite_categories.length > 0 && (
        <div style={{
          margin: '0 16px 12px 16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
          border: '1px solid rgba(240,144,138,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                {(homeContent[lang] || homeContent.fr).sortedByRelevance}
              </p>
              <p style={{ color: '#888', fontSize: '11px', margin: '2px 0 0 0' }}>
                {(homeContent[lang] || homeContent.fr).basedOnPrefs}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPrefsModal(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(240,144,138,0.4)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: '#F0908A',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {(homeContent[lang] || homeContent.fr).modify}
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
            borderTopColor: '#F0908A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '11px', color: '#555', fontWeight: 500 }}>
            {lang === 'fr' ? 'Actualisation...' : lang === 'es' ? 'Actualizando...' : lang === 'he' ? '...מעדכן' : 'Refreshing...'}
          </span>
        </div>
      )}

      {/* Streams grid — 2 columns */}
      {loading ? (
        <div className="flex justify-center py-20" role="status" aria-label="Loading streams">
          <div className="w-8 h-8 border-2 border-[#333] border-t-accent rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232,52,78,0.12), rgba(232,52,78,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={() => fetchStreams()}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#E8344E', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {retryText[lang] || retryText.fr}
          </button>
        </div>
      ) : displayStreams.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            {(emptyStateText[lang] || emptyStateText.fr).title}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>
            {(emptyStateText[lang] || emptyStateText.fr).subtitle}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-2">
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

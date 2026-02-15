import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StreamCard from '../components/StreamCard'
import { categories, CategoryScroll } from '../components/CategoryIcons'
import { useLocation } from '../hooks/useLocation'
import { useAuth } from '../contexts/AuthContext'
import type { Stream } from '../types/database'
import PreferencesModal, { loadPreferences, hasPreferences } from '../components/PreferencesModal'
import { sortStreamsByMatch } from '../lib/matchingAlgorithm'

type StreamWithSeller = Stream & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }

import { ISRAEL_CITIES } from '../lib/israelCities'
import { t, getLang } from '../lib/i18n'

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

// Demo streams to show layout even with empty DB
const demoStreams: StreamWithSeller[] = [
  {
    id: 'demo-1', seller_id: '', title: 'NEW COLLECTION', description: '', category: 'Boutiques femme',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=600&fit=crop',
    viewer_count: 60, peak_viewers: 80, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Tel Aviv',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'fashionista_tlv', avatar_url: null, store_name: 'fashionista_tlv' }
  },
  {
    id: 'demo-2', seller_id: '', title: 'Sneakers Drops', description: '', category: 'Sneakers',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=600&fit=crop',
    viewer_count: 48, peak_viewers: 55, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Jerusalem',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'sneaker_king', avatar_url: null, store_name: 'sneaker_king' }
  },
  {
    id: 'demo-3', seller_id: '', title: 'Vintage Luxe', description: '', category: 'Vintage',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop',
    viewer_count: 131, peak_viewers: 150, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Haifa',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'vintage_shop', avatar_url: null, store_name: 'vintage_shop' }
  },
  {
    id: 'demo-4', seller_id: '', title: 'Tech Deals', description: '', category: 'Electronique',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=600&fit=crop',
    viewer_count: 108, peak_viewers: 120, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Tel Aviv',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'tech_deals_il', avatar_url: null, store_name: 'tech_deals_il' }
  },
  {
    id: 'demo-5', seller_id: '', title: 'Bijoux Artisanaux', description: '', category: 'Bijoux',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=600&fit=crop',
    viewer_count: 73, peak_viewers: 90, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Netanya',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'handmade_jewels', avatar_url: null, store_name: 'handmade_jewels' }
  },
  {
    id: 'demo-6', seller_id: '', title: 'Sport Collection', description: '', category: 'Sport',
    tags: [], status: 'live', thumbnail_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=600&fit=crop',
    viewer_count: 45, peak_viewers: 60, engagement_score: 0, avg_watch_time_seconds: 0,
    total_reactions: 0, scheduled_at: null, started_at: null, ended_at: null, city: 'Eilat',
    community_id: null, created_at: new Date().toISOString(),
    seller: { display_name: 'sport_outlet', avatar_url: null, store_name: 'sport_outlet' }
  },
]

export default function Home() {
  const [streams, setStreams] = useState<StreamWithSeller[]>([])
  const [selectedCategory, setSelectedCategory] = useState('for_you')
  const [loading, setLoading] = useState(true)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('shapop_lang') || 'en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showPrefsModal, setShowPrefsModal] = useState(() => !hasPreferences())
  const navigate = useNavigate()
  const { city, loading: locationLoading, setManualCity } = useLocation()
  const { user, updateCity } = useAuth()

  // Sync detected city to user profile
  useEffect(() => {
    if (city && user) {
      updateCity(city).catch(() => {})
    }
  }, [city, user])

  useEffect(() => {
    const fetchStreams = async () => {
      let query = supabase
        .from('streams')
        .select('*, seller:profiles!seller_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('status', { ascending: true })
        .order('viewer_count', { ascending: false })

      const cat = categories.find(c => c.id === selectedCategory)
      if (cat && cat.id !== 'for_you' && cat.id !== 'following') {
        query = query.eq('category', cat.label)
      }

      // Filter by city when location is active
      if (city) {
        query = query.eq('city', city)
      }

      const { data } = await query
      setStreams((data as StreamWithSeller[]) || [])
      setLoading(false)
    }

    fetchStreams()

    const channel = supabase
      .channel('streams-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => {
        fetchStreams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedCategory, city])

  // Filter demo streams by city too
  const filterByCity = (list: StreamWithSeller[]) => {
    if (!city) return list
    const local = list.filter(s => s.city === city)
    const rest = list.filter(s => s.city !== city)
    return [...local, ...rest]
  }

  // Apply matching algorithm when "Pour toi" tab is active
  const getDisplayStreams = (): StreamWithSeller[] => {
    const base = streams.length > 0 ? streams : filterByCity(demoStreams)
    if (selectedCategory === 'for_you') {
      const prefs = loadPreferences()
      if (prefs && (prefs.favorite_categories.length > 0 || prefs.preferred_cities.length > 0 || prefs.favorite_sellers.length > 0)) {
        return sortStreamsByMatch(base, prefs)
      }
    }
    return base
  }
  const displayStreams = getDisplayStreams()

  const handleCitySelect = (selectedCity: string) => {
    setManualCity(selectedCity)
    setShowCityPicker(false)
  }

  return (
    <div className="pb-20 bg-black min-h-screen">
      {/* Top bar — logo + search + icons */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)', backgroundColor: '#000', position: 'sticky', top: 0, zIndex: 40 }}>
        {/* Logo + language flag */}
        <div style={{ padding: '0px 16px 2px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <img src="/logo.png" alt="ShaPop" style={{ width: '65%', display: 'inline-block' }} />
          <div style={{ position: 'absolute', right: '16px' }}>
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
            >
              {lang === 'he' ? '🇮🇱' : lang === 'es' ? '🇪🇸' : '🇬🇧'}
            </button>
            {showLangPicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0,
                backgroundColor: '#1A1A1A', borderRadius: '12px',
                padding: '6px 0', zIndex: 51, minWidth: '140px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #333',
              }}>
                {([['en', 'English', '🇬🇧'], ['he', 'עברית', '🇮🇱'], ['es', 'Espanol', '🇪🇸']] as const).map(([code, label, flag]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); localStorage.setItem('shapop_lang', code); setShowLangPicker(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '10px 14px', background: 'transparent', border: 'none',
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

        {/* City indicator */}
        <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            style={{
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '9999px',
              padding: '4px 14px',
              color: '#ccc',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {locationLoading ? (
              <span style={{ color: '#666' }}>{t(lang, 'detecting_location')}</span>
            ) : city ? (
              <>
                <span role="img" aria-label="location">📍</span>
                <span>{city}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </>
            ) : (
              <>
                <span role="img" aria-label="globe">🌍</span>
                <span>{t(lang, 'all_cities')}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* City picker dropdown */}
        {showCityPicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1A1A1A',
            borderRadius: '12px',
            padding: '8px 0',
            zIndex: 50,
            minWidth: '200px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid #333',
          }}>
          <button
              onClick={() => { setManualCity(''); setShowCityPicker(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 16px', color: !city ? '#E8FF6B' : '#ccc',
                fontSize: '14px', background: 'transparent', border: 'none',
              }}
            >
              🌍 All cities
            </button>
            {ISRAEL_CITIES.map(c => (
              <button
                key={c}
                onClick={() => handleCitySelect(c)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', color: city === c ? '#E8FF6B' : '#ccc',
                  fontSize: '14px', background: 'transparent', border: 'none',
                }}
              >
                📍 {c}
              </button>
            ))}
          </div>
        )}

        {/* Search bar + icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px 8px 16px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#1A1A1A', borderRadius: '9999px', padding: '14px 20px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={t(lang, 'search_placeholder')}
              style={{ background: 'transparent', fontSize: '16px', color: '#fff', outline: 'none', border: 'none', flex: 1 }}
            />
          </div>
          {/* Chat icon */}
          <button onClick={() => navigate('/activity', { state: { tab: 'messages' } })} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Notifications */}
          <button onClick={() => navigate('/notifications')} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Close dropdowns when tapping outside */}
      {(showCityPicker || showLangPicker) && (
        <div
          onClick={() => { setShowCityPicker(false); setShowLangPicker(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 39 }}
        />
      )}

      {/* Categories horizontal scroll */}
      <div style={{ marginTop: '4px', marginBottom: '12px' }}>
        <CategoryScroll selected={selectedCategory} onSelect={setSelectedCategory} lang={lang} />
      </div>

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

      {/* Streams grid — 2 columns */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#333] border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-2">
          {displayStreams.map(stream => (
            <StreamCard key={stream.id} stream={stream} />
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

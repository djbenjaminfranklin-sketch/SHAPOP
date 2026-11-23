import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLocale, tr, useLang, type Lang, type Localized } from '../lib/i18n'
import { getCountryDisplayName } from '../lib/data/communitiesData'
import { buildCitySuggestions, cityLabel, sameCity, type CityOption } from '../lib/cities'
import { useCitySuggestions } from '../hooks/useCitySuggestions'
import CitySearchField from '../components/CitySearchField'
import CityStreamSheet from '../components/CityStreamSheet'
import { useCityStreamCounts } from '../hooks/useCityStreamCounts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'

type PluralForms = { one: string; few: string; many: string; other: string }
type MapText = {
  title: string
  subtitle: string
  communities: string
  detecting: string
  noLive: string
  locationUnavailable: string
  elsewhere: string
  backToMyPosition: string
  yourPosition: string
  liveNowCount: PluralForms
  livesCount: PluralForms
}

// {n} = nombre ; few/many servent au russe (ailleurs = other)
const mapContent: Localized<MapText> = {
  en: {
    title: 'Lives near you',
    subtitle: 'Discover live streams in your area',
    communities: 'Communities',
    detecting: 'Detecting location...',
    noLive: 'No live streams right now',
    locationUnavailable: 'Location unavailable: search for your city to see lives nearby',
    elsewhere: 'Lives in other cities',
    backToMyPosition: 'Back to my location',
    yourPosition: 'You are here',
    liveNowCount: { one: '{n} live now', few: '{n} live now', many: '{n} live now', other: '{n} live now' },
    livesCount: { one: '{n} live', few: '{n} lives', many: '{n} lives', other: '{n} lives' },
  },
  fr: {
    title: 'Lives autour de toi',
    subtitle: 'Découvre les lives près de chez toi',
    communities: 'Communautés',
    detecting: 'Localisation en cours...',
    noLive: 'Aucun live pour le moment',
    locationUnavailable: 'Position indisponible : cherche ta ville pour voir les lives autour',
    elsewhere: 'Lives dans d’autres villes',
    backToMyPosition: 'Revenir à ma position',
    yourPosition: 'Tu es ici',
    liveNowCount: { one: '{n} en direct', few: '{n} en direct', many: '{n} en direct', other: '{n} en direct' },
    livesCount: { one: '{n} live', few: '{n} lives', many: '{n} lives', other: '{n} lives' },
  },
  es: {
    title: 'Directos cerca de ti',
    subtitle: 'Descubre los directos de tu zona',
    communities: 'Comunidades',
    detecting: 'Buscando tu ubicación...',
    noLive: 'No hay directos ahora mismo',
    locationUnavailable: 'Ubicación no disponible: busca tu ciudad para ver directos cerca',
    elsewhere: 'Directos en otras ciudades',
    backToMyPosition: 'Volver a mi ubicación',
    yourPosition: 'Estás aquí',
    liveNowCount: { one: '{n} en directo', few: '{n} en directo', many: '{n} en directo', other: '{n} en directo' },
    livesCount: { one: '{n} directo', few: '{n} directos', many: '{n} directos', other: '{n} directos' },
  },
  ru: {
    title: 'Эфиры рядом с тобой',
    subtitle: 'Находи прямые эфиры поблизости',
    communities: 'Сообщества',
    detecting: 'Определяем местоположение...',
    noLive: 'Сейчас нет эфиров',
    locationUnavailable: 'Местоположение недоступно: найди свой город, чтобы увидеть эфиры рядом',
    elsewhere: 'Эфиры в других городах',
    backToMyPosition: 'Вернуться к моему местоположению',
    yourPosition: 'Ты здесь',
    liveNowCount: { one: '{n} эфир сейчас', few: '{n} эфира сейчас', many: '{n} эфиров сейчас', other: '{n} эфира сейчас' },
    livesCount: { one: '{n} эфир', few: '{n} эфира', many: '{n} эфиров', other: '{n} эфира' },
  },
  he: {
    title: 'שידורים חיים קרוב אליך',
    subtitle: 'גלו שידורים חיים באזור שלכם',
    communities: 'קהילות',
    detecting: 'מאתר מיקום...',
    noLive: 'אין שידורים חיים כרגע',
    locationUnavailable: 'המיקום לא זמין: חפשו את העיר שלכם כדי לראות שידורים בסביבה',
    elsewhere: 'שידורים בערים אחרות',
    backToMyPosition: 'חזרה למיקום שלי',
    yourPosition: 'את/ה כאן',
    liveNowCount: { one: 'שידור חי אחד עכשיו', few: '{n} בשידור חי עכשיו', many: '{n} בשידור חי עכשיו', other: '{n} בשידור חי עכשיו' },
    livesCount: { one: 'שידור אחד', few: '{n} שידורים', many: '{n} שידורים', other: '{n} שידורים' },
  },
}

function plural(forms: PluralForms, n: number, lang: Lang): string {
  const rule = new Intl.PluralRules(getLocale(lang)).select(n)
  const form = rule === 'one' || rule === 'few' || rule === 'many' ? forms[rule] : forms.other
  return form.replace('{n}', n.toLocaleString(getLocale(lang)))
}


/** Teinte stable par ville (pas d'image codée en dur : un dégradé + l'initiale). */
function cityHue(name: string): number {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}

export default function MapPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = useLang()
  const ct = tr(mapContent, lang)
  usePageTitle(ct.title)

  // Ville choisie à la main (sinon : la position)
  const [center, setCenter] = useState<CityOption | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const { status, detected, nearby, coords } = useCitySuggestions(center)

  const proposed = buildCitySuggestions({ detected: center || detected, nearby, max: 12 })
  const { cityData, others, loading } = useCityStreamCounts(proposed.map(c => c.key))

  // Pays détecté par la position → profil (comme avant, seulement s'il change)
  useEffect(() => {
    const country = detected?.country
    if (!user || !country || profile?.country === country) return
    supabase.from('profiles').update({ country }).eq('id', user.id).then(({ error }) => {
      if (error) console.error('Failed to update country:', error)
    })
  }, [user, detected?.country, profile?.country])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const detecting = status === 'locating' && !center
  const locationOff = (status === 'denied' || status === 'unavailable') && !center
  const areaCountry = (center || detected)?.country
  const areaName = center
    ? center.label
    : detected
      ? [detected.label, areaCountry ? getCountryDisplayName(areaCountry, lang) : ''].filter(Boolean).join(', ')
      : ''
  const totalLive = Object.values(cityData).reduce((sum, d) => sum + d.count, 0)
  const otherCities = Object.entries(others).sort((a, b) => b[1].count - a[1].count)
  const sheetData = selectedCity ? (cityData[selectedCity] || others[selectedCity]) : null

  const renderCard = (key: string, label: string, data: { count: number; streams: { id: string; seller?: { display_name: string; avatar_url: string | null } }[] }, isHere: boolean) => {
    const hue = cityHue(key)
    return (
      <button
        key={key}
        onClick={() => data.count > 0 ? setSelectedCity(key) : null}
        style={{
          display: 'flex', flexDirection: 'column',
          backgroundColor: '#0D0D0D',
          border: selectedCity === key ? '1.5px solid #F0908A' : '1.5px solid #1A1A1A',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: data.count > 0 ? 'pointer' : 'default',
          padding: 0,
          textAlign: 'start',
        }}
      >
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16/10', overflow: 'hidden',
          background: `linear-gradient(135deg, hsl(${hue} 45% 28%), hsl(${(hue + 40) % 360} 55% 14%))`,
        }}>
          <span aria-hidden="true" style={{
            position: 'absolute', top: '6px', insetInlineStart: '10px',
            fontSize: '44px', fontWeight: 800, color: 'rgba(255,255,255,0.18)', lineHeight: 1,
          }}>
            {Array.from(label)[0]?.toUpperCase()}
          </span>
          {data.count > 0 && (
            <div style={{
              position: 'absolute', top: '8px', insetInlineEnd: '8px',
              display: 'flex', alignItems: 'center', gap: '4px',
              backgroundColor: 'rgba(232,52,78,0.9)', backdropFilter: 'blur(4px)',
              padding: '3px 8px', borderRadius: '8px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                {plural(ct.livesCount, data.count, lang)}
              </span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '8px', insetInlineStart: '10px', insetInlineEnd: '10px' }}>
            {isHere && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#F0908A' }}>{ct.yourPosition}</span>
            )}
            <h3 dir="auto" style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {label}
            </h3>
          </div>
        </div>

        {data.count > 0 ? (
          <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex' }}>
              {data.streams.slice(0, 3).map((stream, i) => (
                <div key={stream.id} style={{
                  width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #0D0D0D',
                  overflow: 'hidden', marginInlineStart: i > 0 ? '-8px' : 0, position: 'relative', zIndex: 3 - i,
                }}>
                  {stream.seller?.avatar_url ? (
                    <img src={stream.seller.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', backgroundColor: '#F0908A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: '#fff',
                    }}>
                      {(stream.seller?.display_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#888' }}>{plural(ct.livesCount, data.count, lang)}</span>
          </div>
        ) : (
          <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#333' }} />
            <span style={{ fontSize: '11px', color: '#555' }}>{ct.noLive}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>{ct.title}</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
              {detecting ? ct.detecting : ct.subtitle}
            </p>
          </div>
          <button
            onClick={() => navigate('/communities')}
            style={{
              background: 'rgba(240,144,138,0.12)', border: '1px solid rgba(240,144,138,0.3)',
              borderRadius: '20px', padding: '8px 14px', color: '#F0908A',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {ct.communities}
          </button>
        </div>
      </div>

      {/* Ta ville : recherche dans tous les pays */}
      <div style={{ padding: '16px 20px 0' }}>
        <CitySearchField
          near={coords}
          background="#0D0D0D"
          onPick={(city) => { setCenter(city); setSelectedCity(null) }}
        />
        {center && (
          <button
            onClick={() => { setCenter(null); setSelectedCity(null) }}
            style={{
              marginTop: '10px', background: 'transparent', border: 'none', padding: 0,
              color: '#F0908A', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ct.backToMyPosition}
          </button>
        )}
        {locationOff && (
          <p style={{ fontSize: '12px', color: '#f97316', margin: '10px 0 0' }}>{ct.locationUnavailable}</p>
        )}
      </div>

      {/* Stats banner */}
      {proposed.length > 0 && (
        <div style={{
          margin: '16px 20px 0', padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
          borderRadius: '14px', border: '1px solid rgba(240,144,138,0.2)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            backgroundColor: '#E8344E', animation: 'pulse-live 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            {plural(ct.liveNowCount, totalLive, lang)}
          </span>
          <span dir="auto" style={{ fontSize: '13px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {areaName}
          </span>
        </div>
      )}
      <style>{`
        @keyframes pulse-live { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{
            width: '32px', height: '32px', border: '2px solid #333', borderTopColor: '#F0908A',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : (
        <>
          {/* Ta ville et les villes proches */}
          {proposed.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px 20px 0' }}>
              {proposed.map(c => renderCard(
                c.key,
                c.label,
                cityData[c.key] || { count: 0, streams: [] },
                !center && !!detected && sameCity(detected.key, c.key),
              ))}
            </div>
          )}

          {/* Lives ailleurs (villes hors de la zone) */}
          {otherCities.length > 0 && (
            <>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '24px 20px 0' }}>{ct.elsewhere}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 20px 0' }}>
                {otherCities.map(([key, data]) => renderCard(key, cityLabel(key, lang), data, false))}
              </div>
            </>
          )}

          {proposed.length === 0 && otherCities.length === 0 && !detecting && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '48px 20px 0', margin: 0 }}>{ct.noLive}</p>
          )}
        </>
      )}

      {/* Bottom sheet */}
      {selectedCity && sheetData && (
        <CityStreamSheet
          city={proposed.find(c => c.key === selectedCity)?.label || cityLabel(selectedCity, lang)}
          data={sheetData}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { detectCountryByGPS, getStoredGPSCountry } from '../lib/geolocation'
import { COUNTRIES, getCountryDisplayName } from '../lib/communitiesData'
import type { CountryCode } from '../lib/communitiesData'
import CityStreamSheet from '../components/CityStreamSheet'
import { useCityStreamCounts } from '../hooks/useCityStreamCounts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Lang = 'fr' | 'en' | 'he' | 'es'

const mapContent = {
  fr: {
    title: 'Lives autour de toi',
    subtitle: 'Decouvre les lives dans ta region',
    communities: 'Communautes',
    detecting: 'Localisation en cours...',
    liveNow: 'En direct',
    noLive: 'Aucun live pour le moment',
    streams: 'streams',
  },
  en: {
    title: 'Lives near you',
    subtitle: 'Discover live streams in your area',
    communities: 'Communities',
    detecting: 'Detecting location...',
    liveNow: 'Live now',
    noLive: 'No live streams right now',
    streams: 'streams',
  },
  he: {
    title: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD',
    subtitle: '\u05D2\u05DC\u05D4 \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD \u05D1\u05D0\u05D6\u05D5\u05E8\u05DA',
    communities: '\u05E7\u05D4\u05D9\u05DC\u05D5\u05EA',
    detecting: '\u05DE\u05D6\u05D4\u05D4 \u05DE\u05D9\u05E7\u05D5\u05DD...',
    liveNow: '\u05E2\u05DB\u05E9\u05D9\u05D5 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8',
    noLive: '\u05D0\u05D9\u05DF \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05DB\u05E8\u05D2\u05E2',
    streams: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD',
  },
  es: {
    title: 'Lives cerca de ti',
    subtitle: 'Descubre los directos en tu zona',
    communities: 'Comunidades',
    detecting: 'Localizando...',
    liveNow: 'En directo',
    noLive: 'No hay directos ahora',
    streams: 'streams',
  },
}

// City images for visual cards - all verified working Unsplash URLs
const cityImages: Record<string, string> = {
  // France
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=250&fit=crop',
  'Lyon': 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=250&fit=crop',
  'Marseille': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=250&fit=crop',
  'Bordeaux': 'https://images.unsplash.com/photo-1560983073-c29bff7438ef?w=400&h=250&fit=crop',
  'Nice': 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=400&h=250&fit=crop',
  'Toulouse': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=250&fit=crop',
  'Strasbourg': 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=400&h=250&fit=crop',
  'Nantes': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=250&fit=crop',
  // Spain
  'Madrid': 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&h=250&fit=crop',
  'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=250&fit=crop',
  'Valencia': 'https://images.unsplash.com/photo-1529551739587-e242c564f727?w=400&h=250&fit=crop',
  'Sevilla': 'https://images.unsplash.com/photo-1504019347908-b45f9b0b8dd5?w=400&h=250&fit=crop',
  'Malaga': 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=400&h=250&fit=crop',
  'Bilbao': 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=250&fit=crop',
  // US
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=250&fit=crop',
  'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&h=250&fit=crop',
  'Miami': 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&h=250&fit=crop',
  'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=250&fit=crop',
  'San Francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=250&fit=crop',
  'Austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400&h=250&fit=crop',
  // UK
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop',
  'Manchester': 'https://images.unsplash.com/photo-1520114878144-6123749968dd?w=400&h=250&fit=crop',
  'Birmingham': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop',
  'Edinburgh': 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=250&fit=crop',
  // Brazil
  'Sao Paulo': 'https://images.unsplash.com/photo-1543059080-87f29fbfefea?w=400&h=250&fit=crop',
  'Rio de Janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=250&fit=crop',
  'Brasilia': 'https://images.unsplash.com/photo-1553354994-e24e0da07ef7?w=400&h=250&fit=crop',
  'Salvador': 'https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?w=400&h=250&fit=crop',
  'Belo Horizonte': 'https://images.unsplash.com/photo-1598301257942-e6bde1d2149b?w=400&h=250&fit=crop',
  // Japan
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=250&fit=crop',
  'Osaka': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=250&fit=crop',
  'Kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=250&fit=crop',
  'Yokohama': 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=250&fit=crop',
  // Germany
  'Berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=250&fit=crop',
  'Munich': 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=250&fit=crop',
  'Hamburg': 'https://images.unsplash.com/photo-1562930024-4aca28e91b10?w=400&h=250&fit=crop',
  'Frankfurt': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=250&fit=crop',
  // Italy
  'Roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=250&fit=crop',
  'Milano': 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=250&fit=crop',
  'Napoli': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=250&fit=crop',
  'Firenze': 'https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?w=400&h=250&fit=crop',
  // Israel
  'Tel Aviv': 'https://images.unsplash.com/photo-1544991875-5dc1b05f607d?w=400&h=250&fit=crop',
  'Jerusalem': 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=400&h=250&fit=crop',
  'Haifa': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=250&fit=crop',
  // Portugal
  'Lisboa': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=250&fit=crop',
  'Porto': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=250&fit=crop',
  'Faro': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=250&fit=crop',
  // Morocco
  'Casablanca': 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=400&h=250&fit=crop',
  'Marrakech': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400&h=250&fit=crop',
  'Rabat': 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=400&h=250&fit=crop',
  'Tanger': 'https://images.unsplash.com/photo-1553522991-71439aa5765b?w=400&h=250&fit=crop',
  // Canada
  'Toronto': 'https://images.unsplash.com/photo-1517090504332-af4e28e407e0?w=400&h=250&fit=crop',
  'Montreal': 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=400&h=250&fit=crop',
  'Vancouver': 'https://images.unsplash.com/photo-1559511260-66a68e7e5e8c?w=400&h=250&fit=crop',
  'Calgary': 'https://images.unsplash.com/photo-1561134643-668dafae01a4?w=400&h=250&fit=crop',
}

export default function MapPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = mapContent[lang] || mapContent.fr

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    // Priority: GPS cache > profile country > language fallback
    return getStoredGPSCountry()
      || (profile?.country as CountryCode)
      || 'FR'
  })
  const [detecting, setDetecting] = useState(true)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  const { cityData, loading } = useCityStreamCounts(selectedCountry)

  // Detect real GPS location on mount
  useEffect(() => {
    detectCountryByGPS().then(country => {
      if (country) {
        setSelectedCountry(country)
        if (user) {
          supabase.from('profiles').update({ country }).eq('id', user.id)
        }
      }
      setDetecting(false)
    })
  }, [user])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const countryName = getCountryDisplayName(selectedCountry, lang)
  const cities = Object.entries(cityData).filter(([_, data]) => data.count > 0 || !loading)
  const totalLive = Object.values(cityData).reduce((sum, d) => sum + d.count, 0)

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
              {ct.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
              {detecting ? ct.detecting : ct.subtitle}
            </p>
          </div>
          <button
            onClick={() => navigate('/communities')}
            style={{
              background: 'rgba(240,144,138,0.12)',
              border: '1px solid rgba(240,144,138,0.3)',
              borderRadius: '20px',
              padding: '8px 14px',
              color: '#F0908A',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {ct.communities}
          </button>
        </div>
      </div>

      {/* Country selector */}
      <div style={{
        display: 'flex', gap: '8px', padding: '16px 20px 0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch' as const,
        scrollbarWidth: 'none' as const,
      }}>
        {COUNTRIES.map(country => (
          <button
            key={country.code}
            onClick={() => {
              setSelectedCountry(country.code)
              setSelectedCity(null)
              if (user) {
                supabase.from('profiles').update({ country: country.code }).eq('id', user.id)
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '20px',
              border: selectedCountry === country.code
                ? '1.5px solid #F0908A'
                : '1.5px solid #222',
              backgroundColor: selectedCountry === country.code
                ? 'rgba(240,144,138,0.12)'
                : '#0D0D0D',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '16px' }}>{country.flag}</span>
            <span style={{
              fontSize: '13px', fontWeight: 600,
              color: selectedCountry === country.code ? '#F0908A' : '#888',
              whiteSpace: 'nowrap',
            }}>
              {country.name[lang] || country.name.en}
            </span>
          </button>
        ))}
      </div>

      {/* Stats banner */}
      <div style={{
        margin: '16px 20px 0',
        padding: '14px 20px',
        background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
        borderRadius: '14px',
        border: '1px solid rgba(240,144,138,0.2)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: '#E8344E',
          animation: 'pulse-live 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          {totalLive} {ct.liveNow}
        </span>
        <span style={{ fontSize: '13px', color: '#888' }}>
          {countryName}
        </span>
        <style>{`
          @keyframes pulse-live {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </div>

      {/* City cards grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid #333', borderTopColor: '#F0908A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '12px', padding: '16px 20px 0',
        }}>
          {cities.map(([city, data]) => (
            <button
              key={city}
              onClick={() => data.count > 0 ? setSelectedCity(city) : null}
              style={{
                display: 'flex', flexDirection: 'column',
                backgroundColor: '#0D0D0D',
                border: selectedCity === city
                  ? '1.5px solid #F0908A'
                  : '1.5px solid #1A1A1A',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: data.count > 0 ? 'pointer' : 'default',
                padding: 0,
                textAlign: 'left',
              }}
            >
              {/* City image */}
              <div style={{
                position: 'relative', width: '100%',
                aspectRatio: '16/10', overflow: 'hidden',
              }}>
                <img
                  src={cityImages[city] || 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=250&fit=crop'}
                  alt={city}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
                }} />

                {/* Live badge */}
                {data.count > 0 && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    backgroundColor: 'rgba(232,52,78,0.9)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px', borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: '#fff',
                      animation: 'pulse-dot 1.5s ease-in-out infinite',
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                      {data.count} live{data.count > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* City name overlay */}
                <div style={{
                  position: 'absolute', bottom: '8px', left: '10px', right: '10px',
                }}>
                  <h3 style={{
                    fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}>
                    {city}
                  </h3>
                </div>
              </div>

              {/* Seller avatars */}
              {data.count > 0 && (
                <div style={{ padding: '10px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex' }}>
                    {data.streams.slice(0, 3).map((stream, i) => (
                      <div
                        key={stream.id}
                        style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          border: '2px solid #0D0D0D',
                          overflow: 'hidden',
                          marginLeft: i > 0 ? '-8px' : 0,
                          position: 'relative', zIndex: 3 - i,
                        }}
                      >
                        {stream.seller?.avatar_url ? (
                          <img
                            src={stream.seller.avatar_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%',
                            backgroundColor: '#F0908A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700, color: '#fff',
                          }}>
                            {(stream.seller?.display_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {data.count} {ct.streams}
                  </span>
                </div>
              )}

              {data.count === 0 && (
                <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: '#333',
                  }} />
                  <span style={{ fontSize: '11px', color: '#555' }}>
                    {ct.noLive}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Bottom sheet */}
      {selectedCity && cityData[selectedCity] && (
        <CityStreamSheet
          city={selectedCity}
          data={cityData[selectedCity]}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  )
}

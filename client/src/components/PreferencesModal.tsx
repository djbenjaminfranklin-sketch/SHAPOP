import { useState, useEffect } from 'react'
import { getLang } from '../lib/i18n'
import { categories } from './CategoryIcons'
import { detectCountryByGPS, getStoredGPSCountry } from '../lib/geolocation'
import { COUNTRIES, getCommunitiesByCountry, detectUserCountry } from '../lib/communitiesData'
import type { CountryCode } from '../lib/communitiesData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Lang = 'fr' | 'en' | 'he' | 'es'

const modalContent = {
  fr: {
    personalizeYourFeed: 'Personnalise ton feed',
    chooseCategories: 'Choisis les categories qui t\'interessent',
    selectCities: 'Selectionne tes villes preferees',
    skip: 'Passer',
    next: 'Suivant',
    chosen: 'choisies',
    letsGo: 'C\'est parti !',
  },
  en: {
    personalizeYourFeed: 'Personalize your feed',
    chooseCategories: 'Choose the categories you\'re interested in',
    selectCities: 'Select your preferred cities',
    skip: 'Skip',
    next: 'Next',
    chosen: 'chosen',
    letsGo: 'Let\'s go!',
  },
  he: {
    personalizeYourFeed: '\u05D4\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA \u05D0\u05EA \u05D4\u05E4\u05D9\u05D3',
    chooseCategories: '\u05D1\u05D7\u05E8 \u05D0\u05EA \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05E9\u05DE\u05E2\u05E0\u05D9\u05D9\u05E0\u05D5\u05EA \u05D0\u05D5\u05EA\u05DA',
    selectCities: '\u05D1\u05D7\u05E8 \u05D0\u05EA \u05D4\u05E2\u05E8\u05D9\u05DD \u05D4\u05DE\u05D5\u05E2\u05D3\u05E4\u05D5\u05EA \u05E2\u05DC\u05D9\u05DA',
    skip: '\u05D3\u05DC\u05D2',
    next: '\u05D4\u05D1\u05D0',
    chosen: '\u05E0\u05D1\u05D7\u05E8\u05D5',
    letsGo: '!\u05D9\u05D0\u05DC\u05DC\u05D4',
  },
  es: {
    personalizeYourFeed: 'Personaliza tu feed',
    chooseCategories: 'Elige las categorias que te interesan',
    selectCities: 'Selecciona tus ciudades preferidas',
    skip: 'Saltar',
    next: 'Siguiente',
    chosen: 'elegidas',
    letsGo: 'Vamos!',
  },
}

const STORAGE_KEY = 'shapop_preferences'

export interface LocalPreferences {
  favorite_categories: string[]
  preferred_cities: string[]
  price_range_min: number
  price_range_max: number
  favorite_sellers: string[]
}

export function loadPreferences(): LocalPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LocalPreferences
  } catch {
    return null
  }
}

export function savePreferences(prefs: LocalPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function hasPreferences(): boolean {
  return loadPreferences() !== null
}

interface PreferencesModalProps {
  visible: boolean
  onClose: () => void
}

// Only show categories that are real product categories (skip for_you and following)
const selectableCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

export default function PreferencesModal({ visible, onClose }: PreferencesModalProps) {
  const { user } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = modalContent[lang] || modalContent.fr
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [step, setStep] = useState<'categories' | 'cities'>('categories')
  const [userCountry, setUserCountry] = useState<CountryCode>(() => {
    return getStoredGPSCountry() || detectUserCountry()
  })

  // Try GPS detection when modal opens
  useEffect(() => {
    if (visible) {
      detectCountryByGPS().then(country => {
        if (country) {
          setUserCountry(country)
          localStorage.setItem('shapop_country', country)
        }
      })
    }
  }, [visible])

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    }
    return () => {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
  }, [visible])

  // Get cities from communities data for the detected country
  const communities = getCommunitiesByCountry(userCountry)
  const commCities = communities.map(c => c.city).filter((city, i, arr) => arr.indexOf(city) === i)
  // Add the GPS-detected city at the top if not already in the list
  const detectedCity = localStorage.getItem('shapop_user_city')
  const countryCities = detectedCity && !commCities.includes(detectedCity)
    ? [detectedCity, ...commCities]
    : commCities
  const countryInfo = COUNTRIES.find(c => c.code === userCountry)

  if (!visible) return null

  const toggleCategory = (label: string) => {
    setSelectedCategories(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    )
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  const handleSave = async () => {
    const prefs: LocalPreferences = {
      favorite_categories: selectedCategories,
      preferred_cities: selectedCities,
      price_range_min: 0,
      price_range_max: 10000,
      favorite_sellers: [],
    }
    savePreferences(prefs)
    if (user) {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        favorite_categories: selectedCategories,
        preferred_cities: selectedCities,
        price_range_min: 0,
        price_range_max: 10000,
        favorite_sellers: [],
      })
    }
    onClose()
  }

  const handleSkip = async () => {
    // Save empty preferences so the modal doesn't show again
    const prefs: LocalPreferences = {
      favorite_categories: [],
      preferred_cities: [],
      price_range_min: 0,
      price_range_max: 10000,
      favorite_sellers: [],
    }
    savePreferences(prefs)
    if (user) {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        favorite_categories: [],
        preferred_cities: [],
        price_range_min: 0,
        price_range_max: 10000,
        favorite_sellers: [],
      })
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleSkip}
        onTouchMove={e => e.preventDefault()}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 100,
          touchAction: 'none',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease-out',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Header compact */}
        <div style={{ padding: '16px 24px 8px 24px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>
            {ct.personalizeYourFeed}
          </h2>
          <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: 1.3 }}>
            {step === 'categories'
              ? ct.chooseCategories
              : ct.selectCities}
          </p>
          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
            <div style={{
              width: step === 'categories' ? '24px' : '8px',
              height: '6px',
              borderRadius: '3px',
              backgroundColor: step === 'categories' ? '#F0908A' : '#444',
              transition: 'all 0.3s ease',
            }} />
            <div style={{
              width: step === 'cities' ? '24px' : '8px',
              height: '6px',
              borderRadius: '3px',
              backgroundColor: step === 'cities' ? '#F0908A' : '#444',
              transition: 'all 0.3s ease',
            }} />
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {step === 'categories' ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              paddingBottom: '16px',
            }}>
              {selectableCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat.label)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.label)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '20px',
                      border: isSelected ? '2px solid #F0908A' : '1px solid #333',
                      backgroundColor: isSelected ? 'rgba(240, 144, 138, 0.15)' : '#1A1A1A',
                      color: isSelected ? '#F0908A' : '#ccc',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {cat.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ paddingBottom: '16px' }}>
              {/* Country selector */}
              <div style={{
                display: 'flex', gap: '8px', marginBottom: '16px',
                overflowX: 'auto', paddingBottom: '4px',
                WebkitOverflowScrolling: 'touch' as const,
                scrollbarWidth: 'none' as const,
                justifyContent: 'center',
              }}>
                {COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    onClick={() => setUserCountry(country.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '16px',
                      border: userCountry === country.code
                        ? '1.5px solid #F0908A'
                        : '1px solid #333',
                      backgroundColor: userCountry === country.code
                        ? 'rgba(240,144,138,0.15)'
                        : '#1A1A1A',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{country.flag}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: userCountry === country.code ? '#F0908A' : '#888',
                    }}>
                      {country.name[lang] || country.name.en}
                    </span>
                  </button>
                ))}
              </div>

              {/* Cities for selected country */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'center',
              }}>
                {countryCities.map(city => {
                  const isSelected = selectedCities.includes(city)
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '16px',
                        border: isSelected ? '2px solid #F0908A' : '1px solid #333',
                        backgroundColor: isSelected ? 'rgba(240, 144, 138, 0.15)' : '#1A1A1A',
                        color: isSelected ? '#F0908A' : '#ccc',
                        fontSize: '14px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isSelected ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: '14px' }}>📍</span>
                      )}
                      {city}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{
          padding: '16px 20px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          gap: '12px',
          borderTop: '1px solid #222',
        }}>
          <button
            onClick={handleSkip}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid #333',
              backgroundColor: 'transparent',
              color: '#888',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ct.skip}
          </button>
          {step === 'categories' ? (
            <button
              onClick={() => setStep('cities')}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: selectedCategories.length > 0
                  ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                  : '#333',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.next} ({selectedCategories.length} {ct.chosen})
            </button>
          ) : (
            <button
              onClick={handleSave}
              style={{
                flex: 2,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.letsGo}
            </button>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

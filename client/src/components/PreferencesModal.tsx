import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getLang, t, tr, I18N_TRANSLATIONS, type Lang, type Localized } from '../lib/i18n'
import { categories } from './CategoryIcons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import CitySearchField from './CitySearchField'
import { useCitySuggestions } from '../hooks/useCitySuggestions'
import { buildCitySuggestions, optionFromKey, sameCity, type CityOption } from '../lib/cities'

const modalContent: Localized<{
  personalizeYourFeed: string; chooseCategories: string; selectCities: string
  skip: string; next: string; letsGo: string
  locating: string; locationOff: string; yourPosition: string; nearby: string
}> = {
  en: {
    personalizeYourFeed: 'Personalize your feed',
    chooseCategories: 'Pick the categories you’re into',
    selectCities: 'Pick your favorite cities',
    skip: 'Skip',
    next: 'Next',
    letsGo: 'Let’s go!',
    locating: 'Finding cities around you…',
    locationOff: 'Location unavailable: search for your city above.',
    yourPosition: 'You are here',
    nearby: 'Nearby',
  },
  fr: {
    personalizeYourFeed: 'Personnalise ton fil',
    chooseCategories: 'Choisis les catégories qui t’intéressent',
    selectCities: 'Sélectionne tes villes préférées',
    skip: 'Passer',
    next: 'Suivant',
    letsGo: 'C’est parti !',
    locating: 'Recherche des villes autour de toi…',
    locationOff: 'Position indisponible : cherche ta ville ci-dessus.',
    yourPosition: 'Tu es ici',
    nearby: 'À proximité',
  },
  es: {
    personalizeYourFeed: 'Personaliza tu feed',
    chooseCategories: 'Elige las categorías que te interesan',
    selectCities: 'Selecciona tus ciudades favoritas',
    skip: 'Omitir',
    next: 'Siguiente',
    letsGo: '¡Vamos!',
    locating: 'Buscando ciudades cerca de ti…',
    locationOff: 'Ubicación no disponible: busca tu ciudad arriba.',
    yourPosition: 'Estás aquí',
    nearby: 'Cerca',
  },
  ru: {
    personalizeYourFeed: 'Настрой свою ленту',
    chooseCategories: 'Выбери интересные тебе категории',
    selectCities: 'Выбери любимые города',
    skip: 'Пропустить',
    next: 'Далее',
    letsGo: 'Поехали!',
    locating: 'Ищем города рядом с тобой…',
    locationOff: 'Местоположение недоступно: найди свой город выше.',
    yourPosition: 'Ты здесь',
    nearby: 'Рядом',
  },
  he: {
    personalizeYourFeed: 'התאמה אישית של הפיד',
    chooseCategories: 'בחרו את הקטגוריות שמעניינות אתכם',
    selectCities: 'בחרו את הערים המועדפות עליכם',
    skip: 'דילוג',
    next: 'הבא',
    letsGo: 'יאללה!',
    locating: 'מחפשים ערים באזור שלך…',
    locationOff: 'המיקום לא זמין: חפשו את העיר שלכם למעלה.',
    yourPosition: 'את/ה כאן',
    nearby: 'בקרבת מקום',
  },
}

/** Nom de catégorie traduit (la valeur enregistrée reste `cat.label`). */
function categoryName(cat: { id: string; label: string }, lang: Lang): string {
  const dict = I18N_TRANSLATIONS[lang] as Record<string, string>
  return dict[cat.id] || cat.label
}


const STORAGE_KEY = 'shapop_preferences'

import type { LocalPreferences } from '../types/preferences'

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
  const lang = getLang()
  const ct = tr(modalContent)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  // Valeurs enregistrées = noms canoniques ; les anciennes (ex. « Neuilly-sur-Seine ») restent valables
  const [selectedCities, setSelectedCities] = useState<string[]>(() => loadPreferences()?.preferred_cities || [])
  const [step, setStep] = useState<'categories' | 'cities'>('categories')

  // Lock body scroll + hide BottomNav when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
      document.body.setAttribute('data-modal-open', 'true')
    }
    return () => {
      document.body.style.overflow = ''
      document.body.removeAttribute('data-modal-open')
    }
  }, [visible])

  if (!visible) return null

  const toggleCategory = (label: string) => {
    setSelectedCategories(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
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
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        favorite_categories: selectedCategories,
        preferred_cities: selectedCities,
        price_range_min: 0,
        price_range_max: 10000,
        favorite_sellers: [],
      })
      if (error) console.error('Failed to save preferences:', error)
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
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        favorite_categories: [],
        preferred_cities: [],
        price_range_min: 0,
        price_range_max: 10000,
        favorite_sellers: [],
      })
      if (error) console.error('Failed to save preferences:', error)
    }
    onClose()
  }

  // Use createPortal to render directly in document.body — bypasses stacking context issues (BottomNav was on top)
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* Force-hide BottomNav and any other fixed elements behind the modal */}
      <style>{`body[data-modal-open] nav { display: none !important; } body[data-modal-open] .home-button { display: none !important; }`}</style>
      {/* Full-screen modal */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#111',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Header with logo */}
        <div style={{ padding: '16px 24px 8px 24px', textAlign: 'center' }}>
          <img src="/logo.png" alt="ShaPop" style={{ height: '36px', objectFit: 'contain', marginBottom: '12px' }} />
          <h2 style={{ color: '#fff', fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, margin: '0 0 4px 0' }}>
            {ct.personalizeYourFeed}
          </h2>
          <p style={{ color: '#888', fontSize: 'calc(13px * var(--fs, 1))', margin: 0, lineHeight: 1.3 }}>
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
                      fontSize: 'calc(13px * var(--fs, 1))',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      touchAction: 'manipulation',
                    }}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {categoryName(cat, lang)}
                  </button>
                )
              })}
            </div>
          ) : (
            <CitiesStep selected={selectedCities} onChange={setSelectedCities} />
          )}
        </div>

        {/* Bottom actions */}
        <div style={{
          padding: '16px 20px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
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
              backgroundColor: '#1A1A1A',
              color: '#888',
              fontSize: 'calc(15px * var(--fs, 1))',
              fontWeight: 600,
              cursor: 'pointer',
              touchAction: 'manipulation',
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
                fontSize: 'calc(15px * var(--fs, 1))',
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {ct.next}{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
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
                fontSize: 'calc(15px * var(--fs, 1))',
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {ct.letsGo}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

const chipStyle = (isSelected: boolean) => ({
  padding: '10px 16px',
  borderRadius: '16px',
  border: isSelected ? '2px solid #F0908A' : '1px solid #333',
  backgroundColor: isSelected ? 'rgba(240, 144, 138, 0.15)' : '#1A1A1A',
  color: isSelected ? '#F0908A' : '#ccc',
  fontSize: 'calc(14px * var(--fs, 1))',
  fontWeight: isSelected ? 700 : 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  touchAction: 'manipulation' as const,
})

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/**
 * Étape « villes » : la ville de l'utilisateur et les villes proches (si la
 * position est connue), un champ « Ta ville » pour n'importe quel pays, et
 * « Toutes les villes » (aucune ville choisie) par défaut.
 */
function CitiesStep({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const lang = getLang()
  const ct = tr(modalContent, lang)
  const { status, detected, nearby, coords } = useCitySuggestions()
  // Villes ajoutées par la recherche (gardées pour l'affichage)
  const picked = useRef(new Map<string, CityOption>())

  const selectedOptions = selected.map(k => picked.current.get(k) || optionFromKey(k, lang))
  const suggestions = buildCitySuggestions({ detected, selected: selectedOptions, nearby, max: 14 })
  const isSelected = (key: string) => selected.some(k => sameCity(k, key))

  const toggle = (key: string) => {
    onChange(isSelected(key) ? selected.filter(k => !sameCity(k, key)) : [...selected, key])
  }

  const addFromSearch = (city: CityOption) => {
    picked.current.set(city.key, city)
    if (!isSelected(city.key)) onChange([...selected, city.key])
  }

  return (
    <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <CitySearchField onPick={addFromSearch} near={coords} />

      {status === 'locating' && (
        <p style={{ color: '#888', fontSize: 'calc(13px * var(--fs, 1))', margin: 0, textAlign: 'center' }}>{ct.locating}</p>
      )}
      {(status === 'denied' || status === 'unavailable') && (
        <p style={{ color: '#888', fontSize: 'calc(13px * var(--fs, 1))', margin: 0, textAlign: 'center' }}>{ct.locationOff}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        <button onClick={() => onChange([])} style={chipStyle(selected.length === 0)} aria-pressed={selected.length === 0}>
          {selected.length === 0 ? <CheckIcon /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          )}
          {t(lang, 'all_cities')}
        </button>
        {suggestions.map(city => {
          const on = isSelected(city.key)
          const isHere = !!detected && sameCity(detected.key, city.key)
          const isNear = !isHere && nearby.some(n => sameCity(n.key, city.key))
          return (
            <button key={city.key} onClick={() => toggle(city.key)} style={chipStyle(on)} aria-pressed={on}>
              {on ? <CheckIcon /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              )}
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span dir="auto">{city.label}</span>
                {(isHere || isNear) && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 500, color: on ? '#F0908A' : '#777' }}>
                    {isHere ? ct.yourPosition : ct.nearby}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

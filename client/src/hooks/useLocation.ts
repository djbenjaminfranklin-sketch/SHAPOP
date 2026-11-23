import { useEffect, useState } from 'react'
import { getLang, tr, useLang, type Localized } from '../lib/i18n'
import { cityLabel, getDevicePosition, reverseGeocodeCity, rememberCityLabel, type CityOption } from '../lib/cities'

type LocationErrors = { unsupported: string; noCity: string; denied: string; failed: string }
const locationErrors: Localized<LocationErrors> = {
  en: { unsupported: 'Location isn\'t supported on this device', noCity: 'We couldn\'t find your city', denied: 'Location permission denied', failed: 'We couldn\'t get your location' },
  fr: { unsupported: 'La localisation n\'est pas disponible sur cet appareil', noCity: 'Impossible de trouver ta ville', denied: 'Accès à la position refusé', failed: 'Impossible d\'obtenir ta position' },
  es: { unsupported: 'La ubicación no está disponible en este dispositivo', noCity: 'No pudimos encontrar tu ciudad', denied: 'Permiso de ubicación denegado', failed: 'No pudimos obtener tu ubicación' },
  ru: { unsupported: 'Геолокация недоступна на этом устройстве', noCity: 'Не удалось определить твой город', denied: 'Доступ к геолокации запрещён', failed: 'Не удалось определить твоё местоположение' },
  he: { unsupported: 'המכשיר לא תומך באיתור מיקום', noCity: 'לא הצלחנו לזהות את העיר שלך', denied: 'הגישה למיקום נדחתה', failed: 'לא הצלחנו לקבל את המיקום שלך' },
}

interface LocationState {
  /** Valeur enregistrée (nom canonique, en anglais) — c'est elle qui va au profil. */
  city: string | null
  /** Nom de la ville dans la langue de l'app. */
  cityLabel: string | null
  /** Ville complète (coordonnées, pays) quand elle est connue. */
  cityOption: CityOption | null
  loading: boolean
  error: string | null
  requestLocation: () => void
  /** Ville choisie à la main ; '' ou null = toutes les villes. */
  setManualCity: (city: string | CityOption | null) => void
}

const STORAGE_KEY = 'shapop_user_city'
const META_KEY = 'shapop_user_city_meta'

function readMeta(key: string | null): CityOption | null {
  if (!key) return null
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || 'null') as CityOption | null
    return meta && meta.key === key ? meta : { key, label: key }
  } catch { return { key, label: key } }
}

function store(option: CityOption | null) {
  if (option) {
    localStorage.setItem(STORAGE_KEY, option.key)
    localStorage.setItem(META_KEY, JSON.stringify(option))
  } else {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(META_KEY)
  }
}

export function useLocation(): LocationState {
  const lang = useLang()
  const [option, setOption] = useState<CityOption | null>(() => readMeta(localStorage.getItem(STORAGE_KEY)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError(tr(locationErrors).unsupported)
      return
    }
    setLoading(true)
    setError(null)
    getDevicePosition().then(async (pos) => {
      if ('error' in pos) {
        setError(pos.error === 'denied' ? tr(locationErrors).denied : tr(locationErrors).failed)
        setLoading(false)
        return
      }
      const detected = await reverseGeocodeCity(pos.coords, getLang())
      if (detected) {
        setOption(detected)
        store(detected)
      } else {
        setError(tr(locationErrors).noCity)
      }
      setLoading(false)
    })
  }

  const setManualCity = (value: string | CityOption | null) => {
    const next: CityOption | null = !value ? null : typeof value === 'string' ? { key: value, label: cityLabel(value) } : value
    if (next) rememberCityLabel(next.key, getLang(), next.label)
    setOption(next)
    setError(null)
    store(next)
  }

  // Auto-request on first load if no city saved
  // Defer so it doesn't block initial render / cause freeze on iOS WKWebView
  useEffect(() => {
    if (!option) {
      const timer = setTimeout(() => requestLocation(), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const city = option?.key ?? null
  return {
    city,
    cityLabel: city ? cityLabel(city, lang) : null,
    cityOption: option,
    loading, error, requestLocation, setManualCity,
  }
}

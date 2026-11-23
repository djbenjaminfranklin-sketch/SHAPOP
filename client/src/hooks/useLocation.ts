import { useEffect, useState } from 'react'
import { tr, type Localized } from '../lib/i18n'

type LocationErrors = { unsupported: string; noCity: string; denied: string; failed: string }
const locationErrors: Localized<LocationErrors> = {
  en: { unsupported: 'Location isn\'t supported on this device', noCity: 'We couldn\'t find your city', denied: 'Location permission denied', failed: 'We couldn\'t get your location' },
  fr: { unsupported: 'La localisation n\'est pas disponible sur cet appareil', noCity: 'Impossible de trouver ta ville', denied: 'Accès à la position refusé', failed: 'Impossible d\'obtenir ta position' },
  es: { unsupported: 'La ubicación no está disponible en este dispositivo', noCity: 'No pudimos encontrar tu ciudad', denied: 'Permiso de ubicación denegado', failed: 'No pudimos obtener tu ubicación' },
  ru: { unsupported: 'Геолокация недоступна на этом устройстве', noCity: 'Не удалось определить твой город', denied: 'Доступ к геолокации запрещён', failed: 'Не удалось определить твоё местоположение' },
  he: { unsupported: 'המכשיר לא תומך באיתור מיקום', noCity: 'לא הצלחנו לזהות את העיר שלך', denied: 'הגישה למיקום נדחתה', failed: 'לא הצלחנו לקבל את המיקום שלך' },
}

interface LocationState {
  city: string | null
  loading: boolean
  error: string | null
  requestLocation: () => void
  setManualCity: (city: string) => void
}

const STORAGE_KEY = 'shapop_user_city'

export function useLocation(): LocationState {
  const [city, setCity] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'ShaPop/1.0' } } // i18n-ignore (en-tête technique)
      )
      const data = await res.json()
      return data.address?.city || data.address?.town || data.address?.village || null
    } catch {
      return null
    }
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError(tr(locationErrors).unsupported)
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detected = await reverseGeocode(position.coords.latitude, position.coords.longitude)
        if (detected) {
          setCity(detected)
          localStorage.setItem(STORAGE_KEY, detected)
        } else {
          setError(tr(locationErrors).noCity)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.code === 1 ? tr(locationErrors).denied : tr(locationErrors).failed)
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const setManualCity = (newCity: string) => {
    const value = newCity || null
    setCity(value)
    setError(null)
    if (value) {
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Auto-request on first load if no city saved
  // Defer so it doesn't block initial render / cause freeze on iOS WKWebView
  useEffect(() => {
    if (!city) {
      const timer = setTimeout(() => requestLocation(), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  return { city, loading, error, requestLocation, setManualCity }
}

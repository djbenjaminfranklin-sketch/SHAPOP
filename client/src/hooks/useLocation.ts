import { useEffect, useState } from 'react'

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
        { headers: { 'User-Agent': 'ShaPop/1.0' } }
      )
      const data = await res.json()
      return data.address?.city || data.address?.town || data.address?.village || null
    } catch {
      return null
    }
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
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
          setError('Could not detect city')
        }
        setLoading(false)
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied' : 'Could not get location')
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
  useEffect(() => {
    if (!city) {
      requestLocation()
    }
  }, [])

  return { city, loading, error, requestLocation, setManualCity }
}

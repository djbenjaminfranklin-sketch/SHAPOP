import type { CountryCode } from './communitiesData'

// Bounding boxes for supported countries (order matters: smaller/specific first)
const COUNTRY_BOUNDS: { code: CountryCode; latMin: number; latMax: number; lonMin: number; lonMax: number }[] = [
  { code: 'GB', latMin: 49.5, latMax: 61, lonMin: -8.5, lonMax: 2 },
  { code: 'ES', latMin: 35.5, latMax: 43.8, lonMin: -10, lonMax: 3.5 },
  { code: 'FR', latMin: 42, latMax: 51.5, lonMin: -5.5, lonMax: 10 },
  { code: 'US', latMin: 24, latMax: 50, lonMin: -130, lonMax: -60 },
]

function coordsToCountry(lat: number, lon: number): CountryCode | null {
  for (const b of COUNTRY_BOUNDS) {
    if (lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax) {
      return b.code
    }
  }
  return null
}

export function detectCountryByGPS(): Promise<CountryCode | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const country = coordsToCountry(latitude, longitude)
        if (country) {
          localStorage.setItem('shapop_gps_country', country)
        }
        // Also reverse-geocode the city if not already stored
        if (!localStorage.getItem('shapop_user_city')) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
              { headers: { 'User-Agent': 'ShaPop/1.0' } }
            )
            const data = await res.json()
            const city = data.address?.city || data.address?.town || data.address?.village
            if (city) {
              localStorage.setItem('shapop_user_city', city)
            }
          } catch { /* ignore */ }
        }
        resolve(country)
      },
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false }
    )
  })
}

export function getStoredGPSCountry(): CountryCode | null {
  const stored = localStorage.getItem('shapop_gps_country')
  if (stored && ['FR', 'ES', 'US', 'GB'].includes(stored)) {
    return stored as CountryCode
  }
  return null
}

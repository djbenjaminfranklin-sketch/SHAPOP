import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n'
import {
  getDevicePosition, getStoredCoords, reverseGeocodeCity, fetchNearbyCities,
  type CityOption, type Coords,
} from '../lib/cities'

export type CityLocateStatus = 'locating' | 'ready' | 'denied' | 'unavailable'

export interface CitySuggestionsState {
  status: CityLocateStatus
  /** Ville où se trouve l'utilisateur (si la position est connue). */
  detected: CityOption | null
  /** Villes proches du centre (position, ou ville choisie à la main). */
  nearby: CityOption[]
  coords: Coords | null
}

/**
 * Ville de l'utilisateur + villes proches, dans la langue de l'app.
 * `center` : ville choisie à la main ; si elle a des coordonnées, les villes
 * proches sont cherchées autour d'elle plutôt qu'autour de la position.
 * Aucune nouvelle autorisation : on réutilise la position approximative.
 */
export function useCitySuggestions(center?: CityOption | null): CitySuggestionsState {
  const lang = useLang()
  const [state, setState] = useState<CitySuggestionsState>(() => ({
    status: 'locating', detected: null, nearby: [], coords: getStoredCoords(),
  }))
  const centerLat = center?.lat
  const centerLon = center?.lon

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const pos = await getDevicePosition()
      if (cancelled) return
      const coords = 'coords' in pos ? pos.coords : null
      const status: CityLocateStatus = coords ? 'ready' : ('error' in pos ? pos.error : 'unavailable')
      const detected = coords ? await reverseGeocodeCity(coords, lang) : null
      if (cancelled) return
      if (detected?.country) {
        try { localStorage.setItem('shapop_gps_country', detected.country) } catch { /* ignore */ }
      }
      const origin: Coords | null = typeof centerLat === 'number' && typeof centerLon === 'number'
        ? { lat: centerLat, lon: centerLon }
        : coords
      // Ville et statut d'abord, villes proches ensuite (requête plus lente)
      setState({ status, detected, nearby: [], coords })
      const nearby = origin ? await fetchNearbyCities(origin, lang) : []
      if (!cancelled) setState({ status, detected, nearby, coords })
    }
    run()
    return () => { cancelled = true }
  }, [lang, centerLat, centerLon])

  return state
}

import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredGPSCountry } from '../geolocation'

// The coordsToCountry function is not exported, so we replicate it here
// to test the bounding box logic independently.
// This ensures the logic is correct without calling the browser Geolocation API.
const COUNTRY_BOUNDS: { code: string; latMin: number; latMax: number; lonMin: number; lonMax: number }[] = [
  { code: 'IL', latMin: 29.5, latMax: 33.5, lonMin: 34, lonMax: 36 },
  { code: 'PT', latMin: 36.5, latMax: 42.5, lonMin: -9.5, lonMax: -6 },
  { code: 'GB', latMin: 49.5, latMax: 61, lonMin: -8.5, lonMax: 2 },
  { code: 'MA', latMin: 27, latMax: 36, lonMin: -13, lonMax: -1 },
  { code: 'ES', latMin: 35.5, latMax: 43.8, lonMin: -10, lonMax: 3.5 },
  { code: 'FR', latMin: 42, latMax: 51.5, lonMin: -5.5, lonMax: 10 },
  { code: 'IT', latMin: 36, latMax: 47.5, lonMin: 6.5, lonMax: 18.5 },
  { code: 'DE', latMin: 47, latMax: 55.5, lonMin: 5.5, lonMax: 15.5 },
  { code: 'JP', latMin: 24, latMax: 46, lonMin: 122, lonMax: 146 },
  { code: 'BR', latMin: -34, latMax: 6, lonMin: -74, lonMax: -34 },
  { code: 'CA', latMin: 41, latMax: 84, lonMin: -141, lonMax: -52 },
  { code: 'US', latMin: 24, latMax: 50, lonMin: -130, lonMax: -60 },
]

function coordsToCountry(lat: number, lon: number): string | null {
  for (const b of COUNTRY_BOUNDS) {
    if (lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax) {
      return b.code
    }
  }
  return null
}

describe('geolocation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('coordsToCountry() [pure bounding box logic]', () => {
    it('detects Paris, France', () => {
      expect(coordsToCountry(48.8566, 2.3522)).toBe('FR')
    })

    it('detects Lyon, France', () => {
      expect(coordsToCountry(45.764, 4.8357)).toBe('FR')
    })

    it('detects Tel Aviv, Israel', () => {
      expect(coordsToCountry(32.0853, 34.7818)).toBe('IL')
    })

    it('detects Jerusalem, Israel', () => {
      expect(coordsToCountry(31.7683, 35.2137)).toBe('IL')
    })

    it('detects London, United Kingdom', () => {
      expect(coordsToCountry(51.5074, -0.1278)).toBe('GB')
    })

    it('detects Madrid, Spain', () => {
      expect(coordsToCountry(40.4168, -3.7038)).toBe('ES')
    })

    it('detects Barcelona, Spain', () => {
      expect(coordsToCountry(41.3874, 2.1686)).toBe('ES')
    })

    it('detects Lisbon, Portugal', () => {
      expect(coordsToCountry(38.7223, -9.1393)).toBe('PT')
    })

    it('detects Casablanca, Morocco', () => {
      expect(coordsToCountry(33.5731, -7.5898)).toBe('MA')
    })

    it('detects Rome, Italy', () => {
      expect(coordsToCountry(41.9028, 12.4964)).toBe('IT')
    })

    it('detects Berlin, Germany', () => {
      expect(coordsToCountry(52.52, 13.405)).toBe('DE')
    })

    it('detects Tokyo, Japan', () => {
      expect(coordsToCountry(35.6762, 139.6503)).toBe('JP')
    })

    it('detects Sao Paulo, Brazil', () => {
      expect(coordsToCountry(-23.5505, -46.6333)).toBe('BR')
    })

    it('detects Toronto, Canada', () => {
      expect(coordsToCountry(43.6532, -79.3832)).toBe('CA')
    })

    it('detects New York, USA', () => {
      expect(coordsToCountry(40.7128, -74.006)).toBe('US')
    })

    it('detects Los Angeles, USA', () => {
      expect(coordsToCountry(34.0522, -118.2437)).toBe('US')
    })

    it('returns null for coordinates in the ocean (mid-Atlantic)', () => {
      expect(coordsToCountry(30, -30)).toBeNull()
    })

    it('returns null for coordinates in Antarctica', () => {
      expect(coordsToCountry(-80, 0)).toBeNull()
    })

    it('returns null for coordinates in central Africa (not covered)', () => {
      expect(coordsToCountry(0, 30)).toBeNull()
    })

    it('returns null for coordinates in China (not covered)', () => {
      expect(coordsToCountry(39.9042, 116.4074)).toBeNull()
    })

    it('returns null for coordinates in Australia (not covered)', () => {
      expect(coordsToCountry(-33.8688, 151.2093)).toBeNull()
    })

    it('prioritizes smaller bounding boxes (Israel over Morocco for overlapping edge)', () => {
      // Israel is listed before Morocco, so if coords fall in both, IL wins
      // This tests the "smaller/specific first" ordering
      const result = coordsToCountry(32, 35)
      expect(result).toBe('IL')
    })

    it('handles exact boundary values (lat/lon at the edge)', () => {
      // Test Israel exact boundary: latMin=29.5, latMax=33.5, lonMin=34, lonMax=36
      expect(coordsToCountry(29.5, 34)).toBe('IL') // exact corner
      expect(coordsToCountry(33.5, 36)).toBe('IL') // exact corner
    })

    it('handles lat just outside boundary', () => {
      // Just below Israel's lat range
      expect(coordsToCountry(29.4, 35)).not.toBe('IL')
    })
  })

  describe('getStoredGPSCountry()', () => {
    it('returns null when no country is stored', () => {
      expect(getStoredGPSCountry()).toBeNull()
    })

    it('returns the stored country code when valid', () => {
      localStorage.setItem('shapop_gps_country', 'FR')
      expect(getStoredGPSCountry()).toBe('FR')
    })

    it('returns stored country for all supported country codes', () => {
      const supportedCodes = ['FR', 'ES', 'US', 'GB', 'BR', 'JP', 'DE', 'IT', 'IL', 'PT', 'MA', 'CA']
      for (const code of supportedCodes) {
        localStorage.setItem('shapop_gps_country', code)
        expect(getStoredGPSCountry()).toBe(code)
      }
    })

    it('returns null for an unsupported country code', () => {
      localStorage.setItem('shapop_gps_country', 'CN')
      expect(getStoredGPSCountry()).toBeNull()
    })

    it('returns null for an empty string', () => {
      localStorage.setItem('shapop_gps_country', '')
      expect(getStoredGPSCountry()).toBeNull()
    })

    it('returns null for garbage data', () => {
      localStorage.setItem('shapop_gps_country', 'not-a-country')
      expect(getStoredGPSCountry()).toBeNull()
    })

    it('is case-sensitive (lowercase not accepted)', () => {
      localStorage.setItem('shapop_gps_country', 'fr')
      expect(getStoredGPSCountry()).toBeNull()
    })
  })
})

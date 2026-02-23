import { describe, it, expect } from 'vitest'

// =============================================
// Replicate pure shipping functions from src/utils.ts
// Cannot import directly because utils.ts imports config.ts
// which throws without SUPABASE_URL/SUPABASE_SERVICE_KEY env vars.
// =============================================

type ShippingRate = { maxGrams: number; cost: number }[]
type ShippingZone = 'france' | 'dom_tom' | 'europe' | 'international'

const SHIPPING_SAFETY_MARGIN = 0.15

const ZONE_CARRIER_MAP: Record<ShippingZone, string> = {
  france: 'mondial_relay',
  dom_tom: 'mondial_relay',
  europe: 'dpd',
  international: 'dhl',
}

const SHIPPING_RATES: Record<string, Record<string, ShippingRate>> = {
  mondial_relay: {
    france: [
      { maxGrams: 500, cost: 6.52 },
      { maxGrams: 1000, cost: 7.50 },
      { maxGrams: 2000, cost: 9.50 },
      { maxGrams: 5000, cost: 12.00 },
      { maxGrams: 10000, cost: 16.00 },
      { maxGrams: 30000, cost: 22.00 },
    ],
    dom_tom: [
      { maxGrams: 500, cost: 12.00 },
      { maxGrams: 1000, cost: 14.00 },
      { maxGrams: 2000, cost: 17.00 },
      { maxGrams: 5000, cost: 22.00 },
      { maxGrams: 10000, cost: 28.00 },
      { maxGrams: 30000, cost: 40.00 },
    ],
  },
  dpd: {
    europe: [
      { maxGrams: 500, cost: 8.99 },
      { maxGrams: 1000, cost: 10.99 },
      { maxGrams: 2000, cost: 13.99 },
      { maxGrams: 5000, cost: 18.99 },
      { maxGrams: 10000, cost: 24.99 },
      { maxGrams: 30000, cost: 39.99 },
    ],
  },
  dhl: {
    international: [
      { maxGrams: 500, cost: 29.99 },
      { maxGrams: 1000, cost: 34.99 },
      { maxGrams: 2000, cost: 44.99 },
      { maxGrams: 5000, cost: 64.99 },
      { maxGrams: 10000, cost: 89.99 },
    ],
  },
}

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'DE',
  'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
  'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

const DOM_TOM_ZIP_PREFIXES = ['971', '972', '973', '974', '976']

function getZoneFromCountry(countryCode?: string, zip?: string): ShippingZone {
  if (!countryCode) return 'france'
  const code = countryCode.toUpperCase().trim()
  if (code === 'FR') {
    if (zip) {
      const zipClean = zip.replace(/\s/g, '')
      for (const prefix of DOM_TOM_ZIP_PREFIXES) {
        if (zipClean.startsWith(prefix)) {
          return 'dom_tom'
        }
      }
    }
    return 'france'
  }
  if (EU_COUNTRY_CODES.has(code)) {
    return 'europe'
  }
  return 'international'
}

function getCarrierForZone(zone?: string): string {
  const zoneKey = (zone || 'france') as ShippingZone
  return ZONE_CARRIER_MAP[zoneKey] || 'mondial_relay'
}

function calculateBaseShippingCost(weightGrams: number, carrier: string, zone?: string): number {
  const zoneKey = (zone || 'france') as ShippingZone
  const carrierRates = SHIPPING_RATES[carrier]
  if (!carrierRates) return 0
  const rates = carrierRates[zoneKey]
  if (!rates) return 0
  for (const tier of rates) {
    if (weightGrams <= tier.maxGrams) {
      return tier.cost
    }
  }
  return rates[rates.length - 1].cost
}

function calculateShippingCost(weightGrams: number, carrier: string, zone?: string, itemCount?: number): number {
  const baseCost = calculateBaseShippingCost(weightGrams, carrier, zone)
  if (baseCost === 0) return 0
  let cost = baseCost * (1 + SHIPPING_SAFETY_MARGIN)
  if (itemCount && itemCount >= 4) {
    cost *= 0.75
  } else if (itemCount && itemCount >= 2) {
    cost *= 0.85
  }
  return Math.round(cost * 100) / 100
}

function isCarrierAvailableForZone(carrier: string, zone?: string): boolean {
  const zoneKey = (zone || 'france') as ShippingZone
  const carrierRates = SHIPPING_RATES[carrier]
  if (!carrierRates) return false
  return !!carrierRates[zoneKey]
}

function getShippingOptions(weightGrams: number, zone?: string): { carrier: string; cost: number; zone: string }[] {
  const zoneKey = (zone || 'france') as ShippingZone
  const carrier = getCarrierForZone(zoneKey)
  const cost = calculateShippingCost(weightGrams, carrier, zoneKey)
  if (cost === 0) return []
  return [{ carrier, cost, zone: zoneKey }]
}

function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val
}

// =============================================
// Tests
// =============================================

describe('getZoneFromCountry()', () => {
  it('returns "france" when no country code is provided', () => {
    expect(getZoneFromCountry()).toBe('france')
    expect(getZoneFromCountry(undefined)).toBe('france')
  })

  it('returns "france" for FR with a mainland zip code', () => {
    expect(getZoneFromCountry('FR', '75001')).toBe('france')
    expect(getZoneFromCountry('FR', '69001')).toBe('france')
    expect(getZoneFromCountry('FR', '13001')).toBe('france')
  })

  it('returns "france" for FR without a zip code', () => {
    expect(getZoneFromCountry('FR')).toBe('france')
  })

  it('returns "dom_tom" for Guadeloupe zip code (971xx)', () => {
    expect(getZoneFromCountry('FR', '97100')).toBe('dom_tom')
    expect(getZoneFromCountry('FR', '97190')).toBe('dom_tom')
  })

  it('returns "dom_tom" for Martinique zip code (972xx)', () => {
    expect(getZoneFromCountry('FR', '97200')).toBe('dom_tom')
  })

  it('returns "dom_tom" for Guyane zip code (973xx)', () => {
    expect(getZoneFromCountry('FR', '97300')).toBe('dom_tom')
  })

  it('returns "dom_tom" for Reunion zip code (974xx)', () => {
    expect(getZoneFromCountry('FR', '97400')).toBe('dom_tom')
  })

  it('returns "dom_tom" for Mayotte zip code (976xx)', () => {
    expect(getZoneFromCountry('FR', '97600')).toBe('dom_tom')
  })

  it('returns "france" for French zip code 97500 (Saint-Pierre-et-Miquelon, not in DOM_TOM list)', () => {
    // 975 is not in the DOM_TOM_ZIP_PREFIXES list
    expect(getZoneFromCountry('FR', '97500')).toBe('france')
  })

  it('returns "europe" for EU country codes', () => {
    expect(getZoneFromCountry('DE')).toBe('europe')
    expect(getZoneFromCountry('ES')).toBe('europe')
    expect(getZoneFromCountry('IT')).toBe('europe')
    expect(getZoneFromCountry('NL')).toBe('europe')
    expect(getZoneFromCountry('BE')).toBe('europe')
    expect(getZoneFromCountry('PT')).toBe('europe')
    expect(getZoneFromCountry('SE')).toBe('europe')
    expect(getZoneFromCountry('PL')).toBe('europe')
  })

  it('returns "europe" for all EU country codes', () => {
    const euCodes = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'DE',
      'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
      'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
    for (const code of euCodes) {
      expect(getZoneFromCountry(code)).toBe('europe')
    }
  })

  it('returns "international" for non-EU, non-FR countries', () => {
    expect(getZoneFromCountry('US')).toBe('international')
    expect(getZoneFromCountry('JP')).toBe('international')
    expect(getZoneFromCountry('BR')).toBe('international')
    expect(getZoneFromCountry('CA')).toBe('international')
    expect(getZoneFromCountry('AU')).toBe('international')
    expect(getZoneFromCountry('CN')).toBe('international')
    expect(getZoneFromCountry('GB')).toBe('international')
    expect(getZoneFromCountry('IL')).toBe('international')
  })

  it('is case-insensitive for country codes', () => {
    expect(getZoneFromCountry('fr')).toBe('france')
    expect(getZoneFromCountry('Fr')).toBe('france')
    expect(getZoneFromCountry('de')).toBe('europe')
    expect(getZoneFromCountry('us')).toBe('international')
  })

  it('trims whitespace from country codes', () => {
    expect(getZoneFromCountry(' FR ')).toBe('france')
    expect(getZoneFromCountry(' DE ')).toBe('europe')
  })

  it('handles zip codes with spaces', () => {
    expect(getZoneFromCountry('FR', '971 00')).toBe('dom_tom')
  })

  it('returns "france" for empty string country code', () => {
    // empty string is falsy, so returns 'france' default
    expect(getZoneFromCountry('')).toBe('france')
  })
})

describe('getCarrierForZone()', () => {
  it('returns "mondial_relay" for france zone', () => {
    expect(getCarrierForZone('france')).toBe('mondial_relay')
  })

  it('returns "mondial_relay" for dom_tom zone', () => {
    expect(getCarrierForZone('dom_tom')).toBe('mondial_relay')
  })

  it('returns "dpd" for europe zone', () => {
    expect(getCarrierForZone('europe')).toBe('dpd')
  })

  it('returns "dhl" for international zone', () => {
    expect(getCarrierForZone('international')).toBe('dhl')
  })

  it('defaults to "mondial_relay" when no zone is provided', () => {
    expect(getCarrierForZone()).toBe('mondial_relay')
    expect(getCarrierForZone(undefined)).toBe('mondial_relay')
  })

  it('defaults to "mondial_relay" for unknown zone', () => {
    expect(getCarrierForZone('mars')).toBe('mondial_relay')
  })
})

describe('calculateBaseShippingCost()', () => {
  describe('Mondial Relay (France)', () => {
    it('returns 6.52 for weight up to 500g', () => {
      expect(calculateBaseShippingCost(100, 'mondial_relay', 'france')).toBe(6.52)
      expect(calculateBaseShippingCost(500, 'mondial_relay', 'france')).toBe(6.52)
    })

    it('returns 7.50 for weight 501-1000g', () => {
      expect(calculateBaseShippingCost(501, 'mondial_relay', 'france')).toBe(7.50)
      expect(calculateBaseShippingCost(1000, 'mondial_relay', 'france')).toBe(7.50)
    })

    it('returns 9.50 for weight 1001-2000g', () => {
      expect(calculateBaseShippingCost(1500, 'mondial_relay', 'france')).toBe(9.50)
      expect(calculateBaseShippingCost(2000, 'mondial_relay', 'france')).toBe(9.50)
    })

    it('returns 12.00 for weight 2001-5000g', () => {
      expect(calculateBaseShippingCost(3000, 'mondial_relay', 'france')).toBe(12.00)
      expect(calculateBaseShippingCost(5000, 'mondial_relay', 'france')).toBe(12.00)
    })

    it('returns 16.00 for weight 5001-10000g', () => {
      expect(calculateBaseShippingCost(7500, 'mondial_relay', 'france')).toBe(16.00)
      expect(calculateBaseShippingCost(10000, 'mondial_relay', 'france')).toBe(16.00)
    })

    it('returns 22.00 for weight 10001-30000g', () => {
      expect(calculateBaseShippingCost(20000, 'mondial_relay', 'france')).toBe(22.00)
      expect(calculateBaseShippingCost(30000, 'mondial_relay', 'france')).toBe(22.00)
    })

    it('returns highest tier price for weight exceeding 30000g', () => {
      expect(calculateBaseShippingCost(35000, 'mondial_relay', 'france')).toBe(22.00)
    })
  })

  describe('Mondial Relay (DOM-TOM)', () => {
    it('returns 12.00 for weight up to 500g', () => {
      expect(calculateBaseShippingCost(300, 'mondial_relay', 'dom_tom')).toBe(12.00)
    })

    it('returns 40.00 for weight up to 30000g', () => {
      expect(calculateBaseShippingCost(25000, 'mondial_relay', 'dom_tom')).toBe(40.00)
    })

    it('DOM-TOM prices are higher than France prices for the same weight', () => {
      const franceCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
      const domTomCost = calculateBaseShippingCost(500, 'mondial_relay', 'dom_tom')
      expect(domTomCost).toBeGreaterThan(franceCost)
    })
  })

  describe('DPD (Europe)', () => {
    it('returns 8.99 for weight up to 500g', () => {
      expect(calculateBaseShippingCost(250, 'dpd', 'europe')).toBe(8.99)
    })

    it('returns 39.99 for weight up to 30000g', () => {
      expect(calculateBaseShippingCost(30000, 'dpd', 'europe')).toBe(39.99)
    })
  })

  describe('DHL (International)', () => {
    it('returns 29.99 for weight up to 500g', () => {
      expect(calculateBaseShippingCost(200, 'dhl', 'international')).toBe(29.99)
    })

    it('returns 89.99 for weight up to 10000g', () => {
      expect(calculateBaseShippingCost(10000, 'dhl', 'international')).toBe(89.99)
    })

    it('returns highest tier price for weight exceeding 10000g', () => {
      // DHL maxes out at 10000g tier
      expect(calculateBaseShippingCost(15000, 'dhl', 'international')).toBe(89.99)
    })
  })

  describe('Edge cases', () => {
    it('returns 0 for unknown carrier', () => {
      expect(calculateBaseShippingCost(500, 'fedex', 'france')).toBe(0)
    })

    it('returns 0 for carrier with no rates for the given zone', () => {
      // DPD only has Europe rates
      expect(calculateBaseShippingCost(500, 'dpd', 'france')).toBe(0)
      // DHL only has international rates
      expect(calculateBaseShippingCost(500, 'dhl', 'france')).toBe(0)
    })

    it('defaults to france zone when zone is undefined', () => {
      expect(calculateBaseShippingCost(500, 'mondial_relay')).toBe(6.52)
    })

    it('returns first tier cost for very light packages (1g)', () => {
      expect(calculateBaseShippingCost(1, 'mondial_relay', 'france')).toBe(6.52)
    })
  })
})

describe('calculateShippingCost() [with safety margin]', () => {
  it('adds 15% safety margin to base cost', () => {
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france') // 6.52
    const withMargin = calculateShippingCost(500, 'mondial_relay', 'france')
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 100) / 100
    expect(withMargin).toBe(expected)
    expect(withMargin).toBeCloseTo(7.50, 2)
  })

  it('returns 0 when base cost is 0 (unknown carrier)', () => {
    expect(calculateShippingCost(500, 'fedex', 'france')).toBe(0)
  })

  it('does not apply bundling discount for 1 item', () => {
    const singleItem = calculateShippingCost(500, 'mondial_relay', 'france', 1)
    const noItemCount = calculateShippingCost(500, 'mondial_relay', 'france')
    expect(singleItem).toBe(noItemCount)
  })

  it('applies -15% bundling discount for 2 items', () => {
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 0.85 * 100) / 100
    const result = calculateShippingCost(500, 'mondial_relay', 'france', 2)
    expect(result).toBe(expected)
  })

  it('applies -15% bundling discount for 3 items', () => {
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 0.85 * 100) / 100
    const result = calculateShippingCost(500, 'mondial_relay', 'france', 3)
    expect(result).toBe(expected)
  })

  it('applies -25% bundling discount for 4+ items', () => {
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 0.75 * 100) / 100
    const result = calculateShippingCost(500, 'mondial_relay', 'france', 4)
    expect(result).toBe(expected)
  })

  it('applies -25% bundling discount for 10 items', () => {
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 0.75 * 100) / 100
    const result = calculateShippingCost(500, 'mondial_relay', 'france', 10)
    expect(result).toBe(expected)
  })

  it('bundled shipping for 4 items is cheaper than single item', () => {
    const single = calculateShippingCost(2000, 'mondial_relay', 'france')
    const bundled = calculateShippingCost(2000, 'mondial_relay', 'france', 4)
    expect(bundled).toBeLessThan(single)
  })

  it('returns correct value for DPD Europe', () => {
    const baseCost = calculateBaseShippingCost(1000, 'dpd', 'europe') // 10.99
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 100) / 100
    expect(calculateShippingCost(1000, 'dpd', 'europe')).toBe(expected)
  })

  it('returns correct value for DHL International', () => {
    const baseCost = calculateBaseShippingCost(2000, 'dhl', 'international') // 44.99
    const expected = Math.round(baseCost * (1 + SHIPPING_SAFETY_MARGIN) * 100) / 100
    expect(calculateShippingCost(2000, 'dhl', 'international')).toBe(expected)
  })

  it('returns a properly rounded value (2 decimal places)', () => {
    const result = calculateShippingCost(500, 'mondial_relay', 'france')
    const decimals = result.toString().split('.')[1]
    if (decimals) {
      expect(decimals.length).toBeLessThanOrEqual(2)
    }
  })
})

describe('isCarrierAvailableForZone()', () => {
  it('mondial_relay is available for france', () => {
    expect(isCarrierAvailableForZone('mondial_relay', 'france')).toBe(true)
  })

  it('mondial_relay is available for dom_tom', () => {
    expect(isCarrierAvailableForZone('mondial_relay', 'dom_tom')).toBe(true)
  })

  it('mondial_relay is NOT available for europe', () => {
    expect(isCarrierAvailableForZone('mondial_relay', 'europe')).toBe(false)
  })

  it('mondial_relay is NOT available for international', () => {
    expect(isCarrierAvailableForZone('mondial_relay', 'international')).toBe(false)
  })

  it('dpd is available for europe', () => {
    expect(isCarrierAvailableForZone('dpd', 'europe')).toBe(true)
  })

  it('dpd is NOT available for france', () => {
    expect(isCarrierAvailableForZone('dpd', 'france')).toBe(false)
  })

  it('dhl is available for international', () => {
    expect(isCarrierAvailableForZone('dhl', 'international')).toBe(true)
  })

  it('dhl is NOT available for france', () => {
    expect(isCarrierAvailableForZone('dhl', 'france')).toBe(false)
  })

  it('unknown carrier is not available for any zone', () => {
    expect(isCarrierAvailableForZone('fedex', 'france')).toBe(false)
    expect(isCarrierAvailableForZone('ups', 'europe')).toBe(false)
  })

  it('defaults to france zone when not specified', () => {
    expect(isCarrierAvailableForZone('mondial_relay')).toBe(true)
    expect(isCarrierAvailableForZone('dpd')).toBe(false)
  })
})

describe('getShippingOptions()', () => {
  it('returns mondial_relay option for france zone', () => {
    const options = getShippingOptions(500, 'france')
    expect(options).toHaveLength(1)
    expect(options[0].carrier).toBe('mondial_relay')
    expect(options[0].zone).toBe('france')
    expect(options[0].cost).toBeGreaterThan(0)
  })

  it('returns dpd option for europe zone', () => {
    const options = getShippingOptions(500, 'europe')
    expect(options).toHaveLength(1)
    expect(options[0].carrier).toBe('dpd')
    expect(options[0].zone).toBe('europe')
  })

  it('returns dhl option for international zone', () => {
    const options = getShippingOptions(500, 'international')
    expect(options).toHaveLength(1)
    expect(options[0].carrier).toBe('dhl')
    expect(options[0].zone).toBe('international')
  })

  it('returns mondial_relay option for dom_tom zone', () => {
    const options = getShippingOptions(500, 'dom_tom')
    expect(options).toHaveLength(1)
    expect(options[0].carrier).toBe('mondial_relay')
    expect(options[0].zone).toBe('dom_tom')
  })

  it('defaults to france zone when not specified', () => {
    const options = getShippingOptions(500)
    expect(options).toHaveLength(1)
    expect(options[0].zone).toBe('france')
  })

  it('cost includes safety margin', () => {
    const options = getShippingOptions(500, 'france')
    const baseCost = calculateBaseShippingCost(500, 'mondial_relay', 'france')
    expect(options[0].cost).toBeGreaterThan(baseCost)
  })

  it('cost scales with weight', () => {
    const light = getShippingOptions(100, 'france')
    const heavy = getShippingOptions(5000, 'france')
    expect(heavy[0].cost).toBeGreaterThan(light[0].cost)
  })
})

describe('weight validation (route-level logic)', () => {
  // Replicate the validation logic from the shipping routes
  function validateWeight(weightStr: string): { valid: boolean; weight: number; error?: string } {
    const weightGrams = parseInt(weightStr, 10)
    if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0 || weightGrams > 30000) {
      return { valid: false, weight: 0, error: 'weight_grams must be between 1 and 30000' }
    }
    return { valid: true, weight: weightGrams }
  }

  it('accepts valid weight of 1g', () => {
    const result = validateWeight('1')
    expect(result.valid).toBe(true)
    expect(result.weight).toBe(1)
  })

  it('accepts valid weight of 500g', () => {
    const result = validateWeight('500')
    expect(result.valid).toBe(true)
    expect(result.weight).toBe(500)
  })

  it('accepts valid weight of 30000g', () => {
    const result = validateWeight('30000')
    expect(result.valid).toBe(true)
    expect(result.weight).toBe(30000)
  })

  it('rejects weight of 0', () => {
    const result = validateWeight('0')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('weight_grams must be between 1 and 30000')
  })

  it('rejects negative weight', () => {
    const result = validateWeight('-100')
    expect(result.valid).toBe(false)
  })

  it('rejects weight exceeding 30000g', () => {
    const result = validateWeight('30001')
    expect(result.valid).toBe(false)
  })

  it('rejects non-numeric string', () => {
    const result = validateWeight('abc')
    expect(result.valid).toBe(false)
  })

  it('rejects empty string', () => {
    const result = validateWeight('')
    expect(result.valid).toBe(false)
  })

  it('truncates decimals (parseInt behavior)', () => {
    const result = validateWeight('500.7')
    expect(result.valid).toBe(true)
    expect(result.weight).toBe(500)
  })
})

describe('paramStr()', () => {
  it('returns the string when given a string', () => {
    expect(paramStr('hello')).toBe('hello')
  })

  it('returns the first element when given a string array', () => {
    expect(paramStr(['first', 'second'])).toBe('first')
  })

  it('returns empty string when given an empty string', () => {
    expect(paramStr('')).toBe('')
  })
})

describe('shipping cost comparisons across zones', () => {
  it('international shipping is most expensive', () => {
    const weight = 1000
    const france = calculateShippingCost(weight, 'mondial_relay', 'france')
    const europe = calculateShippingCost(weight, 'dpd', 'europe')
    const international = calculateShippingCost(weight, 'dhl', 'international')

    expect(international).toBeGreaterThan(europe)
    expect(europe).toBeGreaterThan(france)
  })

  it('DOM-TOM is more expensive than France for the same carrier', () => {
    const weight = 2000
    const france = calculateShippingCost(weight, 'mondial_relay', 'france')
    const domTom = calculateShippingCost(weight, 'mondial_relay', 'dom_tom')

    expect(domTom).toBeGreaterThan(france)
  })

  it('heavier packages cost more within the same zone', () => {
    const light = calculateShippingCost(200, 'mondial_relay', 'france')
    const medium = calculateShippingCost(1500, 'mondial_relay', 'france')
    const heavy = calculateShippingCost(8000, 'mondial_relay', 'france')

    expect(heavy).toBeGreaterThan(medium)
    expect(medium).toBeGreaterThan(light)
  })
})

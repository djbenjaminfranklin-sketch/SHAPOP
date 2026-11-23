import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildCitySuggestions, sameCity, normalizeCityName, cityLabel, rememberCityLabel,
  fetchNearbyCities, type CityOption,
} from '../cities'
import { groupStreamsByCity } from '../../hooks/useCityStreamCounts'
import { computeMatchingScore } from '../matchingAlgorithm'

const city = (key: string, distanceKm?: number, label = key): CityOption => ({ key, label, distanceKm })

describe('normalizeCityName / sameCity', () => {
  it('ignore accents, majuscules et tirets', () => {
    expect(normalizeCityName('Tel-Aviv')).toBe('tel aviv')
    expect(sameCity('Tel-Aviv', 'tel aviv')).toBe(true)
    expect(sameCity('Bnei Brak', 'Bnei-Brak')).toBe(true)
    expect(sameCity('Évry', 'Evry')).toBe(true)
  })
  it('un nom court correspond au nom long (« Tel Aviv » = « Tel Aviv-Yafo »)', () => {
    expect(sameCity('Tel Aviv', 'Tel Aviv-Yafo')).toBe(true)
  })
  it('deux villes différentes ne se confondent pas', () => {
    expect(sameCity('Ramat Gan', 'Ramat HaSharon')).toBe(false)
    expect(sameCity('Paris', 'Parisot')).toBe(false)
    expect(sameCity('', 'Paris')).toBe(false)
  })
})

describe('buildCitySuggestions (villes proposées)', () => {
  it('sans position ni choix : aucune ville par défaut (pas de liste française)', () => {
    expect(buildCitySuggestions({})).toEqual([])
    expect(buildCitySuggestions({ detected: null, nearby: [] })).toEqual([])
  })

  it('ville de l’utilisateur en premier, puis les villes proches de la plus près à la plus loin', () => {
    const out = buildCitySuggestions({
      detected: city('Tel Aviv', 0),
      nearby: [city('Holon', 7), city('Ramat Gan', 4), city('Tel-Aviv', 0.5), city('Herzliya', 12)],
    })
    expect(out.map(c => c.key)).toEqual(['Tel Aviv', 'Ramat Gan', 'Holon', 'Herzliya'])
  })

  it('garde visibles les villes déjà enregistrées (ex. « Neuilly-sur-Seine »)', () => {
    const out = buildCitySuggestions({
      detected: city('Tel Aviv', 0),
      selected: [city('Neuilly-sur-Seine')],
      nearby: [city('Ramat Gan', 4)],
    })
    expect(out.map(c => c.key)).toEqual(['Tel Aviv', 'Neuilly-sur-Seine', 'Ramat Gan'])
  })

  it('respecte le maximum demandé', () => {
    const nearby = Array.from({ length: 30 }, (_, i) => city(`Town ${i}`, i))
    expect(buildCitySuggestions({ nearby, max: 5 })).toHaveLength(5)
  })
})

describe('libellés traduits', () => {
  beforeEach(() => localStorage.clear())
  it('affiche le nom traduit mémorisé, sinon la valeur enregistrée', () => {
    expect(cityLabel('Neuilly-sur-Seine', 'he')).toBe('Neuilly-sur-Seine')
    rememberCityLabel('Tel Aviv', 'he', 'תל אביב-יפו')
    expect(cityLabel('Tel Aviv', 'he')).toBe('תל אביב-יפו')
    expect(cityLabel('Tel Aviv', 'ru')).toBe('Tel Aviv')
  })
})

describe('fetchNearbyCities', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('clé anglaise, nom dans la langue de l’app, triées par distance, une seule requête Nominatim, puis cache', async () => {
    const photon = {
      features: [
        { geometry: { coordinates: [34.8246, 32.0686] }, properties: { osm_type: 'R', osm_id: 2, name: 'Ramat Gan', countrycode: 'IL', country: 'Israel' } },
        { geometry: { coordinates: [34.7818, 32.0853] }, properties: { osm_type: 'R', osm_id: 1, name: 'Tel Aviv', countrycode: 'IL', country: 'Israel' } },
        // Trop loin (> 40 km) : écartée
        { geometry: { coordinates: [35.2137, 31.7683] }, properties: { osm_type: 'R', osm_id: 3, name: 'Jerusalem', countrycode: 'IL' } },
      ],
    }
    const lookup = [
      { osm_type: 'relation', osm_id: 1, name: 'תל אביב-יפו', address: { city: 'תל אביב-יפו', country: 'ישראל', country_code: 'il' }, namedetails: { 'name:en': 'Tel-Aviv' } },
      { osm_type: 'relation', osm_id: 2, name: 'רמת גן', address: { city: 'רמת גן', country: 'ישראל', country_code: 'il' }, namedetails: { 'name:en': 'Ramat Gan' } },
    ]
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('photon') ? photon : lookup),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const origin = { lat: 32.08, lon: 34.78 }
    const out = await fetchNearbyCities(origin, 'he')
    expect(out.map(c => c.key)).toEqual(['Ramat Gan', 'Tel Aviv'])
    const sorted = buildCitySuggestions({ nearby: out })
    expect(sorted.map(c => c.label)).toEqual(['תל אביב-יפו', 'רמת גן'])
    const urls = fetchMock.mock.calls.map(c => String(c[0]))
    expect(urls.filter(u => u.includes('nominatim'))).toHaveLength(1)
    expect(urls.find(u => u.includes('nominatim'))).toContain('accept-language=he')
    expect(cityLabel('Tel Aviv', 'he')).toBe('תל אביב-יפו')

    // Deuxième appel : servi par le cache, aucune requête
    await fetchNearbyCities(origin, 'he')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('compatibilité avec les villes déjà enregistrées', () => {
  it('les lives sont rangés par ville quel que soit l’orthographe, les autres vont dans « ailleurs »', () => {
    const s = (id: string, cityName: string | null) => ({ id, city: cityName }) as unknown as Parameters<typeof groupStreamsByCity>[0][number]
    const { cityData, others } = groupStreamsByCity(
      [s('1', 'Tel Aviv-Yafo'), s('2', 'tel-aviv'), s('3', 'Neuilly-sur-Seine'), s('4', 'Paris'), s('5', null)],
      ['Tel Aviv', 'Neuilly-sur-Seine'],
    )
    expect(cityData['Tel Aviv'].count).toBe(2)
    expect(cityData['Neuilly-sur-Seine'].count).toBe(1)
    expect(Object.keys(others)).toEqual(['Paris'])
  })

  it('une préférence « Neuilly-sur-Seine » donne toujours le bonus de ville', () => {
    const prefs = { favorite_categories: [], preferred_cities: ['Neuilly-sur-Seine'], price_range_min: 0, price_range_max: 10000, favorite_sellers: [] }
    const stream = { id: 'x', category: 'art', city: 'Neuilly-sur-Seine', viewer_count: 0, engagement_score: 0 } as unknown as Parameters<typeof computeMatchingScore>[0]
    const other = { ...stream, city: 'Lyon' } as typeof stream
    expect(computeMatchingScore(stream, prefs) - computeMatchingScore(other, prefs)).toBe(15)
  })
  it('une préférence « Tel Aviv » vaut pour un live à « Tel-Aviv-Yafo »', () => {
    const prefs = { favorite_categories: [], preferred_cities: ['Tel Aviv'], price_range_min: 0, price_range_max: 10000, favorite_sellers: [] }
    const stream = { id: 'x', category: 'art', city: 'Tel-Aviv-Yafo', viewer_count: 0, engagement_score: 0 } as unknown as Parameters<typeof computeMatchingScore>[0]
    const other = { ...stream, city: 'Haifa' } as typeof stream
    expect(computeMatchingScore(stream, prefs) - computeMatchingScore(other, prefs)).toBe(15)
  })
})

// =====================================================================
// Villes : position de l'utilisateur, villes proches, recherche libre.
// Aucune liste de villes ni de pays écrite en dur : tout vient de la
// position (OpenStreetMap) ou de ce que l'utilisateur tape.
//
// - Une ville a une CLÉ (son nom en anglais, comme avant) : c'est elle qui est
//   enregistrée (préférences, profil, ville des lives) pour que tout le monde
//   compare la même chose quelle que soit sa langue.
// - Elle a un LIBELLÉ dans la langue de l'app, seulement pour l'affichage.
//
// Services utilisés (gratuits, sans clé) :
// - Photon (photon.komoot.io) : recherche au fil de la frappe + villes proches.
// - Nominatim (nominatim.openstreetmap.org) : ville de la position et noms
//   traduits. Politique d'usage respectée : au plus 1 requête par seconde
//   (file d'attente), jamais pendant la frappe, et tout est mis en cache.
// =====================================================================
import { getLang, type Lang, type Localized } from './i18n'

export interface CityOption {
  /** Nom canonique (anglais) : valeur enregistrée et comparée. */
  key: string
  /** Nom affiché dans la langue de l'app. */
  label: string
  /** Code pays ISO 3166-1 alpha-2 en majuscules. */
  country?: string
  /** Sous-titre : région, pays. */
  region?: string
  lat?: number
  lon?: number
  /** Identifiant OpenStreetMap, ex. « R1382494 ». */
  osmId?: string
  /** Distance au point de départ, en km. */
  distanceKm?: number
}

export interface Coords { lat: number; lon: number }

const APP_HEADERS = { 'User-Agent': 'ShaPop-app' } // i18n-ignore (identifiant technique générique)
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const PHOTON = 'https://photon.komoot.io'
const NEARBY_RADIUS_KM = 40
const DAY = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------
// Comparaison de noms (sans accents, tirets, majuscules)
// ---------------------------------------------------------------------

/** « Tel-Aviv », « tel aviv » et « Tél Aviv » donnent la même chose. */
export function normalizeCityName(name: string | null | undefined): string {
  return (name || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s\-‐‑–—־'’.,()]+/g, ' ')
    .trim()
}

/**
 * Même ville ? Égalité après normalisation, ou l'un est le début de l'autre
 * sur une limite de mot (« Tel Aviv » = « Tel Aviv-Yafo »).
 */
export function sameCity(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCityName(a)
  const nb = normalizeCityName(b)
  if (!na || !nb) return false
  return na === nb || na.startsWith(nb + ' ') || nb.startsWith(na + ' ')
}

/** Distance à vol d'oiseau en km. */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// ---------------------------------------------------------------------
// Choix des villes proposées (fonction pure, testée)
// ---------------------------------------------------------------------

/**
 * Ordre : la ville de l'utilisateur, puis les villes déjà choisies (pour
 * qu'elles restent visibles, y compris les anciennes valeurs enregistrées),
 * puis les villes proches de la plus près à la plus loin. Sans doublon.
 */
export function buildCitySuggestions(input: {
  detected?: CityOption | null
  selected?: CityOption[]
  nearby?: CityOption[]
  max?: number
}): CityOption[] {
  const max = input.max ?? 12
  const out: CityOption[] = []
  const add = (c: CityOption | null | undefined) => {
    if (!c || !c.key) return
    if (out.some(o => sameCity(o.key, c.key))) return
    out.push(c)
  }
  add(input.detected)
  for (const c of input.selected || []) add(c)
  const nearby = [...(input.nearby || [])].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  for (const c of nearby) {
    if (out.length >= max) break
    add(c)
  }
  return out
}

// ---------------------------------------------------------------------
// Noms traduits mémorisés (clé → libellé par langue)
// ---------------------------------------------------------------------

const LABELS_KEY = 'shapop_city_labels'
type LabelStore = Record<string, Partial<Record<Lang, string>>>

function readLabels(): LabelStore {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || '{}') as LabelStore } catch { return {} }
}

export function rememberCityLabel(key: string, lang: Lang, label: string) {
  if (!key || !label) return
  try {
    const store = readLabels()
    store[key] = { ...(store[key] || {}), [lang]: label }
    const keys = Object.keys(store)
    if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete store[k]
    localStorage.setItem(LABELS_KEY, JSON.stringify(store))
  } catch { /* stockage plein ou indisponible */ }
}

/** Libellé d'une ville enregistrée ; à défaut, la valeur enregistrée elle-même. */
export function cityLabel(key: string | null | undefined, lang: Lang = getLang()): string {
  if (!key) return ''
  const entry = readLabels()[key]
  return entry?.[lang] || key
}

/** Une valeur enregistrée (simple texte) devient une option affichable. */
export function optionFromKey(key: string, lang: Lang = getLang()): CityOption {
  return { key, label: cityLabel(key, lang) }
}

// ---------------------------------------------------------------------
// Cache local avec durée de vie
// ---------------------------------------------------------------------

function cacheRead<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { at, value } = JSON.parse(raw) as { at: number; value: T }
    return Date.now() - at < maxAgeMs ? value : null
  } catch { return null }
}

function cacheWrite<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------
// Position de l'appareil (une seule demande à la fois, réutilisée 10 min)
// ---------------------------------------------------------------------

export type PositionResult = { coords: Coords } | { error: 'denied' | 'unavailable' }

const COORDS_KEY = 'shapop_user_coords'
let positionPromise: Promise<PositionResult> | null = null
let positionAt = 0

export function getStoredCoords(): Coords | null {
  return cacheRead<Coords>(COORDS_KEY, 30 * DAY)
}

export function getDevicePosition(): Promise<PositionResult> {
  if (positionPromise && Date.now() - positionAt < 10 * 60 * 1000) return positionPromise
  positionAt = Date.now()
  positionPromise = new Promise<PositionResult>((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ error: 'unavailable' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        cacheWrite(COORDS_KEY, coords)
        resolve({ coords })
      },
      (err) => resolve({ error: err.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
  // Un refus ou un échec n'est pas gardé : on pourra réessayer
  positionPromise.then(r => { if ('error' in r) positionPromise = null })
  return positionPromise
}

// ---------------------------------------------------------------------
// Nominatim : au plus une requête par seconde
// ---------------------------------------------------------------------

let nominatimChain: Promise<unknown> = Promise.resolve()
let nominatimLast = 0

function nominatimFetch<T>(path: string): Promise<T | null> {
  const run = async (): Promise<T | null> => {
    const wait = nominatimLast + 1100 - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    nominatimLast = Date.now()
    try {
      const res = await fetch(`${NOMINATIM}${path}`, { headers: APP_HEADERS })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch { return null }
  }
  const p = nominatimChain.then(run, run)
  nominatimChain = p.catch(() => null)
  return p
}

type NominatimPlace = {
  osm_type?: string
  osm_id?: number
  lat?: string
  lon?: string
  name?: string
  address?: Record<string, string>
  namedetails?: Record<string, string>
}

function osmRef(p: NominatimPlace): string | undefined {
  if (!p.osm_type || !p.osm_id) return undefined
  return `${p.osm_type[0].toUpperCase()}${p.osm_id}`
}

function placeToOption(p: NominatimPlace): CityOption | null {
  const addr = p.address || {}
  const nd = p.namedetails || {}
  const local = addr.city || addr.town || addr.village || addr.municipality || p.name
  if (!local) return null
  const key = nd['name:en'] || nd['_place_name:en'] || nd.name || local
  const label = p.name || local
  const country = addr.country_code ? addr.country_code.toUpperCase() : undefined
  return {
    key,
    label,
    country,
    region: [addr.state, addr.country].filter(Boolean).join(', ') || undefined,
    lat: p.lat ? Number(p.lat) : undefined,
    lon: p.lon ? Number(p.lon) : undefined,
    osmId: osmRef(p),
  }
}

/** Ville de la position (nom canonique + nom traduit), mise en cache 30 jours. */
export async function reverseGeocodeCity(coords: Coords, lang: Lang = getLang()): Promise<CityOption | null> {
  const cacheKey = `shapop_geo_city:${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}:${lang}`
  const cached = cacheRead<CityOption>(cacheKey, 30 * DAY)
  if (cached) return cached
  const data = await nominatimFetch<NominatimPlace>(
    `/reverse?lat=${coords.lat}&lon=${coords.lon}&format=jsonv2&zoom=10&namedetails=1&addressdetails=1&accept-language=${lang}`,
  )
  const option = data ? placeToOption(data) : null
  if (option) {
    option.distanceKm = 0
    rememberCityLabel(option.key, lang, option.label)
    cacheWrite(cacheKey, option)
  }
  return option
}

/** Noms traduits de plusieurs lieux en une seule requête (50 au plus). */
async function lookupNames(osmIds: string[], lang: Lang): Promise<Map<string, CityOption>> {
  const out = new Map<string, CityOption>()
  const ids = osmIds.filter(Boolean).slice(0, 50)
  if (ids.length === 0) return out
  const data = await nominatimFetch<NominatimPlace[]>(
    `/lookup?osm_ids=${ids.join(',')}&format=jsonv2&namedetails=1&addressdetails=1&accept-language=${lang}`,
  )
  for (const p of data || []) {
    const ref = osmRef(p)
    const o = placeToOption(p)
    if (ref && o) out.set(ref, o)
  }
  return out
}

// ---------------------------------------------------------------------
// Photon : villes proches et recherche au fil de la frappe
// ---------------------------------------------------------------------

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_type?: string; osm_id?: number; name?: string
    state?: string; country?: string; countrycode?: string
  }
}

/** Photon ne traduit qu'en anglais, français, allemand ; sinon nom local. */
const PHOTON_LANG: Localized<string> = { en: 'en', fr: 'fr', es: 'default', ru: 'default', he: 'default' }
/** Les villes proches arrivent en anglais : les autres langues demandent leurs noms à Nominatim. */
const NEEDS_TRANSLATED_NAMES: Localized<boolean> = { en: false, fr: true, es: true, ru: true, he: true }
function photonLang(lang: Lang): string {
  return PHOTON_LANG[lang]
}

function featureToOption(f: PhotonFeature, origin?: Coords | null): CityOption | null {
  const p = f.properties || {}
  const [lon, lat] = f.geometry?.coordinates || []
  if (!p.name) return null
  const option: CityOption = {
    key: p.name,
    label: p.name,
    country: p.countrycode ? p.countrycode.toUpperCase() : undefined,
    region: [p.state, p.country].filter(Boolean).join(', ') || undefined,
    lat, lon,
    osmId: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : undefined,
  }
  if (origin && typeof lat === 'number' && typeof lon === 'number') option.distanceKm = distanceKm(origin, { lat, lon })
  return option
}

const PLACE_TAGS = 'osm_tag=place:city&osm_tag=place:town'

/**
 * Villes et bourgs autour d'un point (rayon ~40 km), noms traduits dans la
 * langue de l'app. 2 requêtes au plus, cache 7 jours par zone d'environ 1 km.
 */
export async function fetchNearbyCities(origin: Coords, lang: Lang = getLang()): Promise<CityOption[]> {
  const cacheKey = `shapop_nearby_cities:${origin.lat.toFixed(2)},${origin.lon.toFixed(2)}:${lang}`
  const cached = cacheRead<CityOption[]>(cacheKey, 7 * DAY)
  if (cached) return cached
  let features: PhotonFeature[] = []
  try {
    const res = await fetch(
      `${PHOTON}/reverse?lat=${origin.lat}&lon=${origin.lon}&radius=${NEARBY_RADIUS_KM}&limit=20&${PLACE_TAGS}&lang=en`,
    )
    if (res.ok) features = ((await res.json()) as { features?: PhotonFeature[] }).features || []
  } catch { return [] }
  // Clé = nom anglais (Photon lang=en)
  const options = features
    .map(f => featureToOption(f, origin))
    .filter((o): o is CityOption => !!o && (o.distanceKm ?? 0) <= NEARBY_RADIUS_KM)
  // Libellés traduits (sauf anglais) en une requête Nominatim
  if (NEEDS_TRANSLATED_NAMES[lang] && options.length > 0) {
    const names = await lookupNames(options.map(o => o.osmId || ''), lang)
    for (const o of options) {
      const tr = o.osmId ? names.get(o.osmId) : undefined
      if (tr) { o.label = tr.label; o.region = tr.region || o.region }
    }
  }
  for (const o of options) rememberCityLabel(o.key, lang, o.label)
  cacheWrite(cacheKey, options)
  return options
}

const searchCache = new Map<string, CityOption[]>()

/** Recherche libre (tous pays). Prévue pour la frappe : Photon, jamais Nominatim. */
export async function searchCities(query: string, opts: { lang?: Lang; near?: Coords | null; signal?: AbortSignal } = {}): Promise<CityOption[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const lang = opts.lang || getLang()
  const near = opts.near || null
  const cacheKey = `${lang}|${near ? `${near.lat.toFixed(1)},${near.lon.toFixed(1)}` : ''}|${normalizeCityName(q)}`
  const hit = searchCache.get(cacheKey)
  if (hit) return hit
  const bias = near ? `&lat=${near.lat}&lon=${near.lon}` : ''
  const res = await fetch(
    `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=8&${PLACE_TAGS}&osm_tag=place:village&lang=${photonLang(lang)}${bias}`,
    { signal: opts.signal },
  )
  if (!res.ok) return []
  const features = ((await res.json()) as { features?: PhotonFeature[] }).features || []
  const out: CityOption[] = []
  for (const f of features) {
    const o = featureToOption(f, near)
    if (o && !out.some(x => sameCity(x.key, o.key) && x.country === o.country)) out.push(o)
  }
  searchCache.set(cacheKey, out)
  if (searchCache.size > 100) searchCache.delete(searchCache.keys().next().value as string)
  return out
}

/**
 * Ville choisie dans la recherche : on récupère son nom canonique (anglais)
 * et son nom dans la langue de l'app (1 requête Nominatim, mise en cache).
 * En cas d'échec, l'option telle quelle est gardée.
 */
export async function resolveCity(option: CityOption, lang: Lang = getLang()): Promise<CityOption> {
  if (!option.osmId) return option
  const cacheKey = `shapop_city_resolved:${option.osmId}:${lang}`
  const cached = cacheRead<CityOption>(cacheKey, 30 * DAY)
  if (cached) return cached
  const found = (await lookupNames([option.osmId], lang)).get(option.osmId)
  const resolved: CityOption = found
    ? { ...option, key: found.key, label: found.label || option.label, region: found.region || option.region }
    : option
  rememberCityLabel(resolved.key, lang, resolved.label)
  if (found) {
    cacheWrite(cacheKey, resolved)
  }
  return resolved
}

import { useEffect, useRef, useState } from 'react'
import { tr, useLang, type Localized } from '../lib/i18n'
import { resolveCity, searchCities, type CityOption, type Coords } from '../lib/cities'

const texts: Localized<{ placeholder: string; label: string; searching: string; none: string; error: string }> = {
  en: { placeholder: 'Your city…', label: 'Your city', searching: 'Searching…', none: 'No city found', error: 'Search unavailable, try again' },
  fr: { placeholder: 'Ta ville…', label: 'Ta ville', searching: 'Recherche…', none: 'Aucune ville trouvée', error: 'Recherche indisponible, réessaie' },
  es: { placeholder: 'Tu ciudad…', label: 'Tu ciudad', searching: 'Buscando…', none: 'No se encontró ninguna ciudad', error: 'Búsqueda no disponible, inténtalo de nuevo' },
  ru: { placeholder: 'Твой город…', label: 'Твой город', searching: 'Ищем…', none: 'Город не найден', error: 'Поиск недоступен, попробуй ещё раз' },
  he: { placeholder: 'העיר שלך…', label: 'העיר שלך', searching: 'מחפש…', none: 'לא נמצאה עיר', error: 'החיפוש לא זמין, נסו שוב' },
}

interface Props {
  /** Ville choisie (déjà convertie en nom canonique + nom traduit). */
  onPick: (city: CityOption) => void
  /** Position connue : les résultats proches remontent en premier. */
  near?: Coords | null
  autoFocus?: boolean
  /** Fond du champ (s'adapte à l'écran qui l'accueille). */
  background?: string
}

/** Champ « Ta ville » : recherche dans tous les pays, au fil de la frappe. */
export default function CitySearchField({ onPick, near, autoFocus, background = '#1A1A1A' }: Props) {
  const lang = useLang()
  const ct = tr(texts, lang)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityOption[]>([])
  const [state, setState] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [picking, setPicking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
    abortRef.current?.abort()
    if (q.length < 2) { setResults([]); setState('idle'); return }
    setState('searching')
    const controller = new AbortController()
    abortRef.current = controller
    // Attente après la dernière touche : pas de rafale de requêtes
    const timer = setTimeout(() => {
      searchCities(q, { lang, near, signal: controller.signal })
        .then(r => { if (!controller.signal.aborted) { setResults(r); setState('done') } })
        .catch(() => { if (!controller.signal.aborted) setState('error') })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, lang, near?.lat, near?.lon])

  const pick = async (option: CityOption) => {
    if (picking) return
    setPicking(true)
    try {
      const resolved = await resolveCity(option, lang)
      onPick(resolved)
      setQuery('')
      setResults([])
      setState('idle')
    } finally {
      setPicking(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: background, border: '1px solid #333', borderRadius: '12px',
        padding: '0 12px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          dir="auto"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={ct.placeholder}
          aria-label={ct.label}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', padding: '11px 0', textAlign: 'start',
          }}
        />
      </div>

      {state === 'searching' && (
        <p style={{ color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))', margin: '8px 4px 0' }}>{ct.searching}</p>
      )}
      {state === 'error' && (
        <p style={{ color: '#f97316', fontSize: 'calc(13px * var(--fs, 1))', margin: '8px 4px 0' }}>{ct.error}</p>
      )}
      {state === 'done' && results.length === 0 && (
        <p style={{ color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))', margin: '8px 4px 0' }}>{ct.none}</p>
      )}
      {results.length > 0 && (
        <div role="listbox" aria-label={ct.label} style={{ marginTop: '6px', display: 'flex', flexDirection: 'column' }}>
          {results.map(r => (
            <button
              key={`${r.osmId || r.key}-${r.country || ''}`}
              role="option"
              aria-selected={false}
              disabled={picking}
              onClick={() => pick(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                textAlign: 'start', padding: '10px 6px', background: 'transparent',
                border: 'none', borderBottom: '1px solid #222', cursor: 'pointer',
                opacity: picking ? 0.5 : 1, touchAction: 'manipulation',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span dir="auto" style={{ color: '#eee', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600 }}>{r.label}</span>
                {r.region && (
                  <span dir="auto" style={{ color: '#f0f0f0', fontSize: 'calc(12px * var(--fs, 1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.region}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

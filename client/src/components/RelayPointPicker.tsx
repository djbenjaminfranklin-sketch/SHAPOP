import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'

interface RelayPoint {
  id: string
  name: string
  address: string
  city: string
  zip: string
  country: string
  latitude: string
  longitude: string
  distance: string
  openingHours: Record<string, string>
  photoUrl: string | null
}

interface Props {
  zip: string
  country?: string
  onSelect: (point: RelayPoint) => void
  onClose: () => void
  selectedId?: string | null
}

const content: Record<string, Record<string, string>> = {
  fr: {
    title: 'Choisir un Point Relais',
    search: 'Rechercher',
    zipPlaceholder: 'Code postal',
    loading: 'Recherche des points relais...',
    noResults: 'Aucun point relais trouve',
    error: 'Erreur de recherche',
    select: 'Choisir',
    selected: 'Selectionne',
    close: 'Fermer',
    distance: 'm',
    hours: 'Horaires',
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mer',
    thursday: 'Jeu',
    friday: 'Ven',
    saturday: 'Sam',
    sunday: 'Dim',
  },
  en: {
    title: 'Choose a Relay Point',
    search: 'Search',
    zipPlaceholder: 'Postal code',
    loading: 'Searching relay points...',
    noResults: 'No relay points found',
    error: 'Search error',
    select: 'Select',
    selected: 'Selected',
    close: 'Close',
    distance: 'm',
    hours: 'Hours',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  },
  he: {
    title: '\u05D1\u05D7\u05E8 \u05E0\u05E7\u05D5\u05D3\u05EA \u05D0\u05D9\u05E1\u05D5\u05E3',
    search: '\u05D7\u05E4\u05E9',
    zipPlaceholder: '\u05DE\u05D9\u05E7\u05D5\u05D3',
    loading: '\u05DE\u05D7\u05E4\u05E9 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA...',
    noResults: '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA',
    error: '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D7\u05D9\u05E4\u05D5\u05E9',
    select: '\u05D1\u05D7\u05E8',
    selected: '\u05E0\u05D1\u05D7\u05E8',
    close: '\u05E1\u05D2\u05D5\u05E8',
    distance: '\u05DE',
    hours: '\u05E9\u05E2\u05D5\u05EA',
    monday: '\u05D1',
    tuesday: '\u05D2',
    wednesday: '\u05D3',
    thursday: '\u05D4',
    friday: '\u05D5',
    saturday: '\u05E9',
    sunday: '\u05D0',
  },
  es: {
    title: 'Elegir un Punto de Recogida',
    search: 'Buscar',
    zipPlaceholder: 'Codigo postal',
    loading: 'Buscando puntos de recogida...',
    noResults: 'No se encontraron puntos',
    error: 'Error de busqueda',
    select: 'Elegir',
    selected: 'Seleccionado',
    close: 'Cerrar',
    distance: 'm',
    hours: 'Horarios',
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mie',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sab',
    sunday: 'Dom',
  },
}

export default function RelayPointPicker({ zip, country = 'FR', onSelect, onClose, selectedId }: Props) {
  const lang = getLang()
  const t = content[lang] || content.fr

  const [searchZip, setSearchZip] = useState(zip)
  const [points, setPoints] = useState<RelayPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const doSearch = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 4) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/shipping/relay-points?zip=${encodeURIComponent(zipCode)}&country=${country}&nb=10`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Search failed')
      }
      const data = await res.json()
      setPoints(data.points || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error)
      setPoints([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (zip) doSearch(zip)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          maxHeight: '85vh',
          backgroundColor: '#111', borderRadius: '20px 20px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {t.title}
            </h3>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#222', border: 'none', color: '#888',
                fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              X
            </button>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchZip}
              onChange={e => setSearchZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
              placeholder={t.zipPlaceholder}
              onKeyDown={e => { if (e.key === 'Enter') doSearch(searchZip) }}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px',
                border: '1px solid #333', backgroundColor: '#0A0A0A',
                color: '#fff', fontSize: '14px', fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => doSearch(searchZip)}
              disabled={loading || searchZip.length < 4}
              style={{
                padding: '10px 16px', borderRadius: '10px', border: 'none',
                background: searchZip.length >= 4 ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333',
                color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {t.search}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '24px', height: '24px', border: '3px solid #333',
                borderTopColor: '#F0908A', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: '#888', fontSize: '13px' }}>{t.loading}</p>
            </div>
          )}

          {!loading && error && (
            <p style={{ textAlign: 'center', color: '#E8344E', padding: '40px 0', fontSize: '14px' }}>{error}</p>
          )}

          {!loading && !error && points.length === 0 && searchZip.length >= 4 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontSize: '14px' }}>{t.noResults}</p>
          )}

          {!loading && points.map(point => {
            const isSelected = selectedId === point.id
            const isExpanded = expandedId === point.id
            return (
              <div
                key={point.id}
                style={{
                  backgroundColor: isSelected ? '#1A1A2A' : '#1A1A1A',
                  borderRadius: '14px', padding: '14px',
                  marginBottom: '8px',
                  border: isSelected ? '2px solid #F0908A' : '1px solid #222',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* MR icon */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: '#E8344E', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                      {point.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>
                      {point.address}
                    </p>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                      {point.zip} {point.city}
                    </p>
                    {point.distance && (
                      <span style={{
                        display: 'inline-block', marginTop: '4px',
                        fontSize: '11px', color: '#F0908A', fontWeight: 600,
                      }}>
                        {point.distance}{t.distance}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onSelect(point)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', border: 'none',
                      background: isSelected ? '#F0908A' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                      color: '#fff', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0, alignSelf: 'center',
                    }}
                  >
                    {isSelected ? t.selected : t.select}
                  </button>
                </div>

                {/* Expand hours toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : point.id)}
                  style={{
                    background: 'none', border: 'none', color: '#666',
                    fontSize: '11px', cursor: 'pointer', marginTop: '8px',
                    padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <path d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t.hours}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '50px 1fr', gap: '2px 8px' }}>
                    {dayKeys.map((day, i) => (
                      <div key={day} style={{ display: 'contents' }}>
                        <span style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>{dayLabels[i]}</span>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>
                          {point.openingHours[day] || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

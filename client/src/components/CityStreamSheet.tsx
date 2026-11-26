import { useEffect, useRef } from 'react'
import StreamCard from './stream/StreamCard'
import type { CityStreamData } from '../hooks/useCityStreamCounts'
import { getLang, getLocale, tr, type Lang, type Localized } from '../lib/i18n'

// Pluriels : une, quelques, plusieurs (le russe a 3 formes ; ailleurs few/many = other)
type PluralForms = { one: string; few: string; many: string; other: string }
const liveCountText: Localized<PluralForms> = {
  en: { one: '{n} live stream now', few: '{n} live streams now', many: '{n} live streams now', other: '{n} live streams now' },
  fr: { one: '{n} live en cours', few: '{n} lives en cours', many: '{n} lives en cours', other: '{n} lives en cours' },
  es: { one: '{n} directo ahora', few: '{n} directos ahora', many: '{n} directos ahora', other: '{n} directos ahora' },
  ru: { one: '{n} эфир сейчас', few: '{n} эфира сейчас', many: '{n} эфиров сейчас', other: '{n} эфира сейчас' },
  he: { one: 'שידור חי אחד עכשיו', few: '{n} שידורים חיים עכשיו', many: '{n} שידורים חיים עכשיו', other: '{n} שידורים חיים עכשיו' },
}

const closeText: Localized<string> = { en: 'Close', fr: 'Fermer', es: 'Cerrar', ru: 'Закрыть', he: 'סגירה' }

function liveCount(n: number, lang: Lang): string {
  const forms = tr(liveCountText, lang)
  const rule = new Intl.PluralRules(getLocale(lang)).select(n)
  const form = rule === 'one' || rule === 'few' || rule === 'many' ? forms[rule] : forms.other
  return form.replace('{n}', n.toLocaleString(getLocale(lang)))
}

interface CityStreamSheetProps {
  city: string
  data: CityStreamData
  onClose: () => void
}

export default function CityStreamSheet({ city, data, onClose }: CityStreamSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const lang = getLang()

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 61,
          backgroundColor: '#111',
          borderStartStartRadius: '20px',
          borderStartEndRadius: '20px',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetSlideUp 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <style>{`
          @keyframes sheetSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#444' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 16px',
        }}>
          <div>
            <h2 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
              {city}
            </h2>
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
              {liveCount(data.count, lang)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={tr(closeText, lang)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#222', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Stream grid */}
        <div style={{
          overflowY: 'auto',
          padding: '0 16px 20px',
          flex: 1,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px 12px',
          }}>
            {data.streams.map(stream => (
              <StreamCard key={stream.id} stream={stream as unknown as Parameters<typeof StreamCard>[0]['stream']} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

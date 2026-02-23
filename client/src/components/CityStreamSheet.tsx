import { useEffect, useRef } from 'react'
import StreamCard from './stream/StreamCard'
import type { CityStreamData } from '../hooks/useCityStreamCounts'

interface CityStreamSheetProps {
  city: string
  data: CityStreamData
  onClose: () => void
}

export default function CityStreamSheet({ city, data, onClose }: CityStreamSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

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
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {city}
            </h2>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
              {data.count} stream{data.count > 1 ? 's' : ''} en direct
            </p>
          </div>
          <button
            onClick={onClose}
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

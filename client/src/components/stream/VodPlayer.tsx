import { useEffect, useRef, useCallback } from 'react'
import { tr, type Localized } from '../../lib/i18n'

const content: Localized<{ close: string; replay: string; loading: string; error: string }> = {
  en: {
    close: 'Close',
    replay: 'Live replay',
    loading: 'Loading…',
    error: "Can't play this video",
  },
  fr: {
    close: 'Fermer',
    replay: 'Rediffusion du live',
    loading: 'Chargement…',
    error: 'Impossible de lire la vidéo',
  },
  es: {
    close: 'Cerrar',
    replay: 'Repetición del directo',
    loading: 'Cargando…',
    error: 'No se puede reproducir el vídeo',
  },
  ru: {
    close: 'Закрыть',
    replay: 'Запись эфира',
    loading: 'Загрузка…',
    error: 'Не удалось воспроизвести видео',
  },
  he: {
    close: 'סגירה',
    replay: 'הקלטת השידור החי',
    loading: 'טוען…',
    error: 'לא ניתן להפעיל את הסרטון',
  },
}

interface VodPlayerProps {
  recordingUrl: string
  title: string
  startOffset?: number
  onClose: () => void
}

export default function VodPlayer({ recordingUrl, title, startOffset, onClose }: VodPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const t = tr(content)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !startOffset) return
    const handleLoaded = () => {
      video.currentTime = startOffset
    }
    video.addEventListener('loadedmetadata', handleLoaded)
    return () => video.removeEventListener('loadedmetadata', handleLoaded)
  }, [startOffset])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      }}>
        <h3 style={{
          fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          aria-label={t.close}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, marginInlineStart: '12px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Video */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
        <video
          ref={videoRef}
          src={recordingUrl}
          controls
          autoPlay
          playsInline
          style={{
            width: '100%', maxHeight: '80vh',
            borderRadius: '12px', backgroundColor: '#000',
          }}
        >
          <p style={{ color: '#888' }}>{t.error}</p>
        </video>
      </div>

      {/* Footer label */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666' }}>{t.replay}</span>
      </div>
    </div>
  )
}

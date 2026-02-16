import { useRef, useState, useEffect, useCallback } from 'react'
import { getLang, t } from '../lib/i18n'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const lang = getLang()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [fadingOut, setFadingOut] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const endedRef = useRef(false)

  const handleEnd = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    setFadingOut(true)
    setTimeout(onFinish, 400)
  }, [onFinish])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      // No video element — show logo fallback then dismiss
      setTimeout(handleEnd, 2000)
      return
    }

    let cancelled = false

    const onCanPlay = () => {
      if (cancelled) return
      setVideoReady(true)
      video.playbackRate = 2.0 // 8s video → 4s playback
      video.play().catch(() => {
        // Autoplay blocked on this platform — show logo fallback
        setVideoFailed(true)
        setTimeout(handleEnd, 2000)
      })
    }

    const onError = () => {
      if (cancelled) return
      setVideoFailed(true)
      setTimeout(handleEnd, 2000)
    }

    video.addEventListener('canplay', onCanPlay, { once: true })
    video.addEventListener('error', onError, { once: true })

    // Kick off loading
    video.load()

    // Safety: skip after 5s no matter what
    const timeout = setTimeout(handleEnd, 5000)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [handleEnd])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      {/* Video splash */}
      <video
        ref={videoRef}
        muted
        playsInline
        // @ts-ignore webkit-playsinline needed for older iOS
        webkit-playsinline="true"
        preload="auto"
        onEnded={handleEnd}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: videoFailed ? 'none' : 'block',
          opacity: videoReady ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <source src="/splash.mp4" type="video/mp4" />
      </video>

      {/* Logo fallback — shown while video loads or if video fails */}
      {(!videoReady || videoFailed) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '16px',
        }}>
          <img
            src="/logo.png"
            alt="ShaPop"
            style={{
              width: '60%', maxWidth: '280px',
              animation: 'splashFadeIn 0.6s ease-out',
            }}
          />
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={handleEnd}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 16px) + 16px)',
          right: '20px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '9999px',
          padding: '8px 20px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        {t(lang, 'skip')}
      </button>

      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

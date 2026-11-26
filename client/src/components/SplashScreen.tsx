// Écran de démarrage : intro vidéo du S de ShaPop (cyan néon, 2 secondes, générée avec Kie / Seedance).
// La dernière image est le S de l'appli : on enchaîne sans saut. Un appui passe directement à l'appli.
import { useEffect, useRef, useState, useCallback } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false)
  const endedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleEnd = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    setFadingOut(true)
    setTimeout(onFinish, 250)
  }, [onFinish])

  useEffect(() => {
    const v = videoRef.current
    v?.play().catch(() => handleEnd()) // lecture automatique refusée : on passe à l'appli
    const safety = setTimeout(handleEnd, 3200) // filet de sécurité si la vidéo ne se termine pas
    return () => clearTimeout(safety)
  }, [handleEnd])

  return (
    <div
      onClick={handleEnd}
      className="no-theme-invert"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fadingOut ? 0 : 1, transition: 'opacity 0.25s ease-out',
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        // Image noire avant la lecture : sinon Android affiche un gros bouton « lecture » gris
        poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnd}
        onError={handleEnd}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', backgroundColor: '#000' }}
      />
    </div>
  )
}

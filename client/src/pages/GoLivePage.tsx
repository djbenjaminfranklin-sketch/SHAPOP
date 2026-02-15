import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { categories } from '../components/CategoryIcons'

type Lang = 'fr' | 'en' | 'he' | 'es'

const goLiveContent = {
  fr: {
    titlePlaceholder: 'Donne un titre a ton live...',
    category: 'Categorie',
    goLive: 'Passer en direct',
    permissionDenied: 'Acces camera refuse',
    permissionDeniedDesc: 'Pour demarrer un live, autorise l\'acces a ta camera dans les reglages de ton navigateur ou de ton telephone.',
    openSettings: 'Ouvrir les reglages',
    cameraError: 'Impossible d\'acceder a la camera',
    cameraErrorDesc: 'Verifie que ta camera est disponible et que tu as autorise l\'acces.',
    retry: 'Reessayer',
    cancel: 'Annuler',
    go: 'GO!',
    connecting: 'Connexion...',
    flipCamera: 'Retourner',
  },
  en: {
    titlePlaceholder: 'Give your live a title...',
    category: 'Category',
    goLive: 'Go live',
    permissionDenied: 'Camera access denied',
    permissionDeniedDesc: 'To start a live, allow camera access in your browser or phone settings.',
    openSettings: 'Open settings',
    cameraError: 'Unable to access camera',
    cameraErrorDesc: 'Check that your camera is available and that you have allowed access.',
    retry: 'Retry',
    cancel: 'Cancel',
    go: 'GO!',
    connecting: 'Connecting...',
    flipCamera: 'Flip',
  },
  he: {
    titlePlaceholder: '...תן לשידור שלך כותרת',
    category: 'קטגוריה',
    goLive: 'צא לשידור',
    permissionDenied: 'גישה למצלמה נדחתה',
    permissionDeniedDesc: 'כדי להתחיל שידור, אפשר גישה למצלמה בהגדרות הדפדפן או הטלפון.',
    openSettings: 'פתח הגדרות',
    cameraError: 'לא ניתן לגשת למצלמה',
    cameraErrorDesc: 'ודא שהמצלמה זמינה ושנתת הרשאת גישה.',
    retry: 'נסה שוב',
    cancel: 'ביטול',
    go: '!GO',
    connecting: '...מתחבר',
    flipCamera: 'הפוך',
  },
  es: {
    titlePlaceholder: 'Dale un titulo a tu directo...',
    category: 'Categoria',
    goLive: 'Iniciar directo',
    permissionDenied: 'Acceso a la camara denegado',
    permissionDeniedDesc: 'Para iniciar un directo, permite el acceso a la camara en la configuracion de tu navegador o telefono.',
    openSettings: 'Abrir configuracion',
    cameraError: 'No se puede acceder a la camara',
    cameraErrorDesc: 'Verifica que tu camara esta disponible y que has permitido el acceso.',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    go: 'GO!',
    connecting: 'Conectando...',
    flipCamera: 'Voltear',
  },
}

export default function GoLivePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = goLiveContent[lang] || goLiveContent.fr

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [title, setTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<'permission' | 'error' | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [mounted, setMounted] = useState(false)

  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  useEffect(() => {
    setTimeout(() => setMounted(true), 100)
  }, [])

  // Request camera on mount
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Stop existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      })

      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraReady(true)
      setCameraError(null)
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('permission')
      } else {
        setCameraError('error')
      }
      setCameraReady(false)
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    await startCamera(newMode)
  }

  const handleGoLive = async () => {
    if (!user || !title.trim() || !selectedCategory || countdown !== null) return

    // Start countdown 3, 2, 1, GO!
    setCountdown(3)
    for (let i = 3; i >= 1; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 800))
    }
    setCountdown(0) // GO!
    await new Promise(r => setTimeout(r, 600))

    setCreating(true)

    try {
      const { data: stream, error } = await supabase
        .from('streams')
        .insert({
          seller_id: user.id,
          title: title.trim(),
          category: selectedCategory,
          status: 'live' as const,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setCountdown(null)
      navigate(`/stream/${stream.id}`)
    } catch (err) {
      console.error('Create stream error:', err)
      setCountdown(null)
      setCreating(false)
    }
  }

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    navigate(-1)
  }

  // Permission denied screen
  if (cameraError === 'permission') {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px', zIndex: 200,
      }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
          border: '1px solid rgba(240,144,138,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '28px',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
            <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="#E8344E" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px', textAlign: 'center' }}>
          {ct.permissionDenied}
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', lineHeight: 1.6, marginBottom: '36px', maxWidth: '320px' }}>
          {ct.permissionDeniedDesc}
        </p>
        <button
          onClick={() => startCamera(facingMode)}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            borderRadius: '14px', border: 'none',
            color: '#fff', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '12px',
          }}
        >
          {ct.retry}
        </button>
        <button
          onClick={handleCancel}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'transparent',
            borderRadius: '14px', border: '1px solid #333',
            color: '#888', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.cancel}
        </button>
      </div>
    )
  }

  // Camera error screen
  if (cameraError === 'error') {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px', zIndex: 200,
      }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.08))',
          border: '1px solid rgba(240,144,138,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '28px',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5">
            <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="#E8344E" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px', textAlign: 'center' }}>
          {ct.cameraError}
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', lineHeight: 1.6, marginBottom: '36px', maxWidth: '320px' }}>
          {ct.cameraErrorDesc}
        </p>
        <button
          onClick={() => startCamera(facingMode)}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            borderRadius: '14px', border: 'none',
            color: '#fff', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '12px',
          }}
        >
          {ct.retry}
        </button>
        <button
          onClick={handleCancel}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'transparent',
            borderRadius: '14px', border: '1px solid #333',
            color: '#888', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.cancel}
        </button>
      </div>
    )
  }

  const canGoLive = title.trim().length > 0 && selectedCategory && cameraReady && !creating

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 200,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Camera preview - full screen */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Dark gradient overlay at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '200px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Dark gradient overlay at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '380px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Close button */}
        <button
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '16px',
            width: '44px', height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Flip camera button */}
        <button
          onClick={handleFlipCamera}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: '16px',
            width: '44px', height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 8V4a2 2 0 012-2h12a2 2 0 012 2v4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 12 12 8 8 12" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 12 12 16 8 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* User info badge */}
        {profile && (
          <div style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%', transform: 'translateX(-50%)',
            padding: '6px 16px', borderRadius: '100px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '8px',
            zIndex: 10,
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: cameraReady ? '#10B981' : '#F59E0B',
              boxShadow: cameraReady ? '0 0 8px #10B981' : 'none',
            }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {profile.display_name || profile.username}
            </span>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}>
            <div
              key={countdown}
              style={{
                fontSize: countdown === 0 ? '72px' : '120px',
                fontWeight: 900,
                color: countdown === 0 ? '#F0908A' : '#fff',
                textShadow: countdown === 0
                  ? '0 0 60px rgba(240,144,138,0.8)'
                  : '0 0 40px rgba(255,255,255,0.3)',
                animation: 'countdownPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                letterSpacing: countdown === 0 ? '8px' : '-4px',
              }}
            >
              {countdown === 0 ? ct.go : countdown}
            </div>
          </div>
        )}

        {/* Bottom overlay content */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          zIndex: 10,
          opacity: countdown !== null ? 0.3 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: countdown !== null ? 'none' : 'auto',
        }}>
          {/* Title input */}
          <div style={{
            marginBottom: '16px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.2s',
          }}>
            <input
              type="text"
              value={title}
              onChange={e => { if (e.target.value.length <= 100) setTitle(e.target.value) }}
              placeholder={ct.titlePlaceholder}
              style={{
                width: '100%', padding: '16px 20px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                color: '#fff', fontSize: '17px', fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
                letterSpacing: '0.2px',
              }}
            />
          </div>

          {/* Category chips */}
          <div style={{
            marginBottom: '20px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.3s',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '10px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
              {ct.category}
            </p>
            <div style={{
              display: 'flex', gap: '8px', overflowX: 'auto',
              paddingBottom: '4px',
            }} className="no-scrollbar">
              {sellingCategories.slice(0, 12).map(cat => {
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '100px',
                      background: isSelected
                        ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                        : 'rgba(255,255,255,0.08)',
                      backdropFilter: isSelected ? 'none' : 'blur(8px)',
                      WebkitBackdropFilter: isSelected ? 'none' : 'blur(8px)',
                      border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.25s ease',
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 4px 16px rgba(240,144,138,0.4)' : 'none',
                    }}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Go Live button */}
          <div style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.4s',
          }}>
            <button
              onClick={handleGoLive}
              disabled={!canGoLive}
              style={{
                width: '100%', padding: '18px',
                background: canGoLive
                  ? 'linear-gradient(135deg, #E8344E 0%, #F0908A 50%, #E8344E 100%)'
                  : 'rgba(255,255,255,0.06)',
                backgroundSize: '200% 100%',
                borderRadius: '16px', border: 'none',
                color: canGoLive ? '#fff' : 'rgba(255,255,255,0.25)',
                fontSize: '18px', fontWeight: 800,
                cursor: canGoLive ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: canGoLive ? '0 8px 32px rgba(232,52,78,0.4)' : 'none',
                transition: 'all 0.3s ease',
                letterSpacing: '0.3px',
              }}
            >
              {creating ? (
                <>
                  <span style={{
                    width: '18px', height: '18px',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {ct.connecting}
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {ct.goLive}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes countdownPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

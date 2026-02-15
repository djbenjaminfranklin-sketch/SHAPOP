import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'

type Lang = ReturnType<typeof getLang>

const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const lang = getLang()

  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const comingSoonMsg = tx('Bientot disponible', 'Coming soon', 'בקרוב', 'Proximamente', lang)

  const handlePasskeySetup = () => {
    showToast(comingSoonMsg, 'info')
  }

  const handleTwoFAToggle = () => {
    showToast(comingSoonMsg, 'info')
    // Don't actually toggle since it's not available yet
  }

  const handleSignOutAll = async () => {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
      showToast(
        tx('Deconnecte de toutes les sessions', 'Signed out from all sessions', 'התנתקת מכל ההפעלות', 'Sesion cerrada en todos los dispositivos', lang),
        'success'
      )
      setTimeout(() => {
        signOut()
        navigate('/')
      }, 1500)
    } catch (err: any) {
      showToast(err.message || tx('Une erreur est survenue', 'An error occurred', 'אירעה שגיאה', 'Ocurrio un error', lang), 'error')
    }
    setSigningOut(false)
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px', color: '#666', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: '12px', marginTop: '28px',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000',
        borderBottom: '1px solid #1A1A1A', padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
          {tx('Securite', 'Security', 'אבטחה', 'Seguridad', lang)}
        </h1>
      </div>

      <div style={{ padding: '0 20px 24px' }}>

        {/* ── Section: Passkey ── */}
        <p style={sectionTitleStyle}>
          {tx("Cle d'acces (Passkey)", 'Passkey', 'מפתח גישה (Passkey)', 'Clave de acceso (Passkey)', lang)}
        </p>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '18px 16px',
          border: '1px solid #1A1A1A',
        }}>
          <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, margin: '0 0 16px' }}>
            {tx(
              "Les cles d'acces vous permettent de vous connecter en toute securite sans mot de passe, en utilisant la biometrie de votre appareil (empreinte digitale, reconnaissance faciale).",
              'Passkeys allow you to sign in securely without a password, using your device biometrics (fingerprint, face recognition).',
              'מפתחות גישה מאפשרים לך להתחבר בצורה מאובטחת ללא סיסמה, באמצעות הביומטריה של המכשיר שלך (טביעת אצבע, זיהוי פנים).',
              'Las claves de acceso le permiten iniciar sesion de forma segura sin contrasena, utilizando la biometria de su dispositivo (huella dactilar, reconocimiento facial).',
              lang
            )}
          </p>
          <button
            onClick={handlePasskeySetup}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
              color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
            }}
          >
            {tx("Configurer une cle d'acces", 'Set up a passkey', 'הגדר מפתח גישה', 'Configurar una clave de acceso', lang)}
          </button>
        </div>

        {/* ── Section: 2FA ── */}
        <p style={sectionTitleStyle}>
          {tx('Authentification a deux facteurs', 'Two-factor authentication', 'אימות דו-שלבי', 'Autenticacion de dos factores', lang)}
        </p>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '16px',
          border: '1px solid #1A1A1A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', color: '#E5E5E5', fontWeight: 500, margin: 0 }}>
              {tx('Activer la 2FA', 'Enable 2FA', 'הפעל אימות דו-שלבי', 'Activar 2FA', lang)}
            </p>
            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
              {tx(
                'Ajoutez une couche de securite supplementaire',
                'Add an extra layer of security',
                'הוסף שכבת אבטחה נוספת',
                'Agregue una capa adicional de seguridad',
                lang
              )}
            </p>
          </div>
          {/* Toggle switch */}
          <button
            onClick={handleTwoFAToggle}
            style={{
              width: '52px', height: '30px', borderRadius: '15px', border: 'none',
              backgroundColor: twoFAEnabled ? '#F0908A' : '#333',
              position: 'relative', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              backgroundColor: '#fff', position: 'absolute', top: '3px',
              left: twoFAEnabled ? '25px' : '3px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* ── Section: Active sessions ── */}
        <p style={sectionTitleStyle}>
          {tx('Sessions actives', 'Active sessions', 'הפעלות פעילות', 'Sesiones activas', lang)}
        </p>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px',
          border: '1px solid #1A1A1A', overflow: 'hidden',
        }}>
          {/* Current session */}
          <div style={{
            padding: '16px', display: 'flex', alignItems: 'center', gap: '14px',
            borderBottom: '1px solid #1A1A1A',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', color: '#E5E5E5', fontWeight: 500, margin: 0 }}>
                {tx('Session actuelle', 'Current session', 'הפעלה נוכחית', 'Sesion actual', lang)}
              </p>
              <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
                {navigator.userAgent.includes('iPhone') ? 'iPhone'
                  : navigator.userAgent.includes('Android') ? 'Android'
                  : navigator.userAgent.includes('Mac') ? 'Mac'
                  : navigator.userAgent.includes('Windows') ? 'Windows'
                  : tx('Appareil actuel', 'Current device', 'מכשיר נוכחי', 'Dispositivo actual', lang)
                }
              </p>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: '6px',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
            }}>
              <span style={{ fontSize: '12px', color: '#4ADE80', fontWeight: 600 }}>
                {tx('Actif', 'Active', 'פעיל', 'Activo', lang)}
              </span>
            </div>
          </div>

          {/* Email info */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
            </svg>
            <span style={{ fontSize: '13px', color: '#888' }}>
              {user?.email || '---'}
            </span>
          </div>
        </div>

        {/* Sign out all sessions button */}
        <button
          onClick={handleSignOutAll}
          disabled={signingOut}
          style={{
            width: '100%', marginTop: '20px', padding: '14px',
            backgroundColor: 'transparent', border: '1px solid #E8344E',
            borderRadius: '12px', color: '#E8344E', fontSize: '15px', fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          {signingOut
            ? tx('Deconnexion...', 'Signing out...', 'מתנתק...', 'Cerrando sesion...', lang)
            : tx('Se deconnecter de toutes les sessions', 'Sign out of all sessions', 'התנתק מכל ההפעלות', 'Cerrar sesion en todos los dispositivos', lang)
          }
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          padding: '14px 24px', borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#1a3a1a' : toast.type === 'error' ? '#3a1a1a' : '#1a2a3a',
          border: `1px solid ${toast.type === 'success' ? '#4ADE80' : toast.type === 'error' ? '#E8344E' : '#F0908A'}`,
          color: toast.type === 'success' ? '#4ADE80' : toast.type === 'error' ? '#E8344E' : '#F0908A',
          fontSize: '14px', fontWeight: 600, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

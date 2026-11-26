import { useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { authErrorMessage } from '../lib/authErrors'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type SecText = Record<'title' | 'signOut' | 'confirmAll' | 'signedOutAll' | 'genericError' | 'activeSessions' | 'currentSession' | 'currentDevice' | 'active' | 'signingOut' | 'signOutAll' | 'confirm' | 'cancel' | 'goBack', string>

const T: Localized<SecText> = {
  en: {
    title: 'Security',
    signOut: 'Sign out',
    confirmAll: 'Sign out of all sessions on all your devices?',
    signedOutAll: 'Signed out of all sessions',
    genericError: 'Something went wrong. Please try again.',
    activeSessions: 'Active sessions',
    currentSession: 'Current session',
    currentDevice: 'This device',
    active: 'Active',
    signingOut: 'Signing out...',
    signOutAll: 'Sign out of all sessions',
    confirm: 'Confirm',
    cancel: 'Cancel',
    goBack: 'Go back',
  },
  fr: {
    title: 'Sécurité',
    signOut: 'Déconnexion',
    confirmAll: 'Te déconnecter de toutes les sessions, sur tous tes appareils ?',
    signedOutAll: 'Déconnecté de toutes les sessions',
    genericError: 'Une erreur est survenue. Réessaie.',
    activeSessions: 'Sessions actives',
    currentSession: 'Session actuelle',
    currentDevice: 'Cet appareil',
    active: 'Active',
    signingOut: 'Déconnexion...',
    signOutAll: 'Se déconnecter de toutes les sessions',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    goBack: 'Retour',
  },
  es: {
    title: 'Seguridad',
    signOut: 'Cerrar sesión',
    confirmAll: '¿Cerrar sesión en todos tus dispositivos?',
    signedOutAll: 'Sesión cerrada en todos los dispositivos',
    genericError: 'Algo ha fallado. Vuelve a intentarlo.',
    activeSessions: 'Sesiones activas',
    currentSession: 'Sesión actual',
    currentDevice: 'Este dispositivo',
    active: 'Activa',
    signingOut: 'Cerrando sesión...',
    signOutAll: 'Cerrar sesión en todos los dispositivos',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    goBack: 'Volver',
  },
  ru: {
    title: 'Безопасность',
    signOut: 'Выход',
    confirmAll: 'Выйти из всех сеансов на всех твоих устройствах?',
    signedOutAll: 'Выход выполнен на всех устройствах',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    activeSessions: 'Активные сеансы',
    currentSession: 'Текущий сеанс',
    currentDevice: 'Это устройство',
    active: 'Активен',
    signingOut: 'Выходим...',
    signOutAll: 'Выйти из всех сеансов',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    goBack: 'Назад',
  },
  he: {
    title: 'אבטחה',
    signOut: 'התנתקות',
    confirmAll: 'להתנתק מכל החיבורים בכל המכשירים שלך?',
    signedOutAll: 'התנתקת מכל החיבורים',
    genericError: 'משהו השתבש. נסו שוב.',
    activeSessions: 'חיבורים פעילים',
    currentSession: 'החיבור הנוכחי',
    currentDevice: 'המכשיר הזה',
    active: 'פעיל',
    signingOut: 'מתנתקים...',
    signOutAll: 'התנתקות מכל החיבורים',
    confirm: 'אישור',
    cancel: 'ביטול',
    goBack: 'חזרה',
  },
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const c = tr(T)
  usePageTitle(c.title)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null)

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSignOutAll = () => {
    setConfirmModal({
      title: c.signOut,
      message: c.confirmAll,
      onConfirm: async () => {
        setConfirmModal(null)
        setSigningOut(true)
        try {
          const { error } = await supabase.auth.signOut({ scope: 'global' })
          if (error) throw error
          showToast(
            c.signedOutAll,
            'success'
          )
          setTimeout(() => {
            signOut()
            navigate('/')
          }, 1500)
        } catch (err: unknown) {
          showToast(authErrorMessage(err, c.genericError), 'error')
        }
        setSigningOut(false)
      },
    })
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600,
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
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>
          {c.title}
        </h1>
      </div>

      <div style={{ padding: '0 20px 24px' }}>

        {/* ── Section: Active sessions ── */}
        <p style={sectionTitleStyle}>
          {c.activeSessions}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#E5E5E5', fontWeight: 500, margin: 0 }}>
                {c.currentSession}
              </p>
              <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', margin: '4px 0 0' }}>
                {navigator.userAgent.includes('iPhone') ? 'iPhone'
                  : navigator.userAgent.includes('Android') ? 'Android'
                  : navigator.userAgent.includes('Mac') ? 'Mac' // i18n-ignore (nom de système)
                  : navigator.userAgent.includes('Windows') ? 'Windows' // i18n-ignore (nom de système)
                  : c.currentDevice
                }
              </p>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: '6px',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
            }}>
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#00E5FF', fontWeight: 600 }}>
                {c.active}
              </span>
            </div>
          </div>

          {/* Email info */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
            </svg>
            <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0' }}>
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
            backgroundColor: 'transparent', border: '1px solid #00E5FF',
            borderRadius: '12px', color: '#00E5FF', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          {signingOut
            ? c.signingOut
            : c.signOutAll
          }
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', insetInline: '16px', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          padding: '14px 24px', borderRadius: '12px', textAlign: 'center',
          backgroundColor: toast.type === 'success' ? '#1a3a1a' : toast.type === 'error' ? '#3a1a1a' : '#1a2a3a',
          border: `1px solid ${toast.type === 'success' ? '#4ADE80' : toast.type === 'error' ? '#E8344E' : '#00E5FF'}`,
          color: toast.type === 'success' ? '#4ADE80' : toast.type === 'error' ? '#E8344E' : '#00E5FF',
          fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.message}
        </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={c.confirm}
        cancelLabel={c.cancel}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
        danger
      />
    </div>
  )
}

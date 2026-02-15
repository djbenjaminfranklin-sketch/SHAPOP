import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang, setLang, type Lang } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const content = {
  fr: {
    title: 'Preferences', langLabel: 'Langue', currency: 'Devise', theme: 'Theme', dark: 'Sombre',
    deleteTitle: 'Zone dangereuse', deleteBtn: 'Supprimer mon compte', deleteConfirm: 'Es-tu sur ? Cette action est irreversible.',
    deleteModalTitle: 'Supprimer definitivement ton compte ?',
    deleteModalWarning: 'Cette action est irreversible. Toutes tes donnees, annonces, et historique seront supprimees sous 30 jours.',
    deleteModalInputLabel: 'Tape',
    deleteModalInputLabelEnd: 'pour confirmer',
    deleteConfirmWord: 'SUPPRIMER',
    deleteModalCancel: 'Annuler',
    deleteModalDelete: 'Supprimer',
    deleteModalDeleting: 'Suppression...',
    deleteToast: 'Compte supprime. Vos donnees seront effacees sous 30 jours.',
    deleteError: 'Erreur lors de la suppression. Veuillez reessayer.',
  },
  en: {
    title: 'Preferences', langLabel: 'Language', currency: 'Currency', theme: 'Theme', dark: 'Dark',
    deleteTitle: 'Danger zone', deleteBtn: 'Delete my account', deleteConfirm: 'Are you sure? This action is irreversible.',
    deleteModalTitle: 'Permanently delete your account?',
    deleteModalWarning: 'This action is irreversible. All your data, listings, and history will be deleted within 30 days.',
    deleteModalInputLabel: 'Type',
    deleteModalInputLabelEnd: 'to confirm',
    deleteConfirmWord: 'DELETE',
    deleteModalCancel: 'Cancel',
    deleteModalDelete: 'Delete',
    deleteModalDeleting: 'Deleting...',
    deleteToast: 'Account deleted. Your data will be erased within 30 days.',
    deleteError: 'Error during deletion. Please try again.',
  },
  he: {
    title: '\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA', langLabel: '\u05E9\u05E4\u05D4', currency: '\u05DE\u05D8\u05D1\u05E2', theme: '\u05E2\u05E8\u05DB\u05EA \u05E0\u05D5\u05E9\u05D0', dark: '\u05DB\u05D4\u05D4',
    deleteTitle: '\u05D0\u05D6\u05D5\u05E8 \u05DE\u05E1\u05D5\u05DB\u05DF', deleteBtn: '\u05DE\u05D7\u05E7 \u05D0\u05EA \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05D9', deleteConfirm: '\u05D1\u05D8\u05D5\u05D7? \u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D1\u05DC\u05EA\u05D9 \u05D4\u05E4\u05D9\u05DB\u05D4.',
    deleteModalTitle: '\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA?',
    deleteModalWarning: '\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D1\u05DC\u05EA\u05D9 \u05D4\u05E4\u05D9\u05DB\u05D4. \u05DB\u05DC \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD, \u05D4\u05DE\u05D5\u05D3\u05E2\u05D5\u05EA \u05D5\u05D4\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4 \u05E9\u05DC\u05DA \u05D9\u05D9\u05DE\u05D7\u05E7\u05D5 \u05EA\u05D5\u05DA 30 \u05D9\u05D5\u05DD.',
    deleteModalInputLabel: '\u05D4\u05E7\u05DC\u05D3',
    deleteModalInputLabelEnd: '\u05DC\u05D0\u05D9\u05E9\u05D5\u05E8',
    deleteConfirmWord: 'DELETE',
    deleteModalCancel: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    deleteModalDelete: '\u05DE\u05D7\u05D9\u05E7\u05D4',
    deleteModalDeleting: '\u05DE\u05D5\u05D7\u05E7...',
    deleteToast: '\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E0\u05DE\u05D7\u05E7. \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DA \u05D9\u05D9\u05DE\u05D7\u05E7\u05D5 \u05EA\u05D5\u05DA 30 \u05D9\u05D5\u05DD.',
    deleteError: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.',
  },
  es: {
    title: 'Preferencias', langLabel: 'Idioma', currency: 'Moneda', theme: 'Tema', dark: 'Oscuro',
    deleteTitle: 'Zona de peligro', deleteBtn: 'Eliminar mi cuenta', deleteConfirm: 'Estas seguro? Esta accion es irreversible.',
    deleteModalTitle: 'Eliminar permanentemente tu cuenta?',
    deleteModalWarning: 'Esta accion es irreversible. Todos tus datos, anuncios e historial seran eliminados en un plazo de 30 dias.',
    deleteModalInputLabel: 'Escribe',
    deleteModalInputLabelEnd: 'para confirmar',
    deleteConfirmWord: 'ELIMINAR',
    deleteModalCancel: 'Cancelar',
    deleteModalDelete: 'Eliminar',
    deleteModalDeleting: 'Eliminando...',
    deleteToast: 'Cuenta eliminada. Tus datos seran borrados en un plazo de 30 dias.',
    deleteError: 'Error durante la eliminacion. Por favor, intentalo de nuevo.',
  },
}

const languages = [
  { code: 'fr' as Lang, flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'Francais' },
  { code: 'en' as Lang, flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'English' },
  { code: 'he' as Lang, flag: '\uD83C\uDDEE\uD83C\uDDF1', name: '\u05E2\u05D1\u05E8\u05D9\u05EA' },
  { code: 'es' as Lang, flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'Espanol' },
]

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang)
    window.location.reload()
  }

  const confirmWordMatches = confirmText.trim().toUpperCase() === c.deleteConfirmWord.toUpperCase()

  const handleDeleteAccount = async () => {
    if (!user || !confirmWordMatches) return
    setDeleting(true)
    try {
      // 1. Delete avatar files from storage
      const { data: avatarFiles } = await supabase.storage.from('avatars').list(user.id)
      if (avatarFiles && avatarFiles.length > 0) {
        const filePaths = avatarFiles.map(f => `${user.id}/${f.name}`)
        await supabase.storage.from('avatars').remove(filePaths)
      }

      // 2. Delete user profile from profiles table
      await supabase.from('profiles').delete().eq('id', user.id)

      // 3. Sign out
      await signOut()

      // 4. Show toast and navigate
      setShowDeleteModal(false)
      setToast(c.deleteToast)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      console.error('Account deletion error:', err)
      setDeleting(false)
      setShowDeleteModal(false)
      setToast(c.deleteError)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {/* Language */}
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.langLabel}</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => handleLangChange(l.code)}
              style={{
                flex: 1, padding: '14px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                backgroundColor: lang === l.code ? '#F0908A' : '#111',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>{l.flag}</span>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{l.name}</span>
            </button>
          ))}
        </div>

        {/* Currency */}
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.currency}</p>
        <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '14px 16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: '#fff' }}>{'\u20AA'} ILS (Israeli Shekel)</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        {/* Theme */}
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.theme}</p>
        <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '14px 16px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: '#fff' }}>{c.dark}</span>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F0908A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* Danger zone */}
        <p style={{ fontSize: '12px', color: '#E8344E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.deleteTitle}</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #E8344E', borderRadius: '12px', color: '#E8344E', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          {c.deleteBtn}
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000000CC', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setShowDeleteModal(false); setConfirmText('') } }}
        >
          <div style={{
            backgroundColor: '#111', borderRadius: '16px', padding: '28px 24px',
            width: '100%', maxWidth: '380px',
          }}>
            {/* Warning icon */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#E8344E1A',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L1 21h22L12 2z" fill="#E8344E" stroke="#E8344E" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M12 9v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '18px', fontWeight: 700, color: '#fff',
              textAlign: 'center', marginBottom: '12px', lineHeight: '1.3',
            }}>
              {c.deleteModalTitle}
            </h2>

            {/* Warning text */}
            <p style={{
              fontSize: '14px', color: '#999', textAlign: 'center',
              marginBottom: '24px', lineHeight: '1.5',
            }}>
              {c.deleteModalWarning}
            </p>

            {/* Confirm input */}
            <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              {c.deleteModalInputLabel}{' '}
              <span style={{ fontWeight: 700, color: '#E8344E' }}>{c.deleteConfirmWord}</span>
              {' '}{c.deleteModalInputLabelEnd}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              disabled={deleting}
              placeholder={c.deleteConfirmWord}
              style={{
                width: '100%', padding: '12px 14px',
                backgroundColor: '#1A1A1A', border: '1px solid #333',
                borderRadius: '10px', color: '#fff', fontSize: '15px',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E8344E' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#333' }}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmText('') }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px', borderRadius: '10px',
                  backgroundColor: '#1A1A1A', border: 'none',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {c.deleteModalCancel}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!confirmWordMatches || deleting}
                style={{
                  flex: 1, padding: '13px', borderRadius: '10px',
                  background: confirmWordMatches && !deleting
                    ? 'linear-gradient(135deg, #E8344E, #C0392B)'
                    : '#2A1A1A',
                  border: 'none',
                  color: confirmWordMatches && !deleting ? '#fff' : '#666',
                  fontSize: '15px', fontWeight: 600,
                  cursor: confirmWordMatches && !deleting ? 'pointer' : 'not-allowed',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? c.deleteModalDeleting : c.deleteModalDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '20px', right: '20px',
          zIndex: 200, display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#1A1A1A', border: '1px solid #333',
            borderRadius: '12px', padding: '14px 20px',
            color: '#fff', fontSize: '14px', textAlign: 'center',
            maxWidth: '380px', lineHeight: '1.4',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang, setLang, type Lang } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getStoredGPSCountry } from '../lib/geolocation'
import { detectUserCountry } from '../lib/data/communitiesData'
import type { CountryCode } from '../lib/data/communitiesData'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

const content = {
  fr: {
    title: 'Modifier le profil', langLabel: 'Langue', currency: 'Devise',
    profileSection: 'Profil', displayName: 'Nom affiché', username: 'Nom d\'utilisateur', bio: 'Bio',
    bioPlaceholder: 'Parle-nous de toi...', save: 'Enregistrer', saving: 'Enregistrement...', saved: 'Profil mis à jour !',
    saveError: 'Erreur lors de la sauvegarde.',
    deleteTitle: 'Zone dangereuse', deleteBtn: 'Supprimer mon compte',
    deleteStep1Title: 'Attention !',
    deleteStep1Warning: 'Tu es sur le point de supprimer ton compte ShaPop. Voici ce qui va se passer :',
    deleteStep1Item1: 'Toutes tes annonces seront retirées',
    deleteStep1Item2: 'Ton historique d\'achats et ventes sera supprimé',
    deleteStep1Item3: 'Ton solde de crédits sera perdu',
    deleteStep1Item4: 'Cette action est irréversible',
    deleteStep1Cancel: 'Annuler',
    deleteStep1Continue: 'Je comprends, continuer',
    deleteModalTitle: 'Dernière étape : confirme la suppression',
    deleteModalWarning: 'Pour confirmer la suppression définitive de ton compte, tape le mot ci-dessous.',
    deleteModalInputLabel: 'Tape',
    deleteModalInputLabelEnd: 'pour confirmer',
    deleteConfirmWord: 'SUPPRIMER',
    deleteModalCancel: 'Annuler',
    deleteModalDelete: 'Supprimer définitivement',
    deleteModalDeleting: 'Suppression...',
    deleteToast: 'Compte supprimé. Vos données seront effacées sous 30 jours.',
    deleteError: 'Erreur lors de la suppression. Veuillez réessayer.',
  },
  en: {
    title: 'Edit Profile', langLabel: 'Language', currency: 'Currency',
    profileSection: 'Profile', displayName: 'Display name', username: 'Username', bio: 'Bio',
    bioPlaceholder: 'Tell us about yourself...', save: 'Save', saving: 'Saving...', saved: 'Profile updated!',
    saveError: 'Error saving profile.',
    deleteTitle: 'Danger zone', deleteBtn: 'Delete my account',
    deleteStep1Title: 'Warning!',
    deleteStep1Warning: 'You are about to delete your ShaPop account. Here is what will happen:',
    deleteStep1Item1: 'All your listings will be removed',
    deleteStep1Item2: 'Your purchase and sales history will be deleted',
    deleteStep1Item3: 'Your credit balance will be lost',
    deleteStep1Item4: 'This action is irreversible',
    deleteStep1Cancel: 'Cancel',
    deleteStep1Continue: 'I understand, continue',
    deleteModalTitle: 'Last step: confirm deletion',
    deleteModalWarning: 'To permanently confirm account deletion, type the word below.',
    deleteModalInputLabel: 'Type',
    deleteModalInputLabelEnd: 'to confirm',
    deleteConfirmWord: 'DELETE',
    deleteModalCancel: 'Cancel',
    deleteModalDelete: 'Delete permanently',
    deleteModalDeleting: 'Deleting...',
    deleteToast: 'Account deleted. Your data will be erased within 30 days.',
    deleteError: 'Error during deletion. Please try again.',
  },
  he: {
    title: '\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC', langLabel: '\u05E9\u05E4\u05D4', currency: '\u05DE\u05D8\u05D1\u05E2',
    profileSection: '\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC', displayName: '\u05E9\u05DD \u05EA\u05E6\u05D5\u05D2\u05D4', username: '\u05E9\u05DD \u05DE\u05E9\u05EA\u05DE\u05E9', bio: '\u05D1\u05D9\u05D5',
    bioPlaceholder: '...\u05E1\u05E4\u05E8\u05D5 \u05DC\u05E0\u05D5 \u05E2\u05DC \u05E2\u05E6\u05DE\u05DB\u05DD', save: '\u05E9\u05DE\u05D9\u05E8\u05D4', saving: '...\u05E9\u05D5\u05DE\u05E8', saved: '!\u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05E2\u05D5\u05D3\u05DB\u05DF',
    saveError: '.\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4',
    deleteTitle: '\u05D0\u05D6\u05D5\u05E8 \u05DE\u05E1\u05D5\u05DB\u05DF', deleteBtn: '\u05DE\u05D7\u05E7 \u05D0\u05EA \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05D9',
    deleteStep1Title: '\u05D0\u05D6\u05D4\u05E8\u05D4!',
    deleteStep1Warning: '\u05D0\u05EA\u05D4 \u05E2\u05D5\u05DE\u05D3 \u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u05D4-ShaPop \u05E9\u05DC\u05DA. \u05D4\u05E0\u05D4 \u05DE\u05D4 \u05E9\u05D9\u05E7\u05E8\u05D4:',
    deleteStep1Item1: '\u05DB\u05DC \u05D4\u05DE\u05D5\u05D3\u05E2\u05D5\u05EA \u05E9\u05DC\u05DA \u05D9\u05D5\u05E1\u05E8\u05D5',
    deleteStep1Item2: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05D5\u05D4\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05EA\u05D9\u05DE\u05D7\u05E7',
    deleteStep1Item3: '\u05D9\u05EA\u05E8\u05EA \u05D4\u05E7\u05E8\u05D3\u05D9\u05D8\u05D9\u05DD \u05E9\u05DC\u05DA \u05D9\u05D0\u05D1\u05D3',
    deleteStep1Item4: '\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5 \u05D1\u05DC\u05EA\u05D9 \u05D4\u05E4\u05D9\u05DB\u05D4',
    deleteStep1Cancel: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    deleteStep1Continue: '\u05D0\u05E0\u05D9 \u05DE\u05D1\u05D9\u05DF, \u05D4\u05DE\u05E9\u05DA',
    deleteModalTitle: '\u05E9\u05DC\u05D1 \u05D0\u05D7\u05E8\u05D5\u05DF: \u05D0\u05E9\u05E8 \u05DE\u05D7\u05D9\u05E7\u05D4',
    deleteModalWarning: '\u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05D7\u05D9\u05E7\u05D4 \u05E1\u05D5\u05E4\u05D9\u05EA, \u05D4\u05E7\u05DC\u05D3 \u05D0\u05EA \u05D4\u05DE\u05D9\u05DC\u05D4 \u05DC\u05DE\u05D8\u05D4.',
    deleteModalInputLabel: '\u05D4\u05E7\u05DC\u05D3',
    deleteModalInputLabelEnd: '\u05DC\u05D0\u05D9\u05E9\u05D5\u05E8',
    deleteConfirmWord: 'DELETE',
    deleteModalCancel: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    deleteModalDelete: '\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA',
    deleteModalDeleting: '\u05DE\u05D5\u05D7\u05E7...',
    deleteToast: '\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E0\u05DE\u05D7\u05E7. \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DA \u05D9\u05D9\u05DE\u05D7\u05E7\u05D5 \u05EA\u05D5\u05DA 30 \u05D9\u05D5\u05DD.',
    deleteError: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.',
  },
  es: {
    title: 'Editar perfil', langLabel: 'Idioma', currency: 'Moneda',
    profileSection: 'Perfil', displayName: 'Nombre visible', username: 'Nombre de usuario', bio: 'Bio',
    bioPlaceholder: 'Cuéntanos sobre ti...', save: 'Guardar', saving: 'Guardando...', saved: '\u00A1Perfil actualizado!',
    saveError: 'Error al guardar el perfil.',
    deleteTitle: 'Zona de peligro', deleteBtn: 'Eliminar mi cuenta',
    deleteStep1Title: '\u00A1Atención!',
    deleteStep1Warning: 'Estás a punto de eliminar tu cuenta ShaPop. Esto es lo que pasará:',
    deleteStep1Item1: 'Todos tus anuncios serán eliminados',
    deleteStep1Item2: 'Tu historial de compras y ventas será borrado',
    deleteStep1Item3: 'Tu saldo de créditos se perderá',
    deleteStep1Item4: 'Esta acción es irreversible',
    deleteStep1Cancel: 'Cancelar',
    deleteStep1Continue: 'Entiendo, continuar',
    deleteModalTitle: '\u00DAltimo paso: confirma la eliminación',
    deleteModalWarning: 'Para confirmar la eliminación definitiva, escribe la palabra de abajo.',
    deleteModalInputLabel: 'Escribe',
    deleteModalInputLabelEnd: 'para confirmar',
    deleteConfirmWord: 'ELIMINAR',
    deleteModalCancel: 'Cancelar',
    deleteModalDelete: 'Eliminar permanentemente',
    deleteModalDeleting: 'Eliminando...',
    deleteToast: 'Cuenta eliminada. Tus datos serán borrados en un plazo de 30 días.',
    deleteError: 'Error durante la eliminación. Por favor, inténtalo de nuevo.',
  },
}

const languages = [
  { code: 'fr' as Lang, flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'Français' },
  { code: 'en' as Lang, flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'English' },
  { code: 'he' as Lang, flag: '\uD83C\uDDEE\uD83C\uDDF1', name: '\u05E2\u05D1\u05E8\u05D9\u05EA' },
  { code: 'es' as Lang, flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'Español' },
]

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr
  usePageTitle(c.title)

  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0) // 0=hidden, 1=warning, 2=confirm
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Profile editing
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
    }
  }, [profile])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim() || !username.trim()) return
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim() || null,
        })
        .eq('id', user.id)
      if (error) throw error
      setToast(c.saved)
      setTimeout(() => setToast(null), 3000)
    } catch {
      setToast(c.saveError)
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSavingProfile(false)
    }
  }

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
        const { error: removeError } = await supabase.storage.from('avatars').remove(filePaths)
        if (removeError) console.error('Failed to remove avatar files:', removeError.message)
      }

      // 2. Delete user profile from profiles table
      await supabase.from('profiles').delete().eq('id', user.id)

      // 3. Sign out
      await signOut()

      // 4. Show toast and navigate
      setDeleteStep(0)
      setToast(c.deleteToast)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch {
      setDeleting(false)
      setDeleteStep(0)
      setToast(c.deleteError)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {/* Profile editing */}
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.profileSection}</p>
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>{c.displayName}</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>{c.username}</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>{c.bio}</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={c.bioPlaceholder}
            rows={3}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !displayName.trim() || !username.trim()}
            style={{
              width: '100%', padding: '12px', backgroundColor: savingProfile || !displayName.trim() || !username.trim() ? '#333' : '#F0908A',
              color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
              cursor: savingProfile || !displayName.trim() || !username.trim() ? 'default' : 'pointer',
              opacity: savingProfile ? 0.7 : 1,
            }}
          >
            {savingProfile ? c.saving : c.save}
          </button>
        </div>

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
          <span style={{ fontSize: '15px', color: '#fff' }}>{(() => {
            const country = getStoredGPSCountry() || detectUserCountry()
            const currencies: Partial<Record<CountryCode, string>> = {
              FR: '\u20AC EUR (Euro)',
              ES: '\u20AC EUR (Euro)',
              US: '$ USD (Dollar)',
              GB: '\u00A3 GBP (Pound)',
              BR: 'R$ BRL (Real)',
              JP: '\u00A5 JPY (Yen)',
              DE: '\u20AC EUR (Euro)',
              IT: '\u20AC EUR (Euro)',
              IL: '\u20AA ILS (Shekel)',
              PT: '\u20AC EUR (Euro)',
              MA: 'MAD (Dirham)',
              CA: '$ CAD (Dollar)',
            }
            return currencies[country] || '\u20AC EUR (Euro)'
          })()}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        {/* Danger zone */}
        <p style={{ fontSize: '12px', color: '#E8344E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.deleteTitle}</p>
        <button
          onClick={() => setDeleteStep(1)}
          style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #E8344E', borderRadius: '12px', color: '#E8344E', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          {c.deleteBtn}
        </button>
      </div>

      {/* Delete Account — Step 1: Warning */}
      {deleteStep === 1 && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000000CC', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setDeleteStep(0) } }}
        >
          <div style={{
            backgroundColor: '#111', borderRadius: '16px', padding: '28px 24px',
            width: '100%', maxWidth: '380px',
          }}>
            {/* Warning icon */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '56px', height: '56px', borderRadius: '50%',
                backgroundColor: '#E8344E1A',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L1 21h22L12 2z" fill="#E8344E" stroke="#E8344E" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M12 9v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '20px', fontWeight: 700, color: '#fff',
              textAlign: 'center', marginBottom: '12px', lineHeight: '1.3',
            }}>
              {c.deleteStep1Title}
            </h2>

            {/* Warning text */}
            <p style={{
              fontSize: '14px', color: '#999', textAlign: 'center',
              marginBottom: '20px', lineHeight: '1.5',
            }}>
              {c.deleteStep1Warning}
            </p>

            {/* Consequences list */}
            <div style={{ marginBottom: '24px' }}>
              {[c.deleteStep1Item1, c.deleteStep1Item2, c.deleteStep1Item3, c.deleteStep1Item4].map((item, i) => (
                <div key={`delete-item-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', marginBottom: '6px',
                  backgroundColor: '#1A1A1A', borderRadius: '10px',
                  border: i === 3 ? '1px solid #E8344E33' : '1px solid #222',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={i === 3 ? '#E8344E' : '#F0908A'} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    {i === 3 ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
                  </svg>
                  <span style={{ fontSize: '13px', color: i === 3 ? '#E8344E' : '#ccc', fontWeight: i === 3 ? 600 : 400 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteStep(0)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  backgroundColor: '#1A1A1A', border: 'none',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.deleteStep1Cancel}
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E8344E, #C0392B)',
                  border: 'none',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.deleteStep1Continue}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account — Step 2: Type to confirm */}
      {deleteStep === 2 && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000000CC', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) { setDeleteStep(0); setConfirmText('') } }}
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
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E8344E'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#333' }}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => { setDeleteStep(0); setConfirmText('') }}
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
                  fontSize: '14px', fontWeight: 600,
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

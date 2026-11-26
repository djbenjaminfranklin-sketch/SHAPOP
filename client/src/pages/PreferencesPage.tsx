import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLocale, tr, type Localized } from '../lib/i18n'
import { currencyForCountry, currencySymbol } from '../lib/fulfillment'
import LanguageSelector from '../components/LanguageSelector'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getStoredGPSCountry } from '../lib/geolocation'
import { detectUserCountry } from '../lib/data/communitiesData'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type PrefsText = Record<'title' | 'langLabel' | 'currency' | 'currencyHint' | 'profileSection' | 'displayName' | 'username' | 'bio' | 'bioPlaceholder' | 'save' | 'saving' | 'saved' | 'saveError' | 'deleteTitle' | 'deleteBtn' | 'deleteStep1Title' | 'deleteStep1Warning' | 'deleteStep1Item1' | 'deleteStep1Item2' | 'deleteStep1Item3' | 'deleteStep1Item4' | 'deleteStep1Cancel' | 'deleteStep1Continue' | 'deleteModalTitle' | 'deleteModalWarning' | 'deleteModalInputLabel' | 'deleteModalInputLabelEnd' | 'deleteConfirmWord' | 'deleteModalCancel' | 'deleteModalDelete' | 'deleteModalDeleting' | 'deleteToast' | 'deleteError' | 'goBack', string>

const content: Localized<PrefsText> = {
  en: {
    title: 'Edit profile',
    langLabel: 'Language',
    currency: 'Currency',
    currencyHint: 'Prices are shown in the seller’s currency.',
    profileSection: 'Profile',
    displayName: 'Display name',
    username: 'Username',
    bio: 'Bio',
    bioPlaceholder: 'Tell people about yourself...',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Profile updated!',
    saveError: 'Couldn’t save your profile. Please try again.',
    deleteTitle: 'Danger zone',
    deleteBtn: 'Delete my account',
    deleteStep1Title: 'Warning!',
    deleteStep1Warning: 'You’re about to delete your ShaPop account. Here’s what will happen:',
    deleteStep1Item1: 'All your listings will be removed',
    deleteStep1Item2: 'Your purchase and sales history will be deleted',
    deleteStep1Item3: 'Your credit balance will be lost',
    deleteStep1Item4: 'This can’t be undone',
    deleteStep1Cancel: 'Cancel',
    deleteStep1Continue: 'I understand, continue',
    deleteModalTitle: 'Last step: confirm deletion',
    deleteModalWarning: 'To permanently delete your account, type the word below.',
    deleteModalInputLabel: 'Type',
    deleteModalInputLabelEnd: 'to confirm',
    deleteConfirmWord: 'DELETE',
    deleteModalCancel: 'Cancel',
    deleteModalDelete: 'Delete permanently',
    deleteModalDeleting: 'Deleting...',
    deleteToast: 'Account deleted. Your data will be erased within 30 days.',
    deleteError: 'Couldn’t delete your account. Please try again.',
    goBack: 'Go back',
  },
  fr: {
    title: 'Modifier le profil',
    langLabel: 'Langue',
    currency: 'Devise',
    currencyHint: 'Les prix s’affichent dans la devise du vendeur.',
    profileSection: 'Profil',
    displayName: 'Nom affiché',
    username: 'Nom d’utilisateur',
    bio: 'Bio',
    bioPlaceholder: 'Parle un peu de toi...',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Profil mis à jour !',
    saveError: 'Impossible d’enregistrer ton profil. Réessaie.',
    deleteTitle: 'Zone dangereuse',
    deleteBtn: 'Supprimer mon compte',
    deleteStep1Title: 'Attention !',
    deleteStep1Warning: 'Tu es sur le point de supprimer ton compte ShaPop. Voici ce qui va se passer :',
    deleteStep1Item1: 'Toutes tes annonces seront retirées',
    deleteStep1Item2: 'Ton historique d’achats et de ventes sera supprimé',
    deleteStep1Item3: 'Ton solde de crédits sera perdu',
    deleteStep1Item4: 'Cette action est irréversible',
    deleteStep1Cancel: 'Annuler',
    deleteStep1Continue: 'Je comprends, continuer',
    deleteModalTitle: 'Dernière étape : confirme la suppression',
    deleteModalWarning: 'Pour supprimer définitivement ton compte, tape le mot ci-dessous.',
    deleteModalInputLabel: 'Tape',
    deleteModalInputLabelEnd: 'pour confirmer',
    deleteConfirmWord: 'SUPPRIMER',
    deleteModalCancel: 'Annuler',
    deleteModalDelete: 'Supprimer définitivement',
    deleteModalDeleting: 'Suppression...',
    deleteToast: 'Compte supprimé. Tes données seront effacées sous 30 jours.',
    deleteError: 'Impossible de supprimer ton compte. Réessaie.',
    goBack: 'Retour',
  },
  es: {
    title: 'Editar perfil',
    langLabel: 'Idioma',
    currency: 'Moneda',
    currencyHint: 'Los precios se muestran en la moneda del vendedor.',
    profileSection: 'Perfil',
    displayName: 'Nombre visible',
    username: 'Nombre de usuario',
    bio: 'Bio',
    bioPlaceholder: 'Cuéntanos algo sobre ti...',
    save: 'Guardar',
    saving: 'Guardando...',
    saved: '¡Perfil actualizado!',
    saveError: 'No se pudo guardar tu perfil. Vuelve a intentarlo.',
    deleteTitle: 'Zona de peligro',
    deleteBtn: 'Eliminar mi cuenta',
    deleteStep1Title: '¡Atención!',
    deleteStep1Warning: 'Estás a punto de eliminar tu cuenta de ShaPop. Esto es lo que pasará:',
    deleteStep1Item1: 'Se retirarán todos tus anuncios',
    deleteStep1Item2: 'Se borrará tu historial de compras y ventas',
    deleteStep1Item3: 'Perderás tu saldo de créditos',
    deleteStep1Item4: 'Esta acción no se puede deshacer',
    deleteStep1Cancel: 'Cancelar',
    deleteStep1Continue: 'Entiendo, continuar',
    deleteModalTitle: 'Último paso: confirma la eliminación',
    deleteModalWarning: 'Para eliminar tu cuenta definitivamente, escribe la palabra de abajo.',
    deleteModalInputLabel: 'Escribe',
    deleteModalInputLabelEnd: 'para confirmar',
    deleteConfirmWord: 'ELIMINAR',
    deleteModalCancel: 'Cancelar',
    deleteModalDelete: 'Eliminar definitivamente',
    deleteModalDeleting: 'Eliminando...',
    deleteToast: 'Cuenta eliminada. Tus datos se borrarán en un plazo de 30 días.',
    deleteError: 'No se pudo eliminar tu cuenta. Vuelve a intentarlo.',
    goBack: 'Volver',
  },
  ru: {
    title: 'Редактировать профиль',
    langLabel: 'Язык',
    currency: 'Валюта',
    currencyHint: 'Цены показываются в валюте продавца.',
    profileSection: 'Профиль',
    displayName: 'Отображаемое имя',
    username: 'Имя пользователя',
    bio: 'О себе',
    bioPlaceholder: 'Расскажи немного о себе...',
    save: 'Сохранить',
    saving: 'Сохраняем...',
    saved: 'Профиль обновлён!',
    saveError: 'Не удалось сохранить профиль. Попробуй ещё раз.',
    deleteTitle: 'Опасная зона',
    deleteBtn: 'Удалить мой аккаунт',
    deleteStep1Title: 'Внимание!',
    deleteStep1Warning: 'Ты собираешься удалить свой аккаунт ShaPop. Вот что произойдёт:',
    deleteStep1Item1: 'Все твои объявления будут сняты',
    deleteStep1Item2: 'История покупок и продаж будет удалена',
    deleteStep1Item3: 'Баланс кредитов сгорит',
    deleteStep1Item4: 'Это действие нельзя отменить',
    deleteStep1Cancel: 'Отмена',
    deleteStep1Continue: 'Понятно, продолжить',
    deleteModalTitle: 'Последний шаг: подтверди удаление',
    deleteModalWarning: 'Чтобы окончательно удалить аккаунт, введи слово ниже.',
    deleteModalInputLabel: 'Введи',
    deleteModalInputLabelEnd: 'для подтверждения',
    deleteConfirmWord: 'УДАЛИТЬ',
    deleteModalCancel: 'Отмена',
    deleteModalDelete: 'Удалить навсегда',
    deleteModalDeleting: 'Удаляем...',
    deleteToast: 'Аккаунт удалён. Твои данные будут стёрты в течение 30 дней.',
    deleteError: 'Не удалось удалить аккаунт. Попробуй ещё раз.',
    goBack: 'Назад',
  },
  he: {
    title: 'עריכת פרופיל',
    langLabel: 'שפה',
    currency: 'מטבע',
    currencyHint: 'המחירים מוצגים במטבע של המוכר/ת.',
    profileSection: 'פרופיל',
    displayName: 'שם תצוגה',
    username: 'שם משתמש',
    bio: 'ביו',
    bioPlaceholder: 'ספרו קצת על עצמכם...',
    save: 'שמירה',
    saving: 'שומרים...',
    saved: 'הפרופיל עודכן!',
    saveError: 'לא הצלחנו לשמור את הפרופיל. נסו שוב.',
    deleteTitle: 'אזור מסוכן',
    deleteBtn: 'מחיקת החשבון שלי',
    deleteStep1Title: 'שימו לב!',
    deleteStep1Warning: 'אתם עומדים למחוק את חשבון ה-ShaPop שלכם. זה מה שיקרה:',
    deleteStep1Item1: 'כל המודעות שלכם יוסרו',
    deleteStep1Item2: 'היסטוריית הקניות והמכירות תימחק',
    deleteStep1Item3: 'יתרת הקרדיטים תאבד',
    deleteStep1Item4: 'אי אפשר לבטל את הפעולה הזו',
    deleteStep1Cancel: 'ביטול',
    deleteStep1Continue: 'הבנתי, להמשיך',
    deleteModalTitle: 'שלב אחרון: אישור המחיקה',
    deleteModalWarning: 'כדי למחוק את החשבון לצמיתות, הקלידו את המילה שלמטה.',
    deleteModalInputLabel: 'הקלידו',
    deleteModalInputLabelEnd: 'לאישור',
    deleteConfirmWord: 'מחק',
    deleteModalCancel: 'ביטול',
    deleteModalDelete: 'מחיקה לצמיתות',
    deleteModalDeleting: 'מוחקים...',
    deleteToast: 'החשבון נמחק. הנתונים שלכם יימחקו תוך 30 יום.',
    deleteError: 'לא הצלחנו למחוק את החשבון. נסו שוב.',
    goBack: 'חזרה',
  },
}

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const c = tr(content)
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
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {/* Profile editing */}
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.profileSection}</p>
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '6px' }}>{c.displayName}</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '6px' }}>{c.username}</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '6px' }}>{c.bio}</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={c.bioPlaceholder}
            rows={3}
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222',
              borderRadius: '10px', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '12px',
            }}
          />
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !displayName.trim() || !username.trim()}
            style={{
              width: '100%', padding: '12px', backgroundColor: savingProfile || !displayName.trim() || !username.trim() ? '#333' : '#00E5FF',
              color: '#001014', border: 'none', borderRadius: '10px', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
              cursor: savingProfile || !displayName.trim() || !username.trim() ? 'default' : 'pointer',
              opacity: savingProfile ? 0.7 : 1,
            }}
          >
            {savingProfile ? c.saving : c.save}
          </button>
        </div>

        {/* Language */}
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.langLabel}</p>
        <div style={{ marginBottom: '28px' }}>
          <LanguageSelector variant="list" />
        </div>

        {/* Currency */}
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.currency}</p>
        <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '14px 16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#fff' }}>{(() => {
            const cur = currencyForCountry(profile?.country || getStoredGPSCountry() || detectUserCountry())
            let name = cur
            try { name = new Intl.DisplayNames([getLocale()], { type: 'currency' }).of(cur) || cur } catch { /* navigateur ancien */ }
            const sym = currencySymbol(cur)
            return `${sym !== cur ? sym + ' ' : ''}${cur} (${name})`
          })()}</span>
        </div>
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '-20px', marginBottom: '28px' }}>{c.currencyHint}</p>

        {/* Danger zone */}
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#E8344E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.deleteTitle}</p>
        <button
          onClick={() => setDeleteStep(1)}
          style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #00E5FF', borderRadius: '12px', color: '#00E5FF', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer' }}
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
                backgroundColor: '#00E5FF1A',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L1 21h22L12 2z" fill="#00E5FF" stroke="#00E5FF" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M12 9v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, color: '#fff',
              textAlign: 'center', marginBottom: '12px', lineHeight: '1.3',
            }}>
              {c.deleteStep1Title}
            </h2>

            {/* Warning text */}
            <p style={{
              fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
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
                  border: i === 3 ? '1px solid #00E5FF33' : '1px solid #222',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={i === 3 ? '#00E5FF' : '#00E5FF'} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    {i === 3 ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
                  </svg>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: i === 3 ? '#00E5FF' : '#ccc', fontWeight: i === 3 ? 600 : 400 }}>
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
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.deleteStep1Cancel}
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0091EA, #C0392B)',
                  border: 'none',
                  color: '#001014', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
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
                backgroundColor: '#00E5FF1A',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L1 21h22L12 2z" fill="#00E5FF" stroke="#00E5FF" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M12 9v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff',
              textAlign: 'center', marginBottom: '12px', lineHeight: '1.3',
            }}>
              {c.deleteModalTitle}
            </h2>

            {/* Warning text */}
            <p style={{
              fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
              marginBottom: '24px', lineHeight: '1.5',
            }}>
              {c.deleteModalWarning}
            </p>

            {/* Confirm input */}
            <label style={{ display: 'block', fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '8px' }}>
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
                borderRadius: '10px', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
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
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
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
                    ? 'linear-gradient(135deg, #0091EA, #C0392B)'
                    : '#2A1A1A',
                  border: 'none',
                  color: confirmWordMatches && !deleting ? '#fff' : '#f0f0f0',
                  fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
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
          position: 'fixed', bottom: '100px', insetInline: '20px',
          zIndex: 200, display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#1A1A1A', border: '1px solid #333',
            borderRadius: '12px', padding: '14px 20px',
            color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', textAlign: 'center',
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

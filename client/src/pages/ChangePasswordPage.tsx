import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { authErrorKey, authErrorMessage } from '../lib/authErrors'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type PwText = Record<'pageTitle' | 'weak' | 'medium' | 'strong' | 'fillAll' | 'noMatch' | 'tooShort' | 'wrongCurrent' | 'updated' | 'samePassword' | 'genericError' | 'newPassword' | 'changePassword' | 'chooseNew' | 'currentPassword' | 'currentPlaceholder' | 'newPlaceholder' | 'confirmPassword' | 'confirmPlaceholder' | 'updating' | 'update' | 'goBack' | 'showPassword' | 'hidePassword', string>

const T: Localized<PwText> = {
  en: {
    pageTitle: 'Change password',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    fillAll: 'Please fill in all fields.',
    noMatch: 'Passwords don’t match.',
    tooShort: 'Your password must be at least 8 characters.',
    wrongCurrent: 'Your current password is incorrect.',
    updated: 'Password updated!',
    samePassword: 'The new password must be different from the current one.',
    genericError: 'Something went wrong. Please try again.',
    newPassword: 'New password',
    changePassword: 'Change password',
    chooseNew: 'Choose your new password.',
    currentPassword: 'Current password',
    currentPlaceholder: 'Enter your current password',
    newPlaceholder: 'Enter your new password',
    confirmPassword: 'Confirm password',
    confirmPlaceholder: 'Re-enter your new password',
    updating: 'Updating...',
    update: 'Update',
    goBack: 'Go back',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  fr: {
    pageTitle: 'Changer le mot de passe',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    fillAll: 'Remplis tous les champs.',
    noMatch: 'Les mots de passe ne correspondent pas.',
    tooShort: 'Ton mot de passe doit contenir au moins 8 caractères.',
    wrongCurrent: 'Ton mot de passe actuel est incorrect.',
    updated: 'Mot de passe mis à jour !',
    samePassword: 'Le nouveau mot de passe doit être différent de l’actuel.',
    genericError: 'Une erreur est survenue. Réessaie.',
    newPassword: 'Nouveau mot de passe',
    changePassword: 'Modifier le mot de passe',
    chooseNew: 'Choisis ton nouveau mot de passe.',
    currentPassword: 'Mot de passe actuel',
    currentPlaceholder: 'Saisis ton mot de passe actuel',
    newPlaceholder: 'Saisis ton nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    confirmPlaceholder: 'Saisis à nouveau ton nouveau mot de passe',
    updating: 'Mise à jour...',
    update: 'Mettre à jour',
    goBack: 'Retour',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
  es: {
    pageTitle: 'Cambiar contraseña',
    weak: 'Débil',
    medium: 'Media',
    strong: 'Fuerte',
    fillAll: 'Rellena todos los campos.',
    noMatch: 'Las contraseñas no coinciden.',
    tooShort: 'Tu contraseña debe tener al menos 8 caracteres.',
    wrongCurrent: 'Tu contraseña actual no es correcta.',
    updated: '¡Contraseña actualizada!',
    samePassword: 'La nueva contraseña debe ser distinta de la actual.',
    genericError: 'Algo ha fallado. Vuelve a intentarlo.',
    newPassword: 'Nueva contraseña',
    changePassword: 'Cambiar contraseña',
    chooseNew: 'Elige tu nueva contraseña.',
    currentPassword: 'Contraseña actual',
    currentPlaceholder: 'Introduce tu contraseña actual',
    newPlaceholder: 'Introduce tu nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    confirmPlaceholder: 'Repite tu nueva contraseña',
    updating: 'Actualizando...',
    update: 'Actualizar',
    goBack: 'Volver',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  ru: {
    pageTitle: 'Сменить пароль',
    weak: 'Слабый',
    medium: 'Средний',
    strong: 'Надёжный',
    fillAll: 'Заполни все поля.',
    noMatch: 'Пароли не совпадают.',
    tooShort: 'Пароль должен содержать не менее 8 символов.',
    wrongCurrent: 'Текущий пароль неверный.',
    updated: 'Пароль обновлён!',
    samePassword: 'Новый пароль должен отличаться от текущего.',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    newPassword: 'Новый пароль',
    changePassword: 'Сменить пароль',
    chooseNew: 'Придумай новый пароль.',
    currentPassword: 'Текущий пароль',
    currentPlaceholder: 'Введи текущий пароль',
    newPlaceholder: 'Введи новый пароль',
    confirmPassword: 'Подтверди пароль',
    confirmPlaceholder: 'Повтори новый пароль',
    updating: 'Обновляем...',
    update: 'Обновить',
    goBack: 'Назад',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
  },
  he: {
    pageTitle: 'שינוי סיסמה',
    weak: 'חלשה',
    medium: 'בינונית',
    strong: 'חזקה',
    fillAll: 'נא למלא את כל השדות.',
    noMatch: 'הסיסמאות לא תואמות.',
    tooShort: 'הסיסמה חייבת להכיל לפחות 8 תווים.',
    wrongCurrent: 'הסיסמה הנוכחית שגויה.',
    updated: 'הסיסמה עודכנה!',
    samePassword: 'הסיסמה החדשה חייבת להיות שונה מהנוכחית.',
    genericError: 'משהו השתבש. נסו שוב.',
    newPassword: 'סיסמה חדשה',
    changePassword: 'שינוי סיסמה',
    chooseNew: 'בחרו סיסמה חדשה.',
    currentPassword: 'סיסמה נוכחית',
    currentPlaceholder: 'הזינו את הסיסמה הנוכחית',
    newPlaceholder: 'הזינו סיסמה חדשה',
    confirmPassword: 'אימות סיסמה',
    confirmPlaceholder: 'הזינו שוב את הסיסמה החדשה',
    updating: 'מעדכנים...',
    update: 'עדכון',
    goBack: 'חזרה',
    showPassword: 'הצגת הסיסמה',
    hidePassword: 'הסתרת הסיסמה',
  },
}

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const c = tr(T)
  usePageTitle(c.pageTitle)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => window.location.hash.includes('type=recovery'))
  const [sessionReady, setSessionReady] = useState(false)

  // Detect recovery mode from URL hash (Supabase appends #access_token=...&type=recovery)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsRecoveryMode(true)
      // Supabase JS client auto-detects hash tokens and sets session
      // Wait a moment for session to be established
      const checkSession = async () => {
        // Give Supabase time to process the hash
        await new Promise(r => setTimeout(r, 1000))
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setSessionReady(true)
          // Clean URL hash
          window.location.hash = ''
        }
      }
      checkSession()
    } else if (user) {
      setSessionReady(true)
    }
  }, [user])

  // If not recovery mode and not logged in, redirect to login
  useEffect(() => {
    if (!isRecoveryMode && !user) {
      navigate('/login', { replace: true })
    }
  }, [isRecoveryMode, user, navigate])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Password strength: 0 = empty, 1 = weak, 2 = medium, 3 = strong
  const getPasswordStrength = (pw: string): number => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strengthLevel = getPasswordStrength(newPassword)

  const strengthColor = strengthLevel === 1 ? '#E8344E' : strengthLevel === 2 ? '#F0908A' : strengthLevel === 3 ? '#4ADE80' : '#333'
  const strengthLabel = strengthLevel === 0
    ? ''
    : strengthLevel === 1
      ? c.weak
      : strengthLevel === 2
        ? c.medium
        : c.strong

  const handleSubmit = async () => {
    if (!isRecoveryMode && !currentPassword) {
      showToast(c.fillAll, 'error')
      return
    }
    if (!newPassword || !confirmPassword) {
      showToast(c.fillAll, 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast(c.noMatch, 'error')
      return
    }
    if (newPassword.length < 8) {
      showToast(c.tooShort, 'error')
      return
    }

    setLoading(true)
    try {
      // If not recovery mode, verify current password first
      if (!isRecoveryMode && user) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        })
        if (verifyError) {
          showToast(c.wrongCurrent, 'error')
          setLoading(false)
          return
        }
        await new Promise(r => setTimeout(r, 200))
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast(c.updated, 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        if (isRecoveryMode) {
          navigate('/login', { replace: true })
        } else {
          navigate(-1)
        }
      }, 1500)
    } catch (err: unknown) {
      if (authErrorKey(err) === 'samePassword') {
        showToast(c.samePassword, 'error')
      } else {
        showToast(authErrorMessage(err, c.genericError), 'error')
      }
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#111',
    border: '1px solid #1A1A1A',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  // Show loading while waiting for recovery session
  if (isRecoveryMode && !sessionReady) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid #333',
          borderTopColor: '#E8344E', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
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
        <button onClick={() => navigate(isRecoveryMode ? '/login' : -1 as any)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
          {isRecoveryMode
            ? c.newPassword
            : c.changePassword
          }
        </h1>
      </div>

      {/* Form */}
      <div style={{ padding: '24px 20px' }}>
        {isRecoveryMode && (
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            {c.chooseNew}
          </p>
        )}

        {/* Current password — only shown when NOT in recovery mode */}
        {!isRecoveryMode && (
          <>
            <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              {c.currentPassword}
            </label>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={c.currentPlaceholder}
                style={{ ...inputStyle, paddingInlineEnd: '48px' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
                onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? c.hidePassword : c.showPassword}
                style={{
                  position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {showCurrentPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </>
        )}

        {/* New password */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {c.newPassword}
        </label>
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder={c.newPlaceholder}
            style={{ ...inputStyle, paddingInlineEnd: '48px' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            aria-label={showNewPassword ? c.hidePassword : c.showPassword}
            style={{
              position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {showNewPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {/* Password strength indicator */}
        {newPassword.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  style={{
                    flex: 1, height: '4px', borderRadius: '2px',
                    backgroundColor: strengthLevel >= level ? strengthColor : '#222',
                    transition: 'background-color 0.3s',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: strengthColor, fontWeight: 500 }}>
              {strengthLabel}
            </span>
          </div>
        )}

        {/* Confirm new password */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {c.confirmPassword}
        </label>
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={c.confirmPlaceholder}
            style={{ ...inputStyle, paddingInlineEnd: '48px' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? c.hidePassword : c.showPassword}
            style={{
              position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {showConfirmPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
            color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 6px 24px rgba(240,144,138,0.35)',
          }}
        >
          {loading
            ? c.updating
            : c.update
          }
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', insetInline: '16px', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          padding: '14px 24px', borderRadius: '12px', textAlign: 'center',
          backgroundColor: toast.type === 'success' ? '#1a3a1a' : '#3a1a1a',
          border: `1px solid ${toast.type === 'success' ? '#4ADE80' : '#E8344E'}`,
          color: toast.type === 'success' ? '#4ADE80' : '#E8344E',
          fontSize: '14px', fontWeight: 600, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.message}
        </div>
        </div>
      )}
    </div>
  )
}

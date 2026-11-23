import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { authErrorMessage } from '../lib/authErrors'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type EmailText = Record<'pageTitle' | 'invalidEmail' | 'enterPassword' | 'wrongPassword' | 'sent' | 'genericError' | 'title' | 'currentEmail' | 'newEmail' | 'newPlaceholder' | 'passwordLabel' | 'passwordPlaceholder' | 'updating' | 'update' | 'goBack', string>

const T: Localized<EmailText> = {
  en: {
    pageTitle: 'Change email',
    invalidEmail: 'This email address is not valid.',
    enterPassword: 'Please enter your password.',
    wrongPassword: 'Wrong password.',
    sent: 'We’ve sent a confirmation email. Click the link to confirm the change.',
    genericError: 'Something went wrong. Please try again.',
    title: 'Change email address',
    currentEmail: 'Current email address',
    newEmail: 'New email address',
    newPlaceholder: 'Enter your new email',
    passwordLabel: 'Password (to confirm it’s you)',
    passwordPlaceholder: 'Enter your password',
    updating: 'Updating...',
    update: 'Update',
    goBack: 'Go back',
  },
  fr: {
    pageTitle: 'Changer d’e-mail',
    invalidEmail: 'Cette adresse e-mail n’est pas valide.',
    enterPassword: 'Saisis ton mot de passe.',
    wrongPassword: 'Mot de passe incorrect.',
    sent: 'Un e-mail de confirmation t’a été envoyé. Clique sur le lien pour valider le changement.',
    genericError: 'Une erreur est survenue. Réessaie.',
    title: 'Modifier l’adresse e-mail',
    currentEmail: 'Adresse e-mail actuelle',
    newEmail: 'Nouvelle adresse e-mail',
    newPlaceholder: 'Saisis ta nouvelle adresse',
    passwordLabel: 'Mot de passe (vérification)',
    passwordPlaceholder: 'Saisis ton mot de passe',
    updating: 'Mise à jour...',
    update: 'Mettre à jour',
    goBack: 'Retour',
  },
  es: {
    pageTitle: 'Cambiar correo',
    invalidEmail: 'Esta dirección de correo no es válida.',
    enterPassword: 'Introduce tu contraseña.',
    wrongPassword: 'Contraseña incorrecta.',
    sent: 'Te hemos enviado un correo de confirmación. Pulsa el enlace para confirmar el cambio.',
    genericError: 'Algo ha fallado. Vuelve a intentarlo.',
    title: 'Cambiar dirección de correo',
    currentEmail: 'Correo actual',
    newEmail: 'Nuevo correo',
    newPlaceholder: 'Introduce tu nuevo correo',
    passwordLabel: 'Contraseña (verificación)',
    passwordPlaceholder: 'Introduce tu contraseña',
    updating: 'Actualizando...',
    update: 'Actualizar',
    goBack: 'Volver',
  },
  ru: {
    pageTitle: 'Сменить e-mail',
    invalidEmail: 'Этот адрес e-mail недействителен.',
    enterPassword: 'Введи пароль.',
    wrongPassword: 'Неверный пароль.',
    sent: 'Мы отправили письмо для подтверждения. Перейди по ссылке, чтобы подтвердить смену.',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    title: 'Изменить адрес e-mail',
    currentEmail: 'Текущий e-mail',
    newEmail: 'Новый e-mail',
    newPlaceholder: 'Введи новый e-mail',
    passwordLabel: 'Пароль (для проверки)',
    passwordPlaceholder: 'Введи пароль',
    updating: 'Обновляем...',
    update: 'Обновить',
    goBack: 'Назад',
  },
  he: {
    pageTitle: 'שינוי אימייל',
    invalidEmail: 'כתובת האימייל אינה תקינה.',
    enterPassword: 'הזינו את הסיסמה.',
    wrongPassword: 'סיסמה שגויה.',
    sent: 'שלחנו אימייל אישור. לחצו על הקישור כדי לאשר את השינוי.',
    genericError: 'משהו השתבש. נסו שוב.',
    title: 'שינוי כתובת האימייל',
    currentEmail: 'כתובת האימייל הנוכחית',
    newEmail: 'כתובת אימייל חדשה',
    newPlaceholder: 'הזינו את הכתובת החדשה',
    passwordLabel: 'סיסמה (לאימות)',
    passwordPlaceholder: 'הזינו את הסיסמה',
    updating: 'מעדכנים...',
    update: 'עדכון',
    goBack: 'חזרה',
  },
}

export default function ChangeEmailPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = tr(T)
  usePageTitle(c.pageTitle)

  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubmit = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      showToast(c.invalidEmail, 'error')
      return
    }
    if (!password) {
      showToast(c.enterPassword, 'error')
      return
    }

    setLoading(true)
    try {
      // Re-authenticate with password before allowing email change
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      })
      if (signInError) {
        showToast(c.wrongPassword, 'error')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      showToast(
        c.sent,
        'success'
      )
    } catch (err: unknown) {
      showToast(authErrorMessage(err, c.genericError), 'error')
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
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
          {c.title}
        </h1>
      </div>

      {/* Form */}
      <div style={{ padding: '24px 20px' }}>
        {/* Current email */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {c.currentEmail}
        </label>
        <div style={{
          padding: '14px 16px', backgroundColor: '#111', borderRadius: '12px',
          border: '1px solid #1A1A1A', marginBottom: '24px',
        }}>
          <span style={{ fontSize: '15px', color: '#888' }}>
            {user?.email || '---'}
          </span>
        </div>

        {/* New email */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {c.newEmail}
        </label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder={c.newPlaceholder}
          style={{ ...inputStyle, marginBottom: '20px' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
        />

        {/* Password for verification */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {c.passwordLabel}
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={c.passwordPlaceholder}
          style={{ ...inputStyle, marginBottom: '32px' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
        />

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

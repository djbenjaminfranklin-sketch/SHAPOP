import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tr, type Localized } from '../lib/i18n'
import { authErrorMessage } from '../lib/authErrors'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

const content: Localized<{
  title: string; goBack: string; enterEmail: string; invalidEmail: string; genericError: string
  sentTitle: string; sentText: string; backToLogin: string; intro: string; emailLabel: string
  emailPlaceholder: string; sending: string; sendLink: string
}> = {
  en: {
    title: 'Forgot password',
    goBack: 'Go back',
    enterEmail: 'Please enter your email address.',
    invalidEmail: 'This email address is not valid.',
    genericError: 'Something went wrong. Please try again.',
    sentTitle: 'Email sent!',
    sentText: 'Check your inbox and follow the link to reset your password.',
    backToLogin: 'Back to sign in',
    intro: 'Enter your email address and we’ll send you a link to reset your password.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@email.com',
    sending: 'Sending...',
    sendLink: 'Send reset link',
  },
  fr: {
    title: 'Mot de passe oublié',
    goBack: 'Retour',
    enterEmail: 'Saisis ton adresse e-mail.',
    invalidEmail: 'Cette adresse e-mail n’est pas valide.',
    genericError: 'Une erreur est survenue. Réessaie.',
    sentTitle: 'E-mail envoyé !',
    sentText: 'Regarde dans ta boîte de réception et suis le lien pour réinitialiser ton mot de passe.',
    backToLogin: 'Retour à la connexion',
    intro: 'Saisis ton adresse e-mail : on t’envoie un lien pour réinitialiser ton mot de passe.',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'toi@email.com',
    sending: 'Envoi en cours...',
    sendLink: 'Envoyer le lien',
  },
  es: {
    title: 'Olvidé mi contraseña',
    goBack: 'Volver',
    enterEmail: 'Introduce tu correo electrónico.',
    invalidEmail: 'Esta dirección de correo no es válida.',
    genericError: 'Algo ha fallado. Vuelve a intentarlo.',
    sentTitle: '¡Correo enviado!',
    sentText: 'Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.',
    backToLogin: 'Volver a iniciar sesión',
    intro: 'Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    sending: 'Enviando...',
    sendLink: 'Enviar enlace',
  },
  ru: {
    title: 'Восстановление пароля',
    goBack: 'Назад',
    enterEmail: 'Введи свой адрес e-mail.',
    invalidEmail: 'Этот адрес e-mail недействителен.',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    sentTitle: 'Письмо отправлено!',
    sentText: 'Проверь входящие и перейди по ссылке, чтобы сбросить пароль.',
    backToLogin: 'Вернуться ко входу',
    intro: 'Введи свой e-mail, и мы пришлём ссылку для сброса пароля.',
    emailLabel: 'Адрес e-mail',
    emailPlaceholder: 'ty@email.com',
    sending: 'Отправляем...',
    sendLink: 'Отправить ссылку',
  },
  he: {
    title: 'שכחתי סיסמה',
    goBack: 'חזרה',
    enterEmail: 'הזינו את כתובת האימייל שלכם.',
    invalidEmail: 'כתובת האימייל אינה תקינה.',
    genericError: 'משהו השתבש. נסו שוב.',
    sentTitle: 'האימייל נשלח!',
    sentText: 'בדקו את תיבת הדואר ולחצו על הקישור כדי לאפס את הסיסמה.',
    backToLogin: 'חזרה להתחברות',
    intro: 'הזינו את כתובת האימייל שלכם ונשלח לכם קישור לאיפוס הסיסמה.',
    emailLabel: 'כתובת אימייל',
    emailPlaceholder: 'you@email.com',
    sending: 'שולחים...',
    sendLink: 'שליחת קישור לאיפוס',
  },
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const c = tr(content)
  usePageTitle(c.title)

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubmit = async () => {
    if (!email.trim()) {
      showToast(c.enterEmail, 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(c.invalidEmail, 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://shapop.vercel.app/reset-password.html',
      })
      if (error) throw error
      setSent(true)
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
    fontSize: 'calc(15px * var(--fs, 1))',
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
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>
          {c.title}
        </h1>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {sent ? (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              {c.sentTitle}
            </h2>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto 32px' }}>
              {c.sentText}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block', padding: '14px 32px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(240,144,138,0.35)',
              }}
            >
              {c.backToLogin}
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
              {c.intro}
            </p>

            <label style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              {c.emailLabel}
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={c.emailPlaceholder}
              style={{ ...inputStyle, marginBottom: '24px' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
              onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 6px 24px rgba(240,144,138,0.35)',
              }}
            >
              {loading
                ? c.sending
                : c.sendLink
              }
            </button>

            <p style={{ textAlign: 'center', fontSize: 'calc(14px * var(--fs, 1))', color: '#666', marginTop: '24px' }}>
              <Link to="/login" style={{ color: '#F0908A', fontWeight: 600, textDecoration: 'none' }}>
                {c.backToLogin}
              </Link>
            </p>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', insetInline: '16px', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          padding: '14px 24px', borderRadius: '12px', textAlign: 'center',
          backgroundColor: toast.type === 'success' ? '#1a3a1a' : '#3a1a1a',
          border: `1px solid ${toast.type === 'success' ? '#4ADE80' : '#E8344E'}`,
          color: toast.type === 'success' ? '#4ADE80' : '#E8344E',
          fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast.message}
        </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type Lang = ReturnType<typeof getLang>

const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const lang = getLang()
  usePageTitle(tx('Mot de passe oublie', 'Forgot Password', 'שכחתי סיסמה', 'Olvidé la contraseña', lang))

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
      showToast(tx('Veuillez entrer votre adresse e-mail', 'Please enter your email address', 'נא להזין כתובת אימייל', 'Por favor ingrese su correo electronico', lang), 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(tx('Adresse e-mail invalide', 'Invalid email address', 'כתובת אימייל לא תקינה', 'Direccion de correo invalida', lang), 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://shapop.app/change-password',
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : null) || tx('Une erreur est survenue', 'An error occurred', 'אירעה שגיאה', 'Ocurrio un error', lang), 'error')
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
        <button onClick={() => navigate(-1)} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
          {tx('Mot de passe oublie', 'Forgot password', 'שכחתי סיסמה', 'Olvide mi contrasena', lang)}
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
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              {tx('E-mail envoye !', 'Email sent!', '!נשלח אימייל', 'Correo enviado!', lang)}
            </h2>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto 32px' }}>
              {tx(
                'Consultez votre boite e-mail et suivez le lien pour reinitialiser votre mot de passe.',
                'Check your inbox and follow the link to reset your password.',
                'בדוק את תיבת הדואר שלך ולחץ על הקישור לאיפוס הסיסמה.',
                'Revise su bandeja de entrada y siga el enlace para restablecer su contrasena.',
                lang
              )}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block', padding: '14px 32px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                color: '#fff', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(240,144,138,0.35)',
              }}
            >
              {tx('Retour a la connexion', 'Back to login', 'חזרה להתחברות', 'Volver al inicio de sesion', lang)}
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
              {tx(
                'Entrez votre adresse e-mail et nous vous enverrons un lien pour reinitialiser votre mot de passe.',
                'Enter your email address and we will send you a link to reset your password.',
                'הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.',
                'Ingrese su direccion de correo y le enviaremos un enlace para restablecer su contrasena.',
                lang
              )}
            </p>

            <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              {tx('Adresse e-mail', 'Email address', 'כתובת אימייל', 'Direccion de correo', lang)}
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={tx('Entrez votre adresse e-mail', 'Enter your email', 'הזן את האימייל שלך', 'Ingrese su correo', lang)}
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
                color: '#fff', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 6px 24px rgba(240,144,138,0.35)',
              }}
            >
              {loading
                ? tx('Envoi en cours...', 'Sending...', '...שולח', 'Enviando...', lang)
                : tx('Envoyer le lien', 'Send reset link', 'שלח קישור', 'Enviar enlace', lang)
              }
            </button>

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '24px' }}>
              <Link to="/login" style={{ color: '#F0908A', fontWeight: 600, textDecoration: 'none' }}>
                {tx('Retour a la connexion', 'Back to login', 'חזרה להתחברות', 'Volver al inicio de sesion', lang)}
              </Link>
            </p>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          padding: '14px 24px', borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#1a3a1a' : '#3a1a1a',
          border: `1px solid ${toast.type === 'success' ? '#4ADE80' : '#E8344E'}`,
          color: toast.type === 'success' ? '#4ADE80' : '#E8344E',
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

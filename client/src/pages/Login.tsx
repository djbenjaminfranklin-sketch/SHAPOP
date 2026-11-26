import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { tr, type Localized } from '../lib/i18n'
import { authErrorMessage } from '../lib/authErrors'
import LanguageSelector from '../components/LanguageSelector'
import { track } from '../lib/analytics'
import { usePageTitle } from '../hooks/usePageTitle'

const content: Localized<{
  title: string; subtitle: string; continueApple: string; continueGoogle: string; or: string
  email: string; password: string; emailPlaceholder: string; passwordPlaceholder: string
  signIn: string; signingIn: string; noAccount: string; createAccount: string; forgotPassword: string
  errorDefault: string; errorInvalidEmail: string; showPassword: string; hidePassword: string
  terms: string; privacy: string; eula: string
}> = {
  en: {
    title: 'Sign in',
    subtitle: 'Sign in to your account',
    continueApple: 'Continue with Apple',
    continueGoogle: 'Continue with Google',
    or: 'or',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'you@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    noAccount: 'No account yet?',
    createAccount: 'Create account',
    forgotPassword: 'Forgot password?',
    errorDefault: 'Couldn’t sign you in. Please try again.',
    errorInvalidEmail: 'Enter a valid email address.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    terms: 'Terms of Service',
    privacy: 'Privacy',
    eula: 'EULA',
  },
  fr: {
    title: 'Connexion',
    subtitle: 'Connecte-toi à ton compte',
    continueApple: 'Continuer avec Apple',
    continueGoogle: 'Continuer avec Google',
    or: 'ou',
    email: 'E-mail',
    password: 'Mot de passe',
    emailPlaceholder: 'toi@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'Se connecter',
    signingIn: 'Connexion...',
    noAccount: 'Pas encore de compte ?',
    createAccount: 'Créer un compte',
    forgotPassword: 'Mot de passe oublié ?',
    errorDefault: 'Connexion impossible. Réessaie.',
    errorInvalidEmail: 'Saisis une adresse e-mail valide.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    terms: 'Conditions d’utilisation',
    privacy: 'Confidentialité',
    eula: 'CLUF',
  },
  es: {
    title: 'Iniciar sesión',
    subtitle: 'Inicia sesión en tu cuenta',
    continueApple: 'Continuar con Apple',
    continueGoogle: 'Continuar con Google',
    or: 'o',
    email: 'Correo electrónico',
    password: 'Contraseña',
    emailPlaceholder: 'tu@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión...',
    noAccount: '¿Aún no tienes cuenta?',
    createAccount: 'Crear cuenta',
    forgotPassword: '¿Olvidaste tu contraseña?',
    errorDefault: 'No se pudo iniciar sesión. Vuelve a intentarlo.',
    errorInvalidEmail: 'Introduce un correo electrónico válido.',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    terms: 'Términos del servicio',
    privacy: 'Privacidad',
    eula: 'CLUF',
  },
  ru: {
    title: 'Вход',
    subtitle: 'Войди в свой аккаунт',
    continueApple: 'Продолжить с Apple',
    continueGoogle: 'Продолжить с Google',
    or: 'или',
    email: 'E-mail',
    password: 'Пароль',
    emailPlaceholder: 'ty@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'Войти',
    signingIn: 'Входим...',
    noAccount: 'Ещё нет аккаунта?',
    createAccount: 'Создать аккаунт',
    forgotPassword: 'Не помнишь пароль?',
    errorDefault: 'Не удалось войти. Попробуй ещё раз.',
    errorInvalidEmail: 'Введи правильный адрес e-mail.',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    terms: 'Условия использования',
    privacy: 'Конфиденциальность',
    eula: 'Лицензионное соглашение',
  },
  he: {
    title: 'התחברות',
    subtitle: 'התחברו לחשבון שלכם',
    continueApple: 'המשך עם Apple',
    continueGoogle: 'המשך עם Google',
    or: 'או',
    email: 'אימייל',
    password: 'סיסמה',
    emailPlaceholder: 'you@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'התחברות',
    signingIn: 'מתחברים...',
    noAccount: 'אין לכם עדיין חשבון?',
    createAccount: 'יצירת חשבון',
    forgotPassword: 'שכחת סיסמה?',
    errorDefault: 'לא הצלחנו לחבר אותך. נסו שוב.',
    errorInvalidEmail: 'הזינו כתובת אימייל תקינה.',
    showPassword: 'הצגת הסיסמה',
    hidePassword: 'הסתרת הסיסמה',
    terms: 'תנאי שימוש',
    privacy: 'פרטיות',
    eula: 'הסכם רישיון',
  },
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, signIn, signInWithGoogle, signInWithApple } = useAuth()
  const navigate = useNavigate()
  const c = tr(content)
  usePageTitle(c.title)

  // Redirect when user becomes authenticated (OAuth callback)
  useEffect(() => {
    if (!authLoading && user) {
      sessionStorage.setItem('shapop_fresh_login', '1')
      navigate('/')
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(c.errorInvalidEmail)
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      track('login')
      sessionStorage.setItem('shapop_fresh_login', '1')
      navigate('/')
    } catch (err) {
      setError(authErrorMessage(err, c.errorDefault))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
      padding: '0 24px', paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: '120px', position: 'relative',
    }}>
      {/* Choix de la langue */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', insetInlineEnd: '16px', zIndex: 10 }}>
        <LanguageSelector variant="compact" />
      </div>

      {/* Logo + Title */}
      <div style={{ paddingTop: '48px', marginBottom: '36px' }}>
        <img src="/logo.png" alt="ShaPop" style={{ height: '100px', marginBottom: '28px', objectFit: 'contain' }} />
        <h1 style={{ fontSize: 'calc(32px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: 'calc(16px * var(--fs, 1))', color: '#f0f0f0', marginTop: '8px', lineHeight: 1.4 }}>
          {c.subtitle}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#F87171', padding: '14px 16px', borderRadius: '14px', marginBottom: '20px',
          fontSize: 'calc(14px * var(--fs, 1))', lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {/* Social buttons FIRST */}
      <button
        onClick={signInWithApple}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          width: '100%', padding: '16px', borderRadius: '14px',
          backgroundColor: '#fff', border: 'none',
          fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 600, color: '#000',
          cursor: 'pointer', marginBottom: '12px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {c.continueApple}
      </button>

      <button
        onClick={signInWithGoogle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          width: '100%', padding: '16px', borderRadius: '14px',
          backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A',
          fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 600, color: '#fff',
          cursor: 'pointer', marginBottom: '24px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {c.continueGoogle}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#222' }} />
        <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 500 }}>{c.or}</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#222' }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', marginBottom: '8px' }}>
            {c.email}
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={c.emailPlaceholder}
            required
            onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
            style={{
              width: '100%', padding: '16px 18px', borderRadius: '14px',
              backgroundColor: '#111', border: '1.5px solid #222',
              fontSize: 'calc(17px * var(--fs, 1))', color: '#fff', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0', marginBottom: '8px' }}>
            {c.password}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={c.passwordPlaceholder}
              required
              onFocus={e => { setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
              style={{
                width: '100%', padding: '16px 18px', paddingInlineEnd: '48px', borderRadius: '14px',
                backgroundColor: '#111', border: '1.5px solid #222',
                fontSize: 'calc(17px * var(--fs, 1))', color: '#fff', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? c.hidePassword : c.showPassword}
              style={{
                position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'end', marginBottom: '24px' }}>
          <Link to="/forgot-password" style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#00E5FF', fontWeight: 500, textDecoration: 'none' }}>
            {c.forgotPassword}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
            color: '#001014', fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, border: 'none',
            cursor: 'pointer', opacity: loading ? 0.5 : 1,
            boxShadow: '0 6px 24px rgba(0, 229, 255,0.3)',
            letterSpacing: '0.2px',
          }}
        >
          {loading ? c.signingIn : c.signIn}
        </button>
      </form>

      {/* Link to register */}
      <p style={{ textAlign: 'center', fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', marginTop: '32px' }}>
        {c.noAccount}{' '}
        <Link to="/register" style={{ color: '#00E5FF', fontWeight: 600, textDecoration: 'none' }}>
          {c.createAccount}
        </Link>
      </p>

      {/* Legal links */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link to="/terms" style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', textDecoration: 'none' }}>
          {c.terms}
        </Link>
        <Link to="/privacy" style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', textDecoration: 'none' }}>
          {c.privacy}
        </Link>
        <Link to="/eula" style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', textDecoration: 'none' }}>
          {c.eula}
        </Link>
      </div>
    </div>
  )
}

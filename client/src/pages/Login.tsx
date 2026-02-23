import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { track } from '../lib/analytics'
import { usePageTitle } from '../hooks/usePageTitle'

const content = {
  fr: {
    title: 'Connexion',
    subtitle: 'Connecte-toi a ton compte',
    continueApple: 'Continuer avec Apple',
    continueGoogle: 'Continuer avec Google',
    or: 'ou',
    email: 'Email',
    password: 'Mot de passe',
    emailPlaceholder: 'ton@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'Se connecter',
    signingIn: 'Connexion...',
    noAccount: 'Pas de compte ?',
    createAccount: "S'inscrire",
    forgotPassword: 'Mot de passe oublie ?',
    errorDefault: 'Erreur de connexion',
    errorInvalidCredentials: 'Email ou mot de passe incorrect',
  },
  en: {
    title: 'Sign In',
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
    noAccount: 'No account?',
    createAccount: 'Create account',
    forgotPassword: 'Forgot password?',
    errorDefault: 'Sign in error',
    errorInvalidCredentials: 'Invalid email or password',
  },
  he: {
    title: 'התחברות',
    subtitle: 'התחבר לחשבונך',
    continueApple: 'המשך עם Apple',
    continueGoogle: 'המשך עם Google',
    or: 'או',
    email: 'אימייל',
    password: 'סיסמה',
    emailPlaceholder: 'you@email.com',
    passwordPlaceholder: '••••••••',
    signIn: 'התחבר',
    signingIn: '...מתחבר',
    noAccount: 'אין חשבון?',
    createAccount: 'צור חשבון',
    forgotPassword: 'שכחת סיסמה?',
    errorDefault: 'שגיאת התחברות',
    errorInvalidCredentials: 'אימייל או סיסמה שגויים',
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
    noAccount: '¿Sin cuenta?',
    createAccount: 'Crear cuenta',
    forgotPassword: '¿Olvidó su contraseña?',
    errorDefault: 'Error de inicio de sesión',
    errorInvalidCredentials: 'Email o contraseña incorrectos',
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
  const lang = getLang()
  const c = content[lang] || content.fr
  usePageTitle(c.title || 'Connexion')

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
      setError(c.errorInvalidCredentials)
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      track('login')
      sessionStorage.setItem('shapop_fresh_login', '1')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (/invalid login credentials/i.test(msg)) {
        setError(c.errorInvalidCredentials)
      } else {
        setError(msg || c.errorDefault)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
      padding: '0 24px', paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: '120px',
    }}>

      {/* Logo + Title */}
      <div style={{ paddingTop: '48px', marginBottom: '36px' }}>
        <img src="/logo.png" alt="ShaPop" style={{ height: '100px', marginBottom: '28px', objectFit: 'contain' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginTop: '8px', lineHeight: 1.4 }}>
          {c.subtitle}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#F87171', padding: '14px 16px', borderRadius: '14px', marginBottom: '20px',
          fontSize: '14px', lineHeight: 1.4,
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
          fontSize: '17px', fontWeight: 600, color: '#000',
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
          fontSize: '17px', fontWeight: 600, color: '#fff',
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
        <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>{c.or}</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#222' }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
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
              fontSize: '17px', color: '#fff', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
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
                width: '100%', padding: '16px 18px', paddingRight: '48px', borderRadius: '14px',
                backgroundColor: '#111', border: '1.5px solid #222',
                fontSize: '17px', color: '#fff', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
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

        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
          <Link to="/forgot-password" style={{ fontSize: '14px', color: '#F0908A', fontWeight: 500, textDecoration: 'none' }}>
            {c.forgotPassword}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
            color: '#fff', fontSize: '17px', fontWeight: 700, border: 'none',
            cursor: 'pointer', opacity: loading ? 0.5 : 1,
            boxShadow: '0 6px 24px rgba(240,144,138,0.3)',
            letterSpacing: '0.2px',
          }}
        >
          {loading ? c.signingIn : c.signIn}
        </button>
      </form>

      {/* Link to register */}
      <p style={{ textAlign: 'center', fontSize: '15px', color: '#666', marginTop: '32px' }}>
        {c.noAccount}{' '}
        <Link to="/register" style={{ color: '#F0908A', fontWeight: 600, textDecoration: 'none' }}>
          {c.createAccount}
        </Link>
      </p>

      {/* Legal links */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link to="/terms" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>
          {lang === 'fr' ? "Conditions d'utilisation" : lang === 'es' ? 'Terminos de servicio' : lang === 'he' ? '\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9' : 'Terms of Service'}
        </Link>
        <Link to="/privacy" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>
          {lang === 'fr' ? 'Confidentialite' : lang === 'es' ? 'Privacidad' : lang === 'he' ? '\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA' : 'Privacy'}
        </Link>
        <Link to="/eula" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>
          {lang === 'fr' ? 'CLUF' : lang === 'es' ? 'CLUF' : lang === 'he' ? '\u05D4\u05E1\u05DB\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF' : 'EULA'}
        </Link>
      </div>
    </div>
  )
}

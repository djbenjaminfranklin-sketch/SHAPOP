import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'

const COUNTRY_PREFIXES = [
  { code: '+33', label: 'FR +33' },
  { code: '+972', label: 'IL +972' },
  { code: '+34', label: 'ES +34' },
  { code: '+1', label: 'US +1' },
]

const content = {
  fr: {
    title: 'Creer un compte',
    subtitle: 'Rejoins ShaPop et commence a acheter ou vendre en live',
    continueApple: 'Continuer avec Apple',
    continueGoogle: 'Continuer avec Google',
    or: 'ou',
    username: "Nom d'utilisateur",
    displayName: 'Nom affiche',
    email: 'Email',
    password: 'Mot de passe',
    phone: 'Telephone',
    sendCode: 'Envoyer le code',
    sendingCode: 'Envoi...',
    otpCode: 'Code de verification',
    verify: 'Verifier',
    verifying: 'Verification...',
    phoneVerified: 'Numero verifie',
    signUp: "S'inscrire",
    signingUp: 'Creation...',
    alreadyHaveAccount: 'Deja un compte ?',
    signIn: 'Se connecter',
    errorDefault: "Erreur lors de l'inscription",
    errorFileType: 'Seuls les formats JPEG, PNG et WebP sont acceptes.',
    errorFileSize: "L'image doit faire moins de 5 Mo.",
    errorEmailTaken: 'Cet email est deja utilise',
    errorUsernameTaken: "Ce nom d'utilisateur est deja pris",
    errorPhoneRequired: 'Verifie ton numero de telephone avant de continuer',
    checkEmail: 'Verifie ton email',
    checkEmailDesc: 'Un lien de confirmation a ete envoye a ton adresse email.',
  },
  en: {
    title: 'Create Account',
    subtitle: 'Join ShaPop and start buying or selling live',
    continueApple: 'Continue with Apple',
    continueGoogle: 'Continue with Google',
    or: 'or',
    username: 'Username',
    displayName: 'Display name',
    email: 'Email',
    password: 'Password',
    phone: 'Phone number',
    sendCode: 'Send code',
    sendingCode: 'Sending...',
    otpCode: 'Verification code',
    verify: 'Verify',
    verifying: 'Verifying...',
    phoneVerified: 'Number verified',
    signUp: 'Sign up',
    signingUp: 'Creating...',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    errorDefault: 'Registration error',
    errorFileType: 'Only JPEG, PNG, and WebP images are allowed.',
    errorFileSize: 'Image must be smaller than 5MB.',
    errorEmailTaken: 'This email is already registered',
    errorUsernameTaken: 'This username is already taken',
    errorPhoneRequired: 'Verify your phone number before continuing',
    checkEmail: 'Check your email',
    checkEmailDesc: 'A confirmation link has been sent to your email address.',
  },
  he: {
    title: '\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF',
    subtitle: '\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC-ShaPop \u05D5\u05D4\u05EA\u05D7\u05DC \u05DC\u05E7\u05E0\u05D5\u05EA \u05D0\u05D5 \u05DC\u05DE\u05DB\u05D5\u05E8 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9',
    continueApple: '\u05D4\u05DE\u05E9\u05DA \u05E2\u05DD Apple',
    continueGoogle: '\u05D4\u05DE\u05E9\u05DA \u05E2\u05DD Google',
    or: '\u05D0\u05D5',
    username: '\u05E9\u05DD \u05DE\u05E9\u05EA\u05DE\u05E9',
    displayName: '\u05E9\u05DD \u05EA\u05E6\u05D5\u05D2\u05D4',
    email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC',
    password: '\u05E1\u05D9\u05E1\u05DE\u05D4',
    phone: '\u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF',
    sendCode: '\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3',
    sendingCode: '...\u05E9\u05D5\u05DC\u05D7',
    otpCode: '\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA',
    verify: '\u05D0\u05DE\u05EA',
    verifying: '...\u05DE\u05D0\u05DE\u05EA',
    phoneVerified: '\u05DE\u05E1\u05E4\u05E8 \u05D0\u05D5\u05DE\u05EA',
    signUp: '\u05D4\u05E8\u05E9\u05DE\u05D4',
    signingUp: '...\u05D9\u05D5\u05E6\u05E8',
    alreadyHaveAccount: '\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05D7\u05E9\u05D1\u05D5\u05DF?',
    signIn: '\u05D4\u05EA\u05D7\u05D1\u05E8',
    errorDefault: '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D4\u05E8\u05E9\u05DE\u05D4',
    errorFileType: '\u05E8\u05E7 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA JPEG, PNG \u05D5-WebP \u05DE\u05D5\u05EA\u05E8\u05D5\u05EA.',
    errorFileSize: '\u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05E7\u05D8\u05E0\u05D4 \u05DE-5MB.',
    errorEmailTaken: '\u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D4\u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E8\u05E9\u05D5\u05DD',
    errorUsernameTaken: '\u05E9\u05DD \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05D4\u05D6\u05D4 \u05DB\u05D1\u05E8 \u05EA\u05E4\u05D5\u05E1',
    errorPhoneRequired: '\u05D0\u05DE\u05EA \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D8\u05DC\u05E4\u05D5\u05DF \u05DC\u05E4\u05E0\u05D9 \u05D4\u05DE\u05E9\u05DA',
    checkEmail: '\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E9\u05DC\u05DA',
    checkEmailDesc: '\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E0\u05E9\u05DC\u05D7 \u05DC\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E9\u05DC\u05DA.',
  },
  es: {
    title: 'Crear cuenta',
    subtitle: '\u00DAnete a ShaPop y empieza a comprar o vender en vivo',
    continueApple: 'Continuar con Apple',
    continueGoogle: 'Continuar con Google',
    or: 'o',
    username: 'Nombre de usuario',
    displayName: 'Nombre visible',
    email: 'Correo electr\u00F3nico',
    password: 'Contrase\u00F1a',
    phone: 'Telefono',
    sendCode: 'Enviar codigo',
    sendingCode: 'Enviando...',
    otpCode: 'Codigo de verificacion',
    verify: 'Verificar',
    verifying: 'Verificando...',
    phoneVerified: 'Numero verificado',
    signUp: 'Registrarse',
    signingUp: 'Creando...',
    alreadyHaveAccount: '\u00BFYa tienes cuenta?',
    signIn: 'Iniciar sesi\u00F3n',
    errorDefault: 'Error de registro',
    errorFileType: 'Solo se permiten imagenes JPEG, PNG y WebP.',
    errorFileSize: 'La imagen debe pesar menos de 5MB.',
    errorEmailTaken: 'Este correo ya esta registrado',
    errorUsernameTaken: 'Este nombre de usuario ya esta en uso',
    errorPhoneRequired: 'Verifica tu numero de telefono antes de continuar',
    checkEmail: 'Revisa tu correo',
    checkEmailDesc: 'Se ha enviado un enlace de confirmacion a tu correo electronico.',
  },
}

const inputStyle = {
  width: '100%', padding: '16px 18px', borderRadius: '14px',
  backgroundColor: '#111', border: '1.5px solid #222',
  fontSize: '17px', color: '#fff', outline: 'none',
  boxSizing: 'border-box' as const, fontFamily: 'inherit',
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, loading: authLoading, signUp, signInWithGoogle, signInWithApple } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr

  // Phone + OTP state
  const [phonePrefix, setPhonePrefix] = useState('+33')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  const fullPhone = `${phonePrefix}${phoneLocal.replace(/^0+/, '')}`

  // Redirect when user becomes authenticated (OAuth callback)
  useEffect(() => {
    if (!authLoading && user) {
      sessionStorage.setItem('shapop_fresh_login', '1')
      navigate('/')
    }
  }, [user, authLoading, navigate])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(c.errorFileType)
      return
    }
    if (file.size > MAX_SIZE) {
      setError(c.errorFileSize)
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSendOtp = async () => {
    setOtpError('')
    if (!phoneLocal || phoneLocal.length < 4) {
      setOtpError('Numero invalide')
      return
    }
    setOtpLoading(true)
    try {
      const res = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error || 'Erreur')
        return
      }
      setOtpSent(true)
    } catch {
      setOtpError('Erreur reseau')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Code a 6 chiffres requis')
      return
    }
    setOtpLoading(true)
    try {
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error || 'Erreur')
        return
      }
      if (data.verified) {
        setPhoneVerified(true)
      } else {
        setOtpError(data.error || 'Code incorrect')
      }
    } catch {
      setOtpError('Erreur reseau')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Phone must be verified
    if (!phoneVerified) {
      setError(c.errorPhoneRequired)
      return
    }

    setLoading(true)
    try {
      // Check banned before signup
      const banRes = await apiFetch('/api/auth/check-banned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: fullPhone }),
      })
      const banData = await banRes.json()
      if (banData.banned) {
        setError(banData.reason || 'Inscription bloquee')
        setLoading(false)
        return
      }

      await signUp(email, password, username, displayName, fullPhone)

      // Check if a session exists (email confirmation may be required)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session means email confirmation is required
        setConfirmEmail(true)
        setLoading(false)
        return
      }

      // Upload avatar if selected
      if (avatarFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = avatarFile.name.split('.').pop()
          const path = `${user.id}/avatar.${ext}`
          await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
        }
      }
      sessionStorage.setItem('shapop_fresh_login', '1')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : c.errorDefault
      if (/already registered|User already registered/i.test(msg)) {
        setError(c.errorEmailTaken)
      } else if (/unique|duplicate/i.test(msg)) {
        setError(c.errorUsernameTaken)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (confirmEmail) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '24px 0 12px', textAlign: 'center' }}>
          {c.checkEmail}
        </h1>
        <p style={{ fontSize: '16px', color: '#999', textAlign: 'center', lineHeight: 1.5, maxWidth: '300px' }}>
          {c.checkEmailDesc}
        </p>
        <Link to="/login" style={{
          marginTop: '32px', color: '#F0908A', fontWeight: 600, fontSize: '16px', textDecoration: 'none',
        }}>
          {c.signIn}
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
      padding: '0 24px', paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: '120px',
    }}>

      {/* Logo + Title */}
      <div style={{ paddingTop: '48px', marginBottom: '32px' }}>
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

      {/* Registration form */}
      <form onSubmit={handleSubmit}>
        {/* Avatar picker */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100px', height: '100px', borderRadius: '50%',
              backgroundColor: '#1A1A1A', border: '2px dashed #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Photo</div>
              </div>
            )}
            {/* Camera badge */}
            <div style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#F0908A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #000',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
              {c.username}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              required
              style={{
                width: '100%', padding: '16px 14px', borderRadius: '14px',
                backgroundColor: '#111', border: '1.5px solid #222',
                fontSize: '16px', color: '#fff', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
              {c.displayName}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Alex"
              required
              style={{
                width: '100%', padding: '16px 14px', borderRadius: '14px',
                backgroundColor: '#111', border: '1.5px solid #222',
                fontSize: '16px', color: '#fff', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
            {c.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
            {c.password}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              style={{ ...inputStyle, paddingRight: '48px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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

        {/* Phone + OTP section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#999', marginBottom: '8px' }}>
            {c.phone}
          </label>

          {phoneVerified ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '14px',
              backgroundColor: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.3)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ color: '#22C55E', fontWeight: 600, fontSize: '15px' }}>
                {c.phoneVerified} ({fullPhone})
              </span>
            </div>
          ) : (
            <>
              {/* Phone input with prefix selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: otpSent ? '12px' : '0' }}>
                <select
                  value={phonePrefix}
                  onChange={e => setPhonePrefix(e.target.value)}
                  style={{
                    padding: '16px 8px', borderRadius: '14px',
                    backgroundColor: '#111', border: '1.5px solid #222',
                    fontSize: '15px', color: '#fff', outline: 'none',
                    fontFamily: 'inherit', minWidth: '95px',
                  }}
                >
                  {COUNTRY_PREFIXES.map(p => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneLocal}
                  onChange={e => setPhoneLocal(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="612345678"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !phoneLocal}
                  style={{
                    padding: '14px 16px', borderRadius: '14px',
                    backgroundColor: '#F0908A', border: 'none',
                    color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    opacity: (otpLoading || !phoneLocal) ? 0.5 : 1,
                  }}
                >
                  {otpLoading && !otpSent ? c.sendingCode : c.sendCode}
                </button>
              </div>

              {/* OTP error */}
              {otpError && (
                <div style={{ color: '#F87171', fontSize: '13px', marginTop: '6px', marginBottom: '6px' }}>
                  {otpError}
                </div>
              )}

              {/* OTP code input */}
              {otpSent && !phoneVerified && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    style={{ ...inputStyle, flex: 1, letterSpacing: '8px', textAlign: 'center', fontSize: '22px' }}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length !== 6}
                    style={{
                      padding: '14px 20px', borderRadius: '14px',
                      backgroundColor: '#22C55E', border: 'none',
                      color: '#fff', fontSize: '15px', fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      opacity: (otpLoading || otpCode.length !== 6) ? 0.5 : 1,
                    }}
                  >
                    {otpLoading ? c.verifying : c.verify}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !phoneVerified}
          style={{
            width: '100%', padding: '17px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
            color: '#fff', fontSize: '17px', fontWeight: 700, border: 'none',
            cursor: 'pointer', opacity: (loading || !phoneVerified) ? 0.5 : 1,
            boxShadow: '0 6px 24px rgba(240,144,138,0.3)',
            letterSpacing: '0.2px',
          }}
        >
          {loading ? c.signingUp : c.signUp}
        </button>
      </form>

      {/* Link to login */}
      <p style={{ textAlign: 'center', fontSize: '15px', color: '#666', marginTop: '32px' }}>
        {c.alreadyHaveAccount}{' '}
        <Link to="/login" style={{ color: '#F0908A', fontWeight: 600, textDecoration: 'none' }}>
          {c.signIn}
        </Link>
      </p>
    </div>
  )
}

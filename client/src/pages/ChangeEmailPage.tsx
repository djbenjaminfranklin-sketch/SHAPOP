import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'

type Lang = ReturnType<typeof getLang>

const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

export default function ChangeEmailPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = getLang()

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
    if (!newEmail) {
      showToast(tx('Veuillez entrer une adresse e-mail', 'Please enter an email address', 'נא להזין כתובת אימייל', 'Por favor ingrese una direccion de correo', lang), 'error')
      return
    }
    if (!password) {
      showToast(tx('Veuillez entrer votre mot de passe', 'Please enter your password', 'נא להזין את הסיסמה', 'Por favor ingrese su contrasena', lang), 'error')
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
        showToast(tx('Mot de passe incorrect', 'Wrong password', 'סיסמה שגויה', 'Contrasena incorrecta', lang), 'error')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      showToast(
        tx(
          'Un email de confirmation a ete envoye',
          'A confirmation email has been sent',
          'נשלח אימייל אישור',
          'Se ha enviado un correo de confirmacion',
          lang
        ),
        'success'
      )
    } catch (err: any) {
      showToast(err.message || tx('Une erreur est survenue', 'An error occurred', 'אירעה שגיאה', 'Ocurrio un error', lang), 'error')
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
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
          {tx("Modifier l'adresse e-mail", 'Change email address', 'שנה כתובת אימייל', 'Cambiar direccion de correo', lang)}
        </h1>
      </div>

      {/* Form */}
      <div style={{ padding: '24px 20px' }}>
        {/* Current email */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {tx('Adresse e-mail actuelle', 'Current email address', 'כתובת אימייל נוכחית', 'Direccion de correo actual', lang)}
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
          {tx('Nouvelle adresse e-mail', 'New email address', 'כתובת אימייל חדשה', 'Nueva direccion de correo', lang)}
        </label>
        <input
          type="email"
          inputMode="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder={tx('Entrez votre nouvelle adresse', 'Enter your new email', 'הזן כתובת חדשה', 'Ingrese su nuevo correo', lang)}
          style={{ ...inputStyle, marginBottom: '20px' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#F0908A'; setTimeout(() => { (e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
        />

        {/* Password for verification */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {tx('Mot de passe (verification)', 'Password (verification)', 'סיסמה (אימות)', 'Contrasena (verificacion)', lang)}
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={tx('Entrez votre mot de passe', 'Enter your password', 'הזן את סיסמתך', 'Ingrese su contrasena', lang)}
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
            ? tx('Mise a jour...', 'Updating...', 'מעדכן...', 'Actualizando...', lang)
            : tx('Mettre a jour', 'Update', 'עדכן', 'Actualizar', lang)
          }
        </button>
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

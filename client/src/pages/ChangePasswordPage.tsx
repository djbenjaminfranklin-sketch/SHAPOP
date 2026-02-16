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

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

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
      ? tx('Faible', 'Weak', 'חלשה', 'Debil', lang)
      : strengthLevel === 2
        ? tx('Moyenne', 'Medium', 'בינונית', 'Media', lang)
        : tx('Forte', 'Strong', 'חזקה', 'Fuerte', lang)

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast(tx('Veuillez remplir tous les champs', 'Please fill in all fields', 'נא למלא את כל השדות', 'Por favor complete todos los campos', lang), 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast(tx('Les mots de passe ne correspondent pas', 'Passwords do not match', 'הסיסמאות אינן תואמות', 'Las contrasenas no coinciden', lang), 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast(tx('Le mot de passe doit contenir au moins 6 caracteres', 'Password must be at least 6 characters', 'הסיסמה חייבת להכיל לפחות 6 תווים', 'La contrasena debe tener al menos 6 caracteres', lang), 'error')
      return
    }

    setLoading(true)
    try {
      // Verify current password by signing in (uses same session)
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      })
      if (verifyError) {
        showToast(tx('Le mot de passe actuel est incorrect', 'Current password is incorrect', 'הסיסמה הנוכחית שגויה', 'La contrasena actual es incorrecta', lang), 'error')
        setLoading(false)
        return
      }

      // Small delay to let the session settle after re-auth
      await new Promise(r => setTimeout(r, 200))

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast(tx('Mot de passe mis a jour avec succes', 'Password updated successfully', 'הסיסמה עודכנה בהצלחה', 'Contrasena actualizada correctamente', lang), 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate(-1), 1500)
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('same_password') || msg.includes('different')) {
        showToast(tx('Le nouveau mot de passe doit etre different de l\'ancien', 'New password must be different from current', 'הסיסמה החדשה חייבת להיות שונה מהנוכחית', 'La nueva contrasena debe ser diferente', lang), 'error')
      } else {
        showToast(msg || tx('Une erreur est survenue', 'An error occurred', 'אירעה שגיאה', 'Ocurrio un error', lang), 'error')
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
          {tx('Modifier le mot de passe', 'Change password', 'שנה סיסמה', 'Cambiar contrasena', lang)}
        </h1>
      </div>

      {/* Form */}
      <div style={{ padding: '24px 20px' }}>
        {/* Current password */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {tx('Mot de passe actuel', 'Current password', 'סיסמה נוכחית', 'Contrasena actual', lang)}
        </label>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder={tx('Entrez votre mot de passe actuel', 'Enter your current password', 'הזן את סיסמתך הנוכחית', 'Ingrese su contrasena actual', lang)}
            style={{ ...inputStyle, paddingRight: '48px' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
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

        {/* New password */}
        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          {tx('Nouveau mot de passe', 'New password', 'סיסמה חדשה', 'Nueva contrasena', lang)}
        </label>
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder={tx('Entrez votre nouveau mot de passe', 'Enter your new password', 'הזן סיסמה חדשה', 'Ingrese su nueva contrasena', lang)}
            style={{ ...inputStyle, paddingRight: '48px' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
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
          {tx('Confirmer le mot de passe', 'Confirm password', 'אשר סיסמה', 'Confirmar contrasena', lang)}
        </label>
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={tx('Confirmez votre nouveau mot de passe', 'Confirm your new password', 'אשר את סיסמתך החדשה', 'Confirme su nueva contrasena', lang)}
            style={{ ...inputStyle, paddingRight: '48px' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1A1A1A' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
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

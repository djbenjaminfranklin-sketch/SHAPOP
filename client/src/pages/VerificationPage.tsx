import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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

type VerifStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export default function VerificationPage() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = getLang()
  usePageTitle(tx('Verification', 'Verification', 'אימות', 'Verificacion', lang))

  const selfieInputRef = useRef<HTMLInputElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<VerifStatus>('unverified')
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null)
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch current verification status
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('selfie_url, id_document_url, identity_status')
        .eq('id', user.id)
        .single()
      if (data) {
        setSelfieUrl(data.selfie_url || null)
        setIdDocUrl(data.id_document_url || null)
        setStatus((data.identity_status as VerifStatus) || 'unverified')
      }
      setLoading(false)
    }
    fetch()
  }, [user])

  const uploadFile = async (file: File, type: 'selfie' | 'id_document') => {
    if (!user) return null
    const MAX_SIZE = 10 * 1024 * 1024
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) return null
    if (file.size > MAX_SIZE) return null

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${type}.${ext}`
    const { error } = await supabase.storage
      .from('verification')
      .upload(path, file, { upsert: true })
    if (error) {
      console.error('Upload error:', error)
      return null
    }
    const { data: urlData } = supabase.storage.from('verification').getPublicUrl(path)
    return urlData.publicUrl + '?t=' + Date.now()
  }

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSelfie(true)
    const url = await uploadFile(file, 'selfie')
    if (url) {
      setSelfieUrl(url)
      const { error } = await supabase.from('profiles').update({ selfie_url: url }).eq('id', user!.id)
      if (error) console.error('Failed to save selfie URL:', error)
    }
    setUploadingSelfie(false)
  }

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingId(true)
    const url = await uploadFile(file, 'id_document')
    if (url) {
      setIdDocUrl(url)
      const { error } = await supabase.from('profiles').update({ id_document_url: url }).eq('id', user!.id)
      if (error) console.error('Failed to save ID document URL:', error)
    }
    setUploadingId(false)
  }

  const handleSubmit = async () => {
    if (!selfieUrl || !idDocUrl || !session?.access_token) return
    setSubmitting(true)
    const { error } = await supabase.from('profiles').update({ identity_status: 'pending' }).eq('id', user!.id)
    if (error) {
      console.error('Failed to submit verification:', error)
      setSubmitting(false)
      return
    }
    setStatus('pending')
    setSubmitting(false)
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const statusConfig: Record<VerifStatus, { color: string; bg: string; label: string; icon: string }> = {
    unverified: {
      color: '#888', bg: '#222',
      label: tx('Non verifie', 'Unverified', 'לא מאומת', 'No verificado', lang),
      icon: '?',
    },
    pending: {
      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
      label: tx('En cours de verification', 'Verification pending', 'ממתין לאימות', 'Verificacion pendiente', lang),
      icon: '...',
    },
    verified: {
      color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
      label: tx('Verifie', 'Verified', 'מאומת', 'Verificado', lang),
      icon: '!',
    },
    rejected: {
      color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
      label: tx('Rejete — veuillez reessayer', 'Rejected — please try again', 'נדחה — נסה שנית', 'Rechazado — intente de nuevo', lang),
      icon: 'x',
    },
  }

  const sc = statusConfig[status]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid #1A1A1A',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          {tx('Verification d\'identite', 'Identity verification', 'אימות זהות', 'Verificacion de identidad', lang)}
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Status badge */}
        <div style={{
          backgroundColor: sc.bg, borderRadius: '14px', padding: '20px',
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: status === 'verified' ? 'rgba(34,197,94,0.2)' : '#1A1A1A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {status === 'verified' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            ) : status === 'pending' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            ) : status === 'rejected' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            )}
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: sc.color, margin: 0 }}>{sc.label}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0', lineHeight: 1.4 }}>
              {status === 'verified'
                ? tx('Votre identite est confirmee. Badge verifie actif.', 'Your identity is confirmed. Verified badge active.', 'הזהות שלך אומתה. תג מאומת פעיל.', 'Tu identidad esta confirmada. Insignia verificada activa.', lang)
                : tx('Prends un selfie et ajoute une piece d\'identite pour obtenir le badge verifie.', 'Take a selfie and add an ID to get the verified badge.', 'צלם סלפי והוסף תעודה מזהה כדי לקבל תג מאומת.', 'Toma un selfie y agrega una identificacion para obtener la insignia verificada.', lang)}
            </p>
          </div>
        </div>

        {/* Step 1: Selfie */}
        <div style={{
          backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '20px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: selfieUrl ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {selfieUrl ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>1</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {tx('Selfie', 'Selfie', 'סלפי', 'Selfie', lang)}
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                {tx('Photo claire de votre visage', 'Clear photo of your face', 'תמונה ברורה של הפנים שלך', 'Foto clara de tu rostro', lang)}
              </p>
            </div>
          </div>

          {selfieUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={selfieUrl} alt="Selfie" loading="lazy" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <button
                onClick={() => selfieInputRef.current?.click()}
                disabled={status === 'pending' || status === 'verified'}
                style={{
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid #333',
                  backgroundColor: 'transparent', color: '#888', fontSize: '13px',
                  fontWeight: 600, cursor: status === 'pending' || status === 'verified' ? 'default' : 'pointer',
                  opacity: status === 'pending' || status === 'verified' ? 0.4 : 1,
                }}
              >
                {tx('Changer', 'Change', 'שנה', 'Cambiar', lang)}
              </button>
            </div>
          ) : (
            <button
              onClick={() => selfieInputRef.current?.click()}
              disabled={uploadingSelfie}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: '2px dashed #333', backgroundColor: 'transparent',
                color: '#F0908A', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
                opacity: uploadingSelfie ? 0.5 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {uploadingSelfie
                ? tx('Envoi...', 'Uploading...', 'מעלה...', 'Subiendo...', lang)
                : tx('Prendre un selfie', 'Take a selfie', 'צלם סלפי', 'Tomar un selfie', lang)}
            </button>
          )}
          <input ref={selfieInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleSelfieUpload} />
        </div>

        {/* Step 2: ID Document */}
        <div style={{
          backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: idDocUrl ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {idDocUrl ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>2</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {tx('Piece d\'identite', 'ID Document', 'תעודה מזהה', 'Documento de identidad', lang)}
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                {tx('Carte d\'identite, passeport ou permis', 'ID card, passport or driver\'s license', 'תעודת זהות, דרכון או רישיון', 'DNI, pasaporte o licencia', lang)}
              </p>
            </div>
          </div>

          {idDocUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={idDocUrl} alt="ID" loading="lazy" style={{ width: '80px', height: '52px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <button
                onClick={() => idInputRef.current?.click()}
                disabled={status === 'pending' || status === 'verified'}
                style={{
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid #333',
                  backgroundColor: 'transparent', color: '#888', fontSize: '13px',
                  fontWeight: 600, cursor: status === 'pending' || status === 'verified' ? 'default' : 'pointer',
                  opacity: status === 'pending' || status === 'verified' ? 0.4 : 1,
                }}
              >
                {tx('Changer', 'Change', 'שנה', 'Cambiar', lang)}
              </button>
            </div>
          ) : (
            <button
              onClick={() => idInputRef.current?.click()}
              disabled={uploadingId}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: '2px dashed #333', backgroundColor: 'transparent',
                color: '#F0908A', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
                opacity: uploadingId ? 0.5 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/>
                <line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/>
              </svg>
              {uploadingId
                ? tx('Envoi...', 'Uploading...', 'מעלה...', 'Subiendo...', lang)
                : tx('Ajouter une piece d\'identite', 'Add ID document', 'הוסף תעודה מזהה', 'Agregar documento', lang)}
            </button>
          )}
          <input ref={idInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIdUpload} />
        </div>

        {/* Submit button */}
        {(status === 'unverified' || status === 'rejected') && (
          <button
            onClick={handleSubmit}
            disabled={!selfieUrl || !idDocUrl || submitting}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: selfieUrl && idDocUrl
                ? 'linear-gradient(135deg, #F0908A, #E8344E)'
                : '#333',
              border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700,
              cursor: selfieUrl && idDocUrl && !submitting ? 'pointer' : 'default',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting
              ? tx('Envoi en cours...', 'Submitting...', 'שולח...', 'Enviando...', lang)
              : tx('Soumettre la verification', 'Submit verification', 'שלח אימות', 'Enviar verificacion', lang)}
          </button>
        )}

        {/* Info text */}
        <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
          {tx(
            'Vos documents sont securises et utilises uniquement pour verifier votre identite. Ils ne seront pas partages.',
            'Your documents are secured and only used for identity verification. They will not be shared.',
            'המסמכים שלך מאובטחים ומשמשים רק לאימות זהות. הם לא ישותפו.',
            'Sus documentos estan protegidos y solo se usan para verificar su identidad. No seran compartidos.',
            lang
          )}
        </p>
      </div>
    </div>
  )
}

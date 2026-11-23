import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type VerifText = Record<'pageTitle' | 'unverified' | 'pending' | 'verified' | 'rejected' | 'title' | 'confirmed' | 'intro' | 'selfie' | 'selfieHint' | 'change' | 'uploading' | 'takeSelfie' | 'idDoc' | 'idHint' | 'addId' | 'submitting' | 'submit' | 'privacy' | 'goBack' | 'idAlt', string>

const T: Localized<VerifText> = {
  en: {
    pageTitle: 'Verification',
    unverified: 'Not verified',
    pending: 'Verification pending',
    verified: 'Verified',
    rejected: 'Rejected — please try again',
    title: 'Identity verification',
    confirmed: 'Your identity is confirmed. Your verified badge is active.',
    intro: 'Take a selfie and add an ID to get the verified badge.',
    selfie: 'Selfie',
    selfieHint: 'A clear photo of your face',
    change: 'Change',
    uploading: 'Uploading...',
    takeSelfie: 'Take a selfie',
    idDoc: 'ID document',
    idHint: 'ID card, passport or driver’s license',
    addId: 'Add an ID document',
    submitting: 'Submitting...',
    submit: 'Submit for verification',
    privacy: 'Your documents are stored securely and only used to verify your identity. They’re never shared.',
    goBack: 'Go back',
    idAlt: 'Your ID document',
  },
  fr: {
    pageTitle: 'Vérification',
    unverified: 'Non vérifié',
    pending: 'Vérification en cours',
    verified: 'Vérifié',
    rejected: 'Refusé — réessaie',
    title: 'Vérification d’identité',
    confirmed: 'Ton identité est confirmée. Ton badge vérifié est actif.',
    intro: 'Prends un selfie et ajoute une pièce d’identité pour obtenir le badge vérifié.',
    selfie: 'Selfie',
    selfieHint: 'Une photo nette de ton visage',
    change: 'Changer',
    uploading: 'Envoi...',
    takeSelfie: 'Prendre un selfie',
    idDoc: 'Pièce d’identité',
    idHint: 'Carte d’identité, passeport ou permis de conduire',
    addId: 'Ajouter une pièce d’identité',
    submitting: 'Envoi en cours...',
    submit: 'Envoyer pour vérification',
    privacy: 'Tes documents sont sécurisés et servent uniquement à vérifier ton identité. Ils ne sont jamais partagés.',
    goBack: 'Retour',
    idAlt: 'Ta pièce d’identité',
  },
  es: {
    pageTitle: 'Verificación',
    unverified: 'Sin verificar',
    pending: 'Verificación pendiente',
    verified: 'Verificado',
    rejected: 'Rechazado — vuelve a intentarlo',
    title: 'Verificación de identidad',
    confirmed: 'Tu identidad está confirmada. Tu insignia de verificado está activa.',
    intro: 'Hazte un selfie y añade un documento de identidad para conseguir la insignia de verificado.',
    selfie: 'Selfie',
    selfieHint: 'Una foto nítida de tu cara',
    change: 'Cambiar',
    uploading: 'Subiendo...',
    takeSelfie: 'Hacerme un selfie',
    idDoc: 'Documento de identidad',
    idHint: 'DNI, pasaporte o permiso de conducir',
    addId: 'Añadir documento de identidad',
    submitting: 'Enviando...',
    submit: 'Enviar para verificación',
    privacy: 'Tus documentos se guardan de forma segura y solo se usan para verificar tu identidad. Nunca se comparten.',
    goBack: 'Volver',
    idAlt: 'Tu documento de identidad',
  },
  ru: {
    pageTitle: 'Верификация',
    unverified: 'Не подтверждён',
    pending: 'Проверка идёт',
    verified: 'Подтверждён',
    rejected: 'Отклонено — попробуй ещё раз',
    title: 'Подтверждение личности',
    confirmed: 'Твоя личность подтверждена. Значок «Проверено» активен.',
    intro: 'Сделай селфи и добавь документ, чтобы получить значок «Проверено».',
    selfie: 'Селфи',
    selfieHint: 'Чёткое фото твоего лица',
    change: 'Изменить',
    uploading: 'Загружаем...',
    takeSelfie: 'Сделать селфи',
    idDoc: 'Документ',
    idHint: 'Удостоверение личности, паспорт или водительские права',
    addId: 'Добавить документ',
    submitting: 'Отправляем...',
    submit: 'Отправить на проверку',
    privacy: 'Твои документы надёжно защищены и используются только для подтверждения личности. Мы никому их не передаём.',
    goBack: 'Назад',
    idAlt: 'Твой документ',
  },
  he: {
    pageTitle: 'אימות',
    unverified: 'לא מאומת',
    pending: 'האימות בבדיקה',
    verified: 'מאומת',
    rejected: 'נדחה — נסו שוב',
    title: 'אימות זהות',
    confirmed: 'הזהות שלך אומתה. תג המאומת פעיל.',
    intro: 'צלמו סלפי והוסיפו תעודה מזהה כדי לקבל תג מאומת.',
    selfie: 'סלפי',
    selfieHint: 'תמונה ברורה של הפנים',
    change: 'החלפה',
    uploading: 'מעלים...',
    takeSelfie: 'צילום סלפי',
    idDoc: 'תעודה מזהה',
    idHint: 'תעודת זהות, דרכון או רישיון נהיגה',
    addId: 'הוספת תעודה מזהה',
    submitting: 'שולחים...',
    submit: 'שליחה לאימות',
    privacy: 'המסמכים שלך מאובטחים ומשמשים רק לאימות הזהות. הם לא מועברים לאף אחד.',
    goBack: 'חזרה',
    idAlt: 'התעודה המזהה שלך',
  },
}

type VerifStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export default function VerificationPage() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const c = tr(T)
  usePageTitle(c.pageTitle)

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
      label: c.unverified,
      icon: '?',
    },
    pending: {
      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
      label: c.pending,
      icon: '...',
    },
    verified: {
      color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
      label: c.verified,
      icon: '!',
    },
    rejected: {
      color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
      label: c.rejected,
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
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          {c.title}
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
                ? c.confirmed
                : c.intro}
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
                {c.selfie}
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                {c.selfieHint}
              </p>
            </div>
          </div>

          {selfieUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={selfieUrl} alt={c.selfie} loading="lazy" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
                {c.change}
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
                ? c.uploading
                : c.takeSelfie}
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
                {c.idDoc}
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                {c.idHint}
              </p>
            </div>
          </div>

          {idDocUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={idDocUrl} alt={c.idAlt} loading="lazy" style={{ width: '80px', height: '52px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
                {c.change}
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
                ? c.uploading
                : c.addId}
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
              ? c.submitting
              : c.submit}
          </button>
        )}

        {/* Info text */}
        <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
          {c.privacy}
        </p>
      </div>
    </div>
  )
}

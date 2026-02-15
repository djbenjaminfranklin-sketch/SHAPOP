import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'

const content = {
  en: {
    title: 'Contact Us',
    subtitle: 'How can we help you?',
    topics: [
      { id: 'order', label: 'Order issue' },
      { id: 'account', label: 'Account problem' },
      { id: 'payment', label: 'Payment question' },
      { id: 'seller', label: 'Seller support' },
      { id: 'bug', label: 'Report a bug' },
      { id: 'other', label: 'Other' },
    ],
    messagePlaceholder: 'Describe your issue...',
    send: 'Send message',
    sent: 'Message sent!',
    sentDesc: 'We\'ll get back to you within 24 hours at your registered email address.',
    back: 'Back to app',
    email: 'Or email us directly:',
    hours: 'Response time: within 24 hours',
  },
  he: {
    title: '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8',
    subtitle: '\u05D0\u05D9\u05DA \u05E0\u05D5\u05DB\u05DC \u05DC\u05E2\u05D6\u05D5\u05E8?',
    topics: [
      { id: 'order', label: '\u05D1\u05E2\u05D9\u05D4 \u05D1\u05D4\u05D6\u05DE\u05E0\u05D4' },
      { id: 'account', label: '\u05D1\u05E2\u05D9\u05D4 \u05D1\u05D7\u05E9\u05D1\u05D5\u05DF' },
      { id: 'payment', label: '\u05E9\u05D0\u05DC\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD' },
      { id: 'seller', label: '\u05EA\u05DE\u05D9\u05DB\u05D4 \u05DC\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD' },
      { id: 'bug', label: '\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E2\u05DC \u05EA\u05E7\u05DC\u05D4' },
      { id: 'other', label: '\u05D0\u05D7\u05E8' },
    ],
    messagePlaceholder: '\u05EA\u05D0\u05E8\u05D5 \u05D0\u05EA \u05D4\u05D1\u05E2\u05D9\u05D4...',
    send: '\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4',
    sent: '\u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D4!',
    sentDesc: '\u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DA \u05EA\u05D5\u05DA 24 \u05E9\u05E2\u05D5\u05EA \u05DC\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D4\u05E8\u05E9\u05D5\u05DD.',
    back: '\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4',
    email: '\u05D0\u05D5 \u05E9\u05DC\u05D7\u05D5 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA:',
    hours: '\u05D6\u05DE\u05DF \u05EA\u05D2\u05D5\u05D1\u05D4: \u05E2\u05D3 24 \u05E9\u05E2\u05D5\u05EA',
  },
  fr: {
    title: 'Nous contacter',
    subtitle: 'Comment pouvons-nous vous aider ?',
    topics: [
      { id: 'order', label: 'Problème de commande' },
      { id: 'account', label: 'Problème de compte' },
      { id: 'payment', label: 'Question de paiement' },
      { id: 'seller', label: 'Support vendeur' },
      { id: 'bug', label: 'Signaler un bug' },
      { id: 'other', label: 'Autre' },
    ],
    messagePlaceholder: 'Décrivez votre problème...',
    send: 'Envoyer le message',
    sent: 'Message envoyé !',
    sentDesc: 'Nous vous répondrons dans les 24 heures à votre adresse e-mail enregistrée.',
    back: 'Retour à l\'application',
    email: 'Ou écrivez-nous directement :',
    hours: 'Délai de réponse : sous 24 heures',
  },
  es: {
    title: 'Contactanos',
    subtitle: 'Como podemos ayudarte?',
    topics: [
      { id: 'order', label: 'Problema con pedido' },
      { id: 'account', label: 'Problema de cuenta' },
      { id: 'payment', label: 'Pregunta de pago' },
      { id: 'seller', label: 'Soporte vendedor' },
      { id: 'bug', label: 'Reportar un error' },
      { id: 'other', label: 'Otro' },
    ],
    messagePlaceholder: 'Describe tu problema...',
    send: 'Enviar mensaje',
    sent: 'Mensaje enviado!',
    sentDesc: 'Te responderemos en 24 horas a tu email registrado.',
    back: 'Volver a la app',
    email: 'O escribenos directamente:',
    hours: 'Tiempo de respuesta: hasta 24 horas',
  },
}

export default function ContactPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!topic || !message.trim()) return
    // In production, this would send to Supabase or an API
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1a3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{c.sent}</h2>
        <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '32px', maxWidth: '280px' }}>{c.sentDesc}</p>
        <button
          onClick={() => navigate('/profile')}
          style={{ padding: '14px 32px', backgroundColor: '#F0908A', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          {c.back}
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>{c.subtitle}</p>

        {/* Topic selection */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {c.topics.map(t => (
            <button
              key={t.id}
              onClick={() => setTopic(t.id)}
              style={{
                padding: '8px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                backgroundColor: topic === t.id ? '#F0908A' : '#1A1A1A',
                color: topic === t.id ? '#fff' : '#aaa',
                border: topic === t.id ? '1px solid #F0908A' : '1px solid #333',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={c.messagePlaceholder}
          rows={5}
          style={{
            width: '100%', padding: '14px', backgroundColor: '#111', border: '1px solid #222',
            borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none', resize: 'none',
            boxSizing: 'border-box', marginBottom: '16px',
          }}
        />

        {/* User info note */}
        {user && (
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
            {lang === 'he' ? '\u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05EA\u05D9\u05E9\u05DC\u05D7 \u05DE:' : lang === 'fr' ? 'Le message sera envoyé depuis :' : lang === 'es' ? 'Mensaje enviado desde:' : 'Message will be sent from:'} {user.email}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={!topic || !message.trim()}
          style={{
            width: '100%', padding: '14px', backgroundColor: (!topic || !message.trim()) ? '#333' : '#F0908A',
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
            cursor: (!topic || !message.trim()) ? 'default' : 'pointer',
          }}
        >
          {c.send}
        </button>

        {/* Direct email */}
        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#111', borderRadius: '12px' }}>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{c.email}</p>
          <p style={{ fontSize: '15px', color: '#F0908A', fontWeight: 600 }}>shapopcontact@gmail.com</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{c.hours}</p>
        </div>
      </div>
    </div>
  )
}

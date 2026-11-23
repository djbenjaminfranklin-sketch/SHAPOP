import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface ContactText {
  tooLong: string
  sendFailed: string
  sending: string
  sentFrom: string
  goBack: string
  title: string
  subtitle: string
  topics: { id: string; label: string }[]
  messagePlaceholder: string
  send: string
  sent: string
  sentDesc: string
  back: string
  email: string
  hours: string
}

const content: Localized<ContactText> = {
  en: {
    tooLong: 'Message too long (2,000 characters max)',
    sendFailed: 'Couldn\'t send your message. Check your connection and try again.',
    sending: 'Sending…',
    sentFrom: 'Your message will be sent from:',
    goBack: 'Go back',
    title: 'Contact us',
    subtitle: 'How can we help?',
    topics: [
      { id: 'order', label: 'Order issue' },
      { id: 'account', label: 'Account problem' },
      { id: 'payment', label: 'Payment question' },
      { id: 'seller', label: 'Seller support' },
      { id: 'bug', label: 'Report a bug' },
      { id: 'other', label: 'Other' },
    ],
    messagePlaceholder: 'Describe your issue…',
    send: 'Send message',
    sent: 'Message sent!',
    sentDesc: 'We\'ll get back to you within 24 hours at your registered email address.',
    back: 'Back to the app',
    email: 'Or email us directly:',
    hours: 'Response time: within 24 hours',
  },
  fr: {
    tooLong: 'Message trop long (2 000 caractères max.)',
    sendFailed: 'Impossible d\'envoyer ton message. Vérifie ta connexion et réessaie.',
    sending: 'Envoi…',
    sentFrom: 'Ton message sera envoyé depuis :',
    goBack: 'Retour',
    title: 'Nous contacter',
    subtitle: 'Comment pouvons-nous t\'aider ?',
    topics: [
      { id: 'order', label: 'Problème de commande' },
      { id: 'account', label: 'Problème de compte' },
      { id: 'payment', label: 'Question de paiement' },
      { id: 'seller', label: 'Aide aux vendeurs' },
      { id: 'bug', label: 'Signaler un bug' },
      { id: 'other', label: 'Autre' },
    ],
    messagePlaceholder: 'Décris ton problème…',
    send: 'Envoyer le message',
    sent: 'Message envoyé !',
    sentDesc: 'On te répond sous 24 heures à ton adresse e-mail enregistrée.',
    back: 'Retour à l\'application',
    email: 'Ou écris-nous directement :',
    hours: 'Délai de réponse : sous 24 heures',
  },
  es: {
    tooLong: 'Mensaje demasiado largo (máx. 2000 caracteres)',
    sendFailed: 'No se pudo enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.',
    sending: 'Enviando…',
    sentFrom: 'Tu mensaje se enviará desde:',
    goBack: 'Volver',
    title: 'Contáctanos',
    subtitle: '¿Cómo podemos ayudarte?',
    topics: [
      { id: 'order', label: 'Problema con un pedido' },
      { id: 'account', label: 'Problema con la cuenta' },
      { id: 'payment', label: 'Pregunta sobre pagos' },
      { id: 'seller', label: 'Ayuda para vendedores' },
      { id: 'bug', label: 'Reportar un error' },
      { id: 'other', label: 'Otro' },
    ],
    messagePlaceholder: 'Describe tu problema…',
    send: 'Enviar mensaje',
    sent: '¡Mensaje enviado!',
    sentDesc: 'Te responderemos en menos de 24 horas en tu correo registrado.',
    back: 'Volver a la app',
    email: 'O escríbenos directamente:',
    hours: 'Tiempo de respuesta: menos de 24 horas',
  },
  ru: {
    tooLong: 'Сообщение слишком длинное (максимум 2000 символов)',
    sendFailed: 'Не удалось отправить сообщение. Проверь подключение и попробуй ещё раз.',
    sending: 'Отправка…',
    sentFrom: 'Сообщение будет отправлено с адреса:',
    goBack: 'Назад',
    title: 'Связаться с нами',
    subtitle: 'Чем мы можем помочь?',
    topics: [
      { id: 'order', label: 'Проблема с заказом' },
      { id: 'account', label: 'Проблема с аккаунтом' },
      { id: 'payment', label: 'Вопрос об оплате' },
      { id: 'seller', label: 'Помощь продавцам' },
      { id: 'bug', label: 'Сообщить об ошибке' },
      { id: 'other', label: 'Другое' },
    ],
    messagePlaceholder: 'Опиши проблему…',
    send: 'Отправить сообщение',
    sent: 'Сообщение отправлено!',
    sentDesc: 'Мы ответим в течение 24 часов на твой адрес электронной почты.',
    back: 'Вернуться в приложение',
    email: 'Или напиши нам напрямую:',
    hours: 'Время ответа: до 24 часов',
  },
  he: {
    tooLong: 'ההודעה ארוכה מדי (עד 2,000 תווים)',
    sendFailed: 'לא הצלחנו לשלוח את ההודעה. בדקו את החיבור ונסו שוב.',
    sending: 'שולח…',
    sentFrom: 'ההודעה תישלח מהכתובת:',
    goBack: 'חזרה',
    title: 'צור קשר',
    subtitle: 'איך נוכל לעזור?',
    topics: [
      { id: 'order', label: 'בעיה בהזמנה' },
      { id: 'account', label: 'בעיה בחשבון' },
      { id: 'payment', label: 'שאלה על תשלום' },
      { id: 'seller', label: 'תמיכה למוכרים' },
      { id: 'bug', label: 'דיווח על תקלה' },
      { id: 'other', label: 'אחר' },
    ],
    messagePlaceholder: 'תארו את הבעיה…',
    send: 'שליחת הודעה',
    sent: 'ההודעה נשלחה!',
    sentDesc: 'נחזור אליכם תוך 24 שעות לכתובת האימייל הרשומה.',
    back: 'חזרה לאפליקציה',
    email: 'או שלחו לנו אימייל ישירות:',
    hours: 'זמן מענה: עד 24 שעות',
  },
}

export default function ContactPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = tr(content)
  usePageTitle(c.title)
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const handleSend = async () => {
    if (!topic || !message.trim() || !user) return
    if (message.trim().length > 2000) {
      setSendError(c.tooLong)
      return
    }
    setSending(true)
    setSendError('')

    try {
      // Get user profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

      // Insert directly into Supabase (always works)
      const { error } = await supabase.from('contact_messages').insert({
        user_id: user.id,
        user_email: user.email || '',
        user_name: profile?.display_name || profile?.username || 'Unknown',
        topic,
        message: message.trim(),
        status: 'new',
      })

      if (error) throw error

      // Send email notification via Supabase Edge Function — fire and forget
      const displayName = profile?.display_name || profile?.username || 'Unknown'
      supabase.functions.invoke('send-contact-email', {
        body: { topic, message: message.trim(), user_email: user.email || '', user_name: displayName },
      }).catch(() => {}) // Email is best-effort, message is already saved

      setSent(true)
    } catch (err: unknown) {
      console.error('Contact send error:', err)
      setSendError(c.sendFailed)
    } finally {
      setSending(false)
    }
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
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            {c.sentFrom} <span dir="ltr">{user.email}</span>
          </p>
        )}

        {sendError && (
          <p style={{ fontSize: '13px', color: '#E8344E', marginBottom: '12px' }}>{sendError}</p>
        )}

        <button
          onClick={handleSend}
          disabled={!topic || !message.trim() || sending}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: (!topic || !message.trim() || sending) ? '#333' : '#F0908A',
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
            cursor: (!topic || !message.trim() || sending) ? 'default' : 'pointer',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? c.sending : c.send}
        </button>

        {/* Direct email */}
        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#111', borderRadius: '12px' }}>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{c.email}</p>
          <a href="mailto:support@shapop.app" style={{ fontSize: '15px', color: '#F0908A', fontWeight: 600, textDecoration: 'none' }} dir="ltr">support@shapop.app</a>{/* i18n-ignore */}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{c.hours}</p>
        </div>
      </div>
    </div>
  )
}

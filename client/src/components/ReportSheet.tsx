// Fenêtre « Signaler » : motif + précision facultative, envoyée au serveur (table reports),
// visible dans l'admin (page Signalements). Remplace l'ancien e-mail au support.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { tr } from '../lib/i18n'

const content = {
  en: {
    title: 'Report', subtitle: 'What is the problem? Our team checks every report.',
    reasons: { counterfeit: 'Counterfeit or fake item', scam: 'Scam or suspicious payment request', inappropriate: 'Inappropriate or shocking content', abusive: 'Abusive or harassing behaviour', prohibited: 'Prohibited item', other: 'Other' },
    details: 'Add details (optional)', send: 'Send the report', sending: 'Sending…', cancel: 'Cancel',
    done: 'Thank you, your report has been sent. Our team will look at it.', error: 'The report could not be sent. Try again.',
  },
  fr: {
    title: 'Signaler', subtitle: 'Quel est le problème ? Notre équipe examine chaque signalement.',
    reasons: { counterfeit: 'Contrefaçon ou faux article', scam: 'Arnaque ou demande de paiement suspecte', inappropriate: 'Contenu inapproprié ou choquant', abusive: 'Comportement insultant ou harcèlement', prohibited: 'Article interdit', other: 'Autre' },
    details: 'Ajoute des précisions (facultatif)', send: 'Envoyer le signalement', sending: 'Envoi…', cancel: 'Annuler',
    done: 'Merci, ton signalement est envoyé. Notre équipe va l’examiner.', error: 'Le signalement n’a pas pu être envoyé. Réessaie.',
  },
  es: {
    title: 'Denunciar', subtitle: '¿Cuál es el problema? Nuestro equipo revisa cada denuncia.',
    reasons: { counterfeit: 'Falsificación o artículo falso', scam: 'Estafa o solicitud de pago sospechosa', inappropriate: 'Contenido inapropiado o chocante', abusive: 'Comportamiento ofensivo o acoso', prohibited: 'Artículo prohibido', other: 'Otro' },
    details: 'Añade detalles (opcional)', send: 'Enviar la denuncia', sending: 'Enviando…', cancel: 'Cancelar',
    done: 'Gracias, tu denuncia se ha enviado. Nuestro equipo la revisará.', error: 'No se pudo enviar la denuncia. Inténtalo de nuevo.',
  },
  ru: {
    title: 'Пожаловаться', subtitle: 'В чём проблема? Наша команда проверяет каждую жалобу.',
    reasons: { counterfeit: 'Подделка', scam: 'Мошенничество или подозрительная просьба об оплате', inappropriate: 'Неприемлемый или шокирующий контент', abusive: 'Оскорбления или преследование', prohibited: 'Запрещённый товар', other: 'Другое' },
    details: 'Добавь подробности (необязательно)', send: 'Отправить жалобу', sending: 'Отправка…', cancel: 'Отмена',
    done: 'Спасибо, жалоба отправлена. Наша команда её рассмотрит.', error: 'Не удалось отправить жалобу. Попробуй ещё раз.',
  },
  he: {
    title: 'דיווח', subtitle: 'מה הבעיה? הצוות שלנו בודק כל דיווח.',
    reasons: { counterfeit: 'זיוף או פריט מזויף', scam: 'הונאה או בקשת תשלום חשודה', inappropriate: 'תוכן לא הולם או מזעזע', abusive: 'התנהגות פוגענית או הטרדה', prohibited: 'פריט אסור', other: 'אחר' },
    details: 'אפשר להוסיף פרטים (לא חובה)', send: 'שליחת הדיווח', sending: 'שולחים…', cancel: 'ביטול',
    done: 'תודה, הדיווח נשלח. הצוות שלנו יבדוק אותו.', error: 'לא הצלחנו לשלוח את הדיווח. נסו שוב.',
  },
}

type ReasonKey = keyof typeof content.en.reasons

export default function ReportSheet({ reportedId, streamId, itemId, context, onClose, onDone }: {
  reportedId: string
  streamId?: string | null
  itemId?: string | null
  context: 'live' | 'seller' | 'item'
  onClose: () => void
  onDone: (message: string) => void
}) {
  const c = tr(content)
  const [reason, setReason] = useState<ReasonKey | null>(null)
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!reason) return
    setSending(true); setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const r = await apiFetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
        body: JSON.stringify({
          reported_id: reportedId,
          reason: `${content.fr.reasons[reason]}${details.trim() ? ` — ${details.trim()}` : ''}`,
          context: `${context}:${reason}`,
          stream_id: streamId || undefined,
          item_id: itemId || undefined,
        }),
      })
      if (!r.ok) throw new Error(String(r.status))
      onDone(c.done)
    } catch {
      setError(c.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', backgroundColor: '#111', borderRadius: '20px 20px 0 0', padding: '20px 16px',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 20px)', maxHeight: '85vh', overflowY: 'auto', color: '#fff',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 'calc(19px * var(--fs, 1))', fontWeight: 800 }}>{c.title}</h3>
        <p style={{ margin: '0 0 14px', fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0' }}>{c.subtitle}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(Object.keys(c.reasons) as ReasonKey[]).map(k => (
            <button key={k} onClick={() => setReason(k)} style={{
              textAlign: 'start', padding: '13px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
              border: reason === k ? '1px solid #00E5FF' : '1px solid #2a2a2a',
              backgroundColor: reason === k ? 'rgba(0,229,255,0.14)' : '#161616', color: '#fff',
            }}>{c.reasons[k]}</button>
          ))}
        </div>
        <textarea
          value={details} onChange={e => setDetails(e.target.value.slice(0, 400))} placeholder={c.details} rows={3}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #2a2a2a', backgroundColor: '#0a0a0a', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', resize: 'none' }}
        />
        {error && <p style={{ color: '#E8344E', fontSize: 'calc(13px * var(--fs, 1))', margin: '8px 0 0' }}>{error}</p>}
        <button onClick={send} disabled={!reason || sending} style={{
          width: '100%', marginTop: '12px', padding: '15px', borderRadius: '14px', border: 'none', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800,
          background: reason ? 'linear-gradient(135deg, #0091EA, #00E5FF)' : '#2a2a2a', color: reason ? '#fff' : '#f0f0f0', cursor: reason ? 'pointer' : 'default',
        }}>{sending ? c.sending : c.send}</button>
        <button onClick={onClose} style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #333', backgroundColor: 'transparent', color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', cursor: 'pointer' }}>{c.cancel}</button>
      </div>
    </div>
  )
}

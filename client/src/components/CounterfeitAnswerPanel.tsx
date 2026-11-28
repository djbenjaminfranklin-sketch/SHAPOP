import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { tr, type Localized } from '../lib/i18n'

// Réponse du vendeur à un signalement de contrefaçon (28/11/2026, traitement automatique côté serveur :
// services/counterfeit.ts). Reconnaître = contrefaçon retenue tout de suite ; contester = examen par une
// personne, sans pénalité automatique. Sans réponse avant la date limite, la contrefaçon est retenue.
type Text = {
  title: string; intro: string; deadline: string; placeholder: string; proofHint: string
  accept: string; contest: string; confirmAccept: string; needProof: string; sent: string; error: string
}
const content: Localized<Text> = {
  en: {
    title: 'Counterfeit report: your answer',
    intro: 'The buyer reports that this luxury item is a counterfeit. The listing is removed and your payout for this sale is frozen until a decision.',
    deadline: 'Answer before {date}. With no answer, the counterfeit will be upheld: buyer refunded, penalty of 50% of the price, account closed.',
    placeholder: 'Your explanation (where you bought it, invoice, certificate…)',
    proofHint: 'To contest, add your proof photos above (invoice, certificate, serial number) and explain.',
    accept: 'I admit it', contest: 'I contest',
    confirmAccept: 'Admitting means: the buyer is refunded, a penalty of 50% of the price applies and your account is closed. Confirm?',
    needProof: 'To contest, write an explanation or add proof photos.',
    sent: 'Answer sent. A person from ShaPop will review both sides before any decision.',
    error: 'Sending failed. Try again.',
  },
  fr: {
    title: 'Signalement de contrefaçon : ta réponse',
    intro: 'L’acheteur signale que cet article de luxe est une contrefaçon. L’annonce est retirée et ton versement pour cette vente est bloqué jusqu’à la décision.',
    deadline: 'Réponds avant le {date}. Sans réponse, la contrefaçon sera retenue : acheteur remboursé, pénalité de 50 % du prix, compte fermé.',
    placeholder: 'Ton explication (où tu l’as acheté, facture, certificat…)',
    proofHint: 'Pour contester, ajoute tes photos de preuve ci-dessus (facture, certificat, numéro de série) et explique.',
    accept: 'Je reconnais', contest: 'Je conteste',
    confirmAccept: 'Reconnaître veut dire : l’acheteur est remboursé, une pénalité de 50 % du prix s’applique et ton compte est fermé. Tu confirmes ?',
    needProof: 'Pour contester, écris une explication ou ajoute des photos de preuve.',
    sent: 'Réponse envoyée. Une personne de ShaPop examine les deux côtés avant toute décision.',
    error: 'Envoi impossible. Réessaie.',
  },
  es: {
    title: 'Denuncia de falsificación: tu respuesta',
    intro: 'El comprador denuncia que este artículo de lujo es una falsificación. El anuncio se retira y tu pago de esta venta queda bloqueado hasta la decisión.',
    deadline: 'Responde antes del {date}. Sin respuesta, se confirmará la falsificación: reembolso al comprador, penalización del 50 % del precio y cierre de la cuenta.',
    placeholder: 'Tu explicación (dónde lo compraste, factura, certificado…)',
    proofHint: 'Para impugnar, añade arriba tus fotos de prueba (factura, certificado, número de serie) y explica.',
    accept: 'Lo reconozco', contest: 'Lo impugno',
    confirmAccept: 'Reconocerlo significa: el comprador es reembolsado, se aplica una penalización del 50 % del precio y tu cuenta se cierra. ¿Confirmas?',
    needProof: 'Para impugnar, escribe una explicación o añade fotos de prueba.',
    sent: 'Respuesta enviada. Una persona de ShaPop revisa ambas partes antes de decidir.',
    error: 'No se pudo enviar. Inténtalo de nuevo.',
  },
  ru: {
    title: 'Жалоба на подделку: твой ответ',
    intro: 'Покупатель сообщает, что этот люксовый товар — подделка. Объявление снято, а выплата за эту продажу заморожена до решения.',
    deadline: 'Ответь до {date}. Без ответа подделка будет признана: возврат покупателю, штраф 50 % от цены, закрытие аккаунта.',
    placeholder: 'Твоё объяснение (где купил, чек, сертификат…)',
    proofHint: 'Чтобы оспорить, добавь выше фото доказательств (чек, сертификат, серийный номер) и объясни.',
    accept: 'Признаю', contest: 'Оспариваю',
    confirmAccept: 'Признание означает: покупателю вернут деньги, будет штраф 50 % от цены, а аккаунт закроют. Подтверждаешь?',
    needProof: 'Чтобы оспорить, напиши объяснение или добавь фото доказательств.',
    sent: 'Ответ отправлен. Сотрудник ShaPop изучит обе стороны до решения.',
    error: 'Не удалось отправить. Попробуй ещё раз.',
  },
  he: {
    title: 'דיווח על זיוף: התשובה שלך',
    intro: 'הקונה מדווח שפריט היוקרה הזה מזויף. המודעה הוסרה והתשלום על המכירה הזו מוקפא עד להחלטה.',
    deadline: 'ענו עד {date}. ללא תשובה, הזיוף יאושר: החזר לקונה, קנס של 50% מהמחיר וסגירת החשבון.',
    placeholder: 'ההסבר שלך (איפה קנית, חשבונית, תעודה…)',
    proofHint: 'כדי לערער, הוסיפו למעלה תמונות הוכחה (חשבונית, תעודה, מספר סידורי) והסבירו.',
    accept: 'אני מודה', contest: 'אני מערער/ת',
    confirmAccept: 'הודאה פירושה: הקונה מקבל החזר, חל קנס של 50% מהמחיר והחשבון נסגר. לאשר?',
    needProof: 'כדי לערער, כתבו הסבר או הוסיפו תמונות הוכחה.',
    sent: 'התשובה נשלחה. נציג של ShaPop יבדוק את שני הצדדים לפני כל החלטה.',
    error: 'השליחה נכשלה. נסו שוב.',
  },
}

export default function CounterfeitAnswerPanel({ disputeId, deadline, proofUrls, onDone }: {
  disputeId: string; deadline: string; proofUrls: string[]; onDone: () => void
}) {
  const t = tr(content)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const send = async (accept: boolean) => {
    if (busy) return
    if (accept && !window.confirm(t.confirmAccept)) return
    if (!accept && msg.trim().length < 10 && proofUrls.length === 0) { setInfo(t.needProof); return }
    setBusy(true); setInfo(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await apiFetch(`/api/disputes/${disputeId}/counterfeit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ accept, message: msg.trim(), proof_urls: proofUrls }),
      })
      if (!resp.ok) throw new Error('send')
      if (!accept) setInfo(t.sent)
      onDone()
    } catch { setInfo(t.error) }
    setBusy(false)
  }

  const btn = (primary: boolean) => ({
    flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: 'calc(14px * var(--fs, 1))', cursor: 'pointer',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
    background: primary ? '#00E5FF' : 'transparent', color: primary ? '#001014' : '#fff', opacity: busy ? 0.6 : 1,
  })

  return (
    <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(232,52,78,0.5)' }}>
      <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{t.title}</p>
      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#ddd', margin: '0 0 8px', lineHeight: 1.45 }}>{t.intro}</p>
      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#FFB4BE', margin: '0 0 12px', lineHeight: 1.45, fontWeight: 700 }}>{t.deadline.replace('{date}', new Date(deadline).toLocaleDateString())}</p>
      <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={t.placeholder} maxLength={2000} rows={4}
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', marginBottom: '8px' }} />
      <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#aaa', margin: '0 0 12px' }}>{t.proofHint}</p>
      {info && <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#00E5FF', margin: '0 0 12px' }}>{info}</p>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => send(false)} disabled={busy} style={btn(true)}>{t.contest}</button>
        <button onClick={() => send(true)} disabled={busy} style={btn(false)}>{t.accept}</button>
      </div>
    </div>
  )
}

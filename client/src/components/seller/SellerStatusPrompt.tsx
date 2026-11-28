import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tr, type Localized } from '../../lib/i18n'

// Statut du vendeur, demandé avant son premier direct s'il ne l'a jamais donné (28/11/2026).
// Obligation légale : l'acheteur doit savoir s'il achète à un particulier ou à un professionnel
// (Code de la consommation L.111-7 ; loi israélienne de protection du consommateur, art. 14ג).
type Text = {
  title: string; desc: string; individual: string; business: string
  individualHint: string; businessHint: string
  businessName: string; businessNumber: string; businessAddress: string
  save: string; cancel: string; error: string
}
const content: Localized<Text> = {
  en: {
    title: 'Do you sell as a private person or a business?',
    desc: 'Buyers see it on each of your lives. Required by law.',
    individual: 'Private person', business: 'Business',
    individualHint: 'Buyers do not have the legal 14-day withdrawal right with a private seller. If you actually sell as a business, you must say so — false declarations are punishable.',
    businessHint: 'Your business details are shown to buyers before they pay. You must accept returns for at least 14 days.',
    businessName: 'Business name', businessNumber: 'Registration number (e.g. company or tax ID)', businessAddress: 'Business address',
    save: 'Confirm', cancel: 'Cancel', error: 'Could not save. Try again.',
  },
  fr: {
    title: 'Tu vends en tant que particulier ou professionnel ?',
    desc: 'Les acheteurs le voient sur chacun de tes directs. C\'est obligatoire.',
    individual: 'Particulier', business: 'Professionnel',
    individualHint: 'Avec un vendeur particulier, les acheteurs n\'ont pas le droit légal de rétractation de 14 jours. Si tu vends en réalité à titre professionnel, tu dois le déclarer : une fausse déclaration est sanctionnée.',
    businessHint: 'Ton identité professionnelle est affichée aux acheteurs avant le paiement. Tu dois accepter les retours pendant au moins 14 jours.',
    businessName: 'Nom de l\'entreprise', businessNumber: 'Numéro d\'immatriculation (ex. SIRET, n° fiscal)', businessAddress: 'Adresse de l\'entreprise',
    save: 'Valider', cancel: 'Annuler', error: 'Enregistrement impossible. Réessaie.',
  },
  es: {
    title: '¿Vendes como particular o como profesional?',
    desc: 'Los compradores lo ven en cada uno de tus directos. Es obligatorio.',
    individual: 'Particular', business: 'Profesional',
    individualHint: 'Con un vendedor particular, los compradores no tienen el derecho legal de desistimiento de 14 días. Si en realidad vendes como profesional, debes declararlo: una declaración falsa está sancionada.',
    businessHint: 'Tus datos profesionales se muestran a los compradores antes de pagar. Debes aceptar devoluciones durante al menos 14 días.',
    businessName: 'Nombre de la empresa', businessNumber: 'Número de registro (p. ej. NIF)', businessAddress: 'Dirección de la empresa',
    save: 'Confirmar', cancel: 'Cancelar', error: 'No se pudo guardar. Inténtalo de nuevo.',
  },
  ru: {
    title: 'Ты продаёшь как частное лицо или как бизнес?',
    desc: 'Покупатели видят это в каждом твоём эфире. Это обязательно.',
    individual: 'Частное лицо', business: 'Бизнес',
    individualHint: 'У частного продавца покупатели не имеют законного права на отказ в течение 14 дней. Если ты на самом деле продаёшь как бизнес, ты обязан это указать — ложное заявление наказуемо.',
    businessHint: 'Данные твоего бизнеса показываются покупателям до оплаты. Ты обязан принимать возврат не менее 14 дней.',
    businessName: 'Название компании', businessNumber: 'Регистрационный номер (например, налоговый)', businessAddress: 'Адрес компании',
    save: 'Подтвердить', cancel: 'Отмена', error: 'Не удалось сохранить. Попробуй ещё раз.',
  },
  he: {
    title: 'את/ה מוכר/ת כאדם פרטי או כעסק?',
    desc: 'הקונים רואים את זה בכל שידור שלך. זו חובה.',
    individual: 'אדם פרטי', business: 'עסק',
    individualHint: 'אצל מוכר פרטי אין לקונים זכות ביטול חוקית של 14 יום. אם בפועל את/ה מוכר/ת כעסק, חובה להצהיר על כך — הצהרה כוזבת גוררת סנקציות.',
    businessHint: 'פרטי העסק שלך מוצגים לקונים לפני התשלום. חובה לקבל החזרות לפחות 14 יום.',
    businessName: 'שם העסק', businessNumber: 'מספר עוסק / ח.פ.', businessAddress: 'כתובת העסק',
    save: 'אישור', cancel: 'ביטול', error: 'השמירה נכשלה. נסו שוב.',
  },
}

export default function SellerStatusPrompt({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel: () => void }) {
  const t = tr(content)
  const [type, setType] = useState<'individual' | 'business' | ''>('')
  const [name, setName] = useState('')
  const [num, setNum] = useState('')
  const [addr, setAddr] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ok = type === 'individual' || (type === 'business' && name.trim() && num.trim() && addr.trim())

  const save = async () => {
    if (!ok || busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.from('sellers').update({
      seller_type: type,
      business_name: type === 'business' ? name.trim() : null,
      business_number: type === 'business' ? num.trim() : null,
      business_address: type === 'business' ? addr.trim() : null,
    }).eq('id', userId)
    setBusy(false)
    if (error) { setErr(t.error); return }
    onDone()
  }

  const field = (v: string, set: (s: string) => void, ph: string) => (
    <input value={v} onChange={e => set(e.target.value)} placeholder={ph} maxLength={200}
      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box' }} />
  )
  const choice = (id: 'individual' | 'business', label: string) => (
    <button onClick={() => setType(id)} style={{
      flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 800, fontSize: 'calc(15px * var(--fs, 1))', cursor: 'pointer',
      border: type === id ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.2)',
      background: type === id ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)', color: '#fff',
    }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'max(env(safe-area-inset-bottom, 16px), var(--safe-area-inset-bottom, 0px))' }}>
        <p style={{ margin: 0, fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{t.title}</p>
        <p style={{ margin: 0, fontSize: 'calc(13px * var(--fs, 1))', color: '#ccc' }}>{t.desc}</p>
        <div style={{ display: 'flex', gap: '10px' }}>{choice('individual', t.individual)}{choice('business', t.business)}</div>
        {type === 'business' && (<>
          {field(name, setName, t.businessName)}
          {field(num, setNum, t.businessNumber)}
          {field(addr, setAddr, t.businessAddress)}
        </>)}
        {type && <p style={{ margin: 0, fontSize: 'calc(12px * var(--fs, 1))', color: '#ccc', lineHeight: 1.4 }}>{type === 'business' ? t.businessHint : t.individualHint}</p>}
        {err && <p style={{ margin: 0, color: '#ff6b6b', fontSize: 'calc(13px * var(--fs, 1))' }}>{err}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#ddd', fontWeight: 700, cursor: 'pointer' }}>{t.cancel}</button>
          <button onClick={save} disabled={!ok || busy} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: ok ? 'linear-gradient(135deg, #00E5FF, #0091EA)' : 'rgba(255,255,255,0.1)', color: ok ? '#001014' : '#666', fontWeight: 900, cursor: ok ? 'pointer' : 'not-allowed' }}>{busy ? '...' : t.save}</button>
        </div>
      </div>
    </div>
  )
}

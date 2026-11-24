// « Être payé en Israël » : le vendeur israélien crée son portefeuille Rapyd puis vérifie son identité
// (page sécurisée de Rapyd). Tant que Rapyd n'est pas activé côté serveur, l'écran l'annonce et
// le bouton reste grisé.
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, tr } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton from '../components/PageBackButton'

const pageContent = {
  en: {
    title: 'Get paid in Israel', intro: 'To receive your sales in your Israeli bank account, ShaPop uses Rapyd, a licensed payment company. It takes 2 minutes.',
    soon: 'Payments in Israel are opening soon. You will be able to create your wallet as soon as it opens.',
    step1: '1. Your wallet', step1Done: 'Wallet created', step2: '2. Verify your identity', step2Hint: 'Have your ID card (teudat zehut) or passport ready. Rapyd asks for a photo of it and a selfie.',
    firstName: 'First name', lastName: 'Last name', birth: 'Date of birth', phone: 'Phone number', address: 'Address (street and number)', city: 'City',
    create: 'Create my wallet', creating: 'Creating…', verify: 'Verify my identity', opening: 'Opening…',
    kyc: { none: 'Not verified yet', pending: 'Verification in progress', verified: 'Identity verified: you can get paid', rejected: 'Verification refused: try again' },
    error: 'Something went wrong. Check your details and try again.', missing: 'Fill in all the fields.',
    why: 'Why? The law requires the payment company to know who receives the money. ShaPop never sees your ID.',
  },
  fr: {
    title: 'Être payé en Israël', intro: 'Pour recevoir tes ventes sur ton compte bancaire israélien, ShaPop passe par Rapyd, une société de paiement agréée. Ça prend 2 minutes.',
    soon: 'Le paiement en Israël ouvre bientôt. Tu pourras créer ton portefeuille dès son ouverture.',
    step1: '1. Ton portefeuille', step1Done: 'Portefeuille créé', step2: '2. Vérifie ton identité', step2Hint: 'Prépare ta carte d’identité (teudat zehut) ou ton passeport. Rapyd demande une photo de la pièce et un selfie.',
    firstName: 'Prénom', lastName: 'Nom', birth: 'Date de naissance', phone: 'Numéro de téléphone', address: 'Adresse (rue et numéro)', city: 'Ville',
    create: 'Créer mon portefeuille', creating: 'Création…', verify: 'Vérifier mon identité', opening: 'Ouverture…',
    kyc: { none: 'Pas encore vérifiée', pending: 'Vérification en cours', verified: 'Identité vérifiée : tu peux être payé', rejected: 'Vérification refusée : réessaie' },
    error: 'Un problème est survenu. Vérifie tes informations et réessaie.', missing: 'Remplis tous les champs.',
    why: 'Pourquoi ? La loi oblige la société de paiement à savoir qui reçoit l’argent. ShaPop ne voit jamais ta pièce d’identité.',
  },
  es: {
    title: 'Cobrar en Israel', intro: 'Para recibir tus ventas en tu cuenta bancaria israelí, ShaPop usa Rapyd, una empresa de pagos autorizada. Tarda 2 minutos.',
    soon: 'Los pagos en Israel abren pronto. Podrás crear tu monedero en cuanto abran.',
    step1: '1. Tu monedero', step1Done: 'Monedero creado', step2: '2. Verifica tu identidad', step2Hint: 'Ten a mano tu documento de identidad (teudat zehut) o tu pasaporte. Rapyd pide una foto del documento y un selfie.',
    firstName: 'Nombre', lastName: 'Apellidos', birth: 'Fecha de nacimiento', phone: 'Teléfono', address: 'Dirección (calle y número)', city: 'Ciudad',
    create: 'Crear mi monedero', creating: 'Creando…', verify: 'Verificar mi identidad', opening: 'Abriendo…',
    kyc: { none: 'Aún no verificada', pending: 'Verificación en curso', verified: 'Identidad verificada: ya puedes cobrar', rejected: 'Verificación rechazada: inténtalo de nuevo' },
    error: 'Algo ha fallado. Revisa tus datos e inténtalo de nuevo.', missing: 'Rellena todos los campos.',
    why: '¿Por qué? La ley obliga a la empresa de pagos a saber quién recibe el dinero. ShaPop nunca ve tu documento.',
  },
  ru: {
    title: 'Получать оплату в Израиле', intro: 'Чтобы получать деньги за продажи на израильский банковский счёт, ShaPop работает с Rapyd — лицензированной платёжной компанией. Это займёт 2 минуты.',
    soon: 'Оплата в Израиле скоро откроется. Ты сможешь создать кошелёк сразу после открытия.',
    step1: '1. Твой кошелёк', step1Done: 'Кошелёк создан', step2: '2. Подтверди личность', step2Hint: 'Подготовь теудат зеут или паспорт. Rapyd попросит фото документа и селфи.',
    firstName: 'Имя', lastName: 'Фамилия', birth: 'Дата рождения', phone: 'Телефон', address: 'Адрес (улица и номер дома)', city: 'Город',
    create: 'Создать кошелёк', creating: 'Создаём…', verify: 'Подтвердить личность', opening: 'Открываем…',
    kyc: { none: 'Ещё не подтверждена', pending: 'Проверка идёт', verified: 'Личность подтверждена: можно получать оплату', rejected: 'Проверка отклонена: попробуй снова' },
    error: 'Что-то пошло не так. Проверь данные и попробуй снова.', missing: 'Заполни все поля.',
    why: 'Зачем? По закону платёжная компания должна знать, кто получает деньги. ShaPop никогда не видит твой документ.',
  },
  he: {
    title: 'קבלת תשלומים בישראל', intro: 'כדי לקבל את כספי המכירות לחשבון הבנק שלך בישראל, ShaPop עובדת עם Rapyd, חברת תשלומים מורשית. זה לוקח 2 דקות.',
    soon: 'התשלומים בישראל ייפתחו בקרוב. אפשר יהיה ליצור ארנק מיד עם הפתיחה.',
    step1: '1. הארנק שלך', step1Done: 'הארנק נוצר', step2: '2. אימות זהות', step2Hint: 'הכינו תעודת זהות או דרכון. Rapyd תבקש צילום של המסמך וסלפי.',
    firstName: 'שם פרטי', lastName: 'שם משפחה', birth: 'תאריך לידה', phone: 'מספר טלפון', address: 'כתובת (רחוב ומספר)', city: 'עיר',
    create: 'יצירת הארנק שלי', creating: 'יוצרים…', verify: 'אימות הזהות שלי', opening: 'פותחים…',
    kyc: { none: 'עדיין לא אומתה', pending: 'האימות בתהליך', verified: 'הזהות אומתה: אפשר לקבל תשלומים', rejected: 'האימות נדחה: נסו שוב' },
    error: 'משהו השתבש. בדקו את הפרטים ונסו שוב.', missing: 'יש למלא את כל השדות.',
    why: 'למה? החוק מחייב את חברת התשלומים לדעת מי מקבל את הכסף. ShaPop לעולם לא רואה את התעודה שלך.',
  },
}

type Status = { enabled: boolean; country: string | null; has_wallet: boolean; kyc_status: 'none' | 'pending' | 'verified' | 'rejected' }

export default function PayoutsIsraelPage() {
  const lang = getLang()
  const ct = tr(pageContent, lang)
  usePageTitle(ct.title)
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', phone: '', address: '', city: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const auth = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/rapyd/seller-status', { headers: await auth() })
      if (r.ok) setStatus(await r.json())
    } catch { /* hors ligne */ }
  }, [auth])

  useEffect(() => { load() }, [load, params])
  useEffect(() => {
    let l: { remove: () => void } | undefined
    Browser.addListener('browserFinished', () => { load() }).then(x => { l = x })
    return () => { l?.remove() }
  }, [load])

  const createWallet = async () => {
    setError(null)
    if (Object.values(form).some(v => !v.trim())) { setError(ct.missing); return }
    setBusy(true)
    try {
      const r = await apiFetch('/api/rapyd/seller-wallet', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify(form) })
      if (!r.ok) { setError(ct.error); return }
      await load()
    } catch { setError(ct.error) } finally { setBusy(false) }
  }

  const verifyIdentity = async () => {
    setError(null); setBusy(true)
    try {
      const r = await apiFetch('/api/rapyd/seller-identity', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) } })
      const d = r.ok ? await r.json() : null
      if (!d?.redirect_url) { setError(ct.error); return }
      await Browser.open({ url: d.redirect_url, presentationStyle: 'popover' })
    } catch { setError(ct.error) } finally { setBusy(false) }
  }

  const enabled = !!status?.enabled
  const kyc = status?.kyc_status || 'none'
  const kycColor = kyc === 'verified' ? '#22C55E' : kyc === 'rejected' ? '#E8344E' : kyc === 'pending' ? '#F59E0B' : '#888'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 44px) + 12px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 140px)' }}>
      <PageBackButton />
      <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '48px 0 8px' }}>🇮🇱 {ct.title}</h1>
      <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.5, margin: '0 0 16px' }}>{ct.intro}</p>

      {status && !enabled && (
        <p style={{ margin: '0 0 16px', padding: '12px 14px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B', fontSize: '14px', fontWeight: 600 }}>{ct.soon}</p>
      )}

      {/* Étape 1 : portefeuille */}
      <section style={card}>
        <p style={stepTitle}>{ct.step1}</p>
        {status?.has_wallet ? (
          <p style={{ margin: 0, color: '#22C55E', fontWeight: 700 }}>✓ {ct.step1Done}</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Field label={ct.firstName} value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} autoComplete="given-name" />
              <Field label={ct.lastName} value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} autoComplete="family-name" />
            </div>
            <Field label={ct.birth} type="date" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} autoComplete="bday" />
            <Field label={ct.phone} type="tel" value={form.phone} onChange={v => setForm({ ...form, phone: v })} autoComplete="tel" placeholder="+972 5…" />
            <Field label={ct.address} value={form.address} onChange={v => setForm({ ...form, address: v })} autoComplete="street-address" />
            <Field label={ct.city} value={form.city} onChange={v => setForm({ ...form, city: v })} autoComplete="address-level2" />
            <button onClick={createWallet} disabled={!enabled || busy} style={btn(enabled && !busy)}>{busy ? ct.creating : ct.create}</button>
          </>
        )}
      </section>

      {/* Étape 2 : identité */}
      <section style={{ ...card, opacity: status?.has_wallet ? 1 : 0.5 }}>
        <p style={stepTitle}>{ct.step2}</p>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#aaa', lineHeight: 1.5 }}>{ct.step2Hint}</p>
        <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: kycColor }}>{ct.kyc[kyc]}</p>
        {kyc !== 'verified' && (
          <button onClick={verifyIdentity} disabled={!enabled || !status?.has_wallet || busy} style={btn(enabled && !!status?.has_wallet && !busy)}>{busy ? ct.opening : ct.verify}</button>
        )}
      </section>

      {error && <p role="alert" style={{ color: '#E8344E', fontSize: '14px', fontWeight: 600 }}>{error}</p>}
      <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.5 }}>{ct.why}</p>
    </div>
  )
}

const card: React.CSSProperties = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '14px', padding: '14px', marginBottom: '14px' }
const stepTitle: React.CSSProperties = { margin: '0 0 10px', fontSize: '16px', fontWeight: 800 }
const btn = (on: boolean): React.CSSProperties => ({
  width: '100%', marginTop: '6px', padding: '14px', borderRadius: '12px', border: 'none',
  background: on ? 'linear-gradient(135deg, #E8344E, #F0908A)' : '#2A2A2A', color: on ? '#fff' : '#777',
  fontSize: '15px', fontWeight: 800, cursor: on ? 'pointer' : 'default',
})

function Field({ label, value, onChange, type = 'text', autoComplete, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <label style={{ display: 'block', flex: 1, marginBottom: '8px' }}>
      <span style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>{label}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: '15px' }}
      />
    </label>
  )
}

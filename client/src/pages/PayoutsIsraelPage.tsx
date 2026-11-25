// « Être payé en Israël » : le vendeur israélien enregistre son compte bancaire (IBAN IL…) ;
// ShaPop lui vire sa part en shekels par Airwallex (virement local Masav) quand la remise est confirmée.
// Tant que le paiement en Israël n'est pas activé côté serveur, l'écran l'annonce et le bouton reste grisé.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, tr } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton from '../components/PageBackButton'

const pageContent = {
  en: {
    title: 'Get paid in Israel', intro: 'Your sales are paid in shekels into your Israeli bank account, 1 to 2 business days after the handover. ShaPop uses Airwallex, a licensed payment company.',
    soon: 'Payments in Israel are opening soon. You will be able to add your bank account as soon as it opens.',
    bankTitle: 'Your bank account', firstName: 'First name', lastName: 'Last name (as on the bank account)', iban: 'IBAN (starts with IL, 23 characters)', street: 'Address (street and number)', city: 'City', postcode: 'Postcode (optional)',
    save: 'Save my bank account', saving: 'Saving…', saved: 'Bank account saved', change: 'Change my bank account', ending: 'Account ending in',
    ibanHint: 'Find your IBAN in your bank app or on a bank statement.', badIban: 'This IBAN is not valid. Check it on your bank statement.', rejected: 'The bank details were refused. Check them and try again.',
    error: 'Something went wrong. Try again.', missing: 'Fill in all the required fields.',
  },
  fr: {
    title: 'Être payé en Israël', intro: 'Tes ventes te sont versées en shekels sur ton compte bancaire israélien, 1 à 2 jours ouvrés après la remise. ShaPop passe par Airwallex, une société de paiement agréée.',
    soon: 'Le paiement en Israël ouvre bientôt. Tu pourras ajouter ton compte bancaire dès son ouverture.',
    bankTitle: 'Ton compte bancaire', firstName: 'Prénom', lastName: 'Nom (comme sur le compte bancaire)', iban: 'IBAN (commence par IL, 23 caractères)', street: 'Adresse (rue et numéro)', city: 'Ville', postcode: 'Code postal (facultatif)',
    save: 'Enregistrer mon compte bancaire', saving: 'Enregistrement…', saved: 'Compte bancaire enregistré', change: 'Changer de compte bancaire', ending: 'Compte se terminant par',
    ibanHint: 'Ton IBAN se trouve dans l’appli de ta banque ou sur un relevé.', badIban: 'Cet IBAN n’est pas valable. Vérifie-le sur ton relevé.', rejected: 'Les coordonnées bancaires ont été refusées. Vérifie-les et réessaie.',
    error: 'Un problème est survenu. Réessaie.', missing: 'Remplis tous les champs obligatoires.',
  },
  es: {
    title: 'Cobrar en Israel', intro: 'Tus ventas se pagan en shékels en tu cuenta bancaria israelí, 1 o 2 días hábiles después de la entrega. ShaPop usa Airwallex, una empresa de pagos autorizada.',
    soon: 'Los pagos en Israel abren pronto. Podrás añadir tu cuenta bancaria en cuanto abran.',
    bankTitle: 'Tu cuenta bancaria', firstName: 'Nombre', lastName: 'Apellidos (como en la cuenta)', iban: 'IBAN (empieza por IL, 23 caracteres)', street: 'Dirección (calle y número)', city: 'Ciudad', postcode: 'Código postal (opcional)',
    save: 'Guardar mi cuenta bancaria', saving: 'Guardando…', saved: 'Cuenta bancaria guardada', change: 'Cambiar de cuenta bancaria', ending: 'Cuenta terminada en',
    ibanHint: 'Encontrarás tu IBAN en la app de tu banco o en un extracto.', badIban: 'Este IBAN no es válido. Revísalo en tu extracto.', rejected: 'Los datos bancarios fueron rechazados. Revísalos e inténtalo de nuevo.',
    error: 'Algo ha fallado. Inténtalo de nuevo.', missing: 'Rellena todos los campos obligatorios.',
  },
  ru: {
    title: 'Получать оплату в Израиле', intro: 'Деньги за продажи приходят в шекелях на твой израильский банковский счёт через 1–2 рабочих дня после передачи товара. ShaPop работает с Airwallex — лицензированной платёжной компанией.',
    soon: 'Оплата в Израиле скоро откроется. Ты сможешь добавить банковский счёт сразу после открытия.',
    bankTitle: 'Твой банковский счёт', firstName: 'Имя', lastName: 'Фамилия (как в банке)', iban: 'IBAN (начинается с IL, 23 символа)', street: 'Адрес (улица и номер дома)', city: 'Город', postcode: 'Индекс (необязательно)',
    save: 'Сохранить счёт', saving: 'Сохраняем…', saved: 'Банковский счёт сохранён', change: 'Сменить счёт', ending: 'Счёт заканчивается на',
    ibanHint: 'IBAN есть в приложении твоего банка или в выписке.', badIban: 'Этот IBAN неверный. Проверь его по выписке.', rejected: 'Банковские данные отклонены. Проверь их и попробуй снова.',
    error: 'Что-то пошло не так. Попробуй снова.', missing: 'Заполни все обязательные поля.',
  },
  he: {
    title: 'קבלת תשלומים בישראל', intro: 'כספי המכירות מועברים בשקלים לחשבון הבנק שלך בישראל, יום-יומיים עסקים אחרי המסירה. ShaPop עובדת עם Airwallex, חברת תשלומים מורשית.',
    soon: 'התשלומים בישראל ייפתחו בקרוב. אפשר יהיה להוסיף חשבון בנק מיד עם הפתיחה.',
    bankTitle: 'חשבון הבנק שלך', firstName: 'שם פרטי', lastName: 'שם משפחה (כמו בחשבון הבנק)', iban: 'IBAN (מתחיל ב-IL, 23 תווים)', street: 'כתובת (רחוב ומספר)', city: 'עיר', postcode: 'מיקוד (לא חובה)',
    save: 'שמירת חשבון הבנק', saving: 'שומרים…', saved: 'חשבון הבנק נשמר', change: 'החלפת חשבון בנק', ending: 'חשבון המסתיים ב-',
    ibanHint: 'את ה-IBAN אפשר למצוא באפליקציית הבנק או בדף חשבון.', badIban: 'מספר ה-IBAN לא תקין. בדקו אותו בדף החשבון.', rejected: 'פרטי הבנק נדחו. בדקו אותם ונסו שוב.',
    error: 'משהו השתבש. נסו שוב.', missing: 'יש למלא את כל שדות החובה.',
  },
}

type Status = { enabled: boolean; country: string | null; has_bank: boolean; bank_last4: string | null }

/** Exemple de format d'IBAN israélien (identique dans toutes les langues). */
const IBAN_EXAMPLE = 'IL62 0108 0000 0009 9999 999'

export default function PayoutsIsraelPage() {
  const ct = tr(pageContent, getLang())
  usePageTitle(ct.title)
  const [status, setStatus] = useState<Status | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', iban: '', street: '', city: '', postcode: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On arrive depuis le bas de la page Paiements : remettre l'écran en haut
  useEffect(() => {
    const top = () => { window.scrollTo(0, 0); document.scrollingElement?.scrollTo(0, 0); document.body.scrollTop = 0 }
    top(); const t = setTimeout(top, 80)
    return () => clearTimeout(t)
  }, [])

  const auth = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/payouts-il/status', { headers: await auth() })
      if (r.ok) setStatus(await r.json())
    } catch { /* hors ligne */ }
  }, [auth])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setError(null)
    if ([form.first_name, form.last_name, form.iban, form.street, form.city].some(v => !v.trim())) { setError(ct.missing); return }
    setBusy(true)
    try {
      const r = await apiFetch('/api/payouts-il/bank', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await auth()) }, body: JSON.stringify(form) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d?.error === 'invalid_iban' ? ct.badIban : d?.error === 'bank_rejected' ? ct.rejected : ct.error); return }
      setEditing(false)
      await load()
    } catch { setError(ct.error) } finally { setBusy(false) }
  }

  const enabled = !!status?.enabled
  const showForm = !status?.has_bank || editing

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 44px) + 12px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 140px)' }}>
      <PageBackButton />
      <h1 style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, margin: '48px 0 8px' }}>🇮🇱 {ct.title}</h1>
      <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#aaa', lineHeight: 1.5, margin: '0 0 16px' }}>{ct.intro}</p>

      {status && !enabled && (
        <p style={{ margin: '0 0 16px', padding: '12px 14px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600 }}>{ct.soon}</p>
      )}

      <section style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800 }}>{ct.bankTitle}</p>
        {!showForm ? (
          <>
            <p style={{ margin: '0 0 6px', color: '#22C55E', fontWeight: 700 }}>✓ {ct.saved}</p>
            {status?.bank_last4 && <p style={{ margin: '0 0 12px', color: '#aaa', fontSize: 'calc(14px * var(--fs, 1))' }}>{ct.ending} {status.bank_last4}</p>}
            <button onClick={() => setEditing(true)} style={{ ...btn(true), background: 'transparent', border: '1px solid #444', color: '#ddd' }}>{ct.change}</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Field label={ct.firstName} value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} autoComplete="given-name" />
              <Field label={ct.lastName} value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} autoComplete="family-name" />
            </div>
            <Field label={ct.iban} value={form.iban} onChange={v => setForm({ ...form, iban: v.toUpperCase() })} placeholder={IBAN_EXAMPLE} dir="ltr" />
            <p style={{ margin: '-4px 0 8px', fontSize: 'calc(12px * var(--fs, 1))', color: '#777' }}>{ct.ibanHint}</p>
            <Field label={ct.street} value={form.street} onChange={v => setForm({ ...form, street: v })} autoComplete="street-address" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Field label={ct.city} value={form.city} onChange={v => setForm({ ...form, city: v })} autoComplete="address-level2" />
              <Field label={ct.postcode} value={form.postcode} onChange={v => setForm({ ...form, postcode: v })} autoComplete="postal-code" />
            </div>
            <button onClick={save} disabled={!enabled || busy} style={btn(enabled && !busy)}>{busy ? ct.saving : ct.save}</button>
          </>
        )}
      </section>

      {error && <p role="alert" style={{ color: '#E8344E', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600 }}>{error}</p>}
    </div>
  )
}

const btn = (on: boolean): React.CSSProperties => ({
  width: '100%', marginTop: '6px', padding: '14px', borderRadius: '12px', border: 'none',
  background: on ? 'linear-gradient(135deg, #E8344E, #F0908A)' : '#2A2A2A', color: on ? '#fff' : '#777',
  fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, cursor: on ? 'pointer' : 'default',
})

function Field({ label, value, onChange, autoComplete, placeholder, dir }: { label: string; value: string; onChange: (v: string) => void; autoComplete?: string; placeholder?: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <label style={{ display: 'block', flex: 1, marginBottom: '8px' }}>
      <span style={{ display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#888', marginBottom: '4px' }}>{label}</span>
      <input
        value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} dir={dir}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))' }}
      />
    </label>
  )
}

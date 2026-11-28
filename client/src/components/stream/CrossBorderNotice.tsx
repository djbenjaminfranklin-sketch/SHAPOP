import { tr, type Localized } from '../../lib/i18n'

// Remplace la barre d'achat quand un acheteur de l'UE regarde le direct d'un vendeur israélien pro (28/11/2026).
const content: Localized<{ text: string }> = {
  en: { text: 'You can watch this live, but buying is not available: this seller is a business based in Israel, and its items cannot be sold to buyers in the European Union (import VAT and brand rules).' },
  fr: { text: 'Tu peux regarder ce direct, mais pas acheter : ce vendeur est un professionnel installé en Israël, et ses articles ne peuvent pas être vendus aux acheteurs de l’Union européenne (TVA à l’importation et règles des marques).' },
  es: { text: 'Puedes ver este directo, pero no comprar: este vendedor es un profesional con sede en Israel y sus artículos no pueden venderse a compradores de la Unión Europea (IVA de importación y normas de marcas).' },
  ru: { text: 'Ты можешь смотреть этот эфир, но не покупать: продавец — компания из Израиля, и её товары нельзя продавать покупателям из Европейского союза (НДС при импорте и правила товарных знаков).' },
  he: { text: 'אפשר לצפות בשידור, אבל לא לקנות: המוכר הוא עסק בישראל, ואי אפשר למכור את הפריטים שלו לקונים באיחוד האירופי (מע״מ ביבוא וכללי סימני מסחר).' },
}

export default function CrossBorderNotice() {
  const t = tr(content)
  return (
    <div style={{
      position: 'fixed', left: '12px', right: '12px', bottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 84px)', zIndex: 30,
      padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.45,
    }}>
      {t.text}
    </div>
  )
}

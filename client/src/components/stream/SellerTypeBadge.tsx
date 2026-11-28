import { useState } from 'react'
import { tr, type Localized } from '../../lib/i18n'

// Pastille « Particulier / Pro » affichée sur chaque direct (28/11/2026). Obligation légale : l'acheteur doit
// savoir avant d'acheter si le vendeur est un professionnel (droits de rétractation et de garantie) ou un
// particulier (Code de la consommation L.111-7 et D.111-8 ; loi israélienne, art. 14ג). Toucher = explications.
type Text = { individual: string; business: string; individualInfo: string; businessInfo: string; close: string }
const content: Localized<Text> = {
  en: {
    individual: 'Private', business: 'Pro',
    individualInfo: 'This seller is a private person. Consumer law does not apply: no legal 14-day withdrawal right and no legal conformity guarantee (hidden-defects rules still apply). ShaPop protection still covers items not received or not as described.',
    businessInfo: 'This seller is a business. You can cancel your purchase within 14 days of receiving the item, and you have the legal conformity guarantee.',
    close: 'OK',
  },
  fr: {
    individual: 'Particulier', business: 'Pro',
    individualInfo: 'Ce vendeur est un particulier. Le droit de la consommation ne s\'applique pas : pas de droit de rétractation de 14 jours ni de garantie légale de conformité (la garantie des vices cachés reste due). La protection ShaPop couvre toujours les articles non reçus ou non conformes.',
    businessInfo: 'Ce vendeur est un professionnel. Tu peux annuler ton achat dans les 14 jours après réception, et tu bénéficies de la garantie légale de conformité.',
    close: 'OK',
  },
  es: {
    individual: 'Particular', business: 'Pro',
    individualInfo: 'Este vendedor es un particular. No se aplica la ley de consumo: sin derecho de desistimiento de 14 días ni garantía legal de conformidad (se mantiene la garantía por vicios ocultos). La protección ShaPop sigue cubriendo artículos no recibidos o no conformes.',
    businessInfo: 'Este vendedor es un profesional. Puedes cancelar tu compra en los 14 días siguientes a la recepción y tienes la garantía legal de conformidad.',
    close: 'OK',
  },
  ru: {
    individual: 'Частное лицо', business: 'Бизнес',
    individualInfo: 'Этот продавец — частное лицо. Закон о защите прав потребителей не применяется: нет права на отказ в течение 14 дней и законной гарантии соответствия (ответственность за скрытые дефекты сохраняется). Защита ShaPop по-прежнему покрывает неполученные или несоответствующие товары.',
    businessInfo: 'Этот продавец — бизнес. Ты можешь отказаться от покупки в течение 14 дней после получения и имеешь законную гарантию соответствия.',
    close: 'OK',
  },
  he: {
    individual: 'פרטי', business: 'עסק',
    individualInfo: 'המוכר הוא אדם פרטי. חוק הגנת הצרכן לא חל: אין זכות ביטול של 14 יום ואין אחריות חוקית להתאמה (האחריות לפגמים נסתרים נשארת). ההגנה של ShaPop עדיין מכסה פריטים שלא התקבלו או לא תואמים.',
    businessInfo: 'המוכר הוא עסק. אפשר לבטל את הרכישה תוך 14 יום מקבלת הפריט, ויש לך אחריות חוקית להתאמה.',
    close: 'אישור',
  },
}

export type SellerIdentity = { business_name?: string | null; business_number?: string | null; business_address?: string | null }

export default function SellerTypeBadge({ type, identity, small }: { type: string | null | undefined; identity?: SellerIdentity; small?: boolean }) {
  const [open, setOpen] = useState(false)
  if (type !== 'individual' && type !== 'business') return null
  const t = tr(content)
  const pro = type === 'business'
  return (
    <>
      <span
        role="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        style={{
          display: 'inline-flex', alignItems: 'center', flexShrink: 0,
          padding: small ? '1px 6px' : '2px 8px', borderRadius: '6px',
          fontSize: `calc(${small ? 9 : 11}px * var(--fs, 1))`, fontWeight: 800, letterSpacing: '0.2px',
          color: pro ? '#001014' : '#fff',
          background: pro ? '#00E5FF' : 'rgba(255,255,255,0.22)',
          border: pro ? 'none' : '1px solid rgba(255,255,255,0.35)',
          cursor: 'pointer',
        }}
      >
        {pro ? t.business : t.individual}
      </span>
      {open && (
        <div
          onClick={e => { e.stopPropagation(); setOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', width: '100%', backgroundColor: '#111', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{pro ? t.business : t.individual}</p>
            <p style={{ margin: 0, fontSize: 'calc(14px * var(--fs, 1))', color: '#ddd', lineHeight: 1.45 }}>{pro ? t.businessInfo : t.individualInfo}</p>
            {pro && identity && (identity.business_name || identity.business_number || identity.business_address) && (
              <p style={{ margin: 0, fontSize: 'calc(13px * var(--fs, 1))', color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {[identity.business_name, identity.business_number, identity.business_address].filter(Boolean).join('\n')}
              </p>
            )}
            <button onClick={() => setOpen(false)} style={{ marginTop: '6px', padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00E5FF, #0091EA)', color: '#001014', fontWeight: 900, cursor: 'pointer' }}>{t.close}</button>
          </div>
        </div>
      )}
    </>
  )
}

// Articles de luxe (règle du 26/11/2026) : prix ≥ 500 euros (ou l'équivalent dans la devise du vendeur),
// grande marque de luxe, ou case « article de marque de luxe » cochée par le vendeur.
// Pour la mise en vente, le vendeur doit certifier l'authenticité (sinon le serveur refuse).
import { EUR_RATES, LUXURY_BRAND_PATTERNS } from './luxuryBrands'
import { tr } from './i18n'

export const LUXURY_THRESHOLD_EUR = 500

export function luxuryThreshold(currency?: string | null): number {
  const rate = EUR_RATES[(currency || '').toUpperCase()] ?? EUR_RATES.USD
  return LUXURY_THRESHOLD_EUR * rate
}

const BRAND_REGEXES = LUXURY_BRAND_PATTERNS.map(p => new RegExp(`(^|[^\\p{L}\\p{N}])(?:${p})(?![\\p{L}\\p{N}])`, 'u'))

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'")
}

export function hasLuxuryBrand(...texts: (string | null | undefined)[]): boolean {
  const text = normalize(texts.filter(Boolean).join(' \n '))
  return !!text.trim() && BRAND_REGEXES.some(re => re.test(text))
}

/** L'article sera-t-il considéré comme « de luxe » (et donc soumis à la certification) ? */
export function isLuxuryListing(input: {
  prices: (number | string | null | undefined)[]
  currency?: string | null
  title?: string | null
  description?: string | null
  declared?: boolean
}): boolean {
  if (input.declared) return true
  if (hasLuxuryBrand(input.title, input.description)) return true
  const limit = luxuryThreshold(input.currency)
  return input.prices.some(p => { const n = Number(String(p ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 && n >= limit })
}

type LuxuryText = { declare: string; notice: string; certify: string; required: string }

const TEXTS: Record<'en' | 'fr' | 'es' | 'ru' | 'he', LuxuryText> = {
  en: {
    declare: 'Luxury brand item',
    notice: 'Luxury item: you will be paid 30 days after the buyer receives it. The buyer has 30 days to report a counterfeit.',
    certify: 'I certify that this item is authentic. I know that selling a counterfeit is a crime and that if it is fake I will have to refund the buyer, pay a penalty of 50% of the price, and that my account will be closed.',
    required: 'Tick the authenticity certification to list this luxury item.',
  },
  fr: {
    declare: 'Article de marque de luxe',
    notice: 'Article de luxe : tu seras payé 30 jours après la réception par l’acheteur. L’acheteur a 30 jours pour signaler une contrefaçon.',
    certify: 'Je certifie que cet article est authentique. Je sais que vendre une contrefaçon est un délit et qu’en cas de faux je devrai rembourser l’acheteur, payer une pénalité de 50 % du prix, et que mon compte sera fermé.',
    required: 'Coche la certification d’authenticité pour mettre en vente cet article de luxe.',
  },
  es: {
    declare: 'Artículo de marca de lujo',
    notice: 'Artículo de lujo: cobrarás 30 días después de que el comprador lo reciba. El comprador tiene 30 días para denunciar una falsificación.',
    certify: 'Certifico que este artículo es auténtico. Sé que vender una falsificación es un delito y que, si es falso, tendré que reembolsar al comprador, pagar una penalización del 50 % del precio, y que mi cuenta se cerrará.',
    required: 'Marca la certificación de autenticidad para poner a la venta este artículo de lujo.',
  },
  ru: {
    declare: 'Товар люксового бренда',
    notice: 'Товар класса люкс: ты получишь оплату через 30 дней после того, как покупатель его получит. У покупателя есть 30 дней, чтобы сообщить о подделке.',
    certify: 'Я подтверждаю, что этот товар подлинный. Я знаю, что продажа подделки — правонарушение и что, если товар окажется поддельным, мне придётся вернуть деньги покупателю, заплатить штраф 50 % от цены, а мой аккаунт будет закрыт.',
    required: 'Отметь подтверждение подлинности, чтобы выставить этот товар класса люкс.',
  },
  he: {
    declare: 'פריט של מותג יוקרה',
    notice: 'פריט יוקרה: התשלום יגיע אליכם 30 ימים אחרי שהקונה יקבל אותו. לקונה יש 30 ימים לדווח על זיוף.',
    certify: 'אני מאשר/ת שהפריט הזה מקורי. ידוע לי שמכירת זיוף היא עבירה, ושאם יתברר שהוא מזויף אצטרך להחזיר לקונה את הכסף, לשלם קנס של 50% מהמחיר, ושהחשבון שלי ייסגר.',
    required: 'סמנו את ההצהרה על מקוריות כדי להעלות את פריט היוקרה למכירה.',
  },
}

export function luxuryText(): LuxuryText {
  return tr(TEXTS)
}

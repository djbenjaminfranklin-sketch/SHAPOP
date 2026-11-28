import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getLang, tr, t as i18nT, type Localized } from '../../lib/i18n'
import { formatItemPrice } from '../../lib/fulfillment'
import type { TranslationKey } from '../../lib/i18n'
import { categories } from '../CategoryIcons'
import { rtlFlip, rtlTextAlign } from '../../lib/rtl'
import {
  subCategories,
  subCategoryLabel,
  optionLabel,
  sellingLocations,
  platforms,
  revenueRanges,
  teamSizes,
  weeklyHours,
  bankOptions,
} from './SubCategoryData'

interface Props {
  onComplete: () => void
  onClose: () => void
}

const TOTAL_STEPS = 11

/* ─── Step hero illustrations (emoji in gradient circles) ─── */
const stepHeroes: { emoji: string; gradient: string }[] = [
  { emoji: '\u{1F4DC}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #B91C3C 100%)' },  // 0 rules
  { emoji: '\u{1F6CD}\u{FE0F}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 60%, #00E5FF 100%)' },  // 1 category
  { emoji: '\u{1F3AF}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #0091EA 100%)' },  // 2 sub
  { emoji: '\u{1F464}', gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 60%, #1D4ED8 100%)' },  // 3 type
  { emoji: '\u{1F30D}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 60%, #047857 100%)' },  // 4 where
  { emoji: '\u{1F4F1}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 60%, #006F80 100%)' },  // 5 platforms
  { emoji: '\u{1F4B0}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 60%, #B45309 100%)' },  // 6 revenue
  { emoji: '\u{1F465}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #4338CA 100%)' },  // 7 team
  { emoji: '\u{1F3A5}', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 60%, #B91C1C 100%)' },  // 8 hours
  { emoji: '\u{1F504}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #0D9488 60%, #0F766E 100%)' },  // 9 return policy
  { emoji: '\u{1F3E6}', gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 60%, #9F1239 100%)' },  // 10 bank
]

export default function OnboardingWizard({ onComplete, onClose }: Props) {
  const { user, profile } = useAuth()
  const lang = getLang()

  const [step, setStep] = useState(0)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [feesAccepted, setFeesAccepted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([])
  const [sellerType, setSellerType] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [etsyUrl, setEtsyUrl] = useState('')
  const [revenue, setRevenue] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [liveHours, setLiveHours] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('no_return')
  const [bankChoice, setBankChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  /* ─── Animated step transitions ─── */
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [visible, setVisible] = useState(true)
  const prevStep = useRef(step)

  useEffect(() => {
    if (prevStep.current !== step) {
      setSlideDir(step > prevStep.current ? 'left' : 'right')
      setVisible(false)
      const timer = setTimeout(() => {
        setVisible(true)
      }, 60)
      prevStep.current = step
      return () => clearTimeout(timer)
    }
  }, [step])

  const txt = {
    en: {
      rules: 'Community rules',
      rule1: 'Be honest about the item\'s condition',
      rule2: 'Hand over or send the item within your handover time',
      rule3: 'No counterfeit or prohibited items',
      rule4: 'Reply to buyers within 24 hours',
      rule5: 'Respect all buyers and sellers',
      understood: 'Got it!',
      accept: 'I accept the rules',
      feesTitle: 'Fees',
      fee1: 'Platform commission: 8% (no VAT: French VAT not applicable, art. 293 B CGI)',
      fee2: 'Payment processing: 2.9% + {fixed}',
      fee3: 'Example: on a {sale} sale, total fees are {fees} and you receive {net}',
      fee4: 'Payment: 24 h after the buyer confirms receipt (right away if they say everything is fine), or 10 days after sending without news; 30 days for luxury items',
      acceptFees: 'I accept the fees',
      category: 'What do you sell?',
      categoryDesc: 'Pick your main category',
      subCategory: 'More specifically...',
      subCategoryDesc: 'Select all that apply',
      type: 'Are you...',
      individual: 'Individual',
      individualDesc: 'Selling personal items or a small hobby',
      businessName: 'Business name',
      businessNumber: 'Registration number (e.g. company or tax ID)',
      businessAddress: 'Business address',
      businessHint: 'Shown to buyers before they pay (required by law). As a business, you must accept returns for at least 14 days.',
      proReturnHint: 'Professional sellers must accept returns for at least 14 days (legal withdrawal right).',
      privateSellerHint: 'Private seller: buyers do not have the legal 14-day withdrawal right. If you actually sell as a business, you must say so — false declarations are punishable.',
      business: 'Business',
      businessDesc: 'Registered business or professional seller',
      whereSell: 'Where do you sell today?',
      whereSellDesc: 'Select all that apply',
      platformsTitle: 'Which platforms?',
      platformsDesc: 'Select the ones you use',
      etsyUrl: 'Your Etsy shop URL',
      revenueTitle: 'Monthly revenue?',
      revenueDesc: 'Across all your sales channels',
      teamTitle: 'Team size?',
      teamDesc: 'How many people work with you',
      hoursTitle: 'Live hours per week?',
      hoursDesc: 'Or how many you plan to do',
      returnPolicyTitle: 'Return policy',
      returnPolicyDesc: 'Items not received or not as described are always covered by ShaPop protection. On top of that, do you accept returns when a buyer changes their mind?',
      noReturn: 'No change-of-mind returns',
      exchangeOnly: 'Exchanges only',
      return7: 'Returns within 7 days',
      return14: 'Returns within 14 days',
      return30: 'Returns within 30 days',
      bankTitle: 'Payout setup',
      bankDesc: 'How you want to get paid',
      next: 'Next',
      finish: 'Finish',
      saving: 'Saving...',
      back: 'Back',
      saveError: 'Couldn\'t save. Please try again.',
      readRules: 'Please read and accept our rules',
      chooseAccountType: 'Choose your account type',
    },
    fr: {
      rules: 'Règles de la communauté',
      rule1: 'Sois honnête sur l\'état du produit',
      rule2: 'Remets ou envoie l\'article dans ton délai de remise',
      rule3: 'Pas d\'articles contrefaits ou interdits',
      rule4: 'Réponds aux acheteurs sous 24 h',
      rule5: 'Respecte tous les acheteurs et vendeurs',
      understood: 'J\'ai compris !',
      accept: 'J\'accepte les règles',
      feesTitle: 'Grille tarifaire',
      fee1: 'Commission plateforme : 8 % (TVA non applicable, art. 293 B du CGI)',
      fee2: 'Frais de paiement : 2,9 % + {fixed}',
      fee3: 'Exemple : pour une vente de {sale}, frais totaux de {fees}, tu reçois {net}',
      fee4: 'Paiement : 24 h après la réception confirmée par l\'acheteur (tout de suite s\'il dit que tout est conforme), ou 10 jours après l\'envoi sans nouvelles ; 30 jours pour le luxe',
      acceptFees: 'J\'accepte la grille tarifaire',
      category: 'Que vends-tu ?',
      categoryDesc: 'Choisis ta catégorie principale',
      subCategory: 'Plus précisément...',
      subCategoryDesc: 'Sélectionne tout ce qui correspond',
      type: 'Tu es...',
      individual: 'Particulier',
      individualDesc: 'Vente d\'objets personnels ou petit hobby',
      businessName: 'Nom de l\'entreprise',
      businessNumber: 'Numéro d\'immatriculation (ex. SIRET, n° fiscal)',
      businessAddress: 'Adresse de l\'entreprise',
      businessHint: 'Affiché aux acheteurs avant le paiement (obligatoire). En pro, tu dois accepter les retours pendant au moins 14 jours.',
      proReturnHint: 'Un vendeur professionnel doit accepter les retours pendant au moins 14 jours (droit de rétractation légal).',
      privateSellerHint: 'Vendeur particulier : les acheteurs n\'ont pas le droit légal de rétractation de 14 jours. Si tu vends en réalité à titre professionnel, tu dois le déclarer : une fausse déclaration est sanctionnée.',
      business: 'Entreprise',
      businessDesc: 'Commerce enregistré ou vendeur professionnel',
      whereSell: 'Où vends-tu actuellement ?',
      whereSellDesc: 'Sélectionne tout ce qui correspond',
      platformsTitle: 'Quelles plateformes ?',
      platformsDesc: 'Sélectionne celles que tu utilises',
      etsyUrl: 'URL de ta boutique Etsy',
      revenueTitle: 'Chiffre d\'affaires mensuel ?',
      revenueDesc: 'Tous canaux de vente confondus',
      teamTitle: 'Taille de l\'équipe ?',
      teamDesc: 'Combien de personnes travaillent avec toi',
      hoursTitle: 'Heures de live par semaine ?',
      hoursDesc: 'Ou combien tu prévois d\'en faire',
      returnPolicyTitle: 'Politique de retour',
      returnPolicyDesc: 'Les articles non reçus ou non conformes sont toujours couverts par la protection ShaPop. En plus, acceptes-tu les retours quand un acheteur change d\'avis ?',
      noReturn: 'Pas de retour pour changement d\'avis',
      exchangeOnly: 'Échanges uniquement',
      return7: 'Retours sous 7 jours',
      return14: 'Retours sous 14 jours',
      return30: 'Retours sous 30 jours',
      bankTitle: 'Configuration des paiements',
      bankDesc: 'Comment tu veux être payé',
      next: 'Suivant',
      finish: 'Terminer',
      saving: 'Enregistrement...',
      back: 'Retour',
      saveError: 'Erreur lors de l\'enregistrement. Réessaie.',
      readRules: 'Lis et accepte nos règles',
      chooseAccountType: 'Choisis ton type de compte',
    },
    es: {
      rules: 'Normas de la comunidad',
      rule1: 'Sé honesto sobre el estado del producto',
      rule2: 'Entrega o envía el artículo dentro de tu plazo de entrega',
      rule3: 'Nada de artículos falsificados o prohibidos',
      rule4: 'Responde a los compradores en menos de 24 h',
      rule5: 'Respeta a todos los compradores y vendedores',
      understood: '¡Entendido!',
      accept: 'Acepto las normas',
      feesTitle: 'Tarifas',
      fee1: 'Comisión de la plataforma: 8 % (sin IVA: IVA francés no aplicable, art. 293 B CGI)',
      fee2: 'Gastos de pago: 2,9 % + {fixed}',
      fee3: 'Ejemplo: en una venta de {sale}, las comisiones son {fees} y recibes {net}',
      fee4: 'Cobro: 24 h después de que el comprador confirme la recepción (enseguida si dice que todo está bien), o 10 días después del envío sin noticias; 30 días para artículos de lujo',
      acceptFees: 'Acepto las tarifas',
      category: '¿Qué vendes?',
      categoryDesc: 'Elige tu categoría principal',
      subCategory: 'Más concretamente...',
      subCategoryDesc: 'Selecciona todo lo que corresponda',
      type: '¿Eres...?',
      individual: 'Particular',
      individualDesc: 'Vendes cosas personales o es un pequeño hobby',
      businessName: 'Nombre de la empresa',
      businessNumber: 'Número de registro (p. ej. NIF)',
      businessAddress: 'Dirección de la empresa',
      businessHint: 'Se muestra a los compradores antes de pagar (obligatorio). Como profesional, debes aceptar devoluciones durante al menos 14 días.',
      proReturnHint: 'Un vendedor profesional debe aceptar devoluciones durante al menos 14 días (derecho legal de desistimiento).',
      privateSellerHint: 'Vendedor particular: los compradores no tienen el derecho legal de desistimiento de 14 días. Si en realidad vendes como profesional, debes declararlo: una declaración falsa está sancionada.',
      business: 'Empresa',
      businessDesc: 'Negocio registrado o vendedor profesional',
      whereSell: '¿Dónde vendes ahora?',
      whereSellDesc: 'Selecciona todo lo que corresponda',
      platformsTitle: '¿Qué plataformas?',
      platformsDesc: 'Selecciona las que usas',
      etsyUrl: 'URL de tu tienda Etsy',
      revenueTitle: '¿Facturación mensual?',
      revenueDesc: 'De todos tus canales de venta',
      teamTitle: '¿Tamaño del equipo?',
      teamDesc: 'Cuántas personas trabajan contigo',
      hoursTitle: '¿Horas de directo por semana?',
      hoursDesc: 'O cuántas tienes previsto hacer',
      returnPolicyTitle: 'Política de devoluciones',
      returnPolicyDesc: 'Los artículos no recibidos o que no coinciden con el anuncio siempre están cubiertos por la protección de ShaPop. Además, ¿aceptas devoluciones cuando un comprador cambia de opinión?',
      noReturn: 'Sin devoluciones por cambio de opinión',
      exchangeOnly: 'Solo cambios',
      return7: 'Devoluciones en 7 días',
      return14: 'Devoluciones en 14 días',
      return30: 'Devoluciones en 30 días',
      bankTitle: 'Configuración de cobros',
      bankDesc: 'Cómo quieres cobrar',
      next: 'Siguiente',
      finish: 'Terminar',
      saving: 'Guardando...',
      back: 'Atrás',
      saveError: 'Error al guardar. Inténtalo de nuevo.',
      readRules: 'Lee y acepta nuestras normas',
      chooseAccountType: 'Elige tu tipo de cuenta',
    },
    ru: {
      rules: 'Правила сообщества',
      rule1: 'Честно описывай состояние товара',
      rule2: 'Передай или отправь товар в пределах своего срока передачи',
      rule3: 'Никаких подделок и запрещённых товаров',
      rule4: 'Отвечай покупателям в течение 24 часов',
      rule5: 'Уважай всех покупателей и продавцов',
      understood: 'Понятно!',
      accept: 'Принимаю правила',
      feesTitle: 'Тарифы',
      fee1: 'Комиссия платформы: 8 % (без НДС: французский НДС не применяется, ст. 293 B CGI)',
      fee2: 'Комиссия за платёж: 2,9 % + {fixed}',
      fee3: 'Пример: при продаже на {sale} комиссии составят {fees}, ты получишь {net}',
      fee4: 'Выплата: через 24 ч после того, как покупатель подтвердит получение (сразу, если всё в порядке), или через 10 дней после отправки без вестей; 30 дней для товаров класса люкс',
      acceptFees: 'Принимаю тарифы',
      category: 'Что ты продаёшь?',
      categoryDesc: 'Выбери основную категорию',
      subCategory: 'А точнее...',
      subCategoryDesc: 'Отметь всё подходящее',
      type: 'Ты...',
      individual: 'Частное лицо',
      individualDesc: 'Продаёшь личные вещи или занимаешься хобби',
      businessName: 'Название компании',
      businessNumber: 'Регистрационный номер (например, налоговый)',
      businessAddress: 'Адрес компании',
      businessHint: 'Показывается покупателям до оплаты (обязательно по закону). Профессионал обязан принимать возврат не менее 14 дней.',
      proReturnHint: 'Профессиональный продавец обязан принимать возврат не менее 14 дней (законное право на отказ).',
      privateSellerHint: 'Частный продавец: у покупателей нет законного права на отказ в течение 14 дней. Если ты на самом деле продаёшь как бизнес, ты обязан это указать — ложное заявление наказуемо.',
      business: 'Компания',
      businessDesc: 'Зарегистрированный бизнес или профессиональный продавец',
      whereSell: 'Где ты продаёшь сейчас?',
      whereSellDesc: 'Отметь всё подходящее',
      platformsTitle: 'На каких площадках?',
      platformsDesc: 'Отметь те, которыми пользуешься',
      etsyUrl: 'Ссылка на твой магазин Etsy',
      revenueTitle: 'Выручка в месяц?',
      revenueDesc: 'По всем каналам продаж',
      teamTitle: 'Размер команды?',
      teamDesc: 'Сколько человек работает с тобой',
      hoursTitle: 'Часов эфира в неделю?',
      hoursDesc: 'Или сколько планируешь',
      returnPolicyTitle: 'Условия возврата',
      returnPolicyDesc: 'Неполученные товары и товары, не соответствующие описанию, всегда защищены ShaPop. А принимаешь ли ты возврат, если покупатель просто передумал?',
      noReturn: 'Без возврата, если покупатель передумал',
      exchangeOnly: 'Только обмен',
      return7: 'Возврат в течение 7 дней',
      return14: 'Возврат в течение 14 дней',
      return30: 'Возврат в течение 30 дней',
      bankTitle: 'Настройка выплат',
      bankDesc: 'Как ты хочешь получать деньги',
      next: 'Далее',
      finish: 'Готово',
      saving: 'Сохраняем...',
      back: 'Назад',
      saveError: 'Не удалось сохранить. Попробуй ещё раз.',
      readRules: 'Прочитай и прими наши правила',
      chooseAccountType: 'Выбери тип аккаунта',
    },
    he: {
      rules: 'כללי הקהילה',
      rule1: 'היו כנים לגבי מצב המוצר',
      rule2: 'מסרו או שלחו את הפריט בתוך זמן המסירה שלכם',
      rule3: 'בלי מוצרים מזויפים או אסורים',
      rule4: 'ענו לקונים תוך 24 שעות',
      rule5: 'כבדו את כל הקונים והמוכרים',
      understood: 'הבנתי!',
      accept: 'אני מסכים/ה לכללים',
      feesTitle: 'עמלות',
      fee1: 'עמלת פלטפורמה: 8% (ללא מע״מ: מע״מ צרפתי לא חל, סעיף 293 B)',
      fee2: 'עמלת תשלום: ‏2.9% + {fixed}',
      fee3: 'דוגמה: במכירה של {sale}, סך העמלות {fees} ואת/ה מקבל/ת {net}',
      fee4: 'תשלום: 24 שעות אחרי שהקונה מאשר/ת קבלה (מיד אם הכול תקין), או 10 ימים אחרי המשלוח בלי חדשות; 30 יום לפריטי יוקרה',
      acceptFees: 'אני מסכים/ה לעמלות',
      category: 'מה את/ה מוכר/ת?',
      categoryDesc: 'בחרו קטגוריה ראשית',
      subCategory: 'ובאופן יותר מדויק...',
      subCategoryDesc: 'סמנו את כל מה שמתאים',
      type: 'את/ה...',
      individual: 'אדם פרטי',
      individualDesc: 'מכירת חפצים אישיים או תחביב קטן',
      businessName: 'שם העסק',
      businessNumber: 'מספר עוסק / ח.פ.',
      businessAddress: 'כתובת העסק',
      businessHint: 'מוצג לקונים לפני התשלום (חובה לפי חוק). כעסק, חובה לקבל החזרות לפחות 14 יום.',
      proReturnHint: 'מוכר עסקי חייב לקבל החזרות לפחות 14 יום (זכות ביטול לפי חוק).',
      privateSellerHint: 'מוכר פרטי: לקונים אין זכות ביטול חוקית של 14 יום. אם בפועל את/ה מוכר/ת כעסק, חובה להצהיר על כך — הצהרה כוזבת גוררת סנקציות.',
      business: 'עסק',
      businessDesc: 'עסק רשום או מוכר/ת מקצועי/ת',
      whereSell: 'איפה את/ה מוכר/ת היום?',
      whereSellDesc: 'סמנו את כל מה שמתאים',
      platformsTitle: 'באילו פלטפורמות?',
      platformsDesc: 'סמנו את אלה שאת/ה משתמש/ת בהן',
      etsyUrl: 'כתובת החנות שלך ב-Etsy',
      revenueTitle: 'הכנסה חודשית?',
      revenueDesc: 'מכל ערוצי המכירה שלך',
      teamTitle: 'גודל הצוות?',
      teamDesc: 'כמה אנשים עובדים איתך',
      hoursTitle: 'שעות שידור בשבוע?',
      hoursDesc: 'או כמה את/ה מתכנן/ת',
      returnPolicyTitle: 'מדיניות החזרות',
      returnPolicyDesc: 'פריטים שלא התקבלו או שלא תואמים לתיאור תמיד מוגנים על ידי ShaPop. בנוסף, האם את/ה מקבל/ת החזרות כשקונה מתחרט/ת?',
      noReturn: 'אין החזרות במקרה של חרטה',
      exchangeOnly: 'החלפות בלבד',
      return7: 'החזרה תוך 7 ימים',
      return14: 'החזרה תוך 14 ימים',
      return30: 'החזרה תוך 30 ימים',
      bankTitle: 'הגדרת תשלומים',
      bankDesc: 'איך את/ה רוצה לקבל תשלום',
      next: 'הבא',
      finish: 'סיום',
      saving: 'שומרים...',
      back: 'חזרה',
      saveError: 'השמירה נכשלה. נסו שוב.',
      readRules: 'קראו ואשרו את הכללים שלנו',
      chooseAccountType: 'בחרו את סוג החשבון',
    },
  } satisfies Localized<Record<string, string>>

  const t = tr(txt)
  const money = (n: number) => formatItemPrice(n, profile?.country)
  const feeLines = [
    t.fee1,
    t.fee2.replace('{fixed}', money(0.30)),
    t.fee3.replace('{sale}', money(50)).replace('{fees}', money(6.90)).replace('{net}', money(43.10)),
    t.fee4,
  ]

  // Filter categories: remove 'for_you' and 'following' (not real selling categories)
  const sellingCategories = categories.filter(c => c.id !== 'for_you' && c.id !== 'following')

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return rulesAccepted && feesAccepted
      case 1: return selectedCategory !== ''
      case 2: return selectedSubCategories.length > 0
      case 3: return sellerType === 'individual' || (sellerType === 'business' && !!businessName.trim() && !!businessNumber.trim() && !!businessAddress.trim())
      case 4: return selectedLocations.length > 0
      case 5: return selectedPlatforms.length > 0 || selectedLocations.includes('nowhere')
      case 6: return revenue !== ''
      case 7: return teamSize !== ''
      case 8: return liveHours !== ''
      case 9: return returnPolicy !== ''
      case 10: return bankChoice !== ''
      default: return false
    }
  }

  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      // Update profile to seller
      const { error: profileError } = await supabase.from('profiles').update({ is_seller: true }).eq('id', user.id)
      if (profileError) {
        console.error('Failed to update seller status:', profileError)
        throw profileError
      }

      // Check if seller record exists
      const { data: existingSeller } = await supabase
        .from('sellers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      const sellerData = {
        // Nom de boutique par défaut : le nom d'affichage de l'utilisateur
        store_name: profile?.display_name || profile?.username || (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || '',
        categories: [selectedCategory],
        sub_categories: selectedSubCategories,
        seller_type: sellerType,
        selling_locations: selectedLocations,
        platforms: selectedPlatforms,
        etsy_url: etsyUrl || null,
        revenue_range: revenue,
        team_size: teamSize,
        live_hours: liveHours,
        return_policy: sellerType === 'business' && !['return_14', 'return_30'].includes(returnPolicy) ? 'return_14' : returnPolicy,
        business_name: sellerType === 'business' ? businessName.trim() : null,
        business_number: sellerType === 'business' ? businessNumber.trim() : null,
        business_address: sellerType === 'business' ? businessAddress.trim() : null,
        bank_choice: bankChoice,
        fees_accepted_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString(),
      }

      if (existingSeller) {
        const { error: updateError } = await supabase.from('sellers').update(sellerData).eq('id', user.id)
        if (updateError) {
          console.error('Failed to update seller record:', updateError)
          throw updateError
        }
      } else {
        const { error: insertError } = await supabase.from('sellers').insert({ id: user.id, ...sellerData })
        if (insertError) {
          console.error('Failed to create seller record:', insertError)
          throw insertError
        }
      }

      onComplete()
    } catch (err) {
      console.error('[OnboardingWizard] Save failed:', err)
      setError(t.saveError)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleFinish()
    } else {
      setStep(step + 1)
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const rules = [
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2"><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10"/></svg>, text: t.rule1 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, text: t.rule2 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2"><path d="M18.36 6.64A9 9 0 015.64 18.36M5.64 5.64A9 9 0 0118.36 18.36" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>, text: t.rule3 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>, text: t.rule4 },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>, text: t.rule5 },
  ]

  const toggleMultiSelect = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  /* ─── Reusable style helpers ─── */
  const heroCircle = (stepIdx: number) => ({
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: stepHeroes[stepIdx].gradient,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 'calc(40px * var(--fs, 1))',
    boxShadow: '0 8px 32px rgba(0, 229, 255,0.25), 0 0 0 6px rgba(0, 229, 255,0.08)',
    margin: '0 auto 24px',
  })

  const sectionTitle = {
    fontSize: 'calc(28px * var(--fs, 1))',
    fontWeight: 800 as const,
    color: '#fff',
    marginBottom: '6px',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
  }

  const sectionDesc = {
    fontSize: 'calc(15px * var(--fs, 1))',
    color: '#f0f0f0',
    marginBottom: '28px',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  }

  const glassCard = (selected: boolean) => ({
    background: selected
      ? 'linear-gradient(135deg, rgba(0, 229, 255,0.12) 0%, rgba(0,229,255,0.08) 100%)'
      : 'linear-gradient(135deg, #141414 0%, #0C0C0C 100%)',
    border: selected ? '1.5px solid rgba(0, 229, 255,0.6)' : '1px solid #1E1E1E',
    borderRadius: '16px',
    cursor: 'pointer',
    boxShadow: selected
      ? '0 4px 20px rgba(0, 229, 255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
  })

  const radioCircle = (selected: boolean) => ({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: selected ? 'none' : '2px solid #444',
    background: selected ? 'linear-gradient(135deg, #00E5FF, #0091EA)' : 'transparent',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    boxShadow: selected ? '0 2px 8px rgba(0, 229, 255,0.4)' : 'none',
  })

  const checkboxSquare = (selected: boolean) => ({
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    border: selected ? 'none' : '2px solid #444',
    background: selected ? 'linear-gradient(135deg, #00E5FF, #0091EA)' : 'transparent',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    boxShadow: selected ? '0 2px 8px rgba(0, 229, 255,0.4)' : 'none',
  })

  const checkIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const innerDot = (
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff',
    }} />
  )

  const renderStep = () => {
    switch (step) {
      // Step 0 - Rules
      case 0:
        return (
          <div style={{ padding: '0 24px' }}>
            {/* Hero */}
            <div style={heroCircle(0)}>{stepHeroes[0].emoji}</div>
            <h2 style={sectionTitle}>{t.rules}</h2>
            <p style={{ ...sectionDesc, marginBottom: '20px' }}>
              {t.readRules}
            </p>

            {/* Rules card with gradient border */}
            <div style={{
              background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 50%, #0F0F0F 100%)',
              borderRadius: '20px',
              border: '1px solid #1A1A1A',
              padding: '6px 0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              {rules.map((rule, i) => (
                <div key={rule.text} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 20px',
                  borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12) 0%, rgba(0,229,255,0.06) 100%)',
                    border: '1px solid rgba(0, 229, 255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {rule.icon}
                  </div>
                  <span style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#D4D4D4', lineHeight: 1.5, fontWeight: 500 }}>{rule.text}</span>
                </div>
              ))}
            </div>

            {/* Accept rules checkbox */}
            <button
              onClick={() => setRulesAccepted(!rulesAccepted)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', marginTop: '24px',
                padding: '18px 20px', borderRadius: '16px', width: '100%',
                background: rulesAccepted
                  ? 'linear-gradient(135deg, rgba(0, 229, 255,0.12) 0%, rgba(0,229,255,0.06) 100%)'
                  : 'linear-gradient(135deg, #141414, #0C0C0C)',
                border: rulesAccepted ? '1.5px solid rgba(0, 229, 255,0.5)' : '1px solid #1E1E1E',
                cursor: 'pointer',
                boxShadow: rulesAccepted
                  ? '0 4px 20px rgba(0, 229, 255,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={checkboxSquare(rulesAccepted)}>
                {rulesAccepted && checkIcon}
              </div>
              <span style={{ fontSize: 'calc(16px * var(--fs, 1))', color: '#fff', fontWeight: 700 }}>{t.accept}</span>
            </button>

            {/* Fee schedule card */}
            <div style={{
              background: 'linear-gradient(135deg, #0F0F0F 0%, #141418 50%, #0F0F0F 100%)',
              borderRadius: '20px',
              border: '1px solid #1A1A1A',
              padding: '20px',
              marginTop: '24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E5FF, #00E5FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'calc(18px * var(--fs, 1))', flexShrink: 0,
                }}>
                  {'\u{1F4B0}'}
                </div>
                <h3 style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{t.feesTitle}</h3>
              </div>
              {feeLines.map((fee, i) => (
                <div key={fee} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ color: '#00E5FF', fontSize: 'calc(14px * var(--fs, 1))', flexShrink: 0, marginTop: '1px' }}>
                    {i < 2 ? '\u{2022}' : i === 2 ? '\u{1F4CA}' : '\u{1F4C5}'}
                  </span>
                  <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#D4D4D4', lineHeight: 1.5 }}>{fee}</span>
                </div>
              ))}
            </div>

            {/* Accept fees checkbox */}
            <button
              onClick={() => setFeesAccepted(!feesAccepted)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px',
                padding: '18px 20px', borderRadius: '16px', width: '100%',
                background: feesAccepted
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)'
                  : 'linear-gradient(135deg, #141414, #0C0C0C)',
                border: feesAccepted ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid #1E1E1E',
                cursor: 'pointer',
                boxShadow: feesAccepted
                  ? '0 4px 20px rgba(245,158,11,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{
                ...checkboxSquare(feesAccepted),
                background: feesAccepted ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                boxShadow: feesAccepted ? '0 2px 8px rgba(245,158,11,0.4)' : 'none',
              }}>
                {feesAccepted && checkIcon}
              </div>
              <span style={{ fontSize: 'calc(16px * var(--fs, 1))', color: '#fff', fontWeight: 700 }}>{t.acceptFees}</span>
            </button>
          </div>
        )

      // Step 1 - Category
      case 1:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(1)}>{stepHeroes[1].emoji}</div>
            <h2 style={sectionTitle}>{t.category}</h2>
            <p style={sectionDesc}>{t.categoryDesc}</p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            }}>
              {sellingCategories.map(cat => {
                const selected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setSelectedSubCategories([])
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      padding: '14px 6px 12px', borderRadius: '18px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(0, 229, 255,0.15) 0%, rgba(0,229,255,0.08) 100%)'
                        : 'linear-gradient(160deg, #161616 0%, #0E0E0E 100%)',
                      border: selected ? '2px solid #00E5FF' : '1px solid #1C1C1C',
                      cursor: 'pointer',
                      boxShadow: selected
                        ? '0 4px 20px rgba(0, 229, 255,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Shimmer overlay on selected */}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255,0.4), transparent)',
                      }} />
                    )}
                    {cat.image ? (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden',
                        boxShadow: selected
                          ? '0 4px 12px rgba(0, 229, 255,0.3)'
                          : '0 2px 6px rgba(0,0,0,0.4)',
                        border: selected ? '2px solid rgba(0, 229, 255,0.3)' : '1px solid #222',
                      }}>
                        <img
                          src={cat.image}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#001014',
                        boxShadow: '0 4px 12px rgba(0,229,255,0.3)',
                      }}>
                        {cat.label.charAt(0)}
                      </div>
                    )}
                    <span style={{
                      fontSize: 'calc(11px * var(--fs, 1))', fontWeight: selected ? 700 : 600,
                      color: selected ? '#00E5FF' : '#f0f0f0',
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {i18nT(lang, cat.id as TranslationKey)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 2 - Sub-categories
      case 2: {
        const subs = subCategories[selectedCategory] || []
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(2)}>{stepHeroes[2].emoji}</div>
            <h2 style={sectionTitle}>{t.subCategory}</h2>
            <p style={sectionDesc}>{t.subCategoryDesc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {subs.map(sub => {
                const selected = selectedSubCategories.includes(sub)
                return (
                  <button
                    key={sub}
                    onClick={() => toggleMultiSelect(selectedSubCategories, setSelectedSubCategories, sub)}
                    style={{
                      padding: '10px 18px', borderRadius: '24px',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(0, 229, 255,0.18) 0%, rgba(0,229,255,0.08) 100%)'
                        : 'linear-gradient(135deg, #151515 0%, #0E0E0E 100%)',
                      border: selected ? '1.5px solid rgba(0, 229, 255,0.6)' : '1px solid #222',
                      color: selected ? '#00E5FF' : '#f0f0f0',
                      fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      boxShadow: selected
                        ? '0 2px 12px rgba(0, 229, 255,0.2)'
                        : '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {selected && '\u2713 '}{subCategoryLabel(sub)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      // Step 3 - Type
      case 3:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(3)}>{stepHeroes[3].emoji}</div>
            <h2 style={sectionTitle}>{t.type}</h2>
            <p style={{ ...sectionDesc, marginBottom: '32px' }}>
              {t.chooseAccountType}
            </p>
            {[
              { id: 'individual', title: t.individual, desc: t.individualDesc, emoji: '\u{1F9D1}\u{200D}\u{1F4BB}', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
              { id: 'business', title: t.business, desc: t.businessDesc, emoji: '\u{1F3E2}', gradient: 'linear-gradient(135deg, #00E5FF, #0091EA)' },
            ].map(opt => {
              const selected = sellerType === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => { setSellerType(opt.id); if (opt.id === 'business' && !['return_14', 'return_30'].includes(returnPolicy)) setReturnPolicy('return_14') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', width: '100%',
                    padding: '20px 18px', marginBottom: '14px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: selected ? opt.gradient : 'linear-gradient(135deg, #1A1A1A, #141414)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 'calc(26px * var(--fs, 1))',
                    boxShadow: selected ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {opt.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{opt.title}</p>
                    <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.4 }}>{opt.desc}</p>
                  </div>
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                </button>
              )
            })}
            {sellerType === 'business' && (
              <div style={{ marginTop: '6px' }}>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={t.businessName} maxLength={200}
                  style={{ width: '100%', padding: '14px 16px', marginBottom: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box' }} />
                <input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} placeholder={t.businessNumber} maxLength={200}
                  style={{ width: '100%', padding: '14px 16px', marginBottom: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box' }} />
                <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder={t.businessAddress} maxLength={200}
                  style={{ width: '100%', padding: '14px 16px', marginBottom: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box' }} />
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#ccc', lineHeight: 1.4, margin: 0 }}>{t.businessHint}</p>
              </div>
            )}
            {sellerType === 'individual' && (
              <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#ccc', lineHeight: 1.4, margin: '6px 0 0' }}>{t.privateSellerHint}</p>
            )}
          </div>
        )

      // Step 4 - Where do you sell?
      case 4:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(4)}>{stepHeroes[4].emoji}</div>
            <h2 style={sectionTitle}>{t.whereSell}</h2>
            <p style={sectionDesc}>{t.whereSellDesc}</p>
            {sellingLocations.map(loc => {
              const label = optionLabel(loc)
              const selected = selectedLocations.includes(loc.id)
              return (
                <button
                  key={loc.id}
                  onClick={() => toggleMultiSelect(selectedLocations, setSelectedLocations, loc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={checkboxSquare(selected)}>
                    {selected && checkIcon}
                  </div>
                  <span style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 5 - Platforms
      case 5:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(5)}>{stepHeroes[5].emoji}</div>
            <h2 style={sectionTitle}>{t.platformsTitle}</h2>
            <p style={sectionDesc}>{t.platformsDesc}</p>
            {platforms.map(plat => {
              const selected = selectedPlatforms.includes(plat.id)
              return (
                <div key={plat.id}>
                  <button
                    onClick={() => toggleMultiSelect(selectedPlatforms, setSelectedPlatforms, plat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                      padding: '16px 18px', marginBottom: '10px', ...rtlTextAlign('left'),
                      ...glassCard(selected),
                    }}
                  >
                    <div style={checkboxSquare(selected)}>
                      {selected && checkIcon}
                    </div>
                    <span style={{
                      fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                    }}>{plat.localized ? tr(plat.localized) : plat.label}</span>
                  </button>
                  {plat.hasUrl && selected && (
                    <input
                      type="url"
                      value={etsyUrl}
                      onChange={e => setEtsyUrl(e.target.value)}
                      placeholder={t.etsyUrl}
                      style={{
                        width: '100%', padding: '14px 18px', marginBottom: '10px',
                        background: 'linear-gradient(135deg, #141414, #0C0C0C)',
                        border: '1px solid #2A2A2A', borderRadius: '14px',
                        color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(0, 229, 255,0.5)' }}
                      onBlur={e => { e.target.style.borderColor = '#2A2A2A' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )

      // Step 6 - Revenue
      case 6:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(6)}>{stepHeroes[6].emoji}</div>
            <h2 style={sectionTitle}>{t.revenueTitle}</h2>
            <p style={sectionDesc}>{t.revenueDesc}</p>
            {revenueRanges.map(range => {
              const label = optionLabel(range)
              const selected = revenue === range.id
              return (
                <button
                  key={range.id}
                  onClick={() => setRevenue(range.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 7 - Team size
      case 7:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(7)}>{stepHeroes[7].emoji}</div>
            <h2 style={sectionTitle}>{t.teamTitle}</h2>
            <p style={sectionDesc}>{t.teamDesc}</p>
            {teamSizes.map(size => {
              const label = optionLabel(size)
              const selected = teamSize === size.id
              return (
                <button
                  key={size.id}
                  onClick={() => setTeamSize(size.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 8 - Weekly hours
      case 8:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(8)}>{stepHeroes[8].emoji}</div>
            <h2 style={sectionTitle}>{t.hoursTitle}</h2>
            <p style={sectionDesc}>{t.hoursDesc}</p>
            {weeklyHours.map(hours => {
              const label = optionLabel(hours)
              const selected = liveHours === hours.id
              return (
                <button
                  key={hours.id}
                  onClick={() => setLiveHours(hours.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                  }}>{label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 9 - Return policy
      case 9:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(9)}>{stepHeroes[9].emoji}</div>
            <h2 style={sectionTitle}>{t.returnPolicyTitle}</h2>
            <p style={sectionDesc}>{sellerType === 'business' ? t.proReturnHint : t.returnPolicyDesc}</p>
            {[
              { id: 'no_return', label: t.noReturn },
              { id: 'exchange_only', label: t.exchangeOnly },
              { id: 'return_7', label: t.return7 },
              { id: 'return_14', label: t.return14 },
              { id: 'return_30', label: t.return30 },
            ].filter(opt => sellerType !== 'business' || opt.id === 'return_14' || opt.id === 'return_30').map(opt => {
              const selected = returnPolicy === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setReturnPolicy(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                    padding: '18px', marginBottom: '10px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                  <span style={{
                    fontSize: 'calc(15px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 600,
                  }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        )

      // Step 10 - Bank
      case 10:
        return (
          <div style={{ padding: '0 24px' }}>
            <div style={heroCircle(10)}>{stepHeroes[10].emoji}</div>
            <h2 style={sectionTitle}>{t.bankTitle}</h2>
            <p style={sectionDesc}>{t.bankDesc}</p>
            {bankOptions.map(opt => {
              const label = optionLabel(opt)
              const selected = bankChoice === opt.id
              const iconColors: Record<string, string> = {
                stripe: '#6772E5',
                later: '#888',
              }
              const iconGradients: Record<string, string> = {
                stripe: 'linear-gradient(135deg, #6772E5, #0091EA)',
                later: 'linear-gradient(135deg, #555, #333)',
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => setBankChoice(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', width: '100%',
                    padding: '20px 18px', marginBottom: '12px', ...rtlTextAlign('left'),
                    ...glassCard(selected),
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: selected
                      ? iconGradients[opt.id] || iconGradients.later
                      : 'linear-gradient(135deg, #1A1A1A, #141414)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: selected ? `0 4px 16px ${iconColors[opt.id]}33` : 'none',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {opt.id === 'stripe' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selected ? '#fff' : iconColors.stripe} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selected ? '#fff' : '#888'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: 'calc(16px * var(--fs, 1))', color: selected ? '#fff' : '#f0f0f0', fontWeight: 700,
                    flex: 1,
                  }}>{label}</span>
                  <div style={radioCircle(selected)}>
                    {selected && innerDot}
                  </div>
                </button>
              )
            })}

          </div>
        )

      default:
        return null
    }
  }

  const able = canProceed()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: '#000',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
        }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{
              background: 'linear-gradient(135deg, #1A1A1A, #111)',
              border: '1px solid #2A2A2A', cursor: 'pointer', padding: '10px',
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{...rtlFlip()}}>
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div style={{ width: '42px' }} />
          )}

          {/* Step counter */}
          <span style={{
            fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0',
            letterSpacing: '1px',
          }}>
            {step + 1} / {TOTAL_STEPS}
          </span>

          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg, #1A1A1A, #111)',
            border: '1px solid #2A2A2A', cursor: 'pointer', padding: '10px',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Progress bar - thicker & more prominent */}
        <div style={{
          height: '6px', backgroundColor: '#111', margin: '0 20px 6px',
          borderRadius: '3px', overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: 'linear-gradient(90deg, #0091EA, #00E5FF, #FFD700)',
            width: `${progress}%`,
            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 0 12px rgba(0, 229, 255,0.5), 0 0 4px rgba(0, 229, 255,0.3)',
          }} />
        </div>
      </div>

      {/* Content with animated transitions */}
      <div style={{
        flex: 1, overflowY: 'auto', paddingBottom: '110px', paddingTop: '24px',
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateX(0)'
          : slideDir === 'left'
            ? 'translateX(40px)'
            : 'translateX(-40px)',
        transition: visible
          ? 'opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)'
          : 'none',
      }}>
        {renderStep()}
      </div>

      {/* Footer button - gradient with glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'linear-gradient(to top, #000 60%, transparent)',
      }}>
        {error && (
          <p style={{ color: '#EF4444', fontSize: 'calc(13px * var(--fs, 1))', textAlign: 'center', marginBottom: '8px' }}>{error}</p>
        )}
        <button
          onClick={() => { setError(''); handleNext() }}
          disabled={!able || saving}
          style={{
            width: '100%', padding: '18px',
            background: able
              ? 'linear-gradient(135deg, #00E5FF 0%, #0091EA 50%, #B91C3C 100%)'
              : 'linear-gradient(135deg, #2A2A2A, #1A1A1A)',
            borderRadius: '16px', border: 'none',
            color: able ? '#fff' : '#f0f0f0',
            fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800,
            cursor: able ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.7 : 1,
            boxShadow: able
              ? '0 6px 24px rgba(0, 229, 255,0.35), 0 2px 8px rgba(0,229,255,0.3)'
              : '0 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '0.3px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Button shimmer effect */}
          {able && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }} />
          )}
          {saving ? t.saving : step === TOTAL_STEPS - 1 ? t.finish : t.next}
        </button>
      </div>
    </div>
  )
}

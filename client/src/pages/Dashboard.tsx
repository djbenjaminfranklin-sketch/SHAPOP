import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, getLocale, tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { formatMoney, currencyForCountry } from '../lib/fulfillment'
import { apiFetch } from '../lib/api'
import OnboardingWizard from '../components/seller/OnboardingWizard'
import OnboardingCelebration from '../components/seller/OnboardingCelebration'
import EngagementSummary from '../components/seller/EngagementSummary'
import { ft } from '../lib/fulfillmentText'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton, { BackArrowButton } from '../components/PageBackButton'
import { displayItemTitle } from '../lib/fulfillment'

interface HealthMetrics {
  dispute_rate: number
  cancel_rate: number
  completion_rate: number
  avg_shipping_days: number
  total_orders: number
}

interface DashboardData {
  total_revenue: number
  total_sales: number
  active_streams: number
  total_streams: number
  total_followers: number
  avg_viewers: number
  recent_orders: Array<{
    id: string
    item_title: string
    amount: number
    status: string
    created_at: string
  }>
  monthly_revenue: number
  health?: HealthMetrics
}

// FAQ data
const faqItems: { id: string; q: Localized<string>; a: Localized<string> }[] = [
  {
    id: 'become-seller',
    q: {
      en: 'How do I become a seller?',
      fr: 'Comment devenir vendeur ?',
      es: '¿Cómo me hago vendedor?',
      ru: 'Как стать продавцом?',
      he: 'איך הופכים למוכר/ת?',
    },
    a: {
      en: 'Tap "Let\'s go!" and start selling right away.',
      fr: 'Appuie sur « C\'est parti ! » et commence à vendre tout de suite.',
      es: 'Toca «¡Vamos!» y empieza a vender al instante.',
      ru: 'Нажми «Поехали!» и начинай продавать прямо сейчас.',
      he: 'לחצו על "יאללה!" והתחילו למכור מיד.',
    },
  },
  {
    id: 'schedule',
    q: {
      en: 'When can I schedule a live?',
      fr: 'Quand puis-je programmer un live ?',
      es: '¿Cuándo puedo programar un directo?',
      ru: 'Когда можно запланировать эфир?',
      he: 'מתי אפשר לתזמן שידור חי?',
    },
    a: {
      en: 'Anytime! Schedule one ahead or go live right now.',
      fr: 'Quand tu veux ! Programme-le à l\'avance ou lance-toi tout de suite.',
      es: '¡Cuando quieras! Prográmalo con antelación o empieza el directo ya.',
      ru: 'Когда угодно! Запланируй заранее или выходи в эфир прямо сейчас.',
      he: 'מתי שרוצים! אפשר לתזמן מראש או לעלות לשידור חי עכשיו.',
    },
  },
  {
    id: 'payouts',
    q: {
      en: 'How and when do I get paid?',
      fr: 'Comment et quand suis-je payé ?',
      es: '¿Cómo y cuándo cobro?',
      ru: 'Как и когда я получу деньги?',
      he: 'איך ומתי מקבלים את הכסף?',
    },
    a: {
      en: 'In person: you get paid as soon as you enter the buyer\'s 4-digit code. By post: 3 days after you add your 2 photos (inside of the parcel + stamped postage receipt), or as soon as the buyer confirms receipt. The money is sent to your account through Stripe.',
      fr: 'En main propre : tu es payé dès que tu saisis le code à 4 chiffres de l\'acheteur. Par la poste : 3 jours après tes 2 photos (intérieur du colis + bordereau tamponné), ou dès que l\'acheteur confirme la réception. Le virement passe par Stripe.',
      es: 'En mano: cobras en cuanto introduces el código de 4 cifras del comprador. Por correo: 3 días después de subir tus 2 fotos (interior del paquete + resguardo sellado), o en cuanto el comprador confirma la recepción. El pago se hace a través de Stripe.',
      ru: 'Лично: деньги приходят, как только ты вводишь 4-значный код покупателя. По почте: через 3 дня после твоих 2 фото (содержимое посылки + квитанция со штампом) или сразу, как покупатель подтвердит получение. Выплата идёт через Stripe.',
      he: 'מסירה ידנית: מקבלים את הכסף ברגע שמזינים את הקוד בן 4 הספרות של הקונה. בדואר: 3 ימים אחרי ששולחים 2 תמונות (תוכן החבילה + קבלת משלוח חתומה), או ברגע שהקונה מאשר/ת קבלה. התשלום מועבר דרך Stripe.',
    },
  },
  {
    id: 'fees',
    q: {
      en: 'What are the fees?',
      fr: 'Quels sont les frais ?',
      es: '¿Cuáles son las comisiones?',
      ru: 'Какие комиссии?',
      he: 'מה העמלות?',
    },
    a: {
      en: 'An 8% ShaPop commission, plus Stripe payment processing fees and any taxes that apply in your country. In total, that\'s about 13% of the sale price.',
      fr: 'Une commission ShaPop de 8 %, plus les frais de paiement Stripe et les taxes applicables dans ton pays. Au total, environ 13 % du prix de vente.',
      es: 'Una comisión de ShaPop del 8 %, más las comisiones de pago de Stripe y los impuestos aplicables en tu país. En total, alrededor del 13 % del precio de venta.',
      ru: 'Комиссия ShaPop — 8 %, плюс комиссия Stripe за платёж и налоги, действующие в твоей стране. В сумме — около 13 % от цены продажи.',
      he: 'עמלת ShaPop של 8%, ועוד עמלות סליקה של Stripe ומסים החלים במדינה שלך. בסך הכול כ-13% ממחיר המכירה.',
    },
  },
  {
    id: 'what-to-sell',
    q: {
      en: 'What can I sell?',
      fr: 'Que puis-je vendre ?',
      es: '¿Qué puedo vender?',
      ru: 'Что можно продавать?',
      he: 'מה אפשר למכור?',
    },
    a: {
      en: 'Fashion, sneakers, trading cards, tech, art, jewelry and much more!',
      fr: 'Mode, sneakers, cartes à collectionner, high-tech, art, bijoux et bien plus encore !',
      es: '¡Moda, zapatillas, cartas coleccionables, tecnología, arte, joyería y mucho más!',
      ru: 'Одежду, кроссовки, коллекционные карточки, технику, искусство, украшения и многое другое!',
      he: 'אופנה, סניקרס, קלפי אספנות, אלקטרוניקה, אמנות, תכשיטים ועוד הרבה!',
    },
  },
  {
    id: 'shipping',
    q: {
      en: 'How does handover work?',
      fr: 'Comment se passe la remise ?',
      es: '¿Cómo funciona la entrega?',
      ru: 'Как передать товар?',
      he: 'איך עובדת המסירה?',
    },
    a: {
      en: 'After payment, the buyer and the seller are put in touch on WhatsApp or by email. Within your handover time, either hand the item over in person (the buyer gives you a 4-digit code), or send it by post yourself and add 2 photos: the inside of the parcel and the stamped postage receipt.',
      fr: 'Après le paiement, l\'acheteur et le vendeur sont mis en relation sur WhatsApp ou par e-mail. Dans ton délai de remise, tu remets l\'article en main propre (l\'acheteur te donne un code à 4 chiffres), ou tu l\'envoies toi-même par la poste et tu ajoutes 2 photos : l\'intérieur du colis et le bordereau tamponné.',
      es: 'Tras el pago, el comprador y el vendedor se ponen en contacto por WhatsApp o por correo electrónico. Dentro de tu plazo de entrega, entregas el artículo en mano (el comprador te da un código de 4 cifras) o lo envías tú por correo y añades 2 fotos: el interior del paquete y el resguardo sellado.',
      ru: 'После оплаты покупатель и продавец связываются в WhatsApp или по e-mail. В пределах твоего срока передачи ты либо передаёшь товар лично (покупатель называет 4-значный код), либо сам отправляешь его почтой и добавляешь 2 фото: содержимое посылки и квитанцию со штампом.',
      he: 'אחרי התשלום, הקונה והמוכר/ת מקבלים פרטי קשר ב-WhatsApp או במייל. בתוך זמן המסירה שלך, מוסרים את הפריט ביד (הקונה נותן/ת קוד בן 4 ספרות), או שולחים אותו בעצמך בדואר ומוסיפים 2 תמונות: תוכן החבילה וקבלת המשלוח החתומה.',
    },
  },
]

type WizardState = 'idle' | 'onboarding' | 'celebration'

export default function Dashboard() {
  const { user, profile, session } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  usePageTitle(tr({ en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel', ru: 'Панель', he: 'לוח בקרה' }))
  const sellerCurrency = currencyForCountry(profile?.country)
  const [showFaq, setShowFaq] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  // Venu de l'inscription vendeur du site : l'assistant « Devenir vendeur » s'ouvre tout seul
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    if (localStorage.getItem('shapop_open_seller_onboarding')) { localStorage.removeItem('shapop_open_seller_onboarding'); return 'onboarding' }
    return 'idle'
  })
  const [mounted, setMounted] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    if (!session?.access_token || !profile?.is_seller) return
    setDashboardLoading(true)
    try {
      const res = await apiFetch('/api/seller/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal,
      })
      if (signal?.aborted) return
      if (res.ok) {
        const data = await res.json()
        if (!signal?.aborted) setDashboardData(data)
      }
    } catch {
      // silently fail
    } finally {
      if (!signal?.aborted) setDashboardLoading(false)
    }
  }, [session?.access_token, profile?.is_seller])

  useEffect(() => {
    const controller = new AbortController()
    fetchDashboard(controller.signal)
    return () => controller.abort()
  }, [fetchDashboard])

  // Délai de remise choisi par le vendeur (jours, 4 par défaut) : sert de repère pour la santé du compte
  const [handoverDelay, setHandoverDelay] = useState(4)
  useEffect(() => {
    if (!session?.access_token || !profile?.is_seller) return
    let cancelled = false
    apiFetch('/api/seller/shipping-delay', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && typeof d?.shipping_delay_days === 'number') setHandoverDelay(d.shipping_delay_days) })
      .catch(() => { /* garde 4 jours */ })
    return () => { cancelled = true }
  }, [session?.access_token, profile?.is_seller])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const zeroFee = (() => {
    try { return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: sellerCurrency, maximumFractionDigits: 0 }).format(0) } catch { return '0' }
  })()

  const txt: Localized<Record<string, string>> = {
    en: {
      badge: 'START SELLING TODAY',
      title: 'Go live.\nSell instantly.',
      subtitle: 'Join thousands of sellers making real money with live shopping on ShaPop.',
      sellFast: 'Sell in seconds',
      sellFastDesc: 'Live selling is fast. Earn more per hour than on any other marketplace.',
      keepMore: 'Some of the lowest fees',
      keepMoreDesc: '8% commission + Stripe fees. You keep more than on other platforms.',
      bestBuyers: 'Engaged buyers',
      bestBuyersDesc: 'Live shoppers are loyal, excited and ready to spend.',
      trusted: 'Trusted platform',
      trustedDesc: 'Secure payments, buyer protection and 24/7 support.',
      formatsTitle: 'How to sell?',
      fmtAuction: 'Auctions',
      fmtAuctionDesc: 'Viewers bid in real time. The highest bidder wins the item.',
      fmtBuyNow: 'Buy now',
      fmtBuyNowDesc: 'Sell at a fixed price, no bidding. Buyers tap and buy instantly.',
      fmtMystery: 'Mystery box',
      fmtMysteryDesc: 'Surprise your buyers with a mystery lot at a set price.',
      fmtRipShip: 'Rip & hand over',
      fmtRipShipDesc: 'Open packs live in front of buyers, then hand them over or send them by post.',
      stats1: '~13%',
      stats1Label: 'Total fees',
      stats2Label: 'Startup fees',
      stats3: '24/7',
      stats3Label: 'Support',
      faq: 'FAQ',
      letsGo: "Let's go!",
      free: 'Free to start',
      freeDesc: 'No upfront fees. Your first 7 days are commission-free!',
      liveBadge: 'LIVE',
      previewName: 'ShaPop Live',
      previewHandle: '@you',
    },
    fr: {
      badge: 'COMMENCE À VENDRE',
      title: 'Passe en live.\nVends en un instant.',
      subtitle: 'Rejoins des milliers de vendeurs qui gagnent de l\'argent pour de vrai grâce à la vente en live sur ShaPop.',
      sellFast: 'Vends en quelques secondes',
      sellFastDesc: 'La vente en live va vite. Tu gagnes plus par heure que sur n\'importe quelle autre marketplace.',
      keepMore: 'Des frais parmi les plus bas',
      keepMoreDesc: '8 % de commission + frais Stripe. Tu gardes plus que sur les autres plateformes.',
      bestBuyers: 'Des acheteurs engagés',
      bestBuyersDesc: 'Les acheteurs en live sont fidèles, enthousiastes et prêts à acheter.',
      trusted: 'Une plateforme de confiance',
      trustedDesc: 'Paiements sécurisés, protection des acheteurs et assistance 24 h/24, 7 j/7.',
      formatsTitle: 'Comment vendre ?',
      fmtAuction: 'Enchères',
      fmtAuctionDesc: 'Les spectateurs enchérissent en direct. La meilleure offre remporte l\'article.',
      fmtBuyNow: 'Achat immédiat',
      fmtBuyNowDesc: 'Vends à prix fixe, sans enchères. L\'acheteur appuie et achète aussitôt.',
      fmtMystery: 'Boîte mystère',
      fmtMysteryDesc: 'Surprends tes acheteurs avec un lot mystère à prix fixe.',
      fmtRipShip: 'Ouverture & remise',
      fmtRipShipDesc: 'Ouvre les packs en direct devant les acheteurs, puis remets-les en main propre ou envoie-les par la poste.',
      stats1: '~13 %',
      stats1Label: 'Frais au total',
      stats2Label: 'Frais de démarrage',
      stats3: '24/7',
      stats3Label: 'Assistance',
      faq: 'FAQ',
      letsGo: 'C\'est parti !',
      free: 'Gratuit pour commencer',
      freeDesc: 'Aucun frais au départ. Tes 7 premiers jours sont sans commission !',
      liveBadge: 'LIVE',
      previewName: 'ShaPop Live',
      previewHandle: '@toi',
    },
    es: {
      badge: 'EMPIEZA A VENDER HOY',
      title: 'Empieza tu directo.\nVende al instante.',
      subtitle: 'Únete a miles de vendedores que ganan dinero de verdad con las ventas en directo de ShaPop.',
      sellFast: 'Vende en segundos',
      sellFastDesc: 'Vender en directo es rápido. Gana más por hora que en cualquier otro marketplace.',
      keepMore: 'Comisiones de las más bajas',
      keepMoreDesc: '8 % de comisión + comisiones de Stripe. Te quedas con más que en otras plataformas.',
      bestBuyers: 'Compradores comprometidos',
      bestBuyersDesc: 'Quienes compran en directo son fieles, entusiastas y están listos para gastar.',
      trusted: 'Plataforma de confianza',
      trustedDesc: 'Pagos seguros, protección al comprador y soporte 24/7.',
      formatsTitle: '¿Cómo vender?',
      fmtAuction: 'Subastas',
      fmtAuctionDesc: 'Los espectadores pujan en tiempo real. La puja más alta se lleva el artículo.',
      fmtBuyNow: 'Compra directa',
      fmtBuyNowDesc: 'Vende a precio fijo, sin pujas. El comprador toca y compra al instante.',
      fmtMystery: 'Caja misteriosa',
      fmtMysteryDesc: 'Sorprende a tus compradores con un lote misterioso a precio fijo.',
      fmtRipShip: 'Abrir y entregar',
      fmtRipShipDesc: 'Abre los sobres en directo delante de los compradores y luego entrégalos en mano o envíalos por correo.',
      stats1: '~13 %',
      stats1Label: 'Comisiones totales',
      stats2Label: 'Coste inicial',
      stats3: '24/7',
      stats3Label: 'Soporte',
      faq: 'Preguntas frecuentes',
      letsGo: '¡Vamos!',
      free: 'Gratis para empezar',
      freeDesc: 'Sin costes iniciales. ¡Tus primeros 7 días, sin comisión!',
      liveBadge: 'EN VIVO',
      previewName: 'ShaPop Live',
      previewHandle: '@tú',
    },
    ru: {
      badge: 'НАЧНИ ПРОДАВАТЬ СЕГОДНЯ',
      title: 'Выходи в эфир.\nПродавай мгновенно.',
      subtitle: 'Присоединяйся к тысячам продавцов, которые зарабатывают реальные деньги на прямых эфирах в ShaPop.',
      sellFast: 'Продажа за секунды',
      sellFastDesc: 'В эфире всё происходит быстро. Зарабатывай за час больше, чем на любом другом маркетплейсе.',
      keepMore: 'Одни из самых низких комиссий',
      keepMoreDesc: '8 % комиссии + комиссия Stripe. Тебе остаётся больше, чем на других площадках.',
      bestBuyers: 'Вовлечённые покупатели',
      bestBuyersDesc: 'Зрители эфиров — лояльные, увлечённые и готовые покупать.',
      trusted: 'Надёжная платформа',
      trustedDesc: 'Безопасные платежи, защита покупателей и поддержка 24/7.',
      formatsTitle: 'Как продавать?',
      fmtAuction: 'Аукционы',
      fmtAuctionDesc: 'Зрители делают ставки в реальном времени. Товар получает тот, кто предложит больше всех.',
      fmtBuyNow: 'Купить сразу',
      fmtBuyNowDesc: 'Продавай по фиксированной цене, без торгов. Покупатель нажимает — и товар его.',
      fmtMystery: 'Коробка-сюрприз',
      fmtMysteryDesc: 'Удиви покупателей лотом-сюрпризом по фиксированной цене.',
      fmtRipShip: 'Вскрытие и передача',
      fmtRipShipDesc: 'Вскрывай бустеры в эфире на глазах у покупателей, а потом передавай лично или отправляй почтой.',
      stats1: '~13 %',
      stats1Label: 'Комиссии всего',
      stats2Label: 'За старт',
      stats3: '24/7',
      stats3Label: 'Поддержка',
      faq: 'Вопросы и ответы',
      letsGo: 'Поехали!',
      free: 'Старт бесплатно',
      freeDesc: 'Никаких платежей заранее. Первые 7 дней — без комиссии!',
      liveBadge: 'ЭФИР',
      previewName: 'ShaPop Live',
      previewHandle: '@ты',
    },
    he: {
      badge: 'מתחילים למכור היום',
      title: 'עולים לשידור.\nמוכרים מיד.',
      subtitle: 'הצטרפו לאלפי מוכרים שמרוויחים כסף אמיתי ממכירות בשידור חי ב-ShaPop.',
      sellFast: 'מוכרים בשניות',
      sellFastDesc: 'מכירה בשידור חי היא מהירה. מרוויחים יותר לשעה מבכל מרקטפלייס אחר.',
      keepMore: 'מהעמלות הנמוכות בשוק',
      keepMoreDesc: '8% עמלה + עמלות Stripe. נשאר לך יותר מאשר בפלטפורמות אחרות.',
      bestBuyers: 'קונים מעורבים',
      bestBuyersDesc: 'מי שקונה בשידור חי נאמן, נלהב ומוכן לקנות.',
      trusted: 'פלטפורמה אמינה',
      trustedDesc: 'תשלומים מאובטחים, הגנת קונים ותמיכה 24/7.',
      formatsTitle: 'איך מוכרים?',
      fmtAuction: 'מכירות פומביות',
      fmtAuctionDesc: 'הצופים מציעים בזמן אמת. ההצעה הגבוהה ביותר זוכה בפריט.',
      fmtBuyNow: 'קנייה מיידית',
      fmtBuyNowDesc: 'מוכרים במחיר קבוע, בלי הצעות. הקונה לוחץ וקונה מיד.',
      fmtMystery: 'קופסת הפתעה',
      fmtMysteryDesc: 'הפתיעו את הקונים עם חבילת הפתעה במחיר קבוע.',
      fmtRipShip: 'פתיחה ומסירה',
      fmtRipShipDesc: 'פותחים חבילות בשידור חי מול הקונים, ואז מוסרים ביד או שולחים בדואר.',
      stats1: '~13%',
      stats1Label: 'סך העמלות',
      stats2Label: 'עלות פתיחה',
      stats3: '24/7',
      stats3Label: 'תמיכה',
      faq: 'שאלות נפוצות',
      letsGo: 'יאללה!',
      free: 'חינם להתחלה',
      freeDesc: 'בלי תשלום מראש. 7 הימים הראשונים בלי עמלה!',
      liveBadge: 'שידור חי',
      previewName: 'ShaPop Live',
      previewHandle: '@את/ה',
    },
  }

  const t = txt[lang] ?? txt.en

  // ═══════════════ NON-SELLER: Premium Landing Page ═══════════════
  if (!profile?.is_seller) {
    const features = [
      {
        emoji: '\u{26A1}',
        gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
        title: t.sellFast,
        desc: t.sellFastDesc,
      },
      {
        emoji: '\u{1F4B0}',
        gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
        title: t.keepMore,
        desc: t.keepMoreDesc,
      },
      {
        emoji: '\u{1F525}',
        gradient: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
        title: t.bestBuyers,
        desc: t.bestBuyersDesc,
      },
      {
        emoji: '\u{1F6E1}\u{FE0F}',
        gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)',
        title: t.trusted,
        desc: t.trustedDesc,
      },
    ]

    const stats = [
      { value: t.stats1, label: t.stats1Label },
      { value: zeroFee, label: t.stats2Label },
      { value: t.stats3, label: t.stats3Label },
    ]

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', overflow: 'hidden' }}>
        {/* ─── Hero Section with gradient background ─── */}
        <div style={{
          position: 'relative',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          paddingBottom: '40px',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1, padding: '0 12px', marginBottom: '8px' }}>
            <BackArrowButton />
          </div>
          {/* Background gradient orbs */}
          <div style={{
            position: 'absolute', top: '-60px', insetInlineStart: '-40px',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 229, 255,0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', top: '40px', insetInlineEnd: '-60px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,229,255,0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />

          {/* Badge */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: '20px',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.6s ease',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '100px',
              background: 'rgba(0, 229, 255,0.12)',
              border: '1px solid rgba(0, 229, 255,0.25)',
              fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, letterSpacing: '1.5px',
              color: '#00E5FF',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00E5FF', animation: 'pulse 2s ease infinite' }} />
              {t.badge}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'calc(38px * var(--fs, 1))', fontWeight: 900, color: '#fff',
            textAlign: 'center', lineHeight: 1.1, letterSpacing: '-1px',
            padding: '0 24px', whiteSpace: 'pre-line',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s ease 0.1s',
          }}>
            {t.title}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center',
            lineHeight: 1.6, padding: '16px 32px 0', maxWidth: '380px', margin: '0 auto',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.7s ease 0.2s',
          }}>
            {t.subtitle}
          </p>

          {/* ─── Live Preview Card ─── */}
          <div style={{
            margin: '28px 20px 0', borderRadius: '20px', overflow: 'hidden',
            position: 'relative', height: '200px',
            background: 'linear-gradient(135deg, #1A0A0E 0%, #0A0A14 50%, #0A140A 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            opacity: mounted ? 1 : 0, transform: mounted ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.8s ease 0.3s',
          }}>
            {/* Shimmer overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)',
              animation: 'shimmer 3s infinite',
            }} />

            {/* LIVE badge */}
            <div style={{
              position: 'absolute', top: '14px', insetInlineStart: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '8px',
              background: 'rgba(0,229,255,0.9)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{t.liveBadge}</span>
            </div>

            {/* Viewers count */}
            <div style={{
              position: 'absolute', top: '14px', insetInlineEnd: '14px',
              padding: '5px 10px', borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#fff', fontWeight: 600 }}>{t.liveBadge}</span>
            </div>

            {/* Center play icon */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', // i18n-ignore (centrage symétrique)
              transform: 'translate(-50%, -50%)',
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(0, 229, 255,0.2)', backdropFilter: 'blur(10px)',
              border: '2px solid rgba(0, 229, 255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#00E5FF">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>

            {/* Bottom bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(16px * var(--fs, 1))',
              }}>
                {'\u{1F3AC}'}
              </div>
              <div>
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{t.previewName}</p>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>{t.previewHandle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Stats Row ─── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0px',
          padding: '0 20px', marginBottom: '32px',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.6s ease 0.5s',
        }}>
          {stats.map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1, textAlign: 'center', position: 'relative',
            }}>
              <p style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{stat.value}</p>
              <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px', fontWeight: 500 }}>{stat.label}</p>
              {i < stats.length - 1 && (
                <div style={{
                  position: 'absolute', insetInlineEnd: 0, top: '10%', height: '80%',
                  width: '1px', backgroundColor: '#1A1A1A',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ─── Feature Cards ─── */}
        <div style={{ padding: '0 16px', marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {features.map((feat, i) => (
              <div
                key={feat.title}
                style={{
                  padding: '18px 14px', borderRadius: '18px',
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #1A1A1A',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s ease ${0.4 + i * 0.1}s`,
                }}
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '14px',
                  background: feat.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'calc(20px * var(--fs, 1))', marginBottom: '12px',
                  boxShadow: `0 4px 16px ${feat.gradient.includes('#00E5FF') ? 'rgba(0, 229, 255,0.2)' : feat.gradient.includes('#00E5FF') ? 'rgba(0,229,255,0.2)' : feat.gradient.includes('#00E5FF') ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.2)'}`,
                }}>
                  {feat.emoji}
                </div>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{feat.title}</p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.5 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Selling Formats ─── */}
        <div style={{ padding: '0 16px', marginBottom: '28px' }}>
          <p style={{
            fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff', marginBottom: '14px',
            letterSpacing: '-0.3px',
          }}>
            {t.formatsTitle}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { emoji: '\u{1F525}', title: t.fmtAuction, desc: t.fmtAuctionDesc, gradient: 'linear-gradient(135deg, #0091EA 0%, #00E5FF 100%)', shadow: 'rgba(0,229,255,0.2)' },
              { emoji: '\u{26A1}', title: t.fmtBuyNow, desc: t.fmtBuyNowDesc, gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', shadow: 'rgba(59,130,246,0.2)' },
              { emoji: '\u{1F381}', title: t.fmtMystery, desc: t.fmtMysteryDesc, gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)', shadow: 'rgba(0,229,255,0.2)' },
              { emoji: '\u{1F4E6}', title: t.fmtRipShip, desc: t.fmtRipShipDesc, gradient: 'linear-gradient(135deg, #00E5FF 0%, #00E5FF 100%)', shadow: 'rgba(0,229,255,0.2)' },
            ].map((fmt, i) => (
              <div
                key={fmt.title}
                style={{
                  padding: '18px 14px', borderRadius: '18px',
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #1A1A1A',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s ease ${0.7 + i * 0.1}s`,
                }}
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '14px',
                  background: fmt.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'calc(20px * var(--fs, 1))', marginBottom: '12px',
                  boxShadow: `0 4px 16px ${fmt.shadow}`,
                }}>
                  {fmt.emoji}
                </div>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{fmt.title}</p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.5 }}>{fmt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Free Trial Banner ─── */}
        <div style={{
          margin: '0 16px 28px', padding: '18px 20px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #1A0F1E 0%, #1E150A 100%)',
          border: '1px solid rgba(0, 229, 255,0.15)',
          display: 'flex', alignItems: 'center', gap: '14px',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.6s ease 0.8s',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'calc(22px * var(--fs, 1))', flexShrink: 0,
          }}>
            {'\u{1F381}'}
          </div>
          <div>
            <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>{t.free}</p>
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>{t.freeDesc}</p>
          </div>
        </div>

        {/* ─── FAQ Section (inline, not overlay) ─── */}
        <div style={{ padding: '0 16px', marginBottom: '160px' }}>
          <button
            onClick={() => setShowFaq(!showFaq)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '16px 20px', borderRadius: '16px',
              backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
              cursor: 'pointer', marginBottom: showFaq ? '8px' : '0',
            }}
          >
            <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{t.faq}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
              style={{ transform: showFaq ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showFaq && (
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #1A1A1A' }}>
              {faqItems.map((item, i) => (
                <div key={item.id} style={{ borderBottom: i < faqItems.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '16px 18px',
                      background: openFaq === i ? '#0D0D0D' : '#080808',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                    }}
                  >
                    <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#ccc', paddingInlineEnd: '12px' }}>
                      {tr(item.q)}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
                      style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 18px 16px', backgroundColor: '#0D0D0D' }}>
                      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.6 }}>
                        {tr(item.a)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Fixed CTA Button ─── */}
        <div style={{
          position: 'fixed', bottom: '70px', left: 0, right: 0,
          padding: '0 16px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          background: 'linear-gradient(to top, #000 70%, transparent)',
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => {
              if (!user) {
                navigate('/login')
                return
              }
              setWizardState('onboarding')
            }}
            style={{
              width: '100%', padding: '18px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #0091EA 100%)',
              borderRadius: '16px', border: 'none',
              color: '#001014', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '-0.3px',
              boxShadow: '0 8px 32px rgba(0, 229, 255,0.35)',
              pointerEvents: 'auto',
            }}
          >
            {t.letsGo}
          </button>
        </div>

        {/* Onboarding Wizard overlay */}
        {wizardState === 'onboarding' && (
          <OnboardingWizard
            onComplete={() => setWizardState('celebration')}
            onClose={() => setWizardState('idle')}
          />
        )}

        {/* Celebration overlay */}
        {wizardState === 'celebration' && (
          <OnboardingCelebration
            onDone={() => {
              window.location.reload()
            }}
          />
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════ SELLER: Analytics Dashboard + Create Live Wizard ═══════════════

  const formatCurrency = (amount: number) => formatMoney(amount, sellerCurrency)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })
  }

  const STATUS_LABELS: Record<string, Localized<string>> = {
    pending_payment: { en: 'Pending', fr: 'En attente', es: 'Pendiente', ru: 'Ожидает оплаты', he: 'ממתין לתשלום' },
    paid: { en: 'Paid', fr: 'Payée', es: 'Pagado', ru: 'Оплачен', he: 'שולם' },
    shipped: { en: 'Sent by post', fr: 'Envoyée par la poste', es: 'Enviado por correo', ru: 'Отправлен почтой', he: 'נשלח בדואר' },
    delivered: { en: 'Received', fr: 'Reçue', es: 'Recibido', ru: 'Получен', he: 'התקבל' },
    completed: { en: 'Completed', fr: 'Terminée', es: 'Completado', ru: 'Завершён', he: 'הושלם' },
    refunded: { en: 'Refunded', fr: 'Remboursée', es: 'Reembolsado', ru: 'Возвращён', he: 'הוחזר' },
    disputed: { en: 'Disputed', fr: 'En litige', es: 'En disputa', ru: 'Спор', he: 'במחלוקת' },
  }
  const statusLabel = (status: string) => {
    const l = STATUS_LABELS[status]
    return l ? tr(l) : status
  }

  const pluralRules = new Intl.PluralRules(getLocale())
  // Formes : [un, plusieurs] ; le russe en a 3 : [один, несколько (2–4), много (5+)]
  const plural = (n: number, forms: Localized<string[]>) => {
    const f = tr(forms)
    const cat = pluralRules.select(n)
    const idx = cat === 'one' ? 0 : f.length === 3 && cat === 'few' ? 1 : f.length - 1
    return f[idx].replace('{n}', String(n))
  }

  const statusColor = (status: string) => {
    if (status === 'paid' || status === 'delivered' || status === 'completed') return '#4ade80'
    if (status === 'shipped') return '#60a5fa'
    if (status === 'refunded' || status === 'disputed') return '#f87171'
    return '#888'
  }

  const cardStyle: React.CSSProperties = {
    padding: '18px',
    borderRadius: '16px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #2A2A2A',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000' }}>
      <PageBackButton style={{ paddingBottom: '4px' }} />

      {/* Performance en direct - Engagement Summary */}
      <div style={{
        paddingTop: '4px',
      }}>
        <EngagementSummary />
      </div>

      {/* ─── Analytics Dashboard ─── */}
      <div style={{ padding: '0 16px 24px' }}>
        <h2 style={{
          fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff',
          marginBottom: '16px', letterSpacing: '-0.3px',
        }}>
          {tr({ en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel de control', ru: 'Панель продавца', he: 'לוח בקרה' })}
        </h2>

        {dashboardLoading && !dashboardData ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #333',
              borderTopColor: '#00E5FF', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : dashboardData ? (
          <>
            {/* ─── Stats Cards Grid ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {/* Revenue Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Revenue', fr: 'Revenus', es: 'Ingresos', ru: 'Выручка', he: 'הכנסות' })}
                </p>
                <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900, color: '#00E5FF', letterSpacing: '-0.5px' }}>
                  {formatCurrency(dashboardData.total_revenue)}
                </p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '4px' }}>
                  {tr({ en: 'This month', fr: 'Ce mois-ci', es: 'Este mes', ru: 'В этом месяце', he: 'החודש' })}: <span style={{ color: '#00E5FF', fontWeight: 700 }}>{formatCurrency(dashboardData.monthly_revenue)}</span>
                </p>
              </div>

              {/* Sales Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Sales', fr: 'Ventes', es: 'Ventas', ru: 'Продажи', he: 'מכירות' })}
                </p>
                <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.total_sales}
                </p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '4px' }}>
                  {tr({ en: 'Paid orders', fr: 'Commandes payées', es: 'Pedidos pagados', ru: 'Оплаченные заказы', he: 'הזמנות ששולמו' })}
                </p>
              </div>

              {/* Followers Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Followers', fr: 'Abonnés', es: 'Seguidores', ru: 'Подписчики', he: 'עוקבים' })}
                </p>
                <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.total_followers}
                </p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '4px' }}>
                  {tr({ en: 'Total followers', fr: 'Abonnés au total', es: 'Seguidores en total', ru: 'Всего подписчиков', he: 'סה״כ עוקבים' })}
                </p>
              </div>

              {/* Avg Viewers Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Avg viewers', fr: 'Spectateurs moy.', es: 'Espectadores prom.', ru: 'Ср. число зрителей', he: 'ממוצע צופים' })}
                </p>
                <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.avg_viewers}
                </p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginTop: '4px' }}>
                  {plural(dashboardData.total_streams, {
                    en: ['{n} live', '{n} lives'],
                    fr: ['{n} live', '{n} lives'],
                    es: ['{n} directo', '{n} directos'],
                    ru: ['{n} эфир', '{n} эфира', '{n} эфиров'],
                    he: ['שידור אחד', '{n} שידורים'],
                  })}
                  {dashboardData.active_streams > 0 && (
                    <span style={{ color: '#4ade80', fontWeight: 700 }}> ({tr({ en: `${dashboardData.active_streams} live now`, fr: `${dashboardData.active_streams} en direct`, es: `${dashboardData.active_streams} en directo`, ru: `${dashboardData.active_streams} в эфире`, he: `${dashboardData.active_streams} בשידור עכשיו` })})</span>
                  )}
                </p>
              </div>
            </div>

            {/* ─── Quick Actions: Team ─── */}
            <button
              onClick={() => navigate('/team')}
              style={{
                width: '100%', padding: '14px 16px',
                backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A',
                borderRadius: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001014" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'start' }}>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {tr({ en: 'My team', fr: 'Mon équipe', es: 'Mi equipo', ru: 'Моя команда', he: 'הצוות שלי' })}
                </p>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
                  {tr({ en: 'Invite team members', fr: 'Invite des collaborateurs', es: 'Invita a tu equipo', ru: 'Пригласи помощников', he: 'הזמנת חברי צוות' })}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={rtlFlip()}>
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* ─── Quick Actions: commandes à remettre ─── */}
            <button
              onClick={() => navigate('/to-hand-over')}
              style={{
                width: '100%', padding: '14px 16px',
                backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A',
                borderRadius: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #00E5FF, #00E5FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'start' }}>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {ft().to_hand_over}
                </p>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>
                  {tr({ en: 'In person · By post', fr: 'Main propre · Poste', es: 'En mano · Correo', ru: 'Лично · Почтой', he: 'מסירה ביד · דואר' })}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={rtlFlip()}>
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* ─── Account Health ─── */}
            {dashboardData.health && dashboardData.health.total_orders > 0 && (() => {
              const h = dashboardData.health!
              const healthItems = [
                {
                  label: tr({ en: 'Disputes', fr: 'Litiges', es: 'Disputas', ru: 'Споры', he: 'מחלוקות' }),
                  value: `${h.dispute_rate}%`,
                  color: h.dispute_rate === 0 ? '#4ade80' : h.dispute_rate < 3 ? '#facc15' : '#f87171',
                  icon: '⚖️',
                },
                {
                  label: tr({ en: 'Cancellations', fr: 'Annulations', es: 'Cancelaciones', ru: 'Отмены', he: 'ביטולים' }),
                  value: `${h.cancel_rate}%`,
                  color: h.cancel_rate < 5 ? '#4ade80' : h.cancel_rate < 15 ? '#facc15' : '#f87171',
                  icon: '↩️',
                },
                {
                  label: tr({ en: 'Completion', fr: 'Finalisées', es: 'Completados', ru: 'Завершено', he: 'הושלמו' }),
                  value: `${h.completion_rate}%`,
                  // 0 % = commandes encore en cours de remise, pas un mauvais signe : gris neutre, hors de la note globale
                  color: h.completion_rate === 0 ? '#9ca3af' : h.completion_rate > 90 ? '#00E5FF' : h.completion_rate > 70 ? '#facc15' : '#f87171',
                  icon: '✅',
                },
                {
                  label: tr({ en: 'Average handover time', fr: 'Délai de remise moyen', es: 'Plazo de entrega medio', ru: 'Средний срок передачи', he: 'זמן מסירה ממוצע' }),
                  value: (() => { try { return new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(h.avg_shipping_days) } catch { return String(h.avg_shipping_days) } })(),
                  // Comparé au délai de remise choisi par le vendeur (et non plus à 2 jours fixes)
                  color: h.avg_shipping_days <= handoverDelay ? '#00E5FF' : h.avg_shipping_days <= handoverDelay + 2 ? '#facc15' : '#f87171',
                  icon: '📦',
                },
              ]
              // Overall health: green if all green, yellow if any yellow, red if any red
              const colors = healthItems.map(i => i.color)
              const overallColor = colors.includes('#f87171') ? '#f87171' : colors.includes('#facc15') ? '#facc15' : '#4ade80'
              const overallLabel = overallColor === '#4ade80'
                ? tr({ en: 'Excellent', fr: 'Excellent', es: 'Excelente', ru: 'Отлично', he: 'מצוין' })
                : overallColor === '#facc15'
                  ? tr({ en: 'Warning', fr: 'Attention', es: 'Atención', ru: 'Внимание', he: 'אזהרה' })
                  : tr({ en: 'Critical', fr: 'Critique', es: 'Crítico', ru: 'Критично', he: 'קריטי' })

              return (
                <div style={{ ...cardStyle, marginTop: '4px', marginBottom: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>
                      {tr({ en: 'Account health', fr: 'Santé du compte', es: 'Salud de la cuenta', ru: 'Состояние аккаунта', he: 'מצב החשבון' })}
                    </p>
                    <span style={{
                      fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: overallColor,
                      padding: '3px 10px', borderRadius: '8px',
                      backgroundColor: `${overallColor}15`,
                      textTransform: 'uppercase', letterSpacing: '0.3px',
                    }}>
                      {overallLabel}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {healthItems.map((item) => (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', borderRadius: '12px',
                        backgroundColor: '#111', border: `1px solid ${item.color}20`,
                      }}>
                        <span style={{ fontSize: 'calc(16px * var(--fs, 1))' }}>{item.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600 }}>{item.label}</p>
                          <p style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: item.color, letterSpacing: '-0.3px' }}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#f0f0f0', marginTop: '10px', textAlign: 'center' }}>
                    {plural(h.total_orders, {
                      en: ['Based on {n} order', 'Based on {n} orders'],
                      fr: ['Sur la base de {n} commande', 'Sur la base de {n} commandes'],
                      es: ['Según {n} pedido', 'Según {n} pedidos'],
                      ru: ['На основе {n} заказа', 'На основе {n} заказов'],
                      he: ['על סמך הזמנה אחת', 'על סמך {n} הזמנות'],
                    })}
                  </p>
                </div>
              )
            })()}

            {/* ─── Recent Orders ─── */}
            {dashboardData.recent_orders.length > 0 && (
              <div style={{
                ...cardStyle,
                marginTop: '4px',
                padding: '16px',
              }}>
                <p style={{
                  fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff',
                  marginBottom: '14px',
                }}>
                  {tr({ en: 'Recent orders', fr: 'Dernières commandes', es: 'Pedidos recientes', ru: 'Последние заказы', he: 'הזמנות אחרונות' })}
                </p>
                {dashboardData.recent_orders.map((order, i) => (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderTop: i > 0 ? '1px solid #2A2A2A' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {displayItemTitle(order.item_title)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: statusColor(order.status),
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: `${statusColor(order.status)}15`,
                          textTransform: 'uppercase', letterSpacing: '0.3px',
                        }}>
                          {statusLabel(order.status)}
                        </span>
                        <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF', marginInlineStart: '12px', flexShrink: 0 }}>
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

    </div>
  )
}

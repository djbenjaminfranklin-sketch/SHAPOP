import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, getLocale, tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { formatMoney, currencyForCountry } from '../lib/fulfillment'
import { apiFetch } from '../lib/api'
import OnboardingWizard from '../components/seller/OnboardingWizard'
import OnboardingCelebration from '../components/seller/OnboardingCelebration'
import CreateLiveWizard from '../components/seller/CreateLiveWizard'
import EngagementSummary from '../components/seller/EngagementSummary'
import { ft } from '../lib/fulfillmentText'
import { usePageTitle } from '../hooks/usePageTitle'

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
      en: 'Payouts are processed through Stripe within 3–5 business days.',
      fr: 'Les virements passent par Stripe, sous 3 à 5 jours ouvrés.',
      es: 'Los pagos se procesan con Stripe en 3–5 días hábiles.',
      ru: 'Выплаты проходят через Stripe в течение 3–5 рабочих дней.',
      he: 'התשלומים מועברים דרך Stripe תוך 3–5 ימי עסקים.',
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
      en: 'How does shipping work?',
      fr: 'Comment fonctionne la livraison ?',
      es: '¿Cómo funciona el envío?',
      ru: 'Как работает доставка?',
      he: 'איך עובד המשלוח?',
    },
    a: {
      en: 'The seller ships within 3 days, and the buyer gets the tracking number automatically.',
      fr: 'Le vendeur expédie sous 3 jours, et l\'acheteur reçoit automatiquement le numéro de suivi.',
      es: 'El vendedor envía en 3 días y el comprador recibe el número de seguimiento automáticamente.',
      ru: 'Продавец отправляет заказ в течение 3 дней, а покупатель автоматически получает трек-номер.',
      he: 'המוכר/ת שולח/ת תוך 3 ימים, והקונה מקבל/ת מספר מעקב אוטומטית.',
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
  const [wizardState, setWizardState] = useState<WizardState>('idle')
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
      fmtRipShip: 'Rip & ship',
      fmtRipShipDesc: 'Open packs live in front of buyers and ship right away.',
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
      fmtRipShip: 'Ouverture & envoi',
      fmtRipShipDesc: 'Ouvre les packs en direct devant les acheteurs et expédie dans la foulée.',
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
      fmtRipShip: 'Abrir y enviar',
      fmtRipShipDesc: 'Abre los sobres en directo delante de los compradores y envía al momento.',
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
      fmtRipShip: 'Вскрытие и отправка',
      fmtRipShipDesc: 'Вскрывай бустеры в эфире на глазах у покупателей и сразу отправляй.',
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
      fmtRipShip: 'פתיחה ומשלוח',
      fmtRipShipDesc: 'פותחים חבילות בשידור חי מול הקונים ושולחים מיד.',
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
        gradient: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
        title: t.sellFast,
        desc: t.sellFastDesc,
      },
      {
        emoji: '\u{1F4B0}',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        title: t.keepMore,
        desc: t.keepMoreDesc,
      },
      {
        emoji: '\u{1F525}',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        title: t.bestBuyers,
        desc: t.bestBuyersDesc,
      },
      {
        emoji: '\u{1F6E1}\u{FE0F}',
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          paddingBottom: '40px',
          overflow: 'hidden',
        }}>
          {/* Background gradient orbs */}
          <div style={{
            position: 'absolute', top: '-60px', insetInlineStart: '-40px',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,144,138,0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', top: '40px', insetInlineEnd: '-60px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
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
              background: 'rgba(240,144,138,0.12)',
              border: '1px solid rgba(240,144,138,0.25)',
              fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px',
              color: '#F0908A',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F0908A', animation: 'pulse 2s ease infinite' }} />
              {t.badge}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '38px', fontWeight: 900, color: '#fff',
            textAlign: 'center', lineHeight: 1.1, letterSpacing: '-1px',
            padding: '0 24px', whiteSpace: 'pre-line',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.7s ease 0.1s',
          }}>
            {t.title}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '15px', color: '#888', textAlign: 'center',
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
              background: 'rgba(232,52,78,0.9)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{t.liveBadge}</span>
            </div>

            {/* Viewers count */}
            <div style={{
              position: 'absolute', top: '14px', insetInlineEnd: '14px',
              padding: '5px 10px', borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{t.liveBadge}</span>
            </div>

            {/* Center play icon */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', // i18n-ignore (centrage symétrique)
              transform: 'translate(-50%, -50%)',
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(240,144,138,0.2)', backdropFilter: 'blur(10px)',
              border: '2px solid rgba(240,144,138,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#F0908A">
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
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}>
                {'\u{1F3AC}'}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{t.previewName}</p>
                <p style={{ fontSize: '11px', color: '#999' }}>{t.previewHandle}</p>
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
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: 500 }}>{stat.label}</p>
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
                  fontSize: '20px', marginBottom: '12px',
                  boxShadow: `0 4px 16px ${feat.gradient.includes('#F0908A') ? 'rgba(240,144,138,0.2)' : feat.gradient.includes('#F59E0B') ? 'rgba(245,158,11,0.2)' : feat.gradient.includes('#8B5CF6') ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
                }}>
                  {feat.emoji}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{feat.title}</p>
                <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Selling Formats ─── */}
        <div style={{ padding: '0 16px', marginBottom: '28px' }}>
          <p style={{
            fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '14px',
            letterSpacing: '-0.3px',
          }}>
            {t.formatsTitle}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { emoji: '\u{1F525}', title: t.fmtAuction, desc: t.fmtAuctionDesc, gradient: 'linear-gradient(135deg, #E8344E 0%, #F0908A 100%)', shadow: 'rgba(232,52,78,0.2)' },
              { emoji: '\u{26A1}', title: t.fmtBuyNow, desc: t.fmtBuyNowDesc, gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', shadow: 'rgba(59,130,246,0.2)' },
              { emoji: '\u{1F381}', title: t.fmtMystery, desc: t.fmtMysteryDesc, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', shadow: 'rgba(139,92,246,0.2)' },
              { emoji: '\u{1F4E6}', title: t.fmtRipShip, desc: t.fmtRipShipDesc, gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', shadow: 'rgba(245,158,11,0.2)' },
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
                  fontSize: '20px', marginBottom: '12px',
                  boxShadow: `0 4px 16px ${fmt.shadow}`,
                }}>
                  {fmt.emoji}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{fmt.title}</p>
                <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>{fmt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Free Trial Banner ─── */}
        <div style={{
          margin: '0 16px 28px', padding: '18px 20px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #1A0F1E 0%, #1E150A 100%)',
          border: '1px solid rgba(240,144,138,0.15)',
          display: 'flex', alignItems: 'center', gap: '14px',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.6s ease 0.8s',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', flexShrink: 0,
          }}>
            {'\u{1F381}'}
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 800, color: '#F0908A' }}>{t.free}</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{t.freeDesc}</p>
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
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{t.faq}</span>
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
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#ccc', paddingInlineEnd: '12px' }}>
                      {tr(item.q)}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
                      style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 18px 16px', backgroundColor: '#0D0D0D' }}>
                      <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
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
              background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
              borderRadius: '16px', border: 'none',
              color: '#fff', fontSize: '18px', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '-0.3px',
              boxShadow: '0 8px 32px rgba(240,144,138,0.35)',
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
    shipped: { en: 'Shipped', fr: 'Expédiée', es: 'Enviado', ru: 'Отправлен', he: 'נשלח' },
    delivered: { en: 'Delivered', fr: 'Livrée', es: 'Entregado', ru: 'Доставлен', he: 'נמסר' },
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
      {/* Performance en direct - Engagement Summary */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <EngagementSummary />
      </div>

      {/* ─── Analytics Dashboard ─── */}
      <div style={{ padding: '0 16px 24px' }}>
        <h2 style={{
          fontSize: '20px', fontWeight: 800, color: '#fff',
          marginBottom: '16px', letterSpacing: '-0.3px',
        }}>
          {tr({ en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel de control', ru: 'Панель продавца', he: 'לוח בקרה' })}
        </h2>

        {dashboardLoading && !dashboardData ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #333',
              borderTopColor: '#F0908A', borderRadius: '50%',
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
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Revenue', fr: 'Revenus', es: 'Ingresos', ru: 'Выручка', he: 'הכנסות' })}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80', letterSpacing: '-0.5px' }}>
                  {formatCurrency(dashboardData.total_revenue)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {tr({ en: 'This month', fr: 'Ce mois-ci', es: 'Este mes', ru: 'В этом месяце', he: 'החודש' })}: <span style={{ color: '#F0908A', fontWeight: 700 }}>{formatCurrency(dashboardData.monthly_revenue)}</span>
                </p>
              </div>

              {/* Sales Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Sales', fr: 'Ventes', es: 'Ventas', ru: 'Продажи', he: 'מכירות' })}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.total_sales}
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {tr({ en: 'Paid orders', fr: 'Commandes payées', es: 'Pedidos pagados', ru: 'Оплаченные заказы', he: 'הזמנות ששולמו' })}
                </p>
              </div>

              {/* Followers Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Followers', fr: 'Abonnés', es: 'Seguidores', ru: 'Подписчики', he: 'עוקבים' })}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.total_followers}
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {tr({ en: 'Total followers', fr: 'Abonnés au total', es: 'Seguidores en total', ru: 'Всего подписчиков', he: 'סה״כ עוקבים' })}
                </p>
              </div>

              {/* Avg Viewers Card */}
              <div style={cardStyle}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {tr({ en: 'Avg viewers', fr: 'Spectateurs moy.', es: 'Espectadores prom.', ru: 'Ср. число зрителей', he: 'ממוצע צופים' })}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                  {dashboardData.avg_viewers}
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
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
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'start' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {tr({ en: 'My team', fr: 'Mon équipe', es: 'Mi equipo', ru: 'Моя команда', he: 'הצוות שלי' })}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
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
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'start' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {ft().to_hand_over}
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                  {tr({ en: 'Track your packages', fr: 'Suis tes colis', es: 'Sigue tus paquetes', ru: 'Отслеживай посылки', he: 'מעקב אחרי החבילות' })}
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
                  color: h.completion_rate > 90 ? '#4ade80' : h.completion_rate > 70 ? '#facc15' : '#f87171',
                  icon: '✅',
                },
                {
                  label: tr({ en: 'Ship time', fr: 'Délai d\'envoi', es: 'Plazo de envío', ru: 'Срок отправки', he: 'זמן משלוח' }),
                  value: (() => { try { return new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'day', unitDisplay: 'narrow' }).format(h.avg_shipping_days) } catch { return String(h.avg_shipping_days) } })(),
                  color: h.avg_shipping_days <= 2 ? '#4ade80' : h.avg_shipping_days <= 4 ? '#facc15' : '#f87171',
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                      {tr({ en: 'Account health', fr: 'Santé du compte', es: 'Salud de la cuenta', ru: 'Состояние аккаунта', he: 'מצב החשבון' })}
                    </p>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: overallColor,
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
                        <span style={{ fontSize: '16px' }}>{item.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>{item.label}</p>
                          <p style={{ fontSize: '16px', fontWeight: 800, color: item.color, letterSpacing: '-0.3px' }}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '10px', color: '#555', marginTop: '10px', textAlign: 'center' }}>
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
                  fontSize: '14px', fontWeight: 700, color: '#fff',
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
                        fontSize: '13px', fontWeight: 600, color: '#fff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {order.item_title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: statusColor(order.status),
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: `${statusColor(order.status)}15`,
                          textTransform: 'uppercase', letterSpacing: '0.3px',
                        }}>
                          {statusLabel(order.status)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#555' }}>
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A', marginInlineStart: '12px', flexShrink: 0 }}>
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Create Live Wizard */}
      <CreateLiveWizard />
    </div>
  )
}

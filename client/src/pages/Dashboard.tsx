import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import OnboardingWizard from '../components/seller/OnboardingWizard'
import OnboardingCelebration from '../components/seller/OnboardingCelebration'
import CreateLiveWizard from '../components/seller/CreateLiveWizard'
import EngagementSummary from '../components/EngagementSummary'

// FAQ data
const faqItems = [
  { qFr: 'Comment devenir vendeur ?', q: 'How do I unlock seller access?', qHe: '\u05D0\u05D9\u05DA \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D2\u05D9\u05E9\u05D4 \u05DC\u05DE\u05D5\u05DB\u05E8?', qEs: '\u00BFC\u00F3mo desbloqueo el acceso de vendedor?',
    aFr: 'Appuie sur "C\'est parti !" et commence a vendre instantanement.', a: 'Tap the "Become a seller" button and start streaming instantly.', aHe: '\u05DC\u05D7\u05E5 \u05E2\u05DC "\u05D4\u05E4\u05D5\u05DA \u05DC\u05DE\u05D5\u05DB\u05E8" \u05D5\u05EA\u05EA\u05D7\u05D9\u05DC \u05DC\u05E9\u05D3\u05E8.', aEs: 'Toca "Convertirme en vendedor" y empieza a transmitir al instante.' },
  { qFr: 'Quand puis-je planifier un live ?', q: 'When can I schedule a live?', qHe: '\u05DE\u05EA\u05D9 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05EA\u05D6\u05DE\u05DF \u05E9\u05D9\u05D3\u05D5\u05E8?', qEs: '\u00BFCu\u00E1ndo puedo programar un directo?',
    aFr: 'A tout moment ! Planifie a l\'avance ou passe en live maintenant.', a: 'Anytime! Schedule ahead or go live right now.', aHe: '\u05D1\u05DB\u05DC \u05E2\u05EA! \u05EA\u05D6\u05DE\u05DF \u05DE\u05E8\u05D0\u05E9 \u05D0\u05D5 \u05E6\u05D0 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05E2\u05DB\u05E9\u05D9\u05D5.', aEs: '\u00A1En cualquier momento! Programa con antelaci\u00F3n o transmite ahora.' },
  { qFr: 'Comment et quand suis-je paye ?', q: 'How and when do I get paid?', qHe: '\u05D0\u05D9\u05DA \u05D5\u05DE\u05EA\u05D9 \u05DE\u05E9\u05DC\u05DE\u05D9\u05DD \u05DC\u05D9?', qEs: '\u00BFC\u00F3mo y cu\u00E1ndo me pagan?',
    aFr: 'Les paiements sont traites via Stripe sous 3 a 5 jours ouvrables.', a: 'Payments are processed via Stripe within 3-5 business days.', aHe: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05E2\u05D5\u05D1\u05D3\u05D9\u05DD \u05D3\u05E8\u05DA Stripe \u05EA\u05D5\u05DA 3-5 \u05D9\u05DE\u05D9 \u05E2\u05E1\u05E7\u05D9\u05DD.', aEs: 'Los pagos se procesan v\u00EDa Stripe en 3-5 d\u00EDas h\u00E1biles.' },
  { qFr: 'Quels sont les frais ?', q: 'What are the fees?', qHe: '\u05DE\u05D4 \u05D4\u05E2\u05DE\u05DC\u05D5\u05EA?', qEs: '\u00BFCu\u00E1les son las comisiones?',
    aFr: '8% de commission + 2,9% + 0,30\u20AC de frais Stripe + TVA 20% sur les frais. Exemple : sur 50\u20AC, frais totaux 6,90\u20AC TTC, vous recevez 43,10\u20AC.', a: '8% commission + 2.9% + \u20AC0.30 Stripe fees + 20% VAT on fees. Example: on a \u20AC50 sale, total fees \u20AC6.90 incl. VAT, you receive \u20AC43.10.', aHe: '8% \u05E2\u05DE\u05DC\u05D4 + 2.9% + 0.30\u20AC Stripe + \u05DE\u05E2"\u05DE 20%. \u05D3\u05D5\u05D2\u05DE\u05D4: \u05DE\u05DE\u05DB\u05D9\u05E8\u05D4 \u05E9\u05DC 50\u20AC, \u05E2\u05DE\u05DC\u05D5\u05EA 6.90\u20AC, \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD 43.10\u20AC.', aEs: '8% comisi\u00F3n + 2,9% + 0,30\u20AC Stripe + IVA 20% sobre comisiones. Ejemplo: venta de 50\u20AC, comisiones 6,90\u20AC, recibes 43,10\u20AC.' },
  { qFr: 'Que puis-je vendre ?', q: 'What can I sell?', qHe: '\u05DE\u05D4 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05DB\u05D5\u05E8?', qEs: '\u00BFQu\u00E9 puedo vender?',
    aFr: 'Mode, sneakers, cartes, high-tech, art, bijoux et plus encore !', a: 'Fashion, sneakers, cards, electronics, art, jewelry and more!', aHe: '\u05D0\u05D5\u05E4\u05E0\u05D4, \u05E1\u05E0\u05D9\u05E7\u05E8\u05E1, \u05E7\u05DC\u05E4\u05D9\u05DD, \u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E0\u05D9\u05E7\u05D4, \u05D0\u05DE\u05E0\u05D5\u05EA \u05D5\u05E2\u05D5\u05D3!', aEs: '\u00A1Moda, sneakers, cartas, electr\u00F3nica, arte, joyer\u00EDa y mucho m\u00E1s!' },
  { qFr: 'Comment fonctionne la livraison ?', q: 'How does shipping work?', qHe: '\u05D0\u05D9\u05DA \u05E2\u05D5\u05D1\u05D3\u05EA \u05D4\u05DE\u05E9\u05DC\u05D5\u05D7?', qEs: '\u00BFC\u00F3mo funciona el env\u00EDo?',
    aFr: 'Le vendeur expedie sous 3 jours. Le suivi est envoye automatiquement a l\'acheteur.', a: 'Seller ships within 3 days. Tracking provided to buyer automatically.', aHe: '\u05D4\u05DE\u05D5\u05DB\u05E8 \u05E9\u05D5\u05DC\u05D7 \u05EA\u05D5\u05DA 3 \u05D9\u05DE\u05D9\u05DD. \u05DE\u05E2\u05E7\u05D1 \u05E0\u05E9\u05DC\u05D7 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA.', aEs: 'El vendedor env\u00EDa en 3 d\u00EDas. El seguimiento se env\u00EDa autom\u00E1ticamente al comprador.' },
]

type WizardState = 'idle' | 'onboarding' | 'celebration'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const [showFaq, setShowFaq] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [wizardState, setWizardState] = useState<WizardState>('idle')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const txt = {
    fr: {
      badge: 'COMMENCEZ A VENDRE',
      title: 'Passez en live.\nVendez instantanement.',
      subtitle: 'Rejoignez des milliers de vendeurs qui gagnent de l\'argent reel avec la vente en live sur ShaPop.',
      sellFast: 'Vendez en secondes',
      sellFastDesc: 'La vente en live est rapide. Gagnez plus par heure que sur n\'importe quelle marketplace.',
      keepMore: 'Frais parmi les plus bas',
      keepMoreDesc: '8% commission + frais Stripe. Vous gardez plus que sur les autres plateformes.',
      bestBuyers: 'Acheteurs engages',
      bestBuyersDesc: 'Les acheteurs en live sont fideles, enthousiastes et prets a depenser.',
      trusted: 'Plateforme de confiance',
      trustedDesc: 'Paiements securises, protection acheteur et support 24/7.',
      formatsTitle: 'Comment vendre ?',
      fmtAuction: 'Encheres',
      fmtAuctionDesc: 'Les spectateurs encherissent en direct. Celui qui offre le plus remporte l\'article.',
      fmtBuyNow: 'Achat direct',
      fmtBuyNowDesc: 'Vendez a prix fixe, sans encheres. L\'acheteur clique et achete instantanement.',
      fmtMystery: 'Boite mystere',
      fmtMysteryDesc: 'Surprenez vos acheteurs avec un lot mystere a prix unique.',
      fmtRipShip: 'Ouverture & envoi',
      fmtRipShipDesc: 'Ouvrez les packs en direct devant les acheteurs et expediez aussitot.',
      stats1: '~13%',
      stats1Label: 'Total fees',
      stats2: '0€',
      stats2Label: 'Frais de demarrage',
      stats3: '24/7',
      stats3Label: 'Support',
      faq: 'FAQ',
      letsGo: 'C\'est parti !',
      free: 'Gratuit pour commencer',
      freeDesc: 'Aucun frais initial. Vos 7 premiers jours sans commission !',
    },
    en: {
      badge: 'START SELLING TODAY',
      title: 'Go live.\nSell instantly.',
      subtitle: 'Join thousands of sellers earning real money through live shopping on ShaPop.',
      sellFast: 'Sell in seconds',
      sellFastDesc: 'Live selling is fast. Earn more per hour than any other marketplace.',
      keepMore: 'Lowest fees around',
      keepMoreDesc: '8% commission + Stripe fees. You keep more than on other platforms.',
      bestBuyers: 'Engaged buyers',
      bestBuyersDesc: 'Live shoppers are loyal, excited, and ready to spend.',
      trusted: 'Trusted platform',
      trustedDesc: 'Secure payments, buyer protection, and 24/7 support.',
      formatsTitle: 'How to sell?',
      fmtAuction: 'Auctions',
      fmtAuctionDesc: 'Viewers bid in real-time. Highest bidder wins the item.',
      fmtBuyNow: 'Buy Now',
      fmtBuyNowDesc: 'Sell at a fixed price, no bidding. Buyers click and purchase instantly.',
      fmtMystery: 'Mystery box',
      fmtMysteryDesc: 'Surprise your buyers with a mystery lot at a set price.',
      fmtRipShip: 'Rip & Ship',
      fmtRipShipDesc: 'Open packs live for buyers and ship immediately.',
      stats1: '~13%',
      stats1Label: 'Total fees',
      stats2: '$0',
      stats2Label: 'Startup fees',
      stats3: '24/7',
      stats3Label: 'Support',
      faq: 'FAQ',
      letsGo: "Let's go!",
      free: 'Free to start',
      freeDesc: 'No upfront fees. Your first 7 days are commission-free!',
    },
    he: {
      badge: 'התחל למכור היום',
      title: 'צא לשידור.\nמכור מיד.',
      subtitle: 'הצטרף לאלפי מוכרים שמרוויחים כסף אמיתי דרך מכירות לייב ב-ShaPop.',
      sellFast: 'מכור בשניות',
      sellFastDesc: 'מכירת לייב זה מהיר. הרוויח יותר לשעה מכל מרקטפלייס.',
      keepMore: '\u05E2\u05DE\u05DC\u05D5\u05EA \u05E0\u05DE\u05D5\u05DB\u05D5\u05EA',
      keepMoreDesc: '8% \u05E2\u05DE\u05DC\u05D4 + \u05D3\u05DE\u05D9 \u05E2\u05D9\u05D1\u05D5\u05D3 Stripe. \u05EA\u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05D9\u05D5\u05EA\u05E8.',
      bestBuyers: 'קונים מחוברים',
      bestBuyersDesc: 'קונים בלייב נאמנים, נלהבים ומוכנים לקנות.',
      trusted: 'פלטפורמה אמינה',
      trustedDesc: 'תשלומים מאובטחים, הגנת קונים ותמיכה 24/7.',
      formatsTitle: 'איך למכור?',
      fmtAuction: 'מכירות פומביות',
      fmtAuctionDesc: 'צופים מציעים בזמן אמת. המציע הגבוה זוכה.',
      fmtBuyNow: 'קנייה ישירה',
      fmtBuyNowDesc: 'מכור במחיר קבוע, בלי הצעות. הקונה לוחץ וקונה מיד.',
      fmtMystery: 'קופסת הפתעה',
      fmtMysteryDesc: 'הפתיעו את הקונים עם חבילה מסתורית במחיר אחיד.',
      fmtRipShip: 'פתיחה ומשלוח',
      fmtRipShipDesc: 'פתחו חבילות בשידור חי ושלחו מיד.',
      stats1: '~13%',
      stats1Label: '\u05E2\u05DE\u05DC\u05D5\u05EA',
      stats2: '0$',
      stats2Label: 'עלויות התחלה',
      stats3: '24/7',
      stats3Label: 'תמיכה',
      faq: 'FAQ',
      letsGo: '!יאללה',
      free: 'חינם להתחלה',
      freeDesc: '!בלי עלויות מראש. 7 ימים ראשונים ללא עמלה',
    },
    es: {
      badge: 'EMPIEZA A VENDER HOY',
      title: 'Transmite en directo.\nVende al instante.',
      subtitle: '\u00DAnete a miles de vendedores que ganan dinero real con ventas en directo en ShaPop.',
      sellFast: 'Vende en segundos',
      sellFastDesc: 'La venta en directo es r\u00E1pida. Gana m\u00E1s por hora que en cualquier marketplace.',
      keepMore: 'Comisiones de las m\u00E1s bajas',
      keepMoreDesc: '8% de comisi\u00F3n + comisiones Stripe. Te quedas con m\u00E1s que en otras plataformas.',
      bestBuyers: 'Compradores comprometidos',
      bestBuyersDesc: 'Los compradores en directo son fieles, entusiastas y listos para gastar.',
      trusted: 'Plataforma de confianza',
      trustedDesc: 'Pagos seguros, protecci\u00F3n al comprador y soporte 24/7.',
      formatsTitle: '\u00BFC\u00F3mo vender?',
      fmtAuction: 'Subastas',
      fmtAuctionDesc: 'Los espectadores pujan en directo. El mejor postor se lleva el art\u00EDculo.',
      fmtBuyNow: 'Compra directa',
      fmtBuyNowDesc: 'Vende a precio fijo, sin pujas. El comprador hace clic y compra al instante.',
      fmtMystery: 'Caja misteriosa',
      fmtMysteryDesc: 'Sorprende a tus compradores con un lote misterioso a precio \u00FAnico.',
      fmtRipShip: 'Abrir y enviar',
      fmtRipShipDesc: 'Abre los packs en directo delante de los compradores y env\u00EDa de inmediato.',
      stats1: '~13%',
      stats1Label: 'Comisiones totales',
      stats2: '0\u20AC',
      stats2Label: 'Costos iniciales',
      stats3: '24/7',
      stats3Label: 'Soporte',
      faq: 'FAQ',
      letsGo: '\u00A1Vamos!',
      free: 'Gratis para empezar',
      freeDesc: '\u00A1Sin costos iniciales. Tus primeros 7 d\u00EDas sin comisi\u00F3n!',
    },
  }

  const t = txt[lang as keyof typeof txt] || txt.fr

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
      { value: t.stats2, label: t.stats2Label },
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
            position: 'absolute', top: '-60px', left: '-40px',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,144,138,0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', top: '40px', right: '-60px',
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
              position: 'absolute', top: '14px', left: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '8px',
              background: 'rgba(232,52,78,0.9)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>LIVE</span>
            </div>

            {/* Viewers count */}
            <div style={{
              position: 'absolute', top: '14px', right: '14px',
              padding: '5px 10px', borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            }}>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>LIVE</span>
            </div>

            {/* Center play icon */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
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
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>ShaPop Live</p>
                <p style={{ fontSize: '11px', color: '#999' }}>@you</p>
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
            <div key={i} style={{
              flex: 1, textAlign: 'center', position: 'relative',
            }}>
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: 500 }}>{stat.label}</p>
              {i < stats.length - 1 && (
                <div style={{
                  position: 'absolute', right: 0, top: '10%', height: '80%',
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
                key={i}
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
                key={i}
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
                <div key={i} style={{ borderBottom: i < faqItems.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '16px 18px',
                      background: openFaq === i ? '#0D0D0D' : '#080808',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#ccc', paddingRight: '12px' }}>
                      {lang === 'fr' ? item.qFr : lang === 'he' ? item.qHe : lang === 'es' ? item.qEs : item.q}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
                      style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 18px 16px', backgroundColor: '#0D0D0D' }}>
                      <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
                        {lang === 'fr' ? item.aFr : lang === 'he' ? item.aHe : lang === 'es' ? item.aEs : item.a}
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

  // ═══════════════ SELLER: Create Live Wizard + Engagement Summary ═══════════════
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000' }}>
      {/* Performance en direct - Engagement Summary */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}>
        <EngagementSummary />
      </div>

      {/* Create Live Wizard */}
      <CreateLiveWizard />
    </div>
  )
}

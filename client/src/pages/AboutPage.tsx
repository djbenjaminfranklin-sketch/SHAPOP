import React from 'react'
import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface AboutText {
  goBack: string
  title: string
  tagline: string
  desc: string
  missionTitle: string
  mission: string
  features: { icon: string; title: string; desc: string }[]
  version: string
  made: string
  legal: string
  terms: string
  privacy: string
  eula: string
  communityGuidelines: string
  returnPolicy: string
}

const content: Localized<AboutText> = {
  en: {
    goBack: 'Go back',
    title: 'About ShaPop',
    tagline: 'Live shopping, reimagined.',
    desc: 'ShaPop is the live shopping marketplace open to the whole world: sellers go live, show their products in real time and connect directly with buyers. No middlemen, no algorithms hiding your content — just real people, real products, real deals.',
    missionTitle: 'Our mission',
    mission: 'To make buying and selling accessible to everyone through the power of live video. We believe the future of e-commerce is human, interactive and fun.',
    features: [
      { icon: 'video', title: 'Live streams', desc: 'Watch sellers show their products in real time. Ask questions, negotiate and buy instantly.' },
      { icon: 'map', title: 'Local first', desc: 'Discover sellers near you on our interactive map. Support local businesses and pick up your items in person.' },
      { icon: 'shield', title: 'Buyer protection', desc: 'ShaPop holds your payment until the handover is proven: 4-digit code in person, or two photos for a shipment by post.' },
      { icon: 'zap', title: 'Instant selling', desc: 'Go live in seconds. No listing fees, no waiting. Start selling today.' },
    ],
    version: 'Version',
    made: 'Made with love, for the whole world',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    eula: 'License Agreement',
    communityGuidelines: 'Community Guidelines',
    returnPolicy: 'Return Policy',
  },
  fr: {
    goBack: 'Retour',
    title: 'À propos de ShaPop',
    tagline: 'Le shopping en direct, réinventé.',
    desc: 'ShaPop est la marketplace de shopping en direct ouverte au monde entier : les vendeurs passent en live, présentent leurs produits en temps réel et échangent directement avec les acheteurs. Pas d\'intermédiaires, pas d\'algorithmes qui cachent ton contenu — juste de vraies personnes, de vrais produits, de vraies affaires.',
    missionTitle: 'Notre mission',
    mission: 'Rendre l\'achat et la vente accessibles à tous grâce à la puissance de la vidéo en direct. Nous croyons que l\'avenir du e-commerce est humain, interactif et fun.',
    features: [
      { icon: 'video', title: 'Lives', desc: 'Regarde les vendeurs présenter leurs produits en temps réel. Pose tes questions, négocie et achète en un instant.' },
      { icon: 'map', title: 'Le local d\'abord', desc: 'Découvre les vendeurs près de chez toi sur notre carte interactive. Soutiens les commerces locaux et récupère tes articles en main propre.' },
      { icon: 'shield', title: 'Protection acheteur', desc: 'ShaPop garde ton paiement de côté jusqu’à la preuve de la remise : code à 4 chiffres en main propre, ou deux photos pour un envoi postal.' },
      { icon: 'zap', title: 'Vente instantanée', desc: 'Passe en live en quelques secondes. Pas de frais de mise en ligne, pas d\'attente. Commence à vendre dès aujourd\'hui.' },
    ],
    version: 'Version',
    made: 'Fait avec amour, pour le monde entier',
    legal: 'Mentions légales',
    terms: 'Conditions d\'utilisation',
    privacy: 'Politique de confidentialité',
    eula: 'Contrat de licence',
    communityGuidelines: 'Règles de la communauté',
    returnPolicy: 'Politique de retours',
  },
  es: {
    goBack: 'Volver',
    title: 'Sobre ShaPop',
    tagline: 'Las compras en directo, reinventadas.',
    desc: 'ShaPop es el marketplace de compras en directo abierto a todo el mundo: los vendedores transmiten en vivo, muestran sus productos en tiempo real y conectan directamente con los compradores. Sin intermediarios, sin algoritmos que oculten tu contenido: solo personas reales, productos reales y ofertas reales.',
    missionTitle: 'Nuestra misión',
    mission: 'Hacer que comprar y vender sea accesible para todos gracias al poder del vídeo en directo. Creemos que el futuro del comercio electrónico es humano, interactivo y divertido.',
    features: [
      { icon: 'video', title: 'Directos', desc: 'Mira cómo los vendedores presentan sus productos en tiempo real. Pregunta, negocia y compra al instante.' },
      { icon: 'map', title: 'Primero lo local', desc: 'Descubre vendedores cerca de ti con nuestro mapa interactivo. Apoya a los negocios locales y recoge tus artículos en mano.' },
      { icon: 'shield', title: 'Protección al comprador', desc: 'ShaPop retiene tu pago hasta que se demuestra la entrega: código de 4 cifras en mano, o dos fotos en un envío por correo.' },
      { icon: 'zap', title: 'Venta instantánea', desc: 'Sal en directo en segundos. Sin comisiones por publicar, sin esperas. Empieza a vender hoy.' },
    ],
    version: 'Versión',
    made: 'Hecho con amor, para todo el mundo',
    legal: 'Legal',
    terms: 'Términos del servicio',
    privacy: 'Política de privacidad',
    eula: 'Acuerdo de licencia',
    communityGuidelines: 'Normas de la comunidad',
    returnPolicy: 'Política de devoluciones',
  },
  ru: {
    goBack: 'Назад',
    title: 'О ShaPop',
    tagline: 'Шопинг в прямом эфире — по-новому.',
    desc: 'ShaPop — маркетплейс live-шопинга, открытый для всего мира: продавцы выходят в эфир, показывают товары в реальном времени и общаются с покупателями напрямую. Никаких посредников и алгоритмов, которые прячут твой контент, — только настоящие люди, настоящие товары и настоящие сделки.',
    missionTitle: 'Наша миссия',
    mission: 'Сделать покупки и продажи доступными для всех благодаря силе видео в прямом эфире. Мы верим, что будущее электронной коммерции — живое, интерактивное и весёлое.',
    features: [
      { icon: 'video', title: 'Прямые эфиры', desc: 'Смотри, как продавцы показывают товары в реальном времени. Задавай вопросы, торгуйся и покупай мгновенно.' },
      { icon: 'map', title: 'Сначала — рядом', desc: 'Находи продавцов поблизости на интерактивной карте. Поддерживай местный бизнес и забирай покупки лично.' },
      { icon: 'shield', title: 'Защита покупателя', desc: 'ShaPop удерживает твою оплату, пока передача не подтверждена: 4-значный код при личной встрече или два фото при отправке почтой.' },
      { icon: 'zap', title: 'Мгновенные продажи', desc: 'Выходи в эфир за секунды. Без платы за размещение и без ожидания. Начни продавать уже сегодня.' },
    ],
    version: 'Версия',
    made: 'Сделано с любовью для всего мира',
    legal: 'Правовая информация',
    terms: 'Условия использования',
    privacy: 'Политика конфиденциальности',
    eula: 'Лицензионное соглашение',
    communityGuidelines: 'Правила сообщества',
    returnPolicy: 'Политика возврата',
  },
  he: {
    goBack: 'חזרה',
    title: 'אודות ShaPop',
    tagline: 'קניות בשידור חי, בגרסה חדשה.',
    desc: 'ShaPop היא זירת הקניות בשידור חי הפתוחה לכל העולם: מוכרים עולים לשידור חי, מציגים את המוצרים שלהם בזמן אמת ומתחברים ישירות לקונים. בלי מתווכים, בלי אלגוריתמים שמסתירים את התוכן שלכם — רק אנשים אמיתיים, מוצרים אמיתיים ועסקאות אמיתיות.',
    missionTitle: 'המשימה שלנו',
    mission: 'להנגיש קנייה ומכירה לכולם בעזרת הכוח של וידאו חי. אנחנו מאמינים שהעתיד של המסחר המקוון הוא אנושי, אינטראקטיבי וכיפי.',
    features: [
      { icon: 'video', title: 'שידורים חיים', desc: 'צפו במוכרים מציגים את המוצרים שלהם בזמן אמת. שאלו, התמקחו וקנו ברגע.' },
      { icon: 'map', title: 'קודם כל מקומי', desc: 'גלו מוכרים בסביבה במפה האינטראקטיבית. תמכו בעסקים מקומיים ואספו את הפריטים ביד.' },
      { icon: 'shield', title: 'הגנת קונים', desc: 'ShaPop מחזיקה את התשלום שלכם עד שהמסירה מוכחת: קוד בן 4 ספרות באיסוף עצמי, או שתי תמונות במשלוח בדואר.' },
      { icon: 'zap', title: 'מכירה מיידית', desc: 'עולים לשידור תוך שניות. בלי דמי פרסום, בלי המתנה. מתחילים למכור כבר היום.' },
    ],
    version: 'גרסה',
    made: 'נוצר באהבה, לכל העולם',
    legal: 'מידע משפטי',
    terms: 'תנאי שימוש',
    privacy: 'מדיניות פרטיות',
    eula: 'הסכם רישיון',
    communityGuidelines: 'כללי הקהילה',
    returnPolicy: 'מדיניות החזרות',
  },
}

const iconMap: Record<string, React.JSX.Element> = {
  video: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  map: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3"/></svg>,
  shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  zap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

export default function AboutPage() {
  const navigate = useNavigate()
  const c = tr(content)
  usePageTitle(c.title)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', fontStyle: 'italic', marginBottom: '4px' }}>
          Sha<span style={{ color: '#F0908A' }}>Pop</span>{/* i18n-ignore */}
        </div>
        <p style={{ fontSize: '16px', color: '#aaa', fontStyle: 'italic', marginBottom: '24px' }}>{c.tagline}</p>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, textAlign: 'start', marginBottom: '32px' }}>{c.desc}</p>

        {/* Mission */}
        <div style={{ backgroundColor: '#111', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'start' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{c.missionTitle}</h2>
          <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>{c.mission}</p>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {c.features.map((f) => (
            <div key={f.icon} style={{ backgroundColor: '#111', borderRadius: '14px', padding: '16px', textAlign: 'start' }}>
              {iconMap[f.icon]}
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '10px', marginBottom: '4px' }}>{f.title}</h3>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Legal links */}
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '16px', textAlign: 'start', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.legal}</p>
          {[
            { label: c.terms, to: '/terms' },
            { label: c.privacy, to: '/privacy' },
            { label: c.eula, to: '/eula' },
            { label: c.communityGuidelines, to: '/community-guidelines' },
            { label: c.returnPolicy, to: '/return-policy' },
          ].map(link => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '12px 0', background: 'none', border: 'none', borderBottom: '1px solid #1A1A1A',
                cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '14px', color: '#aaa' }}>{link.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ ...rtlFlip() }}><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ))}
        </div>

        {/* Version & footer */}
        <p style={{ fontSize: '12px', color: '#444' }}>{c.version} 1.0.0</p>
        <p style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>{c.made}</p>
      </div>
    </div>
  )
}

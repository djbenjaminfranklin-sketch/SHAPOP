import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

const content = {
  en: {
    title: 'About ShaPop',
    tagline: 'Live shopping, reimagined.',
    desc: 'ShaPop is Israel\'s live shopping marketplace where sellers broadcast live, showcase their products in real-time, and connect directly with buyers. No middlemen, no algorithms hiding your content \u2014 just real people, real products, real deals.',
    missionTitle: 'Our Mission',
    mission: 'To make selling and buying accessible to everyone through the power of live video. We believe the future of e-commerce is human, interactive, and fun.',
    features: [
      { icon: 'video', title: 'Live Streams', desc: 'Watch sellers present their products in real-time. Ask questions, negotiate, and buy instantly.' },
      { icon: 'map', title: 'Local First', desc: 'Discover sellers near you with our interactive map. Support local businesses and save on shipping.' },
      { icon: 'shield', title: 'Buyer Protection', desc: '14-day return policy on all purchases. Secure payments with bank-level encryption.' },
      { icon: 'zap', title: 'Instant Selling', desc: 'Go live in seconds. No listing fees, no waiting. Start selling today.' },
    ],
    version: 'Version',
    made: 'Made with love in Israel',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    eula: 'License Agreement',
  },
  he: {
    title: '\u05D0\u05D5\u05D3\u05D5\u05EA ShaPop',
    tagline: '\u05E7\u05E0\u05D9\u05D5\u05EA \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9, \u05D1\u05D2\u05D3\u05D5\u05DC.',
    desc: 'ShaPop \u05D4\u05D9\u05D0 \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05EA \u05D4\u05E7\u05E0\u05D9\u05D5\u05EA \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9 \u05E9\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC. \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DE\u05E9\u05D3\u05E8\u05D9\u05DD \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9, \u05DE\u05E6\u05D9\u05D2\u05D9\u05DD \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA, \u05D5\u05DE\u05EA\u05D7\u05D1\u05E8\u05D9\u05DD \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05E2\u05DD \u05E7\u05D5\u05E0\u05D9\u05DD. \u05D1\u05DC\u05D9 \u05DE\u05EA\u05D5\u05D5\u05DB\u05D9\u05DD, \u05D1\u05DC\u05D9 \u05D0\u05DC\u05D2\u05D5\u05E8\u05D9\u05EA\u05DE\u05D9\u05DD \u2014 \u05E8\u05E7 \u05D0\u05E0\u05E9\u05D9\u05DD \u05D0\u05DE\u05D9\u05EA\u05D9\u05D9\u05DD, \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D0\u05DE\u05D9\u05EA\u05D9\u05D9\u05DD, \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA.',
    missionTitle: '\u05D4\u05DE\u05E9\u05D9\u05DE\u05D4 \u05E9\u05DC\u05E0\u05D5',
    mission: '\u05DC\u05D4\u05E4\u05D5\u05DA \u05DE\u05DB\u05D9\u05E8\u05D4 \u05D5\u05E7\u05E0\u05D9\u05D9\u05D4 \u05DC\u05E0\u05D2\u05D9\u05E9\u05D9\u05DD \u05DC\u05DB\u05D5\u05DC\u05DD \u05D3\u05E8\u05DA \u05D4\u05DB\u05D5\u05D7 \u05E9\u05DC \u05D5\u05D9\u05D3\u05D0\u05D5 \u05D7\u05D9. \u05D0\u05E0\u05D7\u05E0\u05D5 \u05DE\u05D0\u05DE\u05D9\u05E0\u05D9\u05DD \u05E9\u05D4\u05E2\u05EA\u05D9\u05D3 \u05E9\u05DC \u05D4\u05DE\u05E1\u05D7\u05E8 \u05D4\u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E0\u05D9 \u05D4\u05D5\u05D0 \u05D0\u05E0\u05D5\u05E9\u05D9, \u05D0\u05D9\u05E0\u05D8\u05E8\u05D0\u05E7\u05D8\u05D9\u05D1\u05D9 \u05D5\u05DE\u05D4\u05E0\u05D4.',
    features: [
      { icon: 'video', title: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD', desc: '\u05E6\u05E4\u05D5 \u05D1\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DE\u05E6\u05D9\u05D2\u05D9\u05DD \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA. \u05E9\u05D0\u05DC\u05D5, \u05D4\u05EA\u05DE\u05E7\u05D7\u05D5 \u05D5\u05E7\u05E0\u05D5 \u05D1\u05DE\u05E7\u05D5\u05DD.' },
      { icon: 'map', title: '\u05DE\u05E7\u05D5\u05DE\u05D9 \u05E7\u05D5\u05D3\u05DD', desc: '\u05D2\u05DC\u05D5 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD \u05E2\u05DD \u05D4\u05DE\u05E4\u05D4 \u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05D0\u05E7\u05D8\u05D9\u05D1\u05D9\u05EA. \u05EA\u05DE\u05DB\u05D5 \u05D1\u05E2\u05E1\u05E7\u05D9\u05DD \u05DE\u05E7\u05D5\u05DE\u05D9\u05D9\u05DD.' },
      { icon: 'shield', title: '\u05D4\u05D2\u05E0\u05EA \u05E7\u05D5\u05E0\u05D4', desc: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05D7\u05D6\u05E8\u05D4 \u05E9\u05DC 14 \u05D9\u05D5\u05DD. \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05D9\u05DD \u05D1\u05E8\u05DE\u05EA \u05D1\u05E0\u05E7.' },
      { icon: 'zap', title: '\u05DE\u05DB\u05D9\u05E8\u05D4 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA', desc: '\u05E2\u05DC\u05D5 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D1\u05E9\u05E0\u05D9\u05D5\u05EA. \u05D1\u05DC\u05D9 \u05E2\u05DE\u05DC\u05D5\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD, \u05D1\u05DC\u05D9 \u05D4\u05DE\u05EA\u05E0\u05D4. \u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05DC\u05DE\u05DB\u05D5\u05E8 \u05D4\u05D9\u05D5\u05DD.' },
    ],
    version: '\u05D2\u05E8\u05E1\u05D4',
    made: '\u05E0\u05D5\u05E6\u05E8 \u05D1\u05D0\u05D4\u05D1\u05D4 \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC',
    legal: '\u05DE\u05E9\u05E4\u05D8\u05D9',
    terms: '\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9',
    privacy: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA',
    eula: '\u05D4\u05E1\u05DB\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF',
  },
  fr: {
    title: 'À propos de ShaPop',
    tagline: 'Le shopping en direct, réinventé.',
    desc: 'ShaPop est la marketplace de shopping en direct d\'Israël où les vendeurs diffusent en live, présentent leurs produits en temps réel et se connectent directement avec les acheteurs. Pas d\'intermédiaires, pas d\'algorithmes masquant votre contenu — juste de vraies personnes, de vrais produits, de vraies affaires.',
    missionTitle: 'Notre mission',
    mission: 'Rendre la vente et l\'achat accessibles à tous grâce à la puissance de la vidéo en direct. Nous croyons que l\'avenir du e-commerce est humain, interactif et amusant.',
    features: [
      { icon: 'video', title: 'Lives en direct', desc: 'Regardez les vendeurs présenter leurs produits en temps réel. Posez des questions, négociez et achetez instantanément.' },
      { icon: 'map', title: 'Local d\'abord', desc: 'Découvrez les vendeurs près de chez vous avec notre carte interactive. Soutenez les commerces locaux et économisez sur la livraison.' },
      { icon: 'shield', title: 'Protection acheteur', desc: 'Politique de retour de 14 jours sur tous les achats. Paiements sécurisés avec chiffrement de niveau bancaire.' },
      { icon: 'zap', title: 'Vente instantanée', desc: 'Passez en live en quelques secondes. Pas de frais de mise en ligne, pas d\'attente. Commencez à vendre dès aujourd\'hui.' },
    ],
    version: 'Version',
    made: 'Fait avec amour en Israël',
    legal: 'Mentions légales',
    terms: 'Conditions d\'utilisation',
    privacy: 'Politique de confidentialité',
    eula: 'Contrat de licence',
  },
  es: {
    title: 'Sobre ShaPop',
    tagline: 'Compras en vivo, reinventadas.',
    desc: 'ShaPop es el marketplace de compras en vivo de Israel donde los vendedores transmiten en vivo, muestran sus productos en tiempo real y se conectan directamente con compradores. Sin intermediarios, sin algoritmos \u2014 solo personas reales, productos reales, ofertas reales.',
    missionTitle: 'Nuestra Mision',
    mission: 'Hacer que vender y comprar sea accesible para todos a traves del poder del video en vivo. Creemos que el futuro del comercio electronico es humano, interactivo y divertido.',
    features: [
      { icon: 'video', title: 'Transmisiones en Vivo', desc: 'Mira a vendedores presentar sus productos en tiempo real. Pregunta, negocia y compra al instante.' },
      { icon: 'map', title: 'Primero Local', desc: 'Descubre vendedores cerca de ti con nuestro mapa interactivo. Apoya negocios locales.' },
      { icon: 'shield', title: 'Proteccion al Comprador', desc: 'Politica de devolucion de 14 dias. Pagos seguros con encriptacion bancaria.' },
      { icon: 'zap', title: 'Venta Instantanea', desc: 'Transmite en segundos. Sin comisiones de listado. Empieza a vender hoy.' },
    ],
    version: 'Version',
    made: 'Hecho con amor en Israel',
    legal: 'Legal',
    terms: 'Terminos de Servicio',
    privacy: 'Politica de Privacidad',
    eula: 'Acuerdo de Licencia',
  },
}

const iconMap: Record<string, JSX.Element> = {
  video: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  map: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3"/></svg>,
  shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  zap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

export default function AboutPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ fontSize: '42px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', fontStyle: 'italic', marginBottom: '4px' }}>
          Sha<span style={{ color: '#F0908A' }}>Pop</span>
        </div>
        <p style={{ fontSize: '16px', color: '#aaa', fontStyle: 'italic', marginBottom: '24px' }}>{c.tagline}</p>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, textAlign: 'left', marginBottom: '32px' }}>{c.desc}</p>

        {/* Mission */}
        <div style={{ backgroundColor: '#111', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{c.missionTitle}</h2>
          <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>{c.mission}</p>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {c.features.map((f, i) => (
            <div key={i} style={{ backgroundColor: '#111', borderRadius: '14px', padding: '16px', textAlign: 'left' }}>
              {iconMap[f.icon]}
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '10px', marginBottom: '4px' }}>{f.title}</h3>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Legal links */}
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.legal}</p>
          {[
            { label: c.terms, to: '/terms' },
            { label: c.privacy, to: '/privacy' },
            { label: c.eula, to: '/eula' },
          ].map(link => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '12px 0', background: 'none', border: 'none', borderBottom: '1px solid #1A1A1A',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '14px', color: '#aaa' }}>{link.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

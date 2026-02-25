import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

const content = {
  fr: {
    title: 'Regles de la communaute',
    updated: 'Derniere mise a jour : 24 fevrier 2026',
    sections: [
      { h: '1. Bienvenue', p: 'ShaPop est une communaute de shopping en direct fondee sur le respect mutuel. En utilisant ShaPop, vous acceptez de respecter ces regles qui visent a garantir une experience sure et agreable pour tous les utilisateurs.' },
      { h: '2. Conduite', p: 'Le harcelement, les discours haineux, la discrimination, l\'usurpation d\'identite et le spam sont strictement interdits. Traitez les autres utilisateurs avec respect et courtoisie. Toute forme d\'intimidation, de menaces ou de comportement abusif entrainera des sanctions.' },
      { h: '3. Contenu interdit', p: 'Il est interdit de vendre ou de promouvoir : des articles contrefaits, des produits illegaux, du contenu explicite ou a caractere sexuel, du contenu violent ou incitant a la violence. Tout contenu enfreignant les droits de propriete intellectuelle d\'un tiers est egalement interdit.' },
      { h: '4. Regles des lives', p: 'Les pratiques trompeuses lors des lives sont interdites (fausses encheres, manipulation des prix). Le presentateur doit etre habille de maniere appropriee. Les mineurs ne peuvent apparaitre en live qu\'avec le consentement parental explicite. Les activites dangereuses sont interdites pendant les diffusions.' },
      { h: '5. Regles des annonces', p: 'Les descriptions doivent etre exactes et completes. Utilisez de vraies photos de l\'article. Indiquez honnetement l\'etat de l\'article (neuf, comme neuf, bon etat, etc.). Les prix doivent etre justes et ne pas induire en erreur.' },
      { h: '6. Signalement', p: 'Si vous constatez un contenu ou un comportement enfreignant ces regles, signalez-le directement dans l\'application via le bouton de signalement, ou par email a shapopcontact@gmail.com. Tous les signalements sont examines par notre equipe.' },
      { h: '7. Consequences', p: 'En cas de violation de ces regles, les consequences peuvent inclure : un avertissement, la suspension temporaire du compte, le bannissement permanent, ou la suppression du contenu. La severite des sanctions depend de la gravite et de la frequence des infractions.' },
      { h: '8. Appels', p: 'Si vous estimez qu\'une sanction a ete appliquee par erreur, vous pouvez faire appel en envoyant un email a shapopcontact@gmail.com en expliquant votre situation. Notre equipe examinera votre demande dans un delai raisonnable.' },
    ],
  },
  en: {
    title: 'Community Guidelines',
    updated: 'Last updated: February 24, 2026',
    sections: [
      { h: '1. Welcome', p: 'ShaPop is a live shopping community built on mutual respect. By using ShaPop, you agree to follow these guidelines that ensure a safe and enjoyable experience for all users.' },
      { h: '2. Conduct', p: 'Harassment, hate speech, discrimination, impersonation, and spam are strictly prohibited. Treat other users with respect and courtesy. Any form of intimidation, threats, or abusive behavior will result in sanctions.' },
      { h: '3. Prohibited Content', p: 'It is forbidden to sell or promote: counterfeit items, illegal products, explicit or sexual content, violent content or content inciting violence. Any content that infringes third-party intellectual property rights is also prohibited.' },
      { h: '4. Live Stream Rules', p: 'Deceptive practices during live streams are prohibited (fake bids, price manipulation). Presenters must be appropriately dressed. Minors may only appear on live streams with explicit parental consent. Dangerous activities are prohibited during broadcasts.' },
      { h: '5. Listing Rules', p: 'Descriptions must be accurate and complete. Use real photos of the item. Honestly indicate the item\'s condition (new, like new, good condition, etc.). Prices must be fair and not misleading.' },
      { h: '6. Reporting', p: 'If you see content or behavior that violates these guidelines, report it directly in the app using the report button, or by email at shapopcontact@gmail.com. All reports are reviewed by our team.' },
      { h: '7. Consequences', p: 'Violations of these guidelines may result in: a warning, temporary account suspension, permanent ban, or content removal. The severity of sanctions depends on the gravity and frequency of violations.' },
      { h: '8. Appeals', p: 'If you believe a sanction was applied in error, you can appeal by sending an email to shapopcontact@gmail.com explaining your situation. Our team will review your request within a reasonable timeframe.' },
    ],
  },
  he: {
    title: '\u05DB\u05DC\u05DC\u05D9 \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4',
    updated: '\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05D7\u05E8\u05D5\u05DF: 24 \u05D1\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8 2026',
    sections: [
      { h: '1. \u05D1\u05E8\u05D5\u05DB\u05D9\u05DD \u05D4\u05D1\u05D0\u05D9\u05DD', p: 'ShaPop \u05D4\u05D9\u05D0 \u05E7\u05D4\u05D9\u05DC\u05EA \u05E7\u05E0\u05D9\u05D5\u05EA \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9 \u05D4\u05DE\u05D1\u05D5\u05E1\u05E1\u05EA \u05E2\u05DC \u05DB\u05D1\u05D5\u05D3 \u05D4\u05D3\u05D3\u05D9. \u05D1\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1-ShaPop, \u05D0\u05EA\u05D4 \u05DE\u05E1\u05DB\u05D9\u05DD \u05DC\u05E6\u05D9\u05D9\u05EA \u05DB\u05DC\u05DC\u05D9\u05DD \u05D0\u05DC\u05D4.' },
      { h: '2. \u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA', p: '\u05D4\u05D8\u05E8\u05D3\u05D4, \u05D3\u05D1\u05E8\u05D9 \u05E9\u05E0\u05D0\u05D4, \u05D0\u05E4\u05DC\u05D9\u05D4, \u05D4\u05EA\u05D7\u05D6\u05D5\u05EA \u05D5\u05E1\u05E4\u05D0\u05DD \u05D0\u05E1\u05D5\u05E8\u05D9\u05DD \u05D1\u05D4\u05D7\u05DC\u05D8. \u05D4\u05EA\u05D9\u05D9\u05D7\u05E1\u05D5 \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D0\u05D7\u05E8\u05D9\u05DD \u05D1\u05DB\u05D1\u05D5\u05D3.' },
      { h: '3. \u05EA\u05D5\u05DB\u05DF \u05D0\u05E1\u05D5\u05E8', p: '\u05D0\u05E1\u05D5\u05E8 \u05DC\u05DE\u05DB\u05D5\u05E8 \u05D0\u05D5 \u05DC\u05E7\u05D3\u05DD: \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05DE\u05D6\u05D5\u05D9\u05E4\u05D9\u05DD, \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D1\u05DC\u05EA\u05D9 \u05D7\u05D5\u05E7\u05D9\u05D9\u05DD, \u05EA\u05D5\u05DB\u05DF \u05DE\u05D9\u05E0\u05D9 \u05D0\u05D5 \u05D0\u05DC\u05D9\u05DD, \u05EA\u05D5\u05DB\u05DF \u05D4\u05DE\u05E1\u05D9\u05EA \u05DC\u05D0\u05DC\u05D9\u05DE\u05D5\u05EA.' },
      { h: '4. \u05DB\u05DC\u05DC\u05D9 \u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9', p: '\u05E4\u05E8\u05E7\u05D8\u05D9\u05E7\u05D5\u05EA \u05DE\u05D8\u05E2\u05D5\u05EA \u05D0\u05E1\u05D5\u05E8\u05D5\u05EA. \u05D4\u05DE\u05E9\u05D3\u05E8 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05D1\u05D5\u05E9 \u05D1\u05D0\u05D5\u05E4\u05DF \u05D4\u05D5\u05DC\u05DD. \u05E7\u05D8\u05D9\u05E0\u05D9\u05DD \u05E8\u05E7 \u05E2\u05DD \u05D4\u05E1\u05DB\u05DE\u05EA \u05D4\u05D5\u05E8\u05D9\u05DD. \u05E4\u05E2\u05D9\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05E1\u05D5\u05DB\u05E0\u05D5\u05EA \u05D0\u05E1\u05D5\u05E8\u05D5\u05EA.' },
      { h: '5. \u05DB\u05DC\u05DC\u05D9 \u05DE\u05D5\u05D3\u05E2\u05D5\u05EA', p: '\u05D4\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05D3\u05D5\u05D9\u05E7\u05D9\u05DD. \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA. \u05E6\u05D9\u05D9\u05E0\u05D5 \u05D1\u05DB\u05E0\u05D5\u05EA \u05D0\u05EA \u05DE\u05E6\u05D1 \u05D4\u05E4\u05E8\u05D9\u05D8. \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05D4\u05D5\u05D2\u05E0\u05D9\u05DD.' },
      { h: '6. \u05D3\u05D9\u05D5\u05D5\u05D7', p: '\u05D0\u05DD \u05E0\u05EA\u05E7\u05DC\u05EA\u05DD \u05D1\u05EA\u05D5\u05DB\u05DF \u05D0\u05D5 \u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA \u05D4\u05DE\u05E4\u05E8\u05D9\u05DD \u05DB\u05DC\u05DC\u05D9\u05DD \u05D0\u05DC\u05D4, \u05D3\u05D5\u05D5\u05D7\u05D5 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05D5 \u05E9\u05DC\u05D7\u05D5 \u05DE\u05D9\u05D9\u05DC \u05DC-shapopcontact@gmail.com.' },
      { h: '7. \u05D4\u05E9\u05DC\u05DB\u05D5\u05EA', p: '\u05D4\u05E4\u05E8\u05D5\u05EA \u05E2\u05DC\u05D5\u05DC\u05D5\u05EA \u05DC\u05D4\u05D5\u05D1\u05D9\u05DC \u05DC: \u05D0\u05D6\u05D4\u05E8\u05D4, \u05D4\u05E9\u05E2\u05D9\u05D9\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF, \u05D7\u05E1\u05D9\u05DE\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA, \u05D0\u05D5 \u05D4\u05E1\u05E8\u05EA \u05EA\u05D5\u05DB\u05DF.' },
      { h: '8. \u05E2\u05E8\u05E2\u05D5\u05E8\u05D9\u05DD', p: '\u05D0\u05DD \u05D0\u05EA\u05DD \u05DE\u05D0\u05DE\u05D9\u05E0\u05D9\u05DD \u05E9\u05E1\u05E0\u05E7\u05E6\u05D9\u05D4 \u05D4\u05D5\u05D7\u05DC\u05D4 \u05D1\u05D8\u05E2\u05D5\u05EA, \u05E9\u05DC\u05D7\u05D5 \u05DE\u05D9\u05D9\u05DC \u05DC-shapopcontact@gmail.com \u05E2\u05DD \u05D4\u05E1\u05D1\u05E8. \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5 \u05EA\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D1\u05E7\u05E9\u05D4 \u05D1\u05D6\u05DE\u05DF \u05E1\u05D1\u05D9\u05E8.' },
    ],
  },
  es: {
    title: 'Reglas de la Comunidad',
    updated: 'Ultima actualizacion: 24 de febrero de 2026',
    sections: [
      { h: '1. Bienvenida', p: 'ShaPop es una comunidad de compras en vivo basada en el respeto mutuo. Al usar ShaPop, aceptas seguir estas reglas que garantizan una experiencia segura y agradable para todos.' },
      { h: '2. Conducta', p: 'El acoso, el discurso de odio, la discriminacion, la suplantacion de identidad y el spam estan estrictamente prohibidos. Trata a los demas usuarios con respeto y cortesia.' },
      { h: '3. Contenido Prohibido', p: 'Esta prohibido vender o promover: articulos falsificados, productos ilegales, contenido explicito o sexual, contenido violento o que incite a la violencia. Cualquier contenido que infrinja derechos de propiedad intelectual tambien esta prohibido.' },
      { h: '4. Reglas de Transmisiones', p: 'Las practicas enganosas durante las transmisiones estan prohibidas (pujas falsas, manipulacion de precios). Los presentadores deben vestir apropiadamente. Los menores solo pueden aparecer con consentimiento parental explicito. Las actividades peligrosas estan prohibidas.' },
      { h: '5. Reglas de Anuncios', p: 'Las descripciones deben ser precisas y completas. Usa fotos reales del articulo. Indica honestamente el estado del articulo (nuevo, como nuevo, buen estado, etc.). Los precios deben ser justos y no enganosos.' },
      { h: '6. Denuncias', p: 'Si encuentras contenido o comportamiento que viole estas reglas, reportalo en la app usando el boton de denuncia, o por email a shapopcontact@gmail.com. Todas las denuncias son revisadas por nuestro equipo.' },
      { h: '7. Consecuencias', p: 'Las violaciones pueden resultar en: advertencia, suspension temporal de la cuenta, prohibicion permanente o eliminacion de contenido. La severidad depende de la gravedad y frecuencia de las infracciones.' },
      { h: '8. Apelaciones', p: 'Si crees que una sancion fue aplicada por error, puedes apelar enviando un email a shapopcontact@gmail.com explicando tu situacion. Nuestro equipo revisara tu solicitud en un plazo razonable.' },
    ],
  },
}

export default function CommunityGuidelinesPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  usePageTitle(c.title)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '24px' }}>{c.updated}</p>
        {c.sections.map((s) => (
          <div key={s.h} style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{s.h}</h2>
            <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

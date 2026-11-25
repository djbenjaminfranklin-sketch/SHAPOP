import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'Community Guidelines',
    updated: 'Last updated: February 24, 2026',
    sections: [
      { h: '1. Welcome', p: 'ShaPop is a live shopping community built on mutual respect. By using ShaPop, you agree to follow these guidelines, which ensure a safe and enjoyable experience for all users.' },
      { h: '2. Conduct', p: 'Harassment, hate speech, discrimination, impersonation and spam are strictly prohibited. Treat other users with respect and courtesy. Any form of intimidation, threats or abusive behavior will result in sanctions.' },
      { h: '3. Prohibited Content', p: 'It is forbidden to sell or promote: counterfeit items, illegal products, explicit or sexual content, violent content or content inciting violence. Any content that infringes third-party intellectual property rights is also prohibited.' },
      { h: '4. Live Stream Rules', p: 'Deceptive practices during live streams are prohibited (fake bids, price manipulation). Presenters must be appropriately dressed. Minors may only appear on live streams with explicit parental consent. Dangerous activities are prohibited during broadcasts.' },
      { h: '5. Listing Rules', p: 'Descriptions must be accurate and complete. Use real photos of the item. Honestly indicate the item\'s condition (new, like new, good condition, etc.). Prices must be fair and not misleading.' },
      { h: '6. Reporting', p: 'If you see content or behavior that violates these guidelines, report it directly in the app using the report button, or by email at support@shapop.app. All reports are reviewed by our team.' },
      { h: '7. Consequences', p: 'Violations of these guidelines may result in: a warning, temporary account suspension, a permanent ban or content removal. The severity of sanctions depends on the gravity and frequency of the violations.' },
      { h: '8. Appeals', p: 'If you believe a sanction was applied in error, you can appeal by sending an email to support@shapop.app explaining your situation. Our team will review your request within a reasonable timeframe.' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Règles de la communauté',
    updated: 'Dernière mise à jour : 24 février 2026',
    sections: [
      { h: '1. Bienvenue', p: 'ShaPop est une communauté de shopping en direct fondée sur le respect mutuel. En utilisant ShaPop, tu acceptes de respecter ces règles, qui garantissent une expérience sûre et agréable pour tous les utilisateurs.' },
      { h: '2. Comportement', p: 'Le harcèlement, les discours haineux, la discrimination, l\'usurpation d\'identité et le spam sont strictement interdits. Traite les autres utilisateurs avec respect et courtoisie. Toute forme d\'intimidation, de menace ou de comportement abusif entraînera des sanctions.' },
      { h: '3. Contenus interdits', p: 'Il est interdit de vendre ou de promouvoir : des articles contrefaits, des produits illégaux, du contenu explicite ou à caractère sexuel, du contenu violent ou incitant à la violence. Tout contenu portant atteinte aux droits de propriété intellectuelle d\'un tiers est également interdit.' },
      { h: '4. Règles des lives', p: 'Les pratiques trompeuses pendant les lives sont interdites (fausses enchères, manipulation des prix). La personne qui présente doit être habillée de manière appropriée. Les mineurs ne peuvent apparaître en live qu\'avec le consentement explicite de leurs parents. Les activités dangereuses sont interdites pendant les diffusions.' },
      { h: '5. Règles des annonces', p: 'Les descriptions doivent être exactes et complètes. Utilise de vraies photos de l\'article. Indique honnêtement son état (neuf, comme neuf, bon état, etc.). Les prix doivent être justes et ne pas induire en erreur.' },
      { h: '6. Signalement', p: 'Si tu vois un contenu ou un comportement contraire à ces règles, signale-le directement dans l\'application avec le bouton de signalement, ou par e-mail à support@shapop.app. Tous les signalements sont examinés par notre équipe.' },
      { h: '7. Sanctions', p: 'Le non-respect de ces règles peut entraîner : un avertissement, la suspension temporaire du compte, un bannissement définitif ou la suppression du contenu. La sévérité des sanctions dépend de la gravité et de la fréquence des infractions.' },
      { h: '8. Contestation', p: 'Si tu penses qu\'une sanction a été appliquée par erreur, tu peux la contester en écrivant à support@shapop.app pour expliquer ta situation. Notre équipe examinera ta demande dans un délai raisonnable.' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Normas de la comunidad',
    updated: 'Última actualización: 24 de febrero de 2026',
    sections: [
      { h: '1. Bienvenida', p: 'ShaPop es una comunidad de compras en directo basada en el respeto mutuo. Al usar ShaPop, aceptas seguir estas normas, que garantizan una experiencia segura y agradable para todos los usuarios.' },
      { h: '2. Conducta', p: 'El acoso, el discurso de odio, la discriminación, la suplantación de identidad y el spam están estrictamente prohibidos. Trata a los demás usuarios con respeto y cortesía. Cualquier forma de intimidación, amenaza o comportamiento abusivo dará lugar a sanciones.' },
      { h: '3. Contenido prohibido', p: 'Está prohibido vender o promocionar: artículos falsificados, productos ilegales, contenido explícito o sexual, contenido violento o que incite a la violencia. También está prohibido cualquier contenido que infrinja derechos de propiedad intelectual de terceros.' },
      { h: '4. Normas de los directos', p: 'Las prácticas engañosas durante los directos están prohibidas (pujas falsas, manipulación de precios). Quien presenta debe ir vestido de forma adecuada. Los menores solo pueden aparecer en un directo con el consentimiento explícito de sus padres. Las actividades peligrosas están prohibidas durante las transmisiones.' },
      { h: '5. Normas de los anuncios', p: 'Las descripciones deben ser precisas y completas. Usa fotos reales del artículo. Indica con honestidad su estado (nuevo, como nuevo, buen estado, etc.). Los precios deben ser justos y no engañosos.' },
      { h: '6. Denuncias', p: 'Si ves contenido o comportamientos que incumplan estas normas, denúncialos directamente en la app con el botón de denuncia o por correo a support@shapop.app. Nuestro equipo revisa todas las denuncias.' },
      { h: '7. Consecuencias', p: 'El incumplimiento de estas normas puede conllevar: una advertencia, la suspensión temporal de la cuenta, la expulsión permanente o la eliminación del contenido. La severidad de las sanciones depende de la gravedad y la frecuencia de las infracciones.' },
      { h: '8. Apelaciones', p: 'Si crees que se te ha aplicado una sanción por error, puedes apelar escribiendo a support@shapop.app y explicando tu situación. Nuestro equipo revisará tu solicitud en un plazo razonable.' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Правила сообщества',
    updated: 'Последнее обновление: 24 февраля 2026 г.',
    sections: [
      { h: '1. Добро пожаловать', p: 'ShaPop — сообщество live-шопинга, основанное на взаимном уважении. Пользуясь ShaPop, ты соглашаешься соблюдать эти правила, которые делают сервис безопасным и приятным для всех.' },
      { h: '2. Поведение', p: 'Травля, язык вражды, дискриминация, выдача себя за другого человека и спам строго запрещены. Относись к другим пользователям с уважением и вежливостью. Любые запугивания, угрозы или оскорбительное поведение повлекут за собой санкции.' },
      { h: '3. Запрещённый контент', p: 'Запрещено продавать или продвигать: контрафактные товары, незаконную продукцию, откровенный или сексуальный контент, сцены насилия или призывы к нему. Также запрещён любой контент, нарушающий права третьих лиц на интеллектуальную собственность.' },
      { h: '4. Правила прямых эфиров', p: 'В эфирах запрещены обманные приёмы (фиктивные ставки, манипуляции с ценами). Ведущий должен быть одет подобающим образом. Несовершеннолетние могут появляться в эфире только с явного согласия родителей. Опасные действия во время трансляций запрещены.' },
      { h: '5. Правила объявлений', p: 'Описания должны быть точными и полными. Используй настоящие фотографии товара. Честно указывай его состояние (новое, как новое, хорошее и т. д.). Цены должны быть честными и не вводить в заблуждение.' },
      { h: '6. Жалобы', p: 'Если ты видишь контент или поведение, нарушающие эти правила, пожалуйся прямо в приложении с помощью кнопки «Пожаловаться» или напиши на support@shapop.app. Наша команда рассматривает каждую жалобу.' },
      { h: '7. Последствия', p: 'За нарушение правил возможны: предупреждение, временная блокировка аккаунта, бессрочная блокировка или удаление контента. Строгость санкций зависит от тяжести и частоты нарушений.' },
      { h: '8. Обжалование', p: 'Если ты считаешь, что санкция применена по ошибке, ты можешь её обжаловать, написав на support@shapop.app и описав ситуацию. Наша команда рассмотрит запрос в разумный срок.' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'כללי הקהילה',
    updated: 'עדכון אחרון: 24 בפברואר 2026',
    sections: [
      { h: '1. ברוכים הבאים', p: 'ShaPop היא קהילת קניות בשידור חי שמבוססת על כבוד הדדי. השימוש ב-ShaPop מהווה הסכמה לפעול לפי הכללים האלה, שנועדו להבטיח חוויה בטוחה ונעימה לכל המשתמשים.' },
      { h: '2. התנהגות', p: 'הטרדה, דברי שנאה, אפליה, התחזות וספאם אסורים בהחלט. התייחסו למשתמשים אחרים בכבוד ובנימוס. כל צורה של הפחדה, איומים או התנהגות פוגענית תוביל לסנקציות.' },
      { h: '3. תוכן אסור', p: 'אסור למכור או לקדם: מוצרים מזויפים, מוצרים בלתי חוקיים, תוכן בוטה או מיני, תוכן אלים או תוכן שמסית לאלימות. גם כל תוכן שמפר זכויות קניין רוחני של צד שלישי אסור.' },
      { h: '4. כללי שידור חי', p: 'אסור להשתמש בשיטות מטעות בשידורים חיים (הצעות פיקטיביות, מניפולציה של מחירים). המגישים חייבים להיות לבושים באופן הולם. קטינים יכולים להופיע בשידור חי רק בהסכמה מפורשת של ההורים. פעילויות מסוכנות אסורות במהלך השידורים.' },
      { h: '5. כללי מודעות', p: 'התיאורים חייבים להיות מדויקים ומלאים. השתמשו בתמונות אמיתיות של הפריט. ציינו בכנות את מצב הפריט (חדש, כמו חדש, במצב טוב וכו\'). המחירים חייבים להיות הוגנים ולא מטעים.' },
      { h: '6. דיווח', p: 'נתקלתם בתוכן או בהתנהגות שמפרים את הכללים? דווחו ישירות באפליקציה בעזרת כפתור הדיווח, או באימייל ל-support@shapop.app. הצוות שלנו בודק כל דיווח.' },
      { h: '7. השלכות', p: 'הפרת הכללים עלולה להוביל ל: אזהרה, השעיה זמנית של החשבון, חסימה לצמיתות או הסרת תוכן. חומרת הסנקציה תלויה בחומרת ההפרות ובתדירותן.' },
      { h: '8. ערעורים', p: 'אם אתם חושבים שסנקציה הוטלה בטעות, אפשר לערער באימייל ל-support@shapop.app עם הסבר על המקרה. הצוות שלנו יבדוק את הבקשה בתוך זמן סביר.' },
    ],
  },
}

export default function CommunityGuidelinesPage() {
  const navigate = useNavigate()
  const c = tr(content)
  usePageTitle(c.title)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', marginBottom: '24px' }}>{c.updated}</p>
        {c.sections.map((s) => (
          <div key={s.h} style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{s.h}</h2>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#aaa', lineHeight: 1.6 }}>{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

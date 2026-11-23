import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'End User License Agreement',
    updated: 'Last updated: February 14, 2026',
    sections: [
      { h: '1. Agreement', p: 'This End User License Agreement ("EULA") is a legal agreement between you and ShaPop Ltd. ("ShaPop") for the use of the ShaPop mobile application ("App"). By installing or using the App, you agree to be bound by this EULA.' },
      { h: '2. License Grant', p: 'ShaPop grants you a limited, non-exclusive, non-transferable, revocable license to use the App on any Apple-branded device that you own or control, subject to the Usage Rules set forth in the Apple Media Services Terms and Conditions.' },
      { h: '3. License Restrictions', p: 'You may not: (a) copy, modify, or distribute the App; (b) reverse-engineer, decompile, or disassemble the App; (c) rent, lease, lend, sell, or sublicense the App; (d) use the App for any illegal purpose; (e) remove any proprietary notices from the App.' },
      { h: '4. Intellectual Property', p: 'The App and all content, features, and functionality are owned by ShaPop and are protected by international copyright, trademark, and other intellectual property laws. This EULA does not grant you any ownership rights in the App.' },
      { h: '5. In-App Purchases', p: 'The App may offer products and services for purchase ("In-App Purchases"). These are marketplace transactions between buyers and sellers facilitated by ShaPop. All purchases are final once shipped, except as provided in the Return Policy or as required by applicable law.' },
      { h: '6. Third-Party Services', p: 'The App may integrate with third-party services (payment processors, streaming infrastructure, etc.). Your use of such services is subject to their respective terms and privacy policies. ShaPop is not responsible for third-party services.' },
      { h: '7. Updates', p: 'ShaPop may release updates to the App from time to time. Updates may be required for continued use. You agree that the App may automatically download and install updates.' },
      { h: '8. Termination', p: 'This EULA is effective until terminated. ShaPop may terminate this EULA if you fail to comply with its terms. Upon termination, you must cease all use of the App and delete all copies.' },
      { h: '9. Disclaimer of Warranties', p: 'THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. SHAPOP DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.' },
      { h: '10. Limitation of Liability', p: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHAPOP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.' },
      { h: '11. Apple-Specific Terms', p: 'This EULA is between you and ShaPop only, not Apple Inc. Apple has no obligation to furnish any maintenance or support services. In the event of any failure of the App to conform to applicable warranties, you may notify Apple for a refund of the purchase price (if any). Apple is not responsible for addressing any claims relating to the App. Apple and its subsidiaries are third-party beneficiaries of this EULA.' },
      { h: '12. Governing Law', p: 'This EULA is governed by the law applicable to ShaPop, without prejudice to the mandatory consumer protection rules of your country of residence. Disputes shall be brought before the competent courts in accordance with applicable law.' },
      { h: '13. Contact', p: 'For questions about this EULA: support@shapop.app' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Contrat de licence utilisateur final',
    updated: 'Dernière mise à jour : 14 février 2026',
    sections: [
      { h: '1. Accord', p: 'Le présent Contrat de licence utilisateur final (« CLUF ») est un accord juridique entre vous et ShaPop Ltd. (« ShaPop ») régissant l\'utilisation de l\'application mobile ShaPop (« l\'Application »). En installant ou en utilisant l\'Application, vous acceptez d\'être lié par le présent CLUF.' },
      { h: '2. Concession de licence', p: 'ShaPop vous accorde une licence limitée, non exclusive, non transférable et révocable pour utiliser l\'Application sur tout appareil de marque Apple que vous possédez ou contrôlez, sous réserve des règles d\'utilisation définies dans les Conditions générales des services multimédia Apple.' },
      { h: '3. Restrictions de la licence', p: 'Vous ne pouvez pas : (a) copier, modifier ou distribuer l\'Application ; (b) procéder à la rétro-ingénierie, décompiler ou désassembler l\'Application ; (c) louer, prêter, vendre ou sous-licencier l\'Application ; (d) utiliser l\'Application à des fins illégales ; (e) supprimer les mentions de propriété de l\'Application.' },
      { h: '4. Propriété intellectuelle', p: 'L\'Application ainsi que l\'ensemble de son contenu, de ses fonctionnalités et de ses caractéristiques sont la propriété de ShaPop et sont protégés par les lois internationales sur le droit d\'auteur, les marques et la propriété intellectuelle. Le présent CLUF ne vous confère aucun droit de propriété sur l\'Application.' },
      { h: '5. Achats intégrés', p: 'L\'Application peut proposer des produits et services à l\'achat (« Achats intégrés »). Il s\'agit de transactions de marketplace entre acheteurs et vendeurs facilitées par ShaPop. Tous les achats sont définitifs une fois expédiés, sauf disposition contraire de la Politique de retours ou de la loi applicable.' },
      { h: '6. Services tiers', p: 'L\'Application peut s\'intégrer à des services tiers (prestataires de paiement, infrastructure de streaming, etc.). Votre utilisation de ces services est soumise à leurs conditions et politiques de confidentialité respectives. ShaPop n\'est pas responsable des services tiers.' },
      { h: '7. Mises à jour', p: 'ShaPop peut publier des mises à jour de l\'Application de temps à autre. Les mises à jour peuvent être nécessaires pour continuer à utiliser l\'Application. Vous acceptez que l\'Application puisse télécharger et installer automatiquement des mises à jour.' },
      { h: '8. Résiliation', p: 'Le présent CLUF est en vigueur jusqu\'à sa résiliation. ShaPop peut résilier le présent CLUF si vous ne respectez pas ses conditions. En cas de résiliation, vous devez cesser toute utilisation de l\'Application et en supprimer toutes les copies.' },
      { h: '9. Exclusion de garanties', p: 'L\'APPLICATION EST FOURNIE « EN L\'ÉTAT », SANS GARANTIE D\'AUCUNE SORTE. SHAPOP DÉCLINE TOUTE GARANTIE, EXPRESSE OU IMPLICITE, Y COMPRIS LES GARANTIES DE QUALITÉ MARCHANDE, D\'ADÉQUATION À UN USAGE PARTICULIER ET D\'ABSENCE DE CONTREFAÇON.' },
      { h: '10. Limitation de responsabilité', p: 'DANS TOUTE LA MESURE PERMISE PAR LA LOI, SHAPOP NE POURRA ÊTRE TENUE RESPONSABLE DES DOMMAGES INDIRECTS, ACCESSOIRES, SPÉCIAUX OU CONSÉCUTIFS RÉSULTANT DE VOTRE UTILISATION DE L\'APPLICATION.' },
      { h: '11. Conditions spécifiques à Apple', p: 'Le présent CLUF est conclu entre vous et ShaPop uniquement, et non avec Apple Inc. Apple n\'a aucune obligation de fournir des services de maintenance ou d\'assistance. En cas de non-conformité de l\'Application aux garanties applicables, vous pouvez en informer Apple pour obtenir le remboursement du prix d\'achat (le cas échéant). Apple n\'est pas responsable du traitement des réclamations relatives à l\'Application. Apple et ses filiales sont des tiers bénéficiaires du présent CLUF.' },
      { h: '12. Droit applicable', p: 'Le présent CLUF est régi par la loi applicable à ShaPop, sans préjudice des règles impératives de protection des consommateurs de votre pays de résidence. Les litiges seront portés devant les juridictions compétentes conformément à la loi applicable.' },
      { h: '13. Contact', p: 'Pour toute question relative au présent CLUF : support@shapop.app' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Acuerdo de licencia de usuario final',
    updated: 'Última actualización: 14 de febrero de 2026',
    sections: [
      { h: '1. Acuerdo', p: 'Este Acuerdo de licencia de usuario final («EULA») es un acuerdo legal entre tú y ShaPop Ltd. («ShaPop») para el uso de la aplicación móvil ShaPop («la App»). Al instalar o usar la App, aceptas quedar vinculado por este EULA.' },
      { h: '2. Concesión de licencia', p: 'ShaPop te concede una licencia limitada, no exclusiva, intransferible y revocable para usar la App en cualquier dispositivo de la marca Apple que poseas o controles, con sujeción a las Reglas de uso establecidas en los Términos y Condiciones de los Servicios Multimedia de Apple.' },
      { h: '3. Restricciones de la licencia', p: 'No puedes: (a) copiar, modificar o distribuir la App; (b) aplicar ingeniería inversa, descompilar o desensamblar la App; (c) alquilar, arrendar, prestar, vender o sublicenciar la App; (d) usar la App con fines ilegales; (e) eliminar los avisos de propiedad de la App.' },
      { h: '4. Propiedad intelectual', p: 'La App y todo su contenido, funciones y funcionalidades pertenecen a ShaPop y están protegidos por las leyes internacionales de derechos de autor, marcas y demás propiedad intelectual. Este EULA no te otorga ningún derecho de propiedad sobre la App.' },
      { h: '5. Compras en la App', p: 'La App puede ofrecer productos y servicios para su compra («Compras en la App»). Se trata de transacciones de marketplace entre compradores y vendedores facilitadas por ShaPop. Todas las compras son definitivas una vez enviadas, salvo lo dispuesto en la Política de devoluciones o lo exigido por la ley aplicable.' },
      { h: '6. Servicios de terceros', p: 'La App puede integrarse con servicios de terceros (procesadores de pago, infraestructura de streaming, etc.). Tu uso de esos servicios está sujeto a sus respectivos términos y políticas de privacidad. ShaPop no es responsable de los servicios de terceros.' },
      { h: '7. Actualizaciones', p: 'ShaPop puede publicar actualizaciones de la App de vez en cuando. Las actualizaciones pueden ser necesarias para seguir usándola. Aceptas que la App descargue e instale actualizaciones automáticamente.' },
      { h: '8. Terminación', p: 'Este EULA está vigente hasta su terminación. ShaPop puede terminarlo si incumples sus condiciones. Tras la terminación, debes dejar de usar la App y eliminar todas sus copias.' },
      { h: '9. Exclusión de garantías', p: 'LA APP SE PROPORCIONA «TAL CUAL», SIN GARANTÍAS DE NINGÚN TIPO. SHAPOP RECHAZA TODA GARANTÍA, EXPRESA O IMPLÍCITA, INCLUIDAS LAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN PARTICULAR Y NO INFRACCIÓN.' },
      { h: '10. Limitación de responsabilidad', p: 'EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, SHAPOP NO SERÁ RESPONSABLE DE NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL O CONSECUENTE DERIVADO DE TU USO DE LA APP.' },
      { h: '11. Términos específicos de Apple', p: 'Este EULA se celebra únicamente entre tú y ShaPop, no con Apple Inc. Apple no tiene ninguna obligación de prestar servicios de mantenimiento o soporte. Si la App no cumple alguna garantía aplicable, puedes notificarlo a Apple para obtener el reembolso del precio de compra (si lo hubiera). Apple no es responsable de atender ninguna reclamación relacionada con la App. Apple y sus filiales son terceros beneficiarios de este EULA.' },
      { h: '12. Ley aplicable', p: 'Este EULA se rige por la ley aplicable a ShaPop, sin perjuicio de las normas imperativas de protección al consumidor de tu país de residencia. Las disputas se someterán a los tribunales competentes conforme a la ley aplicable.' },
      { h: '13. Contacto', p: 'Para cualquier pregunta sobre este EULA: support@shapop.app' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Лицензионное соглашение с конечным пользователем',
    updated: 'Последнее обновление: 14 февраля 2026 г.',
    sections: [
      { h: '1. Соглашение', p: 'Настоящее Лицензионное соглашение с конечным пользователем («Соглашение») является юридическим договором между вами и ShaPop Ltd. («ShaPop») об использовании мобильного приложения ShaPop («Приложение»). Устанавливая или используя Приложение, вы соглашаетесь соблюдать настоящее Соглашение.' },
      { h: '2. Предоставление лицензии', p: 'ShaPop предоставляет вам ограниченную, неисключительную, непередаваемую и отзывную лицензию на использование Приложения на любом устройстве Apple, которым вы владеете или которое находится под вашим контролем, в соответствии с Правилами использования, изложенными в Условиях использования медиасервисов Apple.' },
      { h: '3. Ограничения лицензии', p: 'Вам запрещается: (a) копировать, изменять или распространять Приложение; (b) осуществлять обратную разработку, декомпилировать или дизассемблировать Приложение; (c) сдавать в аренду, передавать во временное пользование, продавать или сублицензировать Приложение; (d) использовать Приложение в незаконных целях; (e) удалять из Приложения уведомления о правах собственности.' },
      { h: '4. Интеллектуальная собственность', p: 'Приложение, весь его контент, функции и возможности принадлежат ShaPop и охраняются международным законодательством об авторском праве, товарных знаках и иной интеллектуальной собственности. Настоящее Соглашение не предоставляет вам никаких прав собственности на Приложение.' },
      { h: '5. Покупки в Приложении', p: 'Приложение может предлагать товары и услуги для покупки («Покупки в Приложении»). Это сделки на маркетплейсе между покупателями и продавцами, которым содействует ShaPop. Все покупки становятся окончательными после отправки товара, за исключением случаев, предусмотренных Политикой возврата или применимым законодательством.' },
      { h: '6. Сторонние сервисы', p: 'Приложение может работать со сторонними сервисами (платёжные провайдеры, инфраструктура трансляций и т. д.). Использование таких сервисов регулируется их собственными условиями и политиками конфиденциальности. ShaPop не несёт ответственности за сторонние сервисы.' },
      { h: '7. Обновления', p: 'ShaPop может время от времени выпускать обновления Приложения. Для дальнейшего использования Приложения может потребоваться обновление. Вы соглашаетесь с тем, что Приложение может автоматически загружать и устанавливать обновления.' },
      { h: '8. Прекращение действия', p: 'Настоящее Соглашение действует до момента его прекращения. ShaPop может прекратить действие Соглашения, если вы не соблюдаете его условия. После прекращения вы обязаны прекратить любое использование Приложения и удалить все его копии.' },
      { h: '9. Отказ от гарантий', p: 'ПРИЛОЖЕНИЕ ПРЕДОСТАВЛЯЕТСЯ «КАК ЕСТЬ», БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ. SHAPOP ОТКАЗЫВАЕТСЯ ОТ ВСЕХ ЯВНЫХ ИЛИ ПОДРАЗУМЕВАЕМЫХ ГАРАНТИЙ, ВКЛЮЧАЯ ГАРАНТИИ ТОВАРНОЙ ПРИГОДНОСТИ, ПРИГОДНОСТИ ДЛЯ ОПРЕДЕЛЁННОЙ ЦЕЛИ И ОТСУТСТВИЯ НАРУШЕНИЯ ПРАВ.' },
      { h: '10. Ограничение ответственности', p: 'В МАКСИМАЛЬНОЙ СТЕПЕНИ, ДОПУСКАЕМОЙ ЗАКОНОМ, SHAPOP НЕ НЕСЁТ ОТВЕТСТВЕННОСТИ ЗА КОСВЕННЫЕ, СЛУЧАЙНЫЕ, ОСОБЫЕ ИЛИ ПОСЛЕДУЮЩИЕ УБЫТКИ, ВОЗНИКШИЕ В СВЯЗИ С ИСПОЛЬЗОВАНИЕМ ВАМИ ПРИЛОЖЕНИЯ.' },
      { h: '11. Условия, касающиеся Apple', p: 'Настоящее Соглашение заключено только между вами и ShaPop, а не с Apple Inc. Apple не обязана предоставлять какие-либо услуги по обслуживанию или поддержке. Если Приложение не соответствует применимым гарантиям, вы можете уведомить Apple и получить возврат стоимости покупки (если она была). Apple не несёт ответственности за рассмотрение каких-либо претензий, связанных с Приложением. Apple и её дочерние компании являются третьими лицами — выгодоприобретателями по настоящему Соглашению.' },
      { h: '12. Применимое право', p: 'Настоящее Соглашение регулируется правом, применимым к ShaPop, без ущерба для обязательных норм о защите прав потребителей страны вашего проживания. Споры подлежат рассмотрению в компетентных судах в соответствии с применимым законодательством.' },
      { h: '13. Контакты', p: 'По вопросам, связанным с настоящим Соглашением: support@shapop.app' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'הסכם רישיון למשתמש קצה',
    updated: 'עדכון אחרון: 14 בפברואר 2026',
    sections: [
      { h: '1. ההסכם', p: 'הסכם רישיון למשתמש קצה זה ("ההסכם") הוא הסכם משפטי בינך לבין ShaPop Ltd. ‏("ShaPop") לשימוש באפליקציית המובייל ShaPop ‏("האפליקציה"). בהתקנת האפליקציה או בשימוש בה, אתה מסכים להיות מחויב להסכם זה.' },
      { h: '2. מתן רישיון', p: 'ShaPop מעניקה לך רישיון מוגבל, לא בלעדי, שאינו ניתן להעברה וניתן לביטול, לשימוש באפליקציה בכל מכשיר של Apple שבבעלותך או בשליטתך, בכפוף לכללי השימוש שבתנאים וההגבלות של שירותי המדיה של Apple.' },
      { h: '3. הגבלות הרישיון', p: 'אסור לך: (א) להעתיק, לשנות או להפיץ את האפליקציה; (ב) לבצע הנדסה לאחור, הידור לאחור או פירוק של האפליקציה; (ג) להשכיר, להחכיר, להשאיל, למכור או להעניק רישיון משנה לאפליקציה; (ד) להשתמש באפליקציה לכל מטרה בלתי חוקית; (ה) להסיר מהאפליקציה הודעות על זכויות קניין.' },
      { h: '4. קניין רוחני', p: 'האפליקציה וכל התוכן, התכונות והפונקציונליות שלה הם בבעלות ShaPop ומוגנים על ידי דיני זכויות יוצרים, סימני מסחר וקניין רוחני בינלאומיים. הסכם זה אינו מעניק לך כל זכות בעלות באפליקציה.' },
      { h: '5. רכישות באפליקציה', p: 'האפליקציה עשויה להציע מוצרים ושירותים לרכישה ("רכישות באפליקציה"). מדובר בעסקאות בזירת המסחר בין קונים למוכרים, ש-ShaPop מאפשרת. כל הרכישות סופיות לאחר המשלוח, אלא אם נקבע אחרת במדיניות ההחזרות או בדין החל.' },
      { h: '6. שירותי צד שלישי', p: 'האפליקציה עשויה להשתלב בשירותי צד שלישי (ספקי תשלום, תשתית שידור וכו\'). השימוש שלך בשירותים אלה כפוף לתנאים ולמדיניות הפרטיות של כל אחד מהם. ShaPop אינה אחראית לשירותי צד שלישי.' },
      { h: '7. עדכונים', p: 'ShaPop עשויה לפרסם מעת לעת עדכונים לאפליקציה. ייתכן שעדכונים יידרשו כדי להמשיך להשתמש בה. אתה מסכים שהאפליקציה תוריד ותתקין עדכונים באופן אוטומטי.' },
      { h: '8. סיום', p: 'הסכם זה בתוקף עד לסיומו. ShaPop רשאית לסיים את ההסכם אם לא תעמוד בתנאיו. עם סיום ההסכם, עליך להפסיק כל שימוש באפליקציה ולמחוק את כל העותקים שלה.' },
      { h: '9. הסתלקות מאחריות', p: 'האפליקציה מסופקת "כמות שהיא" (AS IS), ללא אחריות מכל סוג. ShaPop מסירה כל אחריות, מפורשת או משתמעת, לרבות אחריות לסחירות, להתאמה למטרה מסוימת ולאי-הפרה.' },
      { h: '10. הגבלת אחריות', p: 'במידה המרבית המותרת על פי דין, ShaPop לא תישא באחריות לכל נזק עקיף, אגבי, מיוחד או תוצאתי הנובע מהשימוש שלך באפליקציה.' },
      { h: '11. תנאים הנוגעים ל-Apple', p: 'הסכם זה נכרת בינך לבין ShaPop בלבד, ולא עם Apple Inc. ל-Apple אין כל חובה לספק שירותי תחזוקה או תמיכה. אם האפליקציה אינה עומדת באחריות החלה, באפשרותך להודיע על כך ל-Apple ולקבל החזר של מחיר הרכישה (אם שולם). Apple אינה אחראית לטיפול בתביעות כלשהן הנוגעות לאפליקציה. Apple והחברות הבנות שלה הן מוטבות צד שלישי של הסכם זה.' },
      { h: '12. הדין החל', p: 'הסכם זה כפוף לדין החל על ShaPop, וזאת מבלי לגרוע מכללי הגנת הצרכן הקוגנטיים של מדינת מגוריך. סכסוכים יובאו בפני בתי המשפט המוסמכים בהתאם לדין החל.' },
      { h: '13. צור קשר', p: 'לשאלות בנוגע להסכם זה: support@shapop.app' },
    ],
  },
}

export default function EulaPage() {
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

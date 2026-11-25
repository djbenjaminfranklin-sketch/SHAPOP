import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

// Cohérent avec les conditions d'utilisation (TermsPage, reprises du site) : même exploitant « ShaPop »,
// même droit applicable, ouvert à tous les pays, sans transporteur intégré.
// À COMPLÉTER : identité légale de l'exploitant
const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'End User License Agreement',
    updated: 'Last updated: 23 November 2026',
    sections: [
      { h: '1. Agreement', p: 'This End User License Agreement (“EULA”) is an agreement between you and ShaPop, the operator of the ShaPop app (“App”). By installing or using the App, you accept this EULA. Buying, selling, protected payment and handover are governed by the ShaPop Terms of Use, which prevail if they differ from this EULA.' },
      { h: '2. License grant', p: 'ShaPop grants you a limited, non-exclusive, non-transferable, revocable licence to use the App, in any country where it is available, on any Apple-branded device that you own or control, subject to the Usage Rules set out in the Apple Media Services Terms and Conditions.' },
      { h: '3. License restrictions', p: 'You may not: (a) copy, modify or distribute the App; (b) reverse-engineer, decompile or disassemble the App; (c) rent, lease, lend, sell or sublicense the App; (d) use the App for any illegal purpose; (e) remove any proprietary notices from the App.' },
      { h: '4. Intellectual property', p: 'The App, the ShaPop brand and logo belong to ShaPop and are protected by intellectual property laws. This EULA does not transfer any ownership rights in the App to you. You keep ownership of the content you publish, under the conditions of the Terms of Use.' },
      { h: '5. Purchases in the App', p: 'Items offered in the App are sold by other users, not by ShaPop or Apple. Payment is made only in the App and is protected: ShaPop holds it until the handover is proven (4-digit code in person, or two photos for a shipment by post). ShaPop has no built-in courier: the buyer and the seller arrange the handover together. Refunds and disputes are handled under the Terms of Use.' },
      { h: '6. Third-party services', p: 'The App uses third-party services (payment providers, video streaming, notifications, WhatsApp or email to contact the other party, etc.). Your use of these services is subject to their own terms and privacy policies. ShaPop is not responsible for third-party services.' },
      { h: '7. Updates', p: 'ShaPop may release updates to the App from time to time. Some updates may be required to keep using the App. You agree that the App may download and install updates automatically.' },
      { h: '8. Termination', p: 'This EULA applies until it is terminated. You can stop using the App and delete your account at any time from the app settings. ShaPop may terminate this EULA if you breach it or the Terms of Use. Upon termination, you must stop using the App and delete it from your devices.' },
      { h: '9. Disclaimer of warranties', p: 'To the extent permitted by law, the App is provided “as is” and “as available”, without warranties of any kind. Nothing in this EULA limits the rights you have as a consumer under the mandatory rules of your country of residence.' },
      { h: '10. Limitation of liability', p: 'To the extent permitted by law, ShaPop is not liable for the quality of items sold by users, meetings between users or indirect losses arising from your use of the App. Nothing in this EULA limits liability that cannot legally be limited.' },
      { h: '11. Apple-specific terms', p: 'This EULA is between you and ShaPop only, not Apple Inc. Apple has no obligation to furnish any maintenance or support services. In the event of any failure of the App to conform to applicable warranties, you may notify Apple for a refund of the purchase price (if any). Apple is not responsible for addressing any claims relating to the App. Apple and its subsidiaries are third-party beneficiaries of this EULA and may enforce it.' },
      { h: '12. Governing law', p: 'This EULA is governed by the law of the country where the operator of ShaPop is established. If you are a consumer, you keep the protection of the mandatory rules of your country of residence and may bring a claim before its courts. Before taking any action, write to us: most problems can be solved amicably.' },
      { h: '13. Contact', p: 'For any question about this EULA: support@shapop.app' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Contrat de licence utilisateur final',
    updated: 'Dernière mise à jour : 23 novembre 2026',
    sections: [
      { h: '1. Accord', p: 'Ce contrat de licence utilisateur final (« CLUF ») est conclu entre toi et ShaPop, exploitant de l’application ShaPop (« l’App »). En installant ou en utilisant l’App, tu acceptes ce CLUF. L’achat, la vente, le paiement protégé et la remise des articles sont régis par les conditions d’utilisation de ShaPop, qui priment en cas de différence avec ce CLUF.' },
      { h: '2. Concession de licence', p: 'ShaPop t’accorde une licence limitée, non exclusive, non transférable et révocable pour utiliser l’App, dans tout pays où elle est disponible, sur tout appareil de marque Apple que tu possèdes ou contrôles, sous réserve des règles d’utilisation définies dans les conditions générales des services multimédias Apple.' },
      { h: '3. Restrictions de la licence', p: 'Tu ne peux pas : (a) copier, modifier ou distribuer l’App ; (b) procéder à la rétro-ingénierie, décompiler ou désassembler l’App ; (c) louer, prêter, vendre ou sous-licencier l’App ; (d) utiliser l’App à des fins illégales ; (e) supprimer les mentions de propriété de l’App.' },
      { h: '4. Propriété intellectuelle', p: 'L’App, la marque et le logo ShaPop appartiennent à ShaPop et sont protégés par les lois sur la propriété intellectuelle. Ce CLUF ne te transfère aucun droit de propriété sur l’App. Tu restes propriétaire des contenus que tu publies, dans les conditions prévues par les conditions d’utilisation.' },
      { h: '5. Achats dans l’App', p: 'Les articles proposés dans l’App sont vendus par d’autres utilisateurs, et non par ShaPop ni par Apple. Le paiement se fait uniquement dans l’App et il est protégé : ShaPop le conserve jusqu’à la preuve de la remise (code à 4 chiffres en main propre, ou deux photos pour un envoi postal). ShaPop n’intègre aucun transporteur : l’acheteur et le vendeur organisent la remise entre eux. Les remboursements et les litiges sont traités selon les conditions d’utilisation.' },
      { h: '6. Services tiers', p: 'L’App utilise des services tiers (prestataires de paiement, diffusion vidéo, notifications, WhatsApp ou e-mail pour contacter l’autre partie, etc.). Ton utilisation de ces services est soumise à leurs propres conditions et politiques de confidentialité. ShaPop n’est pas responsable des services tiers.' },
      { h: '7. Mises à jour', p: 'ShaPop peut publier des mises à jour de l’App de temps à autre. Certaines peuvent être nécessaires pour continuer à utiliser l’App. Tu acceptes que l’App télécharge et installe automatiquement des mises à jour.' },
      { h: '8. Résiliation', p: 'Ce CLUF s’applique jusqu’à sa résiliation. Tu peux arrêter d’utiliser l’App et supprimer ton compte à tout moment depuis les paramètres de l’app. ShaPop peut résilier ce CLUF en cas de manquement à celui-ci ou aux conditions d’utilisation. Après la résiliation, tu dois cesser d’utiliser l’App et la supprimer de tes appareils.' },
      { h: '9. Exclusion de garanties', p: 'Dans la limite permise par la loi, l’App est fournie « en l’état » et « selon disponibilité », sans garantie d’aucune sorte. Rien dans ce CLUF ne limite les droits que te donnent, en tant que consommateur, les règles impératives du pays où tu résides.' },
      { h: '10. Limitation de responsabilité', p: 'Dans la limite permise par la loi, ShaPop n’est pas responsable de la qualité des articles vendus par les utilisateurs, des rencontres entre utilisateurs ni des pertes indirectes liées à ton utilisation de l’App. Rien dans ce CLUF ne limite une responsabilité qui ne peut pas légalement l’être.' },
      { h: '11. Conditions spécifiques à Apple', p: 'Ce CLUF est conclu entre toi et ShaPop uniquement, et non avec Apple Inc. Apple n’a aucune obligation de fournir des services de maintenance ou d’assistance. Si l’App n’est pas conforme aux garanties applicables, tu peux en informer Apple pour obtenir le remboursement du prix d’achat (le cas échéant). Apple n’est pas responsable du traitement des réclamations relatives à l’App. Apple et ses filiales sont bénéficiaires de ce CLUF et peuvent le faire appliquer.' },
      { h: '12. Droit applicable', p: 'Ce CLUF est régi par le droit du pays où est établi l’exploitant de ShaPop. Si tu es un consommateur, tu conserves la protection des règles impératives du pays où tu résides et tu peux saisir les tribunaux de ce pays. Avant toute action, écris-nous : la plupart des problèmes se règlent à l’amiable.' },
      { h: '13. Contact', p: 'Pour toute question sur ce CLUF : support@shapop.app' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Contrato de licencia de usuario final',
    updated: 'Última actualización: 23 de noviembre de 2026',
    sections: [
      { h: '1. Acuerdo', p: 'Este contrato de licencia de usuario final («EULA») se celebra entre tú y ShaPop, que gestiona la app ShaPop («la App»). Al instalar o usar la App, aceptas este EULA. La compra, la venta, el pago protegido y la entrega de los artículos se rigen por las condiciones de uso de ShaPop, que prevalecen si difieren de este EULA.' },
      { h: '2. Concesión de licencia', p: 'ShaPop te concede una licencia limitada, no exclusiva, intransferible y revocable para usar la App, en cualquier país donde esté disponible, en cualquier dispositivo de la marca Apple que poseas o controles, con sujeción a las Reglas de uso establecidas en los Términos y Condiciones de los Servicios Multimedia de Apple.' },
      { h: '3. Restricciones de la licencia', p: 'No puedes: (a) copiar, modificar o distribuir la App; (b) aplicar ingeniería inversa, descompilar o desensamblar la App; (c) alquilar, arrendar, prestar, vender o sublicenciar la App; (d) usar la App con fines ilegales; (e) eliminar los avisos de propiedad de la App.' },
      { h: '4. Propiedad intelectual', p: 'La App, la marca y el logotipo de ShaPop pertenecen a ShaPop y están protegidos por las leyes de propiedad intelectual. Este EULA no te transfiere ningún derecho de propiedad sobre la App. Conservas la propiedad del contenido que publicas, en los términos de las condiciones de uso.' },
      { h: '5. Compras en la App', p: 'Los artículos ofrecidos en la App los venden otros usuarios, no ShaPop ni Apple. El pago se hace solo en la App y está protegido: ShaPop lo retiene hasta que se demuestra la entrega (código de 4 cifras en mano, o dos fotos en un envío por correo). ShaPop no tiene transportista integrado: comprador y vendedor organizan la entrega entre ellos. Los reembolsos y las disputas se gestionan según las condiciones de uso.' },
      { h: '6. Servicios de terceros', p: 'La App usa servicios de terceros (proveedores de pago, emisión de vídeo, notificaciones, WhatsApp o email para contactar con la otra parte, etc.). Tu uso de esos servicios está sujeto a sus propias condiciones y políticas de privacidad. ShaPop no es responsable de los servicios de terceros.' },
      { h: '7. Actualizaciones', p: 'ShaPop puede publicar actualizaciones de la App de vez en cuando. Algunas pueden ser necesarias para seguir usándola. Aceptas que la App descargue e instale actualizaciones automáticamente.' },
      { h: '8. Terminación', p: 'Este EULA se aplica hasta su terminación. Puedes dejar de usar la App y eliminar tu cuenta en cualquier momento desde los ajustes de la app. ShaPop puede terminar este EULA si lo incumples o incumples las condiciones de uso. Tras la terminación, debes dejar de usar la App y eliminarla de tus dispositivos.' },
      { h: '9. Exclusión de garantías', p: 'En la medida en que lo permita la ley, la App se ofrece «tal cual» y «según disponibilidad», sin garantías de ningún tipo. Nada en este EULA limita los derechos que te reconocen, como consumidor, las normas imperativas de tu país de residencia.' },
      { h: '10. Limitación de responsabilidad', p: 'En la medida en que lo permita la ley, ShaPop no es responsable de la calidad de los artículos vendidos por los usuarios, de los encuentros entre usuarios ni de las pérdidas indirectas derivadas del uso de la App. Nada en este EULA limita una responsabilidad que no pueda limitarse legalmente.' },
      { h: '11. Términos específicos de Apple', p: 'Este EULA se celebra únicamente entre tú y ShaPop, no con Apple Inc. Apple no tiene ninguna obligación de prestar servicios de mantenimiento o soporte. Si la App no cumple alguna garantía aplicable, puedes notificarlo a Apple para obtener el reembolso del precio de compra (si lo hubiera). Apple no es responsable de atender ninguna reclamación relacionada con la App. Apple y sus filiales son terceros beneficiarios de este EULA y pueden hacerlo cumplir.' },
      { h: '12. Ley aplicable', p: 'Este EULA se rige por la ley del país donde está establecido el responsable de ShaPop. Si eres consumidor, conservas la protección de las normas imperativas de tu país de residencia y puedes acudir a sus tribunales. Antes de emprender cualquier acción, escríbenos: la mayoría de los problemas se resuelven de forma amistosa.' },
      { h: '13. Contacto', p: 'Para cualquier pregunta sobre este EULA: support@shapop.app' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Лицензионное соглашение с конечным пользователем',
    updated: 'Последнее обновление: 23 ноября 2026 г.',
    sections: [
      { h: '1. Соглашение', p: 'Настоящее лицензионное соглашение с конечным пользователем («Соглашение») заключается между тобой и ShaPop, который управляет приложением ShaPop («Приложение»). Устанавливая или используя Приложение, ты принимаешь это Соглашение. Покупки, продажи, защищённая оплата и передача товаров регулируются условиями использования ShaPop, которые имеют приоритет, если они расходятся с этим Соглашением.' },
      { h: '2. Предоставление лицензии', p: 'ShaPop предоставляет тебе ограниченную, неисключительную, непередаваемую и отзывную лицензию на использование Приложения в любой стране, где оно доступно, на любом устройстве Apple, которым ты владеешь или которое находится под твоим контролем, в соответствии с Правилами использования, изложенными в Условиях использования медиасервисов Apple.' },
      { h: '3. Ограничения лицензии', p: 'Тебе запрещается: (a) копировать, изменять или распространять Приложение; (b) осуществлять обратную разработку, декомпилировать или дизассемблировать Приложение; (c) сдавать в аренду, передавать во временное пользование, продавать или сублицензировать Приложение; (d) использовать Приложение в незаконных целях; (e) удалять из Приложения уведомления о правах собственности.' },
      { h: '4. Интеллектуальная собственность', p: 'Приложение, бренд и логотип ShaPop принадлежат ShaPop и защищены законами об интеллектуальной собственности. Это Соглашение не передаёт тебе никаких прав собственности на Приложение. Ты остаёшься владельцем публикуемого контента на условиях, предусмотренных условиями использования.' },
      { h: '5. Покупки в Приложении', p: 'Товары в Приложении продают другие пользователи, а не ShaPop и не Apple. Оплата производится только в Приложении и защищена: ShaPop удерживает её, пока передача не подтверждена (4-значный код при личной встрече или два фото при отправке почтой). У ShaPop нет встроенной службы доставки: покупатель и продавец сами договариваются о передаче. Возвраты и споры рассматриваются по условиям использования.' },
      { h: '6. Сторонние сервисы', p: 'Приложение использует сторонние сервисы (платёжные провайдеры, видеотрансляции, уведомления, WhatsApp или e-mail для связи с другой стороной и т. д.). Использование таких сервисов регулируется их собственными условиями и политиками конфиденциальности. ShaPop не несёт ответственности за сторонние сервисы.' },
      { h: '7. Обновления', p: 'ShaPop может время от времени выпускать обновления Приложения. Некоторые из них могут быть нужны для дальнейшего использования Приложения. Ты соглашаешься с тем, что Приложение может автоматически загружать и устанавливать обновления.' },
      { h: '8. Прекращение действия', p: 'Соглашение действует до его прекращения. Ты можешь в любой момент перестать пользоваться Приложением и удалить аккаунт в настройках приложения. ShaPop может прекратить действие Соглашения, если ты нарушаешь его или условия использования. После прекращения ты должен перестать пользоваться Приложением и удалить его со своих устройств.' },
      { h: '9. Отказ от гарантий', p: 'В пределах, допустимых законом, Приложение предоставляется «как есть» и «по мере доступности», без каких-либо гарантий. Ничто в этом Соглашении не ограничивает права, которые дают тебе как потребителю обязательные нормы страны твоего проживания.' },
      { h: '10. Ограничение ответственности', p: 'В пределах, допустимых законом, ShaPop не отвечает за качество товаров, продаваемых пользователями, за встречи между пользователями и за косвенные убытки, связанные с использованием Приложения. Ничто в этом Соглашении не ограничивает ответственность, которую по закону ограничить нельзя.' },
      { h: '11. Условия, касающиеся Apple', p: 'Настоящее Соглашение заключено только между тобой и ShaPop, а не с Apple Inc. Apple не обязана предоставлять какие-либо услуги по обслуживанию или поддержке. Если Приложение не соответствует применимым гарантиям, ты можешь уведомить Apple и получить возврат стоимости покупки (если она была). Apple не несёт ответственности за рассмотрение каких-либо претензий, связанных с Приложением. Apple и её дочерние компании являются третьими лицами — выгодоприобретателями по настоящему Соглашению и могут требовать его исполнения.' },
      { h: '12. Применимое право', p: 'Это Соглашение регулируется правом страны, в которой зарегистрирован оператор ShaPop. Если ты потребитель, за тобой сохраняется защита обязательных норм страны твоего проживания, и ты можешь обратиться в её суды. Прежде чем что-либо предпринимать, напиши нам: большинство проблем решается мирно.' },
      { h: '13. Контакт', p: 'По любым вопросам об этом Соглашении: support@shapop.app' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'הסכם רישיון למשתמש קצה',
    updated: 'עדכון אחרון: 23 בנובמבר 2026',
    sections: [
      { h: '1. ההסכם', p: 'הסכם רישיון זה למשתמש קצה (״ההסכם״) נכרת ביניכם לבין ShaPop, המפעילה את אפליקציית ShaPop (״האפליקציה״). בהתקנת האפליקציה או בשימוש בה אתם מקבלים הסכם זה. קנייה, מכירה, תשלום מוגן ומסירת פריטים כפופים לתנאי השימוש של ShaPop, הגוברים במקרה של סתירה עם הסכם זה.' },
      { h: '2. מתן רישיון', p: 'ShaPop מעניקה לכם רישיון מוגבל, לא בלעדי, שאינו ניתן להעברה וניתן לביטול, לשימוש באפליקציה בכל מדינה שבה היא זמינה, בכל מכשיר של Apple שבבעלותכם או בשליטתכם, בכפוף לכללי השימוש שבתנאים וההגבלות של שירותי המדיה של Apple.' },
      { h: '3. הגבלות הרישיון', p: 'אסור לכם: (א) להעתיק, לשנות או להפיץ את האפליקציה; (ב) לבצע הנדסה לאחור, הידור לאחור או פירוק של האפליקציה; (ג) להשכיר, להחכיר, להשאיל, למכור או להעניק רישיון משנה לאפליקציה; (ד) להשתמש באפליקציה לכל מטרה בלתי חוקית; (ה) להסיר מהאפליקציה הודעות על זכויות קניין.' },
      { h: '4. קניין רוחני', p: 'האפליקציה, המותג והלוגו של ShaPop שייכים ל-ShaPop ומוגנים בדיני הקניין הרוחני. הסכם זה אינו מעביר לכם זכויות בעלות כלשהן באפליקציה. אתם נשארים הבעלים של התוכן שאתם מפרסמים, בהתאם לתנאי השימוש.' },
      { h: '5. רכישות באפליקציה', p: 'הפריטים המוצעים באפליקציה נמכרים על ידי משתמשים אחרים, ולא על ידי ShaPop או Apple. התשלום מתבצע רק באפליקציה והוא מוגן: ShaPop מחזיקה אותו עד שהמסירה מוכחת (קוד בן 4 ספרות באיסוף עצמי, או שתי תמונות במשלוח בדואר). ל-ShaPop אין חברת שילוח מובנית: הקונה והמוכר מתאמים את המסירה ביניהם. החזרים ומחלוקות מטופלים לפי תנאי השימוש.' },
      { h: '6. שירותי צד שלישי', p: 'האפליקציה משתמשת בשירותי צד שלישי (ספקי תשלום, שידור וידאו, התראות, WhatsApp או אימייל ליצירת קשר עם הצד השני וכו׳). השימוש בשירותים אלה כפוף לתנאים ולמדיניות הפרטיות של כל אחד מהם. ShaPop אינה אחראית לשירותי צד שלישי.' },
      { h: '7. עדכונים', p: 'ShaPop עשויה לפרסם מעת לעת עדכונים לאפליקציה. חלקם עשויים להידרש כדי להמשיך להשתמש בה. אתם מסכימים שהאפליקציה תוריד ותתקין עדכונים באופן אוטומטי.' },
      { h: '8. סיום', p: 'הסכם זה חל עד לסיומו. אתם יכולים להפסיק להשתמש באפליקציה ולמחוק את החשבון בכל עת דרך הגדרות האפליקציה. ShaPop רשאית לסיים הסכם זה אם תפרו אותו או את תנאי השימוש. עם הסיום עליכם להפסיק להשתמש באפליקציה ולמחוק אותה מהמכשירים שלכם.' },
      { h: '9. הסתלקות מאחריות', p: 'במידה שהחוק מתיר, האפליקציה מסופקת ״כמות שהיא״ ו״לפי זמינות״, ללא אחריות מכל סוג. דבר בהסכם זה אינו מגביל את הזכויות שמעניקים לכם, כצרכנים, הכללים המחייבים של מדינת מגוריכם.' },
      { h: '10. הגבלת אחריות', p: 'במידה שהחוק מתיר, ShaPop אינה אחראית לאיכות הפריטים שמוכרים המשתמשים, למפגשים בין משתמשים או לנזקים עקיפים הנובעים מהשימוש באפליקציה. דבר בהסכם זה אינו מגביל אחריות שלא ניתן להגביל על פי חוק.' },
      { h: '11. תנאים הנוגעים ל-Apple', p: 'הסכם זה נכרת ביניכם לבין ShaPop בלבד, ולא עם Apple Inc. ל-Apple אין כל חובה לספק שירותי תחזוקה או תמיכה. אם האפליקציה אינה עומדת באחריות החלה, באפשרותכם להודיע על כך ל-Apple ולקבל החזר של מחיר הרכישה (אם שולם). Apple אינה אחראית לטיפול בתביעות כלשהן הנוגעות לאפליקציה. Apple והחברות הבנות שלה הן מוטבות צד שלישי של הסכם זה ורשאיות לאכוף אותו.' },
      { h: '12. הדין החל', p: 'הסכם זה כפוף לדין של המדינה שבה רשום המפעיל של ShaPop. אם אתם צרכנים, אתם שומרים על ההגנה של הכללים המחייבים של מדינת מגוריכם ויכולים לפנות לבתי המשפט שלה. לפני כל צעד, כתבו לנו: את רוב הבעיות אפשר לפתור בדרכי שלום.' },
      { h: '13. יצירת קשר', p: 'לכל שאלה על הסכם זה: support@shapop.app' },
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

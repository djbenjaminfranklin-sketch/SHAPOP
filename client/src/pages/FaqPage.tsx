import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface FaqItem { q: string; a: string }

interface FaqText {
  goBack: string
  title: string
  subtitle: string
  buyer: string
  seller: string
  general: string
  buyerFaq: FaqItem[]
  sellerFaq: FaqItem[]
  generalFaq: FaqItem[]
}

const content: Localized<FaqText> = {
  en: {
    goBack: 'Go back',
    title: 'Help Center',
    subtitle: 'Frequently asked questions',
    buyer: 'Buying',
    seller: 'Selling',
    general: 'General',
    buyerFaq: [
      { q: 'How do I buy an item on ShaPop?', a: 'Join a live stream, tap the item you want when the seller presents it, and complete your purchase instantly. You can also browse scheduled streams and set reminders.' },
      { q: 'How do payments work?', a: 'We accept credit/debit cards and Apple Pay. Payments are processed securely by our payment provider. Your card details are never stored on our servers.' },
      { q: 'Can I return an item?', a: 'Yes! You have at least 14 days from delivery to request a return — or longer if the consumer protection law of your country provides for it. Items must be in their original condition. Contact the seller through the app to start a return.' },
      { q: 'How long does shipping take?', a: 'Shipping times depend on the seller and on the destination country. Most sellers ship within 1–3 business days. The estimated delivery time is shown before purchase.' },
      { q: 'What if I receive a damaged item?', a: 'Contact the seller right away through the app. If the seller doesn\'t respond within 48 hours, contact our support team and we\'ll help you resolve the issue.' },
      { q: 'Is my payment secure?', a: 'Absolutely. All transactions are encrypted with bank-level security (TLS 1.3). We never store your full card number.' },
    ],
    sellerFaq: [
      { q: 'How do I start selling on ShaPop?', a: 'Go to the Sell tab, set up your seller profile and start your first live stream! No upfront costs or monthly fees.' },
      { q: 'What are the seller fees?', a: 'On each completed sale, ShaPop deducts from your payout: an 8% platform commission plus the payment processing fee charged by our provider (Stripe), about 2.9% plus a small fixed fee that depends on your country and currency. VAT or other local taxes are added to these fees where the law of your country requires it. No upfront costs or monthly fees.' },
      { q: 'When do I get paid?', a: 'Payouts are processed weekly (every Sunday) to your registered bank account, in your currency, once your balance reaches the minimum payout threshold.' },
      { q: 'What can I sell?', a: 'You can sell most physical goods: fashion, electronics, collectibles, handmade items and more — as long as they are legal in your country and in the buyer\'s country. Check the list of prohibited items in the Terms of Service.' },
      { q: 'How do live streams work?', a: 'Start a stream from the Sell tab. Present your items, interact with viewers in real time and make sales live. Streams can last up to 4 hours.' },
      { q: 'How do I handle shipping?', a: 'You\'re responsible for shipping items to buyers, including customs formalities for international orders. We recommend tracked shipping services. Print shipping labels directly from the app.' },
    ],
    generalFaq: [
      { q: 'Where is ShaPop available?', a: 'ShaPop is open to every country. You can buy and sell from wherever you are; prices are shown in the seller\'s currency, and delivery options depend on each seller.' },
      { q: 'How do I delete my account?', a: 'Go to Profile > Preferences > Delete account. Your personal data will be deleted within 30 days. Transaction records are kept for as long as tax and accounting laws require.' },
      { q: 'How do I report a problem?', a: 'Use the "Contact us" option in your Profile, or email us at support@shapop.app. We respond within 24 hours.' },
      { q: 'Is ShaPop free to use?', a: 'Yes! The app is free to download and use. Buyers pay no fees to ShaPop. Sellers only pay fees on completed sales (8% commission plus payment processing fees and any applicable taxes).' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Centre d\'aide',
    subtitle: 'Questions fréquentes',
    buyer: 'Achats',
    seller: 'Ventes',
    general: 'Général',
    buyerFaq: [
      { q: 'Comment acheter un article sur ShaPop ?', a: 'Rejoins un live, appuie sur l\'article qui te plaît quand le vendeur le présente, et finalise ton achat en un instant. Tu peux aussi parcourir les lives programmés et activer des rappels.' },
      { q: 'Comment fonctionnent les paiements ?', a: 'Nous acceptons les cartes de crédit/débit et Apple Pay. Les paiements sont traités de manière sécurisée par notre prestataire de paiement. Tes coordonnées bancaires ne sont jamais stockées sur nos serveurs.' },
      { q: 'Puis-je retourner un article ?', a: 'Oui ! Tu as au moins 14 jours après la livraison pour demander un retour — ou plus si la loi de protection des consommateurs de ton pays le prévoit. Les articles doivent être dans leur état d\'origine. Contacte le vendeur via l\'application pour lancer un retour.' },
      { q: 'Combien de temps dure la livraison ?', a: 'Les délais de livraison dépendent du vendeur et du pays de destination. La plupart des vendeurs expédient sous 1 à 3 jours ouvrés. Le délai de livraison estimé est affiché avant l\'achat.' },
      { q: 'Que faire si je reçois un article endommagé ?', a: 'Contacte immédiatement le vendeur via l\'application. S\'il ne répond pas sous 48 heures, contacte notre équipe d\'assistance : on t\'aidera à régler le problème.' },
      { q: 'Mon paiement est-il sécurisé ?', a: 'Absolument. Toutes les transactions sont chiffrées avec une sécurité de niveau bancaire (TLS 1.3). Nous ne conservons jamais ton numéro de carte complet.' },
    ],
    sellerFaq: [
      { q: 'Comment commencer à vendre sur ShaPop ?', a: 'Va dans l\'onglet Vendre, configure ton profil vendeur et lance ton premier live ! Aucuns frais initiaux ni abonnement mensuel.' },
      { q: 'Quels sont les frais pour les vendeurs ?', a: 'Sur chaque vente effectuée, ShaPop déduit de ton versement : 8 % de commission plateforme, plus les frais de traitement du paiement facturés par notre prestataire (Stripe), soit environ 2,9 % plus de petits frais fixes qui dépendent de ton pays et de ta devise. La TVA ou les autres taxes locales s\'ajoutent à ces frais lorsque la loi de ton pays l\'exige. Aucuns frais initiaux ni abonnement mensuel.' },
      { q: 'Quand suis-je payé ?', a: 'Les versements sont effectués chaque semaine (tous les dimanches) sur ton compte bancaire enregistré, dans ta devise, dès que ton solde atteint le seuil minimum de versement.' },
      { q: 'Que puis-je vendre ?', a: 'Tu peux vendre la plupart des biens physiques : mode, électronique, objets de collection, articles faits main, et plus encore — tant qu\'ils sont autorisés dans ton pays et dans celui de l\'acheteur. Consulte la liste des articles interdits dans les Conditions d\'utilisation.' },
      { q: 'Comment fonctionnent les lives ?', a: 'Lance un live depuis l\'onglet Vendre. Présente tes articles, échange avec les spectateurs en temps réel et vends en direct. Un live peut durer jusqu\'à 4 heures.' },
      { q: 'Comment gérer les expéditions ?', a: 'Tu es responsable de l\'expédition des articles aux acheteurs, y compris des formalités douanières pour les commandes internationales. Nous te recommandons d\'utiliser des services de livraison avec suivi. Imprime tes étiquettes d\'expédition directement depuis l\'application.' },
    ],
    generalFaq: [
      { q: 'Où ShaPop est-il disponible ?', a: 'ShaPop est ouvert à tous les pays. Tu peux acheter et vendre où que tu sois ; les prix sont affichés dans la devise du vendeur et les options de livraison dépendent de chaque vendeur.' },
      { q: 'Comment supprimer mon compte ?', a: 'Va dans Profil > Préférences > Supprimer le compte. Tes données personnelles seront supprimées sous 30 jours. Les enregistrements de transactions sont conservés aussi longtemps que l\'exigent les lois fiscales et comptables.' },
      { q: 'Comment signaler un problème ?', a: 'Utilise l\'option « Nous contacter » dans ton Profil, ou écris-nous à support@shapop.app. Nous répondons sous 24 heures.' },
      { q: 'ShaPop est-il gratuit ?', a: 'Oui ! L\'application est gratuite à télécharger et à utiliser. Les acheteurs ne paient aucuns frais à ShaPop. Les vendeurs paient uniquement sur les ventes effectuées (8 % de commission, plus les frais de traitement du paiement et les taxes éventuelles).' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Centro de ayuda',
    subtitle: 'Preguntas frecuentes',
    buyer: 'Compras',
    seller: 'Ventas',
    general: 'General',
    buyerFaq: [
      { q: '¿Cómo compro un artículo en ShaPop?', a: 'Únete a un directo, toca el artículo que quieras cuando el vendedor lo presente y finaliza tu compra al instante. También puedes explorar los directos programados y activar recordatorios.' },
      { q: '¿Cómo funcionan los pagos?', a: 'Aceptamos tarjetas de crédito/débito y Apple Pay. Los pagos se procesan de forma segura a través de nuestro proveedor de pagos. Los datos de tu tarjeta nunca se guardan en nuestros servidores.' },
      { q: '¿Puedo devolver un artículo?', a: '¡Sí! Tienes al menos 14 días desde la entrega para solicitar una devolución, o más si la ley de protección al consumidor de tu país lo establece. Los artículos deben estar en su estado original. Contacta con el vendedor desde la app para iniciar la devolución.' },
      { q: '¿Cuánto tarda el envío?', a: 'Los plazos de entrega dependen del vendedor y del país de destino. La mayoría de los vendedores envían en 1 a 3 días hábiles. El plazo de entrega estimado se muestra antes de la compra.' },
      { q: '¿Qué pasa si recibo un artículo dañado?', a: 'Contacta enseguida con el vendedor desde la app. Si no responde en 48 horas, escribe a nuestro equipo de soporte y te ayudaremos a resolver el problema.' },
      { q: '¿Es seguro mi pago?', a: 'Totalmente. Todas las transacciones están cifradas con seguridad de nivel bancario (TLS 1.3). Nunca guardamos el número completo de tu tarjeta.' },
    ],
    sellerFaq: [
      { q: '¿Cómo empiezo a vender en ShaPop?', a: 'Ve a la pestaña Vender, configura tu perfil de vendedor y ¡lanza tu primer directo! Sin costes iniciales ni cuotas mensuales.' },
      { q: '¿Cuáles son las comisiones para vendedores?', a: 'Por cada venta completada, ShaPop descuenta de tu pago: un 8 % de comisión de plataforma, más la comisión de procesamiento de pago de nuestro proveedor (Stripe), de aproximadamente un 2,9 % más una pequeña tarifa fija que depende de tu país y tu moneda. El IVA u otros impuestos locales se añaden a estas comisiones cuando la ley de tu país lo exige. Sin costes iniciales ni cuotas mensuales.' },
      { q: '¿Cuándo recibo mi pago?', a: 'Los pagos se procesan cada semana (todos los domingos) en tu cuenta bancaria registrada, en tu moneda, en cuanto tu saldo alcanza el importe mínimo de pago.' },
      { q: '¿Qué puedo vender?', a: 'Puedes vender la mayoría de bienes físicos: moda, electrónica, coleccionables, artículos hechos a mano y mucho más, siempre que sean legales en tu país y en el del comprador. Consulta la lista de artículos prohibidos en los Términos del servicio.' },
      { q: '¿Cómo funcionan los directos?', a: 'Inicia un directo desde la pestaña Vender. Presenta tus artículos, interactúa con los espectadores en tiempo real y vende en directo. Los directos pueden durar hasta 4 horas.' },
      { q: '¿Cómo gestiono los envíos?', a: 'Eres responsable de enviar los artículos a los compradores, incluidos los trámites aduaneros de los pedidos internacionales. Te recomendamos usar servicios de envío con seguimiento. Imprime tus etiquetas de envío directamente desde la app.' },
    ],
    generalFaq: [
      { q: '¿Dónde está disponible ShaPop?', a: 'ShaPop está abierto a todos los países. Puedes comprar y vender estés donde estés; los precios se muestran en la moneda del vendedor y las opciones de envío dependen de cada vendedor.' },
      { q: '¿Cómo elimino mi cuenta?', a: 'Ve a Perfil > Preferencias > Eliminar cuenta. Tus datos personales se eliminarán en un plazo de 30 días. Los registros de transacciones se conservan durante el tiempo que exijan las leyes fiscales y contables.' },
      { q: '¿Cómo informo de un problema?', a: 'Usa la opción «Contáctanos» de tu Perfil o escríbenos a support@shapop.app. Respondemos en menos de 24 horas.' },
      { q: '¿ShaPop es gratis?', a: '¡Sí! La app es gratuita para descargar y usar. Los compradores no pagan ninguna comisión a ShaPop. Los vendedores solo pagan por las ventas completadas (8 % de comisión, más las comisiones de procesamiento de pago y los impuestos que correspondan).' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Центр помощи',
    subtitle: 'Частые вопросы',
    buyer: 'Покупки',
    seller: 'Продажи',
    general: 'Общее',
    buyerFaq: [
      { q: 'Как купить товар в ShaPop?', a: 'Зайди в прямой эфир, нажми на нужный товар, когда продавец его показывает, и оформи покупку за секунду. Ещё можно смотреть запланированные эфиры и ставить напоминания.' },
      { q: 'Как работает оплата?', a: 'Мы принимаем кредитные и дебетовые карты, а также Apple Pay. Платежи безопасно обрабатывает наш платёжный провайдер. Данные твоей карты никогда не хранятся на наших серверах.' },
      { q: 'Можно ли вернуть товар?', a: 'Да! У тебя есть не меньше 14 дней с момента доставки, чтобы оформить возврат, — или больше, если это предусмотрено законом о защите прав потребителей в твоей стране. Товар должен быть в исходном состоянии. Чтобы начать возврат, свяжись с продавцом через приложение.' },
      { q: 'Сколько идёт доставка?', a: 'Сроки доставки зависят от продавца и страны назначения. Большинство продавцов отправляют заказ за 1–3 рабочих дня. Примерный срок доставки показывается до покупки.' },
      { q: 'Что делать, если товар пришёл повреждённым?', a: 'Сразу свяжись с продавцом через приложение. Если он не ответит в течение 48 часов, напиши в нашу службу поддержки — мы поможем решить вопрос.' },
      { q: 'Безопасна ли оплата?', a: 'Абсолютно. Все транзакции защищены шифрованием банковского уровня (TLS 1.3). Мы никогда не храним полный номер твоей карты.' },
    ],
    sellerFaq: [
      { q: 'Как начать продавать в ShaPop?', a: 'Открой вкладку «Продавать», настрой профиль продавца и запускай первый эфир! Никаких стартовых платежей и абонентской платы.' },
      { q: 'Какие комиссии у продавцов?', a: 'С каждой завершённой продажи ShaPop удерживает из твоей выплаты: комиссию платформы 8 % плюс комиссию за обработку платежа нашего провайдера (Stripe) — около 2,9 % и небольшой фиксированный сбор, который зависит от твоей страны и валюты. НДС или другие местные налоги добавляются к этим комиссиям, если этого требует закон твоей страны. Никаких стартовых платежей и абонентской платы.' },
      { q: 'Когда я получу деньги?', a: 'Выплаты производятся раз в неделю (по воскресеньям) на твой привязанный банковский счёт в твоей валюте, как только баланс достигнет минимальной суммы для выплаты.' },
      { q: 'Что можно продавать?', a: 'Большинство физических товаров: одежду, электронику, коллекционные вещи, изделия ручной работы и многое другое — при условии, что они разрешены в твоей стране и в стране покупателя. Список запрещённых товаров — в Условиях использования.' },
      { q: 'Как устроены прямые эфиры?', a: 'Запусти эфир во вкладке «Продавать». Показывай товары, общайся со зрителями в реальном времени и продавай прямо в эфире. Эфир может длиться до 4 часов.' },
      { q: 'Как организовать доставку?', a: 'Ты отвечаешь за отправку товаров покупателям, включая таможенные формальности для международных заказов. Рекомендуем службы доставки с отслеживанием. Печатай транспортные этикетки прямо из приложения.' },
    ],
    generalFaq: [
      { q: 'Где доступен ShaPop?', a: 'ShaPop открыт для всех стран. Покупай и продавай, где бы ты ни был; цены показываются в валюте продавца, а варианты доставки зависят от каждого продавца.' },
      { q: 'Как удалить аккаунт?', a: 'Открой «Профиль» > «Настройки» > «Удалить аккаунт». Твои персональные данные будут удалены в течение 30 дней. Записи о транзакциях хранятся столько, сколько требует налоговое и бухгалтерское законодательство.' },
      { q: 'Как сообщить о проблеме?', a: 'Воспользуйся пунктом «Связаться с нами» в профиле или напиши на support@shapop.app. Мы отвечаем в течение 24 часов.' },
      { q: 'ShaPop бесплатный?', a: 'Да! Приложение можно скачать и использовать бесплатно. Покупатели не платят ShaPop никаких комиссий. Продавцы платят только с завершённых продаж (комиссия 8 % плюс комиссия за обработку платежа и применимые налоги).' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'מרכז העזרה',
    subtitle: 'שאלות נפוצות',
    buyer: 'קנייה',
    seller: 'מכירה',
    general: 'כללי',
    buyerFaq: [
      { q: 'איך קונים מוצר ב-ShaPop?', a: 'הצטרפו לשידור חי, הקישו על המוצר שאתם רוצים כשהמוכר מציג אותו, והשלימו את הרכישה ברגע. אפשר גם לעיין בשידורים המתוכננים ולהגדיר תזכורות.' },
      { q: 'איך עובדים התשלומים?', a: 'אנחנו מקבלים כרטיסי אשראי וחיוב ו-Apple Pay. התשלומים מעובדים באופן מאובטח אצל ספק התשלומים שלנו. פרטי הכרטיס שלכם אף פעם לא נשמרים בשרתים שלנו.' },
      { q: 'אפשר להחזיר מוצר?', a: 'כן! יש לכם לפחות 14 יום מקבלת המשלוח כדי לבקש החזרה — או יותר, אם חוק הגנת הצרכן במדינה שלכם קובע זאת. המוצר צריך להיות במצבו המקורי. כדי להתחיל החזרה, פנו למוכר דרך האפליקציה.' },
      { q: 'כמה זמן לוקח המשלוח?', a: 'זמני המשלוח תלויים במוכר ובמדינת היעד. רוב המוכרים שולחים תוך 1–3 ימי עסקים. זמן האספקה המשוער מוצג לפני הרכישה.' },
      { q: 'מה עושים אם קיבלתי מוצר פגום?', a: 'פנו מיד למוכר דרך האפליקציה. אם הוא לא עונה תוך 48 שעות, פנו לצוות התמיכה שלנו ונעזור לכם לפתור את הבעיה.' },
      { q: 'התשלום שלי מאובטח?', a: 'בהחלט. כל העסקאות מוצפנות באבטחה ברמה בנקאית (TLS 1.3). אנחנו אף פעם לא שומרים את מספר הכרטיס המלא שלכם.' },
    ],
    sellerFaq: [
      { q: 'איך מתחילים למכור ב-ShaPop?', a: 'עברו ללשונית "מכירה", הגדירו את פרופיל המוכר ופתחו את השידור החי הראשון שלכם! בלי עלויות פתיחה ובלי דמי מנוי חודשיים.' },
      { q: 'מה העמלות למוכרים?', a: 'מכל מכירה שהושלמה, ShaPop מנכה מהתשלום אליכם: עמלת פלטפורמה של 8%, ובנוסף עמלת עיבוד תשלום של ספק התשלומים שלנו (Stripe) — כ-2.9% ועוד עמלה קבועה קטנה שתלויה במדינה ובמטבע שלכם. מע"מ או מסים מקומיים אחרים מתווספים לעמלות האלה כשהחוק במדינה שלכם מחייב זאת. בלי עלויות פתיחה ובלי דמי מנוי חודשיים.' },
      { q: 'מתי מקבלים את הכסף?', a: 'התשלומים מועברים פעם בשבוע (בכל יום ראשון) לחשבון הבנק הרשום שלכם, במטבע שלכם, ברגע שהיתרה מגיעה לסכום המינימלי להעברה.' },
      { q: 'מה אפשר למכור?', a: 'אפשר למכור את רוב המוצרים הפיזיים: אופנה, אלקטרוניקה, פריטי אספנות, עבודות יד ועוד — כל עוד הם חוקיים במדינה שלכם ובמדינת הקונה. את רשימת המוצרים האסורים תמצאו בתנאי השימוש.' },
      { q: 'איך עובדים שידורים חיים?', a: 'פתחו שידור מלשונית "מכירה". הציגו את המוצרים, דברו עם הצופים בזמן אמת ומכרו בשידור חי. שידור יכול להימשך עד 4 שעות.' },
      { q: 'איך מטפלים במשלוחים?', a: 'אתם אחראים לשלוח את המוצרים לקונים, כולל הליכי המכס בהזמנות בינלאומיות. מומלץ להשתמש בשירותי משלוח עם מעקב. אפשר להדפיס תוויות משלוח ישירות מהאפליקציה.' },
    ],
    generalFaq: [
      { q: 'איפה ShaPop זמינה?', a: 'ShaPop פתוחה בכל המדינות. אפשר לקנות ולמכור מכל מקום; המחירים מוצגים במטבע של המוכר, ואפשרויות המשלוח תלויות בכל מוכר.' },
      { q: 'איך מוחקים את החשבון?', a: 'עברו אל פרופיל > העדפות > מחיקת חשבון. המידע האישי שלכם יימחק תוך 30 יום. רשומות העסקאות נשמרות כל עוד דיני המס והחשבונאות מחייבים זאת.' },
      { q: 'איך מדווחים על בעיה?', a: 'השתמשו באפשרות "צור קשר" בפרופיל, או שלחו לנו אימייל ל-support@shapop.app. אנחנו עונים תוך 24 שעות.' },
      { q: 'השימוש ב-ShaPop בחינם?', a: 'כן! ההורדה והשימוש באפליקציה בחינם. קונים לא משלמים ל-ShaPop שום עמלה. מוכרים משלמים רק על מכירות שהושלמו (עמלה של 8%, ובנוסף עמלות עיבוד התשלום והמסים החלים).' },
    ],
  },
}

export default function FaqPage() {
  const navigate = useNavigate()
  const c = tr(content)
  usePageTitle(c.title)
  const [tab, setTab] = useState<'buyer' | 'seller' | 'general'>('buyer')
  const [open, setOpen] = useState<number | null>(null)

  const faqs = tab === 'buyer' ? c.buyerFaq : tab === 'seller' ? c.sellerFaq : c.generalFaq

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px 12px' }}>
          <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #1A1A1A' }}>
          {(['buyer', 'seller', 'general'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setOpen(null) }}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid #F0908A' : '2px solid transparent',
                color: tab === t ? '#fff' : '#666', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {c[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>{c.subtitle}</p>
        {faqs.map((faq, i) => (
          <div key={`${tab}-${i}`} style={{ borderBottom: '1px solid #1A1A1A', marginBottom: '4px' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '15px', color: '#fff', fontWeight: 500, flex: 1, paddingInlineEnd: '12px' }}>{faq.q}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
                style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {open === i && (
              <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6, padding: '0 0 16px', whiteSpace: 'pre-line' }}>{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

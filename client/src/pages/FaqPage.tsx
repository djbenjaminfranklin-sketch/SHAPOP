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
      { q: 'How do payments work?', a: 'You pay only in the app: bank card, Apple Pay, and Bit in Israel. Payments are processed by licensed payment providers and your card details are never stored on our servers. ShaPop holds your payment until the handover is proven.' },
      { q: 'Can I return an item?', a: 'Between individuals, a sale can only be cancelled if both parties agree or through a dispute (item not received or not as described). If the seller is a business, you also have the rights given by the consumer protection law of your country, such as a right of withdrawal. Open your order and tap “Request a return” or “Report a problem”. See the Return Policy for details.' },
      { q: 'How do I get my item?', a: 'ShaPop has no built-in courier. After payment, a WhatsApp button (or email) puts you in touch with the seller. You either meet in person, if the seller allows it, or the seller sends the item by post; shipping costs, set by the seller, are paid at checkout.' },
      { q: 'What if I receive a damaged item?', a: 'Report it right away from your order (“Report a problem”) or at support@shapop.app, with photos. Your payment stays protected: by post, the seller is only paid 3 days after their shipping photos, or as soon as you confirm receipt. In person, only give your 4-digit code after checking the item.' },
      { q: 'Is my payment secure?', a: 'Absolutely. All transactions are encrypted with bank-level security (TLS 1.3). We never store your full card number.' },
    ],
    sellerFaq: [
      { q: 'How do I start selling on ShaPop?', a: 'Go to the Sell tab, set up your seller profile and start your first live stream! No upfront costs or monthly fees.' },
      { q: 'What are the seller fees?', a: 'On each completed sale, ShaPop deducts from your payout: an 8% platform commission plus the payment processing fee charged by our provider (Stripe), about 2.9% plus a small fixed fee that depends on your country and currency. VAT or other local taxes are added to these fees where the law of your country requires it. No upfront costs or monthly fees.' },
      { q: 'When do I get paid?', a: 'In person, as soon as you enter the buyer’s 4-digit code. By post, 3 days after you upload the two photos (inside of the parcel + stamped receipt), or as soon as the buyer confirms receipt, unless the buyer reports a problem in the meantime. The ShaPop commission is deducted from the amount.' },
      { q: 'What can I sell?', a: 'You can sell most physical goods: fashion, electronics, collectibles, handmade items and more — as long as they are legal in your country and in the buyer\'s country. Check the list of prohibited items in the Terms of Service.' },
      { q: 'How do live streams work?', a: 'Start a stream from the Sell tab. Present your items, interact with viewers in real time and make sales live. Streams can last up to 4 hours.' },
      { q: 'How do I handle shipping?', a: 'ShaPop has no built-in courier. After the sale, contact the buyer (WhatsApp or email) to arrange a handover in person, if you allow it, or send the item by post with your local postal service. You set your own shipping cost, and you handle customs formalities for international orders. To get paid, upload a photo of the inside of the parcel and a photo of the stamped shipping receipt.' },
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
      { q: 'Comment fonctionnent les paiements ?', a: 'Tu paies uniquement dans l’app : carte bancaire, Apple Pay, et Bit en Israël. Les paiements sont traités par des prestataires de paiement agréés et tes données de carte ne sont jamais stockées sur nos serveurs. ShaPop garde ton paiement de côté jusqu’à la preuve de la remise.' },
      { q: 'Puis-je retourner un article ?', a: 'Entre particuliers, une vente ne peut être annulée qu’avec l’accord des deux parties ou dans le cadre d’un litige (article non reçu ou non conforme). Si le vendeur est un professionnel, tu as en plus les droits que te donne la loi de protection des consommateurs de ton pays, comme un droit de rétractation. Ouvre ta commande et appuie sur « Demander un retour » ou « Signaler un problème ». Tous les détails sont dans la politique de retours.' },
      { q: 'Comment je récupère mon article ?', a: 'ShaPop n’intègre aucun transporteur. Après le paiement, un bouton WhatsApp (ou l’e-mail) te met en relation avec le vendeur. Vous vous retrouvez en main propre, si le vendeur l’accepte, ou le vendeur t’envoie l’article par la poste ; les frais de port, fixés par le vendeur, sont payés au moment de l’achat.' },
      { q: 'Que faire si je reçois un article endommagé ?', a: 'Signale-le tout de suite depuis ta commande (« Signaler un problème ») ou à support@shapop.app, avec des photos. Ton paiement reste protégé : par la poste, le vendeur n’est payé que 3 jours après ses photos d’envoi, ou dès que tu confirmes la réception. En main propre, ne donne ton code à 4 chiffres qu’après avoir vérifié l’article.' },
      { q: 'Mon paiement est-il sécurisé ?', a: 'Absolument. Toutes les transactions sont chiffrées avec une sécurité de niveau bancaire (TLS 1.3). Nous ne conservons jamais ton numéro de carte complet.' },
    ],
    sellerFaq: [
      { q: 'Comment commencer à vendre sur ShaPop ?', a: 'Va dans l\'onglet Vendre, configure ton profil vendeur et lance ton premier live ! Aucuns frais initiaux ni abonnement mensuel.' },
      { q: 'Quels sont les frais pour les vendeurs ?', a: 'Sur chaque vente effectuée, ShaPop déduit de ton versement : 8 % de commission plateforme, plus les frais de traitement du paiement facturés par notre prestataire (Stripe), soit environ 2,9 % plus de petits frais fixes qui dépendent de ton pays et de ta devise. La TVA ou les autres taxes locales s\'ajoutent à ces frais lorsque la loi de ton pays l\'exige. Aucuns frais initiaux ni abonnement mensuel.' },
      { q: 'Quand suis-je payé ?', a: 'En main propre, dès que tu saisis le code à 4 chiffres de l’acheteur. Par la poste, 3 jours après l’envoi des deux photos (intérieur du colis + bordereau tamponné), ou dès que l’acheteur confirme la réception, sauf si l’acheteur signale un problème entre-temps. La commission ShaPop est déduite du montant.' },
      { q: 'Que puis-je vendre ?', a: 'Tu peux vendre la plupart des biens physiques : mode, électronique, objets de collection, articles faits main, et plus encore — tant qu\'ils sont autorisés dans ton pays et dans celui de l\'acheteur. Consulte la liste des articles interdits dans les Conditions d\'utilisation.' },
      { q: 'Comment fonctionnent les lives ?', a: 'Lance un live depuis l\'onglet Vendre. Présente tes articles, échange avec les spectateurs en temps réel et vends en direct. Un live peut durer jusqu\'à 4 heures.' },
      { q: 'Comment gérer les expéditions ?', a: 'ShaPop n’intègre aucun transporteur. Après la vente, contacte l’acheteur (WhatsApp ou e-mail) pour organiser une remise en main propre, si tu l’acceptes, ou envoie l’article par la poste de ton pays. Tu fixes toi-même tes frais de port et tu gères les formalités de douane pour les commandes internationales. Pour être payé, envoie une photo de l’intérieur du colis et une photo du bordereau d’envoi tamponné.' },
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
      { q: '¿Cómo funcionan los pagos?', a: 'Pagas solo en la app: tarjeta, Apple Pay, y Bit en Israel. Los pagos los procesan proveedores de pago autorizados y los datos de tu tarjeta nunca se guardan en nuestros servidores. ShaPop retiene tu pago hasta que se demuestra la entrega.' },
      { q: '¿Puedo devolver un artículo?', a: 'Entre particulares, una venta solo puede anularse si ambas partes están de acuerdo o mediante una disputa (artículo no recibido o no conforme). Si el vendedor es profesional, tienes además los derechos que te da la ley de protección de los consumidores de tu país, como el derecho de desistimiento. Abre tu pedido y toca «Solicitar una devolución» o «Informar de un problema». Todos los detalles están en la política de devoluciones.' },
      { q: '¿Cómo recibo mi artículo?', a: 'ShaPop no tiene transportista integrado. Después del pago, un botón de WhatsApp (o el email) te pone en contacto con el vendedor. Os veis en persona, si el vendedor lo permite, o el vendedor te lo envía por correo; los gastos de envío, que fija el vendedor, se pagan al comprar.' },
      { q: '¿Qué pasa si recibo un artículo dañado?', a: 'Infórmalo enseguida desde tu pedido («Informar de un problema») o en support@shapop.app, con fotos. Tu pago sigue protegido: por correo, el vendedor solo cobra 3 días después de sus fotos del envío, o en cuanto confirmas la recepción. En mano, da tu código de 4 cifras solo después de revisar el artículo.' },
      { q: '¿Es seguro mi pago?', a: 'Totalmente. Todas las transacciones están cifradas con seguridad de nivel bancario (TLS 1.3). Nunca guardamos el número completo de tu tarjeta.' },
    ],
    sellerFaq: [
      { q: '¿Cómo empiezo a vender en ShaPop?', a: 'Ve a la pestaña Vender, configura tu perfil de vendedor y ¡lanza tu primer directo! Sin costes iniciales ni cuotas mensuales.' },
      { q: '¿Cuáles son las comisiones para vendedores?', a: 'Por cada venta completada, ShaPop descuenta de tu pago: un 8 % de comisión de plataforma, más la comisión de procesamiento de pago de nuestro proveedor (Stripe), de aproximadamente un 2,9 % más una pequeña tarifa fija que depende de tu país y tu moneda. El IVA u otros impuestos locales se añaden a estas comisiones cuando la ley de tu país lo exige. Sin costes iniciales ni cuotas mensuales.' },
      { q: '¿Cuándo recibo mi pago?', a: 'En mano, en cuanto introduces el código de 4 cifras del comprador. Por correo, 3 días después de subir las dos fotos (interior del paquete + resguardo sellado), o en cuanto el comprador confirma la recepción, salvo que el comprador comunique un problema mientras tanto. La comisión de ShaPop se descuenta del importe.' },
      { q: '¿Qué puedo vender?', a: 'Puedes vender la mayoría de bienes físicos: moda, electrónica, coleccionables, artículos hechos a mano y mucho más, siempre que sean legales en tu país y en el del comprador. Consulta la lista de artículos prohibidos en los Términos del servicio.' },
      { q: '¿Cómo funcionan los directos?', a: 'Inicia un directo desde la pestaña Vender. Presenta tus artículos, interactúa con los espectadores en tiempo real y vende en directo. Los directos pueden durar hasta 4 horas.' },
      { q: '¿Cómo gestiono los envíos?', a: 'ShaPop no tiene transportista integrado. Después de la venta, contacta con el comprador (WhatsApp o email) para quedar en persona, si lo permites, o envía el artículo por el correo de tu país. Tú fijas los gastos de envío y te encargas de los trámites de aduana en los pedidos internacionales. Para cobrar, sube una foto del interior del paquete y una foto del resguardo de envío sellado.' },
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
      { q: 'Как работает оплата?', a: 'Платишь только в приложении: картой, через Apple Pay, а в Израиле — через Bit. Платежи обрабатывают лицензированные платёжные провайдеры, данные твоей карты никогда не хранятся на наших серверах. ShaPop удерживает оплату, пока передача не подтверждена.' },
      { q: 'Можно ли вернуть товар?', a: 'Между частными лицами продажу можно отменить только с согласия обеих сторон или в рамках спора (товар не получен или не соответствует описанию). Если продавец — профессионал, у тебя есть также права, которые даёт закон о защите прав потребителей твоей страны, например право отказа от покупки. Открой заказ и нажми «Запросить возврат» или «Сообщить о проблеме». Подробности — в политике возврата.' },
      { q: 'Как я получу товар?', a: 'У ShaPop нет встроенной службы доставки. После оплаты кнопка WhatsApp (или e-mail) связывает тебя с продавцом. Вы встречаетесь лично, если продавец это разрешает, или продавец отправляет товар почтой; стоимость доставки устанавливает продавец, и она оплачивается при покупке.' },
      { q: 'Что делать, если товар пришёл повреждённым?', a: 'Сразу сообщи об этом из заказа («Сообщить о проблеме») или на support@shapop.app, приложив фото. Твоя оплата остаётся под защитой: при отправке почтой продавец получает деньги только через 3 дня после своих фото отправки или как только ты подтвердишь получение. При личной встрече называй 4-значный код только после проверки товара.' },
      { q: 'Безопасна ли оплата?', a: 'Абсолютно. Все транзакции защищены шифрованием банковского уровня (TLS 1.3). Мы никогда не храним полный номер твоей карты.' },
    ],
    sellerFaq: [
      { q: 'Как начать продавать в ShaPop?', a: 'Открой вкладку «Продавать», настрой профиль продавца и запускай первый эфир! Никаких стартовых платежей и абонентской платы.' },
      { q: 'Какие комиссии у продавцов?', a: 'С каждой завершённой продажи ShaPop удерживает из твоей выплаты: комиссию платформы 8 % плюс комиссию за обработку платежа нашего провайдера (Stripe) — около 2,9 % и небольшой фиксированный сбор, который зависит от твоей страны и валюты. НДС или другие местные налоги добавляются к этим комиссиям, если этого требует закон твоей страны. Никаких стартовых платежей и абонентской платы.' },
      { q: 'Когда я получу деньги?', a: 'При личной встрече — как только ты введёшь 4-значный код покупателя. При отправке почтой — через 3 дня после загрузки двух фото (содержимое посылки + квитанция со штампом) или как только покупатель подтвердит получение, если за это время покупатель не сообщит о проблеме. Комиссия ShaPop вычитается из суммы.' },
      { q: 'Что можно продавать?', a: 'Большинство физических товаров: одежду, электронику, коллекционные вещи, изделия ручной работы и многое другое — при условии, что они разрешены в твоей стране и в стране покупателя. Список запрещённых товаров — в Условиях использования.' },
      { q: 'Как устроены прямые эфиры?', a: 'Запусти эфир во вкладке «Продавать». Показывай товары, общайся со зрителями в реальном времени и продавай прямо в эфире. Эфир может длиться до 4 часов.' },
      { q: 'Как организовать доставку?', a: 'У ShaPop нет встроенной службы доставки. После продажи свяжись с покупателем (WhatsApp или e-mail), чтобы договориться о личной встрече, если ты её разрешаешь, или отправь товар почтой своей страны. Стоимость доставки ты устанавливаешь сам и сам занимаешься таможенными формальностями для международных заказов. Чтобы получить оплату, загрузи фото содержимого посылки и фото квитанции об отправке со штампом.' },
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
      { q: 'איך עובדים התשלומים?', a: 'משלמים רק באפליקציה: בכרטיס אשראי, ב-Apple Pay, וביט בישראל. התשלומים מעובדים על ידי ספקי תשלום מורשים, ופרטי הכרטיס שלכם אף פעם לא נשמרים בשרתים שלנו. ShaPop מחזיקה את התשלום עד שהמסירה מוכחת.' },
      { q: 'אפשר להחזיר מוצר?', a: 'בין אנשים פרטיים, אפשר לבטל מכירה רק בהסכמת שני הצדדים או במסגרת מחלוקת (פריט שלא התקבל או שאינו תואם לתיאור). אם המוכר הוא עסק, יש לכם בנוסף הזכויות שמעניק דין הגנת הצרכן במדינתכם, כמו זכות ביטול. פתחו את ההזמנה והקישו על ״בקשת החזרה״ או ״דווח על בעיה״. כל הפרטים במדיניות ההחזרות.' },
      { q: 'איך מקבלים את הפריט?', a: 'ל-ShaPop אין חברת שילוח מובנית. אחרי התשלום, כפתור WhatsApp (או אימייל) מחבר אתכם עם המוכר. נפגשים פנים אל פנים, אם המוכר מאפשר, או שהמוכר שולח את הפריט בדואר; דמי המשלוח, שהמוכר קובע, משולמים בזמן הקנייה.' },
      { q: 'מה עושים אם קיבלתי מוצר פגום?', a: 'דווחו על כך מיד מההזמנה (״דווח על בעיה״) או ל-support@shapop.app, עם תמונות. התשלום שלכם נשאר מוגן: במשלוח בדואר, המוכר מקבל את הכסף רק 3 ימים אחרי תמונות המשלוח שלו, או ברגע שאתם מאשרים שקיבלתם. באיסוף עצמי, מסרו את הקוד בן 4 הספרות רק אחרי שבדקתם את הפריט.' },
      { q: 'התשלום שלי מאובטח?', a: 'בהחלט. כל העסקאות מוצפנות באבטחה ברמה בנקאית (TLS 1.3). אנחנו אף פעם לא שומרים את מספר הכרטיס המלא שלכם.' },
    ],
    sellerFaq: [
      { q: 'איך מתחילים למכור ב-ShaPop?', a: 'עברו ללשונית "מכירה", הגדירו את פרופיל המוכר ופתחו את השידור החי הראשון שלכם! בלי עלויות פתיחה ובלי דמי מנוי חודשיים.' },
      { q: 'מה העמלות למוכרים?', a: 'מכל מכירה שהושלמה, ShaPop מנכה מהתשלום אליכם: עמלת פלטפורמה של 8%, ובנוסף עמלת עיבוד תשלום של ספק התשלומים שלנו (Stripe) — כ-2.9% ועוד עמלה קבועה קטנה שתלויה במדינה ובמטבע שלכם. מע"מ או מסים מקומיים אחרים מתווספים לעמלות האלה כשהחוק במדינה שלכם מחייב זאת. בלי עלויות פתיחה ובלי דמי מנוי חודשיים.' },
      { q: 'מתי מקבלים את הכסף?', a: 'באיסוף עצמי – ברגע שמקלידים את הקוד בן 4 הספרות של הקונה. בדואר – 3 ימים אחרי העלאת שתי התמונות (תוך החבילה + אישור משלוח חתום), או ברגע שהקונה מאשר שקיבל, אלא אם הקונה מדווח על בעיה בינתיים. העמלה של ShaPop מנוכה מהסכום.' },
      { q: 'מה אפשר למכור?', a: 'אפשר למכור את רוב המוצרים הפיזיים: אופנה, אלקטרוניקה, פריטי אספנות, עבודות יד ועוד — כל עוד הם חוקיים במדינה שלכם ובמדינת הקונה. את רשימת המוצרים האסורים תמצאו בתנאי השימוש.' },
      { q: 'איך עובדים שידורים חיים?', a: 'פתחו שידור מלשונית "מכירה". הציגו את המוצרים, דברו עם הצופים בזמן אמת ומכרו בשידור חי. שידור יכול להימשך עד 4 שעות.' },
      { q: 'איך מטפלים במשלוחים?', a: 'ל-ShaPop אין חברת שילוח מובנית. אחרי המכירה, צרו קשר עם הקונה (WhatsApp או אימייל) כדי לתאם מסירה פנים אל פנים, אם אתם מאפשרים, או שלחו את הפריט בדואר של המדינה שלכם. אתם קובעים את דמי המשלוח ומטפלים בהליכי המכס בהזמנות בינלאומיות. כדי לקבל תשלום, העלו תמונה של תוך החבילה ותמונה של אישור המשלוח החתום.' },
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

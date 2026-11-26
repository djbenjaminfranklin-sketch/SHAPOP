/* Accueil, pages Acheter / Vendre et Aide : textes alignés sur les règles actuelles (26/11/2026).
   Plus de Bit, plus d'« argent bloqué jusqu'à la remise », plus de « payé 3 jours après les photos ».
   Envoi suivi + 2 photos + numéro de suivi ; l'acheteur confirme ; 24 h pour signaler ; 10 jours sans nouvelles.
   Le code à 4 chiffres reste pour la remise en main propre uniquement. Chargé APRÈS les autres fichiers. */
(function () {
  var T = window.SP_T = window.SP_T || {};
  function set(l, path, v) {
    var o = T[l] = T[l] || {}, k = path.split('.');
    for (var i = 0; i < k.length - 1; i++) { if (o[k[i]] == null) o[k[i]] = /^\d+$/.test(k[i + 1]) ? [] : {}; o = o[k[i]]; }
    o[k[k.length - 1]] = v;
  }
  function add(l, m) { for (var p in m) set(l, p, m[p]); }

  add('en', {
    'home.metaDesc': 'Buy and sell live: watch, chat, bid and pay in the app. The seller is only paid once you have received the item and everything is fine.',
    'hero.t1': 'Seller paid once you have the item',
    'hero.t2': 'Card and Apple Pay',
    'perks.p1p': 'Card or Apple Pay, right in the app.',
    'prot.intro': 'Nobody pays into the void. When you buy, your payment is reserved. The seller is only paid once you have received the item and confirmed it, or once the time to report a problem has passed.',
    'prot.f2b': 'Your payment is reserved',
    'prot.f3s': 'you confirm receipt in the app',
    'prot.f4s': 'after your OK, or 24 h without a report',
    'hand.title': 'Pickup: a 4-digit code',
    'hand.p': 'If the seller allows pickup, you meet wherever suits you. You check the item on the spot, then give the 4-digit code shown in your app. Once the code is given, the sale is accepted and the seller is paid.',
    'code.locked': 'Payment reserved',
    'post.title': 'Tracked shipping, you confirm receipt',
    'post.p': 'The seller sets the shipping cost (the app suggests a price) and you pay it at checkout. They send the parcel by tracked post, after taking 2 photos and entering the tracking number. When the parcel arrives, you confirm in the app:',
    'post.c1': '“Everything is fine”: the seller is paid right away',
    'post.c2': 'A problem? You have 24 hours after receipt to report it, with photos',
    'post.c3': 'No news 10 days after shipping: the sale is accepted',
    'proof.send': 'Confirm shipment',
    'proof.sent': 'Sent ✓ Tracking number saved',
    'disp.p': 'Item never arrived or not as described: report it from your order within 24 hours of receipt, with photos, or write to {mail}. The seller replies with their photos within 48 hours and our team decides. A return is only possible if the problem was reported in time.',
    'buy.s3p': 'By card or Apple Pay. Your payment is reserved: the seller only gets it once you have the item.',
    'buy.s5p': 'By tracked post (shipping set by the seller, paid at checkout) or in person with your 4-digit code. When you receive it, confirm in the app: you have 24 hours to report a problem.',
    'sell.s3p': 'By post, take 2 photos (inside of the parcel and post office receipt) and enter the tracking number. You are paid as soon as the buyer confirms everything is fine, or 24 hours after delivery without a report, or 10 days after sending without news. In person, the buyer’s 4-digit code pays you straight away.',
    'faq.items.1': ['When does the seller get the money?', 'As soon as the buyer confirms everything is fine. Otherwise 24 hours after receipt without a reported problem, or 10 days after sending without news. In person, as soon as the buyer gives their 4-digit code.'],
    'faq.items.2': ['How long do I have to report a problem?', '24 hours after receiving the parcel (or after its “delivered” date when the post office tracks it). Report it from your order, with photos. A return is only possible if you reported it within those 24 hours.'],
    'faq.items.4': ['Where is ShaPop available?', 'On iPhone and Android, worldwide, in 5 languages: English, French, Spanish, Russian and Hebrew.'],
    'support.h2p': 'The seller is only paid once you confirm receipt, or after 24 hours without a reported problem. Your money is protected until then.',
    'support.q1.0.1': 'Bank card or Apple Pay. Payment always happens in the app: never pay a seller outside ShaPop, you would lose the protection.',
    'support.q3.0.1': 'By post: send by tracked post, take the 2 photos (inside of the parcel and post office receipt) and enter the tracking number. You are paid as soon as the buyer confirms everything is fine, or 24 hours after delivery without a report, or 10 days after sending without news. In person: the buyer’s 4-digit code pays you straight away. The ShaPop commission is deducted.'
  });

  add('fr', {
    'home.metaDesc': 'Achète et vends en direct : tu regardes, tu discutes, tu enchéris et tu paies dans l’appli. Le vendeur n’est payé qu’une fois l’article reçu et conforme.',
    'hero.t1': 'Vendeur payé quand tu as l’article',
    'hero.t2': 'Carte bancaire et Apple Pay',
    'perks.p1p': 'Carte bancaire ou Apple Pay, directement dans l’appli.',
    'prot.intro': 'Personne ne paie dans le vide. Quand tu achètes, ton paiement est réservé. Le vendeur n’est payé qu’une fois l’article reçu et confirmé par toi, ou une fois passé le délai pour signaler un problème.',
    'prot.f2b': 'Ton paiement est réservé',
    'prot.f3s': 'tu confirmes la réception dans l’appli',
    'prot.f4s': 'après ton accord, ou 24 h sans signalement',
    'hand.title': 'En main propre : un code à 4 chiffres',
    'hand.p': 'Si le vendeur accepte la remise en main propre, vous vous retrouvez où ça vous arrange. Tu vérifies l’article sur place, puis tu donnes le code à 4 chiffres affiché dans ton appli. Une fois le code donné, la vente est acceptée et le vendeur est payé.',
    'code.locked': 'Paiement réservé',
    'post.title': 'Envoi suivi, tu confirmes la réception',
    'post.p': 'Le vendeur fixe ses frais de port (l’appli lui suggère un prix) et tu les paies au moment de l’achat. Il envoie le colis en suivi, après avoir pris 2 photos et saisi le numéro de suivi. Quand le colis arrive, tu confirmes dans l’appli :',
    'post.c1': '« Tout est conforme » : le vendeur est payé tout de suite',
    'post.c2': 'Un problème ? Tu as 24 heures après la réception pour le signaler, avec photos',
    'post.c3': 'Sans nouvelles 10 jours après l’envoi : la vente est acceptée',
    'proof.send': 'Confirmer l’envoi',
    'proof.sent': 'Envoyé ✓ Numéro de suivi enregistré',
    'disp.p': 'Article jamais arrivé ou pas conforme à l’annonce : signale-le depuis ta commande dans les 24 heures après la réception, avec photos, ou écris à {mail}. Le vendeur répond avec ses photos sous 48 heures et notre équipe tranche. Un retour n’est possible que si le problème a été signalé à temps.',
    'buy.s3p': 'Par carte bancaire ou Apple Pay. Ton paiement est réservé : le vendeur ne le reçoit qu’une fois l’article entre tes mains.',
    'buy.s5p': 'Par envoi suivi (frais de port fixés par le vendeur, payés à l’achat) ou en main propre avec ton code à 4 chiffres. À la réception, tu confirmes dans l’appli : tu as 24 heures pour signaler un problème.',
    'sell.s3p': 'Par la poste, tu prends 2 photos (intérieur du colis et reçu de la poste) et tu saisis le numéro de suivi. Tu es payé dès que l’acheteur confirme que tout est conforme, ou 24 heures après la livraison sans signalement, ou 10 jours après l’envoi sans nouvelles. En main propre, le code à 4 chiffres de l’acheteur te paie tout de suite.',
    'faq.items.1': ['Quand le vendeur reçoit-il l’argent ?', 'Dès que l’acheteur confirme que tout est conforme. Sinon, 24 heures après la réception sans problème signalé, ou 10 jours après l’envoi sans nouvelles. En main propre, dès que l’acheteur donne son code à 4 chiffres.'],
    'faq.items.2': ['Combien de temps pour signaler un problème ?', '24 heures après la réception du colis (ou après sa date « livré » quand la poste le suit). Signale-le depuis ta commande, avec photos. Un retour n’est possible que si tu l’as signalé dans ces 24 heures.'],
    'faq.items.4': ['Où ShaPop est-il disponible ?', 'Sur iPhone et Android, dans le monde entier, en 5 langues : anglais, français, espagnol, russe et hébreu.'],
    'support.h2p': 'Le vendeur n’est payé qu’une fois que tu confirmes la réception, ou après 24 heures sans problème signalé. Ton argent reste protégé jusque-là.',
    'support.q1.0.1': 'Carte bancaire ou Apple Pay. Le paiement se fait toujours dans l’appli : ne paie jamais un vendeur en dehors de ShaPop, tu perdrais la protection.',
    'support.q3.0.1': 'Par la poste : envoie en suivi, prends les 2 photos (intérieur du colis et reçu de la poste) et saisis le numéro de suivi. Tu es payé dès que l’acheteur confirme que tout est conforme, ou 24 heures après la livraison sans signalement, ou 10 jours après l’envoi sans nouvelles. En main propre : le code à 4 chiffres de l’acheteur te paie tout de suite. La commission ShaPop est déduite.'
  });

  add('es', {
    'home.metaDesc': 'Compra y vende en directo: mira, chatea, puja y paga en la app. El vendedor solo cobra cuando has recibido el artículo y todo está bien.',
    'hero.t1': 'El vendedor cobra cuando tienes el artículo',
    'hero.t2': 'Tarjeta y Apple Pay',
    'perks.p1p': 'Tarjeta o Apple Pay, directamente en la app.',
    'prot.intro': 'Nadie paga a ciegas. Cuando compras, tu pago queda reservado. El vendedor solo cobra cuando has recibido el artículo y lo confirmas, o cuando ha pasado el plazo para avisar de un problema.',
    'prot.f2b': 'Tu pago queda reservado',
    'prot.f3s': 'confirmas la recepción en la app',
    'prot.f4s': 'tras tu visto bueno, o 24 h sin reclamación',
    'hand.title': 'En mano: un código de 4 cifras',
    'hand.p': 'Si el vendedor acepta la entrega en mano, quedáis donde os venga bien. Revisas el artículo allí mismo y luego das el código de 4 cifras que muestra tu app. En cuanto das el código, la venta queda aceptada y el vendedor cobra.',
    'code.locked': 'Pago reservado',
    'post.title': 'Envío con seguimiento, tú confirmas la recepción',
    'post.p': 'El vendedor fija el coste del envío (la app le sugiere un precio) y tú lo pagas al comprar. Envía el paquete con seguimiento, tras hacer 2 fotos e introducir el número de seguimiento. Cuando llega el paquete, confirmas en la app:',
    'post.c1': '«Todo está bien»: el vendedor cobra en el acto',
    'post.c2': '¿Algún problema? Tienes 24 horas tras la recepción para avisar, con fotos',
    'post.c3': 'Sin noticias 10 días después del envío: la venta queda aceptada',
    'proof.send': 'Confirmar envío',
    'proof.sent': 'Enviado ✓ Número de seguimiento guardado',
    'disp.p': 'Artículo que no llega o que no coincide con el anuncio: avísalo desde tu pedido en las 24 horas siguientes a la recepción, con fotos, o escribe a {mail}. El vendedor responde con sus fotos en 48 horas y nuestro equipo decide. Solo se acepta una devolución si el problema se avisó a tiempo.',
    'buy.s3p': 'Con tarjeta o Apple Pay. Tu pago queda reservado: el vendedor solo lo recibe cuando tienes el artículo.',
    'buy.s5p': 'Por envío con seguimiento (coste fijado por el vendedor y pagado al comprar) o en mano con tu código de 4 cifras. Al recibirlo, confirmas en la app: tienes 24 horas para avisar de un problema.',
    'sell.s3p': 'Por correo, haz 2 fotos (interior del paquete y recibo de correos) e introduce el número de seguimiento. Cobras en cuanto el comprador confirma que todo está bien, o 24 horas después de la entrega sin reclamación, o 10 días después del envío sin noticias. En mano, el código de 4 cifras del comprador te paga en el acto.',
    'faq.items.1': ['¿Cuándo cobra el vendedor?', 'En cuanto el comprador confirma que todo está bien. Si no, 24 horas después de la recepción sin problemas avisados, o 10 días después del envío sin noticias. En mano, en cuanto el comprador da su código de 4 cifras.'],
    'faq.items.2': ['¿Cuánto tiempo tengo para avisar de un problema?', '24 horas tras recibir el paquete (o tras su fecha de «entregado» cuando correos lo sigue). Avísalo desde tu pedido, con fotos. Solo se acepta una devolución si avisaste en esas 24 horas.'],
    'faq.items.4': ['¿Dónde está disponible ShaPop?', 'En iPhone y Android, en todo el mundo, en 5 idiomas: inglés, francés, español, ruso y hebreo.'],
    'support.h2p': 'El vendedor solo cobra cuando confirmas la recepción, o tras 24 horas sin problemas avisados. Tu dinero está protegido hasta entonces.',
    'support.q1.0.1': 'Tarjeta o Apple Pay. El pago siempre se hace en la app: nunca pagues a un vendedor fuera de ShaPop, perderías la protección.',
    'support.q3.0.1': 'Por correo: envía con seguimiento, haz las 2 fotos (interior del paquete y recibo de correos) e introduce el número de seguimiento. Cobras en cuanto el comprador confirma que todo está bien, o 24 horas después de la entrega sin reclamación, o 10 días después del envío sin noticias. En mano: el código de 4 cifras del comprador te paga en el acto. Se descuenta la comisión de ShaPop.'
  });

  add('ru', {
    'home.metaDesc': 'Покупай и продавай в прямом эфире: смотри, общайся, делай ставки и плати в приложении. Продавец получает деньги только после того, как ты получил товар и всё в порядке.',
    'hero.t1': 'Продавец получает деньги, когда товар у тебя',
    'hero.t2': 'Карта и Apple Pay',
    'perks.p1p': 'Картой или через Apple Pay, прямо в приложении.',
    'prot.intro': 'Никто не платит вслепую. Когда ты покупаешь, оплата резервируется. Продавец получает деньги только после того, как ты получил товар и подтвердил это, или когда истёк срок, чтобы сообщить о проблеме.',
    'prot.f2b': 'Оплата зарезервирована',
    'prot.f3s': 'ты подтверждаешь получение в приложении',
    'prot.f4s': 'после твоего подтверждения или через 24 ч без жалоб',
    'hand.title': 'Лично: код из 4 цифр',
    'hand.p': 'Если продавец согласен на личную встречу, встречаетесь где удобно. Ты проверяешь товар на месте, затем называешь код из 4 цифр из своего приложения. Как только код назван, сделка принята и продавец получает деньги.',
    'code.locked': 'Оплата зарезервирована',
    'post.title': 'Отправка с отслеживанием, ты подтверждаешь получение',
    'post.p': 'Продавец сам устанавливает стоимость доставки (приложение подсказывает цену), а ты оплачиваешь её при покупке. Он отправляет посылку с отслеживанием, сделав 2 фото и указав трек-номер. Когда посылка приходит, ты подтверждаешь в приложении:',
    'post.c1': '«Всё в порядке»: продавец сразу получает деньги',
    'post.c2': 'Проблема? У тебя 24 часа после получения, чтобы сообщить о ней с фото',
    'post.c3': 'Нет новостей 10 дней после отправки: сделка принята',
    'proof.send': 'Подтвердить отправку',
    'proof.sent': 'Отправлено ✓ Трек-номер сохранён',
    'disp.p': 'Товар не пришёл или не соответствует описанию: сообщи об этом из заказа в течение 24 часов после получения, с фото, или напиши на {mail}. Продавец отвечает своими фото в течение 48 часов, и наша команда принимает решение. Возврат возможен, только если о проблеме сообщили вовремя.',
    'buy.s3p': 'Картой или через Apple Pay. Оплата резервируется: продавец получит её, только когда товар будет у тебя.',
    'buy.s5p': 'Почтой с отслеживанием (стоимость доставки устанавливает продавец, оплачивается при покупке) или лично с кодом из 4 цифр. При получении подтверди в приложении: у тебя 24 часа, чтобы сообщить о проблеме.',
    'sell.s3p': 'При отправке почтой сделай 2 фото (содержимое посылки и почтовая квитанция) и укажи трек-номер. Ты получаешь деньги, как только покупатель подтвердит, что всё в порядке, или через 24 часа после доставки без жалоб, или через 10 дней после отправки без новостей. При личной встрече код покупателя из 4 цифр сразу приносит тебе оплату.',
    'faq.items.1': ['Когда продавец получает деньги?', 'Как только покупатель подтвердит, что всё в порядке. Иначе — через 24 часа после получения без жалоб или через 10 дней после отправки без новостей. При личной встрече — как только покупатель назовёт код из 4 цифр.'],
    'faq.items.2': ['Сколько времени, чтобы сообщить о проблеме?', '24 часа после получения посылки (или после даты «доставлено», если почта её отслеживает). Сообщи из заказа, с фото. Возврат возможен, только если ты сообщил в эти 24 часа.'],
    'faq.items.4': ['Где доступен ShaPop?', 'На iPhone и Android, по всему миру, на 5 языках: английском, французском, испанском, русском и иврите.'],
    'support.h2p': 'Продавец получает деньги только после того, как ты подтвердишь получение, или через 24 часа без жалоб. До этого твои деньги защищены.',
    'support.q1.0.1': 'Банковская карта или Apple Pay. Оплата всегда происходит в приложении: никогда не плати продавцу вне ShaPop, иначе потеряешь защиту.',
    'support.q3.0.1': 'Почтой: отправляй с отслеживанием, сделай 2 фото (содержимое посылки и почтовая квитанция) и укажи трек-номер. Ты получаешь деньги, как только покупатель подтвердит, что всё в порядке, или через 24 часа после доставки без жалоб, или через 10 дней после отправки без новостей. Лично: код покупателя из 4 цифр сразу приносит тебе оплату. Комиссия ShaPop вычитается.'
  });

  add('he', {
    'home.metaDesc': 'קונים ומוכרים בשידור חי: צופים, מדברים, מציעים ומשלמים באפליקציה. המוכר מקבל את הכסף רק אחרי שקיבלת את הפריט והכול תקין.',
    'hero.t1': 'המוכר מקבל תשלום כשהפריט אצלך',
    'hero.t2': 'כרטיס אשראי ו־Apple Pay',
    'perks.p1p': 'כרטיס אשראי או Apple Pay, ישירות באפליקציה.',
    'prot.intro': 'אף אחד לא משלם באוויר. כשאתה קונה, התשלום שלך שמור. המוכר מקבל את הכסף רק אחרי שקיבלת את הפריט ואישרת, או אחרי שעבר הזמן לדווח על בעיה.',
    'prot.f2b': 'התשלום שלך שמור',
    'prot.f3s': 'אתה מאשר את הקבלה באפליקציה',
    'prot.f4s': 'אחרי האישור שלך, או 24 שעות בלי דיווח',
    'hand.title': 'מסירה ידנית: קוד בן 4 ספרות',
    'hand.p': 'אם המוכר מאפשר איסוף עצמי, נפגשים איפה שנוח לכם. בודקים את הפריט במקום, ואז נותנים את הקוד בן 4 הספרות שמופיע באפליקציה. ברגע שהקוד ניתן, המכירה מאושרת והמוכר מקבל תשלום.',
    'code.locked': 'התשלום שמור',
    'post.title': 'משלוח עם מעקב, אתה מאשר את הקבלה',
    'post.p': 'המוכר קובע את דמי המשלוח (האפליקציה מציעה מחיר) ואתה משלם אותם בזמן הקנייה. הוא שולח את החבילה בדואר עם מעקב, אחרי שצילם 2 תמונות והזין את מספר המעקב. כשהחבילה מגיעה, אתה מאשר באפליקציה:',
    'post.c1': '״הכול תקין״: המוכר מקבל תשלום מיד',
    'post.c2': 'יש בעיה? יש לך 24 שעות מהקבלה לדווח עליה, עם תמונות',
    'post.c3': 'אין חדשות 10 ימים אחרי המשלוח: המכירה מאושרת',
    'proof.send': 'אישור משלוח',
    'proof.sent': 'נשלח ✓ מספר המעקב נשמר',
    'disp.p': 'הפריט לא הגיע או לא תואם למודעה: דווח על כך מההזמנה תוך 24 שעות מהקבלה, עם תמונות, או כתוב ל־{mail}. המוכר משיב עם התמונות שלו תוך 48 שעות והצוות שלנו מכריע. החזרה אפשרית רק אם הבעיה דווחה בזמן.',
    'buy.s3p': 'בכרטיס אשראי או ב־Apple Pay. התשלום שלך שמור: המוכר מקבל אותו רק כשהפריט אצלך.',
    'buy.s5p': 'במשלוח עם מעקב (דמי משלוח שקבע המוכר, משולמים בקנייה) או במסירה ידנית עם הקוד בן 4 הספרות. כשהפריט מגיע, מאשרים באפליקציה: יש לך 24 שעות לדווח על בעיה.',
    'sell.s3p': 'במשלוח בדואר, צלם 2 תמונות (תוכן החבילה וקבלת הדואר) והזן את מספר המעקב. אתה מקבל תשלום ברגע שהקונה מאשר שהכול תקין, או 24 שעות אחרי המסירה בלי דיווח, או 10 ימים אחרי המשלוח בלי חדשות. במסירה ידנית, הקוד בן 4 הספרות של הקונה משלם לך מיד.',
    'faq.items.1': ['מתי המוכר מקבל את הכסף?', 'ברגע שהקונה מאשר שהכול תקין. אחרת, 24 שעות אחרי הקבלה בלי דיווח על בעיה, או 10 ימים אחרי המשלוח בלי חדשות. במסירה ידנית, ברגע שהקונה נותן את הקוד בן 4 הספרות.'],
    'faq.items.2': ['כמה זמן יש לי לדווח על בעיה?', '24 שעות מקבלת החבילה (או מתאריך ״נמסר״ כשהדואר עוקב אחריה). מדווחים מההזמנה, עם תמונות. החזרה אפשרית רק אם דיווחת בתוך 24 השעות האלה.'],
    'faq.items.4': ['איפה ShaPop זמינה?', 'ב־iPhone וב־Android, בכל העולם, ב־5 שפות: אנגלית, צרפתית, ספרדית, רוסית ועברית.'],
    'support.h2p': 'המוכר מקבל תשלום רק אחרי שאתה מאשר את הקבלה, או אחרי 24 שעות בלי דיווח על בעיה. עד אז הכסף שלך מוגן.',
    'support.q1.0.1': 'כרטיס אשראי או Apple Pay. התשלום תמיד מתבצע באפליקציה: לעולם אל תשלם למוכר מחוץ ל־ShaPop, אחרת תאבד את ההגנה.',
    'support.q3.0.1': 'בדואר: שלח עם מעקב, צלם את 2 התמונות (תוכן החבילה וקבלת הדואר) והזן את מספר המעקב. אתה מקבל תשלום ברגע שהקונה מאשר שהכול תקין, או 24 שעות אחרי המסירה בלי דיווח, או 10 ימים אחרי המשלוח בלי חדשות. במסירה ידנית: הקוד בן 4 הספרות של הקונה משלם לך מיד. העמלה של ShaPop מנוכה.'
  });
})();

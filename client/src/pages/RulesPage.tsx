// Page « Règles » : ce que l'acheteur et le vendeur doivent savoir (décisions du 25/11/2026,
// articles de luxe le 26/11/2026, statut particulier/pro, droits légaux et cadeaux le 28/11/2026).
// Mêmes textes que le site (site/assets/i18n-legal-rules.js, clé « rules »).
// Mêmes textes que le site (site/assets/i18n-legal-rules.js, clé « rules »).
import { useNavigate } from 'react-router-dom'
import { getDir, tr } from '../lib/i18n'

type Section = { title: string; items: string[] }
type Content = { title: string; intro: string; back: string; buyer: Section; seller: Section; pickup: Section; luxury: Section }

const content: Record<'en' | 'fr' | 'es' | 'ru' | 'he', Content> = {
  en: {
    title: 'Buying and selling rules', back: 'Back',
    intro: 'These rules protect both the buyer and the seller. They apply to every order.',
    buyer: { title: 'If you buy', items: [
      'You pay at the end of the auction or when you tap “Buy now”. The payment is collected at the time of purchase, on behalf of the seller. You choose pickup or delivery by post.',
      'As soon as you receive your parcel, confirm it in the app. “Everything is fine” pays the seller right away.',
      'If something is wrong, you have 24 hours after receipt to report it, with photos. When the post office tracks the parcel, the 24 hours start from its “delivered” date, even if you have not confirmed.',
      'After those 24 hours without a report, the seller is paid.',
      'Without news 10 days after the parcel was sent, the seller is paid.',
      'The 24 hours are only for ShaPop protection. They do not reduce your legal rights in any way (14-day withdrawal with a professional seller, conformity guarantee, hidden defects).',
      'After 2 disputes judged unfounded, you can no longer use ShaPop protection. This never affects your legal rights, and a person reviews it on request.',
      'Live giveaways are free, with no purchase needed, for people aged 18 and over with an account. The seller asks a question: the first right answer wins (3 tries per gift). Apple and Google are not organisers or partners.',
    ] },
    seller: { title: 'If you sell', items: [
      'Say whether you sell as a private person or as a professional. A “Private” or “Pro” badge is shown on each of your lives. A professional gives their trade name, registration number and address, shown to buyers before payment. Saying you are private when you sell as a business leads to suspension.',
      'Send the item within the time you chose. Otherwise the order is cancelled and the buyer refunded.',
      'Send by tracked post. Before confirming the shipment, take the 2 photos (inside of the parcel with the item, and the post office receipt) and type the tracking number. The photos protect you if there is a dispute.',
      'You are paid 24 hours after the buyer confirms receipt (or right away if they say everything is fine), or 10 days after sending without news from the buyer; 30 days for luxury items.',
      'If the buyer reports a problem, the money stays on hold. Reply with your photos within 48 hours; our team decides.',
      '1st dispute lost: warning. 2nd: for 30 days, you are only paid once the buyer has received the item. 3rd: your account is closed.',
      'As a professional, your buyers can cancel within 14 days after receipt, without a reason. As a private seller, you choose your return policy (it can be “no returns”).',
    ] },
    pickup: { title: 'Pickup in person', items: [
      'The buyer checks the item on the spot, then gives their 4-digit code. Once the code is given, the handover is confirmed.',
    ] },
    luxury: { title: 'Luxury items (500 € or more, or a major brand)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'An item is a luxury item if it costs €500 or more (or the equivalent in your currency, for example ₪2,000) or if it is from a major luxury brand (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). The seller can also tick “luxury brand item” themselves. The €500 threshold applies to the price of one single item, never to the order total: several cheap items bought together are not a luxury item.', // i18n-ignore (texte légal : identité de l’exploitant en France, montants fixés en euros)
      'To list it, the seller must tick: “I certify that this item is authentic. I know that selling a counterfeit is a crime and that if it is fake I will have to refund the buyer, pay a penalty of 50% of the price, and that my account will be closed.” Without this box, the listing is refused.',
      'The seller is paid 30 days after receipt, even if the buyer says “Everything is fine”. Without confirmed receipt, the 10 days without news become 30 days.',
      'The buyer has 30 days after receipt to report a counterfeit, with proof (photos, expert opinion, the brand’s opinion). The listing is then removed and the seller’s payout for this sale is frozen. The 24 hours still apply to other problems.',
      'The seller has 7 days to answer in the app: admit it, or contest it with proof (invoice, certificate, photos). If they contest, a person from ShaPop looks at the evidence of both sides. If they admit it or do not answer: the buyer is fully refunded, shipping included; the seller owes a penalty of 50% of the sale price (at most the sale price), withheld from what ShaPop owes them; their account is closed for good. The seller can always contest by email at support@shapop.app. The buyer can file a police complaint.',
    ] },
  },
  fr: {
    title: 'Règles d’achat et de vente', back: 'Retour',
    intro: 'Ces règles protègent l’acheteur comme le vendeur. Elles valent pour toutes les commandes.',
    buyer: { title: 'Si tu achètes', items: [
      'Tu paies à la fin de l’enchère ou quand tu touches « Acheter maintenant ». Le paiement est encaissé au moment de l’achat, au nom et pour le compte du vendeur. Tu choisis la remise en main propre ou l’envoi par la poste.',
      'Dès que tu reçois ton colis, confirme-le dans l’appli. « Tout est conforme » paie le vendeur tout de suite.',
      'Si quelque chose ne va pas, tu as 24 h après la réception pour le signaler, photos à l’appui. Quand la poste suit le colis, les 24 h partent du « livré » de la poste, même si tu n’as rien confirmé.',
      'Passé ces 24 h sans signalement, le vendeur est payé.',
      'Sans nouvelles 10 jours après l’envoi du colis, le vendeur est payé.',
      'Ces 24 h servent uniquement à la protection ShaPop. Ce délai ne réduit en rien tes droits légaux (rétractation de 14 jours avec un vendeur pro, garantie de conformité, vices cachés).',
      'Après 2 litiges jugés infondés, tu ne peux plus utiliser la protection ShaPop. Cela ne touche jamais tes droits légaux, et une personne réexamine sur demande.',
      'Les cadeaux en direct sont gratuits, sans obligation d’achat, pour les 18 ans et plus ayant un compte. Le vendeur pose une question : la première bonne réponse gagne (3 essais par cadeau). Apple et Google ne sont ni organisateurs ni partenaires.',
    ] },
    seller: { title: 'Si tu vends', items: [
      'Déclare si tu vends en tant que particulier ou professionnel. Une pastille « Particulier » ou « Pro » est affichée sur chacun de tes directs. Un pro indique son nom commercial, son numéro d’immatriculation et son adresse, montrés aux acheteurs avant le paiement. Se déclarer particulier en vendant à titre pro entraîne la suspension.',
      'Envoie l’article dans le délai que tu as choisi. Sinon, la commande est annulée et l’acheteur remboursé.',
      'Envoie en envoi suivi. Avant de valider l’envoi, prends les 2 photos (intérieur du colis avec l’article, et bordereau de la poste) et tape le numéro de suivi. Les photos te protègent en cas de litige.',
      'Tu es payé 24 h après la réception confirmée par l’acheteur (ou tout de suite s’il confirme que tout est conforme), ou 10 jours après l’envoi sans nouvelles de l’acheteur ; 30 jours pour les articles de luxe.',
      'Si l’acheteur signale un problème, l’argent reste en attente. Réponds avec tes photos sous 48 h ; notre équipe tranche.',
      '1er litige perdu : avertissement. 2e : pendant 30 jours, tu n’es payé qu’une fois l’article reçu par l’acheteur. 3e : ton compte est fermé.',
      'Si tu es pro, tes acheteurs peuvent annuler dans les 14 jours après la réception, sans motif. Si tu es particulier, tu choisis ta politique de retour (elle peut être « pas de retour »).',
    ] },
    pickup: { title: 'Remise en main propre', items: [
      'L’acheteur vérifie l’article sur place, puis donne son code à 4 chiffres. Une fois le code donné, la remise est confirmée.',
    ] },
    luxury: { title: 'Articles de luxe (500 € ou plus, ou grande marque)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Un article est « de luxe » s’il coûte 500 € ou plus (ou l’équivalent dans ta devise, par exemple 2 000 ₪) ou s’il est d’une grande marque de luxe (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). Le vendeur peut aussi cocher lui-même « article de marque de luxe ». Le seuil de 500 € s’applique au prix d’un seul article, jamais au total de la commande : plusieurs articles bon marché achetés ensemble ne font pas un article de luxe.', // i18n-ignore (texte légal : identité de l’exploitant en France, montants fixés en euros)
      'Pour le mettre en vente, le vendeur doit cocher : « Je certifie que cet article est authentique. Je sais que vendre une contrefaçon est un délit et qu’en cas de faux je devrai rembourser l’acheteur, payer une pénalité de 50 % du prix, et que mon compte sera fermé. » Sans cette case, la mise en vente est refusée.',
      'Le vendeur est payé 30 jours après la réception, même si l’acheteur dit « Tout est conforme ». Sans réception confirmée, les 10 jours sans nouvelles deviennent 30 jours.',
      'L’acheteur a 30 jours après la réception pour signaler une contrefaçon, avec une preuve (photos, expertise, avis de la marque). L’annonce est alors retirée et le versement au vendeur pour cette vente est gelé. Le délai de 24 h reste valable pour les autres problèmes.',
      'Le vendeur a 7 jours pour répondre dans l’appli : reconnaître, ou contester avec des preuves (facture, certificat, photos). S’il conteste, une personne de ShaPop examine les preuves des deux parties. S’il reconnaît ou ne répond pas : l’acheteur est remboursé en entier, frais de port compris ; le vendeur doit une pénalité de 50 % du prix de vente (au plus le prix de vente), retenue sur ce que ShaPop lui doit ; son compte est fermé définitivement. Le vendeur peut toujours contester par e-mail à support@shapop.app. L’acheteur peut porter plainte.',
    ] },
  },
  es: {
    title: 'Reglas de compra y venta', back: 'Volver',
    intro: 'Estas reglas protegen tanto al comprador como al vendedor. Se aplican a todos los pedidos.',
    buyer: { title: 'Si compras', items: [
      'Pagas al terminar la subasta o cuando tocas «Comprar ya». El pago se cobra en el momento de la compra, en nombre del vendedor. Eliges entrega en mano o envío por correo.',
      'En cuanto recibas el paquete, confírmalo en la app. «Todo está bien» paga al vendedor enseguida.',
      'Si algo va mal, tienes 24 h tras la recepción para avisar, con fotos. Cuando correos hace el seguimiento del paquete, las 24 h empiezan desde su fecha de «entregado», aunque no hayas confirmado.',
      'Pasadas esas 24 h sin aviso, el vendedor cobra.',
      'Sin noticias 10 días después del envío del paquete, el vendedor cobra.',
      'Las 24 h solo sirven para la protección ShaPop. No reducen en nada tus derechos legales (desistimiento de 14 días con un vendedor profesional, garantía de conformidad, vicios ocultos).',
      'Tras 2 disputas consideradas infundadas, ya no puedes usar la protección ShaPop. Esto nunca afecta a tus derechos legales, y una persona lo revisa si lo pides.',
      'Los regalos en directo son gratis, sin obligación de compra, para personas de 18 años o más con una cuenta. El vendedor hace una pregunta: gana la primera respuesta correcta (3 intentos por regalo). Apple y Google no son organizadores ni socios.',
    ] },
    seller: { title: 'Si vendes', items: [
      'Indica si vendes como particular o como profesional. Una insignia «Particular» o «Pro» aparece en cada uno de tus directos. Un profesional indica su nombre comercial, su número de registro y su dirección, que los compradores ven antes de pagar. Decir que eres particular cuando vendes como profesional supone la suspensión.',
      'Envía el artículo en el plazo que elegiste. Si no, el pedido se cancela y se reembolsa al comprador.',
      'Envía por correo con seguimiento. Antes de confirmar el envío, haz las 2 fotos (interior del paquete con el artículo y resguardo de correos) y escribe el número de seguimiento. Las fotos te protegen si hay una disputa.',
      'Cobras 24 h después de que el comprador confirme la recepción (o enseguida si dice que todo está bien), o 10 días después del envío sin noticias del comprador; 30 días para los artículos de lujo.',
      'Si el comprador avisa de un problema, el dinero queda retenido. Responde con tus fotos en 48 h; nuestro equipo decide.',
      '1.ª disputa perdida: aviso. 2.ª: durante 30 días, solo cobras cuando el comprador ha recibido el artículo. 3.ª: tu cuenta se cierra.',
      'Como profesional, tus compradores pueden cancelar en los 14 días siguientes a la recepción, sin dar motivo. Como particular, eliges tu política de devoluciones (puede ser «sin devoluciones»).',
    ] },
    pickup: { title: 'Entrega en mano', items: [
      'El comprador revisa el artículo allí mismo y luego da su código de 4 cifras. En cuanto da el código, la entrega queda confirmada.',
    ] },
    luxury: { title: 'Artículos de lujo (500 € o más, o gran marca)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Un artículo es «de lujo» si cuesta 500 € o más (o su equivalente en tu moneda, por ejemplo 2000 ₪) o si es de una gran marca de lujo (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). El vendedor también puede marcar él mismo «artículo de marca de lujo». El umbral de 500 € se aplica al precio de un solo artículo, nunca al total del pedido: varios artículos baratos comprados juntos no son un artículo de lujo.', // i18n-ignore (texte légal : identité de l’exploitant en France, montants fixés en euros)
      'Para ponerlo a la venta, el vendedor debe marcar: «Certifico que este artículo es auténtico. Sé que vender una falsificación es un delito y que, si es falso, tendré que reembolsar al comprador, pagar una penalización del 50 % del precio, y que mi cuenta será cerrada.» Sin esta casilla, la publicación se rechaza.',
      'El vendedor cobra 30 días después de la recepción, aunque el comprador diga «Todo está bien». Sin recepción confirmada, los 10 días sin noticias pasan a 30 días.',
      'El comprador tiene 30 días tras la recepción para denunciar una falsificación, con pruebas (fotos, peritaje, opinión de la marca). El anuncio se retira y el pago al vendedor por esa venta queda congelado. Las 24 h siguen valiendo para los demás problemas.',
      'El vendedor tiene 7 días para responder en la app: reconocerlo, o impugnarlo con pruebas (factura, certificado, fotos). Si lo impugna, una persona de ShaPop examina las pruebas de las dos partes. Si lo reconoce o no responde: el comprador recibe el reembolso completo, envío incluido; el vendedor debe una penalización del 50 % del precio de venta (como máximo el precio de venta), que se retiene de lo que ShaPop le debe; su cuenta se cierra para siempre. El vendedor siempre puede impugnar por correo a support@shapop.app. El comprador puede denunciar ante la policía.',
    ] },
  },
  ru: {
    title: 'Правила покупки и продажи', back: 'Назад',
    intro: 'Эти правила защищают и покупателя, и продавца. Они действуют для всех заказов.',
    buyer: { title: 'Если ты покупаешь', items: [
      'Ты платишь в конце аукциона или когда нажимаешь «Купить сейчас». Оплата списывается в момент покупки, от имени продавца. Ты выбираешь личную передачу или отправку почтой.',
      'Как только получишь посылку, подтверди это в приложении. «Всё в порядке» — продавец сразу получает деньги.',
      'Если что-то не так, у тебя есть 24 часа после получения, чтобы сообщить об этом, с фото. Когда почта отслеживает посылку, 24 часа считаются с даты «доставлено», даже если ты ничего не подтвердил.',
      'Если за эти 24 часа ты ни о чём не сообщил, продавец получает деньги.',
      'Если через 10 дней после отправки посылки от тебя нет вестей, продавец получает деньги.',
      '24 часа нужны только для защиты ShaPop. Они никак не уменьшают твои законные права (отказ в течение 14 дней у продавца-бизнеса, гарантия соответствия, скрытые дефекты).',
      'После 2 споров, признанных необоснованными, ты больше не можешь пользоваться защитой ShaPop. Это никогда не затрагивает твои законные права, и по запросу решение пересматривает человек.',
      'Конкурсы с подарками в эфире бесплатны, покупка не нужна; участвовать могут люди от 18 лет с аккаунтом. Продавец задаёт вопрос: побеждает первый правильный ответ (3 попытки на подарок). Apple и Google не организаторы и не партнёры.',
    ] },
    seller: { title: 'Если ты продаёшь', items: [
      'Укажи, продаёшь ли ты как частное лицо или как бизнес. На каждом твоём эфире показан значок «Частное лицо» или «Бизнес». Бизнес указывает торговое название, регистрационный номер и адрес — покупатели видят их до оплаты. Если ты называешь себя частным лицом, а продаёшь как бизнес, аккаунт блокируется.',
      'Отправь товар в выбранный тобой срок. Иначе заказ отменяется, а покупателю возвращают деньги.',
      'Отправляй с отслеживанием. Перед подтверждением отправки сделай 2 фото (содержимое посылки с товаром и почтовая квитанция) и введи номер отслеживания. Фото защищают тебя в случае спора.',
      'Ты получаешь деньги через 24 часа после того, как покупатель подтвердил получение (или сразу, если он сказал, что всё в порядке), или через 10 дней после отправки, если покупатель молчит; для товаров класса люкс — через 30 дней.',
      'Если покупатель сообщает о проблеме, деньги удерживаются. Ответь своими фото в течение 48 часов; решение принимает наша команда.',
      '1-й проигранный спор: предупреждение. 2-й: 30 дней ты получаешь деньги только после того, как покупатель получил товар. 3-й: твой аккаунт закрывается.',
      'Если ты бизнес, покупатели могут отказаться от покупки в течение 14 дней после получения, без причины. Если ты частное лицо, ты сам выбираешь правила возврата (можно «без возврата»).',
    ] },
    pickup: { title: 'Личная передача', items: [
      'Покупатель проверяет товар на месте, затем сообщает свой 4-значный код. Как только код сообщён, передача подтверждена.',
    ] },
    luxury: { title: 'Товары класса люкс (от 500 € или известный бренд)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Товар относится к классу люкс, если он стоит от 500 € (или эквивалент в твоей валюте, например 2000 ₪) или если это известный люксовый бренд (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). Продавец также может сам отметить «товар люксового бренда». Порог 500 € относится к цене одного товара, а не к сумме заказа: несколько недорогих товаров, купленных вместе, — это не товар класса люкс.', // i18n-ignore (texte légal : identité de l’exploitant en France, montants fixés en euros)
      'Чтобы выставить его, продавец должен отметить: «Я подтверждаю, что этот товар подлинный. Я знаю, что продажа подделки — преступление и что если это подделка, я должен буду вернуть деньги покупателю, заплатить штраф 50 % от цены, и мой аккаунт будет закрыт». Без этой отметки объявление отклоняется.',
      'Продавец получает деньги через 30 дней после получения товара, даже если покупатель сказал «Всё в порядке». Без подтверждённого получения 10 дней без вестей становятся 30 днями.',
      'У покупателя есть 30 дней после получения, чтобы сообщить о подделке, с доказательствами (фото, экспертиза, мнение бренда). Объявление снимается, а выплата продавцу за эту продажу замораживается. 24 часа по-прежнему действуют для других проблем.',
      'У продавца есть 7 дней, чтобы ответить в приложении: признать или оспорить с доказательствами (счёт, сертификат, фото). Если он оспаривает, сотрудник ShaPop изучает доказательства обеих сторон. Если он признаёт или не отвечает: покупателю полностью возвращают деньги, включая доставку; продавец платит штраф 50 % от цены продажи (не больше цены продажи), который удерживается из того, что ShaPop ему должна; аккаунт закрывается навсегда. Продавец всегда может оспорить решение по e-mail: support@shapop.app. Покупатель может подать заявление в полицию.',
    ] },
  },
  he: {
    title: 'כללי קנייה ומכירה', back: 'חזרה',
    intro: 'הכללים האלה מגינים גם על הקונה וגם על המוכר. הם חלים על כל הזמנה.',
    buyer: { title: 'אם אתם קונים', items: [
      'משלמים בסוף המכירה הפומבית או כשלוחצים על ״קנייה מיידית״. התשלום נגבה בזמן הקנייה, בשם המוכר. אתם בוחרים מסירה ביד או משלוח בדואר.',
      'ברגע שקיבלתם את החבילה, אשרו זאת באפליקציה. ״הכול תקין״ משלם למוכר מיד.',
      'אם משהו לא בסדר, יש לכם 24 שעות מהקבלה לדווח, עם תמונות. כשהדואר עוקב אחרי החבילה, 24 השעות נספרות מה״נמסר״ של הדואר, גם אם לא אישרתם.',
      'אחרי 24 השעות האלה בלי דיווח, המוכר מקבל תשלום.',
      'אם אין חדשות 10 ימים אחרי שהחבילה נשלחה, המוכר מקבל תשלום.',
      '24 השעות נועדו רק להגנה של ShaPop. הן לא מצמצמות בשום צורה את הזכויות שלכם לפי החוק (ביטול עסקה תוך 14 יום מול עסק, אחריות להתאמה, פגמים נסתרים).',
      'אחרי 2 מחלוקות שנמצאו לא מוצדקות, אי אפשר יותר להשתמש בהגנה של ShaPop. זה אף פעם לא פוגע בזכויות שלכם לפי החוק, ואדם בודק זאת מחדש לפי בקשה.',
      'המתנות בשידור הן בחינם, בלי חובת קנייה, לבני 18 ומעלה עם חשבון. המוכר שואל שאלה: התשובה הנכונה הראשונה זוכה (3 ניסיונות לכל מתנה). Apple ו-Google אינן מארגנות או שותפות.',
    ] },
    seller: { title: 'אם אתם מוכרים', items: [
      'הצהירו אם אתם מוכרים כאדם פרטי או כעסק. תג ״פרטי״ או ״עסק״ מוצג בכל אחד מהשידורים שלכם. עסק מוסר שם מסחרי, מספר רישום וכתובת, שמוצגים לקונים לפני התשלום. הצהרה שאתם פרטיים כשאתם מוכרים כעסק מובילה להשעיה.',
      'שלחו את הפריט בזמן שבחרתם. אחרת ההזמנה מבוטלת והקונה מקבל החזר.',
      'שלחו בדואר עם מעקב. לפני שמאשרים את המשלוח, צלמו את 2 התמונות (תוכן החבילה עם הפריט, וקבלת הדואר) והקלידו את מספר המעקב. התמונות מגינות עליכם במקרה של מחלוקת.',
      'אתם מקבלים תשלום 24 שעות אחרי שהקונה מאשר את הקבלה (או מיד אם הוא אומר שהכול תקין), או 10 ימים אחרי המשלוח אם אין חדשות מהקונה; 30 יום לפריטי יוקרה.',
      'אם הקונה מדווח על בעיה, הכסף מעוכב. השיבו עם התמונות שלכם תוך 48 שעות; הצוות שלנו מכריע.',
      'מחלוקת ראשונה שהפסדתם: אזהרה. שנייה: במשך 30 יום תקבלו תשלום רק אחרי שהקונה קיבל את הפריט. שלישית: החשבון שלכם נסגר.',
      'כעסק, הקונים שלכם יכולים לבטל תוך 14 יום מהקבלה, בלי סיבה. כמוכרים פרטיים, אתם בוחרים את מדיניות ההחזרות (היא יכולה להיות ״בלי החזרות״).',
    ] },
    pickup: { title: 'מסירה ביד', items: [
      'הקונה בודק את הפריט במקום, ואז נותן את הקוד בן 4 הספרות. ברגע שהקוד ניתן, המסירה מאושרת.',
    ] },
    luxury: { title: 'פריטי יוקרה (500 € ומעלה, או מותג גדול)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'פריט נחשב ״פריט יוקרה״ אם הוא עולה €500 ומעלה (או הסכום המקביל במטבע שלכם, למשל 2,000 ₪) או אם הוא של מותג יוקרה גדול (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). המוכר יכול גם לסמן בעצמו ״פריט של מותג יוקרה״. הסף של €500 חל על המחיר של פריט אחד בלבד, אף פעם לא על סכום ההזמנה: כמה פריטים זולים שנקנו יחד אינם פריט יוקרה.', // i18n-ignore (texte légal : identité de l’exploitant en France, montants fixés en euros)
      'כדי לפרסם אותו, המוכר חייב לסמן: ״אני מצהיר שהפריט הזה מקורי. ידוע לי שמכירת זיוף היא עבירה, ושאם הוא מזויף אצטרך להחזיר את הכסף לקונה, לשלם קנס של 50% מהמחיר, ושהחשבון שלי ייסגר.״ בלי הסימון הזה, המודעה נדחית.',
      'המוכר מקבל תשלום 30 יום אחרי הקבלה, גם אם הקונה אומר ״הכול תקין״. בלי אישור קבלה, 10 הימים בלי חדשות הופכים ל-30 יום.',
      'לקונה יש 30 יום מהקבלה לדווח על זיוף, עם הוכחה (תמונות, חוות דעת של מומחה, חוות דעת של המותג). המודעה מוסרת, והתשלום למוכר על המכירה הזו מוקפא. 24 השעות ממשיכות לחול על בעיות אחרות.',
      'למוכר יש 7 ימים להשיב באפליקציה: להודות, או לערער עם הוכחות (חשבונית, תעודה, תמונות). אם הוא מערער, נציג של ShaPop בודק את ההוכחות של שני הצדדים. אם הוא מודה או לא משיב: הקונה מקבל החזר מלא, כולל משלוח; המוכר חייב קנס של 50% ממחיר המכירה (עד גובה מחיר המכירה לכל היותר), שמנוכה ממה ש־ShaPop חייבת לו; החשבון שלו נסגר לצמיתות. המוכר תמיד יכול לערער במייל ל־support@shapop.app. הקונה יכול להגיש תלונה במשטרה.',
    ] },
  },
}

export default function RulesPage() {
  const navigate = useNavigate()
  const c = tr(content)
  const section = (s: Section) => (
    <section style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>{s.title}</h2>
      <ol style={{ margin: 0, paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {s.items.map(item => <li key={item} style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#ddd', lineHeight: 1.5 }}>{item}</li>)}
      </ol>
    </section>
  )
  return (
    <div dir={getDir()} style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', borderBottom: '1px solid #111', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <button onClick={() => navigate(-1)} aria-label={c.back} style={{ background: 'none', border: 'none', color: '#f0f0f0', fontSize: 'calc(24px * var(--fs, 1))', cursor: 'pointer', padding: '4px', transform: getDir() === 'rtl' ? 'scaleX(-1)' : undefined }}>&#8249;</button>
        <h1 style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 700, margin: 0 }}>{c.title}</h1>
      </div>
      <div style={{ padding: '16px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.5 }}>{c.intro}</p>
        {section(c.buyer)}
        {section(c.seller)}
        {section(c.pickup)}
        {section(c.luxury)}
      </div>
    </div>
  )
}

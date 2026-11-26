// Page « Règles » : ce que l'acheteur et le vendeur doivent savoir (décisions du 25/11/2026,
// articles de luxe contre les contrefaçons le 26/11/2026).
import { useNavigate } from 'react-router-dom'
import { getDir, tr } from '../lib/i18n'

type Section = { title: string; items: string[] }
type Content = { title: string; intro: string; back: string; buyer: Section; seller: Section; pickup: Section; luxury: Section }

const content: Record<'en' | 'fr' | 'es' | 'ru' | 'he', Content> = {
  en: {
    title: 'Buying and selling rules', back: 'Back',
    intro: 'These rules protect both the buyer and the seller. They apply to every order.',
    buyer: { title: 'If you buy', items: [
      'At the end of the auction, the amount is reserved on your card. You choose pickup or delivery by post.',
      'As soon as you receive your parcel, confirm it in the app. “Everything is fine” pays the seller right away.',
      'If something is wrong, you have 24 hours after receipt to report it, with photos. When the post office tracks the parcel, the 24 hours start from its “delivered” date, even if you have not confirmed.',
      'After those 24 hours without a report, the sale is accepted and the seller is paid.',
      'Without news 10 days after the parcel was sent, the sale is accepted and the seller is paid.',
      'A return is only possible if you reported a problem within the 24 hours.',
      'After 2 disputes judged unfounded, you can no longer open disputes or request returns.',
    ] },
    seller: { title: 'If you sell', items: [
      'Send the item within the time you chose. Otherwise the order is cancelled and the buyer refunded.',
      'Send by tracked post. Before confirming the shipment, take the 2 photos (inside of the parcel with the item, and the post office receipt) and type the tracking number. The photos protect you if there is a dispute.',
      'You are paid as soon as the buyer says everything is fine, or 24 hours after receipt without a problem, or 10 days after sending without news.',
      'If the buyer reports a problem, the money stays blocked. Reply with your photos within 48 hours; our team decides.',
      '1st dispute lost: warning. 2nd: for 30 days, you are only paid once the buyer has received the item. 3rd: your account is closed.',
    ] },
    pickup: { title: 'Pickup in person', items: [
      'The buyer checks the item on the spot, then gives their 4-digit code. Once the code is given, the sale is accepted.',
    ] },
    luxury: { title: 'Luxury items (500 € or more, or a major brand)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'An item is a luxury item if it costs 500 € or more (or the equivalent in your currency, for example 2,000 ₪) or if it is from a major luxury brand (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). The seller can also tick “luxury brand item” themselves. The 500 € threshold applies to the price of one single item, never to the order total: several cheap items bought together are not a luxury item.', // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'To list it, the seller must tick: “I certify that this item is authentic. I know that selling a counterfeit is a crime and that if it is fake I will have to refund the buyer, pay a penalty of 50% of the price, and that my account will be closed.” Without this box, the listing is refused.',
      'The seller is paid 30 days after receipt, even if the buyer says “Everything is fine”. Without confirmed receipt, the 10 days without news become 30 days.',
      'The buyer has 30 days after receipt to report a counterfeit, with proof (photos, expert opinion, the brand’s opinion). The 24 hours still apply to other problems.',
      'If our team confirms a fake: the buyer is fully refunded, shipping included; a penalty of 50% of the price is taken from the seller’s next payouts; the seller’s account is closed for good; the evidence is kept. The buyer can file a police complaint.',
    ] },
  },
  fr: {
    title: 'Règles d’achat et de vente', back: 'Retour',
    intro: 'Ces règles protègent l’acheteur comme le vendeur. Elles valent pour toutes les commandes.',
    buyer: { title: 'Si tu achètes', items: [
      'À la fin de l’enchère, le montant est réservé sur ta carte. Tu choisis la remise en main propre ou l’envoi par la poste.',
      'Dès que tu reçois ton colis, confirme-le dans l’appli. « Tout est conforme » paie le vendeur tout de suite.',
      'Si quelque chose ne va pas, tu as 24 h après la réception pour le signaler, photos à l’appui. Quand la poste suit le colis, les 24 h partent du « livré » de la poste, même si tu n’as rien confirmé.',
      'Passé ces 24 h sans signalement, la vente est acceptée et le vendeur est payé.',
      'Sans nouvelles 10 jours après l’envoi du colis, la vente est acceptée et le vendeur est payé.',
      'Un retour n’est possible que si tu as signalé un problème dans les 24 h.',
      'Après 2 litiges jugés infondés, tu ne peux plus ouvrir de litige ni demander de retour.',
    ] },
    seller: { title: 'Si tu vends', items: [
      'Envoie l’article dans le délai que tu as choisi. Sinon, la commande est annulée et l’acheteur remboursé.',
      'Envoie en envoi suivi. Avant de valider l’envoi, prends les 2 photos (intérieur du colis avec l’article, et bordereau de la poste) et tape le numéro de suivi. Les photos te protègent en cas de litige.',
      'Tu es payé dès que l’acheteur dit que tout est conforme, ou 24 h après la réception sans problème, ou 10 jours après l’envoi sans nouvelles.',
      'Si l’acheteur signale un problème, l’argent reste bloqué. Réponds avec tes photos sous 48 h ; notre équipe tranche.',
      '1er litige perdu : avertissement. 2e : pendant 30 jours, tu n’es payé qu’une fois l’article reçu par l’acheteur. 3e : ton compte est fermé.',
    ] },
    pickup: { title: 'Remise en main propre', items: [
      'L’acheteur vérifie l’article sur place, puis donne son code à 4 chiffres. Une fois le code donné, la vente est acceptée.',
    ] },
    luxury: { title: 'Articles de luxe (500 € ou plus, ou grande marque)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Un article est « de luxe » s’il coûte 500 € ou plus (ou l’équivalent dans ta devise, par exemple 2 000 ₪) ou s’il est d’une grande marque de luxe (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). Le vendeur peut aussi cocher lui-même « article de marque de luxe ». Le seuil de 500 € s’applique au prix d’un seul article, jamais au total de la commande : plusieurs articles bon marché achetés ensemble ne font pas un article de luxe.', // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Pour le mettre en vente, le vendeur doit cocher : « Je certifie que cet article est authentique. Je sais que vendre une contrefaçon est un délit et qu’en cas de faux je devrai rembourser l’acheteur, payer une pénalité de 50 % du prix, et que mon compte sera fermé. » Sans cette case, la mise en vente est refusée.',
      'Le vendeur est payé 30 jours après la réception, même si l’acheteur dit « Tout est conforme ». Sans réception confirmée, les 10 jours sans nouvelles deviennent 30 jours.',
      'L’acheteur a 30 jours après la réception pour signaler une contrefaçon, avec une preuve (photos, expertise, avis de la marque). Le délai de 24 h reste valable pour les autres problèmes.',
      'Si notre équipe confirme le faux : l’acheteur est remboursé en entier, frais de port compris ; une pénalité de 50 % du prix est prélevée sur les prochains versements du vendeur ; son compte est fermé définitivement ; les preuves sont conservées. L’acheteur peut porter plainte.',
    ] },
  },
  es: {
    title: 'Reglas de compra y venta', back: 'Volver',
    intro: 'Estas reglas protegen tanto al comprador como al vendedor. Se aplican a todos los pedidos.',
    buyer: { title: 'Si compras', items: [
      'Al terminar la subasta, el importe queda reservado en tu tarjeta. Eliges entrega en mano o envío por correo.',
      'En cuanto recibas el paquete, confírmalo en la app. «Todo está bien» paga al vendedor enseguida.',
      'Si algo va mal, tienes 24 h tras la recepción para avisar, con fotos. Cuando correos sigue el paquete, las 24 h cuentan desde su «entregado», aunque no hayas confirmado nada.',
      'Pasadas esas 24 h sin aviso, la venta se acepta y el vendedor cobra.',
      'Sin noticias 10 días después del envío, la venta se acepta y el vendedor cobra.',
      'Solo hay devolución si avisaste de un problema en las 24 h.',
      'Tras 2 disputas consideradas infundadas, ya no puedes abrir disputas ni pedir devoluciones.',
    ] },
    seller: { title: 'Si vendes', items: [
      'Envía el artículo en el plazo que elegiste. Si no, el pedido se cancela y se reembolsa al comprador.',
      'Envía con seguimiento. Antes de validar el envío, haz las 2 fotos (interior del paquete con el artículo y resguardo de correos) y escribe el número de seguimiento. Las fotos te protegen en caso de disputa.',
      'Cobras en cuanto el comprador dice que todo está bien, o 24 h después de la recepción sin problemas, o 10 días después del envío sin noticias.',
      'Si el comprador avisa de un problema, el dinero queda bloqueado. Responde con tus fotos en 48 h; nuestro equipo decide.',
      '1.ª disputa perdida: advertencia. 2.ª: durante 30 días solo cobras cuando el comprador ha recibido el artículo. 3.ª: tu cuenta se cierra.',
    ] },
    pickup: { title: 'Entrega en mano', items: [
      'El comprador revisa el artículo en el momento y luego da su código de 4 cifras. Una vez dado el código, la venta se acepta.',
    ] },
    luxury: { title: 'Artículos de lujo (500 € o más, o gran marca)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Un artículo es «de lujo» si cuesta 500 € o más (o su equivalente en tu moneda, por ejemplo 2000 ₪) o si es de una gran marca de lujo (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). El vendedor también puede marcar él mismo «artículo de marca de lujo». El umbral de 500 € se aplica al precio de un solo artículo, nunca al total del pedido: varios artículos baratos comprados juntos no son un artículo de lujo.', // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Para ponerlo a la venta, el vendedor debe marcar: «Certifico que este artículo es auténtico. Sé que vender una falsificación es un delito y que, si es falso, tendré que reembolsar al comprador, pagar una penalización del 50 % del precio, y que mi cuenta se cerrará.» Sin esta casilla, la puesta a la venta se rechaza.',
      'El vendedor cobra 30 días después de la recepción, aunque el comprador diga «Todo está bien». Sin recepción confirmada, los 10 días sin noticias pasan a 30 días.',
      'El comprador tiene 30 días desde la recepción para denunciar una falsificación, con una prueba (fotos, peritaje, opinión de la marca). El plazo de 24 horas sigue valiendo para los demás problemas.',
      'Si nuestro equipo confirma la falsificación: se reembolsa todo al comprador, envío incluido; se descuenta una penalización del 50 % del precio de los próximos pagos del vendedor; su cuenta se cierra definitivamente; se conservan las pruebas. El comprador puede presentar una denuncia.',
    ] },
  },
  ru: {
    title: 'Правила покупки и продажи', back: 'Назад',
    intro: 'Эти правила защищают и покупателя, и продавца. Они действуют для всех заказов.',
    buyer: { title: 'Если ты покупаешь', items: [
      'В конце аукциона сумма резервируется на твоей карте. Ты выбираешь личную передачу или отправку почтой.',
      'Как только получишь посылку, подтверди это в приложении. «Всё в порядке» — продавец сразу получает деньги.',
      'Если что-то не так, у тебя есть 24 часа после получения, чтобы сообщить об этом с фото. Если почта отслеживает посылку, 24 часа считаются от отметки «доставлено», даже если ты ничего не подтвердил.',
      'Если за эти 24 часа нет жалобы, продажа считается принятой, и продавец получает деньги.',
      'Если через 10 дней после отправки нет вестей, продажа считается принятой, и продавец получает деньги.',
      'Возврат возможен, только если ты сообщил о проблеме в течение 24 часов.',
      'После 2 необоснованных споров ты больше не можешь открывать споры и запрашивать возвраты.',
    ] },
    seller: { title: 'Если ты продаёшь', items: [
      'Отправь товар в выбранный тобой срок. Иначе заказ отменяется, а покупателю возвращаются деньги.',
      'Отправляй с отслеживанием. Перед подтверждением отправки сделай 2 фото (посылка изнутри с товаром и почтовая квитанция) и введи номер отслеживания. Фото защищают тебя в случае спора.',
      'Ты получаешь деньги, как только покупатель подтвердит, что всё в порядке, или через 24 часа после получения без проблем, или через 10 дней после отправки без вестей.',
      'Если покупатель сообщил о проблеме, деньги блокируются. Ответь с фото в течение 48 часов; решение принимает наша команда.',
      '1-й проигранный спор — предупреждение. 2-й — 30 дней выплаты только после получения товара покупателем. 3-й — аккаунт закрывается.',
    ] },
    pickup: { title: 'Личная передача', items: [
      'Покупатель проверяет товар на месте и затем называет свой 4-значный код. После этого продажа считается принятой.',
    ] },
    luxury: { title: 'Товары класса люкс (от 500 € или известный бренд)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Товар относится к классу люкс, если он стоит от 500 € (или эквивалент в твоей валюте, например 2000 ₪) или если это известный люксовый бренд (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). Продавец также может сам отметить «товар люксового бренда». Порог 500 € относится к цене одного товара, а не к сумме заказа: несколько недорогих товаров, купленных вместе, не становятся товаром класса люкс.', // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'Чтобы выставить его на продажу, продавец должен отметить: «Я подтверждаю, что этот товар подлинный. Я знаю, что продажа подделки — правонарушение и что, если товар окажется поддельным, мне придётся вернуть деньги покупателю, заплатить штраф 50 % от цены, а мой аккаунт будет закрыт.» Без этой отметки товар не выставляется.',
      'Продавец получает оплату через 30 дней после получения, даже если покупатель ответил «Всё в порядке». Если получение не подтверждено, 10 дней без новостей становятся 30 днями.',
      'У покупателя есть 30 дней после получения, чтобы сообщить о подделке, с доказательством (фото, экспертиза, заключение бренда). Для других проблем по-прежнему действует срок 24 часа.',
      'Если наша команда подтверждает подделку: покупателю возвращают всю сумму, включая доставку; штраф 50 % от цены удерживается из следующих выплат продавцу; его аккаунт закрывается навсегда; доказательства сохраняются. Покупатель может подать заявление в полицию.',
    ] },
  },
  he: {
    title: 'כללי קנייה ומכירה', back: 'חזרה',
    intro: 'הכללים האלה מגינים גם על הקונה וגם על המוכר. הם חלים על כל הזמנה.',
    buyer: { title: 'אם אתם קונים', items: [
      'בסוף המכירה הפומבית, הסכום נשמר בכרטיס שלכם. אתם בוחרים מסירה ביד או משלוח בדואר.',
      'ברגע שקיבלתם את החבילה, אשרו זאת באפליקציה. «הכול תקין» משלם למוכר מיד.',
      'אם משהו לא בסדר, יש לכם 24 שעות מהקבלה לדווח, עם תמונות. כשהדואר עוקב אחרי החבילה, 24 השעות נספרות מה«נמסר» של הדואר, גם אם לא אישרתם.',
      'אחרי 24 השעות בלי דיווח, המכירה מאושרת והמוכר מקבל תשלום.',
      'בלי עדכון 10 ימים אחרי שליחת החבילה, המכירה מאושרת והמוכר מקבל תשלום.',
      'החזרה אפשרית רק אם דיווחתם על בעיה בתוך 24 השעות.',
      'אחרי 2 מחלוקות שנמצאו לא מוצדקות, אי אפשר יותר לפתוח מחלוקת או לבקש החזרה.',
    ] },
    seller: { title: 'אם אתם מוכרים', items: [
      'שלחו את הפריט בזמן שבחרתם. אחרת ההזמנה מבוטלת והקונה מקבל החזר.',
      'שלחו במשלוח עם מעקב. לפני אישור המשלוח, צלמו 2 תמונות (תוך החבילה עם הפריט, וקבלת הדואר) והקלידו את מספר המעקב. התמונות מגינות עליכם במקרה של מחלוקת.',
      'אתם מקבלים תשלום ברגע שהקונה מאשר שהכול תקין, או 24 שעות אחרי הקבלה בלי בעיה, או 10 ימים אחרי המשלוח בלי עדכון.',
      'אם הקונה מדווח על בעיה, הכסף נשאר חסום. השיבו עם תמונות תוך 48 שעות; הצוות שלנו מחליט.',
      'מחלוקת ראשונה שהפסדתם: אזהרה. שנייה: במשך 30 יום תשלום רק אחרי שהקונה קיבל את הפריט. שלישית: החשבון נסגר.',
    ] },
    pickup: { title: 'מסירה ביד', items: [
      'הקונה בודק את הפריט במקום ואז מוסר את הקוד בן 4 הספרות. ברגע שהקוד נמסר, המכירה מאושרת.',
    ] },
    luxury: { title: 'פריטי יוקרה (500 € ומעלה, או מותג גדול)', items: [ // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'פריט נחשב ״פריט יוקרה״ אם הוא עולה 500 € ומעלה (או הסכום המקביל במטבע שלכם, למשל 2,000 ₪) או אם הוא של מותג יוקרה גדול (Louis Vuitton, Chanel, Hermès, Gucci, Dior, Rolex, Cartier…). המוכר יכול גם לסמן בעצמו ״פריט של מותג יוקרה״. סף 500 € חל על המחיר של פריט אחד בלבד, אף פעם לא על סכום ההזמנה: כמה פריטים זולים שנקנים יחד אינם פריט יוקרה.', // i18n-ignore : seuil « luxe » défini en euros (règle du 26/11/2026)
      'כדי להעלות אותו למכירה, המוכר חייב לסמן: ״אני מאשר/ת שהפריט הזה מקורי. ידוע לי שמכירת זיוף היא עבירה, ושאם יתברר שהוא מזויף אצטרך להחזיר לקונה את הכסף, לשלם קנס של 50% מהמחיר, ושהחשבון שלי ייסגר.״ בלי הסימון הזה, ההעלאה למכירה נדחית.',
      'המוכר מקבל את התשלום 30 ימים אחרי הקבלה, גם אם הקונה אישר ״הכול תקין״. בלי קבלה מאושרת, 10 הימים בלי חדשות הופכים ל-30 ימים.',
      'לקונה יש 30 ימים מהקבלה לדווח על זיוף, עם הוכחה (תמונות, חוות דעת מומחה, תשובה מהמותג). 24 השעות עדיין חלות על בעיות אחרות.',
      'אם הצוות שלנו מאשר שמדובר בזיוף: הקונה מקבל החזר מלא, כולל משלוח; קנס של 50% מהמחיר מנוכה מהתשלומים הבאים של המוכר; החשבון שלו נסגר לצמיתות; ההוכחות נשמרות. הקונה יכול להגיש תלונה במשטרה.',
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

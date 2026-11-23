import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

// Résumé cohérent avec les conditions d'utilisation (TermsPage, reprises du site) : sans transporteur intégré,
// paiement protégé jusqu'au code à 4 chiffres ou aux 2 photos, vendeur payé 3 jours après les photos
// ou dès que l'acheteur confirme la réception. En cas de différence, les conditions d'utilisation priment.
const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'Return Policy',
    updated: 'Last updated: 23 November 2026',
    sections: [
      { h: '1. Overview', p: 'ShaPop is a marketplace: items are sold by other users, mostly individuals, in every country where the app is available. This page summarises how returns and refunds work. In case of difference, the ShaPop Terms of Use prevail.' },
      { h: '2. Sales between individuals', p: 'Between individuals, a completed sale can only be cancelled with both parties’ agreement or through a dispute, for example if the item was not received or does not match the listing.' },
      { h: '3. Sellers acting as a business', p: 'When the seller is a business, the buyer also has the rights granted by the consumer protection law of their country (for example a right of withdrawal for distance sales). The seller must respect them, whatever their own policy.' },
      { h: '4. Protected payment', p: 'Your payment is held by ShaPop until the handover is proven. In person, only give your 4-digit code after checking the item: it confirms you received it as described and the seller is then paid. By post, the seller is paid 3 days after sending the photos of the parcel and the stamped receipt, or as soon as you confirm receipt, unless you report a problem in the meantime.' },
      { h: '5. How to report a problem or request a return', p: 'Open your order in the app and tap “Report a problem” or “Request a return”, as soon as possible, or write to support@shapop.app. Add photos and explain what is wrong.' },
      { h: '6. Sending the item back', p: 'ShaPop has no built-in courier: the buyer and the seller arrange the return together, in person or by post. If the item is defective, does not match the listing or was sent by mistake, the return costs are paid by the seller. In other cases, they are agreed between the buyer and the seller.' },
      { h: '7. Non-returnable items', p: 'Unless the law of your country provides otherwise, some items cannot be returned under a right of withdrawal: perishable goods, personalised or made-to-order items, and sealed items opened after handover for hygiene or health reasons.' },
      { h: '8. Disputes and refunds', p: 'ShaPop reviews the available evidence (handover photos, messages, postal tracking) and may ask both parties for information. Depending on the case, ShaPop may refund the buyer, pay the seller or suggest a return. A refund is made to the original payment method, in the currency of the order. These decisions only concern the funds held by ShaPop and do not take away anyone’s legal rights.' },
      { h: '9. Contact', p: 'For any question about returns and refunds: support@shapop.app' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Politique de retours',
    updated: 'Dernière mise à jour : 23 novembre 2026',
    sections: [
      { h: '1. Aperçu', p: 'ShaPop est une place de marché : les articles sont vendus par d’autres utilisateurs, surtout des particuliers, dans tous les pays où l’app est disponible. Cette page résume le fonctionnement des retours et des remboursements. En cas de différence, les conditions d’utilisation de ShaPop priment.' },
      { h: '2. Ventes entre particuliers', p: 'Entre particuliers, une vente conclue ne peut être annulée qu’avec l’accord des deux parties ou dans le cadre d’un litige, par exemple si l’article n’a pas été reçu ou ne correspond pas à l’annonce.' },
      { h: '3. Vendeurs professionnels', p: 'Lorsque le vendeur est un professionnel, l’acheteur bénéficie en plus des droits que lui accorde la loi de protection des consommateurs de son pays (par exemple un droit de rétractation pour les ventes à distance). Le vendeur doit les respecter, quelle que soit sa propre politique.' },
      { h: '4. Paiement protégé', p: 'Ton paiement est conservé par ShaPop jusqu’à la preuve de la remise. En main propre, ne donne ton code à 4 chiffres qu’après avoir vérifié l’article : il confirme que tu l’as reçu conforme et le vendeur est alors payé. Par la poste, le vendeur est payé 3 jours après l’envoi des photos du colis et du bordereau tamponné, ou dès que tu confirmes la réception, sauf si tu signales un problème entre-temps.' },
      { h: '5. Signaler un problème ou demander un retour', p: 'Ouvre ta commande dans l’app et appuie sur « Signaler un problème » ou « Demander un retour », le plus tôt possible, ou écris à support@shapop.app. Ajoute des photos et explique ce qui ne va pas.' },
      { h: '6. Renvoi de l’article', p: 'ShaPop n’intègre aucun transporteur : l’acheteur et le vendeur organisent le retour entre eux, en main propre ou par la poste. Si l’article est défectueux, ne correspond pas à l’annonce ou a été envoyé par erreur, les frais de retour sont à la charge du vendeur. Dans les autres cas, ils sont convenus entre l’acheteur et le vendeur.' },
      { h: '7. Articles non retournables', p: 'Sauf si la loi de ton pays en dispose autrement, certains articles ne peuvent pas être retournés au titre d’un droit de rétractation : denrées périssables, articles personnalisés ou fabriqués sur mesure, et articles scellés ouverts après la remise pour des raisons d’hygiène ou de santé.' },
      { h: '8. Litiges et remboursements', p: 'ShaPop examine les éléments disponibles (photos de remise, échanges, suivi postal) et peut demander des informations aux deux parties. Selon le cas, ShaPop peut rembourser l’acheteur, verser le paiement au vendeur ou proposer un retour. Le remboursement se fait sur le moyen de paiement d’origine, dans la devise de la commande. Ces décisions concernent uniquement les sommes détenues par ShaPop et ne privent personne de ses droits légaux.' },
      { h: '9. Contact', p: 'Pour toute question sur les retours et les remboursements : support@shapop.app' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Política de devoluciones',
    updated: 'Última actualización: 23 de noviembre de 2026',
    sections: [
      { h: '1. Resumen', p: 'ShaPop es un marketplace: los artículos los venden otros usuarios, sobre todo particulares, en todos los países donde la app está disponible. Esta página resume cómo funcionan las devoluciones y los reembolsos. Si hay alguna diferencia, prevalecen las condiciones de uso de ShaPop.' },
      { h: '2. Ventas entre particulares', p: 'Entre particulares, una venta cerrada solo puede anularse con el acuerdo de ambas partes o mediante una disputa, por ejemplo si el artículo no se ha recibido o no coincide con el anuncio.' },
      { h: '3. Vendedores profesionales', p: 'Cuando el vendedor es profesional, el comprador tiene además los derechos que le reconoce la ley de protección de los consumidores de su país (por ejemplo, un derecho de desistimiento en las ventas a distancia). El vendedor debe respetarlos, sea cual sea su propia política.' },
      { h: '4. Pago protegido', p: 'ShaPop retiene tu pago hasta que se demuestra la entrega. En mano, da tu código de 4 cifras solo después de revisar el artículo: confirma que lo has recibido conforme y el vendedor cobra en ese momento. Por correo, el vendedor cobra 3 días después de subir las fotos del paquete y del resguardo sellado, o en cuanto confirmas la recepción, salvo que comuniques un problema mientras tanto.' },
      { h: '5. Cómo informar de un problema o pedir una devolución', p: 'Abre tu pedido en la app y toca «Informar de un problema» o «Solicitar una devolución» lo antes posible, o escribe a support@shapop.app. Añade fotos y explica qué pasa.' },
      { h: '6. Devolver el artículo', p: 'ShaPop no tiene transportista integrado: comprador y vendedor organizan la devolución entre ellos, en mano o por correo. Si el artículo es defectuoso, no coincide con el anuncio o se envió por error, los gastos de devolución los paga el vendedor. En los demás casos, los acuerdan comprador y vendedor.' },
      { h: '7. Artículos que no se pueden devolver', p: 'Salvo que la ley de tu país disponga otra cosa, algunos artículos no pueden devolverse por desistimiento: productos perecederos, artículos personalizados o hechos a medida y artículos precintados abiertos después de la entrega por motivos de higiene o salud.' },
      { h: '8. Disputas y reembolsos', p: 'ShaPop revisa las pruebas disponibles (fotos de la entrega, mensajes, seguimiento postal) y puede pedir información a ambas partes. Según el caso, ShaPop puede reembolsar al comprador, pagar al vendedor o proponer una devolución. El reembolso se hace al medio de pago original, en la moneda del pedido. Estas decisiones solo afectan al dinero que retiene ShaPop y no quitan a nadie sus derechos legales.' },
      { h: '9. Contacto', p: 'Para cualquier pregunta sobre devoluciones y reembolsos: support@shapop.app' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Политика возврата',
    updated: 'Последнее обновление: 23 ноября 2026 г.',
    sections: [
      { h: '1. Общие положения', p: 'ShaPop — это маркетплейс: товары продают другие пользователи, в основном частные лица, во всех странах, где доступно приложение. На этой странице кратко описано, как работают возвраты и возмещения. При расхождениях действуют условия использования ShaPop.' },
      { h: '2. Продажи между частными лицами', p: 'Между частными лицами завершённую продажу можно отменить только с согласия обеих сторон или в рамках спора, например если товар не получен или не соответствует объявлению.' },
      { h: '3. Продавцы-профессионалы', p: 'Если продавец — профессионал, у покупателя есть также права, которые даёт ему закон о защите прав потребителей его страны (например, право отказа от дистанционной покупки). Продавец обязан их соблюдать, независимо от собственных правил.' },
      { h: '4. Защищённая оплата', p: 'ShaPop удерживает твою оплату, пока передача не подтверждена. При личной встрече называй 4-значный код только после проверки товара: он подтверждает, что ты получил товар в надлежащем виде, и продавец сразу получает оплату. При отправке почтой продавец получает оплату через 3 дня после загрузки фото посылки и квитанции со штампом или сразу, как только ты подтвердишь получение, если за это время ты не сообщишь о проблеме.' },
      { h: '5. Как сообщить о проблеме или запросить возврат', p: 'Открой заказ в приложении и нажми «Сообщить о проблеме» или «Запросить возврат» как можно скорее либо напиши на support@shapop.app. Приложи фото и объясни, что не так.' },
      { h: '6. Возврат товара', p: 'У ShaPop нет встроенной службы доставки: покупатель и продавец сами договариваются о возврате — лично или по почте. Если товар бракованный, не соответствует объявлению или отправлен по ошибке, расходы на возврат несёт продавец. В остальных случаях покупатель и продавец договариваются о них сами.' },
      { h: '7. Товары, не подлежащие возврату', p: 'Если закон твоей страны не предусматривает иное, некоторые товары нельзя вернуть по праву отказа: скоропортящиеся продукты, персонализированные или изготовленные на заказ товары и запечатанные товары, вскрытые после передачи, по соображениям гигиены или здоровья.' },
      { h: '8. Споры и возмещения', p: 'ShaPop изучает имеющиеся доказательства (фото передачи, переписку, почтовое отслеживание) и может запросить информацию у обеих сторон. В зависимости от ситуации ShaPop может вернуть деньги покупателю, выплатить их продавцу или предложить возврат товара. Деньги возвращаются тем же способом оплаты, в валюте заказа. Эти решения касаются только средств, удерживаемых ShaPop, и не лишают никого законных прав.' },
      { h: '9. Контакт', p: 'По любым вопросам о возвратах и возмещениях: support@shapop.app' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'מדיניות החזרות',
    updated: 'עדכון אחרון: 23 בנובמבר 2026',
    sections: [
      { h: '1. כללי', p: 'ShaPop היא זירת מסחר: הפריטים נמכרים על ידי משתמשים אחרים, בעיקר אנשים פרטיים, בכל המדינות שבהן האפליקציה זמינה. דף זה מסכם איך עובדים החזרות והחזרים כספיים. במקרה של סתירה, תנאי השימוש של ShaPop גוברים.' },
      { h: '2. מכירות בין אנשים פרטיים', p: 'בין אנשים פרטיים, מכירה שהושלמה יכולה להתבטל רק בהסכמת שני הצדדים או במסגרת מחלוקת, למשל אם הפריט לא התקבל או אינו תואם למודעה.' },
      { h: '3. מוכרים עסקיים', p: 'כשהמוכר הוא עסק, לקונה יש בנוסף הזכויות שמעניק לו דין הגנת הצרכן של מדינתו (למשל זכות ביטול בעסקאות מרחוק). המוכר חייב לכבד אותן, בלי קשר למדיניות שלו.' },
      { h: '4. תשלום מוגן', p: 'ShaPop מחזיקה את התשלום שלכם עד שהמסירה מוכחת. באיסוף עצמי, מסרו את הקוד בן 4 הספרות רק אחרי שבדקתם את הפריט: הוא מאשר שקיבלתם אותו כמתואר, והמוכר מקבל אז את התשלום. במשלוח בדואר, המוכר מקבל את התשלום 3 ימים אחרי העלאת התמונות של החבילה ושל אישור המשלוח החתום, או מיד כשאתם מאשרים שקיבלתם, אלא אם דיווחתם על בעיה בינתיים.' },
      { h: '5. איך מדווחים על בעיה או מבקשים החזרה', p: 'פתחו את ההזמנה באפליקציה והקישו על ״דווח על בעיה״ או ״בקשת החזרה״ בהקדם האפשרי, או כתבו ל-support@shapop.app. צרפו תמונות והסבירו מה לא בסדר.' },
      { h: '6. החזרת הפריט', p: 'ל-ShaPop אין חברת שילוח מובנית: הקונה והמוכר מתאמים את ההחזרה ביניהם, פנים אל פנים או בדואר. אם הפריט פגום, אינו תואם למודעה או נשלח בטעות, עלויות ההחזרה על המוכר. במקרים אחרים הן נקבעות בהסכמה בין הקונה למוכר.' },
      { h: '7. פריטים שאינם ניתנים להחזרה', p: 'אלא אם הדין במדינתכם קובע אחרת, חלק מהפריטים אינם ניתנים להחזרה במסגרת זכות ביטול: מוצרים מתכלים, פריטים בהתאמה אישית או בהזמנה מיוחדת, ופריטים אטומים שנפתחו אחרי המסירה מטעמי היגיינה או בריאות.' },
      { h: '8. מחלוקות והחזרים כספיים', p: 'ShaPop בודקת את הראיות הקיימות (תמונות מסירה, הודעות, מעקב דואר) ועשויה לבקש מידע משני הצדדים. בהתאם למקרה, ShaPop יכולה להחזיר את הכסף לקונה, לשלם למוכר או להציע החזרה. ההחזר הכספי מתבצע לאמצעי התשלום המקורי, במטבע ההזמנה. החלטות אלה נוגעות רק לכספים ש-ShaPop מחזיקה ואינן שוללות מאיש את זכויותיו לפי החוק.' },
      { h: '9. יצירת קשר', p: 'לכל שאלה על החזרות והחזרים כספיים: support@shapop.app' },
    ],
  },
}

export default function ReturnPolicyPage() {
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

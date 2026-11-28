import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

// Résumé cohérent avec les conditions d'utilisation (TermsPage, reprises du site), mise à jour du 28/11/2026 :
// paiement encaissé à l'achat au nom du vendeur, vendeur payé 24 h après la réception confirmée (ou tout de suite si tout
// est conforme) ou 10 jours après l'envoi sans nouvelles, 30 jours pour le luxe ; rétractation de 14 jours avec un vendeur pro.
// En cas de différence, les conditions d'utilisation priment.
const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'Return Policy',
    updated: 'Last updated: 28 November 2026',
    sections: [
      { h: '1. Overview', p: 'ShaPop is a marketplace: items are sold by other users, private people or professionals, during lives. This page sums up how returns and refunds work. If anything differs, the ShaPop Terms of Use prevail.' },
      { h: '2. Private sellers', p: 'With a private seller (“Private” badge), there is no legal right of withdrawal and no legal conformity guarantee, but the seller remains liable for hidden defects. The seller chooses their own return policy, which can be “no returns”.' },
      { h: '3. Professional sellers', p: 'With a professional seller (“Pro” badge), you can cancel your purchase within 14 days after receiving the item, without giving a reason, including for items bought at auction in a live (these are not public auctions). The seller refunds you within 14 days. Return costs are paid by you, unless the seller agrees to pay them. In Israel, the seller may keep at most 5% of the price or ₪100, whichever is lower, and some people (aged 65 and over, people with disabilities, new immigrants) have 4 months in the cases set by law. You also keep the legal conformity guarantee (2 years in the European Union).' },
      { h: '4. Protected payment', p: 'The payment is collected at the time of purchase, on behalf of the seller. The seller is paid 24 hours after you confirm receipt (or right away if you confirm that everything is fine), or 10 days after shipping without news from you; 30 days for luxury items. In person, only give your 4-digit code after checking the item. The 24 hours after receipt are only for ShaPop protection: they let you report an item not received or not as described before the money is paid to the seller. This period does not reduce your legal rights in any way (14-day withdrawal with a professional seller, conformity guarantee, hidden defects).' },
      { h: '5. How to report a problem or request a return', p: 'Open your order in the app and tap “Report a problem” or “Request a return”, or write to support@shapop.app. Add photos and explain what is wrong. To use your 14-day withdrawal right with a professional seller, simply tell us or the seller within 14 days after receipt.' },
      { h: '6. Sending the item back', p: 'ShaPop has no built-in courier: the buyer and the seller arrange the return together, in person or by post. If the item is defective, does not match the listing or was sent by mistake, the return costs are paid by the seller. For a withdrawal, they are paid by the buyer unless the seller agrees to pay them. In other cases, they are agreed between the buyer and the seller.' },
      { h: '7. Non-returnable items', p: 'Unless the law of your country says otherwise, some items cannot be returned under a right of withdrawal: perishable goods, personalised or made-to-order items, and sealed items opened after handover for hygiene or health reasons.' },
      { h: '8. Disputes and refunds', p: 'ShaPop reviews the evidence (handover photos, messages, postal tracking) and may ask both parties for information. Depending on the case, ShaPop may refund the buyer, pay the seller or suggest a return. A refund is made to the original payment method, in the currency of the order. After 2 disputes judged unfounded, a buyer can no longer use ShaPop protection; this never affects legal rights, and a person reviews it on request. These decisions only concern the money held by ShaPop.' },
      { h: '9. Contact', p: 'For any question about returns and refunds: support@shapop.app' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Politique de retours',
    updated: 'Dernière mise à jour : 28 novembre 2026',
    sections: [
      { h: '1. Aperçu', p: 'ShaPop est une place de marché : les articles sont vendus pendant des directs par d’autres utilisateurs, particuliers ou professionnels. Cette page résume le fonctionnement des retours et des remboursements. En cas de différence, les conditions d’utilisation de ShaPop priment.' },
      { h: '2. Vendeurs particuliers', p: 'Avec un vendeur particulier (pastille « Particulier »), il n’y a pas de droit légal de rétractation ni de garantie légale de conformité, mais la garantie des vices cachés reste due. Le vendeur choisit sa politique de retour, qui peut être « pas de retour ».' },
      { h: '3. Vendeurs professionnels', p: 'Avec un vendeur professionnel (pastille « Pro »), tu peux annuler ton achat dans les 14 jours après la réception, sans donner de motif, y compris pour les achats aux enchères en direct (ce ne sont pas des enchères publiques). Le vendeur te rembourse dans les 14 jours. Les frais de retour sont à ta charge, sauf si le vendeur les prend. En Israël, le vendeur peut retenir au plus 5 % du prix ou 100 ₪ (le plus bas des deux), et certaines personnes (65 ans et plus, personnes handicapées, nouveaux immigrants) ont 4 mois dans les cas prévus par la loi. Tu gardes aussi la garantie légale de conformité (2 ans dans l’Union européenne).' },
      { h: '4. Paiement protégé', p: 'Le paiement est encaissé au moment de l’achat, au nom et pour le compte du vendeur. Le vendeur est payé 24 h après la réception que tu as confirmée (ou tout de suite si tu confirmes que tout est conforme), ou 10 jours après l’envoi sans nouvelles de ta part ; 30 jours pour les articles de luxe. En main propre, ne donne ton code à 4 chiffres qu’après avoir vérifié l’article. Les 24 h après la réception servent uniquement à la protection ShaPop : elles te permettent de signaler un article non reçu ou non conforme avant que l’argent soit versé au vendeur. Ce délai ne réduit en rien tes droits légaux (rétractation de 14 jours avec un vendeur pro, garantie de conformité, vices cachés).' },
      { h: '5. Signaler un problème ou demander un retour', p: 'Ouvre ta commande dans l’app et appuie sur « Signaler un problème » ou « Demander un retour », ou écris à support@shapop.app. Ajoute des photos et explique ce qui ne va pas. Pour utiliser ton droit de rétractation de 14 jours avec un vendeur pro, il suffit de nous le dire, ou de le dire au vendeur, dans les 14 jours après la réception.' },
      { h: '6. Renvoi de l’article', p: 'ShaPop n’intègre aucun transporteur : l’acheteur et le vendeur organisent le retour entre eux, en main propre ou par la poste. Si l’article est défectueux, ne correspond pas à l’annonce ou a été envoyé par erreur, les frais de retour sont à la charge du vendeur. Pour une rétractation, ils sont à la charge de l’acheteur, sauf si le vendeur les prend. Dans les autres cas, ils sont convenus entre l’acheteur et le vendeur.' },
      { h: '7. Articles non retournables', p: 'Sauf si la loi de ton pays en dispose autrement, certains articles ne peuvent pas être retournés au titre d’un droit de rétractation : denrées périssables, articles personnalisés ou fabriqués sur mesure, et articles scellés ouverts après la remise pour des raisons d’hygiène ou de santé.' },
      { h: '8. Litiges et remboursements', p: 'ShaPop examine les preuves (photos de remise, échanges, suivi postal) et peut demander des informations aux deux parties. Selon le cas, ShaPop peut rembourser l’acheteur, payer le vendeur ou proposer un retour. Le remboursement se fait sur le moyen de paiement d’origine, dans la devise de la commande. Après 2 litiges jugés infondés, un acheteur ne peut plus utiliser la protection ShaPop ; cela ne touche jamais ses droits légaux, et une personne réexamine sur demande. Ces décisions concernent uniquement l’argent détenu par ShaPop.' },
      { h: '9. Contact', p: 'Pour toute question sur les retours et les remboursements : support@shapop.app' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Política de devoluciones',
    updated: 'Última actualización: 28 de noviembre de 2026',
    sections: [
      { h: '1. Resumen', p: 'ShaPop es un marketplace: los artículos los venden otros usuarios, particulares o profesionales, durante los directos. Esta página resume cómo funcionan las devoluciones y los reembolsos. Si algo difiere, prevalecen las Condiciones de uso de ShaPop.' },
      { h: '2. Vendedores particulares', p: 'Con un vendedor particular (insignia «Particular»), no hay derecho legal de desistimiento ni garantía legal de conformidad, pero el vendedor sigue respondiendo de los vicios ocultos. El vendedor elige su propia política de devoluciones, que puede ser «sin devoluciones».' },
      { h: '3. Vendedores profesionales', p: 'Con un vendedor profesional (insignia «Pro»), puedes cancelar tu compra en los 14 días siguientes a la recepción del artículo, sin dar ningún motivo, también para los artículos comprados en subasta en un directo (no son subastas públicas). El vendedor te reembolsa en un plazo de 14 días. Los gastos de devolución corren de tu cuenta, salvo que el vendedor acepte pagarlos. En Israel, el vendedor puede quedarse como máximo con el 5 % del precio o 100 ₪, lo que sea menor, y algunas personas (de 65 años o más, personas con discapacidad, nuevos inmigrantes) tienen 4 meses en los casos previstos por la ley. También conservas la garantía legal de conformidad (2 años en la Unión Europea).' },
      { h: '4. Pago protegido', p: 'El pago se cobra en el momento de la compra, en nombre del vendedor. El vendedor cobra 24 horas después de que confirmes la recepción (o enseguida si confirmas que todo está bien), o 10 días después del envío sin noticias tuyas; 30 días para los artículos de lujo. En mano, da tu código de 4 cifras solo después de revisar el artículo. Las 24 horas tras la recepción solo sirven para la protección ShaPop: te permiten avisar de un artículo no recibido o no conforme antes de que el dinero se pague al vendedor. Este plazo no reduce en nada tus derechos legales (desistimiento de 14 días con un vendedor profesional, garantía de conformidad, vicios ocultos).' },
      { h: '5. Cómo avisar de un problema o pedir una devolución', p: 'Abre tu pedido en la app y toca «Avisar de un problema» o «Pedir una devolución», o escribe a support@shapop.app. Añade fotos y explica qué pasa. Para usar tu derecho de desistimiento de 14 días con un vendedor profesional, basta con avisarnos a nosotros o al vendedor en los 14 días siguientes a la recepción.' },
      { h: '6. Devolver el artículo', p: 'ShaPop no integra ningún transportista: el comprador y el vendedor organizan la devolución entre ellos, en mano o por correo. Si el artículo es defectuoso, no coincide con el anuncio o se envió por error, los gastos de devolución corren a cargo del vendedor. En un desistimiento, los paga el comprador salvo que el vendedor acepte pagarlos. En los demás casos, los acuerdan el comprador y el vendedor.' },
      { h: '7. Artículos que no se pueden devolver', p: 'Salvo que la ley de tu país diga otra cosa, algunos artículos no se pueden devolver por derecho de desistimiento: productos perecederos, artículos personalizados o hechos a medida, y artículos precintados abiertos después de la entrega por motivos de higiene o salud.' },
      { h: '8. Disputas y reembolsos', p: 'ShaPop revisa las pruebas (fotos de entrega, mensajes, seguimiento postal) y puede pedir información a ambas partes. Según el caso, ShaPop puede reembolsar al comprador, pagar al vendedor o proponer una devolución. El reembolso se hace en el medio de pago original, en la moneda del pedido. Tras 2 disputas consideradas infundadas, un comprador ya no puede usar la protección ShaPop; esto nunca afecta a los derechos legales, y una persona lo revisa si se pide. Estas decisiones solo afectan al dinero retenido por ShaPop.' },
      { h: '9. Contacto', p: 'Para cualquier duda sobre devoluciones y reembolsos: support@shapop.app' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Политика возврата',
    updated: 'Последнее обновление: 28 ноября 2026 г.',
    sections: [
      { h: '1. Общие положения', p: 'ShaPop — это площадка: товары продают другие пользователи, частные лица или бизнесы, во время эфиров. На этой странице кратко описано, как работают возвраты и возмещения. Если что-то отличается, действуют Условия использования ShaPop.' },
      { h: '2. Продавцы — частные лица', p: 'С частным лицом (значок «Частное лицо») законного права на отказ и законной гарантии соответствия нет, но продавец отвечает за скрытые дефекты. Продавец сам выбирает правила возврата, в том числе «без возврата».' },
      { h: '3. Продавцы-бизнесы', p: 'С продавцом-бизнесом (значок «Бизнес») ты можешь отказаться от покупки в течение 14 дней после получения товара, без объяснения причин, в том числе для товаров, купленных на аукционе в эфире (это не публичные торги). Продавец возвращает тебе деньги в течение 14 дней. Расходы на возврат оплачиваешь ты, если продавец не согласился взять их на себя. В Израиле продавец может удержать не больше 5 % цены или 100 ₪ — что меньше, а у некоторых людей (65 лет и старше, люди с инвалидностью, новые репатрианты) есть 4 месяца в случаях, предусмотренных законом. У тебя также сохраняется законная гарантия соответствия (2 года в Европейском союзе).' },
      { h: '4. Защищённая оплата', p: 'Оплата списывается в момент покупки, от имени продавца. Продавец получает деньги через 24 часа после того, как ты подтвердил получение (или сразу, если ты подтвердил, что всё в порядке), или через 10 дней после отправки, если от тебя нет вестей; для товаров класса люкс — через 30 дней. При личной передаче сообщай свой 4-значный код только после проверки товара. 24 часа после получения нужны только для защиты ShaPop: они позволяют сообщить о неполученном или несоответствующем товаре до того, как деньги уйдут продавцу. Этот срок никак не уменьшает твои законные права (отказ в течение 14 дней у продавца-бизнеса, гарантия соответствия, скрытые дефекты).' },
      { h: '5. Как сообщить о проблеме или запросить возврат', p: 'Открой заказ в приложении и нажми «Сообщить о проблеме» или «Запросить возврат», или напиши на support@shapop.app. Добавь фото и объясни, что не так. Чтобы воспользоваться правом отказа в течение 14 дней у продавца-бизнеса, просто сообщи нам или продавцу в течение 14 дней после получения.' },
      { h: '6. Отправка товара обратно', p: 'В ShaPop нет встроенной службы доставки: покупатель и продавец договариваются о возврате сами, лично или по почте. Если товар бракованный, не соответствует объявлению или отправлен по ошибке, расходы на возврат оплачивает продавец. При отказе от покупки их оплачивает покупатель, если продавец не согласился взять их на себя. В остальных случаях покупатель и продавец договариваются между собой.' },
      { h: '7. Товары, которые нельзя вернуть', p: 'Если закон твоей страны не предусматривает иное, некоторые товары нельзя вернуть по праву отказа: скоропортящиеся продукты, персонализированные или сделанные на заказ товары, а также запечатанные товары, вскрытые после передачи, по соображениям гигиены или здоровья.' },
      { h: '8. Споры и возмещения', p: 'ShaPop изучает доказательства (фото передачи, сообщения, почтовое отслеживание) и может запросить информацию у обеих сторон. В зависимости от случая ShaPop может вернуть деньги покупателю, заплатить продавцу или предложить возврат товара. Деньги возвращаются тем же способом оплаты, в валюте заказа. После 2 споров, признанных необоснованными, покупатель больше не может пользоваться защитой ShaPop; это никогда не затрагивает законные права, и по запросу решение пересматривает человек. Эти решения касаются только денег, которые удерживает ShaPop.' },
      { h: '9. Контакт', p: 'По любым вопросам о возвратах и возмещениях: support@shapop.app' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'מדיניות החזרות',
    updated: 'עדכון אחרון: 28 בנובמבר 2026',
    sections: [
      { h: '1. סקירה כללית', p: 'ShaPop היא זירת מסחר: הפריטים נמכרים על ידי משתמשים אחרים, אנשים פרטיים או עסקים, במהלך שידורים. הדף הזה מסכם איך עובדות החזרות והחזרים כספיים. אם יש הבדל, תנאי השימוש של ShaPop גוברים.' },
      { h: '2. מוכרים פרטיים', p: 'מול מוכר פרטי (תג ״פרטי״) אין זכות ביטול לפי החוק ואין אחריות חוקית להתאמה, אבל המוכר נשאר אחראי לפגמים נסתרים. המוכר בוחר את מדיניות ההחזרות שלו, והיא יכולה להיות ״בלי החזרות״.' },
      { h: '3. מוכרים עסקיים', p: 'מול מוכר עסקי (תג ״עסק״) אפשר לבטל את הקנייה תוך 14 יום מקבלת הפריט, בלי לתת סיבה, גם על פריטים שנקנו במכירה פומבית בשידור (שאינה מכירה פומבית ציבורית). המוכר מחזיר לכם את הכסף תוך 14 יום. דמי ההחזרה עליכם, אלא אם המוכר מסכים לשלם אותם. בישראל, המוכר רשאי לגבות דמי ביטול של 5% מהמחיר או 100 ₪, לפי הנמוך, ולחלק מהאנשים (אזרח ותיק בן 65 ומעלה, אדם עם מוגבלות, עולה חדש) יש 4 חודשים, במקרים שהחוק קובע. נשארת לכם גם האחריות להתאמה לפי החוק (שנתיים באיחוד האירופי).' },
      { h: '4. תשלום מוגן', p: 'התשלום נגבה בזמן הקנייה, בשם המוכר. המוכר מקבל את הכסף 24 שעות אחרי שאתם מאשרים את הקבלה (או מיד, אם אתם מאשרים שהכול תקין), או 10 ימים אחרי המשלוח אם אין חדשות מכם; 30 יום לפריטי יוקרה. במסירה ביד, תנו את הקוד בן 4 הספרות רק אחרי שבדקתם את הפריט. 24 השעות אחרי הקבלה נועדו רק להגנה של ShaPop: הן מאפשרות לדווח על פריט שלא התקבל או לא תואם לתיאור לפני שהכסף מועבר למוכר. הזמן הזה לא מצמצם בשום צורה את הזכויות שלכם לפי החוק (ביטול עסקה תוך 14 יום מול עסק, אחריות להתאמה, פגמים נסתרים).' },
      { h: '5. איך מדווחים על בעיה או מבקשים החזרה', p: 'פתחו את ההזמנה באפליקציה ולחצו על ״דיווח על בעיה״ או ״בקשת החזרה״, או כתבו ל-support@shapop.app. צרפו תמונות והסבירו מה לא בסדר. כדי לממש את זכות ביטול העסקה של 14 יום מול עסק, פשוט הודיעו לנו או למוכר תוך 14 יום מהקבלה.' },
      { h: '6. החזרת הפריט', p: 'ל-ShaPop אין שליחויות משולבות: הקונה והמוכר מתאמים את ההחזרה ביניהם, ביד או בדואר. אם הפריט פגום, לא תואם למודעה או נשלח בטעות, דמי ההחזרה על המוכר. בביטול עסקה, הם על הקונה, אלא אם המוכר מסכים לשלם אותם. במקרים אחרים, הקונה והמוכר מסכימים עליהם ביניהם.' },
      { h: '7. פריטים שאי אפשר להחזיר', p: 'אלא אם החוק במדינה שלכם קובע אחרת, חלק מהפריטים אי אפשר להחזיר במסגרת זכות ביטול: מוצרים מתכלים, פריטים מותאמים אישית או שהוכנו לפי הזמנה, ופריטים אטומים שנפתחו אחרי המסירה מסיבות של היגיינה או בריאות.' },
      { h: '8. מחלוקות והחזרים', p: 'ShaPop בודקת את ההוכחות (תמונות המסירה, הודעות, מעקב הדואר) ויכולה לבקש מידע משני הצדדים. לפי המקרה, ShaPop יכולה להחזיר כסף לקונה, לשלם למוכר או להציע החזרה. ההחזר נעשה לאמצעי התשלום המקורי, במטבע של ההזמנה. אחרי 2 מחלוקות שנמצאו לא מוצדקות, קונה כבר לא יכול להשתמש בהגנה של ShaPop; זה אף פעם לא פוגע בזכויות לפי החוק, ואדם בודק זאת מחדש לפי בקשה. ההחלטות האלה נוגעות רק לכסף שמוחזק אצל ShaPop.' },
      { h: '9. יצירת קשר', p: 'לכל שאלה על החזרות והחזרים: support@shapop.app' },
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
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '24px' }}>{c.updated}</p>
        {c.sections.map((s) => (
          <div key={s.h} style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{s.h}</h2>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', lineHeight: 1.6 }}>{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

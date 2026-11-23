import { useNavigate } from 'react-router-dom'
import { tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

interface LegalSection { h: string; p: string }
interface LegalText { goBack: string; title: string; updated: string; sections: LegalSection[] }

const content: Localized<LegalText> = {
  en: {
    goBack: 'Go back',
    title: 'Return Policy',
    updated: 'Last updated: February 24, 2026',
    sections: [
      { h: '1. Overview', p: 'ShaPop is committed to complying with the consumer protection laws applicable in the buyer\'s country regarding returns and refunds. This policy applies to all purchases made through the ShaPop platform.' },
      { h: '2. 14-Day Withdrawal Period', p: 'You have at least 14 days from receiving the item to exercise your right of withdrawal. If the law of your country provides for a longer period, that longer period applies. The item must be returned in its original condition, unused, and in its original packaging if possible.' },
      { h: '3. How to Request a Return', p: 'To request a return, go to your order in the app and tap the "Request a return" button. Follow the instructions to complete your request. You will receive a confirmation notification.' },
      { h: '4. Non-Returnable Items', p: 'Certain items cannot be returned: perishable goods, personalized or custom-made items, and sealed items that have been opened after delivery (for hygiene or health protection reasons), unless the law of your country provides otherwise.' },
      { h: '5. Refund Processing', p: 'The refund will be issued to the original payment method, in the currency of the order, within 14 business days of the seller receiving the returned item. The refunded amount corresponds to the item price.' },
      { h: '6. Shipping Costs', p: 'Return shipping costs are the buyer\'s responsibility, except for defective items, items not matching the description, or items sent in error. In these cases, return shipping is covered by the seller.' },
      { h: '7. Disputes', p: 'In case of a dispute between the buyer and the seller regarding a return, ShaPop offers a mediation service. If the dispute persists, you can contact our support team for resolution.' },
      { h: '8. Seller Obligations', p: 'The consumer protection law applicable in the buyer\'s country applies to all transactions, regardless of the seller\'s individual policy. Sellers must respect the minimum 14-day withdrawal right (or any longer period provided by law) and the legal guarantees of conformity.' },
      { h: '9. Contact', p: 'For any questions about returns and refunds: support@shapop.app' },
    ],
  },
  fr: {
    goBack: 'Retour',
    title: 'Politique de retours',
    updated: 'Dernière mise à jour : 24 février 2026',
    sections: [
      { h: '1. Aperçu', p: 'ShaPop s\'engage à respecter, en matière de retours et de remboursements, les lois de protection des consommateurs applicables dans le pays de l\'acheteur. Cette politique s\'applique à tous les achats effectués via la plateforme ShaPop.' },
      { h: '2. Délai de rétractation de 14 jours', p: 'Vous disposez d\'un délai d\'au moins 14 jours à compter de la réception de l\'article pour exercer votre droit de rétractation. Si la loi de votre pays prévoit un délai plus long, c\'est ce délai qui s\'applique. L\'article doit être retourné dans son état d\'origine, non utilisé et, si possible, dans son emballage d\'origine.' },
      { h: '3. Comment demander un retour', p: 'Pour demander un retour, ouvrez votre commande dans l\'application et appuyez sur le bouton « Demander un retour ». Suivez les instructions pour compléter votre demande. Vous recevrez une confirmation par notification.' },
      { h: '4. Articles non retournables', p: 'Certains articles ne peuvent pas être retournés : les denrées périssables, les articles personnalisés ou fabriqués sur mesure, et les articles scellés ouverts après la livraison (pour des raisons d\'hygiène ou de protection de la santé), sauf disposition contraire de la loi de votre pays.' },
      { h: '5. Traitement du remboursement', p: 'Le remboursement est effectué sur le moyen de paiement d\'origine, dans la devise de la commande, dans un délai de 14 jours ouvrés à compter de la réception de l\'article retourné par le vendeur. Le montant remboursé correspond au prix de l\'article.' },
      { h: '6. Frais de retour', p: 'Les frais de retour sont à la charge de l\'acheteur, sauf si l\'article est défectueux, non conforme à la description ou envoyé par erreur. Dans ces cas, les frais de retour sont pris en charge par le vendeur.' },
      { h: '7. Litiges', p: 'En cas de litige entre l\'acheteur et le vendeur concernant un retour, ShaPop propose un service de médiation. Si le litige persiste, vous pouvez contacter notre équipe d\'assistance pour le résoudre.' },
      { h: '8. Obligations du vendeur', p: 'La loi de protection des consommateurs applicable dans le pays de l\'acheteur s\'applique à toutes les transactions, indépendamment de la politique propre au vendeur. Les vendeurs sont tenus de respecter le droit de rétractation d\'au moins 14 jours (ou tout délai plus long prévu par la loi) et les garanties légales de conformité.' },
      { h: '9. Contact', p: 'Pour toute question concernant les retours et remboursements : support@shapop.app' },
    ],
  },
  es: {
    goBack: 'Volver',
    title: 'Política de devoluciones',
    updated: 'Última actualización: 24 de febrero de 2026',
    sections: [
      { h: '1. Descripción general', p: 'ShaPop se compromete a cumplir, en materia de devoluciones y reembolsos, las leyes de protección al consumidor aplicables en el país del comprador. Esta política se aplica a todas las compras realizadas a través de la plataforma ShaPop.' },
      { h: '2. Plazo de desistimiento de 14 días', p: 'Dispones de al menos 14 días desde la recepción del artículo para ejercer tu derecho de desistimiento. Si la ley de tu país establece un plazo más largo, se aplica ese plazo. El artículo debe devolverse en su estado original, sin usar y, si es posible, en su embalaje original.' },
      { h: '3. Cómo solicitar una devolución', p: 'Para solicitar una devolución, abre tu pedido en la app y pulsa el botón «Solicitar devolución». Sigue las instrucciones para completar tu solicitud. Recibirás una notificación de confirmación.' },
      { h: '4. Artículos que no se pueden devolver', p: 'Algunos artículos no pueden devolverse: productos perecederos, artículos personalizados o hechos a medida, y artículos precintados que se hayan abierto después de la entrega (por motivos de higiene o de protección de la salud), salvo que la ley de tu país disponga lo contrario.' },
      { h: '5. Tramitación del reembolso', p: 'El reembolso se realizará en el método de pago original, en la moneda del pedido, en un plazo de 14 días hábiles desde que el vendedor reciba el artículo devuelto. El importe reembolsado corresponde al precio del artículo.' },
      { h: '6. Gastos de envío', p: 'Los gastos de envío de la devolución corren a cargo del comprador, salvo en caso de artículo defectuoso, que no coincida con la descripción o enviado por error. En esos casos, los gastos de devolución corren a cargo del vendedor.' },
      { h: '7. Disputas', p: 'En caso de disputa entre el comprador y el vendedor sobre una devolución, ShaPop ofrece un servicio de mediación. Si la disputa persiste, puedes contactar con nuestro equipo de soporte para resolverla.' },
      { h: '8. Obligaciones del vendedor', p: 'La ley de protección al consumidor aplicable en el país del comprador se aplica a todas las transacciones, independientemente de la política propia del vendedor. Los vendedores deben respetar el derecho de desistimiento de al menos 14 días (o el plazo más largo que establezca la ley) y las garantías legales de conformidad.' },
      { h: '9. Contacto', p: 'Para cualquier pregunta sobre devoluciones y reembolsos: support@shapop.app' },
    ],
  },
  ru: {
    goBack: 'Назад',
    title: 'Политика возврата',
    updated: 'Последнее обновление: 24 февраля 2026 г.',
    sections: [
      { h: '1. Общие положения', p: 'ShaPop обязуется соблюдать законодательство о защите прав потребителей, действующее в стране покупателя, в части возвратов и возмещений. Настоящая политика распространяется на все покупки, совершённые через платформу ShaPop.' },
      { h: '2. 14-дневный срок отказа от покупки', p: 'У вас есть не менее 14 дней с момента получения товара, чтобы воспользоваться правом на отказ от покупки. Если законодательство вашей страны предусматривает более длительный срок, применяется именно он. Товар должен быть возвращён в исходном состоянии, без следов использования и, по возможности, в оригинальной упаковке.' },
      { h: '3. Как оформить возврат', p: 'Чтобы оформить возврат, откройте заказ в приложении и нажмите кнопку «Запросить возврат». Следуйте инструкциям, чтобы завершить запрос. Вы получите уведомление с подтверждением.' },
      { h: '4. Товары, не подлежащие возврату', p: 'Некоторые товары вернуть нельзя: скоропортящиеся продукты, персонализированные или изготовленные на заказ изделия, а также запечатанные товары, вскрытые после доставки (по соображениям гигиены или охраны здоровья), если иное не предусмотрено законодательством вашей страны.' },
      { h: '5. Возврат денежных средств', p: 'Деньги возвращаются на исходное средство оплаты, в валюте заказа, в течение 14 рабочих дней с момента получения продавцом возвращённого товара. Сумма возмещения соответствует цене товара.' },
      { h: '6. Расходы на доставку', p: 'Расходы на обратную доставку несёт покупатель, за исключением случаев, когда товар бракованный, не соответствует описанию или отправлен по ошибке. В таких случаях расходы на обратную доставку несёт продавец.' },
      { h: '7. Споры', p: 'Если между покупателем и продавцом возникает спор по поводу возврата, ShaPop предлагает услугу посредничества. Если спор не удаётся урегулировать, вы можете обратиться в нашу службу поддержки.' },
      { h: '8. Обязанности продавца', p: 'Ко всем сделкам применяется законодательство о защите прав потребителей страны покупателя, независимо от собственной политики продавца. Продавцы обязаны соблюдать право на отказ от покупки в течение не менее 14 дней (или более длительного срока, предусмотренного законом) и законные гарантии соответствия товара.' },
      { h: '9. Контакты', p: 'По любым вопросам о возвратах и возмещениях: support@shapop.app' },
    ],
  },
  he: {
    goBack: 'חזרה',
    title: 'מדיניות החזרות',
    updated: 'עדכון אחרון: 24 בפברואר 2026',
    sections: [
      { h: '1. כללי', p: 'ShaPop מחויבת לפעול לפי דיני הגנת הצרכן החלים במדינת הקונה בכל הנוגע להחזרות ולהחזרים כספיים. מדיניות זו חלה על כל הרכישות שבוצעו דרך פלטפורמת ShaPop.' },
      { h: '2. תקופת ביטול של 14 יום', p: 'עומדים לרשותכם לפחות 14 יום מקבלת הפריט כדי לממש את זכות הביטול. אם הדין במדינה שלכם קובע תקופה ארוכה יותר, התקופה הארוכה היא שחלה. יש להחזיר את הפריט במצבו המקורי, ללא שימוש, ואם אפשר — באריזתו המקורית.' },
      { h: '3. איך מבקשים החזרה', p: 'כדי לבקש החזרה, פתחו את ההזמנה באפליקציה והקישו על הכפתור "בקשת החזרה". פעלו לפי ההוראות כדי להשלים את הבקשה. תקבלו התראה עם אישור.' },
      { h: '4. פריטים שאינם ניתנים להחזרה', p: 'חלק מהפריטים אינם ניתנים להחזרה: מוצרים מתכלים, פריטים בהתאמה אישית או בהזמנה מיוחדת, ופריטים אטומים שנפתחו לאחר המסירה (מטעמי היגיינה או הגנה על הבריאות), אלא אם הדין במדינה שלכם קובע אחרת.' },
      { h: '5. ביצוע ההחזר הכספי', p: 'ההחזר הכספי יבוצע לאמצעי התשלום המקורי, במטבע ההזמנה, תוך 14 ימי עסקים מהיום שבו המוכר קיבל את הפריט המוחזר. סכום ההחזר תואם את מחיר הפריט.' },
      { h: '6. עלויות משלוח', p: 'עלויות משלוח ההחזרה חלות על הקונה, למעט פריט פגום, פריט שאינו תואם את התיאור או פריט שנשלח בטעות. במקרים אלה, עלות משלוח ההחזרה חלה על המוכר.' },
      { h: '7. מחלוקות', p: 'במקרה של מחלוקת בין הקונה למוכר בנוגע להחזרה, ShaPop מציעה שירות גישור. אם המחלוקת נמשכת, אפשר לפנות לצוות התמיכה שלנו לקבלת פתרון.' },
      { h: '8. חובות המוכר', p: 'דיני הגנת הצרכן החלים במדינת הקונה חלים על כל העסקאות, ללא קשר למדיניות הפרטית של המוכר. המוכרים מחויבים לכבד את זכות הביטול של 14 יום לפחות (או כל תקופה ארוכה יותר שקבועה בדין) ואת האחריות החוקית להתאמת המוצר.' },
      { h: '9. צור קשר', p: 'לכל שאלה בנושא החזרות והחזרים כספיים: support@shapop.app' },
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

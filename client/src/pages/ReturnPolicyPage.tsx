import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

const content = {
  fr: {
    title: 'Politique de retours',
    updated: 'Derniere mise a jour : 24 fevrier 2026',
    sections: [
      { h: '1. Apercu', p: 'ShaPop s\'engage a respecter le Code de la consommation francais en matiere de retours et de remboursements. Cette politique s\'applique a tous les achats effectues via la plateforme ShaPop.' },
      { h: '2. Delai de retractation de 14 jours', p: 'Conformement au droit francais, vous disposez d\'un delai de 14 jours a compter de la reception de l\'article pour exercer votre droit de retractation. L\'article doit etre retourne dans son etat d\'origine, non utilise et dans son emballage d\'origine si possible.' },
      { h: '3. Comment demander un retour', p: 'Pour demander un retour, rendez-vous dans votre commande dans l\'application et appuyez sur le bouton "Demander un retour". Suivez les instructions pour completer votre demande. Vous recevrez une confirmation par notification.' },
      { h: '4. Articles non retournables', p: 'Certains articles ne peuvent pas etre retournes : les denrees perissables, les articles personnalises ou fabriques sur mesure, et les articles scelles qui ont ete ouverts apres la livraison (pour des raisons d\'hygiene ou de protection de la sante).' },
      { h: '5. Traitement du remboursement', p: 'Le remboursement sera effectue sur le moyen de paiement original dans un delai de 14 jours ouvres a compter de la reception de l\'article retourne par le vendeur. Le montant rembourse correspond au prix de l\'article.' },
      { h: '6. Frais de livraison', p: 'Les frais de retour sont a la charge de l\'acheteur, sauf en cas d\'article defectueux, non conforme a la description ou envoye par erreur. Dans ces cas, les frais de retour sont pris en charge par le vendeur.' },
      { h: '7. Litiges', p: 'En cas de litige entre l\'acheteur et le vendeur concernant un retour, ShaPop propose un service de mediation. Si le litige persiste, vous pouvez contacter notre equipe support pour une resolution.' },
      { h: '8. Obligations du vendeur', p: 'Le droit francais de la consommation s\'applique a toutes les transactions, independamment de la politique individuelle du vendeur. Les vendeurs sont tenus de respecter le droit de retractation de 14 jours et les garanties legales de conformite.' },
      { h: '9. Contact', p: 'Pour toute question concernant les retours et remboursements : shapopcontact@gmail.com' },
    ],
  },
  en: {
    title: 'Return Policy',
    updated: 'Last updated: February 24, 2026',
    sections: [
      { h: '1. Overview', p: 'ShaPop is committed to complying with the French Consumer Code regarding returns and refunds. This policy applies to all purchases made through the ShaPop platform.' },
      { h: '2. 14-Day Withdrawal Period', p: 'In accordance with French law, you have 14 days from receiving the item to exercise your right of withdrawal. The item must be returned in its original condition, unused, and in its original packaging if possible.' },
      { h: '3. How to Request a Return', p: 'To request a return, go to your order in the app and tap the "Request a return" button. Follow the instructions to complete your request. You will receive a confirmation notification.' },
      { h: '4. Non-Returnable Items', p: 'Certain items cannot be returned: perishable goods, personalized or custom-made items, and sealed items that have been opened after delivery (for hygiene or health protection reasons).' },
      { h: '5. Refund Processing', p: 'The refund will be issued to the original payment method within 14 business days of the seller receiving the returned item. The refunded amount corresponds to the item price.' },
      { h: '6. Shipping Costs', p: 'Return shipping costs are the buyer\'s responsibility, except in cases of defective items, items not matching the description, or items sent in error. In these cases, return shipping is covered by the seller.' },
      { h: '7. Disputes', p: 'In case of a dispute between the buyer and seller regarding a return, ShaPop offers a mediation service. If the dispute persists, you can contact our support team for resolution.' },
      { h: '8. Seller Obligations', p: 'French consumer law applies to all transactions, regardless of the seller\'s individual policy. Sellers are required to respect the 14-day withdrawal right and legal conformity guarantees.' },
      { h: '9. Contact', p: 'For any questions about returns and refunds: shapopcontact@gmail.com' },
    ],
  },
  he: {
    title: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05D7\u05D6\u05E8\u05D5\u05EA',
    updated: '\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05D7\u05E8\u05D5\u05DF: 24 \u05D1\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8 2026',
    sections: [
      { h: '1. \u05E1\u05E7\u05D9\u05E8\u05D4', p: 'ShaPop \u05DE\u05D7\u05D5\u05D9\u05D1\u05EA \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D1\u05D7\u05D5\u05E7 \u05D4\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA \u05D4\u05E6\u05E8\u05E4\u05EA\u05D9 \u05D1\u05E0\u05D5\u05D2\u05E2 \u05DC\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA \u05D5\u05D4\u05D7\u05D6\u05E8\u05D9\u05DD \u05DB\u05E1\u05E4\u05D9\u05D9\u05DD.' },
      { h: '2. \u05EA\u05E7\u05D5\u05E4\u05EA \u05D1\u05D9\u05D8\u05D5\u05DC \u05E9\u05DC 14 \u05D9\u05D5\u05DD', p: '\u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05D7\u05D5\u05E7 \u05D4\u05E6\u05E8\u05E4\u05EA\u05D9, \u05D9\u05E9 \u05DC\u05DA 14 \u05D9\u05D5\u05DD \u05DE\u05E7\u05D1\u05DC\u05EA \u05D4\u05E4\u05E8\u05D9\u05D8 \u05DC\u05DE\u05DE\u05E9 \u05D0\u05EA \u05D6\u05DB\u05D5\u05EA \u05D4\u05D1\u05D9\u05D8\u05D5\u05DC. \u05D4\u05E4\u05E8\u05D9\u05D8 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05DE\u05E6\u05D1\u05D5 \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9.' },
      { h: '3. \u05D0\u05D9\u05DA \u05DC\u05D1\u05E7\u05E9 \u05D4\u05D7\u05D6\u05E8\u05D4', p: '\u05DC\u05D1\u05E7\u05E9\u05EA \u05D4\u05D7\u05D6\u05E8\u05D4, \u05D4\u05D9\u05DB\u05E0\u05E1\u05D5 \u05DC\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D5\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC "\u05D1\u05E7\u05E9 \u05D4\u05D7\u05D6\u05E8\u05D4".' },
      { h: '4. \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05DC\u05D0 \u05E0\u05D9\u05EA\u05E0\u05D9\u05DD \u05DC\u05D4\u05D7\u05D6\u05E8\u05D4', p: '\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05E1\u05D5\u05D9\u05DE\u05D9\u05DD: \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05DE\u05EA\u05E7\u05DC\u05E7\u05DC\u05D9\u05DD, \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA, \u05D5\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D0\u05D8\u05D5\u05DE\u05D9\u05DD \u05E9\u05E0\u05E4\u05EA\u05D7\u05D5.' },
      { h: '5. \u05E2\u05D9\u05D1\u05D5\u05D3 \u05D4\u05D7\u05D6\u05E8 \u05DB\u05E1\u05E4\u05D9', p: '\u05D4\u05D4\u05D7\u05D6\u05E8 \u05D9\u05D1\u05D5\u05E6\u05E2 \u05DC\u05D0\u05DE\u05E6\u05E2\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9 \u05EA\u05D5\u05DA 14 \u05D9\u05DE\u05D9 \u05E2\u05E1\u05E7\u05D9\u05DD.' },
      { h: '6. \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7', p: '\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7 \u05D4\u05D7\u05D6\u05E8\u05D4 \u05D4\u05DF \u05E2\u05DC \u05D4\u05E7\u05D5\u05E0\u05D4, \u05DC\u05DE\u05E2\u05D8 \u05E4\u05E8\u05D9\u05D8 \u05E4\u05D2\u05D5\u05DD \u05D0\u05D5 \u05DC\u05D0 \u05EA\u05D5\u05D0\u05DD \u05D0\u05EA \u05D4\u05EA\u05D9\u05D0\u05D5\u05E8.' },
      { h: '7. \u05E1\u05DB\u05E1\u05D5\u05DB\u05D9\u05DD', p: '\u05D1\u05DE\u05E7\u05E8\u05D4 \u05E9\u05DC \u05E1\u05DB\u05E1\u05D5\u05DA, ShaPop \u05DE\u05E6\u05D9\u05E2\u05D4 \u05E9\u05D9\u05E8\u05D5\u05EA \u05D2\u05D9\u05E9\u05D5\u05E8. \u05D0\u05DD \u05D4\u05E1\u05DB\u05E1\u05D5\u05DA \u05E0\u05DE\u05E9\u05DA, \u05E4\u05E0\u05D5 \u05DC\u05E6\u05D5\u05D5\u05EA \u05D4\u05EA\u05DE\u05D9\u05DB\u05D4.' },
      { h: '8. \u05D7\u05D5\u05D1\u05D5\u05EA \u05D4\u05DE\u05D5\u05DB\u05E8', p: '\u05D7\u05D5\u05E7 \u05D4\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA \u05D4\u05E6\u05E8\u05E4\u05EA\u05D9 \u05D7\u05DC \u05E2\u05DC \u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA, \u05DC\u05DC\u05D0 \u05E7\u05E9\u05E8 \u05DC\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05EA \u05E9\u05DC \u05D4\u05DE\u05D5\u05DB\u05E8.' },
      { h: '9. \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8', p: '\u05DC\u05E9\u05D0\u05DC\u05D5\u05EA \u05E2\u05DC \u05D4\u05D7\u05D6\u05E8\u05D5\u05EA: shapopcontact@gmail.com' },
    ],
  },
  es: {
    title: 'Politica de Devoluciones',
    updated: 'Ultima actualizacion: 24 de febrero de 2026',
    sections: [
      { h: '1. Descripcion General', p: 'ShaPop se compromete a cumplir con el Codigo de Consumo frances en materia de devoluciones y reembolsos. Esta politica se aplica a todas las compras realizadas a traves de la plataforma ShaPop.' },
      { h: '2. Periodo de Desistimiento de 14 Dias', p: 'De acuerdo con la ley francesa, dispones de 14 dias desde la recepcion del articulo para ejercer tu derecho de desistimiento. El articulo debe devolverse en su estado original, sin usar y en su embalaje original si es posible.' },
      { h: '3. Como Solicitar una Devolucion', p: 'Para solicitar una devolucion, ve a tu pedido en la app y pulsa el boton "Solicitar devolucion". Sigue las instrucciones para completar tu solicitud. Recibiras una confirmacion por notificacion.' },
      { h: '4. Articulos No Retornables', p: 'Ciertos articulos no pueden devolverse: productos perecederos, articulos personalizados o hechos a medida, y articulos sellados que hayan sido abiertos despues de la entrega.' },
      { h: '5. Procesamiento del Reembolso', p: 'El reembolso se realizara en el metodo de pago original dentro de los 14 dias habiles posteriores a la recepcion del articulo devuelto por el vendedor.' },
      { h: '6. Gastos de Envio', p: 'Los gastos de envio de devolucion corren a cargo del comprador, excepto en caso de articulo defectuoso, no conforme con la descripcion o enviado por error.' },
      { h: '7. Disputas', p: 'En caso de disputa entre comprador y vendedor, ShaPop ofrece un servicio de mediacion. Si la disputa persiste, puedes contactar a nuestro equipo de soporte.' },
      { h: '8. Obligaciones del Vendedor', p: 'La ley francesa de consumo se aplica a todas las transacciones, independientemente de la politica individual del vendedor. Los vendedores deben respetar el derecho de desistimiento de 14 dias.' },
      { h: '9. Contacto', p: 'Para preguntas sobre devoluciones y reembolsos: shapopcontact@gmail.com' },
    ],
  },
}

export default function ReturnPolicyPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  usePageTitle(c.title)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Go back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
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

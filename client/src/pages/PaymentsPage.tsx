import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

const content = {
  fr: { title: 'Paiements et livraison', payTitle: 'Moyens de paiement', noCards: 'Aucun moyen de paiement ajoute.', addCard: 'Ajouter un moyen de paiement', shipTitle: 'Preferences de livraison', defaultShip: 'Livraison par defaut', standard: 'Standard (La Poste)', express: 'Express (coursier)', pickup: 'Retrait en main propre', save: 'Enregistrer' },
  en: { title: 'Payments & Shipping', payTitle: 'Payment Methods', noCards: 'No payment methods added yet.', addCard: 'Add payment method', shipTitle: 'Shipping Preferences', defaultShip: 'Default shipping', standard: 'Standard (Israel Post)', express: 'Express (courier)', pickup: 'Self pickup', save: 'Save' },
  he: { title: '\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05DE\u05E9\u05DC\u05D5\u05D7', payTitle: '\u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD', noCards: '\u05D0\u05D9\u05DF \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF.', addCard: '\u05D4\u05D5\u05E1\u05E3 \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD', shipTitle: '\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7', defaultShip: '\u05DE\u05E9\u05DC\u05D5\u05D7 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC', standard: '\u05E8\u05D2\u05D9\u05DC (\u05D3\u05D5\u05D0\u05E8 \u05D9\u05E9\u05E8\u05D0\u05DC)', express: '\u05DE\u05D4\u05D9\u05E8 (\u05E9\u05DC\u05D9\u05D7)', pickup: '\u05D0\u05D9\u05E1\u05D5\u05E3 \u05E2\u05E6\u05DE\u05D9', save: '\u05E9\u05DE\u05D5\u05E8' },
  es: { title: 'Pagos y Envio', payTitle: 'Metodos de Pago', noCards: 'No hay metodos de pago agregados.', addCard: 'Agregar metodo de pago', shipTitle: 'Preferencias de Envio', defaultShip: 'Envio predeterminado', standard: 'Estandar (Correo de Israel)', express: 'Express (mensajero)', pickup: 'Recoger en persona', save: 'Guardar' },
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.payTitle}</h2>
        <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ marginBottom: '12px' }}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{c.noCards}</p>
          <button style={{ padding: '12px 24px', backgroundColor: '#F0908A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {c.addCard}
          </button>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.shipTitle}</h2>
        <div style={{ backgroundColor: '#111', borderRadius: '14px', overflow: 'hidden' }}>
          <p style={{ fontSize: '12px', color: '#888', padding: '16px 16px 8px' }}>{c.defaultShip}</p>
          {[c.standard, c.express, c.pickup].map((opt, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < 2 ? '1px solid #1A1A1A' : 'none', cursor: 'pointer' }}>
              <input type="radio" name="shipping" defaultChecked={i === 0} style={{ accentColor: '#F0908A' }} />
              <span style={{ fontSize: '15px', color: '#fff' }}>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

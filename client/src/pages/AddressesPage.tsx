import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

const content = {
  fr: { title: 'Adresses', noAddr: 'Aucune adresse enregistree.', add: 'Ajouter une adresse', name: 'Nom complet', street: 'Adresse', city: 'Ville', zip: 'Code postal', phone: 'Telephone', save: 'Enregistrer', cancel: 'Annuler' },
  en: { title: 'Addresses', noAddr: 'No addresses saved yet.', add: 'Add address', name: 'Full name', street: 'Street address', city: 'City', zip: 'Zip code', phone: 'Phone', save: 'Save address', cancel: 'Cancel' },
  he: { title: '\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA', noAddr: '\u05D0\u05D9\u05DF \u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA.', add: '\u05D4\u05D5\u05E1\u05E3 \u05DB\u05EA\u05D5\u05D1\u05EA', name: '\u05E9\u05DD \u05DE\u05DC\u05D0', street: '\u05E8\u05D7\u05D5\u05D1', city: '\u05E2\u05D9\u05E8', zip: '\u05DE\u05D9\u05E7\u05D5\u05D3', phone: '\u05D8\u05DC\u05E4\u05D5\u05DF', save: '\u05E9\u05DE\u05D5\u05E8 \u05DB\u05EA\u05D5\u05D1\u05EA', cancel: '\u05D1\u05D9\u05D8\u05D5\u05DC' },
  es: { title: 'Direcciones', noAddr: 'No hay direcciones guardadas.', add: 'Agregar direccion', name: 'Nombre completo', street: 'Direccion', city: 'Ciudad', zip: 'Codigo postal', phone: 'Telefono', save: 'Guardar direccion', cancel: 'Cancelar' },
}

export default function AddressesPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  const [showForm, setShowForm] = useState(false)

  const inputStyle = { width: '100%', padding: '12px 14px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {!showForm ? (
          <div style={{ backgroundColor: '#111', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ marginBottom: '12px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{c.noAddr}</p>
            <button onClick={() => setShowForm(true)} style={{ padding: '12px 24px', backgroundColor: '#F0908A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {c.add}
            </button>
          </div>
        ) : (
          <div>
            <input type="text" placeholder={c.name} style={inputStyle} />
            <input type="text" placeholder={c.street} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" placeholder={c.city} style={inputStyle} />
              <input type="text" placeholder={c.zip} style={inputStyle} />
            </div>
            <input type="tel" placeholder={c.phone} style={inputStyle} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#1A1A1A', border: 'none', borderRadius: '10px', color: '#888', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{c.cancel}</button>
              <button style={{ flex: 1, padding: '14px', backgroundColor: '#F0908A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{c.save}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

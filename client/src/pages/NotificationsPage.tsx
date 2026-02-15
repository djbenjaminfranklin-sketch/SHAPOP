import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

const content = {
  fr: {
    title: 'Notifications',
    push: 'Notifications Push',
    items: [
      { id: 'live', label: 'Vendeurs en direct', desc: 'Sois notifie quand un vendeur que tu suis lance un live' },
      { id: 'orders', label: 'Suivi de commandes', desc: 'Expedition, livraison et retours' },
      { id: 'deals', label: 'Bons plans & promos', desc: 'Offres speciales et ventes flash' },
      { id: 'messages', label: 'Messages', desc: 'Nouveaux messages de vendeurs ou acheteurs' },
      { id: 'reminders', label: 'Rappels de live', desc: 'Rappel avant le debut d\'un live programme' },
      { id: 'community', label: 'Communaute', desc: 'Nouveaux abonnes, likes et mentions' },
    ],
  },
  en: {
    title: 'Notifications',
    push: 'Push Notifications',
    items: [
      { id: 'live', label: 'Sellers go live', desc: 'Get notified when sellers you follow start a stream' },
      { id: 'orders', label: 'Order updates', desc: 'Shipping, delivery, and return notifications' },
      { id: 'deals', label: 'Deals & promotions', desc: 'Special offers and flash sales' },
      { id: 'messages', label: 'Messages', desc: 'New messages from buyers or sellers' },
      { id: 'reminders', label: 'Stream reminders', desc: 'Reminder before a scheduled stream starts' },
      { id: 'community', label: 'Community', desc: 'New followers, likes, and mentions' },
    ],
  },
  he: {
    title: '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA',
    push: '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E4\u05D5\u05E9',
    items: [
      { id: 'live', label: '\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E2\u05D5\u05DC\u05D9\u05DD \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8', desc: '\u05E7\u05D1\u05DC\u05D5 \u05D4\u05EA\u05E8\u05D0\u05D4 \u05DB\u05E9\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E9\u05D0\u05EA\u05DD \u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD \u05E9\u05D9\u05D3\u05D5\u05E8' },
      { id: 'orders', label: '\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9 \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA', desc: '\u05DE\u05E9\u05DC\u05D5\u05D7, \u05DE\u05E1\u05D9\u05E8\u05D4 \u05D5\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA' },
      { id: 'deals', label: '\u05DE\u05D1\u05E6\u05E2\u05D9\u05DD \u05D5\u05DE\u05D1\u05E6\u05E2\u05D9 \u05D1\u05D6\u05E7', desc: '\u05D4\u05E6\u05E2\u05D5\u05EA \u05DE\u05D9\u05D5\u05D7\u05D3\u05D5\u05EA' },
      { id: 'messages', label: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA', desc: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA \u05DE\u05E7\u05D5\u05E0\u05D9\u05DD \u05D0\u05D5 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD' },
      { id: 'reminders', label: '\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05E9\u05D9\u05D3\u05D5\u05E8', desc: '\u05EA\u05D6\u05DB\u05D5\u05E8\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D9\u05D3\u05D5\u05E8 \u05DE\u05EA\u05D5\u05D6\u05DE\u05DF' },
      { id: 'community', label: '\u05E7\u05D4\u05D9\u05DC\u05D4', desc: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD, \u05DC\u05D9\u05D9\u05E7\u05D9\u05DD \u05D5\u05D0\u05D6\u05DB\u05D5\u05E8\u05D9\u05DD' },
    ],
  },
  es: {
    title: 'Notificaciones',
    push: 'Notificaciones Push',
    items: [
      { id: 'live', label: 'Vendedores en vivo', desc: 'Aviso cuando vendedores que sigues inician una transmision' },
      { id: 'orders', label: 'Actualizaciones de pedidos', desc: 'Envio, entrega y devoluciones' },
      { id: 'deals', label: 'Ofertas y promociones', desc: 'Ofertas especiales y ventas flash' },
      { id: 'messages', label: 'Mensajes', desc: 'Nuevos mensajes de compradores o vendedores' },
      { id: 'reminders', label: 'Recordatorios', desc: 'Recordatorio antes de una transmision programada' },
      { id: 'community', label: 'Comunidad', desc: 'Nuevos seguidores, likes y menciones' },
    ],
  },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  const [toggles, setToggles] = useState<Record<string, boolean>>({ live: true, orders: true, deals: false, messages: true, reminders: true, community: false })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.push}</p>
        {c.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1A1A1A' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <p style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{item.desc}</p>
            </div>
            <button
              onClick={() => setToggles(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              style={{
                width: '48px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', position: 'relative',
                backgroundColor: toggles[item.id] ? '#F0908A' : '#333',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '3px',
                left: toggles[item.id] ? '23px' : '3px',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

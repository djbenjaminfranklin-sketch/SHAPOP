import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'

const content = {
  fr: { title: 'Etat du compte', member: 'Membre depuis', email: 'E-mail', status: 'Statut', active: 'Actif', verified: 'Verifie', seller: 'Vendeur', yes: 'Oui', no: 'Non', id: 'Identifiant du compte' },
  en: { title: 'Account Status', member: 'Member since', email: 'Email', status: 'Status', active: 'Active', verified: 'Verified', seller: 'Seller', yes: 'Yes', no: 'No', id: 'Account ID' },
  he: { title: '\u05DE\u05E6\u05D1 \u05D7\u05E9\u05D1\u05D5\u05DF', member: '\u05D7\u05D1\u05E8 \u05DE\u05D0\u05D6', email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC', status: '\u05DE\u05E6\u05D1', active: '\u05E4\u05E2\u05D9\u05DC', verified: '\u05DE\u05D0\u05D5\u05DE\u05EA', seller: '\u05DE\u05D5\u05DB\u05E8', yes: '\u05DB\u05DF', no: '\u05DC\u05D0', id: '\u05DE\u05D6\u05D4\u05D4 \u05D7\u05E9\u05D1\u05D5\u05DF' },
  es: { title: 'Estado de Cuenta', member: 'Miembro desde', email: 'Email', status: 'Estado', active: 'Activo', verified: 'Verificado', seller: 'Vendedor', yes: 'Si', no: 'No', id: 'ID de Cuenta' },
}

export default function AccountStatusPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = getLang()
  const c = content[lang] || content.fr

  const rows = [
    { label: c.email, value: user?.email || '-' },
    { label: c.status, value: c.active, accent: true },
    { label: c.verified, value: user?.email_confirmed_at ? c.yes : c.no },
    { label: c.seller, value: profile?.is_seller ? c.yes : c.no },
    { label: c.member, value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-' },
    { label: c.id, value: user?.id?.slice(0, 8) + '...' || '-' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #1A1A1A' }}>
            <span style={{ fontSize: '15px', color: '#888' }}>{row.label}</span>
            <span style={{ fontSize: '15px', color: row.accent ? '#4ade80' : '#fff', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

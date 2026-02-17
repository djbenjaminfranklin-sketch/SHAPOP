import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'

type Lang = 'fr' | 'en' | 'he' | 'es'

const content: Record<Lang, Record<string, string>> = {
  fr: { title: 'Etat du compte', member: 'Membre depuis', email: 'E-mail', status: 'Statut', active: 'Actif', verified: 'Verifie', seller: 'Vendeur', yes: 'Oui', no: 'Non', id: 'Identifiant du compte', myScore: 'Ma note', orders: 'Commandes', disputes: 'Litiges', excellent: 'Excellent', good: 'Bon', warning: 'Attention', blocked: 'Bloque' },
  en: { title: 'Account Status', member: 'Member since', email: 'Email', status: 'Status', active: 'Active', verified: 'Verified', seller: 'Seller', yes: 'Yes', no: 'No', id: 'Account ID', myScore: 'My rating', orders: 'Orders', disputes: 'Disputes', excellent: 'Excellent', good: 'Good', warning: 'Warning', blocked: 'Blocked' },
  he: { title: '\u05DE\u05E6\u05D1 \u05D7\u05E9\u05D1\u05D5\u05DF', member: '\u05D7\u05D1\u05E8 \u05DE\u05D0\u05D6', email: '\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC', status: '\u05DE\u05E6\u05D1', active: '\u05E4\u05E2\u05D9\u05DC', verified: '\u05DE\u05D0\u05D5\u05DE\u05EA', seller: '\u05DE\u05D5\u05DB\u05E8', yes: '\u05DB\u05DF', no: '\u05DC\u05D0', id: '\u05DE\u05D6\u05D4\u05D4 \u05D7\u05E9\u05D1\u05D5\u05DF', myScore: '\u05D4\u05D3\u05D9\u05E8\u05D5\u05D2 \u05E9\u05DC\u05D9', orders: '\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA', disputes: '\u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA', excellent: '\u05DE\u05E6\u05D5\u05D9\u05DF', good: '\u05D8\u05D5\u05D1', warning: '\u05D0\u05D6\u05D4\u05E8\u05D4', blocked: '\u05D7\u05E1\u05D5\u05DD' },
  es: { title: 'Estado de Cuenta', member: 'Miembro desde', email: 'Email', status: 'Estado', active: 'Activo', verified: 'Verificado', seller: 'Vendedor', yes: 'Si', no: 'No', id: 'ID de Cuenta', myScore: 'Mi nota', orders: 'Pedidos', disputes: 'Disputas', excellent: 'Excelente', good: 'Bueno', warning: 'Atencion', blocked: 'Bloqueado' },
}

export default function AccountStatusPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const lang = getLang() as Lang
  const c = content[lang] || content.fr
  const [score, setScore] = useState<{ score: number; total_orders: number; total_disputes: number; risk_level: string } | null>(null)

  useEffect(() => {
    const fetchScore = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await apiFetch('/api/my-score', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setScore(data)
        }
      } catch { /* ignore */ }
    }
    fetchScore()
  }, [])

  const rows = [
    { label: c.email, value: user?.email || '-' },
    { label: c.status, value: c.active, accent: true },
    { label: c.verified, value: user?.email_confirmed_at ? c.yes : c.no },
    { label: c.seller, value: profile?.is_seller ? c.yes : c.no },
    { label: c.member, value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-' },
    { label: c.id, value: user?.id?.slice(0, 8) + '...' || '-' },
  ]

  // Score color based on value
  const getScoreColor = (s: number) => {
    if (s >= 8) return '#4ade80'
    if (s >= 6) return '#F0908A'
    if (s >= 4) return '#fbbf24'
    return '#ef4444'
  }

  const getScoreLabel = (s: number) => {
    if (s >= 8) return c.excellent
    if (s >= 6) return c.good
    if (s >= 4) return c.warning
    return c.blocked
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button aria-label="Back" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      {/* Score card — Uber-style */}
      {score && (
        <div style={{ margin: '20px', padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #111, #1A1A1A)', border: '1px solid #222' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.myScore}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Big score number */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '42px', fontWeight: 800, color: getScoreColor(score.score), lineHeight: 1 }}>
                {score.score.toFixed(1)}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#555' }}>/10</span>
            </div>
            {/* Score bar + label */}
            <div style={{ flex: 1 }}>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#222', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', borderRadius: '3px', backgroundColor: getScoreColor(score.score), width: `${(score.score / 10) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: getScoreColor(score.score) }}>{getScoreLabel(score.score)}</span>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{c.orders}: {score.total_orders}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>{c.disputes}: {score.total_disputes}</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#444', marginTop: '12px', lineHeight: 1.5 }}>
            {lang === 'en' ? 'Your score is calculated automatically based on your buying behavior: completed orders, payment delays, and disputes.' :
             lang === 'he' ? 'הציון שלך מחושב אוטומטית על סמך התנהגות הקנייה שלך: הזמנות שהושלמו, עיכובי תשלום ומחלוקות.' :
             lang === 'es' ? 'Tu puntuacion se calcula automaticamente segun tu comportamiento de compra: pedidos completados, retrasos de pago y disputas.' :
             'Ta note est calculee automatiquement selon ton comportement d\'achat : commandes completees, delais de paiement et litiges.'}
          </p>
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
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

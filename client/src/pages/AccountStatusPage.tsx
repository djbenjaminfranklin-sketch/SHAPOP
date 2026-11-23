import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLocale, tr, type Localized } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type StatusText = Record<'title' | 'member' | 'email' | 'status' | 'active' | 'verified' | 'seller' | 'yes' | 'no' | 'id' | 'myScore' | 'orders' | 'disputes' | 'excellent' | 'good' | 'warning' | 'blocked' | 'scoreInfo' | 'goBack', string>

const content: Localized<StatusText> = {
  en: {
    title: 'Account status',
    member: 'Member since',
    email: 'Email',
    status: 'Status',
    active: 'Active',
    verified: 'Email verified',
    seller: 'Seller',
    yes: 'Yes',
    no: 'No',
    id: 'Account ID',
    myScore: 'My rating',
    orders: 'Orders',
    disputes: 'Disputes',
    excellent: 'Excellent',
    good: 'Good',
    warning: 'Watch out',
    blocked: 'Blocked',
    scoreInfo: 'Your score is calculated automatically from how you buy: completed orders, late payments and disputes.',
    goBack: 'Go back',
  },
  fr: {
    title: 'État du compte',
    member: 'Membre depuis',
    email: 'E-mail',
    status: 'Statut',
    active: 'Actif',
    verified: 'E-mail vérifié',
    seller: 'Vendeur',
    yes: 'Oui',
    no: 'Non',
    id: 'Identifiant du compte',
    myScore: 'Ma note',
    orders: 'Commandes',
    disputes: 'Litiges',
    excellent: 'Excellent',
    good: 'Bon',
    warning: 'Attention',
    blocked: 'Bloqué',
    scoreInfo: 'Ta note est calculée automatiquement selon ton comportement d’achat : commandes terminées, retards de paiement et litiges.',
    goBack: 'Retour',
  },
  es: {
    title: 'Estado de la cuenta',
    member: 'Miembro desde',
    email: 'Correo',
    status: 'Estado',
    active: 'Activa',
    verified: 'Correo verificado',
    seller: 'Vendedor',
    yes: 'Sí',
    no: 'No',
    id: 'ID de la cuenta',
    myScore: 'Mi puntuación',
    orders: 'Pedidos',
    disputes: 'Disputas',
    excellent: 'Excelente',
    good: 'Buena',
    warning: 'Atención',
    blocked: 'Bloqueada',
    scoreInfo: 'Tu puntuación se calcula automáticamente según cómo compras: pedidos completados, retrasos en los pagos y disputas.',
    goBack: 'Volver',
  },
  ru: {
    title: 'Статус аккаунта',
    member: 'Участник с',
    email: 'E-mail',
    status: 'Статус',
    active: 'Активен',
    verified: 'E-mail подтверждён',
    seller: 'Продавец',
    yes: 'Да',
    no: 'Нет',
    id: 'ID аккаунта',
    myScore: 'Мой рейтинг',
    orders: 'Заказы',
    disputes: 'Споры',
    excellent: 'Отлично',
    good: 'Хорошо',
    warning: 'Внимание',
    blocked: 'Заблокирован',
    scoreInfo: 'Рейтинг рассчитывается автоматически по твоим покупкам: завершённые заказы, задержки оплаты и споры.',
    goBack: 'Назад',
  },
  he: {
    title: 'מצב החשבון',
    member: 'חבר/ה מאז',
    email: 'אימייל',
    status: 'סטטוס',
    active: 'פעיל',
    verified: 'אימייל מאומת',
    seller: 'מוכר/ת',
    yes: 'כן',
    no: 'לא',
    id: 'מזהה חשבון',
    myScore: 'הדירוג שלי',
    orders: 'הזמנות',
    disputes: 'מחלוקות',
    excellent: 'מצוין',
    good: 'טוב',
    warning: 'שימו לב',
    blocked: 'חסום',
    scoreInfo: 'הציון מחושב אוטומטית לפי הרגלי הקנייה שלך: הזמנות שהושלמו, עיכובים בתשלום ומחלוקות.',
    goBack: 'חזרה',
  },
}

export default function AccountStatusPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const c = tr(content)
  usePageTitle(c.title)
  const [score, setScore] = useState<{ score: number; total_orders: number; total_disputes: number; risk_level: string } | null>(null)
  const [loading, setLoading] = useState(true)

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
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    fetchScore()
  }, [])

  const rows = [
    { label: c.email, value: user?.email || '-' },
    { label: c.status, value: c.active, accent: true },
    { label: c.verified, value: user?.email_confirmed_at ? c.yes : c.no },
    { label: c.seller, value: profile?.is_seller ? c.yes : c.no },
    { label: c.member, value: user?.created_at ? new Date(user.created_at).toLocaleDateString(getLocale()) : '-' },
    { label: c.id, value: user?.id ? user.id.slice(0, 8) + '…' : '-' },
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
        <button aria-label={c.goBack} onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#F0908A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (<>
      {/* Score card — Uber-style */}
      {score && (
        <div style={{ margin: '20px', padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #111, #1A1A1A)', border: '1px solid #222' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.myScore}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Big score number */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '42px', fontWeight: 800, color: getScoreColor(score.score), lineHeight: 1 }}>
                {score.score.toLocaleString(getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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
            {c.scoreInfo}
          </p>
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #1A1A1A' }}>
            <span style={{ fontSize: '15px', color: '#888' }}>{row.label}</span>
            <span style={{ fontSize: '15px', color: row.accent ? '#4ade80' : '#fff', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>
      </>)}
    </div>
  )
}

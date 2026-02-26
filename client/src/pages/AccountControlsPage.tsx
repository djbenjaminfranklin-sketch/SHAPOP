import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { apiFetch } from '../lib/api'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

type Lang = ReturnType<typeof getLang>

const tx = (fr: string, en: string, he: string, es: string, lang: Lang) => {
  if (lang === 'en') return en
  if (lang === 'he') return he
  if (lang === 'es') return es
  return fr
}

type Tab = 'watch' | 'spending' | 'settings'

const STORAGE_KEY = 'shapop_account_controls'

interface ControlSettings {
  watchAlertEnabled: boolean
  watchLimitEnabled: boolean
  watchLimitHours: number
  watchLimitMinutes: number
  watchLimitPeriod: 'week' | 'month'
  spendingAlertEnabled: boolean
  spendingLimitEnabled: boolean
  spendingLimitAmount: number
  spendingLimitPeriod: 'week' | 'month'
  dmEnabled: boolean
  privateParticipation: boolean
  activityStatus: boolean
  // General
  appearance: 'dark' | 'light' | 'auto'
  streamQuality: 'auto' | 'low' | 'medium' | 'high'
  // Notifications
  contactSync: boolean
  accountRecommendation: boolean
  priceDropAlerts: boolean
  smartNotifications: boolean
  // Experience
  auctionHaptics: boolean
  ecoMode: boolean
  nightModeEnabled: boolean
  nightModeStart: string
  nightModeEnd: string
  textSize: 'small' | 'normal' | 'large'
  // Content
  liveClips: boolean
  pastLivesVisible: boolean
  // Rewards
  communityBoosts: boolean
  realtimePromoFeedback: boolean
}

const defaultSettings: ControlSettings = {
  watchAlertEnabled: false,
  watchLimitEnabled: false,
  watchLimitHours: 0,
  watchLimitMinutes: 0,
  watchLimitPeriod: 'week',
  spendingAlertEnabled: false,
  spendingLimitEnabled: false,
  spendingLimitAmount: 0,
  spendingLimitPeriod: 'week',
  dmEnabled: true,
  privateParticipation: false,
  activityStatus: true,
  appearance: 'light',
  streamQuality: 'auto',
  contactSync: false,
  accountRecommendation: true,
  priceDropAlerts: false,
  smartNotifications: false,
  auctionHaptics: true,
  ecoMode: false,
  nightModeEnabled: false,
  nightModeStart: '22:00',
  nightModeEnd: '07:00',
  textSize: 'normal',
  liveClips: true,
  pastLivesVisible: true,
  communityBoosts: true,
  realtimePromoFeedback: true,
}

function loadSettings(): ControlSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...defaultSettings }
}

function saveSettings(s: ControlSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  window.dispatchEvent(new Event('shapop-settings-changed'))
}

export default function AccountControlsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const lang = getLang()
  usePageTitle(tx('Contrôles du compte', 'Account Controls', 'בקרת חשבון', 'Controles de cuenta', lang))

  const [activeTab, setActiveTab] = useState<Tab>('watch')
  const [settings, setSettings] = useState<ControlSettings>(loadSettings)
  const [watchTimeMin, setWatchTimeMin] = useState(0)
  const [spendingAmount, setSpendingAmount] = useState(0)
  const [, setServerSpendLimit] = useState<{ weekly_limit: number | null; monthly_limit: number | null; is_active: boolean } | null>(null)
  const [savingLimits, setSavingLimits] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Compute watch time from localStorage tracker
  useEffect(() => {
    const raw = localStorage.getItem('shapop_watch_log')
    if (raw) {
      try {
        const logs: { ts: number; duration: number }[] = JSON.parse(raw)
        const now = Date.now()
        const periodMs = settings.watchLimitPeriod === 'week' ? 7 * 86400000 : 30 * 86400000
        const total = logs
          .filter(l => now - l.ts < periodMs)
          .reduce((sum, l) => sum + l.duration, 0)
        setWatchTimeMin(Math.round(total / 60))
      } catch { /* ignore */ }
    }
  }, [settings.watchLimitPeriod])

  // Compute spending from buyer stats API + fallback to orders
  useEffect(() => {
    if (!user) return
    const fetchSpending = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          const res = await apiFetch('/api/buyer/stats', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setSpendingAmount(Math.round((data.total_spent || 0) * 100) / 100)
            return
          }
        }
      } catch {
        // fallback to supabase query
      }
      const now = new Date()
      const periodStart = new Date()
      if (settings.spendingLimitPeriod === 'week') {
        periodStart.setDate(now.getDate() - 7)
      } else {
        periodStart.setDate(now.getDate() - 30)
      }
      const { data } = await supabase
        .from('orders')
        .select('amount')
        .eq('buyer_id', user.id)
        .gte('created_at', periodStart.toISOString())
        .in('status', ['paid', 'shipped', 'delivered'])
      if (data) {
        const total = data.reduce((sum: number, o: { amount: number }) => sum + o.amount, 0)
        setSpendingAmount(Math.round(total * 100) / 100)
      }
    }
    fetchSpending()
  }, [user, settings.spendingLimitPeriod])

  // Fetch spend limits from server
  useEffect(() => {
    if (!user) return
    const fetchLimits = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        const res = await apiFetch('/api/spend-limits', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setServerSpendLimit(data)
          // Sync server values into local settings
          if (data.is_active !== undefined) {
            update({
              spendingLimitEnabled: data.is_active,
              spendingLimitAmount: (settings.spendingLimitPeriod === 'week' ? data.weekly_limit : data.monthly_limit) || 0,
            })
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchLimits()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Save spend limits to server
  const saveSpendLimits = async () => {
    if (!user) return
    setSavingLimits(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return
      const body: Record<string, unknown> = {
        is_active: settings.spendingLimitEnabled,
      }
      if (settings.spendingLimitPeriod === 'week') {
        body.weekly_limit = settings.spendingLimitAmount
      } else {
        body.monthly_limit = settings.spendingLimitAmount
      }
      const res = await apiFetch('/api/spend-limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setServerSpendLimit(data)
      }
    } catch {
      // silently fail
    }
    setSavingLimits(false)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No session')
      const res = await apiFetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setDeleting(false)
      alert(tx('Erreur lors de la suppression', 'Error deleting account', 'שגיאה במחיקת החשבון', 'Error al eliminar la cuenta', lang))
    }
  }

  const update = (partial: Partial<ControlSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial }
      saveSettings(next)
      return next
    })
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const periodLabel = (period: 'week' | 'month') =>
    period === 'week'
      ? tx('Cette semaine', 'This week', 'השבוע', 'Esta semana', lang)
      : tx('Ce mois-ci', 'This month', 'החודש', 'Este mes', lang)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'watch', label: tx('Durée de visionnage', 'Watch time', 'זמן צפייה', 'Tiempo de visualización', lang) },
    { key: 'spending', label: tx('Contrôles des dépenses', 'Spending controls', 'בקרת הוצאות', 'Control de gastos', lang) },
    { key: 'settings', label: tx('Paramètres', 'Settings', 'הגדרות', 'Parámetros', lang) },
  ]

  // Swipe between tabs
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) < 50 || dy > Math.abs(dx)) return
    const tabKeys = tabs.map(t => t.key)
    const idx = tabKeys.indexOf(activeTab)
    if (dx < 0 && idx < tabKeys.length - 1) setActiveTab(tabKeys[idx + 1])
    if (dx > 0 && idx > 0) setActiveTab(tabKeys[idx - 1])
  }, [activeTab, tabs])

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    width: '48px', height: '28px', borderRadius: '14px',
    backgroundColor: enabled ? '#22C55E' : '#333',
    position: 'relative' as const, cursor: 'pointer',
    transition: 'background-color 0.2s', border: 'none', padding: 0,
    flexShrink: 0,
  })

  const toggleDot = (enabled: boolean): React.CSSProperties => ({
    width: '22px', height: '22px', borderRadius: '50%',
    backgroundColor: '#fff', position: 'absolute' as const,
    top: '3px', left: enabled ? '23px' : '3px',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          {tx('Contrôles de compte', 'Account controls', 'בקרות חשבון', 'Controles de cuenta', lang)}
        </h1>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #222',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 16px', border: 'none', background: 'none',
              color: activeTab === tab.key ? '#F0908A' : '#666',
              fontSize: '14px', fontWeight: activeTab === tab.key ? 700 : 500,
              borderBottom: activeTab === tab.key ? '2px solid #F0908A' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 16px' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* ═══════ WATCH TIME TAB ═══════ */}
        {activeTab === 'watch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Watch time counter */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>
                {tx('Durée de visionnage', 'Watch time', 'זמן צפייה', 'Tiempo de visualización', lang)}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {watchTimeMin}min
                </p>
                <button
                  onClick={() => update({ watchLimitPeriod: settings.watchLimitPeriod === 'week' ? 'month' : 'week' })}
                  style={{
                    padding: '8px 16px', borderRadius: '20px',
                    backgroundColor: '#222', border: 'none',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {periodLabel(settings.watchLimitPeriod)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                {settings.watchLimitPeriod === 'week'
                  ? tx('15-21 févr. 2026', '15-21 Feb 2026', '15-21 פבר׳ 2026', '15-21 feb. 2026', lang)
                  : tx('Janvier 2026', 'January 2026', 'ינואר 2026', 'Enero 2026', lang)}
              </p>
            </div>

            {/* Watch alert */}
            <div
              onClick={() => update({ watchAlertEnabled: !settings.watchAlertEnabled })}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '18px 16px',
                display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Alerte de temps de visionnage', 'Watch time alert', 'התראת זמן צפייה', 'Alerta de tiempo', lang)}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tx('Définis une limite et reçois une notification.', 'Set a limit and receive a notification.', 'הגדר מגבלה וקבל התראה.', 'Define un límite y recibe una notificación.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.watchAlertEnabled)}>
                <div style={toggleDot(settings.watchAlertEnabled)} />
              </div>
            </div>

            {/* Watch limit */}
            <div
              onClick={() => update({ watchLimitEnabled: !settings.watchLimitEnabled })}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '18px 16px',
                display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Limite de visionnage', 'Watch time limit', 'מגבלת זמן צפייה', 'Limite de tiempo', lang)}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tx('Le visionnage s\'arrête lorsque la limite est atteinte.', 'Watching stops when the limit is reached.', 'הצפייה נעצרת כשהמגבלה מושגת.', 'La visualización se detiene al alcanzar el límite.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.watchLimitEnabled)}>
                <div style={toggleDot(settings.watchLimitEnabled)} />
              </div>
            </div>

            {settings.watchLimitEnabled && (
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                  {tx('Définir la limite', 'Set the limit', 'הגדר מגבלה', 'Definir límite', lang)}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tx('Heures', 'Hours', 'שעות', 'Horas', lang)}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={settings.watchLimitHours}
                      onChange={e => update({ watchLimitHours: Math.max(0, Math.min(24, Number(e.target.value) || 0)) })}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '16px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tx('Minutes', 'Minutes', 'דקות', 'Minutos', lang)}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={settings.watchLimitMinutes}
                      onChange={e => update({ watchLimitMinutes: Math.max(0, Math.min(59, Number(e.target.value) || 0)) })}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '16px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, margin: 0 }}>
              {tx(
                'Reprends le contrôle de ton temps d\'écran et regarde les lives à ton rythme en définissant des limites ou des alertes.',
                'Take back control of your screen time and watch lives at your own pace by setting limits or alerts.',
                'קח שליטה על זמן המסך שלך וצפה בשידורים בקצב שלך על ידי הגדרת מגבלות או התראות.',
                'Retoma el control de tu tiempo de pantalla y mira los directos a tu ritmo definiendo límites o alertas.',
                lang
              )}
            </p>
          </div>
        )}

        {/* ═══════ SPENDING TAB ═══════ */}
        {activeTab === 'spending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Spending counter */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>
                {tx('Dépenses', 'Spending', 'הוצאות', 'Gastos', lang)}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {spendingAmount}&euro;
                </p>
                <button
                  onClick={() => update({ spendingLimitPeriod: settings.spendingLimitPeriod === 'week' ? 'month' : 'week' })}
                  style={{
                    padding: '8px 16px', borderRadius: '20px',
                    backgroundColor: '#222', border: 'none',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {periodLabel(settings.spendingLimitPeriod)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Spending alert */}
            <div
              onClick={() => update({ spendingAlertEnabled: !settings.spendingAlertEnabled })}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '18px 16px',
                display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Rappel de dépenses', 'Spending reminder', 'תזכורת הוצאות', 'Recordatorio de gastos', lang)}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tx('Définis une limite et reçois une notification.', 'Set a limit and receive a notification.', 'הגדר מגבלה וקבל התראה.', 'Define un límite y recibe una notificación.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.spendingAlertEnabled)}>
                <div style={toggleDot(settings.spendingAlertEnabled)} />
              </div>
            </div>

            {/* Spending limit */}
            <div
              onClick={() => update({ spendingLimitEnabled: !settings.spendingLimitEnabled })}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '18px 16px',
                display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#222',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Limite de dépenses', 'Spending limit', 'מגבלת הוצאות', 'Límite de gastos', lang)}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tx('Les dépenses s\'arrêtent à ta limite.', 'Spending stops at your limit.', 'ההוצאות נעצרות במגבלה שלך.', 'Los gastos se detienen en tu límite.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.spendingLimitEnabled)}>
                <div style={toggleDot(settings.spendingLimitEnabled)} />
              </div>
            </div>

            {settings.spendingLimitEnabled && (
              <>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                    {tx('Montant maximum', 'Maximum amount', 'סכום מקסימלי', 'Monto máximo', lang)}
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={settings.spendingLimitAmount || ''}
                      onChange={e => update({ spendingLimitAmount: Math.max(0, Number(e.target.value) || 0) })}
                      onClick={e => e.stopPropagation()}
                      placeholder="100"
                      style={{
                        width: '100%', padding: '10px 12px', paddingRight: '36px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '16px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '16px', fontWeight: 600 }}>€</span>
                  </div>
                  <button
                    onClick={saveSpendLimits}
                    disabled={savingLimits}
                    style={{
                      width: '100%', marginTop: '12px', padding: '14px',
                      borderRadius: '10px', border: 'none', cursor: savingLimits ? 'not-allowed' : 'pointer',
                      background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
                      color: '#fff', fontSize: '15px', fontWeight: 700,
                      opacity: savingLimits ? 0.6 : 1,
                    }}
                  >
                    {savingLimits
                      ? tx('Sauvegardé...', 'Saving...', '...שומר', 'Guardando...', lang)
                      : tx('Enregistrer la limite', 'Save limit', 'שמור מגבלה', 'Guardar límite', lang)}
                  </button>
                </div>

                {/* Spending progress bar */}
                {settings.spendingLimitAmount > 0 && (() => {
                  const limit = settings.spendingLimitAmount
                  const ratio = limit > 0 ? spendingAmount / limit : 0
                  const pct = Math.min(ratio * 100, 100)
                  const exceeded = ratio >= 1
                  const barColor = exceeded ? '#EF4444' : ratio > 0.75 ? '#F59E0B' : '#22C55E'
                  return (
                    <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: exceeded ? '#EF4444' : '#fff', margin: 0 }}>
                          {spendingAmount}&euro; / {limit}&euro;
                        </p>
                        <p style={{ fontSize: '12px', color: exceeded ? '#EF4444' : '#888', margin: 0 }}>
                          {Math.round(pct)}%
                        </p>
                      </div>
                      <div style={{
                        width: '100%', height: '8px', borderRadius: '4px',
                        backgroundColor: '#333', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          borderRadius: '4px', backgroundColor: barColor,
                          transition: 'width 0.5s ease, background-color 0.3s ease',
                        }} />
                      </div>
                      {exceeded ? (
                        <p style={{ fontSize: '12px', color: '#EF4444', margin: '8px 0 0', fontWeight: 600 }}>
                          {tx('Limite dépassée !', 'Limit exceeded!', 'המגבלה חורגה!', '¡Límite superado!', lang)}
                        </p>
                      ) : ratio > 0.75 && (
                        <p style={{ fontSize: '12px', color: '#F59E0B', margin: '8px 0 0', fontWeight: 600 }}>
                          {tx('Attention : limite presque atteinte !', 'Warning: limit almost reached!', 'אזהרה: המגבלה כמעט הושגה!', '¡Atención: límite casi alcanzado!', lang)}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </>
            )}

            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, margin: 0 }}>
              {tx(
                'Gère tes dépenses et achète selon tes conditions en configurant des limites ou des rappels.',
                'Manage your spending and buy on your own terms by setting limits or reminders.',
                'נהל את ההוצאות שלך וקנה לפי התנאים שלך על ידי הגדרת מגבלות או תזכורות.',
                'Gestiona tus gastos y compra según tus condiciones configurando límites o recordatorios.',
                lang
              )}
            </p>
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═══════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>

            {/* ─── SECTION: GÉNÉRAL ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px', paddingLeft: '2px' }}>
              {tx('General', 'General', 'כללי', 'General', lang)}
            </p>

            {/* Appearance */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {tx('Apparence', 'Appearance', 'מראה', 'Apariencia', lang)}
              </p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tx('Choisis le thème de l\'application.', 'Choose the app theme.', 'בחר את ערכת הנושא של האפליקציה.', 'Elige el tema de la aplicación.', lang)}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { v: 'dark' as const, l: tx('Sombre', 'Dark', 'כהה', 'Oscuro', lang), ico: '🌙' },
                  { v: 'light' as const, l: tx('Clair', 'Light', 'בהיר', 'Claro', lang), ico: '☀️' },
                  { v: 'auto' as const, l: tx('Auto', 'Auto', 'אוטו', 'Auto', lang), ico: '🔄' },
                ]).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => update({ appearance: opt.v })}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      backgroundColor: settings.appearance === opt.v ? '#F0908A' : '#222',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{opt.ico}</span>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{opt.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Quality — INNOVATION */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {tx('Qualité du stream', 'Stream quality', 'איכות שידור', 'Calidad del stream', lang)}
                </p>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>NEW</span>
              </div>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tx('Réduis la qualité pour économiser des données mobiles.', 'Lower quality to save mobile data.', 'הפחת איכות כדי לחסוך בנתונים ניידים.', 'Baja la calidad para ahorrar datos móviles.', lang)}
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { v: 'auto' as const, l: 'Auto' },
                  { v: 'low' as const, l: '360p' },
                  { v: 'medium' as const, l: '720p' },
                  { v: 'high' as const, l: '1080p' },
                ]).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => update({ streamQuality: opt.v })}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      backgroundColor: settings.streamQuality === opt.v ? '#F0908A' : '#222',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size — INNOVATION */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {tx('Taille du texte', 'Text size', 'גודל טקסט', 'Tamaño de texto', lang)}
                </p>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>NEW</span>
              </div>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tx('Ajuste la taille du texte pour plus de confort.', 'Adjust text size for comfort.', 'התאם את גודל הטקסט לנוחות.', 'Ajusta el tamaño del texto para mayor comodidad.', lang)}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { v: 'small' as const, l: tx('Petit', 'Small', 'קטן', 'Pequeño', lang), sz: '12px' },
                  { v: 'normal' as const, l: tx('Normal', 'Normal', 'רגיל', 'Normal', lang), sz: '15px' },
                  { v: 'large' as const, l: tx('Grand', 'Large', 'גדול', 'Grande', lang), sz: '18px' },
                ]).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => update({ textSize: opt.v })}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      backgroundColor: settings.textSize === opt.v ? '#F0908A' : '#222',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: opt.sz, color: '#fff', fontWeight: 600 }}>Aa</span>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>{opt.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language — link to preferences */}
            <div
              onClick={() => navigate('/preferences')}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              }}
            >
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {tx('Langue', 'Language', 'שפה', 'Idioma', lang)}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
                  {lang === 'fr' ? '🇫🇷 Français' : lang === 'en' ? '🇬🇧 English' : lang === 'he' ? '🇮🇱 עברית' : '🇪🇸 Español'}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* ─── SECTION: NOTIFICATIONS & COMMUNICATION ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingLeft: '2px' }}>
              {tx('Notifications & Communication', 'Notifications & Communication', 'התראות ותקשורת', 'Notificaciones y comunicación', lang)}
            </p>

            {/* DMs */}
            <div
              onClick={() => update({ dmEnabled: !settings.dmEnabled })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Messages directs', 'Direct messages', 'הודעות ישירות', 'Mensajes directos', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Recevoir des messages des utilisateurs.', 'Receive messages from users.', 'קבל הודעות ממשתמשים.', 'Recibir mensajes de usuarios.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.dmEnabled)}><div style={toggleDot(settings.dmEnabled)} /></div>
            </div>

            {/* Private participation */}
            <div
              onClick={() => update({ privateParticipation: !settings.privateParticipation })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Participation privée', 'Private participation', 'השתתפות פרטית', 'Participación privada', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Rejoins les lives sans être annoncé(e).', 'Join lives without being announced.', 'הצטרף לשידורים בלי להיות מוכרז.', 'Únete a directos sin ser anunciado.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.privateParticipation)}><div style={toggleDot(settings.privateParticipation)} /></div>
            </div>

            {/* Activity status */}
            <div
              onClick={() => update({ activityStatus: !settings.activityStatus })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Statut de l\'activité', 'Activity status', 'סטטוס פעילות', 'Estado de actividad', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Partage tes activités avec tes amis.', 'Share your activities with friends.', 'שתף את הפעילות שלך עם חברים.', 'Comparte tus actividades con amigos.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.activityStatus)}><div style={toggleDot(settings.activityStatus)} /></div>
            </div>

            {/* Contact sync */}
            <div
              onClick={() => update({ contactSync: !settings.contactSync })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Synchroniser les contacts', 'Contact sync', 'סנכרון אנשי קשר', 'Sincronizar contactos', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Retrouve tes amis qui utilisent ShaPop.', 'Find friends who use ShaPop.', 'מצא חברים שמשתמשים ב-ShaPop.', 'Encuentra amigos que usan ShaPop.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.contactSync)}><div style={toggleDot(settings.contactSync)} /></div>
            </div>

            {/* Account recommendation */}
            <div
              onClick={() => update({ accountRecommendation: !settings.accountRecommendation })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Recommandation de compte', 'Account recommendation', 'המלצת חשבון', 'Recomendacion de cuenta', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Autorise ShaPop a suggerer ton profil.', 'Allow ShaPop to suggest your profile.', 'אפשר ל-ShaPop להמליץ על הפרופיל שלך.', 'Permite a ShaPop sugerir tu perfil.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.accountRecommendation)}><div style={toggleDot(settings.accountRecommendation)} /></div>
            </div>

            {/* Price drop alerts — INNOVATION */}
            <div
              onClick={() => update({ priceDropAlerts: !settings.priceDropAlerts })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {tx('Alertes baisse de prix', 'Price drop alerts', 'התראות ירידת מחיר', 'Alertas de bajada de precio', lang)}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>NEW</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Sois notifié(e) quand un vendeur suivi baisse ses prix.', 'Get notified when a followed seller drops prices.', 'קבל התראה כשמוכר שאתה עוקב אחריו מוריד מחירים.', 'Recibe alertas cuando un vendedor seguido baja precios.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.priceDropAlerts)}><div style={toggleDot(settings.priceDropAlerts)} /></div>
            </div>

            {/* Smart notifications — INNOVATION */}
            <div
              onClick={() => update({ smartNotifications: !settings.smartNotifications })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '0 0 14px 14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {tx('Notifications intelligentes', 'Smart notifications', 'התראות חכמות', 'Notificaciones inteligentes', lang)}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>NEW</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('L\'IA filtre les notifications selon tes centres d\'intérêt.', 'AI filters notifications based on your interests.', 'AI מסנן התראות לפי תחומי העניין שלך.', 'La IA filtra notificaciones según tus intereses.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.smartNotifications)}><div style={toggleDot(settings.smartNotifications)} /></div>
            </div>

            {/* ─── SECTION: EXPÉRIENCE ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingLeft: '2px' }}>
              {tx('Expérience', 'Experience', 'חוויה', 'Experiencia', lang)}
            </p>

            {/* Auction haptics */}
            <div
              onClick={() => update({ auctionHaptics: !settings.auctionHaptics })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Retour haptique enchères', 'Auction haptic feedback', 'משוב הפטי במכירות', 'Vibración en subastas', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Vibration lors des enchères et des achats.', 'Vibration on bids and purchases.', 'רטט בהצעות ורכישות.', 'Vibración en pujas y compras.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.auctionHaptics)}><div style={toggleDot(settings.auctionHaptics)} /></div>
            </div>

            {/* Eco mode — INNOVATION */}
            <div
              onClick={() => update({ ecoMode: !settings.ecoMode })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {tx('Mode eco', 'Eco mode', 'מצב חיסכון', 'Modo eco', lang)}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#22C55E', borderRadius: '4px', padding: '2px 6px' }}>ECO</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Reduit la consommation de donnees et de batterie.', 'Reduces data and battery usage.', 'מפחית שימוש בנתונים ובסוללה.', 'Reduce el consumo de datos y bateria.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.ecoMode)}><div style={toggleDot(settings.ecoMode)} /></div>
            </div>

            {/* Night mode — INNOVATION */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '0 0 14px 14px', padding: '16px', marginBottom: '10px' }}>
              <div
                onClick={() => update({ nightModeEnabled: !settings.nightModeEnabled })}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                      {tx('Mode nuit programme', 'Scheduled night mode', 'מצב לילה מתוזמן', 'Modo nocturno programado', lang)}
                    </p>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>NEW</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                    {tx('Desactive automatiquement les notifications la nuit.', 'Automatically mutes notifications at night.', 'משתיק התראות אוטומטית בלילה.', 'Silencia automaticamente las notificaciones de noche.', lang)}
                  </p>
                </div>
                <div style={toggleStyle(settings.nightModeEnabled)}><div style={toggleDot(settings.nightModeEnabled)} /></div>
              </div>
              {settings.nightModeEnabled && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #222' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tx('Debut', 'Start', 'התחלה', 'Inicio', lang)}
                    </label>
                    <input
                      type="time"
                      value={settings.nightModeStart}
                      onChange={e => update({ nightModeStart: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tx('Fin', 'End', 'סיום', 'Fin', lang)}
                    </label>
                    <input
                      type="time"
                      value={settings.nightModeEnd}
                      onChange={e => update({ nightModeEnd: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── SECTION: CONTENU ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingLeft: '2px' }}>
              {tx('Contenu', 'Content', 'תוכן', 'Contenido', lang)}
            </p>

            {/* Live clips */}
            <div
              onClick={() => update({ liveClips: !settings.liveClips })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Clips des lives', 'Live clips', 'קליפים מהשידורים', 'Clips de directos', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Autorise la creation de clips a partir de tes lives.', 'Allow clips to be created from your lives.', 'אפשר יצירת קליפים מהשידורים שלך.', 'Permite crear clips de tus directos.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.liveClips)}><div style={toggleDot(settings.liveClips)} /></div>
            </div>

            {/* Past lives visibility */}
            <div
              onClick={() => update({ pastLivesVisible: !settings.pastLivesVisible })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '0 0 14px 14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Visibilite des lives passes', 'Past lives visibility', 'נראות שידורים קודמים', 'Visibilidad de directos pasados', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Affiche tes anciens lives sur ton profil public.', 'Show past lives on your public profile.', 'הצג שידורים קודמים בפרופיל הציבורי שלך.', 'Muestra directos pasados en tu perfil publico.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.pastLivesVisible)}><div style={toggleDot(settings.pastLivesVisible)} /></div>
            </div>

            {/* ─── SECTION: RÉCOMPENSES ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingLeft: '2px' }}>
              {tx('Recompenses', 'Rewards', 'תגמולים', 'Recompensas', lang)}
            </p>

            {/* Rewards club — display */}
            <div style={{
              backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #222',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Club de recompenses', 'Rewards club', 'מועדון תגמולים', 'Club de recompensas', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#F0908A', margin: '3px 0 0', fontWeight: 600 }}>
                  {tx('Membre actif', 'Active member', 'חבר פעיל', 'Miembro activo', lang)} ⭐
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Community boosts */}
            <div
              onClick={() => update({ communityBoosts: !settings.communityBoosts })}
              style={{ backgroundColor: '#1A1A1A', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Boosts communautaires', 'Community boosts', 'בוסטים קהילתיים', 'Boosts comunitarios', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Utilise tes points pour booster des vendeurs.', 'Use your points to boost sellers.', 'השתמש בנקודות שלך כדי לקדם מוכרים.', 'Usa tus puntos para impulsar vendedores.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.communityBoosts)}><div style={toggleDot(settings.communityBoosts)} /></div>
            </div>

            {/* Real-time promo feedback */}
            <div
              onClick={() => update({ realtimePromoFeedback: !settings.realtimePromoFeedback })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '0 0 14px 14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Retours promotions en temps reel', 'Real-time promo feedback', 'משוב מבצעים בזמן אמת', 'Feedback de promos en tiempo real', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tx('Recois un retour instantane sur les offres promotionnelles.', 'Get instant feedback on promotional offers.', 'קבל משוב מיידי על מבצעים.', 'Recibe respuesta instantanea sobre ofertas promocionales.', lang)}
                </p>
              </div>
              <div style={toggleStyle(settings.realtimePromoFeedback)}><div style={toggleDot(settings.realtimePromoFeedback)} /></div>
            </div>

            {/* ─── SECTION: COMPTE ─── */}
            <p style={{ fontSize: '12px', color: '#E8344E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingLeft: '2px' }}>
              {tx('Gestion du compte', 'Account management', 'ניהול חשבון', 'Gestion de cuenta', lang)}
            </p>

            {/* Edit profile — link */}
            <div
              onClick={() => navigate('/preferences')}
              style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                borderBottom: '1px solid #222',
              }}
            >
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Modifier le profil', 'Edit profile', 'ערוך פרופיל', 'Editar perfil', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                  {tx('Nom, bio, photo de profil', 'Name, bio, profile photo', 'שם, ביו, תמונת פרופיל', 'Nombre, bio, foto de perfil', lang)}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Verification — link */}
            <div
              onClick={() => navigate('/verification')}
              style={{
                backgroundColor: '#1A1A1A', padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                borderBottom: '1px solid #222',
              }}
            >
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tx('Verification d\'identite', 'Identity verification', 'אימות זהות', 'Verificacion de identidad', lang)}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                  {tx('Selfie + piece d\'identite', 'Selfie + ID document', 'סלפי + תעודה', 'Selfie + documento', lang)}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Delete account */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '0 0 14px 14px', padding: '16px' }}>
              {!showDeleteConfirm ? (
                <div
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#E8344E', margin: 0 }}>
                      {tx('Supprimer mon compte', 'Delete my account', 'מחק את החשבון שלי', 'Eliminar mi cuenta', lang)}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                      {tx('Action irréversible', 'Irreversible action', 'פעולה בלתי הפיכה', 'Acción irreversible', lang)}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '14px', color: '#E8344E', fontWeight: 700, margin: '0 0 8px' }}>
                    {tx('Êtes-vous sûr ?', 'Are you sure?', '?האם אתה בטוח', '¿Estás seguro?', lang)}
                  </p>
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {tx(
                      'Cette action est irréversible. Toutes vos données seront supprimées. Tapez SUPPRIMER pour confirmer.',
                      'This action is irreversible. All your data will be deleted. Type DELETE to confirm.',
                      'פעולה זו בלתי הפיכה. כל הנתונים שלך יימחקו. הקלד DELETE לאישור.',
                      'Esta acción es irreversible. Todos tus datos serán eliminados. Escribe DELETE para confirmar.',
                      lang
                    )}
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={tx('SUPPRIMER', 'DELETE', 'DELETE', 'DELETE', lang)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                      marginBottom: '12px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px',
                        backgroundColor: '#333', border: 'none', color: '#fff',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {tx('Annuler', 'Cancel', 'ביטול', 'Cancelar', lang)}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || (deleteConfirmText.toUpperCase() !== tx('SUPPRIMER', 'DELETE', 'DELETE', 'DELETE', lang))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px',
                        backgroundColor: '#E8344E', border: 'none', color: '#fff',
                        fontSize: '14px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: (deleting || deleteConfirmText.toUpperCase() !== tx('SUPPRIMER', 'DELETE', 'DELETE', 'DELETE', lang)) ? 0.5 : 1,
                      }}
                    >
                      {deleting
                        ? tx('Suppression...', 'Deleting...', '...מוחק', 'Eliminando...', lang)
                        : tx('Supprimer', 'Delete', 'מחק', 'Eliminar', lang)}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom spacing */}
            <div style={{ height: '20px' }} />
          </div>
        )}
      </div>
    </div>
  )
}

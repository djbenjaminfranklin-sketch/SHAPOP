import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLocale, tr, useLang, LANG_META } from '../lib/i18n'
import { formatMoney, currencyForCountry, currencySymbol } from '../lib/fulfillment'
import { apiFetch } from '../lib/api'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

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
  // Promotions
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
  const { user, profile, signOut } = useAuth()
  const lang = useLang()
  const currency = currencyForCountry(profile?.country)
  const money = (n: number) => formatMoney(n, currency)
  // Mot à taper pour confirmer la suppression (dans la langue de l'utilisateur)
  const deleteWord = tr({ en: 'DELETE', fr: 'SUPPRIMER', es: 'ELIMINAR', ru: 'УДАЛИТЬ', he: 'מחיקה' })
  // Période affichée sous le compteur : 7 ou 30 derniers jours (comme le calcul)
  const periodRange = (period: 'week' | 'month') => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (period === 'week' ? 6 : 29))
    const fmt = new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
    try { return fmt.formatRange(start, end) } catch { return `${fmt.format(start)} – ${fmt.format(end)}` }
  }
  const minutesLabel = (n: number) => {
    try { return new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(n) } catch { return String(n) }
  }
  const newBadge = tr({ en: 'NEW', fr: 'NOUVEAU', es: 'NUEVO', ru: 'НОВОЕ', he: 'חדש' })
  usePageTitle(tr({ en: 'Account controls', fr: 'Contrôles du compte', es: 'Controles de la cuenta', ru: 'Управление аккаунтом', he: 'בקרת חשבון' }))

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
        .in('status', ['paid', 'shipped', 'handed_over', 'delivered'])
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
      if (res.status === 409) {
        setDeleting(false)
        alert(tr({ en: 'You still have orders in progress. Complete or refund them before deleting your account.', fr: 'Tu as encore des commandes en cours. Termine-les ou fais-les rembourser avant de supprimer ton compte.', es: 'Todavía tienes pedidos en curso. Complétalos o reembólsalos antes de eliminar tu cuenta.', ru: 'У тебя ещё есть текущие заказы. Заверши их или верни деньги, прежде чем удалять аккаунт.', he: 'יש לך עדיין הזמנות פתוחות. יש להשלים אותן או להחזיר כסף לפני מחיקת החשבון.' }))
        return
      }
      if (!res.ok) throw new Error('Delete failed')
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setDeleting(false)
      alert(tr({ en: 'Couldn\'t delete your account', fr: 'Impossible de supprimer ton compte', es: 'No se pudo eliminar tu cuenta', ru: 'Не удалось удалить аккаунт', he: 'לא הצלחנו למחוק את החשבון' }))
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
      ? tr({ en: 'This week', fr: 'Cette semaine', es: 'Esta semana', ru: 'На этой неделе', he: 'השבוע' })
      : tr({ en: 'This month', fr: 'Ce mois-ci', es: 'Este mes', ru: 'В этом месяце', he: 'החודש' })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'watch', label: tr({ en: 'Watch time', fr: 'Temps de visionnage', es: 'Tiempo de visualización', ru: 'Время просмотра', he: 'זמן צפייה' }) },
    { key: 'spending', label: tr({ en: 'Spending controls', fr: 'Contrôle des dépenses', es: 'Control de gastos', ru: 'Контроль расходов', he: 'בקרת הוצאות' }) },
    { key: 'settings', label: tr({ en: 'Settings', fr: 'Réglages', es: 'Ajustes', ru: 'Настройки', he: 'הגדרות' }) },
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
    top: '3px', insetInlineStart: enabled ? '23px' : '3px',
    transition: 'inset-inline-start 0.2s',
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
          {tr({ en: 'Account controls', fr: 'Contrôles du compte', es: 'Controles de la cuenta', ru: 'Управление аккаунтом', he: 'בקרת חשבון' })}
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
                {tr({ en: 'Watch time', fr: 'Temps de visionnage', es: 'Tiempo de visualización', ru: 'Время просмотра', he: 'זמן צפייה' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {minutesLabel(watchTimeMin)}
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
                {periodRange(settings.watchLimitPeriod)}
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
                  {tr({ en: 'Watch time alert', fr: 'Alerte de temps de visionnage', es: 'Alerta de tiempo de visualización', ru: 'Напоминание о времени просмотра', he: 'התראת זמן צפייה' })}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tr({ en: 'Set a limit and get a notification.', fr: 'Fixe une limite et reçois une notification.', es: 'Fija un límite y recibe una notificación.', ru: 'Установи лимит и получай уведомление.', he: 'הגדירו מגבלה וקבלו התראה.' })}
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
                  {tr({ en: 'Watch time limit', fr: 'Limite de visionnage', es: 'Límite de visualización', ru: 'Лимит просмотра', he: 'מגבלת זמן צפייה' })}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tr({ en: 'Watching stops when you reach the limit.', fr: 'Le visionnage s\'arrête quand la limite est atteinte.', es: 'La reproducción se detiene al alcanzar el límite.', ru: 'Просмотр останавливается, когда лимит исчерпан.', he: 'הצפייה נעצרת כשמגיעים למגבלה.' })}
                </p>
              </div>
              <div style={toggleStyle(settings.watchLimitEnabled)}>
                <div style={toggleDot(settings.watchLimitEnabled)} />
              </div>
            </div>

            {settings.watchLimitEnabled && (
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px' }}>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                  {tr({ en: 'Set the limit', fr: 'Fixe la limite', es: 'Fija el límite', ru: 'Установи лимит', he: 'הגדרת מגבלה' })}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tr({ en: 'Hours', fr: 'Heures', es: 'Horas', ru: 'Часы', he: 'שעות' })}
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
                      {tr({ en: 'Minutes', fr: 'Minutes', es: 'Minutos', ru: 'Минуты', he: 'דקות' })}
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
              {tr({ en: 'Take back control of your screen time and watch lives at your own pace by setting limits or alerts.', fr: 'Reprends le contrôle de ton temps d\'écran et regarde les lives à ton rythme grâce à des limites ou des alertes.', es: 'Recupera el control de tu tiempo de pantalla y mira los directos a tu ritmo con límites o alertas.', ru: 'Контролируй экранное время и смотри эфиры в своём темпе — с лимитами или напоминаниями.', he: 'קחו שליטה על זמן המסך וצפו בשידורים בקצב שלכם בעזרת מגבלות או התראות.' })}
            </p>
          </div>
        )}

        {/* ═══════ SPENDING TAB ═══════ */}
        {activeTab === 'spending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Spending counter */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>
                {tr({ en: 'Spending', fr: 'Dépenses', es: 'Gastos', ru: 'Расходы', he: 'הוצאות' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {money(spendingAmount)}
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
                  {tr({ en: 'Spending reminder', fr: 'Rappel de dépenses', es: 'Recordatorio de gastos', ru: 'Напоминание о расходах', he: 'תזכורת הוצאות' })}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tr({ en: 'Set a limit and get a notification.', fr: 'Fixe une limite et reçois une notification.', es: 'Fija un límite y recibe una notificación.', ru: 'Установи лимит и получай уведомление.', he: 'הגדירו מגבלה וקבלו התראה.' })}
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
                  {tr({ en: 'Spending limit', fr: 'Limite de dépenses', es: 'Límite de gastos', ru: 'Лимит расходов', he: 'מגבלת הוצאות' })}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {tr({ en: 'Purchases stop at your limit.', fr: 'Tes achats s\'arrêtent à ta limite.', es: 'Tus compras se detienen al llegar a tu límite.', ru: 'Покупки блокируются при достижении лимита.', he: 'הרכישות נעצרות כשמגיעים למגבלה.' })}
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
                    {tr({ en: 'Maximum amount', fr: 'Montant maximum', es: 'Importe máximo', ru: 'Максимальная сумма', he: 'סכום מקסימלי' })}
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
                        width: '100%', padding: '10px 12px', paddingInlineEnd: '36px', borderRadius: '10px',
                        backgroundColor: '#222', border: '1px solid #333', color: '#fff',
                        fontSize: '16px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '16px', fontWeight: 600 }}>{currencySymbol(currency)}</span>
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
                      ? tr({ en: 'Saving…', fr: 'Enregistrement…', es: 'Guardando…', ru: 'Сохранение…', he: 'שומר…' })
                      : tr({ en: 'Save limit', fr: 'Enregistrer la limite', es: 'Guardar límite', ru: 'Сохранить лимит', he: 'שמירת המגבלה' })}
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
                          {money(spendingAmount)} / {money(limit)}
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
                          {tr({ en: 'Limit exceeded!', fr: 'Limite dépassée !', es: '¡Límite superado!', ru: 'Лимит превышен!', he: 'חרגת מהמגבלה!' })}
                        </p>
                      ) : ratio > 0.75 && (
                        <p style={{ fontSize: '12px', color: '#F59E0B', margin: '8px 0 0', fontWeight: 600 }}>
                          {tr({ en: 'Heads up: almost at your limit!', fr: 'Attention : limite presque atteinte !', es: '¡Ojo: casi llegas a tu límite!', ru: 'Внимание: лимит почти исчерпан!', he: 'שימו לב: כמעט הגעתם למגבלה!' })}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </>
            )}

            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, margin: 0 }}>
              {tr({ en: 'Manage your spending and shop on your own terms by setting limits or reminders.', fr: 'Gère tes dépenses et achète à ta façon grâce à des limites ou des rappels.', es: 'Gestiona tus gastos y compra a tu manera con límites o recordatorios.', ru: 'Управляй расходами и покупай на своих условиях — с лимитами или напоминаниями.', he: 'נהלו את ההוצאות וקנו בתנאים שלכם בעזרת מגבלות או תזכורות.' })}
            </p>
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═══════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>

            {/* ─── SECTION: GÉNÉRAL ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'General', fr: 'Général', es: 'General', ru: 'Общие', he: 'כללי' })}
            </p>

            {/* Appearance */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {tr({ en: 'Appearance', fr: 'Apparence', es: 'Apariencia', ru: 'Оформление', he: 'מראה' })}
              </p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tr({ en: 'Choose the app theme.', fr: 'Choisis le thème de l\'application.', es: 'Elige el tema de la aplicación.', ru: 'Выбери тему приложения.', he: 'בחרו את ערכת הנושא של האפליקציה.' })}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { v: 'dark' as const, l: tr({ en: 'Dark', fr: 'Sombre', es: 'Oscuro', ru: 'Тёмная', he: 'כהה' }), ico: '🌙' },
                  { v: 'light' as const, l: tr({ en: 'Light', fr: 'Clair', es: 'Claro', ru: 'Светлая', he: 'בהיר' }), ico: '☀️' },
                  { v: 'auto' as const, l: tr({ en: 'Auto', fr: 'Auto', es: 'Auto', ru: 'Авто', he: 'אוטומטי' }), ico: '🔄' },
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
                  {tr({ en: 'Stream quality', fr: 'Qualité du live', es: 'Calidad del directo', ru: 'Качество эфира', he: 'איכות השידור' })}
                </p>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>{newBadge}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tr({ en: 'Lower the quality to save mobile data.', fr: 'Baisse la qualité pour économiser tes données mobiles.', es: 'Baja la calidad para ahorrar datos móviles.', ru: 'Снизь качество, чтобы экономить мобильный трафик.', he: 'הורידו את האיכות כדי לחסוך בגלישה.' })}
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { v: 'auto' as const, l: tr({ en: 'Auto', fr: 'Auto', es: 'Auto', ru: 'Авто', he: 'אוטומטי' }) },
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
                  {tr({ en: 'Text size', fr: 'Taille du texte', es: 'Tamaño del texto', ru: 'Размер текста', he: 'גודל טקסט' })}
                </p>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>{newBadge}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.4 }}>
                {tr({ en: 'Adjust the text size to suit you.', fr: 'Ajuste la taille du texte pour plus de confort.', es: 'Ajusta el tamaño del texto a tu gusto.', ru: 'Настрой размер текста под себя.', he: 'התאימו את גודל הטקסט לנוחותכם.' })}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { v: 'small' as const, l: tr({ en: 'Small', fr: 'Petit', es: 'Pequeño', ru: 'Мелкий', he: 'קטן' }), sz: '12px' },
                  { v: 'normal' as const, l: tr({ en: 'Normal', fr: 'Normal', es: 'Normal', ru: 'Обычный', he: 'רגיל' }), sz: '15px' },
                  { v: 'large' as const, l: tr({ en: 'Large', fr: 'Grand', es: 'Grande', ru: 'Крупный', he: 'גדול' }), sz: '18px' },
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
                  {tr({ en: 'Language', fr: 'Langue', es: 'Idioma', ru: 'Язык', he: 'שפה' })}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
                  <span className="no-theme-invert">{LANG_META[lang].flag}</span> {LANG_META[lang].name}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* ─── SECTION: NOTIFICATIONS & COMMUNICATION ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'Notifications & communication', fr: 'Notifications et communication', es: 'Notificaciones y comunicación', ru: 'Уведомления и общение', he: 'התראות ותקשורת' })}
            </p>

            {/* DMs */}
            <div
              onClick={() => update({ dmEnabled: !settings.dmEnabled })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tr({ en: 'Direct messages', fr: 'Messages privés', es: 'Mensajes directos', ru: 'Личные сообщения', he: 'הודעות ישירות' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Receive messages from other users.', fr: 'Reçois des messages d\'autres utilisateurs.', es: 'Recibe mensajes de otros usuarios.', ru: 'Получай сообщения от других пользователей.', he: 'קבלת הודעות ממשתמשים אחרים.' })}
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
                  {tr({ en: 'Private participation', fr: 'Participation privée', es: 'Participación privada', ru: 'Скрытое участие', he: 'השתתפות פרטית' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Join lives without being announced.', fr: 'Rejoins les lives sans être annoncé.', es: 'Únete a los directos sin que se anuncie tu llegada.', ru: 'Заходи в эфиры без объявления.', he: 'הצטרפות לשידורים בלי הכרזה.' })}
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
                  {tr({ en: 'Activity status', fr: 'Statut d\'activité', es: 'Estado de actividad', ru: 'Статус активности', he: 'סטטוס פעילות' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Share your activity with friends.', fr: 'Partage ton activité avec tes amis.', es: 'Comparte tu actividad con tus amigos.', ru: 'Показывай друзьям свою активность.', he: 'שיתוף הפעילות שלכם עם חברים.' })}
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
                  {tr({ en: 'Contact sync', fr: 'Synchroniser les contacts', es: 'Sincronizar contactos', ru: 'Синхронизация контактов', he: 'סנכרון אנשי קשר' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Find friends who use ShaPop.', fr: 'Retrouve tes amis qui utilisent ShaPop.', es: 'Encuentra a tus amigos que usan ShaPop.', ru: 'Найди друзей, которые пользуются ShaPop.', he: 'מצאו חברים שמשתמשים ב-ShaPop.' })}
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
                  {tr({ en: 'Account suggestions', fr: 'Suggestion du compte', es: 'Sugerencia de cuenta', ru: 'Рекомендация аккаунта', he: 'המלצה על החשבון' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Let ShaPop suggest your profile to others.', fr: 'Autorise ShaPop à suggérer ton profil.', es: 'Permite que ShaPop sugiera tu perfil.', ru: 'Разреши ShaPop рекомендовать твой профиль.', he: 'אפשרו ל-ShaPop להמליץ על הפרופיל שלכם.' })}
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
                    {tr({ en: 'Price drop alerts', fr: 'Alertes de baisse de prix', es: 'Alertas de bajada de precio', ru: 'Уведомления о снижении цен', he: 'התראות על ירידת מחיר' })}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>{newBadge}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Get notified when a seller you follow lowers prices.', fr: 'Sois prévenu quand un vendeur que tu suis baisse ses prix.', es: 'Recibe un aviso cuando un vendedor que sigues baje sus precios.', ru: 'Узнавай, когда продавец, на которого ты подписан, снижает цены.', he: 'קבלו התראה כשמוכר שאתם עוקבים אחריו מוריד מחירים.' })}
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
                    {tr({ en: 'Smart notifications', fr: 'Notifications intelligentes', es: 'Notificaciones inteligentes', ru: 'Умные уведомления', he: 'התראות חכמות' })}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>{newBadge}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'AI filters notifications based on your interests.', fr: 'L\'IA filtre les notifications selon tes centres d\'intérêt.', es: 'La IA filtra las notificaciones según tus intereses.', ru: 'ИИ отбирает уведомления по твоим интересам.', he: 'בינה מלאכותית מסננת התראות לפי תחומי העניין שלכם.' })}
                </p>
              </div>
              <div style={toggleStyle(settings.smartNotifications)}><div style={toggleDot(settings.smartNotifications)} /></div>
            </div>

            {/* ─── SECTION: EXPÉRIENCE ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'Experience', fr: 'Expérience', es: 'Experiencia', ru: 'Удобство', he: 'חוויה' })}
            </p>

            {/* Auction haptics */}
            <div
              onClick={() => update({ auctionHaptics: !settings.auctionHaptics })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tr({ en: 'Auction haptics', fr: 'Vibrations pendant les enchères', es: 'Vibración en subastas', ru: 'Вибрация на аукционах', he: 'רטט במכירות פומביות' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Vibrate on bids and purchases.', fr: 'Vibration lors des enchères et des achats.', es: 'Vibración al pujar y comprar.', ru: 'Вибрация при ставках и покупках.', he: 'רטט בהצעות וברכישות.' })}
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
                    {tr({ en: 'Eco mode', fr: 'Mode éco', es: 'Modo ahorro', ru: 'Режим экономии', he: 'מצב חיסכון' })}
                  </p>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#22C55E', borderRadius: '4px', padding: '2px 6px' }}>ECO</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Uses less data and battery.', fr: 'Réduit la consommation de données et de batterie.', es: 'Reduce el consumo de datos y batería.', ru: 'Снижает расход трафика и батареи.', he: 'מפחית שימוש בנתונים ובסוללה.' })}
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
                      {tr({ en: 'Scheduled night mode', fr: 'Mode nuit programmé', es: 'Modo noche programado', ru: 'Ночной режим по расписанию', he: 'מצב לילה מתוזמן' })}
                    </p>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', backgroundColor: '#F0908A', borderRadius: '4px', padding: '2px 6px' }}>{newBadge}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                    {tr({ en: 'Automatically mutes notifications at night.', fr: 'Coupe automatiquement les notifications la nuit.', es: 'Silencia automáticamente las notificaciones por la noche.', ru: 'Автоматически отключает уведомления ночью.', he: 'משתיק התראות אוטומטית בלילה.' })}
                  </p>
                </div>
                <div style={toggleStyle(settings.nightModeEnabled)}><div style={toggleDot(settings.nightModeEnabled)} /></div>
              </div>
              {settings.nightModeEnabled && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #222' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
                      {tr({ en: 'Start', fr: 'Début', es: 'Inicio', ru: 'Начало', he: 'התחלה' })}
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
                      {tr({ en: 'End', fr: 'Fin', es: 'Fin', ru: 'Конец', he: 'סיום' })}
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
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'Content', fr: 'Contenu', es: 'Contenido', ru: 'Контент', he: 'תוכן' })}
            </p>

            {/* Live clips */}
            <div
              onClick={() => update({ liveClips: !settings.liveClips })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px 14px 0 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tr({ en: 'Live clips', fr: 'Clips des lives', es: 'Clips de directos', ru: 'Клипы из эфиров', he: 'קליפים מהשידורים' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Allow clips to be made from your lives.', fr: 'Autorise la création de clips à partir de tes lives.', es: 'Permite crear clips a partir de tus directos.', ru: 'Разреши создавать клипы из твоих эфиров.', he: 'אפשרו יצירת קליפים מהשידורים שלכם.' })}
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
                  {tr({ en: 'Past lives visibility', fr: 'Visibilité des anciens lives', es: 'Visibilidad de directos anteriores', ru: 'Видимость прошлых эфиров', he: 'הצגת שידורים קודמים' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Show past lives on your public profile.', fr: 'Affiche tes anciens lives sur ton profil public.', es: 'Muestra tus directos anteriores en tu perfil público.', ru: 'Показывай прошлые эфиры в публичном профиле.', he: 'הצגת שידורים קודמים בפרופיל הציבורי שלכם.' })}
                </p>
              </div>
              <div style={toggleStyle(settings.pastLivesVisible)}><div style={toggleDot(settings.pastLivesVisible)} /></div>
            </div>

            {/* ─── SECTION: PROMOTIONS ─── */}
            <p style={{ fontSize: '12px', color: '#F0908A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'Promotions', fr: 'Promotions', es: 'Promociones', ru: 'Акции', he: 'מבצעים' })}
            </p>

            {/* Real-time promo feedback */}
            <div
              onClick={() => update({ realtimePromoFeedback: !settings.realtimePromoFeedback })}
              style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', marginBottom: '10px' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {tr({ en: 'Real-time promo feedback', fr: 'Retours promos en temps réel', es: 'Respuesta a promociones en tiempo real', ru: 'Отклик на акции в реальном времени', he: 'משוב מבצעים בזמן אמת' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {tr({ en: 'Get instant feedback on promotional offers.', fr: 'Reçois un retour instantané sur les offres promotionnelles.', es: 'Recibe respuesta al instante sobre las ofertas promocionales.', ru: 'Мгновенная обратная связь по акциям.', he: 'קבלו משוב מיידי על מבצעים.' })}
                </p>
              </div>
              <div style={toggleStyle(settings.realtimePromoFeedback)}><div style={toggleDot(settings.realtimePromoFeedback)} /></div>
            </div>

            {/* ─── SECTION: COMPTE ─── */}
            <p style={{ fontSize: '12px', color: '#E8344E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingInlineStart: '2px' }}>
              {tr({ en: 'Account management', fr: 'Gestion du compte', es: 'Gestión de la cuenta', ru: 'Управление аккаунтом', he: 'ניהול חשבון' })}
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
                  {tr({ en: 'Edit profile', fr: 'Modifier le profil', es: 'Editar perfil', ru: 'Редактировать профиль', he: 'עריכת פרופיל' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                  {tr({ en: 'Name, bio, profile photo', fr: 'Nom, bio, photo de profil', es: 'Nombre, bio, foto de perfil', ru: 'Имя, описание, фото профиля', he: 'שם, ביו, תמונת פרופיל' })}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
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
                  {tr({ en: 'Identity verification', fr: 'Vérification d\'identité', es: 'Verificación de identidad', ru: 'Подтверждение личности', he: 'אימות זהות' })}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                  {tr({ en: 'Selfie + ID', fr: 'Selfie + pièce d\'identité', es: 'Selfie + documento de identidad', ru: 'Селфи + документ', he: 'סלפי + תעודה מזהה' })}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
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
                      {tr({ en: 'Delete my account', fr: 'Supprimer mon compte', es: 'Eliminar mi cuenta', ru: 'Удалить аккаунт', he: 'מחיקת החשבון שלי' })}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '3px 0 0' }}>
                      {tr({ en: 'This can\'t be undone', fr: 'Action irréversible', es: 'Acción irreversible', ru: 'Это действие необратимо', he: 'פעולה בלתי הפיכה' })}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '14px', color: '#E8344E', fontWeight: 700, margin: '0 0 8px' }}>
                    {tr({ en: 'Are you sure?', fr: 'Tu es sûr ?', es: '¿Estás seguro?', ru: 'Ты уверен?', he: 'בטוחים?' })}
                  </p>
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {tr({ en: `This can't be undone. All your data will be deleted. Type ${deleteWord} to confirm.`, fr: `Cette action est irréversible. Toutes tes données seront supprimées. Tape ${deleteWord} pour confirmer.`, es: `Esta acción es irreversible. Se eliminarán todos tus datos. Escribe ${deleteWord} para confirmar.`, ru: `Это действие необратимо. Все твои данные будут удалены. Введи ${deleteWord} для подтверждения.`, he: `פעולה זו בלתי הפיכה. כל הנתונים שלכם יימחקו. הקלידו ${deleteWord} לאישור.` })}
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={deleteWord}
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
                      {tr({ en: 'Cancel', fr: 'Annuler', es: 'Cancelar', ru: 'Отмена', he: 'ביטול' })}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || (deleteConfirmText.toUpperCase() !== deleteWord)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px',
                        backgroundColor: '#E8344E', border: 'none', color: '#fff',
                        fontSize: '14px', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: (deleting || deleteConfirmText.toUpperCase() !== deleteWord) ? 0.5 : 1,
                      }}
                    >
                      {deleting
                        ? tr({ en: 'Deleting…', fr: 'Suppression…', es: 'Eliminando…', ru: 'Удаление…', he: 'מוחק…' })
                        : tr({ en: 'Delete', fr: 'Supprimer', es: 'Eliminar', ru: 'Удалить', he: 'מחיקה' })}
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

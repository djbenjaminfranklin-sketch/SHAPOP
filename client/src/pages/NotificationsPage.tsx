import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import { usePushNotifications } from '../hooks/usePushNotifications'

type NotifKey = 'live' | 'orders' | 'deals' | 'messages' | 'reminders' | 'community'

interface InAppNotification {
  id: string
  type: string
  title: string
  body: string
  data: { stream_id?: string; [key: string]: unknown }
  created_at: string
}

const DB_COLUMNS: Record<NotifKey, string> = {
  live: 'notify_live',
  orders: 'notify_orders',
  deals: 'notify_deals',
  messages: 'notify_messages',
  reminders: 'notify_reminders',
  community: 'notify_community',
}

const DEFAULT_TOGGLES: Record<NotifKey, boolean> = {
  live: true, orders: true, deals: false, messages: true, reminders: true, community: false,
}

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) {
    return lang === 'fr' ? 'maintenant' : lang === 'es' ? 'ahora' : lang === 'he' ? '\u05E2\u05DB\u05E9\u05D9\u05D5' : 'now'
  }
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return lang === 'fr' ? `il y a ${diffMin}min` : lang === 'es' ? `hace ${diffMin}min` : lang === 'he' ? `\u05DC\u05E4\u05E0\u05D9 ${diffMin} \u05D3\u05E7\u05F3` : `${diffMin}m ago`
  }
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) {
    return lang === 'fr' ? `il y a ${diffH}h` : lang === 'es' ? `hace ${diffH}h` : lang === 'he' ? `\u05DC\u05E4\u05E0\u05D9 ${diffH} \u05E9\u05E2\u05D5\u05EA` : `${diffH}h ago`
  }
  const diffD = Math.floor(diffH / 24)
  return lang === 'fr' ? `il y a ${diffD}j` : lang === 'es' ? `hace ${diffD}d` : lang === 'he' ? `\u05DC\u05E4\u05E0\u05D9 ${diffD} \u05D9\u05DE\u05D9\u05DD` : `${diffD}d ago`
}

const content = {
  fr: {
    title: 'Notifications',
    push: 'Notifications Push',
    enablePush: 'Activer les notifications',
    enablePushDesc: 'Recois des alertes en temps reel quand un vendeur que tu suis passe en live, quand ta commande est expediee, et plus.',
    enable: 'Activer',
    enabled: 'Activees',
    denied: 'Notifications refusees. Active-les dans Reglages > ShaPop > Notifications.',
    noNotifs: 'Aucune notification',
    feedTitle: 'Recentes',
    prefsTitle: 'Preferences',
    clearAll: 'Tout effacer',
    items: [
      { id: 'live' as NotifKey, label: 'Vendeurs en direct', desc: 'Sois notifie quand un vendeur que tu suis lance un live' },
      { id: 'orders' as NotifKey, label: 'Suivi de commandes', desc: 'Expedition, livraison et retours' },
      { id: 'deals' as NotifKey, label: 'Bons plans & promos', desc: 'Offres speciales et ventes flash' },
      { id: 'messages' as NotifKey, label: 'Messages', desc: 'Nouveaux messages de vendeurs ou acheteurs' },
      { id: 'reminders' as NotifKey, label: 'Rappels de live', desc: 'Rappel avant le debut d\'un live programme' },
      { id: 'community' as NotifKey, label: 'Communaute', desc: 'Nouveaux abonnes, likes et mentions' },
    ],
  },
  en: {
    title: 'Notifications',
    push: 'Push Notifications',
    enablePush: 'Enable notifications',
    enablePushDesc: 'Get real-time alerts when sellers you follow go live, when your order ships, and more.',
    enable: 'Enable',
    enabled: 'Enabled',
    denied: 'Notifications denied. Enable them in Settings > ShaPop > Notifications.',
    noNotifs: 'No notifications',
    feedTitle: 'Recent',
    prefsTitle: 'Preferences',
    clearAll: 'Clear all',
    items: [
      { id: 'live' as NotifKey, label: 'Sellers go live', desc: 'Get notified when sellers you follow start a stream' },
      { id: 'orders' as NotifKey, label: 'Order updates', desc: 'Shipping, delivery, and return notifications' },
      { id: 'deals' as NotifKey, label: 'Deals & promotions', desc: 'Special offers and flash sales' },
      { id: 'messages' as NotifKey, label: 'Messages', desc: 'New messages from buyers or sellers' },
      { id: 'reminders' as NotifKey, label: 'Stream reminders', desc: 'Reminder before a scheduled stream starts' },
      { id: 'community' as NotifKey, label: 'Community', desc: 'New followers, likes, and mentions' },
    ],
  },
  he: {
    title: '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA',
    push: '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E4\u05D5\u05E9',
    enablePush: '\u05D4\u05E4\u05E2\u05DC \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA',
    enablePushDesc: '\u05E7\u05D1\u05DC \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA \u05DB\u05E9\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E2\u05D5\u05DC\u05D9\u05DD \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8, \u05DB\u05E9\u05D4\u05D6\u05DE\u05E0\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D4 \u05D5\u05E2\u05D5\u05D3.',
    enable: '\u05D4\u05E4\u05E2\u05DC',
    enabled: '\u05DE\u05D5\u05E4\u05E2\u05DC',
    denied: '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E0\u05D3\u05D7\u05D5. \u05D4\u05E4\u05E2\u05DC \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA > ShaPop > \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA.',
    noNotifs: '\u05D0\u05D9\u05DF \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA',
    feedTitle: '\u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA',
    prefsTitle: '\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA',
    clearAll: '\u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC',
    items: [
      { id: 'live' as NotifKey, label: '\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E2\u05D5\u05DC\u05D9\u05DD \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8', desc: '\u05E7\u05D1\u05DC\u05D5 \u05D4\u05EA\u05E8\u05D0\u05D4 \u05DB\u05E9\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05E9\u05D0\u05EA\u05DD \u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD \u05E9\u05D9\u05D3\u05D5\u05E8' },
      { id: 'orders' as NotifKey, label: '\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9 \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA', desc: '\u05DE\u05E9\u05DC\u05D5\u05D7, \u05DE\u05E1\u05D9\u05E8\u05D4 \u05D5\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA' },
      { id: 'deals' as NotifKey, label: '\u05DE\u05D1\u05E6\u05E2\u05D9\u05DD \u05D5\u05DE\u05D1\u05E6\u05E2\u05D9 \u05D1\u05D6\u05E7', desc: '\u05D4\u05E6\u05E2\u05D5\u05EA \u05DE\u05D9\u05D5\u05D7\u05D3\u05D5\u05EA' },
      { id: 'messages' as NotifKey, label: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA', desc: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA \u05DE\u05E7\u05D5\u05E0\u05D9\u05DD \u05D0\u05D5 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD' },
      { id: 'reminders' as NotifKey, label: '\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05E9\u05D9\u05D3\u05D5\u05E8', desc: '\u05EA\u05D6\u05DB\u05D5\u05E8\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D9\u05D3\u05D5\u05E8 \u05DE\u05EA\u05D5\u05D6\u05DE\u05DF' },
      { id: 'community' as NotifKey, label: '\u05E7\u05D4\u05D9\u05DC\u05D4', desc: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD \u05D7\u05D3\u05E9\u05D9\u05DD, \u05DC\u05D9\u05D9\u05E7\u05D9\u05DD \u05D5\u05D0\u05D6\u05DB\u05D5\u05E8\u05D9\u05DD' },
    ],
  },
  es: {
    title: 'Notificaciones',
    push: 'Notificaciones Push',
    enablePush: 'Activar notificaciones',
    enablePushDesc: 'Recibe alertas en tiempo real cuando vendedores que sigues transmiten en vivo, cuando tu pedido se envia, y mas.',
    enable: 'Activar',
    enabled: 'Activadas',
    denied: 'Notificaciones denegadas. Activalas en Ajustes > ShaPop > Notificaciones.',
    noNotifs: 'Sin notificaciones',
    feedTitle: 'Recientes',
    prefsTitle: 'Preferencias',
    clearAll: 'Borrar todo',
    items: [
      { id: 'live' as NotifKey, label: 'Vendedores en vivo', desc: 'Aviso cuando vendedores que sigues inician una transmision' },
      { id: 'orders' as NotifKey, label: 'Actualizaciones de pedidos', desc: 'Envio, entrega y devoluciones' },
      { id: 'deals' as NotifKey, label: 'Ofertas y promociones', desc: 'Ofertas especiales y ventas flash' },
      { id: 'messages' as NotifKey, label: 'Mensajes', desc: 'Nuevos mensajes de compradores o vendedores' },
      { id: 'reminders' as NotifKey, label: 'Recordatorios', desc: 'Recordatorio antes de una transmision programada' },
      { id: 'community' as NotifKey, label: 'Comunidad', desc: 'Nuevos seguidores, likes y menciones' },
    ],
  },
}

export default function NotificationsPage() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  const { requestPermission, checkPermission } = usePushNotifications()

  const [toggles, setToggles] = useState<Record<NotifKey, boolean>>(DEFAULT_TOGGLES)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const [loadingPush, setLoadingPush] = useState(false)
  const [loadedFromDb, setLoadedFromDb] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(true)

  // Load notifications feed
  useEffect(() => {
    if (!user || !session?.access_token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch('/api/notifications', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setNotifications(data)
        }
      } catch { /* silent */ }
      if (!cancelled) setLoadingNotifs(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session])

  // Load preferences via server API on mount
  useEffect(() => {
    if (!user || !session?.access_token) return
    let cancelled = false
    ;(async () => {
      const granted = await checkPermission()
      if (!cancelled) setPushEnabled(granted)

      try {
        const res = await apiFetch('/api/notification-prefs', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setToggles({
            live: data.notify_live ?? true,
            orders: data.notify_orders ?? true,
            deals: data.notify_deals ?? false,
            messages: data.notify_messages ?? true,
            reminders: data.notify_reminders ?? true,
            community: data.notify_community ?? false,
          })
        }
      } catch { /* silent */ }
      if (!cancelled) setLoadedFromDb(true)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session])

  // Handle enabling push notifications
  const handleEnablePush = useCallback(async () => {
    setLoadingPush(true)
    const granted = await requestPermission()
    if (granted) {
      setPushEnabled(true)
    } else {
      setPushDenied(true)
    }
    setLoadingPush(false)
  }, [requestPermission])

  // Toggle a notification preference and save to Supabase
  const handleToggle = useCallback(async (key: NotifKey) => {
    if (!user) return

    const newValue = !toggles[key]
    setToggles(prev => ({ ...prev, [key]: newValue }))

    // If push not enabled yet, request permission first
    if (newValue && !pushEnabled && Capacitor.isNativePlatform()) {
      const granted = await requestPermission()
      if (granted) {
        setPushEnabled(true)
      } else {
        setPushDenied(true)
        setToggles(prev => ({ ...prev, [key]: false }))
        return
      }
    }

    // Save via server API (service key bypasses RLS)
    const column = DB_COLUMNS[key]
    if (!session?.access_token) return

    const updatedToggles = { ...toggles, [key]: newValue }
    await apiFetch('/api/notification-prefs', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ column, value: newValue, allPrefs: updatedToggles }),
    })
  }, [user, session, toggles, pushEnabled, requestPermission])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const isNative = Capacitor.isNativePlatform()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Notifications feed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{c.feedTitle}</p>
          {notifications.length > 0 && (
            <button
              onClick={async () => {
                const { data: { session: s } } = await (await import('../lib/supabase')).supabase.auth.getSession()
                if (!s) return
                await apiFetch('/api/notifications', { method: 'DELETE', headers: { Authorization: `Bearer ${s.access_token}` } })
                setNotifications([])
              }}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: '#666', cursor: 'pointer', padding: 0 }}
            >
              {c.clearAll}
            </button>
          )}
        </div>

        {loadingNotifs ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }} role="status" aria-label="Loading notifications">
            <div style={{ width: '24px', height: '24px', border: '2px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
          </div>
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#555', padding: '16px 0', textAlign: 'center' }}>{c.noNotifs}</p>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.data?.stream_id) {
                    navigate(`/stream/${n.data.stream_id}`)
                  } else if (n.data?.item_id) {
                    navigate(`/item/${n.data.item_id}`)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                  padding: '14px 0', borderBottom: '1px solid #1A1A1A',
                  background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#1A1A1A',
                  cursor: (n.data?.stream_id || n.data?.item_id) ? 'pointer' : 'default',
                  textAlign: 'left',
                }}
              >
                {/* Live pulse icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: n.type === 'live' ? '#2a0a0a' : '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  position: 'relative',
                }}>
                  {n.type === 'live' && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: '#E8344E',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  )}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={n.type === 'live' ? '#E8344E' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</p>
                </div>

                <span style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>{timeAgo(n.created_at, lang)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Preferences section */}
        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '8px' }}>{c.prefsTitle}</p>

        {/* Push notification activation card (native only, not yet enabled) */}
        {isNative && !pushEnabled && !pushDenied && (
          <div style={{
            backgroundColor: '#1A1A1A', borderRadius: '16px', padding: '20px', marginBottom: '24px',
            border: '1px solid #2A2A2A',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{c.enablePush}</p>
                <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.4 }}>{c.enablePushDesc}</p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={loadingPush}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                opacity: loadingPush ? 0.6 : 1,
              }}
            >
              {loadingPush ? '...' : c.enable}
            </button>
          </div>
        )}

        {/* Push enabled badge */}
        {isNative && pushEnabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
            padding: '10px 14px', backgroundColor: '#0a2a0a', borderRadius: '10px', border: '1px solid #1a3a1a',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '14px', color: '#4ade80', fontWeight: 600 }}>{c.enabled}</span>
          </div>
        )}

        {/* Push denied warning */}
        {pushDenied && (
          <div
            role="alert"
            style={{
              padding: '12px 14px', backgroundColor: '#2a1a0a', borderRadius: '10px', border: '1px solid #3a2a1a',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '13px', color: '#f59e0b', lineHeight: 1.4 }}>{c.denied}</p>
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{c.push}</p>

        {c.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #1A1A1A' }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <p style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{item.desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={toggles[item.id]}
              aria-label={item.label}
              onClick={() => handleToggle(item.id)}
              disabled={!loadedFromDb}
              style={{
                width: '48px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', position: 'relative',
                backgroundColor: toggles[item.id] ? '#F0908A' : '#333',
                opacity: loadedFromDb ? 1 : 0.5,
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '3px',
                left: toggles[item.id] ? '23px' : '3px',
                transition: 'left 0.2s ease',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

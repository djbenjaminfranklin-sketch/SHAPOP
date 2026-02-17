import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { usePushNotifications } from '../hooks/usePushNotifications'

type NotifKey = 'live' | 'orders' | 'deals' | 'messages' | 'reminders' | 'community'

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

const content = {
  fr: {
    title: 'Notifications',
    push: 'Notifications Push',
    enablePush: 'Activer les notifications',
    enablePushDesc: 'Recois des alertes en temps reel quand un vendeur que tu suis passe en live, quand ta commande est expediee, et plus.',
    enable: 'Activer',
    enabled: 'Activees',
    denied: 'Notifications refusees. Active-les dans Reglages > ShaPop > Notifications.',
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr
  const { requestPermission, checkPermission } = usePushNotifications()

  const [toggles, setToggles] = useState<Record<NotifKey, boolean>>(DEFAULT_TOGGLES)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const [loadingPush, setLoadingPush] = useState(false)
  const [loadedFromDb, setLoadedFromDb] = useState(false)

  // Load preferences from Supabase on mount
  useEffect(() => {
    if (!user) return
    (async () => {
      // Check push permission status
      const granted = await checkPermission()
      setPushEnabled(granted)

      // Load notification preferences from DB
      const { data } = await supabase
        .from('device_tokens')
        .select('notify_live, notify_orders, notify_deals, notify_messages, notify_reminders, notify_community')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (data) {
        setToggles({
          live: data.notify_live ?? true,
          orders: data.notify_orders ?? true,
          deals: data.notify_deals ?? false,
          messages: data.notify_messages ?? true,
          reminders: data.notify_reminders ?? true,
          community: data.notify_community ?? false,
        })
      }
      setLoadedFromDb(true)
    })()
  }, [user, checkPermission])

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

    // Save in Supabase — upsert to handle case where no device_token row exists yet
    const column = DB_COLUMNS[key]
    const { data: existing } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('device_tokens')
        .update({ [column]: newValue, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('device_tokens')
        .insert({
          user_id: user.id,
          token: `web-prefs-${user.id}`,
          platform: 'web',
          [column]: newValue,
          notify_live: DEFAULT_TOGGLES.live,
          notify_orders: DEFAULT_TOGGLES.orders,
          notify_deals: DEFAULT_TOGGLES.deals,
          notify_messages: DEFAULT_TOGGLES.messages,
          notify_reminders: DEFAULT_TOGGLES.reminders,
          notify_community: DEFAULT_TOGGLES.community,
        })
    }
  }, [user, toggles, pushEnabled, requestPermission])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const isNative = Capacitor.isNativePlatform()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
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
          <div style={{
            padding: '12px 14px', backgroundColor: '#2a1a0a', borderRadius: '10px', border: '1px solid #3a2a1a',
            marginBottom: '20px',
          }}>
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
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

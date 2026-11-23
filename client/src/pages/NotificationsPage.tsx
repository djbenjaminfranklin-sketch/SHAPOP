import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { getLocale, tr, type Localized } from '../lib/i18n'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'


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

/** Date relative (« il y a 5 min ») dans la langue de l'app. */
function timeAgo(dateStr: string): string {
  const diffSec = Math.round((new Date(dateStr).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto', style: 'short' })
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), 'day')
  return new Date(dateStr).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
}

interface NotifText {
  title: string; push: string; enablePush: string; enablePushDesc: string; enable: string; enabled: string; denied: string; noNotifs: string; feedTitle: string; prefsTitle: string; clearAll: string; goBack: string; loading: string; deleteOne: string; loadingShort: string
  items: { id: NotifKey; label: string; desc: string }[]
}

const content: Localized<NotifText> = {
  en: {
    title: 'Notifications',
    push: 'Push notifications',
    enablePush: 'Turn on notifications',
    enablePushDesc: 'Get real-time alerts when sellers you follow go live, when your order ships, and more.',
    enable: 'Turn on',
    enabled: 'Notifications on',
    denied: 'Notifications are blocked. Turn them on in Settings > ShaPop > Notifications.',
    noNotifs: 'No notifications yet',
    feedTitle: 'Recent',
    prefsTitle: 'Preferences',
    clearAll: 'Clear all',
    goBack: 'Go back',
    loading: 'Loading notifications',
    deleteOne: 'Delete notification',
    loadingShort: 'Loading...',
    items: [
      { id: 'live', label: 'Sellers going live', desc: 'Get notified when a seller you follow starts a live' },
      { id: 'orders', label: 'Order updates', desc: 'Shipping, delivery and returns' },
      { id: 'deals', label: 'Deals & promotions', desc: 'Special offers and flash sales' },
      { id: 'messages', label: 'Messages', desc: 'New messages from buyers or sellers' },
      { id: 'reminders', label: 'Live reminders', desc: 'A reminder before a scheduled live starts' },
      { id: 'community', label: 'Community', desc: 'New followers, likes and mentions' },
    ],
  },
  fr: {
    title: 'Notifications',
    push: 'Notifications push',
    enablePush: 'Active les notifications',
    enablePushDesc: 'Reçois une alerte en temps réel quand un vendeur que tu suis lance un live, quand ta commande est expédiée, et plus encore.',
    enable: 'Activer',
    enabled: 'Notifications activées',
    denied: 'Notifications bloquées. Active-les dans Réglages > ShaPop > Notifications.',
    noNotifs: 'Aucune notification pour l’instant',
    feedTitle: 'Récentes',
    prefsTitle: 'Préférences',
    clearAll: 'Tout effacer',
    goBack: 'Retour',
    loading: 'Chargement des notifications',
    deleteOne: 'Supprimer la notification',
    loadingShort: 'Chargement...',
    items: [
      { id: 'live', label: 'Live des vendeurs', desc: 'Sois prévenu quand un vendeur que tu suis lance un live' },
      { id: 'orders', label: 'Suivi de commandes', desc: 'Expédition, livraison et retours' },
      { id: 'deals', label: 'Bons plans et promos', desc: 'Offres spéciales et ventes flash' },
      { id: 'messages', label: 'Messages', desc: 'Nouveaux messages d’acheteurs ou de vendeurs' },
      { id: 'reminders', label: 'Rappels de live', desc: 'Un rappel avant le début d’un live programmé' },
      { id: 'community', label: 'Communauté', desc: 'Nouveaux abonnés, j’aime et mentions' },
    ],
  },
  es: {
    title: 'Notificaciones',
    push: 'Notificaciones push',
    enablePush: 'Activa las notificaciones',
    enablePushDesc: 'Recibe avisos al instante cuando un vendedor que sigues empieza un directo, cuando se envía tu pedido y mucho más.',
    enable: 'Activar',
    enabled: 'Notificaciones activadas',
    denied: 'Notificaciones bloqueadas. Actívalas en Ajustes > ShaPop > Notificaciones.',
    noNotifs: 'Aún no tienes notificaciones',
    feedTitle: 'Recientes',
    prefsTitle: 'Preferencias',
    clearAll: 'Borrar todo',
    goBack: 'Volver',
    loading: 'Cargando notificaciones',
    deleteOne: 'Eliminar notificación',
    loadingShort: 'Cargando...',
    items: [
      { id: 'live', label: 'Directos de vendedores', desc: 'Te avisamos cuando un vendedor que sigues empieza un directo' },
      { id: 'orders', label: 'Estado de los pedidos', desc: 'Envío, entrega y devoluciones' },
      { id: 'deals', label: 'Ofertas y promociones', desc: 'Ofertas especiales y ventas flash' },
      { id: 'messages', label: 'Mensajes', desc: 'Nuevos mensajes de compradores o vendedores' },
      { id: 'reminders', label: 'Recordatorios de directos', desc: 'Un aviso antes de que empiece un directo programado' },
      { id: 'community', label: 'Comunidad', desc: 'Nuevos seguidores, me gusta y menciones' },
    ],
  },
  ru: {
    title: 'Уведомления',
    push: 'Push-уведомления',
    enablePush: 'Включи уведомления',
    enablePushDesc: 'Получай мгновенные оповещения, когда продавцы из твоих подписок выходят в эфир, когда твой заказ отправлен, и не только.',
    enable: 'Включить',
    enabled: 'Уведомления включены',
    denied: 'Уведомления заблокированы. Включи их в Настройки > ShaPop > Уведомления.',
    noNotifs: 'Уведомлений пока нет',
    feedTitle: 'Недавние',
    prefsTitle: 'Настройки',
    clearAll: 'Очистить всё',
    goBack: 'Назад',
    loading: 'Загружаем уведомления',
    deleteOne: 'Удалить уведомление',
    loadingShort: 'Загрузка...',
    items: [
      { id: 'live', label: 'Эфиры продавцов', desc: 'Узнавай, когда продавец из твоих подписок начинает эфир' },
      { id: 'orders', label: 'Статус заказов', desc: 'Отправка, доставка и возвраты' },
      { id: 'deals', label: 'Акции и скидки', desc: 'Спецпредложения и флеш-распродажи' },
      { id: 'messages', label: 'Сообщения', desc: 'Новые сообщения от покупателей и продавцов' },
      { id: 'reminders', label: 'Напоминания об эфирах', desc: 'Напоминание перед запланированным эфиром' },
      { id: 'community', label: 'Сообщество', desc: 'Новые подписчики, лайки и упоминания' },
    ],
  },
  he: {
    title: 'התראות',
    push: 'התראות פוש',
    enablePush: 'הפעלת התראות',
    enablePushDesc: 'קבלו התראות בזמן אמת כשמוכרים שאתם עוקבים אחריהם עולים לשידור חי, כשההזמנה שלכם נשלחת ועוד.',
    enable: 'הפעלה',
    enabled: 'ההתראות פועלות',
    denied: 'ההתראות חסומות. אפשר להפעיל אותן בהגדרות > ShaPop > התראות.',
    noNotifs: 'אין עדיין התראות',
    feedTitle: 'אחרונות',
    prefsTitle: 'העדפות',
    clearAll: 'ניקוי הכול',
    goBack: 'חזרה',
    loading: 'טוענים התראות',
    deleteOne: 'מחיקת ההתראה',
    loadingShort: 'טוען...',
    items: [
      { id: 'live', label: 'מוכרים בשידור חי', desc: 'קבלו התראה כשמוכר/ת שאתם עוקבים אחריו מתחיל/ה שידור חי' },
      { id: 'orders', label: 'עדכוני הזמנות', desc: 'משלוח, מסירה והחזרות' },
      { id: 'deals', label: 'מבצעים והנחות', desc: 'הצעות מיוחדות ומבצעי בזק' },
      { id: 'messages', label: 'הודעות', desc: 'הודעות חדשות מקונים או ממוכרים' },
      { id: 'reminders', label: 'תזכורות לשידורים', desc: 'תזכורת לפני ששידור מתוכנן מתחיל' },
      { id: 'community', label: 'קהילה', desc: 'עוקבים חדשים, לייקים ואזכורים' },
    ],
  },
}

export default function NotificationsPage() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const c = tr(content)
  const { requestPermission, checkPermission } = usePushNotifications()
  usePageTitle(c.title)

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
        <button onClick={() => navigate(-1)} aria-label={c.goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
          <div style={{ padding: '20px 0', textAlign: 'center' }} role="status" aria-label={c.loading}>
            <div style={{ width: '24px', height: '24px', border: '2px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
          </div>
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#555', padding: '16px 0', textAlign: 'center' }}>{c.noNotifs}</p>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                  padding: '14px 0', borderBottom: '1px solid #1A1A1A',
                }}
              >
                <div
                  onClick={() => {
                    if (n.data?.stream_id) navigate(`/stream/${n.data.stream_id}`)
                    else if (n.data?.item_id) navigate(`/item/${n.data.item_id}`)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0,
                    cursor: (n.data?.stream_id || n.data?.item_id) ? 'pointer' : 'default',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: n.type === 'live' ? '#2a0a0a' : '#1A1A1A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    position: 'relative',
                  }}>
                    {n.type === 'live' && (
                      <div style={{
                        position: 'absolute', top: '4px', insetInlineEnd: '4px',
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

                  <span style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                </div>

                {/* Delete button */}
                <button
                  aria-label={c.deleteOne}
                  onClick={async (e) => {
                    e.stopPropagation()
                    setNotifications(prev => prev.filter(x => x.id !== n.id))
                    const { data: { session: s } } = await (await import('../lib/supabase')).supabase.auth.getSession()
                    if (s) apiFetch(`/api/notifications/${n.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.access_token}` } })
                  }}
                  style={{
                    background: 'none', border: 'none', padding: '8px', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>
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
              {loadingPush ? c.loadingShort : c.enable}
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
            <div style={{ flex: 1, marginInlineEnd: '16px' }}>
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
                insetInlineStart: toggles[item.id] ? '23px' : '3px',
                transition: 'inset-inline-start 0.2s ease',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, tr, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Conversation } from '../types/database'

const pageContent = {
  en: {
    title: 'Messages',
    loginPrompt: 'Log in to see your messages.',
    offPlatformWarning: 'Keep all conversations on ShaPop: contact outside the app is not allowed',
    loading: 'Loading…',
    retry: 'Retry',
    noConversations: 'No conversations yet',
    messagesWillAppear: 'Your messages will show up here',
    noMessage: 'No messages',
    order: 'Order',
    dispute: 'Dispute',
    support: 'Support',
    timeNow: 'Just now',
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'd',
    timeWeek: 'w',
    notConnected: 'Not logged in',
    serverError: 'Server error',
    unknownError: 'Something went wrong',
    defaultUser: 'User',
    back: 'Back',
    home: 'Home',
  },
  fr: {
    title: 'Messages',
    loginPrompt: 'Connecte-toi pour voir tes messages.',
    offPlatformWarning: 'Reste sur ShaPop : tout échange en dehors de l\'appli est interdit',
    loading: 'Chargement…',
    retry: 'Réessayer',
    noConversations: 'Aucune conversation',
    messagesWillAppear: 'Tes messages apparaîtront ici',
    noMessage: 'Aucun message',
    order: 'Commande',
    dispute: 'Litige',
    support: 'Assistance',
    timeNow: 'À l\'instant',
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'j',
    timeWeek: 'sem.',
    notConnected: 'Non connecté',
    serverError: 'Erreur du serveur',
    unknownError: 'Une erreur est survenue',
    defaultUser: 'Utilisateur',
    back: 'Retour',
    home: 'Accueil',
  },
  es: {
    title: 'Mensajes',
    loginPrompt: 'Inicia sesión para ver tus mensajes.',
    offPlatformWarning: 'Quédate en ShaPop: está prohibido comunicarse fuera de la app',
    loading: 'Cargando…',
    retry: 'Reintentar',
    noConversations: 'Aún no hay conversaciones',
    messagesWillAppear: 'Tus mensajes aparecerán aquí',
    noMessage: 'Sin mensajes',
    order: 'Pedido',
    dispute: 'Disputa',
    support: 'Soporte',
    timeNow: 'Ahora',
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'd',
    timeWeek: 'sem.',
    notConnected: 'No has iniciado sesión',
    serverError: 'Error del servidor',
    unknownError: 'Ha ocurrido un error',
    defaultUser: 'Usuario',
    back: 'Volver',
    home: 'Inicio',
  },
  ru: {
    title: 'Сообщения',
    loginPrompt: 'Войди, чтобы увидеть свои сообщения.',
    offPlatformWarning: 'Общайся только в ShaPop: связь вне приложения запрещена',
    loading: 'Загрузка…',
    retry: 'Повторить',
    noConversations: 'Пока нет диалогов',
    messagesWillAppear: 'Здесь появятся твои сообщения',
    noMessage: 'Нет сообщений',
    order: 'Заказ',
    dispute: 'Спор',
    support: 'Поддержка',
    timeNow: 'Только что',
    timeMin: 'мин',
    timeHour: 'ч',
    timeDay: 'д',
    timeWeek: 'нед.',
    notConnected: 'Ты не вошёл в аккаунт',
    serverError: 'Ошибка сервера',
    unknownError: 'Что-то пошло не так',
    defaultUser: 'Пользователь',
    back: 'Назад',
    home: 'Главная',
  },
  he: {
    title: 'הודעות',
    loginPrompt: 'יש להתחבר כדי לראות את ההודעות שלך.',
    offPlatformWarning: 'נשארים ב-ShaPop: אסור לתקשר מחוץ לאפליקציה',
    loading: 'טוען…',
    retry: 'לנסות שוב',
    noConversations: 'אין עדיין שיחות',
    messagesWillAppear: 'ההודעות שלך יופיעו כאן',
    noMessage: 'אין הודעות',
    order: 'הזמנה',
    dispute: 'מחלוקת',
    support: 'תמיכה',
    timeNow: 'עכשיו',
    timeMin: 'דק׳',
    timeHour: 'שע׳',
    timeDay: 'ימ׳',
    timeWeek: 'שב׳',
    notConnected: 'לא מחובר',
    serverError: 'שגיאת שרת',
    unknownError: 'משהו השתבש',
    defaultUser: 'משתמש',
    back: 'חזרה',
    home: 'דף הבית',
  },
} satisfies Localized<Record<string, string>>

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const lang = getLang()
  const ct = tr(pageContent, lang)
  usePageTitle(ct.title)

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return ct.timeNow
    if (minutes < 60) return `${minutes} ${ct.timeMin}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ${ct.timeHour}`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ${ct.timeDay}`
    const weeks = Math.floor(days / 7)
    return `${weeks} ${ct.timeWeek}`
  }

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 80)
  }, [])

  const fetchConversations = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(ct.notConnected)

      const res = await apiFetch('/api/conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(ct.serverError)

      const data: Conversation[] = await res.json()

      // Sort by last message time (most recent first)
      data.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at
        const timeB = b.last_message?.created_at || b.created_at
        return new Date(timeB).getTime() - new Date(timeA).getTime()
      })

      setConversations(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.unknownError
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <p className="text-gray-400">{ct.loginPrompt}</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-black text-white pb-24 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} aria-label={ct.back} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ ...rtlFlip() }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{ct.title}</h1>
          <button onClick={() => navigate('/')} aria-label={ct.home} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '4px 16px 0' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm mt-3">{ct.loading}</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchConversations} className="mt-3 text-indigo-400 text-sm underline">
              {ct.retry}
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 text-base">{ct.noConversations}</p>
            <p className="text-gray-600 text-sm mt-1">{ct.messagesWillAppear}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {conversations.map((conv) => {
              const other = conv.other_participant
              const displayName = other?.display_name || ct.defaultUser
              const avatarUrl = other?.avatar_url
              const lastMsg = conv.last_message
              const preview = lastMsg?.message
                ? lastMsg.message.length > 50
                  ? lastMsg.message.slice(0, 50) + '…'
                  : lastMsg.message
                : ct.noMessage
              const lastTime = lastMsg?.created_at || conv.created_at
              // Item context: from direct conversation item_id or from order
              const itemTitle = conv.item?.title || conv.order?.item?.title
              const itemImage = conv.item?.image_urls?.[0] || conv.order?.item?.image_urls?.[0] as string | undefined

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/conversation/${conv.id}`)}
                  className="w-full flex items-center text-start hover:bg-white/5 transition-colors"
                  style={{ gap: '14px', padding: '16px 4px', minHeight: '84px' }}
                >
                  {/* Avatar with item thumbnail overlay */}
                  <div className="flex-shrink-0 relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="rounded-full object-cover" style={{ width: '54px', height: '54px' }}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold" style={{ width: '54px', height: '54px', fontSize: 'calc(16px * var(--fs, 1))' }}>
                        {getInitials(displayName)}
                      </div>
                    )}
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt=""
                        className="absolute -bottom-1 -end-1 rounded-md object-cover border-2 border-black" style={{ width: '24px', height: '24px' }}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between" style={{ gap: '8px' }}>
                      <span className="font-semibold truncate" style={{ fontSize: 'calc(16px * var(--fs, 1))' }}>{displayName}</span>
                      <span className="text-gray-500 flex-shrink-0" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>{timeAgo(lastTime)}</span>
                    </div>
                    {itemTitle && (
                      <p className="text-gray-500 truncate" style={{ fontSize: 'calc(13px * var(--fs, 1))', marginTop: '4px' }}>{itemTitle}</p>
                    )}
                    <p className="text-gray-400 truncate" style={{ fontSize: 'calc(14px * var(--fs, 1))', marginTop: '4px' }}>{preview}</p>
                  </div>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ ...rtlFlip() }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

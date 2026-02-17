import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Conversation } from '../types/database'

const pageContent = {
  fr: {
    title: 'Messages',
    loginPrompt: 'Connectez-vous pour voir vos messages.',
    offPlatformWarning: 'Toute communication hors plateforme est interdite',
    loading: 'Chargement...',
    retry: 'Reessayer',
    noConversations: 'Aucune conversation',
    messagesWillAppear: 'Vos messages apparaitront ici',
    noMessage: 'Aucun message',
    order: 'Commande',
    dispute: 'Litige',
    support: 'Support',
    timeNow: "A l'instant",
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'j',
    timeWeek: 'sem',
  },
  en: {
    title: 'Messages',
    loginPrompt: 'Log in to see your messages.',
    offPlatformWarning: 'All off-platform communication is prohibited',
    loading: 'Loading...',
    retry: 'Retry',
    noConversations: 'No conversations',
    messagesWillAppear: 'Your messages will appear here',
    noMessage: 'No messages',
    order: 'Order',
    dispute: 'Dispute',
    support: 'Support',
    timeNow: 'Just now',
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'd',
    timeWeek: 'w',
  },
  he: {
    title: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
    loginPrompt: '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05E9\u05DC\u05DA.',
    offPlatformWarning: '\u05DB\u05DC \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA \u05DE\u05D7\u05D5\u05E5 \u05DC\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4 \u05D0\u05E1\u05D5\u05E8\u05D4',
    loading: '\u05D8\u05D5\u05E2\u05DF...',
    retry: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
    noConversations: '\u05D0\u05D9\u05DF \u05E9\u05D9\u05D7\u05D5\u05EA',
    messagesWillAppear: '\u05D4\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05E9\u05DC\u05DA \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
    noMessage: '\u05D0\u05D9\u05DF \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
    order: '\u05D4\u05D6\u05DE\u05E0\u05D4',
    dispute: '\u05DE\u05D7\u05DC\u05D5\u05E7\u05EA',
    support: '\u05EA\u05DE\u05D9\u05DB\u05D4',
    timeNow: '\u05E2\u05DB\u05E9\u05D9\u05D5',
    timeMin: '\u05D3\u05E7\u05F3',
    timeHour: '\u05E9\u05F3',
    timeDay: '\u05D9\u05F3',
    timeWeek: '\u05E9\u05D1\u05F3',
  },
  es: {
    title: 'Mensajes',
    loginPrompt: 'Inicia sesion para ver tus mensajes.',
    offPlatformWarning: 'Toda comunicacion fuera de la plataforma esta prohibida',
    loading: 'Cargando...',
    retry: 'Reintentar',
    noConversations: 'Sin conversaciones',
    messagesWillAppear: 'Tus mensajes apareceran aqui',
    noMessage: 'Sin mensajes',
    order: 'Pedido',
    dispute: 'Disputa',
    support: 'Soporte',
    timeNow: 'Ahora',
    timeMin: 'min',
    timeHour: 'h',
    timeDay: 'd',
    timeWeek: 'sem',
  },
} as const

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
  const ct = pageContent[lang] || pageContent.fr

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return ct.timeNow
    if (minutes < 60) return `${minutes}${ct.timeMin}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}${ct.timeHour}`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}${ct.timeDay}`
    const weeks = Math.floor(days / 7)
    return `${weeks}${ct.timeWeek}`
  }

  const typeBadge: Record<string, { label: string; color: string }> = {
    order: { label: ct.order, color: 'bg-blue-500/20 text-blue-400' },
    dispute: { label: ct.dispute, color: 'bg-red-500/20 text-red-400' },
    support: { label: ct.support, color: 'bg-gray-500/20 text-gray-400' },
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
      if (!session) throw new Error('Non connecte')

      const res = await apiFetch('/api/conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Erreur serveur')

      const data = await res.json()

      // Sort by last message time (most recent first)
      data.sort((a: any, b: any) => {
        const timeA = a.last_message?.created_at || a.created_at
        const timeB = b.last_message?.created_at || b.created_at
        return new Date(timeB).getTime() - new Date(timeA).getTime()
      })

      setConversations(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
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
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{ct.title}</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Warning banner */}
      <div className="mx-4 mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
        <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-orange-300">
          {ct.offPlatformWarning}
        </p>
      </div>

      {/* Content */}
      <div className="mt-3 px-4">
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
          <div className="divide-y divide-white/5">
            {conversations.map((conv: any) => {
              const other = conv.other_participant
              const displayName = other?.display_name || 'Utilisateur'
              const avatarUrl = other?.avatar_url
              const badge = typeBadge[conv.type] || typeBadge.support
              const lastMsg = conv.last_message
              const preview = lastMsg?.message
                ? lastMsg.message.length > 50
                  ? lastMsg.message.slice(0, 50) + '...'
                  : lastMsg.message
                : ct.noMessage
              const lastTime = lastMsg?.created_at || conv.created_at
              const orderTitle = conv.order?.item?.title

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/conversation/${conv.id}`)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-white/5 rounded-lg transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                        {getInitials(displayName)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{displayName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(lastTime)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{preview}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      {orderTitle && (
                        <span className="text-[10px] text-gray-500 truncate">
                          {orderTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

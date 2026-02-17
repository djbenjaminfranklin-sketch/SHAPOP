import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import type { Conversation } from '../types/database'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  const weeks = Math.floor(days / 7)
  return `${weeks}sem`
}

const typeBadge: Record<string, { label: string; color: string }> = {
  order: { label: 'Commande', color: 'bg-blue-500/20 text-blue-400' },
  dispute: { label: 'Litige', color: 'bg-red-500/20 text-red-400' },
  support: { label: 'Support', color: 'bg-gray-500/20 text-gray-400' },
}

export default function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
        <p className="text-gray-400">Connectez-vous pour voir vos messages.</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-black text-white pb-24 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Messages</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Warning banner */}
      <div className="mx-4 mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
        <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-orange-300">
          Toute communication hors plateforme est interdite
        </p>
      </div>

      {/* Content */}
      <div className="mt-3 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm mt-3">Chargement...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchConversations} className="mt-3 text-indigo-400 text-sm underline">
              Reessayer
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 text-base">Aucune conversation</p>
            <p className="text-gray-600 text-sm mt-1">Vos messages appara&icirc;tront ici</p>
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
                : 'Aucun message'
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

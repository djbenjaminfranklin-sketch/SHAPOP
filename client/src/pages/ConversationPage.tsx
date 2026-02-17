import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Conversation, ConversationMessage } from '../types/database'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    placeholder: 'Votre message...',
    loading: 'Chargement...',
    loginRequired: 'Connectez-vous pour voir cette conversation.',
    back: 'Retour',
    startConversation: 'Commencez la conversation',
    attachment: 'Piece jointe',
    warningBanner: 'Toute communication hors plateforme est interdite',
    messages: 'Messages',
    order: 'Commande #',
    messageFlagged: '[Message masque]',
    defaultUser: 'Utilisateur',
    notFound: 'Conversation introuvable',
    unknownError: 'Erreur inconnue',
    sendError: 'Erreur lors de l\'envoi',
    uploadError: 'Erreur lors du chargement',
    contactWarning: 'Partager des coordonnees personnelles est interdit sur Shapop. Les recidives entrainent une suspension de compte.',
    yesterday: 'Hier',
  },
  en: {
    placeholder: 'Your message...',
    loading: 'Loading...',
    loginRequired: 'Log in to view this conversation.',
    back: 'Back',
    startConversation: 'Start the conversation',
    attachment: 'Attachment',
    warningBanner: 'All communication outside the platform is prohibited',
    messages: 'Messages',
    order: 'Order #',
    messageFlagged: '[Hidden message]',
    defaultUser: 'User',
    notFound: 'Conversation not found',
    unknownError: 'Unknown error',
    sendError: 'Failed to send',
    uploadError: 'Upload failed',
    contactWarning: 'Sharing personal contact information is prohibited on Shapop. Repeat offenses will result in account suspension.',
    yesterday: 'Yesterday',
  },
  he: {
    placeholder: '...ההודעה שלך',
    loading: '...טוען',
    loginRequired: 'התחבר כדי לצפות בשיחה זו.',
    back: 'חזור',
    startConversation: 'התחל את השיחה',
    attachment: 'קובץ מצורף',
    warningBanner: 'כל תקשורת מחוץ לפלטפורמה אסורה',
    messages: 'הודעות',
    order: '# הזמנה',
    messageFlagged: '[הודעה מוסתרת]',
    defaultUser: 'משתמש',
    notFound: 'השיחה לא נמצאה',
    unknownError: 'שגיאה לא ידועה',
    sendError: 'השליחה נכשלה',
    uploadError: 'ההעלאה נכשלה',
    contactWarning: 'שיתוף פרטי קשר אישיים אסור ב-Shapop. עבירות חוזרות יובילו להשעיית חשבון.',
    yesterday: 'אתמול',
  },
  es: {
    placeholder: 'Tu mensaje...',
    loading: 'Cargando...',
    loginRequired: 'Inicia sesion para ver esta conversacion.',
    back: 'Volver',
    startConversation: 'Comienza la conversacion',
    attachment: 'Archivo adjunto',
    warningBanner: 'Toda comunicacion fuera de la plataforma esta prohibida',
    messages: 'Mensajes',
    order: 'Pedido #',
    messageFlagged: '[Mensaje oculto]',
    defaultUser: 'Usuario',
    notFound: 'Conversacion no encontrada',
    unknownError: 'Error desconocido',
    sendError: 'Error al enviar',
    uploadError: 'Error al cargar',
    contactWarning: 'Compartir informacion de contacto personal esta prohibido en Shapop. Las reincidencias resultaran en la suspension de la cuenta.',
    yesterday: 'Ayer',
  },
}

const langLocaleMap: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  he: 'he-IL',
  es: 'es-ES',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(dateStr: string, locale: string, yesterdayLabel: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  if (isToday) return time
  if (isYesterday) return `${yesterdayLabel} ${time}`
  return `${date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} ${time}`
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr
  const locale = langLocaleMap[lang] || 'fr-FR'

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch conversation + messages
  const fetchData = useCallback(async () => {
    if (!user || !id) return
    setLoading(true)
    setError(null)
    try {
      // Fetch conversation
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (convErr) throw convErr
      if (!convData) throw new Error(ct.notFound)

      const conv = convData as Conversation

      // Fetch other participant's profile
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username, bio, is_seller, city, country, language, joined_communities, created_at')
        .eq('id', otherId)
        .single()

      if (otherProfile) {
        conv.other_participant = otherProfile as any
      }

      setConversation(conv)

      // Fetch messages
      const { data: msgData, error: msgErr } = await supabase
        .from('conversation_messages')
        .select('*, sender:profiles!conversation_messages_sender_id_fkey(id, display_name, avatar_url)')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      if (msgErr) throw msgErr
      setMessages((msgData || []) as ConversationMessage[])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.unknownError
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, id, ct.notFound, ct.unknownError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Subscribe to realtime messages
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`conversation_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ConversationMessage

          // Fetch sender profile for the new message
          if (newMsg.sender_id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
            if (senderProfile) {
              newMsg.sender = senderProfile as ConversationMessage['sender']
            }
          }

          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Send message
  const handleSend = async (attachmentUrls?: string[]) => {
    if (!user || !id || !session) return
    const text = newMessage.trim()
    if (!text && (!attachmentUrls || attachmentUrls.length === 0)) return

    setSending(true)
    try {
      const res = await apiFetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: text || '',
          attachment_urls: attachmentUrls || [],
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || ct.sendError)
      }

      const result = await res.json().catch(() => ({}))
      if (result.warning === 'contact_blocked') {
        alert(ct.contactWarning)
      }

      setNewMessage('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.unknownError
      alert(message)
    } finally {
      setSending(false)
    }
  }

  // Handle file attachment
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return

    setUploading(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `conversation-attachments/${id}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('conversation-attachments')
        .upload(filePath, file)

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('conversation-attachments')
        .getPublicUrl(filePath)

      await handleSend([urlData.publicUrl])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.uploadError
      alert(message)
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const otherName = conversation?.other_participant?.display_name || ct.defaultUser
  const otherAvatar = conversation?.other_participant?.avatar_url

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <p className="text-gray-400">{ct.loginRequired}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-3">{ct.loading}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-indigo-400 text-sm underline">
          {ct.back}
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/90 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/messages')} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Other participant info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {otherAvatar ? (
              <img src={otherAvatar} alt={otherName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                {getInitials(otherName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{otherName}</p>
              {conversation?.order_id && (
                <p className="text-[10px] text-gray-500 truncate">
                  {ct.order}{conversation.order_id.slice(0, 8)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex-shrink-0 mx-4 mt-2 mb-1 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2">
        <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px] text-orange-300">
          {ct.warningBanner}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="text-gray-600 text-sm">{ct.startConversation}</p>
          </div>
        )}

        {messages.map(msg => {
          const isOwn = msg.sender_id === user.id
          const isSystem = msg.is_system
          const isFlagged = msg.is_flagged

          // System message
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <p className="text-xs text-gray-500 italic text-center max-w-[80%] py-1">
                  {isFlagged ? ct.messageFlagged : msg.message}
                </p>
              </div>
            )
          }

          // Flagged message
          if (isFlagged) {
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className={`px-3 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-gray-700 rounded-br-md'
                      : 'bg-gray-800 rounded-bl-md'
                  }`}>
                    <p className="text-sm text-gray-500 italic">{ct.messageFlagged}</p>
                  </div>
                  <p className={`text-[10px] text-gray-600 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.created_at, locale, ct.yesterday)}
                  </p>
                </div>
              </div>
            )
          }

          // Regular message
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {/* Sender name for other's messages */}
                {!isOwn && msg.sender && (
                  <p className="text-[10px] text-gray-500 mb-0.5 ml-1">
                    {msg.sender.display_name}
                  </p>
                )}

                <div className={`px-3 py-2 rounded-2xl ${
                  isOwn
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-100 rounded-bl-md'
                }`}>
                  {/* Message text */}
                  {msg.message && (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  )}

                  {/* Attachments */}
                  {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachment_urls.map((url, i) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                        if (isImage) {
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={ct.attachment}
                                className="max-w-full rounded-lg max-h-48 object-cover"
                              />
                            </a>
                          )
                        }
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs underline text-indigo-300 hover:text-indigo-200"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {ct.attachment}
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>

                <p className={`text-[10px] text-gray-600 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at, locale, ct.yesterday)}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 bg-black/90 backdrop-blur-sm border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-gray-400 hover:text-white disabled:opacity-50 p-1"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
          />

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ct.placeholder}
            className="flex-1 bg-gray-900 text-white text-sm rounded-full px-4 py-2 border border-white/10 focus:border-indigo-500 focus:outline-none placeholder:text-gray-500"
            disabled={sending}
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={sending || (!newMessage.trim() && !uploading)}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full p-2 transition-colors"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

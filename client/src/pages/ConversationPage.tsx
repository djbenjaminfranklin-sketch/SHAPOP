import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, getLocale, tr, type Localized } from '../lib/i18n'
import { formatItemPrice } from '../lib/fulfillment'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Conversation, ConversationMessage } from '../types/database'

const pageContent = {
  en: {
    placeholder: 'Your message…',
    loading: 'Loading…',
    loginRequired: 'Log in to see this conversation.',
    back: 'Back',
    startConversation: 'Start the conversation',
    attachment: 'Attachment',
    warningBanner: 'Keep all conversations on ShaPop: contact outside the app is not allowed',
    messages: 'Messages',
    order: 'Order #',
    messageFlagged: '[Hidden message]',
    defaultUser: 'User',
    notFound: 'Conversation not found',
    unknownError: 'Something went wrong',
    sendError: 'Couldn\'t send the message',
    uploadError: 'Couldn\'t upload the file',
    contactWarning: 'Sharing personal contact details is not allowed on ShaPop. Repeat offenses lead to account suspension.',
    yesterday: 'Yesterday',
    noMessages: 'No messages yet',
    justNow: 'Just now',
    minutesAgo: '{n} min ago',
    hoursAgo: '{n} h ago',
    daysAgo: '{n} d ago',
    send: 'Send',
  },
  fr: {
    placeholder: 'Ton message…',
    loading: 'Chargement…',
    loginRequired: 'Connecte-toi pour voir cette conversation.',
    back: 'Retour',
    startConversation: 'Lance la conversation',
    attachment: 'Pièce jointe',
    warningBanner: 'Reste sur ShaPop : tout échange en dehors de l\'appli est interdit',
    messages: 'Messages',
    order: 'Commande n° ',
    messageFlagged: '[Message masqué]',
    defaultUser: 'Utilisateur',
    notFound: 'Conversation introuvable',
    unknownError: 'Une erreur est survenue',
    sendError: 'Impossible d\'envoyer le message',
    uploadError: 'Impossible d\'envoyer le fichier',
    contactWarning: 'Partager tes coordonnées personnelles est interdit sur ShaPop. En cas de récidive, ton compte sera suspendu.',
    yesterday: 'Hier',
    noMessages: 'Aucun message pour l\'instant',
    justNow: 'À l\'instant',
    minutesAgo: 'il y a {n} min',
    hoursAgo: 'il y a {n} h',
    daysAgo: 'il y a {n} j',
    send: 'Envoyer',
  },
  es: {
    placeholder: 'Tu mensaje…',
    loading: 'Cargando…',
    loginRequired: 'Inicia sesión para ver esta conversación.',
    back: 'Volver',
    startConversation: 'Empieza la conversación',
    attachment: 'Archivo adjunto',
    warningBanner: 'Quédate en ShaPop: está prohibido comunicarse fuera de la app',
    messages: 'Mensajes',
    order: 'Pedido n.º ',
    messageFlagged: '[Mensaje oculto]',
    defaultUser: 'Usuario',
    notFound: 'Conversación no encontrada',
    unknownError: 'Ha ocurrido un error',
    sendError: 'No se pudo enviar el mensaje',
    uploadError: 'No se pudo subir el archivo',
    contactWarning: 'Está prohibido compartir datos de contacto personales en ShaPop. Si reincides, tu cuenta será suspendida.',
    yesterday: 'Ayer',
    noMessages: 'Aún no hay mensajes',
    justNow: 'Ahora',
    minutesAgo: 'hace {n} min',
    hoursAgo: 'hace {n} h',
    daysAgo: 'hace {n} d',
    send: 'Enviar',
  },
  ru: {
    placeholder: 'Твоё сообщение…',
    loading: 'Загрузка…',
    loginRequired: 'Войди, чтобы открыть этот диалог.',
    back: 'Назад',
    startConversation: 'Начни диалог',
    attachment: 'Вложение',
    warningBanner: 'Общайся только в ShaPop: связь вне приложения запрещена',
    messages: 'Сообщения',
    order: 'Заказ №',
    messageFlagged: '[Сообщение скрыто]',
    defaultUser: 'Пользователь',
    notFound: 'Диалог не найден',
    unknownError: 'Что-то пошло не так',
    sendError: 'Не удалось отправить сообщение',
    uploadError: 'Не удалось загрузить файл',
    contactWarning: 'В ShaPop запрещено делиться личными контактами. При повторном нарушении аккаунт будет заблокирован.',
    yesterday: 'Вчера',
    noMessages: 'Сообщений пока нет',
    justNow: 'Только что',
    minutesAgo: '{n} мин назад',
    hoursAgo: '{n} ч назад',
    daysAgo: '{n} д назад',
    send: 'Отправить',
  },
  he: {
    placeholder: 'ההודעה שלך…',
    loading: 'טוען…',
    loginRequired: 'יש להתחבר כדי לראות את השיחה הזו.',
    back: 'חזרה',
    startConversation: 'אפשר להתחיל את השיחה',
    attachment: 'קובץ מצורף',
    warningBanner: 'נשארים ב-ShaPop: אסור לתקשר מחוץ לאפליקציה',
    messages: 'הודעות',
    order: 'הזמנה #',
    messageFlagged: '[הודעה מוסתרת]',
    defaultUser: 'משתמש',
    notFound: 'השיחה לא נמצאה',
    unknownError: 'משהו השתבש',
    sendError: 'לא הצלחנו לשלוח את ההודעה',
    uploadError: 'לא הצלחנו להעלות את הקובץ',
    contactWarning: 'אסור לשתף פרטי קשר אישיים ב-ShaPop. הפרה חוזרת תוביל להשעיית החשבון.',
    yesterday: 'אתמול',
    noMessages: 'אין עדיין הודעות',
    justNow: 'עכשיו',
    minutesAgo: 'לפני {n} דק׳',
    hoursAgo: 'לפני {n} שע׳',
    daysAgo: 'לפני {n} ימים',
    send: 'שליחה',
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

function formatRelativeTime(
  dateStr: string,
  ct: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string; yesterday: string },
  locale: string,
): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) return ct.justNow
  if (diffMin < 60) return ct.minutesAgo.replace('{n}', String(diffMin))
  if (diffHours < 24) return ct.hoursAgo.replace('{n}', String(diffHours))
  if (diffDays === 1) return ct.yesterday
  if (diffDays < 7) return ct.daysAgo.replace('{n}', String(diffDays))

  // Older than a week: show date
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
  return `${day} ${time}`
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session, profile } = useAuth()
  const lang = getLang()
  const ct = tr(pageContent, lang)
  usePageTitle(ct.messages)
  const locale = getLocale(lang)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // Pays du vendeur de l'article (pour afficher le prix dans sa devise)
  const [sellerCountry, setSellerCountry] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((instant?: boolean) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth',
      })
    }
  }, [])

  const itemId = conversation?.item?.id
  useEffect(() => {
    if (!itemId) return
    let cancelled = false
    ;(async () => {
      const { data: it } = await supabase.from('items').select('seller_id').eq('id', itemId).maybeSingle()
      if (!it?.seller_id || cancelled) return
      const { data: sp } = await supabase.from('profiles').select('country').eq('id', it.seller_id).maybeSingle()
      if (!cancelled && sp?.country) setSellerCountry(sp.country)
    })()
    return () => { cancelled = true }
  }, [itemId])

  // Fetch conversation + messages
  const fetchData = useCallback(async () => {
    if (!user || !id) return
    setLoading(true)
    setError(null)
    try {
      let conv: Conversation | null = null

      // Try API first (bypasses RLS), fallback to Supabase direct
      if (session?.access_token) {
        try {
          const convResp = await apiFetch(`/api/conversations/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (convResp.ok) {
            conv = await convResp.json() as Conversation
          }
        } catch { /* fallback below */ }
      }

      if (!conv) {
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', id)
          .single()
        if (convErr || !convData) throw new Error(ct.notFound)
        conv = convData as Conversation

        // Fetch other participant profile
        const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, username')
          .eq('id', otherId)
          .single()
        if (profile) conv.other_participant = profile as Conversation['other_participant']
      }

      setConversation(conv)

      // Fetch messages via API if available, fallback to Supabase
      let msgs: ConversationMessage[] = []
      if (session?.access_token) {
        try {
          const msgResp = await apiFetch(`/api/conversations/${id}/messages`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (msgResp.ok) {
            msgs = await msgResp.json() as ConversationMessage[]
          }
        } catch { /* fallback below */ }
      }

      if (msgs.length === 0) {
        const { data: msgData } = await supabase
          .from('conversation_messages')
          .select('*, sender:profiles!conversation_messages_sender_id_fkey(id, display_name, avatar_url)')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true })
          .limit(100)
        msgs = (msgData || []) as ConversationMessage[]
      }

      setMessages(msgs)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.unknownError
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, id, session, ct.notFound, ct.unknownError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Use instant scroll on first load, smooth on new messages
      const isInitialLoad = loading === false
      setTimeout(() => scrollToBottom(isInitialLoad), 50)
    }
  }, [messages, scrollToBottom, loading])

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

  // Auto-dismiss send error after 3 seconds
  useEffect(() => {
    if (!sendError) return
    const timer = setTimeout(() => setSendError(null), 3000)
    return () => clearTimeout(timer)
  }, [sendError])

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
        await res.json().catch(() => ({}))
        throw new Error(ct.sendError)
      }

      const result = await res.json().catch(() => ({}))
      if (result.warning === 'contact_blocked') {
        setSendError(ct.contactWarning)
      }

      setNewMessage('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error(err)
      setSendError(ct.sendError)
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
      if (import.meta.env.DEV) console.error(err)
      setSendError(ct.uploadError)
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
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <p style={{ color: '#888' }}>{ct.loginRequired}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
          role="status"
          aria-label={ct.loading}
          style={{
            width: '36px', height: '36px',
            border: '3px solid #333',
            borderTopColor: '#E8344E',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#666', fontSize: 'calc(14px * var(--fs, 1))', marginTop: '12px' }}>{ct.loading}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <p role="alert" style={{ color: '#EF4444', fontSize: 'calc(14px * var(--fs, 1))' }}>{error}</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '12px', color: '#E8344E', fontSize: 'calc(14px * var(--fs, 1))', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
          {ct.back}
        </button>
      </div>
    )
  }

  const canSend = newMessage.trim().length > 0 && !sending

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        backgroundColor: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
          {/* Back button */}
          <button
            onClick={() => navigate('/messages')}
            aria-label={ct.back}
            style={{
              background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
              color: '#E8344E', flexShrink: 0, display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Other participant info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {otherAvatar ? (
              <img
                src={otherAvatar}
                alt={otherName}
                loading="lazy"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #E8344E, #F0908A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 'calc(14px * var(--fs, 1))', letterSpacing: '0.5px',
              }}>
                {getInitials(otherName)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                {otherName}
              </p>
              {conversation?.item?.title && (
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#888', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conversation.item.title}{conversation.item.current_price ? ` — ${formatItemPrice(conversation.item.current_price, sellerCountry ?? profile?.country, lang)}` : ''}
                </p>
              )}
              {!conversation?.item?.title && conversation?.order_id && (
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ct.order}{conversation.order_id.slice(0, 8)}
                </p>
              )}
            </div>
            {conversation?.item?.image_urls?.[0] && (
              <button
                onClick={() => conversation.item?.id && navigate(`/item/${conversation.item.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              >
                <img
                  src={conversation.item.image_urls[0]}
                  alt=""
                  loading="lazy"
                  style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </button>
            )}
          </div>
          {/* Home button */}
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
              color: '#888', flexShrink: 0, display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ flexShrink: 0, padding: '8px 16px 12px 16px' }}>
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#FDBA74', margin: 0 }}>
            {ct.warningBanner}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px 8px 12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            paddingTop: '80px', gap: '12px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: '#1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" fill="none" stroke="#444" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#555', margin: 0 }}>{ct.noMessages}</p>
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#444', margin: 0 }}>{ct.startConversation}</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === user.id
          const isSystem = msg.is_system
          const isFlagged = msg.is_flagged

          // Check if we should show timestamp (first msg, or >5min gap from previous)
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          const showTimestamp = !prevMsg ||
            (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000

          // Group consecutive messages from same sender (hide avatar/name if same sender and <5min gap)
          const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id && !showTimestamp && !prevMsg.is_system

          // System message
          if (isSystem) {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <p style={{
                  fontSize: 'calc(12px * var(--fs, 1))', color: '#666', fontStyle: 'italic', textAlign: 'center',
                  maxWidth: '80%', padding: '4px 12px', margin: 0,
                  backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                }}>
                  {isFlagged ? ct.messageFlagged : msg.message}
                </p>
              </div>
            )
          }

          // Flagged message
          if (isFlagged) {
            return (
              <div key={msg.id} style={{ marginBottom: '4px' }}>
                {showTimestamp && (
                  <div style={{ textAlign: 'center', margin: '16px 0 8px 0' }}>
                    <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#555' }}>
                      {formatRelativeTime(msg.created_at, ct, locale)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      backgroundColor: isOwn ? '#3A2020' : '#1A1A1A',
                    }}>
                      <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#777', fontStyle: 'italic', margin: 0 }}>{ct.messageFlagged}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Regular message
          return (
            <div key={msg.id} style={{ marginBottom: isSameSenderAsPrev ? '2px' : '8px' }}>
              {showTimestamp && (
                <div style={{ textAlign: 'center', margin: '16px 0 8px 0' }}>
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#555' }}>
                    {formatRelativeTime(msg.created_at, ct, locale)}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: '6px',
                padding: '0 4px',
              }}>
                {/* Receiver avatar (left side) — only show for first message in group */}
                {!isOwn && (
                  <div style={{ flexShrink: 0, marginBottom: '2px', width: '28px' }}>
                    {!isSameSenderAsPrev && (
                      msg.sender?.avatar_url ? (
                        <img
                          src={msg.sender.avatar_url}
                          alt={msg.sender?.display_name || ''}
                          loading="lazy"
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          backgroundColor: '#2A2A2A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#888', fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600,
                        }}>
                          {getInitials(msg.sender?.display_name || otherName)}
                        </div>
                      )
                    )}
                  </div>
                )}

                <div style={{ maxWidth: '75%' }}>
                  {/* Sender name for received messages — only show for first message in group */}
                  {!isOwn && msg.sender && !isSameSenderAsPrev && (
                    <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#666', margin: '0 0 2px 4px' }}>
                      {msg.sender.display_name}
                    </p>
                  )}

                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: isOwn ? '#E8344E' : '#1A1A1A',
                    color: '#fff',
                  }}>
                    {/* Message text */}
                    {msg.message && (
                      <p style={{ fontSize: 'calc(14px * var(--fs, 1))', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {msg.message}
                      </p>
                    )}

                    {/* Attachments */}
                    {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                      <div style={{ marginTop: msg.message ? '6px' : '0' }}>
                        {msg.attachment_urls.map((url) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                          if (isImage) {
                            return (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt={ct.attachment}
                                  loading="lazy"
                                  style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                                  onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }}
                                />
                              </a>
                            )
                          }
                          return (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: 'calc(12px * var(--fs, 1))', textDecoration: 'underline',
                                color: isOwn ? 'rgba(255,255,255,0.85)' : '#F0908A',
                              }}
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {ct.attachment}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Inline send error */}
      {sendError && (
        <div
          role="alert"
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderTop: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#EF4444', margin: 0, textAlign: 'center' }}>
            {sendError}
          </p>
        </div>
      )}

      {/* Input bar - fixed at bottom */}
      <div style={{
        flexShrink: 0,
        backgroundColor: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={ct.attachment}
            style={{
              background: 'none', border: 'none', padding: '8px', cursor: 'pointer',
              color: uploading ? '#444' : '#888', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {uploading ? (
              <div style={{
                width: '22px', height: '22px',
                border: '2px solid #333', borderTopColor: '#E8344E',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
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
            aria-label={ct.placeholder}
            disabled={sending}
            style={{
              flex: 1,
              backgroundColor: '#1A1A1A',
              color: '#fff',
              fontSize: 'calc(15px * var(--fs, 1))',
              borderRadius: '22px',
              padding: '12px 18px',
              border: '1px solid rgba(255,255,255,0.06)',
              outline: 'none',
              minHeight: '44px',
            }}
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            aria-label={ct.send}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: canSend ? '#E8344E' : '#1A1A1A',
              border: 'none', cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.2s ease',
            }}
          >
            {sending ? (
              <div style={{
                width: '20px', height: '20px',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={canSend ? '#fff' : '#444'} stroke="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

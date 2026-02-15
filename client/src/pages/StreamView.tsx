import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import type { Stream, AuctionItem, ChatMessage, Bid } from '../types/database'
import EngagementDashboard from '../components/EngagementDashboard'
import ViewerReactions from '../components/ViewerReactions'

type Lang = 'fr' | 'en' | 'he' | 'es'

const streamContent = {
  fr: {
    viewers: 'spectateurs',
    liveStartsSoon: 'Le live commence bient\u00F4t...',
    liveEnded: 'Le live est termin\u00E9',
    liveChat: 'Chat en direct',
    anonymous: 'Anonyme',
    sendMessage: 'Envoyer un message...',
    send: 'Envoyer',
    bid: 'Ench\u00E9rir',
    currentPrice: 'Prix actuel',
    loginToChat: 'Connectez-vous pour participer au chat',
    streamNotFound: 'Stream introuvable',
  },
  en: {
    viewers: 'viewers',
    liveStartsSoon: 'The live starts soon...',
    liveEnded: 'The live has ended',
    liveChat: 'Live chat',
    anonymous: 'Anonymous',
    sendMessage: 'Send a message...',
    send: 'Send',
    bid: 'Bid',
    currentPrice: 'Current price',
    loginToChat: 'Log in to join the chat',
    streamNotFound: 'Stream not found',
  },
  he: {
    viewers: '\u05E6\u05D5\u05E4\u05D9\u05DD',
    liveStartsSoon: '...\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05DE\u05EA\u05D7\u05D9\u05DC \u05D1\u05E7\u05E8\u05D5\u05D1',
    liveEnded: '\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD',
    liveChat: '\u05E6\u05F3\u05D0\u05D8 \u05D7\u05D9',
    anonymous: '\u05D0\u05E0\u05D5\u05E0\u05D9\u05DE\u05D9',
    sendMessage: '...\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4',
    send: '\u05E9\u05DC\u05D7',
    bid: '\u05D4\u05E6\u05E2',
    currentPrice: '\u05DE\u05D7\u05D9\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D9',
    loginToChat: '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E9\u05EA\u05EA\u05E3 \u05D1\u05E6\u05F3\u05D0\u05D8',
    streamNotFound: '\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0',
  },
  es: {
    viewers: 'espectadores',
    liveStartsSoon: 'El live empieza pronto...',
    liveEnded: 'El live ha terminado',
    liveChat: 'Chat en directo',
    anonymous: 'Anonimo',
    sendMessage: 'Enviar un mensaje...',
    send: 'Enviar',
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    loginToChat: 'Inicia sesion para participar en el chat',
    streamNotFound: 'Stream no encontrado',
  },
}

export default function StreamView() {
  const { id } = useParams<{ id: string }>()
  const lang = (getLang() || 'fr') as Lang
  const ct = streamContent[lang] || streamContent.fr
  const { user, profile } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [stream, setStream] = useState<Stream | null>(null)
  const [activeAuction, setActiveAuction] = useState<AuctionItem | null>(null)
  const [messages, setMessages] = useState<(ChatMessage & { user_profile?: { display_name: string } })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)

  // Engagement dashboard state
  const [showEngagement, setShowEngagement] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const [engageBtnPulse, setEngageBtnPulse] = useState(false)

  // Determine if user is the seller of this stream
  const isSeller = !!(user && stream && stream.seller_id === user.id)
  const isLive = stream?.status === 'live'

  // Pulse the engagement button periodically to draw attention
  useEffect(() => {
    if (!isSeller || !isLive) return
    const interval = setInterval(() => {
      setEngageBtnPulse(true)
      setTimeout(() => setEngageBtnPulse(false), 1200)
    }, 30000)
    // Initial pulse after 5s
    const initialTimeout = setTimeout(() => {
      setEngageBtnPulse(true)
      setTimeout(() => setEngageBtnPulse(false), 1200)
    }, 5000)
    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [isSeller, isLive])

  // Charger les données du stream
  useEffect(() => {
    if (!id) return

    const fetchStream = async () => {
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('id', id)
        .single()
      setStream(data)
      setLoading(false)
    }

    const fetchActiveAuction = async () => {
      const { data } = await supabase
        .from('auction_items')
        .select('*')
        .eq('stream_id', id)
        .eq('status', 'active')
        .single()
      setActiveAuction(data)
      if (data) {
        setBidAmount(String(data.current_price + 10))
      }
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('stream_id', id)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(data || [])
    }

    fetchStream()
    fetchActiveAuction()
    fetchMessages()
  }, [id])

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!id) return

    const channel = supabase.channel(`stream-${id}`)

    // Nouveaux messages de chat
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `stream_id=eq.${id}`,
    }, async (payload) => {
      const { data: enriched } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('id', payload.new.id)
        .single()
      if (enriched) {
        setMessages(prev => [...prev, enriched])
      }
    })

    // Mises à jour des enchères
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'auction_items',
      filter: `stream_id=eq.${id}`,
    }, (payload) => {
      const item = payload.new as AuctionItem
      if (item.status === 'active') {
        setActiveAuction(item)
        setBidAmount(String(item.current_price + 10))
      } else if (item.status === 'sold' || item.status === 'unsold') {
        setActiveAuction(null)
      }
    })

    // Mises à jour du stream
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'streams',
      filter: `id=eq.${id}`,
    }, (payload) => {
      setStream(payload.new as Stream)
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Timer pour l'enchère
  useEffect(() => {
    if (!activeAuction?.started_at) return

    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(activeAuction.started_at!).getTime()) / 1000
      const remaining = Math.max(0, activeAuction.duration_seconds - elapsed)
      setTimeLeft(Math.ceil(remaining))

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeAuction])

  // Auto-scroll du chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return

    await supabase.from('chat_messages').insert({
      stream_id: id,
      user_id: user.id,
      message: newMessage.trim(),
    })
    setNewMessage('')
  }

  const handlePlaceBid = async () => {
    if (!activeAuction || !user) return
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= activeAuction.current_price) return

    await supabase.from('bids').insert({
      auction_item_id: activeAuction.id,
      bidder_id: user.id,
      amount,
    })

    await supabase
      .from('auction_items')
      .update({ current_price: amount })
      .eq('id', activeAuction.id)
  }

  const handleViewerReaction = useCallback(() => {
    setReactionCount(prev => prev + 1)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500">{ct.streamNotFound}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vidéo + Enchères */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lecteur vidéo */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            {stream.status === 'live' && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-md">
                  LIVE
                </span>
                <span className="bg-black/60 text-white text-sm px-3 py-1 rounded-md">
                  {stream.viewer_count} {ct.viewers}
                </span>
              </div>
            )}
            {stream.status !== 'live' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <p className="text-5xl mb-4">{'\u{1F4FA}'}</p>
                  <p className="text-xl font-semibold">
                    {stream.status === 'scheduled' ? ct.liveStartsSoon : ct.liveEnded}
                  </p>
                </div>
              </div>
            )}

            {/* ── Seller: Engagement Dashboard Toggle Button ── */}
            {isSeller && isLive && (
              <button
                onClick={() => setShowEngagement(!showEngagement)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: showEngagement ? '#F0908A' : 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: showEngagement ? '2px solid #F0908A' : '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  zIndex: 60,
                  transition: 'all 0.3s ease',
                  transform: engageBtnPulse ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: engageBtnPulse
                    ? '0 0 20px rgba(240,144,138,0.5)'
                    : showEngagement
                      ? '0 4px 16px rgba(240,144,138,0.3)'
                      : 'none',
                }}
              >
                {'\u{1F4CA}'}
              </button>
            )}

            {/* ── Seller: Engagement Dashboard Overlay ── */}
            {isSeller && isLive && (
              <EngagementDashboard
                streamId={id || ''}
                isVisible={showEngagement}
                onClose={() => setShowEngagement(false)}
              />
            )}

            {/* ── Viewer: Reaction Buttons ── */}
            {!isSeller && isLive && user && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                zIndex: 40,
              }}>
                <ViewerReactions onReaction={handleViewerReaction} />
              </div>
            )}
          </div>

          {/* Info du stream */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{stream.title}</h1>
            {stream.description && (
              <p className="text-gray-500 mt-1">{stream.description}</p>
            )}
          </div>

          {/* Enchère active */}
          {activeAuction && (
            <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{activeAuction.title}</h3>
                <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-purple-600'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">{ct.currentPrice}</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {activeAuction.current_price.toLocaleString()} {'\u{20AA}'}
                  </p>
                </div>

                {user && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      min={activeAuction.current_price + 1}
                      className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg font-semibold"
                    />
                    <button
                      onClick={handlePlaceBid}
                      disabled={timeLeft <= 0}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {ct.bid}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[600px] lg:h-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{ct.liveChat}</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className="flex gap-2">
                <span className="font-semibold text-purple-600 text-sm shrink-0">
                  {msg.user_profile?.display_name || ct.anonymous}
                </span>
                <span className="text-gray-700 text-sm break-words">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {user ? (
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder={ct.sendMessage}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  {ct.send}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">{ct.loginToChat}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

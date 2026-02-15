import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
    liveStartsSoon: 'Le live commence bientot...',
    liveEnded: 'Le live est termine',
    liveChat: 'Chat en direct',
    anonymous: 'Anonyme',
    sendMessage: 'Envoyer un message...',
    send: 'Envoyer',
    bid: 'Encherir',
    currentPrice: 'Prix actuel',
    loginToChat: 'Connectez-vous pour participer au chat',
    streamNotFound: 'Stream introuvable',
    endStream: 'Terminer le live',
    endStreamConfirm: 'Es-tu sur de vouloir terminer le live ?',
    endStreamYes: 'Oui, terminer',
    endStreamNo: 'Non, continuer',
    mute: 'Couper le micro',
    unmute: 'Activer le micro',
    flipCamera: 'Retourner la camera',
    connectedTo: 'Connecte au live de',
    liveNow: 'EN DIRECT',
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
    endStream: 'End stream',
    endStreamConfirm: 'Are you sure you want to end the stream?',
    endStreamYes: 'Yes, end it',
    endStreamNo: 'No, continue',
    mute: 'Mute mic',
    unmute: 'Unmute mic',
    flipCamera: 'Flip camera',
    connectedTo: 'Connected to live by',
    liveNow: 'LIVE',
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
    endStream: '\u05E1\u05D9\u05D9\u05DD \u05E9\u05D9\u05D3\u05D5\u05E8',
    endStreamConfirm: '?\u05D1\u05D8\u05D5\u05D7 \u05E9\u05D0\u05EA\u05D4 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05EA \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8',
    endStreamYes: '\u05DB\u05DF, \u05E1\u05D9\u05D9\u05DD',
    endStreamNo: '\u05DC\u05D0, \u05D4\u05DE\u05E9\u05DA',
    mute: '\u05D4\u05E9\u05EA\u05E7 \u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF',
    unmute: '\u05D4\u05E4\u05E2\u05DC \u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF',
    flipCamera: '\u05D4\u05E4\u05D5\u05DA \u05DE\u05E6\u05DC\u05DE\u05D4',
    connectedTo: '\u05DE\u05D7\u05D5\u05D1\u05E8 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05E9\u05DC',
    liveNow: '\u05E9\u05D9\u05D3\u05D5\u05E8',
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
    endStream: 'Terminar el directo',
    endStreamConfirm: 'Seguro que quieres terminar el directo?',
    endStreamYes: 'Si, terminar',
    endStreamNo: 'No, continuar',
    mute: 'Silenciar micro',
    unmute: 'Activar micro',
    flipCamera: 'Voltear camara',
    connectedTo: 'Conectado al directo de',
    liveNow: 'EN VIVO',
  },
}

export default function StreamView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lang = (getLang() || 'fr') as Lang
  const ct = streamContent[lang] || streamContent.fr
  const { user, profile } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

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

  // Seller camera state
  const [isMuted, setIsMuted] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  // Viewer simulated state
  const [simulatedViewers, setSimulatedViewers] = useState(0)
  const [sellerName, setSellerName] = useState('')

  // Determine if user is the seller of this stream
  const isSeller = !!(user && stream && stream.seller_id === user.id)
  const isLive = stream?.status === 'live'

  // ═══ SELLER: Start camera capture ═══
  useEffect(() => {
    if (!isSeller || !isLive) return

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        })

        mediaStreamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setCameraActive(true)
      } catch (err) {
        console.error('Camera error in StreamView:', err)
        setCameraActive(false)
      }
    }

    startCamera()

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [isSeller, isLive]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ VIEWER: Fetch seller name and simulate viewers ═══
  useEffect(() => {
    if (isSeller || !stream) return

    // Fetch seller profile name
    const fetchSellerProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', stream.seller_id)
        .single()
      if (data) {
        setSellerName(data.display_name || data.username || '')
      }
    }
    fetchSellerProfile()

    // Simulate viewer count changing
    if (isLive) {
      const base = stream.viewer_count || Math.floor(Math.random() * 200) + 50
      setSimulatedViewers(base)
      const interval = setInterval(() => {
        setSimulatedViewers(prev => {
          const change = Math.floor(Math.random() * 7) - 2
          return Math.max(1, prev + change)
        })
      }, 3000 + Math.random() * 4000)
      return () => clearInterval(interval)
    }
  }, [isSeller, stream, isLive])

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

  // Charger les donnees du stream
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

  // Ecouter les mises a jour en temps reel
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

    // Mises a jour des encheres
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

    // Mises a jour du stream
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

  // Timer pour l'enchere
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

  // ═══ SELLER CAMERA CONTROLS ═══
  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)

    // Stop old tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      })
      mediaStreamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Flip camera error:', err)
    }
  }

  const handleToggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const handleEndStream = async () => {
    // Stop camera tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    // Update stream status to 'ended'
    if (id) {
      await supabase
        .from('streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    setShowEndConfirm(false)
    navigate('/')
  }

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
        {/* Video + Encheres */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lecteur video */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">

            {/* ═══ SELLER VIEW: Live camera ═══ */}
            {isSeller && isLive && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            )}

            {/* ═══ VIEWER VIEW: Simulated live experience ═══ */}
            {!isSeller && isLive && (
              <div style={{
                width: '100%', height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Blurred thumbnail background */}
                {stream.thumbnail_url ? (
                  <img
                    src={stream.thumbnail_url}
                    alt=""
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(20px) brightness(0.4)',
                      transform: 'scale(1.1)',
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, #1a0a0e 0%, #000 70%)',
                  }} />
                )}

                {/* Animated gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(circle at 30% 50%, rgba(240,144,138,0.08) 0%, transparent 50%)',
                  animation: 'viewerGlow 4s ease-in-out infinite alternate',
                }} />

                {/* Center content */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '16px',
                  zIndex: 5,
                }}>
                  {/* Pulsing LIVE badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 20px', borderRadius: '100px',
                    background: 'rgba(232,52,78,0.2)',
                    border: '1px solid rgba(232,52,78,0.4)',
                    animation: 'livePulse 2s ease-in-out infinite',
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: '#E8344E',
                      animation: 'liveDot 1.5s ease-in-out infinite',
                      boxShadow: '0 0 12px rgba(232,52,78,0.8)',
                    }} />
                    <span style={{
                      fontSize: '14px', fontWeight: 800, color: '#E8344E',
                      letterSpacing: '2px',
                    }}>
                      {ct.liveNow}
                    </span>
                  </div>

                  {/* Audio waveform visualization */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    height: '40px', padding: '0 12px',
                  }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          borderRadius: '2px',
                          backgroundColor: '#F0908A',
                          opacity: 0.5 + Math.random() * 0.5,
                          animation: `waveBar ${0.6 + Math.random() * 0.8}s ease-in-out ${i * 0.08}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Connected text */}
                  <p style={{
                    fontSize: '15px', color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                  }}>
                    {ct.connectedTo} <span style={{ color: '#F0908A', fontWeight: 700 }}>{sellerName}</span>
                  </p>
                </div>

                {/* Viewer count badge - dynamic */}
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  padding: '6px 12px', borderRadius: '8px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  zIndex: 10,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                    {simulatedViewers}
                  </span>
                </div>
              </div>
            )}

            {/* ═══ NON-LIVE states (scheduled / ended) ═══ */}
            {(!isSeller && !isLive) && (
              <div style={{ width: '100%', height: '100%' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <p className="text-5xl mb-4">{'\u{1F4FA}'}</p>
                    <p className="text-xl font-semibold">
                      {stream.status === 'scheduled' ? ct.liveStartsSoon : ct.liveEnded}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {(isSeller && !isLive) && (
              <div style={{ width: '100%', height: '100%' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <p className="text-5xl mb-4">{'\u{1F4FA}'}</p>
                    <p className="text-xl font-semibold">
                      {stream.status === 'scheduled' ? ct.liveStartsSoon : ct.liveEnded}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ LIVE badge + viewer count (always shown when live) ═══ */}
            {stream.status === 'live' && isSeller && (
              <div className="absolute top-4 left-4 flex items-center gap-2" style={{ zIndex: 20 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #E8344E, #FF6B6B)',
                  padding: '5px 14px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 800, color: '#fff',
                  letterSpacing: '1px',
                  boxShadow: '0 2px 12px rgba(232,52,78,0.5)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: '#fff',
                    animation: 'liveDot 1.5s ease-in-out infinite',
                  }} />
                  LIVE
                </span>
                <span style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '5px 12px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 600, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  {stream.viewer_count} {ct.viewers}
                </span>
              </div>
            )}

            {/* Viewer LIVE badge */}
            {stream.status === 'live' && !isSeller && (
              <div style={{
                position: 'absolute', top: '16px', left: '16px',
                zIndex: 20,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #E8344E, #FF6B6B)',
                  padding: '5px 14px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 800, color: '#fff',
                  letterSpacing: '1px',
                  boxShadow: '0 2px 12px rgba(232,52,78,0.5)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: '#fff',
                    animation: 'liveDot 1.5s ease-in-out infinite',
                  }} />
                  LIVE
                </span>
              </div>
            )}

            {/* ═══ SELLER: Camera Controls Overlay ═══ */}
            {isSeller && isLive && cameraActive && (
              <div style={{
                position: 'absolute',
                bottom: '16px', left: '16px', right: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px',
                zIndex: 30,
              }}>
                {/* Flip camera */}
                <button
                  onClick={handleFlipCamera}
                  title={ct.flipCamera}
                  style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 8V4a2 2 0 012-2h12a2 2 0 012 2v4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 12 12 8 8 12" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 12 12 16 8 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Mute/unmute */}
                <button
                  onClick={handleToggleMute}
                  title={isMuted ? ct.unmute : ct.mute}
                  style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    backgroundColor: isMuted ? 'rgba(232,52,78,0.6)' : 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: isMuted ? '1px solid rgba(232,52,78,0.5)' : '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isMuted ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* End stream */}
                <button
                  onClick={() => setShowEndConfirm(true)}
                  style={{
                    height: '48px',
                    padding: '0 24px',
                    borderRadius: '100px',
                    background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(232,52,78,0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                    {ct.endStream}
                  </span>
                </button>
              </div>
            )}

            {/* ═══ End Stream Confirmation Modal ═══ */}
            {showEndConfirm && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '20px', zIndex: 100,
                padding: '24px',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(232,52,78,0.2), rgba(220,38,38,0.1))',
                  border: '1px solid rgba(232,52,78,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                </div>
                <p style={{
                  fontSize: '18px', fontWeight: 700, color: '#fff',
                  textAlign: 'center',
                }}>
                  {ct.endStreamConfirm}
                </p>
                <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    style={{
                      flex: 1, padding: '14px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.endStreamNo}
                  </button>
                  <button
                    onClick={handleEndStream}
                    style={{
                      flex: 1, padding: '14px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                      border: 'none',
                      color: '#fff', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(232,52,78,0.4)',
                    }}
                  >
                    {ct.endStreamYes}
                  </button>
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

          {/* Enchere active */}
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

      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes viewerGlow {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
        @keyframes waveBar {
          0% { height: 6px; }
          100% { height: 30px; }
        }
      `}</style>
    </div>
  )
}

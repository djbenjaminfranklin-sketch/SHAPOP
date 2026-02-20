import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { useLiveKitBroadcast } from '../hooks/useLiveKitBroadcast'
import { apiFetch } from '../lib/api'
import type { Item, ChatMessage, Giveaway } from '../types/database'
import { getStreamQualityConstraints } from '../lib/settings'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    live: 'EN DIRECT',
    viewers: 'spectateurs',
    nextItem: 'Article suivant',
    sold: 'Vendu !',
    unsold: 'Invendu',
    noMoreItems: 'Plus d\'articles',
    lotSold: 'remporte par',
    endLive: 'Terminer',
    endConfirm: 'Terminer le live ?',
    endYes: 'Oui, terminer',
    endNo: 'Non, continuer',
    lot: 'Lot',
    startingAt: 'A partir de',
    currentPrice: 'Prix actuel',
    sendMessage: 'Message...',
    send: 'Envoyer',
    paymentAccepted: 'Paiement en attente',
    addressOk: 'Commande creee',
    waitingBids: 'En attente d\'encheres...',
    noBids: 'Aucune enchere',
    recap: 'Voir le recapitulatif',
    startAuction: 'Lancer l\'enchere',
    seconds: 'sec',
    liveEnded: 'Live termine',
    soldOf: 'vendus',
    articlesLabel: 'articles',
    anonymous: 'Anonyme',
    back: 'Retour',
    endAuction: 'Terminer l\'enchere',
    addItem: 'Ajouter un article',
    addItemTitle: 'Titre',
    addItemPrice: 'Prix de depart (€)',
    addItemAdd: 'Ajouter',
    addItemCancel: 'Annuler',
    messageFlagged: '[Message masque]',
    auctionLive: 'Enchere en cours',
    resolving: 'Resolution...',
    giftTitle: 'Cadeau Surprise',
    giftParticipants: 'participants',
    giftDraw: 'Tirer au sort',
    giftPrizePlaceholder: 'Decris le cadeau...',
    giftLaunch: 'Lancer le cadeau',
    giftActive: 'Cadeau en cours',
    giftCancel: 'Annuler',
    giftWinner: 'a gagne le cadeau !',
  },
  en: {
    live: 'LIVE',
    viewers: 'viewers',
    nextItem: 'Next item',
    sold: 'Sold!',
    unsold: 'Unsold',
    noMoreItems: 'No more items',
    lotSold: 'won by',
    endLive: 'End',
    endConfirm: 'End the live?',
    endYes: 'Yes, end it',
    endNo: 'No, continue',
    lot: 'Lot',
    startingAt: 'Starting at',
    currentPrice: 'Current price',
    sendMessage: 'Message...',
    send: 'Send',
    paymentAccepted: 'Payment pending',
    addressOk: 'Order created',
    waitingBids: 'Waiting for bids...',
    noBids: 'No bids',
    recap: 'View recap',
    startAuction: 'Start auction',
    seconds: 'sec',
    liveEnded: 'Live ended',
    soldOf: 'sold',
    articlesLabel: 'items',
    anonymous: 'Anonymous',
    back: 'Back',
    endAuction: 'End auction',
    addItem: 'Add item',
    addItemTitle: 'Title',
    addItemPrice: 'Starting price (€)',
    addItemAdd: 'Add',
    addItemCancel: 'Cancel',
    messageFlagged: '[Hidden message]',
    auctionLive: 'Auction live',
    resolving: 'Resolving...',
    giftTitle: 'Surprise Gift',
    giftParticipants: 'participants',
    giftDraw: 'Draw winner',
    giftPrizePlaceholder: 'Describe the gift...',
    giftLaunch: 'Launch gift',
    giftActive: 'Gift active',
    giftCancel: 'Cancel',
    giftWinner: 'won the gift!',
  },
  he: {
    live: 'שידור',
    viewers: 'צופים',
    nextItem: 'פריט הבא',
    sold: '!נמכר',
    unsold: 'לא נמכר',
    noMoreItems: 'אין עוד פריטים',
    lotSold: 'נמכר ל',
    endLive: 'סיים',
    endConfirm: '?לסיים את השידור',
    endYes: 'כן, סיים',
    endNo: 'לא, המשך',
    lot: 'לוט',
    startingAt: 'החל מ',
    currentPrice: 'מחיר נוכחי',
    sendMessage: '...הודעה',
    send: 'שלח',
    paymentAccepted: 'ממתין לתשלום',
    addressOk: 'הזמנה נוצרה',
    waitingBids: '...ממתין להצעות',
    noBids: 'אין הצעות',
    recap: 'צפה בסיכום',
    startAuction: 'התחל מכירה',
    seconds: 'שנ',
    liveEnded: 'השידור הסתיים',
    soldOf: 'נמכרו',
    articlesLabel: 'פריטים',
    anonymous: 'אנונימי',
    back: 'חזור',
    endAuction: 'סיים מכירה',
    addItem: 'הוסף פריט',
    addItemTitle: 'כותרת',
    addItemPrice: 'מחיר התחלתי (€)',
    addItemAdd: 'הוסף',
    addItemCancel: 'ביטול',
    messageFlagged: '[הודעה מוסתרת]',
    auctionLive: 'מכירה בעיצומה',
    resolving: '...פותר',
    giftTitle: 'מתנה הפתעה',
    giftParticipants: 'משתתפים',
    giftDraw: 'הגרלה',
    giftPrizePlaceholder: '...תאר את המתנה',
    giftLaunch: 'השקת מתנה',
    giftActive: 'מתנה פעילה',
    giftCancel: 'ביטול',
    giftWinner: 'זכה במתנה!',
  },
  es: {
    live: 'EN VIVO',
    viewers: 'espectadores',
    nextItem: 'Siguiente',
    sold: 'Vendido!',
    unsold: 'No vendido',
    noMoreItems: 'No hay mas',
    lotSold: 'ganado por',
    endLive: 'Terminar',
    endConfirm: 'Terminar el directo?',
    endYes: 'Si, terminar',
    endNo: 'No, continuar',
    lot: 'Lote',
    startingAt: 'Desde',
    currentPrice: 'Precio actual',
    sendMessage: 'Mensaje...',
    send: 'Enviar',
    paymentAccepted: 'Pago pendiente',
    addressOk: 'Pedido creado',
    waitingBids: 'Esperando pujas...',
    noBids: 'Sin pujas',
    recap: 'Ver resumen',
    startAuction: 'Iniciar subasta',
    seconds: 'seg',
    liveEnded: 'Directo terminado',
    soldOf: 'vendidos',
    articlesLabel: 'articulos',
    anonymous: 'Anonimo',
    back: 'Volver',
    endAuction: 'Terminar subasta',
    addItem: 'Agregar articulo',
    addItemTitle: 'Titulo',
    addItemPrice: 'Precio inicial (€)',
    addItemAdd: 'Agregar',
    addItemCancel: 'Cancelar',
    messageFlagged: '[Mensaje oculto]',
    auctionLive: 'Subasta en curso',
    resolving: 'Resolviendo...',
    giftTitle: 'Regalo Sorpresa',
    giftParticipants: 'participantes',
    giftDraw: 'Sortear',
    giftPrizePlaceholder: 'Describe el regalo...',
    giftLaunch: 'Lanzar regalo',
    giftActive: 'Regalo activo',
    giftCancel: 'Cancelar',
    giftWinner: 'gano el regalo!',
  },
}

// Utility to lock/unlock body scroll — must be called on enter and EVERY exit path
function lockBody() {
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.top = '0'
  document.body.style.left = '0'
}

function unlockBody() {
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
  document.body.style.top = ''
  document.body.style.left = ''
}

export default function LiveSellerView() {
  const { streamId } = useParams<{ streamId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<Item[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [messages, setMessages] = useState<(ChatMessage & { user_profile?: { display_name: string } })[]>([])
  const [visibleMsgIds, setVisibleMsgIds] = useState<Set<string>>(new Set())
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number; startTime: number }[]>([])
  const reactionIdRef = useRef(0)
  const [newMessage, setNewMessage] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(-1) // -1 = not started, 0 = finished, >0 = counting
  const [viewerCount, setViewerCount] = useState(0)
  const [liveEnded, setLiveEnded] = useState(false)
  const autoResolvedRef = useRef<string | null>(null) // tracks item ID already auto-resolved
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const itemsRef = useRef<Item[]>(items)
  const currentIndexRef = useRef(currentIndex)
  const handleEndLiveRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [soldOverlay, setSoldOverlay] = useState<{
    lotNumber: string
    winnerName: string
    price: number
    isUnsold?: boolean
  } | null>(null)

  // Add item during live
  const [showAddItem, setShowAddItem] = useState(false)
  const [addItemTitle, setAddItemTitle] = useState('')
  const [addItemPrice, setAddItemPrice] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Giveaway
  const [showGiveawayForm, setShowGiveawayForm] = useState(false)
  const [giveawayPrize, setGiveawayPrize] = useState('')
  const [activeGiveaway, setActiveGiveaway] = useState<Giveaway | null>(null)
  const [giveawayDrawing, setGiveawayDrawing] = useState(false)
  const [giveawayWinner, setGiveawayWinner] = useState<{ name: string } | null>(null)

  // Return policy
  const [returnPolicy, setReturnPolicy] = useState<string>('no_return')

  // LiveKit broadcast
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined)
  const [livekitUrl, setLivekitUrl] = useState<string | undefined>(undefined)
  const [livekitToken, setLivekitToken] = useState<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token)
    })
  }, [])

  // Fetch LiveKit token once we have the session token
  useEffect(() => {
    if (!sessionToken || !streamId) return
    apiFetch(`/api/streams/${streamId}/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.token && data.url) {
          setLivekitToken(data.token)
          setLivekitUrl(data.url)
        }
      })
      .catch(err => console.error('Failed to fetch LiveKit token:', err))
  }, [sessionToken, streamId])

  // Fetch seller's return policy
  useEffect(() => {
    if (!user) return
    supabase.from('sellers').select('return_policy').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.return_policy) setReturnPolicy(data.return_policy)
      })
  }, [user])

  const { isConnected: lkConnected, isBroadcasting, startBroadcast, stopBroadcast } = useLiveKitBroadcast({
    livekitUrl,
    livekitToken,
  })

  // Start broadcast once LiveKit token is ready
  const broadcastStartedRef = useRef(false)
  useEffect(() => {
    if (livekitUrl && livekitToken && !broadcastStartedRef.current) {
      broadcastStartedRef.current = true
      startBroadcast()
    }
  }, [livekitUrl, livekitToken, startBroadcast])

  // Mark stream as 'live' when broadcasting starts (fallback if webhook doesn't fire)
  const markedLiveRef = useRef(false)
  useEffect(() => {
    if (!isBroadcasting || !streamId || !sessionToken || markedLiveRef.current) return
    markedLiveRef.current = true
    supabase
      .from('streams')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', streamId)
      .then(({ error }) => {
        if (error) {
          // Fallback via API
          apiFetch(`/api/streams/${streamId}/mark-live`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          }).catch(() => {})
        }
      })
  }, [isBroadcasting, streamId, sessionToken])

  const currentItem = currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null
  const formatLot = (n: number) => `#${String(n).padStart(3, '0')}`

  const showSoldOverlay = useCallback((lotNumber: string, winnerName: string, price: number, isUnsold = false) => {
    setSoldOverlay({ lotNumber, winnerName, price, isUnsold })
    setTimeout(() => setSoldOverlay(null), 3500)
  }, [])

  const showToast = useCallback((text: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, text }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  // Keep refs in sync for use inside setTimeout callbacks (avoids stale closures)
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  // Prevent scrolling/bouncing on the live view
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      // Allow scrolling inside chat only
      const target = e.target as HTMLElement
      if (target.closest('[data-scrollable]')) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    lockBody()

    return () => {
      document.removeEventListener('touchmove', prevent)
      unlockBody()
    }
  }, [])

  // Start camera
  useEffect(() => {
    let cancelled = false
    const startCamera = async () => {
      // Stop all tracks on the old stream before starting a new one
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
      try {
        const qualityConstraints = getStreamQualityConstraints()
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: qualityConstraints.width }, height: { ideal: qualityConstraints.height } },
          audio: true,
        })
        if (cancelled) {
          mediaStream.getTracks().forEach(t => t.stop())
          return
        }
        mediaStreamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch {
        // Camera access failed
      }
    }
    startCamera()
    return () => {
      cancelled = true
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [facingMode])

  // Fetch real viewer count from stream record
  useEffect(() => {
    if (!streamId) return

    const fetchViewerCount = async () => {
      const { data } = await supabase
        .from('streams')
        .select('viewer_count')
        .eq('id', streamId)
        .single()
      if (data) setViewerCount(data.viewer_count || 0)
    }
    fetchViewerCount()

    const channel = supabase
      .channel(`seller-viewers-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'streams',
        filter: `id=eq.${streamId}`,
      }, (payload) => {
        const updated = payload.new as { viewer_count?: number }
        if (updated.viewer_count !== undefined) setViewerCount(updated.viewer_count)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  // Fetch items & messages
  useEffect(() => {
    if (!streamId) return

    const fetchItems = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
      if (data && data.length > 0) {
        setItems(data)
        const firstActiveIdx = data.findIndex((it: Item) => it.status === 'draft' || it.status === 'active')
        setCurrentIndex(firstActiveIdx >= 0 ? firstActiveIdx : 0)
      }
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('stream_id', streamId)
        .neq('type', 'reaction')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data)
    }

    fetchItems()
    fetchMessages()
  }, [streamId])

  // Real-time subscriptions
  useEffect(() => {
    if (!streamId) return

    const channel = supabase.channel(`seller-live-${streamId}`)

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `stream_id=eq.${streamId}`,
    }, async (payload) => {
      const newMsg = payload.new as ChatMessage
      // Handle reactions: show floating emoji, don't add to chat
      if (newMsg.type === 'reaction') {
        const id = ++reactionIdRef.current
        const x = 10 + Math.random() * 80
        setFloatingReactions(prev => [...prev, { id, emoji: newMsg.message, x, startTime: Date.now() }])
        return
      }
      const { data: enriched } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('id', payload.new.id)
        .single()
      if (enriched) setMessages(prev => [...prev, enriched])
    })

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'items',
      filter: `stream_id=eq.${streamId}`,
    }, (payload) => {
      const updated = payload.new as Item
      setItems(prev => prev.map(it => it.id === updated.id ? updated : it))
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  // Giveaway realtime: listen for new entries to update counter
  useEffect(() => {
    if (!activeGiveaway || activeGiveaway.status !== 'active') return

    const channel = supabase
      .channel(`giveaway-entries-${activeGiveaway.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'giveaway_entries',
        filter: `giveaway_id=eq.${activeGiveaway.id}`,
      }, () => {
        setActiveGiveaway(prev => prev ? { ...prev, entry_count: prev.entry_count + 1 } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeGiveaway?.id, activeGiveaway?.status])

  // Fetch active giveaway on mount
  useEffect(() => {
    if (!streamId) return
    const fetchGiveaway = async () => {
      try {
        const resp = await apiFetch(`/api/streams/${streamId}/giveaway`)
        const data = await resp.json()
        if (data && data.status === 'active') setActiveGiveaway(data)
      } catch { /* ignore */ }
    }
    fetchGiveaway()
  }, [streamId])

  const handleLaunchGiveaway = async () => {
    if (!giveawayPrize.trim() || !streamId) return
    if (!sessionToken) {
      showToast('Erreur: session expirée')
      return
    }
    try {
      const resp = await apiFetch(`/api/streams/${streamId}/giveaway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ prize_description: giveawayPrize.trim() }),
      })
      if (resp.ok) {
        const gw = await resp.json()
        setActiveGiveaway(gw)
        setShowGiveawayForm(false)
        setGiveawayPrize('')
        showToast('Cadeau lancé !')
      } else {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Giveaway launch error:', resp.status, err)
        showToast(err.error || 'Erreur lors du lancement')
      }
    } catch (err) {
      console.error('Failed to launch giveaway:', err)
      showToast('Erreur réseau')
    }
  }

  const handleDrawWinner = async () => {
    if (!activeGiveaway) return
    if (!sessionToken) {
      showToast('Erreur: session expirée')
      return
    }
    setGiveawayDrawing(true)
    try {
      const resp = await apiFetch(`/api/giveaways/${activeGiveaway.id}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })
      if (resp.ok) {
        const drawn = await resp.json()
        setActiveGiveaway(drawn)
        if (drawn.winner_name) {
          setGiveawayWinner({ name: drawn.winner_name })
          setTimeout(() => {
            setGiveawayWinner(null)
            setActiveGiveaway(null)
          }, 5000)
        }
      } else {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Draw error:', resp.status, err)
        showToast(err.error || 'Erreur lors du tirage')
      }
    } catch (err) {
      console.error('Failed to draw winner:', err)
      showToast('Erreur réseau')
    }
    setGiveawayDrawing(false)
  }

  const handleCancelGiveaway = async () => {
    if (!activeGiveaway || !sessionToken) return
    try {
      await supabase
        .from('giveaways')
        .update({ status: 'cancelled' })
        .eq('id', activeGiveaway.id)
      setActiveGiveaway(null)
    } catch { /* ignore */ }
  }

  // Cleanup old floating reactions
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      setFloatingReactions(prev => prev.filter(r => now - r.startTime < 2200))
    }, 500)
    return () => clearInterval(timer)
  }, [])

  // Simple local countdown: decrement every second
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timeLeft > 0]) // only re-run when transitioning between counting/not-counting

  // Auto-resolve when timer reaches 0: sell to highest bidder or mark unsold, then advance
  useEffect(() => {
    if (
      !currentItem ||
      currentItem.status !== 'active' ||
      timeLeft !== 0 ||
      autoResolvedRef.current === currentItem.id ||
      !user ||
      !streamId
    ) return

    // Mark this item as auto-resolved to prevent double-trigger
    autoResolvedRef.current = currentItem.id

    const autoResolve = async () => {
      // Use server API to resolve auction (bypasses RLS for reading bids + updating item)
      if (!sessionToken) return

      try {
        const resp = await apiFetch(`/api/items/${currentItem.id}/end-auction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        })

        const result = await resp.json().catch(() => ({}))

        if (result.status === 'sold' && result.winner_id) {
          const winnerId = result.winner_id
          const finalPrice = result.final_price || currentItem.current_price

          // Fetch winner name
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', winnerId)
            .single()

          const winnerName = winnerProfile?.display_name || winnerProfile?.username || winnerId.slice(0, 8).toUpperCase()
          showSoldOverlay(formatLot(currentIndex + 1), `@${winnerName}`, finalPrice)
          showToast(`${ct.paymentAccepted} — ${ct.addressOk}`)

          setItems(prev => prev.map((it, i) =>
            i === currentIndex ? { ...it, status: 'sold' as const, winner_id: winnerId, current_price: finalPrice } : it
          ))
        } else {
          // No bids or unsold
          showSoldOverlay(formatLot(currentIndex + 1), '', 0, true)

          setItems(prev => prev.map((it, i) =>
            i === currentIndex ? { ...it, status: 'unsold' as const } : it
          ))
        }
      } catch (err) {
        console.error('Auto-resolve error:', err)
        // Fallback: mark unsold locally
        showSoldOverlay(formatLot(currentIndex + 1), '', 0, true)
        setItems(prev => prev.map((it, i) =>
          i === currentIndex ? { ...it, status: 'unsold' as const } : it
        ))
      }

      // Auto-advance after delay to let overlay show, or end live
      // Read from refs to avoid stale closures (items/currentIndex may have changed by the time this fires)
      setTimeout(() => {
        const latestItems = itemsRef.current
        const latestIndex = currentIndexRef.current
        const nextIdx = latestItems.findIndex((it, i) => i > latestIndex && (it.status === 'draft' || it.status === 'pending'))
        if (nextIdx >= 0) {
          setCurrentIndex(nextIdx)
        } else {
          handleEndLiveRef.current()
        }
      }, 2500)
    }

    autoResolve()
  }, [timeLeft, currentItem?.id, currentItem?.status, user, streamId, showSoldOverlay, showToast, ct.paymentAccepted, ct.addressOk])

  // When new messages arrive, mark them visible then auto-hide after 5s
  useEffect(() => {
    if (messages.length === 0) return
    const latest = messages[messages.length - 1]
    if (!latest?.id) return
    setVisibleMsgIds(prev => {
      const next = new Set(prev)
      next.add(latest.id)
      return next
    })
    const timerId = setTimeout(() => {
      setVisibleMsgIds(prev => {
        const next = new Set(prev)
        next.delete(latest.id)
        return next
      })
    }, 3000)
    return () => clearTimeout(timerId)
  }, [messages.length])

  // Reset auto-resolve ref when moving to a different item
  useEffect(() => {
    autoResolvedRef.current = null
  }, [currentIndex])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleActivateItem = async () => {
    if (!currentItem || !streamId) return
    const now = new Date().toISOString()
    const duration = currentItem.duration_seconds || 60

    // Update DB FIRST to ensure realtime reaches viewers
    const { error: dbError } = await supabase
      .from('items')
      .update({
        status: 'active' as const,
        started_at: now,
      })
      .eq('id', currentItem.id)

    if (dbError) {
      console.error('Failed to activate item in DB:', dbError)
      // Fallback: try via API server (bypasses RLS)
      if (sessionToken) {
        try {
          await apiFetch(`/api/items/${currentItem.id}/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            },
          })
        } catch (err) {
          console.error('API activate fallback also failed:', err)
        }
      }
    }

    // Start the local countdown
    setTimeLeft(duration)

    // Update local state
    setItems(prev => prev.map((it, i) =>
      i === currentIndex ? { ...it, status: 'active' as const, started_at: now } : it
    ))
  }

  // handleSold and handleUnsold removed — auction resolves automatically

  const handleNextItem = () => {
    const nextIdx = items.findIndex((it, i) => i > currentIndex && (it.status === 'draft' || it.status === 'pending'))
    if (nextIdx >= 0) setCurrentIndex(nextIdx)
  }

  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)

    // Stop LiveKit broadcast and restart with new camera
    stopBroadcast()

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
    }
    try {
      const qualityConstraints = getStreamQualityConstraints()
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: qualityConstraints.width }, height: { ideal: qualityConstraints.height } },
        audio: true,
      })
      mediaStreamRef.current = ms
      if (videoRef.current) videoRef.current.srcObject = ms

      // Restart LiveKit broadcast after a small delay
      broadcastStartedRef.current = false
      setTimeout(() => startBroadcast(), 500)
    } catch {
      // Camera flip failed
    }
  }

  const handleEndLive = async () => {
    // Stop LiveKit broadcast
    stopBroadcast()

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    if (streamId && sessionToken) {
      // End LiveKit stream via API
      try {
        await apiFetch(`/api/streams/${streamId}/end-livekit-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        })
      } catch {
        // Fallback: update status directly
        await supabase
          .from('streams')
          .update({
            status: 'ended' as const,
            ended_at: new Date().toISOString(),
          })
          .eq('id', streamId)
      }
    } else if (streamId) {
      await supabase
        .from('streams')
        .update({
          status: 'ended' as const,
          ended_at: new Date().toISOString(),
        })
        .eq('id', streamId)
    }

    // Unlock body BEFORE showing the ended screen
    unlockBody()
    setShowEndConfirm(false)
    setLiveEnded(true)
  }
  handleEndLiveRef.current = handleEndLive

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !streamId) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      await apiFetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ stream_id: streamId, message: newMessage.trim() }),
      })
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send chat message:', err)
    }
  }

  const handleEndAuctionEarly = () => {
    if (!currentItem || currentItem.status !== 'active') return
    // Setting timeLeft to 0 triggers the existing autoResolve useEffect
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setTimeLeft(0)
  }

  const handleAddItemDuringLive = async () => {
    if (!addItemTitle.trim() || !addItemPrice || !user || !streamId) return
    const price = parseFloat(addItemPrice)
    if (isNaN(price) || price <= 0) return

    setAddingItem(true)
    const { data, error } = await supabase
      .from('items')
      .insert({
        seller_id: user.id,
        stream_id: streamId,
        title: addItemTitle.trim(),
        category: 'other',
        starting_price: price,
        current_price: price,
        status: 'draft' as const,
        duration_seconds: 60,
      })
      .select()
      .single()

    if (!error && data) {
      setItems(prev => [...prev, data])
      setAddItemTitle('')
      setAddItemPrice('')
      setShowAddItem(false)
      showToast(ct.addItem + ' ✓')
    }
    setAddingItem(false)
  }

  const hasMoreItems = items.some((it, i) => i > currentIndex && (it.status === 'draft' || it.status === 'pending'))

  // Format timer
  // Post-live screen
  if (liveEnded) {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '24px', padding: '32px',
        overflow: 'hidden', width: '100vw', height: '100vh',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
          border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', textAlign: 'center' }}>
          {ct.liveEnded}
        </h2>
        <p style={{ fontSize: '15px', color: '#888', textAlign: 'center' }}>
          {items.filter(it => it.status === 'sold').length} {ct.soldOf} / {items.length} {ct.articlesLabel}
        </p>
        <button
          onClick={() => { unlockBody(); navigate(`/live-recap/${streamId}`) }}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            borderRadius: '14px', border: 'none',
            color: '#fff', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {ct.recap}
        </button>
        <button
          onClick={() => { unlockBody(); navigate('/') }}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            backgroundColor: 'transparent',
            borderRadius: '14px', border: '1px solid #333',
            color: '#888', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.back}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        backgroundColor: '#000', zIndex: 200,
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Floating emoji reactions from viewers */}
      {floatingReactions.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          left: 0,
          right: 0,
          height: '250px',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'visible',
        }}>
          {floatingReactions.map(r => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                bottom: '0',
                left: `${r.x}%`,
                fontSize: '32px',
                animation: 'floatUpReaction 2s ease-out forwards',
                pointerEvents: 'none',
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Full-screen video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '260px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6) 50%, transparent)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 44px) + 8px)',
        left: '8px', right: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 20,
      }}>
        {/* Left: LIVE dot + viewer count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '100px',
          padding: '4px 10px 4px 8px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: lkConnected ? '#E8344E' : '#888',
            marginRight: '6px',
            animation: lkConnected ? 'liveDot 1.5s ease-in-out infinite' : 'none',
            boxShadow: lkConnected ? '0 0 6px rgba(232,52,78,0.6)' : 'none',
          }} />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ marginRight: '3px' }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{viewerCount}</span>
        </div>

        {/* Right: camera + gift + end */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={handleFlipCamera}
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4M4 8V4a2 2 0 012-2h12a2 2 0 012 2v4"/>
              <polyline points="16 12 12 8 8 12"/>
              <polyline points="16 12 12 16 8 12"/>
            </svg>
          </button>
          <button
            onClick={() => setShowGiveawayForm(true)}
            style={{
              height: '34px', padding: '0 10px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              border: 'none',
              display: 'flex', alignItems: 'center', gap: '4px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🎁</span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#000' }}>
              {activeGiveaway && activeGiveaway.status === 'active'
                ? activeGiveaway.entry_count
                : ct.giftTitle.split(' ')[0]}
            </span>
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              height: '34px', padding: '0 10px',
              borderRadius: '100px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(232,52,78,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#E8344E">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Return policy badge — removed from live view to reduce clutter */}
      {(() => {
        void returnPolicy
        return null
      })()}

      {/* Toasts */}
      <div style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top, 44px) + 76px)',
        left: '12px', right: '12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        zIndex: 30, pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '10px',
              animation: 'toastIn 0.3s ease',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#22C55E', margin: 0 }}>
              {toast.text}
            </p>
          </div>
        ))}
      </div>

      {/* ===== BOTTOM OVERLAY: chat + item + button ===== */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 34px) + 16px)',
        left: '10px', right: '10px',
        zIndex: 15,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {/* Chat messages — max 4, transparent WhatNot style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '70%' }}>
          {messages.filter(m => visibleMsgIds.has(m.id)).slice(-4).map((msg, i, arr) => {
            const opacity = i < arr.length - 2 ? 0.5 : i < arr.length - 1 ? 0.75 : 1
            return (
              <div key={msg.id} style={{
                padding: '2px 0',
                opacity,
                animation: 'chatMsgIn 0.3s ease',
              }}>
                <span style={{
                  fontSize: '12px', fontWeight: 800, color: '#F0908A',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  marginRight: '5px',
                }}>
                  {msg.user_profile?.display_name || ct.anonymous || '?'}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 500,
                  color: msg.is_flagged ? 'rgba(255,255,255,0.4)' : '#fff',
                  fontStyle: msg.is_flagged ? 'italic' : 'normal',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  wordBreak: 'break-word',
                }}>
                  {msg.is_flagged ? ct.messageFlagged : msg.message}
                </span>
              </div>
            )
          })}
        </div>

        {/* Chat input */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={ct.sendMessage}
            style={{
              flex: 1, padding: '6px 10px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '100px',
              color: '#fff', fontSize: '11px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '6px 10px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              border: 'none', color: '#fff',
              fontSize: '10px', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {ct.send}
          </button>
        </div>

        {/* Item + controls panel with solid background */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '8px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Item info row */}
          {currentItem && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                backgroundColor: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {currentItem.image_urls?.[0] ? (
                  <img src={currentItem.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#F0908A' }}>
                    {formatLot(currentIndex + 1)}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#F0908A' }}>
                  {ct.lot} {formatLot(currentIndex + 1)}
                </span>
                <p style={{
                  fontSize: '12px', fontWeight: 600, color: '#fff', margin: '1px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {currentItem.title}
                </p>
              </div>

              {/* Timer */}
              {currentItem.status === 'active' && timeLeft > 0 ? (
                <div style={{
                  flexShrink: 0,
                  backgroundColor: timeLeft <= 10 ? 'rgba(232,52,78,0.4)' : 'rgba(240,144,138,0.25)',
                  border: timeLeft <= 10 ? '2px solid #E8344E' : '1px solid #F0908A',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  textAlign: 'center',
                  animation: timeLeft <= 10 ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
                }}>
                  <div style={{
                    fontSize: '18px', fontWeight: 900,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                    {timeLeft}
                  </div>
                  <div style={{ fontSize: '8px', color: timeLeft <= 10 ? '#ff8888' : '#ccc', fontWeight: 700 }}>
                    {ct.seconds}
                  </div>
                </div>
              ) : currentItem.status === 'draft' ? (
                <div style={{
                  flexShrink: 0,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {currentItem.duration_seconds || 60}
                  </div>
                  <div style={{ fontSize: '8px', color: '#aaa', fontWeight: 600 }}>
                    {ct.seconds}
                  </div>
                </div>
              ) : null}

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{
                  fontSize: '16px', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1,
                }}>
                  {currentItem.current_price} <span style={{ color: '#F0908A' }}>€</span>
                </p>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS — compact row */}
          {currentItem?.status === 'draft' && (
            <button
              onClick={handleActivateItem}
              style={{
                width: '100%', padding: '10px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                borderRadius: '10px', border: 'none',
                color: '#fff', fontSize: '14px', fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ▶ {ct.startAuction}
            </button>
          )}

          {currentItem?.status === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                flex: 1, padding: '6px 10px', borderRadius: '8px',
                backgroundColor: 'rgba(240,144,138,0.1)',
                border: '1px solid rgba(240,144,138,0.15)',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '11px', color: '#F0908A', fontWeight: 600 }}>
                  {timeLeft > 0 ? ct.auctionLive : ct.resolving}
                </span>
                {currentItem.min_price != null && currentItem.min_price > 0 && (
                  <span style={{ fontSize: '9px', color: '#666', marginLeft: '6px' }}>
                    min: {currentItem.min_price}€
                  </span>
                )}
              </div>
              {timeLeft > 0 && (
                <button
                  onClick={handleEndAuctionEarly}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#aaa', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {ct.endAuction}
                </button>
              )}
            </div>
          )}

          {(currentItem?.status === 'sold' || currentItem?.status === 'unsold') && hasMoreItems && (
            <button
              onClick={handleNextItem}
              style={{
                width: '100%', padding: '10px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                borderRadius: '10px', border: 'none',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.nextItem}
            </button>
          )}

          {(currentItem?.status === 'sold' || currentItem?.status === 'unsold') && !hasMoreItems && (
            <p style={{
              padding: '4px', textAlign: 'center',
              fontSize: '11px', color: '#888', margin: 0,
            }}>
              {ct.noMoreItems}
            </p>
          )}

          {/* Add item button — compact */}
          {!showAddItem && (
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                width: '100%', padding: '7px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#666', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
              </svg>
              {ct.addItem}
            </button>
          )}

          {/* Add item quick form */}
          {showAddItem && (
            <div style={{
              padding: '8px', borderRadius: '10px',
              backgroundColor: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <input
                type="text"
                value={addItemTitle}
                onChange={e => setAddItemTitle(e.target.value)}
                placeholder={ct.addItemTitle}
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: '12px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="number"
                inputMode="decimal"
                value={addItemPrice}
                onChange={e => setAddItemPrice(e.target.value)}
                placeholder={ct.addItemPrice}
                min="0"
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: '12px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { setShowAddItem(false); setAddItemTitle(''); setAddItemPrice('') }}
                  style={{
                    flex: 1, padding: '8px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#888', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {ct.addItemCancel}
                </button>
                <button
                  onClick={handleAddItemDuringLive}
                  disabled={addingItem || !addItemTitle.trim() || !addItemPrice}
                  style={{
                    flex: 1, padding: '8px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer',
                    opacity: addingItem || !addItemTitle.trim() || !addItemPrice ? 0.5 : 1,
                  }}
                >
                  {ct.addItemAdd}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Giveaway form/panel overlay */}
      {showGiveawayForm && (
        <div
          onClick={() => setShowGiveawayForm(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 280, padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '360px',
              backgroundColor: '#111',
              borderRadius: '18px',
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              border: '1px solid rgba(255,215,0,0.2)',
              marginBottom: 'env(safe-area-inset-bottom, 34px)',
              animation: 'slideUpGift 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🎁</span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#FFD700' }}>
                {ct.giftTitle}
              </span>
            </div>

            {!activeGiveaway ? (
              <>
                <input
                  type="text"
                  value={giveawayPrize}
                  onChange={e => setGiveawayPrize(e.target.value)}
                  placeholder={ct.giftPrizePlaceholder}
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: '12px',
                    color: '#fff', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setShowGiveawayForm(false); setGiveawayPrize('') }}
                    style={{
                      flex: 1, padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#888', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.giftCancel}
                  </button>
                  <button
                    onClick={handleLaunchGiveaway}
                    disabled={!giveawayPrize.trim()}
                    style={{
                      flex: 1, padding: '12px',
                      background: !giveawayPrize.trim()
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none',
                      borderRadius: '12px',
                      color: !giveawayPrize.trim() ? '#666' : '#000',
                      fontSize: '14px', fontWeight: 800,
                      cursor: !giveawayPrize.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ct.giftLaunch}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{
                  fontSize: '14px', color: '#ccc', margin: 0,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '10px 12px', borderRadius: '10px',
                }}>
                  {activeGiveaway.prize_description}
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '8px 0',
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: '#fff' }}>
                    {activeGiveaway.entry_count}
                  </span>
                  <span style={{ fontSize: '14px', color: '#888' }}>
                    {ct.giftParticipants}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { handleCancelGiveaway(); setShowGiveawayForm(false) }}
                    style={{
                      flex: 1, padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#888', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.giftCancel}
                  </button>
                  <button
                    onClick={() => { handleDrawWinner(); setShowGiveawayForm(false) }}
                    disabled={giveawayDrawing || activeGiveaway.entry_count === 0}
                    style={{
                      flex: 1, padding: '12px',
                      background: activeGiveaway.entry_count === 0
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none',
                      borderRadius: '12px',
                      color: activeGiveaway.entry_count === 0 ? '#666' : '#000',
                      fontSize: '14px', fontWeight: 800,
                      cursor: activeGiveaway.entry_count === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {giveawayDrawing ? '...' : ct.giftDraw}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Giveaway winner overlay */}
      {giveawayWinner && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 260, pointerEvents: 'none',
          animation: 'soldOverlayIn 0.4s ease',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            animation: 'soldBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            <div style={{ fontSize: '48px', animation: 'giftSpin 1s ease-out' }}>🎁</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '14px', color: 'rgba(255,215,0,0.6)',
            }}>
              ✦ ✦ ✦
            </div>
            <p style={{
              fontSize: '28px', fontWeight: 900, color: '#FFD700',
              textShadow: '0 2px 20px rgba(255,215,0,0.5)',
              margin: 0, textAlign: 'center',
            }}>
              {giveawayWinner.name}
            </p>
            <p style={{
              fontSize: '16px', fontWeight: 600, color: '#fff',
              opacity: 0.8, margin: 0,
            }}>
              {ct.giftWinner}
            </p>
            <div style={{
              display: 'flex', gap: '4px',
              fontSize: '20px',
              animation: 'giftStars 1.5s ease-in-out infinite',
            }}>
              ⭐ ✨ 🌟 ✨ ⭐
            </div>
          </div>
        </div>
      )}

      {/* End confirm modal */}
      {showEndConfirm && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', zIndex: 300,
            padding: '24px',
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(232,52,78,0.2), rgba(220,38,38,0.1))',
            border: '1px solid rgba(232,52,78,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>
            {ct.endConfirm}
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
            <button
              onClick={() => setShowEndConfirm(false)}
              style={{
                flex: 1, padding: '14px', borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.endNo}
            </button>
            <button
              onClick={handleEndLive}
              style={{
                flex: 1, padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                border: 'none',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.endYes}
            </button>
          </div>
        </div>
      )}

      {/* SOLD / UNSOLD overlay */}
      {soldOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 250, pointerEvents: 'none',
          animation: 'soldOverlayIn 0.4s ease',
        }}>
          {/* Dark backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: soldOverlay.isUnsold
              ? 'rgba(0,0,0,0.7)'
              : 'rgba(0,0,0,0.75)',
          }} />

          {/* Content */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '12px',
            animation: 'soldBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            {/* Icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: soldOverlay.isUnsold
                ? 'linear-gradient(135deg, rgba(255,150,50,0.25), rgba(255,150,50,0.1))'
                : 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))',
              border: soldOverlay.isUnsold
                ? '2px solid rgba(255,150,50,0.4)'
                : '2px solid rgba(34,197,94,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: soldOverlay.isUnsold
                ? '0 0 40px rgba(255,150,50,0.3)'
                : '0 0 40px rgba(34,197,94,0.3)',
            }}>
              {soldOverlay.isUnsold ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF9632" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* Status text */}
            <p style={{
              fontSize: '32px', fontWeight: 900,
              color: soldOverlay.isUnsold ? '#FF9632' : '#22C55E',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textShadow: soldOverlay.isUnsold
                ? '0 2px 20px rgba(255,150,50,0.5)'
                : '0 2px 20px rgba(34,197,94,0.5)',
              margin: 0,
            }}>
              {soldOverlay.isUnsold ? ct.unsold : ct.sold}
            </p>

            {/* Lot number */}
            <p style={{
              fontSize: '16px', fontWeight: 700, color: '#fff',
              opacity: 0.8, margin: 0,
            }}>
              {ct.lot} {soldOverlay.lotNumber}
            </p>

            {/* Winner name */}
            {!soldOverlay.isUnsold && soldOverlay.winnerName && (
              <div style={{
                backgroundColor: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '12px',
                padding: '10px 24px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#22C55E' }}>
                  {soldOverlay.winnerName}
                </span>
              </div>
            )}

            {/* Price */}
            {!soldOverlay.isUnsold && soldOverlay.price > 0 && (
              <p style={{
                fontSize: '28px', fontWeight: 900, color: '#fff',
                margin: 0,
                textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}>
                {soldOverlay.price} €
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes toastIn {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes soldOverlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes soldBounce {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes chatMsgIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpGift {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes giftSpin {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes giftStars {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes floatUpReaction {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-120px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-250px) scale(0.8); }
        }
      `}</style>
    </div>
  )
}

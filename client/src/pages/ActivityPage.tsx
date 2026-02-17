import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Order, Item } from '../types/database'

type MainTab = 'purchases' | 'sales' | 'following' | 'messages' | 'favorites'
type SubFilter = 'all' | 'active' | 'completed' | 'refunds'
type ProofLevel = 'basic' | 'standard' | 'enhanced'

// Helper function to calculate remaining time before claim deadline
function formatTimeRemaining(deadline: string): string {
  const remaining = new Date(deadline).getTime() - Date.now()
  if (remaining <= 0) return 'Expire'
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}min restantes`
}

interface PurchaseOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls' | 'category'>
}

interface SaleOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls' | 'category'>
  buyer_profile?: { display_name: string; username: string }
}

export default function ActivityPage() {
  const { user, profile } = useAuth()
  const lang = getLang()
  const location = useLocation()
  const navigate = useNavigate()
  const initialTab = (location.state as { tab?: MainTab })?.tab || 'purchases'

  const [mainTab, setMainTab] = useState<MainTab>(initialTab)
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [mounted, setMounted] = useState(false)

  // Data states
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [followedSellers, setFollowedSellers] = useState<any[]>([])
  const [loadingFollowing, setLoadingFollowing] = useState(false)
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [loadingSales, setLoadingSales] = useState(false)
  const [errorPurchases, setErrorPurchases] = useState<string | null>(null)
  const [errorSales, setErrorSales] = useState<string | null>(null)

  // Shipping modal states (seller)
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
  const [, setSelectedFile] = useState<File | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [uploading, setUploading] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  void fileInputRef // kept for future use

  // Multi-proof upload states (seller)
  const [, setProofLevel] = useState<ProofLevel>('basic')
  const [proofFiles, setProofFiles] = useState<{ type: string; file: File | null }[]>([{ type: 'photo_package', file: null }])
  const [loadingProofLevel, setLoadingProofLevel] = useState(false)
  const proofFileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Proof viewer modal (buyer)
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null)

  // Confirm delivery loading
  const [confirmingDelivery, setConfirmingDelivery] = useState<string | null>(null)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  // Fetch seller proof level when opening shipping modal
  const fetchProofLevel = useCallback(async () => {
    if (!user) return
    setLoadingProofLevel(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch(`/api/sellers/${user.id}/trust`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const level: ProofLevel = data.proof_level || 'basic'
        setProofLevel(level)
        // Initialize proof file slots based on level
        if (level === 'basic') {
          setProofFiles([{ type: 'photo_package', file: null }])
        } else if (level === 'standard') {
          setProofFiles([
            { type: 'photo_package', file: null },
            { type: 'photo_content', file: null },
          ])
        } else if (level === 'enhanced') {
          setProofFiles([
            { type: 'photo_package', file: null },
            { type: 'photo_content', file: null },
            { type: 'video_packing', file: null },
          ])
        }
      }
    } catch (err) {
      console.error('Failed to fetch proof level:', err)
    } finally {
      setLoadingProofLevel(false)
    }
  }, [user])

  // Fetch purchases (orders where user is buyer)
  const fetchPurchases = useCallback(async () => {
    if (!user) return
    setLoadingPurchases(true)
    setErrorPurchases(null)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls, category)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases((data as PurchaseOrder[]) || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorPurchases(message)
    } finally {
      setLoadingPurchases(false)
    }
  }, [user])

  // Fetch sales (orders where user is seller)
  const fetchSales = useCallback(async () => {
    if (!user || !profile?.is_seller) return
    setLoadingSales(true)
    setErrorSales(null)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls, category), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales((data as SaleOrder[]) || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorSales(message)
    } finally {
      setLoadingSales(false)
    }
  }, [user, profile?.is_seller])

  // Fetch followed sellers
  const fetchFollowing = useCallback(async () => {
    if (!user) return
    setLoadingFollowing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/following', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFollowedSellers(data)
      }
    } catch (err) {
      console.error('Failed to fetch following:', err)
    } finally {
      setLoadingFollowing(false)
    }
  }, [user])

  // Unfollow a seller
  const handleUnfollow = async (sellerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await apiFetch(`/api/follow/${sellerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setFollowedSellers(prev => prev.filter(s => s.id !== sellerId))
    } catch (err) {
      console.error('Unfollow error:', err)
    }
  }

  // Fetch data on mount and when tab changes
  useEffect(() => {
    if (mainTab === 'purchases') {
      fetchPurchases()
    } else if (mainTab === 'sales') {
      fetchSales()
    } else if (mainTab === 'following') {
      fetchFollowing()
    }
  }, [mainTab, fetchPurchases, fetchSales, fetchFollowing])

  // Upload shipping proofs and mark order as shipped
  const handleShipOrder = async () => {
    if (!shippingOrderId) return

    // Validate: at least the first proof (package photo) is required
    const firstProof = proofFiles[0]
    if (!firstProof?.file) {
      setShipError(lt.photoRequired)
      return
    }

    setUploading(true)
    setShipError(null)

    try {
      const proofs: { type: string; url: string }[] = []
      let firstProofUrl = ''

      // Upload each proof file
      for (const proof of proofFiles) {
        if (!proof.file) continue
        const ext = proof.type === 'video_packing' ? 'mp4' : 'jpg'
        const filePath = `shipping-proofs/${shippingOrderId}_${proof.type}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('shipping-proofs')
          .upload(filePath, proof.file)

        if (uploadError) throw new Error(uploadError.message)

        const { data: urlData } = supabase.storage
          .from('shipping-proofs')
          .getPublicUrl(filePath)

        proofs.push({ type: proof.type, url: urlData.publicUrl })
        if (proof.type === 'photo_package') {
          firstProofUrl = urlData.publicUrl
        }
      }

      // Call API endpoint
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await apiFetch(`/api/orders/${shippingOrderId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shipping_proof_url: firstProofUrl,
          proofs,
          ...(trackingNumber.trim() ? { tracking_number: trackingNumber.trim() } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to ship order')
      }

      // Reset and refresh
      setShippingOrderId(null)
      setSelectedFile(null)
      setProofFiles([{ type: 'photo_package', file: null }])
      setTrackingNumber('')
      fetchSales()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setShipError(message)
    } finally {
      setUploading(false)
    }
  }

  // Confirm delivery (buyer)
  const handleConfirmDelivery = async (orderId: string) => {
    setConfirmingDelivery(orderId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await apiFetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm delivery')
      }

      fetchPurchases()
    } catch (err) {
      console.error('Confirm delivery error:', err)
    } finally {
      setConfirmingDelivery(null)
    }
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const txt = {
    fr: {
      title: 'Activite',
      purchasesTab: 'Achats',
      salesTab: 'Ventes',
      followingTab: 'Suivis',
      messagesTab: 'Messages',
      favoritesTab: 'Favoris',
      emptyPurchases: 'Aucun achat pour le moment',
      emptyPurchasesDesc: 'Les articles que tu achetes apparaitront ici',
      emptySales: 'Aucune vente pour le moment',
      emptySalesDesc: 'Les articles que tu vends apparaitront ici',
      notSeller: 'Tu n\'es pas encore vendeur',
      notSellerDesc: 'Deviens vendeur pour voir tes ventes ici',
      comingSoon: 'Bientot disponible',
      comingSoonFollowing: 'Le suivi de tes vendeurs preferes arrive bientot',
      comingSoonMessages: 'La messagerie directe arrive bientot',
      comingSoonFavorites: 'Les favoris arrivent bientot',
      statusPendingPayment: 'En attente',
      statusPaid: 'Paye',
      statusShipped: 'Expedie',
      statusDelivered: 'Livre',
      statusRefunded: 'Rembourse',
      statusDisputed: 'Litige',
      buyer: 'Acheteur',
      loading: 'Chargement...',
      error: 'Erreur de chargement',
      retry: 'Reessayer',
      shipOrder: 'Expedier',
      shipTitle: 'Confirmer l\'expedition',
      addPhoto: 'Ajouter une photo',
      trackingNumber: 'Numero de suivi (optionnel)',
      confirmShipment: 'Confirmer l\'envoi',
      uploading: 'Envoi en cours...',
      shippedOn: 'Expedie le',
      viewProof: 'Voir la preuve',
      confirmDelivery: 'Confirmer la reception',
      deliveredOn: 'Livre le',
      photoRequired: 'La photo est obligatoire',
      reportProblem: 'Signaler un probleme',
      deadlineExpired: 'Delai expire',
      timeRemainingPrefix: 'pour signaler un probleme',
      disputeOpen: 'Litige ouvert',
      contactSeller: 'Contacter le vendeur',
      contactBuyer: 'Contacter l\'acheteur',
      packagePhoto: 'Photo du colis',
      contentPhoto: 'Photo du contenu',
      packingVideo: 'Video d\'emballage',
      emptyFollowing: 'Tu ne suis aucun vendeur',
      emptyFollowingDesc: 'Suis tes vendeurs preferes pour etre notifie quand ils passent en live',
      unfollow: 'Ne plus suivre',
      liveNow: 'EN DIRECT',
      scheduled: 'Planifie',
      noUpcoming: 'Aucun live prevu',
    },
    en: {
      title: 'Activity',
      purchasesTab: 'Purchases',
      salesTab: 'Sales',
      followingTab: 'Following',
      messagesTab: 'Messages',
      favoritesTab: 'Favorites',
      emptyPurchases: 'No purchases yet',
      emptyPurchasesDesc: 'Items you buy will appear here',
      emptySales: 'No sales yet',
      emptySalesDesc: 'Items you sell will appear here',
      notSeller: 'You are not a seller yet',
      notSellerDesc: 'Become a seller to see your sales here',
      comingSoon: 'Coming soon',
      comingSoonFollowing: 'Follow your favorite sellers soon',
      comingSoonMessages: 'Direct messaging is coming soon',
      comingSoonFavorites: 'Favorites are coming soon',
      statusPendingPayment: 'Pending',
      statusPaid: 'Paid',
      statusShipped: 'Shipped',
      statusDelivered: 'Delivered',
      statusRefunded: 'Refunded',
      statusDisputed: 'Disputed',
      buyer: 'Buyer',
      loading: 'Loading...',
      error: 'Loading error',
      retry: 'Retry',
      shipOrder: 'Ship',
      shipTitle: 'Confirm Shipment',
      addPhoto: 'Add a photo',
      trackingNumber: 'Tracking number (optional)',
      confirmShipment: 'Confirm Shipment',
      uploading: 'Uploading...',
      shippedOn: 'Shipped on',
      viewProof: 'View proof',
      confirmDelivery: 'Confirm delivery',
      deliveredOn: 'Delivered on',
      photoRequired: 'Photo is required',
      reportProblem: 'Report a problem',
      deadlineExpired: 'Deadline expired',
      timeRemainingPrefix: 'to report a problem',
      disputeOpen: 'Dispute open',
      contactSeller: 'Contact seller',
      contactBuyer: 'Contact buyer',
      packagePhoto: 'Package photo',
      contentPhoto: 'Content photo',
      packingVideo: 'Packing video',
      emptyFollowing: 'You don\'t follow any sellers yet',
      emptyFollowingDesc: 'Follow your favorite sellers to get notified when they go live',
      unfollow: 'Unfollow',
      liveNow: 'LIVE',
      scheduled: 'Scheduled',
      noUpcoming: 'No upcoming lives',
    },
    he: {
      title: '\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA',
      purchasesTab: '\u05E8\u05DB\u05D9\u05E9\u05D5\u05EA',
      salesTab: '\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA',
      followingTab: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD',
      messagesTab: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
      favoritesTab: '\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD',
      emptyPurchases: '\u05D0\u05D9\u05DF \u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyPurchasesDesc: '\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05EA\u05E7\u05E0\u05D4 \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      emptySales: '\u05D0\u05D9\u05DF \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptySalesDesc: '\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05EA\u05DE\u05DB\u05D5\u05E8 \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      notSeller: '\u05D0\u05EA\u05D4 \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DE\u05D5\u05DB\u05E8',
      notSellerDesc: '\u05D4\u05E4\u05D5\u05DA \u05DC\u05DE\u05D5\u05DB\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA',
      comingSoon: '\u05D1\u05E7\u05E8\u05D5\u05D1',
      comingSoonFollowing: '\u05DE\u05E2\u05E7\u05D1 \u05D0\u05D7\u05E8\u05D9 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05D1\u05E7\u05E8\u05D5\u05D1',
      comingSoonMessages: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05E7\u05E8\u05D5\u05D1',
      comingSoonFavorites: '\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05D1\u05E7\u05E8\u05D5\u05D1',
      statusPendingPayment: '\u05DE\u05DE\u05EA\u05D9\u05DF',
      statusPaid: '\u05E9\u05D5\u05DC\u05DD',
      statusShipped: '\u05E0\u05E9\u05DC\u05D7',
      statusDelivered: '\u05E0\u05DE\u05E1\u05E8',
      statusRefunded: '\u05D4\u05D5\u05D7\u05D6\u05E8',
      statusDisputed: '\u05D1\u05DE\u05D7\u05DC\u05D5\u05E7\u05EA',
      buyer: '\u05E7\u05D5\u05E0\u05D4',
      loading: '\u05D8\u05D5\u05E2\u05DF...',
      error: '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D8\u05E2\u05D9\u05E0\u05D4',
      retry: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
      shipOrder: '\u05DC\u05E9\u05DC\u05D5\u05D7',
      shipTitle: '\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E9\u05DC\u05D5\u05D7',
      addPhoto: '\u05D4\u05D5\u05E1\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D4',
      trackingNumber: '\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E2\u05E7\u05D1 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)',
      confirmShipment: '\u05D0\u05E9\u05E8 \u05DE\u05E9\u05DC\u05D5\u05D7',
      uploading: '\u05E9\u05D5\u05DC\u05D7...',
      shippedOn: '\u05E0\u05E9\u05DC\u05D7 \u05D1',
      viewProof: '\u05E6\u05E4\u05D4 \u05D1\u05D4\u05D5\u05DB\u05D7\u05D4',
      confirmDelivery: '\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4',
      deliveredOn: '\u05E0\u05DE\u05E1\u05E8 \u05D1',
      photoRequired: '\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E0\u05D3\u05E8\u05E9\u05EA',
      reportProblem: '\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05D1\u05E2\u05D9\u05D4',
      deadlineExpired: '\u05D4\u05DE\u05D5\u05E2\u05D3 \u05E2\u05D1\u05E8',
      timeRemainingPrefix: '\u05DC\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05D1\u05E2\u05D9\u05D4',
      disputeOpen: '\u05DE\u05D7\u05DC\u05D5\u05E7\u05EA \u05E4\u05EA\u05D5\u05D7\u05D4',
      contactSeller: '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05DE\u05D5\u05DB\u05E8',
      contactBuyer: '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05E7\u05D5\u05E0\u05D4',
      packagePhoto: '\u05EA\u05DE\u05D5\u05E0\u05EA \u05D7\u05D1\u05D9\u05DC\u05D4',
      contentPhoto: '\u05EA\u05DE\u05D5\u05E0\u05EA \u05EA\u05D5\u05DB\u05DF',
      packingVideo: '\u05E1\u05E8\u05D8\u05D5\u05DF \u05D0\u05E8\u05D9\u05D6\u05D4',
      emptyFollowing: '\u05D0\u05EA\u05D4 \u05DC\u05D0 \u05E2\u05D5\u05E7\u05D1 \u05D0\u05D7\u05E8\u05D9 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD',
      emptyFollowingDesc: '\u05E2\u05E7\u05D5\u05D1 \u05D0\u05D7\u05E8\u05D9 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05E7\u05D1\u05DC \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA',
      unfollow: '\u05D4\u05E4\u05E1\u05E7 \u05DE\u05E2\u05E7\u05D1',
      liveNow: '\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9',
      scheduled: '\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF',
      noUpcoming: '\u05D0\u05D9\u05DF \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD',
    },
    es: {
      title: 'Actividad',
      purchasesTab: 'Compras',
      salesTab: 'Ventas',
      followingTab: 'Seguidos',
      messagesTab: 'Mensajes',
      favoritesTab: 'Favoritos',
      emptyPurchases: 'Sin compras todavia',
      emptyPurchasesDesc: 'Los articulos que compres apareceran aqui',
      emptySales: 'Sin ventas todavia',
      emptySalesDesc: 'Los articulos que vendas apareceran aqui',
      notSeller: 'Aun no eres vendedor',
      notSellerDesc: 'Conviertete en vendedor para ver tus ventas aqui',
      comingSoon: 'Proximamente',
      comingSoonFollowing: 'Sigue a tus vendedores favoritos pronto',
      comingSoonMessages: 'Mensajeria directa proximamente',
      comingSoonFavorites: 'Favoritos proximamente',
      statusPendingPayment: 'Pendiente',
      statusPaid: 'Pagado',
      statusShipped: 'Enviado',
      statusDelivered: 'Entregado',
      statusRefunded: 'Reembolsado',
      statusDisputed: 'En disputa',
      buyer: 'Comprador',
      loading: 'Cargando...',
      error: 'Error de carga',
      retry: 'Reintentar',
      shipOrder: 'Enviar',
      shipTitle: 'Confirmar envio',
      addPhoto: 'Agregar una foto',
      trackingNumber: 'Numero de seguimiento (opcional)',
      confirmShipment: 'Confirmar envio',
      uploading: 'Enviando...',
      shippedOn: 'Enviado el',
      viewProof: 'Ver prueba',
      confirmDelivery: 'Confirmar recepcion',
      deliveredOn: 'Entregado el',
      photoRequired: 'La foto es obligatoria',
      reportProblem: 'Reportar un problema',
      deadlineExpired: 'Plazo expirado',
      timeRemainingPrefix: 'para reportar un problema',
      disputeOpen: 'Disputa abierta',
      contactSeller: 'Contactar al vendedor',
      contactBuyer: 'Contactar al comprador',
      packagePhoto: 'Foto del paquete',
      contentPhoto: 'Foto del contenido',
      packingVideo: 'Video de embalaje',
      emptyFollowing: 'No sigues a ningun vendedor',
      emptyFollowingDesc: 'Sigue a tus vendedores favoritos para recibir notificaciones',
      unfollow: 'Dejar de seguir',
      liveNow: 'EN VIVO',
      scheduled: 'Programado',
      noUpcoming: 'Sin lives programados',
    },
  }

  const lt = txt[lang as keyof typeof txt] || txt.fr

  const mainTabs: { id: MainTab; label: string; emoji: string }[] = [
    { id: 'purchases', label: lt.purchasesTab, emoji: '\uD83D\uDECD\uFE0F' },
    { id: 'sales', label: lt.salesTab, emoji: '\uD83D\uDCB0' },
    { id: 'following', label: lt.followingTab, emoji: '\uD83D\uDC65' },
    { id: 'messages', label: lt.messagesTab, emoji: '\uD83D\uDCAC' },
    { id: 'favorites', label: lt.favoritesTab, emoji: '\u2764\uFE0F' },
  ]

  const subFilters: { id: SubFilter; label: string }[] = [
    { id: 'all', label: { fr: 'Toutes', en: 'All', he: '\u05D4\u05DB\u05DC', es: 'Todas' }[lang] || 'Toutes' },
    { id: 'active', label: { fr: 'En cours', en: 'Active', he: '\u05E4\u05E2\u05D9\u05DC', es: 'Activas' }[lang] || 'En cours' },
    { id: 'completed', label: { fr: 'Terminees', en: 'Completed', he: '\u05D4\u05D5\u05E9\u05DC\u05DD', es: 'Finalizadas' }[lang] || 'Terminees' },
    { id: 'refunds', label: { fr: 'Remboursements', en: 'Refunds', he: '\u05D4\u05D7\u05D6\u05E8\u05D9\u05DD', es: 'Reembolsos' }[lang] || 'Remboursements' },
  ]

  const getOrderStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending_payment': return '#F59E0B'
      case 'paid': return '#3B82F6'
      case 'shipped': return '#10B981'
      case 'delivered': return '#10B981'
      case 'refunded': return '#8B5CF6'
      case 'disputed': return '#E8344E'
      default: return '#666'
    }
  }

  const getOrderStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending_payment': return lt.statusPendingPayment
      case 'paid': return lt.statusPaid
      case 'shipped': return lt.statusShipped
      case 'delivered': return lt.statusDelivered
      case 'refunded': return lt.statusRefunded
      case 'disputed': return lt.statusDisputed
      default: return status
    }
  }

  const filterOrders = <T extends { status: Order['status'] }>(items: T[]): T[] => {
    switch (subFilter) {
      case 'active': return items.filter(o => ['pending_payment', 'paid', 'shipped'].includes(o.status))
      case 'completed': return items.filter(o => o.status === 'delivered')
      case 'refunds': return items.filter(o => ['refunded', 'disputed'].includes(o.status))
      default: return items
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number) => {
    return amount.toFixed(2) + ' \u20AC'
  }

  const getItemImage = (item?: Pick<Item, 'image_urls'>) => {
    if (item?.image_urls && item.image_urls.length > 0) {
      return item.image_urls[0]
    }
    return null
  }

  const renderEmpty = (icon: string, title: string, desc: string, gradient: string) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
      opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(15px)',
      transition: 'all 0.5s ease 0.2s',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(240,144,138,0.15)',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{title}</p>
      <p style={{ fontSize: '14px', color: '#666', maxWidth: '260px' }}>{desc}</p>
    </div>
  )

  const renderLoading = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: '32px', height: '32px', border: '3px solid #222',
        borderTopColor: '#F0908A', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', marginBottom: '16px',
      }} />
      <p style={{ fontSize: '14px', color: '#666' }}>{lt.loading}</p>
    </div>
  )

  const renderError = (errorMsg: string, onRetry: () => void) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #E8344E 0%, #991B1B 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '20px',
      }}>
        !
      </div>
      <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{lt.error}</p>
      <p style={{ fontSize: '13px', color: '#666', maxWidth: '260px', marginBottom: '16px' }}>{errorMsg}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '10px 24px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #F0908A, #E8344E)',
          border: 'none', color: '#fff', fontSize: '14px',
          fontWeight: 700, cursor: 'pointer',
        }}
      >
        {lt.retry}
      </button>
    </div>
  )

  const renderComingSoon = (icon: string, description: string) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
      opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(15px)',
      transition: 'all 0.5s ease 0.2s',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{lt.comingSoon}</p>
      <p style={{ fontSize: '14px', color: '#666', maxWidth: '280px' }}>{description}</p>
    </div>
  )

  const renderOrderCard = (order: PurchaseOrder | SaleOrder, index: number, isSale: boolean) => {
    const itemImage = getItemImage(order.item)
    const itemTitle = order.item?.title || `Order #${order.id.slice(0, 8)}`
    const statusColor = getOrderStatusColor(order.status)
    const statusLabel = getOrderStatusLabel(order.status)
    const saleOrder = order as SaleOrder

    return (
      <div key={order.id} onClick={() => navigate(`/order/${order.id}`)} style={{
        padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
        border: '1px solid #1A1A1A', marginBottom: '10px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
        transition: `all 0.4s ease ${0.1 + index * 0.05}s`,
        cursor: 'pointer',
      }}>
        {/* Main order row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {itemImage ? (
            <img
              src={itemImage}
              alt={itemTitle}
              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', backgroundColor: '#111' }}
            />
          ) : (
            <div style={{
              width: '80px', height: '80px', borderRadius: '12px',
              backgroundColor: '#111', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '28px', flexShrink: 0,
            }}>
              {isSale ? '\uD83D\uDCB0' : '\uD83D\uDECD\uFE0F'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '3px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {itemTitle}
            </p>
            <p style={{ fontSize: '14px', color: '#F0908A', fontWeight: 600, marginBottom: '3px' }}>
              {formatAmount(order.amount)}
            </p>
            <p style={{ fontSize: '12px', color: '#555' }}>
              {isSale && saleOrder.buyer_profile
                ? `${lt.buyer}: ${saleOrder.buyer_profile.display_name} \u00B7 `
                : ''
              }
              {formatDate(order.created_at)}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: statusColor,
              backgroundColor: `${statusColor}14`,
              padding: '5px 12px', borderRadius: '10px',
              border: `1px solid ${statusColor}30`,
              whiteSpace: 'nowrap',
            }}>
              {statusLabel}
            </span>
            {/* Dispute badge */}
            {order.status === 'disputed' && (
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: '#F97316',
                backgroundColor: 'rgba(249,115,22,0.1)',
                padding: '3px 8px', borderRadius: '8px',
                border: '1px solid rgba(249,115,22,0.3)',
                whiteSpace: 'nowrap',
              }}>
                {lt.disputeOpen}
              </span>
            )}
          </div>
        </div>

        {/* Seller: "Ship" button for paid orders */}
        {isSale && order.status === 'paid' && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShippingOrderId(order.id); setSelectedFile(null); setTrackingNumber(''); setShipError(null); fetchProofLevel() }}
              style={{
                padding: '8px 18px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: 'none', color: '#fff', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {lt.shipOrder}
            </button>
          </div>
        )}

        {/* Seller: shipped order — show proof thumbnail + tracking */}
        {isSale && order.status === 'shipped' && order.shipping_proof_url && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={order.shipping_proof_url}
              alt="Shipping proof"
              onClick={(e) => { e.stopPropagation(); setProofImageUrl(order.shipping_proof_url) }}
              style={{
                width: '48px', height: '48px', borderRadius: '8px',
                objectFit: 'cover', cursor: 'pointer', border: '1px solid #333',
              }}
            />
            <div style={{ flex: 1 }}>
              {order.shipped_at && (
                <p style={{ fontSize: '12px', color: '#10B981', margin: 0 }}>
                  {lt.shippedOn} {formatDate(order.shipped_at)}
                </p>
              )}
              {order.tracking_number && (
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                  # {order.tracking_number}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Buyer: shipped order — view proof + confirm delivery */}
        {!isSale && order.status === 'shipped' && (
          <div style={{ marginTop: '10px' }}>
            {order.shipped_at && (
              <p style={{ fontSize: '12px', color: '#10B981', margin: '0 0 8px' }}>
                {lt.shippedOn} {formatDate(order.shipped_at)}
              </p>
            )}
            {order.tracking_number && (
              <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px' }}>
                # {order.tracking_number}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {order.shipping_proof_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); setProofImageUrl(order.shipping_proof_url) }}
                  style={{
                    padding: '7px 14px', borderRadius: '8px',
                    background: 'transparent', border: '1px solid #333',
                    color: '#aaa', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {lt.viewProof}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirmDelivery(order.id) }}
                disabled={confirmingDelivery === order.id}
                style={{
                  padding: '7px 14px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: '#fff', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer',
                  opacity: confirmingDelivery === order.id ? 0.6 : 1,
                }}
              >
                {confirmingDelivery === order.id ? lt.uploading : lt.confirmDelivery}
              </button>
            </div>
          </div>
        )}

        {/* Buyer: delivered order — show delivery date + report problem button */}
        {!isSale && order.status === 'delivered' && (
          <div style={{ marginTop: '8px' }}>
            {order.delivered_at && (
              <p style={{ fontSize: '12px', color: '#10B981', margin: '0 0 10px' }}>
                {lt.deliveredOn} {formatDate(order.delivered_at)}
              </p>
            )}
            {/* "Signaler un probleme" button + countdown */}
            {order.claim_deadline && new Date(order.claim_deadline) > new Date() ? (
              <div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/dispute/${order.id}`) }}
                  style={{
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F97316, #E8344E)',
                    border: 'none', color: '#fff', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer',
                    marginBottom: '6px',
                  }}
                >
                  {lt.reportProblem}
                </button>
                <p style={{ fontSize: '11px', color: '#F97316', margin: 0 }}>
                  {'\u23F1'} {formatTimeRemaining(order.claim_deadline)} {lt.timeRemainingPrefix}
                </p>
              </div>
            ) : (
              <button
                disabled
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: '#333', border: 'none',
                  color: '#666', fontSize: '13px',
                  fontWeight: 700, cursor: 'not-allowed',
                }}
              >
                {lt.deadlineExpired}
              </button>
            )}
          </div>
        )}

        {/* "Contacter" button for paid/shipped/delivered orders */}
        {['paid', 'shipped', 'delivered'].includes(order.status) && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) { navigate('/messages'); return }
                  const res = await apiFetch(`/api/orders/${order.id}/conversation`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  })
                  if (res.ok) {
                    const data = await res.json()
                    navigate(`/conversation/${data.id}`)
                  } else {
                    navigate('/messages')
                  }
                } catch {
                  navigate('/messages')
                }
              }}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #333',
                color: '#aaa', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {'\uD83D\uDCAC'} {isSale ? lt.contactBuyer : lt.contactSeller}
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderPurchases = () => {
    if (loadingPurchases) return renderLoading()
    if (errorPurchases) return renderError(errorPurchases, fetchPurchases)

    const filtered = filterOrders(purchases)
    if (filtered.length === 0) {
      return renderEmpty(
        '\uD83D\uDECD\uFE0F',
        lt.emptyPurchases,
        lt.emptyPurchasesDesc,
        'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
      )
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {filtered.map((order, i) => renderOrderCard(order, i, false))}
      </div>
    )
  }

  const renderSales = () => {
    if (!profile?.is_seller) {
      return renderEmpty(
        '\uD83D\uDCB0',
        lt.notSeller,
        lt.notSellerDesc,
        'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      )
    }

    if (loadingSales) return renderLoading()
    if (errorSales) return renderError(errorSales, fetchSales)

    const filtered = filterOrders(sales)
    if (filtered.length === 0) {
      return renderEmpty(
        '\uD83D\uDCB0',
        lt.emptySales,
        lt.emptySalesDesc,
        'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      )
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {filtered.map((order, i) => renderOrderCard(order, i, true))}
      </div>
    )
  }

  const renderFollowing = () => {
    if (loadingFollowing) return renderLoading()

    if (followedSellers.length === 0) {
      return renderEmpty(
        '\uD83D\uDC65',
        (lt as any).emptyFollowing || 'Tu ne suis aucun vendeur',
        (lt as any).emptyFollowingDesc || 'Suis tes vendeurs preferes pour etre notifie',
        'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      )
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {followedSellers.map((seller: any, i: number) => {
          const profile = seller.profiles
          const displayName = profile?.display_name || seller.store_name || 'Vendeur'
          const avatarUrl = profile?.avatar_url
          const hasLive = seller.upcoming_streams?.some((s: any) => s.status === 'live')
          const nextScheduled = seller.upcoming_streams?.find((s: any) => s.status === 'scheduled')

          return (
            <div key={seller.id} style={{
              padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
              border: '1px solid #1A1A1A', marginBottom: '10px',
              opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
              transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: '#111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: hasLive ? '2px solid #E8344E' : '2px solid #222',
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '18px', color: '#666', fontWeight: 700 }}>{displayName[0]}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </p>
                  {seller.store_name && seller.store_name !== displayName && (
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{seller.store_name}</p>
                  )}
                  {hasLive ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#E8344E', backgroundColor: 'rgba(232,52,78,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                      {(lt as any).liveNow || 'EN DIRECT'}
                    </span>
                  ) : nextScheduled ? (
                    <span style={{ fontSize: '11px', color: '#8B5CF6' }}>
                      {(lt as any).scheduled || 'Planifie'} - {new Date(nextScheduled.scheduled_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#444' }}>{(lt as any).noUpcoming || 'Aucun live prevu'}</span>
                  )}
                </div>
                <button
                  onClick={() => handleUnfollow(seller.id)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'transparent', border: '1px solid #333',
                    color: '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {(lt as any).unfollow || 'Ne plus suivre'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMessages = () => renderComingSoon('\uD83D\uDCAC', lt.comingSoonMessages)
  const renderFavorites = () => renderComingSoon('\u2764\uFE0F', lt.comingSoonFavorites)

  const renderContent = () => {
    switch (mainTab) {
      case 'purchases': return renderPurchases()
      case 'sales': return renderSales()
      case 'following': return renderFollowing()
      case 'messages': return renderMessages()
      case 'favorites': return renderFavorites()
    }
  }

  const showSubFilters = mainTab === 'purchases' || mainTab === 'sales'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 0px',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.4s ease',
        }}>
          <h1 style={{
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '-0.5px', margin: 0,
          }}>
            {lt.title}
          </h1>
        </div>

        {/* Main tabs */}
        <div style={{
          display: 'flex', gap: '6px', padding: '16px 16px 12px',
          overflowX: 'auto',
        }} className="no-scrollbar">
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'messages') { navigate('/messages'); return }
                setMainTab(tab.id); setSubFilter('all')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '14px',
                flexShrink: 0, cursor: 'pointer',
                background: mainTab === tab.id
                  ? 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(232,52,78,0.1))'
                  : '#0D0D0D',
                border: mainTab === tab.id
                  ? '1px solid rgba(240,144,138,0.3)'
                  : '1px solid #1A1A1A',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '14px' }}>{tab.emoji}</span>
              <span style={{
                fontSize: '13px',
                fontWeight: mainTab === tab.id ? 700 : 500,
                color: mainTab === tab.id ? '#F0908A' : '#666',
              }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Sub-filters (only for purchases and sales) */}
        {showSubFilters && (
          <div style={{
            display: 'flex', gap: '8px', padding: '4px 16px 16px',
            overflowX: 'auto',
          }} className="no-scrollbar">
            {subFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setSubFilter(filter.id)}
                style={{
                  padding: '6px 14px', borderRadius: '100px', flexShrink: 0,
                  backgroundColor: subFilter === filter.id ? '#fff' : 'transparent',
                  border: subFilter === filter.id ? 'none' : '1px solid #222',
                  color: subFilter === filter.id ? '#000' : '#555',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {renderContent()}
      </div>

      {/* Shipping modal (seller uploads proof) */}
      {shippingOrderId && (
        <div
          onClick={() => setShippingOrderId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111', borderRadius: '20px',
              padding: '24px', width: '100%', maxWidth: '380px',
              border: '1px solid #222',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
              {lt.shipTitle}
            </h3>

            {/* Multi-proof file inputs */}
            {loadingProofLevel ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: '24px', height: '24px', border: '2px solid #333',
                  borderTopColor: '#F0908A', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 8px',
                }} />
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{lt.loading}</p>
              </div>
            ) : (
              proofFiles.map((proof, idx) => {
                const proofLabel = proof.type === 'photo_package' ? lt.packagePhoto
                  : proof.type === 'photo_content' ? lt.contentPhoto
                  : lt.packingVideo
                const isVideo = proof.type === 'video_packing'
                return (
                  <div key={proof.type} style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: 600 }}>
                      {proofLabel} {idx === 0 ? '*' : ''}
                    </p>
                    <input
                      ref={el => { proofFileInputRefs.current[idx] = el }}
                      type="file"
                      accept={isVideo ? 'video/*' : 'image/*'}
                      capture={isVideo ? undefined : 'environment'}
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setProofFiles(prev => prev.map((p, i) => i === idx ? { ...p, file } : p))
                        setShipError(null)
                      }}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => proofFileInputRefs.current[idx]?.click()}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px',
                        border: proof.file ? '2px solid #10B981' : '2px dashed #333',
                        backgroundColor: '#0A0A0A', color: proof.file ? '#10B981' : '#666',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {proof.file ? proof.file.name : (isVideo ? lt.packingVideo : lt.addPhoto)}
                    </button>
                    {/* Preview for images */}
                    {proof.file && !isVideo && (
                      <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <img
                          src={URL.createObjectURL(proof.file)}
                          alt="Preview"
                          style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '10px', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                    {/* Preview for video */}
                    {proof.file && isVideo && (
                      <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <video
                          src={URL.createObjectURL(proof.file)}
                          controls
                          style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '10px' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Tracking number */}
            <input
              type="text"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder={lt.trackingNumber}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid #222', backgroundColor: '#0A0A0A',
                color: '#fff', fontSize: '14px', marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />

            {/* Error */}
            {shipError && (
              <p style={{ color: '#E8344E', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>
                {shipError}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={() => handleShipOrder()}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: uploading
                  ? '#333'
                  : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: 'none', color: '#fff', fontSize: '15px',
                fontWeight: 700, cursor: uploading ? 'default' : 'pointer',
              }}
            >
              {uploading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid #666',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  {lt.uploading}
                </span>
              ) : lt.confirmShipment}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setShippingOrderId(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'transparent', border: 'none',
                color: '#666', fontSize: '14px', cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              {lt.retry === 'Reessayer' ? 'Annuler' : lang === 'en' ? 'Cancel' : lang === 'he' ? '\u05D1\u05D9\u05D8\u05D5\u05DC' : 'Cancelar'}
            </button>
          </div>
        </div>
      )}

      {/* Proof image full-screen viewer */}
      {proofImageUrl && (
        <div
          onClick={() => setProofImageUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setProofImageUrl(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10001,
            }}
          >
            X
          </button>
          <img
            src={proofImageUrl}
            alt="Shipping proof"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: '12px',
            }}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import ShippingLabel from '../components/ShippingLabel'

type Lang = 'fr' | 'en' | 'he' | 'es'

interface OrderDetail {
  id: string
  buyer_id: string
  seller_id: string
  item_id: string
  stream_id: string | null
  amount: number
  platform_fee: number
  processing_fee: number
  seller_payout: number
  status: 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'refunded' | 'disputed' | 'return_requested' | 'return_approved' | 'return_rejected'
  shipping_address: Record<string, string> | null
  shipping_proof_url: string | null
  tracking_number: string | null
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  claim_deadline: string | null
  created_at: string
  item?: { title: string; image_urls: string[]; category: string; description: string | null }
  buyer_profile?: { display_name: string; username: string; avatar_url: string | null }
  seller_profile?: { display_name: string; username: string; avatar_url: string | null }
  proofs?: { type: string; url: string }[]
}

const pageContent = {
  fr: {
    back: 'Retour',
    orderDetail: 'Detail commande',
    orderRef: 'Commande',
    buyer: 'Acheteur',
    seller: 'Vendeur',
    item: 'Article',
    amount: 'Montant',
    platformFee: 'Frais plateforme',
    sellerPayout: 'Versement vendeur',
    status: 'Statut',
    shippingAddress: 'Adresse de livraison',
    tracking: 'Numero de suivi',
    createdAt: 'Commande passee le',
    paidAt: 'Payee le',
    shippedAt: 'Expediee le',
    deliveredAt: 'Livree le',
    shippingProof: 'Preuve d\'expedition',
    viewProof: 'Voir les preuves',
    shipOrder: 'Expedier la commande',
    confirmDelivery: 'Confirmer la reception',
    reportProblem: 'Signaler un probleme',
    contactBuyer: 'Contacter l\'acheteur',
    contactSeller: 'Contacter le vendeur',
    printLabel: 'Etiquette d\'envoi',
    deadlineExpired: 'Delai expire',
    timeRemaining: 'pour signaler un probleme',
    loading: 'Chargement...',
    error: 'Erreur',
    notFound: 'Commande introuvable',
    statusPendingPayment: 'En attente de paiement',
    statusPaid: 'Payee',
    statusShipped: 'Expediee',
    statusDelivered: 'Livree',
    statusRefunded: 'Remboursee',
    statusDisputed: 'En litige',
    confirming: 'Confirmation...',
    photoRequired: 'Photo obligatoire',
    addPhoto: 'Ajouter une photo',
    trackingPlaceholder: 'Numero de suivi (optionnel)',
    confirmShipment: 'Confirmer l\'envoi',
    uploading: 'Envoi en cours...',
    cancel: 'Annuler',
    packagePhoto: 'Photo du colis',
    contentPhoto: 'Photo du contenu',
    packingVideo: 'Video d\'emballage',
    timeline: 'Chronologie',
    proofPhotos: 'Photos de preuve',
    requestReturn: 'Demander un retour',
    returnReason: 'Raison du retour',
    returnReasonPlaceholder: 'Decrivez la raison du retour...',
    submitReturn: 'Envoyer la demande',
    submitting: 'Envoi...',
    approveReturn: 'Accepter le retour',
    rejectReturn: 'Refuser le retour',
    rejectReason: 'Raison du refus',
    rejectReasonPlaceholder: 'Expliquez pourquoi vous refusez...',
    confirmReject: 'Confirmer le refus',
    returnPending: 'Retour demande',
    statusReturnRequested: 'Retour demande',
    statusReturnApproved: 'Retour accepte',
    statusReturnRejected: 'Retour refuse',
  },
  en: {
    back: 'Back',
    orderDetail: 'Order Detail',
    orderRef: 'Order',
    buyer: 'Buyer',
    seller: 'Seller',
    item: 'Item',
    amount: 'Amount',
    platformFee: 'Platform fee',
    sellerPayout: 'Seller payout',
    status: 'Status',
    shippingAddress: 'Shipping address',
    tracking: 'Tracking number',
    createdAt: 'Ordered on',
    paidAt: 'Paid on',
    shippedAt: 'Shipped on',
    deliveredAt: 'Delivered on',
    shippingProof: 'Shipping proof',
    viewProof: 'View proofs',
    shipOrder: 'Ship order',
    confirmDelivery: 'Confirm delivery',
    reportProblem: 'Report a problem',
    contactBuyer: 'Contact buyer',
    contactSeller: 'Contact seller',
    printLabel: 'Shipping label',
    deadlineExpired: 'Deadline expired',
    timeRemaining: 'to report a problem',
    loading: 'Loading...',
    error: 'Error',
    notFound: 'Order not found',
    statusPendingPayment: 'Pending payment',
    statusPaid: 'Paid',
    statusShipped: 'Shipped',
    statusDelivered: 'Delivered',
    statusRefunded: 'Refunded',
    statusDisputed: 'Disputed',
    confirming: 'Confirming...',
    photoRequired: 'Photo is required',
    addPhoto: 'Add a photo',
    trackingPlaceholder: 'Tracking number (optional)',
    confirmShipment: 'Confirm shipment',
    uploading: 'Uploading...',
    cancel: 'Cancel',
    packagePhoto: 'Package photo',
    contentPhoto: 'Content photo',
    packingVideo: 'Packing video',
    timeline: 'Timeline',
    proofPhotos: 'Proof photos',
    requestReturn: 'Request return',
    returnReason: 'Reason for return',
    returnReasonPlaceholder: 'Describe the reason for the return...',
    submitReturn: 'Submit request',
    submitting: 'Submitting...',
    approveReturn: 'Approve return',
    rejectReturn: 'Reject return',
    rejectReason: 'Rejection reason',
    rejectReasonPlaceholder: 'Explain why you are rejecting...',
    confirmReject: 'Confirm rejection',
    returnPending: 'Return requested',
    statusReturnRequested: 'Return requested',
    statusReturnApproved: 'Return approved',
    statusReturnRejected: 'Return rejected',
  },
  he: {
    back: '\u05D7\u05D6\u05D5\u05E8',
    orderDetail: '\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D6\u05DE\u05E0\u05D4',
    orderRef: '\u05D4\u05D6\u05DE\u05E0\u05D4',
    buyer: '\u05E7\u05D5\u05E0\u05D4',
    seller: '\u05DE\u05D5\u05DB\u05E8',
    item: '\u05E4\u05E8\u05D9\u05D8',
    amount: '\u05E1\u05DB\u05D5\u05DD',
    platformFee: '\u05E2\u05DE\u05DC\u05EA \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4',
    sellerPayout: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05DC\u05DE\u05D5\u05DB\u05E8',
    status: '\u05E1\u05D8\u05D8\u05D5\u05E1',
    shippingAddress: '\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
    tracking: '\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E2\u05E7\u05D1',
    createdAt: '\u05D4\u05D5\u05D6\u05DE\u05DF \u05D1',
    paidAt: '\u05E9\u05D5\u05DC\u05DD \u05D1',
    shippedAt: '\u05E0\u05E9\u05DC\u05D7 \u05D1',
    deliveredAt: '\u05E0\u05DE\u05E1\u05E8 \u05D1',
    shippingProof: '\u05D4\u05D5\u05DB\u05D7\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
    viewProof: '\u05E6\u05E4\u05D4 \u05D1\u05D4\u05D5\u05DB\u05D7\u05D5\u05EA',
    shipOrder: '\u05E9\u05DC\u05D7',
    confirmDelivery: '\u05D0\u05E9\u05E8 \u05E7\u05D1\u05DC\u05D4',
    reportProblem: '\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05D1\u05E2\u05D9\u05D4',
    contactBuyer: '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05E7\u05D5\u05E0\u05D4',
    contactSeller: '\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05E2\u05DD \u05D4\u05DE\u05D5\u05DB\u05E8',
    printLabel: '\u05EA\u05D5\u05D5\u05D9\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
    deadlineExpired: '\u05D4\u05DE\u05D5\u05E2\u05D3 \u05E2\u05D1\u05E8',
    timeRemaining: '\u05DC\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05D1\u05E2\u05D9\u05D4',
    loading: '\u05D8\u05D5\u05E2\u05DF...',
    error: '\u05E9\u05D2\u05D9\u05D0\u05D4',
    notFound: '\u05D4\u05D6\u05DE\u05E0\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4',
    statusPendingPayment: '\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD',
    statusPaid: '\u05E9\u05D5\u05DC\u05DD',
    statusShipped: '\u05E0\u05E9\u05DC\u05D7',
    statusDelivered: '\u05E0\u05DE\u05E1\u05E8',
    statusRefunded: '\u05D4\u05D5\u05D7\u05D6\u05E8',
    statusDisputed: '\u05D1\u05DE\u05D7\u05DC\u05D5\u05E7\u05EA',
    confirming: '\u05DE\u05D0\u05E9\u05E8...',
    photoRequired: '\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E0\u05D3\u05E8\u05E9\u05EA',
    addPhoto: '\u05D4\u05D5\u05E1\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D4',
    trackingPlaceholder: '\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E2\u05E7\u05D1 (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9)',
    confirmShipment: '\u05D0\u05E9\u05E8 \u05DE\u05E9\u05DC\u05D5\u05D7',
    uploading: '\u05E9\u05D5\u05DC\u05D7...',
    cancel: '\u05D1\u05D9\u05D8\u05D5\u05DC',
    packagePhoto: '\u05EA\u05DE\u05D5\u05E0\u05EA \u05D7\u05D1\u05D9\u05DC\u05D4',
    contentPhoto: '\u05EA\u05DE\u05D5\u05E0\u05EA \u05EA\u05D5\u05DB\u05DF',
    packingVideo: '\u05E1\u05E8\u05D8\u05D5\u05DF \u05D0\u05E8\u05D9\u05D6\u05D4',
    timeline: '\u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF',
    proofPhotos: '\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D4\u05D5\u05DB\u05D7\u05D4',
    requestReturn: '\u05D1\u05E7\u05E9\u05EA \u05D4\u05D7\u05D6\u05E8\u05D4',
    returnReason: '\u05E1\u05D9\u05D1\u05EA \u05D4\u05D4\u05D7\u05D6\u05E8\u05D4',
    returnReasonPlaceholder: '\u05EA\u05D0\u05E8 \u05D0\u05EA \u05E1\u05D9\u05D1\u05EA \u05D4\u05D4\u05D7\u05D6\u05E8\u05D4...',
    submitReturn: '\u05E9\u05DC\u05D7 \u05D1\u05E7\u05E9\u05D4',
    submitting: '\u05E9\u05D5\u05DC\u05D7...',
    approveReturn: '\u05D0\u05E9\u05E8 \u05D4\u05D7\u05D6\u05E8\u05D4',
    rejectReturn: '\u05D3\u05D7\u05D4 \u05D4\u05D7\u05D6\u05E8\u05D4',
    rejectReason: '\u05E1\u05D9\u05D1\u05EA \u05D3\u05D7\u05D9\u05D9\u05D4',
    rejectReasonPlaceholder: '\u05D4\u05E1\u05D1\u05E8 \u05DE\u05D3\u05D5\u05E2 \u05D0\u05EA\u05D4 \u05D3\u05D5\u05D7\u05D4...',
    confirmReject: '\u05D0\u05E9\u05E8 \u05D3\u05D7\u05D9\u05D9\u05D4',
    returnPending: '\u05D4\u05D7\u05D6\u05E8\u05D4 \u05D4\u05EA\u05D1\u05E7\u05E9\u05D4',
    statusReturnRequested: '\u05D4\u05D7\u05D6\u05E8\u05D4 \u05D4\u05EA\u05D1\u05E7\u05E9\u05D4',
    statusReturnApproved: '\u05D4\u05D7\u05D6\u05E8\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4',
    statusReturnRejected: '\u05D4\u05D7\u05D6\u05E8\u05D4 \u05E0\u05D3\u05D7\u05EA\u05D4',
  },
  es: {
    back: 'Volver',
    orderDetail: 'Detalle del pedido',
    orderRef: 'Pedido',
    buyer: 'Comprador',
    seller: 'Vendedor',
    item: 'Articulo',
    amount: 'Monto',
    platformFee: 'Comision',
    sellerPayout: 'Pago al vendedor',
    status: 'Estado',
    shippingAddress: 'Direccion de envio',
    tracking: 'Numero de seguimiento',
    createdAt: 'Pedido el',
    paidAt: 'Pagado el',
    shippedAt: 'Enviado el',
    deliveredAt: 'Entregado el',
    shippingProof: 'Prueba de envio',
    viewProof: 'Ver pruebas',
    shipOrder: 'Enviar pedido',
    confirmDelivery: 'Confirmar recepcion',
    reportProblem: 'Reportar problema',
    contactBuyer: 'Contactar comprador',
    contactSeller: 'Contactar vendedor',
    printLabel: 'Etiqueta de envio',
    deadlineExpired: 'Plazo expirado',
    timeRemaining: 'para reportar problema',
    loading: 'Cargando...',
    error: 'Error',
    notFound: 'Pedido no encontrado',
    statusPendingPayment: 'Pendiente',
    statusPaid: 'Pagado',
    statusShipped: 'Enviado',
    statusDelivered: 'Entregado',
    statusRefunded: 'Reembolsado',
    statusDisputed: 'En disputa',
    confirming: 'Confirmando...',
    photoRequired: 'Foto obligatoria',
    addPhoto: 'Agregar foto',
    trackingPlaceholder: 'Numero de seguimiento (opcional)',
    confirmShipment: 'Confirmar envio',
    uploading: 'Enviando...',
    cancel: 'Cancelar',
    packagePhoto: 'Foto del paquete',
    contentPhoto: 'Foto del contenido',
    packingVideo: 'Video de embalaje',
    timeline: 'Cronologia',
    proofPhotos: 'Fotos de prueba',
    requestReturn: 'Solicitar devolucion',
    returnReason: 'Motivo de la devolucion',
    returnReasonPlaceholder: 'Describe el motivo de la devolucion...',
    submitReturn: 'Enviar solicitud',
    submitting: 'Enviando...',
    approveReturn: 'Aprobar devolucion',
    rejectReturn: 'Rechazar devolucion',
    rejectReason: 'Motivo del rechazo',
    rejectReasonPlaceholder: 'Explica por que rechazas...',
    confirmReject: 'Confirmar rechazo',
    returnPending: 'Devolucion solicitada',
    statusReturnRequested: 'Devolucion solicitada',
    statusReturnApproved: 'Devolucion aprobada',
    statusReturnRejected: 'Devolucion rechazada',
  },
}

function formatDate(dateStr: string, lang: string) {
  return new Date(dateStr).toLocaleDateString(
    lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
}

function formatTimeRemaining(deadline: string): string {
  const remaining = new Date(deadline).getTime() - Date.now()
  if (remaining <= 0) return ''
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}min`
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Shipping modal
  const [showShipModal, setShowShipModal] = useState(false)
  const [proofFiles, setProofFiles] = useState<{ type: string; file: File | null }[]>([{ type: 'photo_package', file: null }])
  const [trackingNumber, setTrackingNumber] = useState('')
  const [uploading, setUploading] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)
  const proofFileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Other action states
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null)

  // Return request states
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [submittingReject, setSubmittingReject] = useState(false)
  const [approvingReturn, setApprovingReturn] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  const isSeller = user?.id === order?.seller_id
  const isBuyer = user?.id === order?.buyer_id

  const fetchOrder = useCallback(async () => {
    if (!user || !id || !session) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls, category, description), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username, avatar_url), seller_profile:profiles!orders_seller_id_fkey(display_name, username, avatar_url)')
        .eq('id', id)
        .single()

      if (err || !data) throw new Error(ct.notFound)

      // Check access
      if (data.buyer_id !== user.id && data.seller_id !== user.id) {
        throw new Error(ct.notFound)
      }

      // Fetch shipping proofs
      const { data: proofs } = await supabase
        .from('shipping_proofs')
        .select('type, url')
        .eq('order_id', id)

      setOrder({ ...data, proofs: proofs || [] } as OrderDetail)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : ct.error)
    } finally {
      setLoading(false)
    }
  }, [user, id, session, ct.notFound, ct.error])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  // Fetch proof level when opening ship modal
  const openShipModal = async () => {
    setShowShipModal(true)
    setShipError(null)
    if (!session) return
    try {
      const res = await apiFetch(`/api/sellers/${user!.id}/trust`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const level = data.proof_level || 'basic'
        if (level === 'basic') {
          setProofFiles([{ type: 'photo_package', file: null }])
        } else if (level === 'standard') {
          setProofFiles([{ type: 'photo_package', file: null }, { type: 'photo_content', file: null }])
        } else {
          setProofFiles([{ type: 'photo_package', file: null }, { type: 'photo_content', file: null }, { type: 'video_packing', file: null }])
        }
      }
    } catch { /* use default */ }
  }

  const handleShipOrder = async () => {
    if (!order || !session) return
    const firstProof = proofFiles[0]
    if (!firstProof?.file) { setShipError(ct.photoRequired); return }

    setUploading(true)
    setShipError(null)
    try {
      const proofs: { type: string; url: string }[] = []
      let firstProofUrl = ''

      for (const proof of proofFiles) {
        if (!proof.file) continue
        const ext = proof.type === 'video_packing' ? 'mp4' : 'jpg'
        const filePath = `shipping-proofs/${order.id}_${proof.type}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('shipping-proofs')
          .upload(filePath, proof.file)
        if (uploadError) throw new Error(uploadError.message)

        const { data: urlData } = supabase.storage
          .from('shipping-proofs')
          .getPublicUrl(filePath)

        proofs.push({ type: proof.type, url: urlData.publicUrl })
        if (proof.type === 'photo_package') firstProofUrl = urlData.publicUrl
      }

      const res = await apiFetch(`/api/orders/${order.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          shipping_proof_url: firstProofUrl,
          proofs,
          ...(trackingNumber.trim() ? { tracking_number: trackingNumber.trim() } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }

      setShowShipModal(false)
      setProofFiles([{ type: 'photo_package', file: null }])
      setTrackingNumber('')
      fetchOrder()
    } catch (err: unknown) {
      setShipError(err instanceof Error ? err.message : ct.error)
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!order || !session) return
    setConfirmingDelivery(true)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      fetchOrder()
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err)
    } finally {
      setConfirmingDelivery(false)
    }
  }

  const handleContact = async () => {
    if (!order || !session) return
    try {
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
  }

  const handleRequestReturn = async () => {
    if (!order || !session || !returnReason.trim()) return
    setSubmittingReturn(true)
    setReturnError(null)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/request-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reason: returnReason.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      setShowReturnModal(false)
      setReturnReason('')
      fetchOrder()
    } catch (err: unknown) {
      setReturnError(err instanceof Error ? err.message : ct.error)
    } finally {
      setSubmittingReturn(false)
    }
  }

  const handleApproveReturn = async () => {
    if (!order || !session) return
    setApprovingReturn(true)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/approve-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      fetchOrder()
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err)
    } finally {
      setApprovingReturn(false)
    }
  }

  const handleRejectReturn = async () => {
    if (!order || !session) return
    setSubmittingReject(true)
    try {
      const res = await apiFetch(`/api/orders/${order.id}/reject-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      setShowRejectModal(false)
      setRejectReason('')
      fetchOrder()
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err)
    } finally {
      setSubmittingReject(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return '#F59E0B'
      case 'paid': return '#3B82F6'
      case 'shipped': return '#10B981'
      case 'delivered': return '#10B981'
      case 'refunded': return '#8B5CF6'
      case 'disputed': return '#E8344E'
      case 'return_requested': return '#F59E0B'
      case 'return_approved': return '#8B5CF6'
      case 'return_rejected': return '#E8344E'
      default: return '#666'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return ct.statusPendingPayment
      case 'paid': return ct.statusPaid
      case 'shipped': return ct.statusShipped
      case 'delivered': return ct.statusDelivered
      case 'refunded': return ct.statusRefunded
      case 'disputed': return ct.statusDisputed
      case 'return_requested': return ct.statusReturnRequested
      case 'return_approved': return ct.statusReturnApproved
      case 'return_rejected': return ct.statusReturnRejected
      default: return status
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #222', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
        <p style={{ color: '#666', fontSize: '14px' }}>{ct.loading}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    const retryLabel: Record<string, string> = { fr: 'Reessayer', en: 'Retry', he: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1', es: 'Reintentar' }
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <p style={{ color: '#E8344E', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{error || ct.notFound}</p>
        <button
          onClick={fetchOrder}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#E8344E', fontSize: '14px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {retryLabel[lang] || retryLabel.fr}
        </button>
        <button onClick={() => navigate(-1)} style={{ color: '#F0908A', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' }}>{ct.back}</button>
      </div>
    )
  }

  if (showLabel && order.shipping_address) {
    return (
      <ShippingLabel
        sellerName={order.seller_profile?.display_name || ''}
        sellerAddress=""
        buyerName={order.shipping_address.name || order.buyer_profile?.display_name || ''}
        buyerAddress={`${order.shipping_address.street || ''}\n${order.shipping_address.zip || ''} ${order.shipping_address.city || ''}`}
        buyerPhone={order.shipping_address.phone || ''}
        orderRef={`#${order.id.slice(0, 8)}`}
        lotRef={order.item?.title || ''}
        onClose={() => setShowLabel(false)}
      />
    )
  }

  const statusColor = getStatusColor(order.status)
  const itemImage = order.item?.image_urls?.[0]

  const timelineEvents = [
    { label: ct.createdAt, date: order.created_at, color: '#666', done: true },
    { label: ct.paidAt, date: order.paid_at, color: '#3B82F6', done: !!order.paid_at },
    { label: ct.shippedAt, date: order.shipped_at, color: '#10B981', done: !!order.shipped_at },
    { label: ct.deliveredAt, date: order.delivered_at, color: '#10B981', done: !!order.delivered_at },
  ]

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderBottom: '1px solid #111',
          backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: '#999', fontSize: '24px', cursor: 'pointer', padding: '4px',
          }}>
            &#8249;
          </button>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {ct.orderDetail}
          </h1>
        </div>

        {/* Item hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: '1px solid #111' }}>
          {itemImage ? (
            <img src={itemImage} alt="" style={{ width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '14px', backgroundColor: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {isSeller ? '\uD83D\uDCB0' : '\uD83D\uDECD\uFE0F'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.item?.title || `#${order.id.slice(0, 8)}`}
            </p>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#F0908A', margin: '0 0 6px' }}>
              {order.amount.toFixed(2)} \u20AC
            </p>
            <span style={{
              display: 'inline-block', fontSize: '11px', fontWeight: 700,
              color: statusColor, backgroundColor: `${statusColor}14`,
              padding: '4px 12px', borderRadius: '10px', border: `1px solid ${statusColor}30`,
            }}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Participant info */}
        <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            {isSeller ? (
              <>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                }}>
                  {order.buyer_profile?.avatar_url ? (
                    <img src={order.buyer_profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '14px', color: '#666', fontWeight: 700 }}>{(order.buyer_profile?.display_name || '?')[0]}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.buyer}</p>
                  <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: 0 }}>{order.buyer_profile?.display_name || '—'}</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                }}>
                  {order.seller_profile?.avatar_url ? (
                    <img src={order.seller_profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '14px', color: '#666', fontWeight: 700 }}>{(order.seller_profile?.display_name || '?')[0]}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.seller}</p>
                  <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: 0 }}>{order.seller_profile?.display_name || '—'}</p>
                </div>
              </>
            )}
          </div>

          {/* Financial breakdown for seller */}
          {isSeller && (
            <div style={{ backgroundColor: '#0D0D0D', borderRadius: '12px', padding: '12px', border: '1px solid #1A1A1A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{ct.amount}</span>
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{order.amount.toFixed(2)} \u20AC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{ct.platformFee}</span>
                <span style={{ fontSize: '12px', color: '#E8344E', fontWeight: 600 }}>-{order.platform_fee.toFixed(2)} \u20AC</span>
              </div>
              <div style={{ borderTop: '1px solid #222', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700 }}>{ct.sellerPayout}</span>
                <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 700 }}>{order.seller_payout.toFixed(2)} \u20AC</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {ct.timeline}
          </p>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: '7px', top: '4px', bottom: '4px',
              width: '2px', backgroundColor: '#222',
            }} />
            {timelineEvents.map((evt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < timelineEvents.length - 1 ? '16px' : 0, position: 'relative' }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: '-20px', top: '2px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: evt.done ? evt.color : '#222',
                  border: evt.done ? 'none' : '2px solid #333',
                  zIndex: 1,
                }} />
                <div>
                  <p style={{ fontSize: '13px', color: evt.done ? '#fff' : '#444', fontWeight: 600, margin: 0 }}>
                    {evt.label}
                  </p>
                  {evt.date && (
                    <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>
                      {formatDate(evt.date, lang)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {ct.shippingAddress}
            </p>
            <div style={{ backgroundColor: '#0D0D0D', borderRadius: '12px', padding: '12px', border: '1px solid #1A1A1A' }}>
              <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: 0 }}>{order.shipping_address.name}</p>
              <p style={{ fontSize: '13px', color: '#999', margin: '4px 0 0' }}>{order.shipping_address.street}</p>
              <p style={{ fontSize: '13px', color: '#999', margin: '2px 0 0' }}>{order.shipping_address.zip} {order.shipping_address.city}</p>
              {order.shipping_address.phone && (
                <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>Tel: {order.shipping_address.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Tracking number */}
        {order.tracking_number && (
          <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {ct.tracking}
            </p>
            <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{order.tracking_number}</p>
          </div>
        )}

        {/* Shipping proofs */}
        {order.proofs && order.proofs.length > 0 && (
          <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {ct.proofPhotos}
            </p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {order.proofs.map((proof, i) => (
                <img
                  key={i}
                  src={proof.url}
                  alt={proof.type}
                  onClick={() => setProofImageUrl(proof.url)}
                  style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #222', flexShrink: 0 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Seller: Ship button */}
          {isSeller && order.status === 'paid' && (
            <button
              onClick={openShipModal}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {ct.shipOrder}
            </button>
          )}

          {/* Seller: Print label */}
          {isSeller && ['paid', 'shipped'].includes(order.status) && order.shipping_address && (
            <button
              onClick={() => setShowLabel(true)}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'transparent', border: '1px solid #333',
                color: '#aaa', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {ct.printLabel}
            </button>
          )}

          {/* Buyer: Confirm delivery */}
          {isBuyer && order.status === 'shipped' && (
            <button
              onClick={handleConfirmDelivery}
              disabled={confirmingDelivery}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: confirmingDelivery ? '#333' : 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: confirmingDelivery ? 'default' : 'pointer',
              }}
            >
              {confirmingDelivery ? ct.confirming : ct.confirmDelivery}
            </button>
          )}

          {/* Buyer: Report problem */}
          {isBuyer && order.status === 'delivered' && order.claim_deadline && new Date(order.claim_deadline) > new Date() && (
            <button
              onClick={() => navigate(`/dispute/${order.id}`)}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #F97316, #E8344E)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {ct.reportProblem}
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, opacity: 0.8, marginTop: '2px' }}>
                {formatTimeRemaining(order.claim_deadline)} {ct.timeRemaining}
              </span>
            </button>
          )}

          {/* Buyer: Request return */}
          {isBuyer && (order.status === 'delivered' || order.status === 'shipped') && (
            <button
              onClick={() => { setShowReturnModal(true); setReturnError(null) }}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {ct.requestReturn}
            </button>
          )}

          {/* Buyer: Return pending indicator */}
          {isBuyer && order.status === 'return_requested' && (
            <div style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: '#1A1A1A', border: '1px solid #F59E0B30',
              color: '#F59E0B', fontSize: '14px', fontWeight: 600, textAlign: 'center',
              boxSizing: 'border-box',
            }}>
              {ct.returnPending}
            </div>
          )}

          {/* Seller: Approve / Reject return */}
          {isSeller && order.status === 'return_requested' && (
            <>
              <button
                onClick={handleApproveReturn}
                disabled={approvingReturn}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  background: approvingReturn ? '#333' : 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: approvingReturn ? 'default' : 'pointer',
                }}
              >
                {approvingReturn ? ct.submitting : ct.approveReturn}
              </button>
              <button
                onClick={() => { setShowRejectModal(true); setRejectReason('') }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #E8344E, #B91C1C)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {ct.rejectReturn}
              </button>
            </>
          )}

          {/* Contact button */}
          {['paid', 'shipped', 'delivered', 'return_requested'].includes(order.status) && (
            <button
              onClick={handleContact}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'transparent', border: '1px solid #333',
                color: '#aaa', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {'\uD83D\uDCAC'} {isSeller ? ct.contactBuyer : ct.contactSeller}
            </button>
          )}
        </div>
      </div>

      {/* Ship modal */}
      {showShipModal && (
        <div
          onClick={() => setShowShipModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px', border: '1px solid #222' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
              {ct.shipOrder}
            </h3>

            {proofFiles.map((proof, idx) => {
              const proofLabel = proof.type === 'photo_package' ? ct.packagePhoto : proof.type === 'photo_content' ? ct.contentPhoto : ct.packingVideo
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
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    {proof.file ? proof.file.name : ct.addPhoto}
                  </button>
                  {proof.file && !isVideo && (
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <img src={URL.createObjectURL(proof.file)} alt="" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '10px', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
              )
            })}

            <input
              type="text"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder={ct.trackingPlaceholder}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #222', backgroundColor: '#0A0A0A', color: '#fff', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
            />

            {shipError && (
              <p style={{ color: '#E8344E', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>{shipError}</p>
            )}

            <button
              onClick={handleShipOrder}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: uploading ? '#333' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: uploading ? 'default' : 'pointer',
              }}
            >
              {uploading ? ct.uploading : ct.confirmShipment}
            </button>

            <button
              onClick={() => setShowShipModal(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
            >
              {ct.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Return request modal (buyer) */}
      {showReturnModal && (
        <div
          onClick={() => setShowReturnModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px', border: '1px solid #222' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
              {ct.requestReturn}
            </h3>

            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: 600 }}>
              {ct.returnReason}
            </p>
            <textarea
              value={returnReason}
              onChange={e => setReturnReason(e.target.value.slice(0, 500))}
              placeholder={ct.returnReasonPlaceholder}
              rows={4}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #222',
                backgroundColor: '#0A0A0A', color: '#fff', fontSize: '14px', marginBottom: '16px',
                boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
              }}
            />

            {returnError && (
              <p style={{ color: '#E8344E', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>{returnError}</p>
            )}

            <button
              onClick={handleRequestReturn}
              disabled={submittingReturn || !returnReason.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: submittingReturn || !returnReason.trim() ? '#333' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: submittingReturn || !returnReason.trim() ? 'default' : 'pointer',
              }}
            >
              {submittingReturn ? ct.submitting : ct.submitReturn}
            </button>

            <button
              onClick={() => setShowReturnModal(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
            >
              {ct.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Reject return modal (seller) */}
      {showRejectModal && (
        <div
          onClick={() => setShowRejectModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px', border: '1px solid #222' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
              {ct.rejectReturn}
            </h3>

            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: 600 }}>
              {ct.rejectReason}
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value.slice(0, 500))}
              placeholder={ct.rejectReasonPlaceholder}
              rows={4}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #222',
                backgroundColor: '#0A0A0A', color: '#fff', fontSize: '14px', marginBottom: '16px',
                boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
              }}
            />

            <button
              onClick={handleRejectReturn}
              disabled={submittingReject}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: submittingReject ? '#333' : 'linear-gradient(135deg, #E8344E, #B91C1C)',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: submittingReject ? 'default' : 'pointer',
              }}
            >
              {submittingReject ? ct.submitting : ct.confirmReject}
            </button>

            <button
              onClick={() => setShowRejectModal(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
            >
              {ct.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Proof viewer */}
      {proofImageUrl && (
        <div
          onClick={() => setProofImageUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <button
            onClick={() => setProofImageUrl(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
          >
            X
          </button>
          <img src={proofImageUrl} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

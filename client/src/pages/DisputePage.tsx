import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Order, Dispute } from '../types/database'

interface OrderWithItem extends Order {
  item?: { title: string; image_urls: string[]; category: string }
}

const pageContent = {
  fr: {
    // Header
    dispute: 'Litige',
    open_dispute: 'Ouvrir un litige',
    // Reason options
    reason_not_received: 'Non reçu',
    reason_wrong_item: 'Mauvais article',
    reason_damaged: 'Endommagé',
    reason_not_as_described: 'Non conforme à la description',
    reason_counterfeit: 'Contrefaçon',
    // Status labels
    status_open: 'Ouvert',
    status_under_review: 'En cours d\'examen',
    status_resolved_buyer: 'Résolu (remboursé)',
    status_resolved_seller: 'Résolu (rejeté)',
    status_escalated: 'Escaladé',
    // Loading / errors
    loading: 'Chargement...',
    back: 'Retour',
    error_order_not_found: 'Commande introuvable',
    error_unknown: 'Erreur inconnue',
    error_not_authenticated: 'Non authentifié',
    error_upload: 'Erreur d\'upload',
    error_submit_failed: 'Échec de la soumission du litige',
    // Success
    dispute_submitted_success: 'Litige soumis avec succès',
    dispute_submitted_desc: 'Nous examinerons votre demande dans les plus brefs délais.',
    // Order context
    related_order: 'Commande concernée',
    article: 'Article',
    // Seller return policy
    seller_return_policy: 'Politique de retour du vendeur',
    policy_no_return: 'Aucun retour',
    policy_exchange_only: 'Échanges uniquement',
    policy_return_7: 'Retours sous 7 jours',
    policy_return_14: 'Retours sous 14 jours',
    policy_return_30: 'Retours sous 30 jours',
    policy_no_return_notice: 'Ce vendeur n\'accepte pas les retours. Vous pouvez tout de même contester si l\'article est non conforme ou contrefait.',
    // Dispute status card
    dispute_status: 'Statut du litige',
    reason_label: 'Motif',
    description_label: 'Description',
    amount_label: 'Montant',
    opened_at: 'Ouvert le',
    resolved_at: 'Résolu le',
    resolution_note: 'Note de résolution',
    auto_refund_approved: 'Remboursement automatique approuvé',
    evidence_provided: 'Preuves fournies',
    evidence_alt: 'Preuve',
    // Form
    dispute_reason: 'Motif du litige',
    description_form_label: 'Description',
    description_placeholder: 'Décrivez le problème en détail (minimum 20 caractères)',
    chars_minimum: 'caractères minimum',
    evidence_label: 'Preuves (photos/vidéos, max 5)',
    add_file: 'Ajouter un fichier',
    submitting: 'Envoi en cours...',
    submit_dispute: 'Soumettre le litige',
    date_locale: 'fr-FR',
  },
  en: {
    dispute: 'Dispute',
    open_dispute: 'Open a dispute',
    reason_not_received: 'Not received',
    reason_wrong_item: 'Wrong item',
    reason_damaged: 'Damaged',
    reason_not_as_described: 'Not as described',
    reason_counterfeit: 'Counterfeit',
    status_open: 'Open',
    status_under_review: 'Under review',
    status_resolved_buyer: 'Resolved (refunded)',
    status_resolved_seller: 'Resolved (rejected)',
    status_escalated: 'Escalated',
    loading: 'Loading...',
    back: 'Back',
    error_order_not_found: 'Order not found',
    error_unknown: 'Unknown error',
    error_not_authenticated: 'Not authenticated',
    error_upload: 'Upload error',
    error_submit_failed: 'Failed to submit dispute',
    dispute_submitted_success: 'Dispute submitted successfully',
    dispute_submitted_desc: 'We will review your request as soon as possible.',
    related_order: 'Related order',
    article: 'Item',
    seller_return_policy: 'Seller return policy',
    policy_no_return: 'No returns',
    policy_exchange_only: 'Exchanges only',
    policy_return_7: 'Returns within 7 days',
    policy_return_14: 'Returns within 14 days',
    policy_return_30: 'Returns within 30 days',
    policy_no_return_notice: 'This seller does not accept returns. You can still dispute if the item is not as described or counterfeit.',
    dispute_status: 'Dispute status',
    reason_label: 'Reason',
    description_label: 'Description',
    amount_label: 'Amount',
    opened_at: 'Opened on',
    resolved_at: 'Resolved on',
    resolution_note: 'Resolution note',
    auto_refund_approved: 'Automatic refund approved',
    evidence_provided: 'Evidence provided',
    evidence_alt: 'Evidence',
    dispute_reason: 'Dispute reason',
    description_form_label: 'Description',
    description_placeholder: 'Describe the issue in detail (minimum 20 characters)',
    chars_minimum: 'characters minimum',
    evidence_label: 'Evidence (photos/videos, max 5)',
    add_file: 'Add a file',
    submitting: 'Submitting...',
    submit_dispute: 'Submit dispute',
    date_locale: 'en-US',
  },
  he: {
    dispute: '\u05E1\u05DB\u05E1\u05D5\u05DA',
    open_dispute: '\u05E4\u05EA\u05D9\u05D7\u05EA \u05E1\u05DB\u05E1\u05D5\u05DA',
    reason_not_received: '\u05DC\u05D0 \u05D4\u05EA\u05E7\u05D1\u05DC',
    reason_wrong_item: '\u05E4\u05E8\u05D9\u05D8 \u05E9\u05D2\u05D5\u05D9',
    reason_damaged: '\u05E4\u05D2\u05D5\u05DD',
    reason_not_as_described: '\u05DC\u05D0 \u05EA\u05D5\u05D0\u05DD \u05DC\u05EA\u05D9\u05D0\u05D5\u05E8',
    reason_counterfeit: '\u05DE\u05D6\u05D5\u05D9\u05E3',
    status_open: '\u05E4\u05EA\u05D5\u05D7',
    status_under_review: '\u05D1\u05D1\u05D3\u05D9\u05E7\u05D4',
    status_resolved_buyer: '\u05E0\u05E4\u05EA\u05E8 (\u05D4\u05D5\u05D7\u05D6\u05E8)',
    status_resolved_seller: '\u05E0\u05E4\u05EA\u05E8 (\u05E0\u05D3\u05D7\u05D4)',
    status_escalated: '\u05D4\u05D5\u05E2\u05DC\u05D4',
    loading: '\u05D8\u05D5\u05E2\u05DF...',
    back: '\u05D7\u05D6\u05E8\u05D4',
    error_order_not_found: '\u05D4\u05D6\u05DE\u05E0\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4',
    error_unknown: '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2\u05D4',
    error_not_authenticated: '\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8',
    error_upload: '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D4\u05E2\u05DC\u05D0\u05D4',
    error_submit_failed: '\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05E1\u05DB\u05E1\u05D5\u05DA \u05E0\u05DB\u05E9\u05DC\u05D4',
    dispute_submitted_success: '\u05D4\u05E1\u05DB\u05E1\u05D5\u05DA \u05E0\u05E9\u05DC\u05D7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4',
    dispute_submitted_desc: '\u05E0\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D1\u05E7\u05E9\u05EA\u05DA \u05D1\u05D4\u05E7\u05D3\u05DD \u05D4\u05D0\u05E4\u05E9\u05E8\u05D9.',
    related_order: '\u05D4\u05D6\u05DE\u05E0\u05D4 \u05E7\u05E9\u05D5\u05E8\u05D4',
    article: '\u05E4\u05E8\u05D9\u05D8',
    seller_return_policy: '\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05D7\u05D6\u05E8\u05D4 \u05E9\u05DC \u05D4\u05DE\u05D5\u05DB\u05E8',
    policy_no_return: '\u05DC\u05DC\u05D0 \u05D4\u05D7\u05D6\u05E8\u05D5\u05EA',
    policy_exchange_only: '\u05D4\u05D7\u05DC\u05E4\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3',
    policy_return_7: '\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA \u05EA\u05D5\u05DA 7 \u05D9\u05DE\u05D9\u05DD',
    policy_return_14: '\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA \u05EA\u05D5\u05DA 14 \u05D9\u05DE\u05D9\u05DD',
    policy_return_30: '\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA \u05EA\u05D5\u05DA 30 \u05D9\u05DE\u05D9\u05DD',
    policy_no_return_notice: '\u05DE\u05D5\u05DB\u05E8 \u05D6\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05DE\u05E7\u05D1\u05DC \u05D4\u05D7\u05D6\u05E8\u05D5\u05EA. \u05E2\u05D3\u05D9\u05D9\u05DF \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05E8\u05E2\u05E8 \u05D0\u05DD \u05D4\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05EA\u05D5\u05D0\u05DD \u05DC\u05EA\u05D9\u05D0\u05D5\u05E8 \u05D0\u05D5 \u05DE\u05D6\u05D5\u05D9\u05E3.',
    dispute_status: '\u05E1\u05D8\u05D8\u05D5\u05E1 \u05D4\u05E1\u05DB\u05E1\u05D5\u05DA',
    reason_label: '\u05E1\u05D9\u05D1\u05D4',
    description_label: '\u05EA\u05D9\u05D0\u05D5\u05E8',
    amount_label: '\u05E1\u05DB\u05D5\u05DD',
    opened_at: '\u05E0\u05E4\u05EA\u05D7 \u05D1\u05EA\u05D0\u05E8\u05D9\u05DA',
    resolved_at: '\u05E0\u05E4\u05EA\u05E8 \u05D1\u05EA\u05D0\u05E8\u05D9\u05DA',
    resolution_note: '\u05D4\u05E2\u05E8\u05EA \u05E4\u05EA\u05E8\u05D5\u05DF',
    auto_refund_approved: '\u05D4\u05D7\u05D6\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05D0\u05D5\u05E9\u05E8',
    evidence_provided: '\u05E8\u05D0\u05D9\u05D5\u05EA \u05E9\u05E1\u05D5\u05E4\u05E7\u05D5',
    evidence_alt: '\u05E8\u05D0\u05D9\u05D4',
    dispute_reason: '\u05E1\u05D9\u05D1\u05EA \u05D4\u05E1\u05DB\u05E1\u05D5\u05DA',
    description_form_label: '\u05EA\u05D9\u05D0\u05D5\u05E8',
    description_placeholder: '\u05EA\u05D0\u05E8 \u05D0\u05EA \u05D4\u05D1\u05E2\u05D9\u05D4 \u05D1\u05E4\u05D9\u05E8\u05D5\u05D8 (\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD 20 \u05EA\u05D5\u05D5\u05D9\u05DD)',
    chars_minimum: '\u05EA\u05D5\u05D5\u05D9\u05DD \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD',
    evidence_label: '\u05E8\u05D0\u05D9\u05D5\u05EA (\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA/\u05E1\u05E8\u05D8\u05D5\u05E0\u05D9\u05DD, \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 5)',
    add_file: '\u05D4\u05D5\u05E1\u05E3 \u05E7\u05D5\u05D1\u05E5',
    submitting: '\u05E9\u05D5\u05DC\u05D7...',
    submit_dispute: '\u05E9\u05DC\u05D7 \u05E1\u05DB\u05E1\u05D5\u05DA',
    date_locale: 'he-IL',
  },
  es: {
    dispute: 'Disputa',
    open_dispute: 'Abrir una disputa',
    reason_not_received: 'No recibido',
    reason_wrong_item: 'Art\u00edculo incorrecto',
    reason_damaged: 'Da\u00f1ado',
    reason_not_as_described: 'No conforme a la descripci\u00f3n',
    reason_counterfeit: 'Falsificaci\u00f3n',
    status_open: 'Abierto',
    status_under_review: 'En revisi\u00f3n',
    status_resolved_buyer: 'Resuelto (reembolsado)',
    status_resolved_seller: 'Resuelto (rechazado)',
    status_escalated: 'Escalado',
    loading: 'Cargando...',
    back: 'Volver',
    error_order_not_found: 'Pedido no encontrado',
    error_unknown: 'Error desconocido',
    error_not_authenticated: 'No autenticado',
    error_upload: 'Error de carga',
    error_submit_failed: 'Error al enviar la disputa',
    dispute_submitted_success: 'Disputa enviada con \u00e9xito',
    dispute_submitted_desc: 'Revisaremos su solicitud lo antes posible.',
    related_order: 'Pedido relacionado',
    article: 'Art\u00edculo',
    seller_return_policy: 'Pol\u00edtica de devoluci\u00f3n del vendedor',
    policy_no_return: 'Sin devoluciones',
    policy_exchange_only: 'Solo cambios',
    policy_return_7: 'Devoluciones en 7 d\u00edas',
    policy_return_14: 'Devoluciones en 14 d\u00edas',
    policy_return_30: 'Devoluciones en 30 d\u00edas',
    policy_no_return_notice: 'Este vendedor no acepta devoluciones. A\u00fan puede disputar si el art\u00edculo no es conforme o es falsificado.',
    dispute_status: 'Estado de la disputa',
    reason_label: 'Motivo',
    description_label: 'Descripci\u00f3n',
    amount_label: 'Monto',
    opened_at: 'Abierto el',
    resolved_at: 'Resuelto el',
    resolution_note: 'Nota de resoluci\u00f3n',
    auto_refund_approved: 'Reembolso autom\u00e1tico aprobado',
    evidence_provided: 'Pruebas proporcionadas',
    evidence_alt: 'Prueba',
    dispute_reason: 'Motivo de la disputa',
    description_form_label: 'Descripci\u00f3n',
    description_placeholder: 'Describa el problema en detalle (m\u00ednimo 20 caracteres)',
    chars_minimum: 'caracteres m\u00ednimo',
    evidence_label: 'Pruebas (fotos/v\u00eddeos, m\u00e1x. 5)',
    add_file: 'A\u00f1adir un archivo',
    submitting: 'Enviando...',
    submit_dispute: 'Enviar disputa',
    date_locale: 'es-ES',
  },
}

type Lang = keyof typeof pageContent

const REASON_KEYS = [
  { value: 'not_received', key: 'reason_not_received' },
  { value: 'wrong_item', key: 'reason_wrong_item' },
  { value: 'damaged', key: 'reason_damaged' },
  { value: 'not_as_described', key: 'reason_not_as_described' },
  { value: 'counterfeit', key: 'reason_counterfeit' },
] as const

const STATUS_KEYS: Record<string, string> = {
  open: 'status_open',
  under_review: 'status_under_review',
  resolved_buyer: 'status_resolved_buyer',
  resolved_seller: 'status_resolved_seller',
  escalated: 'status_escalated',
}

const POLICY_KEYS: Record<string, string> = {
  no_return: 'policy_no_return',
  exchange_only: 'policy_exchange_only',
  return_7: 'policy_return_7',
  return_14: 'policy_return_14',
  return_30: 'policy_return_30',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#2a2a1a', text: '#facc15' },
  under_review: { bg: '#2a1f0a', text: '#f97316' },
  resolved_buyer: { bg: '#1a2a1a', text: '#4ade80' },
  resolved_seller: { bg: '#2a1a1a', text: '#f87171' },
  escalated: { bg: '#1a1a2a', text: '#a78bfa' },
}

export default function DisputePage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr

  // Order data
  const [order, setOrder] = useState<OrderWithItem | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Existing dispute
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null)
  const [checkingDispute, setCheckingDispute] = useState(true)

  // Form state
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [, setUploadedUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Seller return policy
  const [sellerReturnPolicy, setSellerReturnPolicy] = useState<string | null>(null)

  // Success state
  const [submitted, setSubmitted] = useState(false)
  const [submittedDispute, setSubmittedDispute] = useState<Dispute | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // Fetch order details
  useEffect(() => {
    if (!user || !orderId) return
    const fetchOrder = async () => {
      setLoadingOrder(true)
      setOrderError(null)
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, item:items(title, image_urls, category)')
          .eq('id', orderId)
          .single()

        if (error) throw error
        if (!data) throw new Error(ct.error_order_not_found)
        setOrder(data as OrderWithItem)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : ct.error_unknown
        setOrderError(message)
      } finally {
        setLoadingOrder(false)
      }
    }
    fetchOrder()
  }, [user, orderId])

  // Fetch seller return policy
  useEffect(() => {
    if (!order) return
    const fetchPolicy = async () => {
      const { data } = await supabase
        .from('sellers')
        .select('return_policy')
        .eq('id', order.seller_id)
        .single()
      if (data?.return_policy) {
        setSellerReturnPolicy(data.return_policy)
      }
    }
    fetchPolicy()
  }, [order])

  // Check if dispute already exists
  useEffect(() => {
    if (!user || !orderId) return
    const checkDispute = async () => {
      setCheckingDispute(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await apiFetch(`/api/disputes/order/${orderId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          if (data && data.id) {
            setExistingDispute(data)
          }
        }
        // 404 means no dispute exists — that's fine
      } catch {
        // No existing dispute
      } finally {
        setCheckingDispute(false)
      }
    }
    checkDispute()
  }, [user, orderId])

  // File size error translations
  const fileSizeErrorMessages: Record<Lang, string> = {
    fr: 'Le fichier dépasse la taille maximale de 5 Mo',
    en: 'File exceeds the maximum size of 5 MB',
    he: 'הקובץ חורג מהגודל המרבי של 5 מ"ב',
    es: 'El archivo supera el tamaño máximo de 5 MB',
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

    const candidates = Array.from(selected).slice(0, 5 - files.length)

    // Validate file sizes before proceeding
    for (const file of candidates) {
      if (file.size > MAX_FILE_SIZE) {
        setSubmitError(fileSizeErrorMessages[lang] || fileSizeErrorMessages.fr)
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
    }

    // Clear any previous size error
    setSubmitError(null)

    const updatedFiles = [...files, ...candidates]
    setFiles(updatedFiles)

    // Generate previews
    candidates.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPreviews(prev => [...prev, ev.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove a file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Submit dispute
  const handleSubmit = async () => {
    if (!reason || description.trim().length < 20 || !orderId || !order) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(ct.error_not_authenticated)

      // Upload evidence files to Supabase Storage
      const urls: string[] = []
      for (const file of files) {
        const filePath = `${orderId}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('dispute-evidence')
          .upload(filePath, file)

        if (uploadError) throw new Error(`${ct.error_upload}: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(filePath)

        urls.push(urlData.publicUrl)
      }
      setUploadedUrls(urls)

      // Submit dispute via API
      const res = await apiFetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          reason,
          description: description.trim(),
          evidence_urls: urls,
          amount: order.amount,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || ct.error_submit_failed)
      }

      const disputeData = await res.json()
      setSubmittedDispute(disputeData)
      setSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ct.error_unknown
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to get translated status label
  const getStatusLabel = (status: string) => {
    const key = STATUS_KEYS[status]
    return key ? (ct as Record<string, string>)[key] || status : status
  }

  // Helper to get translated reason label
  const getReasonLabel = (reasonValue: string) => {
    const found = REASON_KEYS.find(r => r.value === reasonValue)
    return found ? (ct as Record<string, string>)[found.key] || reasonValue : reasonValue
  }

  // Helper to get translated policy label
  const getPolicyLabel = (policy: string) => {
    const key = POLICY_KEYS[policy]
    return key ? (ct as Record<string, string>)[key] || policy : policy
  }

  if (!user) return null

  // Loading state
  if (loadingOrder || checkingDispute) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: '15px' }}>{ct.loading}</p>
      </div>
    )
  }

  // Order error
  if (orderError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <p style={{ color: '#f87171', fontSize: '15px', marginBottom: '16px' }}>{orderError}</p>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '12px 24px', backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          {ct.back}
        </button>
      </div>
    )
  }

  // Render dispute status view (for existing or just-submitted dispute)
  const renderDisputeStatus = (dispute: Dispute) => {
    const statusColor = STATUS_COLORS[dispute.status] || { bg: '#1A1A1A', text: '#888' }

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/activity', { state: { tab: 'purchases' } })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{ct.dispute}</h1>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Success message for just-submitted */}
          {submitted && (
            <div style={{ backgroundColor: '#1a2a1a', border: '1px solid #2a3a2a', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1a3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#4ade80' }}>{ct.dispute_submitted_success}</p>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{ct.dispute_submitted_desc}</p>
              </div>
            </div>
          )}

          {/* Order context card */}
          {order && (
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.related_order}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {order.item?.image_urls?.[0] && (
                  <img
                    src={order.item.image_urls[0]}
                    alt={order.item.title}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{order.item?.title || ct.article}</p>
                  <p style={{ fontSize: '14px', color: '#F0908A', fontWeight: 600 }}>{order.amount.toFixed(2)} EUR</p>
                </div>
              </div>
            </div>
          )}

          {/* Seller return policy badge */}
          {sellerReturnPolicy && (
            <div style={{
              backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px',
            }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.seller_return_policy}</p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px',
                backgroundColor: sellerReturnPolicy === 'no_return' ? 'rgba(239,68,68,0.1)' : sellerReturnPolicy === 'exchange_only' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${sellerReturnPolicy === 'no_return' ? 'rgba(239,68,68,0.3)' : sellerReturnPolicy === 'exchange_only' ? 'rgba(249,115,22,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 600,
                  color: sellerReturnPolicy === 'no_return' ? '#f87171' : sellerReturnPolicy === 'exchange_only' ? '#fb923c' : '#4ade80',
                }}>
                  {getPolicyLabel(sellerReturnPolicy)}
                </span>
              </div>
            </div>
          )}

          {/* Dispute status card */}
          <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{ct.dispute_status}</p>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: statusColor.bg,
                color: statusColor.text,
              }}>
                {getStatusLabel(dispute.status)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.reason_label}</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>
                  {getReasonLabel(dispute.reason)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.description_label}</p>
                <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.5 }}>{dispute.description}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.amount_label}</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>{dispute.amount.toFixed(2)} EUR</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.opened_at}</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>{new Date(dispute.opened_at).toLocaleDateString(ct.date_locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {dispute.resolved_at && (
                <div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.resolved_at}</p>
                  <p style={{ fontSize: '14px', color: '#ccc' }}>{new Date(dispute.resolved_at).toLocaleDateString(ct.date_locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
              {dispute.resolution_note && (
                <div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{ct.resolution_note}</p>
                  <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.5 }}>{dispute.resolution_note}</p>
                </div>
              )}
            </div>

            {/* Auto-refund notice */}
            {dispute.auto_refund && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a2a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>{ct.auto_refund_approved}</p>
              </div>
            )}
          </div>

          {/* Evidence images */}
          {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>{ct.evidence_provided}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {dispute.evidence_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${ct.evidence_alt} ${i + 1}`}
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #222' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show existing dispute read-only view
  if (existingDispute) {
    return renderDisputeStatus(existingDispute)
  }

  // Show submitted dispute
  if (submitted && submittedDispute) {
    return renderDisputeStatus(submittedDispute)
  }

  // Dispute form
  const canSubmit = reason && description.trim().length >= 20 && !submitting

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/activity', { state: { tab: 'purchases' } })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{ct.open_dispute}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Order context card */}
        {order && (
          <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.related_order}</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {order.item?.image_urls?.[0] && (
                <img
                  src={order.item.image_urls[0]}
                  alt={order.item.title}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{order.item?.title || ct.article}</p>
                <p style={{ fontSize: '14px', color: '#F0908A', fontWeight: 600 }}>{order.amount.toFixed(2)} EUR</p>
              </div>
            </div>
          </div>
        )}

        {/* Seller return policy badge */}
        {sellerReturnPolicy && (
          <div style={{
            backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.seller_return_policy}</p>
            {(() => {
              const policyColors: Record<string, { bg: string; border: string; color: string }> = {
                no_return: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
                exchange_only: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
                return_7: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
                return_14: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
                return_30: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
              }
              const label = getPolicyLabel(sellerReturnPolicy)
              const colors = policyColors[sellerReturnPolicy] || policyColors.no_return
              return (
                <>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '8px',
                    backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.color }}>{label}</span>
                  </div>
                  {sellerReturnPolicy === 'no_return' && (
                    <p style={{ fontSize: '12px', color: '#f97316', marginTop: '8px', lineHeight: 1.5 }}>
                      {ct.policy_no_return_notice}
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Reason select */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
            {ct.dispute_reason}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {REASON_KEYS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setReason(opt.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: reason === opt.value ? '#F0908A' : '#1A1A1A',
                  color: reason === opt.value ? '#fff' : '#aaa',
                  border: reason === opt.value ? '1px solid #F0908A' : '1px solid #333',
                }}
              >
                {(ct as Record<string, string>)[opt.key]}
              </button>
            ))}
          </div>
        </div>

        {/* Description textarea */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
            {ct.description_form_label}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={ct.description_placeholder}
            rows={5}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#111',
              border: '1px solid #222',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '12px', color: description.trim().length >= 20 ? '#666' : '#f97316', marginTop: '4px' }}>
            {description.trim().length}/20 {ct.chars_minimum}
          </p>
        </div>

        {/* Evidence upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
            {ct.evidence_label}
          </label>

          {/* Preview thumbnails */}
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {previews.map((preview, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`${ct.evidence_alt} ${i + 1}`}
                    style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #333' }}
                  />
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#E8344E',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px 20px',
                backgroundColor: '#1A1A1A',
                color: '#aaa',
                border: '1px dashed #333',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,8 12,3 7,8" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ct.add_file} ({files.length}/5)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error message */}
        {submitError && (
          <p style={{ fontSize: '13px', color: '#E8344E', marginBottom: '16px' }}>{submitError}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: canSubmit ? '#F0908A' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'default',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? ct.submitting : ct.submit_dispute}
        </button>
      </div>
    </div>
  )
}

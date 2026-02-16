import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import type { Order, Dispute } from '../types/database'

interface OrderWithItem extends Order {
  item?: { title: string; image_urls: string[]; category: string }
}

const REASON_OPTIONS = [
  { value: 'not_received', label: 'Non reçu' },
  { value: 'wrong_item', label: 'Mauvais article' },
  { value: 'damaged', label: 'Endommagé' },
  { value: 'not_as_described', label: 'Non conforme à la description' },
  { value: 'counterfeit', label: 'Contrefaçon' },
] as const

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  under_review: 'En cours d\'examen',
  resolved_buyer: 'Résolu (remboursé)',
  resolved_seller: 'Résolu (rejeté)',
  escalated: 'Escaladé',
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
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
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
        if (!data) throw new Error('Commande introuvable')
        setOrder(data as OrderWithItem)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const newFiles = Array.from(selected).slice(0, 5 - files.length)
    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)

    // Generate previews
    newFiles.forEach(file => {
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
      if (!session) throw new Error('Non authentifié')

      // Upload evidence files to Supabase Storage
      const urls: string[] = []
      for (const file of files) {
        const filePath = `${orderId}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('dispute-evidence')
          .upload(filePath, file)

        if (uploadError) throw new Error(`Erreur d'upload: ${uploadError.message}`)

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
        throw new Error(err.error || 'Échec de la soumission du litige')
      }

      const disputeData = await res.json()
      setSubmittedDispute(disputeData)
      setSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  // Loading state
  if (loadingOrder || checkingDispute) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: '15px' }}>Chargement...</p>
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
          Retour
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
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Litige</h1>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Success message for just-submitted */}
          {submitted && (
            <div style={{ backgroundColor: '#1a2a1a', border: '1px solid #2a3a2a', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1a3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#4ade80' }}>Litige soumis avec succès</p>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Nous examinerons votre demande dans les plus brefs délais.</p>
              </div>
            </div>
          )}

          {/* Order context card */}
          {order && (
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Commande concernée</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {order.item?.image_urls?.[0] && (
                  <img
                    src={order.item.image_urls[0]}
                    alt={order.item.title}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{order.item?.title || 'Article'}</p>
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
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Politique de retour du vendeur</p>
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
                  {{ no_return: 'Aucun retour', exchange_only: 'Echanges uniquement', return_7: 'Retours sous 7 jours', return_14: 'Retours sous 14 jours', return_30: 'Retours sous 30 jours' }[sellerReturnPolicy] || sellerReturnPolicy}
                </span>
              </div>
            </div>
          )}

          {/* Dispute status card */}
          <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Statut du litige</p>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: statusColor.bg,
                color: statusColor.text,
              }}>
                {STATUS_LABELS[dispute.status] || dispute.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Motif</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>
                  {REASON_OPTIONS.find(r => r.value === dispute.reason)?.label || dispute.reason}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Description</p>
                <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.5 }}>{dispute.description}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Montant</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>{dispute.amount.toFixed(2)} EUR</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Ouvert le</p>
                <p style={{ fontSize: '14px', color: '#ccc' }}>{new Date(dispute.opened_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {dispute.resolved_at && (
                <div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Résolu le</p>
                  <p style={{ fontSize: '14px', color: '#ccc' }}>{new Date(dispute.resolved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
              {dispute.resolution_note && (
                <div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Note de résolution</p>
                  <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.5 }}>{dispute.resolution_note}</p>
                </div>
              )}
            </div>

            {/* Auto-refund notice */}
            {dispute.auto_refund && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a2a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>Remboursement automatique approuvé</p>
              </div>
            )}
          </div>

          {/* Evidence images */}
          {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Preuves fournies</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {dispute.evidence_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Preuve ${i + 1}`}
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
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Ouvrir un litige</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Order context card */}
        {order && (
          <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Commande concernée</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {order.item?.image_urls?.[0] && (
                <img
                  src={order.item.image_urls[0]}
                  alt={order.item.title}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{order.item?.title || 'Article'}</p>
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
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Politique de retour du vendeur</p>
            {(() => {
              const policyLabels: Record<string, string> = {
                no_return: 'Aucun retour accepte',
                exchange_only: 'Echanges uniquement',
                return_7: 'Retours sous 7 jours',
                return_14: 'Retours sous 14 jours',
                return_30: 'Retours sous 30 jours',
              }
              const policyColors: Record<string, { bg: string; border: string; color: string }> = {
                no_return: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
                exchange_only: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#fb923c' },
                return_7: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
                return_14: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
                return_30: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
              }
              const label = policyLabels[sellerReturnPolicy] || sellerReturnPolicy
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
                      Ce vendeur n'accepte pas les retours. Vous pouvez tout de meme contester si l'article est non conforme ou contrefait.
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
            Motif du litige
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {REASON_OPTIONS.map(opt => (
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description textarea */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez le problème en détail (minimum 20 caractères)"
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
            {description.trim().length}/20 caractères minimum
          </p>
        </div>

        {/* Evidence upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
            Preuves (photos/vidéos, max 5)
          </label>

          {/* Preview thumbnails */}
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {previews.map((preview, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`Preuve ${i + 1}`}
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
              Ajouter un fichier ({files.length}/5)
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
          {submitting ? 'Envoi en cours...' : 'Soumettre le litige'}
        </button>
      </div>
    </div>
  )
}

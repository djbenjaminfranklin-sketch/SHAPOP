import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getDir, getLang, getLocale, tr, type Lang, type Localized } from '../lib/i18n'
import { usePageTitle } from '../hooks/usePageTitle'
import VodPlayer from '../components/stream/VodPlayer'
import FulfillmentPanel from '../components/orders/FulfillmentPanel'
import { formatMoney, shortOrderRef } from '../lib/fulfillment'
import { errorText, statusLabel } from '../lib/fulfillmentText'

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
  status: string
  currency: string | null
  fulfillment_method: 'pickup' | 'post' | 'legacy_carrier' | null
  shipping_cost: number | null
  total_amount: number | null
  paid_at: string | null
  shipped_at: string | null
  handed_over_at: string | null
  delivered_at: string | null
  claim_deadline: string | null
  purchase_stream_offset_seconds: number | null
  created_at: string
  item?: { title: string; image_urls: string[]; category: string; description: string | null }
  buyer_profile?: { display_name: string; username: string; avatar_url: string | null }
  seller_profile?: { display_name: string; username: string; avatar_url: string | null }
  stream_recording_url?: string | null
}

const pageContent = {
  en: {
    title: 'Order details',
    back: 'Back',
    retry: 'Retry',
    buyer: 'Buyer',
    seller: 'Seller',
    amount: 'Amount',
    itemPrice: 'Item price',
    shippingCost: 'Shipping',
    totalPaid: 'Total paid',
    platformFee: 'Platform fee',
    sellerPayout: 'Seller payout',
    createdAt: 'Ordered on',
    paidAt: 'Paid on',
    handedOverAt: 'Handed over in person on',
    shippedAt: 'Sent on',
    deliveredAt: 'Delivered on',
    reportProblem: 'Report a problem',
    reportHint: 'Item not received, damaged or different',
    chatInApp: 'Write in ShaPop messages',
    loading: 'Loading…',
    error: 'Error',
    notFound: 'Order not found',
    timeline: 'Timeline',
    requestReturn: 'Request a return',
    returnReason: 'Reason for return',
    returnReasonPlaceholder: 'Describe the reason for the return…',
    submitReturn: 'Submit request',
    submitting: 'Submitting…',
    approveReturn: 'Approve return',
    rejectReturn: 'Reject return',
    rejectReason: 'Rejection reason',
    rejectReasonPlaceholder: 'Explain why you are rejecting…',
    confirmReject: 'Confirm rejection',
    returnPending: 'Return requested',
    cancel: 'Cancel',
    seeVideoMoment: 'See the moment in the video',
    video: 'Video',
  },
  fr: {
    title: 'Détail de la commande',
    back: 'Retour',
    retry: 'Réessayer',
    buyer: 'Acheteur',
    seller: 'Vendeur',
    amount: 'Montant',
    itemPrice: 'Prix de l\'article',
    shippingCost: 'Frais de port',
    totalPaid: 'Total payé',
    platformFee: 'Frais de la plateforme',
    sellerPayout: 'Versement vendeur',
    createdAt: 'Commande passée le',
    paidAt: 'Payée le',
    handedOverAt: 'Remise en main propre le',
    shippedAt: 'Envoyée le',
    deliveredAt: 'Livrée le',
    reportProblem: 'Signaler un problème',
    reportHint: 'Article non reçu, abîmé ou différent',
    chatInApp: 'Écrire dans la messagerie ShaPop',
    loading: 'Chargement…',
    error: 'Erreur',
    notFound: 'Commande introuvable',
    timeline: 'Chronologie',
    requestReturn: 'Demander un retour',
    returnReason: 'Raison du retour',
    returnReasonPlaceholder: 'Décris la raison du retour…',
    submitReturn: 'Envoyer la demande',
    submitting: 'Envoi…',
    approveReturn: 'Accepter le retour',
    rejectReturn: 'Refuser le retour',
    rejectReason: 'Raison du refus',
    rejectReasonPlaceholder: 'Explique pourquoi tu refuses…',
    confirmReject: 'Confirmer le refus',
    returnPending: 'Retour demandé',
    cancel: 'Annuler',
    seeVideoMoment: 'Voir le moment dans la vidéo',
    video: 'Vidéo',
  },
  es: {
    title: 'Detalle del pedido',
    back: 'Volver',
    retry: 'Reintentar',
    buyer: 'Comprador',
    seller: 'Vendedor',
    amount: 'Importe',
    itemPrice: 'Precio del artículo',
    shippingCost: 'Envío',
    totalPaid: 'Total pagado',
    platformFee: 'Comisión de la plataforma',
    sellerPayout: 'Pago al vendedor',
    createdAt: 'Pedido el',
    paidAt: 'Pagado el',
    handedOverAt: 'Entregado en mano el',
    shippedAt: 'Enviado el',
    deliveredAt: 'Entregado el',
    reportProblem: 'Informar de un problema',
    reportHint: 'Artículo no recibido, dañado o diferente',
    chatInApp: 'Escribir en la mensajería de ShaPop',
    loading: 'Cargando…',
    error: 'Error',
    notFound: 'Pedido no encontrado',
    timeline: 'Cronología',
    requestReturn: 'Solicitar una devolución',
    returnReason: 'Motivo de la devolución',
    returnReasonPlaceholder: 'Describe el motivo de la devolución…',
    submitReturn: 'Enviar solicitud',
    submitting: 'Enviando…',
    approveReturn: 'Aceptar la devolución',
    rejectReturn: 'Rechazar la devolución',
    rejectReason: 'Motivo del rechazo',
    rejectReasonPlaceholder: 'Explica por qué la rechazas…',
    confirmReject: 'Confirmar el rechazo',
    returnPending: 'Devolución solicitada',
    cancel: 'Cancelar',
    seeVideoMoment: 'Ver el momento en el vídeo',
    video: 'Vídeo',
  },
  ru: {
    title: 'Детали заказа',
    back: 'Назад',
    retry: 'Повторить',
    buyer: 'Покупатель',
    seller: 'Продавец',
    amount: 'Сумма',
    itemPrice: 'Цена товара',
    shippingCost: 'Доставка',
    totalPaid: 'Всего оплачено',
    platformFee: 'Комиссия платформы',
    sellerPayout: 'Выплата продавцу',
    createdAt: 'Заказ оформлен',
    paidAt: 'Оплачен',
    handedOverAt: 'Передан лично',
    shippedAt: 'Отправлен',
    deliveredAt: 'Доставлен',
    reportProblem: 'Сообщить о проблеме',
    reportHint: 'Товар не получен, повреждён или не тот',
    chatInApp: 'Написать в сообщениях ShaPop',
    loading: 'Загрузка…',
    error: 'Ошибка',
    notFound: 'Заказ не найден',
    timeline: 'Хронология',
    requestReturn: 'Запросить возврат',
    returnReason: 'Причина возврата',
    returnReasonPlaceholder: 'Опиши причину возврата…',
    submitReturn: 'Отправить запрос',
    submitting: 'Отправка…',
    approveReturn: 'Принять возврат',
    rejectReturn: 'Отклонить возврат',
    rejectReason: 'Причина отказа',
    rejectReasonPlaceholder: 'Объясни, почему отказываешь…',
    confirmReject: 'Подтвердить отказ',
    returnPending: 'Запрошен возврат',
    cancel: 'Отмена',
    seeVideoMoment: 'Посмотреть момент в видео',
    video: 'Видео',
  },
  he: {
    title: 'פרטי הזמנה',
    back: 'חזור',
    retry: 'נסה שוב',
    buyer: 'קונה',
    seller: 'מוכר',
    amount: 'סכום',
    itemPrice: 'מחיר הפריט',
    shippingCost: 'משלוח',
    totalPaid: 'סה"כ שולם',
    platformFee: 'עמלת פלטפורמה',
    sellerPayout: 'תשלום למוכר',
    createdAt: 'הוזמן ב-',
    paidAt: 'שולם ב-',
    handedOverAt: 'נמסר ביד ב-',
    shippedAt: 'נשלח ב-',
    deliveredAt: 'נמסר ב-',
    reportProblem: 'דווח על בעיה',
    reportHint: 'הפריט לא התקבל, פגום או שונה',
    chatInApp: 'כתוב בהודעות של ShaPop',
    loading: 'טוען…',
    error: 'שגיאה',
    notFound: 'ההזמנה לא נמצאה',
    timeline: 'ציר זמן',
    requestReturn: 'בקשת החזרה',
    returnReason: 'סיבת ההחזרה',
    returnReasonPlaceholder: 'תאר את סיבת ההחזרה…',
    submitReturn: 'שלח בקשה',
    submitting: 'שולח…',
    approveReturn: 'אשר החזרה',
    rejectReturn: 'דחה החזרה',
    rejectReason: 'סיבת הדחייה',
    rejectReasonPlaceholder: 'הסבר למה אתה דוחה…',
    confirmReject: 'אשר דחייה',
    returnPending: 'התבקשה החזרה',
    cancel: 'ביטול',
    seeVideoMoment: 'צפייה ברגע בסרטון',
    video: 'סרטון',
  },
} satisfies Localized<Record<string, string>>

function formatDate(dateStr: string, lang: Lang) {
  return new Date(dateStr).toLocaleDateString(getLocale(lang), {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending_payment': return '#F59E0B'
    case 'paid': return '#3B82F6'
    case 'shipped':
    case 'handed_over':
    case 'delivered': return '#10B981'
    case 'refunded':
    case 'cancelled': return '#8B5CF6'
    case 'disputed':
    case 'return_rejected': return '#E8344E'
    case 'return_requested': return '#F59E0B'
    default: return '#666'
  }
}

const actionBtn = (background: string): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '14px', background,
  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
})

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang = getLang()
  const ct = tr(pageContent, lang)
  usePageTitle(ct.title)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vodModal, setVodModal] = useState<{ url: string; title: string; offset?: number } | null>(null)

  // Retours
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [submittingReturn, setSubmittingReturn] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [submittingReject, setSubmittingReject] = useState(false)
  const [approvingReturn, setApprovingReturn] = useState(false)

  const isSeller = user?.id === order?.seller_id
  const isBuyer = user?.id === order?.buyer_id

  const fetchOrder = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!user || !id || !session) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls, category, description), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username, avatar_url), seller_profile:profiles!orders_seller_id_fkey(display_name, username, avatar_url), stream:streams(recording_url)')
        .eq('id', id)
        .single()

      if (cancelledRef?.current) return
      if (err || !data) throw new Error(ct.notFound)
      if (data.buyer_id !== user.id && data.seller_id !== user.id) throw new Error(ct.notFound)

      setOrder({ ...data, stream_recording_url: data.stream?.recording_url || null } as OrderDetail)
    } catch (err: unknown) {
      if (cancelledRef?.current) return
      setError(err instanceof Error ? err.message : ct.error)
    } finally {
      if (!cancelledRef?.current) setLoading(false)
    }
  }, [user, id, session, ct.notFound, ct.error])

  useEffect(() => {
    const cancelledRef = { current: false }
    fetchOrder(cancelledRef)
    return () => { cancelledRef.current = true }
  }, [fetchOrder])

  const postOrderAction = async (path: string, body?: unknown) => {
    if (!order || !session) throw new Error(ct.error)
    const res = await apiFetch(`/api/orders/${order.id}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ? errorText(String(err.error), lang) : ct.error)
    }
    return res.json()
  }

  const handleChat = async () => {
    try {
      const data = await postOrderAction('conversation')
      navigate(`/conversation/${data.id}`)
    } catch {
      navigate('/messages')
    }
  }

  const handleRequestReturn = async () => {
    if (!returnReason.trim()) return
    setSubmittingReturn(true)
    setReturnError(null)
    try {
      await postOrderAction('request-return', { reason: returnReason.trim() })
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
    setApprovingReturn(true)
    try {
      await postOrderAction('approve-return')
      fetchOrder()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
    } finally {
      setApprovingReturn(false)
    }
  }

  const handleRejectReturn = async () => {
    setSubmittingReject(true)
    try {
      await postOrderAction('reject-return', { reason: rejectReason.trim() })
      setShowRejectModal(false)
      setRejectReason('')
      fetchOrder()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
    } finally {
      setSubmittingReject(false)
    }
  }

  if (loading && !order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #222', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
        <p style={{ color: '#666', fontSize: '14px' }}>{ct.loading}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div dir={getDir()} style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <p style={{ color: '#E8344E', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{error || ct.notFound}</p>
        <button onClick={() => fetchOrder()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E8344E', fontSize: '14px', fontWeight: 600, padding: '8px 16px' }}>
          {ct.retry}
        </button>
        <button onClick={() => navigate(-1)} style={{ color: '#F0908A', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' }}>{ct.back}</button>
      </div>
    )
  }

  const currency = order.currency
  const money = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang)
  const statusColor = getStatusColor(order.status)
  const itemImage = order.item?.image_urls?.[0]
  const shipping = Number(order.shipping_cost || 0)
  const total = order.total_amount != null ? Number(order.total_amount) : Number(order.amount) + shipping
  const usesNewFlow = order.fulfillment_method === 'pickup' || order.fulfillment_method === 'post'
  const other = isSeller ? order.buyer_profile : order.seller_profile

  const timelineEvents = [
    { label: ct.createdAt, date: order.created_at, color: '#666', done: true },
    { label: ct.paidAt, date: order.paid_at, color: '#3B82F6', done: !!order.paid_at },
    order.fulfillment_method === 'pickup'
      ? { label: ct.handedOverAt, date: order.handed_over_at, color: '#10B981', done: !!order.handed_over_at }
      : { label: ct.shippedAt, date: order.shipped_at, color: '#10B981', done: !!order.shipped_at },
    ...(order.fulfillment_method !== 'pickup'
      ? [{ label: ct.deliveredAt, date: order.delivered_at, color: '#10B981', done: !!order.delivered_at }]
      : []),
  ]

  // Litige : « non reçu » possible dès le paiement
  const canReport = isBuyer && ['paid', 'shipped', 'handed_over', 'delivered'].includes(order.status)
    && (!order.claim_deadline || new Date(order.claim_deadline) > new Date())
  const canRequestReturn = isBuyer && ['delivered', 'shipped', 'handed_over'].includes(order.status)

  return (
    <div dir={getDir()} style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
        {/* En-tête */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #111',
          backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button onClick={() => navigate(-1)} aria-label={ct.back} style={{ background: 'none', border: 'none', color: '#999', fontSize: '24px', cursor: 'pointer', padding: '4px', transform: getDir() === 'rtl' ? 'scaleX(-1)' : undefined }}>
            &#8249;
          </button>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>{ct.title}</h1>
          <span dir="ltr" style={{ marginInlineStart: 'auto', fontSize: '12px', color: '#666' }}>#{shortOrderRef(order.id)}</span>
        </div>

        {/* Article */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: '1px solid #111' }}>
          {itemImage ? (
            <img src={itemImage} alt="" loading="lazy" style={{ width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '14px', backgroundColor: '#111', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.item?.title || `#${shortOrderRef(order.id)}`}
            </p>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#F0908A', margin: '0 0 6px' }}>{money(order.amount)}</p>
            <span style={{
              display: 'inline-block', fontSize: '11px', fontWeight: 700, color: statusColor, backgroundColor: `${statusColor}14`,
              padding: '4px 12px', borderRadius: '10px', border: `1px solid ${statusColor}30`,
            }}>
              {statusLabel(order.status, lang)}
            </span>
          </div>
        </div>

        {/* Moment vidéo de l'achat */}
        {order.stream_recording_url && order.purchase_stream_offset_seconds != null && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #111' }}>
            <button
              onClick={() => setVodModal({ url: order.stream_recording_url!, title: order.item?.title || ct.video, offset: order.purchase_stream_offset_seconds! })}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              ▶ {ct.seeVideoMoment}
            </button>
          </div>
        )}

        {/* Autre partie + montants */}
        <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {other?.avatar_url
                ? <img src={other.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '14px', color: '#666', fontWeight: 700 }}>{(other?.display_name || '?')[0]}</span>}
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isSeller ? ct.buyer : ct.seller}</p>
              <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: 0 }}>{other?.display_name || '—'}</p>
            </div>
          </div>

          <div style={{ backgroundColor: '#0D0D0D', borderRadius: '12px', padding: '12px', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Line label={isSeller ? ct.amount : ct.itemPrice} value={money(order.amount)} />
            {shipping > 0 && <Line label={ct.shippingCost} value={money(shipping)} />}
            {isSeller ? (
              <>
                <Line label={ct.platformFee} value={`-${money(order.platform_fee)}`} color="#E8344E" />
                <Line label={ct.sellerPayout} value={money(order.seller_payout)} color="#10B981" strong />
              </>
            ) : (
              <Line label={ct.totalPaid} value={money(total)} color="#F0908A" strong />
            )}
          </div>
        </div>

        {/* Remise : code, photos, coordonnées (tout vient du serveur) */}
        {(usesNewFlow || order.fulfillment_method === 'legacy_carrier') && order.status !== 'pending_payment' && (
          <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
            <FulfillmentPanel orderId={order.id} onChanged={() => fetchOrder()} />
          </div>
        )}

        {/* Chronologie */}
        <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ct.timeline}</p>
          <div style={{ position: 'relative', paddingInlineStart: '24px' }}>
            <div style={{ position: 'absolute', insetInlineStart: '7px', top: '4px', bottom: '4px', width: '2px', backgroundColor: '#222' }} />
            {timelineEvents.map((evt, i) => (
              <div key={evt.label} style={{ position: 'relative', marginBottom: i < timelineEvents.length - 1 ? '16px' : 0 }}>
                <div style={{
                  position: 'absolute', insetInlineStart: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: evt.done ? evt.color : '#222', border: evt.done ? 'none' : '2px solid #333', boxSizing: 'border-box',
                }} />
                <p style={{ fontSize: '13px', color: evt.done ? '#fff' : '#444', fontWeight: 600, margin: 0 }}>{evt.label}</p>
                {evt.date && <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>{formatDate(evt.date, lang)}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {canReport && (
            <button onClick={() => navigate(`/dispute/${order.id}`)} style={actionBtn('linear-gradient(135deg, #F97316, #E8344E)')}>
              {ct.reportProblem}
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>{ct.reportHint}</span>
            </button>
          )}

          {canRequestReturn && (
            <button onClick={() => { setShowReturnModal(true); setReturnError(null) }} style={actionBtn('linear-gradient(135deg, #F0908A, #E8344E)')}>
              {ct.requestReturn}
            </button>
          )}

          {isBuyer && order.status === 'return_requested' && (
            <div style={{ padding: '14px', borderRadius: '14px', background: '#1A1A1A', border: '1px solid #F59E0B30', color: '#F59E0B', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
              {ct.returnPending}
            </div>
          )}

          {isSeller && order.status === 'return_requested' && (
            <>
              <button onClick={handleApproveReturn} disabled={approvingReturn} style={actionBtn(approvingReturn ? '#333' : 'linear-gradient(135deg, #10B981, #059669)')}>
                {approvingReturn ? ct.submitting : ct.approveReturn}
              </button>
              <button onClick={() => { setShowRejectModal(true); setRejectReason('') }} style={actionBtn('linear-gradient(135deg, #E8344E, #B91C1C)')}>
                {ct.rejectReturn}
              </button>
            </>
          )}

          {order.status !== 'pending_payment' && order.status !== 'cancelled' && (
            <button onClick={handleChat} style={{ ...actionBtn('transparent'), border: '1px solid #333', color: '#aaa', fontSize: '14px', fontWeight: 600 }}>
              {ct.chatInApp}
            </button>
          )}
        </div>
      </div>

      {/* Demande de retour (acheteur) */}
      {showReturnModal && (
        <Modal onClose={() => setShowReturnModal(false)}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>{ct.requestReturn}</h3>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: 600 }}>{ct.returnReason}</p>
          <textarea value={returnReason} onChange={e => setReturnReason(e.target.value.slice(0, 500))} placeholder={ct.returnReasonPlaceholder} rows={4} style={textareaStyle} />
          {returnError && <p style={{ color: '#E8344E', fontSize: '13px', margin: '0 0 12px', textAlign: 'center' }}>{returnError}</p>}
          <button onClick={handleRequestReturn} disabled={submittingReturn || !returnReason.trim()} style={actionBtn(submittingReturn || !returnReason.trim() ? '#333' : 'linear-gradient(135deg, #F0908A, #E8344E)')}>
            {submittingReturn ? ct.submitting : ct.submitReturn}
          </button>
          <button onClick={() => setShowReturnModal(false)} style={cancelBtn}>{ct.cancel}</button>
        </Modal>
      )}

      {/* Refus de retour (vendeur) */}
      {showRejectModal && (
        <Modal onClose={() => setShowRejectModal(false)}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>{ct.rejectReturn}</h3>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: 600 }}>{ct.rejectReason}</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value.slice(0, 500))} placeholder={ct.rejectReasonPlaceholder} rows={4} style={textareaStyle} />
          <button onClick={handleRejectReturn} disabled={submittingReject} style={actionBtn(submittingReject ? '#333' : 'linear-gradient(135deg, #E8344E, #B91C1C)')}>
            {submittingReject ? ct.submitting : ct.confirmReject}
          </button>
          <button onClick={() => setShowRejectModal(false)} style={cancelBtn}>{ct.cancel}</button>
        </Modal>
      )}

      {vodModal && (
        <VodPlayer recordingUrl={vodModal.url} title={vodModal.title} startOffset={vodModal.offset} onClose={() => setVodModal(null)} />
      )}
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #222', backgroundColor: '#0A0A0A',
  color: '#fff', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
}
const cancelBtn: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', marginTop: '8px',
}

function Line({ label, value, color = '#fff', strong = false }: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', ...(strong ? { borderTop: '1px solid #222', paddingTop: '6px' } : {}) }}>
      <span style={{ fontSize: strong ? '13px' : '12px', color: strong ? color : '#666', fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: strong ? '13px' : '12px', color, fontWeight: strong ? 700 : 600 }}>{value}</span>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div dir={getDir()} onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px', border: '1px solid #222' }}>
        {children}
      </div>
    </div>
  )
}

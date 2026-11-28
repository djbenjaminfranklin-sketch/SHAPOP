// Page « Payer » d'une commande gagnée (depuis le détail de la commande ou la notification
// « Carte refusée ») : choix de la remise, puis paiement. Même déroulé que la fenêtre
// « Tu as gagné » du direct, pour l'acheteur qui l'a fermée ou dont la carte a été refusée.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, tr } from '../lib/i18n'
import { formatMoney } from '../lib/fulfillment'
import { ft } from '../lib/fulfillmentText'
import { usePageTitle } from '../hooks/usePageTitle'
import PageBackButton from '../components/PageBackButton'
import DeliveryChoice from '../components/checkout/DeliveryChoice'
import { getStripePromise, PaymentFormInner } from '../components/checkout/StripePayment'

const pageContent = {
  en: {
    title: 'Pay', heading: 'Pay for your item', loading: 'Loading…', notFound: 'Order not found.',
    alreadyPaid: 'This order is already paid.', closed: 'This order can no longer be paid.',
    cardDeclined: 'Your card was declined', cardDeclinedHint: 'Pay with another card below, or change your saved card.',
    changeCard: 'Change my card', payNow: 'Pay now', paymentFailed: 'Payment failed. Try another card.',
    initFailed: 'Couldn’t prepare the payment. Try again.', success: 'Payment accepted!', successDesc: 'The seller will contact you to arrange the handover.',
    viewOrder: 'View my order',
  },
  fr: {
    title: 'Payer', heading: 'Paie ton article', loading: 'Chargement…', notFound: 'Commande introuvable.',
    alreadyPaid: 'Cette commande est déjà payée.', closed: 'Cette commande ne peut plus être payée.',
    cardDeclined: 'Ta carte a été refusée', cardDeclinedHint: 'Paie avec une autre carte ci-dessous, ou change ta carte enregistrée.',
    changeCard: 'Changer ma carte', payNow: 'Payer maintenant', paymentFailed: 'Paiement refusé. Essaie une autre carte.',
    initFailed: 'Impossible de préparer le paiement. Réessaie.', success: 'Paiement accepté !', successDesc: 'Le vendeur va te contacter pour organiser la remise.',
    viewOrder: 'Voir ma commande',
  },
  es: {
    title: 'Pagar', heading: 'Paga tu artículo', loading: 'Cargando…', notFound: 'Pedido no encontrado.',
    alreadyPaid: 'Este pedido ya está pagado.', closed: 'Este pedido ya no se puede pagar.',
    cardDeclined: 'Tu tarjeta ha sido rechazada', cardDeclinedHint: 'Paga con otra tarjeta aquí abajo o cambia tu tarjeta guardada.',
    changeCard: 'Cambiar mi tarjeta', payNow: 'Pagar ahora', paymentFailed: 'Pago rechazado. Prueba con otra tarjeta.',
    initFailed: 'No se pudo preparar el pago. Inténtalo de nuevo.', success: '¡Pago aceptado!', successDesc: 'El vendedor te contactará para organizar la entrega.',
    viewOrder: 'Ver mi pedido',
  },
  ru: {
    title: 'Оплата', heading: 'Оплати товар', loading: 'Загрузка…', notFound: 'Заказ не найден.',
    alreadyPaid: 'Этот заказ уже оплачен.', closed: 'Этот заказ больше нельзя оплатить.',
    cardDeclined: 'Твоя карта отклонена', cardDeclinedHint: 'Оплати другой картой ниже или замени сохранённую карту.',
    changeCard: 'Сменить карту', payNow: 'Оплатить', paymentFailed: 'Оплата отклонена. Попробуй другую карту.',
    initFailed: 'Не удалось подготовить оплату. Попробуй ещё раз.', success: 'Оплата принята!', successDesc: 'Продавец свяжется с тобой, чтобы договориться о передаче.',
    viewOrder: 'Мой заказ',
  },
  he: {
    title: 'תשלום', heading: 'תשלום על הפריט', loading: 'טוען…', notFound: 'ההזמנה לא נמצאה.',
    alreadyPaid: 'ההזמנה הזו כבר שולמה.', closed: 'כבר אי אפשר לשלם על ההזמנה הזו.',
    cardDeclined: 'הכרטיס שלך נדחה', cardDeclinedHint: 'אפשר לשלם בכרטיס אחר כאן למטה, או להחליף את הכרטיס השמור.',
    changeCard: 'החלפת כרטיס', payNow: 'לתשלום', paymentFailed: 'התשלום נדחה. נסו כרטיס אחר.',
    initFailed: 'לא הצלחנו להכין את התשלום. נסו שוב.', success: 'התשלום התקבל!', successDesc: 'המוכר ייצור איתך קשר כדי לתאם את המסירה.',
    viewOrder: 'להזמנה שלי',
  },
}

type PayOrder = {
  id: string; buyer_id: string; status: string; amount: number | string; currency: string | null
  auth_status: string | null; item: { title: string | null; image_urls: string[] | null } | null
}

export default function PayOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lang = getLang()
  const ct = tr(pageContent, lang)
  usePageTitle(ct.title)

  const [order, setOrder] = useState<PayOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'delivery' | 'pay' | 'done'>('delivery')
  const [totals, setTotals] = useState<{ amount: number; shipping: number; total: number; currency: string; method?: string } | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    supabase.from('orders')
      .select('id, buyer_id, status, amount, currency, auth_status, item:items(title, image_urls)')
      .eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setOrder((data as unknown as PayOrder) || null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const handleDeliveryConfirmed = async (result: { method?: string; shippingCost: number; totalAmount: number; currency: string }) => {
    if (!order) return
    setTotals({ amount: Number(order.amount), shipping: result.shippingCost, total: result.totalAmount, currency: result.currency, method: result.method })
    setError(null)
    setClientSecret(null)
    setStep('pay')
    try {
      const resp = await apiFetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ order_id: order.id, promo_code: localStorage.getItem('shapop_promo_code') || undefined }),
      })
      if (!resp.ok) { setError(ct.initFailed); return }
      const pi = await resp.json()
      if (typeof pi.total_amount === 'number') setTotals(prev => prev ? { ...prev, total: pi.total_amount } : prev)
      if (pi.auto_charged) { setStep('done'); return }
      if (pi.client_secret) { setClientSecret(pi.client_secret); setPaymentIntentId(pi.payment_intent_id || null) }
    } catch {
      setError(ct.initFailed)
    }
  }

  const handlePaymentSuccess = async (piId: string) => {
    try {
      await apiFetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ order_id: order?.id, payment_intent_id: piId || paymentIntentId }),
      })
    } catch { /* le webhook Stripe confirmera aussi */ }
    setPaying(false)
    setStep('done')
  }

  const page: React.CSSProperties = { minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 44px) + 12px)', paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 0px)) + 140px)' }
  const declined = order?.auth_status === 'declined' || order?.auth_status === 'no_card'

  if (loading) return <div style={page}><p style={{ color: '#f0f0f0' }}>{ct.loading}</p></div>
  if (!order) return <div style={page}><PageBackButton /><p style={{ marginTop: '40px', color: '#f0f0f0' }}>{ct.notFound}</p></div>
  if (order.status !== 'pending_payment' && step !== 'done') {
    return (
      <div style={page}>
        <PageBackButton />
        <p style={{ marginTop: '40px', color: '#f0f0f0' }}>{order.status === 'cancelled' ? ct.closed : ct.alreadyPaid}</p>
        <button onClick={() => navigate(`/order/${order.id}`, { replace: true })} style={btnGhost}>{ct.viewOrder}</button>
      </div>
    )
  }

  return (
    <div style={page}>
      <PageBackButton />
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '44px 0 16px' }}>
        {order.item?.image_urls?.[0] && (
          <img src={order.item.image_urls[0]} alt="" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, margin: 0 }}>{ct.heading}</h1>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: '2px 0 0' }}>{order.item?.title || ''} · {formatMoney(order.amount, order.currency || undefined)}</p>
        </div>
      </div>

      {declined && step !== 'done' && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', backgroundColor: 'rgba(232,52,78,0.12)', border: '1px solid rgba(232,52,78,0.4)' }}>
          <p style={{ margin: 0, fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#E8344E' }}>{ct.cardDeclined}</p>
          <p style={{ margin: '4px 0 10px', fontSize: 'calc(13px * var(--fs, 1))', color: '#ddd' }}>{ct.cardDeclinedHint}</p>
          <button onClick={() => navigate('/payments')} style={{ ...btnGhost, marginTop: 0, padding: '10px' }}>{ct.changeCard}</button>
        </div>
      )}

      {step === 'delivery' && <DeliveryChoice orderId={order.id} onConfirmed={handleDeliveryConfirmed} />}

      {step === 'pay' && (
        <>
          {totals && (
            <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: '14px' }}>
              <Row label={ft(lang).item_price} value={formatMoney(totals.amount, totals.currency)} />
              {totals.method !== 'pickup' && <Row label={ft(lang).shipping_fee} value={formatMoney(totals.shipping, totals.currency)} />}
              <Row label={ft(lang).total} value={formatMoney(totals.total, totals.currency)} strong />
            </div>
          )}
          {error && <p style={{ color: '#E8344E', fontSize: 'calc(14px * var(--fs, 1))', margin: '0 0 12px' }}>{error}</p>}
          {clientSecret ? (
            <Elements stripe={getStripePromise()} options={{
              clientSecret, locale: lang,
              appearance: { theme: 'night', variables: { colorPrimary: '#00E5FF', colorBackground: '#0D0D0D', colorText: '#fff', borderRadius: '10px' } },
            }}>
              <PaymentFormInner onSuccess={handlePaymentSuccess} onError={msg => setError(msg)} loading={paying} setLoading={setPaying} payNowLabel={ct.payNow} paymentFailedLabel={ct.paymentFailed} />
            </Elements>
          ) : !error ? (
            <div style={{ width: '32px', height: '32px', margin: '24px auto', border: '3px solid #333', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : null}
          <button onClick={() => { setStep('delivery'); setClientSecret(null); setError(null) }} style={btnGhost}>{ft(lang).choose_delivery}</button>
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#22C55E', margin: '0 0 8px' }}>{ct.success}</p>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 24px' }}>{ct.successDesc}</p>
          <button onClick={() => navigate(`/order/${order.id}`, { replace: true })} style={{ ...btnGhost, background: 'linear-gradient(135deg, #00E5FF, #0091EA)', border: 'none', color: '#001014' }}>{ct.viewOrder}</button>
        </div>
      )}
    </div>
  )
}

const btnGhost: React.CSSProperties = {
  width: '100%', marginTop: '14px', padding: '14px', borderRadius: '14px',
  backgroundColor: 'transparent', border: '1px solid #333', color: '#ddd',
  fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ fontSize: strong ? '14px' : '13px', color: strong ? '#fff' : '#f0f0f0', fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: strong ? '14px' : '13px', color: strong ? '#00E5FF' : '#fff', fontWeight: 700 }}>{value}</span>
    </div>
  )
}

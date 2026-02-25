import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Order, Item } from '../types/database'

type ShipmentFilter = 'all' | 'in_progress' | 'delivered' | 'paid_out'

interface ShipmentOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls'>
  buyer_profile?: { display_name: string; username: string }
}

const txt = {
  fr: {
    title: 'Mes Envois',
    all: 'Tous',
    inProgress: 'En cours',
    delivered: 'Livres',
    paidOut: 'Paiement recu',
    paid: 'Paye',
    shipped: 'Expedie',
    deliveredStep: 'Livre',
    released: 'Paiement libere',
    tracking: 'Suivi',
    carrier: 'Transporteur',
    shippedOn: 'Expedie le',
    noShipments: 'Aucun envoi',
    noShipmentsDesc: 'Vos envois apparaitront ici une fois vos commandes expediees.',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    retry: 'Reessayer',
    buyer: 'Acheteur',
  },
  en: {
    title: 'My Shipments',
    all: 'All',
    inProgress: 'In Progress',
    delivered: 'Delivered',
    paidOut: 'Payment received',
    paid: 'Paid',
    shipped: 'Shipped',
    deliveredStep: 'Delivered',
    released: 'Payment released',
    tracking: 'Tracking',
    carrier: 'Carrier',
    shippedOn: 'Shipped on',
    noShipments: 'No shipments',
    noShipmentsDesc: 'Your shipments will appear here once orders are shipped.',
    loading: 'Loading...',
    error: 'Loading error',
    retry: 'Retry',
    buyer: 'Buyer',
  },
  he: {
    title: '\u05D4\u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD \u05E9\u05DC\u05D9',
    all: '\u05D4\u05DB\u05DC',
    inProgress: '\u05D1\u05D3\u05E8\u05DA',
    delivered: '\u05E0\u05DE\u05E1\u05E8\u05D5',
    paidOut: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05EA\u05E7\u05D1\u05DC',
    paid: '\u05E9\u05D5\u05DC\u05DD',
    shipped: '\u05E0\u05E9\u05DC\u05D7',
    deliveredStep: '\u05E0\u05DE\u05E1\u05E8',
    released: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05D5\u05D7\u05E8\u05E8',
    tracking: '\u05DE\u05E2\u05E7\u05D1',
    carrier: '\u05DE\u05E9\u05DC\u05D5\u05D7',
    shippedOn: '\u05E0\u05E9\u05DC\u05D7 \u05D1',
    noShipments: '\u05D0\u05D9\u05DF \u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD',
    noShipmentsDesc: '\u05D4\u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD \u05E9\u05DC\u05DA \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF \u05DC\u05D0\u05D7\u05E8 \u05E9\u05D4\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E0\u05E9\u05DC\u05D7\u05D5.',
    loading: '\u05D8\u05D5\u05E2\u05DF...',
    error: '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D8\u05E2\u05D9\u05E0\u05D4',
    retry: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
    buyer: '\u05E7\u05D5\u05E0\u05D4',
  },
  es: {
    title: 'Mis Env\u00edos',
    all: 'Todos',
    inProgress: 'En curso',
    delivered: 'Entregados',
    paidOut: 'Pago recibido',
    paid: 'Pagado',
    shipped: 'Enviado',
    deliveredStep: 'Entregado',
    released: 'Pago liberado',
    tracking: 'Seguimiento',
    carrier: 'Transportista',
    shippedOn: 'Enviado el',
    noShipments: 'Sin env\u00edos',
    noShipmentsDesc: 'Tus env\u00edos aparecer\u00e1n aqu\u00ed una vez enviados los pedidos.',
    loading: 'Cargando...',
    error: 'Error de carga',
    retry: 'Reintentar',
    buyer: 'Comprador',
  },
}

function getStepState(order: ShipmentOrder) {
  const isPaid = true // Always paid if it's shipped/delivered
  const isShipped = order.tracking_status === 'shipped' || order.tracking_status === 'in_transit' || order.tracking_status === 'delivered' || order.status === 'shipped' || order.status === 'delivered'
  const isDelivered = order.tracking_status === 'delivered' || order.status === 'delivered'
  const isReleased = order.payout_status === 'released'

  // Current active step (0-indexed): the first incomplete step
  let activeStep = 3
  if (!isReleased) activeStep = 3
  if (!isDelivered) activeStep = 2
  if (!isShipped) activeStep = 1

  return { isPaid, isShipped, isDelivered, isReleased, activeStep }
}

function ProgressBar({ order, t }: { order: ShipmentOrder; t: typeof txt.fr }) {
  const { isPaid, isShipped, isDelivered, isReleased, activeStep } = getStepState(order)
  const steps = [
    { label: t.paid, done: isPaid },
    { label: t.shipped, done: isShipped },
    { label: t.deliveredStep, done: isDelivered },
    { label: t.released, done: isReleased },
  ]

  return (
    <div style={{ padding: '12px 0 4px' }}>
      {/* Progress line + circles */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', margin: '0 8px' }}>
        {steps.map((step, i) => {
          const isActive = i === activeStep && !step.done
          const isDone = step.done
          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
              {/* Circle */}
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isDone ? '#22c55e' : isActive ? '#3b82f6' : '#333',
                border: isActive ? '2px solid #60a5fa' : 'none',
                animation: isActive ? 'shipPulse 2s ease infinite' : 'none',
                transition: 'background-color 0.3s',
              }}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: isActive ? '#fff' : '#555',
                  }} />
                )}
              </div>
              {/* Line between circles */}
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: '3px', borderRadius: '2px',
                  backgroundColor: steps[i + 1].done || (i + 1 === activeStep) ? '#22c55e' : '#333',
                  margin: '0 4px',
                  transition: 'background-color 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', padding: '0 0' }}>
        {steps.map((step, i) => (
          <div key={step.label} style={{
            flex: i === 0 || i === steps.length - 1 ? 0 : 1,
            textAlign: i === 0 ? 'left' : i === steps.length - 1 ? 'right' : 'center',
            minWidth: i === 0 || i === steps.length - 1 ? '50px' : undefined,
          }}>
            <span style={{
              fontSize: '10px', fontWeight: 600,
              color: step.done ? '#22c55e' : i === activeStep ? '#60a5fa' : '#555',
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ShipmentsPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const lang = getLang()
  const t = txt[lang as keyof typeof txt] || txt.fr
  usePageTitle(t.title)

  const [shipments, setShipments] = useState<ShipmentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ShipmentFilter>('all')

  const fetchShipments = useCallback(async () => {
    if (!user || !profile?.is_seller) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username)')
        .eq('seller_id', user.id)
        .in('status', ['shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchErr) throw fetchErr
      setShipments((data as ShipmentOrder[]) || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.is_seller])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(
      lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : 'en-US',
      { month: 'short', day: 'numeric' },
    )
  }

  const carrierLabel = (c: string | null) => {
    if (!c) return '—'
    // Strip sendcloud_ prefix (e.g. sendcloud_mondial_relay → mondial_relay)
    const normalized = c.startsWith('sendcloud_') ? c.replace('sendcloud_', '') : c
    const labels: Record<string, string> = {
      mondial_relay: 'Mondial Relay',
      colissimo: 'Colissimo',
      dpd: 'DPD',
      dhl: 'DHL',
      ups: 'UPS',
      fedex: 'FedEx',
      laposte: 'La Poste',
      chronopost: 'Chronopost',
      israel_post: 'Israel Post',
    }
    return labels[normalized] || normalized
  }

  const getItemImage = (order: ShipmentOrder) => {
    const urls = order.item?.image_urls
    if (urls && urls.length > 0) return urls[0]
    return null
  }

  // Apply filter
  const filtered = shipments.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'in_progress') return order.tracking_status === 'shipped' || order.tracking_status === 'in_transit'
    if (filter === 'delivered') return order.tracking_status === 'delivered' || order.status === 'delivered'
    if (filter === 'paid_out') return order.payout_status === 'released'
    return true
  })

  const inProgressCount = shipments.filter(
    (o) => o.tracking_status === 'shipped' || o.tracking_status === 'in_transit',
  ).length

  const filters: { key: ShipmentFilter; label: string; count?: number }[] = [
    { key: 'all', label: t.all },
    { key: 'in_progress', label: t.inProgress, count: inProgressCount },
    { key: 'delivered', label: t.delivered },
    { key: 'paid_out', label: t.paidOut },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1A1A1A',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#1A1A1A', border: '1px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ ...rtlFlip() }}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            {t.title}
          </h1>
        </div>

        {/* Filter chips */}
        <div style={{
          display: 'flex', gap: '8px', padding: '10px 16px 4px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: filter === f.key ? '1px solid #F0908A' : '1px solid #333',
                backgroundColor: filter === f.key ? 'rgba(240,144,138,0.12)' : '#1A1A1A',
                color: filter === f.key ? '#F0908A' : '#888',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span style={{
                  marginLeft: '6px', fontSize: '11px', fontWeight: 700,
                  backgroundColor: filter === f.key ? '#F0908A' : '#333',
                  color: filter === f.key ? '#fff' : '#888',
                  padding: '1px 7px', borderRadius: '10px',
                }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #333',
              borderTopColor: '#F0908A', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto',
            }} />
            <p style={{ fontSize: '13px', color: '#666', marginTop: '12px' }}>{t.loading}</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '12px' }}>{t.error}</p>
            <button
              onClick={fetchShipments}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                backgroundColor: '#1A1A1A', border: '1px solid #333',
                color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.retry}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{'📦'}</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{t.noShipments}</p>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{t.noShipmentsDesc}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((order) => {
              const img = getItemImage(order)
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/order/${order.id}`)}
                  style={{
                    backgroundColor: '#111', borderRadius: '16px',
                    border: '1px solid #1A1A1A', overflow: 'hidden',
                    cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                  data-tap
                >
                  {/* Top: item info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 14px 0' }}>
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        style={{
                          width: '48px', height: '48px', borderRadius: '10px',
                          objectFit: 'cover', flexShrink: 0,
                          backgroundColor: '#1A1A1A',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '10px',
                        backgroundColor: '#1A1A1A', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px',
                      }}>
                        {'📦'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {order.item?.title || '—'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                        {t.buyer}: {order.buyer_profile?.display_name || '—'}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ flexShrink: 0, ...rtlFlip() }}>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Progress bar */}
                  <div style={{ padding: '4px 14px' }}>
                    <ProgressBar order={order} t={t} />
                  </div>

                  {/* Bottom: tracking details */}
                  <div style={{
                    display: 'flex', gap: '16px', padding: '8px 14px 12px',
                    borderTop: '1px solid #1A1A1A', marginTop: '4px',
                    flexWrap: 'wrap',
                  }}>
                    {order.tracking_number && (
                      <div>
                        <p style={{ fontSize: '10px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                          {t.tracking}
                        </p>
                        <p style={{ fontSize: '12px', color: '#ccc', fontFamily: 'monospace', margin: '2px 0 0', fontWeight: 600 }}>
                          {order.tracking_number}
                        </p>
                      </div>
                    )}
                    {order.carrier && (
                      <div>
                        <p style={{ fontSize: '10px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                          {t.carrier}
                        </p>
                        <p style={{ fontSize: '12px', color: '#ccc', margin: '2px 0 0' }}>
                          {carrierLabel(order.carrier)}
                        </p>
                      </div>
                    )}
                    {order.shipped_at && (
                      <div>
                        <p style={{ fontSize: '10px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                          {t.shippedOn}
                        </p>
                        <p style={{ fontSize: '12px', color: '#ccc', margin: '2px 0 0' }}>
                          {formatDate(order.shipped_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shipPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
        }
      `}</style>
    </div>
  )
}

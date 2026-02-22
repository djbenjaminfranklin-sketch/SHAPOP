import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Browser } from '@capacitor/browser'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Order, Item, Stream } from '../types/database'
import StreamCard from '../components/StreamCard'
import ItemCard from '../components/ItemCard'
import VodPlayer from '../components/VodPlayer'

type StreamWithSeller = Stream & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }
type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

type MainTab = 'purchases' | 'sales' | 'following' | 'messages' | 'favorites' | 'offers'
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
  stream?: { recording_url: string | null } | null
}

interface SaleOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls' | 'category'>
  buyer_profile?: { display_name: string; username: string }
  stream?: { recording_url: string | null } | null
}

// Inline shipping section for a single paid order (weight + label)
function InlineShippingSection({ orderId, existingLabel, existingTracking, lang, buyerCountry, carrier, onLabelGenerated }: {
  orderId: string
  existingLabel: string | null
  existingTracking: string | null
  lang: string
  buyerCountry?: string
  carrier?: string
  onLabelGenerated?: () => void
}) {
  const [weightInput, setWeightInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [labelResult, setLabelResult] = useState<{ label_url: string; shipment_number: string } | null>(
    existingLabel && existingTracking ? { label_url: existingLabel, shipment_number: existingTracking } : null
  )
  const [error, setError] = useState<string | null>(null)
  const [shippingPreview, setShippingPreview] = useState<number | null>(null)

  const carrierShort = carrier === 'dpd' ? 'DPD' : carrier === 'dhl' ? 'DHL' : 'MR'
  const labels = {
    fr: { weight: 'Poids en grammes (ex: 500)', generate: `Etiquette ${carrierShort}`, ready: 'Prete', open: 'Ouvrir', shipping: 'Frais de port', paymentFailed: 'Le paiement des frais de port a echoue. L\'acheteur doit mettre a jour sa carte.' },
    en: { weight: 'Weight in grams (e.g. 500)', generate: `${carrierShort} Label`, ready: 'Ready', open: 'Open', shipping: 'Shipping cost', paymentFailed: 'Shipping payment failed. Buyer must update their card.' },
    he: { weight: 'משקל בגרמים (לדוגמה: 500)', generate: `תווית ${carrierShort}`, ready: 'מוכנה', open: 'פתח', shipping: 'דמי משלוח', paymentFailed: 'תשלום המשלוח נכשל. הקונה צריך לעדכן את הכרטיס.' },
    es: { weight: 'Peso en gramos (ej: 500)', generate: `Etiqueta ${carrierShort}`, ready: 'Lista', open: 'Abrir', shipping: 'Gastos de envio', paymentFailed: 'El pago del envio ha fallado. El comprador debe actualizar su tarjeta.' },
  }
  const lb = labels[lang as keyof typeof labels] || labels.fr

  // Preview shipping cost when weight changes
  const handleWeightChange = async (value: string) => {
    setWeightInput(value)
    setError(null)
    const weight = parseInt(value)
    if (!weight || weight <= 0) { setShippingPreview(null); return }
    try {
      const resp = await apiFetch(`/api/shipping/calculate?weight_grams=${weight}&carrier=${carrier || 'mondial_relay'}&country=${buyerCountry || 'FR'}`)
      if (resp.ok) {
        const data = await resp.json()
        setShippingPreview(data.shipping_cost)
      }
    } catch { /* ignore preview errors */ }
  }

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const weight = parseInt(weightInput)
    if (!weight || weight <= 0) { setError(lb.weight); return }
    setGenerating(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Auth'); setGenerating(false); return }
      const resp = await apiFetch(`/api/orders/${orderId}/create-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ weight_grams: weight }),
      })
      const data = await resp.json()
      if (resp.ok) {
        setLabelResult({ label_url: data.label_url, shipment_number: data.shipment_number })
        if (data.label_url) Browser.open({ url: data.label_url })
        onLabelGenerated?.()
      } else if (resp.status === 402) {
        setError(lb.paymentFailed)
      } else { setError(data.error || 'Erreur') }
    } catch { setError('Erreur reseau') }
    setGenerating(false)
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: '10px', borderTop: '1px solid #1A1A1A', paddingTop: '10px' }}>
      {labelResult ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: '10px',
          backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>{lb.ready}</span>
            <span style={{ fontSize: '11px', color: '#666', marginLeft: '6px' }}>#{labelResult.shipment_number}</span>
          </div>
          <button onClick={() => Browser.open({ url: labelResult.label_url })} style={{
            padding: '6px 14px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}>
            {lb.open}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="number"
              placeholder={lb.weight}
              value={weightInput}
              onClick={e => e.stopPropagation()}
              onChange={e => handleWeightChange(e.target.value)}
              style={{
                width: '90px', padding: '8px 10px', borderRadius: '8px',
                backgroundColor: '#111', border: '1px solid #333',
                color: '#fff', fontSize: '13px', fontWeight: 600, outline: 'none',
              }}
            />
            <button onClick={handleGenerate} disabled={generating} style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: generating ? '#333' : 'linear-gradient(135deg, #E8344E, #B91C1C)',
              border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700,
              cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}>
              {generating ? '...' : lb.generate}
            </button>
          </div>
          {shippingPreview != null && shippingPreview > 0 && (
            <p style={{ fontSize: '11px', color: '#3B82F6', margin: '6px 0 0', fontWeight: 600 }}>
              {lb.shipping} : {shippingPreview.toFixed(2)} EUR
            </p>
          )}
        </div>
      )}
      {error && <p style={{ fontSize: '11px', color: '#E8344E', marginTop: '4px', margin: '4px 0 0' }}>{error}</p>}
    </div>
  )
}

// Grouped order card for same-buyer shipments (all statuses)
function GroupedOrderCard({ group, buyerName, totalAmount, index, mounted, lang, formatAmount, formatDate, getItemImage, navigate, onLabelGenerated, onVideoMoment }: {
  group: SaleOrder[]
  buyerName: string
  totalAmount: number
  index: number
  mounted: boolean
  lang: string
  formatAmount: (n: number) => string
  formatDate: (s: string) => string
  getItemImage: (item: any) => string | null
  navigate: (path: string) => void
  onLabelGenerated?: () => void
  onVideoMoment?: (url: string, title: string, offset: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [labelResult, setLabelResult] = useState<{ label_url: string; shipment_number: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shippingPreview, setShippingPreview] = useState<number | null>(null)

  const paymentFailedMsg = lang === 'fr'
    ? 'Le paiement des frais de port a echoue. L\'acheteur doit mettre a jour sa carte.'
    : 'Shipping payment failed. Buyer must update their card.'

  // Preview shipping cost when weight changes
  const handleWeightChange = async (value: string) => {
    setWeightInput(value)
    setError(null)
    const weight = parseInt(value)
    if (!weight || weight <= 0) { setShippingPreview(null); return }
    const primaryAddr = group.find(o => o.shipping_address)?.shipping_address as Record<string, string> | null
    try {
      const groupCarrier = group[0]?.carrier || 'mondial_relay'
      const resp = await apiFetch(`/api/shipping/calculate?weight_grams=${weight}&carrier=${groupCarrier}&country=${primaryAddr?.country || 'FR'}`)
      if (resp.ok) {
        const data = await resp.json()
        setShippingPreview(data.shipping_cost)
      }
    } catch { /* ignore */ }
  }

  const handleGenerateLabel = async () => {
    const weight = parseInt(weightInput)
    if (!weight || weight <= 0) {
      setError(lang === 'fr' ? 'Entre le poids du colis (en grammes)' : 'Enter package weight (in grams)')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Non connecte'); setGenerating(false); return }

      const resp = await apiFetch('/api/orders/group-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_ids: group.filter(o => ['paid', 'preparing'].includes(o.status) && !o.label_url).map(o => o.id),
          weight_grams: weight,
        }),
      })
      const data = await resp.json()
      if (resp.ok) {
        setLabelResult({ label_url: data.label_url, shipment_number: data.shipment_number })
        if (data.label_url) Browser.open({ url: data.label_url })
        onLabelGenerated?.()
      } else if (resp.status === 402) {
        setError(paymentFailedMsg)
      } else {
        setError(data.error || 'Erreur')
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur reseau')
    }
    setGenerating(false)
  }

  const gcShort = group[0]?.carrier === 'dpd' ? 'DPD' : group[0]?.carrier === 'dhl' ? 'DHL' : 'MR'
  const groupLabels = {
    fr: { items: 'articles', total: 'Total', weight: 'Poids en grammes (ex: 500)', generate: `Generer l'etiquette ${gcShort}`, labelReady: 'Etiquette prete', openLabel: 'Ouvrir', groupShip: 'Envoi groupe' },
    en: { items: 'items', total: 'Total', weight: 'Weight in grams (e.g. 500)', generate: `Generate ${gcShort} label`, labelReady: 'Label ready', openLabel: 'Open', groupShip: 'Grouped shipment' },
    he: { items: 'פריטים', total: 'סה"כ', weight: 'משקל בגרמים (לדוגמה: 500)', generate: `הפק תווית ${gcShort}`, labelReady: 'תווית מוכנה', openLabel: 'פתח', groupShip: 'משלוח מרוכז' },
    es: { items: 'articulos', total: 'Total', weight: 'Peso en gramos (ej: 500)', generate: `Generar etiqueta ${gcShort}`, labelReady: 'Etiqueta lista', openLabel: 'Abrir', groupShip: 'Envio agrupado' },
  }
  const gl = groupLabels[lang as keyof typeof groupLabels] || groupLabels.fr

  return (
    <div style={{
      marginBottom: '12px',
      backgroundColor: '#0D0D0D', borderRadius: '14px',
      border: '1px solid rgba(59,130,246,0.3)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
      transition: `all 0.4s ease ${0.1 + index * 0.05}s`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        {/* Stacked item thumbnails */}
        <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
          {group.slice(0, 3).map((o, i) => {
            const img = getItemImage(o.item)
            return img ? (
              <img key={o.id} src={img} alt="" style={{
                position: 'absolute',
                top: i * 4, left: i * 4,
                width: '44px', height: '44px',
                borderRadius: '10px', objectFit: 'cover',
                border: '2px solid #0D0D0D',
                zIndex: 3 - i,
              }} />
            ) : null
          })}
          {!getItemImage(group[0].item) && (
            <div style={{
              width: '52px', height: '52px', borderRadius: '12px',
              backgroundColor: '#111', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px',
            }}>
              {'\uD83D\uDCE6'}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{buyerName}</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#3B82F6',
              backgroundColor: 'rgba(59,130,246,0.12)',
              padding: '2px 8px', borderRadius: '100px',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              {group.length} {gl.items}
            </span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0908A', margin: 0 }}>
            {gl.total}: {formatAmount(totalAmount)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
            <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>
              {formatDate(group[0].created_at)}
            </p>
            {group.some(o => ['paid', 'preparing'].includes(o.status) && !o.label_url) && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#F59E0B',
                backgroundColor: 'rgba(245,158,11,0.12)', padding: '2px 6px',
                borderRadius: '6px', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                {lang === 'fr' ? 'A expedier' : 'To ship'}
              </span>
            )}
            {group.every(o => o.status === 'delivered') && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#10B981',
                backgroundColor: 'rgba(16,185,129,0.12)', padding: '2px 6px',
                borderRadius: '6px', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                {lang === 'fr' ? 'Livre' : 'Delivered'}
              </span>
            )}
            {group.every(o => o.label_url) && !group.every(o => o.status === 'delivered') && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#10B981',
                backgroundColor: 'rgba(16,185,129,0.12)', padding: '2px 6px',
                borderRadius: '6px', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                {lang === 'fr' ? 'Etiquette prete' : 'Label ready'}
              </span>
            )}
          </div>
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded: item list + weight + label */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1A1A1A' }}>
          {/* Item list with status badges */}
          {group.map(order => {
            const sc = order.status === 'paid' ? '#3B82F6' : order.status === 'preparing' ? '#F59E0B' : order.status === 'shipped' ? '#10B981' : order.status === 'delivered' ? '#10B981' : order.status === 'refunded' ? '#8B5CF6' : '#666'
            const sl = order.status === 'paid' ? (lang === 'fr' ? 'Paye' : 'Paid')
              : order.status === 'preparing' ? (lang === 'fr' ? 'Prep.' : 'Prep.')
              : order.status === 'shipped' ? (lang === 'fr' ? 'Expedie' : 'Shipped')
              : order.status === 'delivered' ? (lang === 'fr' ? 'Livre' : 'Delivered')
              : order.status === 'refunded' ? (lang === 'fr' ? 'Rembourse' : 'Refunded')
              : order.status
            return (
              <div key={order.id} onClick={() => navigate(`/order/${order.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 0', borderBottom: '1px solid #111', cursor: 'pointer',
              }}>
                {getItemImage(order.item) ? (
                  <img src={getItemImage(order.item)!} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{'\uD83D\uDCB0'}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.item?.title || order.id.slice(0, 8)}
                  </p>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: sc,
                  backgroundColor: `${sc}14`, padding: '3px 8px', borderRadius: '8px',
                  border: `1px solid ${sc}30`, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {sl}
                </span>
                {order.stream?.recording_url && order.purchase_stream_offset_seconds != null && onVideoMoment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onVideoMoment(order.stream!.recording_url!, order.item?.title || 'Video', order.purchase_stream_offset_seconds!)
                    }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, padding: 0,
                    }}
                    title={lang === 'fr' ? 'Voir le moment' : 'See moment'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#8B5CF6" stroke="none">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                )}
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0908A', flexShrink: 0 }}>
                  {formatAmount(order.amount)}
                </span>
              </div>
            )
          })}

          {/* Label section — existing label from group, just-generated label, or generate new */}
          {group.find(o => o.label_url && o.tracking_number) && !labelResult ? (
            (() => {
              const lo = group.find(o => o.label_url && o.tracking_number)!
              return (
                <div style={{
                  marginTop: '12px', padding: '12px', borderRadius: '10px',
                  backgroundColor: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', margin: 0 }}>
                      {gl.labelReady}
                    </p>
                    <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>
                      # {lo.tracking_number}
                    </p>
                  </div>
                  <button onClick={() => Browser.open({ url: lo.label_url! })} style={{
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  }}>
                    {gl.openLabel}
                  </button>
                </div>
              )
            })()
          ) : labelResult ? (
            <div style={{
              marginTop: '12px', padding: '12px', borderRadius: '10px',
              backgroundColor: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', margin: 0 }}>
                  {gl.labelReady}
                </p>
                <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>
                  # {labelResult.shipment_number}
                </p>
              </div>
              <button onClick={() => Browser.open({ url: labelResult.label_url })} style={{
                padding: '8px 16px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}>
                {gl.openLabel}
              </button>
            </div>
          ) : group.some(o => ['paid', 'preparing'].includes(o.status) && !o.label_url) ? (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>
                {gl.groupShip} — {group.filter(o => ['paid', 'preparing'].includes(o.status) && !o.label_url).length} {gl.items}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder={gl.weight}
                  value={weightInput}
                  onChange={e => handleWeightChange(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: '#111', border: '1px solid #333',
                    color: '#fff', fontSize: '14px', fontWeight: 600,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleGenerateLabel}
                  disabled={generating}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: generating ? '#333' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    border: 'none', color: '#fff', fontSize: '13px',
                    fontWeight: 700, cursor: generating ? 'default' : 'pointer',
                    whiteSpace: 'nowrap', opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? '...' : gl.generate}
                </button>
              </div>
              {shippingPreview != null && shippingPreview > 0 && (
                <p style={{ fontSize: '11px', color: '#3B82F6', margin: '6px 0 0', fontWeight: 600 }}>
                  {lang === 'fr' ? 'Frais de port' : 'Shipping cost'} : {shippingPreview.toFixed(2)} EUR
                </p>
              )}
              {error && (
                <p style={{ fontSize: '12px', color: '#E8344E', marginTop: '6px' }}>{error}</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  const { user, profile } = useAuth()
  const lang = getLang()
  const location = useLocation()
  const navigate = useNavigate()
  const rawInitialTab = (location.state as { tab?: MainTab })?.tab || 'purchases'
  // Messages tab is a real page now — redirect if someone navigates here with tab=messages
  const initialTab = rawInitialTab === 'messages' ? 'purchases' : rawInitialTab

  const [mainTab, setMainTab] = useState<MainTab>(initialTab)
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [mounted, setMounted] = useState(false)

  // VodPlayer modal
  const [vodModal, setVodModal] = useState<{ url: string; title: string; offset?: number } | null>(null)

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

  // Favorites states
  const [favorites, setFavorites] = useState<StreamWithSeller[]>([])
  const [favoriteItems, setFavoriteItems] = useState<ItemWithSeller[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)

  // Offers states
  const [offers, setOffers] = useState<any[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)

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
  void fetchProofLevel // called when shipping modal opens

  // Fetch purchases (orders where user is buyer)
  const fetchPurchases = useCallback(async () => {
    if (!user) return
    setLoadingPurchases(true)
    setErrorPurchases(null)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, item:items(title, image_urls, category), stream:streams(recording_url)')
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
        .select('*, item:items(title, image_urls, category), buyer_profile:profiles!orders_buyer_id_fkey(display_name, username), stream:streams(recording_url)')
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

  // Fetch favorited streams + items
  const fetchFavorites = useCallback(async () => {
    if (!user) return
    setLoadingFavorites(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const headers = { Authorization: `Bearer ${session.access_token}` }

      const [streamsRes, itemsRes] = await Promise.all([
        apiFetch('/api/favorites', { headers }),
        apiFetch('/api/item-favorites', { headers }),
      ])

      if (streamsRes.ok) {
        setFavorites(await streamsRes.json() as StreamWithSeller[])
      }
      if (itemsRes.ok) {
        setFavoriteItems(await itemsRes.json() as ItemWithSeller[])
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    } finally {
      setLoadingFavorites(false)
    }
  }, [user])

  // Toggle stream favorite from the favorites tab
  const handleToggleFavorite = useCallback(async (streamId: string) => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await apiFetch(`/api/favorites/${streamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setFavorites(prev => prev.filter(s => s.id !== streamId))
    } catch (err) {
      console.error('Unfavorite error:', err)
    }
  }, [user])

  // Toggle item favorite from the favorites tab
  const handleToggleItemFavorite = useCallback(async (itemId: string) => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await apiFetch(`/api/item-favorites/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setFavoriteItems(prev => prev.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Unfavorite item error:', err)
    }
  }, [user])

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    if (!user) return
    setLoadingOffers(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const resp = await apiFetch('/api/offers', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (resp.ok) {
        setOffers(await resp.json())
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err)
    } finally {
      setLoadingOffers(false)
    }
  }, [user])

  const handleRespondToOffer = useCallback(async (offerId: string, action: 'accept' | 'decline') => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const resp = await apiFetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action }),
      })
      if (resp.ok) {
        fetchOffers()
      }
    } catch (err) {
      console.error('Failed to respond to offer:', err)
    }
  }, [user, fetchOffers])

  // Fetch data on mount and when tab changes
  useEffect(() => {
    if (mainTab === 'purchases') {
      fetchPurchases()
    } else if (mainTab === 'sales') {
      fetchSales()
    } else if (mainTab === 'following') {
      fetchFollowing()
    } else if (mainTab === 'favorites') {
      fetchFavorites()
    } else if (mainTab === 'offers') {
      fetchOffers()
    }
  }, [mainTab, fetchPurchases, fetchSales, fetchFollowing, fetchFavorites, fetchOffers])

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
      offersTab: 'Offres',
      emptyOffers: 'Aucune offre pour le moment',
      emptyOffersDesc: 'Tes offres envoyees et recues apparaitront ici',
      offerSent: 'Envoyee',
      offerReceived: 'Recue',
      offerAccept: 'Accepter',
      offerDecline: 'Refuser',
      offerPending: 'En attente',
      offerAccepted: 'Acceptee',
      offerDeclined: 'Refusee',
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
      emptyFavorites: 'Aucun favori pour le moment',
      emptyFavoritesDesc: 'Appuie sur le coeur d\'un live pour l\'ajouter ici',
      statusPendingPayment: 'En attente',
      statusPaid: 'Paye',
      statusPreparing: 'En preparation',
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
      seeVideoMoment: 'Voir le moment',
      shippingLabel: 'Etiquette d\'envoi',
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
      offersTab: 'Offers',
      emptyOffers: 'No offers yet',
      emptyOffersDesc: 'Offers you send and receive will appear here',
      offerSent: 'Sent',
      offerReceived: 'Received',
      offerAccept: 'Accept',
      offerDecline: 'Decline',
      offerPending: 'Pending',
      offerAccepted: 'Accepted',
      offerDeclined: 'Declined',
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
      emptyFavorites: 'No favorites yet',
      emptyFavoritesDesc: 'Tap the heart on a live to add it here',
      statusPendingPayment: 'Pending',
      statusPaid: 'Paid',
      statusPreparing: 'Preparing',
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
      seeVideoMoment: 'See moment',
      shippingLabel: 'Shipping label',
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
      offersTab: '\u05D4\u05E6\u05E2\u05D5\u05EA',
      emptyOffers: '\u05D0\u05D9\u05DF \u05D4\u05E6\u05E2\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyOffersDesc: '\u05D4\u05E6\u05E2\u05D5\u05EA \u05E9\u05EA\u05E9\u05DC\u05D7 \u05D5\u05EA\u05E7\u05D1\u05DC \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      offerSent: '\u05E0\u05E9\u05DC\u05D7\u05D4',
      offerReceived: '\u05D4\u05EA\u05E7\u05D1\u05DC\u05D4',
      offerAccept: '\u05E7\u05D1\u05DC',
      offerDecline: '\u05D3\u05D7\u05D4',
      offerPending: '\u05DE\u05DE\u05EA\u05D9\u05DF',
      offerAccepted: '\u05D0\u05D5\u05E9\u05E8\u05D4',
      offerDeclined: '\u05E0\u05D3\u05D7\u05EA\u05D4',
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
      emptyFavorites: '\u05D0\u05D9\u05DF \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyFavoritesDesc: '\u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05DC\u05D1 \u05E9\u05DC \u05E9\u05D9\u05D3\u05D5\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05DB\u05D0\u05DF',
      statusPendingPayment: '\u05DE\u05DE\u05EA\u05D9\u05DF',
      statusPaid: '\u05E9\u05D5\u05DC\u05DD',
      statusPreparing: '\u05D1\u05D4\u05DB\u05E0\u05D4',
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
      seeVideoMoment: '\u05E6\u05E4\u05D4 \u05D1\u05E8\u05D2\u05E2',
      shippingLabel: '\u05EA\u05D5\u05D5\u05D9\u05EA \u05DE\u05E9\u05DC\u05D5\u05D7',
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
      offersTab: 'Ofertas',
      emptyOffers: 'Sin ofertas todavia',
      emptyOffersDesc: 'Las ofertas que envies y recibas apareceran aqui',
      offerSent: 'Enviada',
      offerReceived: 'Recibida',
      offerAccept: 'Aceptar',
      offerDecline: 'Rechazar',
      offerPending: 'Pendiente',
      offerAccepted: 'Aceptada',
      offerDeclined: 'Rechazada',
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
      emptyFavorites: 'Sin favoritos todavia',
      emptyFavoritesDesc: 'Pulsa el corazon de un directo para agregarlo aqui',
      statusPendingPayment: 'Pendiente',
      statusPaid: 'Pagado',
      statusPreparing: 'En preparacion',
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
      seeVideoMoment: 'Ver momento',
      shippingLabel: 'Etiqueta de envio',
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
    { id: 'offers', label: (lt as any).offersTab || 'Offres', emoji: '\uD83E\uDD1D' },
  ]

  // Swipe between tabs
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }, [])
  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current)
    swipeStartX.current = null
    swipeStartY.current = null
    if (Math.abs(dx) < 50 || dy > Math.abs(dx)) return
    const tabIds: MainTab[] = mainTabs.map(t => t.id).filter(id => id !== 'messages') as MainTab[]
    const idx = tabIds.indexOf(mainTab)
    if (idx === -1) return
    if (dx < 0 && idx < tabIds.length - 1) { setMainTab(tabIds[idx + 1]); setSubFilter('all') }
    if (dx > 0 && idx > 0) { setMainTab(tabIds[idx - 1]); setSubFilter('all') }
  }, [mainTab, mainTabs])

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
      case 'preparing': return '#F59E0B'
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
      case 'preparing': return (lt as any).statusPreparing || 'En preparation'
      case 'shipped': return lt.statusShipped
      case 'delivered': return lt.statusDelivered
      case 'refunded': return lt.statusRefunded
      case 'disputed': return lt.statusDisputed
      default: return status
    }
  }

  const filterOrders = <T extends { status: Order['status'] }>(items: T[]): T[] => {
    switch (subFilter) {
      case 'active': return items.filter(o => ['pending_payment', 'paid', 'preparing', 'shipped'].includes(o.status))
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
        background: 'linear-gradient(135deg, rgba(232,52,78,0.12), rgba(232,52,78,0.06))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{lt.error}</p>
      <p style={{ fontSize: '13px', color: '#666', maxWidth: '260px', marginBottom: '16px' }}>{errorMsg}</p>
      <button
        onClick={onRetry}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#E8344E', fontSize: '14px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
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
              {!isSale && order.shipping_cost != null && order.shipping_cost > 0 && (
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>
                  {' '}+ {formatAmount(order.shipping_cost)} {lang === 'fr' ? 'livraison' : 'shipping'}
                </span>
              )}
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

        {/* Seller: inline shipping for paid/preparing orders */}
        {isSale && (order.status === 'paid' || order.status === 'preparing') && (
          order.shipping_address ? (
            <InlineShippingSection orderId={order.id} existingLabel={order.label_url} existingTracking={order.tracking_number} lang={lang} buyerCountry={(order.shipping_address as Record<string, string> | null)?.country} carrier={order.carrier || undefined} onLabelGenerated={fetchSales} />
          ) : (
            <div style={{ marginTop: '10px', borderTop: '1px solid #1A1A1A', paddingTop: '10px' }}>
              <p style={{ fontSize: '11px', color: '#F59E0B', margin: 0 }}>
                {lang === 'fr' ? 'En attente de l\'adresse de l\'acheteur' : 'Waiting for buyer address'}
              </p>
            </div>
          )
        )}

        {/* Seller: label already generated for shipped orders */}
        {isSale && order.status === 'shipped' && order.label_url && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); Browser.open({ url: order.label_url! }) }}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                color: '#10B981', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {'\uD83C\uDFF7\uFE0F'} {order.tracking_number || 'Etiquette'}
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

        {/* Video moment button — replay the purchase instant */}
        {order.stream?.recording_url && order.purchase_stream_offset_seconds != null && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setVodModal({
                  url: order.stream!.recording_url!,
                  title: order.item?.title || 'Video',
                  offset: order.purchase_stream_offset_seconds!,
                })
              }}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                color: '#8B5CF6', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {lt.seeVideoMoment}
            </button>
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

    // Group ALL orders by buyer_id — same buyer = same card
    const grouped: Record<string, SaleOrder[]> = {}
    for (const o of filtered) {
      const key = o.buyer_id
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(o)
    }
    const buyerGroups = Object.values(grouped).filter(g => g.length > 1)
    const ungrouped = Object.values(grouped).filter(g => g.length === 1).map(g => g[0])

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Grouped orders by buyer (2+ items from same buyer) */}
        {buyerGroups.map((group, gi) => {
          const buyer = group[0].buyer_profile
          const buyerName = buyer?.display_name || buyer?.username || 'Acheteur'
          const totalAmount = group.reduce((sum, o) => sum + o.amount, 0)
          const groupKey = group[0].buyer_id

          return (
            <GroupedOrderCard
              key={groupKey}
              group={group}
              buyerName={buyerName}
              totalAmount={totalAmount}
              index={gi}
              mounted={mounted}
              lang={lang}
              formatAmount={formatAmount}
              formatDate={formatDate}
              getItemImage={getItemImage}
              navigate={navigate}
              onLabelGenerated={fetchSales}
              onVideoMoment={(url, title, offset) => setVodModal({ url, title, offset })}
            />
          )
        })}

        {/* Single orders (only 1 from this buyer) */}
        {ungrouped.map((order, i) => renderOrderCard(order, buyerGroups.length + i, true))}
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
  const renderFavorites = () => {
    if (loadingFavorites) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )
    }
    if (favorites.length === 0 && favoriteItems.length === 0) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(15px)',
          transition: 'all 0.5s ease 0.2s',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,144,138,0.12), rgba(232,52,78,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            {(lt as any).emptyFavorites || 'Aucun favori'}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>
            {(lt as any).emptyFavoritesDesc || 'Appuie sur le coeur d\'un live pour l\'ajouter ici'}
          </p>
        </div>
      )
    }
    return (
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 12px' }}>
        {favorites.map(stream => (
          <StreamCard key={stream.id} stream={stream} isFavorited onToggleFavorite={handleToggleFavorite} />
        ))}
        {favoriteItems.map(item => (
          <ItemCard key={item.id} item={item} isFavorited onToggleFavorite={handleToggleItemFavorite} />
        ))}
      </div>
    )
  }

  const renderOffers = () => {
    if (loadingOffers) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #333', borderTopColor: '#E8344E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )
    }
    if (offers.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            {(lt as any).emptyOffers || 'Aucune offre'}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>
            {(lt as any).emptyOffersDesc || ''}
          </p>
        </div>
      )
    }
    const isSeller = !!profile?.is_seller
    return (
      <div style={{ padding: '16px' }}>
        {offers.map((offer: any, idx: number) => {
          const isReceived = offer.seller_id === user?.id
          const statusColor = offer.status === 'pending' ? '#F59E0B' : offer.status === 'accepted' ? '#10B981' : '#E8344E'
          const statusLabel = offer.status === 'pending' ? (lt as any).offerPending
            : offer.status === 'accepted' ? (lt as any).offerAccepted
            : (lt as any).offerDeclined
          const imgUrl = offer.item?.image_urls?.[0] || null
          return (
            <div key={offer.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px', marginBottom: '10px', borderRadius: '14px',
              backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
            }}>
              {imgUrl ? (
                <img src={imgUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {'\uD83E\uDD1D'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {offer.item?.title || 'Offre'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A' }}>{offer.amount}€</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: isReceived ? '#3B82F6' : '#8B5CF6',
                    backgroundColor: isReceived ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                    padding: '2px 6px', borderRadius: '6px',
                    border: isReceived ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(139,92,246,0.25)',
                  }}>
                    {isReceived ? ((lt as any).offerReceived || 'Recue') : ((lt as any).offerSent || 'Envoyee')}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: statusColor,
                    backgroundColor: `${statusColor}14`, padding: '2px 6px', borderRadius: '6px',
                    border: `1px solid ${statusColor}30`,
                  }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              {/* Seller actions: accept/decline for pending received offers */}
              {isReceived && isSeller && offer.status === 'pending' && (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleRespondToOffer(offer.id, 'accept')}
                    style={{
                      padding: '6px 10px', borderRadius: '8px', border: 'none',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {(lt as any).offerAccept || 'Accepter'}
                  </button>
                  <button
                    onClick={() => handleRespondToOffer(offer.id, 'decline')}
                    style={{
                      padding: '6px 10px', borderRadius: '8px',
                      border: '1px solid #333', background: 'transparent',
                      color: '#888', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {(lt as any).offerDecline || 'Refuser'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderContent = () => {
    switch (mainTab) {
      case 'purchases': return renderPurchases()
      case 'sales': return renderSales()
      case 'following': return renderFollowing()
      case 'messages': return renderMessages()
      case 'favorites': return renderFavorites()
      case 'offers': return renderOffers()
    }
  }

  const showSubFilters = mainTab === 'purchases' || mainTab === 'sales'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
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
        <div onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
          {renderContent()}
        </div>
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

      {/* VodPlayer modal */}
      {vodModal && (
        <VodPlayer
          recordingUrl={vodModal.url}
          title={vodModal.title}
          startOffset={vodModal.offset}
          onClose={() => setVodModal(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

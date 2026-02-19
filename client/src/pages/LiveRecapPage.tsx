import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import type { Item, Order, Profile } from '../types/database'
import ShippingLabel from '../components/ShippingLabel'
import VodPlayer from '../components/VodPlayer'

type Lang = 'fr' | 'en' | 'he' | 'es'

const pageContent = {
  fr: {
    title: 'Recapitulatif du live',
    sales: 'Ventes',
    totalRevenue: 'Chiffre d\'affaires',
    soldItems: 'Vendus',
    unsoldItems: 'Invendus',
    lot: 'Lot',
    buyer: 'Acheteur',
    price: 'Prix',
    status: 'Statut',
    paid: 'Paye',
    pending: 'En attente',
    shipped: 'Expedie',
    orderRef: 'N° commande',
    generateLabel: 'Generer etiquette',
    printAllLabels: 'Imprimer toutes les etiquettes',
    back: 'Retour',
    noSales: 'Aucune vente pour ce live',
    buyerDetails: 'Details acheteur',
    name: 'Nom',
    address: 'Adresse',
    phone: 'Telephone',
    email: 'Email',
    close: 'Fermer',
    articles: 'articles',
    sellerAddress: 'Adresse du vendeur',
    noAddress: 'Adresse non renseignee',
    watchVod: 'Regarder la VOD',
    peakViewers: 'Pic de spectateurs',
    duration: 'Duree du live',
    minutes: 'min',
  },
  en: {
    title: 'Live recap',
    sales: 'Sales',
    totalRevenue: 'Total revenue',
    soldItems: 'Sold',
    unsoldItems: 'Unsold',
    lot: 'Lot',
    buyer: 'Buyer',
    price: 'Price',
    status: 'Status',
    paid: 'Paid',
    pending: 'Pending',
    shipped: 'Shipped',
    orderRef: 'Order #',
    generateLabel: 'Generate label',
    printAllLabels: 'Print all labels',
    back: 'Back',
    noSales: 'No sales for this live',
    buyerDetails: 'Buyer details',
    name: 'Name',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    close: 'Close',
    articles: 'items',
    sellerAddress: 'Seller address',
    noAddress: 'Address not provided',
    watchVod: 'Watch VOD',
    peakViewers: 'Peak viewers',
    duration: 'Live duration',
    minutes: 'min',
  },
  he: {
    title: 'סיכום השידור',
    sales: 'מכירות',
    totalRevenue: 'מחזור',
    soldItems: 'נמכרו',
    unsoldItems: 'לא נמכרו',
    lot: 'לוט',
    buyer: 'קונה',
    price: 'מחיר',
    status: 'סטטוס',
    paid: 'שולם',
    pending: 'ממתין',
    shipped: 'נשלח',
    orderRef: 'מספר הזמנה',
    generateLabel: 'צור תווית',
    printAllLabels: 'הדפס את כל התוויות',
    back: 'חזור',
    noSales: 'אין מכירות לשידור זה',
    buyerDetails: 'פרטי קונה',
    name: 'שם',
    address: 'כתובת',
    phone: 'טלפון',
    email: 'אימייל',
    close: 'סגור',
    articles: 'פריטים',
    sellerAddress: 'כתובת המוכר',
    noAddress: 'כתובת לא סופקה',
    watchVod: 'צפה VOD',
    peakViewers: 'שיא צופים',
    duration: 'משך השידור',
    minutes: 'דק׳',
  },
  es: {
    title: 'Resumen del directo',
    sales: 'Ventas',
    totalRevenue: 'Ingreso total',
    soldItems: 'Vendidos',
    unsoldItems: 'No vendidos',
    lot: 'Lote',
    buyer: 'Comprador',
    price: 'Precio',
    status: 'Estado',
    paid: 'Pagado',
    pending: 'Pendiente',
    shipped: 'Enviado',
    orderRef: 'N° pedido',
    generateLabel: 'Generar etiqueta',
    printAllLabels: 'Imprimir todas las etiquetas',
    back: 'Volver',
    noSales: 'Sin ventas para este directo',
    buyerDetails: 'Detalles del comprador',
    name: 'Nombre',
    address: 'Direccion',
    phone: 'Telefono',
    email: 'Email',
    close: 'Cerrar',
    articles: 'articulos',
    sellerAddress: 'Direccion del vendedor',
    noAddress: 'Direccion no proporcionada',
    watchVod: 'Ver VOD',
    peakViewers: 'Pico de espectadores',
    duration: 'Duracion del directo',
    minutes: 'min',
  },
}

interface SaleRow {
  item: Item
  order: Order | null
  buyerProfile: Profile | null
  lotNumber: number
}

export default function LiveRecapPage() {
  const { streamId } = useParams<{ streamId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = (getLang() || 'fr') as Lang
  const ct = pageContent[lang] || pageContent.fr

  const [sales, setSales] = useState<SaleRow[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null)
  const [showLabel, setShowLabel] = useState<SaleRow | null>(null)
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null)
  const [streamInfo, setStreamInfo] = useState<{ recording_url: string | null; started_at: string | null; ended_at: string | null; peak_viewers: number; title: string } | null>(null)
  const [showVod, setShowVod] = useState(false)

  useEffect(() => {
    if (!streamId || !user) return

    const fetchData = async () => {
      // Fetch all items for this stream
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })

      if (!items) {
        setLoading(false)
        return
      }

      setAllItems(items)

      // Fetch orders for this stream
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('stream_id', streamId)

      // Fetch stream info (VOD, stats)
      const { data: streamData } = await supabase
        .from('streams')
        .select('recording_url, started_at, ended_at, peak_viewers, title')
        .eq('id', streamId)
        .single()
      if (streamData) setStreamInfo(streamData as { recording_url: string | null; started_at: string | null; ended_at: string | null; peak_viewers: number; title: string })

      // Fetch seller profile
      const { data: sp } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (sp) setSellerProfile(sp)

      // Build sale rows
      const rows: SaleRow[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.status !== 'sold') continue

        const order = orders?.find((o: Order) => o.item_id === item.id) || null

        let buyerProfile: Profile | null = null
        if (item.winner_id) {
          const { data: bp } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', item.winner_id)
            .single()
          buyerProfile = bp
        }

        rows.push({
          item,
          order,
          buyerProfile,
          lotNumber: i + 1,
        })
      }

      setSales(rows)
      setLoading(false)
    }

    fetchData()
  }, [streamId, user])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const formatLot = (n: number) => `#${String(n).padStart(3, '0')}`

  const totalRevenue = sales.reduce((sum, s) => sum + (s.order?.amount || s.item.current_price), 0)
  const soldCount = allItems.filter(it => it.status === 'sold').length
  const unsoldCount = allItems.filter(it => it.status === 'unsold').length

  const getStatusLabel = (order: Order | null) => {
    if (!order) return ct.pending
    switch (order.status) {
      case 'paid': return ct.paid
      case 'shipped': return ct.shipped
      default: return ct.pending
    }
  }

  const getStatusColor = (order: Order | null) => {
    if (!order) return '#F59E0B'
    switch (order.status) {
      case 'paid': return '#22C55E'
      case 'shipped': return '#3B82F6'
      default: return '#F59E0B'
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#000' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid #333', borderTopColor: '#F0908A',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Show shipping label
  if (showLabel) {
    return (
      <ShippingLabel
        sellerName={sellerProfile?.display_name || sellerProfile?.username || ''}
        sellerAddress={ct.sellerAddress}
        buyerName={showLabel.buyerProfile?.display_name || showLabel.buyerProfile?.username || ''}
        buyerAddress={showLabel.order?.shipping_address
          ? `${showLabel.order.shipping_address.street || ''}, ${showLabel.order.shipping_address.zip || ''} ${showLabel.order.shipping_address.city || ''}`
          : ct.noAddress}
        buyerPhone={showLabel.order?.shipping_address?.phone || ''}
        orderRef={showLabel.order?.stripe_payment_intent_id || ''}
        lotRef={formatLot(showLabel.lotNumber)}
        onClose={() => setShowLabel(null)}
      />
    )
  }

  // Show all labels
  if (showAllLabels) {
    return (
      <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
        <div className="no-print" style={{ padding: '16px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAllLabels(false)}
            style={{
              padding: '10px 20px', backgroundColor: '#111',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ct.back}
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {ct.printAllLabels}
          </button>
        </div>
        {sales.map((sale) => (
          <div key={sale.item.id} style={{ pageBreakAfter: 'always' }}>
            <ShippingLabel
              sellerName={sellerProfile?.display_name || sellerProfile?.username || ''}
              sellerAddress={ct.sellerAddress}
              buyerName={sale.buyerProfile?.display_name || sale.buyerProfile?.username || ''}
              buyerAddress={sale.order?.shipping_address
                ? `${sale.order.shipping_address.street || ''}, ${sale.order.shipping_address.zip || ''} ${sale.order.shipping_address.city || ''}`
                : ct.noAddress}
              buyerPhone={sale.order?.shipping_address?.phone || ''}
              orderRef={sale.order?.stripe_payment_intent_id || ''}
              lotRef={formatLot(sale.lotNumber)}
              embedded
            />
          </div>
        ))}
        <style>{`
          @media print {
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#000',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: '#000', borderBottom: '1px solid #1A1A1A',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{ct.title}</h1>
      </div>

      {/* Watch VOD button */}
      {streamInfo?.recording_url && (
        <div style={{ padding: '16px 16px 0' }}>
          <button
            onClick={() => setShowVod(true)}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              borderRadius: '14px', border: 'none',
              color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {ct.watchVod}
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px', padding: '16px',
      }}>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
            {totalRevenue.toLocaleString()} €
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>
            {ct.totalRevenue}
          </p>
        </div>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#22C55E', margin: 0 }}>
            {soldCount}
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>
            {ct.soldItems}
          </p>
        </div>
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#666', margin: 0 }}>
            {unsoldCount}
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>
            {ct.unsoldItems}
          </p>
        </div>
      </div>

      {/* Extra stats: peak viewers + duration */}
      {streamInfo && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '10px', padding: '0 16px 16px',
        }}>
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#8B5CF6', margin: 0 }}>
              {streamInfo.peak_viewers || 0}
            </p>
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>
              {ct.peakViewers}
            </p>
          </div>
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6', margin: 0 }}>
              {streamInfo.started_at && streamInfo.ended_at
                ? `${Math.round((new Date(streamInfo.ended_at).getTime() - new Date(streamInfo.started_at).getTime()) / 60000)}${ct.minutes}`
                : '-'}
            </p>
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>
              {ct.duration}
            </p>
          </div>
        </div>
      )}

      {/* Sales list */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {ct.sales} ({sales.length})
          </h2>
          {sales.length > 0 && (
            <button
              onClick={() => setShowAllLabels(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                borderRadius: '8px', border: 'none',
                color: '#fff', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.printAllLabels}
            </button>
          )}
        </div>

        {sales.length === 0 ? (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#666' }}>{ct.noSales}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sales.map((sale) => (
              <button
                key={sale.item.id}
                onClick={() => setSelectedSale(sale)}
                style={{
                  backgroundColor: '#111',
                  border: '1px solid #222',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {/* Lot thumbnail */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  backgroundColor: '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, overflow: 'hidden',
                }}>
                  {sale.item.image_urls?.[0] ? (
                    <img src={sale.item.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#F0908A' }}>
                      {formatLot(sale.lotNumber)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#F0908A' }}>
                      {formatLot(sale.lotNumber)}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      color: getStatusColor(sale.order),
                      backgroundColor: `${getStatusColor(sale.order)}15`,
                      padding: '2px 8px', borderRadius: '100px',
                    }}>
                      {getStatusLabel(sale.order)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px', fontWeight: 600, color: '#fff', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sale.item.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                    {sale.buyerProfile?.display_name || sale.buyerProfile?.username || sale.item.winner_id?.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                    {sale.item.current_price} €
                  </p>
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      {selectedSale && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            backgroundColor: '#111',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ct.lot} {formatLot(selectedSale.lotNumber)} — {selectedSale.item.title}
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#222', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Order info */}
            <div style={{
              backgroundColor: '#0D0D0D', borderRadius: '12px',
              padding: '14px', marginBottom: '14px',
            }}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{ct.orderRef}</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0908A', margin: 0 }}>
                {selectedSale.order?.stripe_payment_intent_id || '—'}
              </p>
            </div>

            {/* Price & status */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                flex: 1, backgroundColor: '#0D0D0D', borderRadius: '12px', padding: '14px',
              }}>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{ct.price}</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                  {selectedSale.item.current_price} €
                </p>
              </div>
              <div style={{
                flex: 1, backgroundColor: '#0D0D0D', borderRadius: '12px', padding: '14px',
              }}>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{ct.status}</p>
                <p style={{
                  fontSize: '15px', fontWeight: 700, margin: 0,
                  color: getStatusColor(selectedSale.order),
                }}>
                  {getStatusLabel(selectedSale.order)}
                </p>
              </div>
            </div>

            {/* Buyer details */}
            <div style={{
              backgroundColor: '#0D0D0D', borderRadius: '12px',
              padding: '14px', marginBottom: '14px',
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
                {ct.buyerDetails}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{ct.name}</p>
                  <p style={{ fontSize: '14px', color: '#fff', margin: '2px 0 0' }}>
                    {selectedSale.buyerProfile?.display_name || selectedSale.item.winner_id?.slice(0, 8).toUpperCase() || '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{ct.address}</p>
                  <p style={{ fontSize: '14px', color: '#fff', margin: '2px 0 0' }}>
                    {selectedSale.order?.shipping_address
                      ? `${selectedSale.order.shipping_address.street || ''}, ${selectedSale.order.shipping_address.zip || ''} ${selectedSale.order.shipping_address.city || ''}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{ct.phone}</p>
                  <p style={{ fontSize: '14px', color: '#fff', margin: '2px 0 0' }}>
                    {selectedSale.order?.shipping_address?.phone || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Generate label button */}
            <button
              onClick={() => {
                setSelectedSale(null)
                setShowLabel(selectedSale)
              }}
              style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                borderRadius: '14px', border: 'none',
                color: '#fff', fontSize: '16px', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="6" y="14" width="12" height="8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {ct.generateLabel}
            </button>
          </div>
        </div>
      )}

      {/* VodPlayer modal */}
      {showVod && streamInfo?.recording_url && (
        <VodPlayer
          recordingUrl={streamInfo.recording_url}
          title={streamInfo.title || ct.watchVod}
          onClose={() => setShowVod(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

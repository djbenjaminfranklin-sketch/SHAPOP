import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang } from '../lib/i18n'
import type { Item, Order, Profile } from '../types/database'
import ShippingLabel from '../components/checkout/ShippingLabel'
import VodPlayer from '../components/stream/VodPlayer'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'

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
    generateLabel: 'Etiquette',
    generateLabelShort: 'Etiquette',
    weightPlaceholder: 'Poids en grammes (ex: 500)',
    generatingLabel: 'Generation...',
    labelReady: 'Etiquette prete',
    downloadLabel: 'Ouvrir l\'etiquette',
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
    clips: 'Clips',
    createClip: 'Creer un clip',
    clipTitle: 'Titre du clip',
    clipStart: 'Debut (secondes)',
    clipDuration: 'Duree (secondes)',
    clipCreated: 'Clip cree !',
    clipCreating: 'Creation...',
    noClips: 'Aucun clip pour ce live',
    playClip: 'Lire',
    deleteClip: 'Supprimer',
    last60s: 'Dernieres 60s',
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
    generateLabel: 'Shipping Label',
    generateLabelShort: 'Label',
    weightPlaceholder: 'Weight in grams (e.g. 500)',
    generatingLabel: 'Generating...',
    labelReady: 'Label ready',
    downloadLabel: 'Open label',
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
    clips: 'Clips',
    createClip: 'Create a clip',
    clipTitle: 'Clip title',
    clipStart: 'Start (seconds)',
    clipDuration: 'Duration (seconds)',
    clipCreated: 'Clip created!',
    clipCreating: 'Creating...',
    noClips: 'No clips for this live',
    playClip: 'Play',
    deleteClip: 'Delete',
    last60s: 'Last 60s',
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
    generateLabel: 'תווית משלוח',
    generateLabelShort: 'תווית MR',
    weightPlaceholder: 'משקל בגרמים (לדוגמה: 500)',
    generatingLabel: 'יוצר...',
    labelReady: 'תווית מוכנה',
    downloadLabel: 'פתח תווית',
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
    clips: 'קליפים',
    createClip: 'צור קליפ',
    clipTitle: 'כותרת הקליפ',
    clipStart: 'התחלה (שניות)',
    clipDuration: 'משך (שניות)',
    clipCreated: 'הקליפ נוצר!',
    clipCreating: 'יוצר...',
    noClips: 'אין קליפים לשידור זה',
    playClip: 'הפעל',
    deleteClip: 'מחק',
    last60s: '60 שניות אחרונות',
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
    generateLabel: 'Etiqueta de envio',
    generateLabelShort: 'Etiqueta MR',
    weightPlaceholder: 'Peso en gramos (ej: 500)',
    generatingLabel: 'Generando...',
    labelReady: 'Etiqueta lista',
    downloadLabel: 'Abrir etiqueta',
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
    clips: 'Clips',
    createClip: 'Crear un clip',
    clipTitle: 'Titulo del clip',
    clipStart: 'Inicio (segundos)',
    clipDuration: 'Duracion (segundos)',
    clipCreated: 'Clip creado!',
    clipCreating: 'Creando...',
    noClips: 'No hay clips para este directo',
    playClip: 'Reproducir',
    deleteClip: 'Eliminar',
    last60s: 'Ultimos 60s',
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
  usePageTitle(ct.title)

  const [sales, setSales] = useState<SaleRow[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null)
  const [showLabel, setShowLabel] = useState<SaleRow | null>(null)
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null)
  const [streamInfo, setStreamInfo] = useState<{ recording_url: string | null; started_at: string | null; ended_at: string | null; peak_viewers: number; title: string } | null>(null)

  // MR label states
  const [labelWeight, setLabelWeight] = useState('')
  const [labelGenerating, setLabelGenerating] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)
  const [labelResult, setLabelResult] = useState<{ label_url: string; shipment_number: string } | null>(null)
  const [shippingPreview, setShippingPreview] = useState<number | null>(null)
  const [showVod, setShowVod] = useState(false)

  // Clips state
  const [clips, setClips] = useState<Array<{ id: string; title: string; start_seconds: number; duration_seconds: number; recording_url: string; created_at: string }>>([])
  const [showClipForm, setShowClipForm] = useState(false)
  const [clipTitle, setClipTitle] = useState('')
  const [clipStart, setClipStart] = useState('')
  const [clipDuration, setClipDuration] = useState('60')
  const [clipCreating, setClipCreating] = useState(false)
  const [clipPlaying, setClipPlaying] = useState<{ recording_url: string; start_seconds: number; title: string } | null>(null)

  // Preview shipping cost when weight changes
  const handleLabelWeightChange = async (value: string) => {
    setLabelWeight(value)
    setLabelError(null)
    setShippingPreview(null)
    const weight = parseInt(value)
    if (!weight || weight <= 0) return
    try {
      const country = selectedSale?.order?.shipping_address
        ? (selectedSale.order.shipping_address as Record<string, string>).country || 'FR'
        : 'FR'
      const orderCarrier = selectedSale?.order?.carrier || 'mondial_relay'
      const resp = await apiFetch(`/api/shipping/calculate?weight_grams=${weight}&carrier=${orderCarrier}&country=${country}`)
      if (resp.ok) {
        const data = await resp.json()
        setShippingPreview(data.shipping_cost)
      }
    } catch { /* ignore */ }
  }

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

      // Fetch clips
      try {
        const clipsResp = await apiFetch(`/api/streams/${streamId}/clips`)
        if (clipsResp.ok) {
          const clipsData = await clipsResp.json()
          setClips(clipsData)
        }
      } catch { /* ignore */ }

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}>
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
                onClick={() => { setSelectedSale(sale); setLabelWeight(''); setLabelError(null); setLabelResult(null) }}
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
                    <img src={sale.item.image_urls[0]} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

            {/* MR label generation: weight + button */}
            {selectedSale.order && ['paid', 'shipped'].includes(selectedSale.order.status) && selectedSale.order.shipping_address ? (
              selectedSale.order.label_url ? (
                <div style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', margin: 0 }}>{ct.labelReady}</p>
                    {selectedSale.order.tracking_number && (
                      <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>#{selectedSale.order.tracking_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => window.open(selectedSale.order!.label_url!, '_blank')}
                    style={{
                      padding: '10px 18px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {ct.downloadLabel}
                  </button>
                </div>
              ) : labelResult ? (
                <div style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', margin: 0 }}>{ct.labelReady}</p>
                    <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>#{labelResult.shipment_number}</p>
                  </div>
                  <button
                    onClick={() => window.open(labelResult.label_url, '_blank')}
                    style={{
                      padding: '10px 18px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {ct.downloadLabel}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder={ct.weightPlaceholder}
                    value={labelWeight}
                    onChange={e => handleLabelWeightChange(e.target.value)}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px',
                      border: '1px solid #333', backgroundColor: '#0D0D0D',
                      color: '#fff', fontSize: '14px', fontWeight: 600,
                      boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                  {shippingPreview != null && shippingPreview > 0 && (
                    <p style={{ fontSize: '12px', color: '#3B82F6', margin: 0, fontWeight: 600 }}>
                      {lang === 'fr' ? 'Frais de port' : 'Shipping cost'} : {shippingPreview.toFixed(2)} EUR
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      if (!selectedSale.order) return
                      const weight = parseInt(labelWeight)
                      if (!weight || weight <= 0) { setLabelError(ct.weightPlaceholder); return }
                      setLabelGenerating(true); setLabelError(null)
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) { setLabelError('Auth'); setLabelGenerating(false); return }
                        const resp = await apiFetch(`/api/orders/${selectedSale.order.id}/create-label`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                          body: JSON.stringify({ weight_grams: weight }),
                        })
                        const data = await resp.json()
                        if (resp.ok) {
                          setLabelResult({ label_url: data.label_url, shipment_number: data.shipment_number })
                          if (data.label_url) window.open(data.label_url, '_blank')
                        } else if (resp.status === 402) {
                          setLabelError(lang === 'fr'
                            ? 'Le paiement des frais de port a echoue. L\'acheteur doit mettre a jour sa carte.'
                            : 'Shipping payment failed. Buyer must update their card.')
                        } else { setLabelError(data.error || 'Erreur') }
                      } catch { setLabelError('Erreur reseau') }
                      setLabelGenerating(false)
                    }}
                    disabled={labelGenerating}
                    style={{
                      width: '100%', padding: '16px',
                      background: labelGenerating ? '#333' : 'linear-gradient(135deg, #E8344E, #B91C1C)',
                      borderRadius: '14px', border: 'none',
                      color: '#fff', fontSize: '16px', fontWeight: 700,
                      cursor: labelGenerating ? 'default' : 'pointer',
                      opacity: labelGenerating ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    {labelGenerating ? ct.generatingLabel : ct.generateLabel}
                  </button>
                  {labelError && <p style={{ color: '#E8344E', fontSize: '12px', textAlign: 'center', margin: 0 }}>{labelError}</p>}
                </div>
              )
            ) : (
              <button
                onClick={() => { setSelectedSale(null); setShowLabel(selectedSale) }}
                style={{
                  width: '100%', padding: '16px',
                  background: 'transparent', borderRadius: '14px', border: '1px solid #333',
                  color: '#aaa', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {ct.generateLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clips section */}
      {streamInfo?.recording_url && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {ct.clips} ({clips.length})
            </h2>
            <button
              onClick={() => {
                // Default to last 60s of the stream
                if (streamInfo.started_at && streamInfo.ended_at) {
                  const totalSec = Math.floor((new Date(streamInfo.ended_at).getTime() - new Date(streamInfo.started_at).getTime()) / 1000)
                  setClipStart(String(Math.max(0, totalSec - 60)))
                  setClipDuration('60')
                } else {
                  setClipStart('0')
                  setClipDuration('60')
                }
                setClipTitle('')
                setShowClipForm(!showClipForm)
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                borderRadius: '8px', border: 'none',
                color: '#fff', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.createClip}
            </button>
          </div>

          {/* Clip creation form */}
          {showClipForm && (
            <div style={{
              backgroundColor: '#111', borderRadius: '14px', padding: '16px',
              marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <input
                type="text"
                placeholder={ct.clipTitle}
                value={clipTitle}
                onChange={e => setClipTitle(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid #333', backgroundColor: '#0D0D0D',
                  color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>{ct.clipStart}</label>
                  <input
                    type="number"
                    value={clipStart}
                    onChange={e => setClipStart(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      border: '1px solid #333', backgroundColor: '#0D0D0D',
                      color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>{ct.clipDuration}</label>
                  <input
                    type="number"
                    value={clipDuration}
                    onChange={e => setClipDuration(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      border: '1px solid #333', backgroundColor: '#0D0D0D',
                      color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
              </div>
              {streamInfo.started_at && streamInfo.ended_at && (
                <button
                  onClick={() => {
                    const totalSec = Math.floor((new Date(streamInfo.ended_at!).getTime() - new Date(streamInfo.started_at!).getTime()) / 1000)
                    setClipStart(String(Math.max(0, totalSec - 60)))
                    setClipDuration('60')
                  }}
                  style={{
                    padding: '8px', borderRadius: '8px', border: '1px solid #333',
                    backgroundColor: 'transparent', color: '#8B5CF6', fontSize: '12px',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {ct.last60s}
                </button>
              )}
              <button
                disabled={clipCreating}
                onClick={async () => {
                  setClipCreating(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) { setClipCreating(false); return }
                    const resp = await apiFetch(`/api/streams/${streamId}/clips`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({
                        start_seconds: Number(clipStart) || 0,
                        duration_seconds: Number(clipDuration) || 60,
                        title: clipTitle || undefined,
                      }),
                    })
                    if (resp.ok) {
                      const newClip = await resp.json()
                      setClips(prev => [newClip, ...prev])
                      setShowClipForm(false)
                    }
                  } catch { /* ignore */ }
                  setClipCreating(false)
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: clipCreating ? '#333' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                  borderRadius: '12px', border: 'none',
                  color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: clipCreating ? 'default' : 'pointer',
                  opacity: clipCreating ? 0.6 : 1,
                }}
              >
                {clipCreating ? ct.clipCreating : ct.createClip}
              </button>
            </div>
          )}

          {/* Clips list */}
          {clips.length === 0 ? (
            <div style={{
              backgroundColor: '#111', borderRadius: '14px', padding: '24px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '13px', color: '#666' }}>{ct.noClips}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clips.map(clip => (
                <div key={clip.id} style={{
                  backgroundColor: '#111', borderRadius: '12px', padding: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clip.title}
                    </p>
                    <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                      {Math.floor(clip.start_seconds / 60)}:{String(clip.start_seconds % 60).padStart(2, '0')} — {clip.duration_seconds}s
                    </p>
                  </div>
                  <button
                    onClick={() => setClipPlaying({ recording_url: clip.recording_url, start_seconds: clip.start_seconds, title: clip.title })}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                      border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {ct.playClip}
                  </button>
                  <button
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      const resp = await apiFetch(`/api/streams/${streamId}/clips/${clip.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      })
                      if (resp.ok) setClips(prev => prev.filter(c => c.id !== clip.id))
                    }}
                    style={{
                      padding: '6px 10px', borderRadius: '8px',
                      backgroundColor: '#1A1A1A', border: '1px solid #333',
                      color: '#E8344E', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {ct.deleteClip}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clip VodPlayer */}
      {clipPlaying && (
        <VodPlayer
          recordingUrl={clipPlaying.recording_url}
          title={clipPlaying.title}
          startOffset={clipPlaying.start_seconds}
          onClose={() => setClipPlaying(null)}
        />
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

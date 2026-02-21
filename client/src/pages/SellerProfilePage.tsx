import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import VodPlayer from '../components/VodPlayer'

type Lang = ReturnType<typeof getLang>

// =============================================
// Translations (fr, en, he, es)
// =============================================
const content: Record<string, Record<string, string>> = {
  fr: {
    back: 'Retour',
    followers: 'Followers',
    followingLabel: 'Suivi(e)s',
    follow: 'Suivre',
    unfollow: 'Suivi',
    messages: 'Messages',
    editProfile: 'Modifier le profil',
    shopTab: 'Boutique',
    livesTab: 'Lives',
    reviewsTab: 'Avis',
    reviews: 'avis',
    avgDelivery: 'Delai de livraison moyen',
    sold: 'Vendu',
    days: 'j',
    noItems: 'Aucun article en vente',
    noLives: 'Aucun live',
    noReviews: 'Aucun avis pour le moment',
    loading: 'Chargement...',
    notFound: 'Vendeur introuvable',
    live: 'En direct',
    scheduled: 'Programme',
    ended: 'Termine',
    retry: 'Reessayer',
    reply: 'Repondre',
    sellerReply: 'Reponse du vendeur',
    send: 'Envoyer',
    seePurchase: 'Voir l\'achat',
    ordersTab: 'Commandes',
    financesTab: 'Finances',
    totalRevenue: 'CA total',
    monthlyRevenue: 'CA du mois',
    totalSales: 'Ventes totales',
    avgViewers: 'Spectateurs moy.',
    stripeConnected: 'Stripe connecte',
    stripePending: 'Stripe en attente',
    stripeNotConnected: 'Stripe non connecte',
    openPayments: 'Gerer les paiements',
    viewAll: 'Tout voir',
    noOrders: 'Aucune commande recente',
    watchVod: 'Regarder la VOD',
    recap: 'Recapitulatif',
    peakViewers: 'spectateurs',
  },
  en: {
    back: 'Back',
    followers: 'Followers',
    followingLabel: 'Following',
    follow: 'Follow',
    unfollow: 'Following',
    messages: 'Messages',
    editProfile: 'Edit profile',
    shopTab: 'Shop',
    livesTab: 'Lives',
    reviewsTab: 'Reviews',
    reviews: 'reviews',
    avgDelivery: 'Avg delivery time',
    sold: 'Sold',
    days: 'd',
    noItems: 'No items for sale',
    noLives: 'No lives yet',
    noReviews: 'No reviews yet',
    loading: 'Loading...',
    notFound: 'Seller not found',
    live: 'Live',
    scheduled: 'Scheduled',
    ended: 'Ended',
    retry: 'Retry',
    reply: 'Reply',
    sellerReply: 'Seller reply',
    send: 'Send',
    seePurchase: 'See purchase',
    ordersTab: 'Orders',
    financesTab: 'Finances',
    totalRevenue: 'Total revenue',
    monthlyRevenue: 'Monthly revenue',
    totalSales: 'Total sales',
    avgViewers: 'Avg viewers',
    stripeConnected: 'Stripe connected',
    stripePending: 'Stripe pending',
    stripeNotConnected: 'Stripe not connected',
    openPayments: 'Manage payments',
    viewAll: 'View all',
    noOrders: 'No recent orders',
    watchVod: 'Watch VOD',
    recap: 'Recap',
    peakViewers: 'viewers',
  },
  he: {
    back: '\u05D7\u05D6\u05E8\u05D4',
    followers: '\u05E2\u05D5\u05E7\u05D1\u05D9\u05DD',
    followingLabel: '\u05E2\u05D5\u05E7\u05D1',
    follow: '\u05E2\u05E7\u05D5\u05D1',
    unfollow: '\u05E2\u05D5\u05E7\u05D1',
    messages: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
    editProfile: '\u05E2\u05E8\u05D5\u05DA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC',
    shopTab: '\u05D7\u05E0\u05D5\u05EA',
    livesTab: '\u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD',
    reviewsTab: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA',
    reviews: '\u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA',
    avgDelivery: '\u05D6\u05DE\u05DF \u05DE\u05E9\u05DC\u05D5\u05D7 \u05DE\u05DE\u05D5\u05E6\u05E2',
    sold: '\u05E0\u05DE\u05DB\u05E8',
    days: '\u05D9',
    noItems: '\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05DE\u05DB\u05D9\u05E8\u05D4',
    noLives: '\u05D0\u05D9\u05DF \u05E9\u05D9\u05D3\u05D5\u05E8\u05D9\u05DD',
    noReviews: '\u05D0\u05D9\u05DF \u05D1\u05D9\u05E7\u05D5\u05E8\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
    loading: '\u05D8\u05D5\u05E2\u05DF...',
    notFound: '\u05DE\u05D5\u05DB\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0',
    live: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    scheduled: '\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF',
    ended: '\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD',
    retry: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1',
    reply: '\u05D4\u05E9\u05D1',
    sellerReply: '\u05EA\u05D2\u05D5\u05D1\u05EA \u05D4\u05DE\u05D5\u05DB\u05E8',
    send: '\u05E9\u05DC\u05D7',
    seePurchase: '\u05E6\u05E4\u05D4 \u05D1\u05E8\u05DB\u05D9\u05E9\u05D4',
    ordersTab: '\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA',
    financesTab: '\u05DB\u05E1\u05E4\u05D9\u05DD',
    totalRevenue: '\u05DE\u05D7\u05D6\u05D5\u05E8 \u05DB\u05D5\u05DC\u05DC',
    monthlyRevenue: '\u05DE\u05D7\u05D6\u05D5\u05E8 \u05D7\u05D5\u05D3\u05E9\u05D9',
    totalSales: '\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA',
    avgViewers: '\u05E6\u05D5\u05E4\u05D9\u05DD \u05DE\u05DE\u05D5\u05E6\u05E2',
    stripeConnected: 'Stripe \u05DE\u05D7\u05D5\u05D1\u05E8',
    stripePending: 'Stripe \u05D1\u05D4\u05DE\u05EA\u05E0\u05D4',
    stripeNotConnected: 'Stripe \u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8',
    openPayments: '\u05E0\u05D4\u05DC \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD',
    viewAll: '\u05E6\u05E4\u05D4 \u05D4\u05DB\u05DC',
    noOrders: '\u05D0\u05D9\u05DF \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA',
    watchVod: '\u05E6\u05E4\u05D4 VOD',
    recap: '\u05E1\u05D9\u05DB\u05D5\u05DD',
    peakViewers: '\u05E6\u05D5\u05E4\u05D9\u05DD',
  },
  es: {
    back: 'Volver',
    followers: 'Seguidores',
    followingLabel: 'Seguidos',
    follow: 'Seguir',
    unfollow: 'Siguiendo',
    messages: 'Mensajes',
    editProfile: 'Editar perfil',
    shopTab: 'Tienda',
    livesTab: 'Lives',
    reviewsTab: 'Opiniones',
    reviews: 'opiniones',
    avgDelivery: 'Tiempo medio de envio',
    sold: 'Vendido',
    days: 'd',
    noItems: 'Sin articulos en venta',
    noLives: 'Sin directos',
    noReviews: 'Sin opiniones todavia',
    loading: 'Cargando...',
    notFound: 'Vendedor no encontrado',
    live: 'En vivo',
    scheduled: 'Programado',
    ended: 'Terminado',
    retry: 'Reintentar',
    reply: 'Responder',
    sellerReply: 'Respuesta del vendedor',
    send: 'Enviar',
    seePurchase: 'Ver compra',
    ordersTab: 'Pedidos',
    financesTab: 'Finanzas',
    totalRevenue: 'Ingreso total',
    monthlyRevenue: 'Ingreso mensual',
    totalSales: 'Ventas totales',
    avgViewers: 'Espectadores prom.',
    stripeConnected: 'Stripe conectado',
    stripePending: 'Stripe pendiente',
    stripeNotConnected: 'Stripe no conectado',
    openPayments: 'Gestionar pagos',
    viewAll: 'Ver todo',
    noOrders: 'Sin pedidos recientes',
    watchVod: 'Ver VOD',
    recap: 'Resumen',
    peakViewers: 'espectadores',
  },
}

// =============================================
// Types
// =============================================
interface SellerProfile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  username: string
}

interface SellerData {
  store_name: string
  store_description: string | null
  shipping_delay_days?: number
  total_sales?: number
}

interface ReviewData {
  id: string
  rating: number
  comment: string | null
  created_at: string
  seller_id: string
  seller_response: string | null
  seller_responded_at: string | null
  buyer: { display_name: string; avatar_url: string | null } | null
  order: { stream_id: string | null; purchase_stream_offset_seconds: number | null; stream: { recording_url: string | null } | null } | null
}

interface ItemData {
  id: string
  title: string
  image_urls: string[]
  current_price: number
  starting_price: number
  status: string
  category: string
}

interface StreamData {
  id: string
  title: string
  thumbnail_url: string | null
  status: 'scheduled' | 'live' | 'ended'
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  viewer_count: number
  recording_url: string | null
  peak_viewers: number
}

interface RecentOrder {
  id: string
  item_title: string
  amount: number
  seller_payout?: number
  status: string
  created_at: string
  buyer_id?: string
  buyer_name?: string
  label_url?: string | null
  tracking_number?: string | null
  carrier?: string | null
}

interface DashboardData {
  total_revenue: number
  monthly_revenue: number
  total_sales: number
  avg_viewers: number
  recent_orders: RecentOrder[]
}

// =============================================
// BuyerGroupCard — grouped orders from same buyer
// =============================================
function BuyerGroupCard({ group, buyerName, total, lang, statusColor, statusLabel, navigate }: {
  group: RecentOrder[]
  buyerName: string
  total: number
  lang: string
  statusColor: Record<string, string>
  statusLabel: (s: string) => string
  navigate: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const itemsLabel = lang === 'fr' ? 'articles' : lang === 'es' ? 'articulos' : 'items'

  return (
    <div style={{
      backgroundColor: '#0D0D0D', borderRadius: '14px',
      border: '1px solid rgba(59,130,246,0.3)',
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
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0,
        }}>
          {'\uD83D\uDC64'}
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
              {group.length} {itemsLabel}
            </span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0908A', margin: 0 }}>
            Total: {total.toFixed(2)}&euro;
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded: individual orders */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1A1A1A' }}>
          {group.map(order => (
            <div
              key={order.id}
              onClick={() => navigate(`/order/${order.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 0', borderBottom: '1px solid #111', cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {order.item_title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    color: statusColor[order.status] || '#888',
                    backgroundColor: `${statusColor[order.status] || '#888'}14`,
                    padding: '2px 6px', borderRadius: '6px',
                    border: `1px solid ${statusColor[order.status] || '#888'}30`,
                  }}>
                    {statusLabel(order.status)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#555' }}>
                    {new Date(order.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0908A', flexShrink: 0 }}>
                {(order.amount || 0).toFixed(2)}&euro;
              </span>
            </div>
          ))}
          {/* Label display if any order in group has a label */}
          {(() => {
            const labelOrder = group.find(o => o.label_url && o.tracking_number)
            if (!labelOrder) return null
            return (
              <div style={{
                marginTop: '10px', padding: '10px 12px',
                backgroundColor: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '18px' }}>{'\uD83D\uDCE6'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#22C55E', margin: 0 }}>
                    {lang === 'fr' ? 'Etiquette prete' : 'Label ready'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
                    N° {labelOrder.tracking_number}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(labelOrder.label_url!, '_blank') }}
                  style={{
                    padding: '6px 14px', borderRadius: '8px',
                    backgroundColor: '#22C55E', color: '#fff',
                    fontSize: '12px', fontWeight: 700,
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {lang === 'fr' ? 'Ouvrir' : 'Open'}
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// =============================================
// Component
// =============================================
export default function SellerProfilePage() {
  const { id: sellerId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const lang: Lang = getLang()
  const t = content[lang] || content.fr

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [sellerData, setSellerData] = useState<SellerData | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'shop' | 'lives' | 'reviews' | 'orders' | 'finances'>('shop')

  // Tab data
  const [items, setItems] = useState<ItemData[]>([])
  const [streams, setStreams] = useState<StreamData[]>([])
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [totalSold, setTotalSold] = useState(0)
  const [shippingDelay, setShippingDelay] = useState(2)

  // Seller reply state
  const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  // VodPlayer modal
  const [vodModal, setVodModal] = useState<{ url: string; title: string; offset?: number } | null>(null)

  // Orders & Finances (lazy loaded, own profile only)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardFetched, setDashboardFetched] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'pending' | 'not_connected'>('not_connected')
  const [stripeStatusFetched, setStripeStatusFetched] = useState(false)

  const isOwnProfile = user?.id === sellerId

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
    type TabKey = 'shop' | 'lives' | 'reviews' | 'orders' | 'finances'
    const allTabs: TabKey[] = isOwnProfile
      ? ['shop', 'lives', 'reviews', 'orders', 'finances']
      : ['shop', 'lives', 'reviews']
    const idx = allTabs.indexOf(activeTab)
    if (idx === -1) return
    if (dx < 0 && idx < allTabs.length - 1) setActiveTab(allTabs[idx + 1])
    if (dx > 0 && idx > 0) setActiveTab(allTabs[idx - 1])
  }, [activeTab, isOwnProfile])

  // =============================================
  // Fetch seller profile data
  // =============================================
  const fetchProfile = useCallback(async () => {
    if (!sellerId) return
    setLoading(true)
    setError(false)
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, username')
        .eq('id', sellerId)
        .single()

      if (!prof) {
        setError(true)
        setLoading(false)
        return
      }
      setProfile(prof as SellerProfile)

      // Fetch seller data (may not exist if not a seller)
      const { data: seller } = await supabase
        .from('sellers')
        .select('store_name, store_description, shipping_delay_days, total_sales')
        .eq('id', sellerId)
        .single()
      if (seller) setSellerData(seller as SellerData)

      // Fetch follower count
      const { count: fCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
      setFollowersCount(fCount || 0)

      // Fetch following count (users this seller follows)
      const { count: fgCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sellerId)
      setFollowingCount(fgCount || 0)

      // Fetch reviews summary
      const reviewRes = await apiFetch(`/api/sellers/${sellerId}/reviews`)
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json()
        setReviews(reviewData.reviews || [])
        setAvgRating(reviewData.avg_rating || 0)
        setReviewCount(reviewData.total_count || 0)
      }

      // Fetch shipping delay
      const delayRes = await apiFetch(`/api/seller/${sellerId}/shipping-delay`)
      if (delayRes.ok) {
        const delayData = await delayRes.json()
        setShippingDelay(delayData.shipping_delay_days ?? 2)
      }

      // Fetch items (active + sold)
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, title, image_urls, current_price, starting_price, status, category')
        .eq('seller_id', sellerId)
        .in('status', ['active', 'sold'])
        .order('created_at', { ascending: false })
        .limit(50)
      setItems((itemsData || []) as ItemData[])

      // Count sold items
      const { count: soldCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .in('status', ['paid', 'shipped', 'delivered', 'completed'])
      setTotalSold(soldCount || 0)

      // Fetch streams
      const { data: streamsData } = await supabase
        .from('streams')
        .select('id, title, thumbnail_url, status, scheduled_at, started_at, ended_at, viewer_count, recording_url, peak_viewers')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(30)
      setStreams((streamsData || []) as StreamData[])

      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Check follow status
  useEffect(() => {
    if (!sellerId || !session?.access_token || !user || isOwnProfile) return
    apiFetch(`/api/follow/${sellerId}/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsFollowing(d.following) })
      .catch(() => {})
  }, [sellerId, session, user, isOwnProfile])

  // Lazy-load dashboard data when Orders or Finances tab is clicked
  useEffect(() => {
    if (!isOwnProfile || !session?.access_token) return
    if (activeTab !== 'orders' && activeTab !== 'finances') return
    if (dashboardFetched) return
    setDashboardLoading(true)
    apiFetch('/api/seller/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setDashboardData(d)
        setDashboardFetched(true)
      })
      .catch(() => {})
      .finally(() => setDashboardLoading(false))
  }, [activeTab, isOwnProfile, session, dashboardFetched])

  // Lazy-load Stripe status when Finances tab is clicked
  useEffect(() => {
    if (!isOwnProfile || !session?.access_token) return
    if (activeTab !== 'finances') return
    if (stripeStatusFetched) return
    apiFetch('/api/stripe/account-status', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          if (d.charges_enabled) setStripeStatus('connected')
          else if (d.details_submitted) setStripeStatus('pending')
          else setStripeStatus('not_connected')
        }
        setStripeStatusFetched(true)
      })
      .catch(() => { setStripeStatusFetched(true) })
  }, [activeTab, isOwnProfile, session, stripeStatusFetched])

  const toggleFollow = async () => {
    if (!sellerId || !session?.access_token) return
    const method = isFollowing ? 'DELETE' : 'POST'
    const res = await apiFetch(`/api/follow/${sellerId}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setIsFollowing(!isFollowing)
      setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1)
    }
  }

  // =============================================
  // Submit seller reply to a review
  // =============================================
  const submitReply = async (reviewId: string) => {
    if (!replyText.trim() || !session?.access_token || replySending) return
    setReplySending(true)
    try {
      const res = await apiFetch(`/api/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: replyText.trim() }),
      })
      if (res.ok) {
        // Update the review in local state
        setReviews(prev => prev.map(r =>
          r.id === reviewId
            ? { ...r, seller_response: replyText.trim(), seller_responded_at: new Date().toISOString() }
            : r
        ))
        setReplyingToReviewId(null)
        setReplyText('')
      }
    } catch {
      // silently fail
    } finally {
      setReplySending(false)
    }
  }

  // =============================================
  // Star rendering helper
  // =============================================
  const renderStars = (rating: number, size = 14) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      const fill = i <= Math.round(rating) ? '#F0908A' : '#333'
      stars.push(
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
    return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>
  }

  // =============================================
  // Render
  // =============================================

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          role="status"
          aria-label="Loading"
          style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#E8344E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#888', fontSize: '16px' }}>{t.notFound}</p>
        <button
          onClick={fetchProfile}
          style={{
            background: 'none', border: 'none', color: '#E8344E',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {t.retry}
        </button>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username
  const bio = sellerData?.store_description || profile.bio

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '100px' }}>
      {/* =============================================
          HEADER
         ============================================= */}
      <div style={{
        padding: '16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          aria-label={t.back}
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </h1>
      </div>

      {/* =============================================
          PROFILE HEADER
         ============================================= */}
      <div style={{ padding: '0 16px 20px', textAlign: 'center' }}>
        {/* Avatar */}
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%', margin: '0 auto 12px',
          backgroundColor: '#222', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid #F0908A',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '36px', fontWeight: 700, color: '#888' }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + Bio */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
          {displayName}
        </h2>
        {bio && (
          <p style={{ fontSize: '14px', color: '#888', margin: '0 0 16px', lineHeight: 1.5, maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
            {bio}
          </p>
        )}

        {/* =============================================
            STAT CARDS
           ============================================= */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {/* Rating card */}
          <div style={{
            flex: 1, backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#F0908A" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              {reviewCount} {t.reviews}
            </span>
          </div>

          {/* Delivery delay card */}
          <div style={{
            flex: 1, backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              {shippingDelay}{t.days}
            </span>
            <span style={{ fontSize: '11px', color: '#888', textAlign: 'center', lineHeight: 1.3 }}>
              {t.avgDelivery}
            </span>
          </div>

          {/* Items sold card */}
          <div style={{
            flex: 1, backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              {totalSold}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              {t.sold}
            </span>
          </div>
        </div>

        {/* Followers / Following text */}
        <p style={{ fontSize: '14px', color: '#aaa', margin: '0 0 16px' }}>
          <span style={{ fontWeight: 700, color: '#fff' }}>{followersCount}</span>{' '}{t.followers}
          {' '}&middot;{' '}
          <span style={{ fontWeight: 700, color: '#fff' }}>{followingCount}</span>{' '}{t.followingLabel}
        </p>

        {/* =============================================
            ACTION BUTTONS
           ============================================= */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate('/messages')}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: '#1A1A1A', border: '1px solid #333',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.messages}
              </button>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.editProfile}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleFollow}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  background: isFollowing ? 'transparent' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: isFollowing ? '1px solid #333' : 'none',
                  color: isFollowing ? '#888' : '#fff',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {isFollowing ? t.unfollow : t.follow}
              </button>
              <button
                onClick={() => navigate(`/conversation/${sellerId}`)}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: '#1A1A1A', border: '1px solid #333',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.messages}
              </button>
            </>
          )}
        </div>
      </div>

      {/* =============================================
          TABS
         ============================================= */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #222',
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        <style>{`.seller-tabs::-webkit-scrollbar { display: none; }`}</style>
        {(isOwnProfile
          ? (['shop', 'lives', 'reviews', 'orders', 'finances'] as const)
          : (['shop', 'lives', 'reviews'] as const)
        ).map(tab => {
          const labels: Record<string, string> = {
            shop: t.shopTab, lives: t.livesTab, reviews: t.reviewsTab,
            orders: t.ordersTab, finances: t.financesTab,
          }
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: isOwnProfile ? 'none' : 1,
                minWidth: isOwnProfile ? '0' : undefined,
                padding: '14px 16px', border: 'none', background: 'none',
                color: isActive ? '#F0908A' : '#666',
                fontSize: '14px', fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? '2px solid #F0908A' : '2px solid transparent',
                cursor: 'pointer', transition: 'color 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* =============================================
          TAB CONTENT
         ============================================= */}
      <div style={{ padding: '16px' }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
        {/* ---------- BOUTIQUE TAB ---------- */}
        {activeTab === 'shop' && (
          items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontSize: '14px' }}>{t.noItems}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  data-tap="true"
                  style={{
                    backgroundColor: '#1A1A1A', borderRadius: '14px', overflow: 'hidden',
                    cursor: 'pointer', transition: 'transform 0.15s',
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#111', position: 'relative' }}>
                    {item.image_urls?.[0] ? (
                      <img src={item.image_urls[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {item.status === 'sold' && (
                      <div style={{
                        position: 'absolute', top: '8px', left: '8px',
                        backgroundColor: 'rgba(232,52,78,0.9)', color: '#fff',
                        fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                      }}>
                        {t.sold}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{
                      fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 4px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                      {item.current_price || item.starting_price}&euro;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ---------- LIVES TAB ---------- */}
        {activeTab === 'lives' && (
          streams.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontSize: '14px' }}>{t.noLives}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {streams.map(stream => {
                const statusColors: Record<string, string> = { live: '#E8344E', scheduled: '#f59e0b', ended: '#555' }
                const statusLabels: Record<string, string> = { live: t.live, scheduled: t.scheduled, ended: t.ended }
                const hasVod = stream.status === 'ended' && !!stream.recording_url
                const noVod = stream.status === 'ended' && !stream.recording_url
                // Duration in minutes
                const durationMin = stream.started_at && stream.ended_at
                  ? Math.round((new Date(stream.ended_at).getTime() - new Date(stream.started_at).getTime()) / 60000)
                  : null
                return (
                  <div
                    key={stream.id}
                    onClick={() => {
                      if (hasVod) {
                        setVodModal({ url: stream.recording_url!, title: stream.title })
                      } else if (stream.status === 'live' || stream.status === 'scheduled') {
                        navigate(`/stream/${stream.id}`)
                      }
                    }}
                    data-tap="true"
                    style={{
                      display: 'flex', gap: '12px', backgroundColor: '#1A1A1A',
                      borderRadius: '14px', padding: '12px',
                      cursor: noVod ? 'default' : 'pointer',
                      opacity: noVod ? 0.5 : 1,
                    }}
                  >
                    {/* Thumbnail with play overlay */}
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '10px', backgroundColor: '#111',
                      overflow: 'hidden', flexShrink: 0, position: 'relative',
                    }}>
                      {stream.thumbnail_url ? (
                        <img src={stream.thumbnail_url} alt={stream.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                        </div>
                      )}
                      {/* Play overlay for VOD */}
                      {hasVod && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                      )}
                      {/* Duration badge */}
                      {durationMin != null && durationMin > 0 && (
                        <span style={{
                          position: 'absolute', bottom: '4px', right: '4px',
                          backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
                          fontSize: '10px', fontWeight: 700, padding: '2px 5px',
                          borderRadius: '4px',
                        }}>
                          {durationMin}min
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                      <p style={{
                        fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {stream.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, color: '#fff',
                          backgroundColor: statusColors[stream.status] || '#555',
                          padding: '2px 8px', borderRadius: '6px',
                        }}>
                          {statusLabels[stream.status] || stream.status}
                        </span>
                        {stream.peak_viewers > 0 && (
                          <span style={{ fontSize: '12px', color: '#888' }}>
                            {stream.peak_viewers} {t.peakViewers}
                          </span>
                        )}
                      </div>
                      {stream.scheduled_at && (
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(stream.scheduled_at).toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                      {/* Recap link for own profile */}
                      {isOwnProfile && stream.status === 'ended' && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/live-recap/${stream.id}`) }}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            color: '#F0908A', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', textAlign: 'left', marginTop: '2px',
                          }}
                        >
                          {t.recap} &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ---------- AVIS (REVIEWS) TAB ---------- */}
        {activeTab === 'reviews' && (
          reviews.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontSize: '14px' }}>{t.noReviews}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map(review => {
                const buyerName = (review.buyer as { display_name: string } | null)?.display_name || 'User'
                const buyerAvatar = (review.buyer as { avatar_url: string | null } | null)?.avatar_url
                return (
                  <div key={review.id} style={{
                    backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#222',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {buyerAvatar ? (
                          <img src={buyerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#888' }}>
                            {buyerName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>{buyerName}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          {renderStars(review.rating, 12)}
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            {new Date(review.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p style={{ fontSize: '13px', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
                        {review.comment}
                      </p>
                    )}

                    {/* Seller response */}
                    {review.seller_response && (
                      <div style={{
                        marginTop: '10px', padding: '10px 12px', backgroundColor: '#222',
                        borderRadius: '10px', borderLeft: '3px solid #F0908A',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
                          </svg>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0908A' }}>
                            {t.sellerReply}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
                          {review.seller_response}
                        </p>
                      </div>
                    )}

                    {/* Reply button for own profile + reply form */}
                    {isOwnProfile && !review.seller_response && (
                      replyingToReviewId === review.id ? (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value.slice(0, 500))}
                            placeholder={t.reply + '...'}
                            style={{
                              flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #333',
                              backgroundColor: '#111', color: '#fff', fontSize: '13px', resize: 'none',
                              minHeight: '60px', fontFamily: 'inherit', outline: 'none',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#F0908A' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#333' }}
                          />
                          <button
                            onClick={() => submitReply(review.id)}
                            disabled={!replyText.trim() || replySending}
                            style={{
                              padding: '10px 16px', borderRadius: '10px', border: 'none',
                              background: replyText.trim() ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333',
                              color: '#fff', fontSize: '13px', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'default',
                              opacity: replySending ? 0.5 : 1, whiteSpace: 'nowrap',
                            }}
                          >
                            {t.send}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyingToReviewId(review.id); setReplyText('') }}
                          style={{
                            marginTop: '10px', padding: '6px 12px', borderRadius: '8px',
                            border: '1px solid #333', backgroundColor: 'transparent',
                            color: '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
                          </svg>
                          {t.reply}
                        </button>
                      )
                    )}

                    {/* See purchase button — opens VodPlayer */}
                    {review.order?.stream?.recording_url && review.order.purchase_stream_offset_seconds != null && (
                      <button
                        onClick={() => {
                          setVodModal({
                            url: review.order!.stream!.recording_url!,
                            title: t.seePurchase,
                            offset: review.order!.purchase_stream_offset_seconds!,
                          })
                        }}
                        style={{
                          marginTop: '8px', padding: '6px 12px', borderRadius: '8px',
                          border: '1px solid #F0908A', backgroundColor: 'transparent',
                          color: '#F0908A', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        {t.seePurchase}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
        {/* ---------- ORDERS TAB (own profile) ---------- */}
        {activeTab === 'orders' && isOwnProfile && (
          dashboardLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !dashboardData || dashboardData.recent_orders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0', fontSize: '14px' }}>{t.noOrders}</p>
          ) : (() => {
            const orders = dashboardData.recent_orders
            const statusColor: Record<string, string> = {
              paid: '#22C55E', shipped: '#3B82F6', delivered: '#8B5CF6',
              pending_payment: '#F59E0B', pending: '#F59E0B', preparing: '#F59E0B',
            }
            const statusLabel = (s: string) => {
              if (lang === 'fr') return s === 'paid' ? 'Paye' : s === 'preparing' ? 'Prep.' : s === 'shipped' ? 'Expedie' : s === 'delivered' ? 'Livre' : s === 'pending_payment' ? 'En attente' : s === 'refunded' ? 'Rembourse' : s
              return s === 'paid' ? 'Paid' : s === 'preparing' ? 'Prep.' : s === 'shipped' ? 'Shipped' : s === 'delivered' ? 'Delivered' : s === 'pending_payment' ? 'Pending' : s === 'refunded' ? 'Refunded' : s
            }
            // Group by buyer_id
            const grouped: Record<string, RecentOrder[]> = {}
            for (const o of orders) {
              const key = o.buyer_id || o.id
              if (!grouped[key]) grouped[key] = []
              grouped[key].push(o)
            }
            const buyerGroups = Object.values(grouped).filter(g => g.length > 1)
            const ungrouped = Object.values(grouped).filter(g => g.length === 1).map(g => g[0])

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Grouped orders by buyer */}
                {buyerGroups.map((group, gi) => {
                  const buyerName = group[0].buyer_name || (lang === 'fr' ? 'Acheteur' : 'Buyer')
                  const total = group.reduce((s, o) => s + (o.amount || 0), 0)
                  const [expanded, setExpanded] = [
                    // Use a simple trick: store expanded state via data attribute
                    false, () => {}
                  ]
                  return <BuyerGroupCard key={gi} group={group} buyerName={buyerName} total={total}
                    lang={lang} statusColor={statusColor} statusLabel={statusLabel} navigate={navigate} />
                })}
                {/* Single orders */}
                {ungrouped.map(order => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/order/${order.id}`)}
                    data-tap="true"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {order.item_title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          color: statusColor[order.status] || '#888',
                          backgroundColor: `${statusColor[order.status] || '#888'}15`,
                          padding: '2px 8px', borderRadius: '100px',
                        }}>
                          {statusLabel(order.status)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(order.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'fr-FR', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                        {order.buyer_name && (
                          <span style={{ fontSize: '12px', color: '#888' }}>{order.buyer_name}</span>
                        )}
                        {order.label_url && (
                          <span
                            onClick={(e) => { e.stopPropagation(); window.open(order.label_url!, '_blank') }}
                            style={{ fontSize: '10px', fontWeight: 700, color: '#22C55E', backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: '100px', cursor: 'pointer' }}
                          >
                            {'\uD83D\uDCE6'} {lang === 'fr' ? 'Etiquette' : 'Label'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A', flexShrink: 0 }}>
                      {(order.amount || 0).toFixed(2)}&euro;
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/activity?tab=sales')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    border: '1px solid #333', backgroundColor: 'transparent',
                    color: '#F0908A', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', marginTop: '4px',
                  }}
                >
                  {t.viewAll}
                </button>
              </div>
            )
          })()
        )}

        {/* ---------- FINANCES TAB (own profile) ---------- */}
        {activeTab === 'finances' && isOwnProfile && (
          dashboardLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid #333', borderTopColor: '#F0908A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stats grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                    {dashboardData ? `${dashboardData.total_revenue.toLocaleString()}\u20AC` : '-'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>{t.totalRevenue}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: '#22C55E', margin: 0 }}>
                    {dashboardData ? `${dashboardData.monthly_revenue.toLocaleString()}\u20AC` : '-'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>{t.monthlyRevenue}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {dashboardData?.total_sales ?? '-'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>{t.totalSales}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {dashboardData?.avg_viewers ?? '-'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 600 }}>{t.avgViewers}</p>
                </div>
              </div>

              {/* Stripe status card */}
              <div style={{
                backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: stripeStatus === 'connected' ? '#22C55E' : stripeStatus === 'pending' ? '#F59E0B' : '#EF4444',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', flex: 1 }}>
                  {stripeStatus === 'connected' ? t.stripeConnected : stripeStatus === 'pending' ? t.stripePending : t.stripeNotConnected}
                </span>
              </div>

              {/* Open payments page */}
              <button
                onClick={() => navigate('/payments')}
                style={{
                  width: '100%', padding: '16px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  borderRadius: '14px', border: 'none',
                  color: '#fff', fontSize: '16px', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.openPayments}
              </button>
            </div>
          )
        )}
      </div>

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

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'
import { getLang, getLocale, type Lang, type Localized } from '../lib/i18n'
import { formatMoney, currencyForCountry, displayItemTitle } from '../lib/fulfillment'
import VodPlayer from '../components/stream/VodPlayer'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'


// =============================================
// Traductions (en, fr, es, ru, he)
// =============================================
type SellerText = Record<'back' | 'followers' | 'followingLabel' | 'follow' | 'unfollow' | 'messages' | 'editProfile' | 'shopTab' | 'livesTab' | 'reviewsTab' | 'reviews' | 'handoverWithin' | 'messageError' | 'sold' | 'noItems' | 'noLives' | 'noReviews' | 'loading' | 'notFound' | 'live' | 'scheduled' | 'ended' | 'retry' | 'reply' | 'sellerReply' | 'send' | 'seePurchase' | 'ordersTab' | 'financesTab' | 'totalRevenue' | 'monthlyRevenue' | 'totalSales' | 'avgViewers' | 'stripeConnected' | 'stripePending' | 'stripeNotConnected' | 'openPayments' | 'viewAll' | 'noOrders' | 'watchVod' | 'recap' | 'peakViewers' | 'minutes' | 'seeMoment' | 'buyer' | 'user' | 'video' | 'total' | 'stPaid' | 'stPreparing' | 'stShipped' | 'stDelivered' | 'stPending' | 'stRefunded', string>

const content: Localized<SellerText> = {
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
    handoverWithin: 'Handover within {n}\u00A0d',
    messageError: 'Couldn\'t open the conversation. Check your connection and try again.',
    sold: 'Sold',
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
    sellerReply: 'Seller\'s reply',
    send: 'Send',
    seePurchase: 'See purchase',
    ordersTab: 'Orders',
    financesTab: 'Finances',
    totalRevenue: 'Total revenue',
    monthlyRevenue: 'This month',
    totalSales: 'Total sales',
    avgViewers: 'Avg. viewers',
    stripeConnected: 'Stripe connected',
    stripePending: 'Stripe pending',
    stripeNotConnected: 'Stripe not connected',
    openPayments: 'Manage payments',
    viewAll: 'View all',
    noOrders: 'No recent orders',
    watchVod: 'Watch replay',
    recap: 'Recap',
    peakViewers: 'viewers',
    minutes: 'min',
    seeMoment: 'See the moment',
    buyer: 'Buyer',
    user: 'User',
    video: 'Video',
    total: 'Total',
    stPaid: 'Paid',
    stPreparing: 'Preparing',
    stShipped: 'Sent by post',
    stDelivered: 'Received',
    stPending: 'Pending',
    stRefunded: 'Refunded',
  },
  fr: {
    back: 'Retour',
    followers: 'Abonnés',
    followingLabel: 'Abonnements',
    follow: 'Suivre',
    unfollow: 'Suivi',
    messages: 'Messages',
    editProfile: 'Modifier le profil',
    shopTab: 'Boutique',
    livesTab: 'Lives',
    reviewsTab: 'Avis',
    reviews: 'avis',
    handoverWithin: 'Remise sous {n}\u00A0j',
    messageError: 'Impossible d\'ouvrir la conversation. Vérifie ta connexion et réessaie.',
    sold: 'Vendu',
    noItems: 'Aucun article en vente',
    noLives: 'Aucun live',
    noReviews: 'Aucun avis pour le moment',
    loading: 'Chargement...',
    notFound: 'Vendeur introuvable',
    live: 'En direct',
    scheduled: 'Programmé',
    ended: 'Terminé',
    retry: 'Réessayer',
    reply: 'Répondre',
    sellerReply: 'Réponse du vendeur',
    send: 'Envoyer',
    seePurchase: 'Voir l\'achat',
    ordersTab: 'Commandes',
    financesTab: 'Finances',
    totalRevenue: 'CA total',
    monthlyRevenue: 'CA du mois',
    totalSales: 'Ventes totales',
    avgViewers: 'Spectateurs moy.',
    stripeConnected: 'Stripe connecté',
    stripePending: 'Stripe en attente',
    stripeNotConnected: 'Stripe non connecté',
    openPayments: 'Gérer les paiements',
    viewAll: 'Tout voir',
    noOrders: 'Aucune commande récente',
    watchVod: 'Revoir le live',
    recap: 'Récapitulatif',
    peakViewers: 'spectateurs',
    minutes: 'min',
    seeMoment: 'Voir le moment',
    buyer: 'Acheteur',
    user: 'Utilisateur',
    video: 'Vidéo',
    total: 'Total',
    stPaid: 'Payée',
    stPreparing: 'En préparation',
    stShipped: 'Envoyée par la poste',
    stDelivered: 'Reçue',
    stPending: 'En attente',
    stRefunded: 'Remboursée',
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
    livesTab: 'Directos',
    reviewsTab: 'Opiniones',
    reviews: 'opiniones',
    handoverWithin: 'Entrega en {n}\u00A0d',
    messageError: 'No se pudo abrir la conversación. Revisa tu conexión e inténtalo de nuevo.',
    sold: 'Vendido',
    noItems: 'No hay artículos en venta',
    noLives: 'Aún no hay directos',
    noReviews: 'Aún no hay opiniones',
    loading: 'Cargando...',
    notFound: 'Vendedor no encontrado',
    live: 'En directo',
    scheduled: 'Programado',
    ended: 'Terminado',
    retry: 'Reintentar',
    reply: 'Responder',
    sellerReply: 'Respuesta del vendedor',
    send: 'Enviar',
    seePurchase: 'Ver compra',
    ordersTab: 'Pedidos',
    financesTab: 'Finanzas',
    totalRevenue: 'Ingresos totales',
    monthlyRevenue: 'Este mes',
    totalSales: 'Ventas totales',
    avgViewers: 'Espectadores prom.',
    stripeConnected: 'Stripe conectado',
    stripePending: 'Stripe pendiente',
    stripeNotConnected: 'Stripe no conectado',
    openPayments: 'Gestionar pagos',
    viewAll: 'Ver todo',
    noOrders: 'No hay pedidos recientes',
    watchVod: 'Ver repetición',
    recap: 'Resumen',
    peakViewers: 'espectadores',
    minutes: 'min',
    seeMoment: 'Ver el momento',
    buyer: 'Comprador',
    user: 'Usuario',
    video: 'Vídeo',
    total: 'Total',
    stPaid: 'Pagado',
    stPreparing: 'En preparación',
    stShipped: 'Enviado por correo',
    stDelivered: 'Recibido',
    stPending: 'Pendiente',
    stRefunded: 'Reembolsado',
  },
  ru: {
    back: 'Назад',
    followers: 'Подписчики',
    followingLabel: 'Подписки',
    follow: 'Подписаться',
    unfollow: 'Вы подписаны',
    messages: 'Сообщения',
    editProfile: 'Редактировать профиль',
    shopTab: 'Магазин',
    livesTab: 'Эфиры',
    reviewsTab: 'Отзывы',
    reviews: 'отзывов',
    handoverWithin: 'Передача за {n}\u00A0дн.',
    messageError: 'Не удалось открыть переписку. Проверь соединение и попробуй снова.',
    sold: 'Продано',
    noItems: 'Нет товаров в продаже',
    noLives: 'Эфиров пока нет',
    noReviews: 'Отзывов пока нет',
    loading: 'Загрузка...',
    notFound: 'Продавец не найден',
    live: 'В эфире',
    scheduled: 'Запланирован',
    ended: 'Завершён',
    retry: 'Повторить',
    reply: 'Ответить',
    sellerReply: 'Ответ продавца',
    send: 'Отправить',
    seePurchase: 'Посмотреть покупку',
    ordersTab: 'Заказы',
    financesTab: 'Финансы',
    totalRevenue: 'Общая выручка',
    monthlyRevenue: 'За этот месяц',
    totalSales: 'Всего продаж',
    avgViewers: 'Ср. число зрителей',
    stripeConnected: 'Stripe подключён',
    stripePending: 'Stripe на проверке',
    stripeNotConnected: 'Stripe не подключён',
    openPayments: 'Управлять платежами',
    viewAll: 'Смотреть всё',
    noOrders: 'Недавних заказов нет',
    watchVod: 'Смотреть запись',
    recap: 'Итоги',
    peakViewers: 'зрителей',
    minutes: 'мин',
    seeMoment: 'Смотреть момент',
    buyer: 'Покупатель',
    user: 'Пользователь',
    video: 'Видео',
    total: 'Итого',
    stPaid: 'Оплачен',
    stPreparing: 'Готовится',
    stShipped: 'Отправлен почтой',
    stDelivered: 'Получен',
    stPending: 'Ожидает оплаты',
    stRefunded: 'Возвращены деньги',
  },
  he: {
    back: 'חזרה',
    followers: 'עוקבים',
    followingLabel: 'נעקבים',
    follow: 'מעקב',
    unfollow: 'במעקב',
    messages: 'הודעות',
    editProfile: 'עריכת פרופיל',
    shopTab: 'חנות',
    livesTab: 'שידורים',
    reviewsTab: 'ביקורות',
    reviews: 'ביקורות',
    handoverWithin: 'מסירה תוך {n}\u00A0ימ׳',
    messageError: 'לא הצלחנו לפתוח את השיחה. בדקו את החיבור ונסו שוב.',
    sold: 'נמכר',
    noItems: 'אין פריטים למכירה',
    noLives: 'עדיין אין שידורים',
    noReviews: 'עדיין אין ביקורות',
    loading: 'טוען...',
    notFound: 'המוכר/ת לא נמצא/ה',
    live: 'שידור חי',
    scheduled: 'מתוכנן',
    ended: 'הסתיים',
    retry: 'נסו שוב',
    reply: 'תגובה',
    sellerReply: 'תגובת המוכר/ת',
    send: 'שליחה',
    seePurchase: 'לצפייה ברכישה',
    ordersTab: 'הזמנות',
    financesTab: 'כספים',
    totalRevenue: 'הכנסות כוללות',
    monthlyRevenue: 'החודש',
    totalSales: 'סך המכירות',
    avgViewers: 'צופים בממוצע',
    stripeConnected: 'Stripe מחובר',
    stripePending: 'Stripe בבדיקה',
    stripeNotConnected: 'Stripe לא מחובר',
    openPayments: 'ניהול תשלומים',
    viewAll: 'הצג הכול',
    noOrders: 'אין הזמנות אחרונות',
    watchVod: 'צפייה בהקלטה',
    recap: 'סיכום',
    peakViewers: 'צופים',
    minutes: 'דק׳',
    seeMoment: 'לצפייה ברגע',
    buyer: 'קונה',
    user: 'משתמש/ת',
    video: 'וידאו',
    total: 'סה״כ',
    stPaid: 'שולם',
    stPreparing: 'בהכנה',
    stShipped: 'נשלח בדואר',
    stDelivered: 'התקבל',
    stPending: 'ממתין',
    stRefunded: 'הוחזר',
  },
}

// « N articles » avec les pluriels de chaque langue (le russe en a trois).
const ITEMS_PLURAL: Localized<{ one: string; few: string; many: string; other: string }> = {
  en: { one: 'item', few: 'items', many: 'items', other: 'items' },
  fr: { one: 'article', few: 'articles', many: 'articles', other: 'articles' },
  es: { one: 'artículo', few: 'artículos', many: 'artículos', other: 'artículos' },
  ru: { one: 'товар', few: 'товара', many: 'товаров', other: 'товара' },
  he: { one: 'פריט', few: 'פריטים', many: 'פריטים', other: 'פריטים' },
}
function itemsLabel(n: number, lang: Lang): string {
  const forms = ITEMS_PLURAL[lang] ?? ITEMS_PLURAL.en
  const rule = new Intl.PluralRules(getLocale(lang)).select(n)
  return (rule in forms ? forms[rule as keyof typeof forms] : forms.other)
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
  country?: string | null
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
  tracking_number?: string | null
  carrier?: string | null
  stream_id?: string | null
  purchase_stream_offset_seconds?: number | null
  recording_url?: string | null
  currency?: string | null
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
function BuyerGroupCard({ group, buyerName, total, lang, currency, statusColor, statusLabel, navigate, onVideoMoment }: {
  group: RecentOrder[]
  buyerName: string
  total: number
  lang: Lang
  currency: string
  statusColor: Record<string, string>
  statusLabel: (s: string) => string
  navigate: (path: string) => void
  onVideoMoment?: (url: string, title: string, offset: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const t = content[lang] ?? content.en

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
          fontSize: 'calc(18px * var(--fs, 1))', flexShrink: 0,
        }}>
          {'\uD83D\uDC64'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{buyerName}</span>
            <span style={{
              fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#3B82F6',
              backgroundColor: 'rgba(59,130,246,0.12)',
              padding: '2px 8px', borderRadius: '100px',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              {group.length} {itemsLabel(group.length, lang)}
            </span>
          </div>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#00E5FF', margin: 0 }}>
            {t.total} : {formatMoney(total, group[0]?.currency || currency)}
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
                  fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {displayItemTitle(order.item_title)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{
                    fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700,
                    color: statusColor[order.status] || '#888',
                    backgroundColor: `${statusColor[order.status] || '#888'}14`,
                    padding: '2px 6px', borderRadius: '6px',
                    border: `1px solid ${statusColor[order.status] || '#888'}30`,
                  }}>
                    {statusLabel(order.status)}
                  </span>
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                    {new Date(order.created_at).toLocaleDateString(getLocale(), {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                </div>
              </div>
              {order.recording_url && order.purchase_stream_offset_seconds != null && onVideoMoment && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onVideoMoment(order.recording_url!, order.item_title || t.video, order.purchase_stream_offset_seconds!)
                  }}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, padding: 0,
                  }}
                  title={t.seeMoment}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#00E5FF" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              )}
              <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF', flexShrink: 0 }}>
                {formatMoney(order.amount || 0, order.currency || currency)}
              </span>
            </div>
          ))}
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
  const t = content[lang] ?? content.en

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  usePageTitle(profile?.display_name || t.back)
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
  const [shippingDelay, setShippingDelay] = useState(4)

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
  const fetchProfile = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!sellerId) return
    setLoading(true)
    setError(false)
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, username, country')
        .eq('id', sellerId)
        .single()

      if (cancelledRef?.current) return
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
      if (cancelledRef?.current) return
      if (seller) setSellerData(seller as SellerData)

      // Fetch follower count
      const { count: fCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
      if (cancelledRef?.current) return
      setFollowersCount(fCount || 0)

      // Fetch following count (users this seller follows)
      const { count: fgCount } = await supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sellerId)
      if (cancelledRef?.current) return
      setFollowingCount(fgCount || 0)

      // Fetch reviews summary
      const reviewRes = await apiFetch(`/api/sellers/${sellerId}/reviews`)
      if (cancelledRef?.current) return
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json()
        setReviews(reviewData.reviews || [])
        setAvgRating(reviewData.avg_rating || 0)
        setReviewCount(reviewData.total_count || 0)
      }

      // Délai de remise du vendeur (4 jours par défaut)
      const delayRes = await apiFetch(`/api/seller/${sellerId}/shipping-delay`)
      if (cancelledRef?.current) return
      if (delayRes.ok) {
        const delayData = await delayRes.json()
        setShippingDelay(delayData.shipping_delay_days ?? 4)
      }

      // Fetch items (active + sold)
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, title, image_urls, current_price, starting_price, status, category')
        .eq('seller_id', sellerId)
        .in('status', ['active', 'sold'])
        .order('created_at', { ascending: false })
        .limit(50)
      if (cancelledRef?.current) return
      setItems((itemsData || []) as ItemData[])

      // Count sold items
      // Articles vendus (lisibles par tous) : les commandes du vendeur ne le sont pas pour un visiteur
      const { count: soldCount } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('status', 'sold')
      if (cancelledRef?.current) return
      setTotalSold(soldCount || 0)

      // Fetch streams
      const { data: streamsData } = await supabase
        .from('streams')
        .select('id, title, thumbnail_url, status, scheduled_at, started_at, ended_at, viewer_count, recording_url, peak_viewers')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (cancelledRef?.current) return
      setStreams((streamsData || []) as StreamData[])

      setLoading(false)
    } catch {
      if (cancelledRef?.current) return
      setError(true)
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => {
    const cancelledRef = { current: false }
    fetchProfile(cancelledRef)
    return () => { cancelledRef.current = true }
  }, [fetchProfile])

  // Check follow status
  useEffect(() => {
    if (!sellerId || !session?.access_token || !user || isOwnProfile) return
    const controller = new AbortController()
    apiFetch(`/api/follow/${sellerId}/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !controller.signal.aborted) setIsFollowing(d.following) })
      .catch(() => {})
    return () => controller.abort()
  }, [sellerId, session, user, isOwnProfile])

  // Lazy-load dashboard data when Orders or Finances tab is clicked
  useEffect(() => {
    if (!isOwnProfile || !session?.access_token) return
    if (activeTab !== 'orders' && activeTab !== 'finances') return
    if (dashboardFetched) return
    const controller = new AbortController()
    setDashboardLoading(true)
    apiFetch('/api/seller/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (controller.signal.aborted) return
        if (d) setDashboardData(d)
        setDashboardFetched(true)
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setDashboardLoading(false) })
    return () => controller.abort()
  }, [activeTab, isOwnProfile, session, dashboardFetched])

  // Lazy-load Stripe status when Finances tab is clicked
  useEffect(() => {
    if (!isOwnProfile || !session?.access_token) return
    if (activeTab !== 'finances') return
    if (stripeStatusFetched) return
    const controller = new AbortController()
    apiFetch('/api/stripe/account-status', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (controller.signal.aborted) return
        if (d) {
          if (d.charges_enabled) setStripeStatus('connected')
          else if (d.details_submitted) setStripeStatus('pending')
          else setStripeStatus('not_connected')
        }
        setStripeStatusFetched(true)
      })
      .catch(() => { if (!controller.signal.aborted) setStripeStatusFetched(true) })
    return () => controller.abort()
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
      const fill = i <= Math.round(rating) ? '#00E5FF' : '#333'
      stars.push(
        <svg key={`star-${i}`} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="none">
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
          aria-label={t.loading}
          style={{
            width: '32px', height: '32px', border: '3px solid #333',
            borderTopColor: '#00E5FF', borderRadius: '50%',
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
        <p style={{ color: '#f0f0f0', fontSize: 'calc(16px * var(--fs, 1))' }}>{t.notFound}</p>
        <button
          onClick={() => fetchProfile()}
          style={{
            background: 'none', border: 'none', color: '#00E5FF',
            fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {t.retry}
        </button>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username
  const bio = sellerData?.store_description || profile.bio
  // Devise du vendeur (prix des articles, CA) : celle de son pays.
  const sellerCurrency = currencyForCountry(profile.country)

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          border: '3px solid #00E5FF',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <span style={{ fontSize: 'calc(36px * var(--fs, 1))', fontWeight: 700, color: '#f0f0f0' }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + Bio */}
        <h2 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
          {displayName}
        </h2>
        {bio && (
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 16px', lineHeight: 1.5, maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#00E5FF" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </span>
            <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
              {reviewCount} {t.reviews}
            </span>
          </div>

          {/* Délai de remise du vendeur */}
          <div style={{
            flex: 1, backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              {t.handoverWithin.replace('{n}', String(shippingDelay))}
            </span>
          </div>

          {/* Items sold card */}
          <div style={{
            flex: 1, backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>
              {totalSold}
            </span>
            <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
              {t.sold}
            </span>
          </div>
        </div>

        {/* Followers / Following text */}
        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 16px' }}>
          <span style={{ fontWeight: 700, color: '#fff' }}>{followersCount}</span>{' '}{t.followers}
          {' '}&middot;{' '}{/* i18n-ignore (séparateur) */}
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
                  color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t.messages}
              </button>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
                  border: 'none', color: '#001014', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
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
                  background: isFollowing ? 'transparent' : 'linear-gradient(135deg, #00E5FF, #0091EA)',
                  border: isFollowing ? '1px solid #333' : 'none',
                  color: isFollowing ? '#888' : '#001014',
                  fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {isFollowing ? t.unfollow : t.follow}
              </button>
              <button
                onClick={async () => {
                  if (!user || !session?.access_token) { navigate('/login'); return }
                  try {
                    // Try API first
                    const resp = await apiFetch('/api/conversations/direct', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({ user_id: sellerId }),
                    })
                    const data = await resp.json()
                    if (resp.ok && data.id) {
                      navigate(`/conversation/${data.id}`)
                      return
                    }
                  } catch { /* fallback below */ }

                  // Fallback: create/find conversation directly via Supabase
                  try {
                    const { data: existing } = await supabase
                      .from('conversations')
                      .select('id')
                      .or(`and(participant_1.eq.${user.id},participant_2.eq.${sellerId}),and(participant_1.eq.${sellerId},participant_2.eq.${user.id})`)
                      .eq('status', 'active')
                      .limit(1)
                      .maybeSingle()
                    if (existing) { navigate(`/conversation/${existing.id}`); return }

                    const { data: conv, error } = await supabase
                      .from('conversations')
                      .insert({ type: 'direct', participant_1: user.id, participant_2: sellerId, status: 'active' })
                      .select('id')
                      .single()
                    if (error) throw error
                    navigate(`/conversation/${conv.id}`)
                  } catch (err) {
                    console.error('[SellerProfile] conversation', err)
                    alert(t.messageError)
                  }
                }}
                style={{
                  flex: 1, maxWidth: '160px', padding: '12px 16px', borderRadius: '12px',
                  backgroundColor: '#1A1A1A', border: '1px solid #333',
                  color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
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
        position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 10, backgroundColor: '#000',
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
                // Les 5 onglets du propriétaire tiennent dans la largeur (plus de « Finances » coupé)
                // Propriétaire : 5 onglets à leur largeur naturelle, bien séparés (la barre défile si besoin)
                flex: isOwnProfile ? 'none' : 1, minWidth: 0,
                padding: isOwnProfile ? '14px 12px' : '14px 16px', border: 'none', background: 'none',
                color: isActive ? '#00E5FF' : '#f0f0f0',
                fontSize: isOwnProfile ? 'calc(13px * var(--fs, 1))' : 'calc(14px * var(--fs, 1))', fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? '2px solid #00E5FF' : '2px solid transparent',
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
            <p style={{ textAlign: 'center', color: '#f0f0f0', padding: '40px 0', fontSize: 'calc(14px * var(--fs, 1))' }}>{t.noItems}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
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
                      <img src={item.image_urls[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
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
                        position: 'absolute', top: '8px', insetInlineStart: '8px',
                        backgroundColor: 'rgba(0,229,255,0.9)', color: '#fff',
                        fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                      }}>
                        {t.sold}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{
                      fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '0 0 4px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayItemTitle(item.title)}
                    </p>
                    <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF', margin: 0 }}>
                      {formatMoney(item.current_price || item.starting_price, sellerCurrency)}
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
            <p style={{ textAlign: 'center', color: '#f0f0f0', padding: '40px 0', fontSize: 'calc(14px * var(--fs, 1))' }}>{t.noLives}</p>
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
                        <img src={stream.thumbnail_url} alt={stream.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
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
                          position: 'absolute', bottom: '4px', insetInlineEnd: '4px',
                          backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
                          fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, padding: '2px 5px',
                          borderRadius: '4px',
                        }}>
                          {durationMin} {t.minutes}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                      <p style={{
                        fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {stream.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#fff',
                          backgroundColor: statusColors[stream.status] || '#555',
                          padding: '2px 8px', borderRadius: '6px',
                        }}>
                          {statusLabels[stream.status] || stream.status}
                        </span>
                        {stream.peak_viewers > 0 && (
                          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>
                            {stream.peak_viewers} {t.peakViewers}
                          </span>
                        )}
                      </div>
                      {stream.scheduled_at && (
                        <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>
                          {new Date(stream.scheduled_at).toLocaleDateString(getLocale(), {
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
                            color: '#00E5FF', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600,
                            cursor: 'pointer', textAlign: 'start', marginTop: '2px',
                          }}
                        >
                          {t.recap} <span style={{ display: 'inline-block', ...rtlFlip() }}>&rarr;</span>{/* i18n-ignore (flèche) */}
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
            <p style={{ textAlign: 'center', color: '#f0f0f0', padding: '40px 0', fontSize: 'calc(14px * var(--fs, 1))' }}>{t.noReviews}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map(review => {
                const buyerName = (review.buyer as { display_name: string } | null)?.display_name || t.user
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
                          <img src={buyerAvatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#f0f0f0' }}>
                            {buyerName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{buyerName}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          {renderStars(review.rating, 12)}
                          <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0' }}>
                            {new Date(review.created_at).toLocaleDateString(getLocale(), {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', margin: 0, lineHeight: 1.5 }}>
                        {review.comment}
                      </p>
                    )}

                    {/* Seller response */}
                    {review.seller_response && (
                      <div style={{
                        marginTop: '10px', padding: '10px 12px', backgroundColor: '#222',
                        borderRadius: '10px', borderInlineStart: '3px solid #00E5FF',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
                          </svg>
                          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
                            {t.sellerReply}
                          </span>
                        </div>
                        <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
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
                              backgroundColor: '#111', color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', resize: 'none',
                              minHeight: '60px', fontFamily: 'inherit', outline: 'none',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#00E5FF' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#333' }}
                          />
                          <button
                            onClick={() => submitReply(review.id)}
                            disabled={!replyText.trim() || replySending}
                            style={{
                              padding: '10px 16px', borderRadius: '10px', border: 'none',
                              background: replyText.trim() ? 'linear-gradient(135deg, #00E5FF, #0091EA)' : '#333',
                              color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'default',
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
                            color: '#f0f0f0', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
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
                          border: '1px solid #00E5FF', backgroundColor: 'transparent',
                          color: '#00E5FF', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div style={{ width: '24px', height: '24px', border: '3px solid #333', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !dashboardData || dashboardData.recent_orders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#f0f0f0', padding: '40px 0', fontSize: 'calc(14px * var(--fs, 1))' }}>{t.noOrders}</p>
          ) : (() => {
            const orders = dashboardData.recent_orders
            const statusColor: Record<string, string> = {
              paid: '#22C55E', shipped: '#3B82F6', delivered: '#00E5FF',
              pending_payment: '#0091EA', pending: '#0091EA', preparing: '#F59E0B',
            }
            const statusLabel = (s: string) => {
              const labels: Record<string, string> = {
                paid: t.stPaid, preparing: t.stPreparing, shipped: t.stShipped, delivered: t.stDelivered,
                pending_payment: t.stPending, pending: t.stPending, refunded: t.stRefunded,
              }
              return labels[s] ?? s
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
                  const buyerName = group[0].buyer_name || t.buyer
                  const total = group.reduce((s, o) => s + (o.amount || 0), 0)
                  const _expanded = false
                  void _expanded
                  return <BuyerGroupCard key={gi} group={group} buyerName={buyerName} total={total}
                    lang={lang} currency={sellerCurrency} statusColor={statusColor} statusLabel={statusLabel} navigate={navigate}
                    onVideoMoment={(url, title, offset) => setVodModal({ url, title, offset })} />
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
                        fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {displayItemTitle(order.item_title)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700,
                          color: statusColor[order.status] || '#888',
                          backgroundColor: `${statusColor[order.status] || '#888'}15`,
                          padding: '2px 8px', borderRadius: '100px',
                        }}>
                          {statusLabel(order.status)}
                        </span>
                        <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>
                          {new Date(order.created_at).toLocaleDateString(getLocale(), {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                        {order.buyer_name && (
                          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>{order.buyer_name}</span>
                        )}
                        {order.recording_url && order.purchase_stream_offset_seconds != null && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              setVodModal({
                                url: order.recording_url!,
                                title: order.item_title || t.video,
                                offset: order.purchase_stream_offset_seconds!,
                              })
                            }}
                            style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.12)', padding: '2px 8px', borderRadius: '100px', cursor: 'pointer' }}
                          >
                            {t.seeMoment}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF', flexShrink: 0 }}>
                      {formatMoney(order.amount || 0, order.currency || sellerCurrency)}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={rtlFlip()}>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/activity', { state: { tab: 'sales' } })}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    border: '1px solid #333', backgroundColor: 'transparent',
                    color: '#00E5FF', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
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
              <div style={{ width: '24px', height: '24px', border: '3px solid #333', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stats grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF', margin: 0 }}>
                    {dashboardData ? formatMoney(dashboardData.total_revenue, sellerCurrency) : '-'}
                  </p>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '4px 0 0', fontWeight: 600 }}>{t.totalRevenue}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF', margin: 0 }}>
                    {dashboardData ? formatMoney(dashboardData.monthly_revenue, sellerCurrency) : '-'}
                  </p>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '4px 0 0', fontWeight: 600 }}>{t.monthlyRevenue}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {dashboardData?.total_sales ?? '-'}
                  </p>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '4px 0 0', fontWeight: 600 }}>{t.totalSales}</p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {dashboardData?.avg_viewers ?? '-'}
                  </p>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '4px 0 0', fontWeight: 600 }}>{t.avgViewers}</p>
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
                <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', flex: 1 }}>
                  {stripeStatus === 'connected' ? t.stripeConnected : stripeStatus === 'pending' ? t.stripePending : t.stripeNotConnected}
                </span>
              </div>

              {/* Open payments page */}
              <button
                onClick={() => navigate('/payments')}
                style={{
                  width: '100%', padding: '16px',
                  background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
                  borderRadius: '14px', border: 'none',
                  color: '#001014', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
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

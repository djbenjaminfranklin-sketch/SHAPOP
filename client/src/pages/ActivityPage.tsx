import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { getLang, getLocale, type Localized } from '../lib/i18n'
import { rtlFlip } from '../lib/rtl'
import type { Order, Item, Stream } from '../types/database'
import StreamCard from '../components/stream/StreamCard'
import ItemCard from '../components/ItemCard'
import VodPlayer from '../components/stream/VodPlayer'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatMoney, formatItemPrice } from '../lib/fulfillment'
import { ft, statusLabel } from '../lib/fulfillmentText'

type StreamWithSeller = Stream & { seller?: { display_name: string; avatar_url: string | null; store_name?: string } }
type ItemWithSeller = Item & { seller?: { display_name?: string; avatar_url?: string | null } }

type MainTab = 'purchases' | 'sales' | 'following' | 'messages' | 'favorites' | 'offers'
type SubFilter = 'all' | 'active' | 'completed' | 'refunds'

type ActivityText = Record<'title' | 'purchasesTab' | 'salesTab' | 'followingTab' | 'messagesTab' | 'favoritesTab' | 'offersTab' | 'emptyOffers' | 'emptyOffersDesc' | 'offerSent' | 'offerReceived' | 'offerAccept' | 'offerDecline' | 'offerPending' | 'offerAccepted' | 'offerDeclined' | 'emptyPurchases' | 'emptyPurchasesDesc' | 'emptySales' | 'emptySalesDesc' | 'notSeller' | 'notSellerDesc' | 'comingSoon' | 'comingSoonFollowing' | 'comingSoonMessages' | 'comingSoonFavorites' | 'emptyFavorites' | 'emptyFavoritesDesc' | 'buyer' | 'loading' | 'error' | 'errorDesc' | 'retry' | 'deliveredOn' | 'reportProblem' | 'deadlineExpired' | 'timeRemainingPrefix' | 'disputeOpen' | 'contactSeller' | 'contactBuyer' | 'seeVideoMoment' | 'emptyFollowing' | 'emptyFollowingDesc' | 'unfollow' | 'liveNow' | 'scheduled' | 'noUpcoming' | 'filterAll' | 'filterActive' | 'filterCompleted' | 'filterRefunds' | 'offerFallback' | 'exportCsv' | 'csvDate' | 'csvItem' | 'csvAmount' | 'csvCurrency' | 'csvStatus' | 'csvTracking' | 'csvSeller' | 'expired' | 'timeRemaining', string>

const ACTIVITY_TEXT: Localized<ActivityText> = {
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
    notSeller: 'You\'re not a seller yet',
    notSellerDesc: 'Become a seller to see your sales here',
    comingSoon: 'Coming soon',
    comingSoonFollowing: 'Following your favorite sellers is coming soon',
    comingSoonMessages: 'Direct messaging is coming soon',
    comingSoonFavorites: 'Favorites are coming soon',
    emptyFavorites: 'No favorites yet',
    emptyFavoritesDesc: 'Tap the heart on a live to add it here',
    buyer: 'Buyer',
    loading: 'Loading...',
    error: 'Couldn\'t load',
    errorDesc: 'Check your connection and try again.',
    retry: 'Retry',
    deliveredOn: 'Received on',
    reportProblem: 'Report a problem',
    deadlineExpired: 'Deadline passed',
    timeRemainingPrefix: 'to report a problem',
    disputeOpen: 'Dispute open',
    contactSeller: 'Contact seller',
    contactBuyer: 'Contact buyer',
    seeVideoMoment: 'See the moment',
    emptyFollowing: 'You don\'t follow any sellers yet',
    emptyFollowingDesc: 'Follow your favorite sellers to get notified when they go live',
    unfollow: 'Unfollow',
    liveNow: 'LIVE',
    scheduled: 'Scheduled',
    noUpcoming: 'No upcoming lives',
    filterAll: 'All',
    filterActive: 'Active',
    filterCompleted: 'Completed',
    filterRefunds: 'Refunds',
    offerFallback: 'Offer',
    exportCsv: 'Export CSV',
    csvDate: 'Date',
    csvItem: 'Item',
    csvAmount: 'Amount',
    csvCurrency: 'Currency',
    csvStatus: 'Status',
    csvTracking: 'Shipment no.',
    csvSeller: 'Seller',
    expired: 'Expired',
    timeRemaining: '{h} h {m} min left',
  },
  fr: {
    title: 'Activité',
    purchasesTab: 'Achats',
    salesTab: 'Ventes',
    followingTab: 'Suivis',
    messagesTab: 'Messages',
    favoritesTab: 'Favoris',
    offersTab: 'Offres',
    emptyOffers: 'Aucune offre pour le moment',
    emptyOffersDesc: 'Tes offres envoyées et reçues apparaîtront ici',
    offerSent: 'Envoyée',
    offerReceived: 'Reçue',
    offerAccept: 'Accepter',
    offerDecline: 'Refuser',
    offerPending: 'En attente',
    offerAccepted: 'Acceptée',
    offerDeclined: 'Refusée',
    emptyPurchases: 'Aucun achat pour le moment',
    emptyPurchasesDesc: 'Les articles que tu achètes apparaîtront ici',
    emptySales: 'Aucune vente pour le moment',
    emptySalesDesc: 'Les articles que tu vends apparaîtront ici',
    notSeller: 'Tu n\'es pas encore vendeur',
    notSellerDesc: 'Deviens vendeur pour voir tes ventes ici',
    comingSoon: 'Bientôt disponible',
    comingSoonFollowing: 'Le suivi de tes vendeurs préférés arrive bientôt',
    comingSoonMessages: 'La messagerie directe arrive bientôt',
    comingSoonFavorites: 'Les favoris arrivent bientôt',
    emptyFavorites: 'Aucun favori pour le moment',
    emptyFavoritesDesc: 'Appuie sur le cœur d\'un live pour l\'ajouter ici',
    buyer: 'Acheteur',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    errorDesc: 'Vérifie ta connexion et réessaie.',
    retry: 'Réessayer',
    deliveredOn: 'Reçu le',
    reportProblem: 'Signaler un problème',
    deadlineExpired: 'Délai expiré',
    timeRemainingPrefix: 'pour signaler un problème',
    disputeOpen: 'Litige ouvert',
    contactSeller: 'Contacter le vendeur',
    contactBuyer: 'Contacter l\'acheteur',
    seeVideoMoment: 'Voir le moment',
    emptyFollowing: 'Tu ne suis aucun vendeur',
    emptyFollowingDesc: 'Suis tes vendeurs préférés pour être prévenu quand ils passent en live',
    unfollow: 'Ne plus suivre',
    liveNow: 'EN DIRECT',
    scheduled: 'Programmé',
    noUpcoming: 'Aucun live prévu',
    filterAll: 'Toutes',
    filterActive: 'En cours',
    filterCompleted: 'Terminées',
    filterRefunds: 'Remboursements',
    offerFallback: 'Offre',
    exportCsv: 'Exporter en CSV',
    csvDate: 'Date',
    csvItem: 'Article',
    csvAmount: 'Montant',
    csvCurrency: 'Devise',
    csvStatus: 'Statut',
    csvTracking: 'N° d\'envoi',
    csvSeller: 'Vendeur',
    expired: 'Expiré',
    timeRemaining: '{h} h {m} min restantes',
  },
  es: {
    title: 'Actividad',
    purchasesTab: 'Compras',
    salesTab: 'Ventas',
    followingTab: 'Seguidos',
    messagesTab: 'Mensajes',
    favoritesTab: 'Favoritos',
    offersTab: 'Ofertas',
    emptyOffers: 'Aún no hay ofertas',
    emptyOffersDesc: 'Las ofertas que envíes y recibas aparecerán aquí',
    offerSent: 'Enviada',
    offerReceived: 'Recibida',
    offerAccept: 'Aceptar',
    offerDecline: 'Rechazar',
    offerPending: 'Pendiente',
    offerAccepted: 'Aceptada',
    offerDeclined: 'Rechazada',
    emptyPurchases: 'Aún no hay compras',
    emptyPurchasesDesc: 'Los artículos que compres aparecerán aquí',
    emptySales: 'Aún no hay ventas',
    emptySalesDesc: 'Los artículos que vendas aparecerán aquí',
    notSeller: 'Aún no eres vendedor',
    notSellerDesc: 'Hazte vendedor para ver tus ventas aquí',
    comingSoon: 'Próximamente',
    comingSoonFollowing: 'Pronto podrás seguir a tus vendedores favoritos',
    comingSoonMessages: 'La mensajería directa llegará pronto',
    comingSoonFavorites: 'Los favoritos llegarán pronto',
    emptyFavorites: 'Aún no tienes favoritos',
    emptyFavoritesDesc: 'Toca el corazón de un directo para añadirlo aquí',
    buyer: 'Comprador',
    loading: 'Cargando...',
    error: 'Error al cargar',
    errorDesc: 'Revisa tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
    deliveredOn: 'Recibido el',
    reportProblem: 'Reportar un problema',
    deadlineExpired: 'Plazo vencido',
    timeRemainingPrefix: 'para reportar un problema',
    disputeOpen: 'Disputa abierta',
    contactSeller: 'Contactar al vendedor',
    contactBuyer: 'Contactar al comprador',
    seeVideoMoment: 'Ver el momento',
    emptyFollowing: 'Aún no sigues a ningún vendedor',
    emptyFollowingDesc: 'Sigue a tus vendedores favoritos y te avisaremos cuando estén en directo',
    unfollow: 'Dejar de seguir',
    liveNow: 'EN DIRECTO',
    scheduled: 'Programado',
    noUpcoming: 'No hay directos programados',
    filterAll: 'Todas',
    filterActive: 'Activas',
    filterCompleted: 'Finalizadas',
    filterRefunds: 'Reembolsos',
    offerFallback: 'Oferta',
    exportCsv: 'Exportar CSV',
    csvDate: 'Fecha',
    csvItem: 'Artículo',
    csvAmount: 'Importe',
    csvCurrency: 'Moneda',
    csvStatus: 'Estado',
    csvTracking: 'N.º de envío',
    csvSeller: 'Vendedor',
    expired: 'Vencido',
    timeRemaining: 'Quedan {h} h {m} min',
  },
  ru: {
    title: 'Активность',
    purchasesTab: 'Покупки',
    salesTab: 'Продажи',
    followingTab: 'Подписки',
    messagesTab: 'Сообщения',
    favoritesTab: 'Избранное',
    offersTab: 'Предложения',
    emptyOffers: 'Предложений пока нет',
    emptyOffersDesc: 'Здесь появятся отправленные и полученные предложения',
    offerSent: 'Отправлено',
    offerReceived: 'Получено',
    offerAccept: 'Принять',
    offerDecline: 'Отклонить',
    offerPending: 'Ожидает',
    offerAccepted: 'Принято',
    offerDeclined: 'Отклонено',
    emptyPurchases: 'Покупок пока нет',
    emptyPurchasesDesc: 'Здесь появятся купленные тобой товары',
    emptySales: 'Продаж пока нет',
    emptySalesDesc: 'Здесь появятся проданные тобой товары',
    notSeller: 'Ты пока не продавец',
    notSellerDesc: 'Стань продавцом, чтобы видеть здесь свои продажи',
    comingSoon: 'Скоро',
    comingSoonFollowing: 'Скоро можно будет подписываться на любимых продавцов',
    comingSoonMessages: 'Личные сообщения скоро появятся',
    comingSoonFavorites: 'Избранное скоро появится',
    emptyFavorites: 'В избранном пока пусто',
    emptyFavoritesDesc: 'Нажми на сердечко в эфире, чтобы добавить его сюда',
    buyer: 'Покупатель',
    loading: 'Загрузка...',
    error: 'Ошибка загрузки',
    errorDesc: 'Проверь подключение и попробуй ещё раз.',
    retry: 'Повторить',
    deliveredOn: 'Получен',
    reportProblem: 'Сообщить о проблеме',
    deadlineExpired: 'Срок истёк',
    timeRemainingPrefix: 'чтобы сообщить о проблеме',
    disputeOpen: 'Открыт спор',
    contactSeller: 'Написать продавцу',
    contactBuyer: 'Написать покупателю',
    seeVideoMoment: 'Смотреть момент',
    emptyFollowing: 'Ты пока ни на кого не подписан',
    emptyFollowingDesc: 'Подпишись на любимых продавцов, чтобы узнавать о начале их эфиров',
    unfollow: 'Отписаться',
    liveNow: 'В ЭФИРЕ',
    scheduled: 'Запланирован',
    noUpcoming: 'Нет запланированных эфиров',
    filterAll: 'Все',
    filterActive: 'Активные',
    filterCompleted: 'Завершённые',
    filterRefunds: 'Возвраты',
    offerFallback: 'Предложение',
    exportCsv: 'Экспорт в CSV',
    csvDate: 'Дата',
    csvItem: 'Товар',
    csvAmount: 'Сумма',
    csvCurrency: 'Валюта',
    csvStatus: 'Статус',
    csvTracking: 'Номер отправления',
    csvSeller: 'Продавец',
    expired: 'Истекло',
    timeRemaining: 'Осталось {h} ч {m} мин',
  },
  he: {
    title: 'פעילות',
    purchasesTab: 'רכישות',
    salesTab: 'מכירות',
    followingTab: 'במעקב',
    messagesTab: 'הודעות',
    favoritesTab: 'מועדפים',
    offersTab: 'הצעות',
    emptyOffers: 'עדיין אין הצעות',
    emptyOffersDesc: 'הצעות ששלחת וקיבלת יופיעו כאן',
    offerSent: 'נשלחה',
    offerReceived: 'התקבלה',
    offerAccept: 'אישור',
    offerDecline: 'דחייה',
    offerPending: 'ממתינה',
    offerAccepted: 'אושרה',
    offerDeclined: 'נדחתה',
    emptyPurchases: 'עדיין אין רכישות',
    emptyPurchasesDesc: 'פריטים שקנית יופיעו כאן',
    emptySales: 'עדיין אין מכירות',
    emptySalesDesc: 'פריטים שמכרת יופיעו כאן',
    notSeller: 'עדיין אינך מוכר/ת',
    notSellerDesc: 'הפוך/י למוכר/ת כדי לראות כאן את המכירות שלך',
    comingSoon: 'בקרוב',
    comingSoonFollowing: 'מעקב אחרי מוכרים אהובים יגיע בקרוב',
    comingSoonMessages: 'הודעות ישירות יגיעו בקרוב',
    comingSoonFavorites: 'מועדפים יגיעו בקרוב',
    emptyFavorites: 'עדיין אין מועדפים',
    emptyFavoritesDesc: 'הקש/י על הלב בשידור חי כדי להוסיף אותו לכאן',
    buyer: 'קונה',
    loading: 'טוען...',
    error: 'שגיאה בטעינה',
    errorDesc: 'בדקו את החיבור ונסו שוב.',
    retry: 'נסו שוב',
    deliveredOn: 'התקבל ב-',
    reportProblem: 'דיווח על בעיה',
    deadlineExpired: 'המועד עבר',
    timeRemainingPrefix: 'לדיווח על בעיה',
    disputeOpen: 'מחלוקת פתוחה',
    contactSeller: 'פנייה למוכר/ת',
    contactBuyer: 'פנייה לקונה',
    seeVideoMoment: 'לצפייה ברגע',
    emptyFollowing: 'עדיין אינך עוקב/ת אחרי מוכרים',
    emptyFollowingDesc: 'עקבו אחרי המוכרים האהובים עליכם כדי לקבל התראה כשהם בשידור חי',
    unfollow: 'הפסקת מעקב',
    liveNow: 'שידור חי',
    scheduled: 'מתוכנן',
    noUpcoming: 'אין שידורים קרובים',
    filterAll: 'הכול',
    filterActive: 'פעילות',
    filterCompleted: 'הושלמו',
    filterRefunds: 'החזרים',
    offerFallback: 'הצעה',
    exportCsv: 'ייצוא ל-CSV',
    csvDate: 'תאריך',
    csvItem: 'פריט',
    csvAmount: 'סכום',
    csvCurrency: 'מטבע',
    csvStatus: 'סטטוס',
    csvTracking: 'מספר משלוח',
    csvSeller: 'מוכר/ת',
    expired: 'פג תוקף',
    timeRemaining: 'נותרו {h} ש׳ {m} דק׳',
  },
}

// Helper function to calculate remaining time before claim deadline
function formatTimeRemaining(deadline: string): string {
  const lt = ACTIVITY_TEXT[getLang()] ?? ACTIVITY_TEXT.en
  const remaining = new Date(deadline).getTime() - Date.now()
  if (remaining <= 0) return lt.expired
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return lt.timeRemaining.replace('{h}', String(hours)).replace('{m}', String(minutes))
}

type OrderStatusExt = Order['status']

interface PurchaseOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls' | 'category'>
  stream?: { recording_url: string | null } | null
}

interface SaleOrder extends Order {
  item?: Pick<Item, 'title' | 'image_urls' | 'category'>
  buyer_profile?: { display_name: string; username: string }
  stream?: { recording_url: string | null } | null
}

interface FollowedSeller {
  id: string
  store_name?: string
  profiles?: { display_name?: string; avatar_url?: string | null }
  upcoming_streams?: { status: string; scheduled_at: string }[]
}

interface OfferEntry {
  id: string
  seller_id: string
  status: 'pending' | 'accepted' | 'declined'
  amount: number
  currency?: string | null
  item?: { title?: string; image_urls?: string[] }
}

export default function ActivityPage() {
  const { user, profile } = useAuth()
  const lang = getLang()
  const fx = ft(lang)
  usePageTitle((ACTIVITY_TEXT[lang] ?? ACTIVITY_TEXT.en).title)
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
  const [followedSellers, setFollowedSellers] = useState<FollowedSeller[]>([])
  const [loadingFollowing, setLoadingFollowing] = useState(false)
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [loadingSales, setLoadingSales] = useState(false)
  const [errorPurchases, setErrorPurchases] = useState<string | null>(null)
  const [errorSales, setErrorSales] = useState<string | null>(null)

  // Favorites states
  const [favorites, setFavorites] = useState<StreamWithSeller[]>([])
  const [favoriteItems, setFavoriteItems] = useState<ItemWithSeller[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)

  // Offers states
  const [offers, setOffers] = useState<OfferEntry[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  // Pays des vendeurs des offres (devise d'affichage du montant)
  const [offerSellerCountry, setOfferSellerCountry] = useState<Record<string, string>>({})

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

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
        .limit(50)

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
        .limit(50)

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
        const list: OfferEntry[] = await resp.json()
        setOffers(list)
        const sellerIds = [...new Set(list.map(o => o.seller_id).filter(Boolean))]
        if (sellerIds.length > 0) {
          const { data: sellers } = await supabase.from('profiles').select('id, country').in('id', sellerIds)
          const map: Record<string, string> = {}
          for (const p of (sellers || []) as { id: string; country: string | null }[]) if (p.country) map[p.id] = p.country
          setOfferSellerCountry(map)
        }
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

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const lt = ACTIVITY_TEXT[lang] ?? ACTIVITY_TEXT.en

  const mainTabs: { id: MainTab; label: string; emoji: string }[] = [
    { id: 'purchases', label: lt.purchasesTab, emoji: '\uD83D\uDECD\uFE0F' },
    { id: 'sales', label: lt.salesTab, emoji: '\uD83D\uDCB0' },
    { id: 'following', label: lt.followingTab, emoji: '\uD83D\uDC65' },
    { id: 'messages', label: lt.messagesTab, emoji: '\uD83D\uDCAC' },
    { id: 'favorites', label: lt.favoritesTab, emoji: '\u2764\uFE0F' },
    { id: 'offers', label: lt.offersTab, emoji: '\uD83E\uDD1D' },
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
    { id: 'all', label: lt.filterAll },
    { id: 'active', label: lt.filterActive },
    { id: 'completed', label: lt.filterCompleted },
    { id: 'refunds', label: lt.filterRefunds },
  ]

  const getOrderStatusColor = (status: OrderStatusExt) => {
    switch (status) {
      case 'pending_payment': return '#F59E0B'
      case 'paid': return '#3B82F6'
      case 'shipped':
      case 'handed_over':
      case 'delivered': return '#10B981'
      case 'refunded':
      case 'cancelled': return '#8B5CF6'
      case 'disputed': return '#E8344E'
      default: return '#666'
    }
  }

  const getOrderStatusLabel = (status: OrderStatusExt) => statusLabel(status, lang)

  const filterOrders = <T extends { status: OrderStatusExt }>(items: T[]): T[] => {
    switch (subFilter) {
      case 'active': return items.filter(o => ['pending_payment', 'paid'].includes(o.status))
      case 'completed': return items.filter(o => ['shipped', 'handed_over', 'delivered'].includes(o.status))
      case 'refunds': return items.filter(o => ['refunded', 'disputed', 'cancelled'].includes(o.status))
      default: return items
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocale(lang), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number | null | undefined, currency?: string | null) => formatMoney(amount, currency, lang)

  const exportOrdersCSV = async (type: 'purchases' | 'sales') => {
    const orders = type === 'purchases' ? filterOrders(purchases) : filterOrders(sales)
    if (orders.length === 0) return
    const headers = [lt.csvDate, lt.csvItem, lt.csvAmount, lt.csvCurrency, lt.csvStatus, lt.csvTracking, type === 'sales' ? lt.buyer : lt.csvSeller]
    const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`
    const rows = orders.map(o => {
      const saleO = o as SaleOrder
      const otherName = type === 'sales'
        ? (saleO.buyer_profile?.display_name || saleO.buyer_profile?.username || '')
        : ''
      return [
        new Date(o.created_at).toLocaleDateString(getLocale(lang)),
        escape(o.item?.title || ''),
        o.amount.toFixed(2),
        (o as { currency?: string | null }).currency || '',
        escape(getOrderStatusLabel(o.status)),
        o.tracking_number || '',
        escape(otherName),
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const fileName = `shapop_${type}_${new Date().toISOString().slice(0, 10)}.csv`

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: csv,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        })
        await Share.share({ title: fileName, url: result.uri })
      } catch { /* user cancelled share */ }
    } else {
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
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
      <p style={{ fontSize: '13px', color: '#666', maxWidth: '260px', marginBottom: '16px' }} title={errorMsg}>{lt.errorDesc}</p>
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
              loading="lazy"
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
              {formatAmount(order.amount, order.currency)}
              {!isSale && order.shipping_cost != null && order.shipping_cost > 0 && (
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>
                  {' '}+ {formatAmount(order.shipping_cost, order.currency)} {fx.shipping_fee}
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

        {/* Remise : le vendeur saisit le code ou envoie les 2 photos dans le détail de la commande */}
        {order.status === 'paid' && (order.fulfillment_method === 'pickup' || order.fulfillment_method === 'post') && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #1A1A1A', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ flex: 1, fontSize: '12px', color: '#F59E0B', fontWeight: 600 }}>
              {order.fulfillment_method === 'pickup' ? fx.method_pickup : fx.method_post}
              {isSale ? ` — ${order.fulfillment_method === 'pickup' ? fx.awaiting_code : fx.awaiting_photos}` : ''}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/order/${order.id}`) }}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: 'none', whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {isSale ? (order.fulfillment_method === 'pickup' ? fx.enter_code_button : fx.take_photo) : (order.fulfillment_method === 'pickup' ? fx.your_code_title : fx.contact_title)}
            </button>
          </div>
        )}

        {(order.status === 'shipped' || order.status === 'handed_over') && (order.shipped_at || order.handed_over_at) && (
          <p style={{ fontSize: '12px', color: '#10B981', margin: '10px 0 0' }}>
            {order.status === 'handed_over' ? fx.handed_over_on : fx.shipped_on} {formatDate((order.handed_over_at || order.shipped_at)!)}
          </p>
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
        {['paid', 'shipped', 'handed_over', 'delivered'].includes(order.status) && (
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

    const toHandOverCount = sales.filter(o => o.status === 'paid' && (o.fulfillment_method === 'pickup' || o.fulfillment_method === 'post')).length

    const shipmentsButton = (
      <button
        onClick={() => navigate('/to-hand-over')}
        style={{
          width: '100%', padding: '12px 14px', marginBottom: '14px',
          backgroundColor: '#111', border: '1px solid #2A2A2A',
          borderRadius: '14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div style={{ flex: 1, textAlign: 'start' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>
            {fx.to_hand_over}
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
            {fx.method_pickup} · {fx.method_post}
          </p>
        </div>
        {toHandOverCount > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: '#F59E0B',
            backgroundColor: 'rgba(245,158,11,0.12)', padding: '3px 10px',
            borderRadius: '10px', whiteSpace: 'nowrap',
          }}>
            {toHandOverCount}
          </span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={rtlFlip()}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    )

    if (loadingSales) return renderLoading()
    if (errorSales) return renderError(errorSales, fetchSales)

    const filtered = filterOrders(sales)
    if (filtered.length === 0) {
      return (
        <div style={{ padding: '0 16px' }}>
          {shipmentsButton}
          {renderEmpty(
            '\uD83D\uDCB0',
            lt.emptySales,
            lt.emptySalesDesc,
            'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          )}
        </div>
      )
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {shipmentsButton}
        {filtered.map((order, i) => renderOrderCard(order, i, true))}
      </div>
    )
  }

  const renderFollowing = () => {
    if (loadingFollowing) return renderLoading()

    if (followedSellers.length === 0) {
      return renderEmpty(
        '\uD83D\uDC65',
        lt.emptyFollowing,
        lt.emptyFollowingDesc,
        'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      )
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {followedSellers.map((seller, i) => {
          const sellerProfile = seller.profiles
          const displayName = sellerProfile?.display_name || seller.store_name || 'Vendeur'
          const avatarUrl = sellerProfile?.avatar_url
          const hasLive = seller.upcoming_streams?.some((s) => s.status === 'live')
          const nextScheduled = seller.upcoming_streams?.find((s) => s.status === 'scheduled')

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
                    <img src={avatarUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
                      {lt.liveNow}
                    </span>
                  ) : nextScheduled ? (
                    <span style={{ fontSize: '11px', color: '#8B5CF6' }}>
                      {lt.scheduled} - {new Date(nextScheduled.scheduled_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#444' }}>{lt.noUpcoming}</span>
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
                  {lt.unfollow}
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
            {lt.emptyFavorites}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>
            {lt.emptyFavoritesDesc}
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
            {lt.emptyOffers}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: 0, maxWidth: '260px' }}>
            {lt.emptyOffersDesc}
          </p>
        </div>
      )
    }
    const isSeller = !!profile?.is_seller
    return (
      <div style={{ padding: '16px' }}>
        {offers.map((offer, idx) => {
          const isReceived = offer.seller_id === user?.id
          const statusColor = offer.status === 'pending' ? '#F59E0B' : offer.status === 'accepted' ? '#10B981' : '#E8344E'
          const statusLabel = offer.status === 'pending' ? lt.offerPending
            : offer.status === 'accepted' ? lt.offerAccepted
            : lt.offerDeclined
          const imgUrl = offer.item?.image_urls?.[0] || null
          return (
            <div key={offer.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px', marginBottom: '10px', borderRadius: '14px',
              backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
            }}>
              {imgUrl ? (
                <img src={imgUrl} alt="" loading="lazy" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {'\uD83E\uDD1D'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {offer.item?.title || lt.offerFallback}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#F0908A' }}>{offer.currency ? formatMoney(offer.amount, offer.currency) : formatItemPrice(offer.amount, offerSellerCountry[offer.seller_id] ?? profile?.country)}</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: isReceived ? '#3B82F6' : '#8B5CF6',
                    backgroundColor: isReceived ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                    padding: '2px 6px', borderRadius: '6px',
                    border: isReceived ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(139,92,246,0.25)',
                  }}>
                    {isReceived ? lt.offerReceived : lt.offerSent}
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
                    {lt.offerAccept}
                  </button>
                  <button
                    onClick={() => handleRespondToOffer(offer.id, 'decline')}
                    style={{
                      padding: '6px 10px', borderRadius: '8px',
                      border: '1px solid #333', background: 'transparent',
                      color: '#888', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {lt.offerDecline}
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
            <button
              onClick={() => exportOrdersCSV(mainTab as 'purchases' | 'sales')}
              style={{
                marginInlineStart: 'auto', padding: '6px 10px', borderRadius: '100px', flexShrink: 0,
                backgroundColor: 'transparent', border: '1px solid #333',
                color: '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {lt.exportCsv}
            </button>
          </div>
        )}

        {/* Content */}
        <div onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
          {renderContent()}
        </div>
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

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, t } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n'

type MainTab = 'purchases' | 'auctions' | 'offers' | 'saved' | 'messages'
type SubFilter = 'all' | 'active' | 'completed' | 'refunds'

interface DemoOrder {
  id: string
  title: string
  price: number
  seller: string
  status: 'en_cours' | 'expedie' | 'livre' | 'annule'
  date: string
  image: string
}

interface DemoBid {
  id: string
  title: string
  yourBid: number
  highestBid: number
  status: 'gagne' | 'perdu' | 'en_cours'
  image: string
}

interface DemoOffer {
  id: string
  title: string
  yourOffer: number
  status: 'en_attente' | 'acceptee' | 'refusee' | 'contre_offre'
  counterAmount?: number
  image: string
}

interface DemoSaved {
  id: string
  title: string
  price?: number
  isLive: boolean
  image: string
  saved: boolean
}

interface DemoMessage {
  id: string
  username: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
}

const demoOrders: DemoOrder[] = [
  { id: 'o1', title: 'Nike Air Max 90', price: 129.99, seller: 'SneakerKing', status: 'expedie', date: '12 fev 2026', image: 'https://placehold.co/80x80/1A1A1A/F0908A?text=Nike' },
  { id: 'o2', title: 'Sac Vintage Gucci', price: 340.00, seller: 'LuxeVintage', status: 'en_cours', date: '10 fev 2026', image: 'https://placehold.co/80x80/1A1A1A/E8344E?text=Gucci' },
  { id: 'o3', title: 'PS5 Controller', price: 59.99, seller: 'GamerPro', status: 'livre', date: '5 fev 2026', image: 'https://placehold.co/80x80/1A1A1A/3B82F6?text=PS5' },
  { id: 'o4', title: 'Montre Casio Vintage', price: 45.00, seller: 'RetroShop', status: 'livre', date: '28 jan 2026', image: 'https://placehold.co/80x80/1A1A1A/10B981?text=Casio' },
  { id: 'o5', title: 'Veste en cuir noire', price: 89.90, seller: 'StreetStyle', status: 'annule', date: '20 jan 2026', image: 'https://placehold.co/80x80/1A1A1A/F59E0B?text=Veste' },
]

const demoBids: DemoBid[] = [
  { id: 'b1', title: 'Carte Pokemon Dracaufeu', yourBid: 250, highestBid: 250, status: 'en_cours', image: 'https://placehold.co/80x80/1A1A1A/F59E0B?text=PKM' },
  { id: 'b2', title: 'Jordan 1 Retro Chicago', yourBid: 320, highestBid: 380, status: 'perdu', image: 'https://placehold.co/80x80/1A1A1A/E8344E?text=J1' },
  { id: 'b3', title: 'MacBook Pro M2', yourBid: 890, highestBid: 890, status: 'gagne', image: 'https://placehold.co/80x80/1A1A1A/10B981?text=Mac' },
  { id: 'b4', title: 'Figurine One Piece', yourBid: 75, highestBid: 82, status: 'en_cours', image: 'https://placehold.co/80x80/1A1A1A/8B5CF6?text=OP' },
]

const demoOffers: DemoOffer[] = [
  { id: 'of1', title: 'Sneakers Adidas Yeezy', yourOffer: 180, status: 'en_attente', image: 'https://placehold.co/80x80/1A1A1A/F59E0B?text=Yeezy' },
  { id: 'of2', title: 'Sac Louis Vuitton', yourOffer: 450, status: 'contre_offre', counterAmount: 520, image: 'https://placehold.co/80x80/1A1A1A/F0908A?text=LV' },
  { id: 'of3', title: 'Casque Sony WH-1000XM5', yourOffer: 200, status: 'acceptee', image: 'https://placehold.co/80x80/1A1A1A/10B981?text=Sony' },
]

const demoSaved: DemoSaved[] = [
  { id: 's1', title: 'Air Force 1 Custom', price: 149.99, isLive: false, image: 'https://placehold.co/160x160/1A1A1A/F0908A?text=AF1', saved: true },
  { id: 's2', title: 'Live Sneakers Drop', isLive: true, image: 'https://placehold.co/160x160/1A1A1A/E8344E?text=LIVE', saved: true },
  { id: 's3', title: 'Collier en or 18k', price: 220, isLive: false, image: 'https://placehold.co/160x160/1A1A1A/F59E0B?text=Or', saved: true },
  { id: 's4', title: 'Vinyle The Weeknd', price: 35, isLive: false, image: 'https://placehold.co/160x160/1A1A1A/8B5CF6?text=Vinyl', saved: true },
  { id: 's5', title: 'Live Cartes Pokemon', isLive: true, image: 'https://placehold.co/160x160/1A1A1A/3B82F6?text=PKM', saved: true },
  { id: 's6', title: 'Hoodie Supreme', price: 280, isLive: false, image: 'https://placehold.co/160x160/1A1A1A/10B981?text=SUP', saved: true },
]

const demoMessages: DemoMessage[] = [
  { id: 'm1', username: 'SneakerKing', avatar: 'SK', lastMessage: 'Ton colis a ete expedie ! Numero de suivi...', timestamp: 'Il y a 2h', unread: 1 },
  { id: 'm2', username: 'LuxeVintage', avatar: 'LV', lastMessage: 'Merci pour ton achat ! N\'hesite pas...', timestamp: 'Hier', unread: 0 },
  { id: 'm3', username: 'GamerPro', avatar: 'GP', lastMessage: 'Oui la manette est bien neuve, jamais...', timestamp: 'Lun', unread: 3 },
  { id: 'm4', username: 'RetroShop', avatar: 'RS', lastMessage: 'Je peux te faire un prix si tu prends les deux', timestamp: '8 fev', unread: 0 },
]

export default function ActivityPage() {
  const { user } = useAuth()
  const lang = getLang()
  const location = useLocation()
  const initialTab = (location.state as { tab?: MainTab })?.tab || 'purchases'

  const [mainTab, setMainTab] = useState<MainTab>(initialTab)
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [mounted, setMounted] = useState(false)
  const [savedItems, setSavedItems] = useState(demoSaved)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  const txt = {
    fr: {
      title: 'Activite',
      referralTitle: 'Invite tes amis et gagne 10\u20AC',
      referralCta: 'Partager',
      emptyPurchases: 'Aucun achat pour le moment',
      emptyPurchasesDesc: 'Les articles que tu achetes apparaitront ici',
      emptyAuctions: 'Aucune enchere pour le moment',
      emptyAuctionsDesc: 'Ton historique d\'encheres apparaitra ici',
      emptyOffers: 'Aucune offre pour le moment',
      emptyOffersDesc: 'Les offres que tu fais apparaitront ici',
      emptySaved: 'Rien de sauvegarde',
      emptySavedDesc: 'Les articles et lives sauvegardes apparaitront ici',
      emptyMessages: 'Aucun message',
      emptyMessagesDesc: 'Tes conversations avec les vendeurs apparaitront ici',
      statusEnCours: 'En cours',
      statusExpedie: 'Expedie',
      statusLivre: 'Livre',
      statusAnnule: 'Annule',
      bidGagne: 'Gagne',
      bidPerdu: 'Perdu',
      bidEnCours: 'En cours',
      yourBid: 'Ton enchere',
      highestBid: 'Enchere max',
      offerEnAttente: 'En attente',
      offerAcceptee: 'Acceptee',
      offerRefusee: 'Refusee',
      offerContreOffre: 'Contre-offre',
      yourOffer: 'Ton offre',
      counterOffer: 'Contre-offre',
      messagesTab: 'Messages',
      live: 'LIVE',
    },
    en: {
      title: 'Activity',
      referralTitle: 'Invite friends and earn $10',
      referralCta: 'Share',
      emptyPurchases: 'No purchases yet',
      emptyPurchasesDesc: 'Items you buy will appear here',
      emptyAuctions: 'No auctions yet',
      emptyAuctionsDesc: 'Your bid history will appear here',
      emptyOffers: 'No offers yet',
      emptyOffersDesc: 'Offers you make will appear here',
      emptySaved: 'Nothing saved',
      emptySavedDesc: 'Saved items and lives will appear here',
      emptyMessages: 'No messages',
      emptyMessagesDesc: 'Your conversations with sellers will appear here',
      statusEnCours: 'In progress',
      statusExpedie: 'Shipped',
      statusLivre: 'Delivered',
      statusAnnule: 'Cancelled',
      bidGagne: 'Won',
      bidPerdu: 'Lost',
      bidEnCours: 'Active',
      yourBid: 'Your bid',
      highestBid: 'Highest bid',
      offerEnAttente: 'Pending',
      offerAcceptee: 'Accepted',
      offerRefusee: 'Declined',
      offerContreOffre: 'Counter-offer',
      yourOffer: 'Your offer',
      counterOffer: 'Counter-offer',
      messagesTab: 'Messages',
      live: 'LIVE',
    },
    he: {
      title: '\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA',
      referralTitle: '\u05D4\u05D6\u05DE\u05DF \u05D7\u05D1\u05E8\u05D9\u05DD \u05D5\u05D4\u05E8\u05D5\u05D5\u05D7 10$',
      referralCta: '\u05E9\u05EA\u05E3',
      emptyPurchases: '\u05D0\u05D9\u05DF \u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyPurchasesDesc: '\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05EA\u05E7\u05E0\u05D4 \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      emptyAuctions: '\u05D0\u05D9\u05DF \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyAuctionsDesc: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05D4\u05E6\u05E2\u05D5\u05EA \u05E9\u05DC\u05DA \u05EA\u05D5\u05E4\u05D9\u05E2 \u05DB\u05D0\u05DF',
      emptyOffers: '\u05D0\u05D9\u05DF \u05D4\u05E6\u05E2\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF',
      emptyOffersDesc: '\u05D4\u05E6\u05E2\u05D5\u05EA \u05E9\u05EA\u05E2\u05E9\u05D4 \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      emptySaved: '\u05D0\u05D9\u05DF \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05DE\u05D5\u05E8\u05D9\u05DD',
      emptySavedDesc: '\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05E9\u05DE\u05E8\u05EA \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      emptyMessages: '\u05D0\u05D9\u05DF \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
      emptyMessagesDesc: '\u05E9\u05D9\u05D7\u05D5\u05EA \u05E2\u05DD \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF',
      statusEnCours: '\u05D1\u05EA\u05D4\u05DC\u05D9\u05DA',
      statusExpedie: '\u05E0\u05E9\u05DC\u05D7',
      statusLivre: '\u05E0\u05DE\u05E1\u05E8',
      statusAnnule: '\u05D1\u05D5\u05D8\u05DC',
      bidGagne: '\u05E0\u05D9\u05E6\u05D7',
      bidPerdu: '\u05D4\u05E4\u05E1\u05D3',
      bidEnCours: '\u05E4\u05E2\u05D9\u05DC',
      yourBid: '\u05D4\u05D4\u05E6\u05E2\u05D4 \u05E9\u05DC\u05DA',
      highestBid: '\u05D4\u05E6\u05E2\u05D4 \u05D2\u05D1\u05D5\u05D4\u05D4',
      offerEnAttente: '\u05DE\u05DE\u05EA\u05D9\u05DF',
      offerAcceptee: '\u05D0\u05D5\u05E9\u05E8',
      offerRefusee: '\u05E0\u05D3\u05D7\u05D4',
      offerContreOffre: '\u05D4\u05E6\u05E2\u05D4 \u05E0\u05D2\u05D3\u05D9\u05EA',
      yourOffer: '\u05D4\u05D4\u05E6\u05E2\u05D4 \u05E9\u05DC\u05DA',
      counterOffer: '\u05D4\u05E6\u05E2\u05D4 \u05E0\u05D2\u05D3\u05D9\u05EA',
      messagesTab: '\u05D4\u05D5\u05D3\u05E2\u05D5\u05EA',
      live: 'LIVE',
    },
    es: {
      title: 'Actividad',
      referralTitle: 'Invita amigos y gana 10$',
      referralCta: 'Compartir',
      emptyPurchases: 'Sin compras todavia',
      emptyPurchasesDesc: 'Los articulos que compres apareceran aqui',
      emptyAuctions: 'Sin subastas todavia',
      emptyAuctionsDesc: 'Tu historial de pujas aparecera aqui',
      emptyOffers: 'Sin ofertas todavia',
      emptyOffersDesc: 'Las ofertas que hagas apareceran aqui',
      emptySaved: 'Nada guardado',
      emptySavedDesc: 'Los articulos y lives guardados apareceran aqui',
      emptyMessages: 'Sin mensajes',
      emptyMessagesDesc: 'Tus conversaciones con vendedores apareceran aqui',
      statusEnCours: 'En curso',
      statusExpedie: 'Enviado',
      statusLivre: 'Entregado',
      statusAnnule: 'Cancelado',
      bidGagne: 'Ganado',
      bidPerdu: 'Perdido',
      bidEnCours: 'Activo',
      yourBid: 'Tu puja',
      highestBid: 'Puja maxima',
      offerEnAttente: 'Pendiente',
      offerAcceptee: 'Aceptada',
      offerRefusee: 'Rechazada',
      offerContreOffre: 'Contraoferta',
      yourOffer: 'Tu oferta',
      counterOffer: 'Contraoferta',
      messagesTab: 'Mensajes',
      live: 'EN VIVO',
    },
  }

  const lt = txt[lang as keyof typeof txt] || txt.fr

  const mainTabs: { id: MainTab; labelKey: TranslationKey | null; label?: string; emoji: string }[] = [
    { id: 'purchases', labelKey: 'purchases_tab', emoji: '\uD83D\uDECD\uFE0F' },
    { id: 'auctions', labelKey: 'auctions_tab', emoji: '\uD83D\uDD25' },
    { id: 'offers', labelKey: 'offers_tab', emoji: '\uD83D\uDCB0' },
    { id: 'saved', labelKey: 'saved_tab', emoji: '\u2764\uFE0F' },
    { id: 'messages', labelKey: null, label: lt.messagesTab, emoji: '\uD83D\uDCAC' },
  ]

  const subFilters: { id: SubFilter; labelKey: TranslationKey }[] = [
    { id: 'all', labelKey: 'filter_all' },
    { id: 'active', labelKey: 'filter_active' },
    { id: 'completed', labelKey: 'filter_completed' },
    { id: 'refunds', labelKey: 'filter_refunds' },
  ]

  const getOrderStatusColor = (status: DemoOrder['status']) => {
    switch (status) {
      case 'en_cours': return '#F59E0B'
      case 'expedie': return '#3B82F6'
      case 'livre': return '#10B981'
      case 'annule': return '#E8344E'
    }
  }

  const getOrderStatusLabel = (status: DemoOrder['status']) => {
    switch (status) {
      case 'en_cours': return lt.statusEnCours
      case 'expedie': return lt.statusExpedie
      case 'livre': return lt.statusLivre
      case 'annule': return lt.statusAnnule
    }
  }

  const getBidStatusColor = (status: DemoBid['status']) => {
    switch (status) {
      case 'gagne': return '#10B981'
      case 'perdu': return '#E8344E'
      case 'en_cours': return '#F59E0B'
    }
  }

  const getBidStatusLabel = (status: DemoBid['status']) => {
    switch (status) {
      case 'gagne': return lt.bidGagne
      case 'perdu': return lt.bidPerdu
      case 'en_cours': return lt.bidEnCours
    }
  }

  const getOfferStatusColor = (status: DemoOffer['status']) => {
    switch (status) {
      case 'en_attente': return '#F59E0B'
      case 'acceptee': return '#10B981'
      case 'refusee': return '#E8344E'
      case 'contre_offre': return '#8B5CF6'
    }
  }

  const getOfferStatusLabel = (status: DemoOffer['status']) => {
    switch (status) {
      case 'en_attente': return lt.offerEnAttente
      case 'acceptee': return lt.offerAcceptee
      case 'refusee': return lt.offerRefusee
      case 'contre_offre': return lt.offerContreOffre
    }
  }

  const filterOrders = (items: DemoOrder[]): DemoOrder[] => {
    switch (subFilter) {
      case 'active': return items.filter(o => ['en_cours', 'expedie'].includes(o.status))
      case 'completed': return items.filter(o => o.status === 'livre')
      case 'refunds': return items.filter(o => o.status === 'annule')
      default: return items
    }
  }

  const toggleSave = (id: string) => {
    setSavedItems(prev => prev.map(item =>
      item.id === id ? { ...item, saved: !item.saved } : item
    ))
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

  const renderPurchases = () => {
    const filtered = filterOrders(demoOrders)
    if (filtered.length === 0) return renderEmpty('\uD83D\uDECD\uFE0F', lt.emptyPurchases, lt.emptyPurchasesDesc, 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)')

    return (
      <div style={{ padding: '0 16px' }}>
        {filtered.map((order, i) => (
          <div key={order.id} style={{
            padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
            border: '1px solid #1A1A1A', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '12px',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
            transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
          }}>
            <img
              src={order.image}
              alt={order.title}
              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', backgroundColor: '#111' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.title}
              </p>
              <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '3px' }}>
                {order.price.toFixed(2)} \u20AC
              </p>
              <p style={{ fontSize: '12px', color: '#555' }}>
                {order.seller} \u00B7 {order.date}
              </p>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: getOrderStatusColor(order.status),
              backgroundColor: `${getOrderStatusColor(order.status)}14`,
              padding: '5px 12px', borderRadius: '10px',
              border: `1px solid ${getOrderStatusColor(order.status)}30`,
              whiteSpace: 'nowrap',
            }}>
              {getOrderStatusLabel(order.status)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderAuctions = () => {
    if (demoBids.length === 0) return renderEmpty('\uD83C\uDFAF', lt.emptyAuctions, lt.emptyAuctionsDesc, 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)')

    return (
      <div style={{ padding: '0 16px' }}>
        {demoBids.map((bid, i) => (
          <div key={bid.id} style={{
            padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
            border: '1px solid #1A1A1A', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '12px',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
            transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
          }}>
            <img
              src={bid.image}
              alt={bid.title}
              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', backgroundColor: '#111' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bid.title}
              </p>
              <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
                {lt.yourBid}: <span style={{ color: '#F0908A', fontWeight: 600 }}>{bid.yourBid.toFixed(2)} \u20AC</span>
              </p>
              <p style={{ fontSize: '12px', color: '#555' }}>
                {lt.highestBid}: {bid.highestBid.toFixed(2)} \u20AC
              </p>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: getBidStatusColor(bid.status),
              backgroundColor: `${getBidStatusColor(bid.status)}14`,
              padding: '5px 12px', borderRadius: '10px',
              border: `1px solid ${getBidStatusColor(bid.status)}30`,
              whiteSpace: 'nowrap',
            }}>
              {getBidStatusLabel(bid.status)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderOffers = () => {
    if (demoOffers.length === 0) return renderEmpty('\uD83D\uDCB3', lt.emptyOffers, lt.emptyOffersDesc, 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)')

    return (
      <div style={{ padding: '0 16px' }}>
        {demoOffers.map((offer, i) => (
          <div key={offer.id} style={{
            padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
            border: '1px solid #1A1A1A', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '12px',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
            transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
          }}>
            <img
              src={offer.image}
              alt={offer.title}
              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', backgroundColor: '#111' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {offer.title}
              </p>
              <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
                {lt.yourOffer}: <span style={{ color: '#F0908A', fontWeight: 600 }}>{offer.yourOffer.toFixed(2)} \u20AC</span>
              </p>
              {offer.status === 'contre_offre' && offer.counterAmount && (
                <p style={{ fontSize: '12px', color: '#8B5CF6' }}>
                  {lt.counterOffer}: {offer.counterAmount.toFixed(2)} \u20AC
                </p>
              )}
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: getOfferStatusColor(offer.status),
              backgroundColor: `${getOfferStatusColor(offer.status)}14`,
              padding: '5px 12px', borderRadius: '10px',
              border: `1px solid ${getOfferStatusColor(offer.status)}30`,
              whiteSpace: 'nowrap',
            }}>
              {getOfferStatusLabel(offer.status)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderSaved = () => {
    const active = savedItems.filter(s => s.saved)
    if (active.length === 0) return renderEmpty('\uD83D\uDD16', lt.emptySaved, lt.emptySavedDesc, 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)')

    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
        padding: '0 16px',
      }}>
        {active.map((item, i) => (
          <div key={item.id} style={{
            backgroundColor: '#0D0D0D', borderRadius: '14px',
            border: '1px solid #1A1A1A', overflow: 'hidden',
            position: 'relative',
            opacity: mounted ? 1 : 0, transform: mounted ? 'scale(1)' : 'scale(0.95)',
            transition: `all 0.4s ease ${0.1 + i * 0.06}s`,
          }}>
            <div style={{ position: 'relative' }}>
              <img
                src={item.image}
                alt={item.title}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', backgroundColor: '#111' }}
              />
              {item.isLive && (
                <span style={{
                  position: 'absolute', top: '8px', left: '8px',
                  backgroundColor: '#E8344E', color: '#fff',
                  fontSize: '10px', fontWeight: 800, padding: '3px 8px',
                  borderRadius: '6px', letterSpacing: '0.5px',
                }}>
                  {lt.live}
                </span>
              )}
              <button
                onClick={() => toggleSave(item.id)}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '16px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8344E" stroke="#E8344E" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </p>
              {item.price ? (
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0908A' }}>
                  {item.price.toFixed(2)} \u20AC
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: '#E8344E', fontWeight: 700 }}>
                  \u25CF {lt.live}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderMessages = () => {
    if (demoMessages.length === 0) return renderEmpty('\uD83D\uDCAC', lt.emptyMessages, lt.emptyMessagesDesc, 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)')

    return (
      <div style={{ padding: '0 16px' }}>
        {demoMessages.map((msg, i) => (
          <div key={msg.id} style={{
            padding: '14px', backgroundColor: '#0D0D0D', borderRadius: '14px',
            border: '1px solid #1A1A1A', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '12px',
            cursor: 'pointer',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
            transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #F0908A, #E8344E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {msg.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {msg.username}
                </p>
                <span style={{ fontSize: '11px', color: '#555', flexShrink: 0 }}>
                  {msg.timestamp}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '13px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  {msg.lastMessage}
                </p>
                {msg.unread > 0 && (
                  <span style={{
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    backgroundColor: '#E8344E', color: '#fff',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px', flexShrink: 0,
                  }}>
                    {msg.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderContent = () => {
    switch (mainTab) {
      case 'purchases': return renderPurchases()
      case 'auctions': return renderAuctions()
      case 'offers': return renderOffers()
      case 'saved': return renderSaved()
      case 'messages': return renderMessages()
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '100px' }}>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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

        {/* Referral banner */}
        <div style={{
          margin: '16px 16px 0', padding: '14px 16px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.5s ease 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="M16 6H8a4 4 0 0 1 0-8h0a4 4 0 0 1 4 4 4 4 0 0 1 4-4h0a4 4 0 0 1 0 8" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
              {lt.referralTitle}
            </span>
          </div>
          <button style={{
            padding: '8px 16px', borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}>
            {lt.referralCta}
          </button>
        </div>

        {/* Main tabs */}
        <div style={{
          display: 'flex', gap: '6px', padding: '16px 16px 12px',
          overflowX: 'auto',
        }} className="no-scrollbar">
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMainTab(tab.id); setSubFilter('all') }}
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
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '14px' }}>{tab.emoji}</span>
              <span style={{
                fontSize: '13px',
                fontWeight: mainTab === tab.id ? 700 : 500,
                color: mainTab === tab.id ? '#F0908A' : '#666',
              }}>
                {tab.labelKey ? t(lang, tab.labelKey) : tab.label}
              </span>
              {tab.id === 'messages' && demoMessages.reduce((sum, m) => sum + m.unread, 0) > 0 && (
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: '#E8344E', position: 'absolute',
                  top: '8px', right: '8px',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Sub-filters (not shown for messages and saved tabs) */}
        {mainTab !== 'messages' && mainTab !== 'saved' && (
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
                  transition: 'all 0.2s',
                }}
              >
                {t(lang, filter.labelKey)}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {renderContent()}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

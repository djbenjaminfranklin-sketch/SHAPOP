import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLang } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import type { Stream, Item, ChatMessage, Order, Giveaway } from '../types/database'
import EngagementDashboard from '../components/EngagementDashboard'
import ViewerReactions from '../components/ViewerReactions'
import LiveKitViewer from '../components/LiveKitViewer'
import SellerProfileHeader from '../components/stream/SellerProfileHeader'
import StreamSidebar from '../components/stream/StreamSidebar'
import ActiveItemBar from '../components/stream/ActiveItemBar'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'
import { getStreamQualityConstraints, isWatchLimitExceeded, getAppSettings } from '../lib/settings'
import { hapticTap } from '../lib/haptics'
import { Share } from '@capacitor/share'

type Lang = 'fr' | 'en' | 'he' | 'es'

const streamContent = {
  fr: {
    viewers: 'spectateurs',
    liveStartsSoon: 'Le live commence bientot...',
    liveEnded: 'Le live est termine',
    liveChat: 'Chat en direct',
    anonymous: 'Anonyme',
    sendMessage: 'Envoyer un message...',
    send: 'Envoyer',
    bid: 'Encherir',
    currentPrice: 'Prix actuel',
    loginToChat: 'Connectez-vous pour participer au chat',
    streamNotFound: 'Stream introuvable',
    endStream: 'Terminer le live',
    endStreamConfirm: 'Es-tu sur de vouloir terminer le live ?',
    endStreamYes: 'Oui, terminer',
    endStreamNo: 'Non, continuer',
    mute: 'Couper le micro',
    unmute: 'Activer le micro',
    flipCamera: 'Retourner la camera',
    connectedTo: 'Connecte au live de',
    liveNow: 'EN DIRECT',
    soldBang: 'VENDU !',
    unsoldBang: 'INVENDU',
    confirmAddress: 'Confirme ton adresse de livraison',
    toReceiveItem: 'Pour recevoir ton article',
    fullName: 'Nom complet',
    addressPlaceholder: 'Adresse',
    cityPlaceholder: 'Ville',
    zipPlaceholder: 'Code postal',
    phonePlaceholder: 'Telephone',
    confirm: 'Confirmer',
    youWon: 'Tu as gagne !',
    payToClaim: 'Paye pour recevoir ton article',
    payNow: 'Payer maintenant',
    paymentSuccess: 'Paiement confirme !',
    paymentSuccessDesc: 'Tu recevras ton article bientot',
    paymentError: 'Erreur de paiement',
    total: 'Total',
    close: 'Fermer',
    unmuteViewer: 'Reactiver le son',
    messageFlagged: '[Message masque]',
    bidError: 'Enchere echouee',
    creatingOrder: 'Creation de ta commande...',
    orderNotFound: 'Commande introuvable. Veuillez contacter le support.',
    paymentTimeout: 'Le paiement a expire. Veuillez fermer et reessayer.',
    paymentFailed: 'Paiement echoue',
    addCardTitle: 'Ajoute ta carte pour encherir',
    addCardDesc: 'Une carte est requise pour garantir tes encheres',
    cardSaved: 'Carte enregistree !',
    cardSavedDesc: 'Tu peux maintenant encherir',
    saveCard: 'Enregistrer la carte',
    cardRequired: 'Ajoute ta carte pour encherir',
    shipping: 'Livraison',
    itemPrice: 'Prix article',
    walletTitle: 'Portefeuille',
    walletAddress: 'Adresse de livraison',
    walletPayment: 'Moyen de paiement',
    walletPromo: 'Code promo',
    walletPromoPlaceholder: 'Entrer un code promo',
    walletApply: 'Appliquer',
    walletNoAddress: 'Aucune adresse',
    walletAddAddress: 'Ajouter une adresse',
    walletNoCard: 'Aucune carte',
    walletAddCard: 'Ajouter',
    linkCopied: 'Lien copie !',
    waitingNextItem: 'En attente de l\'article suivant...',
    moreReport: 'Signaler',
    moreBlock: 'Bloquer',
    morePiP: 'Mode mini-lecteur',
    pipUnavailable: 'PiP non disponible',
    giftTitle: 'Gagne un cadeau en live !',
    giftParticipants: 'participants',
    giftEnter: 'Participer et gagner !',
    giftEntered: 'Inscrit ✓',
    giftWinner: 'a gagne le cadeau !',
  },
  en: {
    viewers: 'viewers',
    liveStartsSoon: 'The live starts soon...',
    liveEnded: 'The live has ended',
    liveChat: 'Live chat',
    anonymous: 'Anonymous',
    sendMessage: 'Send a message...',
    send: 'Send',
    bid: 'Bid',
    currentPrice: 'Current price',
    loginToChat: 'Log in to join the chat',
    streamNotFound: 'Stream not found',
    endStream: 'End stream',
    endStreamConfirm: 'Are you sure you want to end the stream?',
    endStreamYes: 'Yes, end it',
    endStreamNo: 'No, continue',
    mute: 'Mute mic',
    unmute: 'Unmute mic',
    flipCamera: 'Flip camera',
    connectedTo: 'Connected to live by',
    liveNow: 'LIVE',
    soldBang: 'SOLD!',
    unsoldBang: 'UNSOLD',
    confirmAddress: 'Confirm your shipping address',
    toReceiveItem: 'To receive your item',
    fullName: 'Full name',
    addressPlaceholder: 'Address',
    cityPlaceholder: 'City',
    zipPlaceholder: 'Zip code',
    phonePlaceholder: 'Phone',
    confirm: 'Confirm',
    youWon: 'You won!',
    payToClaim: 'Pay to claim your item',
    payNow: 'Pay now',
    paymentSuccess: 'Payment confirmed!',
    paymentSuccessDesc: 'You will receive your item soon',
    paymentError: 'Payment error',
    total: 'Total',
    close: 'Close',
    unmuteViewer: 'Unmute',
    messageFlagged: '[Hidden message]',
    bidError: 'Bid failed',
    creatingOrder: 'Creating your order...',
    orderNotFound: 'Could not find your order. Please contact support.',
    paymentTimeout: 'Payment setup timed out. Please close and try again.',
    paymentFailed: 'Payment failed',
    addCardTitle: 'Add your card to bid',
    addCardDesc: 'A card is required to guarantee your bids',
    cardSaved: 'Card saved!',
    cardSavedDesc: 'You can now place bids',
    saveCard: 'Save card',
    cardRequired: 'Add your card to bid',
    shipping: 'Shipping',
    itemPrice: 'Item price',
    walletTitle: 'Wallet',
    walletAddress: 'Delivery address',
    walletPayment: 'Payment method',
    walletPromo: 'Promo code',
    walletPromoPlaceholder: 'Enter a promo code',
    walletApply: 'Apply',
    walletNoAddress: 'No address',
    walletAddAddress: 'Add an address',
    walletNoCard: 'No card',
    walletAddCard: 'Add',
    linkCopied: 'Link copied!',
    waitingNextItem: 'Waiting for the next item...',
    moreReport: 'Report',
    moreBlock: 'Block',
    morePiP: 'Mini player',
    pipUnavailable: 'PiP unavailable',
    giftTitle: 'Win a gift live!',
    giftParticipants: 'participants',
    giftEnter: 'Enter to win!',
    giftEntered: 'Entered ✓',
    giftWinner: 'won the gift!',
  },
  he: {
    viewers: '\u05E6\u05D5\u05E4\u05D9\u05DD',
    liveStartsSoon: '...\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05DE\u05EA\u05D7\u05D9\u05DC \u05D1\u05E7\u05E8\u05D5\u05D1',
    liveEnded: '\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05E1\u05EA\u05D9\u05D9\u05DD',
    liveChat: '\u05E6\u05F3\u05D0\u05D8 \u05D7\u05D9',
    anonymous: '\u05D0\u05E0\u05D5\u05E0\u05D9\u05DE\u05D9',
    sendMessage: '...\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4',
    send: '\u05E9\u05DC\u05D7',
    bid: '\u05D4\u05E6\u05E2',
    currentPrice: '\u05DE\u05D7\u05D9\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D9',
    loginToChat: '\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E9\u05EA\u05EA\u05E3 \u05D1\u05E6\u05F3\u05D0\u05D8',
    streamNotFound: '\u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0',
    endStream: '\u05E1\u05D9\u05D9\u05DD \u05E9\u05D9\u05D3\u05D5\u05E8',
    endStreamConfirm: '?\u05D1\u05D8\u05D5\u05D7 \u05E9\u05D0\u05EA\u05D4 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05EA \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8',
    endStreamYes: '\u05DB\u05DF, \u05E1\u05D9\u05D9\u05DD',
    endStreamNo: '\u05DC\u05D0, \u05D4\u05DE\u05E9\u05DA',
    mute: '\u05D4\u05E9\u05EA\u05E7 \u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF',
    unmute: '\u05D4\u05E4\u05E2\u05DC \u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF',
    flipCamera: '\u05D4\u05E4\u05D5\u05DA \u05DE\u05E6\u05DC\u05DE\u05D4',
    connectedTo: '\u05DE\u05D7\u05D5\u05D1\u05E8 \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05E9\u05DC',
    liveNow: '\u05E9\u05D9\u05D3\u05D5\u05E8',
    soldBang: '!נמכר',
    unsoldBang: 'לא נמכר',
    confirmAddress: 'אשר את כתובת המשלוח שלך',
    toReceiveItem: 'כדי לקבל את הפריט שלך',
    fullName: 'שם מלא',
    addressPlaceholder: 'כתובת',
    cityPlaceholder: 'עיר',
    zipPlaceholder: 'מיקוד',
    phonePlaceholder: 'טלפון',
    confirm: 'אישור',
    youWon: '!זכית',
    payToClaim: 'שלם כדי לקבל את הפריט שלך',
    payNow: 'שלם עכשיו',
    paymentSuccess: '!התשלום אושר',
    paymentSuccessDesc: 'תקבל את הפריט שלך בקרוב',
    paymentError: 'שגיאת תשלום',
    total: 'סה"כ',
    close: 'סגור',
    unmuteViewer: 'בטל השתקה',
    messageFlagged: '[הודעה מוסתרת]',
    bidError: 'ההצעה נכשלה',
    creatingOrder: '...יוצר את ההזמנה שלך',
    orderNotFound: 'לא ניתן למצוא את ההזמנה שלך. אנא צור קשר עם התמיכה.',
    paymentTimeout: 'זמן התשלום פג. אנא סגור ונסה שוב.',
    paymentFailed: 'התשלום נכשל',
    addCardTitle: 'הוסף כרטיס כדי להציע',
    addCardDesc: 'כרטיס נדרש כדי להבטיח את ההצעות שלך',
    cardSaved: '!הכרטיס נשמר',
    cardSavedDesc: 'אתה יכול עכשיו להציע',
    saveCard: 'שמור כרטיס',
    cardRequired: 'הוסף כרטיס כדי להציע',
    shipping: 'משלוח',
    itemPrice: 'מחיר פריט',
    walletTitle: 'ארנק',
    walletAddress: 'כתובת משלוח',
    walletPayment: 'אמצעי תשלום',
    walletPromo: 'קוד קופון',
    walletPromoPlaceholder: 'הזן קוד קופון',
    walletApply: 'החל',
    walletNoAddress: 'אין כתובת',
    walletAddAddress: 'הוסף כתובת',
    walletNoCard: 'אין כרטיס',
    walletAddCard: 'הוסף',
    linkCopied: '!הקישור הועתק',
    waitingNextItem: '...ממתין לפריט הבא',
    moreReport: 'דווח',
    moreBlock: 'חסום',
    morePiP: 'נגן מיני',
    pipUnavailable: 'PiP לא זמין',
    giftTitle: '!זכה במתנה בשידור חי',
    giftParticipants: 'משתתפים',
    giftEnter: '!להשתתף ולזכות',
    giftEntered: '✓ רשום',
    giftWinner: 'זכה במתנה!',
  },
  es: {
    viewers: 'espectadores',
    liveStartsSoon: 'El live empieza pronto...',
    liveEnded: 'El live ha terminado',
    liveChat: 'Chat en directo',
    anonymous: 'Anonimo',
    sendMessage: 'Enviar un mensaje...',
    send: 'Enviar',
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    loginToChat: 'Inicia sesion para participar en el chat',
    streamNotFound: 'Stream no encontrado',
    endStream: 'Terminar el directo',
    endStreamConfirm: 'Seguro que quieres terminar el directo?',
    endStreamYes: 'Si, terminar',
    endStreamNo: 'No, continuar',
    mute: 'Silenciar micro',
    unmute: 'Activar micro',
    flipCamera: 'Voltear camara',
    connectedTo: 'Conectado al directo de',
    liveNow: 'EN VIVO',
    soldBang: 'VENDIDO!',
    unsoldBang: 'NO VENDIDO',
    confirmAddress: 'Confirma tu direccion de envio',
    toReceiveItem: 'Para recibir tu articulo',
    fullName: 'Nombre completo',
    addressPlaceholder: 'Direccion',
    cityPlaceholder: 'Ciudad',
    zipPlaceholder: 'Codigo postal',
    phonePlaceholder: 'Telefono',
    confirm: 'Confirmar',
    youWon: 'Ganaste!',
    payToClaim: 'Paga para recibir tu articulo',
    payNow: 'Pagar ahora',
    paymentSuccess: 'Pago confirmado!',
    paymentSuccessDesc: 'Recibiras tu articulo pronto',
    paymentError: 'Error de pago',
    total: 'Total',
    close: 'Cerrar',
    unmuteViewer: 'Activar sonido',
    messageFlagged: '[Mensaje oculto]',
    bidError: 'Puja fallida',
    creatingOrder: 'Creando tu pedido...',
    orderNotFound: 'No se pudo encontrar tu pedido. Por favor contacta soporte.',
    paymentTimeout: 'El pago ha expirado. Por favor cierra e intenta de nuevo.',
    paymentFailed: 'Pago fallido',
    addCardTitle: 'Agrega tu tarjeta para pujar',
    addCardDesc: 'Se requiere una tarjeta para garantizar tus pujas',
    cardSaved: 'Tarjeta guardada!',
    cardSavedDesc: 'Ya puedes pujar',
    saveCard: 'Guardar tarjeta',
    cardRequired: 'Agrega tu tarjeta para pujar',
    shipping: 'Envio',
    itemPrice: 'Precio articulo',
    walletTitle: 'Cartera',
    walletAddress: 'Direccion de envio',
    walletPayment: 'Metodo de pago',
    walletPromo: 'Codigo promo',
    walletPromoPlaceholder: 'Ingresar codigo promo',
    walletApply: 'Aplicar',
    walletNoAddress: 'Sin direccion',
    walletAddAddress: 'Agregar direccion',
    walletNoCard: 'Sin tarjeta',
    walletAddCard: 'Agregar',
    linkCopied: 'Enlace copiado!',
    waitingNextItem: 'Esperando el siguiente articulo...',
    moreReport: 'Reportar',
    moreBlock: 'Bloquear',
    morePiP: 'Mini reproductor',
    pipUnavailable: 'PiP no disponible',
    giftTitle: 'Gana un regalo en vivo!',
    giftParticipants: 'participantes',
    giftEnter: 'Participar y ganar!',
    giftEntered: 'Inscrito ✓',
    giftWinner: 'gano el regalo!',
  },
}

// Stripe Elements loader — initialized once
let stripePromise: Promise<Stripe | null> | null = null
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = apiFetch('/api/stripe/config')
      .then(r => r.json())
      .then(({ publishable_key }) => loadStripe(publishable_key))
      .catch(() => null)
  }
  return stripePromise
}

// Inner payment form rendered inside <Elements>
function PaymentFormInner({ onSuccess, onError, loading, setLoading, payNowLabel, paymentFailedLabel }: {
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  payNowLabel: string
  paymentFailedLabel: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || paymentFailedLabel)
      setLoading(false)
    } else if (paymentIntent) {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', marginTop: '16px', padding: '16px',
          background: loading ? '#555' : 'linear-gradient(135deg, #22C55E, #16A34A)',
          borderRadius: '14px', border: 'none',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : payNowLabel}
      </button>
    </form>
  )
}

// Inner form for card setup (SetupIntent mode)
function SetupCardFormInner({ clientSecret, onSuccess, onError, loading, setLoading, saveLabel }: {
  clientSecret: string
  onSuccess: () => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  saveLabel: string
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return
    setLoading(true)

    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (error) {
      onError(error.message || 'Failed to save card')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        padding: '14px', borderRadius: '10px',
        backgroundColor: '#0D0D0D', border: '1px solid #333',
      }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#fff',
              '::placeholder': { color: '#555' },
              iconColor: '#F0908A',
            },
            invalid: { color: '#E8344E' },
          },
        }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', marginTop: '16px', padding: '16px',
          background: loading ? '#555' : 'linear-gradient(135deg, #F0908A, #E8344E)',
          borderRadius: '14px', border: 'none',
          color: '#fff', fontSize: '16px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : saveLabel}
      </button>
    </form>
  )
}

export default function StreamView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lang = (getLang() || 'fr') as Lang
  const ct = streamContent[lang] || streamContent.fr
  const { user, profile } = useAuth()
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const auctionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  const itemEventSeqRef = useRef(0)
  useEffect(() => {
    isMountedRef.current = true
    if (id) track('stream_join', { stream_id: id })
    return () => {
      isMountedRef.current = false
      if (id) track('stream_leave', { stream_id: id })
    }
  }, [])

  const [stream, setStream] = useState<Stream | null>(null)
  const [activeAuction, setActiveAuction] = useState<Item | null>(null)
  const [messages, setMessages] = useState<(ChatMessage & { user_profile?: { display_name: string; avatar_url?: string | null } })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)

  // Engagement dashboard state
  const [showEngagement, setShowEngagement] = useState(false)
  const [_reactionCount, setReactionCount] = useState(0)
  const [engageBtnPulse, setEngageBtnPulse] = useState(false)

  // Seller camera state
  const [isMuted, setIsMuted] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  const [sellerName, setSellerName] = useState('')
  const [sellerAvatar, setSellerAvatar] = useState<string | null>(null)
  const [sellerScore, setSellerScore] = useState<number | null>(null)
  const [, setItemCount] = useState(0)
  const [_sellerReturnPolicy, setSellerReturnPolicy] = useState<string>('no_return')
  const [sellerShippingDelay, setSellerShippingDelay] = useState<number>(2)
  const [viewerMuted, setViewerMuted] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  // LiveKit viewer state
  const [viewerLkUrl, setViewerLkUrl] = useState<string | null>(null)
  const [viewerLkToken, setViewerLkToken] = useState<string | null>(null)

  // Sold animation & payment modal
  const [soldAnimation, setSoldAnimation] = useState<{ winner: string; price: number; isUnsold?: boolean } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentItem, setPaymentItem] = useState<Item | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState({ name: '', street: '', city: '', zip: '', phone: '' })
  const [addressStep, setAddressStep] = useState(true) // true = show address first, false = show payment

  // Carrier selection for shipping
  const [selectedCarrier, setSelectedCarrier] = useState('mondial_relay')

  // Buyer saved zip for zone-based shipping pricing
  const [buyerSavedZip, setBuyerSavedZip] = useState<string | undefined>(undefined)

  // Card setup modal (required before bidding)
  const [hasCard, setHasCard] = useState<boolean | null>(null) // null = not checked yet
  const [showCardModal, setShowCardModal] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardSuccess, setCardSuccess] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  // Wallet modal state
  const [showWallet, setShowWallet] = useState(false)
  const [walletAddress, setWalletAddress] = useState<{ name: string; street: string; city: string; zip: string } | null>(null)
  const [walletCard, setWalletCard] = useState<{ brand?: string; last4?: string } | null>(null)
  const [promoCode, setPromoCode] = useState('')

  // Giveaway state
  const [activeGiveaway, setActiveGiveaway] = useState<Giveaway | null>(null)

  const [hasEnteredGiveaway, setHasEnteredGiveaway] = useState(false)
  const [giveawayWinner, setGiveawayWinner] = useState<{ name: string } | null>(null)
  const [enteringGiveaway, setEnteringGiveaway] = useState(false)

  // More menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Clip capture state


  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }, [])

  // Determine if user is the seller of this stream
  const isSeller = !!(user && stream && stream.seller_id === user.id)
  const isLive = stream?.status === 'live'

  // Redirect seller to prepare-live page for their own scheduled streams
  useEffect(() => {
    if (isSeller && stream && stream.status === 'scheduled') {
      navigate(`/prepare-live/${stream.id}`, { replace: true })
    }
  }, [isSeller, stream, navigate])

  // Watch time tracking — log viewing seconds every 30s
  useEffect(() => {
    if (!isLive || isSeller) return
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('shapop_watch_log')
        const logs: { ts: number; duration: number }[] = raw ? JSON.parse(raw) : []
        logs.push({ ts: Date.now(), duration: 30 })
        // Keep only last 31 days of logs
        const cutoff = Date.now() - 31 * 86400000
        const filtered = logs.filter(l => l.ts > cutoff)
        localStorage.setItem('shapop_watch_log', JSON.stringify(filtered))
      } catch { /* ignore */ }
    }, 30000)
    return () => clearInterval(interval)
  }, [isLive, isSeller])

  // Watch limit enforcement — redirect if limit exceeded
  useEffect(() => {
    if (isSeller || !isLive) return
    if (isWatchLimitExceeded()) {
      const lang = (localStorage.getItem('shapop_lang') || 'fr') as 'fr' | 'en' | 'he' | 'es'
      const msgs = {
        fr: 'Tu as atteint ta limite de visionnage. Reviens plus tard !',
        en: 'You\'ve reached your watch time limit. Come back later!',
        he: '\u05D4\u05D2\u05E2\u05EA \u05DC\u05DE\u05D2\u05D1\u05DC\u05EA \u05D6\u05DE\u05DF \u05D4\u05E6\u05E4\u05D9\u05D9\u05D4. \u05D7\u05D6\u05D5\u05E8 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8!',
        es: 'Has alcanzado tu limite de visualizacion. Vuelve mas tarde!',
      }
      alert(msgs[lang])
      navigate(-1)
    }
  }, [isSeller, isLive, navigate])

  // Check if user has a saved card (for bidding)
  useEffect(() => {
    if (!user || isSeller) return
    const checkCard = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        if (!token) return
        const resp = await apiFetch('/api/stripe/check-card', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          setHasCard(data.has_card)
        }
      } catch { /* ignore */ }
    }
    checkCard()
  }, [user, isSeller])

  // Fetch wallet data (address + card) when wallet modal opens
  useEffect(() => {
    if (!showWallet || !user) return
    const fetchWalletData = async () => {
      try {
        // Fetch default address
        const { data: addr } = await supabase
          .from('addresses')
          .select('name, street, city, zip')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single()
        if (addr) setWalletAddress(addr)
        // Fetch card info
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        if (token) {
          const resp = await apiFetch('/api/stripe/card-info', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (resp.ok) {
            const card = await resp.json()
            if (card.has_card) setWalletCard({ brand: card.brand, last4: card.last4 })
          }
        }
      } catch { /* ignore */ }
    }
    fetchWalletData()
  }, [showWallet, user])

  // Fetch buyer's saved zip for zone-based shipping pricing
  useEffect(() => {
    if (!user || isSeller) return
    const fetchSavedZip = async () => {
      try {
        const { data: savedAddr } = await supabase
          .from('addresses')
          .select('zip')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single()
        if (savedAddr?.zip) setBuyerSavedZip(savedAddr.zip)
      } catch { /* ignore */ }
    }
    fetchSavedZip()
  }, [user, isSeller])

  // Fetch LiveKit viewer token when stream has a livekit room and is live
  useEffect(() => {
    if (!stream?.livekit_room_name || stream.status !== 'live' || isSeller) return
    const fetchLkToken = async () => {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) return
      try {
        const resp = await apiFetch(`/api/streams/${stream.id}/livekit-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
        const data = await resp.json()
        if (data.token && data.url) {
          setViewerLkToken(data.token)
          setViewerLkUrl(data.url)
        }
      } catch (err) {
        console.error('Failed to fetch LiveKit viewer token:', err)
      }
    }
    fetchLkToken()
  }, [stream?.id, stream?.livekit_room_name, stream?.status, isSeller])

  // Track viewer count
  useEffect(() => {
    if (!stream?.id || !isLive || isSeller || !user) return
    const trackViewer = async () => {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) return
      apiFetch(`/api/streams/${stream.id}/viewer-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      }).catch(() => {})
    }
    trackViewer()
    return () => {
      if (!stream?.id || !user) return
      supabase.auth.getSession().then(({ data: session }) => {
        const token = session?.session?.access_token
        if (!token) return
        apiFetch(`/api/streams/${stream.id}/viewer-leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        }).catch(() => {})
      })
    }
  }, [stream?.id, isLive, isSeller, user])

  // ═══ Payment modal timeout: prevent infinite spinner ═══
  useEffect(() => {
    if (!showPaymentModal || addressStep || clientSecret || paymentError) return

    const timeout = setTimeout(() => {
      if (!clientSecret && isMountedRef.current) {
        setPaymentError(ct.paymentTimeout)
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [showPaymentModal, addressStep, clientSecret, paymentError])

  // ═══ SELLER: Start camera capture ═══
  useEffect(() => {
    if (!isSeller || !isLive) return

    const startCamera = async () => {
      try {
        const qualityConstraints = getStreamQualityConstraints()
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: qualityConstraints.width },
            height: { ideal: qualityConstraints.height },
          },
          audio: true,
        })

        mediaStreamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setCameraActive(true)
      } catch {
        setCameraActive(false)
      }
    }

    startCamera()

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [isSeller, isLive, facingMode])

  // ═══ VIEWER: Fetch seller name ═══
  useEffect(() => {
    if (isSeller || !stream) return

    const fetchSellerProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', stream.seller_id)
        .single()
      if (data) {
        setSellerName(data.display_name || data.username || '')
        setSellerAvatar(data.avatar_url || null)
      }
    }
    const fetchSellerData = async () => {
      const { data } = await supabase
        .from('sellers')
        .select('return_policy, shipping_delay_days')
        .eq('id', stream.seller_id)
        .single()
      if (data?.return_policy) {
        setSellerReturnPolicy(data.return_policy)
      }
      if (data?.shipping_delay_days != null) {
        setSellerShippingDelay(data.shipping_delay_days)
      }
    }
    fetchSellerProfile()
    fetchSellerData()

    // Fetch seller trust score
    const fetchSellerScore = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) return
      try {
        const res = await apiFetch(`/api/sellers/${stream.seller_id}/trust`, {
          headers: { Authorization: `Bearer ${s.access_token}` },
        })
        if (res.ok) {
          const trust = await res.json()
          // Compute score client-side from trust data
          const baseScores: Record<string, number> = { new: 8.0, standard: 8.5, trusted: 9.0, premium: 9.5 }
          let sc = baseScores[trust.trust_level] ?? 8.0
          const dr = (trust.positive_delivery_rate ?? 1.0)
          sc += (dr - 0.9) * 2
          const completed = trust.total_completed_orders || 1
          const lost = trust.disputes_lost || 0
          sc -= (lost / completed) * 5
          setSellerScore(Math.round(Math.max(0, Math.min(10, sc)) * 10) / 10)
        }
      } catch { /* ignore */ }
    }
    fetchSellerScore()

    // Check follow status
    const checkFollow = async () => {
      if (!user) return
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) return
      try {
        const res = await apiFetch(`/api/follow/${stream.seller_id}/status`, {
          headers: { Authorization: `Bearer ${s.access_token}` },
        })
        if (res.ok) {
          const d = await res.json()
          setIsFollowing(d.following)
        }
      } catch { /* ignore */ }
    }
    checkFollow()
  }, [isSeller, stream, user])

  // ═══ SELLER: Fetch own return policy ═══
  useEffect(() => {
    if (!isSeller || !stream) return
    const fetchOwnPolicy = async () => {
      const { data } = await supabase
        .from('sellers')
        .select('return_policy')
        .eq('id', stream.seller_id)
        .single()
      if (data?.return_policy) {
        setSellerReturnPolicy(data.return_policy)
      }
    }
    fetchOwnPolicy()
  }, [isSeller, stream])

  // Pulse the engagement button periodically to draw attention
  useEffect(() => {
    if (!isSeller || !isLive) return
    const interval = setInterval(() => {
      if (!isMountedRef.current) return
      setEngageBtnPulse(true)
      setTimeout(() => { if (isMountedRef.current) setEngageBtnPulse(false) }, 1200)
    }, 30000)
    // Initial pulse after 5s
    const initialTimeout = setTimeout(() => {
      if (!isMountedRef.current) return
      setEngageBtnPulse(true)
      setTimeout(() => { if (isMountedRef.current) setEngageBtnPulse(false) }, 1200)
    }, 5000)
    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [isSeller, isLive])

  // PiP (Picture-in-Picture) handler
  const handlePiP = useCallback(async () => {
    try {
      const videoEl = document.querySelector('video') as HTMLVideoElement | null
      if (!videoEl) return
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (videoEl.requestPictureInPicture) {
        await videoEl.requestPictureInPicture()
      }
    } catch {
      // PiP not supported or user denied
    }
  }, [])


  // Charger les donnees du stream
  const retryFetchStream = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('streams')
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url')
        .eq('id', id)
        .single()
      setStream(data as Stream | null)
    } catch (err) { console.error('Failed to fetch stream:', err) }
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!id) return

    retryFetchStream()

    const fetchActiveAuction = async () => {
      try {
        const { data } = await supabase
          .from('items')
          .select('*')
          .eq('stream_id', id)
          .eq('status', 'active')
          .single()
        setActiveAuction(data)
        if (data) {
          setBidAmount(String(data.current_price + 1))
        }
      } catch (err) { console.error('Failed to fetch active auction:', err) }
    }

    const fetchMessages = async () => {
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select('*, user_profile:profiles!user_id(display_name, avatar_url)')
          .eq('stream_id', id)
          .neq('type', 'reaction')
          .order('created_at', { ascending: true })
          .limit(100)
        setMessages(data || [])
      } catch (err) { console.error('Failed to fetch chat messages:', err) }
    }

    // Fetch item count for this stream
    const fetchItemCount = async () => {
      try {
        const { count } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', id)
        setItemCount(count || 0)
      } catch { /* ignore */ }
    }

    fetchActiveAuction()
    fetchMessages()
    fetchItemCount()
  }, [id, retryFetchStream])

  // Ecouter les mises a jour en temps reel
  useEffect(() => {
    if (!id) return

    const channel = supabase.channel(`stream-${id}`)

    // Nouveaux messages de chat
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `stream_id=eq.${id}`,
    }, async (payload) => {
      const newMsg = payload.new as ChatMessage
      // Skip reactions — they don't go in the chat list
      if (newMsg.type === 'reaction') return
      try {
        const { data: enriched } = await supabase
          .from('chat_messages')
          .select('*, user_profile:profiles!user_id(display_name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (enriched) {
          setMessages(prev => [...prev, enriched])
        }
      } catch (err) {
        console.error('Failed to enrich chat message:', err)
      }
    })

    // Mises a jour des encheres — use payload.new directly (REPLICA IDENTITY FULL)
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'items',
      filter: `stream_id=eq.${id}`,
    }, async (payload) => {
      const item = payload.new as Item
      if (!item?.id) return

      // Debug: log what Realtime sends
      console.log('[RT-ITEMS]', item.id.slice(0, 8), 'status=', item.status, 'winner=', item.winner_id?.slice(0, 8), 'price=', item.current_price, 'keys=', Object.keys(payload.new))

      // Sequence counter: discard stale async handlers
      const seq = ++itemEventSeqRef.current

      // If payload.new is missing status (REPLICA IDENTITY not FULL), re-fetch from DB
      if (!item.status) {
        const { data: fetched } = await supabase.from('items').select('*').eq('id', item.id).single()
        if (!fetched || itemEventSeqRef.current !== seq) return
        Object.assign(item, fetched)
        console.log('[RT-ITEMS] refetched status=', item.status)
      }

      if (item.status === 'active') {
        setActiveAuction(item)
        setBidAmount(String(item.current_price + 1))
      } else if (item.status === 'sold') {
        setActiveAuction(null)
        // Show sold animation
        let winnerName = ''
        if (item.winner_id) {
          const { data: wp } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', item.winner_id)
            .single()
          if (itemEventSeqRef.current !== seq) return
          winnerName = wp?.display_name || wp?.username || ''
        }
        setSoldAnimation({ winner: winnerName, price: item.current_price })
        setTimeout(() => { if (isMountedRef.current) setSoldAnimation(null) }, 3000)
        // Show payment modal if current user is the winner
        if (userRef.current && item.winner_id === userRef.current.id) {
          setPaymentItem(item)
          // Show modal immediately with loading state while order is being created
          setShowPaymentModal(true)
          // Fetch the order with retry (seller may still be creating it)
          const initPayment = async () => {
            // Fix #6: Null check for session
            const { data: session, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !session.session) {
              console.error('Failed to get auth session:', sessionError || 'session is null')
              setPaymentError('Authentication error. Please log in again.')
              return
            }
            const token = session.session.access_token
            if (!token) {
              console.error('No access token in session')
              setPaymentError('Authentication error. Please log in again.')
              return
            }

            // Poll for the order (retry up to 15 times, 1.5s apart)
            let order: Order | null = null
            for (let attempt = 0; attempt < 15; attempt++) {
              await new Promise(r => setTimeout(r, 1500))
              try {
                const { data } = await supabase
                  .from('orders')
                  .select('*')
                  .eq('item_id', item.id)
                  .eq('buyer_id', user!.id)
                  .single()
                if (data) {
                  order = data as Order
                  break
                }
              } catch (err) {
                console.error(`Order polling attempt ${attempt + 1}/15 failed:`, err)
                // Continue to next attempt
              }
            }

            if (!order) {
              console.error('Order not found after 15 retries')
              setPaymentError(ct.orderNotFound)
              return
            }
            setPaymentOrder(order)

            // Pre-fill address from saved addresses
            const { data: savedAddr } = await supabase
              .from('addresses')
              .select('*')
              .eq('user_id', user!.id)
              .eq('is_default', true)
              .single()
            if (savedAddr) {
              setAddressForm({
                name: savedAddr.name || '',
                street: savedAddr.street || '',
                city: savedAddr.city || '',
                zip: savedAddr.zip || '',
                phone: savedAddr.phone || '',
              })
            }

            // Set carrier on the order before payment (for shipping cost calculation)
            await apiFetch(`/api/orders/${order.id}/carrier`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ carrier: selectedCarrier }),
            }).catch(() => { /* non-blocking */ })

            // Create PaymentIntent via server
            const resp = await apiFetch('/api/stripe/create-payment-intent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ order_id: order.id }),
            })
            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}))
              if (import.meta.env.DEV) console.error('PaymentIntent error:', err)
              setPaymentError(err.error || 'Failed to initialize payment. Please try again.')
              return
            }
            const piData = await resp.json()
            if (piData.auto_charged) {
              // Card was charged automatically — show success directly
              setPaymentSuccess(true)
            } else if (piData.client_secret) {
              setClientSecret(piData.client_secret)
            }
          }
          initPayment()
        }
      } else if (item.status === 'unsold') {
        setActiveAuction(null)
        // Show unsold animation
        setSoldAnimation({ winner: '', price: item.current_price, isUnsold: true })
        setTimeout(() => { if (isMountedRef.current) setSoldAnimation(null) }, 3000)
      }
    })

    // Mises a jour du stream
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'streams',
      filter: `id=eq.${id}`,
    }, (payload) => {
      setStream(payload.new as Stream)
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Giveaway: fetch active giveaway + realtime
  useEffect(() => {
    if (!id) return

    // Fetch active giveaway
    const fetchGiveaway = async () => {
      try {
        const resp = await apiFetch(`/api/streams/${id}/giveaway`)
        const data = await resp.json()
        if (data) {
          setActiveGiveaway(data)
          if (data.status === 'drawn' && data.winner_name) {
            setGiveawayWinner({ name: data.winner_name })
            setTimeout(() => setGiveawayWinner(null), 5000)
          }
        }
      } catch { /* ignore */ }
    }
    fetchGiveaway()

    // Check if user has already entered
    const checkEntry = async () => {
      if (!user) return
      try {
        const resp = await apiFetch(`/api/streams/${id}/giveaway`)
        const gw = await resp.json()
        if (gw && gw.id) {
          const { data: entry } = await supabase
            .from('giveaway_entries')
            .select('id')
            .eq('giveaway_id', gw.id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (entry) setHasEnteredGiveaway(true)
        }
      } catch { /* ignore */ }
    }
    checkEntry()

    // Realtime: listen for giveaway changes on this stream
    const gwChannel = supabase
      .channel(`giveaway-stream-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'giveaways',
        filter: `stream_id=eq.${id}`,
      }, (payload) => {
        const gw = payload.new as Giveaway
        setActiveGiveaway(gw)
        if (gw.status === 'drawn' && gw.winner_name) {
          setGiveawayWinner({ name: gw.winner_name })
          setTimeout(() => setGiveawayWinner(null), 5000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(gwChannel) }
  }, [id, user])

  // Giveaway: listen for entry count updates
  useEffect(() => {
    if (!activeGiveaway || activeGiveaway.status !== 'active') return

    const entryChannel = supabase
      .channel(`giveaway-entries-viewer-${activeGiveaway.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'giveaway_entries',
        filter: `giveaway_id=eq.${activeGiveaway.id}`,
      }, () => {
        setActiveGiveaway(prev => prev ? { ...prev, entry_count: prev.entry_count + 1 } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(entryChannel) }
  }, [activeGiveaway?.id, activeGiveaway?.status])

  const handleEnterGiveaway = async () => {
    if (!activeGiveaway || !user || hasEnteredGiveaway || enteringGiveaway) return
    setEnteringGiveaway(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch(`/api/giveaways/${activeGiveaway.id}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (resp.ok || resp.status === 409) {
        setHasEnteredGiveaway(true)
        hapticTap()
      }
    } catch { /* ignore */ }
    setEnteringGiveaway(false)
  }

  // Timer pour l'enchere
  useEffect(() => {
    // Clear any existing interval before creating a new one
    if (auctionTimerRef.current) {
      clearInterval(auctionTimerRef.current)
      auctionTimerRef.current = null
    }

    if (!activeAuction?.started_at) return

    auctionTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - new Date(activeAuction.started_at!).getTime()) / 1000
      const remaining = Math.max(0, activeAuction.duration_seconds - elapsed)
      setTimeLeft(Math.ceil(remaining))

      if (remaining <= 0) {
        if (auctionTimerRef.current) {
          clearInterval(auctionTimerRef.current)
          auctionTimerRef.current = null
        }
      }
    }, 1000)

    return () => {
      if (auctionTimerRef.current) {
        clearInterval(auctionTimerRef.current)
        auctionTimerRef.current = null
      }
    }
  }, [activeAuction])

  // Auto-scroll du chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ stream_id: id, message: newMessage.trim() }),
      })
      const result = await resp.json().catch(() => ({}))
      setNewMessage('')
      if (result.warning === 'contact_blocked') {
        alert(lang === 'fr'
          ? 'Partager des coordonnees personnelles est interdit sur Shapop. Les recidives entrainent une suspension de compte.'
          : 'Sharing personal contact information is forbidden on Shapop. Repeated violations will result in account suspension.')
      }
    } catch (err) {
      console.error('Failed to send chat message:', err)
    }
  }

  // Open card setup modal
  const openCardSetup = async () => {
    setCardError(null)
    setCardSuccess(false)
    setCardLoading(false)
    setSetupClientSecret(null)
    setShowCardModal(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setCardError(err.error || 'Failed to initialize card setup')
        return
      }
      const data = await resp.json()
      if (data.client_secret) {
        setSetupClientSecret(data.client_secret)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Setup intent error:', err)
      setCardError('Failed to initialize card setup')
    }
  }

  const handlePlaceBid = async () => {
    if (!activeAuction || !user) return
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= activeAuction.current_price) return

    // Check if user has a card on file (null = not checked yet, treat as no card)
    if (hasCard !== true) {
      openCardSetup()
      return
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch(`/api/items/${activeAuction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        // Server returns 'card_required' if no card on file
        if (err.error === 'card_required') {
          setHasCard(false)
          openCardSetup()
          return
        }
        throw new Error(err.error || ct.bidError)
      }
      // Update local bid amount for next bid
      setBidAmount(String(amount + 1))
      if (id) track('bid_placed', { stream_id: id, amount })
      // Haptic feedback on successful bid
      const appS = getAppSettings()
      if (!appS || appS.auctionHaptics !== false) hapticTap()
    } catch (err) {
      console.error('Failed to place bid:', err)
      alert('Failed to place bid. Please try again.')
    }
  }

  const handleViewerReaction = useCallback(() => {
    setReactionCount(prev => prev + 1)
  }, [])

  const sendReactionToServer = useCallback(async (emoji: string) => {
    if (!user || !id) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      await apiFetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stream_id: id, message: emoji, type: 'reaction' }),
      })
    } catch {
      // silently ignore reaction send failures
    }
  }, [user, id])

  // ═══ SELLER CAMERA CONTROLS ═══
  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)

    // Stop old tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
    }

    try {
      const qualityConstraints = getStreamQualityConstraints()
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: qualityConstraints.width },
          height: { ideal: qualityConstraints.height },
        },
        audio: true,
      })
      mediaStreamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch {
      // Camera flip failed
    }
  }

  const handleToggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const handleEndStream = async () => {
    // Stop camera tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    // Update stream status to 'ended'
    if (id) {
      await supabase
        .from('streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    setShowEndConfirm(false)
    navigate(`/live-recap/${id}`)
  }

  const handleConfirmAddress = async () => {
    if (!user) return
    // Always move to payment step — save address in background
    setAddressStep(false)

    // Try API server first, then direct Supabase fallback
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (paymentOrder && token) {
        const resp = await apiFetch(`/api/orders/${paymentOrder.id}/address`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(addressForm),
        })
        if (resp.ok) return // success
        console.warn('API address save failed, trying direct Supabase')
      }

      // Fallback: save directly via Supabase
      const addr = { ...addressForm }
      const { data: existing } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (existing) {
        await supabase.from('addresses').update({
          name: addr.name, street: addr.street, city: addr.city, zip: addr.zip, phone: addr.phone,
        }).eq('id', existing.id)
      } else {
        await supabase.from('addresses').insert({
          user_id: user.id, name: addr.name, street: addr.street, city: addr.city, zip: addr.zip, phone: addr.phone, is_default: true,
        })
      }

      if (paymentOrder) {
        await supabase.from('orders').update({
          shipping_address: { name: addr.name, street: addr.street, city: addr.city, zip: addr.zip, phone: addr.phone },
        }).eq('id', paymentOrder.id)
      }
    } catch (err) {
      console.error('Address save error (non-blocking):', err)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // Confirm with our server (server checks directly with Stripe API)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (token && paymentOrder) {
        await apiFetch('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_id: paymentOrder.id,
            payment_intent_id: paymentIntentId,
          }),
        })
      }
    } catch (err) {
      // Even if server confirm fails, Stripe already processed the payment
      if (import.meta.env.DEV) console.error('Server payment confirmation failed (Stripe already processed):', err)
    }
    setPaymentSuccess(true)
    setPaymentLoading(false)
  }

  const handleClosePayment = () => {
    setShowPaymentModal(false)
    setPaymentOrder(null)
    setPaymentItem(null)
    setClientSecret(null)
    setPaymentSuccess(false)
    setPaymentError(null)
    setPaymentLoading(false)
    setAddressStep(true)
  }

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <div
          role="status"
          aria-label="Loading stream"
          style={{
            width: '32px', height: '32px',
            border: '3px solid #333', borderTopColor: '#F0908A',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!stream) {
    const retryLabel: Record<string, string> = { fr: 'Reessayer', en: 'Retry', he: '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1', es: 'Reintentar' }
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: '20px' }}>
        <p style={{ fontSize: '18px', color: '#666' }}>{ct.streamNotFound}</p>
        <button
          onClick={retryFetchStream}
          style={{
            marginTop: '16px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#E8344E', fontSize: '14px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {retryLabel[lang] || retryLabel.fr}
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '8px', padding: '12px 24px', borderRadius: '100px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {ct.close}
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      {/* Fullscreen video container */}
      <div style={{ position: 'absolute', inset: 0 }}>

            {/* ═══ SELLER VIEW: Live camera ═══ */}
            {isSeller && isLive && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            )}

            {/* ═══ VIEWER VIEW: LiveKit WebRTC player, Mux fallback, or animated fallback ═══ */}
            {!isSeller && isLive && (
              <div style={{
                width: '100%', height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {viewerLkUrl && viewerLkToken ? (
                  <>
                    {/* LiveKit WebRTC Player (sub-300ms latency) */}
                    <LiveKitViewer
                      livekitUrl={viewerLkUrl}
                      livekitToken={viewerLkToken}
                      muted={viewerMuted}
                      style={{ width: '100%', height: '100%' }}
                    />
                    {/* Unmute button */}
                    {viewerMuted && (
                      <button
                        onClick={() => setViewerMuted(false)}
                        aria-label={ct.unmuteViewer}
                        style={{
                          position: 'absolute',
                          bottom: '16px', left: '16px',
                          padding: '8px 16px',
                          borderRadius: '100px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          zIndex: 15,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {ct.unmuteViewer}
                      </button>
                    )}
                  </>
                ) : (
                  /* Fallback: thumbnail or animated placeholder */
                  <>
                    {stream.thumbnail_url ? (
                      <img
                        src={stream.thumbnail_url}
                        alt=""
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          filter: 'blur(20px) brightness(0.4)',
                          transform: 'scale(1.1)',
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, #1a0a0e 0%, #000 70%)',
                      }} />
                    )}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 30% 50%, rgba(240,144,138,0.08) 0%, transparent 50%)',
                      animation: 'viewerGlow 4s ease-in-out infinite alternate',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: '16px', zIndex: 5,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 20px', borderRadius: '100px',
                        background: 'rgba(232,52,78,0.2)',
                        border: '1px solid rgba(232,52,78,0.4)',
                        animation: 'livePulse 2s ease-in-out infinite',
                      }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          backgroundColor: '#E8344E',
                          animation: 'liveDot 1.5s ease-in-out infinite',
                          boxShadow: '0 0 12px rgba(232,52,78,0.8)',
                        }} />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#E8344E', letterSpacing: '2px' }}>
                          {ct.liveNow}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '40px', padding: '0 12px' }}>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '3px', borderRadius: '2px',
                              backgroundColor: '#F0908A',
                              opacity: 0.5 + Math.random() * 0.5,
                              animation: `waveBar ${0.6 + Math.random() * 0.8}s ease-in-out ${i * 0.08}s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, margin: 0 }}>
                          {ct.connectedTo} <span style={{ color: '#F0908A', fontWeight: 700 }}>{sellerName}</span>
                        {sellerScore != null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px',
                            backgroundColor: 'rgba(240,144,138,0.15)', padding: '2px 6px', borderRadius: '6px',
                            fontSize: '12px', fontWeight: 700, color: '#F0908A',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#F0908A" stroke="none">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {sellerScore.toFixed(1)}
                          </span>
                        )}
                        </p>
                        {user && stream && user.id !== stream.seller_id && (
                          <button
                            onClick={async () => {
                              const { data: { session: s } } = await supabase.auth.getSession()
                              if (!s || !stream) return
                              try {
                                if (isFollowing) {
                                  const res = await apiFetch(`/api/follow/${stream.seller_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.access_token}` } })
                                  if (res.ok) setIsFollowing(false)
                                } else {
                                  const res = await apiFetch(`/api/follow/${stream.seller_id}`, { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}` } })
                                  if (res.ok) setIsFollowing(true)
                                }
                              } catch { /* ignore */ }
                            }}
                            style={{
                              padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                              border: isFollowing ? '1px solid #333' : 'none',
                              background: isFollowing ? 'transparent' : 'rgba(240,144,138,0.2)',
                              color: isFollowing ? '#666' : '#F0908A',
                              cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            {isFollowing ? '\u2713' : '+'}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Viewer count now in top bar */}
              </div>
            )}

            {/* ═══ NON-LIVE states (scheduled / ended) ═══ */}
            {(!isLive) && (
              <div style={{ width: '100%', height: '100%' }}>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  {/* Back button */}
                  <button
                    onClick={() => navigate(-1)}
                    style={{
                      position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: '16px',
                      zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none',
                      borderRadius: '50%', width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div className="text-center text-white">
                    <p className="text-5xl mb-4">{'\u{1F4FA}'}</p>
                    <p className="text-xl font-semibold">
                      {stream.status === 'scheduled' ? ct.liveStartsSoon : ct.liveEnded}
                    </p>
                    <button
                      onClick={() => navigate(-1)}
                      style={{
                        marginTop: '24px', padding: '12px 32px', borderRadius: '100px',
                        background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                        border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {ct.close}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ LIVE badge + viewer count (always shown when live) ═══ */}
            {stream.status === 'live' && isSeller && (
              <div className="absolute top-4 left-4 flex items-center gap-2" style={{ zIndex: 20 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #E8344E, #FF6B6B)',
                  padding: '5px 14px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 800, color: '#fff',
                  letterSpacing: '1px',
                  boxShadow: '0 2px 12px rgba(232,52,78,0.5)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: '#fff',
                    animation: 'liveDot 1.5s ease-in-out infinite',
                  }} />
                  {ct.liveNow}
                </span>
                <span style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '5px 12px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 600, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  {stream.viewer_count} {ct.viewers}
                </span>
              </div>
            )}

            {/* Viewer: top bar with back button + seller info + viewer count */}
            {!isSeller && (
              <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
                left: '8px', right: '8px',
                zIndex: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '6px',
              }}>
                {/* Left: back + seller pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => navigate(-1)}
                    aria-label="Back"
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <SellerProfileHeader
                    sellerId={stream.seller_id}
                    sellerName={sellerName}
                    sellerAvatar={sellerAvatar}
                    sellerScore={sellerScore}
                    shippingDelay={sellerShippingDelay}
                    isFollowing={isFollowing}
                    onFollowToggle={async () => {
                      const { data: { session: s } } = await supabase.auth.getSession()
                      if (!s || !stream) return
                      try {
                        if (isFollowing) {
                          const res = await apiFetch(`/api/follow/${stream.seller_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${s.access_token}` } })
                          if (res.ok) setIsFollowing(false)
                        } else {
                          const res = await apiFetch(`/api/follow/${stream.seller_id}`, { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}` } })
                          if (res.ok) setIsFollowing(true)
                        }
                      } catch { /* ignore */ }
                    }}
                    lang={lang}
                  />
                </div>
                {/* Right: viewer count + PiP */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    aria-live="polite"
                    aria-label={`${stream.viewer_count || 0} ${ct.viewers}`}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      padding: '4px 10px', borderRadius: '100px',
                      fontSize: '12px', fontWeight: 700, color: '#fff',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: '#E8344E',
                      animation: 'liveDot 1.5s ease-in-out infinite',
                      boxShadow: '0 0 4px rgba(232,52,78,0.8)',
                    }} />
                    {stream.viewer_count || 0}
                  </span>
                  {stream.status === 'live' && (
                    <button
                      onClick={handlePiP}
                      aria-label={ct.morePiP}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <rect x="12" y="9" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══ GIVEAWAY BANNER (viewer) ═══ */}
            {!isSeller && activeGiveaway && activeGiveaway.status === 'active' && (
              hasEnteredGiveaway ? (
                /* Collapsed pill after entry */
                <div style={{
                  position: 'absolute',
                  top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 25,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,215,0,0.35)',
                    borderRadius: '100px',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ fontSize: '14px' }}>🎁</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFD700' }}>{ct.giftEntered}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                      · {activeGiveaway.entry_count} 👥
                    </span>
                  </div>
                </div>
              ) : (
                /* Full card before entry */
                <div style={{
                  position: 'absolute',
                  top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
                  left: '8px', right: '8px',
                  zIndex: 25,
                  animation: 'giftCardIn 0.4s ease',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    padding: '16px 18px 14px',
                    background: 'linear-gradient(135deg, rgba(30,20,0,0.92), rgba(10,10,12,0.95))',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255,215,0,0.6)',
                    borderRadius: '18px',
                    boxShadow: '0 4px 24px rgba(255,215,0,0.15), 0 0 0 1px rgba(255,215,0,0.1)',
                    animation: 'giftBadgePulse 2s ease-in-out infinite',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <span style={{ fontSize: '36px', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>🎁</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '18px', fontWeight: 900, color: '#FFD700', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                          {ct.giftTitle}
                        </p>
                        <p style={{ fontSize: '14px', color: '#fff', margin: '3px 0 0', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                          {activeGiveaway.prize_description}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '6px 16px',
                      backgroundColor: 'rgba(255,215,0,0.12)',
                      borderRadius: '100px',
                      border: '1px solid rgba(255,215,0,0.2)',
                    }}>
                      <span style={{ fontSize: '20px' }}>👥</span>
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700' }}>
                        {activeGiveaway.entry_count}
                      </span>
                      <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 600 }}>
                        {ct.giftParticipants}
                      </span>
                    </div>

                    {user && (
                      <button
                        onClick={handleEnterGiveaway}
                        disabled={enteringGiveaway}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                          border: 'none',
                          borderRadius: '100px',
                          color: '#000',
                          fontSize: '16px', fontWeight: 900,
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          boxShadow: '0 2px 12px rgba(255,165,0,0.4)',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {enteringGiveaway ? '...' : ct.giftEnter}
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ═══ SELLER: Camera Controls Overlay ═══ */}
            {isSeller && isLive && cameraActive && (
              <div style={{
                position: 'absolute',
                bottom: '16px', left: '16px', right: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px',
                zIndex: 30,
              }}>
                {/* Flip camera */}
                <button
                  onClick={handleFlipCamera}
                  title={ct.flipCamera}
                  aria-label={ct.flipCamera}
                  style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 8V4a2 2 0 012-2h12a2 2 0 012 2v4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 12 12 8 8 12" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 12 12 16 8 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Mute/unmute */}
                <button
                  onClick={handleToggleMute}
                  title={isMuted ? ct.unmute : ct.mute}
                  aria-label={isMuted ? ct.unmute : ct.mute}
                  style={{
                    width: '48px', height: '48px',
                    borderRadius: '50%',
                    backgroundColor: isMuted ? 'rgba(232,52,78,0.6)' : 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: isMuted ? '1px solid rgba(232,52,78,0.5)' : '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isMuted ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.34 2.18" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* End stream */}
                <button
                  onClick={() => setShowEndConfirm(true)}
                  style={{
                    height: '48px',
                    padding: '0 24px',
                    borderRadius: '100px',
                    background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(232,52,78,0.4)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                    {ct.endStream}
                  </span>
                </button>
              </div>
            )}

            {/* ═══ End Stream Confirmation Modal ═══ */}
            {showEndConfirm && (
              <div
                role="dialog"
                aria-label={ct.endStreamConfirm}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'fixed', inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '20px', zIndex: 300,
                  padding: '24px',
                }}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(232,52,78,0.2), rgba(220,38,38,0.1))',
                  border: '1px solid rgba(232,52,78,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                </div>
                <p style={{
                  fontSize: '18px', fontWeight: 700, color: '#fff',
                  textAlign: 'center',
                }}>
                  {ct.endStreamConfirm}
                </p>
                <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    style={{
                      flex: 1, padding: '14px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.endStreamNo}
                  </button>
                  <button
                    onClick={handleEndStream}
                    style={{
                      flex: 1, padding: '14px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                      border: 'none',
                      color: '#fff', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(232,52,78,0.4)',
                    }}
                  >
                    {ct.endStreamYes}
                  </button>
                </div>
              </div>
            )}

            {/* ── Seller: Engagement Dashboard Toggle Button ── */}
            {isSeller && isLive && (
              <button
                onClick={() => setShowEngagement(!showEngagement)}
                aria-label="Toggle engagement dashboard"
                aria-expanded={showEngagement}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: showEngagement ? '#F0908A' : 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: showEngagement ? '2px solid #F0908A' : '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  zIndex: 60,
                  transform: engageBtnPulse ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: engageBtnPulse
                    ? '0 0 20px rgba(240,144,138,0.5)'
                    : showEngagement
                      ? '0 4px 16px rgba(240,144,138,0.3)'
                      : 'none',
                }}
              >
                {'\u{1F4CA}'}
              </button>
            )}

            {/* ── Seller: Engagement Dashboard Overlay ── */}
            {isSeller && isLive && (
              <EngagementDashboard
                streamId={id || ''}
                isVisible={showEngagement}
                onClose={() => setShowEngagement(false)}
              />
            )}

            {/* Viewer reactions moved to bottom overlay */}
          </div>

      {/* ═══ StreamSidebar (viewer only, right side) ═══ */}
      {!isSeller && isLive && (
        <div style={{
          position: 'absolute',
          right: '8px',
          bottom: '50%',
          transform: 'translateY(50%)',
          zIndex: 30,
          pointerEvents: 'auto',
        }}>
          <StreamSidebar
            streamId={stream.id}
            onShare={async () => {
              hapticTap()
              const shareUrl = `https://shapop.com/stream/${stream.id}`
              const sellerDisplayName = sellerName || 'ShaPop'
              const shareTitle = `${sellerDisplayName} est en live sur ShaPop !`
              const shareText = `Rejoins le live de ${sellerDisplayName} sur ShaPop\n${shareUrl}`
              try {
                await Share.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl,
                  dialogTitle: shareTitle,
                })
              } catch {
                // Fallback for web
                try {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl)
                    showToast(ct.linkCopied)
                  }
                } catch { /* ignore */ }
              }
            }}
            onClipClick={async () => {
              hapticTap()
              try {
                const videoEl = document.querySelector('video') as HTMLVideoElement | null
                if (!videoEl || !videoEl.videoWidth) { showToast('Clip failed'); return }
                const canvas = document.createElement('canvas')
                canvas.width = videoEl.videoWidth
                canvas.height = videoEl.videoHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) return
                ctx.drawImage(videoEl, 0, 0)
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
                if (!blob) return
                const file = new File([blob], `shapop-clip-${Date.now()}.jpg`, { type: 'image/jpeg' })
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  await navigator.share({ files: [file], title: stream?.title || 'ShaPop Clip' })
                } else {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = file.name; a.click()
                  URL.revokeObjectURL(url)
                }
                showToast(ct.linkCopied)
              } catch { /* cancelled */ }
            }}
            onShopClick={() => {
              hapticTap()
              if (stream?.seller_id) {
                navigate(`/seller/${stream.seller_id}`)
              }
            }}
            onLikeClick={() => {
              hapticTap()
            }}
            onWalletClick={() => setShowWallet(true)}
            onMoreClick={() => setShowMoreMenu(true)}
            lang={lang}
          />
        </div>
      )}

      {/* ═══ BOTTOM GRADIENT ═══ */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.5) 60%, transparent)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* ═══ BOTTOM OVERLAY: stream info + auction + chat + input ═══ */}
      <div style={{
        position: 'absolute',
        bottom: activeAuction && !isSeller && isLive
          ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
        left: '10px', right: '10px',
        zIndex: 15,
        display: 'flex', flexDirection: 'column', gap: '6px',
        transition: 'bottom 0.3s ease',
      }}>
        {/* Chat messages — last 5, WhatNot style: transparent, float up */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '75%' }}>
          {messages.slice(-5).map((msg, i, arr) => {
            const isJoin = msg.message === '__system:join__'
            const joinText: Record<string, string> = { fr: 'a rejoint', en: 'joined', he: '\u05D4\u05E6\u05D8\u05E8\u05E3', es: 'se unio' }
            // Older messages fade out
            const opacity = i < arr.length - 3 ? 0.5 : i < arr.length - 1 ? 0.75 : 1
            if (isJoin) {
              return (
                <div key={msg.id} style={{
                  padding: '2px 0',
                  opacity,
                  animation: 'chatMsgIn 0.3s ease',
                }}>
                  <span style={{
                    fontSize: '12px', color: '#fff', fontWeight: 500,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>
                    {msg.user_profile?.display_name || ct.anonymous} {joinText[lang] || joinText.fr} {'\uD83D\uDC4B'}
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.id} style={{
                padding: '3px 0',
                opacity,
                animation: 'chatMsgIn 0.3s ease',
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 800, color: '#F0908A',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  marginRight: '6px',
                }}>
                  {msg.user_profile?.display_name || ct.anonymous}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: msg.is_flagged ? 'rgba(255,255,255,0.4)' : '#fff',
                  fontStyle: msg.is_flagged ? 'italic' : 'normal',
                  fontWeight: 500,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  wordBreak: 'break-word',
                }}>
                  {msg.is_flagged ? ct.messageFlagged : msg.message}
                </span>
              </div>
            )
          })}
        </div>

        {/* Chat input */}
        {user ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={ct.sendMessage}
              aria-label={ct.sendMessage}
              style={{
                flex: 1, padding: '10px 14px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '100px',
                color: '#fff', fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: '10px 16px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                border: 'none', color: '#fff',
                fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.send}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: '#666', margin: 0, textAlign: 'center' }}>{ct.loginToChat}</p>
        )}

        {/* Viewer reaction buttons — show when live OR when LiveKit viewer is connected */}
        {!isSeller && (isLive || viewerLkToken) && user && (
          <ViewerReactions onReaction={handleViewerReaction} sendReaction={sendReactionToServer} />
        )}

        {/* Active auction + bid — seller sees original panel, viewer sees ActiveItemBar */}
        {activeAuction && isSeller && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: '14px',
            border: '1px solid rgba(240,144,138,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                {activeAuction.image_urls?.[0] && (
                  <img
                    src={activeAuction.image_urls[0]}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeAuction.title}</h3>
              </div>
              <div
                aria-live="polite"
                aria-label={`Time left: ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
                style={{
                  fontSize: '20px', fontWeight: 800,
                  color: timeLeft <= 10 ? '#E8344E' : '#F0908A',
                  animation: timeLeft <= 10 ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>{ct.currentPrice}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                  {activeAuction.current_price.toLocaleString()} EUR
                </p>
              </div>
            </div>
          </div>
        )}
        {activeAuction && !isSeller && isLive && (
          <div id="active-item-bar">
            <ActiveItemBar
              item={activeAuction}
              bidAmount={bidAmount}
              onBidAmountChange={setBidAmount}
              onBid={handlePlaceBid}
              hasCard={hasCard}
              onAddCard={openCardSetup}
              disabled={timeLeft <= 0}
              lang={lang}
              selectedCarrier={selectedCarrier}
              onCarrierChange={setSelectedCarrier}
              buyerCountry={profile?.country}
              buyerZip={buyerSavedZip}
            />
          </div>
        )}

        {/* Waiting for next item (viewer, no active auction, live is on) */}
        {!activeAuction && !isSeller && isLive && !soldAnimation && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'rgba(18,18,20,0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 16px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#F0908A',
              animation: 'waitingPulse 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.3px',
            }}>
              {ct.waitingNextItem}
            </span>
          </div>
        )}

        {/* Stream title */}
        <div style={{
          padding: '6px 10px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stream.title}
          </p>
        </div>
      </div>

      {/* SOLD / UNSOLD animation overlay */}
      {soldAnimation && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 200,
          pointerEvents: 'none',
          animation: 'soldFadeIn 0.3s ease',
        }}>
          <p style={{
            fontSize: '48px', fontWeight: 900,
            color: soldAnimation.isUnsold ? '#FF9632' : '#22C55E',
            textShadow: soldAnimation.isUnsold
              ? '0 0 40px rgba(255,150,50,0.6)'
              : '0 0 40px rgba(34,197,94,0.6)',
            animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            margin: 0,
          }}>
            {soldAnimation.isUnsold ? ct.unsoldBang : ct.soldBang}
          </p>
          {!soldAnimation.isUnsold && soldAnimation.winner && (
            <p style={{
              fontSize: '18px', fontWeight: 700, color: '#fff', margin: '8px 0 0',
              animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s both',
            }}>
              @{soldAnimation.winner} — {soldAnimation.price} €
            </p>
          )}
          {soldAnimation.isUnsold && soldAnimation.price > 0 && (
            <p style={{
              fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0',
              animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s both',
            }}>
              {soldAnimation.price} €
            </p>
          )}
        </div>
      )}

      {/* Payment & address modal */}
      {showPaymentModal && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 300,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{
            backgroundColor: '#111',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            {/* Success state */}
            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                  border: '2px solid rgba(34,197,94,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#22C55E', margin: '0 0 8px' }}>
                  {ct.paymentSuccess}
                </h3>
                <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px' }}>
                  {ct.paymentSuccessDesc}
                </p>
                <button
                  onClick={handleClosePayment}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.close}
                </button>
              </div>
            ) : !paymentOrder && !paymentError ? (
              /* Order is being created — show loading state */
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '40px', height: '40px', margin: '0 auto 20px',
                  border: '3px solid #333', borderTopColor: '#F0908A',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                  {ct.youWon}
                </h3>
                <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                  {ct.creatingOrder}
                </p>
              </div>
            ) : paymentError ? (
              /* Error state — shown only after retries exhausted */
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{
                  padding: '12px 16px', marginBottom: '20px',
                  backgroundColor: 'rgba(232,52,78,0.1)',
                  border: '1px solid rgba(232,52,78,0.3)',
                  borderRadius: '12px',
                }}>
                  <p style={{ fontSize: '14px', color: '#E8344E', margin: 0 }}>{paymentError}</p>
                </div>
                <button
                  onClick={handleClosePayment}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.close}
                </button>
              </div>
            ) : addressStep ? (
              /* Step 1: Address */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                    border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {ct.youWon}
                    </h3>
                    {paymentItem && (
                      <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                        {paymentItem.title} — <span style={{ color: '#22C55E', fontWeight: 700 }}>{paymentOrder?.amount} €</span>
                        {paymentOrder?.shipping_cost != null && paymentOrder.shipping_cost > 0 && (
                          <span style={{ color: '#F0908A' }}> + {ct.shipping}: {paymentOrder.shipping_cost.toFixed(2)} €</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ccc', margin: '0 0 12px' }}>
                  {ct.confirmAddress}
                </h4>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={e => setAddressForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={ct.fullName}
                  aria-label={ct.fullName}
                  aria-required="true"
                  style={{
                    width: '100%', padding: '12px 14px',
                    backgroundColor: '#0D0D0D', border: '1px solid #222',
                    borderRadius: '10px', color: '#fff', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box', marginBottom: '10px',
                  }}
                />
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={e => setAddressForm(f => ({ ...f, street: e.target.value }))}
                  placeholder={ct.addressPlaceholder}
                  aria-label={ct.addressPlaceholder}
                  aria-required="true"
                  style={{
                    width: '100%', padding: '12px 14px',
                    backgroundColor: '#0D0D0D', border: '1px solid #222',
                    borderRadius: '10px', color: '#fff', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box', marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))}
                    placeholder={ct.cityPlaceholder}
                    aria-label={ct.cityPlaceholder}
                    aria-required="true"
                    style={{
                      width: '100%', padding: '12px 14px',
                      backgroundColor: '#0D0D0D', border: '1px solid #222',
                      borderRadius: '10px', color: '#fff', fontSize: '15px',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    value={addressForm.zip}
                    onChange={e => setAddressForm(f => ({ ...f, zip: e.target.value }))}
                    placeholder={ct.zipPlaceholder}
                    aria-label={ct.zipPlaceholder}
                    aria-required="true"
                    style={{
                      width: '100%', padding: '12px 14px',
                      backgroundColor: '#0D0D0D', border: '1px solid #222',
                      borderRadius: '10px', color: '#fff', fontSize: '15px',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={addressForm.phone}
                  onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder={ct.phonePlaceholder}
                  aria-label={ct.phonePlaceholder}
                  style={{
                    width: '100%', padding: '12px 14px',
                    backgroundColor: '#0D0D0D', border: '1px solid #222',
                    borderRadius: '10px', color: '#fff', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box', marginBottom: '16px',
                  }}
                />
                <button
                  onClick={handleConfirmAddress}
                  disabled={!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.zip}
                  style={{
                    width: '100%', padding: '16px',
                    background: (!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.zip)
                      ? '#333' : 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: (!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.zip)
                      ? 'not-allowed' : 'pointer',
                    opacity: (!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.zip)
                      ? 0.5 : 1,
                  }}
                >
                  {ct.confirm}
                </button>
              </>
            ) : (
              /* Step 2: Payment */
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                        {ct.payToClaim}
                      </h3>
                      {paymentItem && (
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{paymentItem.title}</p>
                      )}
                    </div>
                    <div style={{
                      padding: '8px 16px', borderRadius: '12px',
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: '#22C55E', margin: 0 }}>
                        {paymentOrder?.total_amount ?? paymentOrder?.amount} €
                      </p>
                    </div>
                  </div>
                  {/* Shipping cost breakdown */}
                  {paymentOrder && (paymentOrder.shipping_cost > 0 || paymentOrder.total_amount) && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{ct.itemPrice}</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{paymentOrder.amount} €</span>
                      </div>
                      {paymentOrder.shipping_cost > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>{ct.shipping}</span>
                          <span style={{ fontSize: '12px', color: '#F0908A', fontWeight: 600 }}>{paymentOrder.shipping_cost.toFixed(2)} €</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 700 }}>{ct.total}</span>
                        <span style={{ fontSize: '13px', color: '#22C55E', fontWeight: 700 }}>{paymentOrder.total_amount ?? paymentOrder.amount} €</span>
                      </div>
                    </div>
                  )}
                </div>

                {paymentError && (
                  <div style={{
                    padding: '10px 14px', marginBottom: '12px',
                    backgroundColor: 'rgba(232,52,78,0.1)',
                    border: '1px solid rgba(232,52,78,0.3)',
                    borderRadius: '10px',
                  }}>
                    <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{paymentError}</p>
                  </div>
                )}

                {clientSecret ? (
                  <Elements
                    stripe={getStripePromise()}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#F0908A',
                          colorBackground: '#0D0D0D',
                          colorText: '#fff',
                          borderRadius: '10px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                        },
                      },
                    }}
                  >
                    <PaymentFormInner
                      onSuccess={handlePaymentSuccess}
                      onError={(msg) => setPaymentError(msg)}
                      loading={paymentLoading}
                      setLoading={setPaymentLoading}
                      payNowLabel={ct.payNow}
                      paymentFailedLabel={ct.paymentFailed}
                    />
                  </Elements>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div style={{
                      width: '32px', height: '32px', margin: '0 auto',
                      border: '3px solid #333', borderTopColor: '#F0908A',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>
                )}

                <button
                  onClick={() => setAddressStep(true)}
                  style={{
                    width: '100%', marginTop: '12px', padding: '12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #333', borderRadius: '12px',
                    color: '#888', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← {ct.confirmAddress}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Card setup modal */}
      {showCardModal && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 300,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{
            backgroundColor: '#111',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            {cardSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                  border: '2px solid rgba(34,197,94,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#22C55E', margin: '0 0 8px' }}>
                  {ct.cardSaved}
                </h3>
                <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px' }}>
                  {ct.cardSavedDesc}
                </p>
                <button
                  onClick={() => { setShowCardModal(false); setCardSuccess(false) }}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.close}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(240,144,138,0.2), rgba(240,144,138,0.05))',
                    border: '1px solid rgba(240,144,138,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {ct.addCardTitle}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                      {ct.addCardDesc}
                    </p>
                  </div>
                </div>

                {cardError && (
                  <div style={{
                    padding: '10px 14px', marginBottom: '12px',
                    backgroundColor: 'rgba(232,52,78,0.1)',
                    border: '1px solid rgba(232,52,78,0.3)',
                    borderRadius: '10px',
                  }}>
                    <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{cardError}</p>
                  </div>
                )}

                {setupClientSecret ? (
                  <Elements stripe={getStripePromise()}>
                    <SetupCardFormInner
                      clientSecret={setupClientSecret}
                      onSuccess={() => {
                        setCardSuccess(true)
                        setHasCard(true)
                        setCardLoading(false)
                      }}
                      onError={(msg) => { setCardError(msg); setCardLoading(false) }}
                      loading={cardLoading}
                      setLoading={setCardLoading}
                      saveLabel={ct.saveCard}
                    />
                  </Elements>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div style={{
                      width: '32px', height: '32px', margin: '0 auto',
                      border: '3px solid #333', borderTopColor: '#F0908A',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>
                )}

                <button
                  onClick={() => { setShowCardModal(false); setCardError(null) }}
                  style={{
                    width: '100%', marginTop: '12px', padding: '12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #333', borderRadius: '12px',
                    color: '#888', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {ct.close}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ WALLET MODAL ═══ */}
      {showWallet && (
        <div
          onClick={() => setShowWallet(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '500px',
              padding: '24px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#333' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 20px', textAlign: 'center' }}>
              {ct.walletTitle}
            </h3>

            {/* Adresse de livraison */}
            <div
              onClick={() => navigate('/addresses')}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a1 1 0 01-1 1h-1"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>{ct.walletAddress}</p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {walletAddress ? `${walletAddress.street}, ${walletAddress.zip} ${walletAddress.city}` : ct.walletNoAddress}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Moyen de paiement */}
            <div
              onClick={() => navigate('/payments')}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>{ct.walletPayment}</p>
                <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
                  {walletCard ? `${(walletCard.brand || 'Card').toUpperCase()} **** ${walletCard.last4}` : ct.walletNoCard}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Code promo */}
            <div style={{ padding: '14px 0' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>{ct.walletPromo}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder={ct.walletPromoPlaceholder}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: '10px',
                    backgroundColor: '#0A0A0A', border: '1px solid #333',
                    color: '#fff', fontSize: '14px', outline: 'none',
                  }}
                />
                <button
                  onClick={() => {
                    if (promoCode.trim()) {
                      hapticTap()
                      // Store promo code for use during checkout
                      localStorage.setItem('shapop_promo_code', promoCode.trim())
                      setShowWallet(false)
                    }
                  }}
                  disabled={!promoCode.trim()}
                  style={{
                    padding: '12px 20px', borderRadius: '10px',
                    background: promoCode.trim() ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333',
                    border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: promoCode.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {ct.walletApply}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MORE MENU ═══ */}
      {showMoreMenu && (
        <div
          onClick={() => setShowMoreMenu(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '500px',
              padding: '16px 24px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#333' }} />
            </div>

            {/* PiP / Mini player */}
            <button
              onClick={() => { setShowMoreMenu(false); handlePiP() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0', borderBottom: '1px solid #1A1A1A',
                background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#1A1A1A',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <rect x="12" y="9" width="8" height="6" rx="1" fill="rgba(255,255,255,0.2)" />
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{ct.morePiP}</span>
            </button>

            {/* Report */}
            <button
              onClick={() => {
                setShowMoreMenu(false)
                if (stream) {
                  const subject = encodeURIComponent(`Signalement live ${stream.id}`)
                  window.open(`mailto:support@shapop.com?subject=${subject}`, '_blank')
                }
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0', borderBottom: '1px solid #1A1A1A',
                background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#1A1A1A',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{ct.moreReport}</span>
            </button>

            {/* Block */}
            <button
              onClick={() => {
                setShowMoreMenu(false)
                if (stream) {
                  const blocked = JSON.parse(localStorage.getItem('shapop_blocked_users') || '[]')
                  if (!blocked.includes(stream.seller_id)) {
                    blocked.push(stream.seller_id)
                    localStorage.setItem('shapop_blocked_users', JSON.stringify(blocked))
                  }
                  navigate(-1)
                }
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0',
                background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#E8344E' }}>{ct.moreBlock}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ GIVEAWAY WINNER OVERLAY ═══ */}
      {giveawayWinner && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 400, pointerEvents: 'none',
          animation: 'soldFadeIn 0.4s ease',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            <div style={{ fontSize: '52px', animation: 'giftSpinViewer 1s ease-out' }}>🎁</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '16px', color: 'rgba(255,215,0,0.6)',
            }}>
              ✦ ✦ ✦
            </div>
            <p style={{
              fontSize: '32px', fontWeight: 900, color: '#FFD700',
              textShadow: '0 2px 24px rgba(255,215,0,0.5)',
              margin: 0, textAlign: 'center',
            }}>
              {giveawayWinner.name}
            </p>
            <p style={{
              fontSize: '16px', fontWeight: 600, color: '#fff',
              opacity: 0.8, margin: 0,
            }}>
              {ct.giftWinner}
            </p>
            <div style={{
              display: 'flex', gap: '4px',
              fontSize: '22px',
              animation: 'giftStarsViewer 1.5s ease-in-out infinite',
            }}>
              ⭐ ✨ 🌟 ✨ ⭐
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST ═══ */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px',
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '100px',
          border: '1px solid rgba(255,255,255,0.15)',
          zIndex: 500,
          animation: 'toastIn 0.25s ease',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
            {toastMessage}
          </span>
        </div>
      )}

      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes viewerGlow {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
        @keyframes waveBar {
          0% { height: 6px; }
          100% { height: 30px; }
        }
        @keyframes soldFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes soldPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes giftBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(255,215,0,0); }
        }
        @keyframes giftCardIn {
          0% { transform: translateY(-8px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes giftSpinViewer {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes giftStarsViewer {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes waitingPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes chatMsgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

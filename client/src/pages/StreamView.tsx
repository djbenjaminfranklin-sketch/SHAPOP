import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLang, getLocale, tr, type Localized } from '../lib/i18n'
import { useAuth } from '../contexts/AuthContext'
import { rtlPos, rtlFlip } from '../lib/rtl'
import type { Stream, Item, ChatMessage, Order, Giveaway } from '../types/database'
import EngagementDashboard from '../components/seller/EngagementDashboard'
import ViewerReactions from '../components/stream/ViewerReactions'
import LiveKitViewer from '../components/stream/LiveKitViewer'
import SellerProfileHeader from '../components/stream/SellerProfileHeader'
import StreamSidebar from '../components/stream/StreamSidebar'
import ActiveItemBar from '../components/stream/ActiveItemBar'
import { PreviewCountdown, PreviewCardWall } from '../components/stream/PreviewGate'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'
import { getStreamQualityConstraints, isWatchLimitExceeded, getAppSettings } from '../lib/settings'
import { hapticTap } from '../lib/haptics'
import { Share } from '@capacitor/share'
import DeliveryChoice from '../components/checkout/DeliveryChoice'
import { getStripePromise, PaymentFormInner } from '../components/checkout/StripePayment'
import { formatSystemMessage } from '../lib/chatSystem'
import { formatMoney, currencyForCountry, displayItemTitle } from '../lib/fulfillment'
import { ft } from '../lib/fulfillmentText'
import { useMiniPlayer } from '../contexts/MiniPlayerContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { PAID_EXTRAS_ENABLED } from '../lib/paidExtras'
import { useLiveScreen } from '../hooks/useLiveScreen'
import ReportSheet from '../components/ReportSheet'

const streamContent = {
  en: {
    liveTitle: 'Live',
    liveStartsSoon: 'The live starts soon...',
    liveEnded: 'This live has ended',
    liveChat: 'Live chat',
    anonymous: 'Anonymous',
    sendMessage: 'Send a message...',
    send: 'Send',
    bid: 'Bid',
    currentPrice: 'Current price',
    loginToChat: 'Log in to join the chat',
    streamNotFound: 'Live not found',
    retry: 'Retry',
    loadingStream: 'Loading live',
    endStream: 'End live',
    endStreamConfirm: 'Are you sure you want to end the live?',
    endStreamYes: 'Yes, end it',
    endStreamNo: 'No, keep going',
    endStreamFailed: 'Couldn\'t end the live',
    mute: 'Mute mic',
    unmute: 'Unmute mic',
    flipCamera: 'Flip camera',
    connectedTo: 'Connected to',
    liveNow: 'LIVE',
    soldBang: 'SOLD!',
    unsoldBang: 'UNSOLD',
    reserveNotMet: 'Reserve price not reached',
    notChargedReserve: "Your bid didn't reach the seller's minimum price: you are not charged.",
    reserveOfferTitle: 'Buy it at the minimum price?',
    reserveOfferBody: 'You were the top bidder. The seller accepts {price}.',
    reserveOfferBuy: 'Buy at {price}',
    reserveOfferDecline: 'No thanks',
    reserveOfferFailed: 'This offer is no longer available.',
    giveawayBuyersOnly: 'This gift is for buyers of this live: buy an item to take part.',
    toReceiveItem: 'To receive your item',
    fullName: 'Full name',
    cityPlaceholder: 'City',
    zipPlaceholder: 'Postal code',
    phonePlaceholder: 'Phone',
    countryPlaceholder: 'Country',
    confirm: 'Confirm',
    youWon: 'You won!',
    winCardDeclined: 'Your card was declined',
    winCardDeclinedHint: 'Choose the handover, then pay with another card. You can also change your saved card in Payments.',
    payToClaim: 'Pay to get your item',
    payNow: 'Pay now',
    paymentSuccess: 'Payment confirmed!',
    paymentSuccessDesc: 'Your item will be on its way soon',
    paymentError: 'Payment error',
    total: 'Total',
    close: 'Close',
    unmuteViewer: 'Turn on sound',
    messageFlagged: '[Hidden message]',
    bidError: 'Bid failed',
    bidFailedRetry: 'Couldn\'t place your bid. Please try again.',
    buyNowConfirm: 'Buy now for {price}?',
    buyNowFailed: 'Purchase failed. Please try again.',
    creatingOrder: 'Creating your order...',
    orderNotFound: 'We couldn\'t find your order. Please contact support.',
    paymentTimeout: 'Payment setup timed out. Close and try again.',
    paymentFailed: 'Payment failed',
    paymentInitFailed: 'Couldn\'t start the payment. Please try again.',
    paymentConfirmFailed: 'Payment confirmation failed. Please contact support.',
    authError: 'Your session has expired. Please log in again.',
    addCardTitle: 'Add your card to bid',
    addCardDesc: 'A card is required to secure your bids',
    cardSaved: 'Card saved!',
    cardSavedDesc: 'You can now bid',
    saveCard: 'Save card',
    saveCardFailed: 'Couldn\'t save your card',
    cardSetupFailed: 'Couldn\'t start adding your card. Please try again.',
    cardRequired: 'Add your card to bid',
    addCardFirst: 'Add a payment card first',
    card: 'Card',
    itemPrice: 'Item price',
    walletTitle: 'Wallet',
    walletAddress: 'Address for parcels sent by post',
    walletPayment: 'Payment method',
    walletPromo: 'Promo code',
    walletPromoPlaceholder: 'Enter a promo code',
    walletApply: 'Apply',
    walletNoAddress: 'No address',
    walletAddAddress: 'Add an address',
    walletNoCard: 'No card',
    walletAddCard: 'Add',
    promoOnPrice: 'off the price',
    promoOnCommission: 'off the fee',
    promoInvalid: 'Invalid or already used code',
    linkCopied: 'Link copied!',
    shareTitle: '{name} is live on ShaPop!',
    shareText: 'Join {name}\'s live on ShaPop!',
    clipFailed: 'Couldn\'t capture the clip',
    clipTitle: 'ShaPop clip',
    waitingNextItem: 'Waiting for the next item...',
    moreReport: 'Report',
    reportSubject: 'Live report',
    moreBlock: 'Block',
    morePiP: 'Mini player',
    pipUnavailable: 'Mini player unavailable',
    giftTitle: 'Win a gift live!',
    giftEnter: 'Enter to win!',
    giftEntered: 'Entered ✓',
    giftWinner: 'won the gift!',
    maxBidTitle: 'Max bid',
    maxShort: 'MAX',
    maxBidPlaceholder: 'Maximum amount',
    maxBidConfirm: 'Turn on max bid',
    maxBidActive: 'Auto-bid on',
    maxBidCancel: 'Cancel max bid',
    preBid: 'Pre-bid',
    preBidPlaceholder: 'Pre-bid amount',
    preBidConfirm: 'Place pre-bid',
    preBidPlaced: 'Pre-bid placed',
    preBidFailed: 'Couldn\'t place your pre-bid. Please try again.',
    tipTitle: 'Send a tip',
    tipSent: 'Tip sent!',
    tipFailed: 'Couldn\'t send your tip',
    tipMessage: 'sent a tip of',
    modDelete: 'Delete',
    modTimeout: 'Mute for 5 min',
    modMake: 'Make moderator',
    modRemove: 'Remove moderator',
    modAdded: 'is now a moderator',
    modBadge: 'MOD',
    msgDeleted: 'Message deleted',
    userTimedOut: 'is muted for 5 min',
    deleteFailed: 'Couldn\'t delete the message',
    timeoutFailed: 'Couldn\'t mute this user',
    contactBlocked: 'Sharing personal contact details is not allowed on ShaPop. Repeat violations will get your account suspended.',
    watchLimit: 'You\'ve reached your watch time limit. Come back later!',
    joinCohost: 'Join as co-host',
    back: 'Back',
    multiView: 'Multi-view',
    exitMultiView: 'Exit multi-view',
    expandCell: 'Full screen',
    backToGrid: 'Back to grid',
    livesCount: '{n} lives',
    engagementDashboard: 'Engagement dashboard',
    joined: 'joined',
    timeLeft: 'Time left',
    addLive: 'Add a live',
    screensActive: '{n}/4 screens',
    noOtherLives: 'No other lives right now',
    added: 'Added',
  },
  fr: {
    liveTitle: 'Live',
    liveStartsSoon: 'Le live commence bientôt…',
    liveEnded: 'Le live est terminé',
    liveChat: 'Chat en direct',
    anonymous: 'Anonyme',
    sendMessage: 'Écris un message…',
    send: 'Envoyer',
    bid: 'Enchérir',
    currentPrice: 'Prix actuel',
    loginToChat: 'Connecte-toi pour participer au chat',
    streamNotFound: 'Live introuvable',
    retry: 'Réessayer',
    loadingStream: 'Chargement du live',
    endStream: 'Terminer le live',
    endStreamConfirm: 'Tu es sûr de vouloir terminer le live ?',
    endStreamYes: 'Oui, terminer',
    endStreamNo: 'Non, continuer',
    endStreamFailed: 'Impossible de terminer le live',
    mute: 'Couper le micro',
    unmute: 'Activer le micro',
    flipCamera: 'Retourner la caméra',
    connectedTo: 'Connecté au live de',
    liveNow: 'EN DIRECT',
    soldBang: 'VENDU !',
    unsoldBang: 'INVENDU',
    reserveNotMet: 'Prix minimum non atteint',
    notChargedReserve: 'Ton enchère n’atteint pas le prix minimum du vendeur : tu n’es pas débité.',
    reserveOfferTitle: 'L’acheter au prix minimum ?',
    reserveOfferBody: 'Tu étais le meilleur enchérisseur. Le vendeur l’accepte à {price}.',
    reserveOfferBuy: 'Acheter à {price}',
    reserveOfferDecline: 'Non merci',
    reserveOfferFailed: 'Cette offre n’est plus disponible.',
    giveawayBuyersOnly: 'Ce cadeau est réservé aux acheteurs de ce live : achète un article pour participer.',
    toReceiveItem: 'Pour recevoir ton article',
    fullName: 'Nom complet',
    cityPlaceholder: 'Ville',
    zipPlaceholder: 'Code postal',
    phonePlaceholder: 'Téléphone',
    countryPlaceholder: 'Pays',
    confirm: 'Confirmer',
    youWon: 'Tu as gagné !',
    winCardDeclined: 'Ta carte a été refusée',
    winCardDeclinedHint: 'Choisis la remise, puis paie avec une autre carte. Tu peux aussi changer ta carte enregistrée dans Paiements.',
    payToClaim: 'Paie pour recevoir ton article',
    payNow: 'Payer maintenant',
    paymentSuccess: 'Paiement confirmé !',
    paymentSuccessDesc: 'Tu recevras ton article bientôt',
    paymentError: 'Erreur de paiement',
    total: 'Total',
    close: 'Fermer',
    unmuteViewer: 'Activer le son',
    messageFlagged: '[Message masqué]',
    bidError: 'Enchère échouée',
    bidFailedRetry: 'Ton enchère n\'est pas passée. Réessaie.',
    buyNowConfirm: 'Acheter maintenant pour {price} ?',
    buyNowFailed: 'L\'achat n\'a pas abouti. Réessaie.',
    creatingOrder: 'Création de ta commande…',
    orderNotFound: 'Commande introuvable. Contacte le support.',
    paymentTimeout: 'Le paiement a expiré. Ferme et réessaie.',
    paymentFailed: 'Paiement échoué',
    paymentInitFailed: 'Impossible de lancer le paiement. Réessaie.',
    paymentConfirmFailed: 'La confirmation du paiement a échoué. Contacte le support.',
    authError: 'Ta session a expiré. Reconnecte-toi.',
    addCardTitle: 'Ajoute ta carte pour enchérir',
    addCardDesc: 'Une carte est requise pour garantir tes enchères',
    cardSaved: 'Carte enregistrée !',
    cardSavedDesc: 'Tu peux maintenant enchérir',
    saveCard: 'Enregistrer la carte',
    saveCardFailed: 'Impossible d\'enregistrer ta carte',
    cardSetupFailed: 'Impossible d\'ajouter une carte pour le moment. Réessaie.',
    cardRequired: 'Ajoute ta carte pour enchérir',
    addCardFirst: 'Ajoute d\'abord une carte bancaire',
    card: 'Carte',
    itemPrice: 'Prix de l\'article',
    walletTitle: 'Portefeuille',
    walletAddress: 'Adresse pour les envois par la poste',
    walletPayment: 'Moyen de paiement',
    walletPromo: 'Code promo',
    walletPromoPlaceholder: 'Entre un code promo',
    walletApply: 'Appliquer',
    walletNoAddress: 'Aucune adresse',
    walletAddAddress: 'Ajouter une adresse',
    walletNoCard: 'Aucune carte',
    walletAddCard: 'Ajouter',
    promoOnPrice: 'sur le prix',
    promoOnCommission: 'sur la commission',
    promoInvalid: 'Code invalide ou déjà utilisé',
    linkCopied: 'Lien copié !',
    shareTitle: '{name} est en live sur ShaPop !',
    shareText: 'Rejoins le live de {name} sur ShaPop !',
    clipFailed: 'Impossible de capturer le clip',
    clipTitle: 'Clip ShaPop',
    waitingNextItem: 'En attente de l\'article suivant…',
    moreReport: 'Signaler',
    reportSubject: 'Signalement d\'un live',
    moreBlock: 'Bloquer',
    morePiP: 'Mini-lecteur',
    pipUnavailable: 'Mini-lecteur indisponible',
    giftTitle: 'Gagne un cadeau en live !',
    giftEnter: 'Participe et gagne !',
    giftEntered: 'Tu participes ✓',
    giftWinner: 'a gagné le cadeau !',
    maxBidTitle: 'Enchère max',
    maxShort: 'MAX',
    maxBidPlaceholder: 'Montant maximum',
    maxBidConfirm: 'Activer l\'enchère max',
    maxBidActive: 'Enchère auto activée',
    maxBidCancel: 'Annuler l\'enchère max',
    preBid: 'Pré-enchérir',
    preBidPlaceholder: 'Montant de la pré-enchère',
    preBidConfirm: 'Placer la pré-enchère',
    preBidPlaced: 'Pré-enchère placée',
    preBidFailed: 'Ta pré-enchère n\'est pas passée. Réessaie.',
    tipTitle: 'Envoyer un pourboire',
    tipSent: 'Pourboire envoyé !',
    tipFailed: 'Le pourboire n\'a pas pu être envoyé',
    tipMessage: 'a envoyé un pourboire de',
    modDelete: 'Supprimer',
    modTimeout: 'Exclure 5 min',
    modMake: 'Nommer modérateur',
    modRemove: 'Retirer modérateur',
    modAdded: 'est maintenant modérateur',
    modBadge: 'MODO',
    msgDeleted: 'Message supprimé',
    userTimedOut: 'est exclu pour 5 min',
    deleteFailed: 'Impossible de supprimer le message',
    timeoutFailed: 'Impossible d\'exclure cet utilisateur',
    contactBlocked: 'Partager des coordonnées personnelles est interdit sur ShaPop. En cas de récidive, ton compte sera suspendu.',
    watchLimit: 'Tu as atteint ta limite de visionnage. Reviens plus tard !',
    joinCohost: 'Rejoindre en co-animateur',
    back: 'Retour',
    multiView: 'Multi-vue',
    exitMultiView: 'Quitter la multi-vue',
    expandCell: 'Plein écran',
    backToGrid: 'Revenir à la grille',
    livesCount: '{n} lives',
    engagementDashboard: 'Tableau d\'engagement',
    joined: 'a rejoint',
    timeLeft: 'Temps restant',
    addLive: 'Ajouter un live',
    screensActive: '{n}/4 écrans',
    noOtherLives: 'Aucun autre live en cours',
    added: 'Ajouté',
  },
  es: {
    liveTitle: 'Directo',
    liveStartsSoon: 'El directo empieza pronto...',
    liveEnded: 'El directo ha terminado',
    liveChat: 'Chat en directo',
    anonymous: 'Anónimo',
    sendMessage: 'Escribe un mensaje...',
    send: 'Enviar',
    bid: 'Pujar',
    currentPrice: 'Precio actual',
    loginToChat: 'Inicia sesión para participar en el chat',
    streamNotFound: 'Directo no encontrado',
    retry: 'Reintentar',
    loadingStream: 'Cargando directo',
    endStream: 'Terminar el directo',
    endStreamConfirm: '¿Seguro que quieres terminar el directo?',
    endStreamYes: 'Sí, terminar',
    endStreamNo: 'No, continuar',
    endStreamFailed: 'No se pudo terminar el directo',
    mute: 'Silenciar micro',
    unmute: 'Activar micro',
    flipCamera: 'Girar cámara',
    connectedTo: 'Conectado al directo de',
    liveNow: 'EN VIVO',
    soldBang: '¡VENDIDO!',
    unsoldBang: 'NO VENDIDO',
    reserveNotMet: 'Precio mínimo no alcanzado',
    notChargedReserve: 'Tu puja no alcanzó el precio mínimo del vendedor: no se te cobra nada.',
    reserveOfferTitle: '¿Comprarlo al precio mínimo?',
    reserveOfferBody: 'Fuiste el mejor postor. El vendedor lo acepta a {price}.',
    reserveOfferBuy: 'Comprar a {price}',
    reserveOfferDecline: 'No, gracias',
    reserveOfferFailed: 'Esta oferta ya no está disponible.',
    giveawayBuyersOnly: 'Este regalo es solo para quienes compran en este directo: compra un artículo para participar.',
    toReceiveItem: 'Para recibir tu artículo',
    fullName: 'Nombre completo',
    cityPlaceholder: 'Ciudad',
    zipPlaceholder: 'Código postal',
    phonePlaceholder: 'Teléfono',
    countryPlaceholder: 'País',
    confirm: 'Confirmar',
    youWon: '¡Ganaste!',
    winCardDeclined: 'Tu tarjeta ha sido rechazada',
    winCardDeclinedHint: 'Elige la entrega y paga con otra tarjeta. También puedes cambiar tu tarjeta guardada en Pagos.',
    payToClaim: 'Paga para recibir tu artículo',
    payNow: 'Pagar ahora',
    paymentSuccess: '¡Pago confirmado!',
    paymentSuccessDesc: 'Recibirás tu artículo pronto',
    paymentError: 'Error de pago',
    total: 'Total',
    close: 'Cerrar',
    unmuteViewer: 'Activar sonido',
    messageFlagged: '[Mensaje oculto]',
    bidError: 'La puja falló',
    bidFailedRetry: 'No se pudo hacer tu puja. Inténtalo de nuevo.',
    buyNowConfirm: '¿Comprar ahora por {price}?',
    buyNowFailed: 'La compra falló. Inténtalo de nuevo.',
    creatingOrder: 'Creando tu pedido...',
    orderNotFound: 'No encontramos tu pedido. Contacta con soporte.',
    paymentTimeout: 'El pago ha caducado. Cierra e inténtalo de nuevo.',
    paymentFailed: 'Pago fallido',
    paymentInitFailed: 'No se pudo iniciar el pago. Inténtalo de nuevo.',
    paymentConfirmFailed: 'No se pudo confirmar el pago. Contacta con soporte.',
    authError: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    addCardTitle: 'Añade tu tarjeta para pujar',
    addCardDesc: 'Se necesita una tarjeta para garantizar tus pujas',
    cardSaved: '¡Tarjeta guardada!',
    cardSavedDesc: 'Ya puedes pujar',
    saveCard: 'Guardar tarjeta',
    saveCardFailed: 'No se pudo guardar tu tarjeta',
    cardSetupFailed: 'No se pudo añadir la tarjeta. Inténtalo de nuevo.',
    cardRequired: 'Añade tu tarjeta para pujar',
    addCardFirst: 'Primero añade una tarjeta',
    card: 'Tarjeta',
    itemPrice: 'Precio del artículo',
    walletTitle: 'Cartera',
    walletAddress: 'Dirección para envíos por correo',
    walletPayment: 'Método de pago',
    walletPromo: 'Código promocional',
    walletPromoPlaceholder: 'Introduce un código',
    walletApply: 'Aplicar',
    walletNoAddress: 'Sin dirección',
    walletAddAddress: 'Añadir dirección',
    walletNoCard: 'Sin tarjeta',
    walletAddCard: 'Añadir',
    promoOnPrice: 'en el precio',
    promoOnCommission: 'en la comisión',
    promoInvalid: 'Código no válido o ya usado',
    linkCopied: '¡Enlace copiado!',
    shareTitle: '¡{name} está en directo en ShaPop!',
    shareText: '¡Únete al directo de {name} en ShaPop!',
    clipFailed: 'No se pudo capturar el clip',
    clipTitle: 'Clip de ShaPop',
    waitingNextItem: 'Esperando el siguiente artículo...',
    moreReport: 'Denunciar',
    reportSubject: 'Denuncia de un directo',
    moreBlock: 'Bloquear',
    morePiP: 'Minirreproductor',
    pipUnavailable: 'Minirreproductor no disponible',
    giftTitle: '¡Gana un regalo en directo!',
    giftEnter: '¡Participa y gana!',
    giftEntered: 'Participando ✓',
    giftWinner: '¡ganó el regalo!',
    maxBidTitle: 'Puja máxima',
    maxShort: 'MÁX',
    maxBidPlaceholder: 'Importe máximo',
    maxBidConfirm: 'Activar puja máxima',
    maxBidActive: 'Puja automática activada',
    maxBidCancel: 'Cancelar puja máxima',
    preBid: 'Prepujar',
    preBidPlaceholder: 'Importe de la prepuja',
    preBidConfirm: 'Hacer prepuja',
    preBidPlaced: 'Prepuja hecha',
    preBidFailed: 'No se pudo hacer tu prepuja. Inténtalo de nuevo.',
    tipTitle: 'Enviar propina',
    tipSent: '¡Propina enviada!',
    tipFailed: 'No se pudo enviar la propina',
    tipMessage: 'envió una propina de',
    modDelete: 'Eliminar',
    modTimeout: 'Silenciar 5 min',
    modMake: 'Hacer moderador',
    modRemove: 'Quitar moderador',
    modAdded: 'ahora es moderador',
    modBadge: 'MOD',
    msgDeleted: 'Mensaje eliminado',
    userTimedOut: 'silenciado durante 5 min',
    deleteFailed: 'No se pudo eliminar el mensaje',
    timeoutFailed: 'No se pudo silenciar a este usuario',
    contactBlocked: 'Compartir datos de contacto personales está prohibido en ShaPop. Si lo repites, tu cuenta será suspendida.',
    watchLimit: 'Has alcanzado tu límite de visualización. ¡Vuelve más tarde!',
    joinCohost: 'Unirse como coanfitrión',
    back: 'Volver',
    multiView: 'Multivista',
    exitMultiView: 'Salir de la multivista',
    expandCell: 'Pantalla completa',
    backToGrid: 'Volver a la cuadrícula',
    livesCount: '{n} directos',
    engagementDashboard: 'Panel de interacción',
    joined: 'se unió',
    timeLeft: 'Tiempo restante',
    addLive: 'Añadir un directo',
    screensActive: '{n}/4 pantallas',
    noOtherLives: 'No hay otros directos ahora',
    added: 'Añadido',
  },
  ru: {
    liveTitle: 'Эфир',
    liveStartsSoon: 'Эфир скоро начнётся…',
    liveEnded: 'Эфир завершён',
    liveChat: 'Чат эфира',
    anonymous: 'Аноним',
    sendMessage: 'Напиши сообщение…',
    send: 'Отправить',
    bid: 'Ставка',
    currentPrice: 'Текущая цена',
    loginToChat: 'Войди, чтобы писать в чат',
    streamNotFound: 'Эфир не найден',
    retry: 'Повторить',
    loadingStream: 'Загрузка эфира',
    endStream: 'Завершить эфир',
    endStreamConfirm: 'Точно завершить эфир?',
    endStreamYes: 'Да, завершить',
    endStreamNo: 'Нет, продолжить',
    endStreamFailed: 'Не удалось завершить эфир',
    mute: 'Выключить микрофон',
    unmute: 'Включить микрофон',
    flipCamera: 'Сменить камеру',
    connectedTo: 'Сейчас в эфире:',
    liveNow: 'В ЭФИРЕ',
    soldBang: 'ПРОДАНО!',
    unsoldBang: 'НЕ ПРОДАНО',
    reserveNotMet: 'Минимальная цена не достигнута',
    notChargedReserve: 'Твоя ставка не достигла минимальной цены продавца: деньги не списаны.',
    reserveOfferTitle: 'Купить по минимальной цене?',
    reserveOfferBody: 'Твоя ставка была самой высокой. Продавец согласен на {price}.',
    reserveOfferBuy: 'Купить за {price}',
    reserveOfferDecline: 'Нет, спасибо',
    reserveOfferFailed: 'Это предложение больше недоступно.',
    giveawayBuyersOnly: 'Подарок только для покупателей этого эфира: купи товар, чтобы участвовать.',
    toReceiveItem: 'Чтобы получить товар',
    fullName: 'Имя и фамилия',
    cityPlaceholder: 'Город',
    zipPlaceholder: 'Индекс',
    phonePlaceholder: 'Телефон',
    countryPlaceholder: 'Страна',
    confirm: 'Подтвердить',
    youWon: 'Победа за тобой!',
    winCardDeclined: 'Твоя карта отклонена',
    winCardDeclinedHint: 'Выбери способ передачи и оплати другой картой. Сохранённую карту можно сменить в разделе «Оплата».',
    payToClaim: 'Оплати, чтобы получить товар',
    payNow: 'Оплатить',
    paymentSuccess: 'Оплата прошла!',
    paymentSuccessDesc: 'Скоро ты получишь свой товар',
    paymentError: 'Ошибка оплаты',
    total: 'Итого',
    close: 'Закрыть',
    unmuteViewer: 'Включить звук',
    messageFlagged: '[Сообщение скрыто]',
    bidError: 'Ставка не прошла',
    bidFailedRetry: 'Не удалось сделать ставку. Попробуй ещё раз.',
    buyNowConfirm: 'Купить сейчас за {price}?',
    buyNowFailed: 'Покупка не удалась. Попробуй ещё раз.',
    creatingOrder: 'Оформляем заказ…',
    orderNotFound: 'Заказ не найден. Напиши в поддержку.',
    paymentTimeout: 'Время на оплату истекло. Закрой окно и попробуй снова.',
    paymentFailed: 'Оплата не прошла',
    paymentInitFailed: 'Не удалось начать оплату. Попробуй ещё раз.',
    paymentConfirmFailed: 'Не удалось подтвердить оплату. Напиши в поддержку.',
    authError: 'Сессия истекла. Войди снова.',
    addCardTitle: 'Добавь карту, чтобы делать ставки',
    addCardDesc: 'Карта нужна, чтобы подтвердить твои ставки',
    cardSaved: 'Карта сохранена!',
    cardSavedDesc: 'Теперь можно делать ставки',
    saveCard: 'Сохранить карту',
    saveCardFailed: 'Не удалось сохранить карту',
    cardSetupFailed: 'Не удалось добавить карту. Попробуй ещё раз.',
    cardRequired: 'Добавь карту, чтобы делать ставки',
    addCardFirst: 'Сначала добавь банковскую карту',
    card: 'Карта',
    itemPrice: 'Цена товара',
    walletTitle: 'Кошелёк',
    walletAddress: 'Адрес для отправок почтой',
    walletPayment: 'Способ оплаты',
    walletPromo: 'Промокод',
    walletPromoPlaceholder: 'Введи промокод',
    walletApply: 'Применить',
    walletNoAddress: 'Адрес не указан',
    walletAddAddress: 'Добавить адрес',
    walletNoCard: 'Карта не добавлена',
    walletAddCard: 'Добавить',
    promoOnPrice: 'на цену',
    promoOnCommission: 'на комиссию',
    promoInvalid: 'Код недействителен или уже использован',
    linkCopied: 'Ссылка скопирована!',
    shareTitle: '{name} в эфире на ShaPop!',
    shareText: 'Присоединяйся к эфиру на ShaPop: {name}!',
    clipFailed: 'Не удалось сохранить клип',
    clipTitle: 'Клип ShaPop',
    waitingNextItem: 'Ждём следующий товар…',
    moreReport: 'Пожаловаться',
    reportSubject: 'Жалоба на эфир',
    moreBlock: 'Заблокировать',
    morePiP: 'Мини-плеер',
    pipUnavailable: 'Мини-плеер недоступен',
    giftTitle: 'Выиграй подарок в эфире!',
    giftEnter: 'Участвуй и выигрывай!',
    giftEntered: 'Ты участвуешь ✓',
    giftWinner: 'выигрывает подарок!',
    maxBidTitle: 'Макс. ставка',
    maxShort: 'МАКС',
    maxBidPlaceholder: 'Максимальная сумма',
    maxBidConfirm: 'Включить автоставку',
    maxBidActive: 'Автоставка включена',
    maxBidCancel: 'Отменить автоставку',
    preBid: 'Представка',
    preBidPlaceholder: 'Сумма представки',
    preBidConfirm: 'Сделать представку',
    preBidPlaced: 'Представка сделана',
    preBidFailed: 'Не удалось сделать представку. Попробуй ещё раз.',
    tipTitle: 'Отправить чаевые',
    tipSent: 'Чаевые отправлены!',
    tipFailed: 'Не удалось отправить чаевые',
    tipMessage: 'отправляет чаевые:',
    modDelete: 'Удалить',
    modTimeout: 'Заглушить на 5 мин',
    modMake: 'Сделать модератором',
    modRemove: 'Снять модератора',
    modAdded: 'теперь модератор',
    modBadge: 'МОД',
    msgDeleted: 'Сообщение удалено',
    userTimedOut: 'не может писать 5 мин',
    deleteFailed: 'Не удалось удалить сообщение',
    timeoutFailed: 'Не удалось заглушить пользователя',
    contactBlocked: 'Делиться личными контактами на ShaPop запрещено. За повторные нарушения аккаунт будет заблокирован.',
    watchLimit: 'Лимит времени просмотра исчерпан. Возвращайся позже!',
    joinCohost: 'Присоединиться как соведущий',
    back: 'Назад',
    multiView: 'Мультиэкран',
    exitMultiView: 'Выйти из мультиэкрана',
    expandCell: 'Во весь экран',
    backToGrid: 'Вернуться к сетке',
    livesCount: 'Эфиров: {n}',
    engagementDashboard: 'Панель вовлечённости',
    joined: 'заходит',
    timeLeft: 'Осталось времени',
    addLive: 'Добавить эфир',
    screensActive: 'Экраны: {n}/4',
    noOtherLives: 'Других эфиров сейчас нет',
    added: 'Добавлен',
  },
  he: {
    liveTitle: 'שידור חי',
    liveStartsSoon: 'השידור יתחיל בקרוב...',
    liveEnded: 'השידור הסתיים',
    liveChat: 'צ\'אט חי',
    anonymous: 'אנונימי',
    sendMessage: 'כתוב הודעה...',
    send: 'שלח',
    bid: 'הצע',
    currentPrice: 'מחיר נוכחי',
    loginToChat: 'התחבר כדי להשתתף בצ\'אט',
    streamNotFound: 'השידור לא נמצא',
    retry: 'נסה שוב',
    loadingStream: 'טוען שידור',
    endStream: 'סיים שידור',
    endStreamConfirm: 'בטוח שאתה רוצה לסיים את השידור?',
    endStreamYes: 'כן, לסיים',
    endStreamNo: 'לא, להמשיך',
    endStreamFailed: 'לא ניתן לסיים את השידור',
    mute: 'השתק מיקרופון',
    unmute: 'הפעל מיקרופון',
    flipCamera: 'החלף מצלמה',
    connectedTo: 'מחובר לשידור של',
    liveNow: 'שידור חי',
    soldBang: 'נמכר!',
    unsoldBang: 'לא נמכר',
    reserveNotMet: 'מחיר המינימום לא הושג',
    notChargedReserve: 'ההצעה שלך לא הגיעה למחיר המינימום של המוכר: לא חויבת.',
    reserveOfferTitle: 'לקנות במחיר המינימום?',
    reserveOfferBody: 'ההצעה שלך הייתה הגבוהה ביותר. המוכר מסכים ל-{price}.',
    reserveOfferBuy: 'לקנות ב-{price}',
    reserveOfferDecline: 'לא תודה',
    reserveOfferFailed: 'ההצעה כבר לא זמינה.',
    giveawayBuyersOnly: 'המתנה מיועדת לקונים בשידור הזה: קנה פריט כדי להשתתף.',
    toReceiveItem: 'כדי לקבל את הפריט שלך',
    fullName: 'שם מלא',
    cityPlaceholder: 'עיר',
    zipPlaceholder: 'מיקוד',
    phonePlaceholder: 'טלפון',
    countryPlaceholder: 'מדינה',
    confirm: 'אישור',
    youWon: 'זכית!',
    winCardDeclined: 'הכרטיס שלך נדחה',
    winCardDeclinedHint: 'בחרו אופן מסירה ושלמו בכרטיס אחר. אפשר גם להחליף את הכרטיס השמור במסך התשלומים.',
    payToClaim: 'שלם כדי לקבל את הפריט',
    payNow: 'שלם עכשיו',
    paymentSuccess: 'התשלום אושר!',
    paymentSuccessDesc: 'הפריט יגיע אליך בקרוב',
    paymentError: 'שגיאת תשלום',
    total: 'סה"כ',
    close: 'סגור',
    unmuteViewer: 'הפעל סאונד',
    messageFlagged: '[הודעה מוסתרת]',
    bidError: 'ההצעה נכשלה',
    bidFailedRetry: 'לא הצלחנו להגיש את ההצעה. נסה שוב.',
    buyNowConfirm: 'לקנות עכשיו ב-{price}?',
    buyNowFailed: 'הרכישה נכשלה. נסה שוב.',
    creatingOrder: 'יוצרים את ההזמנה שלך...',
    orderNotFound: 'לא מצאנו את ההזמנה שלך. פנה לתמיכה.',
    paymentTimeout: 'זמן התשלום פג. סגור ונסה שוב.',
    paymentFailed: 'התשלום נכשל',
    paymentInitFailed: 'לא ניתן להתחיל את התשלום. נסה שוב.',
    paymentConfirmFailed: 'אישור התשלום נכשל. פנה לתמיכה.',
    authError: 'פג תוקף ההתחברות. התחבר מחדש.',
    addCardTitle: 'הוסף כרטיס כדי להציע',
    addCardDesc: 'נדרש כרטיס כדי להבטיח את ההצעות שלך',
    cardSaved: 'הכרטיס נשמר!',
    cardSavedDesc: 'עכשיו אפשר להציע',
    saveCard: 'שמור כרטיס',
    saveCardFailed: 'לא ניתן לשמור את הכרטיס',
    cardSetupFailed: 'לא ניתן להוסיף כרטיס כרגע. נסה שוב.',
    cardRequired: 'הוסף כרטיס כדי להציע',
    addCardFirst: 'קודם הוסף כרטיס אשראי',
    card: 'כרטיס',
    itemPrice: 'מחיר הפריט',
    walletTitle: 'ארנק',
    walletAddress: 'כתובת למשלוחים בדואר',
    walletPayment: 'אמצעי תשלום',
    walletPromo: 'קוד קופון',
    walletPromoPlaceholder: 'הזן קוד קופון',
    walletApply: 'החל',
    walletNoAddress: 'אין כתובת',
    walletAddAddress: 'הוסף כתובת',
    walletNoCard: 'אין כרטיס',
    walletAddCard: 'הוסף',
    promoOnPrice: 'על המחיר',
    promoOnCommission: 'על העמלה',
    promoInvalid: 'הקוד לא תקף או שכבר נוצל',
    linkCopied: 'הקישור הועתק!',
    shareTitle: '{name} בשידור חי ב-ShaPop!',
    shareText: 'הצטרפו לשידור של {name} ב-ShaPop!',
    clipFailed: 'לא ניתן לשמור את הקליפ',
    clipTitle: 'קליפ מ-ShaPop',
    waitingNextItem: 'ממתינים לפריט הבא...',
    moreReport: 'דווח',
    reportSubject: 'דיווח על שידור',
    moreBlock: 'חסום',
    morePiP: 'נגן מוקטן',
    pipUnavailable: 'הנגן המוקטן לא זמין',
    giftTitle: 'זכה במתנה בשידור חי!',
    giftEnter: 'השתתף וזכה!',
    giftEntered: 'נרשמת ✓',
    giftWinner: 'זכה/תה במתנה!',
    maxBidTitle: 'הצעה מקסימלית',
    maxShort: 'מקס',
    maxBidPlaceholder: 'סכום מקסימלי',
    maxBidConfirm: 'הפעל הצעה מקסימלית',
    maxBidActive: 'הצעה אוטומטית פעילה',
    maxBidCancel: 'בטל הצעה מקסימלית',
    preBid: 'הצעה מוקדמת',
    preBidPlaceholder: 'סכום ההצעה המוקדמת',
    preBidConfirm: 'הגש הצעה מוקדמת',
    preBidPlaced: 'ההצעה המוקדמת הוגשה',
    preBidFailed: 'לא הצלחנו להגיש את ההצעה המוקדמת. נסה שוב.',
    tipTitle: 'שלח טיפ',
    tipSent: 'הטיפ נשלח!',
    tipFailed: 'לא ניתן לשלוח את הטיפ',
    tipMessage: 'שלח/ה טיפ של',
    modDelete: 'מחק',
    modTimeout: 'השתק ל-5 דק\'',
    modMake: 'מנה למנהל',
    modRemove: 'הסר מנהל',
    modAdded: 'מונה/תה למנהל',
    modBadge: 'מנהל',
    msgDeleted: 'ההודעה נמחקה',
    userTimedOut: 'הושתק/ה ל-5 דק\'',
    deleteFailed: 'לא ניתן למחוק את ההודעה',
    timeoutFailed: 'לא ניתן להשתיק את המשתמש',
    contactBlocked: 'אסור לשתף פרטי קשר אישיים ב-ShaPop. הפרות חוזרות יובילו להשעיית החשבון.',
    watchLimit: 'הגעת למגבלת זמן הצפייה. חזור מאוחר יותר!',
    joinCohost: 'הצטרף כמגיש שותף',
    back: 'חזרה',
    multiView: 'תצוגה מרובה',
    exitMultiView: 'יציאה מתצוגה מרובה',
    expandCell: 'מסך מלא',
    backToGrid: 'חזרה לרשת',
    livesCount: '{n} שידורים',
    engagementDashboard: 'לוח מעורבות',
    joined: 'הצטרף/ה',
    timeLeft: 'זמן שנותר',
    addLive: 'הוסף שידור',
    screensActive: '{n}/4 מסכים',
    noOtherLives: 'אין כרגע שידורים אחרים',
    added: 'נוסף',
  },
} satisfies Localized<Record<string, string>>

// Pluriels (le russe a plusieurs formes) : choisis via Intl.PluralRules
const pluralForms = {
  en: {
    viewers: { one: 'viewer', other: 'viewers' },
    participants: { one: 'participant', other: 'participants' },
  },
  fr: {
    viewers: { one: 'spectateur', other: 'spectateurs' },
    participants: { one: 'participant', other: 'participants' },
  },
  es: {
    viewers: { one: 'espectador', other: 'espectadores' },
    participants: { one: 'participante', other: 'participantes' },
  },
  ru: {
    viewers: { one: 'зритель', few: 'зрителя', many: 'зрителей', other: 'зрителя' },
    participants: { one: 'участник', few: 'участника', many: 'участников', other: 'участника' },
  },
  he: {
    viewers: { one: 'צופה', other: 'צופים' },
    participants: { one: 'משתתף', other: 'משתתפים' },
  },
} satisfies Localized<Record<'viewers' | 'participants', Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }>>

function countLabel(n: number, key: 'viewers' | 'participants'): string {
  const forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string } = tr(pluralForms)[key]
  const rule = new Intl.PluralRules(getLocale()).select(n)
  return `${n} ${forms[rule] ?? forms.other}`
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Inner form for card setup (SetupIntent mode)
/** Stripe n'accepte que des pixels (ni calc ni var) : taille réelle selon le réglage « Taille du texte ». */
function stripeFontSize(px: number) {
  const fs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 1
  return `${Math.round(px * fs)}px`
}

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
      onError(error.message || tr(streamContent).saveCardFailed)
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
              fontSize: stripeFontSize(16),
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
          color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
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
  const lang = getLang()
  const ct = tr(streamContent)
  const { user, profile } = useAuth()
  const { minimizeStream } = useMiniPlayer()
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const videoRef = useRef<HTMLVideoElement>(null)
  useLiveScreen()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const auctionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
  usePageTitle(stream?.title ? `${stream.title} — ${ct.liveTitle}` : ct.liveTitle)
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
  const [sellerCountry, setSellerCountry] = useState<string | null>(null)
  const [sellerScore, setSellerScore] = useState<number | null>(null)
  const [, setItemCount] = useState(0)
  const [_sellerReturnPolicy, setSellerReturnPolicy] = useState<string>('no_return')
  const [viewerMuted, setViewerMuted] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  // LiveKit viewer state
  const [viewerLkUrl, setViewerLkUrl] = useState<string | null>(null)
  const [viewerLkToken, setViewerLkToken] = useState<string | null>(null)
  // Aperçu gratuit (spectateur sans carte) : fin prévue, aperçu terminé, relance du jeton après ajout de carte
  const [previewEndsAt, setPreviewEndsAt] = useState<number | null>(null)
  const [previewExpired, setPreviewExpired] = useState(false)
  const [lkTokenNonce, setLkTokenNonce] = useState(0)
  const previewEndsAtRef = useRef<number | null>(null)
  useEffect(() => { previewEndsAtRef.current = previewEndsAt }, [previewEndsAt])

  // Sold animation & payment modal
  const [reserveOffer, setReserveOffer] = useState<{ itemId: string; title: string; price: number; expiresAt: number } | null>(null)
  const [reserveOfferBusy, setReserveOfferBusy] = useState(false)
  const [reserveOfferNow, setReserveOfferNow] = useState(Date.now())
  const [soldAnimation, setSoldAnimation] = useState<{ winner: string; price: number; isUnsold?: boolean; reason?: string; detail?: string } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentItem, setPaymentItem] = useState<Item | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  // Étape 1 : retrait en main propre ou envoi par la poste (DeliveryChoice), étape 2 : paiement
  const [deliveryStep, setDeliveryStep] = useState(true)
  // Carte refusée à l'autorisation de fin d'enchère (le serveur l'écrit sur la commande)
  const [winCardDeclined, setWinCardDeclined] = useState(false)
  useEffect(() => {
    setWinCardDeclined(false)
    if (!paymentOrder?.id) return
    let stop = false
    const delays = [0, 1500, 3000, 5000, 8000, 12000]
    const timers = delays.map(ms => setTimeout(async () => {
      if (stop) return
      const { data } = await supabase.from('orders').select('auth_status').eq('id', paymentOrder.id).maybeSingle()
      const st = (data as { auth_status?: string | null } | null)?.auth_status
      if (!st || stop) return
      stop = true
      if (isMountedRef.current) setWinCardDeclined(st === 'declined' || st === 'no_card')
    }, ms))
    return () => { stop = true; timers.forEach(clearTimeout) }
  }, [paymentOrder?.id])
  const [paymentTotals, setPaymentTotals] = useState<{ amount: number; shipping: number; total: number; currency: string; method?: string } | null>(null)

  // Card setup modal (required before bidding)
  const [hasCard, setHasCard] = useState<boolean | null>(null) // null = not checked yet
  const [showCardModal, setShowCardModal] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardSuccess, setCardSuccess] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  // Tip modal state
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipSending, setTipSending] = useState(false)

  // Moderation state
  const [moderatorIds, setModeratorIds] = useState<string[]>([])
  const [modMenuMsg, setModMenuMsg] = useState<ChatMessage | null>(null)

  // Wallet modal state
  const [showWallet, setShowWallet] = useState(false)
  const [walletAddress, setWalletAddress] = useState<{ name: string; street: string; city: string; zip: string } | null>(null)
  const [walletCard, setWalletCard] = useState<{ brand?: string; last4?: string } | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoStatus, setPromoStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [promoDiscount, setPromoDiscount] = useState<{ percent: number; type: string } | null>(null)

  // Giveaway state
  const [activeGiveaway, setActiveGiveaway] = useState<Giveaway | null>(null)

  const [hasEnteredGiveaway, setHasEnteredGiveaway] = useState(false)
  // Cadeau auquel on ne peut pas participer (réservé aux acheteurs) : on retire la grande case
  const [giveawayDismissedId, setGiveawayDismissedId] = useState<string | null>(null)
  // Multi-vue : une case agrandie en plein écran (les autres restent connectées en arrière-plan)
  const [expandedMultiIdx, setExpandedMultiIdx] = useState<number | null>(null)
  const [giveawayWinner, setGiveawayWinner] = useState<{ name: string } | null>(null)
  const [enteringGiveaway, setEnteringGiveaway] = useState(false)
  const giveawayWinnerShownRef = useRef<string | null>(null) // track which giveaway winner was already shown

  // More menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)

  // Multi-view state
  const [multiViewStreams, setMultiViewStreams] = useState<{ id: string; title: string; sellerName: string; sellerCountry: string | null; lkUrl: string; lkToken: string }[]>([])
  const [activeMultiIdx, setActiveMultiIdx] = useState(0)
  const [showMultiPicker, setShowMultiPicker] = useState(false)
  const [availableLives, setAvailableLives] = useState<{ id: string; title: string; seller_name: string; seller_country: string | null; thumbnail_url: string | null }[]>([])
  const isMultiView = multiViewStreams.length > 0
  const isMultiViewRef = useRef(false)
  isMultiViewRef.current = isMultiView
  const [multiStreamItems, setMultiStreamItems] = useState<Record<string, { id: string; title: string; current_price: number; starting_price: number; image_url?: string }>>({})
  const [multiBidLoading, setMultiBidLoading] = useState<string | null>(null)
  const [pendingWonItem, setPendingWonItem] = useState<{ title: string; price: number } | null>(null)
  const [likedCells, setLikedCells] = useState<Record<string, boolean>>({})
  const [multiStreamGiveaways, setMultiStreamGiveaways] = useState<Record<string, { id: string; prize_description: string; entry_count: number; status: string }>>({})
  const [multiStreamGiveawayEntered, setMultiStreamGiveawayEntered] = useState<Record<string, boolean>>({})
  const [multiStreamSold, setMultiStreamSold] = useState<Record<string, { winner: string; price: number; isUnsold?: boolean } | null>>({})
  const [multiStreamGiveawayWinner, setMultiStreamGiveawayWinner] = useState<Record<string, { name: string } | null>>({})
  const multiGiveawayWinnerShownRef = useRef<Record<string, string>>({})
  const prevMultiItemIds = useRef<Record<string, string>>({})

  // Clip capture state

  // Max-bid state
  const [showMaxBidModal, setShowMaxBidModal] = useState(false)
  const [maxBidAmount, setMaxBidAmount] = useState('')
  const [hasActiveMaxBid, setHasActiveMaxBid] = useState(false)
  const [maxBidLoading, setMaxBidLoading] = useState(false)

  // Pre-bid state
  const [showPreBidModal, setShowPreBidModal] = useState(false)
  const [preBidItemId, setPreBidItemId] = useState<string | null>(null)
  const [preBidAmount, setPreBidAmount] = useState('')
  const [preBidLoading, setPreBidLoading] = useState(false)
  const [_preBidItems, setPreBidItems] = useState<Set<string>>(new Set())

  // Upcoming items for pre-bid
  const [upcomingItems, setUpcomingItems] = useState<Item[]>([])

  // Bundling state: track items bought from this stream
  const [boughtItemCount, setBoughtItemCount] = useState(0)

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }, [])

  // Determine if user is the seller or co-host of this stream
  const isSeller = !!(user && stream && stream.seller_id === user.id)
  const isCohost = !!(user && stream && (stream as unknown as { cohost_id?: string }).cohost_id === user.id)
  const isLive = stream?.status === 'live'
  // Devise des prix affichés : celle du pays du vendeur (repli : pays de l'utilisateur connecté)
  const priceCurrency = currencyForCountry(isSeller ? profile?.country : (sellerCountry ?? profile?.country))
  const money = (amount: number | string | null | undefined, currency: string = priceCurrency) => formatMoney(amount, currency)

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
      alert(tr(streamContent).watchLimit)
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


  // Fetch LiveKit viewer token when stream has a livekit room and is live
  useEffect(() => {
    if (!stream?.livekit_room_name || stream.status !== 'live' || isSeller) return
    let cancelled = false
    const fetchLkToken = async () => {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token || cancelled) return
      try {
        const resp = await apiFetch(`/api/streams/${stream.id}/livekit-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
        const data = await resp.json()
        if (cancelled) return
        // Aperçu gratuit déjà consommé sur ce direct : écran « Ajoute ta carte » directement
        if (resp.status === 402 && data.error === 'card_required') {
          setViewerLkToken(null)
          setPreviewEndsAt(null)
          setPreviewExpired(true)
          return
        }
        if (data.token && data.url) {
          const remaining = data.preview?.remaining_seconds
          setPreviewEndsAt(typeof remaining === 'number' ? Date.now() + remaining * 1000 : null)
          setPreviewExpired(false)
          setViewerLkToken(data.token)
          setViewerLkUrl(data.url)
        }
      } catch (err) {
        console.error('Failed to fetch LiveKit viewer token:', err)
      }
    }
    fetchLkToken()
    return () => { cancelled = true }
  }, [stream?.id, stream?.livekit_room_name, stream?.status, isSeller, lkTokenNonce])

  // Fin de l'aperçu gratuit : on coupe la vidéo et le son (le serveur retire aussi le spectateur de la salle)
  const endPreview = useCallback(() => {
    setViewerLkToken(null)
    setMultiViewStreams([])
    setPreviewEndsAt(null)
    setPreviewExpired(true)
  }, [])
  useEffect(() => {
    if (previewEndsAt == null) return
    const timer = setTimeout(endPreview, Math.max(0, previewEndsAt - Date.now()))
    return () => clearTimeout(timer)
  }, [previewEndsAt, endPreview])
  // Retiré de la salle par le serveur juste avant la fin de notre minuterie (léger décalage d'horloge)
  const handleViewerDisconnected = useCallback(() => {
    const endsAt = previewEndsAtRef.current
    if (endsAt != null && Date.now() >= endsAt - 5000) endPreview()
  }, [endPreview])

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
    if (!showPaymentModal || deliveryStep || clientSecret || paymentError || paymentSuccess) return

    const timeout = setTimeout(() => {
      if (!clientSecret && isMountedRef.current) {
        setPaymentError(ct.paymentTimeout)
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [showPaymentModal, deliveryStep, clientSecret, paymentError, paymentSuccess])

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
        .select('display_name, username, avatar_url, country')
        .eq('id', stream.seller_id)
        .single()
      if (data) {
        setSellerName(data.display_name || data.username || '')
        setSellerAvatar(data.avatar_url || null)
        setSellerCountry(data.country || null)
      }
    }
    const fetchSellerData = async () => {
      const { data } = await supabase
        .from('sellers')
        .select('return_policy')
        .eq('id', stream.seller_id)
        .single()
      if (data?.return_policy) {
        setSellerReturnPolicy(data.return_policy)
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

  // PiP handler — minimize to in-app mini player
  const handlePiP = useCallback(() => {
    if (!viewerLkUrl || !viewerLkToken || !id || !stream) return
    if (previewEndsAtRef.current != null) return // pas de mini-lecteur pendant l'aperçu gratuit
    minimizeStream({
      streamId: id,
      streamTitle: stream.title,
      sellerName,
      sellerAvatar,
      lkUrl: viewerLkUrl,
      lkToken: viewerLkToken,
    })
  }, [id, stream, sellerName, sellerAvatar, viewerLkUrl, viewerLkToken, minimizeStream])

  // Ref for swipe handler to access latest handlePiP
  const handlePiPRef = useRef(handlePiP)
  useEffect(() => { handlePiPRef.current = handlePiP }, [handlePiP])

  // Global swipe detection: horizontal >80px or downward >120px triggers PiP
  useEffect(() => {
    let startX = 0, startY = 0, startTime = 0
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTime = Date.now()
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      const elapsed = Date.now() - startTime
      if (elapsed < 400 && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        handlePiPRef.current()
        return
      }
      if (elapsed < 400 && dy > 120 && dy > Math.abs(dx) * 1.5) {
        handlePiPRef.current()
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])


  // Multi-view: fetch available live streams
  const fetchAvailableLives = useCallback(async () => {
    const { data, error } = await supabase
      .from('streams')
      .select('id, title, thumbnail_url, seller_id')
      .eq('status', 'live')
      .neq('id', id || '')
      .limit(10)
    if (error || !data) return
    // Get seller names
    const sellerIds = [...new Set(data.map(s => s.seller_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, country')
      .in('id', sellerIds)
    const nameMap = new Map(profiles?.map(p => [p.id, p.display_name || p.username || '']) || [])
    const countryMap = new Map(profiles?.map(p => [p.id, (p.country as string | null) || null]) || [])
    setAvailableLives(data.map(s => ({
      id: s.id,
      title: s.title || '',
      seller_name: nameMap.get(s.seller_id) || '',
      seller_country: countryMap.get(s.seller_id) ?? null,
      thumbnail_url: s.thumbnail_url,
    })))
  }, [id])

  // Multi-view: add a stream to the grid
  const addMultiStream = useCallback(async (streamId: string, title: string, sellerName: string, sellerCountry: string | null) => {
    // Get LiveKit token for this stream
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return
    try {
      const resp = await apiFetch(`/api/streams/${streamId}/livekit-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) return
      const { url, token: lkToken } = await resp.json()
      setMultiViewStreams(prev => {
        if (prev.length >= 3) return prev // max 4 total (main + 3)
        if (prev.some(s => s.id === streamId)) return prev
        return [...prev, { id: streamId, title, sellerName, sellerCountry, lkUrl: url, lkToken: lkToken }]
      })
      setShowMultiPicker(false)
    } catch { /* failed */ }
  }, [])

  // Multi-view: remove a stream from the grid
  const removeMultiStream = useCallback((idx: number) => {
    setMultiViewStreams(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (activeMultiIdx > idx) setActiveMultiIdx(a => a - 1)
      else if (activeMultiIdx === idx) setActiveMultiIdx(0)
      return next
    })
  }, [activeMultiIdx])

  // Multi-view: fetch active items + subscribe to realtime for each additional stream
  useEffect(() => {
    if (multiViewStreams.length === 0) {
      setMultiStreamItems({})
      prevMultiItemIds.current = {}
      return
    }
    const channels: ReturnType<typeof supabase.channel>[] = []
    multiViewStreams.forEach(ms => {
      // Fetch current active item
      supabase.from('items').select('id, title, current_price, starting_price, image_urls, status')
        .eq('stream_id', ms.id).eq('status', 'active').limit(1).maybeSingle()
        .then(({ data }) => {
          if (data) {
            prevMultiItemIds.current[ms.id] = data.id
            setMultiStreamItems(prev => ({ ...prev, [ms.id]: { id: data.id, title: data.title, current_price: data.current_price, starting_price: data.starting_price, image_url: data.image_urls?.[0] } }))
          }
        })
      // Subscribe to realtime changes
      const ch = supabase.channel(`multi-items-${ms.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `stream_id=eq.${ms.id}` }, async (payload) => {
          let item = payload.new as Record<string, unknown>
          // If status missing (REPLICA IDENTITY not FULL), re-fetch
          if (!item?.status && item?.id) {
            const { data: fetched } = await supabase.from('items').select('*').eq('id', item.id as string).single()
            if (fetched) item = fetched as Record<string, unknown>
          }
          if (item?.status === 'active') {
            prevMultiItemIds.current[ms.id] = item.id as string
            setMultiStreamItems(prev => ({ ...prev, [ms.id]: { id: item.id as string, title: item.title as string, current_price: item.current_price as number, starting_price: item.starting_price as number, image_url: (item.image_urls as string[] | undefined)?.[0] } }))
          } else if (item?.status === 'sold' || item?.status === 'unsold') {
            delete prevMultiItemIds.current[ms.id]
            setMultiStreamItems(prev => { const next = { ...prev }; if (next[ms.id]?.id === (item?.id as string)) delete next[ms.id]; return next })
            // Show SOLD/UNSOLD animation in this cell
            const isUnsold = item.status === 'unsold'
            setMultiStreamSold(prev => ({ ...prev, [ms.id]: { winner: '', price: item.current_price as number, isUnsold } }))
            setTimeout(() => { setMultiStreamSold(prev => ({ ...prev, [ms.id]: null })) }, 3000)
          } else if (item?.status && item.status !== 'active') {
            setMultiStreamItems(prev => { const next = { ...prev }; if (next[ms.id]?.id === (item?.id as string)) delete next[ms.id]; return next })
          }
        })
        .subscribe()
      channels.push(ch)
    })
    // Poll items every 3s as fallback (realtime may miss events)
    // Also detect sold/unsold transitions by tracking previous active item IDs
    const pollInterval = setInterval(() => {
      multiViewStreams.forEach(ms => {
        supabase.from('items').select('id, title, current_price, starting_price, image_urls, status')
          .eq('stream_id', ms.id).eq('status', 'active').limit(1).maybeSingle()
          .then(({ data }) => {
            if (data) {
              prevMultiItemIds.current[ms.id] = data.id
              setMultiStreamItems(prev => {
                const existing = prev[ms.id]
                if (existing && existing.id === data.id && existing.current_price === data.current_price) return prev
                return { ...prev, [ms.id]: { id: data.id, title: data.title, current_price: data.current_price, starting_price: data.starting_price, image_url: data.image_urls?.[0] } }
              })
            } else {
              // No active item — check if the previous active item was sold/unsold
              const prevId = prevMultiItemIds.current[ms.id]
              if (prevId) {
                delete prevMultiItemIds.current[ms.id]
                setMultiStreamItems(prev => { const next = { ...prev }; delete next[ms.id]; return next })
                supabase.from('items').select('id, status, current_price, title').eq('id', prevId).single()
                  .then(({ data: item }) => {
                    if (item && (item.status === 'sold' || item.status === 'unsold')) {
                      setMultiStreamSold(prev => ({ ...prev, [ms.id]: { winner: '', price: item.current_price, isUnsold: item.status === 'unsold' } }))
                      setTimeout(() => { setMultiStreamSold(prev => ({ ...prev, [ms.id]: null })) }, 3000)
                    }
                  })
              }
            }
          })
      })
    }, 3000)
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); clearInterval(pollInterval) }
  }, [multiViewStreams])

  // Multi-view: fetch giveaways + subscribe for each additional stream
  useEffect(() => {
    if (multiViewStreams.length === 0) {
      setMultiStreamGiveaways({})
      setMultiStreamGiveawayEntered({})
      return
    }
    const channels: ReturnType<typeof supabase.channel>[] = []
    multiViewStreams.forEach(ms => {
      // Fetch current giveaway
      apiFetch(`/api/streams/${ms.id}/giveaway`)
        .then(r => r.json())
        .then(gw => {
          if (gw && gw.id) {
            setMultiStreamGiveaways(prev => ({ ...prev, [ms.id]: { id: gw.id, prize_description: gw.prize_description, entry_count: gw.entry_count, status: gw.status } }))
            // Check if user entered
            if (user) {
              supabase.from('giveaway_entries').select('id').eq('giveaway_id', gw.id).eq('user_id', user.id).maybeSingle()
                .then(({ data }) => { if (data) setMultiStreamGiveawayEntered(prev => ({ ...prev, [ms.id]: true })) })
            }
          }
        })
        .catch(() => {})
      // Subscribe to giveaway changes
      const ch = supabase.channel(`multi-giveaway-${ms.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'giveaways', filter: `stream_id=eq.${ms.id}` }, (payload) => {
          const gw = payload.new as Record<string, unknown>
          if (gw) {
            setMultiStreamGiveaways(prev => ({ ...prev, [ms.id]: { id: gw.id as string, prize_description: gw.prize_description as string, entry_count: gw.entry_count as number, status: gw.status as string } }))
            // Detect drawn giveaway — show winner once
            if (gw.status === 'drawn' && gw.winner_name && multiGiveawayWinnerShownRef.current[ms.id] !== (gw.id as string)) {
              multiGiveawayWinnerShownRef.current[ms.id] = gw.id as string
              setMultiStreamGiveawayWinner(prev => ({ ...prev, [ms.id]: { name: gw.winner_name as string } }))
              setTimeout(() => { setMultiStreamGiveawayWinner(prev => ({ ...prev, [ms.id]: null })) }, 6000)
            }
          }
        })
        .subscribe()
      channels.push(ch)
    })
    // Poll giveaways every 3s as fallback (realtime may miss events)
    const gwPollInterval = setInterval(() => {
      multiViewStreams.forEach(ms => {
        apiFetch(`/api/streams/${ms.id}/giveaway`)
          .then(r => r.json())
          .then(gw => {
            if (gw && gw.id) {
              setMultiStreamGiveaways(prev => {
                const existing = prev[ms.id]
                if (existing && existing.id === gw.id && existing.entry_count === gw.entry_count && existing.status === gw.status) return prev
                return { ...prev, [ms.id]: { id: gw.id, prize_description: gw.prize_description, entry_count: gw.entry_count, status: gw.status } }
              })
              // Detect drawn giveaway — show winner once
              if (gw.status === 'drawn' && gw.winner_name && multiGiveawayWinnerShownRef.current[ms.id] !== gw.id) {
                multiGiveawayWinnerShownRef.current[ms.id] = gw.id
                setMultiStreamGiveawayWinner(prev => ({ ...prev, [ms.id]: { name: gw.winner_name } }))
                setTimeout(() => { setMultiStreamGiveawayWinner(prev => ({ ...prev, [ms.id]: null })) }, 6000)
              }
              if (user) {
                supabase.from('giveaway_entries').select('id').eq('giveaway_id', gw.id).eq('user_id', user.id).maybeSingle()
                  .then(({ data }) => { if (data) setMultiStreamGiveawayEntered(prev => ({ ...prev, [ms.id]: true })) })
              }
            } else {
              // No active giveaway — clear it
              setMultiStreamGiveaways(prev => {
                if (!prev[ms.id]) return prev
                const next = { ...prev }; delete next[ms.id]; return next
              })
            }
          })
          .catch(() => {})
      })
    }, 3000)
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); clearInterval(gwPollInterval) }
  }, [multiViewStreams, user])

  // Multi-view: enter giveaway on an additional stream
  const handleMultiGiveawayEnter = useCallback(async (streamId: string) => {
    const gw = multiStreamGiveaways[streamId]
    if (!gw || !user || multiStreamGiveawayEntered[streamId]) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      const resp = await apiFetch(`/api/giveaways/${gw.id}/enter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resp.status === 403) { alert(ct.giveawayBuyersOnly); return }
      if (resp.ok) {
        setMultiStreamGiveawayEntered(prev => ({ ...prev, [streamId]: true }))
        setMultiStreamGiveaways(prev => prev[streamId] ? { ...prev, [streamId]: { ...prev[streamId], entry_count: prev[streamId].entry_count + 1 } } : prev)
        hapticTap()
      }
    } catch { /* ignore */ }
  }, [multiStreamGiveaways, multiStreamGiveawayEntered, user])

  // Multi-view: bid on an additional stream's active item
  const handleMultiBid = useCallback(async (streamId: string) => {
    const item = multiStreamItems[streamId]
    if (!item || !user || multiBidLoading) return
    setMultiBidLoading(streamId)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) return
      const bidAmount = item.current_price > 0 ? item.current_price + 1 : item.starting_price + 1
      const resp = await apiFetch(`/api/items/${item.id}/bid`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bidAmount }),
      })
      if (resp.ok) hapticTap()
    } catch { /* */ }
    finally { setMultiBidLoading(null) }
  }, [multiStreamItems, user, multiBidLoading])

  // Charger les donnees du stream
  const retryFetchStream = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('streams')
        .select('id, seller_id, title, description, category, tags, status, thumbnail_url, viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds, total_reactions, scheduled_at, started_at, ended_at, city, community_id, mux_playback_id, created_at, livekit_room_name, recording_url, moderator_ids')
        .eq('id', id)
        .single()
      setStream(data as Stream | null)
      if (data?.moderator_ids) setModeratorIds(data.moderator_ids)
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

    // Fetch upcoming items (draft/pending = not yet auctioned) for pre-bid
    const fetchUpcomingItems = async () => {
      try {
        const { data } = await supabase
          .from('items')
          .select('id, title, starting_price, image_urls, status')
          .eq('stream_id', id)
          .in('status', ['draft', 'pending'])
          .order('created_at', { ascending: true })
        if (import.meta.env.DEV) console.log('[PRE-BID] upcoming items:', data?.length, data?.map((d: { title: string; status: string }) => `${d.title}(${d.status})`))
        setUpcomingItems((data as Item[]) || [])
      } catch (err) { console.error('[PRE-BID] fetch error:', err) }
    }

    fetchActiveAuction()
    fetchMessages()
    fetchItemCount()
    fetchUpcomingItems()
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
      if (import.meta.env.DEV) console.log('[RT-ITEMS]', item.id.slice(0, 8), 'status=', item.status, 'winner=', item.winner_id?.slice(0, 8), 'price=', item.current_price, 'keys=', Object.keys(payload.new))

      // Sequence counter: discard stale async handlers
      const seq = ++itemEventSeqRef.current

      // If payload.new is missing status (REPLICA IDENTITY not FULL), re-fetch from DB
      if (!item.status) {
        const { data: fetched } = await supabase.from('items').select('*').eq('id', item.id).single()
        if (!fetched || itemEventSeqRef.current !== seq) return
        Object.assign(item, fetched)
        if (import.meta.env.DEV) console.log('[RT-ITEMS] refetched status=', item.status)
      }

      // Update upcoming items: remove when no longer draft/pending, add if newly draft/pending
      if (['draft', 'pending'].includes(item.status)) {
        setUpcomingItems(prev => {
          const exists = prev.some(u => u.id === item.id)
          if (exists) return prev.map(u => u.id === item.id ? item : u)
          return [...prev, item]
        })
      } else {
        setUpcomingItems(prev => prev.filter(u => u.id !== item.id))
      }

      if (item.status === 'active') {
        setActiveAuction(item)
        setBidAmount(String(item.current_price + 1))
      } else if (item.status === 'sold') {
        setActiveAuction(null)
        console.log('[SOLD] Showing sold animation, isMultiView:', isMultiViewRef.current)
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
          // In multi-view: show mini banner in cell instead of auto-opening full-screen modal
          if (isMultiViewRef.current) {
            setPendingWonItem({ title: item.title, price: item.current_price })
          } else {
            setShowPaymentModal(true)
          }
          // Fetch the order with retry (seller may still be creating it)
          const initPayment = async () => {
            // Fix #6: Null check for session
            const { data: session, error: sessionError } = await supabase.auth.getSession()
            if (sessionError || !session.session) {
              console.error('Failed to get auth session:', sessionError || 'session is null')
              setPaymentError(ct.authError)
              return
            }
            const token = session.session.access_token
            if (!token) {
              console.error('No access token in session')
              setPaymentError(ct.authError)
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

            // Le paiement n'est préparé qu'après le choix retrait / poste (DeliveryChoice)
          }
          initPayment()
        }
      } else if (item.status === 'unsold') {
        setActiveAuction(null)
        // Invendu : on dit POURQUOI (prix minimum du vendeur non atteint) et, à celui qui a enchéri, qu'il n'est pas débité
        const reserveNotMet = item.min_price != null && Number(item.min_price) > 0 && Number(item.current_price) < Number(item.min_price)
        setSoldAnimation({ winner: '', price: item.current_price, isUnsold: true, reason: reserveNotMet ? ct.reserveNotMet : undefined })
        if (reserveNotMet && user) {
          supabase.from('bids').select('bidder_id').eq('item_id', item.id).order('amount', { ascending: false }).limit(1).maybeSingle()
            .then(({ data: top }) => {
              if (!top || top.bidder_id !== user.id || !isMountedRef.current) return
              setSoldAnimation(prev => prev && prev.isUnsold ? { ...prev, detail: ct.notChargedReserve } : prev)
              // Meilleur enchérisseur : offre d'achat au prix minimum pendant 55 s (après l'annonce « invendu »)
              setTimeout(() => {
                if (!isMountedRef.current) return
                setSoldAnimation(null)
                setReserveOffer({ itemId: item.id, title: item.title, price: Number(item.min_price), expiresAt: Date.now() + 55_000 })
              }, 2500)
            })
        }
        setTimeout(() => { if (isMountedRef.current) setSoldAnimation(null) }, reserveNotMet ? 7000 : 3000)
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

    // Helper: show winner only once per giveaway, auto-dismiss after 6s
    const showWinnerOnce = (gw: { id: string; winner_name: string | null }) => {
      if (giveawayWinnerShownRef.current === gw.id) return
      giveawayWinnerShownRef.current = gw.id
      setGiveawayWinner({ name: gw.winner_name || '' })
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => setGiveawayWinner(null), 6000)
      // Store timer ref for cleanup
      return () => clearTimeout(timer)
    }

    // Fetch active giveaway
    const fetchGiveaway = async () => {
      try {
        const resp = await apiFetch(`/api/streams/${id}/giveaway`)
        const data = await resp.json()
        if (data) {
          setActiveGiveaway(data)
          if (data.status === 'drawn' && data.winner_name) {
            showWinnerOnce(data)
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
          showWinnerOnce(gw)
        }
      })
      .subscribe()

    // Poll giveaway every 5s as fallback (realtime may miss events)
    const pollInterval = setInterval(async () => {
      try {
        const resp = await apiFetch(`/api/streams/${id}/giveaway`)
        const gw = await resp.json()
        if (gw && gw.id) {
          setActiveGiveaway(gw)
          if (gw.status === 'drawn' && gw.winner_name) {
            showWinnerOnce(gw)
          }
        }
      } catch { /* ignore */ }
    }, 5000)

    return () => {
      supabase.removeChannel(gwChannel)
      clearInterval(pollInterval)
    }
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
      } else if (resp.status === 403) {
        alert(ct.giveawayBuyersOnly)
        setGiveawayDismissedId(activeGiveaway.id)
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

    // Sudden Death mode: duration_seconds === -1 → fixed 10s countdown, reset on each price change
    if (activeAuction.duration_seconds === -1) {
      setTimeLeft(10)
      return
    }

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
  }, [activeAuction?.id, activeAuction?.started_at, activeAuction?.duration_seconds])

  // Sudden Death countdown: separate interval that ticks every second
  useEffect(() => {
    if (sdTimerRef.current) { clearInterval(sdTimerRef.current); sdTimerRef.current = null }
    if (!activeAuction || activeAuction.duration_seconds !== -1 || !activeAuction.started_at) return

    sdTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (sdTimerRef.current) { clearInterval(sdTimerRef.current); sdTimerRef.current = null }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (sdTimerRef.current) { clearInterval(sdTimerRef.current); sdTimerRef.current = null } }
  }, [activeAuction?.id, activeAuction?.duration_seconds, activeAuction?.started_at])

  // Sudden Death: reset timer to 10s when current_price changes
  useEffect(() => {
    if (!activeAuction || activeAuction.duration_seconds !== -1) return
    if (activeAuction.status === 'active') {
      setTimeLeft(10)
    }
  }, [activeAuction?.current_price])

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
        alert(ct.contactBlocked)
      }
    } catch (err) {
      console.error('Failed to send chat message:', err)
    }
  }

  // ── Moderation helpers ──
  const canModerate = user && stream && (stream.seller_id === user.id || moderatorIds.includes(user.id))

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      const resp = await apiFetch(`/api/chat/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) {
        showToast(ct.deleteFailed)
        return
      }
      setMessages(prev => prev.filter(m => m.id !== msgId))
      setModMenuMsg(null)
    } catch (err) { console.error('Delete msg failed:', err) }
  }

  const handleTimeoutUser = async (targetUserId: string) => {
    if (!id) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      const resp = await apiFetch(`/api/streams/${id}/timeout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, duration_minutes: 5 }),
      })
      if (!resp.ok) {
        showToast(ct.timeoutFailed)
        return
      }
      setModMenuMsg(null)
    } catch (err) { console.error('Timeout failed:', err) }
  }

  const handleMakeMod = async (targetUserId: string) => {
    if (!id) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      const resp = await apiFetch(`/api/streams/${id}/moderators`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      })
      const result = await resp.json()
      if (result.moderator_ids) setModeratorIds(result.moderator_ids)
      setModMenuMsg(null)
    } catch (err) { console.error('Make mod failed:', err) }
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
        setCardError(ct.cardSetupFailed)
        return
      }
      const data = await resp.json()
      if (data.client_secret) {
        setSetupClientSecret(data.client_secret)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Setup intent error:', err)
      setCardError(ct.cardSetupFailed)
    }
  }

  // Compte à rebours de l'offre « acheter au prix minimum »
  useEffect(() => {
    if (!reserveOffer) return
    const t = setInterval(() => {
      const now = Date.now()
      setReserveOfferNow(now)
      if (now >= reserveOffer.expiresAt) setReserveOffer(null)
    }, 500)
    return () => clearInterval(t)
  }, [reserveOffer])

  const handleBuyAtReserve = async () => {
    if (!reserveOffer || reserveOfferBusy) return
    setReserveOfferBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await apiFetch(`/api/items/${reserveOffer.itemId}/buy-at-reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (!resp.ok) alert(ct.reserveOfferFailed)
      // Succès : l'article passe à « vendu » → « Tu as gagné » et le paiement s'ouvrent comme pour un achat
      setReserveOffer(null)
    } catch {
      alert(ct.reserveOfferFailed)
    } finally {
      setReserveOfferBusy(false)
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
      alert(ct.bidFailedRetry)
    }
  }

  // ═══ BUY NOW: instant purchase at buy_now_price ═══
  const handleBuyNow = async () => {
    if (!activeAuction || !user) return
    if (!activeAuction.buy_now_price || activeAuction.buy_now_price <= 0) return

    if (hasCard !== true) { openCardSetup(); return }

    if (!confirm(fill(ct.buyNowConfirm, { price: money(activeAuction.buy_now_price) }))) return

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch(`/api/items/${activeAuction.id}/buy-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        if (err.error === 'card_required') { setHasCard(false); openCardSetup(); return }
        throw new Error(err.error || 'buy_now_failed')
      }
      hapticTap()
      if (id) track('buy_now', { stream_id: id, item_id: activeAuction.id, price: activeAuction.buy_now_price })
    } catch (err: unknown) {
      console.error('Buy now failed:', err)
      alert(ct.buyNowFailed)
    }
  }

  // ═══ TIPS: send a tip to the seller via Stripe ═══
  const handleSendTip = async (amount: number) => {
    if (!user || !stream || !id) return
    if (hasCard !== true) { openCardSetup(); setShowTipModal(false); return }

    setTipSending(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const resp = await apiFetch(`/api/streams/${id}/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        if (err.error === 'card_required') { setHasCard(false); openCardSetup(); setShowTipModal(false); return }
        throw new Error(err.error || 'tip_failed')
      }

      hapticTap()
      showToast(ct.tipSent)
      setShowTipModal(false)
    } catch (err: unknown) {
      console.error('Tip failed:', err)
      alert(ct.tipFailed)
    }
    setTipSending(false)
  }

  // ═══ MAX-BID: fetch status when active item changes ═══
  useEffect(() => {
    if (!activeAuction || !user || isSeller) { setHasActiveMaxBid(false); return }
    const fetchMaxBidStatus = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        if (!token) return
        const resp = await apiFetch(`/api/items/${activeAuction.id}/max-bid`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.ok) {
          const data = await resp.json()
          setHasActiveMaxBid(!!data.active)
        } else {
          setHasActiveMaxBid(false)
        }
      } catch { setHasActiveMaxBid(false) }
    }
    fetchMaxBidStatus()
  }, [activeAuction?.id, user, isSeller])

  // ═══ MAX-BID: place or cancel ═══
  const handleMaxBidSubmit = async () => {
    if (!activeAuction || !user) return
    const amount = parseFloat(maxBidAmount)
    if (isNaN(amount) || amount <= activeAuction.current_price) return
    setMaxBidLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { setMaxBidLoading(false); return }
      const resp = await apiFetch(`/api/items/${activeAuction.id}/max-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ max_amount: amount }),
      })
      if (resp.ok) {
        setHasActiveMaxBid(true)
        setShowMaxBidModal(false)
        setMaxBidAmount('')
        showToast(ct.maxBidActive)
      }
    } catch { /* ignore */ }
    setMaxBidLoading(false)
  }

  // ═══ PRE-BID: place ═══
  const handlePreBidSubmit = async () => {
    if (!preBidItemId || !user) return
    const amount = parseFloat(preBidAmount)
    if (isNaN(amount) || amount <= 0) return
    setPreBidLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { setPreBidLoading(false); return }
      const resp = await apiFetch(`/api/items/${preBidItemId}/pre-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      })
      if (resp.ok) {
        setPreBidItems(prev => new Set(prev).add(preBidItemId))
        setShowPreBidModal(false)
        setPreBidItemId(null)
        setPreBidAmount('')
        showToast(ct.preBidPlaced)
      } else {
        const body = await resp.json().catch(() => ({}))
        if (body.error === 'card_required') {
          alert(ct.addCardFirst)
        } else if (body.error === 'amount_below_starting_price') {
          const min = money(body.min)
          alert(tr({
            en: `Your pre-bid must be at least ${min}`,
            fr: `Ta pré-enchère doit être d'au moins ${min}`,
            es: `Tu puja previa debe ser de al menos ${min}`,
            ru: `Предварительная ставка должна быть не меньше ${min}`,
            he: `הצעת המחיר המוקדמת חייבת להיות לפחות ${min}`,
          }))
        } else {
          alert(ct.preBidFailed)
        }
      }
    } catch (e: unknown) {
      console.error('Pre-bid submit error:', e)
    }
    setPreBidLoading(false)
  }

  // ═══ BUNDLING: count items bought in this stream ═══
  useEffect(() => {
    if (!id || !user || isSeller) return
    const fetchBoughtCount = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        if (!token) return
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('buyer_id', user.id)
          .eq('stream_id', id)
          .in('status', ['paid', 'preparing', 'shipped', 'handed_over', 'delivered'])
        setBoughtItemCount(count || 0)
      } catch { /* ignore */ }
    }
    fetchBoughtCount()
  }, [id, user, isSeller, paymentSuccess])

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
      const { error: endError } = await supabase
        .from('streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (endError) {
        console.error('[StreamView] end stream failed:', endError.message)
        showToast(ct.endStreamFailed)
      }
    }

    setShowEndConfirm(false)
    navigate(`/live-recap/${id}`)
  }

  // Choix retrait / poste enregistré par le serveur → on prépare le paiement du total (port inclus)
  const handleDeliveryConfirmed = async (result: { method?: string; shippingCost: number; totalAmount: number; currency: string }) => {
    if (!paymentOrder) return
    setPaymentTotals({
      amount: Number(paymentOrder.amount),
      shipping: result.shippingCost,
      total: result.totalAmount,
      currency: result.currency,
      method: result.method,
    })
    setClientSecret(null)
    setPaymentError(null)
    setDeliveryStep(false)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        setPaymentError(ct.authError)
        return
      }
      const resp = await apiFetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: paymentOrder.id, promo_code: localStorage.getItem('shapop_promo_code') || undefined }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        if (import.meta.env.DEV) console.error('PaymentIntent error:', err)
        setPaymentError(ct.paymentInitFailed)
        return
      }
      const piData = await resp.json()
      if (typeof piData.total_amount === 'number') {
        setPaymentTotals(prev => prev ? { ...prev, total: piData.total_amount } : prev)
      }
      if (piData.auto_charged) {
        // Carte enregistrée débitée automatiquement
        setPaymentSuccess(true)
      } else if (piData.client_secret) {
        setClientSecret(piData.client_secret)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('PaymentIntent error:', err)
      setPaymentError(ct.paymentInitFailed)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // Confirm with our server (server checks directly with Stripe API)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (token && paymentOrder) {
        const resp = await apiFetch('/api/stripe/confirm-payment', {
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
        if (!resp.ok) {
          showToast(ct.paymentConfirmFailed)
          console.error('Server payment confirmation failed with status:', resp.status)
        }
      }
    } catch (err) {
      // Even if server confirm fails, Stripe already processed the payment
      showToast(ct.paymentConfirmFailed)
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
    setDeliveryStep(true)
    setPaymentTotals(null)
  }

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <div
          role="status"
          aria-label={ct.loadingStream}
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
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: '20px' }}>
        <p style={{ fontSize: 'calc(18px * var(--fs, 1))', color: '#666' }}>{ct.streamNotFound}</p>
        <button
          onClick={retryFetchStream}
          style={{
            marginTop: '16px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#E8344E', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {ct.retry}
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '8px', padding: '12px 24px', borderRadius: '100px',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)',
            border: 'none', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {ct.close}
        </button>
      </div>
    )
  }

  return (
    <div className="no-theme-invert" style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      {/* Fullscreen video container */}
      <div style={{ position: 'absolute', inset: 0 }}>

            {/* ═══ SELLER VIEW: Live camera ═══ */}
            {isSeller && isLive && (
              <video
                ref={videoRef}
                poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
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
                  isMultiView ? (
                    /* ═══ MULTI-VIEW GRID ═══ */
                    <div style={{
                      width: '100%', height: '100%', position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: multiViewStreams.length >= 2 ? '1fr 1fr' : '1fr',
                      gridTemplateRows: multiViewStreams.length >= 2 ? '1fr 1fr' : '1fr 1fr',
                      gap: '2px',
                      backgroundColor: '#000',
                    }}>
                      {/* Build all cells: main (index 0) + additional streams */}
                      {[
                        { cellIdx: 0, lkUrl: viewerLkUrl, lkToken: viewerLkToken, name: sellerName, streamId: id || '', item: activeAuction ? { id: activeAuction.id, title: activeAuction.title, current_price: activeAuction.current_price, starting_price: activeAuction.starting_price, image_url: activeAuction.image_urls?.[0] } : null, isMain: true, currency: priceCurrency },
                        ...multiViewStreams.map((ms, idx) => ({ cellIdx: idx + 1, lkUrl: ms.lkUrl, lkToken: ms.lkToken, name: ms.sellerName, streamId: ms.id, item: multiStreamItems[ms.id] || null, isMain: false, currency: currencyForCountry(ms.sellerCountry ?? profile?.country) })),
                      ].map((cell) => (
                        <div
                          key={cell.streamId}
                          onClick={() => { setActiveMultiIdx(cell.cellIdx); setViewerMuted(false) }}
                          style={expandedMultiIdx === cell.cellIdx ? {
                            position: 'absolute', inset: 0, zIndex: 6, overflow: 'hidden', backgroundColor: '#000',
                          } : {
                            position: 'relative', overflow: 'hidden',
                            border: activeMultiIdx === cell.cellIdx ? '2px solid #E8344E' : '2px solid transparent',
                            borderRadius: '4px',
                            visibility: expandedMultiIdx !== null ? 'hidden' : 'visible',
                          }}
                        >
                          {/* Plein écran / retour à la grille */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              hapticTap()
                              if (expandedMultiIdx === cell.cellIdx) {
                                setExpandedMultiIdx(null)
                              } else {
                                setExpandedMultiIdx(cell.cellIdx)
                                setActiveMultiIdx(cell.cellIdx)
                                setViewerMuted(false)
                              }
                            }}
                            aria-label={expandedMultiIdx === cell.cellIdx ? ct.backToGrid : ct.expandCell}
                            style={{
                              position: 'absolute', zIndex: 9,
                              // Grille : en bas de la case (le haut est sous la barre d'état) ; plein écran : sous la pastille « aperçu gratuit »
                              ...(expandedMultiIdx === cell.cellIdx
                                ? { top: 'calc(env(safe-area-inset-top, 0px) + 104px)' }
                                : { bottom: '52px' }),
                              left: '50%', transform: 'translateX(-50%)', // i18n-ignore (centrage)
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '100px', border: 'none',
                              backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                              fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              {expandedMultiIdx === cell.cellIdx
                                ? <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>
                                : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
                            </svg>
                            {expandedMultiIdx === cell.cellIdx ? ct.backToGrid : ct.expandCell}
                          </button>
                          <LiveKitViewer
                            livekitUrl={cell.lkUrl}
                            livekitToken={cell.lkToken}
                            muted={activeMultiIdx !== cell.cellIdx || viewerMuted}
                            style={{ width: '100%', height: '100%' }}
                            onDisconnected={cell.isMain ? handleViewerDisconnected : undefined}
                          />

                          {/* X button — close this cell */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (cell.isMain) {
                                setMultiViewStreams([]); setActiveMultiIdx(0); setExpandedMultiIdx(null)
                              } else {
                                removeMultiStream(cell.cellIdx - 1); setExpandedMultiIdx(null)
                              }
                            }}
                            style={{
                              position: 'absolute', top: '6px', insetInlineStart: '6px',
                              width: '26px', height: '26px', borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', zIndex: 10,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>

                          {/* Giveaway mini banner inside each cell */}
                          {(() => {
                            // Get giveaway data for this cell's stream
                            const cellGw = cell.isMain ? (activeGiveaway && activeGiveaway.status === 'active' ? { id: activeGiveaway.id, prize_description: activeGiveaway.prize_description, entry_count: activeGiveaway.entry_count, status: activeGiveaway.status } : null) : (multiStreamGiveaways[cell.streamId]?.status === 'active' ? multiStreamGiveaways[cell.streamId] : null)
                            const cellEntered = cell.isMain ? hasEnteredGiveaway : (multiStreamGiveawayEntered[cell.streamId] || false)
                            if (!cellGw) return null
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!cellEntered && user) {
                                    if (cell.isMain) handleEnterGiveaway()
                                    else handleMultiGiveawayEnter(cell.streamId)
                                  }
                                }}
                                style={{
                                  position: 'absolute', top: cell.cellIdx === 0 ? 'calc(env(safe-area-inset-top, 47px) + 44px)' : '36px', insetInlineStart: '6px', insetInlineEnd: '42px',
                                  zIndex: 12,
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  padding: '6px 10px',
                                  background: cellEntered
                                    ? 'rgba(0,0,0,0.7)'
                                    : 'linear-gradient(135deg, rgba(30,20,0,0.95), rgba(10,10,12,0.95))',
                                  border: cellEntered ? '1px solid rgba(255,215,0,0.35)' : '2px solid rgba(255,215,0,0.7)',
                                  borderRadius: '10px',
                                  cursor: cellEntered ? 'default' : 'pointer',
                                  boxShadow: cellEntered ? 'none' : '0 2px 12px rgba(255,215,0,0.25)',
                                  animation: cellEntered ? 'none' : 'giftBadgePulse 2s ease-in-out infinite',
                                }}
                              >
                                <span style={{ fontSize: 'calc(16px * var(--fs, 1))', flexShrink: 0 }}>🎁</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800, color: '#FFD700', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cellEntered ? ct.giftEntered : ct.giftTitle}
                                  </p>
                                  <p style={{ fontSize: 'calc(9px * var(--fs, 1))', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                                    {countLabel(cellGw.entry_count, 'participants')}
                                  </p>
                                </div>
                                {!cellEntered && user && (
                                  <span style={{
                                    fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800, color: '#000',
                                    padding: '4px 10px', borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                  }}>
                                    {ct.giftEnter}
                                  </span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Mini SOLD / UNSOLD animation inside cell — main uses soldAnimation, others use multiStreamSold */}
                          {(cell.isMain ? soldAnimation : multiStreamSold[cell.streamId]) && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              zIndex: 15, pointerEvents: 'none',
                              animation: 'soldFadeIn 0.3s ease',
                            }}>
                              <p style={{
                                fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 900,
                                color: (cell.isMain ? soldAnimation?.isUnsold : multiStreamSold[cell.streamId]?.isUnsold) ? '#FF9632' : '#22C55E',
                                textShadow: (cell.isMain ? soldAnimation?.isUnsold : multiStreamSold[cell.streamId]?.isUnsold)
                                  ? '0 0 20px rgba(255,150,50,0.6)'
                                  : '0 0 20px rgba(34,197,94,0.6)',
                                animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                margin: 0,
                              }}>
                                {(cell.isMain ? soldAnimation?.isUnsold : multiStreamSold[cell.streamId]?.isUnsold) ? ct.unsoldBang : ct.soldBang}
                              </p>
                              {!(cell.isMain ? soldAnimation?.isUnsold : multiStreamSold[cell.streamId]?.isUnsold) && (cell.isMain ? soldAnimation?.winner : multiStreamSold[cell.streamId]?.winner) && (
                                <p style={{
                                  fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '4px 0 0',
                                  animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s both',
                                }}>
                                  @{(cell.isMain ? soldAnimation?.winner : multiStreamSold[cell.streamId]?.winner)} — {money(cell.isMain ? soldAnimation?.price : multiStreamSold[cell.streamId]?.price, cell.currency)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Mini giveaway winner inside cell */}
                          {(() => {
                            const cellWinner = cell.isMain ? giveawayWinner : multiStreamGiveawayWinner[cell.streamId]
                            if (!cellWinner) return null
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (cell.isMain) setGiveawayWinner(null)
                                  else setMultiStreamGiveawayWinner(prev => ({ ...prev, [cell.streamId]: null }))
                                }}
                                style={{
                                  position: 'absolute', inset: 0,
                                  display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center',
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                                  zIndex: 15, cursor: 'pointer',
                                  animation: 'soldFadeIn 0.4s ease',
                                }}
                              >
                                <div style={{ fontSize: 'calc(32px * var(--fs, 1))', animation: 'giftSpinViewer 1s ease-out' }}>🎁</div>
                                <p style={{
                                  fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 900, color: '#FFD700',
                                  textShadow: '0 2px 12px rgba(255,215,0,0.5)',
                                  margin: '8px 0 0', textAlign: 'center',
                                }}>
                                  {cellWinner.name}
                                </p>
                                <p style={{
                                  fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600, color: '#fff',
                                  opacity: 0.8, margin: '4px 0 0',
                                }}>
                                  {ct.giftWinner}
                                </p>
                              </div>
                            )
                          })()}

                          {/* Mini "Tu as gagné" banner inside cell — tap to open payment */}
                          {cell.isMain && pendingWonItem && !showPaymentModal && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                setPendingWonItem(null)
                                setShowPaymentModal(true)
                              }}
                              style={{
                                position: 'absolute', bottom: '60px', insetInlineStart: '6px', insetInlineEnd: '40px',
                                zIndex: 16,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                border: '1px solid rgba(255,255,255,0.3)',
                              }}
                            >
                              <span style={{ fontSize: 'calc(18px * var(--fs, 1))' }}>🏆</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                                  {ct.youWon}
                                </p>
                                <p style={{ fontSize: 'calc(9px * var(--fs, 1))', fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {displayItemTitle(pendingWonItem.title)} — {money(pendingWonItem.price)}
                                </p>
                              </div>
                              <span style={{
                                fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800, color: '#fff',
                                padding: '4px 10px', borderRadius: '8px',
                                backgroundColor: 'rgba(255,255,255,0.25)',
                                whiteSpace: 'nowrap', flexShrink: 0,
                              }}>
                                {ct.payNow}
                              </span>
                            </div>
                          )}

                          {/* Sidebar buttons — right side */}
                          <div style={{
                            position: 'absolute', insetInlineEnd: '5px', top: '50%', transform: 'translateY(-50%)',
                            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10,
                          }}>
                            {/* Like */}
                            <button onClick={(e) => {
                              e.stopPropagation()
                              hapticTap()
                              setLikedCells(prev => ({ ...prev, [cell.streamId]: !prev[cell.streamId] }))
                            }} style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill={likedCells[cell.streamId] ? '#E8344E' : 'none'} stroke={likedCells[cell.streamId] ? '#E8344E' : '#fff'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                            </button>
                            {/* Share */}
                            <button onClick={(e) => {
                              e.stopPropagation()
                              hapticTap()
                              const shareUrl = `https://shapop.com/stream/${cell.streamId}`
                              const shareTitle = fill(ct.shareTitle, { name: cell.name })
                              const shareText = `${fill(ct.shareText, { name: cell.name })} 🔴\n${shareUrl}`
                              const doShare = async () => {
                                try {
                                  await Share.share({ title: shareTitle, text: shareText, url: shareUrl, dialogTitle: shareTitle })
                                } catch {
                                  try { await navigator.clipboard.writeText(shareUrl); showToast(ct.linkCopied) } catch { /* ignore */ }
                                }
                              }
                              doShare()
                            }} style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                            </button>
                            {/* Home — go back to home page */}
                            <button onClick={(e) => {
                              e.stopPropagation()
                              hapticTap()
                              navigate('/')
                            }} style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            </button>
                            {/* Wallet */}
                            <button onClick={(e) => { e.stopPropagation(); hapticTap(); setShowWallet(true) }} style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                            </button>
                            {/* Mute/Unmute — toggle sound for active cell */}
                            <button onClick={(e) => {
                              e.stopPropagation()
                              hapticTap()
                              if (activeMultiIdx === cell.cellIdx) {
                                setViewerMuted(prev => !prev)
                              } else {
                                setActiveMultiIdx(cell.cellIdx)
                                setViewerMuted(false)
                              }
                            }} style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              backgroundColor: (activeMultiIdx === cell.cellIdx && !viewerMuted) ? 'rgba(0,0,0,0.55)' : 'rgba(232,52,78,0.6)',
                              border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                              {(activeMultiIdx !== cell.cellIdx || viewerMuted) ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/>
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Bottom overlay — seller name + full bid controls */}
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            zIndex: 8,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7) 80%, transparent)',
                            padding: '12px 6px 6px',
                            pointerEvents: 'auto',
                          }}>
                            {/* Seller name row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                              {activeMultiIdx === cell.cellIdx && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="#E8344E" stroke="none">
                                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                                  <path d="M19.07 4.93a10 10 0 010 14.14" fill="none" stroke="#E8344E" strokeWidth="2"/>
                                </svg>
                              )}
                              <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.name}</span>
                            </div>
                            {cell.item ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {/* Item info row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {cell.item.image_url && (
                                    <img src={cell.item.image_url} alt="" loading="lazy" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
                                  )}
                                  <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayItemTitle(cell.item.title)}</span>
                                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: '#F0908A', flexShrink: 0 }}>{money(cell.item.current_price, cell.currency)}</span>
                                </div>
                                {/* Bid button — full width */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (cell.isMain) handlePlaceBid()
                                    else handleMultiBid(cell.streamId)
                                  }}
                                  disabled={!cell.isMain && multiBidLoading === cell.streamId}
                                  style={{
                                    width: '100%', padding: '7px 0', borderRadius: '100px', border: 'none',
                                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                                    color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 800, cursor: 'pointer',
                                  }}
                                >
                                  {(!cell.isMain && multiBidLoading === cell.streamId) ? '...' : `${ct.bid} ${money(cell.item.current_price + 1, cell.currency)}`}
                                </button>
                                {/* Enchère max + MAX — second row, all cells */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (cell.isMain && activeAuction) {
                                        setMaxBidAmount(String(activeAuction.current_price + 10)); setShowMaxBidModal(true)
                                      } else if (!cell.isMain && cell.item) {
                                        // For non-main cells, bid +10 directly
                                        hapticTap()
                                        const bidItem = multiStreamItems[cell.streamId]
                                        if (bidItem) {
                                          const highBid = bidItem.current_price + 10
                                          ;(async () => {
                                            try {
                                              const { data: session } = await supabase.auth.getSession()
                                              const token = session?.session?.access_token
                                              if (!token) return
                                              await apiFetch(`/api/items/${bidItem.id}/bid`, {
                                                method: 'POST',
                                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ amount: highBid }),
                                              })
                                            } catch { /* ignore */ }
                                          })()
                                        }
                                      }
                                    }}
                                    style={{
                                      flex: 1, padding: '5px 0', borderRadius: '100px',
                                      border: '1px solid rgba(139,92,246,0.4)',
                                      backgroundColor: 'rgba(139,92,246,0.15)',
                                      color: '#8B5CF6', fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800, cursor: 'pointer',
                                    }}
                                  >
                                    {ct.maxBidTitle}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      hapticTap()
                                      if (cell.isMain && activeAuction) {
                                        setBidAmount(String(activeAuction.current_price + 50))
                                        setTimeout(() => handlePlaceBid(), 50)
                                      } else if (!cell.isMain && cell.item) {
                                        const bidItem = multiStreamItems[cell.streamId]
                                        if (bidItem) {
                                          const maxBid = bidItem.current_price + 50
                                          ;(async () => {
                                            try {
                                              const { data: session } = await supabase.auth.getSession()
                                              const token = session?.session?.access_token
                                              if (!token) return
                                              await apiFetch(`/api/items/${bidItem.id}/bid`, {
                                                method: 'POST',
                                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ amount: maxBid }),
                                              })
                                            } catch { /* ignore */ }
                                          })()
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '5px 12px', borderRadius: '100px',
                                      border: '1px solid rgba(255,215,0,0.3)',
                                      backgroundColor: 'rgba(255,215,0,0.15)',
                                      color: '#FFD700', fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                                    }}
                                  >
                                    {ct.maxShort}
                                  </button>
                                </div>
                              </div>
                            ) : (() => {
                              /* Pre-bid or waiting */
                              const nextItem = cell.isMain ? upcomingItems.find(i => i.id !== activeAuction?.id) : null
                              // For non-main cells: no pre-bid data available, show waiting
                              if (nextItem) return (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPreBidItemId(nextItem.id); setPreBidAmount(''); setShowPreBidModal(true)
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '6px 8px', borderRadius: '8px',
                                    backgroundColor: 'rgba(59,130,246,0.5)',
                                    border: '1px solid rgba(59,130,246,0.4)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <p style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#fff', margin: 0, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {displayItemTitle(nextItem.title)} — {money(nextItem.starting_price)}
                                  </p>
                                  <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#fff', padding: '4px 10px', borderRadius: '6px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {ct.preBid}
                                  </span>
                                </div>
                              )
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 0' }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F0908A', animation: 'waitingPulse 1.5s ease-in-out infinite' }} />
                                  <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{ct.waitingNextItem}</span>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ═══ SINGLE VIEW ═══ */
                    <>
                      <LiveKitViewer
                        livekitUrl={viewerLkUrl}
                        livekitToken={viewerLkToken}
                        muted={viewerMuted}
                        style={{ width: '100%', height: '100%' }}
                        onDisconnected={handleViewerDisconnected}
                      />
                      {/* Co-host join button */}
                      {isCohost && isLive && (
                        <button
                          onClick={() => navigate(`/live-seller/${id}`)}
                          style={{
                            position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
                            left: '50%', transform: 'translateX(-50%)', zIndex: 30, // i18n-ignore (centrage)
                            padding: '10px 20px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                            color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
                          }}
                        >
                          {ct.joinCohost}
                        </button>
                      )}
                      {/* Unmute button */}
                      {viewerMuted && (
                        <button
                          onClick={() => setViewerMuted(false)}
                          aria-label={ct.unmuteViewer}
                          style={{
                            position: 'absolute',
                            bottom: '16px', insetInlineStart: '16px',
                            padding: '8px 16px',
                            borderRadius: '100px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
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
                  )
                ) : (
                  /* Fallback: thumbnail or animated placeholder */
                  <>
                    {stream.thumbnail_url ? (
                      <img
                        src={stream.thumbnail_url}
                        alt=""
                        loading="lazy"
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
                        <span style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 800, color: '#E8344E', letterSpacing: '2px' }}>
                          {ct.liveNow}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '40px', padding: '0 12px' }}>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={`wave-bar-${i}`}
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
                        <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: 'rgba(255,255,255,0.7)', fontWeight: 500, margin: 0 }}>
                          {ct.connectedTo} <span style={{ color: '#F0908A', fontWeight: 700 }}>{sellerName}</span>
                        {sellerScore != null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px', marginInlineStart: '6px',
                            backgroundColor: 'rgba(240,144,138,0.15)', padding: '2px 6px', borderRadius: '6px',
                            fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#F0908A',
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
                              padding: '4px 12px', borderRadius: '8px', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
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
                      position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', ...rtlPos('left', '16px'),
                      zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none',
                      borderRadius: '50%', width: '40px', height: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{...rtlFlip()}}>
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
                        border: 'none', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
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
              <div className="absolute flex items-center gap-2" style={{ top: '16px', insetInlineStart: '16px', zIndex: 20 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #E8344E, #FF6B6B)',
                  padding: '5px 14px', borderRadius: '8px',
                  fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 800, color: '#fff',
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
                  fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  {countLabel(stream.viewer_count || 0, 'viewers')}
                </span>
              </div>
            )}

            {/* Viewer: top bar with back button + seller info + viewer count (hidden in multi-view) */}
            {!isSeller && !isMultiView && (
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
                    aria-label={ct.back}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{...rtlFlip()}}>
                      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <SellerProfileHeader
                    sellerId={stream.seller_id}
                    sellerName={sellerName}
                    sellerAvatar={sellerAvatar}
                    sellerScore={sellerScore}
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
                    aria-label={countLabel(stream.viewer_count || 0, 'viewers')}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      padding: '4px 10px', borderRadius: '100px',
                      fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#fff',
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
                  {/* Multi-view grid button */}
                  <button
                    onClick={() => { fetchAvailableLives(); setShowMultiPicker(true) }}
                    aria-label={ct.multiView}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      backgroundColor: isMultiView ? 'rgba(232,52,78,0.7)' : 'rgba(0,0,0,0.45)',
                      border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="9" y="1" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="1" y="9" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="9" y="9" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ═══ MULTI-VIEW TOP BAR ═══ */}
            {!isSeller && isMultiView && (
              <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
                left: '8px', right: '8px',
                zIndex: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <button
                  onClick={() => { setMultiViewStreams([]); setActiveMultiIdx(0); setExpandedMultiIdx(null) }}
                  aria-label={ct.exitMultiView}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{...rtlFlip()}}>
                    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '100px',
                    fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E8344E', animation: 'liveDot 1.5s ease-in-out infinite' }} />
                    {fill(ct.livesCount, { n: multiViewStreams.length + 1 })}
                  </span>
                  <button
                    onClick={() => { fetchAvailableLives(); setShowMultiPicker(true) }}
                    aria-label={ct.addLive}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      backgroundColor: 'rgba(232,52,78,0.7)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="9" y="1" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="1" y="9" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="9" y="9" width="6" height="6" rx="1" stroke="#fff" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>
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
                  <span style={{ color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700 }}>
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
                  fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff',
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
                      color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
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
                      color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
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
                aria-label={ct.engagementDashboard}
                aria-expanded={showEngagement}
                style={{
                  position: 'absolute',
                  top: '16px',
                  insetInlineEnd: '16px',
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
                  fontSize: 'calc(20px * var(--fs, 1))',
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

      {/* ═══ StreamSidebar (viewer only, right side, hidden in multi-view) ═══ */}
      {!isSeller && isLive && !isMultiView && (
        <div style={{
          position: 'absolute',
          insetInlineEnd: '8px',
          top: '18%',
          zIndex: 30,
          pointerEvents: 'auto',
        }}>
          <StreamSidebar
            streamId={stream.id}
            onShare={async () => {
              hapticTap()
              const shareUrl = `https://shapop.com/stream/${stream.id}`
              const sellerDisplayName = sellerName || 'ShaPop'
              const shareTitle = fill(ct.shareTitle, { name: sellerDisplayName })
              const shareText = `${fill(ct.shareText, { name: sellerDisplayName })}\n${shareUrl}`
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
                if (!videoEl || !videoEl.videoWidth) { showToast(ct.clipFailed); return }
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
                  await navigator.share({ files: [file], title: stream?.title || ct.clipTitle })
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
            onTipClick={PAID_EXTRAS_ENABLED ? () => { hapticTap(); setShowTipModal(true) } : undefined}
            onMoreClick={() => setShowMoreMenu(true)}
            lang={lang}
          />
        </div>
      )}

      {/* ═══ BOTTOM GRADIENT (hidden in multi-view) ═══ */}
      {!isMultiView && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3) 70%, transparent)',
          pointerEvents: 'none', zIndex: 5,
        }} />
      )}

      {/* ═══ BOTTOM OVERLAY: stream info + auction + chat + input (hidden in multi-view) ═══ */}
      {!isMultiView && (
      <div style={{
        position: 'absolute',
        bottom: activeAuction && !isSeller && isLive
          ? 'calc(env(safe-area-inset-bottom, 0px) + 80px + var(--kb, 0px))'
          : 'calc(env(safe-area-inset-bottom, 0px) + 4px + var(--kb, 0px))',
        left: '10px', right: '10px',
        zIndex: 15,
        display: 'flex', flexDirection: 'column', gap: '6px',
        transition: 'bottom 0.3s ease',
      }}>
        {/* Chat messages — last 5, WhatNot style: transparent, float up */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '75%' }}>
          {messages.filter(m => {
            const blocked = JSON.parse(localStorage.getItem('shapop_blocked_users') || '[]')
            return !blocked.includes(m.user_id)
          }).slice(-5).map((msg, i, arr) => {
            const sys = formatSystemMessage(msg.message)
            // Older messages fade out
            const opacity = i < arr.length - 3 ? 0.5 : i < arr.length - 1 ? 0.75 : 1
            if (sys) {
              return (
                <div key={msg.id} style={{
                  padding: '2px 0',
                  opacity,
                  animation: 'chatMsgIn 0.3s ease',
                }}>
                  <span style={{
                    fontSize: 'calc(12px * var(--fs, 1))', color: '#fff', fontWeight: 500,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>
                    {sys.withAuthor ? `${msg.user_profile?.display_name || ct.anonymous} ` : ''}{sys.text}
                  </span>
                </div>
              )
            }
            const isMod = moderatorIds.includes(msg.user_id)
            return (
              <div key={msg.id} style={{
                padding: '3px 0',
                opacity,
                animation: 'chatMsgIn 0.3s ease',
                cursor: canModerate ? 'pointer' : undefined,
              }}
                onContextMenu={canModerate ? (e) => { e.preventDefault(); setModMenuMsg(msg) } : undefined}
                onClick={canModerate ? () => setModMenuMsg(msg) : undefined}
              >
                {isMod && <span style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#60a5fa', marginInlineEnd: '4px', fontWeight: 700 }}>{ct.modBadge}</span>}
                <span style={{
                  fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 800, color: '#F0908A',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  marginInlineEnd: '6px',
                }}>
                  {msg.user_profile?.display_name || ct.anonymous}
                </span>
                <span style={{
                  fontSize: 'calc(13px * var(--fs, 1))',
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
                color: '#fff', fontSize: 'calc(13px * var(--fs, 1))',
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
                fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.send}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#666', margin: 0, textAlign: 'center' }}>{ct.loginToChat}</p>
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
                    loading="lazy"
                    style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <h3 style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayItemTitle(activeAuction.title)}</h3>
              </div>
              <div
                aria-live="polite"
                aria-label={`${ct.timeLeft}: ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
                style={{
                  fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800,
                  color: timeLeft <= 10 ? '#E8344E' : '#F0908A',
                  animation: timeLeft <= 10 ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#888', margin: '0 0 2px' }}>{ct.currentPrice}</p>
                <p style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, color: '#F0908A', margin: 0 }}>
                  {money(activeAuction.current_price)}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Stream title */}
        <div style={{
          padding: '6px 10px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stream.title}
          </p>
        </div>
      </div>
      )}

      {/* ActiveItemBar — top-level (single-view only, multi-view has in-cell controls) */}
      {activeAuction && !isSeller && isLive && !isMultiView && (
        <div id="active-item-bar">
          <ActiveItemBar
            item={activeAuction}
            bidAmount={bidAmount}
            onBidAmountChange={setBidAmount}
            onBid={handlePlaceBid}
            hasCard={hasCard}
            onAddCard={openCardSetup}
            disabled={timeLeft <= 0}
            timeLeft={timeLeft}
            lang={lang}
            currency={priceCurrency}
            onMaxBid={() => { setMaxBidAmount(String(activeAuction.current_price + 10)); setShowMaxBidModal(true) }}
            hasActiveMaxBid={hasActiveMaxBid}
            bundleCount={boughtItemCount}
            onBuyNow={activeAuction.buy_now_price ? handleBuyNow : undefined}
          />
        </div>
      )}

      {/* Waiting for next item — top-level (single-view only) */}
      {!activeAuction && !isSeller && isLive && !soldAnimation && !isMultiView && (
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
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: '#F0908A', animation: 'waitingPulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px' }}>
            {ct.waitingNextItem}
          </span>
        </div>
      )}

      {/* ═══ PRE-BID THIN BANNER (viewer, single-view only — multi-view has in-cell pre-bid) ═══ */}
      {!isSeller && isLive && !isMultiView && (() => {
        const nextItem = upcomingItems.find(i => i.id !== activeAuction?.id)
        if (!nextItem) return null
        return (
          <div
            onClick={() => { setPreBidItemId(nextItem.id); setPreBidAmount(''); setShowPreBidModal(true) }}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
              insetInlineStart: '8px', insetInlineEnd: '60px',
              zIndex: 205,
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59,130,246,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(59,130,246,0.6)',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#fff', margin: 0, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayItemTitle(nextItem.title)} — {money(nextItem.starting_price)}
            </p>
            <span style={{
              fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#fff',
              padding: '5px 12px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {ct.preBid}
            </span>
          </div>
        )
      })()}

      {/* ═══ GIVEAWAY BANNER (viewer, single-view only — multi-view has in-cell giveaway) ═══ */}
      {!isSeller && !isMultiView && activeGiveaway && activeGiveaway.status === 'active' && giveawayDismissedId !== activeGiveaway.id && (
        hasEnteredGiveaway ? (
          /* Collapsed pill after entry */
          <div style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            left: '50%', // i18n-ignore (centrage)
            transform: 'translateX(-50%)',
            zIndex: 210,
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
              <span style={{ fontSize: 'calc(14px * var(--fs, 1))' }}>🎁</span>
              <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#FFD700' }}>{ct.giftEntered}</span>
              <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                · {activeGiveaway.entry_count} 👥
              </span>
            </div>
          </div>
        ) : (
          /* Full card before entry */
          <div style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            left: '8px', right: '8px',
            zIndex: 210,
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
                <span style={{ fontSize: 'calc(36px * var(--fs, 1))', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>🎁</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 900, color: '#FFD700', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                    {ct.giftTitle}
                  </p>
                  <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#fff', margin: '3px 0 0', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
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
                <span style={{ fontSize: 'calc(20px * var(--fs, 1))' }}>👥</span>
                <span style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900, color: '#FFD700' }}>
                  {activeGiveaway.entry_count}
                </span>
                <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#ccc', fontWeight: 600 }}>
                  {countLabel(activeGiveaway.entry_count, 'participants').replace(/^\S+\s/, '')}
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
                    fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 900,
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

      {/* SOLD / UNSOLD animation overlay (full screen, single-view only) */}
      {/* Offre « acheter au prix minimum » au meilleur enchérisseur */}
      {reserveOffer && !soldAnimation && (
        <div className="no-theme-invert" style={{
          position: 'fixed', left: '12px', right: '12px', zIndex: 300,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
          backgroundColor: 'rgba(17,17,17,0.97)', border: '1.5px solid #F0908A', borderRadius: '18px',
          padding: '18px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{ct.reserveOfferTitle}</p>
            <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 900, color: '#F0908A', fontVariantNumeric: 'tabular-nums' }}>
              {Math.max(0, Math.ceil((reserveOffer.expiresAt - reserveOfferNow) / 1000))}s {/* i18n-ignore */}
            </span>
          </div>
          <p style={{ margin: '6px 0 4px', fontSize: 'calc(14px * var(--fs, 1))', color: 'rgba(255,255,255,0.75)' }}>{displayItemTitle(reserveOffer.title)}</p>
          <p style={{ margin: '0 0 14px', fontSize: 'calc(14px * var(--fs, 1))', color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>
            {fill(ct.reserveOfferBody, { price: money(reserveOffer.price) })}
          </p>
          <button onClick={handleBuyAtReserve} disabled={reserveOfferBusy} style={{
            width: '100%', height: '50px', borderRadius: '100px', border: 'none',
            background: 'linear-gradient(135deg, #F0908A, #E8344E)', color: '#fff',
            fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800, cursor: 'pointer', opacity: reserveOfferBusy ? 0.6 : 1,
          }}>
            {reserveOfferBusy ? '…' : fill(ct.reserveOfferBuy, { price: money(reserveOffer.price) })}
          </button>
          <button onClick={() => setReserveOffer(null)} style={{
            width: '100%', marginTop: '8px', height: '42px', borderRadius: '100px',
            border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)',
            fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
          }}>
            {ct.reserveOfferDecline}
          </button>
        </div>
      )}

      {soldAnimation && !isMultiView && (
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
            fontSize: 'calc(48px * var(--fs, 1))', fontWeight: 900,
            color: soldAnimation.isUnsold ? '#FF9632' : '#22C55E',
            textShadow: soldAnimation.isUnsold
              ? '0 0 40px rgba(255,150,50,0.6)'
              : '0 0 40px rgba(34,197,94,0.6)',
            animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            margin: 0,
          }}>
            {soldAnimation.isUnsold ? ct.unsoldBang : ct.soldBang}
          </p>
          {soldAnimation.isUnsold && soldAnimation.reason && (
            <p style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '10px 0 0', textAlign: 'center' }}>
              {soldAnimation.reason}
            </p>
          )}
          {soldAnimation.isUnsold && soldAnimation.detail && (
            <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: 'rgba(255,255,255,0.85)', margin: '6px 24px 0', textAlign: 'center', lineHeight: 1.35 }}>
              {soldAnimation.detail}
            </p>
          )}
          {!soldAnimation.isUnsold && soldAnimation.winner && (
            <p style={{
              fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '8px 0 0',
              animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s both',
            }}>
              @{soldAnimation.winner} — {money(soldAnimation.price)}
            </p>
          )}
          {soldAnimation.isUnsold && soldAnimation.price > 0 && (
            <p style={{
              fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0',
              animation: 'soldPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.15s both',
            }}>
              {money(soldAnimation.price)}
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
                <h3 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#22C55E', margin: '0 0 8px' }}>
                  {ct.paymentSuccess}
                </h3>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', margin: '0 0 24px' }}>
                  {ct.paymentSuccessDesc}
                </p>
                {paymentOrder && (
                  <button
                    onClick={() => { const oid = paymentOrder.id; handleClosePayment(); navigate(`/order/${oid}`) }}
                    style={{
                      width: '100%', padding: '14px', marginBottom: '10px',
                      backgroundColor: 'transparent', border: '1px solid #333', borderRadius: '14px',
                      color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {ft(lang).view_order}
                  </button>
                )}
                <button
                  onClick={handleClosePayment}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
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
                <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                  {ct.youWon}
                </h3>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', margin: 0 }}>
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
                  <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#E8344E', margin: 0 }}>{paymentError}</p>
                </div>
                <button
                  onClick={handleClosePayment}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.close}
                </button>
              </div>
            ) : deliveryStep && paymentOrder ? (
              /* Étape 1 : retrait en main propre ou envoi par la poste */
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
                    <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {ct.youWon}
                    </h3>
                    {paymentItem && (
                      <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '2px 0 0' }}>{displayItemTitle(paymentItem.title)}</p>
                    )}
                  </div>
                </div>
                {winCardDeclined && (
                  <div role="alert" style={{ padding: '10px 12px', marginBottom: '14px', borderRadius: '12px', backgroundColor: 'rgba(232,52,78,0.12)', border: '1px solid rgba(232,52,78,0.4)' }}>
                    <p style={{ margin: 0, fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800, color: '#E8344E' }}>{ct.winCardDeclined}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--fs, 1))', color: '#ddd' }}>{ct.winCardDeclinedHint}</p>
                  </div>
                )}
                <DeliveryChoice orderId={paymentOrder.id} onConfirmed={handleDeliveryConfirmed} hasSavedCard={hasCard === true} />
              </>
            ) : (
              /* Step 2: Payment */
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                        {ct.payToClaim}
                      </h3>
                      {paymentItem && (
                        <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: 0 }}>{displayItemTitle(paymentItem.title)}</p>
                      )}
                    </div>
                    <div style={{
                      padding: '8px 16px', borderRadius: '12px',
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                      <p style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#22C55E', margin: 0 }}>
                        {paymentTotals ? formatMoney(paymentTotals.total, paymentTotals.currency) : ''}
                      </p>
                    </div>
                  </div>
                  {/* Détail : article + frais de port si envoi par la poste (payés maintenant) */}
                  {paymentTotals && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888' }}>{ft(lang).item_price}</span>
                        <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#fff', fontWeight: 600 }}>{formatMoney(paymentTotals.amount, paymentTotals.currency)}</span>
                      </div>
                      {/* Frais de port : masqués en main propre */}
                      {paymentTotals.method !== 'pickup' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#888' }}>{ft(lang).shipping_fee}</span>
                          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#F0908A', fontWeight: 600 }}>{formatMoney(paymentTotals.shipping, paymentTotals.currency)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                        <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#fff', fontWeight: 700 }}>{ft(lang).total}</span>
                        <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#22C55E', fontWeight: 700 }}>{formatMoney(paymentTotals.total, paymentTotals.currency)}</span>
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
                    <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#E8344E', margin: 0 }}>{paymentError}</p>
                  </div>
                )}

                {clientSecret ? (
                  <Elements
                    stripe={getStripePromise()}
                    options={{
                      clientSecret,
                      locale: lang,
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
                  onClick={() => { setClientSecret(null); setPaymentError(null); setDeliveryStep(true) }}
                  style={{
                    width: '100%', marginTop: '12px', padding: '12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #333', borderRadius: '12px',
                    color: '#888', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-block', ...rtlFlip() }}>←</span> {ft(lang).choose_delivery}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Card setup modal */}
      {!isSeller && previewEndsAt != null && !previewExpired && (
        <PreviewCountdown endsAt={previewEndsAt} />
      )}
      {!isSeller && previewExpired && (
        <PreviewCardWall onAddCard={openCardSetup} onLeave={() => navigate(-1)} />
      )}

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
                <h3 style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#22C55E', margin: '0 0 8px' }}>
                  {ct.cardSaved}
                </h3>
                <p style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#888', margin: '0 0 24px' }}>
                  {ct.cardSavedDesc}
                </p>
                <button
                  onClick={() => { setShowCardModal(false); setCardSuccess(false) }}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                    borderRadius: '14px', border: 'none',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
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
                    <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {ct.addCardTitle}
                    </h3>
                    <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '2px 0 0' }}>
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
                    <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#E8344E', margin: 0 }}>{cardError}</p>
                  </div>
                )}

                {setupClientSecret ? (
                  <Elements stripe={getStripePromise()} options={{ locale: lang }}>
                    <SetupCardFormInner
                      clientSecret={setupClientSecret}
                      onSuccess={() => {
                        setCardSuccess(true)
                        setHasCard(true)
                        setCardLoading(false)
                        // Spectateur en aperçu gratuit : nouveau jeton sans limite, le direct reprend
                        if (previewExpired || previewEndsAtRef.current != null) {
                          setPreviewEndsAt(null)
                          setPreviewExpired(false)
                          setLkTokenNonce(n => n + 1)
                        }
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
                    color: '#888', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
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
              maxHeight: '80vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#333' }} />
            </div>
            <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 20px', textAlign: 'center' }}>
              {ct.walletTitle}
            </h3>

            {/* Adresse pour les envois par la poste */}
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
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>{ct.walletAddress}</p>
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '2px 0 0' }}>
                  {walletAddress ? `${walletAddress.street}, ${walletAddress.zip} ${walletAddress.city}` : ct.walletNoAddress}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
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
                <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: 0 }}>{ct.walletPayment}</p>
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '2px 0 0' }}>
                  {walletCard ? `${(walletCard.brand || ct.card).toUpperCase()} **** ${walletCard.last4}` : ct.walletNoCard}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Code promo */}
            <div style={{ padding: '14px 0' }}>
              <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>{ct.walletPromo}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoDiscount(null) }}
                  placeholder={ct.walletPromoPlaceholder}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: '10px',
                    backgroundColor: '#0A0A0A',
                    border: `1px solid ${promoStatus === 'valid' ? '#22C55E' : promoStatus === 'invalid' ? '#EF4444' : '#333'}`,
                    color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', outline: 'none',
                  }}
                />
                <button
                  onClick={async () => {
                    if (!promoCode.trim()) return
                    hapticTap()
                    setPromoStatus('validating')
                    try {
                      const { data: session } = await supabase.auth.getSession()
                      const resp = await apiFetch('/api/promo-codes/validate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.session?.access_token}` },
                        body: JSON.stringify({ code: promoCode.trim() }),
                      })
                      const data = await resp.json()
                      if (data.valid) {
                        setPromoStatus('valid')
                        setPromoDiscount({ percent: data.discount_percent, type: data.discount_type })
                        localStorage.setItem('shapop_promo_code', promoCode.trim())
                      } else {
                        setPromoStatus('invalid')
                        setPromoDiscount(null)
                        localStorage.removeItem('shapop_promo_code')
                      }
                    } catch {
                      setPromoStatus('invalid')
                    }
                  }}
                  disabled={!promoCode.trim() || promoStatus === 'validating'}
                  style={{
                    padding: '12px 20px', borderRadius: '10px',
                    background: promoCode.trim() && promoStatus !== 'validating' ? 'linear-gradient(135deg, #F0908A, #E8344E)' : '#333',
                    border: 'none', color: '#fff', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                    cursor: promoCode.trim() && promoStatus !== 'validating' ? 'pointer' : 'not-allowed',
                  }}
                >
                  {promoStatus === 'validating' ? '...' : ct.walletApply}
                </button>
              </div>
              {promoStatus === 'valid' && promoDiscount && (
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#22C55E', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  -{promoDiscount.percent}% {promoDiscount.type === 'item' ? ct.promoOnPrice : promoDiscount.type === 'commission' ? ct.promoOnCommission : ''}
                </p>
              )}
              {promoStatus === 'invalid' && (
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#EF4444', margin: '6px 0 0' }}>
                  {ct.promoInvalid}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TIP MODAL ═══ */}
      {showTipModal && (
        <div
          onClick={() => setShowTipModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px',
              backgroundColor: '#1a1a1a',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', textAlign: 'center', margin: '0 0 16px' }}>
              {ct.tipTitle}
            </h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {[1, 2, 5, 10].map(amount => (
                <button
                  key={amount}
                  disabled={tipSending}
                  onClick={() => handleSendTip(amount)}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    borderRadius: '14px',
                    border: '2px solid rgba(255,215,0,0.4)',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.15))',
                    color: '#FFD700',
                    fontSize: 'calc(18px * var(--fs, 1))',
                    fontWeight: 800,
                    cursor: tipSending ? 'default' : 'pointer',
                    opacity: tipSending ? 0.5 : 1,
                  }}
                >
                  {formatMoney(amount, 'EUR')}{/* i18n-ignore : le serveur débite le pourboire en euros (routes/items.ts) */}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODERATION MENU ═══ */}
      {modMenuMsg && canModerate && (
        <div
          onClick={() => setModMenuMsg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px',
              backgroundColor: '#1a1a1a',
              borderRadius: '20px 20px 0 0',
              padding: '16px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            }}
          >
            {/* Message preview */}
            <div style={{ padding: '10px 14px', backgroundColor: '#111', borderRadius: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#F0908A' }}>
                {modMenuMsg.user_profile?.display_name || ct.anonymous}
              </span>
              <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#ccc', margin: '4px 0 0', wordBreak: 'break-word' }}>
                {modMenuMsg.message}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => handleDeleteMessage(modMenuMsg.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                {ct.modDelete}
              </button>

              {modMenuMsg.user_id !== user?.id && (
                <>
                  <button
                    onClick={() => handleTimeoutUser(modMenuMsg.user_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                      color: '#fbbf24', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {ct.modTimeout}
                  </button>

                  {stream?.seller_id === user?.id && !moderatorIds.includes(modMenuMsg.user_id) && (
                    <button
                      onClick={() => handleMakeMod(modMenuMsg.user_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        width: '100%', padding: '14px 16px', borderRadius: '12px',
                        background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                        color: '#60a5fa', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      {ct.modMake}
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => setModMenuMsg(null)}
              style={{
                width: '100%', padding: '14px', marginTop: '10px',
                borderRadius: '12px', background: '#222', border: 'none',
                color: '#888', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {ct.close}
            </button>
          </div>
        </div>
      )}

      {/* ═══ MORE MENU ═══ */}
      {showReport && stream && (
        <ReportSheet
          reportedId={stream.seller_id}
          streamId={stream.id}
          itemId={activeAuction?.id || null}
          context="live"
          onClose={() => setShowReport(false)}
          onDone={(msg) => { setShowReport(false); showToast(msg) }}
        />
      )}
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

            {/* PiP removed — swipe gesture handles PiP */}

            {/* Report */}
            <button
              onClick={() => {
                setShowMoreMenu(false)
                if (stream) setShowReport(true)
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 0', borderBottom: '1px solid #1A1A1A',
                background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#1A1A1A',
                cursor: 'pointer', textAlign: 'start',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600, color: '#fff' }}>{ct.moreReport}</span>
            </button>

            {/* Block */}
            <button
              onClick={async () => {
                setShowMoreMenu(false)
                if (stream && user) {
                  try {
                    const { data: session } = await supabase.auth.getSession()
                    const token = session.session?.access_token
                    if (token) {
                      await apiFetch(`/api/users/${stream.seller_id}/block`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      })
                    }
                  } catch { /* ignore */ }
                  // Also keep localStorage for immediate local filtering
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
                cursor: 'pointer', textAlign: 'start',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <span style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600, color: '#E8344E' }}>{ct.moreBlock}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ GIVEAWAY WINNER OVERLAY — tap anywhere to dismiss (single-view only) ═══ */}
      {giveawayWinner && !isMultiView && (
        <div
          onClick={() => setGiveawayWinner(null)}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 400, cursor: 'pointer',
            animation: 'soldFadeIn 0.4s ease',
          }}
        >
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
            <div style={{ fontSize: 'calc(52px * var(--fs, 1))', animation: 'giftSpinViewer 1s ease-out' }}>🎁</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: 'calc(16px * var(--fs, 1))', color: 'rgba(255,215,0,0.6)',
            }}>
              ✦ ✦ ✦
            </div>
            <p style={{
              fontSize: 'calc(32px * var(--fs, 1))', fontWeight: 900, color: '#FFD700',
              textShadow: '0 2px 24px rgba(255,215,0,0.5)',
              margin: 0, textAlign: 'center',
            }}>
              {giveawayWinner.name}
            </p>
            <p style={{
              fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600, color: '#fff',
              opacity: 0.8, margin: 0,
            }}>
              {ct.giftWinner}
            </p>
            <div style={{
              display: 'flex', gap: '4px',
              fontSize: 'calc(22px * var(--fs, 1))',
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
          left: '50%', transform: 'translateX(-50%)', // i18n-ignore (centrage, animation toastIn)
          padding: '10px 20px',
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '100px',
          border: '1px solid rgba(255,255,255,0.15)',
          zIndex: 500,
          animation: 'toastIn 0.25s ease',
        }}>
          <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#fff' }}>
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

      {/* Max-bid modal */}
      {showMaxBidModal && (
        <div
          onClick={() => setShowMaxBidModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '340px',
              backgroundColor: '#1A1A1A', borderRadius: '20px',
              padding: '24px', border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 4px', textAlign: 'center' }}>
              {ct.maxBidTitle}
            </h3>
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#888', margin: '0 0 20px', textAlign: 'center' }}>
              {activeAuction ? `${ct.currentPrice}: ${money(activeAuction.current_price)}` : ''}
            </p>
            <form onSubmit={e => { e.preventDefault(); handleMaxBidSubmit() }}>
              <input
                type="number"
                inputMode="decimal"
                value={maxBidAmount}
                onChange={e => setMaxBidAmount(e.target.value)}
                placeholder={ct.maxBidPlaceholder}
                autoFocus
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#fff', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700,
                  textAlign: 'center', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={maxBidLoading}
                style={{
                  width: '100%', marginTop: '14px', padding: '14px',
                  borderRadius: '100px', border: 'none',
                  background: maxBidLoading ? '#555' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                  cursor: maxBidLoading ? 'default' : 'pointer',
                  opacity: maxBidLoading ? 0.7 : 1,
                }}
              >
                {maxBidLoading ? '...' : ct.maxBidConfirm}
              </button>
            </form>
            {hasActiveMaxBid && (
              <button
                onClick={async () => {
                  if (!activeAuction || !user) return
                  try {
                    const { data: session } = await supabase.auth.getSession()
                    const token = session.session?.access_token
                    if (!token) return
                    await apiFetch(`/api/items/${activeAuction.id}/max-bid`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    setHasActiveMaxBid(false)
                    setShowMaxBidModal(false)
                  } catch { /* ignore */ }
                }}
                style={{
                  width: '100%', marginTop: '8px', padding: '12px',
                  borderRadius: '100px', border: '1px solid #333',
                  background: 'transparent',
                  color: '#888', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ct.maxBidCancel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Multi-view stream picker modal */}
      {showMultiPicker && (
        <div
          onClick={() => setShowMultiPicker(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px',
              maxHeight: '60vh',
              backgroundColor: '#1A1A1A', borderRadius: '20px 20px 0 0',
              padding: '20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 20px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: 0 }}>
                {ct.addLive}
              </h3>
              <button
                onClick={() => setShowMultiPicker(false)}
                aria-label={ct.close}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 'calc(24px * var(--fs, 1))', cursor: 'pointer', padding: '4px' }}
              >
                ×
              </button>
            </div>
            {isMultiView && (
              <div style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(232,52,78,0.1)', border: '1px solid rgba(232,52,78,0.2)' }}>
                <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, color: '#E8344E' }}>
                  {fill(ct.screensActive, { n: multiViewStreams.length + 1 })}
                </span>
              </div>
            )}
            {availableLives.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', fontSize: 'calc(14px * var(--fs, 1))', padding: '20px 0' }}>
                {ct.noOtherLives}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableLives.map(live => {
                  const alreadyAdded = multiViewStreams.some(s => s.id === live.id)
                  return (
                    <button
                      key={live.id}
                      disabled={alreadyAdded || multiViewStreams.length >= 3}
                      onClick={() => addMultiStream(live.id, live.title, live.seller_name, live.seller_country)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px', borderRadius: '14px',
                        backgroundColor: alreadyAdded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                        border: alreadyAdded ? '1px solid rgba(232,52,78,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        cursor: alreadyAdded || multiViewStreams.length >= 3 ? 'default' : 'pointer',
                        opacity: alreadyAdded ? 0.5 : multiViewStreams.length >= 3 ? 0.4 : 1,
                        textAlign: 'start', width: '100%',
                      }}
                    >
                      {live.thumbnail_url ? (
                        <img
                          src={live.thumbnail_url}
                          alt=""
                          loading="lazy"
                          style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: '56px', height: '56px', borderRadius: '10px', flexShrink: 0,
                          backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {live.title}
                        </p>
                        <p style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 500, color: '#888', margin: 0 }}>
                          {live.seller_name}
                        </p>
                      </div>
                      {alreadyAdded ? (
                        <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600, color: '#E8344E', flexShrink: 0 }}>
                          {ct.added}
                        </span>
                      ) : (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          backgroundColor: 'rgba(232,52,78,0.2)', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8344E" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-bid modal */}
      {showPreBidModal && (
        <div
          onClick={() => { setShowPreBidModal(false); setPreBidItemId(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '340px',
              backgroundColor: '#1A1A1A', borderRadius: '20px',
              padding: '24px', border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#fff', margin: '0 0 16px', textAlign: 'center' }}>
              {ct.preBid}
            </h3>
            <form onSubmit={e => { e.preventDefault(); handlePreBidSubmit() }}>
              <input
                type="number"
                inputMode="decimal"
                value={preBidAmount}
                onChange={e => setPreBidAmount(e.target.value)}
                placeholder={ct.preBidPlaceholder}
                autoFocus
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#fff', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700,
                  textAlign: 'center', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={preBidLoading}
                style={{
                  width: '100%', marginTop: '14px', padding: '14px',
                  borderRadius: '100px', border: 'none',
                  background: preBidLoading ? '#555' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                  cursor: preBidLoading ? 'default' : 'pointer',
                  opacity: preBidLoading ? 0.7 : 1,
                }}
              >
                {preBidLoading ? '...' : ct.preBidConfirm}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { formatSystemMessage } from '../lib/chatSystem'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiveScreen } from '../hooks/useLiveScreen'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { tr, type Localized } from '../lib/i18n'
import { formatMoney, currencyForCountry, currencySymbol, displayItemTitle } from '../lib/fulfillment'
import { luxuryText } from '../lib/luxury'
import { useLiveKitBroadcast } from '../hooks/useLiveKitBroadcast'
import { apiFetch } from '../lib/api'
import type { Item, ChatMessage, Giveaway } from '../types/database'
import { getStreamQualityConstraints } from '../lib/settings'
import { usePageTitle } from '../hooks/usePageTitle'
import { PAID_EXTRAS_ENABLED } from '../lib/paidExtras'

const pageContent = {
  en: {
    live: 'LIVE',
    viewers: 'viewers',
    nextItem: 'Next item',
    relaunch: 'Relaunch auction',
    goHome: 'Home',
    myItems: 'My items',
    editItemBtn: 'Edit',
    editTitle: 'Title',
    editStart: 'Start',
    editMin: 'Minimum',
    editBuyNow: 'Buy now',
    editSave: 'Save',
    editError: 'Could not save',
    itemToSell: 'To sell',
    itemLive: 'Live',
    itemSold: 'Sold',
    itemUnsold: 'Unsold',
    closeList: 'Close',
    reserveOfferSent: 'Reserve not met — offer sent to the top bidder (60 s)',
    sold: 'Sold!',
    unsold: 'Unsold',
    noMoreItems: 'No more items',
    lotSold: 'won by',
    endLive: 'End',
    endConfirm: 'End the live?',
    endYes: 'Yes, end it',
    endNo: 'No, keep going',
    lot: 'Lot',
    startingAt: 'Starting at',
    currentPrice: 'Current price',
    sendMessage: 'Message...',
    send: 'Send',
    paymentAccepted: 'Payment pending',
    cardAuthorized: 'Card accepted',
    cardDeclined: 'Card declined',
    cardDeclinedHint: '{name} must add another card, then try again.',
    retryCard: 'Try again',
    retryingCard: 'Trying…',
    paymentsNotReady: 'Payments are not set up for your account yet.',
    closeBanner: 'Close',
    addressOk: 'Order created',
    waitingBids: 'Waiting for bids...',
    noBids: 'No bids',
    recap: 'View recap',
    startAuction: 'Start auction',
    seconds: 's',
    liveEnded: 'Live ended',
    soldOf: 'sold',
    articlesLabel: 'items',
    soldSummary: '{sold} of {total} items sold',
    itemsAdded: 'Items added: {n}',
    anonymous: 'Anonymous',
    back: 'Back',
    endAuction: 'End auction',
    addItem: 'Add item',
    addItemTitle: 'Title',
    addItemPrice: 'Starting price ({cur})',
    addItemMinPrice: 'Minimum price ({cur})',
    addItemBuyNow: 'Buy now price ({cur})',
    addItemAdd: 'Add',
    addItemCancel: 'Cancel',
    sdShort: 'SD',
    sdTitle: 'Sudden death',
    messageFlagged: '[Hidden message]',
    auctionLive: 'Auction live',
    resolving: 'Wrapping up...',
    minPrice: 'min: {price}',
    giftTitle: 'Surprise gift',
    giftParticipants: 'participants',
    giftDraw: 'Draw winner',
    giftPrizePlaceholder: 'Describe the gift...',
    giftLaunch: 'Launch gift',
    giftLaunched: 'Gift launched!',
    giftActive: 'Gift active',
    giftCancel: 'Cancel',
    giftWinner: 'won the gift!',
    buyersOnly: 'Buyers only',
    returningBuyers: 'returning',
    newBuyers: 'new',
    obsTitle: 'Stream from OBS',
    obsUrl: 'RTMP URL',
    obsKey: 'Stream key',
    obsCopied: 'Copied!',
    obsLoading: 'Generating...',
    obsDesc: 'Paste these into OBS > Settings > Stream',
    copy: 'Copy',
    close: 'Close',
    errorShort: 'Something went wrong',
    boostTitle: 'Boost',
    boostLive: 'Boost',
    boostActive: 'Boosted!',
    boostConfirm: 'Boost your live for {price}? It will be featured for 24 hours.',
    boostConfirmYes: 'Pay {price}',
    boostConfirmNo: 'Cancel',
    boostNoCard: 'Add a card in Settings > Payments first.',
    boostPayFailed: 'Payment failed. Please check your card.',
    cohostInvite: 'Invite a co-host',
    cohostSearch: 'Search for a seller...',
    cohostRemove: 'Remove co-host',
    cohostNone: 'No seller found',
    cohostActive: 'Co-host',
    multicast: 'Multicast',
    multicastTitle: 'Stream to other platforms',
    multicastAdd: 'Add an RTMP destination',
    multicastPlaceholder: 'rtmp://a.rtmp.youtube.com/live2/xxxx',
    multicastStart: 'Start',
    multicastStop: 'Stop',
    errReconnect: 'Error: please sign in again',
    errGeneric: 'Something went wrong. Please try again.',
    errNetwork: 'Network error',
    errDraw: 'The draw failed',
    errActivation: 'Couldn’t start the auction',
    errAddItem: 'Couldn’t add the item',
    sessionExpired: 'Session expired',
    errCohostRemove: 'Couldn’t remove the co-host',
    errMulticastStop: 'Couldn’t stop multicast',
  },
  fr: {
    live: 'EN DIRECT',
    viewers: 'spectateurs',
    nextItem: 'Article suivant',
    relaunch: 'Relancer l’enchère',
    goHome: 'Accueil',
    myItems: 'Mes articles',
    editItemBtn: 'Modifier',
    editTitle: 'Nom',
    editStart: 'Départ',
    editMin: 'Minimum',
    editBuyNow: 'Achat immédiat',
    editSave: 'Enregistrer',
    editError: 'Impossible d’enregistrer',
    itemToSell: 'À vendre',
    itemLive: 'En cours',
    itemSold: 'Vendu',
    itemUnsold: 'Invendu',
    closeList: 'Fermer',
    reserveOfferSent: 'Prix minimum non atteint — offre envoyée au meilleur enchérisseur (60 s)',
    sold: 'Vendu !',
    unsold: 'Invendu',
    noMoreItems: 'Plus d’articles',
    lotSold: 'remporté par',
    endLive: 'Terminer',
    endConfirm: 'Terminer le live ?',
    endYes: 'Oui, terminer',
    endNo: 'Non, continuer',
    lot: 'Lot',
    startingAt: 'À partir de',
    currentPrice: 'Prix actuel',
    sendMessage: 'Message...',
    send: 'Envoyer',
    paymentAccepted: 'Paiement en attente',
    cardAuthorized: 'Carte acceptée',
    cardDeclined: 'Carte refusée',
    cardDeclinedHint: '{name} doit ajouter une autre carte, puis réessaie.',
    retryCard: 'Réessayer',
    retryingCard: 'Nouvel essai…',
    paymentsNotReady: 'Les paiements ne sont pas encore activés sur ton compte.',
    closeBanner: 'Fermer',
    addressOk: 'Commande créée',
    waitingBids: 'En attente d’enchères...',
    noBids: 'Aucune enchère',
    recap: 'Voir le récapitulatif',
    startAuction: 'Lancer l’enchère',
    seconds: 's',
    liveEnded: 'Live terminé',
    soldOf: 'vendus',
    articlesLabel: 'articles',
    soldSummary: '{sold} article(s) vendu(s) sur {total}',
    itemsAdded: 'Articles ajoutés : {n}',
    anonymous: 'Anonyme',
    back: 'Retour',
    endAuction: 'Terminer l’enchère',
    addItem: 'Ajouter un article',
    addItemTitle: 'Titre',
    addItemPrice: 'Prix de départ ({cur})',
    addItemMinPrice: 'Prix minimum ({cur})',
    addItemBuyNow: 'Achat immédiat ({cur})',
    addItemAdd: 'Ajouter',
    addItemCancel: 'Annuler',
    sdShort: 'MS',
    sdTitle: 'Mort subite',
    messageFlagged: '[Message masqué]',
    auctionLive: 'Enchère en cours',
    resolving: 'Clôture...',
    minPrice: 'min : {price}',
    giftTitle: 'Cadeau surprise',
    giftParticipants: 'participants',
    giftDraw: 'Tirer au sort',
    giftPrizePlaceholder: 'Décris le cadeau...',
    giftLaunch: 'Lancer le cadeau',
    giftLaunched: 'Cadeau lancé !',
    giftActive: 'Cadeau en cours',
    giftCancel: 'Annuler',
    giftWinner: 'a gagné le cadeau !',
    buyersOnly: 'Acheteurs seulement',
    returningBuyers: 'fidèles',
    newBuyers: 'nouveaux',
    obsTitle: 'Streamer depuis OBS',
    obsUrl: 'URL RTMP',
    obsKey: 'Clé de stream',
    obsCopied: 'Copié !',
    obsLoading: 'Génération...',
    obsDesc: 'Colle ces infos dans OBS > Paramètres > Stream',
    copy: 'Copier',
    close: 'Fermer',
    errorShort: 'Une erreur est survenue',
    boostTitle: 'Boost',
    boostLive: 'Booster',
    boostActive: 'Boosté !',
    boostConfirm: 'Booster ton live pour {price} ? Il sera mis en avant pendant 24 h.',
    boostConfirmYes: 'Payer {price}',
    boostConfirmNo: 'Annuler',
    boostNoCard: 'Ajoute d’abord une carte dans Paramètres > Paiements.',
    boostPayFailed: 'Le paiement a échoué. Vérifie ta carte.',
    cohostInvite: 'Inviter un co-host',
    cohostSearch: 'Rechercher un vendeur...',
    cohostRemove: 'Retirer le co-host',
    cohostNone: 'Aucun vendeur trouvé',
    cohostActive: 'Co-host',
    multicast: 'Multidiffusion',
    multicastTitle: 'Diffuser sur d’autres plateformes',
    multicastAdd: 'Ajouter une destination RTMP',
    multicastPlaceholder: 'rtmp://a.rtmp.youtube.com/live2/xxxx',
    multicastStart: 'Diffuser',
    multicastStop: 'Arrêter',
    errReconnect: 'Erreur : reconnecte-toi',
    errGeneric: 'Une erreur est survenue. Réessaie.',
    errNetwork: 'Erreur réseau',
    errDraw: 'Le tirage au sort a échoué',
    errActivation: 'Impossible de lancer l’enchère',
    errAddItem: 'Impossible d’ajouter l’article',
    sessionExpired: 'Session expirée',
    errCohostRemove: 'Impossible de retirer le co-host',
    errMulticastStop: 'Impossible d’arrêter la multidiffusion',
  },
  es: {
    live: 'EN DIRECTO',
    viewers: 'espectadores',
    nextItem: 'Siguiente artículo',
    relaunch: 'Relanzar la subasta',
    goHome: 'Inicio',
    myItems: 'Mis artículos',
    editItemBtn: 'Editar',
    editTitle: 'Nombre',
    editStart: 'Salida',
    editMin: 'Mínimo',
    editBuyNow: 'Compra inmediata',
    editSave: 'Guardar',
    editError: 'No se pudo guardar',
    itemToSell: 'Por vender',
    itemLive: 'En curso',
    itemSold: 'Vendido',
    itemUnsold: 'No vendido',
    closeList: 'Cerrar',
    reserveOfferSent: 'Precio mínimo no alcanzado — oferta enviada al mejor postor (60 s)',
    sold: '¡Vendido!',
    unsold: 'No vendido',
    noMoreItems: 'No hay más artículos',
    lotSold: 'ganado por',
    endLive: 'Terminar',
    endConfirm: '¿Terminar el directo?',
    endYes: 'Sí, terminar',
    endNo: 'No, seguir',
    lot: 'Lote',
    startingAt: 'Desde',
    currentPrice: 'Precio actual',
    sendMessage: 'Mensaje...',
    send: 'Enviar',
    paymentAccepted: 'Pago pendiente',
    cardAuthorized: 'Tarjeta aceptada',
    cardDeclined: 'Tarjeta rechazada',
    cardDeclinedHint: '{name} debe añadir otra tarjeta; después vuelve a intentarlo.',
    retryCard: 'Reintentar',
    retryingCard: 'Reintentando…',
    paymentsNotReady: 'Los pagos aún no están activados en tu cuenta.',
    closeBanner: 'Cerrar',
    addressOk: 'Pedido creado',
    waitingBids: 'Esperando pujas...',
    noBids: 'Sin pujas',
    recap: 'Ver resumen',
    startAuction: 'Iniciar subasta',
    seconds: 's',
    liveEnded: 'Directo terminado',
    soldOf: 'vendidos',
    articlesLabel: 'artículos',
    soldSummary: '{sold} de {total} artículos vendidos',
    itemsAdded: 'Artículos añadidos: {n}',
    anonymous: 'Anónimo',
    back: 'Volver',
    endAuction: 'Terminar subasta',
    addItem: 'Añadir artículo',
    addItemTitle: 'Título',
    addItemPrice: 'Precio inicial ({cur})',
    addItemMinPrice: 'Precio mínimo ({cur})',
    addItemBuyNow: 'Precio de compra inmediata ({cur})',
    addItemAdd: 'Añadir',
    addItemCancel: 'Cancelar',
    sdShort: 'MS',
    sdTitle: 'Muerte súbita',
    messageFlagged: '[Mensaje oculto]',
    auctionLive: 'Subasta en curso',
    resolving: 'Cerrando...',
    minPrice: 'mín.: {price}',
    giftTitle: 'Regalo sorpresa',
    giftParticipants: 'participantes',
    giftDraw: 'Sortear',
    giftPrizePlaceholder: 'Describe el regalo...',
    giftLaunch: 'Lanzar regalo',
    giftLaunched: '¡Regalo lanzado!',
    giftActive: 'Regalo activo',
    giftCancel: 'Cancelar',
    giftWinner: '¡ha ganado el regalo!',
    buyersOnly: 'Solo compradores',
    returningBuyers: 'habituales',
    newBuyers: 'nuevos',
    obsTitle: 'Transmitir desde OBS',
    obsUrl: 'URL RTMP',
    obsKey: 'Clave de transmisión',
    obsCopied: '¡Copiado!',
    obsLoading: 'Generando...',
    obsDesc: 'Pega estos datos en OBS > Ajustes > Emisión',
    copy: 'Copiar',
    close: 'Cerrar',
    errorShort: 'Algo salió mal',
    boostTitle: 'Impulso',
    boostLive: 'Impulsar',
    boostActive: '¡Impulsado!',
    boostConfirm: '¿Impulsar tu directo por {price}? Se destacará durante 24 h.',
    boostConfirmYes: 'Pagar {price}',
    boostConfirmNo: 'Cancelar',
    boostNoCard: 'Primero añade una tarjeta en Ajustes > Pagos.',
    boostPayFailed: 'El pago ha fallado. Revisa tu tarjeta.',
    cohostInvite: 'Invitar a un coanfitrión',
    cohostSearch: 'Buscar un vendedor...',
    cohostRemove: 'Quitar coanfitrión',
    cohostNone: 'No se ha encontrado ningún vendedor',
    cohostActive: 'Coanfitrión',
    multicast: 'Multidifusión',
    multicastTitle: 'Transmitir en otras plataformas',
    multicastAdd: 'Añadir un destino RTMP',
    multicastPlaceholder: 'rtmp://a.rtmp.youtube.com/live2/xxxx',
    multicastStart: 'Iniciar',
    multicastStop: 'Detener',
    errReconnect: 'Error: vuelve a iniciar sesión',
    errGeneric: 'Algo salió mal. Inténtalo de nuevo.',
    errNetwork: 'Error de red',
    errDraw: 'El sorteo ha fallado',
    errActivation: 'No se pudo iniciar la subasta',
    errAddItem: 'No se pudo añadir el artículo',
    sessionExpired: 'Sesión caducada',
    errCohostRemove: 'No se pudo quitar al coanfitrión',
    errMulticastStop: 'No se pudo detener la multidifusión',
  },
  ru: {
    live: 'В ЭФИРЕ',
    viewers: 'зрителей',
    nextItem: 'Следующий товар',
    relaunch: 'Перезапустить аукцион',
    goHome: 'Главная',
    myItems: 'Мои товары',
    editItemBtn: 'Изменить',
    editTitle: 'Название',
    editStart: 'Старт',
    editMin: 'Минимум',
    editBuyNow: 'Купить сразу',
    editSave: 'Сохранить',
    editError: 'Не удалось сохранить',
    itemToSell: 'К продаже',
    itemLive: 'Идёт',
    itemSold: 'Продано',
    itemUnsold: 'Не продано',
    closeList: 'Закрыть',
    reserveOfferSent: 'Мин. цена не достигнута — предложение отправлено лидеру (60 с)',
    sold: 'Продано!',
    unsold: 'Не продано',
    noMoreItems: 'Товаров больше нет',
    lotSold: 'выиграл(а)',
    endLive: 'Завершить',
    endConfirm: 'Завершить эфир?',
    endYes: 'Да, завершить',
    endNo: 'Нет, продолжить',
    lot: 'Лот',
    startingAt: 'От',
    currentPrice: 'Текущая цена',
    sendMessage: 'Сообщение...',
    send: 'Отправить',
    paymentAccepted: 'Ожидается оплата',
    cardAuthorized: 'Карта принята',
    cardDeclined: 'Карта отклонена',
    cardDeclinedHint: '{name} должен добавить другую карту, затем попробуй снова.',
    retryCard: 'Повторить',
    retryingCard: 'Повторяем…',
    paymentsNotReady: 'Платежи для твоего аккаунта ещё не подключены.',
    closeBanner: 'Закрыть',
    addressOk: 'Заказ создан',
    waitingBids: 'Ждём ставок...',
    noBids: 'Ставок нет',
    recap: 'Посмотреть итоги',
    startAuction: 'Начать аукцион',
    seconds: 'с',
    liveEnded: 'Эфир завершён',
    soldOf: 'продано',
    articlesLabel: 'товаров',
    soldSummary: 'Продано: {sold} из {total}',
    itemsAdded: 'Добавлено товаров: {n}',
    anonymous: 'Аноним',
    back: 'Назад',
    endAuction: 'Завершить аукцион',
    addItem: 'Добавить товар',
    addItemTitle: 'Название',
    addItemPrice: 'Стартовая цена ({cur})',
    addItemMinPrice: 'Минимальная цена ({cur})',
    addItemBuyNow: 'Цена «Купить сразу» ({cur})',
    addItemAdd: 'Добавить',
    addItemCancel: 'Отмена',
    sdShort: 'ВС',
    sdTitle: 'Внезапная смерть',
    messageFlagged: '[Сообщение скрыто]',
    auctionLive: 'Аукцион идёт',
    resolving: 'Подводим итог...',
    minPrice: 'мин.: {price}',
    giftTitle: 'Подарок-сюрприз',
    giftParticipants: 'участников',
    giftDraw: 'Разыграть',
    giftPrizePlaceholder: 'Опиши подарок...',
    giftLaunch: 'Запустить розыгрыш',
    giftLaunched: 'Розыгрыш запущен!',
    giftActive: 'Розыгрыш идёт',
    giftCancel: 'Отмена',
    giftWinner: 'выигрывает подарок!',
    buyersOnly: 'Только покупатели',
    returningBuyers: 'постоянные',
    newBuyers: 'новые',
    obsTitle: 'Трансляция из OBS',
    obsUrl: 'RTMP URL',
    obsKey: 'Ключ трансляции',
    obsCopied: 'Скопировано!',
    obsLoading: 'Создаём...',
    obsDesc: 'Вставь это в OBS > Настройки > Трансляция',
    copy: 'Копировать',
    close: 'Закрыть',
    errorShort: 'Что-то пошло не так',
    boostTitle: 'Буст',
    boostLive: 'Продвинуть',
    boostActive: 'Продвигается!',
    boostConfirm: 'Продвинуть эфир за {price}? Он будет в топе 24 часа.',
    boostConfirmYes: 'Оплатить {price}',
    boostConfirmNo: 'Отмена',
    boostNoCard: 'Сначала добавь карту в Настройки > Платежи.',
    boostPayFailed: 'Оплата не прошла. Проверь карту.',
    cohostInvite: 'Пригласить соведущего',
    cohostSearch: 'Найти продавца...',
    cohostRemove: 'Убрать соведущего',
    cohostNone: 'Продавец не найден',
    cohostActive: 'Соведущий',
    multicast: 'Мультистрим',
    multicastTitle: 'Трансляция на другие платформы',
    multicastAdd: 'Добавить RTMP-адрес',
    multicastPlaceholder: 'rtmp://a.rtmp.youtube.com/live2/xxxx',
    multicastStart: 'Запустить',
    multicastStop: 'Остановить',
    errReconnect: 'Ошибка: войди снова',
    errGeneric: 'Что-то пошло не так. Попробуй ещё раз.',
    errNetwork: 'Ошибка сети',
    errDraw: 'Не удалось провести розыгрыш',
    errActivation: 'Не удалось начать аукцион',
    errAddItem: 'Не удалось добавить товар',
    sessionExpired: 'Сессия истекла',
    errCohostRemove: 'Не удалось убрать соведущего',
    errMulticastStop: 'Не удалось остановить мультистрим',
  },
  he: {
    live: 'שידור חי',
    viewers: 'צופים',
    nextItem: 'הפריט הבא',
    relaunch: 'להפעיל שוב את המכירה',
    goHome: 'דף הבית',
    myItems: 'הפריטים שלי',
    editItemBtn: 'עריכה',
    editTitle: 'שם',
    editStart: 'התחלה',
    editMin: 'מינימום',
    editBuyNow: 'קנייה מיידית',
    editSave: 'שמירה',
    editError: 'השמירה נכשלה',
    itemToSell: 'למכירה',
    itemLive: 'פעיל',
    itemSold: 'נמכר',
    itemUnsold: 'לא נמכר',
    closeList: 'סגירה',
    reserveOfferSent: 'מחיר המינימום לא הושג — הצעה נשלחה למציע הגבוה (60 ש׳)',
    sold: 'נמכר!',
    unsold: 'לא נמכר',
    noMoreItems: 'אין עוד פריטים',
    lotSold: 'זכה/תה:',
    endLive: 'סיום',
    endConfirm: 'לסיים את השידור?',
    endYes: 'כן, לסיים',
    endNo: 'לא, להמשיך',
    lot: 'פריט',
    startingAt: 'החל מ-',
    currentPrice: 'מחיר נוכחי',
    sendMessage: 'הודעה...',
    send: 'שליחה',
    paymentAccepted: 'ממתין לתשלום',
    cardAuthorized: 'הכרטיס אושר',
    cardDeclined: 'הכרטיס נדחה',
    cardDeclinedHint: '{name} צריך להוסיף כרטיס אחר, ואז לנסות שוב.',
    retryCard: 'לנסות שוב',
    retryingCard: 'מנסים שוב…',
    paymentsNotReady: 'התשלומים עדיין לא הופעלו בחשבון שלך.',
    closeBanner: 'סגירה',
    addressOk: 'ההזמנה נוצרה',
    waitingBids: 'ממתינים להצעות...',
    noBids: 'אין הצעות',
    recap: 'לסיכום',
    startAuction: 'התחלת מכירה פומבית',
    seconds: 'שנ׳',
    liveEnded: 'השידור הסתיים',
    soldOf: 'נמכרו',
    articlesLabel: 'פריטים',
    soldSummary: 'נמכרו {sold} מתוך {total} פריטים',
    itemsAdded: 'נוספו פריטים: {n}',
    anonymous: 'אנונימי',
    back: 'חזרה',
    endAuction: 'סיום המכירה',
    addItem: 'הוספת פריט',
    addItemTitle: 'כותרת',
    addItemPrice: 'מחיר פתיחה ({cur})',
    addItemMinPrice: 'מחיר מינימום ({cur})',
    addItemBuyNow: 'מחיר קנייה מיידית ({cur})',
    addItemAdd: 'הוספה',
    addItemCancel: 'ביטול',
    sdShort: 'מ״פ',
    sdTitle: 'מוות פתאומי',
    messageFlagged: '[ההודעה הוסתרה]',
    auctionLive: 'המכירה בעיצומה',
    resolving: 'סוגרים...',
    minPrice: 'מינ׳: {price}',
    giftTitle: 'מתנת הפתעה',
    giftParticipants: 'משתתפים',
    giftDraw: 'הגרלה',
    giftPrizePlaceholder: 'תאר/י את המתנה...',
    giftLaunch: 'הפעלת המתנה',
    giftLaunched: 'המתנה הופעלה!',
    giftActive: 'מתנה פעילה',
    giftCancel: 'ביטול',
    giftWinner: 'זכה/תה במתנה!',
    buyersOnly: 'לקונים בלבד',
    returningBuyers: 'חוזרים',
    newBuyers: 'חדשים',
    obsTitle: 'שידור מ-OBS',
    obsUrl: 'כתובת RTMP',
    obsKey: 'מפתח שידור',
    obsCopied: 'הועתק!',
    obsLoading: 'יוצרים...',
    obsDesc: 'הדביקו את הפרטים ב-OBS > הגדרות > שידור',
    copy: 'העתקה',
    close: 'סגירה',
    errorShort: 'משהו השתבש',
    boostTitle: 'בוסט',
    boostLive: 'בוסט',
    boostActive: 'הבוסט פעיל!',
    boostConfirm: 'לקדם את השידור ב-{price}? הוא יוצג בבולטות למשך 24 שעות.',
    boostConfirmYes: 'תשלום {price}',
    boostConfirmNo: 'ביטול',
    boostNoCard: 'קודם צריך להוסיף כרטיס בהגדרות > תשלומים.',
    boostPayFailed: 'התשלום נכשל. כדאי לבדוק את הכרטיס.',
    cohostInvite: 'הזמנת מנחה שותף',
    cohostSearch: 'חיפוש מוכר/ת...',
    cohostRemove: 'הסרת המנחה השותף',
    cohostNone: 'לא נמצאו מוכרים',
    cohostActive: 'מנחה שותף',
    multicast: 'שידור מקביל',
    multicastTitle: 'שידור לפלטפורמות נוספות',
    multicastAdd: 'הוספת יעד RTMP',
    multicastPlaceholder: 'rtmp://a.rtmp.youtube.com/live2/xxxx',
    multicastStart: 'התחלה',
    multicastStop: 'עצירה',
    errReconnect: 'שגיאה: צריך להתחבר מחדש',
    errGeneric: 'משהו השתבש. אפשר לנסות שוב.',
    errNetwork: 'שגיאת רשת',
    errDraw: 'ההגרלה נכשלה',
    errActivation: 'לא ניתן להתחיל את המכירה',
    errAddItem: 'לא ניתן להוסיף את הפריט',
    sessionExpired: 'פג תוקף החיבור',
    errCohostRemove: 'לא ניתן להסיר את המנחה השותף',
    errMulticastStop: 'לא ניתן לעצור את השידור המקביל',
  },
} satisfies Localized<Record<string, string>>

/** Remplace les {clés} d'un texte traduit. */
function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

// Utility to lock/unlock body scroll — must be called on enter and EVERY exit path
function lockBody() {
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.top = '0'
  document.body.style.left = '0'
}

function unlockBody() {
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.height = ''
  document.body.style.top = ''
  document.body.style.left = ''
}

/** Prend une photo de l'image de la caméra (vidéo locale) et l'envoie au stockage ; null si impossible. */
async function captureCameraPhoto(video: HTMLVideoElement | null, userId: string): Promise<string | null> {
  try {
    if (!video || !video.videoWidth || !video.videoHeight) return null
    const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.82))
    if (!blob) return null
    const path = `thumbnails/${userId}/item-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) return null
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

export default function LiveSellerView() {
  const { streamId } = useParams<{ streamId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const ct = tr(pageContent)
  // Devise du vendeur (pays de son profil) pour tous les prix affichés et saisis
  const sellerCurrency = currencyForCountry(profile?.country)
  const curSym = currencySymbol(sellerCurrency)
  const money = (n: number | string | null | undefined) => formatMoney(n, sellerCurrency)
  // Le boost est facturé 4,99 EUR par le serveur (server/src/routes/streams.ts)
  const boostPrice = formatMoney(4.99, 'EUR') // i18n-ignore (devise réelle du paiement Stripe)
  usePageTitle(ct.live)

  const videoRef = useRef<HTMLVideoElement>(null)

  useLiveScreen()

  // Aperçu vendeur plein écran calculé à la main (28/11) : sur iPhone, object-fit « cover » est parfois
  // ignoré par la vidéo de la caméra -> bandes noires en haut et en bas. On agrandit la vidéo nous-mêmes
  // pour couvrir tout l'écran (le surplus est rogné par le cadre), quel que soit le format reçu.
  useEffect(() => {
    const fit = () => {
      const v = videoRef.current
      if (!v || !v.videoWidth || !v.videoHeight) return
      const W = window.innerWidth, H = window.innerHeight
      const s = Math.max(W / v.videoWidth, H / v.videoHeight)
      const w = Math.ceil(v.videoWidth * s), h = Math.ceil(v.videoHeight * s)
      Object.assign(v.style, {
        position: 'absolute', width: `${w}px`, height: `${h}px`,
        left: `${Math.round((W - w) / 2)}px`, top: `${Math.round((H - h) / 2)}px`, maxWidth: 'none',
      })
    }
    const v = videoRef.current
    v?.addEventListener('loadedmetadata', fit)
    v?.addEventListener('resize', fit)
    window.addEventListener('resize', fit)
    const t = setInterval(fit, 1000) // le format de la caméra change (retournement, relance) sans toujours prévenir
    return () => {
      v?.removeEventListener('loadedmetadata', fit)
      v?.removeEventListener('resize', fit)
      window.removeEventListener('resize', fit)
      clearInterval(t)
    }
  }, [])
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isStreamOwner, setIsStreamOwner] = useState(true) // false if co-host

  const [items, setItems] = useState<Item[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [messages, setMessages] = useState<(ChatMessage & { user_profile?: { display_name: string } })[]>([])
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number; startTime: number }[]>([])
  const reactionIdRef = useRef(0)
  const [newMessage, setNewMessage] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  // Carte du gagnant refusée à la fin de l'enchère : bandeau rouge + « Réessayer »
  const [paymentIssue, setPaymentIssue] = useState<{ orderId: string; winnerName: string; lot: string; status: string; code?: string } | null>(null)
  const [retryingCard, setRetryingCard] = useState(false)
  const [timeLeft, setTimeLeft] = useState(-1) // -1 = not started, 0 = finished, >0 = counting
  const [viewerCount, setViewerCount] = useState(0)
  const [buyerStats, setBuyerStats] = useState<{ returning: number; new: number } | null>(null)
  const [liveEnded, setLiveEnded] = useState(false)
  const autoResolvedRef = useRef<string | null>(null) // tracks item ID already auto-resolved
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const itemsRef = useRef<Item[]>(items)
  const currentIndexRef = useRef(currentIndex)
  const handleEndLiveRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [soldOverlay, setSoldOverlay] = useState<{
    lotNumber: string
    winnerName: string
    price: number
    isUnsold?: boolean
  } | null>(null)

  // Add item during live
  const [showAddItem, setShowAddItem] = useState(false)
  const [showItemsList, setShowItemsList] = useState(false)
  // Modification d'un article depuis « Mes articles » (pas encore vendu)
  const [editItem, setEditItem] = useState<{ id: string; title: string; code: string; start: string; min: string; buyNow: string } | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [addItemTitle, setAddItemTitle] = useState('')
  const [addItemPrice, setAddItemPrice] = useState('')
  const [addItemMinPrice, setAddItemMinPrice] = useState('')
  const [addItemBuyNowPrice, setAddItemBuyNowPrice] = useState('')
  const [addItemQuantity, setAddItemQuantity] = useState(1)
  const [addItemDuration, setAddItemDuration] = useState(60)
  const [addingItem, setAddingItem] = useState(false)

  // Boost
  const [isBoosted, setIsBoosted] = useState(false)
  const [showBoostConfirm, setShowBoostConfirm] = useState(false)
  const [boostLoading, setBoostLoading] = useState(false)

  // Co-host
  const [showCohostModal, setShowCohostModal] = useState(false)
  const [cohostSearch, setCohostSearch] = useState('')
  const [cohostResults, setCohostResults] = useState<{ id: string; display_name: string; avatar_url: string | null; store_name?: string }[]>([])
  const [cohostSearching, setCohostSearching] = useState(false)
  const [cohost, setCohost] = useState<{ id: string; display_name: string; avatar_url: string | null } | null>(null)

  // Multicast
  const [showMulticastModal, setShowMulticastModal] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [multicastUrl, setMulticastUrl] = useState('')
  const [multicastDestinations, setMulticastDestinations] = useState<{ url: string; egressId: string }[]>([])
  const [multicastLoading, setMulticastLoading] = useState(false)

  // OBS/RTMP
  const [showObsModal, setShowObsModal] = useState(false)
  const [obsData, setObsData] = useState<{ rtmp_url: string; stream_key: string } | null>(null)
  const [obsLoading, setObsLoading] = useState(false)
  const [obsCopied, setObsCopied] = useState<string | null>(null)

  // Giveaway
  const [showGiveawayForm, setShowGiveawayForm] = useState(false)
  const [giveawayPrize, setGiveawayPrize] = useState('')
  const [giveawayBuyersOnly, setGiveawayBuyersOnly] = useState(false)
  const [activeGiveaway, setActiveGiveaway] = useState<Giveaway | null>(null)
  const [giveawayDrawing, setGiveawayDrawing] = useState(false)
  const [giveawayWinner, setGiveawayWinner] = useState<{ name: string } | null>(null)

  // Return policy
  const [returnPolicy, setReturnPolicy] = useState<string>('no_return')

  // LiveKit broadcast
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined)
  const [livekitUrl, setLivekitUrl] = useState<string | undefined>(undefined)
  const [livekitToken, setLivekitToken] = useState<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token)
    })
  }, [])

  // Fetch LiveKit token once we have the session token
  useEffect(() => {
    if (!sessionToken || !streamId) return
    apiFetch(`/api/streams/${streamId}/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.token && data.url) {
          setLivekitToken(data.token)
          setLivekitUrl(data.url)
        }
      })
      .catch(err => console.error('Failed to fetch LiveKit token:', err))
  }, [sessionToken, streamId])

  // Fetch seller's return policy
  useEffect(() => {
    if (!user) return
    supabase.from('sellers').select('return_policy').eq('id', user.id).single()
      .then(({ data, error }) => {
        if (error) { console.error('Failed to fetch return policy:', error); return }
        if (data?.return_policy) setReturnPolicy(data.return_policy)
      })
  }, [user])

  const { isConnected: lkConnected, isBroadcasting, startBroadcast, stopBroadcast } = useLiveKitBroadcast({
    livekitUrl,
    livekitToken,
  })

  // Start broadcast once LiveKit token is ready
  const broadcastStartedRef = useRef(false)
  useEffect(() => {
    if (livekitUrl && livekitToken && !broadcastStartedRef.current) {
      broadcastStartedRef.current = true
      startBroadcast()
    }
  }, [livekitUrl, livekitToken, startBroadcast])

  // Mark stream as 'live' when broadcasting starts (fallback if webhook doesn't fire)
  const markedLiveRef = useRef(false)
  useEffect(() => {
    if (!isBroadcasting || !streamId || !sessionToken || markedLiveRef.current) return
    markedLiveRef.current = true
    supabase
      .from('streams')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', streamId)
      .then(({ error }) => {
        if (error) {
          // Fallback via API
          apiFetch(`/api/streams/${streamId}/mark-live`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          }).catch(err => console.error('Mark-live fallback failed:', err))
        }
      })
  }, [isBroadcasting, streamId, sessionToken])

  const currentItem = currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null
  const formatLot = (n: number) => `#${String(n).padStart(3, '0')}`

  const showSoldOverlay = useCallback((lotNumber: string, winnerName: string, price: number, isUnsold = false) => {
    setSoldOverlay({ lotNumber, winnerName, price, isUnsold })
    setTimeout(() => setSoldOverlay(null), 6000)
  }, [])

  // Vente annoncée au vendeur quelle qu'en soit la cause (fin d'enchère OU « Acheter » en cours d'enchère)
  const announcedSoldRef = useRef<Set<string>>(new Set())
  const announceSale = useCallback(async (itemId: string, winnerId: string, price: number) => {
    if (announcedSoldRef.current.has(itemId)) return
    announcedSoldRef.current.add(itemId)
    const idx = itemsRef.current.findIndex(it => it.id === itemId)
    const { data: winnerProfile } = await supabase.from('profiles').select('display_name, username').eq('id', winnerId).single()
    const winnerName = winnerProfile?.display_name || winnerProfile?.username || winnerId.slice(0, 8).toUpperCase()
    showSoldOverlay(formatLot((idx >= 0 ? idx : 0) + 1), `@${winnerName}`, price)
  }, [showSoldOverlay])
  const announceSaleRef = useRef(announceSale)
  announceSaleRef.current = announceSale

  const showToast = useCallback((text: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, text }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const retryCardAuthorization = useCallback(async () => {
    if (!paymentIssue || retryingCard) return
    setRetryingCard(true)
    try {
      const { data: freshSession } = await supabase.auth.getSession()
      const token = freshSession.session?.access_token
      const resp = await apiFetch(`/api/orders/${paymentIssue.orderId}/authorize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      })
      const data = await resp.json().catch(() => ({}))
      const payment = data?.payment as { status: string; code?: string } | undefined
      if (payment && (payment.status === 'authorized' || payment.status === 'paid')) {
        setPaymentIssue(null)
        showToast(`${ct.cardAuthorized} — ${paymentIssue.lot} ${paymentIssue.winnerName}`)
      } else if (payment) {
        setPaymentIssue(prev => prev ? { ...prev, status: payment.status, code: payment.code } : prev)
      }
    } catch (err) {
      console.error('retryCardAuthorization', err)
    } finally {
      setRetryingCard(false)
    }
  }, [paymentIssue, retryingCard, showToast, ct.cardAuthorized])

  // Keep refs in sync for use inside setTimeout callbacks (avoids stale closures)
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  // Prevent scrolling/bouncing on the live view
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      // Allow scrolling inside chat only
      const target = e.target as HTMLElement
      if (target.closest('[data-scrollable]')) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    lockBody()

    return () => {
      document.removeEventListener('touchmove', prevent)
      unlockBody()
    }
  }, [])

  // Start camera
  useEffect(() => {
    let cancelled = false
    const startCamera = async () => {
      // Stop all tracks on the old stream before starting a new one
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
      try {
        const qualityConstraints = getStreamQualityConstraints()
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: qualityConstraints.width }, height: { ideal: qualityConstraints.height } },
          audio: true,
        })
        if (cancelled) {
          mediaStream.getTracks().forEach(t => t.stop())
          return
        }
        mediaStreamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch {
        // Camera access failed
      }
    }
    startCamera()
    return () => {
      cancelled = true
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [facingMode])

  // Fetch real viewer count from stream record
  useEffect(() => {
    if (!streamId) return

    const fetchViewerCount = async () => {
      const { data } = await supabase
        .from('streams')
        .select('viewer_count, seller_id, cohost_id')
        .eq('id', streamId)
        .single()
      if (data) {
        setViewerCount(data.viewer_count || 0)
        // Detect if current user is co-host (not the stream owner)
        if (user && data.seller_id !== user.id && data.cohost_id === user.id) {
          setIsStreamOwner(false)
        }
      }
    }
    fetchViewerCount()

    const channel = supabase
      .channel(`seller-viewers-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'streams',
        filter: `id=eq.${streamId}`,
      }, (payload) => {
        const updated = payload.new as { viewer_count?: number }
        if (updated.viewer_count !== undefined) setViewerCount(updated.viewer_count)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  // Fetch items & messages
  useEffect(() => {
    if (!streamId) return

    const fetchItems = async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
      if (data && data.length > 0) {
        setItems(data)
        const firstActiveIdx = data.findIndex((it: Item) => it.status === 'draft' || it.status === 'active')
        setCurrentIndex(firstActiveIdx >= 0 ? firstActiveIdx : 0)
      }
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('stream_id', streamId)
        .neq('type', 'reaction')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data)
    }

    fetchItems()
    fetchMessages()
  }, [streamId])

  // Real-time subscriptions
  useEffect(() => {
    if (!streamId) return

    const channel = supabase.channel(`seller-live-${streamId}`)

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `stream_id=eq.${streamId}`,
    }, async (payload) => {
      const newMsg = payload.new as ChatMessage
      // Handle reactions: show floating emoji, don't add to chat
      if (newMsg.type === 'reaction') {
        const id = ++reactionIdRef.current
        const x = 10 + Math.random() * 80
        setFloatingReactions(prev => [...prev, { id, emoji: newMsg.message, x, startTime: Date.now() }])
        return
      }
      const { data: enriched } = await supabase
        .from('chat_messages')
        .select('*, user_profile:profiles!user_id(display_name)')
        .eq('id', payload.new.id)
        .single()
      if (enriched) setMessages(prev => [...prev, enriched])
    })

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'items',
      filter: `stream_id=eq.${streamId}`,
    }, (payload) => {
      const updated = payload.new as Item
      const old = payload.old as Partial<Item>
      const before = itemsRef.current.find(it => it.id === updated.id)
      if (updated.status === 'sold' && updated.winner_id && before && before.status !== 'sold') {
        announceSaleRef.current(updated.id, updated.winner_id, Number(updated.current_price)).catch(() => {})
      }
      setItems(prev => prev.map(it => it.id === updated.id ? updated : it))
      // Sudden Death: reset timer to 10s on new bid (price changed while active)
      if (updated.status === 'active' && updated.duration_seconds === -1 && old.current_price !== undefined && updated.current_price > old.current_price) {
        setTimeLeft(10)
      }
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [streamId])

  // Buyer stats: returning vs new — refresh when items change (new sale)
  useEffect(() => {
    if (!user || !streamId) return
    const fetchBuyerStats = async () => {
      // Get all unique buyers for this stream
      const { data: streamOrders } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('stream_id', streamId)
      if (!streamOrders || streamOrders.length === 0) { setBuyerStats({ returning: 0, new: 0 }); return }

      const uniqueBuyers = [...new Set(streamOrders.map(o => o.buyer_id))]

      // For each buyer, check if they have orders with this seller BEFORE this stream
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('seller_id', user.id)
        .neq('stream_id', streamId)
        .in('buyer_id', uniqueBuyers)

      const returningBuyerIds = new Set((previousOrders || []).map(o => o.buyer_id))
      const returning = uniqueBuyers.filter(id => returningBuyerIds.has(id)).length
      setBuyerStats({ returning, new: uniqueBuyers.length - returning })
    }
    fetchBuyerStats()
  }, [user, streamId, items])

  // Giveaway realtime: listen for new entries to update counter
  useEffect(() => {
    if (!activeGiveaway || activeGiveaway.status !== 'active') return

    const channel = supabase
      .channel(`giveaway-entries-${activeGiveaway.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'giveaway_entries',
        filter: `giveaway_id=eq.${activeGiveaway.id}`,
      }, () => {
        setActiveGiveaway(prev => prev ? { ...prev, entry_count: prev.entry_count + 1 } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeGiveaway?.id, activeGiveaway?.status])

  // Fetch active giveaway on mount
  useEffect(() => {
    if (!streamId) return
    const fetchGiveaway = async () => {
      try {
        const resp = await apiFetch(`/api/streams/${streamId}/giveaway`)
        const data = await resp.json()
        if (data && data.status === 'active') setActiveGiveaway(data)
      } catch { /* ignore */ }
    }
    fetchGiveaway()
  }, [streamId])

  const handleLaunchGiveaway = async () => {
    if (!giveawayPrize.trim() || !streamId) return
    // Always get a fresh token
    const { data: freshSession } = await supabase.auth.getSession()
    const token = freshSession.session?.access_token
    if (!token) {
      showToast(ct.errReconnect)
      return
    }
    try {
      const resp = await apiFetch(`/api/streams/${streamId}/giveaway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prize_description: giveawayPrize.trim(), buyers_only: giveawayBuyersOnly }),
      })
      if (resp.ok) {
        const gw = await resp.json()
        setActiveGiveaway(gw)
        setShowGiveawayForm(false)
        setGiveawayPrize('')
        showToast(ct.giftLaunched)
      } else {
        const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('Giveaway launch error:', resp.status, err)
        showToast(ct.errGeneric)
      }
    } catch (err) {
      console.error('Failed to launch giveaway:', err)
      showToast(ct.errNetwork)
    }
  }

  const handleDrawWinner = async () => {
    if (!activeGiveaway) return
    const { data: freshSession } = await supabase.auth.getSession()
    const token = freshSession.session?.access_token
    if (!token) {
      showToast(ct.errReconnect)
      return
    }
    setGiveawayDrawing(true)
    try {
      const resp = await apiFetch(`/api/giveaways/${activeGiveaway.id}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (resp.ok) {
        const drawn = await resp.json()
        // Always clear activeGiveaway so a new one can be created
        setActiveGiveaway(null)
        if (drawn.winner_name) {
          setGiveawayWinner({ name: drawn.winner_name })
          setTimeout(() => {
            setGiveawayWinner(null)
          }, 5000)
        }
      } else {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Draw error:', resp.status, err)
        showToast(ct.errDraw)
      }
    } catch (err) {
      console.error('Failed to draw winner:', err)
      showToast(ct.errNetwork)
    }
    setGiveawayDrawing(false)
  }

  const handleCancelGiveaway = async () => {
    if (!activeGiveaway || !sessionToken) return
    try {
      await supabase
        .from('giveaways')
        .update({ status: 'cancelled' })
        .eq('id', activeGiveaway.id)
      setActiveGiveaway(null)
    } catch { /* ignore */ }
  }

  // Cleanup old floating reactions
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      setFloatingReactions(prev => prev.filter(r => now - r.startTime < 2200))
    }, 500)
    return () => clearInterval(timer)
  }, [])

  // Simple local countdown: decrement every second
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timeLeft > 0]) // only re-run when transitioning between counting/not-counting

  // Auto-resolve when timer reaches 0: sell to highest bidder or mark unsold, then advance
  useEffect(() => {
    if (
      !currentItem ||
      currentItem.status !== 'active' ||
      timeLeft !== 0 ||
      autoResolvedRef.current === currentItem.id ||
      !user ||
      !streamId
    ) return

    // Mark this item as auto-resolved to prevent double-trigger
    autoResolvedRef.current = currentItem.id

    const autoResolve = async () => {
      // Use server API to resolve auction (bypasses RLS for reading bids + updating item)
      // Get fresh token to avoid stale session issues during long lives
      const { data: freshSession } = await supabase.auth.getSession()
      const freshToken = freshSession.session?.access_token
      if (!freshToken) {
        console.error('autoResolve: no fresh token available')
        return
      }

      try {
        const resp = await apiFetch(`/api/items/${currentItem.id}/end-auction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshToken}`,
          },
        })

        const result = await resp.json().catch(() => ({}))
        if (import.meta.env.DEV) console.log('[autoResolve] resp.ok=', resp.ok, 'status=', resp.status, 'result=', JSON.stringify(result))

        // If API failed, check DB directly as safety net
        if (!resp.ok) {
          const { data: dbItem } = await supabase.from('items').select('*').eq('id', currentItem.id).single()
          if (dbItem?.status === 'sold' && dbItem?.winner_id) {
            Object.assign(result, { status: 'sold', winner_id: dbItem.winner_id, final_price: dbItem.current_price })
          }
        }

        if (result.status === 'sold' && result.winner_id) {
          const winnerId = result.winner_id
          const finalPrice = result.final_price || currentItem.current_price

          // Fetch winner name
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', winnerId)
            .single()

          const winnerName = winnerProfile?.display_name || winnerProfile?.username || winnerId.slice(0, 8).toUpperCase()
          if (!announcedSoldRef.current.has(currentItem.id)) {
            announcedSoldRef.current.add(currentItem.id)
            showSoldOverlay(formatLot(currentIndex + 1), `@${winnerName}`, finalPrice)
          }
          // Résultat de l'autorisation de la carte du gagnant (faite par le serveur à la fin de l'enchère)
          const payment = result.payment as { status: string; code?: string } | null | undefined
          if (!payment) {
            showToast(ct.addressOk)
          } else if (payment.status === 'authorized' || payment.status === 'paid') {
            showToast(`${ct.cardAuthorized} — ${ct.addressOk}`)
            setPaymentIssue(null)
          } else if (result.order_id) {
            setPaymentIssue({ orderId: result.order_id, winnerName: `@${winnerName}`, lot: formatLot(currentIndex + 1), status: payment.status, code: payment.code })
          }

          setItems(prev => prev.map((it, i) =>
            i === currentIndex ? { ...it, status: 'sold' as const, winner_id: winnerId, current_price: finalPrice } : it
          ))
        } else {
          // No bids or unsold
          showSoldOverlay(formatLot(currentIndex + 1), '', 0, true)
          // Prix minimum non atteint alors qu'il y a eu des enchères : l'acheteur en tête reçoit une offre au prix minimum
          if (Number(currentItem.min_price) > 0 && Number(currentItem.current_price) > Number(currentItem.starting_price)
              && Number(currentItem.current_price) < Number(currentItem.min_price)) {
            showToast(ct.reserveOfferSent)
          }

          setItems(prev => prev.map((it, i) =>
            i === currentIndex ? { ...it, status: 'unsold' as const } : it
          ))
        }
      } catch (err) {
        console.error('Auto-resolve error:', err)
        // Fallback: mark unsold locally
        showSoldOverlay(formatLot(currentIndex + 1), '', 0, true)
        setItems(prev => prev.map((it, i) =>
          i === currentIndex ? { ...it, status: 'unsold' as const } : it
        ))
      }

      // Auto-advance after delay to let overlay show
      // Read from refs to avoid stale closures (items/currentIndex may have changed by the time this fires)
      setTimeout(() => {
        const latestItems = itemsRef.current
        const latestIndex = currentIndexRef.current
        const nextIdx = latestItems.findIndex((it, i) => i > latestIndex && (it.status === 'draft' || it.status === 'pending'))
        if (nextIdx >= 0) {
          setCurrentIndex(nextIdx)
        }
        // If no more items, stay on current view — seller manually ends the live
      }, 2500)
    }

    autoResolve()
  }, [timeLeft, currentItem?.id, currentItem?.status, user, streamId, showSoldOverlay, showToast, ct])

  // Reset auto-resolve ref when moving to a different item
  useEffect(() => {
    autoResolvedRef.current = null
  }, [currentIndex])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const handleActivateItem = async () => {
    if (!currentItem || !streamId) return
    const isSuddenDeath = currentItem.duration_seconds === -1
    const duration = isSuddenDeath ? 10 : (currentItem.duration_seconds || 60)

    // CRITICAL: Set timer BEFORE the API call to prevent auto-resolve race condition.
    // Without this, the realtime subscription can set status='active' while timeLeft is still 0,
    // triggering auto-resolve and immediately marking the item as sold.
    setTimeLeft(duration)
    autoResolvedRef.current = ''

    // Always get a fresh token — stale tokens are a common failure cause
    const { data: fs } = await supabase.auth.getSession()
    const tk = fs.session?.access_token
    if (!tk) {
      showToast(ct.errReconnect)
      console.error('[ACTIVATE] No session token — cannot activate')
      setTimeLeft(0)
      return
    }

    let activated = false

    // Call server API — it activates the item AND processes pre-bids
    try {
      const activateResp = await apiFetch(`/api/items/${currentItem.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tk}`,
        },
      })
      const activateBody = await activateResp.json().catch(() => ({}))
      if (import.meta.env.DEV) console.log('[ACTIVATE] status:', activateResp.status, 'response:', JSON.stringify(activateBody))

      if (activateResp.ok && activateBody.success) {
        activated = true
      } else if (activateBody?.error === 'authenticity_certification_required') {
        // Article de luxe sans certification d'authenticité : jamais mis en vente (pas de solution de repli)
        showToast(luxuryText().required)
        setTimeLeft(0)
        return
      } else {
        console.error('[ACTIVATE] API returned error:', activateResp.status, activateBody)
      }
    } catch (err) {
      console.error('[ACTIVATE] Network error calling API:', err)
    }

    // Fallback: direct Supabase update (no pre-bid processing) — only if API failed
    if (!activated) {
      console.warn('[ACTIVATE] API failed, falling back to direct DB update (pre-bids will NOT be processed)')
      const { error: dbErr } = await supabase
        .from('items')
        .update({ status: 'active' as const, started_at: new Date().toISOString() })
        .eq('id', currentItem.id)
      if (dbErr) {
        console.error('[ACTIVATE] Direct DB fallback also failed:', dbErr.message)
        showToast(ct.errActivation)
        setTimeLeft(0)
        return
      }
    }

    // Update local state
    setItems(prev => prev.map((it, i) =>
      i === currentIndex ? { ...it, status: 'active' as const, started_at: new Date().toISOString() } : it
    ))
  }

  // handleSold and handleUnsold removed — auction resolves automatically

  // Lot invendu : on le remet en brouillon au prix de départ, le bouton « Lancer l'enchère » réapparaît
  const handleRelaunchItem = async () => {
    if (!currentItem || currentItem.status !== 'unsold') return
    const { error } = await supabase
      .from('items')
      .update({ status: 'draft' as const, current_price: currentItem.starting_price, started_at: null })
      .eq('id', currentItem.id)
    if (error) { showToast(ct.errAddItem); return }
    autoResolvedRef.current = null
    setItems(prev => prev.map(it => it.id === currentItem.id
      ? { ...it, status: 'draft' as const, current_price: currentItem.starting_price, started_at: null }
      : it))
  }

  const handleSaveEditItem = async () => {
    if (!editItem) return
    const start = parseFloat(editItem.start.replace(',', '.'))
    const min = parseFloat(editItem.min.replace(',', '.'))
    const buyNow = parseFloat(editItem.buyNow.replace(',', '.'))
    if (!editItem.title.trim() || !(start > 0)) return
    setEditSaving(true)
    const patch = {
      title: `${editItem.title.trim()}${editItem.code}`,
      starting_price: start, current_price: start,
      min_price: min > 0 ? min : null, buy_now_price: buyNow > 0 ? buyNow : null,
    }
    const { error } = await supabase.from('items').update(patch).eq('id', editItem.id).in('status', ['draft', 'pending', 'unsold'])
    setEditSaving(false)
    if (error) { showToast(error.message?.includes('authenticity_certification_required') ? luxuryText().required : ct.editError); return }
    setItems(prev => prev.map(it => it.id === editItem.id ? { ...it, ...patch } : it))
    setEditItem(null)
  }

  const handleNextItem = () => {
    const nextIdx = items.findIndex((it, i) => i > currentIndex && (it.status === 'draft' || it.status === 'pending'))
    if (nextIdx >= 0) setCurrentIndex(nextIdx)
  }

  // Relance la caméra (et la diffusion) avec la même orientation : après un appel téléphonique ou un passage
  // en arrière-plan, iOS coupe la caméra et elle ne repartait jamais toute seule.
  const restartInFlightRef = useRef(false)
  const restartCamera = async (mode: 'user' | 'environment') => {
    // Une seule relance à la fois (deux relances croisées redonnaient l'image zoomée)
    if (restartInFlightRef.current) return
    restartInFlightRef.current = true
    try {
    // On attend que la caméra de la diffusion soit vraiment libérée : sinon iOS donne à l'aperçu
    // un format recadré (le vendeur se voyait zoomé après un appel, les acheteurs non)
    await stopBroadcast()
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop())
    await new Promise(r => setTimeout(r, 300))
    try {
      const qualityConstraints = getStreamQualityConstraints()
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: qualityConstraints.width }, height: { ideal: qualityConstraints.height } },
        audio: true,
      })
      mediaStreamRef.current = ms
      if (videoRef.current) videoRef.current.srcObject = ms
      broadcastStartedRef.current = false
      setTimeout(() => startBroadcast(), 500)
    } catch {
      // caméra indisponible (encore en appel ?) : on réessaiera au prochain retour au premier plan
    }
    } finally {
      setTimeout(() => { restartInFlightRef.current = false }, 1500)
    }
  }
  const catchUpItems = async () => {
    if (!streamId) return
    const { data } = await supabase.from('items').select('*').eq('stream_id', streamId).order('created_at', { ascending: true })
    if (!data) return
    for (const fresh of data as Item[]) {
      const before = itemsRef.current.find(it => it.id === fresh.id)
      if (fresh.status === 'sold' && fresh.winner_id && before && before.status !== 'sold') {
        announceSaleRef.current(fresh.id, fresh.winner_id, Number(fresh.current_price)).catch(() => {})
      }
    }
    setItems(prev => prev.map(it => (data as Item[]).find(f => f.id === it.id) || it))
  }
  const catchUpItemsRef = useRef(catchUpItems)
  catchUpItemsRef.current = catchUpItems

  const restartCameraRef = useRef(restartCamera)
  restartCameraRef.current = restartCamera
  const facingModeRef = useRef(facingMode)
  facingModeRef.current = facingMode

  // En entrant dans le live : page remise tout en haut (le défilement de l'écran précédent décalait la vidéo)
  useEffect(() => {
    window.scrollTo(0, 0)
    const root = document.getElementById('root')
    if (root) root.scrollTop = 0
    document.querySelector('.app-scroll')?.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const cameraIsDead = () => {
      const tracks = mediaStreamRef.current?.getVideoTracks() || []
      return tracks.length === 0 || tracks.some(t => t.readyState === 'ended' || t.muted)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      // petit délai : iOS rend la caméra un instant après le retour au premier plan
      // 2,5 s : après un appel, iOS rend la caméra lui-même ; on ne relance que si elle est toujours coupée
      setTimeout(() => { if (cameraIsDead()) restartCameraRef.current(facingModeRef.current) }, 2500)
      // Pendant un appel, l'appli est en pause et rate les événements en direct :
      // on recharge les articles et on annonce une vente survenue entre-temps
      catchUpItemsRef.current().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    // Caméra coupée sans quitter l'appli (notification, son d'un autre appli…) : relance après 2 contrôles de suite
    let deadChecks = 0
    let restarting = false
    let lastRestart = 0
    const watchdog = setInterval(async () => {
      if (document.visibilityState !== 'visible' || restarting || !mediaStreamRef.current) { deadChecks = 0; return }
      const tracks = mediaStreamRef.current.getVideoTracks()
      const ended = tracks.length === 0 || tracks.some(t => t.readyState === 'ended')
      deadChecks = ended ? deadChecks + 1 : 0
      // 3 contrôles d'affilée (6 s) et au moins 15 s entre deux relances : jamais de relance en boucle
      if (deadChecks >= 3 && Date.now() - lastRestart > 15_000) {
        deadChecks = 0
        restarting = true
        lastRestart = Date.now()
        try { await restartCameraRef.current(facingModeRef.current) } finally { restarting = false }
      }
    }, 2000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      clearInterval(watchdog)
    }
  }, [])

  const handleFlipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)

    // Stop LiveKit broadcast and restart with new camera (attendre la libération de la caméra, même raison)
    await stopBroadcast()

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
    }
    await new Promise(r => setTimeout(r, 300))
    try {
      const qualityConstraints = getStreamQualityConstraints()
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: qualityConstraints.width }, height: { ideal: qualityConstraints.height } },
        audio: true,
      })
      mediaStreamRef.current = ms
      if (videoRef.current) videoRef.current.srcObject = ms

      // Restart LiveKit broadcast after a small delay
      broadcastStartedRef.current = false
      setTimeout(() => startBroadcast(), 500)
    } catch {
      // Camera flip failed
    }
  }

  const handleGetRtmpUrl = async () => {
    if (obsData) { setShowObsModal(true); return }
    setObsLoading(true)
    setShowObsModal(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return
      const resp = await apiFetch(`/api/streams/${streamId}/rtmp-url`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        setObsData({ rtmp_url: data.rtmp_url, stream_key: data.stream_key })
      }
    } catch (err) { console.error('RTMP URL error:', err) }
    finally { setObsLoading(false) }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* */ }
    setObsCopied(label)
    setTimeout(() => setObsCopied(null), 2000)
  }

  const handleBoostLive = async () => {
    if (isBoosted || boostLoading) return
    setShowBoostConfirm(false)
    setBoostLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { alert(ct.sessionExpired); setBoostLoading(false); return }
      const resp = await apiFetch(`/api/streams/${streamId}/boost`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const result = await resp.json().catch(() => ({}))
      if (resp.ok) {
        setIsBoosted(true)
      } else if (result.error === 'no_card') {
        alert(ct.boostNoCard)
      } else {
        alert(ct.boostPayFailed)
      }
    } catch (err) { console.error('Boost error:', err); alert(ct.boostPayFailed) }
    setBoostLoading(false)
  }

  // Co-host search
  const handleCohostSearch = async (q: string) => {
    setCohostSearch(q)
    if (q.length < 2) { setCohostResults([]); return }
    setCohostSearching(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { showToast(ct.sessionExpired); setCohostSearching(false); return }
      const resp = await apiFetch('/api/sellers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      })
      const data = await resp.json()
      setCohostResults(data.sellers || [])
    } catch { setCohostResults([]) }
    setCohostSearching(false)
  }

  const handleInviteCohost = async (sellerId: string, name: string, avatar: string | null) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { showToast(ct.sessionExpired); return }
      const resp = await apiFetch(`/api/streams/${streamId}/cohost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cohost_id: sellerId }),
      })
      if (resp.ok) {
        setCohost({ id: sellerId, display_name: name, avatar_url: avatar })
        setShowCohostModal(false)
        setCohostSearch('')
        setCohostResults([])
      }
    } catch (err) { console.error('Cohost invite error:', err) }
  }

  const handleRemoveCohost = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { showToast(ct.sessionExpired); return }
      const resp = await apiFetch(`/api/streams/${streamId}/cohost`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) { showToast(ct.errCohostRemove); return }
      setCohost(null)
    } catch (err) { console.error('Cohost remove error:', err) }
  }

  // Multicast
  const handleStartMulticast = async () => {
    if (!multicastUrl.trim() || multicastLoading) return
    setMulticastLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { showToast(ct.sessionExpired); setMulticastLoading(false); return }
      const resp = await apiFetch(`/api/streams/${streamId}/multicast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rtmp_url: multicastUrl.trim() }),
      })
      const data = await resp.json()
      if (resp.ok && data.egress_id) {
        setMulticastDestinations(prev => [...prev, { url: multicastUrl.trim(), egressId: data.egress_id }])
        setMulticastUrl('')
      }
    } catch (err) { console.error('Multicast error:', err) }
    setMulticastLoading(false)
  }

  const handleStopMulticast = async (egressId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) { showToast(ct.sessionExpired); return }
      const resp = await apiFetch(`/api/streams/${streamId}/multicast/${egressId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) { showToast(ct.errMulticastStop); return }
      setMulticastDestinations(prev => prev.filter(d => d.egressId !== egressId))
    } catch (err) { console.error('Stop multicast error:', err) }
  }

  const endingRef = useRef(false)
  const handleEndLive = async () => {
    // Un seul appui suffit : on affiche tout de suite l'écran de fin, l'arrêt côté serveur suit en arrière-plan
    if (endingRef.current) return
    endingRef.current = true
    unlockBody()
    setShowEndConfirm(false)
    setLiveEnded(true)
    // Le live est terminé tout de suite pour tout le monde (accueil, bandeau « Revenir au live ») ;
    // l'arrêt de la vidéo côté serveur suit
    if (streamId) {
      try { sessionStorage.setItem('shapop_ended_live', streamId) } catch { /* ignore */ }
      supabase.from('streams').update({ status: 'ended' as const, ended_at: new Date().toISOString() })
        .eq('id', streamId).eq('status', 'live').then(() => {}, () => {})
    }

    // Stop LiveKit broadcast
    stopBroadcast()

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    if (streamId) {
      // End LiveKit stream via API (use fresh token)
      const { data: endSession } = await supabase.auth.getSession()
      const endToken = endSession.session?.access_token
      if (endToken) {
        try {
          await apiFetch(`/api/streams/${streamId}/end-livekit-stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${endToken}`,
            },
          })
        } catch {
          // Fallback: update status directly
          await supabase
            .from('streams')
            .update({
              status: 'ended' as const,
              ended_at: new Date().toISOString(),
            })
            .eq('id', streamId)
        }
      } else {
        // No token available, update directly
        await supabase
          .from('streams')
          .update({
            status: 'ended' as const,
            ended_at: new Date().toISOString(),
          })
          .eq('id', streamId)
      }
    }

  }
  handleEndLiveRef.current = handleEndLive

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !streamId) return
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      await apiFetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ stream_id: streamId, message: newMessage.trim() }),
      })
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send chat message:', err)
    }
  }

  const handleEndAuctionEarly = () => {
    if (!currentItem || currentItem.status !== 'active') return
    // Setting timeLeft to 0 triggers the existing autoResolve useEffect
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setTimeLeft(0)
  }

  const handleAddItemDuringLive = async () => {
    if (!addItemTitle.trim() || !addItemPrice || !user || !streamId) return
    const price = parseFloat(addItemPrice)
    if (isNaN(price) || price <= 0) return
    const minPrice = addItemMinPrice ? parseFloat(addItemMinPrice) : 0
    const buyNowPrice = addItemBuyNowPrice ? parseFloat(addItemBuyNowPrice) : 0
    const qty = Math.max(1, Math.min(addItemQuantity, 50))

    setAddingItem(true)
    // Photo de l'article : image de ce que filme la caméra au moment de l'ajout (sinon l'article n'a aucune photo
    // dans les commandes, « À remettre », etc.)
    const photoUrl = await captureCameraPhoto(videoRef.current, user.id)
    const newItems: Item[] = []
    for (let i = 0; i < qty; i++) {
      const title = qty > 1 ? `${addItemTitle.trim()} #${i + 1}` : addItemTitle.trim()
      const { data, error } = await supabase
        .from('items')
        .insert({
          seller_id: user.id,
          stream_id: streamId,
          title,
          category: 'other',
          starting_price: price,
          current_price: price,
          min_price: minPrice > 0 ? minPrice : null,
          buy_now_price: buyNowPrice > 0 ? buyNowPrice : null,
          status: 'draft' as const,
          duration_seconds: addItemDuration,
          ...(photoUrl ? { image_urls: [photoUrl] } : {}),
        })
        .select()
        .single()

      if (error) {
        console.error('Add item error:', error)
        showToast(ct.errAddItem)
        break
      }
      if (data) newItems.push(data)
    }

    if (newItems.length > 0) {
      setItems(prev => {
        const updated = [...prev, ...newItems]
        if (prev.length === 0 || currentIndex < 0) {
          setCurrentIndex(updated.length - 1)
        }
        return updated
      })
      setAddItemTitle('')
      setAddItemPrice('')
      setAddItemMinPrice('')
      setAddItemBuyNowPrice('')
      setAddItemQuantity(1)
      setAddItemDuration(60)
      setShowAddItem(false)
      showToast(`${fill(ct.itemsAdded, { n: newItems.length })} ✓`)
    }
    setAddingItem(false)
  }

  const hasMoreItems = items.some((it, i) => i > currentIndex && (it.status === 'draft' || it.status === 'pending'))

  // Format timer
  // Post-live screen
  if (liveEnded) {
    return (
      <div className="no-theme-invert" style={{
        position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '24px', padding: '32px',
        overflow: 'hidden', width: '100%', height: '100vh',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.05))',
          border: '1px solid rgba(0,229,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 'calc(24px * var(--fs, 1))', fontWeight: 800, color: '#fff', textAlign: 'center' }}>
          {ct.liveEnded}
        </h2>
        <p style={{ fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center' }}>
          {fill(ct.soldSummary, { sold: items.filter(it => it.status === 'sold').length, total: items.length })}
        </p>
        <button
          onClick={() => { unlockBody(); navigate(`/live-recap/${streamId}`) }}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
            boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
            borderRadius: '14px', border: '2px solid #00E5FF',
            color: '#00E5FF', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {ct.recap}
        </button>
        <button
          onClick={() => { unlockBody(); navigate('/') }}
          style={{
            width: '100%', maxWidth: '300px', padding: '16px',
            backgroundColor: 'transparent',
            borderRadius: '14px', border: '1px solid #333',
            color: '#f0f0f0', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ct.back}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="no-theme-invert"
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100vh',
        backgroundColor: '#000', zIndex: 200,
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Floating emoji reactions from viewers */}
      {floatingReactions.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          left: 0,
          right: 0,
          height: '250px',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'visible',
        }}>
          {floatingReactions.map(r => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                bottom: '0',
                left: `${r.x}%`, // i18n-ignore (position aléatoire décorative)
                fontSize: 'calc(32px * var(--fs, 1))',
                animation: 'floatUpReaction 2s ease-out forwards',
                pointerEvents: 'none',
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Full-screen video */}
      {/* Miroir appliqué au conteneur, pas à la vidéo : sur iPhone, une vidéo transformée
          ignore object-fit et reste dans un cadre au milieu de l'écran. */}
      <div style={{
        // fixé à l'écran (et non à la page) : sinon la vidéo héritait du défilement de l'écran précédent (bande noire en haut)
        position: 'fixed', inset: 0, overflow: 'hidden',
        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
      }}>
        <video
          ref={videoRef}
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '260px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6) 50%, transparent)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 44px) + 8px)',
        left: '8px', right: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 20,
      }}>
        {/* Left: accueil (sans terminer le live) + LIVE dot + viewer count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => navigate('/')}
          aria-label={ct.goHome}
          style={{
            width: '34px', height: '34px', borderRadius: '50%', border: 'none',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" />
          </svg>
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '100px',
          padding: '4px 10px 4px 8px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: lkConnected ? '#00E5FF' : '#888',
            marginInlineEnd: '6px',
            animation: lkConnected ? 'liveDot 1.5s ease-in-out infinite' : 'none',
            boxShadow: lkConnected ? '0 0 6px rgba(0,229,255,0.6)' : 'none',
          }} />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ marginInlineEnd: '3px' }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{viewerCount}</span>
        </div>
        </div>

        {/* Buyer stats badge */}
        {buyerStats && (buyerStats.returning > 0 || buyerStats.new > 0) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '100px',
            padding: '4px 10px',
            backdropFilter: 'blur(8px)',
          }}>
            {buyerStats.returning > 0 && (
              <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
                {buyerStats.returning} {ct.returningBuyers}
              </span>
            )}
            {buyerStats.returning > 0 && buyerStats.new > 0 && (
              <span style={{ fontSize: 'calc(10px * var(--fs, 1))', color: '#f0f0f0' }}>|</span>
            )}
            {buyerStats.new > 0 && (
              <span style={{ fontSize: 'calc(10px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
                {buyerStats.new} {ct.newBuyers}
              </span>
            )}
          </div>
        )}

        {/* Right: end + camera + gift + more menu */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isStreamOwner && <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              height: '36px', padding: '0 12px',
              borderRadius: '100px',
              // Transparent avec contour rouge : arrêter le direct
              backgroundColor: 'rgba(232,52,78,0.15)',
              border: '1.5px solid rgba(232,52,78,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
            <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color: '#fff' }}>{ct.endLive}</span>
          </button>}
          <button
            onClick={handleFlipCamera}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4M4 8V4a2 2 0 012-2h12a2 2 0 012 2v4"/>
              <polyline points="16 12 12 8 8 12"/>
              <polyline points="16 12 12 16 8 12"/>
            </svg>
          </button>
          {isStreamOwner && <>
          <button
            onClick={() => setShowGiveawayForm(true)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 'calc(16px * var(--fs, 1))', lineHeight: 1 }}>🎁</span>
            {activeGiveaway && activeGiveaway.status === 'active' && (
              <span style={{ position: 'absolute', top: '-4px', insetInlineEnd: '-4px', fontSize: 'calc(9px * var(--fs, 1))', fontWeight: 800, color: '#001014', backgroundColor: '#00E5FF', borderRadius: '100px', padding: '1px 5px' }}>
                {activeGiveaway.entry_count}
              </span>
            )}
          </button>
          {/* More tools menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            {showToolsMenu && (
              <div style={{
                position: 'absolute', top: '42px', insetInlineEnd: 0,
                backgroundColor: 'rgba(20,20,20,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px',
                display: 'flex', flexDirection: 'column', gap: '2px',
                minWidth: '160px',
                zIndex: 50,
              }}>
                {PAID_EXTRAS_ENABLED && <button
                  onClick={() => { setShowToolsMenu(false); !isBoosted && !boostLoading && setShowBoostConfirm(true) }}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 'calc(14px * var(--fs, 1))' }}>⚡</span>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: isBoosted ? '#10B981' : '#fff' }}>
                    {isBoosted ? ct.boostActive : ct.boostLive}
                  </span>
                </button>}
                <button
                  onClick={() => { setShowToolsMenu(false); cohost ? handleRemoveCohost() : setShowCohostModal(true) }}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cohost ? '#00E5FF' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
                  </svg>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: cohost ? '#00E5FF' : '#fff' }}>
                    {ct.cohostActive}{cohost ? `: ${cohost.display_name}` : ''}
                  </span>
                </button>
                <button
                  onClick={() => { setShowToolsMenu(false); handleGetRtmpUrl() }}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={obsData ? '#60a5fa' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: obsData ? '#60a5fa' : '#fff' }}>OBS / RTMP</span>{/* i18n-ignore */}
                </button>
                <button
                  onClick={() => { setShowToolsMenu(false); setShowMulticastModal(true) }}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={multicastDestinations.length > 0 ? '#3B82F6' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><line x1="2" y1="20" x2="2.01" y2="20"/>
                  </svg>
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: multicastDestinations.length > 0 ? '#3B82F6' : '#fff' }}>
                    {ct.multicast}{multicastDestinations.length > 0 ? ` (${multicastDestinations.length})` : ''}
                  </span>
                </button>
              </div>
            )}
          </div>
          </>}
        </div>
      </div>

      {/* Return policy badge — removed from live view to reduce clutter */}
      {(() => {
        void returnPolicy
        return null
      })()}

      {/* Toasts */}
      <div style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top, 44px) + 76px)',
        left: '12px', right: '12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        zIndex: 30, pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: '10px',
              animation: 'toastIn 0.3s ease',
            }}
          >
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600, color: '#22C55E', margin: 0 }}>
              {toast.text}
            </p>
          </div>
        ))}
      </div>

      {/* Carte du gagnant refusée : le vendeur le dit en direct et réessaie */}
      {paymentIssue && (
        <div role="alert" style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 44px) + 76px)',
          left: '12px', right: '12px', zIndex: 240,
          padding: '12px 14px', borderRadius: '12px',
          backgroundColor: 'rgba(220,38,38,0.92)', border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)', color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ margin: 0, fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, flex: 1 }}>
              {paymentIssue.code === 'seller_not_ready' ? ct.paymentsNotReady : `${ct.cardDeclined} — ${paymentIssue.lot}`}
            </p>
            <button onClick={() => setPaymentIssue(null)} aria-label={ct.closeBanner} style={{
              background: 'transparent', border: 'none', color: '#fff', fontSize: 'calc(20px * var(--fs, 1))', lineHeight: 1, padding: '2px 6px', cursor: 'pointer',
            }}>×</button>
          </div>
          {paymentIssue.code !== 'seller_not_ready' && (
            <>
              <p style={{ margin: '4px 0 10px', fontSize: 'calc(13px * var(--fs, 1))', opacity: 0.95 }}>
                {ct.cardDeclinedHint.replace('{name}', paymentIssue.winnerName)}
              </p>
              <button onClick={retryCardAuthorization} disabled={retryingCard} style={{
                width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                backgroundColor: '#fff', color: '#DC2626', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 800,
                cursor: retryingCard ? 'default' : 'pointer', opacity: retryingCard ? 0.7 : 1,
              }}>
                {retryingCard ? ct.retryingCard : ct.retryCard}
              </button>
            </>
          )}
        </div>
      )}

      {showItemsList && (
        <div onClick={() => setShowItemsList(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxHeight: '75vh', overflowY: 'auto', backgroundColor: '#111',
            borderRadius: '20px 20px 0 0', padding: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: 'calc(19px * var(--fs, 1))', fontWeight: 800, color: '#fff' }}>{ct.myItems} ({items.length})</p>
              <button onClick={() => setShowItemsList(false)} style={{ background: 'none', border: 'none', color: '#f0f0f0', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer' }}>{ct.closeList}</button>
            </div>
            {editItem && (
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: '14px', padding: '12px', marginBottom: '12px', border: '1px solid #00E5FF' }}>
                <label style={{ display: 'block', fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', marginBottom: '4px' }}>{ct.editTitle}</label>
                <input value={editItem.title} maxLength={60} onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', marginBottom: '8px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {([['start', ct.editStart], ['min', ct.editMin], ['buyNow', ct.editBuyNow]] as const).map(([f, l]) => (
                    <label key={f} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: f === 'start' ? '#00E5FF' : '#f0f0f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
                      <input value={editItem[f]} inputMode="decimal" placeholder="—"
                        onChange={e => setEditItem({ ...editItem, [f]: e.target.value.replace(/[^0-9.,]/g, '') })}
                        style={{ width: '100%', padding: '10px 8px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0A0A0A', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', minWidth: 0 }} />
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => setEditItem(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600 }}>{ct.addItemCancel}</button>
                  <button onClick={handleSaveEditItem} disabled={editSaving} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #00E5FF, #0091EA)', color: '#001014', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 800, opacity: editSaving ? 0.6 : 1 }}>{editSaving ? '…' : ct.editSave}</button>
                </div>
              </div>
            )}
            {items.map((it, i) => {
              const label = it.status === 'sold' ? ct.itemSold : it.status === 'unsold' ? ct.itemUnsold : it.status === 'active' ? ct.itemLive : ct.itemToSell
              const color = it.status === 'sold' ? '#22C55E' : it.status === 'unsold' ? '#FF9632' : it.status === 'active' ? '#00E5FF' : '#00E5FF'
              const selectable = (it.status === 'draft' || it.status === 'pending' || it.status === 'unsold') && currentItem?.status !== 'active'
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <button disabled={!selectable} onClick={() => { setCurrentIndex(i); setShowItemsList(false) }} style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                  borderRadius: '14px', textAlign: 'start',
                  backgroundColor: i === currentIndex ? 'rgba(0, 229, 255,0.15)' : '#1A1A1A',
                  border: i === currentIndex ? '1px solid #00E5FF' : '1px solid transparent',
                  cursor: selectable ? 'pointer' : 'default', opacity: selectable || i === currentIndex ? 1 : 0.6,
                }}>
                  {it.image_urls?.[0]
                    ? <img src={it.image_urls[0]} alt="" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '56px', height: '56px', borderRadius: '10px', backgroundColor: '#222', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatLot(i + 1)} · {it.title}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 'calc(14px * var(--fs, 1))', color: '#00E5FF', fontWeight: 700 }}>{money(it.current_price)}</p>
                  </div>
                  <span style={{ fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 700, color, flexShrink: 0 }}>{label}</span>
                </button>
                {(it.status === 'draft' || it.status === 'pending' || it.status === 'unsold') && (
                  <button onClick={() => setEditItem({
                    id: it.id, title: it.title.replace(/\s*\[[A-Z0-9]{3,8}\]\s*$/, ''),
                    code: it.title.match(/\s*\[[A-Z0-9]{3,8}\]\s*$/)?.[0] || '',
                    start: String(it.starting_price), min: it.min_price ? String(it.min_price) : '', buyNow: it.buy_now_price ? String(it.buy_now_price) : '',
                  })} style={{
                    padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255,0.5)',
                    backgroundColor: 'rgba(0, 229, 255,0.12)', color: '#00E5FF', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}>{ct.editItemBtn}</button>
                )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== BOTTOM OVERLAY: chat + input + item panel ===== */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 34px) + 16px + var(--kb, 0px))',
        left: '10px', right: '10px',
        zIndex: 15,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {/* Chat : les 5 derniers messages restent affichés (le vendeur doit pouvoir lire les questions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '70%' }}>
          {messages.slice(-5).map((msg, i, arr) => {
            const opacity = i < arr.length - 2 ? 0.5 : i < arr.length - 1 ? 0.75 : 1
            const sys = formatSystemMessage(msg.message)
            return (
              <div key={msg.id} style={{
                padding: '2px 0',
                opacity,
                animation: 'chatMsgIn 0.3s ease',
              }}>
                <span style={{
                  fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  marginInlineEnd: '5px',
                }}>
                  {sys && !sys.withAuthor ? '' : (msg.user_profile?.display_name || ct.anonymous || '?')}
                </span>
                <span style={{
                  fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 500,
                  color: msg.is_flagged ? 'rgba(255,255,255,0.4)' : '#fff',
                  fontStyle: msg.is_flagged ? 'italic' : 'normal',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  wordBreak: 'break-word',
                }}>
                  {msg.is_flagged ? ct.messageFlagged : sys ? sys.text : msg.message}
                </span>
              </div>
            )
          })}
        </div>

        {/* Chat input */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={ct.sendMessage}
            style={{
              flex: 1, padding: '12px 16px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '100px',
              color: '#fff', fontSize: 'calc(15px * var(--fs, 1))',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '12px 18px',
              borderRadius: '100px',
              background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
              boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
              border: '2px solid #00E5FF', color: '#00E5FF',
              fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {ct.send}
          </button>
        </div>

        {/* Panneau article + commandes : voile léger, la caméra reste visible derrière (façon Whatnot) */}
        {isStreamOwner && <div style={{
          backgroundColor: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: '14px',
          padding: '8px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          border: '1px solid rgba(0,229,255,0.25)',
        }}>
          {/* Item info row */}
          {currentItem && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                backgroundColor: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {currentItem.image_urls?.[0] ? (
                  <img src={currentItem.image_urls[0]} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = ''; img.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; img.alt = '' }} />
                ) : (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>
                    {formatLot(currentIndex + 1)}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, color: '#00E5FF' }}>
                  {ct.lot} {formatLot(currentIndex + 1)}
                </span>
                <p style={{
                  fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, color: '#fff', margin: '1px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {displayItemTitle(currentItem.title)}
                </p>
              </div>

              {/* Timer */}
              {currentItem.status === 'active' && timeLeft > 0 ? (
                <div style={{
                  flexShrink: 0,
                  backgroundColor: timeLeft <= 10 ? 'rgba(0,229,255,0.4)' : 'rgba(0, 229, 255,0.25)',
                  border: timeLeft <= 10 ? '2px solid #00E5FF' : '1px solid #00E5FF',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  textAlign: 'center',
                  animation: timeLeft <= 10 ? 'timerPulse 0.5s ease-in-out infinite' : 'none',
                }}>
                  <div style={{
                    fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 900,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                    {timeLeft}
                  </div>
                  <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: timeLeft <= 10 ? '#ff8888' : '#ccc', fontWeight: 700 }}>
                    {ct.seconds}
                  </div>
                </div>
              ) : currentItem.status === 'draft' ? (
                <div style={{
                  flexShrink: 0,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {currentItem.duration_seconds || 60}
                  </div>
                  <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', fontWeight: 600 }}>
                    {ct.seconds}
                  </div>
                </div>
              ) : null}

              <div style={{ flexShrink: 0, textAlign: 'end' }}>
                <p style={{
                  fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1,
                }}>
                  {money(currentItem.current_price)}
                </p>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS — compact row */}
          {currentItem?.status === 'draft' && (
            <button
              onClick={handleActivateItem}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
                boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
                borderRadius: '10px', border: '2px solid #00E5FF',
                color: '#00E5FF', fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ▶ {ct.startAuction}
            </button>
          )}

          {currentItem?.status === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                flex: 1, padding: '6px 10px', borderRadius: '8px',
                backgroundColor: 'rgba(0, 229, 255,0.1)',
                border: '1px solid rgba(0, 229, 255,0.15)',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#00E5FF', fontWeight: 600 }}>
                  {timeLeft > 0 ? ct.auctionLive : ct.resolving}
                </span>
                {currentItem.min_price != null && currentItem.min_price > 0 && (
                  <span style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', marginInlineStart: '6px' }}>
                    {fill(ct.minPrice, { price: money(currentItem.min_price) })}
                  </span>
                )}
              </div>
              {timeLeft > 0 && (
                <button
                  onClick={handleEndAuctionEarly}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {ct.endAuction}
                </button>
              )}
            </div>
          )}

          {currentItem?.status === 'unsold' && (
            <button
              onClick={handleRelaunchItem}
              style={{
                width: '100%', padding: '12px',
                // Transparent comme « Mes articles »
                backgroundColor: 'rgba(0, 229, 255,0.12)',
                border: '1px solid rgba(0, 229, 255,0.4)',
                borderRadius: '10px',
                color: '#00E5FF', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.relaunch}
            </button>
          )}

          {(currentItem?.status === 'sold' || currentItem?.status === 'unsold') && hasMoreItems && (
            <button
              onClick={handleNextItem}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
                boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
                borderRadius: '10px', border: '2px solid #00E5FF',
                color: '#00E5FF', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.nextItem}
            </button>
          )}

          {(currentItem?.status === 'sold' || currentItem?.status === 'unsold') && !hasMoreItems && (
            <p style={{
              padding: '4px', textAlign: 'center',
              fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0', margin: 0,
            }}>
              {ct.noMoreItems}
            </p>
          )}

          {/* Add item button — compact */}
          {/* Liste de tous les articles du live : on choisit celui à mettre en vente */}
          {!showAddItem && items.length > 0 && (
            <button
              onClick={() => setShowItemsList(true)}
              style={{
                width: '100%', padding: '10px',
                backgroundColor: 'rgba(0, 229, 255,0.12)',
                border: '1px solid rgba(0, 229, 255,0.4)',
                borderRadius: '10px',
                color: '#00E5FF', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.myItems} ({items.length})
            </button>
          )}

          {!showAddItem && (
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                width: '100%', padding: '7px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#f0f0f0', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
              </svg>
              {ct.addItem}
            </button>
          )}

          {/* Add item quick form */}
          {showAddItem && (
            <div style={{
              padding: '8px', borderRadius: '10px',
              backgroundColor: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <input
                type="text"
                value={addItemTitle}
                onChange={e => setAddItemTitle(e.target.value)}
                placeholder={ct.addItemTitle}
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="number"
                inputMode="decimal"
                value={addItemPrice}
                onChange={e => setAddItemPrice(e.target.value)}
                placeholder={fill(ct.addItemPrice, { cur: curSym })}
                min="0"
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="number"
                inputMode="decimal"
                value={addItemMinPrice}
                onChange={e => setAddItemMinPrice(e.target.value)}
                placeholder={fill(ct.addItemMinPrice, { cur: curSym })}
                min="0"
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,215,0,0.2)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="number"
                inputMode="decimal"
                value={addItemBuyNowPrice}
                onChange={e => setAddItemBuyNowPrice(e.target.value)}
                placeholder={fill(ct.addItemBuyNow, { cur: curSym })}
                min="0"
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(0,229,255,0.3)',
                  borderRadius: '8px',
                  color: '#fff', fontSize: 'calc(12px * var(--fs, 1))',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {/* Quantity selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => setAddItemQuantity(q => Math.max(1, q - 1))}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
                <span style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', minWidth: '28px', textAlign: 'center' }}>
                  {addItemQuantity}
                </span>
                <button
                  onClick={() => setAddItemQuantity(q => Math.min(50, q + 1))}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              </div>
              {/* Duration selector */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[30, 45, 60].map(d => (
                  <button
                    key={d}
                    onClick={() => setAddItemDuration(d)}
                    style={{
                      flex: 1, padding: '7px 0',
                      backgroundColor: addItemDuration === d ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)',
                      border: addItemDuration === d ? '1px solid #00E5FF' : '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: addItemDuration === d ? '#00E5FF' : '#f0f0f0',
                      fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {d}{ct.seconds}
                  </button>
                ))}
                <button
                  onClick={() => setAddItemDuration(-1)}
                  title={ct.sdTitle}
                  style={{
                    flex: 1, padding: '7px 0',
                    backgroundColor: addItemDuration === -1 ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)',
                    border: addItemDuration === -1 ? '1px solid #00E5FF' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: addItemDuration === -1 ? '#00E5FF' : '#f0f0f0',
                    fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {ct.sdShort}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { setShowAddItem(false); setAddItemTitle(''); setAddItemPrice(''); setAddItemMinPrice(''); setAddItemBuyNowPrice(''); setAddItemQuantity(1); setAddItemDuration(60) }}
                  style={{
                    flex: 1, padding: '8px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#f0f0f0', fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {ct.addItemCancel}
                </button>
                <button
                  onClick={handleAddItemDuringLive}
                  disabled={addingItem || !addItemTitle.trim() || !addItemPrice}
                  style={{
                    flex: 1, padding: '8px',
                    background: 'rgba(0,10,14,0.35)', // néon transparent : la vidéo se voit derrière
                    boxShadow: '0 0 14px rgba(0,229,255,0.55), inset 0 0 8px rgba(0,229,255,0.15)',
                    border: '2px solid #00E5FF',
                    borderRadius: '8px',
                    color: '#00E5FF', fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700,
                    cursor: 'pointer',
                    opacity: addingItem || !addItemTitle.trim() || !addItemPrice ? 0.5 : 1,
                  }}
                >
                  {ct.addItemAdd}
                </button>
              </div>
            </div>
          )}
        </div>}
      </div>

      {/* Giveaway form/panel overlay */}
      {showGiveawayForm && (
        <div
          onClick={() => setShowGiveawayForm(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 280, padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '360px',
              backgroundColor: '#111',
              borderRadius: '18px',
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              border: '1px solid rgba(255,215,0,0.2)',
              marginBottom: 'env(safe-area-inset-bottom, 34px)',
              animation: 'slideUpGift 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 'calc(24px * var(--fs, 1))' }}>🎁</span>
              <span style={{ fontSize: 'calc(17px * var(--fs, 1))', fontWeight: 800, color: '#FFD700' }}>
                {ct.giftTitle}
              </span>
            </div>

            {!activeGiveaway || activeGiveaway.status !== 'active' ? (
              <>
                <input
                  type="text"
                  value={giveawayPrize}
                  onChange={e => setGiveawayPrize(e.target.value)}
                  placeholder={ct.giftPrizePlaceholder}
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: '12px',
                    color: '#fff', fontSize: 'calc(14px * var(--fs, 1))',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginTop: '10px', marginBottom: '10px',
                  padding: '10px 12px',
                  backgroundColor: giveawayBuyersOnly ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)',
                  border: giveawayBuyersOnly ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={giveawayBuyersOnly}
                    onChange={e => setGiveawayBuyersOnly(e.target.checked)}
                    style={{ accentColor: '#FFD700', width: '18px', height: '18px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: giveawayBuyersOnly ? '#FFD700' : '#f0f0f0', fontWeight: 600 }}>
                    {ct.buyersOnly}
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setShowGiveawayForm(false); setGiveawayPrize(''); setGiveawayBuyersOnly(false) }}
                    style={{
                      flex: 1, padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.giftCancel}
                  </button>
                  <button
                    onClick={handleLaunchGiveaway}
                    disabled={!giveawayPrize.trim()}
                    style={{
                      flex: 1, padding: '12px',
                      background: !giveawayPrize.trim()
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none',
                      borderRadius: '12px',
                      color: !giveawayPrize.trim() ? '#666' : '#000',
                      fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 800,
                      cursor: !giveawayPrize.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ct.giftLaunch}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{
                  fontSize: 'calc(14px * var(--fs, 1))', color: '#ccc', margin: 0,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '10px 12px', borderRadius: '10px',
                }}>
                  {activeGiveaway.prize_description}
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '8px 0',
                }}>
                  <span style={{ fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 900, color: '#fff' }}>
                    {activeGiveaway.entry_count}
                  </span>
                  <span style={{ fontSize: 'calc(14px * var(--fs, 1))', color: '#f0f0f0' }}>
                    {ct.giftParticipants}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { handleCancelGiveaway(); setShowGiveawayForm(false) }}
                    style={{
                      flex: 1, padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ct.giftCancel}
                  </button>
                  <button
                    onClick={() => { handleDrawWinner(); setShowGiveawayForm(false) }}
                    disabled={giveawayDrawing || activeGiveaway.entry_count === 0}
                    style={{
                      flex: 1, padding: '12px',
                      background: activeGiveaway.entry_count === 0
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none',
                      borderRadius: '12px',
                      color: activeGiveaway.entry_count === 0 ? '#666' : '#000',
                      fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 800,
                      cursor: activeGiveaway.entry_count === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {giveawayDrawing ? '...' : ct.giftDraw}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Giveaway winner overlay */}
      {giveawayWinner && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 260, pointerEvents: 'none',
          animation: 'soldOverlayIn 0.4s ease',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            animation: 'soldBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            <div style={{ fontSize: 'calc(48px * var(--fs, 1))', animation: 'giftSpin 1s ease-out' }}>🎁</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: 'calc(14px * var(--fs, 1))', color: 'rgba(255,215,0,0.6)',
            }}>
              ✦ ✦ ✦
            </div>
            <p style={{
              fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 900, color: '#FFD700',
              textShadow: '0 2px 20px rgba(255,215,0,0.5)',
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
              fontSize: 'calc(20px * var(--fs, 1))',
              animation: 'giftStars 1.5s ease-in-out infinite',
            }}>
              ⭐ ✨ 🌟 ✨ ⭐
            </div>
          </div>
        </div>
      )}

      {/* ═══ CO-HOST INVITE MODAL ═══ */}
      {showCohostModal && (
        <div
          onClick={() => setShowCohostModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1A1A1A', borderRadius: '20px 20px 0 0',
            padding: '20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            width: '100%', maxHeight: '70vh',
          }}>
            <h3 style={{ color: '#fff', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>
              {ct.cohostInvite}
            </h3>
            <input
              type="text"
              value={cohostSearch}
              onChange={(e) => handleCohostSearch(e.target.value)}
              placeholder={ct.cohostSearch}
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                backgroundColor: '#0D0D0D', border: '1px solid #333',
                borderRadius: '12px', color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', outline: 'none',
                marginBottom: '12px',
              }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {cohostSearching && (
                <p style={{ color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))', textAlign: 'center', padding: '16px 0' }}>...</p>
              )}
              {!cohostSearching && cohostSearch.length >= 2 && cohostResults.length === 0 && (
                <p style={{ color: '#f0f0f0', fontSize: 'calc(13px * var(--fs, 1))', textAlign: 'center', padding: '16px 0' }}>{ct.cohostNone}</p>
              )}
              {cohostResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleInviteCohost(s.id, s.store_name || s.display_name, s.avatar_url)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', backgroundColor: 'transparent', border: 'none',
                    borderBottom: '1px solid #222', cursor: 'pointer', textAlign: 'start',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <span style={{ color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 700 }}>
                        {(s.store_name || s.display_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 600 }}>
                    {s.store_name || s.display_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MULTICAST MODAL ═══ */}
      {showMulticastModal && (
        <div
          onClick={() => setShowMulticastModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1A1A1A', borderRadius: '20px 20px 0 0',
            padding: '20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            width: '100%',
          }}>
            <h3 style={{ color: '#fff', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>
              {ct.multicastTitle}
            </h3>

            {/* Active destinations */}
            {multicastDestinations.map((d) => (
              <div key={d.egressId} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', marginBottom: '8px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '10px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 'calc(12px * var(--fs, 1))', color: '#93C5FD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.url.replace(/\/[^/]+$/, '/****')}
                </span>
                <button
                  onClick={() => handleStopMulticast(d.egressId)}
                  style={{
                    padding: '4px 10px', borderRadius: '8px', border: 'none',
                    backgroundColor: 'rgba(0,229,255,0.2)', color: '#00E5FF',
                    fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {ct.multicastStop}
                </button>
              </div>
            ))}

            {/* Add new destination */}
            <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', margin: '0 0 8px' }}>{ct.multicastAdd}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={multicastUrl}
                onChange={(e) => setMulticastUrl(e.target.value)}
                placeholder={ct.multicastPlaceholder}
                style={{
                  flex: 1, padding: '10px 12px', boxSizing: 'border-box',
                  backgroundColor: '#0D0D0D', border: '1px solid #333',
                  borderRadius: '10px', color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', outline: 'none',
                }}
              />
              <button
                onClick={handleStartMulticast}
                disabled={!multicastUrl.trim() || multicastLoading}
                style={{
                  padding: '10px 16px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#fff', fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                  opacity: !multicastUrl.trim() || multicastLoading ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {multicastLoading ? '...' : ct.multicastStart}
              </button>
            </div>

            <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#f0f0f0', margin: '12px 0 0', lineHeight: 1.4 }}>
              YouTube: rtmp://a.rtmp.youtube.com/live2/KEY<br/>{/* i18n-ignore */}
              Instagram: rtmp://live-upload.instagram.com:443/rtmp/KEY<br/>{/* i18n-ignore */}
              TikTok: rtmp://push.tiktokcdn.com/live/KEY{/* i18n-ignore */}
            </p>
          </div>
        </div>
      )}

      {/* ═══ BOOST CONFIRM MODAL ═══ */}
      {showBoostConfirm && (
        <div
          onClick={() => setShowBoostConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#1A1A1A', borderRadius: '16px', padding: '24px',
            width: '90%', maxWidth: '340px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 'calc(40px * var(--fs, 1))', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ color: '#fff', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, margin: '0 0 12px' }}>{ct.boostTitle}</h3>
            <p style={{ color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', lineHeight: 1.5, margin: '0 0 24px' }}>
              {fill(ct.boostConfirm, { price: boostPrice })}
            </p>
            <button
              onClick={handleBoostLive}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#fff', fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              {fill(ct.boostConfirmYes, { price: boostPrice })}
            </button>
            <button
              onClick={() => setShowBoostConfirm(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid #333', backgroundColor: 'transparent',
                color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {ct.boostConfirmNo}
            </button>
          </div>
        </div>
      )}

      {/* End confirm modal */}
      {/* ═══ OBS/RTMP MODAL ═══ */}
      {showObsModal && (
        <div
          onClick={() => setShowObsModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backgroundColor: 'rgba(0,0,0,0.8)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <h3 style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', margin: 0 }}>{ct.obsTitle}</h3>
            </div>

            {obsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #333', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginTop: '10px' }}>{ct.obsLoading}</p>
              </div>
            ) : obsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0', margin: 0 }}>{ct.obsDesc}</p>

                {/* RTMP URL */}
                <div>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#60a5fa', fontWeight: 700, marginBottom: '4px' }}>{ct.obsUrl}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      readOnly
                      value={obsData.rtmp_url}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#111', border: '1px solid #333',
                        color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(obsData.rtmp_url, 'url')}
                      style={{
                        padding: '0 14px', borderRadius: '10px',
                        backgroundColor: obsCopied === 'url' ? '#00E5FF' : '#333',
                        border: 'none', color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {obsCopied === 'url' ? ct.obsCopied : ct.copy}
                    </button>
                  </div>
                </div>

                {/* Stream Key */}
                <div>
                  <p style={{ fontSize: 'calc(11px * var(--fs, 1))', color: '#60a5fa', fontWeight: 700, marginBottom: '4px' }}>{ct.obsKey}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      readOnly
                      value={obsData.stream_key}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px',
                        backgroundColor: '#111', border: '1px solid #333',
                        color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(obsData.stream_key, 'key')}
                      style={{
                        padding: '0 14px', borderRadius: '10px',
                        backgroundColor: obsCopied === 'key' ? '#00E5FF' : '#333',
                        border: 'none', color: '#fff', fontSize: 'calc(12px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {obsCopied === 'key' ? ct.obsCopied : ct.copy}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f87171', textAlign: 'center' }}>{ct.errorShort}</p>
            )}

            <button
              onClick={() => setShowObsModal(false)}
              style={{
                width: '100%', padding: '14px', marginTop: '16px',
                borderRadius: '12px', background: '#222', border: 'none',
                color: '#f0f0f0', fontSize: 'calc(14px * var(--fs, 1))', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {ct.close}
            </button>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', zIndex: 300,
            padding: '24px',
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(220,38,38,0.1))',
            border: '1px solid rgba(0,229,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </div>
          <p style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 700, color: '#fff', textAlign: 'center' }}>
            {ct.endConfirm}
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
            <button
              onClick={() => setShowEndConfirm(false)}
              style={{
                flex: 1, padding: '14px', borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.endNo}
            </button>
            <button
              onClick={handleEndLive}
              style={{
                flex: 1, padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #E8344E, #DC2626)',
                border: 'none',
                color: '#fff', fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ct.endYes}
            </button>
          </div>
        </div>
      )}

      {/* SOLD / UNSOLD overlay */}
      {soldOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 250, pointerEvents: 'none',
          animation: 'soldOverlayIn 0.4s ease',
        }}>
          {/* Dark backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: soldOverlay.isUnsold
              ? 'rgba(0,0,0,0.7)'
              : 'rgba(0,0,0,0.75)',
          }} />

          {/* Content */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '12px',
            animation: 'soldBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            {/* Icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: soldOverlay.isUnsold
                ? 'linear-gradient(135deg, rgba(255,150,50,0.25), rgba(255,150,50,0.1))'
                : 'linear-gradient(135deg, rgba(0,229,255,0.3), rgba(0,229,255,0.1))',
              border: soldOverlay.isUnsold
                ? '2px solid rgba(255,150,50,0.4)'
                : '2px solid rgba(0,229,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: soldOverlay.isUnsold
                ? '0 0 40px rgba(255,150,50,0.3)'
                : '0 0 40px rgba(0,229,255,0.3)',
            }}>
              {soldOverlay.isUnsold ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF9632" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* Status text */}
            <p style={{
              fontSize: 'calc(32px * var(--fs, 1))', fontWeight: 900,
              color: soldOverlay.isUnsold ? '#FF9632' : '#22C55E',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textShadow: soldOverlay.isUnsold
                ? '0 2px 20px rgba(255,150,50,0.5)'
                : '0 2px 20px rgba(0,229,255,0.5)',
              margin: 0,
            }}>
              {soldOverlay.isUnsold ? ct.unsold : ct.sold}
            </p>

            {/* Lot number */}
            <p style={{
              fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 700, color: '#fff',
              opacity: 0.8, margin: 0,
            }}>
              {ct.lot} {soldOverlay.lotNumber}
            </p>

            {/* Winner name */}
            {!soldOverlay.isUnsold && soldOverlay.winnerName && (
              <div style={{
                backgroundColor: 'rgba(0,229,255,0.15)',
                border: '1px solid rgba(0,229,255,0.3)',
                borderRadius: '12px',
                padding: '10px 24px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>
                  {soldOverlay.winnerName}
                </span>
              </div>
            )}

            {/* Price */}
            {!soldOverlay.isUnsold && soldOverlay.price > 0 && (
              <p style={{
                fontSize: 'calc(28px * var(--fs, 1))', fontWeight: 900, color: '#fff',
                margin: 0,
                textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}>
                {money(soldOverlay.price)}
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes toastIn {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes soldOverlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes soldBounce {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes chatMsgIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpGift {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes giftSpin {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes giftStars {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes floatUpReaction {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-120px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-250px) scale(0.8); }
        }
      `}</style>
    </div>
  )
}


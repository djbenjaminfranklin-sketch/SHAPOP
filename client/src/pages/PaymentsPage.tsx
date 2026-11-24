import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLang, getLocale, type Lang, type Localized } from '../lib/i18n'
import { formatMoney, currencyForCountry } from '../lib/fulfillment'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { showToast } from '../lib/toast'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { isAndroidApp } from '../lib/nativePlatform'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { rtlFlip } from '../lib/rtl'
import { usePageTitle } from '../hooks/usePageTitle'
import FulfillmentSettings from '../components/seller/FulfillmentSettings'
import { ft } from '../lib/fulfillmentText'

const content = {
  en: {
    title: 'Payments & handover',
    payTitle: 'Payment methods',
    securePayments: 'Connect Stripe to get paid',
    ilPayoutsTitle: 'Get paid in Israel',
    ilPayoutsDesc: 'Receive your sales in your Israeli bank account through Airwallex, a licensed payment company.',
    ilPayoutsBtn: 'Set up my payments',
    secureDesc: 'Stripe handles your payments securely. Buyers pay, and the money lands in your account automatically.',
    setupPayment: 'Connect with Stripe',
    selectCountry: 'Choose your country',
    selectCountryDesc: 'Stripe needs your country to create your seller account.',
    confirm: 'Continue',
    cancel: 'Cancel',
    countryNotSupported: 'This country isn’t supported by Stripe yet.',
    paymentConfigured: 'Stripe connected',
    configuredDesc: 'Your Stripe account is active. You can receive payments and open your dashboard.',
    openDashboard: 'Open my Stripe dashboard',
    pendingDesc: 'Your Stripe account is being verified. Fill in the missing details.',
    completSetup: 'Finish setup',
    loading: 'Loading...',
    connecting: 'Connecting to Stripe...',
    feesTitle: 'Your fees',
    feesDesc: '8% commission + Stripe fees (2.9% + a fixed fee) + VAT where applicable',
    feesExample: 'Example: a {sale} sale → you get about {net}',
    close: 'Close',
    pending: 'Pending',
    notSellerMsg: 'Become a seller to connect Stripe and get paid.',
    errorConnect: 'Couldn’t connect to Stripe',
    errorDashboard: 'Couldn’t open the Stripe dashboard',
    errorLoad: 'Couldn’t load your Stripe status',
    buyerCardTitle: 'Payment card',
    buyerCardDesc: 'Add a card to bid in lives',
    buyerCardSaved: 'Card saved',
    buyerCardLast4: 'ending in',
    buyerChangeCard: 'Change card',
    buyerAddCard: 'Add a card',
    buyerSaveCard: 'Save card',
    buyerCardSuccess: 'Card saved!',
    buyerCardError: 'Couldn’t save your card',
    buyerNoCard: 'No card saved',
    buyerNoCardDesc: 'Add a payment card to bid in lives',
    paypalConnected: 'PayPal connected',
    paypalConnectedDesc: 'Your sales will be paid out to your PayPal account.',
    paypalEmail: 'PayPal email',
    paypalChangeEmail: 'Change email',
    paypalSaveEmail: 'Save',
    paypalRecentPayouts: 'Recent payouts',
    paypalNoPayout: 'No payouts yet',
    paypalStatus_pending: 'Pending',
    paypalStatus_ready: 'Ready',
    paypalStatus_processing: 'Processing',
    paypalStatus_completed: 'Completed',
    paypalStatus_failed: 'Failed',
    paypalCountryTitle: 'Get paid with PayPal',
    paypalCountryDesc: 'Stripe isn’t available in your country. Enter your PayPal email to receive your payments.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Connect PayPal',
    pageDesc: 'You need this to bid, place an order or buy something during a live. Your card is only charged if a bid or offer is accepted.',
    paymentMethod: 'Payment method',
    shippingDetails: 'Address (parcels sent by post)',
    addPaymentMethod: 'Add a payment method',
    addPaymentMethodDesc: 'Nothing is charged until you buy an item.',
    creditCard: 'Credit card',
    applePay: 'Apple Pay',
    applePayUnavailable: 'Not available on this device',
    noPaymentMethod: 'No payment method',
    noAddress: 'No address saved',
    back: 'Back',
    genericError: 'Something went wrong. Please try again.',
    paypalEmailSaved: 'PayPal email saved',
    paypalConnectedToast: 'PayPal connected!',
    applePayAtCheckout: 'Apple Pay will be used automatically at checkout.',
    cardFallback: 'Card',
  },
  fr: {
    title: 'Paiements et remise',
    payTitle: 'Moyens de paiement',
    securePayments: 'Connecte Stripe pour être payé',
    ilPayoutsTitle: 'Être payé en Israël',
    ilPayoutsDesc: 'Reçois tes ventes sur ton compte bancaire israélien grâce à Airwallex, une société de paiement agréée.',
    ilPayoutsBtn: 'Configurer mes paiements',
    secureDesc: 'Stripe gère tes paiements en toute sécurité. Les acheteurs paient, et tu reçois ton argent automatiquement.',
    setupPayment: 'Se connecter avec Stripe',
    selectCountry: 'Choisis ton pays',
    selectCountryDesc: 'Stripe a besoin de ton pays pour créer ton compte vendeur.',
    confirm: 'Continuer',
    cancel: 'Annuler',
    countryNotSupported: 'Ce pays n’est pas encore pris en charge par Stripe.',
    paymentConfigured: 'Stripe connecté',
    configuredDesc: 'Ton compte Stripe est actif. Tu peux recevoir des paiements et consulter ton tableau de bord.',
    openDashboard: 'Ouvrir mon tableau de bord Stripe',
    pendingDesc: 'Ton compte Stripe est en cours de vérification. Complète les informations manquantes.',
    completSetup: 'Terminer la configuration',
    loading: 'Chargement...',
    connecting: 'Connexion à Stripe...',
    feesTitle: 'Tes frais',
    feesDesc: 'Commission de 8 % + frais Stripe (2,9 % + frais fixes) + TVA le cas échéant',
    feesExample: 'Exemple : pour une vente de {sale}, tu reçois environ {net}',
    close: 'Fermer',
    pending: 'En attente',
    notSellerMsg: 'Deviens vendeur pour connecter Stripe et recevoir des paiements.',
    errorConnect: 'Impossible de se connecter à Stripe',
    errorDashboard: 'Impossible d’ouvrir le tableau de bord Stripe',
    errorLoad: 'Impossible de charger ton statut Stripe',
    buyerCardTitle: 'Carte bancaire',
    buyerCardDesc: 'Ajoute une carte pour enchérir en live',
    buyerCardSaved: 'Carte enregistrée',
    buyerCardLast4: 'se terminant par',
    buyerChangeCard: 'Changer de carte',
    buyerAddCard: 'Ajouter une carte',
    buyerSaveCard: 'Enregistrer la carte',
    buyerCardSuccess: 'Carte enregistrée !',
    buyerCardError: 'Impossible d’enregistrer ta carte',
    buyerNoCard: 'Aucune carte enregistrée',
    buyerNoCardDesc: 'Ajoute une carte bancaire pour enchérir pendant les lives',
    paypalConnected: 'PayPal connecté',
    paypalConnectedDesc: 'Tes ventes seront versées sur ton compte PayPal.',
    paypalEmail: 'E-mail PayPal',
    paypalChangeEmail: 'Modifier l’e-mail',
    paypalSaveEmail: 'Enregistrer',
    paypalRecentPayouts: 'Versements récents',
    paypalNoPayout: 'Aucun versement pour l’instant',
    paypalStatus_pending: 'En attente',
    paypalStatus_ready: 'Prêt',
    paypalStatus_processing: 'En cours',
    paypalStatus_completed: 'Effectué',
    paypalStatus_failed: 'Échoué',
    paypalCountryTitle: 'Être payé via PayPal',
    paypalCountryDesc: 'Stripe n’est pas disponible dans ton pays. Saisis ton e-mail PayPal pour recevoir tes paiements.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Connecter PayPal',
    pageDesc: 'Ces informations sont nécessaires pour enchérir, passer commande ou acheter un article pendant un live. Ta carte n’est débitée que si une enchère ou une offre est acceptée.',
    paymentMethod: 'Moyen de paiement',
    shippingDetails: 'Adresse (envois par la poste)',
    addPaymentMethod: 'Ajouter un moyen de paiement',
    addPaymentMethodDesc: 'Rien n’est débité tant que tu n’as pas acheté un article.',
    creditCard: 'Carte bancaire',
    applePay: 'Apple Pay',
    applePayUnavailable: 'Non disponible sur cet appareil',
    noPaymentMethod: 'Aucun moyen de paiement',
    noAddress: 'Aucune adresse enregistrée',
    back: 'Retour',
    genericError: 'Une erreur est survenue. Réessaie.',
    paypalEmailSaved: 'E-mail PayPal enregistré',
    paypalConnectedToast: 'PayPal connecté !',
    applePayAtCheckout: 'Apple Pay sera utilisé automatiquement au moment du paiement.',
    cardFallback: 'Carte',
  },
  es: {
    title: 'Pagos y entrega',
    payTitle: 'Métodos de pago',
    securePayments: 'Conecta Stripe para cobrar',
    ilPayoutsTitle: 'Cobrar en Israel',
    ilPayoutsDesc: 'Recibe tus ventas en tu cuenta bancaria israelí con Airwallex, una empresa de pagos autorizada.',
    ilPayoutsBtn: 'Configurar mis pagos',
    secureDesc: 'Stripe gestiona tus pagos de forma segura. Los compradores pagan y tú recibes el dinero automáticamente.',
    setupPayment: 'Conectar con Stripe',
    selectCountry: 'Elige tu país',
    selectCountryDesc: 'Stripe necesita saber tu país para crear tu cuenta de vendedor.',
    confirm: 'Continuar',
    cancel: 'Cancelar',
    countryNotSupported: 'Stripe todavía no está disponible en este país.',
    paymentConfigured: 'Stripe conectado',
    configuredDesc: 'Tu cuenta de Stripe está activa. Puedes recibir pagos y consultar tu panel.',
    openDashboard: 'Abrir mi panel de Stripe',
    pendingDesc: 'Tu cuenta de Stripe se está verificando. Completa los datos que faltan.',
    completSetup: 'Terminar la configuración',
    loading: 'Cargando...',
    connecting: 'Conectando con Stripe...',
    feesTitle: 'Tus comisiones',
    feesDesc: 'Comisión del 8 % + tarifas de Stripe (2,9 % + tarifa fija) + IVA si corresponde',
    feesExample: 'Ejemplo: por una venta de {sale}, recibes unos {net}',
    close: 'Cerrar',
    pending: 'Pendiente',
    notSellerMsg: 'Hazte vendedor para conectar Stripe y recibir pagos.',
    errorConnect: 'No se pudo conectar con Stripe',
    errorDashboard: 'No se pudo abrir el panel de Stripe',
    errorLoad: 'No se pudo cargar tu estado de Stripe',
    buyerCardTitle: 'Tarjeta bancaria',
    buyerCardDesc: 'Añade una tarjeta para pujar en directo',
    buyerCardSaved: 'Tarjeta guardada',
    buyerCardLast4: 'terminada en',
    buyerChangeCard: 'Cambiar tarjeta',
    buyerAddCard: 'Añadir tarjeta',
    buyerSaveCard: 'Guardar tarjeta',
    buyerCardSuccess: '¡Tarjeta guardada!',
    buyerCardError: 'No se pudo guardar tu tarjeta',
    buyerNoCard: 'No hay ninguna tarjeta guardada',
    buyerNoCardDesc: 'Añade una tarjeta bancaria para pujar en los directos',
    paypalConnected: 'PayPal conectado',
    paypalConnectedDesc: 'Tus ventas se abonarán en tu cuenta de PayPal.',
    paypalEmail: 'Correo de PayPal',
    paypalChangeEmail: 'Cambiar correo',
    paypalSaveEmail: 'Guardar',
    paypalRecentPayouts: 'Pagos recientes',
    paypalNoPayout: 'Todavía no hay pagos',
    paypalStatus_pending: 'Pendiente',
    paypalStatus_ready: 'Listo',
    paypalStatus_processing: 'En proceso',
    paypalStatus_completed: 'Completado',
    paypalStatus_failed: 'Fallido',
    paypalCountryTitle: 'Cobrar con PayPal',
    paypalCountryDesc: 'Stripe no está disponible en tu país. Introduce tu correo de PayPal para recibir tus pagos.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Conectar PayPal',
    pageDesc: 'Necesitas estos datos para pujar, hacer un pedido o comprar algo durante un directo. Solo se cobrará en tu tarjeta si se acepta una puja o una oferta.',
    paymentMethod: 'Método de pago',
    shippingDetails: 'Dirección (envíos por correo)',
    addPaymentMethod: 'Añadir un método de pago',
    addPaymentMethodDesc: 'No se te cobrará nada hasta que compres un artículo.',
    creditCard: 'Tarjeta de crédito',
    applePay: 'Apple Pay',
    applePayUnavailable: 'No disponible en este dispositivo',
    noPaymentMethod: 'Sin método de pago',
    noAddress: 'No hay ninguna dirección guardada',
    back: 'Volver',
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
    paypalEmailSaved: 'Correo de PayPal guardado',
    paypalConnectedToast: '¡PayPal conectado!',
    applePayAtCheckout: 'Apple Pay se usará automáticamente al pagar.',
    cardFallback: 'Tarjeta',
  },
  ru: {
    title: 'Оплата и передача',
    payTitle: 'Способы оплаты',
    securePayments: 'Подключи Stripe, чтобы получать оплату',
    ilPayoutsTitle: 'Получать оплату в Израиле',
    ilPayoutsDesc: 'Получай деньги за продажи на израильский банковский счёт через Airwallex — лицензированную платёжную компанию.',
    ilPayoutsBtn: 'Настроить выплаты',
    secureDesc: 'Stripe надёжно обрабатывает твои платежи. Покупатели платят, а деньги поступают тебе автоматически.',
    setupPayment: 'Подключить Stripe',
    selectCountry: 'Выбери страну',
    selectCountryDesc: 'Stripe нужна твоя страна, чтобы создать аккаунт продавца.',
    confirm: 'Продолжить',
    cancel: 'Отмена',
    countryNotSupported: 'Stripe пока не работает в этой стране.',
    paymentConfigured: 'Stripe подключён',
    configuredDesc: 'Твой аккаунт Stripe активен. Ты можешь получать платежи и открывать панель управления.',
    openDashboard: 'Открыть панель Stripe',
    pendingDesc: 'Твой аккаунт Stripe проходит проверку. Заполни недостающие данные.',
    completSetup: 'Завершить настройку',
    loading: 'Загрузка...',
    connecting: 'Подключение к Stripe...',
    feesTitle: 'Твои комиссии',
    feesDesc: 'Комиссия 8 % + комиссия Stripe (2,9 % + фиксированная плата) + НДС, если применимо',
    feesExample: 'Пример: при продаже на {sale} ты получишь около {net}',
    close: 'Закрыть',
    pending: 'В ожидании',
    notSellerMsg: 'Стань продавцом, чтобы подключить Stripe и получать оплату.',
    errorConnect: 'Не удалось подключиться к Stripe',
    errorDashboard: 'Не удалось открыть панель Stripe',
    errorLoad: 'Не удалось загрузить статус Stripe',
    buyerCardTitle: 'Банковская карта',
    buyerCardDesc: 'Добавь карту, чтобы делать ставки в эфирах',
    buyerCardSaved: 'Карта сохранена',
    buyerCardLast4: 'заканчивается на',
    buyerChangeCard: 'Сменить карту',
    buyerAddCard: 'Добавить карту',
    buyerSaveCard: 'Сохранить карту',
    buyerCardSuccess: 'Карта сохранена!',
    buyerCardError: 'Не удалось сохранить карту',
    buyerNoCard: 'Нет сохранённой карты',
    buyerNoCardDesc: 'Добавь банковскую карту, чтобы делать ставки в эфирах',
    paypalConnected: 'PayPal подключён',
    paypalConnectedDesc: 'Деньги за продажи будут приходить на твой аккаунт PayPal.',
    paypalEmail: 'Email PayPal',
    paypalChangeEmail: 'Изменить email',
    paypalSaveEmail: 'Сохранить',
    paypalRecentPayouts: 'Последние выплаты',
    paypalNoPayout: 'Выплат пока нет',
    paypalStatus_pending: 'В ожидании',
    paypalStatus_ready: 'Готово',
    paypalStatus_processing: 'Обрабатывается',
    paypalStatus_completed: 'Выполнено',
    paypalStatus_failed: 'Ошибка',
    paypalCountryTitle: 'Получать оплату через PayPal',
    paypalCountryDesc: 'Stripe недоступен в твоей стране. Введи email PayPal, чтобы получать платежи.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'Подключить PayPal',
    pageDesc: 'Эти данные нужны, чтобы делать ставки, оформлять заказы и покупать товары во время эфира. Деньги спишутся с карты, только если ставку или предложение примут.',
    paymentMethod: 'Способ оплаты',
    shippingDetails: 'Адрес (отправки почтой)',
    addPaymentMethod: 'Добавить способ оплаты',
    addPaymentMethodDesc: 'Ничего не спишется, пока ты не купишь товар.',
    creditCard: 'Банковская карта',
    applePay: 'Apple Pay',
    applePayUnavailable: 'Недоступно на этом устройстве',
    noPaymentMethod: 'Способ оплаты не выбран',
    noAddress: 'Нет сохранённого адреса',
    back: 'Назад',
    genericError: 'Что-то пошло не так. Попробуй ещё раз.',
    paypalEmailSaved: 'Email PayPal сохранён',
    paypalConnectedToast: 'PayPal подключён!',
    applePayAtCheckout: 'Apple Pay будет использоваться автоматически при оплате.',
    cardFallback: 'Карта',
  },
  he: {
    title: 'תשלומים ומסירה',
    payTitle: 'אמצעי תשלום',
    securePayments: 'חבר/י את Stripe כדי לקבל תשלומים',
    ilPayoutsTitle: 'קבלת תשלומים בישראל',
    ilPayoutsDesc: 'קבלו את כספי המכירות לחשבון הבנק בישראל דרך Airwallex, חברת תשלומים מורשית.',
    ilPayoutsBtn: 'הגדרת התשלומים שלי',
    secureDesc: 'Stripe מנהל את התשלומים שלך בצורה מאובטחת. הקונים משלמים, והכסף מגיע אליך אוטומטית.',
    setupPayment: 'התחברות עם Stripe',
    selectCountry: 'בחירת מדינה',
    selectCountryDesc: 'Stripe צריך לדעת באיזו מדינה את/ה כדי ליצור חשבון מוכר.',
    confirm: 'המשך',
    cancel: 'ביטול',
    countryNotSupported: 'Stripe עדיין לא תומך במדינה הזו.',
    paymentConfigured: 'Stripe מחובר',
    configuredDesc: 'חשבון ה-Stripe שלך פעיל. אפשר לקבל תשלומים ולפתוח את לוח הבקרה.',
    openDashboard: 'פתיחת לוח הבקרה של Stripe',
    pendingDesc: 'חשבון ה-Stripe שלך בבדיקה. יש להשלים את הפרטים החסרים.',
    completSetup: 'השלמת ההגדרה',
    loading: 'טוען...',
    connecting: 'מתחבר ל-Stripe...',
    feesTitle: 'העמלות שלך',
    feesDesc: 'עמלה של 8% + עמלות Stripe ‏(2.9% + עמלה קבועה) + מע״מ לפי העניין',
    feesExample: 'לדוגמה: במכירה של {sale} תקבל/י בערך {net}',
    close: 'סגירה',
    pending: 'בהמתנה',
    notSellerMsg: 'כדאי להפוך למוכר/ת כדי לחבר את Stripe ולקבל תשלומים.',
    errorConnect: 'לא הצלחנו להתחבר ל-Stripe',
    errorDashboard: 'לא הצלחנו לפתוח את לוח הבקרה של Stripe',
    errorLoad: 'לא הצלחנו לטעון את סטטוס ה-Stripe',
    buyerCardTitle: 'כרטיס אשראי',
    buyerCardDesc: 'הוספת כרטיס כדי להציע הצעות בשידורים חיים',
    buyerCardSaved: 'הכרטיס נשמר',
    buyerCardLast4: 'שמסתיים ב-',
    buyerChangeCard: 'החלפת כרטיס',
    buyerAddCard: 'הוספת כרטיס',
    buyerSaveCard: 'שמירת הכרטיס',
    buyerCardSuccess: 'הכרטיס נשמר!',
    buyerCardError: 'לא הצלחנו לשמור את הכרטיס',
    buyerNoCard: 'אין כרטיס שמור',
    buyerNoCardDesc: 'הוספת כרטיס אשראי כדי להציע הצעות בשידורים חיים',
    paypalConnected: 'PayPal מחובר',
    paypalConnectedDesc: 'הכסף מהמכירות שלך יועבר לחשבון ה-PayPal שלך.',
    paypalEmail: 'אימייל PayPal',
    paypalChangeEmail: 'שינוי אימייל',
    paypalSaveEmail: 'שמירה',
    paypalRecentPayouts: 'העברות אחרונות',
    paypalNoPayout: 'עדיין אין העברות',
    paypalStatus_pending: 'ממתין',
    paypalStatus_ready: 'מוכן',
    paypalStatus_processing: 'בעיבוד',
    paypalStatus_completed: 'הושלם',
    paypalStatus_failed: 'נכשל',
    paypalCountryTitle: 'קבלת תשלומים דרך PayPal',
    paypalCountryDesc: 'Stripe לא זמין במדינה שלך. יש להזין את כתובת ה-PayPal שלך כדי לקבל תשלומים.',
    paypalCountryPlaceholder: 'email@paypal.com',
    paypalCountrySave: 'חיבור PayPal',
    pageDesc: 'הפרטים האלה נדרשים כדי להציע הצעות, לבצע הזמנה או לקנות מוצר במהלך שידור חי. הכרטיס יחויב רק אם הצעה שלך מתקבלת.',
    paymentMethod: 'אמצעי תשלום',
    shippingDetails: 'כתובת (משלוחים בדואר)',
    addPaymentMethod: 'הוספת אמצעי תשלום',
    addPaymentMethodDesc: 'שום סכום לא יחויב עד שתקנה/י פריט.',
    creditCard: 'כרטיס אשראי',
    applePay: 'Apple Pay',
    applePayUnavailable: 'לא זמין במכשיר הזה',
    noPaymentMethod: 'אין אמצעי תשלום',
    noAddress: 'אין כתובת שמורה',
    back: 'חזרה',
    genericError: 'משהו השתבש. כדאי לנסות שוב.',
    paypalEmailSaved: 'אימייל ה-PayPal נשמר',
    paypalConnectedToast: 'PayPal מחובר!',
    applePayAtCheckout: 'Apple Pay ישמש אוטומטית בשלב התשלום.',
    cardFallback: 'כרטיס',
  },
} satisfies Localized<Record<string, string>>

interface StripeStatus {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
}

interface CardInfo {
  has_card: boolean
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
}

// Stripe Elements loader
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

function SetupCardFormInner({ clientSecret, onSuccess, onError, loading, setLoading, saveLabel, errorLabel }: {
  clientSecret: string
  onSuccess: () => void
  onError: (msg: string) => void
  loading: boolean
  setLoading: (v: boolean) => void
  saveLabel: string
  errorLabel: string
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
      onError(error.message || errorLabel)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        padding: '16px', borderRadius: '10px',
        backgroundColor: '#0D0D0D', border: '1px solid #333',
        minHeight: '48px',
      }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '17px',
              lineHeight: '24px',
              color: '#fff',
              '::placeholder': { color: '#555' },
              iconColor: '#F0908A',
              fontSmoothing: 'antialiased',
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

export default function PaymentsPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const lang: Lang = getLang()
  const c = content[lang] ?? content.en
  const userCurrency = currencyForCountry(profile?.country)
  const regionName = (code: string) => {
    try { return new Intl.DisplayNames([getLocale(lang)], { type: 'region' }).of(code) || code } catch { return code }
  }
  usePageTitle(c.title)

  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  // Buyer card state
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [showCardSetup, setShowCardSetup] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupSuccess, setSetupSuccess] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')

  // PayPal seller state
  const [sellerBankChoice, setSellerBankChoice] = useState<string | null>(null)
  const [bankChoiceLoaded, setBankChoiceLoaded] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [paypalEditEmail, setPaypalEditEmail] = useState('')
  const [paypalEditing, setPaypalEditing] = useState(false)
  const [paypalSaving, setPaypalSaving] = useState(false)
  const [paypalPayouts, setPaypalPayouts] = useState<Array<{ id: string; order_id: string; amount: number; currency: string; status: string; error_message: string | null; completed_at: string | null; created_at: string }>>([])

  const fetchStatus = useCallback(async () => {
    // Only fetch Stripe status if user is a seller
    if (!profile?.is_seller) {
      setLoading(false)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await apiFetch('/api/stripe/account-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      } else {
        // Don't show error toast for 404 (no Stripe account yet) or 500 (server issue)
        // Silently fail — the UI will show "Connect Stripe" which is correct
        console.warn('Stripe status check failed:', res.status)
      }
    } catch {
      // Network error — don't show toast, just fail gracefully
      console.warn('Stripe status check failed: network error')
    }
    setLoading(false)
  }, [profile?.is_seller])

  // Fetch PayPal status for seller
  const fetchPaypalStatus = useCallback(async () => {
    if (!profile?.is_seller) {
      setBankChoiceLoaded(true)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBankChoiceLoaded(true); return }
      // Fetch seller bank_choice from DB
      const { data: seller } = await supabase
        .from('sellers')
        .select('bank_choice, paypal_email')
        .eq('id', session.user.id)
        .single()
      if (seller) {
        setSellerBankChoice(seller.bank_choice)
        if (seller.paypal_email) {
          setPaypalEmail(seller.paypal_email)
          setPaypalEditEmail(seller.paypal_email)
        }
      }
      setBankChoiceLoaded(true)
      // Fetch payouts
      if (seller?.bank_choice === 'paypal') {
        const res = await apiFetch('/api/paypal/payout-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setPaypalPayouts(data.payouts || [])
        }
      }
    } catch {
      console.warn('PayPal status check failed')
      setBankChoiceLoaded(true)
    }
  }, [profile?.is_seller])

  const savePaypalEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEditEmail.trim())) return
    setPaypalSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/paypal/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: paypalEditEmail }),
      })
      if (res.ok) {
        setPaypalEmail(paypalEditEmail)
        setPaypalEditing(false)
        showToast(c.paypalEmailSaved, 'success')
      }
    } catch {
      showToast(c.genericError, 'error')
    }
    setPaypalSaving(false)
  }

  // Fetch buyer card info
  const fetchCardInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCardLoading(false); return }
      const res = await apiFetch('/api/stripe/card-info', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCardInfo(data)
      }
    } catch {
      console.warn('Card info check failed')
    }
    setCardLoading(false)
  }, [])

  const openCardSetup = async () => {
    setSetupError(null)
    setSetupSuccess(false)
    setSetupLoading(false)
    setSetupClientSecret(null)
    // Israël (Rapyd, quand il est activé) : la carte s'enregistre sur la page sécurisée de Rapyd
    try {
      const { data: { session: s0 } } = await supabase.auth.getSession()
      if (s0) {
        const pr = await apiFetch('/api/payments/provider', { headers: { 'Authorization': `Bearer ${s0.access_token}` } })
        const prov = pr.ok ? await pr.json() : null
        if (prov?.provider === 'rapyd' || prov?.provider === 'airwallex') {
          const cp = await apiFetch(prov.provider === 'airwallex' ? '/api/airwallex/card-page' : '/api/rapyd/card-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s0.access_token}` },
            body: JSON.stringify({ lang: getLang() }),
          })
          const page = cp.ok ? await cp.json() : null
          if (page?.redirect_url) {
            await Browser.open({ url: page.redirect_url, presentationStyle: 'popover' })
            return
          }
          setSetupError(c.buyerCardError)
          setShowCardSetup(true)
          return
        }
      }
    } catch { /* on continue avec Stripe */ }
    setShowCardSetup(true)
    // Le formulaire s'ouvre en bas de la page : on le fait défiler jusqu'à lui
    setTimeout(() => document.getElementById('card-setup-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const resp = await apiFetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        if (import.meta.env.DEV && err.error) console.warn('setup-intent:', err.error)
        setSetupError(c.buyerCardError)
        return
      }
      const data = await resp.json()
      if (data.client_secret) {
        setSetupClientSecret(data.client_secret)
      }
    } catch {
      setSetupError(c.buyerCardError)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    fetchCardInfo()
  }, [fetchCardInfo])

  useEffect(() => {
    fetchPaypalStatus()
  }, [fetchPaypalStatus])

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      fetchStatus()
    }
  }, [searchParams, fetchStatus])

  // Detect Apple Pay availability
  useEffect(() => {
    const checkApplePay = async () => {
      // On native iOS (Capacitor WKWebView), Stripe's canMakePayment() doesn't work
      // but Apple Pay is available on virtually all modern iPhones
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        setApplePayAvailable(true)
        return
      }
      // App Android : pas d'Apple Pay
      if (isAndroidApp()) return
      try {
        const stripe = await getStripePromise()
        if (!stripe) return
        const pr = stripe.paymentRequest({
          country: 'FR',
          currency: 'eur',
          total: { label: 'ShaPop', amount: 0 },
        })
        const result = await pr.canMakePayment()
        if (result?.applePay) {
          setApplePayAvailable(true)
        }
      } catch { /* Apple Pay not available */ }
    }
    checkApplePay()
  }, [])

  // Fetch default address
  useEffect(() => {
    if (!user) return
    const fetchAddress = async () => {
      const { data } = await supabase
        .from('addresses')
        .select('name, street, city, zip')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()
      if (data) setDefaultAddress(data)
    }
    fetchAddress()
  }, [user])

  // Refetch Stripe status when in-app browser closes (user returns from Stripe onboarding)
  useEffect(() => {
    let listener: { remove: () => void } | undefined
    Browser.addListener('browserFinished', () => {
      fetchStatus()
      fetchCardInfo() // retour de la page de carte (Israël)
    }).then(l => { listener = l })
    return () => { listener?.remove() }
  }, [fetchStatus, fetchCardInfo])

  // Countries list (Stripe + PayPal-only)
  const PAYPAL_ONLY_COUNTRIES = ['IL']
  const allCountries = [
    { code: 'FR', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
    { code: 'IL', flag: '\uD83C\uDDEE\uD83C\uDDF1' },
    { code: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
    { code: 'US', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { code: 'GB', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { code: 'DE', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
    { code: 'IT', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
    { code: 'PT', flag: '\uD83C\uDDF5\uD83C\uDDF9' },
    { code: 'BR', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
    { code: 'JP', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
    { code: 'CA', flag: '\uD83C\uDDE8\uD83C\uDDE6' },
    { code: 'MA', flag: '\uD83C\uDDF2\uD83C\uDDE6' },
  ]
  // Payment method picker modal
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [applePayAvailable, setApplePayAvailable] = useState(false)

  // Default address
  const [defaultAddress, setDefaultAddress] = useState<{ name: string; street: string; city: string; zip: string } | null>(null)

  const [showPaypalForm, setShowPaypalForm] = useState(false)
  const [countryPaypalEmail, setCountryPaypalEmail] = useState('')
  const [countryPaypalSaving, setCountryPaypalSaving] = useState(false)

  const handleConnect = async (country?: string) => {
    const countryToUse = country || selectedCountry || (profile?.country === 'IL' ? 'IL' : '')
    // Israël : paiement des vendeurs par Rapyd (portefeuille + vérification d'identité), plus PayPal
    if (countryToUse === 'IL') {
      setShowCountryPicker(false)
      setShowPaypalForm(false)
      navigate('/payouts-israel')
      return
    }
    if (!countryToUse) {
      // Show country picker first
      setShowPaypalForm(false)
      setShowCountryPicker(true)
      return
    }

    // If PayPal-only country, show PayPal form
    if (PAYPAL_ONLY_COUNTRIES.includes(countryToUse)) {
      setShowPaypalForm(true)
      return
    }

    setShowCountryPicker(false)
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: countryToUse }),
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url, presentationStyle: 'popover' }) // popover : la fenêtre temporaire de Capacitor est invisible avec les scènes iOS
      } else if (data.error) {
        showToast(c.errorConnect, 'error')
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Stripe connect error:', err)
      showToast(c.errorConnect, 'error')
    }
    setConnecting(false)
  }

  const handleCountryPaypalSave = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(countryPaypalEmail.trim())) return
    setCountryPaypalSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/paypal/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: countryPaypalEmail }),
      })
      if (res.ok) {
        setPaypalEmail(countryPaypalEmail)
        setPaypalEditEmail(countryPaypalEmail)
        setSellerBankChoice('paypal')
        setShowCountryPicker(false)
        setShowPaypalForm(false)
        showToast(c.paypalConnectedToast, 'success')
      }
    } catch {
      showToast(c.genericError, 'error')
    }
    setCountryPaypalSaving(false)
  }

  const handleDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await apiFetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.url) {
        await Browser.open({ url: data.url, presentationStyle: 'popover' }) // popover : la fenêtre temporaire de Capacitor est invisible avec les scènes iOS
      } else if (data.error) {
        showToast(c.errorDashboard, 'error')
      }
    } catch {
      showToast(c.errorDashboard, 'error')
    }
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled
  const isPending = status?.connected && !isFullyConnected

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} aria-label={c.back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{...rtlFlip()}}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* ═══════ WHATNOT-STYLE OVERVIEW ═══════ */}
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{c.title}</h2>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.5, margin: '0 0 24px' }}>{c.pageDesc}</p>

        {/* Mode de paiement row */}
        <div
          onClick={() => setShowMethodPicker(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 0', borderBottom: '1px solid #1A1A1A', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {c.paymentMethod}
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0' }}>
              {cardInfo?.has_card
                ? `${cardInfo.brand ? cardInfo.brand.toLowerCase() : c.cardFallback} - ${cardInfo.last4} - ${cardInfo.exp_month}/${cardInfo.exp_year}`
                : c.noPaymentMethod}
            </p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* Adresse pour les envois par la poste */}
        <div
          onClick={() => navigate('/addresses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 0', borderBottom: profile?.is_seller ? 'none' : '1px solid #1A1A1A', cursor: 'pointer',
            marginBottom: profile?.is_seller ? '0' : '32px',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {c.shippingDetails}
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0', lineHeight: 1.4 }}>
              {defaultAddress
                ? (defaultAddress.street.toUpperCase().includes(String(defaultAddress.city || '').toUpperCase()) && defaultAddress.city ? defaultAddress.street : `${defaultAddress.street}\n${defaultAddress.zip} ${defaultAddress.city}`)
                : c.noAddress}
            </p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* Remise des commandes (vendeur) : WhatsApp, retrait, prix d'envoi, délai de remise */}
        {profile?.is_seller && (
          <div id="remise" style={{ padding: '16px 0', borderBottom: '1px solid #1A1A1A', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{ft().settings_title}</span>
            </div>
            <FulfillmentSettings />
          </div>
        )}

        {/* ═══════ SELLER SECTIONS ═══════ */}
        {/* Payment Methods */}
        {profile?.is_seller && (
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{c.payTitle}</h2>
        )}

        {/* PayPal seller section */}
        {profile?.is_seller && sellerBankChoice === 'paypal' && (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '24px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #003087, #009CDE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#009CDE', margin: '0 0 2px' }}>
                  {c.paypalConnected}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {c.paypalConnectedDesc}
                </p>
              </div>
            </div>

            {/* PayPal email */}
            <div style={{
              backgroundColor: '#0A0A0A', borderRadius: '10px', padding: '14px',
              marginBottom: '12px',
            }}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>{c.paypalEmail}</p>
              {paypalEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    inputMode="email"
                    value={paypalEditEmail}
                    onChange={e => setPaypalEditEmail(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '8px',
                      backgroundColor: '#111', border: '1px solid #333',
                      color: '#fff', fontSize: '14px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={savePaypalEmail}
                    disabled={paypalSaving}
                    style={{
                      padding: '10px 16px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #003087, #009CDE)',
                      border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', opacity: paypalSaving ? 0.6 : 1,
                    }}
                  >
                    {c.paypalSaveEmail}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '15px', color: '#fff', fontWeight: 600, margin: 0 }}>
                    {paypalEmail || '—'}
                  </p>
                  <button
                    onClick={() => setPaypalEditing(true)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'transparent', border: '1px solid #333',
                      color: '#888', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {c.paypalChangeEmail}
                  </button>
                </div>
              )}
            </div>

            {/* Recent payouts */}
            {paypalPayouts.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#888', margin: '16px 0 8px' }}>
                  {c.paypalRecentPayouts}
                </p>
                {paypalPayouts.slice(0, 5).map(p => {
                  const statusColors: Record<string, string> = {
                    pending: '#F59E0B',
                    ready: '#3B82F6',
                    processing: '#8B5CF6',
                    completed: '#22C55E',
                    failed: '#E8344E',
                  }
                  const statusKey = `paypalStatus_${p.status}` as keyof typeof c
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid #1A1A1A',
                    }}>
                      <div>
                        <p style={{ fontSize: '14px', color: '#fff', margin: '0 0 2px', fontWeight: 600 }}>
                          {formatMoney(p.amount, p.currency)}
                        </p>
                        <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>
                          {new Date(p.created_at).toLocaleDateString(getLocale(lang))}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: statusColors[p.status] || '#888',
                        padding: '4px 10px', borderRadius: '6px',
                        backgroundColor: `${statusColors[p.status] || '#888'}15`,
                      }}>
                        {c[statusKey] || p.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {paypalPayouts.length === 0 && paypalEmail && (
              <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', margin: '8px 0 0' }}>
                {c.paypalNoPayout}
              </p>
            )}
          </div>
        )}

        {/* Stripe seller section (hidden if PayPal seller) */}
        {bankChoiceLoaded && sellerBankChoice !== 'paypal' && (
        <div style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '24px',
          textAlign: 'center', marginBottom: '16px',
        }}>
          {loading ? (
            <p style={{ fontSize: '14px', color: '#888' }}>{c.loading}</p>
          ) : isFullyConnected ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', marginBottom: '8px' }}>
                {c.paymentConfigured}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.configuredDesc}
              </p>
              <button
                onClick={handleDashboard}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.openDashboard}
              </button>
            </>
          ) : isPending ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>
                {['Stripe', c.pending].join(' – ')}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px' }}>
                {c.pendingDesc}
              </p>
              <button
                onClick={() => handleConnect()}
                disabled={connecting}
                style={{
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                }}
              >
                {connecting ? c.connecting : c.completSetup}
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {profile?.country === 'IL' ? c.ilPayoutsTitle : c.securePayments}
              </p>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                {profile?.country === 'IL' ? c.ilPayoutsDesc : c.secureDesc}
              </p>
              {profile?.is_seller ? (
                <button
                  onClick={() => handleConnect()}
                  disabled={connecting}
                  style={{
                    padding: '14px 28px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6772E5, #4F46E5)',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', opacity: connecting ? 0.6 : 1,
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {connecting ? c.connecting : (profile?.country === 'IL' ? c.ilPayoutsBtn : c.setupPayment)}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 0', marginTop: '4px',
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#F59E0B', textDecoration: 'underline' }}>
                    {c.notSellerMsg}
                  </p>
                </button>
              )}
            </>
          )}
        </div>
        )}

        {/* Buyer card section — only visible during card setup */}
        {showCardSetup && (
        <div id="card-setup-section" style={{
          backgroundColor: '#111', borderRadius: '14px', padding: '20px',
          marginBottom: '16px',
        }}>
          {cardLoading ? (
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center' }}>{c.loading}</p>
          ) : showCardSetup ? (
            <div>
              {setupSuccess ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
                    border: '2px solid rgba(34,197,94,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', margin: '0 0 8px' }}>
                    {c.buyerCardSuccess}
                  </p>
                  <button
                    onClick={() => { setShowCardSetup(false); setSetupSuccess(false); fetchCardInfo() }}
                    style={{
                      padding: '12px 24px', marginTop: '12px',
                      background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                      borderRadius: '12px', border: 'none',
                      color: '#fff', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  {setupError && (
                    <div style={{
                      padding: '10px 14px', marginBottom: '12px',
                      backgroundColor: 'rgba(232,52,78,0.1)',
                      border: '1px solid rgba(232,52,78,0.3)',
                      borderRadius: '10px',
                    }}>
                      <p style={{ fontSize: '13px', color: '#E8344E', margin: 0 }}>{setupError}</p>
                    </div>
                  )}

                  {setupClientSecret ? (
                    <Elements stripe={getStripePromise()} options={{ locale: lang }}>
                      <SetupCardFormInner
                        clientSecret={setupClientSecret}
                        onSuccess={() => { setSetupSuccess(true); setSetupLoading(false) }}
                        onError={(msg) => { setSetupError(msg); setSetupLoading(false) }}
                        loading={setupLoading}
                        setLoading={setSetupLoading}
                        saveLabel={c.buyerSaveCard}
                        errorLabel={c.buyerCardError}
                      />
                    </Elements>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <div style={{
                        width: '32px', height: '32px', margin: '0 auto',
                        border: '3px solid #333', borderTopColor: '#F0908A',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                    </div>
                  )}

                  <button
                    onClick={() => { setShowCardSetup(false); setSetupError(null) }}
                    style={{
                      width: '100%', marginTop: '12px', padding: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid #333', borderRadius: '10px',
                      color: '#888', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.close}
                  </button>
                </>
              )}
            </div>
          ) : cardInfo?.has_card ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#22C55E', margin: '0 0 2px' }}>
                  {c.buyerCardSaved}
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {(cardInfo.brand || c.cardFallback).toUpperCase()} {c.buyerCardLast4} {cardInfo.last4}
                </p>
              </div>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid #333',
                  color: '#aaa', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.buyerChangeCard}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(240,144,138,0.15), rgba(240,144,138,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0908A" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                {c.buyerNoCard}
              </p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px', maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
                {c.buyerNoCardDesc}
              </p>
              <button
                onClick={openCardSetup}
                style={{
                  padding: '14px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F0908A, #E8344E)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(240,144,138,0.3)',
                }}
              >
                {c.buyerAddCard}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Fees summary */}
        {profile?.is_seller && (
          <div style={{
            backgroundColor: '#111', borderRadius: '14px', padding: '16px 20px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {'\u{1F4B0}'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{c.feesTitle}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>{c.feesDesc}</p>
              <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '2px' }}>{c.feesExample.replace('{sale}', formatMoney(50, userCurrency)).replace('{net}', formatMoney(43.1, userCurrency))}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ PAYMENT METHOD PICKER MODAL ═══════ */}
      {showMethodPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowMethodPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: '500px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              animation: 'slideUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#ccc' }} />
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', padding: '8px 24px 4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#000', margin: 0 }}>
                {c.addPaymentMethod}
              </h3>
              <p style={{ fontSize: '13px', color: '#888', margin: '8px 0 20px', lineHeight: 1.5 }}>
                {c.addPaymentMethodDesc}
              </p>
            </div>

            {/* Options */}
            <div style={{ padding: '0 24px' }}>
              {/* Carte bancaire */}
              <button
                onClick={() => { setShowMethodPicker(false); openCardSetup() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 0', borderBottom: '1px solid #eee',
                  background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#eee',
                  cursor: 'pointer', textAlign: 'start',
                }}
              >
                <div style={{
                  width: '44px', height: '30px', borderRadius: '6px', border: '1.5px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#000', flex: 1 }}>
                  {c.creditCard}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
              </button>

              {/* Apple Pay (jamais sur l'app Android : carte bancaire dans la WebView) */}
              {!isAndroidApp() && (
              <button
                onClick={() => {
                  if (!applePayAvailable) return
                  setShowMethodPicker(false)
                  showToast(c.applePayAtCheckout, 'success')
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 0',
                  background: 'none', border: 'none',
                  cursor: applePayAvailable ? 'pointer' : 'default', textAlign: 'start',
                  opacity: applePayAvailable ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: '44px', height: '30px', borderRadius: '6px', border: '1.5px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  backgroundColor: '#000',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#000', display: 'block' }}>
                    {c.applePay}
                  </span>
                  {!applePayAvailable && (
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {c.applePayUnavailable}
                    </span>
                  )}
                </div>
                {applePayAvailable && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={rtlFlip()}><path d="M9 18l6-6-6-6"/></svg>
                )}
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Country picker modal */}
      {showCountryPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
          onClick={() => setShowCountryPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#111', borderRadius: '16px',
              padding: '24px', width: '100%', maxWidth: '360px',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>
              {c.selectCountry}
            </h3>
            <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              {c.selectCountryDesc}
            </p>
            {showPaypalForm ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0,48,135,0.2), rgba(0,156,222,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#009CDE" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#009CDE', textAlign: 'center', marginBottom: '8px' }}>
                  {c.paypalCountryTitle}
                </h4>
                <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
                  {c.paypalCountryDesc}
                </p>
                <input
                  type="email"
                  inputMode="email"
                  value={countryPaypalEmail}
                  onChange={e => setCountryPaypalEmail(e.target.value)}
                  placeholder={c.paypalCountryPlaceholder}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '12px',
                    backgroundColor: '#0A0A0A', border: '1px solid #333',
                    color: '#fff', fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '12px',
                  }}
                />
                <button
                  onClick={handleCountryPaypalSave}
                  disabled={countryPaypalSaving || !countryPaypalEmail.includes('@')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: countryPaypalEmail.includes('@') ? 'linear-gradient(135deg, #003087, #009CDE)' : '#333',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: countryPaypalEmail.includes('@') ? 'pointer' : 'not-allowed',
                    opacity: countryPaypalSaving ? 0.6 : 1,
                    marginBottom: '8px',
                  }}
                >
                  {countryPaypalSaving ? '...' : c.paypalCountrySave}
                </button>
                <button
                  onClick={() => { setShowPaypalForm(false); setSelectedCountry('') }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '10px',
                    backgroundColor: 'transparent', border: '1px solid #333',
                    color: '#888', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {c.cancel}
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowY: 'auto', flex: 1, marginBottom: '16px' }}>
                  {allCountries.map(ct => {
                    const isPaypalOnly = PAYPAL_ONLY_COUNTRIES.includes(ct.code)
                    return (
                      <button
                        key={ct.code}
                        onClick={() => setSelectedCountry(ct.code)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', marginBottom: '4px',
                          borderRadius: '10px', border: 'none', cursor: 'pointer',
                          backgroundColor: selectedCountry === ct.code ? 'rgba(99,102,241,0.15)' : 'transparent',
                          outline: selectedCountry === ct.code ? '2px solid #6366F1' : '2px solid transparent',
                        }}
                      >
                        <span className="no-theme-invert" style={{ fontSize: '22px' }}>{ct.flag}</span>
                        <span style={{ fontSize: '15px', color: '#fff', fontWeight: selectedCountry === ct.code ? 700 : 400, flex: 1 }}>
                          {regionName(ct.code)}
                        </span>
                        {isPaypalOnly && (
                          <span style={{ fontSize: '11px', color: '#009CDE', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,156,222,0.1)' }}>
                            PayPal
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => { if (selectedCountry) handleConnect(selectedCountry) }}
                  disabled={!selectedCountry || connecting}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: selectedCountry
                      ? PAYPAL_ONLY_COUNTRIES.includes(selectedCountry)
                        ? 'linear-gradient(135deg, #003087, #009CDE)'
                        : 'linear-gradient(135deg, #6772E5, #4F46E5)'
                      : '#333',
                    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: selectedCountry ? 'pointer' : 'not-allowed',
                    opacity: connecting ? 0.6 : 1,
                    marginBottom: '8px',
                  }}
                >
                  {connecting ? c.connecting : c.confirm}
                </button>
              </>
            )}
            <button
              onClick={() => setShowCountryPicker(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                backgroundColor: 'transparent', border: '1px solid #333',
                color: '#888', fontSize: '14px', cursor: 'pointer',
              }}
            >
              {c.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
